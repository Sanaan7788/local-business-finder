/**
 * Apply status/notes changes exported from the static site's "Local changes"
 * widget (frontend/src/lib/api/static/overlay.ts) to the database.
 *
 *   npm run import:changes -- ~/Downloads/lbf-changes-2026-09-05.json [--dry-run] [--force]
 *
 * The file stores each business's final state, so it is written directly
 * through the repository rather than replayed through LeadService transitions
 * (a multi-step path such as new → shortlisted → contacted was already
 * validated step by step on the site). If a business's status changed in the
 * database since the snapshot was exported, it is reported as a conflict and
 * skipped unless --force is given. Afterwards re-run `npm run export:static`.
 */
import * as fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { getRepository } from '../data/repository.factory';
import { Business, BusinessUpdate, LeadStatusSchema } from '../types/business.types';

const ChangeSchema = z.object({
  leadStatus: LeadStatusSchema.optional(),
  fromLeadStatus: LeadStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  lastContactedAt: z.string().nullable().optional(),
  updatedAt: z.string(),
});

const ChangesFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  snapshotExportedAt: z.string().optional(),
  changes: z.record(ChangeSchema),
});

function describe(current: Business, payload: BusinessUpdate): string {
  const parts: string[] = [];
  if (payload.leadStatus !== undefined) parts.push(`status ${current.leadStatus} → ${payload.leadStatus}`);
  if (payload.lastContactedAt !== undefined) parts.push(`last contacted ${payload.lastContactedAt ?? 'cleared'}`);
  if (payload.notes !== undefined) parts.push(payload.notes === null ? 'notes cleared' : `notes (${payload.notes.length} chars)`);
  return parts.join(', ');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('Usage: npm run import:changes -- <lbf-changes.json> [--dry-run] [--force]');
    process.exit(1);
  }

  const parsed = ChangesFileSchema.safeParse(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')));
  if (!parsed.success) {
    console.error('Not a valid changes file:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const { changes, exportedAt, snapshotExportedAt } = parsed.data;
  console.log(`${dryRun ? '[dry run] ' : ''}Applying ${Object.keys(changes).length} change(s) exported ${exportedAt}${snapshotExportedAt ? ` from the snapshot of ${snapshotExportedAt}` : ''}`);

  const repo = getRepository();
  const counts = { applied: 0, unchanged: 0, conflict: 0, notFound: 0 };

  for (const [id, change] of Object.entries(changes)) {
    const current = await repo.findById(id);
    if (!current) {
      counts.notFound += 1;
      console.log(`  ✗ ${id}: not in the database`);
      continue;
    }

    const payload: BusinessUpdate = {};
    if (change.leadStatus !== undefined && change.leadStatus !== current.leadStatus) {
      if (change.fromLeadStatus && change.fromLeadStatus !== current.leadStatus && !force) {
        counts.conflict += 1;
        console.log(`  ! ${current.name}: status is ${current.leadStatus} in the database but was ${change.fromLeadStatus} in the snapshot — skipped (use --force to apply ${change.leadStatus})`);
        continue;
      }
      payload.leadStatus = change.leadStatus;
    }
    if (change.lastContactedAt !== undefined && change.lastContactedAt !== current.lastContactedAt) payload.lastContactedAt = change.lastContactedAt;
    if (change.notes !== undefined && change.notes !== current.notes) payload.notes = change.notes;

    if (Object.keys(payload).length === 0) {
      counts.unchanged += 1;
      continue;
    }
    console.log(`  ✓ ${current.name}: ${describe(current, payload)}`);
    if (!dryRun) await repo.update(id, payload);
    counts.applied += 1;
  }

  console.log(`\n${dryRun ? 'Would apply' : 'Applied'} ${counts.applied}, unchanged ${counts.unchanged}, conflicts ${counts.conflict}, not found ${counts.notFound}`);
  if (counts.applied > 0 && !dryRun) console.log('Re-run `npm run export:static` and push to publish the new statuses.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
