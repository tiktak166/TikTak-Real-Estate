import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, allowRoles } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = z.object({
      subject: z.string().trim().max(160).optional(),
      body: z.string().trim().min(2).max(5000)
    }).parse(req.body);
    const message = await prisma.message.create({
      data: { userId: req.user.id, subject: data.subject || null, body: data.body }
    });
    res.status(201).json({ message });
  } catch (error) { next(error); }
});

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ messages });
  } catch (error) { next(error); }
});

router.get('/', authenticate, allowRoles('ADMIN'), async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      include: { user: { select: { id: true, fullName: true, contact: true, country: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ messages });
  } catch (error) { next(error); }
});

router.post('/:userId/reply', authenticate, allowRoles('ADMIN'), async (req, res, next) => {
  try {
    const data = z.object({ body: z.string().trim().min(2).max(5000) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'Umukiriya ntabonetse.' });
    const message = await prisma.message.create({
      data: { userId: user.id, subject: 'Igisubizo cya TikTak Admin', body: data.body }
    });
    res.status(201).json({ message });
  } catch (error) { next(error); }
});

router.patch('/:id/read', authenticate, allowRoles('ADMIN'), async (req, res, next) => {
  try {
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ message });
  } catch (error) { next(error); }
});

export default router;
