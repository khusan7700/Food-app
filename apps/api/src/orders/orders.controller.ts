import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@order-eats/types';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  create(
    @Body() dto: CreateOrderDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.ordersService.create(req.user.sub, dto);
  }

  @Get('restaurant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  findForOwnRestaurant(@Request() req: ExpressRequest & { user: JwtPayload }) {
    return this.ordersService.findForOwnRestaurant(req.user.sub);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  findMine(@Request() req: ExpressRequest & { user: JwtPayload }) {
    return this.ordersService.findMine(req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  findOne(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.ordersService.findOne(req.user.sub, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.ordersService.updateStatus(req.user.sub, id, dto);
  }
}
