import {
  Business,
  RawBusiness,
  UpdateBusiness,
  LeadStatus,
  Priority,
} from '../types/business.types';

// ---------------------------------------------------------------------------
// Filter / sort options for findAll
// ---------------------------------------------------------------------------

export interface BusinessFilter {
  zipcode?: string;
  leadStatus?: LeadStatus;
  priority?: Priority;
  hasWebsite?: boolean;
  search?: string; // matches against name, address, category
}

export interface BusinessSort {
  field: keyof Business;
  order: 'asc' | 'desc';
}

export interface FindAllOptions {
  filter?: BusinessFilter;
  sort?: BusinessSort;
  page?: number;    // 1-based
  pageSize?: number;
}

export interface FindAllResult {
  items: Business[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// IBusinessRepository
//
// Every storage implementation (CSV, SQLite, Postgres) must satisfy this
// interface. Services depend only on this contract — never on a concrete class.
// Swapping storage = swapping the implementation, zero service changes.
// ---------------------------------------------------------------------------

export interface IBusinessRepository {
  /**
   * Persist a new business built from raw scraped data.
   * ID, timestamps, lead defaults, and priority score are
   * assigned by the service layer before calling this.
   */
  create(business: Business): Promise<Business>;

  /**
   * Return all businesses with optional filtering, sorting, pagination.
   */
  findAll(options?: FindAllOptions): Promise<FindAllResult>;

  /**
   * Return a single business by UUID. Null if not found.
   */
  findById(id: string): Promise<Business | null>;

  /**
   * Check for an existing record matching name+address or phone.
   * Used by the deduplication service before creating a new record.
   */
  findDuplicate(raw: RawBusiness): Promise<Business | null>;

  /**
   * Merge partial updates into an existing business and return the updated record.
   * Only fields present in the payload are changed — others are preserved.
   */
  update(id: string, payload: Partial<Business>): Promise<Business>;

  /**
   * Apply CRM-only fields (status, notes, lastContactedAt).
   * Convenience wrapper around update() with a restricted type.
   */
  updateLead(id: string, payload: UpdateBusiness): Promise<Business>;

  /**
   * Hard delete a business by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Return the total count of businesses, optionally filtered.
   */
  count(filter?: BusinessFilter): Promise<number>;

  /**
   * Return the sum of tokensUsed across all businesses.
   */
  totalTokensUsed(): Promise<number>;
}
