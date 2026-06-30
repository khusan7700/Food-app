import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@food-delivery/types';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../gateway/orders.gateway';
import { DriverAssignmentService } from './driver-assignment.service';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
    private readonly driverAssignmentService: DriverAssignmentService,
  ) {}

  async isDeliveryAvailable() {
    const count = await this.prisma.driver.count({
      where: { isOnline: true, lat: { not: null }, lng: { not: null } },
    });
    return { available: count > 0 };
  }

  async toggleOnline(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const updated = await this.prisma.driver.update({
      where: { userId },
      data: { isOnline: !driver.isOnline },
    });

    // Let all connected customers know delivery availability changed in real time.
    const { available } = await this.isDeliveryAvailable();
    this.ordersGateway.emitDriverAvailabilityChanged(available);

    // When a driver comes online, immediately try to assign any PENDING_DRIVER
    // orders that were left waiting because no driver was available before.
    if (updated.isOnline) {
      void this.driverAssignmentService.tryAssignPendingOrders();
    }

    return { isOnline: updated.isOnline };
  }

  async getStatus(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return { isOnline: driver.isOnline };
  }

  findMyOrders(driverId: string) {
    return this.prisma.order.findMany({
      where: { driverId },
      include: { restaurant: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Accepting is the only way out of PENDING_DRIVER -> PICKED_UP; the fixed
  // OrderStatus enum has no separate "assigned, not yet picked up" state.
  async acceptOrder(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.driverId !== driverId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING_DRIVER) {
      throw new BadRequestException('Order is no longer awaiting a driver');
    }

    this.driverAssignmentService.handleAccepted(orderId);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PICKED_UP },
      include: { restaurant: true, payment: true },
    });

    this.ordersGateway.emitOrderUpdated(updated.customerId, updated);
    return updated;
  }

  async deliverOrder(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.driverId !== driverId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException('Order has not been picked up yet');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
      include: { restaurant: true, payment: true },
    });

    this.ordersGateway.emitOrderUpdated(updated.customerId, updated);
    return updated;
  }

  async declineOrder(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.driverId !== driverId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING_DRIVER) {
      throw new BadRequestException('Order is no longer awaiting a driver');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { driverId: null },
    });

    await this.driverAssignmentService.handleDeclined(orderId, driverId);

    return { message: 'Order declined' };
  }
}
