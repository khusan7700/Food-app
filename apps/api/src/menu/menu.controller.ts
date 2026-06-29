import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@food-delivery/types';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  createCategory(
    @Body() dto: CreateCategoryDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.menuService.createCategory(req.user.sub, dto);
  }

  @Get('categories/:restaurantId')
  findCategories(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findCategories(restaurantId);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  deleteCategory(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.menuService.deleteCategory(req.user.sub, id);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  createItem(
    @Body() dto: CreateMenuItemDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.menuService.createItem(req.user.sub, dto);
  }

  @Get('items/:restaurantId')
  findItems(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findItems(restaurantId);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.menuService.updateItem(req.user.sub, id, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  deleteItem(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.menuService.deleteItem(req.user.sub, id);
  }
}
