import app from './app';
import { config } from './config';
import { logger } from './utils/logger';

const { port } = config.server;

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`Health check: http://localhost:${port}/api/health`);
});
