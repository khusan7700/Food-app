import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@food-delivery/types';
import { OrdersGateway } from '../gateway/orders.gateway';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { DriverAssignmentService } from '../driver/driver-assignment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { canOwnerTransition } from './order-state-machine';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
    private readonly paymentsService: PaymentsService,
    private readonly driverAssignmentService: DriverAssignmentService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId: dto.restaurantId },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException(
        'One or more menu items are invalid for this restaurant',
      );
    }

    const unavailable = menuItems.find((item) => !item.isAvailable);
    if (unavailable) {
      throw new BadRequestException(
        `"${unavailable.name}" is currently unavailable`,
      );
    }

    const priceByItemId = new Map(
      menuItems.map((item) => [item.id, item.price]),
    );
    const totalPrice = dto.items.reduce(
      (sum, item) => sum + priceByItemId.get(item.menuItemId)! * item.quantity,
      0,
    );

    const order = await this.prisma.order.create({
      data: {
        customerId,
        restaurantId: dto.restaurantId,
        deliveryAddress: dto.deliveryAddress,
        totalPrice,
        items: {
          create: dto.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: priceByItemId.get(item.menuItemId)!,
          })),
        },
      },
      include: { items: true },
    });

    this.ordersGateway.emitOrderCreated(dto.restaurantId, order);
    return order;
  }

  findMine(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(customerId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: true,
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) {
      throw new ForbiddenException('You do not own this order');
    }
    return order;
  }

  async findForOwnRestaurant(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (!restaurant)
      throw new NotFoundException('You do not have a restaurant yet');

    return this.prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(ownerId: string, id: string, dto: UpdateOrderStatusDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (!restaurant)
      throw new NotFoundException('You do not have a restaurant yet');

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurant.id) {
      throw new ForbiddenException('You do not own this order');
    }

    if (!canOwnerTransition(order.status as OrderStatus, dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${dto.status}`,
      );
    }

    if (
      order.status === OrderStatus.PENDING &&
      dto.status === OrderStatus.CONFIRMED &&
      order.payment?.status !== 'APPROVED'
    ) {
      throw new BadRequestException(
        'Customer has not completed Kakao Pay payment yet',
      );
    }

    let updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { restaurant: true, payment: true },
    });

    this.ordersGateway.emitOrderUpdated(updated.customerId, updated);

    if (dto.status === OrderStatus.CANCELLED) {
      await this.refundIfPaid(updated.id, order.payment?.status);
    }

    // READY is the owner-facing status; the order immediately advances to
    // PENDING_DRIVER and driver-assignment.service.ts takes over from there
    // (haversine search, 2-minute timeout, up to 3 attempts).
    if (dto.status === OrderStatus.READY) {
      updated = await this.prisma.order.update({
        where: { id },
        data: { status: OrderStatus.PENDING_DRIVER },
        include: { restaurant: true, payment: true },
      });
      this.ordersGateway.emitOrderUpdated(updated.customerId, updated);
      await this.driverAssignmentService.startAssignment(id);
    }

    return updated;
  }

  // After cancelling an order that was already paid for via Kakao Pay,
  // immediately advance CANCELLED -> REFUND_PENDING and kick off the
  // refund; the payments scheduler retries this if the Kakao Pay call
  // itself fails so this isn't the only place it can complete.
  private async refundIfPaid(orderId: string, paymentStatus?: string) {
    if (paymentStatus !== 'APPROVED') return;

    const refunding = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REFUND_PENDING },
      include: { restaurant: true, payment: true },
    });
    this.ordersGateway.emitOrderUpdated(refunding.customerId, refunding);

    try {
      await this.paymentsService.refund(orderId);
      const refunded = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: true, payment: true },
      });
      if (refunded)
        this.ordersGateway.emitOrderUpdated(refunded.customerId, refunded);
    } catch {
      // Left at REFUND_PENDING; payments.scheduler retries periodically.
    }
  }
}
