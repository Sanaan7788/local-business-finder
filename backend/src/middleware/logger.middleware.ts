import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Access log. The scraper status endpoint is polled every few seconds while a
// scrape runs, so it stays at debug level to keep the log readable.
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`;
    if (req.originalUrl.startsWith('/api/scraper/status')) logger.debug(line);
    else logger.info(line);
  });
  next();
}
