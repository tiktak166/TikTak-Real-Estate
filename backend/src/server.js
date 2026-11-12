import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import multer from 'multer';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import dealRoutes from './routes/deals.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';

const app = express();
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const isLocalDevelopment = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (configuredOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && isLocalDevelopment)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ntiyemerewe na CORS: ${origin}`));
  }
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'TikTak Real Estate API',
  time: new Date().toISOString()
}));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Amakuru watanze ntiyuzuye cyangwa si yo.',
      details: err.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }
  if (err instanceof multer.MulterError) {
    const isVideo = req.path.includes('/video');
    return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE'
        ? (isVideo ? 'Video ntigomba kurenza 100 MB.' : 'Buri foto ntigomba kurenza 10 MB.')
        : (isVideo ? 'Hitamo video imwe gusa.' : 'Hitamo amafoto atarenze 10.')
    });
  }
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  console.error(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => {
  console.log(`TikTak API running on http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
