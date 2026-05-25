import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ZodValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
