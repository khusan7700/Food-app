import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@food-delivery/types';
import { OrdersGateway } from '../gateway/orders.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { canOwnerTransition } from './order-state-machine';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
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

  async findForOwnRestaurant(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (!restaurant)
      throw new NotFoundException('You do not have a restaurant yet');

    return this.prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(ownerId: string, id: string, dto: UpdateOrderStatusDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (!restaurant)
      throw new NotFoundException('You do not have a restaurant yet');

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurant.id) {
      throw new ForbiddenException('You do not own this order');
    }

    if (!canOwnerTransition(order.status as OrderStatus, dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${dto.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });

    this.ordersGateway.emitOrderUpdated(updated.customerId, updated);
    return updated;
  }
}
