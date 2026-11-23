import { Logger, type INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export function useRequestLogging(
  app: INestApplication,
  serviceName: string,
): void {
  const logger = new Logger(serviceName);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const { method } = req;
    const path = req.originalUrl ?? req.url;

    logger.log(`→ ${method} ${path}`);

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      logger.log(`← ${method} ${path} ${res.statusCode} ${durationMs}ms`);
    });

    next();
  });
}