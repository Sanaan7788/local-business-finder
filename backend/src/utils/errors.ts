// ---------------------------------------------------------------------------
// Typed application errors.
//
// Services and repositories throw these; the error middleware maps them to
// HTTP status codes. Anything that is not an AppError is a 500 and its
// message is never sent to the client.
// ---------------------------------------------------------------------------

export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, statusCode = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** 404 — the referenced entity does not exist. */
export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} not found: ${id}` : `${entity} not found`, 404);
  }
}

/** 400 — the request body/params are malformed. */
export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string[] | undefined>) {
    super(message, 400, fields ? { fields } : undefined);
  }
}

/** 422 — the request is well-formed but the current state cannot satisfy it. */
export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

/** 409 — an exclusive resource (the scraper browser) is busy. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** 502 — an upstream service (LLM, crawled site) returned something unusable. */
export class UpstreamError extends AppError {
  constructor(message: string) {
    super(message, 502);
  }
}

/**
 * Postgres unique-constraint violation (SQLSTATE 23505).
 * Drizzle wraps driver errors in DrizzleQueryError and keeps the original
 * NeonDbError (which carries `code`) on `.cause`.
 */
export function isUniqueViolation(err: unknown): boolean {
  const cause = (err as { cause?: unknown } | null)?.cause ?? err;
  return typeof cause === 'object' && cause !== null && (cause as { code?: unknown }).code === '23505';
}
