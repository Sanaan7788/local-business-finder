import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env before any validation runs
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
// Rules:
//  - Always required: PORT, NODE_ENV, LLM_PROVIDER
//  - Provider keys: only the active provider's key is required at boot.
//    Others are optional (empty string allowed) since you may not have them yet.
//  - GitHub / Vercel: optional at boot — only required when those features run.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Server
  STORAGE_BACKEND: z.string().default('csv'),
  PORT: z
    .string()
    .default('3001')
    .refine((v) => !isNaN(parseInt(v, 10)), { message: 'PORT must be a number' }),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // LLM
  LLM_PROVIDER: z
    .enum(['claude', 'openai', 'gemini', 'deepseek', 'mistral', 'groq'])
    .default('deepseek'),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().default(''),
  CLAUDE_MODEL: z
    .enum(['claude-sonnet-3-5', 'claude-sonnet-4-6'])
    .default('claude-sonnet-4-6'),

  // OpenAI
  OPENAI_API_KEY: z.string().default(''),

  // Gemini
  GEMINI_API_KEY: z.string().default(''),

  // DeepSeek via NVIDIA NIM
  DEEPSEEK_API_KEY: z.string().default(''),
  DEEPSEEK_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  DEEPSEEK_MODEL: z.string().default('deepseek-ai/deepseek-v3.2'),

  // Mistral
  MISTRAL_API_KEY: z.string().default(''),

  // Groq
  GROQ_API_KEY: z.string().default(''),

  // GitHub (optional at boot)
  GITHUB_TOKEN: z.string().default(''),
  GITHUB_OWNER: z.string().default(''),
  GITHUB_REPO: z.string().default('local-business-sites'),
  GITHUB_REPO_ID: z.string().default(''),

  // Vercel (optional at boot)
  VERCEL_TOKEN: z.string().default(''),
  VERCEL_TEAM_ID: z.string().default(''),
});

// ---------------------------------------------------------------------------
// Provider-key cross-validation
// After base schema passes, check that the active provider has a key set.
// ---------------------------------------------------------------------------
const PROVIDER_KEY_MAP: Record<string, keyof z.infer<typeof envSchema>> = {
  claude:   'ANTHROPIC_API_KEY',
  openai:   'OPENAI_API_KEY',
  gemini:   'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral:  'MISTRAL_API_KEY',
  groq:     'GROQ_API_KEY',
};

// ---------------------------------------------------------------------------
// Validate and export
// ---------------------------------------------------------------------------
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ✗ ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error('\n[Config] Environment validation failed:\n' + issues + '\n');
    process.exit(1);
  }

  const env = result.data;

  // Check active provider has its API key
  const requiredKey = PROVIDER_KEY_MAP[env.LLM_PROVIDER];
  if (requiredKey && !env[requiredKey]) {
    console.error(
      `\n[Config] LLM_PROVIDER is set to "${env.LLM_PROVIDER}" but ${requiredKey} is empty.\n` +
      `  → Add your API key to .env or switch LLM_PROVIDER to a provider you have a key for.\n`
    );
    process.exit(1);
  }

  return env;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
