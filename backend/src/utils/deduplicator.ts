import { Business, RawBusiness } from '../types/business.types';
import { IBusinessRepository } from '../data/repository.interface';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Deduplicator
//
// Prevents duplicate business records from being saved.
// Maintains two in-memory indexes built from existing records:
//   1. nameAddress  → normalized "name::address" → business id
//   2. phone        → phone string → business id
//
// Why in-memory indexes instead of querying the repo each time?
// - A scraping session processes 50-100 businesses sequentially.
// - Querying CSV on every business = O(n) file read per business = slow.
// - Loading once into memory = O(1) lookups for the entire session.
//
// Usage:
//   const dedup = new Deduplicator();
//   await dedup.load(repo);           // call once before scraping starts
//   const isDup = dedup.isDuplicate(rawBusiness);
//   if (!isDup) {
//     const saved = await repo.create(business);
//     dedup.register(saved);          // keep index in sync
//   }
// ---------------------------------------------------------------------------

export class Deduplicator {
  private nameAddressIndex = new Map<string, string>(); // key → id
  private phoneIndex = new Map<string, string>();        // phone → id

  // Load all existing businesses from the repository into memory.
  // Call once at the start of a scraping session.
  async load(repo: IBusinessRepository): Promise<void> {
    const { items } = await repo.findAll({ pageSize: 10_000 });
    this.nameAddressIndex.clear();
    this.phoneIndex.clear();

    for (const b of items) {
      this.indexBusiness(b);
    }

    logger.debug('Deduplicator loaded', {
      businesses: items.length,
      nameAddressKeys: this.nameAddressIndex.size,
      phoneKeys: this.phoneIndex.size,
    });
  }

  // Check if a raw scraped business already exists in storage.
  // Returns the duplicate's id if found, null if it's new.
  isDuplicate(raw: Pick<RawBusiness, 'name' | 'address' | 'phone'>): string | null {
    // Phone check first — faster and more reliable identifier
    if (raw.phone) {
      const normalizedPhone = this.normalizePhone(raw.phone);
      const id = this.phoneIndex.get(normalizedPhone);
      if (id) {
        logger.debug('Duplicate detected by phone', { phone: raw.phone, id });
        return id;
      }
    }

    // Name + address check
    const key = this.makeNameAddressKey(raw.name, raw.address);
    const id = this.nameAddressIndex.get(key);
    if (id) {
      logger.debug('Duplicate detected by name+address', { name: raw.name, id });
      return id;
    }

    return null;
  }

  // Register a newly saved business into the in-memory index.
  // Call immediately after repo.create() to keep the index current.
  register(business: Pick<Business, 'id' | 'name' | 'address' | 'phone'>): void {
    this.indexBusiness(business as Business);
  }

  // ---- Private helpers ----------------------------------------------------

  private indexBusiness(b: Pick<Business, 'id' | 'name' | 'address' | 'phone'>): void {
    const key = this.makeNameAddressKey(b.name, b.address);
    this.nameAddressIndex.set(key, b.id);

    if (b.phone) {
      this.phoneIndex.set(this.normalizePhone(b.phone), b.id);
    }
  }

  private makeNameAddressKey(name: string, address: string): string {
    return (
      name.toLowerCase().trim().replace(/\s+/g, ' ') +
      '::' +
      address.toLowerCase().trim().replace(/\s+/g, ' ')
    );
  }

  private normalizePhone(phone: string): string {
    // Strip everything except digits for reliable matching
    // "(212) 380-8585" and "2123808585" both normalize to "2123808585"
    return phone.replace(/\D/g, '');
  }
}
