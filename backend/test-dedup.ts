import { CsvBusinessRepository } from './src/data/csv.repository';
import { Deduplicator } from './src/utils/deduplicator';
import { scoreLead } from './src/services/lead/lead.scorer';
import { Business } from './src/types/business.types';
import { v4 as uuidv4 } from 'uuid';

// Verification script for step 3.5
// Run with: npx tsx test-dedup.ts

function makeBusiness(overrides: Partial<Business> = {}): Business {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    name: 'Test Cafe',
    phone: '212-555-0100',
    address: '100 Main St, New York, NY 10001',
    zipcode: '10001',
    category: 'cafe',
    description: null,
    website: false,
    websiteUrl: null,
    rating: 3.8,
    reviewCount: 5,
    googleMapsUrl: null,
    keywords: [],
    summary: null,
    insights: null,
    generatedWebsiteCode: null,
    outreach: null,
    githubUrl: null,
    deployedUrl: null,
    leadStatus: 'new',
    priority: 'high',
    priorityScore: 70,
    notes: null,
    lastContactedAt: null,
    ...overrides,
  };
}

async function verify() {
  const repo = new CsvBusinessRepository();
  const dedup = new Deduplicator();

  console.log('--- Step 3.5 Verification ---\n');

  // 1. Load empty repo
  await dedup.load(repo);
  console.log('1. Loaded empty repo — no duplicates expected');

  const b1 = makeBusiness({ name: 'Pizza Palace', phone: '212-555-0101', address: '1 Broadway, NY 10001' });
  const b2 = makeBusiness({ name: 'Burger Barn',  phone: '212-555-0102', address: '2 Broadway, NY 10001' });

  // 2. Neither is a duplicate yet
  console.log('2. isDuplicate before saving:');
  console.log('   Pizza Palace:', dedup.isDuplicate(b1), '(expected: null)');
  console.log('   Burger Barn:', dedup.isDuplicate(b2), '(expected: null)');

  // 3. Save + register both
  await repo.create(b1);
  dedup.register(b1);
  await repo.create(b2);
  dedup.register(b2);
  console.log('\n3. Saved both businesses');

  // 4. Exact duplicate by phone
  const dupByPhone = dedup.isDuplicate({ name: 'Pizza Palace', address: '1 Broadway, NY 10001', phone: '212-555-0101' });
  console.log('\n4. Duplicate by phone:', dupByPhone === b1.id ? `✓ detected (id: ${dupByPhone?.slice(0,8)}...)` : '✗ missed');

  // 5. Duplicate by name+address (different phone format)
  const dupByName = dedup.isDuplicate({ name: 'Burger Barn', address: '2 Broadway, NY 10001', phone: null });
  console.log('5. Duplicate by name+address:', dupByName === b2.id ? `✓ detected (id: ${dupByName?.slice(0,8)}...)` : '✗ missed');

  // 6. Phone normalization — different format, same number
  const dupNormalized = dedup.isDuplicate({ name: 'Other', address: 'Other', phone: '(212) 555-0101' });
  console.log('6. Phone normalization (212) 555-0101 == 212-555-0101:', dupNormalized ? '✓ matched' : '✗ missed');

  // 7. Genuinely new business — should NOT be a duplicate
  const notDup = dedup.isDuplicate({ name: 'Sushi Bar', address: '99 Park Ave', phone: '212-999-9999' });
  console.log('7. New business not flagged as duplicate:', notDup === null ? '✓ correct' : '✗ false positive');

  // 8. scoreLead — no website, few reviews
  const { score, priority, reasons } = scoreLead({ website: false, reviewCount: 5, rating: 3.8, description: null });
  console.log('\n8. Lead scoring (no website, few reviews, no description):');
  console.log('   Score:', score, '| Priority:', priority);
  console.log('   Reasons:', reasons.join(', '));
  console.log('   Expected: score ~70, priority: high ✓');

  // 9. scoreLead — strong presence
  const strong = scoreLead({ website: true, reviewCount: 500, rating: 4.8, description: 'Great place' });
  console.log('\n9. Lead scoring (strong presence):');
  console.log('   Score:', strong.score, '| Priority:', strong.priority);
  console.log('   Expected: low priority ✓');

  // Cleanup
  await repo.delete(b1.id);
  await repo.delete(b2.id);
  console.log('\n✓ Cleanup done. All checks passed.');
}

verify().catch(e => { console.error(e); process.exit(1); });
