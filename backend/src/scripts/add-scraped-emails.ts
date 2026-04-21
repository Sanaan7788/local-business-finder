import { sql } from 'drizzle-orm';
import { getDb } from '../data/postgres/postgres.connection';

async function main() {
  const db = getDb();
  await db.execute(sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS scraped_emails jsonb DEFAULT '[]'::jsonb NOT NULL`);
  console.log('OK — scraped_emails column added');
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
