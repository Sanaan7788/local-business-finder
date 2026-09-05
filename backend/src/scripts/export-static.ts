/**
 * Export the database to static JSON for the GitHub Pages build.
 *
 *   npm run export:static               (root or backend/)
 *   npm run export:static -- --no-notes  (leave CRM notes out of the public snapshot)
 *
 * Writes frontend/public/data/{index.json, businesses/<id>.json, sessions.json}.
 * Needs only DATABASE_URL (from the environment or backend/.env); it does not
 * load the app config, so no LLM key is required — the deploy workflow runs
 * it with the repository secret.
 */
import * as fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { desc } from 'drizzle-orm';
import { businesses, scrapeSessions } from '../data/schema';
import { rowToBusiness, rowToListItem } from '../data/postgres/postgres.mappers';
import { rowToEntry } from '../services/scraper/session.mappers';
import { Business, BusinessListItem } from '../types/business.types';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const OUT_DIR = path.resolve(__dirname, '../../../frontend/public/data');
const SNAPSHOT_VERSION = 1;

const writeJson = (file: string, data: unknown) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const includeNotes = !process.argv.includes('--no-notes');
  const db = drizzle(neon(url));

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
