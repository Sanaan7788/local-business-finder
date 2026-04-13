/**
 * One-time backfill script.
 * Reads scrape-history.json, finds all error entries that don't already exist
 * in businesses.csv (by name), and creates stub records for them.
 *
 * Run: npx tsx src/data/backfill-errors.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from './repository.factory';
import { scoreLead } from '../services/lead/lead.scorer';
import { Business } from '../types/business.types';

const HISTORY_PATH = path.resolve(__dirname, 'storage/scrape-history.json');

async function main() {
  const repo = getRepository();

  // Load existing businesses so we can skip by name
  const existing = await repo.findAll({ filter: {}, sort: { field: 'name', order: 'asc' }, page: 1, pageSize: 100000 });
  const existingNames = new Set(existing.items.map(b => b.name.trim().toLowerCase()));

  // Load history
  const history: any[] = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));

  // Collect unique error entries across all sessions
  const seen = new Set<string>();
  const toCreate: { name: string; category: string; zipcode: string; message: string }[] = [];

  for (const session of history) {
    for (const err of (session.errorList ?? [])) {
      const key = err.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (existingNames.has(key)) continue;
      toCreate.push({
        name: err.name,
        category: session.category ?? 'businesses',
        zipcode: session.zipcode ?? '',
        message: err.message,
      });
    }
  }

  console.log(`Found ${toCreate.length} unique error entries to backfill.`);

  let created = 0;
  for (const entry of toCreate) {
    const { score, priority } = scoreLead({ name: entry.name, category: entry.category, zipcode: entry.zipcode, website: false });
    const now = new Date().toISOString();
    const business: Business = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      name: entry.name,
      phone: null,
      address: '',
      zipcode: entry.zipcode,
      category: entry.category,
      description: null,
      website: false,
      websiteUrl: null,
      rating: null,
      reviewCount: null,
      googleMapsUrl: null,
      reviewSnippets: [],
      menu: [],
      keywords: [],
      keywordCategories: null,
      summary: null,
      insights: null,
      contentBrief: null,
          businessContext: null,
      generatedWebsiteCode: null,
      websitePrompt: null,
      websiteAnalysis: null,
      outreach: null,
      githubUrl: null,
      deployedUrl: null,
      tokensUsed: 0,
      leadStatus: 'new',
      priority,
      priorityScore: score,
      notes: `Scrape error: ${entry.message}`,
      lastContactedAt: null,
    };
    await repo.create(business);
    created++;
    console.log(`  + ${entry.name}`);
  }

  console.log(`\nDone. Created ${created} stub records.`);
}

main().catch(err => { console.error(err); process.exit(1); });
