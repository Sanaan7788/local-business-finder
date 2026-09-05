import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { BrowserManager } from './services/scraper/browser.manager';

const { port } = config.server;

const server = app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`Health check: http://localhost:${port}/api/health`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown — close the HTTP server and any Chromium the scraper
// launched. SIGINT also fires on every `tsx watch` restart, which is what
// used to leave orphaned browser processes behind.
// ---------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(reason: string, code = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Shutting down (${reason})`);
  setTimeout(() => process.exit(code), 10_000).unref(); // force-exit safety net
  server.close();
  await BrowserManager.getInstance().close().catch(() => undefined);
  process.exit(code);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.stack : String(reason),
  });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { stack: err.stack });
  void shutdown('uncaughtException', 1);
});
