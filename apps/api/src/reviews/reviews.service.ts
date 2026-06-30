import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginatedResult } from '../common/pagination';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus } from '@food-delivery/types';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(dto: CreateReviewDto, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId)
      throw new ForbiddenException('You can only review your own orders');
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException('You can only review delivered orders');

    const existing = await this.prisma.review.findUnique({
      where: { orderId: dto.orderId },
    });
    if (existing)
      throw new BadRequestException('You have already reviewed this order');

    const review = await this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        customerId,
        restaurantId: order.restaurantId,
        driverId: order.driverId ?? null,
        restaurantRating: dto.restaurantRating,
        driverRating: dto.driverRating ?? null,
        comment: dto.comment ?? null,
      },
    });

    await this.syncRestaurantRating(order.restaurantId);

    return review;
  }

  async getRestaurantReviews(
    restaurantId: string,
    cursor?: string,
    limit = 20,
  ) {
    const take = Math.min(limit, 50);
    const reviews = await this.prisma.review.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return buildPaginatedResult(reviews, take);
  }

  async hasReviewedOrder(orderId: string, customerId: string) {
    const review = await this.prisma.review.findFirst({
      where: { orderId, customerId },
    });
    return { reviewed: !!review };
  }

  // Recalculates Restaurant.rating (average) and totalReviews after each new review.
  private async syncRestaurantRating(restaurantId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { restaurantId },
      _avg: { restaurantRating: true },
      _count: { id: true },
    });

    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        rating: agg._avg.restaurantRating ?? 0,
        totalReviews: agg._count.id,
      },
    });
  }
}
