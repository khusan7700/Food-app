import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginatedResult } from '../common/pagination';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FindRestaurantsQueryDto } from './dto/find-restaurants-query.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

interface KakaoAddressSearchResponse {
  documents: { address: { x: string; y: string } }[];
}

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Address -> {lat, lng} via Kakao's Local API, used by the owner app's
  // create/edit-restaurant screens since there's no map picker — the REST
  // API key never leaves the backend per CLAUDE.md.
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    const restApiKey =
      process.env.KAKAO_REST_API ??
      process.env.KAKAO_REST_API_KEY ??
      process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ??
      '';
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${restApiKey}` } },
    );

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Kakao geocode failed (${res.status}): ${body}`);
      throw new BadRequestException('Could not look up that address');
    }

    const data = (await res.json()) as KakaoAddressSearchResponse;
    const match = data.documents[0];
    if (!match) {
      throw new BadRequestException('No location found for that address');
    }

    return {
      lat: parseFloat(match.address.y),
      lng: parseFloat(match.address.x),
    };
  }

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
