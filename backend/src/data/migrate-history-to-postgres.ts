/**
 * One-time migration: reads scrape-history.json and inserts all sessions
 * into the scrape_sessions Postgres table, skipping any that already exist.
 *
 * Run: npx tsx src/data/migrate-history-to-postgres.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { scrapeSessions } from './schema';

const HISTORY_PATH = path.resolve(__dirname, 'storage/scrape-history.json');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const db = drizzle(neon(url));

  const history: any[] = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
  console.log(`Found ${history.length} sessions in scrape-history.json`);

  let created = 0;
  let skipped = 0;

  for (const session of history) {
    // Check if already exists
    const existing = await db.select().from(scrapeSessions).where(eq(scrapeSessions.id, session.id));
    if (existing.length > 0) {
      console.log(`  ~ Skipping (already exists): ${session.zipcode} / ${session.category}`);
      skipped++;
      continue;
    }

    await db.insert(scrapeSessions).values({
      id:          session.id,
      zipcode:     session.zipcode,
      category:    session.category,
      startedAt:   new Date(session.startedAt),
      finishedAt:  new Date(session.finishedAt),
      found:       session.found,
      saved:       session.saved,
      skipped:     session.skipped,
      errors:      session.errors,
      savedList:   session.savedList ?? [],
      skippedList: session.skippedList ?? [],
      errorList:   session.errorList ?? [],
      foundNames:  session.foundNames ?? [],
    });
    console.log(`  + ${session.zipcode} / ${session.category} (${session.saved} saved, ${session.errors} errors)`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
