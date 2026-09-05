import { ApiError } from '../api-error'

export const STATIC_UNAVAILABLE = 'Not available on the static site — run this in the local app.'

/** Stand-in for every backend-only operation in the static build. */
export const notAvailable = (): Promise<never> => Promise.reject(new ApiError(STATIC_UNAVAILABLE, 501))
