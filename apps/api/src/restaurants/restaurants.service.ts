import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginatedResult } from '../common/pagination';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FindRestaurantsQueryDto } from './dto/find-restaurants-query.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateRestaurantDto) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (existing) throw new ConflictException('You already have a restaurant');

    return this.prisma.restaurant.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        address: dto.address,
        cuisineType: dto.cuisineType,
        lat: dto.lat ?? 0,
        lng: dto.lng ?? 0,
      },
    });
  }

  findMine(ownerId: string) {
    return this.prisma.restaurant.findUnique({ where: { ownerId } });
  }

  async findAll(query: FindRestaurantsQueryDto) {
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        isOpen: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { cuisineType: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { id: 'asc' },
      take: limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    });
    return buildPaginatedResult(restaurants, limit);
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { categories: { orderBy: { order: 'asc' } }, menuItems: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async update(id: string, ownerId: string, dto: UpdateRestaurantDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this restaurant');
    }

    return this.prisma.restaurant.update({ where: { id }, data: dto });
  }
}
