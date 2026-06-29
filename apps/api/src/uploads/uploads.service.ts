import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  buildFileUrl(filename: string): string {
    const baseUrl =
      process.env.UPLOAD_BASE_URL ?? 'http://localhost:3000/uploads';
    return `${baseUrl}/${filename}`;
  }
}
