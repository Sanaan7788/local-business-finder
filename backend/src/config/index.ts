import { env } from './env';

// Structured config — built from validated env.
// All values here are guaranteed to be present and correctly typed.
export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  },
  db: {
    url: env.DATABASE_URL,
  },
  scraper: {
    debug: env.SCRAPER_DEBUG,
  },
  llm: {
    provider: env.LLM_PROVIDER,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    claudeModel: env.CLAUDE_MODEL,
    deepseekApiKey: env.DEEPSEEK_API_KEY,
    deepseekBaseUrl: env.DEEPSEEK_BASE_URL,
    deepseekModel: env.DEEPSEEK_MODEL,
    openaiApiKey: env.OPENAI_API_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
    mistralApiKey: env.MISTRAL_API_KEY,
    groqApiKey: env.GROQ_API_KEY,
  },
} as const;
