import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config(); // run from backend/ so backend/.env is picked up

export default {
  schema: './src/data/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // This Neon database is shared with other projects. Only ever diff/push the
  // tables this app owns — without this filter `db:push` proposes DROP TABLE
  // for everything else it finds.
  tablesFilter: ['businesses', 'scrape_sessions'],
} satisfies Config;
