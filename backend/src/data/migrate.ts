/**
 * Run this once to create the tables in your Postgres database.
 *   DATABASE_URL=... npx tsx src/data/migrate.ts
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const db = drizzle(neon(url));
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');

  console.log('Running migrations from', migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log('Migrations complete');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
