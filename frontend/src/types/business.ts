// ---------------------------------------------------------------------------
// Frontend type definitions — kept in sync with backend business.types.ts
// These are plain TypeScript types (no Zod dependency on the frontend).
// ---------------------------------------------------------------------------

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'contacted'
  | 'interested'
  | 'closed'
  | 'rejected';

export type Priority = 'high' | 'medium' | 'low';

export interface Insights {
  whyNeedsWebsite: string;
  whatsMissingOnline: string;
  opportunities: string[];
}

export interface Outreach {
  email: {
    subject: string;
    body: string;
  } | null;
  callScript: {
    opener: string;
    valueProposition: string;
    objectionHandlers: {
      notInterested: string;
      haveOne: string;
    };
    close: string;
  } | null;
}

export interface Business {
  // Identity
  id: string;
  createdAt: string;
  updatedAt: string;

  // Discovery
  name: string;
  phone: string | null;
  address: string;
  zipcode: string;
  category: string;
  description: string | null;
  website: boolean;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  googleMapsUrl: string | null;

  // AI outputs
  keywords: string[];
  summary: string | null;
  insights: Insights | null;

  // Generated content
  generatedWebsiteCode: string | null;
  outreach: Outreach | null;

  // Deployment
  githubUrl: string | null;
  deployedUrl: string | null;

  // CRM / Lead
  leadStatus: LeadStatus;
  priority: Priority;
  priorityScore: number;
  notes: string | null;
  lastContactedAt: string | null;
}

// ---------------------------------------------------------------------------
// API response shapes
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

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SavedEntry {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  priority: string;
  priorityScore: number;
  website: boolean;
}

export interface SkippedEntry {
  name: string;
  address: string;
  reason: 'phone' | 'name+address';
  existingId: string;
}

export interface ErrorEntry {
  name: string;
  message: string;
}

export interface BatchProgress {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: { zipcode: string; category: string; maxResults: number }[];
}

export interface ScraperStatus {
  running: boolean;
  zipcode: string | null;
  category: string | null;
  found: number;
  saved: number;
  skipped: number;
  errors: number;
  startedAt: string | null;
  finishedAt: string | null;
  savedList: SavedEntry[];
  skippedList: SkippedEntry[];
  errorList: ErrorEntry[];
  foundNames: string[];
  batch: BatchProgress;
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  qualified: 'Qualified',
  contacted: 'Contacted',
  interested: 'Interested',
  closed: 'Closed',
  rejected: 'Rejected',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  qualified: 'bg-purple-100 text-purple-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  interested: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-orange-100 text-orange-800',
  low: 'bg-gray-100 text-gray-600',
};
