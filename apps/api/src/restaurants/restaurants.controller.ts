import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@order-eats/types';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FindRestaurantsQueryDto } from './dto/find-restaurants-query.dto';
import { GeocodeQueryDto } from './dto/geocode-query.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  create(
    @Body() dto: CreateRestaurantDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.restaurantsService.create(req.user.sub, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  findMine(@Request() req: ExpressRequest & { user: JwtPayload }) {
    return this.restaurantsService.findMine(req.user.sub);
  }

  @Get()
  findAll(@Query() query: FindRestaurantsQueryDto) {
    return this.restaurantsService.findAll(query);
  }

  // Must come before @Get(':id') or NestJS would match "geocode" as an :id.
  @Get('geocode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  geocode(@Query() query: GeocodeQueryDto) {
    return this.restaurantsService.geocodeAddress(query.address);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.restaurantsService.update(id, req.user.sub, dto);
  }
}
