import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@food-delivery/types';

type AuthRequest = ExpressRequest & { user: JwtPayload };

@Controller('driver')
export class DriverController {
  constructor(private driverService: DriverService) {}

  // Public — customer app checks this to show restaurant availability.
  @Get('available')
  isDeliveryAvailable() {
    return this.driverService.isDeliveryAvailable();
  }

  @Patch('online')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  toggleOnline(@Request() req: AuthRequest) {
    return this.driverService.toggleOnline(req.user.sub);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  getStatus(@Request() req: AuthRequest) {
    return this.driverService.getStatus(req.user.sub);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  findMyOrders(@Request() req: AuthRequest) {
    return this.driverService.findMyOrders(req.user.sub);
  }

  @Post('orders/:id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  acceptOrder(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.driverService.acceptOrder(id, req.user.sub);
  }

  @Post('orders/:id/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  declineOrder(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.driverService.declineOrder(id, req.user.sub);
  }

  @Post('orders/:id/deliver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  deliverOrder(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.driverService.deliverOrder(id, req.user.sub);
  }
}
