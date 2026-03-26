import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import {
  Business,
  RawBusiness,
  UpdateBusiness,
  BusinessSchema,
} from '../types/business.types';
import {
  IBusinessRepository,
  BusinessFilter,
  BusinessSort,
  FindAllOptions,
  FindAllResult,
} from './repository.interface';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_DIR = path.resolve(__dirname, 'storage');
const CSV_PATH = path.join(STORAGE_DIR, 'businesses.csv');
const TMP_PATH = path.join(STORAGE_DIR, 'businesses.tmp.csv');

// Ordered column list — must match Business type exactly.
// Order here is the order in the CSV file.
const COLUMNS: (keyof Business)[] = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'phone',
  'address',
  'zipcode',
  'category',
  'description',
  'website',
  'websiteUrl',
  'rating',
  'reviewCount',
  'googleMapsUrl',
  'reviewSnippets',
  'keywords',
  'keywordCategories',
  'summary',
  'insights',
  'contentBrief',
  'generatedWebsiteCode',
  'outreach',
  'githubUrl',
  'deployedUrl',
  'leadStatus',
  'priority',
  'priorityScore',
  'notes',
  'lastContactedAt',
];

// ---------------------------------------------------------------------------
// Serialization helpers
// CSV stores everything as strings — objects/arrays are JSON-encoded.
// ---------------------------------------------------------------------------

function serialize(business: Business): Record<string, string> {
  const row: Record<string, string> = {};
  for (const col of COLUMNS) {
    const val = business[col];
    if (val === null || val === undefined) {
      row[col] = '';
    } else if (typeof val === 'object') {
      row[col] = JSON.stringify(val);
    } else {
      row[col] = String(val);
    }
  }
  return row;
}

