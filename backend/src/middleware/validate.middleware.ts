import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Validates req.body against a Zod schema.
// Returns 400 with field-level errors if validation fails.
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        fields: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
