import { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 does not catch rejected promises from async handlers.
// Wrap every async route so a thrown error reaches the error middleware.
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
