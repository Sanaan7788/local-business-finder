import { Router } from 'express';
import { z } from 'zod';
import { getAllProviders, getActiveProvider, setActiveProvider } from '../services/llm/llm.config';
import { PROVIDER_IDS, ProviderId } from '../services/llm/llm.interface';
import { getRepository } from '../data/repository.factory';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/async.handler';
import { ValidationError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Settings Routes — /api/settings
//
// GET  /llm    — all providers + the active one
// POST /llm    — switch the active provider at runtime (in-memory)
// GET  /stats  — total LLM tokens used across all businesses
// ---------------------------------------------------------------------------

const router = Router();

router.get('/llm', (_req, res) => {
  res.json({ success: true, data: { active: getActiveProvider(), providers: getAllProviders() } });
});

router.post('/llm', validateBody(z.object({ provider: z.enum(PROVIDER_IDS) })), asyncHandler(async (req, res) => {
  const { provider } = req.body as { provider: ProviderId };
  const info = getAllProviders().find((p) => p.id === provider);
  if (!info?.configured) {
    throw new ValidationError(`Provider "${provider}" is not configured — add its API key to backend/.env first.`);
  }
  setActiveProvider(provider);
  res.json({ success: true, data: { active: provider } });
}));

router.get('/stats', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { totalTokensUsed: await getRepository().totalTokensUsed() } });
}));

export default router;
