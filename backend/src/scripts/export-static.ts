/**
 * Export the database to static JSON for the GitHub Pages build.
 *
 *   npm run export:static               (root or backend/)
 *   npm run export:static -- --no-notes  (leave CRM notes out of the public snapshot)
 *
 * Writes frontend/public/data/{index.json, businesses/<id>.json, sessions.json}.
 * Reuses the Postgres mappers, which load config/env.ts, so the same
 * backend/.env that `npm run dev` needs must be present.
 */
import * as fs from 'fs';
import path from 'path';
import { desc } from 'drizzle-orm';
import { getDb } from '../data/postgres/postgres.connection';
import { businesses, scrapeSessions } from '../data/schema';
import { rowToBusiness, rowToListItem } from '../data/postgres/postgres.mappers';
import { rowToEntry } from '../services/scraper/scrape.history';
import { Business, BusinessListItem } from '../types/business.types';

const OUT_DIR = path.resolve(__dirname, '../../../frontend/public/data');
const SNAPSHOT_VERSION = 1;

const writeJson = (file: string, data: unknown) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

async function main() {
  const includeNotes = !process.argv.includes('--no-notes');
  const db = getDb();

  const businessRows = await db.select().from(businesses).orderBy(desc(businesses.createdAt));
  const sessionRows = await db.select().from(scrapeSessions).orderBy(desc(scrapeSessions.startedAt));

  const items: BusinessListItem[] = [];
  const full: Business[] = [];
  const skipped: string[] = [];
  for (const row of businessRows) {
    const business = rowToBusiness(row);
    if (!business) {
      skipped.push(`${row.id} (${row.name})`);
      continue;
    }
    const item = rowToListItem(row);
    if (!includeNotes) {
      business.notes = null;
      item.notes = null;
    }
    full.push(business);
    items.push(item);
  }
  const sessions = sessionRows.map(rowToEntry);

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT_DIR, 'businesses'), { recursive: true });

  const meta = {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    total: items.length,
    totalTokensUsed: items.reduce((sum, b) => sum + b.tokensUsed, 0),
  };
  writeJson(path.join(OUT_DIR, 'index.json'), { meta, items });
  for (const business of full) writeJson(path.join(OUT_DIR, 'businesses', `${business.id}.json`), business);
  writeJson(path.join(OUT_DIR, 'sessions.json'), sessions);

  console.log(`Snapshot written to ${OUT_DIR}`);
  console.log(`  businesses: ${items.length}${skipped.length ? ` (${skipped.length} failed validation and were skipped)` : ''}`);
  console.log(`  sessions:   ${sessions.length}`);
  console.log(`  notes:      ${includeNotes ? 'included' : 'excluded (--no-notes)'}`);
  console.log(`  exportedAt: ${meta.exportedAt}`);
  for (const s of skipped) console.log(`  skipped ${s}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
