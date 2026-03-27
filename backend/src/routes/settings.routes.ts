import { Router, Request, Response } from 'express';
import { getAllProviders, getActiveProvider, setActiveProvider } from '../services/llm/llm.config';
import { LLMService } from '../services/llm/llm.service';

const router = Router();

// GET /api/settings/llm
// Returns all providers and the currently active one.
router.get('/llm', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      active: getActiveProvider(),
      providers: getAllProviders(),
    },
  });
});

// POST /api/settings/llm
// Body: { provider: 'deepseek' | 'claude' | 'openai' | 'gemini' | 'mistral' | 'groq' }
// Switches the active LLM provider at runtime (no restart needed).
router.post('/llm', (req: Request, res: Response) => {
  const { provider } = req.body as { provider: string };
  const known = getAllProviders().map(p => p.id);

  if (!provider || !known.includes(provider)) {
    res.status(400).json({ success: false, error: `Unknown provider "${provider}". Supported: ${known.join(', ')}` });
    return;
  }

  const providerInfo = getAllProviders().find(p => p.id === provider)!;
  if (!providerInfo.configured) {
    res.status(400).json({ success: false, error: `Provider "${provider}" is not configured — add its API key to .env first.` });
    return;
  }

  setActiveProvider(provider);
  LLMService.resetCache(); // clear adapter cache so next call uses the new provider

  res.json({ success: true, data: { active: provider } });
});

export default router;
