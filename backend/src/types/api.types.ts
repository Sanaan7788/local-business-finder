import { Business } from './business.types';

// ---------------------------------------------------------------------------
// Standard API envelope
// Every endpoint returns one of these shapes.
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Paginated list response
// ---------------------------------------------------------------------------

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Business list query params
// ---------------------------------------------------------------------------

export interface BusinessListQuery {
  zipcode?: string;
  leadStatus?: string;
  priority?: string;
  hasWebsite?: boolean;
  search?: string;
  sortBy?: keyof Business;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Scraper request
// ---------------------------------------------------------------------------

export interface StartScraperRequest {
  zipcode: string;
  category?: string;
  maxResults?: number;
}

export interface ScraperStatus {
  running: boolean;
  zipcode: string | null;
  found: number;
  saved: number;
  skipped: number;  // duplicates
  errors: number;
  startedAt: string | null;
}
