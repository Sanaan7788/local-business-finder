import { ApiError } from './api/client'

/** Human-readable message for anything thrown by the API layer. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}
