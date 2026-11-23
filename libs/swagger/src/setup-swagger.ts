import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export type SwaggerAppOptions = {
  title: string;
  description: string;
  version?: string;
};

function isSwaggerEnabled(): boolean {
  if (process.env.SWAGGER_ENABLED === 'false') {
    return false;
  }
  if (process.env.NODE_ENV === 'production' && process.env.SWAGGER_ENABLED !== 'true') {
    return false;
  }
  return true;
}

export function setupSwagger(
  app: INestApplication,
  options: SwaggerAppOptions,
): void {
  if (!isSwaggerEnabled()) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(
      `${options.description}\n\nValidation errors return 400. Database outages may return 503 with a generic message.`,
    )
    .setVersion(options.version ?? '1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory, {
    jsonDocumentUrl: 'api-json',
  });
}