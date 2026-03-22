/**
 * One-time migration: reads all records from businesses.csv and
 * inserts them into Neon PostgreSQL, skipping any that already exist.
 *
 * Run: npx tsx src/data/migrate-csv-to-postgres.ts
 */
import 'dotenv/config';
import { CsvBusinessRepository } from './csv.repository';
import { PostgresBusinessRepository } from './postgres.repository';

async function main() {
  const csv = new CsvBusinessRepository();
  const pg = new PostgresBusinessRepository();

  // Load all from CSV
  const { items: all } = await csv.findAll({ filter: {}, page: 1, pageSize: 100000 });
  console.log(`Found ${all.length} records in CSV.`);

  // Load existing IDs from Postgres to skip duplicates
  const { items: existing } = await pg.findAll({ filter: {}, page: 1, pageSize: 100000 });
  const existingIds = new Set(existing.map(b => b.id));
  console.log(`Found ${existing.length} records already in Postgres.`);

  let created = 0;
  let skipped = 0;
  for (const business of all) {
    if (existingIds.has(business.id)) {
      skipped++;
      continue;
    }
    await pg.create(business);
    console.log(`  + ${business.name}`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already existed).`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
