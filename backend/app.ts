import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import storeRoutes, { stripeWebhookHandler } from './routes/store.routes.ts';
import { seedProducts } from './seed/seedData.ts';

export function createBackendApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      frameguard: false,
    })
  );

  // Stripe webhook requires raw body prior to express.json()
  app.post(
    '/api/payments/stripe-webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhookHandler
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', apiLimiter);
  app.use('/api/store', storeRoutes);

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'public', 'uploads')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sovran-commerce-api', database: 'firebase-firestore' });
  });

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: /sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    const staticUrls = ['/', '/shop', '/collections', '/track-order', '/about'];
    const productUrls = seedProducts.map((p) => `/product/${p.slug}`);
    const urls = [...staticUrls, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${base}${u}</loc>
    <changefreq>weekly</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  return app;
}
