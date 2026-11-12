import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { requireCloudinary } from '../lib/cloudinary.js';

const router = Router();
router.use(authenticate, allowRoles('ADMIN'));

router.get('/overview', async (req, res, next) => {
  try {
    const [users, listings, pendingListings, completedDeals, commissions] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'PENDING' } }),
      prisma.deal.count({ where: { status: 'SALE_COMPLETED' } }),
      prisma.commission.findMany({
        where: { deal: { status: 'SALE_COMPLETED' } },
        select: { amount: true, currency: true, status: true }
      })
    ]);

    const grouped = new Map();
    for (const item of commissions) {
      const key = `${item.currency}:${item.status}`;
      const group = grouped.get(key) || { currency: item.currency, status: item.status, amount: 0, count: 0 };
      group.amount += Number(item.amount);
      group.count += 1;
      grouped.set(key, group);
    }

    return res.json({
      users,
      listings,
      pendingListings,
      completedDeals,
      commissions: [...grouped.values()].map(group => ({
        currency: group.currency,
        status: group.status,
        _sum: { amount: Number(group.amount.toFixed(2)) },
        _count: group.count
      }))
    });
  } catch (error) { return next(error); }
});

router.get('/listings', async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      include: {
        seller: { select: { id: true, fullName: true, contact: true, country: true } },
        images: {
          select: { id: true, url: true, format: true, width: true, height: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ listings });
  } catch (error) { return next(error); }
});

router.patch('/listings/:id/status', async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAUSED'])
    }).parse(req.body);
    const existing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, _count: { select: { images: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Itangazo ntiriboneka.' });
    if (status === 'APPROVED' && existing._count.images < 5) {
      return res.status(400).json({ error: 'Ntushobora kwemeza itangazo rifite amafoto ari munsi ya 5.' });
    }
    if (existing.status === 'SOLD') {
      return res.status(409).json({ error: 'Itangazo ryamaze kugurishwa; ntirishobora kongera gushyirwa ku rubuga.' });
    }
    const listing = await prisma.listing.update({
      where: { id: existing.id },
      data: { status },
      include: { images: { orderBy: { createdAt: 'asc' } } }
    });
    return res.json({ listing });
  } catch (error) { return next(error); }
});

router.patch('/users/:id/active', async (req, res, next) => {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true, isActive: true }
    });
    if (!target) return res.status(404).json({ error: 'Konti ntiyabonetse.' });
    if (!isActive && target.role === 'ADMIN') {
      if (target.id === req.user.id) {
        return res.status(409).json({ error: 'Ntushobora guhagarika konti ya Admin winjiyemo.' });
      }
      const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (activeAdmins <= 1) {
        return res.status(409).json({ error: 'Admin wa nyuma ukora ntashobora guhagarikwa.' });
      }
    }
    const user = await prisma.user.update({
      where: { id: target.id },
      data: { isActive },
      select: { id: true, fullName: true, contact: true, role: true, isActive: true }
    });
    return res.json({ user });
  } catch (error) { return next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, contact: true, country: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ users });
  } catch (error) { return next(error); }
});

router.get('/commissions', async (req, res, next) => {
  try {
    const commissions = await prisma.commission.findMany({
      where: { deal: { status: 'SALE_COMPLETED' } },
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
    return res.json({ commissions });
  } catch (error) { return next(error); }
});

router.patch('/commissions/:id/paid', async (req, res, next) => {
  try {
    const { reference } = z.object({ reference: z.string().trim().min(2).max(160) }).parse(req.body);
    const existing = await prisma.commission.findUnique({
      where: { id: req.params.id },
      include: { deal: { select: { status: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Komisiyo ntiyabonetse.' });
    if (existing.deal.status !== 'SALE_COMPLETED') {
      return res.status(409).json({ error: 'Komisiyo yemezwa nyuma y’uko igurisha rirangiye.' });
    }
    if (existing.status === 'PAID') {
      return res.status(409).json({ error: 'Iyi komisiyo yamaze kwemezwa ko yishyuwe.' });
    }
    const commission = await prisma.commission.update({
      where: { id: existing.id },
      data: { status: 'PAID', reference, paidAt: new Date() }
    });
    return res.json({ commission });
  } catch (error) { return next(error); }
});

router.get('/images', async (req, res, next) => {
  try {
    const images = await prisma.listingImage.findMany({
      include: { listing: { select: { id: true, code: true, title: true, status: true, country: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ images });
  } catch (error) { return next(error); }
});

router.delete('/images/:id', async (req, res, next) => {
  try {
    const image = await prisma.listingImage.findUnique({ where: { id: req.params.id } });
    if (!image) return res.status(404).json({ error: 'Ifoto ntibonetse.' });
    const result = await requireCloudinary().uploader.destroy(image.publicId, { resource_type: 'image' });
    if (result.result !== 'ok' && result.result !== 'not found') {
      return res.status(502).json({ error: 'Cloudinary ntiyemeye gusiba ifoto. Ongera ugerageze.' });
    }
    await prisma.listingImage.delete({ where: { id: image.id } });
    return res.json({ deleted: true, id: image.id });
  } catch (error) { return next(error); }
});

export default router;
