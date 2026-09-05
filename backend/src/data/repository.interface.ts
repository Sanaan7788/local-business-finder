import {
  Business,
  BusinessListItem,
  BusinessUpdate,
  RawBusiness,
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
  category?: string;
}

export interface BusinessSort {
  field: keyof BusinessListItem; // only real scalar columns are sortable
  order: 'asc' | 'desc';
}

export interface FindAllOptions {
  filter?: BusinessFilter;
  sort?: BusinessSort;
  page?: number;    // 1-based
  pageSize?: number;
}

export interface FindAllResult<T = Business> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** The three fields the deduplicator indexes on. */
export interface DedupKey {
  id: string;
  name: string;
  address: string;
  phone: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface PipelineStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  byPriority: Record<Priority, number>;
  noWebsite: number;
}

// ---------------------------------------------------------------------------
// IBusinessRepository — services depend only on this contract.
// ---------------------------------------------------------------------------

export interface IBusinessRepository {
  /** Persist a fully built Business (see buildBusiness). */
  create(business: Business): Promise<Business>;

  /** Filtered, sorted, paginated list. `view: 'list'` returns the light projection. */
  findAll(options: FindAllOptions & { view: 'list' }): Promise<FindAllResult<BusinessListItem>>;
  findAll(options?: FindAllOptions & { view?: 'full' }): Promise<FindAllResult<Business>>;

  findById(id: string): Promise<Business | null>;

  /** Id of an existing record matching phone or name+address, if any. */
  findDuplicateId(raw: Pick<RawBusiness, 'name' | 'address' | 'phone'>): Promise<string | null>;

  /** Every row's dedup keys — loaded once per scrape session. */
  findDedupKeys(): Promise<DedupKey[]>;

  /** Merge a partial update. Throws NotFoundError when the id does not exist. */
  update(id: string, payload: BusinessUpdate): Promise<Business>;

  /** Hard delete. Throws NotFoundError when the id does not exist. */
  delete(id: string): Promise<void>;

  getStats(filter?: BusinessFilter): Promise<PipelineStats>;

  categoryCounts(): Promise<CategoryCount[]>;

  totalTokensUsed(): Promise<number>;
}
