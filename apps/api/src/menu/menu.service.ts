import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  private async getRestaurantByOwner(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (!restaurant) throw new NotFoundException('Create a restaurant first');
    return restaurant;
  }

  // CATEGORIES

  async createCategory(ownerId: string, dto: CreateCategoryDto) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    return this.prisma.category.create({
      data: { restaurantId: restaurant.id, name: dto.name },
    });
  }

  getCategories(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { order: 'asc' },
    });
  }

  async updateCategory(id: string, ownerId: string, dto: UpdateCategoryDto) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (category.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This category does not belong to your restaurant',
      );
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string, ownerId: string) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (category.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This category does not belong to your restaurant',
      );
    }

    // Cascade delete removes all menu items in this category automatically.
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  // MENU ITEMS

  async createItem(ownerId: string, dto: CreateMenuItemDto) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    return this.prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      },
    });
  }

  getItemsByRestaurant(restaurantId: string) {
    // Returns all items for a restaurant — frontend groups them by category.
    return this.prisma.menuItem.findMany({ where: { restaurantId } });
  }

  async updateItem(id: string, ownerId: string, dto: UpdateMenuItemDto) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    if (item.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This item does not belong to your restaurant',
      );
    }

    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async deleteItem(id: string, ownerId: string) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    if (item.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This item does not belong to your restaurant',
      );
    }

    await this.prisma.menuItem.delete({ where: { id } });
    return { message: 'Item deleted' };
  }
}
