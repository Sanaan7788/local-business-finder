import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { PROVIDER_IDS } from '../services/llm/llm.interface';

// Load backend/.env before any validation runs
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Schema
//  - DATABASE_URL is required.
//  - Only the active LLM provider's key is required at boot; the others may
//    stay empty until you want to switch to them from the UI.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().url({ message: 'must be a postgresql:// connection string' }),

  // true opens a visible Chromium window while scraping
  SCRAPER_DEBUG: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  LLM_PROVIDER: z.enum(PROVIDER_IDS).default('deepseek'),

  ANTHROPIC_API_KEY: z.string().default(''),
  CLAUDE_MODEL: z.string().min(1).default('claude-sonnet-4-6'),
  OPENAI_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  DEEPSEEK_API_KEY: z.string().default(''),
  DEEPSEEK_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  DEEPSEEK_MODEL: z.string().default('deepseek-ai/deepseek-v3.2'),
  MISTRAL_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
});

type EnvKey = keyof z.infer<typeof envSchema>;

const PROVIDER_KEY_MAP: Record<(typeof PROVIDER_IDS)[number], EnvKey> = {
  claude:   'ANTHROPIC_API_KEY',
  openai:   'OPENAI_API_KEY',
  gemini:   'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral:  'MISTRAL_API_KEY',
  groq:     'GROQ_API_KEY',
};

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

  const requiredKey = PROVIDER_KEY_MAP[env.LLM_PROVIDER];
  if (!env[requiredKey]) {
    console.error(
      `\n[Config] LLM_PROVIDER is set to "${env.LLM_PROVIDER}" but ${requiredKey} is empty.\n` +
      `  → Add your API key to backend/.env or switch LLM_PROVIDER to a provider you have a key for.\n`
    );
    process.exit(1);
  }

  return env;
}

export const env = validateEnv();
