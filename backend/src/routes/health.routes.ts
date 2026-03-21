import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Local Business Finder API is running',
    env: config.server.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

export default router;
