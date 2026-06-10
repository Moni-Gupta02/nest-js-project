import { webcrypto } from 'node:crypto';
import { NestFactory } from '@nestjs/core';

// @nestjs/schedule v6 expects global Web Crypto (Node 19+)
globalThis.crypto ??= webcrypto as Crypto;
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
dotenv.config();

async function bootstrap() {
  const { SERVER_PORT }: any = process.env;
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  // Increase body size limit using NestJS ExpressApplication methods (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://main.d2v77vf6c02kq9.amplifyapp.com',
        'https://staging-rms-api.delicut.ae',
        'https://api-rms.delicut.ae',
        'https://staging-rms.delicut.ae',
        'https://rms.delicut.ae',
        'https://rms2.delicut.ae',
        'https://env-uat.d2v77vf6c02kq9.amplifyapp.com',
        'http://localhost:3000',
        'http://192.168.0.73:3000',
        'https://5e69-2402-a00-152-97c9-1615-7bf9-d7fa-6db6.ngrok-free.app',
        'https://molt-stg.delicut.ae',
        'http://localhost:4002',
        'http://localhost:5174',
        'https://uat-apis.molt.life',
        'https://staging-rms2.delicut.ae',
      ];

      // Allow requests with no origin (curl, mobile apps, Swagger)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'access-token',
      'token',
      'rms-token',
      'x-rms-authorization',
      'x-access-token',
      'ngrok-skip-browser-warning',
    ],
    exposedHeaders: ['ngrok-skip-browser-warning'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Kitchen Management module')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  app.setGlobalPrefix('api/');
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  const port = SERVER_PORT || 4001;
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(port);
  console.log(`Server is running on port ${port}`);
}
bootstrap();
