import axios, { type AxiosRequestConfig } from 'axios'

// ---------------------------------------------------------------------------
// HTTP client. Every backend response is wrapped in { success, data } or
// { success: false, error, fields? }; request<T>() unwraps it and turns
// every failure — HTTP error, network error, timeout — into an ApiError.
// ---------------------------------------------------------------------------

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

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string[] | undefined> }

// AI operations (analysis, website generation, crawling) can take a few minutes
const http = axios.create({ baseURL: '/api', timeout: 300_000 })

http.interceptors.response.use(
  res => res,
  (err: unknown) => {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as Partial<Extract<Envelope<unknown>, { success: false }>> | undefined
      const message =
        body && typeof body.error === 'string' ? body.error
        : err.code === 'ECONNABORTED' ? 'Request timed out'
        : err.response ? `Request failed (${err.response.status})`
        : 'Cannot reach the backend'
      return Promise.reject(new ApiError(message, err.response?.status, body?.fields))
    }
    return Promise.reject(err)
  },
)

async function request<T>(cfg: AxiosRequestConfig): Promise<T> {
  const res = await http.request<Envelope<T>>(cfg)
  if (!res.data.success) throw new ApiError(res.data.error, res.status, res.data.fields)
  return res.data.data
}

export const api = {
  get:    <T>(url: string, params?: object) => request<T>({ method: 'GET', url, params }),
  post:   <T>(url: string, data?: unknown) => request<T>({ method: 'POST', url, data }),
  patch:  <T>(url: string, data?: unknown) => request<T>({ method: 'PATCH', url, data }),
  delete: <T>(url: string) => request<T>({ method: 'DELETE', url }),
}
