import { RawBusiness } from '../types/business.types';
import { DedupKey, IBusinessRepository } from '../data/repository.interface';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Deduplicator
//
// Prevents duplicate business records from being saved during a scrape.
// Two in-memory indexes are built once per session from the repository:
//   1. nameAddress  → normalized "name::address" → business id
//   2. phone        → digits-only phone → business id
//
// A session processes 50-100 listings sequentially; one query up front and
// O(1) lookups after that is far cheaper than a DB round-trip per listing.
//
// Usage:
//   const dedup = new Deduplicator();
//   await dedup.load(repo);            // once, before scraping starts
//   const dupId = dedup.isDuplicate(rawBusiness);
//   if (!dupId) { await repo.create(business); dedup.register(business); }
// ---------------------------------------------------------------------------

export class Deduplicator {
  private nameAddressIndex = new Map<string, string>(); // key → id
  private phoneIndex = new Map<string, string>();        // phone → id

  async load(repo: IBusinessRepository): Promise<void> {
    const keys = await repo.findDedupKeys();
    this.nameAddressIndex.clear();
    this.phoneIndex.clear();
    for (const k of keys) this.index(k);

    logger.debug('Deduplicator loaded', {
      businesses: keys.length,
      nameAddressKeys: this.nameAddressIndex.size,
      phoneKeys: this.phoneIndex.size,
    });
  }

  /** Returns the existing record's id if this business is already stored. */
  isDuplicate(raw: Pick<RawBusiness, 'name' | 'address' | 'phone'>): string | null {
    if (raw.phone) {
      const id = this.phoneIndex.get(this.normalizePhone(raw.phone));
      if (id) {
        logger.debug('Duplicate detected by phone', { phone: raw.phone, id });
        return id;
      }
    }

    const id = this.nameAddressIndex.get(this.makeNameAddressKey(raw.name, raw.address));
    if (id) {
      logger.debug('Duplicate detected by name+address', { name: raw.name, id });
      return id;
    }

    return null;
  }

  /** Whether a digits-only phone is indexed (used to report the skip reason). */
  hasPhone(normalizedPhone: string): boolean {
    return this.phoneIndex.has(normalizedPhone);
  }

  /** Register a newly saved business so later listings in the session see it. */
  register(business: DedupKey): void {
    this.index(business);
  }

  // ---- Private helpers ----------------------------------------------------

  private index(b: DedupKey): void {
    this.nameAddressIndex.set(this.makeNameAddressKey(b.name, b.address), b.id);
    if (b.phone) this.phoneIndex.set(this.normalizePhone(b.phone), b.id);
  }

  private makeNameAddressKey(name: string, address: string): string {
    const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${norm(name)}::${norm(address)}`;
  }

  private normalizePhone(phone: string): string {
    // "(212) 380-8585" and "2123808585" both normalize to "2123808585"
    return phone.replace(/\D/g, '');
  }
}
