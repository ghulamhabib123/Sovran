import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env.ts';
import {
  requireFirebaseAdmin,
  requireFirebaseAuth,
} from '../middleware/auth.middleware.ts';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import {
  createStripeCheckoutForOrder,
  verifyStripeWebhookSignature,
} from '../services/payment.service.ts';
import { storeUploadedImage } from '../services/upload.service.ts';
import type { OrderRecord } from '../types.ts';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get('/capabilities', (_req: Request, res: Response) => {
  res.json({
    card: {
      configured: Boolean(env.stripeSecretKey),
      provider: 'Stripe',
      mode: env.stripeSecretKey ? 'gateway' : 'unconfigured',
    },
    easypaisa: {
      configured: true,
      mode: env.easypaisaStoreId && env.easypaisaHashKey ? 'api' : 'manual_verification',
    },
    jazzcash: {
      configured: true,
      mode: env.jazzcashMerchantId && env.jazzcashSalt ? 'api' : 'manual_verification',
    },
    bankTransfer: {
      configured: true,
      mode: 'manual_verification',
    },
    cod: {
      configured: true,
      mode: 'offline',
    },
  });
});

router.post(
  '/upload-receipt',
  requireFirebaseAuth,
  upload.single('receipt'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No receipt file uploaded.' });
        return;
      }
      const result = await storeUploadedImage(req.file.buffer, req.file.originalname);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.post(
  '/admin/upload',
  requireFirebaseAdmin,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided.' });
        return;
      }
      const result = await storeUploadedImage(req.file.buffer, req.file.originalname);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.post(
  '/payments/create-stripe-session',
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { order } = req.body || {};
      if (!order || !order.orderNumber || !Array.isArray(order.items)) {
        res.status(400).json({ error: 'Invalid order payload for card checkout.' });
        return;
      }
      const origin =
        (typeof req.headers.origin === 'string' && req.headers.origin) ||
        `${req.protocol}://${req.get('host')}`;
      const session = await createStripeCheckoutForOrder(order as OrderRecord, origin);
      res.json(session);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  }
);

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string | undefined;
    verifyStripeWebhookSignature(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export default router;
