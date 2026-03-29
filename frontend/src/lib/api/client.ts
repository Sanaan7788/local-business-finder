import axios from 'axios'

// ---------------------------------------------------------------------------
// Axios instance — all requests go through here
// ---------------------------------------------------------------------------

export const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
})

// Unwrap the { success, data } envelope so callers get data directly
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err),
)

export function unwrap<T>(res: { data: { success: boolean; data: T; error?: string } }): T {
  if (!res.data.success) throw new Error(res.data.error ?? 'API error')
  return res.data.data
}
