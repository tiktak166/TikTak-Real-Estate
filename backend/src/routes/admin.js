
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { requireCloudinary } from '../lib/cloudinary.js';

const router = Router();

router.use(authenticate, allowRoles('ADMIN'));

const listingSchema = z.object({
  type: z.enum(['LAND', 'HOUSE', 'CAR']),
  transactionType: z.enum(['RENT', 'SALE']).default('SALE'),
  title: z.string().min(5).max(140),
  country: z.enum(['Rwanda', 'Kenya']),
  province: z.string().min(2),
  district: z.string().min(2),
  locality: z.string().min(2),
  price: z.coerce.number().positive(),
  currency: z.enum(['RWF', 'KES']),
  description: z.string().min(20).max(5000)
}).superRefine((data, ctx) => {
  if (data.type !== 'HOUSE' && data.transactionType === 'RENT') {
    ctx.addIssue({
      code: 'custom',
      path: ['transactionType'],
      message: 'Ubukode buremewe ku nzu gusa.'
    });
  }
});

// OVERVIEW
router.get('/overview', async (req, res, next) => {
  try {
    const [users, listings, pending, completed, commissions] =
      await Promise.all([
        prisma.user.count(),
        prisma.listing.count(),
        prisma.listing.count({ where: { status: 'PENDING' } }),
        prisma.deal.count({ where: { status: 'SALE_COMPLETED' } }),
        prisma.commission.groupBy({
          by: ['currency', 'status'],
          _sum: { amount: true },
          _count: true
        })
      ]);

    res.json({
      users,
      listings,
      pendingListings: pending,
      completedDeals: completed,
      commissions
    });
  } catch (e) {
    next(e);
  }
});

// LISTINGS
router.get('/listings', async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            contact: true,
            country: true
          }
        },
        images: true,
        videos: true,
        _count: {
          select: {
            deals: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ listings });
  } catch (e) {
    next(e);
  }
});

// EDIT LISTING
router.patch('/listings/:id', async (req, res, next) => {
  try {
    const data = listingSchema.parse(req.body);

    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data,
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            contact: true
          }
        },
        images: true,
        videos: true,
        _count: {
          select: {
            deals: true
          }
        }
      }
    });

    res.json({ listing });
  } catch (e) {
    next(e);
  }
});

// CHANGE LISTING STATUS
router.patch('/listings/:id/status', async (req, res, next) => {
  try {
    const status = z.enum([
      'PENDING',
      'APPROVED',
      'REJECTED',
      'PAUSED',
      'SOLD'
    ]).parse(req.body.status);

    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            contact: true
          }
        }
      }
    });

    res.json({ listing });
  } catch (e) {
    next(e);
  }
});

// DELETE LISTING
router.delete('/listings/:id', async (req, res, next) => {
  try {
    const deletedData = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: req.params.id },
        include: {
          images: true,
          videos: true,
          _count: { select: { deals: true } }
        }
      });

      if (!listing) {
        const error = new Error('Iri tangazo ntiriboneka.');
        error.status = 404;
        throw error;
      }

      if (listing._count.deals > 0) {
        const error = new Error(
          'Iri tangazo rifite amasezerano (Deals), ntirishobora gusibwa.'
        );
        error.status = 409;
        throw error;
      }

      await tx.listing.delete({
        where: { id: listing.id }
      });

      return {
        id: listing.id,
        images: listing.images,
        videos: listing.videos
      };
    });

    let mediaCleanup = true;

    try {
      const cloudinary = requireCloudinary();

      const cleanupTasks = [
        ...deletedData.images.map(image =>
          cloudinary.uploader.destroy(image.publicId, {
            resource_type: 'image'
          })
        ),
        ...deletedData.videos.map(video =>
          cloudinary.uploader.destroy(video.publicId, {
            resource_type: 'video'
          })
        )
      ];

      const results = await Promise.allSettled(cleanupTasks);
      mediaCleanup = results.every(result => result.status === 'fulfilled');
    } catch {
      mediaCleanup = false;
    }

    res.json({
      deleted: true,
      id: deletedData.id,
      mediaCleanup
    });
  } catch (e) {
    next(e);
  }
});

// USERS
router.patch('/users/:id/active', async (req, res, next) => {
  try {
    const isActive = z.boolean().parse(req.body.isActive);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        contact: true,
        role: true,
        isActive: true
      }
    });

    res.json({ user });
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        contact: true,
        country: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (e) {
    next(e);
  }
});

// COMMISSIONS
router.get('/commissions', async (req, res, next) => {
  try {
    const commissions = await prisma.commission.findMany({
      include: {
        deal: {
          select: {
            code: true,
            price: true,
            seller: { select: { fullName: true } },
            listing: { select: { title: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ commissions });
  } catch (e) {
    next(e);
  }
});

router.patch('/commissions/:id/paid', async (req, res, next) => {
  try {
    const reference = String(req.body.reference || '').trim();

    if (!reference) {
      return res.status(400).json({
        error: 'Payment reference is required after manual verification'
      });
    }

    const commission = await prisma.commission.update({
      where: { id: req.params.id },
      data: {
        status: 'PAID',
        reference,
        paidAt: new Date()
      }
    });

    res.json({ commission });
  } catch (e) {
    next(e);
  }
});

// IMAGES
router.get('/images', async (req, res, next) => {
  try {
    const images = await prisma.listingImage.findMany({
      include: {
        listing: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            country: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ images });
  } catch (e) {
    next(e);
  }
});

router.delete('/images/:id', async (req, res, next) => {
  try {
    const image = await prisma.listingImage.findUnique({
      where: { id: req.params.id }
    });

    if (!image) {
      return res.status(404).json({ error: 'Ifoto ntibonetse.' });
    }

    await requireCloudinary().uploader.destroy(image.publicId, {
      resource_type: 'image'
    });

    await prisma.listingImage.delete({
      where: { id: image.id }
    });

    res.json({ deleted: true, id: image.id });
  } catch (e) {
    next(e);
  }
});

// DELETE VIDEO
router.delete('/videos/:id', async (req, res, next) => {
  try {
    const video = await prisma.listingVideo.findUnique({
      where: { id: req.params.id }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video ntibonetse.' });
    }

    await requireCloudinary().uploader.destroy(video.publicId, {
      resource_type: 'video'
    });

    await prisma.listingVideo.delete({
      where: { id: video.id }
    });

    res.json({ deleted: true, id: video.id });
  } catch (e) {
    next(e);
  }
});

export default router;
