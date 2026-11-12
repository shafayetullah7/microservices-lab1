import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from '../filters/global-exception.filter.js';

export function setupHttp(app: INestApplication): void {
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
}
