import express from 'express';
import cors from 'cors';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import scraperRoutes from './routes/scraper.routes';
import businessesRoutes from './routes/businesses.routes';
import analysisRoutes from './routes/analysis.routes';
import websiteRoutes from './routes/website.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(loggerMiddleware);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/businesses', businessesRoutes);
app.use('/api/businesses/:id', analysisRoutes);
app.use('/api/businesses/:id', websiteRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
