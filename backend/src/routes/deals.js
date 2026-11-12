import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, allowRoles } from '../middleware/auth.js';

const router = Router();
const makeCode = () => `DEAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

router.post('/', authenticate, allowRoles('BUYER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = z.object({
      listingId: z.string().min(1),
      price: z.coerce.number().finite().positive()
    }).parse(req.body);

    const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
    if (!listing || listing.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Iri tangazo ntirikiboneka ku rubuga.' });
    }
    if (listing.sellerId === req.user.id) {
      return res.status(400).json({ error: 'Ntushobora gutanga igiciro ku itangazo ryawe bwite.' });
    }

    // Komisiyo ntikorwa hano: ibarwa gusa igihe Admin yemeje ko SALE_COMPLETED.
    const commissionAmount = Number((data.price * 0.05).toFixed(2));
    const deal = await prisma.deal.create({
      data: {
        code: makeCode(),
        listingId: listing.id,
        buyerId: req.user.id,
        sellerId: listing.sellerId,
        price: data.price,
        currency: listing.currency,
        commissionRate: 0.05,
        commissionAmount
      },
      include: {
        listing: { include: { images: { orderBy: { createdAt: 'asc' } } } },
        buyer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
        commission: true
      }
    });
    return res.status(201).json({ deal });
  } catch (error) { return next(error); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const where = req.user.role === 'ADMIN'
      ? {}
      : { OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }] };
    const deals = await prisma.deal.findMany({
      where,
      include: {
        listing: { include: { images: { orderBy: { createdAt: 'asc' } } } },
        buyer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
        commission: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ deals });
  } catch (error) { return next(error); }
});

router.patch('/:id/status', authenticate, allowRoles('ADMIN'), async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['INTERESTED', 'NEGOTIATION', 'SALE_AGREEMENT', 'SALE_COMPLETED', 'DISPUTED'])
    }).parse(req.body);

    const deal = await prisma.$transaction(async tx => {
      const current = await tx.deal.findUnique({ where: { id: req.params.id } });
      if (!current) {
        const error = new Error('Amasezerano ntiyabonetse.'); error.status = 404; throw error;
      }
      if (current.status === 'SALE_COMPLETED' && status !== 'SALE_COMPLETED') {
        const error = new Error('Igurisha ryarangiye ntirishobora gusubizwa inyuma.'); error.status = 409; throw error;
      }

      if (status === 'SALE_COMPLETED' && current.status !== 'SALE_COMPLETED') {
        // Conditional update prevents two deals from selling the same listing concurrently.
        const sold = await tx.listing.updateMany({
          where: { id: current.listingId, status: 'APPROVED' },
          data: { status: 'SOLD' }
        });
        if (sold.count !== 1) {
          const error = new Error('Iri tangazo ntirikiri APPROVED; rishobora kuba ryaragurishijwe cyangwa ryarahagaritswe.');
          error.status = 409; throw error;
        }
      }

      const updated = await tx.deal.update({
        where: { id: current.id },
        data: { status },
        include: {
          listing: { include: { images: { orderBy: { createdAt: 'asc' } } } },
          buyer: { select: { id: true, fullName: true } },
          seller: { select: { id: true, fullName: true } },
          commission: true
        }
      });

      if (status === 'SALE_COMPLETED') {
        await tx.commission.upsert({
          where: { dealId: current.id },
          create: {
            dealId: current.id,
            amount: current.commissionAmount,
            currency: current.currency,
            status: 'PENDING'
          },
          // Keep an already verified PAID state and reference intact on retries.
          update: { amount: current.commissionAmount, currency: current.currency }
        });
      }
      return tx.deal.findUnique({
        where: { id: updated.id },
        include: { listing: true, commission: true, buyer: { select: { id: true, fullName: true } }, seller: { select: { id: true, fullName: true } } }
      });
    });
    return res.json({ deal });
  } catch (error) { return next(error); }
});

export default router;
