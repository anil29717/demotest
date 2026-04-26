import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ChatRedisIoAdapter } from './chat/chat-redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.useWebSocketAdapter(new ChatRedisIoAdapter(app));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const origins = (
    process.env.SOCKET_CORS_ORIGIN ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : 'http://localhost:3000',
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
