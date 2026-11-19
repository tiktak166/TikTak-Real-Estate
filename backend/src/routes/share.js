import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

router.get('/:id', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: {
        id: req.params.id,
        status: 'APPROVED'
      },
      include: {
        images: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { url: true }
        }
      }
    });

    if (!listing) {
      return res.status(404).send('This listing is unavailable.');
    }

    const title = `${listing.title} | TikTak Real Estate`;
    const description = [
      listing.description,
      `${listing.district}, ${listing.country}`,
      `${listing.price} ${listing.currency}`
    ].filter(Boolean).join(' | ').slice(0, 300);

    const image = listing.images[0]?.url || '';
    const destination =
      `https://tiktakrealestate.com/listing.html?id=${encodeURIComponent(listing.id)}`;

    const shareUrl =
      `https://tiktak-real-estate.onrender.com/share/${encodeURIComponent(listing.id)}`;

    res.set('Cache-Control', 'public, max-age=300');
    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TikTak Real Estate">
<meta property="og:title" content="${escapeHTML(title)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:url" content="${escapeHTML(shareUrl)}">
${image ? `<meta property="og:image" content="${escapeHTML(image)}">` : ''}
<meta property="og:image:alt" content="${escapeHTML(listing.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHTML(title)}">
<meta name="twitter:description" content="${escapeHTML(description)}">
${image ? `<meta name="twitter:image" content="${escapeHTML(image)}">` : ''}
<link rel="canonical" href="${escapeHTML(destination)}">
<meta http-equiv="refresh" content="0;url=${escapeHTML(destination)}">
</head>
<body>
<p>Opening TikTak listing...</p>
<p><a href="${escapeHTML(destination)}">View listing</a></p>
</body>
</html>`);
  } catch (error) {
    next(error);
  }
});

export default router;