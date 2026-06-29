import 'dotenv/config';
import { mkdirSync } from 'fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.enableCors();

  const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
  mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}
void bootstrap();
