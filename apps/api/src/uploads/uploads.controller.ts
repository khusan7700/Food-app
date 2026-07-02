import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtPayload } from '@order-eats/types';
import { Request as ExpressRequest } from 'express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { isUploadType } from './upload-type';
import { UploadsService } from './uploads.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type AuthRequest = ExpressRequest & { user: JwtPayload };

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post(':type')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, callback) => {
          const type = (req.params as { type?: string }).type ?? '';
          if (!isUploadType(type)) {
            callback(
              new BadRequestException(`Invalid upload type: ${type}`),
              '',
            );
            return;
          }
          const dir = join(process.env.UPLOAD_DIR ?? 'uploads', type);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          callback(null, dir);
        },
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @Param('type') type: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthRequest,
  ) {
    if (!isUploadType(type)) {
      throw new BadRequestException(`Invalid upload type: ${type}`);
    }
    if (!file) throw new BadRequestException('No file uploaded');

    const url = this.uploadsService.buildFileUrl(type, file.filename);
    await this.uploadsService.attach(type, req.user.sub, url);
    return { url };
  }
}
