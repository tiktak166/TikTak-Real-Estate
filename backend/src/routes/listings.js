
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { listingImageUpload } from '../middleware/imageUpload.js';
import { uploadImage } from '../lib/cloudinary.js';

const router = Router();

const schema = z.object({
  type: z.enum(['LAND', 'HOUSE', 'CAR']),
  transactionType: z.enum(['RENT', 'SALE']).default('SALE'),
  title: z.string().min(5).max(140),
  country: z.enum(['Rwanda', 'Kenya']),
  province: z.string().min(2),
  district: z.string().min(2),
  locality: z.string().min(2),
  price: z.coerce.number().positive(),
  currency: z.enum(['RWF', 'KES']),
  description: z.string().min(20).max(5000),
  details: z.record(z.string(), z.unknown()).optional()
}).superRefine((data, ctx) => {
  if (data.type !== 'HOUSE' && data.transactionType === 'RENT') {
    ctx.addIssue({
      code: 'custom',
      path: ['transactionType'],
      message: 'Ubukode buremewe ku nzu gusa.'
    });
  }
});

const code = () =>
  `TT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

router.get('/', async (req, res, next) => {
  try {
    const { country, type, location } = req.query;
    const transactionType = String(req.query.transactionType || '').toUpperCase();

    const rows = await prisma.listing.findMany({
      where: {
        status: 'APPROVED',
        ...(country ? { country: String(country) } : {}),
        ...(type ? { type: String(type).toUpperCase() } : {}),
        ...(['RENT', 'SALE'].includes(transactionType)
          ? { transactionType }
          : {}),
        ...(location
          ? {
              OR: [
                { province: { contains: String(location), mode: 'insensitive' } },
                { district: { contains: String(location), mode: 'insensitive' } },
                { locality: { contains: String(location), mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        seller: {
          select: {
            fullName: true,
            country: true
          }
        },
        images: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            url: true,
            format: true,
            width: true,
            height: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ listings: rows });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  authenticate,
  allowRoles('SELLER', 'AGENT', 'ADMIN'),
  async (req, res, next) => {
    try {
      const d = schema.parse(req.body);

      const listing = await prisma.listing.create({
        data: {
          ...d,
          code: code(),
          sellerId: req.user.id,
          status: 'PENDING'
        }
      });

      res.status(201).json({ listing });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/:id/images',
  authenticate,
  allowRoles('SELLER', 'AGENT', 'ADMIN'),
  (req, res, next) => {
    listingImageUpload(req, res, async err => {
      if (err) return next(err);

      try {
        if (!req.files?.length) {
          return res.status(400).json({
            error: 'Hitamo nibura ifoto imwe.'
          });
        }

        const listing = await prisma.listing.findUnique({
          where: { id: req.params.id },
          select: { id: true, sellerId: true }
        });

        if (!listing) {
          return res.status(404).json({
            error: 'Itangazo ntiriboneka.'
          });
        }

        if (req.user.role !== 'ADMIN' && listing.sellerId !== req.user.id) {
          return res.status(403).json({
            error: 'Ntufite uburenganzira kuri iri tangazo.'
          });
        }

        const count = await prisma.listingImage.count({
          where: { listingId: listing.id }
        });

        if (count + req.files.length > 10) {
          return res.status(400).json({
            error: 'Itangazo ntirishobora kurenza amafoto 10.'
          });
        }

        const rows = [];

        for (const f of req.files) {
          const r = await uploadImage(
            f.buffer,
            `tiktak-real-estate/listings/${listing.id}`
          );

          rows.push({
            listingId: listing.id,
            url: r.secure_url,
            publicId: r.public_id,
            format: r.format,
            bytes: r.bytes,
            width: r.width,
            height: r.height
          });
        }

        const saved = await prisma.listingImage.createMany({
          data: rows
        });

        const images = await prisma.listingImage.findMany({
          where: { listingId: listing.id },
          orderBy: { createdAt: 'asc' }
        });

        res.status(201).json({
          uploaded: saved.count,
          images
        });
      } catch (e) {
        next(e);
      }
    });
  }
);

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { sellerId: req.user.id },
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ listings });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/:id/status',
  authenticate,
  allowRoles('ADMIN'),
  async (req, res, next) => {
    try {
      const status = z.enum([
        'APPROVED',
        'REJECTED',
        'PAUSED',
        'SOLD'
      ]).parse(req.body.status);

      const listing = await prisma.listing.update({
        where: { id: req.params.id },
        data: { status }
      });

      res.json({ listing });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
