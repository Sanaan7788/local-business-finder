import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../utils/errors';
import { config } from '../config';
import { logger } from '../utils/logger';

// AppError → its status + message (+ details such as validation fields).
// Multer limit errors → 400. Anything else → 500 with a generic message; the
// real message is logged (and returned as `detail` in development only).
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const error = err instanceof Error ? err : new Error(String(err));

  let status = 500;
  let body: Record<string, unknown> = { success: false, error: 'Internal Server Error' };

  if (err instanceof AppError) {
    status = err.statusCode;
    body = { success: false, error: err.message, ...err.details };
  } else if (err instanceof multer.MulterError) {
    status = 400;
    body = { success: false, error: err.message };
  } else if (config.server.nodeEnv === 'development') {
    body.detail = error.message;
  }

  const line = `${req.method} ${req.originalUrl} → ${status}: ${error.message}`;
  if (status >= 500) {
    const cause = (error as { cause?: unknown }).cause;
    logger.error(line, { stack: error.stack, ...(cause instanceof Error && { cause: cause.message }) });
  } else {
    logger.warn(line); // expected client errors: no stack noise
  }

  res.status(status).json(body);
}
