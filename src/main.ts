import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import path, { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);


  app.useGlobalPipes(new ValidationPipe(
    {
      whitelist:true
    }
  ))

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

 

      // Configuración específica de CORS
  app.enableCors({
    origin: '*', // ¡CUIDADO: No usar en producción!
    methods: '*',
    allowedHeaders: '*',
    credentials: false,
  });

    app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '50mb' }));

   const staticPath = path.join(process.cwd(), 'public');
  
  // Imprime la ruta para la verificación final
  console.log('Ruta de Archivos Estáticos configurada: ', staticPath); 

   app.use('/uploads', express.static(staticPath));



      await app.listen(process.env.PORT ?? 3000);

}
bootstrap();
