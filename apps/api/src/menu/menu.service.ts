import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedRestaurantId(ownerId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (!restaurant)
      throw new NotFoundException('You do not have a restaurant yet');
    return restaurant.id;
  }

  async createCategory(ownerId: string, dto: CreateCategoryDto) {
    const restaurantId = await this.getOwnedRestaurantId(ownerId);
    return this.prisma.category.create({
      data: { restaurantId, name: dto.name, order: dto.order ?? 0 },
    });
  }

  findCategories(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { order: 'asc' },
    });
  }

  async deleteCategory(ownerId: string, id: string) {
    const restaurantId = await this.getOwnedRestaurantId(ownerId);
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (category.restaurantId !== restaurantId) {
      throw new ForbiddenException('You do not own this category');
    }
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }

  async createItem(ownerId: string, dto: CreateMenuItemDto) {
    const restaurantId = await this.getOwnedRestaurantId(ownerId);
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.restaurantId !== restaurantId) {
      throw new ForbiddenException('You do not own this category');
    }

    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      },
    });
  }

  findItems(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateItem(ownerId: string, id: string, dto: UpdateMenuItemDto) {
    const restaurantId = await this.getOwnedRestaurantId(ownerId);
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    if (item.restaurantId !== restaurantId) {
      throw new ForbiddenException('You do not own this menu item');
    }

    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async deleteItem(ownerId: string, id: string) {
    const restaurantId = await this.getOwnedRestaurantId(ownerId);
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    if (item.restaurantId !== restaurantId) {
      throw new ForbiddenException('You do not own this menu item');
    }
    await this.prisma.menuItem.delete({ where: { id } });
    return { id };
  }
}
