import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '@food-delivery/types';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../gateway/orders.gateway';

const RESPONSE_TIMEOUT_MS = 2 * 60 * 1000; // 2 daqiqa
const INITIAL_RADIUS_KM = 5;
const EXPANDED_RADIUS_KM = 10;
const MAX_ATTEMPTS = 3;

interface AssignmentState {
  timer: NodeJS.Timeout;
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
export class DriverAssignmentService {
  private readonly logger = new Logger(DriverAssignmentService.name);
  private readonly inFlight = new Map<string, AssignmentState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async startAssignment(orderId: string) {
    await this.attempt(orderId, 1, []);
  }

  // Driver explicitly declined — skip the rest of the 2-minute wait and try
  // the next-nearest driver immediately.
  async handleDeclined(orderId: string, driverId: string) {
    const state = this.inFlight.get(orderId);
    if (state) clearTimeout(state.timer);
    this.inFlight.delete(orderId);
    await this.attempt(orderId, (state ? 1 : 0) + 1, [driverId]);
  }

  // Driver accepted — nothing left to wait for.
  handleAccepted(orderId: string) {
    const state = this.inFlight.get(orderId);
    if (state) clearTimeout(state.timer);
    this.inFlight.delete(orderId);
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
      this.logger.warn(
        `No driver accepted order ${orderId} after ${MAX_ATTEMPTS} attempts`,
      );
      this.ordersGateway.emitDriverAssignmentFailed(order.restaurantId, order);
      return;
    }

    const driver = await this.findNearestAvailableDriver(
      order.restaurant.lat,
      order.restaurant.lng,
      excludedDriverIds,
    );

    if (!driver) {
      this.ordersGateway.emitDriverAssignmentFailed(order.restaurantId, order);
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

    this.inFlight.set(orderId, { timer });
  }

  // Closest online driver with a known location, excluding anyone already
  // tried for this order. Searches a 5km radius first, widening to 10km
  // only if nobody nearer is available.
  private async findNearestAvailableDriver(
    restaurantLat: number,
    restaurantLng: number,
    excludedDriverIds: string[],
  ) {
    const candidates = await this.prisma.driver.findMany({
      where: {
        isOnline: true,
        lat: { not: null },
        lng: { not: null },
        userId: { notIn: excludedDriverIds },
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
