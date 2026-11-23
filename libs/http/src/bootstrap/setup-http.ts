import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from '../filters/global-exception.filter.js';
import { useRequestLogging } from '../middleware/request-logging.middleware.js';

export type SetupHttpOptions = {
  /** Shown in Nest Logger prefix for each HTTP line. */
  serviceName: string;
};

export function setupHttp(
  app: INestApplication,
  options: SetupHttpOptions,
): void {
  useRequestLogging(app, options.serviceName);
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
}
