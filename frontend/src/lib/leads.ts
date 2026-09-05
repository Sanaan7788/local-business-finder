import type { LeadStatus, Priority } from '../types/business'
import type { Tone } from './tones'

// Pipeline order — drives selects, the dashboard grid and badge tones.
export const LEAD_STATUSES: LeadStatus[] = ['new', 'qualified', 'contacted', 'interested', 'closed', 'rejected']

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  qualified: 'Shortlisted',
  contacted: 'Contacted',
  interested: 'Interested',
  closed: 'Closed',
  rejected: 'Rejected',
}

export const LEAD_STATUS_TONES: Record<LeadStatus, Tone> = {
  new: 'info',
  qualified: 'purple',
  contacted: 'warning',
  interested: 'success',
  closed: 'neutral',
  rejected: 'danger',
}

// Mirrors ALLOWED_TRANSITIONS in backend/src/services/lead/lead.service.ts
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['qualified', 'rejected'],
  qualified: ['new', 'contacted', 'rejected'],
  contacted: ['interested', 'rejected', 'qualified'],
  interested: ['closed', 'rejected', 'contacted'],
  closed: [],
  rejected: ['new'],
}

export const PRIORITIES: Priority[] = ['high', 'medium', 'low']

export const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' }

export const PRIORITY_TONES: Record<Priority, Tone> = { high: 'danger', medium: 'warning', low: 'neutral' }
