import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { config } from '../../config';

// ---------------------------------------------------------------------------
// DB connection — the single Drizzle instance for the whole app.
// Neon's HTTP driver is stateless: every query is an independent request,
// so there is no pool to manage.
// ---------------------------------------------------------------------------

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  return (_db ??= drizzle(neon(config.db.url)));
}
