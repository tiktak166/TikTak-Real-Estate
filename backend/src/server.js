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

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true
}));

app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TikTak Real Estate API',
    time: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message
      }))
    });
  }

  if (err instanceof multer.MulterError) {
    let message = 'Habaye ikibazo kuri dosiye wohereje.';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = req.path.endsWith('/video')
        ? 'Video ntigomba kurenza 50 MB.'
        : 'Buri foto ntigomba kurenza 10 MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Hitamo video imwe gusa cyangwa amafoto atarenze 10.';
    }

    return res.status(400).json({ error: message });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

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
