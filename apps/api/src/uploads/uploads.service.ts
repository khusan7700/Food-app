import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadType } from './upload-type';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  buildFileUrl(type: UploadType, filename: string): string {
    const baseUrl =
      process.env.UPLOAD_BASE_URL ?? 'http://localhost:3000/uploads';
    return `${baseUrl}/${type}/${filename}`;
  }

  // Attaches the uploaded file to its owning entity when that entity is
  // guaranteed to already exist (user avatar, an existing restaurant's
  // image). For entities that may not exist yet at upload time (a brand
  // new restaurant, a new menu item), this is skipped — the client
  // includes the returned URL in the subsequent create request instead.
  async attach(type: UploadType, userId: string, url: string): Promise<void> {
    if (type === 'user') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: url },
      });
      return;
    }

    if (type === 'restaurant') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (restaurant) {
        await this.prisma.restaurant.update({
          where: { id: restaurant.id },
          data: { imageUrl: url },
        });
      }
      return;
    }

    // menu-item: no entity to attach to yet, client handles it.
  }
}
