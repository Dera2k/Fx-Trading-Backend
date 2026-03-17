import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import {ValidationPipe, ClassSerializerInterceptor, } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // // frontend (later)
  // app.enableCors({
  //   origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  //   credentials: true,
  // });

  /**
   * GLobal Validation */ 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  /**
   * Swagger congfigs
   */
  const config = new DocumentBuilder()
    .setTitle('FX Trading API')
    .setDescription('Multi-currency FX trading backend — register, fund, convert, trade')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();


    /**
     * Swagger build and mount
     */
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
    { swaggerOptions: { persistAuthorization: true } },
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running  →  http://localhost:${port}`);
  console.log(`Swagger docs →  http://localhost:${port}/api/docs`);
}

bootstrap();