import crypto from 'crypto';
import Stripe from 'stripe';
import { env } from '../config/env.ts';
import type { OrderRecord, PaymentMethod, PaymentStatus, StoreSettingsRecord } from '../types.ts';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!env.stripeSecretKey) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.stripeSecretKey);
  }
  return stripeInstance;
}

export interface PaymentGatewayStatus {
  card: { configured: boolean; provider: string; mode: 'gateway' | 'unconfigured' };
  easypaisa: { configured: boolean; mode: 'api' | 'manual_verification' };
  jazzcash: { configured: boolean; mode: 'api' | 'manual_verification' };
  bankTransfer: { configured: boolean; mode: 'manual_verification' };
  cod: { configured: boolean; mode: 'offline' };
}

export function getPaymentGatewayCapabilities(settings: StoreSettingsRecord): PaymentGatewayStatus {
  return {
    card: {
      configured: Boolean(env.stripeSecretKey) && settings.paymentMethods.card,
      provider: 'Stripe',
      mode: env.stripeSecretKey ? 'gateway' : 'unconfigured',
    },
    easypaisa: {
      configured: settings.paymentMethods.easypaisa,
      mode: env.easypaisaStoreId && env.easypaisaHashKey ? 'api' : 'manual_verification',
    },
    jazzcash: {
      configured: settings.paymentMethods.jazzcash,
      mode: env.jazzcashMerchantId && env.jazzcashSalt ? 'api' : 'manual_verification',
    },
    bankTransfer: {
      configured: settings.paymentMethods.bankTransfer,
      mode: 'manual_verification',
    },
    cod: {
      configured: settings.paymentMethods.cod,
      mode: 'offline',
    },
  };
}

export function resolveInitialPaymentAndOrderState(
  method: PaymentMethod,
  settings: StoreSettingsRecord,
  transactionReference?: string
): {
  paymentStatus: PaymentStatus;
  orderStatus: OrderRecord['orderStatus'];
  note: string;
} {
  if (method === 'cod') {
    const autoConfirm = settings.codAutoConfirm;
    return {
      paymentStatus: 'pending',
      orderStatus: autoConfirm ? 'confirmed' : 'placed',
      note: 'Cash on Delivery selected. Payment due upon courier handoff.',
    };
  }

  if (method === 'bank_transfer') {
    return {
      paymentStatus: 'pending_verification',
      orderStatus: 'placed',
      note: transactionReference
        ? `Bank transfer reference ${transactionReference} submitted for verification.`
        : 'Awaiting bank transfer confirmation from finance team.',
    };
  }

  if (method === 'easypaisa') {
    const hasApi = Boolean(env.easypaisaStoreId && env.easypaisaHashKey);
    return {
      paymentStatus: 'pending_verification',
      orderStatus: 'placed',
      note: hasApi
        ? 'Easypaisa gateway checkout initiated — awaiting callback verification.'
        : `Manual Easypaisa transfer reference ${transactionReference || 'pending'} submitted for verification.`,
    };
  }

  if (method === 'jazzcash') {
    const hasApi = Boolean(env.jazzcashMerchantId && env.jazzcashSalt);
    return {
      paymentStatus: 'pending_verification',
      orderStatus: 'placed',
      note: hasApi
        ? 'JazzCash gateway checkout initiated — awaiting integrity-hashed callback.'
        : `Manual JazzCash transfer reference ${transactionReference || 'pending'} submitted for verification.`,
    };
  }

  // Card payment: always stays pending until gateway webhook confirms payment
  return {
    paymentStatus: 'pending',
    orderStatus: 'placed',
    note: 'Awaiting Stripe Checkout card confirmation.',
  };
}

export async function createStripeCheckoutForOrder(
  order: OrderRecord,
  originUrl: string
): Promise<{ checkoutUrl: string; sessionId: string }> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error(
      'Card payment gateway is not configured on the server (missing STRIPE_SECRET_KEY). Please select COD, Bank Transfer, Easypaisa, or JazzCash.'
    );
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: order.customer.email,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
      },
      line_items: [
        ...order.items.map((item) => ({
          price_data: {
            currency: 'pkr',
            product_data: {
              name: `${item.name} (${item.size} / ${item.colorName})`,
            },
            unit_amount: Math.round(item.unitPrice * 100),
          },
          quantity: item.quantity,
        })),
        ...(order.shippingCost > 0
          ? [
              {
                price_data: {
                  currency: 'pkr',
                  product_data: {
                    name: order.deliveryMethod.label,
                  },
                  unit_amount: Math.round(order.shippingCost * 100),
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      success_url: `${originUrl}/checkout/confirmation/${order.orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${originUrl}/checkout?cancelled=${order.orderNumber}`,
    },
    {
      idempotencyKey: `order_checkout_${order._id}`,
    }
  );

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }

  return { checkoutUrl: session.url, sessionId: session.id };
}

export function verifyStripeWebhookSignature(rawBody: Buffer, signature: string | undefined): Stripe.Event {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) {
    throw new Error('Stripe webhook verification not configured.');
  }
  if (!signature) {
    throw new Error('Missing Stripe-Signature header.');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}

export function generateEasypaisaPayload(order: OrderRecord) {
  if (!env.easypaisaStoreId || !env.easypaisaHashKey) return null;
  const amount = order.totalAmount.toFixed(2);
  const raw = `${amount}&${order.orderNumber}&${env.easypaisaStoreId}`;
  const hash = crypto.createHmac('sha256', env.easypaisaHashKey).update(raw).digest('hex');
  return {
    storeId: env.easypaisaStoreId,
    orderRefNum: order.orderNumber,
    amount,
    encryptedHashRequest: hash,
  };
}
