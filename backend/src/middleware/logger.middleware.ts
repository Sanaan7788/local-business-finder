import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
}