function deserialize(row: Record<string, string>): Business {
  const raw: Record<string, unknown> = {};

  for (const col of COLUMNS) {
    const val = row[col];

    if (val === '' || val === undefined) {
      // address and zipcode are required strings — keep as empty string, not null
      if (col === 'address' || col === 'zipcode' || col === 'category' || col === 'name') {
        raw[col] = '';
      } else {
        raw[col] = null;
      }
      continue;
    }

    switch (col) {
      case 'website':
        raw[col] = val === 'true';
        break;
      case 'rating':
      case 'priorityScore':
        raw[col] = val === '' ? null : Number(val);
        break;
      case 'reviewCount':
        raw[col] = val === '' ? null : parseInt(val, 10);
        break;
      case 'keywords':
        try { raw[col] = JSON.parse(val); } catch { raw[col] = []; }
        break;
      case 'insights':
      case 'outreach':
        try { raw[col] = JSON.parse(val); } catch { raw[col] = null; }
        break;
      default:
        raw[col] = val;
    }
  }

  // Validate deserialized row against schema
  const result = BusinessSchema.safeParse(raw);
  if (!result.success) {
    logger.warn('CSV row failed schema validation — skipping', {
      name: row['name'],
      errors: result.error.flatten(),
    });
    return null as unknown as Business;
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// CsvBusinessRepository
// ---------------------------------------------------------------------------

export class CsvBusinessRepository implements IBusinessRepository {

  // ---- Internal helpers ---------------------------------------------------

  private ensureFile(): void {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(CSV_PATH)) {
      // Write header row
      const header = stringify([COLUMNS], { header: false });
      fs.writeFileSync(CSV_PATH, header, 'utf8');
      logger.debug('CSV storage initialized', { path: CSV_PATH });
    }
  }

  private readAll(): Business[] {
    this.ensureFile();
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    if (!content.trim()) return [];

    const rows: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    return rows
      .map(deserialize)
      .filter((b): b is Business => b !== null);
  }

  // Atomic write: write to .tmp → rename to .csv
  // If the process crashes mid-write, the original CSV is untouched.
  private writeAll(businesses: Business[]): void {
    this.ensureFile();
    const rows = businesses.map(serialize);
    const csv = stringify(rows, { header: true, columns: COLUMNS });
    fs.writeFileSync(TMP_PATH, csv, 'utf8');
    fs.renameSync(TMP_PATH, CSV_PATH);
  }

  // ---- Filter / sort / paginate -------------------------------------------

  private applyFilter(businesses: Business[], filter: BusinessFilter): Business[] {
    return businesses.filter((b) => {
      if (filter.zipcode && b.zipcode !== filter.zipcode) return false;
      if (filter.leadStatus && b.leadStatus !== filter.leadStatus) return false;
      if (filter.priority && b.priority !== filter.priority) return false;
      if (filter.hasWebsite !== undefined && b.website !== filter.hasWebsite) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const match =
          b.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }

  private applySort(businesses: Business[], sort: BusinessSort): Business[] {
    return [...businesses].sort((a, b) => {
      const aVal = a[sort.field] ?? '';
      const bVal = b[sort.field] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sort.order === 'asc' ? cmp : -cmp;
    });
  }

  private applyPagination(
    businesses: Business[],
    page: number,
    pageSize: number,
  ): Business[] {
    const start = (page - 1) * pageSize;
    return businesses.slice(start, start + pageSize);
  }

  // ---- IBusinessRepository ------------------------------------------------

  async create(business: Business): Promise<Business> {
    const all = this.readAll();
    all.push(business);
    this.writeAll(all);
    logger.debug('Business created', { id: business.id, name: business.name });
    return business;
  }

  async findAll(options: FindAllOptions = {}): Promise<FindAllResult> {
    const { filter = {}, sort, page = 1, pageSize = 50 } = options;

    let businesses = this.readAll();

    if (Object.keys(filter).length > 0) {
      businesses = this.applyFilter(businesses, filter);
    }

    const total = businesses.length;

    if (sort) {
      businesses = this.applySort(businesses, sort);
    }

    const items = this.applyPagination(businesses, page, pageSize);

    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<Business | null> {
    const all = this.readAll();
    return all.find((b) => b.id === id) ?? null;
  }

  async findDuplicate(raw: RawBusiness): Promise<Business | null> {
    const all = this.readAll();

    // Match on phone first (faster, more reliable)
    if (raw.phone) {
      const byPhone = all.find(
        (b) => b.phone && b.phone === raw.phone,
      );
      if (byPhone) return byPhone;
    }

    // Match on normalized name + address
    const normName = raw.name.toLowerCase().trim();
    const normAddr = raw.address.toLowerCase().trim();
    return (
      all.find(
        (b) =>
          b.name.toLowerCase().trim() === normName &&
          b.address.toLowerCase().trim() === normAddr,
      ) ?? null
    );
  }

  async update(id: string, payload: Partial<Business>): Promise<Business> {
    const all = this.readAll();
    const idx = all.findIndex((b) => b.id === id);

    if (idx === -1) {
      throw new Error(`Business not found: ${id}`);
    }

    const updated: Business = {
      ...all[idx],
      ...payload,
      id,                              // never overwrite id
      createdAt: all[idx].createdAt,   // never overwrite createdAt
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updated;
    this.writeAll(all);
    logger.debug('Business updated', { id });
    return updated;
  }

  async updateLead(id: string, payload: UpdateBusiness): Promise<Business> {
    return this.update(id, payload);
  }

  async delete(id: string): Promise<void> {
    const all = this.readAll();
    const filtered = all.filter((b) => b.id !== id);

    if (filtered.length === all.length) {
      throw new Error(`Business not found: ${id}`);
    }

    this.writeAll(filtered);
    logger.debug('Business deleted', { id });
  }

  async count(filter: BusinessFilter = {}): Promise<number> {
    let businesses = this.readAll();
    if (Object.keys(filter).length > 0) {
      businesses = this.applyFilter(businesses, filter);
    }
    return businesses.length;
  }
}
