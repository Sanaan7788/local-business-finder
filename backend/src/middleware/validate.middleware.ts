import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

// Validates req.body against a Zod schema; replaces the body with the parsed
// (defaulted, coerced) value on success.
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError('Validation failed', result.error.flatten().fieldErrors));
      return;
    }
    req.body = result.data;
    next();
  };
}
