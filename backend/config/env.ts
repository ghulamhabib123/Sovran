export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  cloudinaryCloudName: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  cloudinaryApiKey: (process.env.CLOUDINARY_API_KEY || '').trim(),
  cloudinaryApiSecret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  stripeSecretKey: (process.env.STRIPE_SECRET_KEY || '').trim(),
  stripeWebhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || '').trim(),
  easypaisaStoreId: (process.env.EASYPAISA_STORE_ID || '').trim(),
  easypaisaHashKey: (process.env.EASYPAISA_HASH_KEY || '').trim(),
  jazzcashMerchantId: (process.env.JAZZCASH_MERCHANT_ID || '').trim(),
  jazzcashSalt: (process.env.JAZZCASH_INTEGRITY_SALT || '').trim(),
  appUrl: (process.env.APP_URL || 'http://localhost:3000').trim(),
};
