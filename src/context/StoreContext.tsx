import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase.ts';
import { firestoreService } from '../services/firestoreService.ts';
import { CartItem, Product, ProductVariant, StoreConfig, UserProfile } from '../types/store.ts';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface StoreContextValue {
  route: string;
  navigate: (to: string) => void;
  config: StoreConfig | null;
  refreshConfig: () => Promise<void>;
  products: Product[];
  loadingCatalog: boolean;
  refreshProducts: () => Promise<void>;
  user: UserProfile | null;
  authChecked: boolean;
  signInWithGoogle: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, qty?: number, openDrawer?: boolean) => void;
  updateCartQty: (variantId: string, qty: number) => void;
  updateCartVariant: (oldVariantId: string, newVariant: ProductVariant, product: Product) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  recentlyViewedIds: string[];
  markViewed: (productId: string) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isSizeGuideOpen: boolean;
  setIsSizeGuideOpen: (open: boolean) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const GUEST_CART_KEY = 'sovran_guest_cart_v1';
const GUEST_WISHLIST_KEY = 'sovran_guest_wishlist_v1';
const RECENT_VIEWED_KEY = 'sovran_recent_viewed_v1';

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<string>(() => window.location.pathname + window.location.search);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_VIEWED_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const navigate = useCallback((to: string) => {
    const current = window.location.pathname + window.location.search;
    if (to !== current) {
      window.history.pushState({}, '', to);
    }
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePop = () => {
      setRoute(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await firestoreService.getStoreConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed loading store config:', err);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const list = await firestoreService.listProducts(false);
      setProducts(list);
    } catch (err) {
      console.error('Failed loading products:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  // Hydrate cart product objects whenever catalog loads
  useEffect(() => {
    if (products.length === 0) return;
    const map = new Map(products.map((p) => [p._id, p]));
    setCart((prev) =>
      prev.map((item) => ({
        ...item,
        product: map.get(item.productId) || item.product,
      }))
    );
  }, [products]);

  const syncUserCartAndWishlist = useCallback(
    async (uid: string, catalogList: Product[]) => {
      try {
        const [remoteCart, remoteWishlist] = await Promise.all([
          firestoreService.getUserCart(uid),
          firestoreService.getUserWishlist(uid),
        ]);
        const prodMap = new Map(catalogList.map((p) => [p._id, p]));
        if (remoteCart.length > 0) {
          setCart(
            remoteCart.map((item) => ({
              ...item,
              product: prodMap.get(item.productId),
            }))
          );
        } else if (cart.length > 0) {
          await firestoreService.syncUserCart(uid, cart);
        }

        const mergedWish = Array.from(new Set([...remoteWishlist, ...wishlistIds]));
        if (mergedWish.length > 0) {
          setWishlistIds(mergedWish);
          await firestoreService.syncUserWishlist(uid, mergedWish);
        }
      } catch {
        // non-fatal sync error
      }
    },
    [cart, wishlistIds]
  );

  // Initial boot: config, catalog, and Firebase Auth state listener
  useEffect(() => {
    void refreshConfig();
    void refreshProducts();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.emailVerified) {
        try {
          const profile = await firestoreService.syncFirebaseUserProfile(fbUser);
          setUser(profile);
          const catalogList = await firestoreService.listProducts(false);
          setProducts(catalogList);
          await refreshConfig();
          await syncUserCartAndWishlist(profile.id, catalogList);
        } catch (err) {
          console.error('Failed syncing user profile:', err);
        }
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshConfig, refreshProducts]);

  // Persist cart & wishlist locally and in Firestore when signed in
  useEffect(() => {
    try {
      localStorage.setItem(
        GUEST_CART_KEY,
        JSON.stringify(cart.map(({ product: _p, ...rest }) => rest))
      );
    } catch {
      // ignore storage quota errors
    }
    if (user) {
      firestoreService.syncUserCart(user.id, cart).catch(() => {});
    }
  }, [cart, user]);

  useEffect(() => {
    try {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
    if (user) {
      firestoreService.syncUserWishlist(user.id, wishlistIds).catch(() => {});
    }
  }, [wishlistIds, user]);

  const signInWithGoogle = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (!cred.user.emailVerified) {
        showToast('Please use a verified Google email account.', 'error');
        return null;
      }
      const profile = await firestoreService.syncFirebaseUserProfile(cred.user);
      setUser(profile);
      await Promise.all([refreshProducts(), refreshConfig()]);
      return profile;
    } catch (err) {
      const msg = (err as Error).message || 'Sign-in cancelled.';
      if (!msg.includes('popup-closed-by-user')) {
        showToast(msg, 'error');
      }
      return null;
    }
  }, [refreshConfig, refreshProducts, showToast]);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const profile = await firestoreService.syncFirebaseUserProfile(auth.currentUser);
      setUser(profile);
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    showToast('Signed out cleanly.', 'info');
  }, [showToast]);

  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, qty = 1, openDrawer = true) => {
      if (variant.stock <= 0) {
        showToast(`${product.name} (${variant.size}) is currently out of stock.`, 'error');
        return;
      }

      setCart((prev) => {
        const existing = prev.find((i) => i.variantId === variant.id);
        const currentQty = existing ? existing.quantity : 0;
        if (currentQty + qty > variant.stock) {
          showToast(`Only ${variant.stock} units available in ${variant.size} / ${variant.colorName}.`, 'error');
          return prev;
        }
        if (existing) {
          return prev.map((i) =>
            i.variantId === variant.id
              ? { ...i, quantity: i.quantity + qty, product }
              : i
          );
        }
        return [
          ...prev,
          {
            productId: product._id,
            variantId: variant.id,
            size: variant.size,
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            quantity: qty,
            product,
          },
        ];
      });

      showToast(`Added ${product.name} (${variant.size}) to your bag.`);
      if (openDrawer) setIsCartOpen(true);
    },
    [showToast]
  );

  const updateCartQty = useCallback(
    (variantId: string, qty: number) => {
      if (qty <= 0) {
        setCart((prev) => prev.filter((i) => i.variantId !== variantId));
        return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.variantId !== variantId) return item;
          const prod = item.product || products.find((p) => p._id === item.productId);
          const v = prod?.variants.find((vr) => vr.id === variantId);
          if (v && qty > v.stock) {
            showToast(`Maximum available stock is ${v.stock}.`, 'error');
            return { ...item, quantity: v.stock };
          }
          return { ...item, quantity: qty };
        })
      );
    },
    [products, showToast]
  );

  const updateCartVariant = useCallback(
    (oldVariantId: string, newVariant: ProductVariant, product: Product) => {
      if (newVariant.stock <= 0) {
        showToast(`${newVariant.size} / ${newVariant.colorName} is out of stock.`, 'error');
        return;
      }
      setCart((prev) => {
        const current = prev.find((i) => i.variantId === oldVariantId);
        if (!current) return prev;
        const alreadyHasTarget = prev.find((i) => i.variantId === newVariant.id);
        if (alreadyHasTarget && newVariant.id !== oldVariantId) {
          return prev
            .filter((i) => i.variantId !== oldVariantId)
            .map((i) =>
              i.variantId === newVariant.id
                ? { ...i, quantity: Math.min(newVariant.stock, i.quantity + current.quantity) }
                : i
            );
        }
        return prev.map((i) =>
          i.variantId === oldVariantId
            ? {
                ...i,
                variantId: newVariant.id,
                size: newVariant.size,
                colorName: newVariant.colorName,
                colorHex: newVariant.colorHex,
                quantity: Math.min(newVariant.stock, i.quantity),
                product,
              }
            : i
        );
      });
      showToast(`Updated selection to ${newVariant.size} · ${newVariant.colorName}`);
    },
    [showToast]
  );

  const removeFromCart = useCallback((variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    (productId: string) => {
      setWishlistIds((prev) => {
        const exists = prev.includes(productId);
        if (exists) {
          showToast('Removed from saved wishlist.', 'info');
          return prev.filter((id) => id !== productId);
        }
        showToast('Saved to wishlist.');
        return [productId, ...prev];
      });
    },
    [showToast]
  );

  const isInWishlist = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const markViewed = useCallback((productId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_VIEWED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => {
    const prod = i.product || products.find((p) => p._id === i.productId);
    if (!prod) return sum;
    const price = prod.salePrice !== null && prod.salePrice < prod.price ? prod.salePrice : prod.price;
    return sum + price * i.quantity;
  }, 0);

  return (
    <StoreContext.Provider
      value={{
        route,
        navigate,
        config,
        refreshConfig,
        products,
        loadingCatalog,
        refreshProducts,
        user,
        authChecked,
        signInWithGoogle,
        logout,
        refreshUser,
        cart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateCartQty,
        updateCartVariant,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        isInWishlist,
        recentlyViewedIds,
        markViewed,
        quickViewProduct,
        setQuickViewProduct,
        isSearchOpen,
        setIsSearchOpen,
        isSizeGuideOpen,
        setIsSizeGuideOpen,
        showToast,
      }}
    >
      {children}

      {/* Global Toast Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 text-xs tracking-wide shadow-lg border transition-all duration-200 ${
              t.type === 'error'
                ? 'bg-[#1A0D0D] text-white border-red-900/50'
                : t.type === 'info'
                ? 'bg-[#181818] text-[#F5F3EF] border-white/15'
                : 'bg-[#0A0A0A] text-[#F5F3EF] border-[#9A7B56]/40'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
