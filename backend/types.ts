export type UserRole = 'customer' | 'admin' | 'superadmin';

export interface UserAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  area: string;
  streetAddress: string;
  postalCode: string;
  isDefault: boolean;
}

export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: UserRole;
  emailVerified: boolean;
  googleId?: string;
  addresses: UserAddress[];
  refreshTokenHash?: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  size: string;
  colorName: string;
  colorHex: string;
  stock: number;
  sku: string;
}

export interface ProductImage {
  url: string;
  publicId?: string;
  alt: string;
}

export type SilhouetteType =
  | 'tee'
  | 'shirt'
  | 'hoodie'
  | 'jacket'
  | 'trousers'
  | 'jeans'
  | 'dress'
  | 'coord';

export interface ProductRecord {
  _id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  fabricDetails: string;
  careInstructions: string;
  specifications: string[];
  gender: 'men' | 'women' | 'unisex';
  category: string;
  collectionSlug: string;
  price: number;
  salePrice: number | null;
  images: ProductImage[];
  videoUrl?: string;
  silhouetteType: SilhouetteType;
  variants: ProductVariant[];
  status: 'active' | 'draft' | 'archived';
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemPayload {
  productId: string;
  variantId: string;
  size: string;
  colorName: string;
  colorHex: string;
  quantity: number;
}

export type PaymentMethod = 'cod' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'card';
export type PaymentStatus =
  | 'pending'
  | 'pending_verification'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string;
  size: string;
  colorName: string;
  colorHex: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  _id: string;
  orderNumber: string;
  userId: string | null;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    country: string;
    province: string;
    city: string;
    area: string;
    streetAddress: string;
    postalCode: string;
    deliveryInstructions: string;
  };
  deliveryMethod: {
    id: string;
    label: string;
    estimatedDays: string;
    cost: number;
  };
  items: OrderItem[];
  currency: string;
  subtotal: number;
  discountCode: string;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    transactionReference: string;
    receiptUrl: string;
    gatewaySessionId: string;
    gatewayPaymentIntentId: string;
    verifiedAt: string | null;
    notes: string;
  };
  orderStatus: OrderStatus;
  tracking: {
    courierName: string;
    trackingNumber: string;
    updatedAt: string | null;
  };
  statusHistory: {
    status: string;
    note: string;
    timestamp: string;
  }[];
  stockRestored: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponRecord {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  applicableCategories: string[];
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ReviewRecord {
  _id: string;
  productId: string;
  userId: string | null;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface StoreSettingsRecord {
  key: string;
  brandName: string;
  tagline: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  studioAddress: string;
  standardShippingFee: number;
  expressShippingFee: number;
  freeShippingThreshold: number;
  taxRatePercent: number;
  codAutoConfirm: boolean;
  paymentMethods: {
    cod: boolean;
    bankTransfer: boolean;
    easypaisa: boolean;
    jazzcash: boolean;
    card: boolean;
  };
  bankDetails: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
  };
  mobileWallets: {
    easypaisaNumber: string;
    easypaisaTitle: string;
    jazzcashNumber: string;
    jazzcashTitle: string;
  };
  cms: {
    heroHeadline: string;
    heroSubtitle: string;
    heroImage: string;
    promoBannerText: string;
    featuredCollectionTitle: string;
    featuredCollectionDescription: string;
    featuredCollectionImage: string;
    brandStoryTitle: string;
    brandStoryBody: string;
    brandStoryImage: string;
  };
  socialLinks: {
    instagram: string;
    tiktok: string;
    pinterest: string;
  };
}
