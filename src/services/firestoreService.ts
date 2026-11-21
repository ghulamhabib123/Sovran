import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  initialStoreSettings,
  seedCoupons,
  seedProducts,
  seedReviews,
} from '../../backend/seed/seedData.ts';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';
import {
  CartItem,
  Coupon,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  Review,
  StoreConfig,
  UserAddress,
  UserProfile,
} from '../types/store.ts';
import { apiFetch } from './api.ts';

function tsToIso(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string' && val) return val;
  return new Date().toISOString();
}

function sanitizeSafeUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, 500);
  if (!trimmed) return '';
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/src/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return trimmed;
  } catch {
    return '';
  }
  return '';
}

function cleanId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120) || `id-${Date.now()}`;
}

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL);
}

// Convert seed product records to frontend Product shape
const fallbackProducts: Product[] = seedProducts.map((p) => ({
  ...p,
  silhouetteType: p.silhouetteType,
}));

const fallbackSettings: StoreConfig = {
  brandName: initialStoreSettings.brandName,
  tagline: initialStoreSettings.tagline,
  currency: initialStoreSettings.currency,
  contactEmail: initialStoreSettings.contactEmail,
  contactPhone: initialStoreSettings.contactPhone,
  studioAddress: initialStoreSettings.studioAddress,
  standardShippingFee: initialStoreSettings.standardShippingFee,
  expressShippingFee: initialStoreSettings.expressShippingFee,
  freeShippingThreshold: initialStoreSettings.freeShippingThreshold,
  taxRatePercent: initialStoreSettings.taxRatePercent,
  codAutoConfirm: initialStoreSettings.codAutoConfirm,
  paymentMethods: initialStoreSettings.paymentMethods,
  bankDetails: initialStoreSettings.bankDetails,
  mobileWallets: initialStoreSettings.mobileWallets,
  cms: initialStoreSettings.cms,
  socialLinks: initialStoreSettings.socialLinks,
};

const seedProductMap = new Map(seedProducts.map((p) => [p._id, p]));

function upgradeLegacyImages(id: string, rawImages: unknown): Product['images'] {
  const arr = Array.isArray(rawImages) ? (rawImages as Product['images']) : [];
  const seedMatch = seedProductMap.get(id);
  if (
    seedMatch &&
    (arr.length === 0 || arr.some((img) => typeof img?.url === 'string' && img.url.startsWith('/src/assets/images/')))
  ) {
    return seedMatch.images;
  }
  return arr;
}

function upgradeLegacyCms(rawCms: StoreConfig['cms'] | undefined): StoreConfig['cms'] {
  const base = rawCms || fallbackSettings.cms;
  const pick = (val: string | undefined, fallback: string) =>
    !val || val.startsWith('/src/assets/images/') ? fallback : val;
  return {
    ...base,
    heroImage: pick(base.heroImage, fallbackSettings.cms.heroImage),
    featuredCollectionImage: pick(base.featuredCollectionImage, fallbackSettings.cms.featuredCollectionImage),
    brandStoryImage: pick(base.brandStoryImage, fallbackSettings.cms.brandStoryImage),
  };
}

