import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { OrderStatus } from '@order-eats/types';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../gateway/orders.gateway';

const RESPONSE_TIMEOUT_MS = 2 * 60 * 1000; // 2 daqiqa
const INITIAL_RADIUS_KM = 5;
const EXPANDED_RADIUS_KM = 10;
const MAX_ATTEMPTS = 3;

// No-driver rounds: how many 30-second search cycles before the order is
// moved to the wait pool where drivers can claim it themselves.
const SEARCH_ROUNDS = 3;
const SEARCH_RETRY_MS = 30_000;

interface AssignmentState {
  timer: NodeJS.Timeout;
  attemptNumber: number;
  excludedDriverIds: string[];
}

// Great-circle distance between two lat/lng points, in km.
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Tries the nearest online driver for an order stuck at PENDING_DRIVER.
// Each attempt waits up to 2 minutes for the driver to accept/decline via
// DriverService; a decline short-circuits the wait via handleDeclined, a
// silent timeout moves on to the next-nearest driver. After MAX_ATTEMPTS
// failures the order is left at PENDING_DRIVER and the owner is notified.
@Injectable()
export class DriverAssignmentService implements OnModuleInit {
  private readonly logger = new Logger(DriverAssignmentService.name);
  private readonly inFlight = new Map<string, AssignmentState>();

