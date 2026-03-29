import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// ---------------------------------------------------------------------------
// DB connection (singleton)
// ---------------------------------------------------------------------------

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  _db = drizzle(neon(url));
  return _db;
}

export { getDb };