function mapDocToProduct(id: string, data: Record<string, unknown>): Product {
  return {
    _id: id,
    slug: String(data.slug || id),
    sku: String(data.sku || ''),
    name: String(data.name || ''),
    description: String(data.description || ''),
    fabricDetails: String(data.fabricDetails || ''),
    careInstructions: String(data.careInstructions || ''),
    specifications: Array.isArray(data.specifications) ? data.specifications.map(String) : [],
    gender: (data.gender as Product['gender']) || 'unisex',
    category: String(data.category || ''),
    collectionSlug: String(data.collectionSlug || 'everyday'),
    price: Number(data.price || 0),
    salePrice: data.salePrice !== null && data.salePrice !== undefined ? Number(data.salePrice) : null,
    images: upgradeLegacyImages(id, data.images),
    videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : '',
    silhouetteType: (data.silhouetteType as Product['silhouetteType']) || 'tee',
    variants: Array.isArray(data.variants) ? (data.variants as Product['variants']) : [],
    status: (data.status as Product['status']) || 'active',
    isFeatured: Boolean(data.isFeatured),
    isNewArrival: Boolean(data.isNewArrival),
    isBestSeller: Boolean(data.isBestSeller),
    salesCount: Number(data.salesCount || 0),
    ratingAvg: Number(data.ratingAvg || 5),
    ratingCount: Number(data.ratingCount || 0),
    isDemo: Boolean(data.isDemo),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapDocToOrder(id: string, data: Record<string, unknown>): Order {
  return {
    _id: id,
    orderNumber: String(data.orderNumber || id),
    userId: typeof data.userId === 'string' ? data.userId : null,
    customer: (data.customer as Order['customer']) || { fullName: '', email: '', phone: '' },
    shippingAddress: (data.shippingAddress as Order['shippingAddress']) || {
      country: 'Pakistan',
      province: '',
      city: '',
      area: '',
      streetAddress: '',
      postalCode: '',
      deliveryInstructions: '',
    },
    deliveryMethod: (data.deliveryMethod as Order['deliveryMethod']) || {
      id: 'standard',
      label: 'Standard Nationwide Delivery',
      estimatedDays: '3–5 Business Days',
      cost: 350,
    },
    items: Array.isArray(data.items) ? (data.items as Order['items']) : [],
    currency: String(data.currency || 'PKR'),
    subtotal: Number(data.subtotal || 0),
    discountCode: String(data.discountCode || ''),
    discountAmount: Number(data.discountAmount || 0),
    shippingCost: Number(data.shippingCost || 0),
    taxAmount: Number(data.taxAmount || 0),
    totalAmount: Number(data.totalAmount || 0),
    payment: (data.payment as Order['payment']) || {
      method: 'cod',
      status: 'pending',
      transactionReference: '',
      receiptUrl: '',
      gatewaySessionId: '',
      gatewayPaymentIntentId: '',
      verifiedAt: null,
      notes: '',
    },
    orderStatus: (data.orderStatus as OrderStatus) || 'placed',
    tracking: (data.tracking as Order['tracking']) || {
      courierName: '',
      trackingNumber: '',
      updatedAt: null,
    },
    statusHistory: Array.isArray(data.statusHistory) ? (data.statusHistory as Order['statusHistory']) : [],
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export const firestoreService = {
  // ---- INITIAL ADMIN FIRESTORE SEEDING ----
  async seedFirestoreIfEmpty(adminUid: string): Promise<boolean> {
    try {
      const existingProducts = await getDocs(collection(db, 'products'));
      const batch = writeBatch(db);
      let wroteAnything = false;

      if (existingProducts.empty) {
        wroteAnything = true;
        for (const p of seedProducts) {
          const { _id, createdAt: _c, updatedAt: _u, ...rest } = p;
          batch.set(doc(db, 'products', _id), {
            ...rest,
            specifications: rest.specifications.slice(0, 12),
            images: rest.images.slice(0, 10),
            variants: rest.variants.slice(0, 40),
            videoUrl: sanitizeSafeUrl(rest.videoUrl),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (const r of seedReviews) {
          batch.set(doc(db, 'products', r.productId, 'reviews', r._id), {
            productId: r.productId,
            userId: adminUid,
            authorName: r.authorName,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            verifiedPurchase: r.verifiedPurchase,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        // Upgrade any previously seeded demo products still referencing legacy /src/assets/images/
        for (const d of existingProducts.docs) {
          const data = d.data() as Record<string, unknown>;
          const imgs = Array.isArray(data.images) ? (data.images as Product['images']) : [];
          const seedMatch = seedProductMap.get(d.id);
          const hasLegacy = imgs.some(
            (img) => typeof img?.url === 'string' && img.url.startsWith('/src/assets/images/')
          );
          if (data.isDemo === true && seedMatch && (hasLegacy || imgs.length === 0)) {
            wroteAnything = true;
            batch.update(doc(db, 'products', d.id), {
              images: seedMatch.images.slice(0, 10),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      const settingsSnap = await getDoc(doc(db, 'settings', 'default'));
      if (!settingsSnap.exists()) {
        wroteAnything = true;
        const { key: _k, ...settingsRest } = initialStoreSettings;
        batch.set(doc(db, 'settings', 'default'), {
          ...settingsRest,
          updatedAt: serverTimestamp(),
        });
      } else {
        const sData = settingsSnap.data() as Record<string, unknown>;
        const rawCms = (sData.cms as StoreConfig['cms']) || undefined;
        if (
          rawCms &&
          [rawCms.heroImage, rawCms.featuredCollectionImage, rawCms.brandStoryImage].some(
            (u) => typeof u === 'string' && u.startsWith('/src/assets/images/')
          )
        ) {
          wroteAnything = true;
          batch.update(doc(db, 'settings', 'default'), {
            cms: upgradeLegacyCms(rawCms),
            updatedAt: serverTimestamp(),
          });
        }
      }

      const existingCoupons = await getDocs(collection(db, 'coupons'));
      if (existingCoupons.empty) {
        wroteAnything = true;
        for (const c of seedCoupons) {
          batch.set(doc(db, 'coupons', c.code), {
            code: c.code,
            type: c.type,
            value: c.value,
            minOrderAmount: c.minOrderAmount,
            maxUses: c.maxUses,
            usedCount: c.usedCount,
            applicableCategories: c.applicableCategories,
            isActive: c.isActive,
            createdAt: serverTimestamp(),
          });
        }
      }

      if (wroteAnything) {
        await batch.commit();
      }
      return wroteAnything;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products/seed');
    }
  },

  // ---- STORE SETTINGS & PAYMENT CAPABILITIES ----
  async getStoreConfig(): Promise<StoreConfig> {
    let base: StoreConfig = fallbackSettings;
    try {
      const snap = await getDoc(doc(db, 'settings', 'default'));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        base = {
          brandName: String(d.brandName || fallbackSettings.brandName),
          tagline: String(d.tagline || fallbackSettings.tagline),
          currency: String(d.currency || 'PKR'),
          contactEmail: String(d.contactEmail || fallbackSettings.contactEmail),
          contactPhone: String(d.contactPhone || fallbackSettings.contactPhone),
          studioAddress: String(d.studioAddress || fallbackSettings.studioAddress),
          standardShippingFee: Number(d.standardShippingFee ?? fallbackSettings.standardShippingFee),
          expressShippingFee: Number(d.expressShippingFee ?? fallbackSettings.expressShippingFee),
          freeShippingThreshold: Number(d.freeShippingThreshold ?? fallbackSettings.freeShippingThreshold),
          taxRatePercent: Number(d.taxRatePercent ?? fallbackSettings.taxRatePercent),
          codAutoConfirm: Boolean(d.codAutoConfirm),
          paymentMethods: (d.paymentMethods as StoreConfig['paymentMethods']) || fallbackSettings.paymentMethods,
          bankDetails: (d.bankDetails as StoreConfig['bankDetails']) || fallbackSettings.bankDetails,
          mobileWallets: (d.mobileWallets as StoreConfig['mobileWallets']) || fallbackSettings.mobileWallets,
          cms: upgradeLegacyCms(d.cms as StoreConfig['cms'] | undefined),
          socialLinks: (d.socialLinks as StoreConfig['socialLinks']) || fallbackSettings.socialLinks,
        };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'settings/default');
    }

    try {
      const caps = await apiFetch<StoreConfig['paymentCapabilities']>('/api/store/capabilities');
      return { ...base, paymentCapabilities: caps };
    } catch {
      return base;
    }
  },

  async updateStoreSettings(next: StoreConfig): Promise<void> {
    try {
      await setDoc(doc(db, 'settings', 'default'), {
        brandName: next.brandName.trim().slice(0, 80),
        tagline: next.tagline.trim().slice(0, 160),
        currency: 'PKR',
        contactEmail: next.contactEmail.trim().slice(0, 200),
        contactPhone: next.contactPhone.trim().slice(0, 40),
        studioAddress: next.studioAddress.trim().slice(0, 250),
        standardShippingFee: Math.max(0, Number(next.standardShippingFee || 0)),
        expressShippingFee: Math.max(0, Number(next.expressShippingFee || 0)),
        freeShippingThreshold: Math.max(0, Number(next.freeShippingThreshold || 0)),
        taxRatePercent: Math.min(50, Math.max(0, Number(next.taxRatePercent || 0))),
        codAutoConfirm: Boolean(next.codAutoConfirm),
        paymentMethods: next.paymentMethods,
        bankDetails: next.bankDetails,
        mobileWallets: next.mobileWallets,
        cms: next.cms,
        socialLinks: next.socialLinks,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/default');
    }
  },

  // ---- PRODUCTS CATALOG ----
  async listProducts(includeNonActive = false): Promise<Product[]> {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (snap.empty) {
        return includeNonActive
          ? fallbackProducts
          : fallbackProducts.filter((p) => p.status === 'active');
      }
      const list = snap.docs.map((d) => mapDocToProduct(d.id, d.data() as Record<string, unknown>));
      return includeNonActive ? list : list.filter((p) => p.status === 'active');
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'products');
    }
  },

  async getProductDetail(
    idOrSlug: string
  ): Promise<{ product: Product; related: Product[]; reviews: Review[] } | null> {
    const all = await this.listProducts(false);
    const product = all.find((p) => p._id === idOrSlug || p.slug === idOrSlug);
    if (!product) return null;

    const related = all
      .filter((p) => p._id !== product._id && (p.gender === product.gender || p.category === product.category))
      .slice(0, 4);

    let reviews: Review[] = [];
    try {
      const revSnap = await getDocs(collection(db, 'products', product._id, 'reviews'));
      if (!revSnap.empty) {
        reviews = revSnap.docs
          .map((d) => {
            const r = d.data() as Record<string, unknown>;
            return {
              _id: d.id,
              productId: String(r.productId || product._id),
              userId: typeof r.userId === 'string' ? r.userId : null,
              authorName: String(r.authorName || 'Client'),
              rating: Number(r.rating || 5),
              title: String(r.title || ''),
              comment: String(r.comment || ''),
              verifiedPurchase: Boolean(r.verifiedPurchase),
              createdAt: tsToIso(r.createdAt),
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      } else {
        reviews = seedReviews.filter((r) => r.productId === product._id);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `products/${product._id}/reviews`);
    }

    return { product, related, reviews };
  },

  async createProduct(input: Partial<Product>): Promise<Product> {
    const rawSlug =
      (input.slug && input.slug.trim().toLowerCase()) ||
      String(input.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const id = cleanId(`prod-${Date.now().toString(36)}`);
    const payload = {
      slug: rawSlug.replace(/[^a-z0-9-]/g, '-').slice(0, 160) || id,
      sku: String(input.sku || `SOV-${Date.now().toString().slice(-4)}`).trim().toUpperCase().slice(0, 80),
      name: String(input.name || '').trim().slice(0, 160),
      description: String(input.description || '').slice(0, 2000),
      fabricDetails: String(input.fabricDetails || '').slice(0, 400),
      careInstructions: String(input.careInstructions || '').slice(0, 400),
      specifications: (input.specifications || []).slice(0, 12),
      gender: input.gender || 'men',
      category: String(input.category || 'T-Shirts').trim().slice(0, 80),
      collectionSlug: String(input.collectionSlug || 'everyday').trim().slice(0, 80),
      price: Math.max(0, Number(input.price || 0)),
      salePrice: input.salePrice ? Math.max(0, Number(input.salePrice)) : null,
      images: (input.images || []).slice(0, 10),
      videoUrl: sanitizeSafeUrl(input.videoUrl),
      silhouetteType: input.silhouetteType || 'tee',
      variants: (input.variants || []).slice(0, 40),
      status: input.status || 'active',
      isFeatured: Boolean(input.isFeatured),
      isNewArrival: Boolean(input.isNewArrival),
      isBestSeller: Boolean(input.isBestSeller),
      salesCount: 0,
      ratingAvg: 5,
      ratingCount: 0,
      isDemo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'products', id), payload);
      return mapDocToProduct(id, { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
    }
  },

  async updateProduct(id: string, input: Partial<Product>): Promise<void> {
    try {
      const ref = doc(db, 'products', id);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      const merged = {
        slug: String(input.slug ?? existing?.slug ?? id).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 160),
        sku: String(input.sku ?? existing?.sku ?? '').trim().toUpperCase().slice(0, 80),
        name: String(input.name ?? existing?.name ?? '').trim().slice(0, 160),
        description: String(input.description ?? existing?.description ?? '').slice(0, 2000),
        fabricDetails: String(input.fabricDetails ?? existing?.fabricDetails ?? '').slice(0, 400),
        careInstructions: String(input.careInstructions ?? existing?.careInstructions ?? '').slice(0, 400),
        specifications: (input.specifications ?? (existing?.specifications as string[]) ?? []).slice(0, 12),
        gender: input.gender ?? existing?.gender ?? 'men',
        category: String(input.category ?? existing?.category ?? '').slice(0, 80),
        collectionSlug: String(input.collectionSlug ?? existing?.collectionSlug ?? 'everyday').slice(0, 80),
        price: Math.max(0, Number(input.price ?? existing?.price ?? 0)),
        salePrice: input.salePrice !== undefined ? (input.salePrice ? Number(input.salePrice) : null) : (existing?.salePrice ?? null),
        images: (input.images ?? (existing?.images as Product['images']) ?? []).slice(0, 10),
        videoUrl: sanitizeSafeUrl(input.videoUrl ?? existing?.videoUrl),
        silhouetteType: input.silhouetteType ?? existing?.silhouetteType ?? 'tee',
        variants: (input.variants ?? (existing?.variants as Product['variants']) ?? []).slice(0, 40),
        status: input.status ?? existing?.status ?? 'active',
        isFeatured: input.isFeatured ?? Boolean(existing?.isFeatured),
        isNewArrival: input.isNewArrival ?? Boolean(existing?.isNewArrival),
        isBestSeller: input.isBestSeller ?? Boolean(existing?.isBestSeller),
        salesCount: Number(input.salesCount ?? existing?.salesCount ?? 0),
        ratingAvg: Number(input.ratingAvg ?? existing?.ratingAvg ?? 5),
        ratingCount: Number(input.ratingCount ?? existing?.ratingCount ?? 0),
        isDemo: input.isDemo ?? Boolean(existing?.isDemo),
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, merged);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  },

  async addProductReview(
    productId: string,
    payload: { authorName: string; rating: number; title: string; comment: string }
  ): Promise<Review[]> {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
      throw new Error('Please sign in with Google to submit a verified review.');
    }
    const reviewId = cleanId(`rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
    const path = `products/${productId}/reviews/${reviewId}`;
    try {
      await setDoc(doc(db, 'products', productId, 'reviews', reviewId), {
        productId,
        userId: user.uid,
        authorName: (payload.authorName || user.displayName || 'Verified Client').trim().slice(0, 100),
        rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
        title: payload.title.trim().slice(0, 120),
        comment: payload.comment.trim().slice(0, 1500),
        verifiedPurchase: true,
        createdAt: serverTimestamp(),
      });
      const detail = await this.getProductDetail(productId);
      return detail?.reviews || [];
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  // ---- AUTHENTICATED USER PROFILE, ADDRESSES, CART, WISHLIST ----
  async syncFirebaseUserProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    const uid = fbUser.uid;
    const email = (fbUser.email || '').toLowerCase();

    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const displayName = (fbUser.displayName || email.split('@')[0] || 'Client').slice(0, 120);
      const photoUrl = sanitizeSafeUrl(fbUser.photoURL || '');

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid,
          displayName,
          photoUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, {
          displayName: String(userSnap.data()?.displayName || displayName).slice(0, 120),
          photoUrl,
          updatedAt: serverTimestamp(),
        });
      }

      const privRef = doc(db, 'users', uid, 'private', 'info');
      const privSnap = await getDoc(privRef);
      const phone = privSnap.exists() ? String(privSnap.data()?.phone || '') : '';
      await setDoc(privRef, {
        uid,
        email,
        phone,
        updatedAt: serverTimestamp(),
      });

      let isAdmin = isBootstrappedAdminEmail(email);
      if (!isAdmin) {
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        isAdmin = adminSnap.exists();
      } else {
        // Ensure admin doc exists for bootstrapped admin
        const adminRef = doc(db, 'admins', uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid,
            email,
            role: 'superadmin',
            createdAt: serverTimestamp(),
          });
        }
        // Seed initial storefront data into Firestore if empty on first admin login
        await this.seedFirestoreIfEmpty(uid);
      }

      const addresses = await this.listUserAddresses(uid);
      const finalUserSnap = await getDoc(userRef);

      return {
        id: uid,
        name: String(finalUserSnap.data()?.displayName || displayName),
        email,
        phone,
        role: isAdmin ? 'superadmin' : 'customer',
        emailVerified: fbUser.emailVerified,
        addresses,
        createdAt: tsToIso(finalUserSnap.data()?.createdAt),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  },

  async updateUserProfileDetails(uid: string, name: string, phone: string): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.uid !== uid) throw new Error('Authentication required');
    try {
      await updateDoc(doc(db, 'users', uid), {
        displayName: name.trim().slice(0, 120),
        photoUrl: sanitizeSafeUrl(fbUser.photoURL || ''),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', uid, 'private', 'info'), {
        uid,
        email: (fbUser.email || '').toLowerCase(),
        phone: phone.trim().slice(0, 40),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async listUserAddresses(uid: string): Promise<UserAddress[]> {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'addresses'));
      return snap.docs.map((d) => {
        const a = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          label: String(a.label || 'Home'),
          fullName: String(a.fullName || ''),
          phone: String(a.phone || ''),
          country: String(a.country || 'Pakistan'),
          province: String(a.province || ''),
          city: String(a.city || ''),
          area: String(a.area || ''),
          streetAddress: String(a.streetAddress || ''),
          postalCode: String(a.postalCode || ''),
          isDefault: Boolean(a.isDefault),
        };
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/addresses`);
    }
  },

  async addUserAddress(uid: string, input: Omit<UserAddress, 'id'>): Promise<void> {
    const addrId = cleanId(`addr-${Date.now().toString(36)}`);
    try {
      await setDoc(doc(db, 'users', uid, 'addresses', addrId), {
        id: addrId,
        userId: uid,
        label: input.label.trim().slice(0, 40) || 'Home',
        fullName: input.fullName.trim().slice(0, 120),
        phone: input.phone.trim().slice(0, 40),
        country: input.country.trim().slice(0, 80) || 'Pakistan',
        province: input.province.trim().slice(0, 80),
        city: input.city.trim().slice(0, 80),
        area: input.area.trim().slice(0, 120),
        streetAddress: input.streetAddress.trim().slice(0, 250),
        postalCode: input.postalCode.trim().slice(0, 20),
        isDefault: Boolean(input.isDefault),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/addresses/${addrId}`);
    }
  },

  async deleteUserAddress(uid: string, addrId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', uid, 'addresses', addrId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/addresses/${addrId}`);
    }
  },

  async getUserCart(uid: string): Promise<CartItem[]> {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'cart'));
      return snap.docs.map((d) => {
        const c = d.data() as Record<string, unknown>;
        return {
          productId: String(c.productId || ''),
          variantId: String(c.variantId || d.id),
          size: String(c.size || ''),
          colorName: String(c.colorName || ''),
          colorHex: String(c.colorHex || '#0A0A0A'),
          quantity: Number(c.quantity || 1),
        };
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/cart`);
    }
  },

  async syncUserCart(uid: string, items: CartItem[]): Promise<void> {
    try {
      const existingSnap = await getDocs(collection(db, 'users', uid, 'cart'));
      const batch = writeBatch(db);
      const nextMap = new Map(items.map((i) => [cleanId(i.variantId), i]));

      for (const d of existingSnap.docs) {
        if (!nextMap.has(d.id)) {
          batch.delete(d.ref);
        }
      }
      for (const [vid, item] of nextMap.entries()) {
        batch.set(doc(db, 'users', uid, 'cart', vid), {
          productId: cleanId(item.productId),
          variantId: vid,
          size: item.size.slice(0, 20),
          colorName: item.colorName.slice(0, 60),
          colorHex: item.colorHex.slice(0, 20),
          quantity: Math.min(25, Math.max(1, Math.floor(item.quantity))),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/cart`);
    }
  },

  async getUserWishlist(uid: string): Promise<string[]> {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'wishlist'));
      return snap.docs.map((d) => d.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/wishlist`);
    }
  },

  async syncUserWishlist(uid: string, productIds: string[]): Promise<void> {
    try {
      const existingSnap = await getDocs(collection(db, 'users', uid, 'wishlist'));
      const batch = writeBatch(db);
      const cleanSet = new Set(productIds.map(cleanId));

      for (const d of existingSnap.docs) {
        if (!cleanSet.has(d.id)) {
          batch.delete(d.ref);
        }
      }
      for (const pid of cleanSet) {
        if (!existingSnap.docs.some((d) => d.id === pid)) {
          batch.set(doc(db, 'users', uid, 'wishlist', pid), {
            productId: pid,
            createdAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/wishlist`);
    }
  },

  // ---- COUPONS & ORDER CALCULATION ----
  async lookupCoupon(code: string): Promise<Coupon | null> {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!clean) return null;
    try {
      const snap = await getDoc(doc(db, 'coupons', clean));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        return {
          _id: snap.id,
          code: String(d.code || snap.id),
          type: (d.type as Coupon['type']) || 'percentage',
          value: Number(d.value || 0),
          minOrderAmount: Number(d.minOrderAmount || 0),
          maxUses: Number(d.maxUses || 0),
          usedCount: Number(d.usedCount || 0),
          applicableCategories: Array.isArray(d.applicableCategories)
            ? d.applicableCategories.map(String)
            : [],
          expiresAt: null,
          isActive: Boolean(d.isActive),
          createdAt: tsToIso(d.createdAt),
        };
      }
      return seedCoupons.find((c) => c.code === clean) || null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `coupons/${clean}`);
    }
  },

  async computeCheckoutPreview(
    cartItems: CartItem[],
    deliveryMethodId: 'standard' | 'express',
    couponCode: string | undefined,
    settings: StoreConfig,
    catalog: Product[]
  ) {
    const productMap = new Map(catalog.map((p) => [p._id, p]));
    const resolvedItems: Order['items'] = [];
    const categorySet = new Set<string>();
    let subtotal = 0;

    for (const line of cartItems) {
      const product = productMap.get(line.productId);
      if (!product) {
        throw new Error('One or more items in your bag are no longer available.');
      }
      const qty = Math.max(1, Math.min(20, Math.floor(line.quantity || 1)));
      const variant = product.variants.find(
        (v) => v.id === line.variantId || (v.size === line.size && v.colorName === line.colorName)
      );
      if (!variant) {
        throw new Error(`Selected variant (${line.size} / ${line.colorName}) for ${product.name} does not exist.`);
      }
      if (variant.stock < qty) {
        throw new Error(
          `Insufficient stock for ${product.name} (${variant.size} / ${variant.colorName}). Only ${variant.stock} left.`
        );
      }
      const unitPrice =
        product.salePrice !== null && product.salePrice < product.price
          ? product.salePrice
          : product.price;
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      categorySet.add(product.category.toLowerCase());

      resolvedItems.push({
        productId: product._id,
        slug: product.slug,
        name: product.name,
        sku: variant.sku,
        image: product.images[0]?.url || '',
        size: variant.size,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        unitPrice,
        quantity: qty,
        lineTotal,
      });
    }

    const isExpress = deliveryMethodId === 'express';
    const baseShipping = isExpress ? settings.expressShippingFee : settings.standardShippingFee;
    let shippingCost = subtotal >= settings.freeShippingThreshold && !isExpress ? 0 : baseShipping;
    const deliveryMethod = isExpress
      ? {
          id: 'express',
          label: 'Express Courier (Priority Air)',
          estimatedDays: '1–2 Business Days',
          cost: shippingCost,
        }
      : {
          id: 'standard',
          label: 'Standard Nationwide Delivery',
          estimatedDays: '3–5 Business Days',
          cost: shippingCost,
        };

    let discountAmount = 0;
    let appliedCouponCode = '';
    if (couponCode && couponCode.trim()) {
      const coupon = await this.lookupCoupon(couponCode);
      if (!coupon || !coupon.isActive) {
        throw new Error('Discount code is invalid or inactive.');
      }
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        throw new Error('This discount code has reached its redemption limit.');
      }
      if (subtotal < coupon.minOrderAmount) {
        throw new Error(
          `Minimum order of PKR ${coupon.minOrderAmount.toLocaleString()} required for ${coupon.code}.`
        );
      }
      if (
        coupon.applicableCategories.length > 0 &&
        !coupon.applicableCategories.some((cat) => categorySet.has(cat.toLowerCase()))
      ) {
        throw new Error(`Code ${coupon.code} is not valid for the selected categories.`);
      }
      appliedCouponCode = coupon.code;
      if (coupon.type === 'percentage') {
        discountAmount = Math.round((subtotal * coupon.value) / 100);
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(subtotal, coupon.value);
      } else if (coupon.type === 'free_shipping') {
        shippingCost = 0;
        deliveryMethod.cost = 0;
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount =
      settings.taxRatePercent > 0
        ? Math.round((discountedSubtotal * settings.taxRatePercent) / 100)
        : 0;
    const totalAmount = discountedSubtotal + shippingCost + taxAmount;

    return {
      items: resolvedItems,
      deliveryMethod,
      subtotal,
      discountCode: appliedCouponCode,
      discountAmount,
      shippingCost,
      taxAmount,
      totalAmount,
    };
  },

  // ---- ORDERS ----
  async createOrder(params: {
    cartItems: CartItem[];
    customer: { fullName: string; email: string; phone: string };
    shippingAddress: {
      country: string;
      province: string;
      city: string;
      area: string;
      streetAddress: string;
      postalCode: string;
      deliveryInstructions: string;
    };
    deliveryMethodId: 'standard' | 'express';
    paymentMethod: PaymentMethod;
    transactionReference?: string;
    receiptUrl?: string;
    couponCode?: string;
    settings: StoreConfig;
    catalog: Product[];
  }): Promise<{ order: Order; checkoutUrl?: string }> {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) {
      throw new Error('Please sign in with Google to place your order.');
    }

    const summary = await this.computeCheckoutPreview(
      params.cartItems,
      params.deliveryMethodId,
      params.couponCode,
      params.settings,
      params.catalog
    );

    const paymentMethod = params.paymentMethod;
    const txRef = (params.transactionReference || '').trim().slice(0, 120);
    if (
      (paymentMethod === 'bank_transfer' ||
        paymentMethod === 'easypaisa' ||
        paymentMethod === 'jazzcash') &&
      txRef.length < 4
    ) {
      throw new Error('Please enter your transaction reference / TID from your receipt.');
    }

    const initialPaymentStatus: PaymentStatus =
      paymentMethod === 'bank_transfer' ||
      paymentMethod === 'easypaisa' ||
      paymentMethod === 'jazzcash'
        ? 'pending_verification'
        : 'pending';

    const note =
      paymentMethod === 'cod'
        ? 'Cash on Delivery selected. Payment due upon courier handoff.'
        : paymentMethod === 'card'
        ? 'Awaiting Stripe Checkout card confirmation.'
        : `Manual ${paymentMethod.replace('_', ' ')} reference ${txRef} submitted for verification.`;

    const orderId = cleanId(`ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
    const orderNumber = `SOV-${new Date().getFullYear().toString().slice(-2)}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const orderDocPayload = {
      orderNumber,
      userId: fbUser.uid,
      customer: {
        fullName: params.customer.fullName.trim().slice(0, 120),
        email: params.customer.email.trim().toLowerCase().slice(0, 200),
        phone: params.customer.phone.trim().slice(0, 40),
      },
      shippingAddress: {
        country: (params.shippingAddress.country || 'Pakistan').trim().slice(0, 80),
        province: params.shippingAddress.province.trim().slice(0, 80),
        city: params.shippingAddress.city.trim().slice(0, 80),
        area: (params.shippingAddress.area || '').trim().slice(0, 120),
        streetAddress: params.shippingAddress.streetAddress.trim().slice(0, 250),
        postalCode: (params.shippingAddress.postalCode || '').trim().slice(0, 20),
        deliveryInstructions: (params.shippingAddress.deliveryInstructions || '').trim().slice(0, 300),
      },
      deliveryMethod: summary.deliveryMethod,
      items: summary.items.slice(0, 30),
      currency: 'PKR',
      subtotal: summary.subtotal,
      discountCode: summary.discountCode.slice(0, 40),
      discountAmount: summary.discountAmount,
      shippingCost: summary.shippingCost,
      taxAmount: summary.taxAmount,
      totalAmount: summary.totalAmount,
      payment: {
        method: paymentMethod,
        status: initialPaymentStatus,
        transactionReference: txRef,
        receiptUrl: sanitizeSafeUrl(params.receiptUrl || ''),
        gatewaySessionId: '',
        gatewayPaymentIntentId: '',
        verifiedAt: null,
        notes: note.slice(0, 400),
      },
      orderStatus: 'placed' as OrderStatus,
      tracking: {
        courierName: '',
        trackingNumber: '',
        updatedAt: null,
      },
      statusHistory: [
        {
          status: 'placed',
          note,
          timestamp: nowIso,
        },
      ],
      stockRestored: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'orders', orderId), orderDocPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
    }

    const orderRecord: Order = mapDocToOrder(orderId, {
      ...orderDocPayload,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (paymentMethod === 'card') {
      const session = await apiFetch<{ checkoutUrl: string; sessionId: string }>(
        '/api/store/payments/create-stripe-session',
        {
          method: 'POST',
          body: JSON.stringify({ order: orderRecord }),
        }
      );
      return { order: orderRecord, checkoutUrl: session.checkoutUrl };
    }

    return { order: orderRecord };
  },

  async listUserOrders(uid: string): Promise<Order[]> {
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => mapDocToOrder(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  },

  async findOrderByNumberForUser(orderNumber: string, uid: string, isAdmin: boolean): Promise<Order | null> {
    const cleanNum = orderNumber.trim().toUpperCase();
    try {
      const q = isAdmin
        ? query(collection(db, 'orders'), where('orderNumber', '==', cleanNum))
        : query(
            collection(db, 'orders'),
            where('userId', '==', uid),
            where('orderNumber', '==', cleanNum)
          );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return mapDocToOrder(d.id, d.data() as Record<string, unknown>);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  },

  // ---- ADMIN OPERATIONS ----
  async adminListOrders(): Promise<Order[]> {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      return snap.docs
        .map((d) => mapDocToOrder(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  },

  async adminUpdateOrderStatus(order: Order, nextStatus: OrderStatus): Promise<void> {
    const nextHistory = [
      ...(order.statusHistory || []),
      {
        status: nextStatus,
        note: `Order updated to ${nextStatus}`,
        timestamp: new Date().toISOString(),
      },
    ].slice(-25);

    try {
      await updateDoc(doc(db, 'orders', order._id), {
        orderStatus: nextStatus,
        statusHistory: nextHistory,
        stockRestored: nextStatus === 'cancelled' || nextStatus === 'returned',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order._id}`);
    }
  },

  async adminUpdateOrderPayment(order: Order, nextPaymentStatus: PaymentStatus): Promise<void> {
    const nextOrderStatus: OrderStatus =
      nextPaymentStatus === 'paid' && order.orderStatus === 'placed'
        ? 'confirmed'
        : order.orderStatus;
    const nextHistory = [
      ...(order.statusHistory || []),
      {
        status: nextOrderStatus,
        note: `Payment status marked as ${nextPaymentStatus}`,
        timestamp: new Date().toISOString(),
      },
    ].slice(-25);

    try {
      await updateDoc(doc(db, 'orders', order._id), {
        orderStatus: nextOrderStatus,
        payment: {
          ...order.payment,
          status: nextPaymentStatus,
          verifiedAt: nextPaymentStatus === 'paid' ? new Date().toISOString() : order.payment.verifiedAt,
        },
        statusHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order._id}`);
    }
  },

  async adminUpdateOrderTracking(
    orderId: string,
    courierName: string,
    trackingNumber: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        tracking: {
          courierName: courierName.trim().slice(0, 100),
          trackingNumber: trackingNumber.trim().slice(0, 100),
          updatedAt: new Date().toISOString(),
        },
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  },

  async adminListCustomers(orders: Order[]) {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const customers = await Promise.all(
        usersSnap.docs.map(async (uDoc) => {
          const uData = uDoc.data() as Record<string, unknown>;
          let email = '';
          let phone = '';
          try {
            const privSnap = await getDoc(doc(db, 'users', uDoc.id, 'private', 'info'));
            if (privSnap.exists()) {
              email = String(privSnap.data()?.email || '');
              phone = String(privSnap.data()?.phone || '');
            }
          } catch {
            // ignore missing private doc
          }
          const userOrders = orders.filter((o) => o.userId === uDoc.id);
          const totalSpent = userOrders
            .filter((o) => o.orderStatus !== 'cancelled')
            .reduce((s, o) => s + o.totalAmount, 0);
          return {
            id: uDoc.id,
            name: String(uData.displayName || 'Client'),
            email,
            phone,
            ordersCount: userOrders.length,
            totalSpent,
          };
        })
      );
      return customers;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  },

  async adminListCoupons(): Promise<Coupon[]> {
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      return snap.docs.map((d) => {
        const c = d.data() as Record<string, unknown>;
        return {
          _id: d.id,
          code: String(c.code || d.id),
          type: (c.type as Coupon['type']) || 'percentage',
          value: Number(c.value || 0),
          minOrderAmount: Number(c.minOrderAmount || 0),
          maxUses: Number(c.maxUses || 0),
          usedCount: Number(c.usedCount || 0),
          applicableCategories: Array.isArray(c.applicableCategories)
            ? c.applicableCategories.map(String)
            : [],
          expiresAt: null,
          isActive: Boolean(c.isActive),
          createdAt: tsToIso(c.createdAt),
        };
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'coupons');
    }
  },

  async adminCreateCoupon(input: {
    code: string;
    type: 'percentage' | 'fixed' | 'free_shipping';
    value: number;
    minOrderAmount: number;
  }): Promise<void> {
    const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
    if (code.length < 2) throw new Error('Coupon code must be at least 2 characters.');
    try {
      await setDoc(doc(db, 'coupons', code), {
        code,
        type: input.type,
        value: Math.max(0, Number(input.value || 0)),
        minOrderAmount: Math.max(0, Number(input.minOrderAmount || 0)),
        maxUses: 500,
        usedCount: 0,
        applicableCategories: [],
        isActive: true,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupons/${code}`);
    }
  },

  async adminToggleCoupon(coupon: Coupon): Promise<void> {
    try {
      await updateDoc(doc(db, 'coupons', coupon._id), {
        isActive: !coupon.isActive,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `coupons/${coupon._id}`);
    }
  },

  async adminDeleteCoupon(code: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'coupons', code));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `coupons/${code}`);
    }
  },

  // ---- NEWSLETTER ----
  async subscribeNewsletter(email: string): Promise<string> {
    const clean = email.trim().toLowerCase();
    const id = cleanId(clean.replace(/[@.]/g, '-'));
    try {
      await setDoc(doc(db, 'newsletter', id), {
        email: clean.slice(0, 200),
        createdAt: serverTimestamp(),
      });
      return 'Welcome to SOVRAN Private Client List. Seasonal previews and drops will arrive first.';
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `newsletter/${id}`);
    }
  },
};
