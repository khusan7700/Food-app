import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtPayload, UserRole } from '@order-eats/types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

type AuthRequest = ExpressRequest & { user: JwtPayload };

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  createReview(@Body() dto: CreateReviewDto, @Request() req: AuthRequest) {
    return this.reviewsService.createReview(dto, req.user.sub);
  }

  @Get('restaurant/:restaurantId')
  getRestaurantReviews(
    @Param('restaurantId') restaurantId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getRestaurantReviews(
      restaurantId,
      cursor,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('order/:orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  hasReviewed(@Param('orderId') orderId: string, @Request() req: AuthRequest) {
    return this.reviewsService.hasReviewedOrder(orderId, req.user.sub);
  }
}
