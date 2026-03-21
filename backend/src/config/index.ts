import { env } from './env';

// Structured config — built from validated env.
// All values here are guaranteed to be present and correctly typed.
export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
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
  github: {
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    repoId: env.GITHUB_REPO_ID,
  },
  vercel: {
    token: env.VERCEL_TOKEN,
    teamId: env.VERCEL_TEAM_ID,
  },
};
