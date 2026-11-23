import {
  type ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { isDatabaseUnavailable } from '../utils/is-database-unavailable.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (isDatabaseUnavailable(exception)) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Temporarily unavailable',
      });
      return;
    }

    const cause =
      typeof exception === 'object' && exception !== null && 'cause' in exception
        ? (exception as { cause: unknown }).cause
        : undefined;
    if (cause instanceof Error) {
      this.logger.error(`Unhandled error cause: ${cause.message}`);
    } else if (
      typeof cause === 'object' &&
      cause !== null &&
      'message' in cause &&
      typeof (cause as { message: unknown }).message === 'string'
    ) {
      const pg = cause as { message: string; code?: string; detail?: string };
      this.logger.error(
        `Unhandled error cause [${pg.code ?? 'db'}]: ${pg.message}${
          pg.detail ? ` (${pg.detail})` : ''
        }`,
      );
    }

    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
