/** Every failure from the data layer — HTTP error, network error, timeout, or a static-mode refusal. */
export class ApiError extends Error {
  readonly status?: number
  readonly fields?: Record<string, string[] | undefined>

  constructor(message: string, status?: number, fields?: Record<string, string[] | undefined>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}
