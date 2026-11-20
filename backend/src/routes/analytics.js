
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

const visitSchema = z.object({
  visitorId: z.string().uuid(),
  path: z.enum([
    '/',
    '/index.html',
    '/listing.html',
    '/account.html',
    '/dashboard.html'
  ]),
  listingId: z.string().min(1).max(100).optional().nullable()
});

router.post('/visit', async (req, res, next) => {
  try {
    const userAgent = req.get('user-agent') || '';

    // Exclude bots and automated crawlers.
    if (/bot|crawler|spider|slurp|headless|preview/i.test(userAgent)) {
      return res.sendStatus(204);
    }

    const result = visitSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid analytics data'
      });
    }

    const { visitorId, path, listingId } = result.data;

    let validListingId = null;

    if (path === '/listing.html') {
      if (!listingId) {
        return res.status(400).json({
          error: 'Listing ID is required'
        });
      }

      const listing = await prisma.listing.findFirst({
        where: {
          id: listingId,
          status: 'APPROVED'
        },
        select: {
          id: true
        }
      });

      if (!listing) {
        return res.sendStatus(204);
      }

      validListingId = listing.id;
    } else if (listingId) {
      return res.status(400).json({
        error: 'Listing ID is not allowed for this page'
      });
    }

    await prisma.pageVisit.create({
      data: {
        visitorId,
        path,
        listingId: validListingId
      }
    });

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

export default router;