  // Tracks how many "no driver found" search rounds each order has gone through.
  private readonly searchRounds = new Map<string, number>();
  // 30-second retry timers for orders waiting between search rounds.
  private readonly searchRetryTimers = new Map<string, NodeJS.Timeout>();
  // Orders that exhausted all search rounds — drivers claim them manually.
  private readonly waitPool = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  // On startup, any order already stuck at PENDING_DRIVER with no assigned
  // driver goes straight to the wait pool — they've clearly been waiting.
  async onModuleInit() {
    const stuck = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING_DRIVER, driverId: null },
      select: { id: true },
    });
    for (const { id } of stuck) {
      this.waitPool.add(id);
    }
    if (stuck.length > 0) {
      this.logger.log(
        `Loaded ${stuck.length} stuck PENDING_DRIVER order(s) into wait pool on startup.`,
      );
    }
  }

  async startAssignment(orderId: string) {
    await this.attempt(orderId, 1, []);
  }

  // Called when a driver comes online — picks up any PENDING_DRIVER orders
  // that have no driver assigned yet (either because no driver was available
  // when the order was first pushed, or all previous attempts were rejected).
  // Wait-pool orders are skipped here — drivers claim those themselves.
  async tryAssignPendingOrders() {
    const unassigned = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING_DRIVER, driverId: null },
      orderBy: { createdAt: 'asc' },
    });

    for (const order of unassigned) {
      if (this.waitPool.has(order.id)) continue;
      if (
        !this.inFlight.has(order.id) &&
        !this.searchRetryTimers.has(order.id)
      ) {
        await this.attempt(order.id, 1, []);
      }
    }
  }

  // Driver explicitly declined — skip the rest of the 2-minute wait and try
  // the next-nearest driver immediately, keeping ALL previously excluded drivers.
  async handleDeclined(orderId: string, driverId: string) {
    const state = this.inFlight.get(orderId);
    if (state) clearTimeout(state.timer);
    this.inFlight.delete(orderId);

    const nextAttempt = state ? state.attemptNumber + 1 : 2;
    const excluded = state
      ? [...state.excludedDriverIds, driverId]
      : [driverId];

    await this.attempt(orderId, nextAttempt, excluded);
  }

  // Driver accepted (either pre-assigned or from the wait pool) — clean up all state.
  handleAccepted(orderId: string) {
    const state = this.inFlight.get(orderId);
    if (state) clearTimeout(state.timer);
    this.inFlight.delete(orderId);

    const retryTimer = this.searchRetryTimers.get(orderId);
    if (retryTimer) clearTimeout(retryTimer);
    this.searchRetryTimers.delete(orderId);
    this.searchRounds.delete(orderId);
    this.waitPool.delete(orderId);
  }

  // Returns all orders currently in the wait pool with restaurant details.
  async getWaitPoolOrders() {
    const ids = [...this.waitPool];
    if (ids.length === 0) return [];
    return this.prisma.order.findMany({
      where: { id: { in: ids }, status: OrderStatus.PENDING_DRIVER },
      include: { restaurant: { select: { id: true, name: true, address: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Driver self-assigns a wait-pool order. Throws if the order was already
  // taken (race condition between multiple drivers viewing the same pool).
  async claimWaitPoolOrder(orderId: string, driverId: string) {
    if (!this.waitPool.has(orderId)) {
      throw new BadRequestException('Order is not in the wait pool');
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (
      !order ||
      order.status !== OrderStatus.PENDING_DRIVER ||
      order.driverId !== null
    ) {
      this.waitPool.delete(orderId);
      throw new BadRequestException('Order is no longer available');
    }

    this.waitPool.delete(orderId);
    this.handleAccepted(orderId);

    return this.prisma.order.update({
      where: { id: orderId },
      data: { driverId, status: OrderStatus.PICKED_UP },
      include: { restaurant: true, payment: true },
    });
  }

  private async attempt(
    orderId: string,
    attemptNumber: number,
    excludedDriverIds: string[],
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    });
    // Order may have been cancelled (or already resolved) while we waited.
    if (!order || order.status !== OrderStatus.PENDING_DRIVER) return;

    if (attemptNumber > MAX_ATTEMPTS) {
      // All nearby drivers rejected — clear excluded list and wait for a new
      // driver to come online (tryAssignPendingOrders will pick this up).
      this.logger.warn(
        `Order ${orderId}: all ${MAX_ATTEMPTS} drivers declined. Waiting for next available driver.`,
      );
      await this.prisma.order.update({
        where: { id: orderId },
        data: { driverId: null },
      });
      this.ordersGateway.emitDriverAssignmentTimeout(order.restaurantId, order);
      return;
    }

    const driver = await this.findNearestAvailableDriver(
      order.restaurant.lat,
      order.restaurant.lng,
      excludedDriverIds,
    );

    if (!driver) {
      const rounds = (this.searchRounds.get(orderId) ?? 0) + 1;

      if (rounds >= SEARCH_ROUNDS) {
        // Exhausted all search rounds → move to wait pool for manual claim.
        this.searchRounds.delete(orderId);
        this.waitPool.add(orderId);
        this.logger.log(
          `Order ${orderId}: moved to wait pool after ${SEARCH_ROUNDS} search rounds.`,
        );
        this.ordersGateway.emitDriverAssignmentTimeout(order.restaurantId, order);
        return;
      }

      this.searchRounds.set(orderId, rounds);
      this.logger.log(
        `Order ${orderId}: no driver in range (round ${rounds}/${SEARCH_ROUNDS}). Retrying in ${SEARCH_RETRY_MS / 1000}s.`,
      );
      this.ordersGateway.emitDriverAssignmentTimeout(order.restaurantId, order);

      const retryTimer = setTimeout(() => {
        this.searchRetryTimers.delete(orderId);
        void this.attempt(orderId, 1, []);
      }, SEARCH_RETRY_MS);
      this.searchRetryTimers.set(orderId, retryTimer);
      return;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { driverId: driver.userId },
      include: { restaurant: true, payment: true },
    });

    this.ordersGateway.emitOrderAssigned(driver.userId, updated);

    const timer = setTimeout(() => {
      this.ordersGateway.emitDriverAssignmentTimeout(
        order.restaurantId,
        updated,
      );
      void this.attempt(orderId, attemptNumber + 1, [
        ...excludedDriverIds,
        driver.userId,
      ]);
    }, RESPONSE_TIMEOUT_MS);

    this.inFlight.set(orderId, {
      timer,
      attemptNumber,
      excludedDriverIds: [...excludedDriverIds, driver.userId],
    });
  }

  // Closest online driver with a known location who has no active order,
  // excluding anyone already tried for this order. Searches a 5km radius
  // first, widening to 10km only if nobody nearer is available.
  private async findNearestAvailableDriver(
    restaurantLat: number,
    restaurantLng: number,
    excludedDriverIds: string[],
  ) {
    // Drivers who already have an in-progress order must not be offered another
    // one until they deliver the current one.
    const busyDriverIds = await this.prisma.order
      .findMany({
        where: {
          status: { in: [OrderStatus.PENDING_DRIVER, OrderStatus.PICKED_UP] },
          driverId: { not: null },
        },
        select: { driverId: true },
      })
      .then((rows) => rows.map((r) => r.driverId!));

    const candidates = await this.prisma.driver.findMany({
      where: {
        isOnline: true,
        lat: { not: null },
        lng: { not: null },
        userId: {
          notIn: [...excludedDriverIds, ...busyDriverIds],
        },
      },
    });

    const withDistance = candidates
      .map((driver) => ({
        driver,
        distanceKm: distanceKm(
          restaurantLat,
          restaurantLng,
          driver.lat!,
          driver.lng!,
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearest =
      withDistance.find((d) => d.distanceKm <= INITIAL_RADIUS_KM) ??
      withDistance.find((d) => d.distanceKm <= EXPANDED_RADIUS_KM);

    return nearest?.driver ?? null;
  }
}
