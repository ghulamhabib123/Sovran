import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Check,
  Database,
  Edit3,
  Layers,
  LogOut,
  Package,
  Plus,
  Settings,
  Tag,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeImage } from '../components/common/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase.ts';
import { apiFetch } from '../services/api.ts';
import { firestoreService } from '../services/firestoreService.ts';
import {
  Coupon,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductVariant,
  StoreConfig,
} from '../types/store.ts';
import { formatOrderStatusLabel, formatPKR } from '../utils/format.ts';

type AdminTab = 'overview' | 'products' | 'inventory' | 'orders' | 'customers' | 'coupons' | 'settings';

interface AdminOverview {
  metrics: {
    totalSalesCount: number;
    totalOrders: number;
    totalRevenue: number;
    paidRevenue: number;
    totalCustomers: number;
    pendingOrders: number;
    completedOrders: number;
    lowStockCount: number;
  };
  lowStockVariants: {
    productId: string;
    productName: string;
    sku: string;
    size: string;
    colorName: string;
    stock: number;
  }[];
  bestSellers: {
    _id: string;
    name: string;
    category: string;
    price: number;
    salesCount: number;
    image: string;
  }[];
  salesChart: { date: string; revenue: number; orders: number }[];
  recentOrders: Order[];
}

function computeOverview(
  products: Product[],
  orders: Order[],
  customersCount: number
): AdminOverview {
  const nonCancelled = orders.filter((o) => o.orderStatus !== 'cancelled');
  const totalRevenue = nonCancelled.reduce((s, o) => s + o.totalAmount, 0);
  const paidRevenue = nonCancelled
    .filter((o) => o.payment.status === 'paid')
    .reduce((s, o) => s + o.totalAmount, 0);
  const totalSalesCount = nonCancelled.reduce(
    (s, o) => s + o.items.reduce((q, it) => q + it.quantity, 0),
    0
  );
  const pendingOrders = orders.filter(
    (o) => !['delivered', 'cancelled', 'returned'].includes(o.orderStatus)
  ).length;
  const completedOrders = orders.filter((o) => o.orderStatus === 'delivered').length;

  const lowStockVariants: AdminOverview['lowStockVariants'] = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (v.stock <= 4) {
        lowStockVariants.push({
          productId: p._id,
          productName: p.name,
          sku: v.sku || p.sku,
          size: v.size,
          colorName: v.colorName,
          stock: v.stock,
        });
      }
    }
  }

  const bestSellers = [...products]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5)
    .map((p) => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      price: p.salePrice ?? p.price,
      salesCount: p.salesCount,
      image: p.images[0]?.url || '',
    }));

  const salesChart: AdminOverview['salesChart'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    const dayOrders = nonCancelled.filter((o) => o.createdAt.slice(0, 10) === isoDate);
    salesChart.push({
      date: isoDate,
      revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
      orders: dayOrders.length,
    });
  }

  return {
    metrics: {
      totalSalesCount,
      totalOrders: orders.length,
      totalRevenue,
      paidRevenue,
      totalCustomers: customersCount,
      pendingOrders,
      completedOrders,
      lowStockCount: lowStockVariants.length,
    },
    lowStockVariants,
    bestSellers,
    salesChart,
    recentOrders: orders.slice(0, 6),
  };
}

export function AdminDashboardPage() {
  const {
    user,
    authChecked,
    signInWithGoogle,
    logout,
    refreshConfig,
    refreshProducts,
    navigate,
    showToast,
  } = useStore();

  const [authBusy, setAuthBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<
    { id: string; name: string; email: string; phone: string; ordersCount: number; totalSpent: number }[]
  >([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<StoreConfig | null>(null);

  // Product Editor Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Order filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Coupon form
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponMin, setNewCouponMin] = useState(5000);

  const isAdmin = Boolean(user && (user.role === 'admin' || user.role === 'superadmin'));

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [pr, or, cp, st] = await Promise.all([
        firestoreService.listProducts(true),
        firestoreService.adminListOrders(),
        firestoreService.adminListCoupons(),
        firestoreService.getStoreConfig(),
      ]);
      const cu = await firestoreService.adminListCustomers(or);
      setProducts(pr);
      setOrders(or);
      setCustomers(cu);
      setCoupons(cp);
      setSettings(st);
      setOverview(computeOverview(pr, or, cu.length));
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleAdminSignIn = async () => {
    setAuthBusy(true);
    try {
      const profile = await signInWithGoogle();
      if (profile && profile.role !== 'admin' && profile.role !== 'superadmin') {
        showToast('Signed-in account does not have administrator privileges.', 'error');
      } else if (profile) {
        showToast('Signed in to SOVRAN Admin Workspace.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="pt-32 pb-24 max-w-md mx-auto px-6 text-center text-sm text-[#0A0A0A]/60">
        Verifying administrator credentials...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="pt-28 pb-24 max-w-md mx-auto px-6">
        <div className="bg-white border border-black/10 p-8 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Protected Workspace</p>
            <h1 className="font-editorial text-3xl font-semibold mt-1">Admin Sign In</h1>
            <p className="text-xs text-[#0A0A0A]/65 mt-2 leading-relaxed">
              Sign in with the authorized administrator Google account (
              <span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span>) to manage catalog inventory,
              verify customer payments, and configure store settings.
            </p>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                Currently signed in as <strong className="font-mono">{user.email}</strong>, which is a
                customer account. Switch to the administrator Google account to continue.
              </div>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  await handleAdminSignIn();
                }}
                disabled={authBusy}
                className="w-full py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors cursor-pointer"
              >
                {authBusy ? 'Switching Account...' : 'Switch Google Account'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdminSignIn}
              disabled={authBusy}
              className="w-full py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors cursor-pointer"
            >
              {authBusy ? 'Authenticating...' : 'Continue with Google (Admin)'}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-[#0A0A0A]/60 hover:text-[#0A0A0A] underline cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  // ---- HANDLERS ----
  const handleSyncSeedCatalog = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const seeded = await firestoreService.seedFirestoreIfEmpty(user.id);
      if (seeded) {
        showToast('Initial SOVRAN catalog, coupons, and settings synced to Firestore.');
      } else {
        showToast('Firestore catalog is already populated.', 'info');
      }
      await Promise.all([loadAdminData(), refreshProducts(), refreshConfig()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    setUploadingImg(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await apiFetch<{ url: string; publicId: string }>('/api/store/admin/upload', {
        method: 'POST',
        body: form,
      });
      setEditingProduct({
        ...editingProduct,
        images: [
          ...(editingProduct.images || []),
          { url: res.url, publicId: res.publicId, alt: editingProduct.name || 'Garment' },
        ],
      });
      showToast('Image uploaded.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct._id) {
        await firestoreService.updateProduct(editingProduct._id, editingProduct);
        showToast('Product updated in Firestore.');
      } else {
        await firestoreService.createProduct(editingProduct);
        showToast('Product created in Firestore.');
      }
      setEditingProduct(null);
      await Promise.all([loadAdminData(), refreshProducts()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await firestoreService.deleteProduct(id);
      showToast('Product deleted.', 'info');
      await Promise.all([loadAdminData(), refreshProducts()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (order: Order, orderStatus: OrderStatus) => {
    try {
      await firestoreService.adminUpdateOrderStatus(order, orderStatus);
      showToast(`Order marked ${formatOrderStatusLabel(orderStatus)}.`);
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleUpdatePaymentStatus = async (order: Order, paymentStatus: PaymentStatus) => {
    try {
      await firestoreService.adminUpdateOrderPayment(order, paymentStatus);
      showToast(`Payment marked ${formatOrderStatusLabel(paymentStatus)}.`);
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSaveTracking = async (orderId: string, courierName: string, trackingNumber: string) => {
    try {
      await firestoreService.adminUpdateOrderTracking(orderId, courierName, trackingNumber);
      showToast('Tracking details saved.');
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleQuickStockChange = async (product: Product, variantId: string, newStock: number) => {
    const updatedVariants = product.variants.map((v) =>
      v.id === variantId ? { ...v, stock: Math.max(0, newStock) } : v
    );
    try {
      await firestoreService.updateProduct(product._id, { variants: updatedVariants });
      await Promise.all([loadAdminData(), refreshProducts()]);
      showToast('Stock updated.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await firestoreService.adminCreateCoupon({
        code: newCouponCode,
        type: newCouponType,
        value: newCouponValue,
        minOrderAmount: newCouponMin,
      });
      setNewCouponCode('');
      showToast('Coupon created.');
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await firestoreService.updateStoreSettings(settings);
      await refreshConfig();
      showToast('Store settings & CMS saved.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
    const q = orderSearch.trim().toLowerCase();
    const matchesQ =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer.fullName.toLowerCase().includes(q) ||
      o.customer.email.toLowerCase().includes(q);
    return matchesStatus && matchesQ;
  });

  const maxChartRev = Math.max(1, ...(overview?.salesChart || []).map((d) => d.revenue));

  return (
    <div className="pt-24 pb-24 max-w-[1440px] mx-auto px-6 sm:px-10">
      {/* Header */}
      <div className="pb-6 border-b border-black/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">SOVRAN Operations · Firestore</p>
          <h1 className="font-editorial text-4xl font-semibold mt-1">Admin Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={seeding}
            onClick={handleSyncSeedCatalog}
            className="px-4 py-2 border border-black/20 text-xs uppercase tracking-[0.12em] inline-flex items-center gap-1.5 hover:border-[#0A0A0A] cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{seeding ? 'Syncing...' : 'Sync Seed Data'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-black/20 text-xs uppercase tracking-[0.12em] cursor-pointer"
          >
            View Storefront
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="px-4 py-2 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="py-4 border-b border-black/10 flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'products', label: 'Products', icon: Layers },
          { id: 'inventory', label: 'Inventory', icon: Boxes },
          { id: 'orders', label: 'Orders', icon: Package },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'coupons', label: 'Discounts', icon: Tag },
          { id: 'settings', label: 'CMS & Settings', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as AdminTab)}
              className={`px-4 py-2 text-xs uppercase tracking-[0.12em] font-medium inline-flex items-center gap-2 border cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                  : 'bg-white border-black/15 hover:border-[#0A0A0A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="pt-8 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', val: formatPKR(overview.metrics.totalRevenue) },
              { label: 'Verified Paid Revenue', val: formatPKR(overview.metrics.paidRevenue) },
              { label: 'Total Orders', val: `${overview.metrics.totalOrders} (${overview.metrics.pendingOrders} active)` },
              { label: 'Low Stock Variants', val: String(overview.metrics.lowStockCount) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-black/10 p-5">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#0A0A0A]/55">
                  {kpi.label}
                </span>
                <p className="font-mono text-xl sm:text-2xl font-semibold mt-1 tabular-nums">
                  {kpi.val}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Revenue Chart */}
            <div className="lg:col-span-7 bg-white border border-black/10 p-6">
              <h2 className="font-editorial text-2xl font-semibold mb-4">7-Day Revenue Trend</h2>
              <div className="h-52 flex items-end gap-3 pt-6 border-b border-black/10 pb-2">
                {overview.salesChart.map((day) => {
                  const pct = Math.max(4, Math.round((day.revenue / maxChartRev) * 100));
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-mono text-[10px] text-[#0A0A0A]/60 tabular-nums">
                        {day.revenue > 0 ? `${Math.round(day.revenue / 1000)}k` : '0'}
                      </span>
                      <div
                        className="w-full bg-[#0A0A0A] hover:bg-[#9A7B56] transition-colors"
                        style={{ height: `${pct}%` }}
                        title={`${day.date}: ${formatPKR(day.revenue)} (${day.orders} orders)`}
                      />
                      <span className="font-mono text-[10px] text-[#0A0A0A]/55">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Best Sellers */}
            <div className="lg:col-span-5 bg-white border border-black/10 p-6 space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Best Selling Pieces</h2>
              <div className="space-y-3">
                {overview.bestSellers.map((b) => (
                  <div key={b._id} className="flex items-center justify-between text-xs border-b border-black/10 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-12 bg-[#EAE5DC]">
                        <SafeImage src={b.image} alt={b.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold">{b.name}</p>
                        <p className="text-[#0A0A0A]/55">{b.category}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="font-semibold">{b.salesCount} sold</p>
                      <p className="text-[#0A0A0A]/60">{formatPKR(b.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS CRUD */}
      {activeTab === 'products' && (
        <div className="pt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-2xl font-semibold">
              Catalog ({products.length} products)
            </h2>
            <button
              type="button"
              onClick={() =>
                setEditingProduct({
                  name: '',
                  sku: `SOV-${Date.now().toString().slice(-4)}`,
                  description: '',
                  fabricDetails: '100% Organic Cotton',
                  careInstructions: 'Cold machine wash.',
                  specifications: ['Tailored Atelier Cut'],
                  gender: 'men',
                  category: 'T-Shirts',
                  collectionSlug: 'everyday',
                  price: 6500,
                  salePrice: null,
                  images: [],
                  silhouetteType: 'tee',
                  variants: [
                    {
                      id: `VAR-${Date.now()}-M`,
                      size: 'M',
                      colorName: 'Obsidian',
                      colorHex: '#111111',
                      stock: 10,
                      sku: `SKU-${Date.now().toString().slice(-4)}-M`,
                    },
                  ],
                  status: 'active',
                  isFeatured: false,
                  isNewArrival: true,
                  isBestSeller: false,
                  isDemo: false,
                })
              }
              className="px-5 py-2.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="bg-white border border-black/10 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EAE5DC] uppercase tracking-[0.1em]">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {products.map((p) => {
                  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
                  return (
                    <tr key={p._id} className="hover:bg-[#F5F3EF]/60">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="w-10 h-12 bg-[#EAE5DC] shrink-0">
                          <SafeImage src={p.images[0]?.url} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold">{p.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">{p.sku}</td>
                      <td className="py-3 px-4 capitalize">
                        {p.gender} · {p.category}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {formatPKR(p.salePrice ?? p.price)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">{totalStock}</td>
                      <td className="py-3 px-4">{p.isDemo ? 'Seed' : 'Custom'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(JSON.parse(JSON.stringify(p)) as Partial<Product>)}
                          className="p-1.5 border border-black/20 hover:border-[#0A0A0A] cursor-pointer"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p._id)}
                          className="p-1.5 border border-black/20 hover:border-red-700 hover:text-red-700 cursor-pointer"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="pt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-2xl font-semibold">Variant Stock Control</h2>
            {overview && overview.lowStockVariants.length > 0 && (
              <span className="text-xs text-amber-800 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>{overview.lowStockVariants.length} variants at or below 4 units</span>
              </span>
            )}
          </div>

          <div className="bg-white border border-black/10 divide-y divide-black/10">
            {products.map((p) => (
              <div key={p._id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {p.name} <span className="font-mono text-xs text-[#0A0A0A]/50">({p.sku})</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {p.variants.map((v) => (
                    <div
                      key={v.id}
                      className={`p-2.5 border text-xs ${
                        v.stock <= 0
                          ? 'border-red-300 bg-red-50'
                          : v.stock <= 4
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-black/10 bg-[#F5F3EF]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{v.size}</span>
                        <span className="text-[10px] truncate max-w-[70px]">{v.colorName}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        defaultValue={v.stock}
                        onBlur={(e) => handleQuickStockChange(p, v.id, Number(e.target.value))}
                        className="w-full bg-white border border-black/15 px-2 py-1 font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ORDERS */}
      {activeTab === 'orders' && (
        <div className="pt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-editorial text-2xl font-semibold">Orders ({filteredOrders.length})</h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order #, customer, email..."
                className="bg-white border border-black/20 px-3 py-2 text-xs w-64"
              />
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-white border border-black/20 px-3 py-2 text-xs"
              >
                <option value="all">All Statuses</option>
                {[
                  'placed',
                  'confirmed',
                  'processing',
                  'packed',
                  'shipped',
                  'out_for_delivery',
                  'delivered',
                  'cancelled',
                  'returned',
                ].map((s) => (
                  <option key={s} value={s}>
                    {formatOrderStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-black/10 p-10 text-center text-sm text-[#0A0A0A]/60">
              No orders match the current filter. Orders placed via checkout will appear here immediately.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((o) => (
                <div key={o._id} className="bg-white border border-black/10 p-5 space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-black/10">
                    <div>
                      <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                      <span className="ml-3 text-[#0A0A0A]/65">
                        {o.customer.fullName} · {o.customer.email} · {o.customer.phone}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums">
                      {formatPKR(o.totalAmount)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="font-semibold mb-1">Items &amp; Address</p>
                      {o.items.map((it, idx) => (
                        <p key={idx} className="text-[#0A0A0A]/75">
                          {it.quantity}× {it.name} ({it.size} / {it.colorName})
                        </p>
                      ))}
                      <p className="text-[#0A0A0A]/55 mt-1">
                        {o.shippingAddress.streetAddress}, {o.shippingAddress.city}, {o.shippingAddress.province}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-semibold">Order Fulfillment Status</label>
                      <select
                        value={o.orderStatus}
                        onChange={(e) => handleUpdateOrderStatus(o, e.target.value as OrderStatus)}
                        className="w-full border border-black/20 px-2.5 py-1.5 bg-[#F5F3EF]"
                      >
                        {[
                          'placed',
                          'confirmed',
                          'processing',
                          'packed',
                          'shipped',
                          'out_for_delivery',
                          'delivered',
                          'cancelled',
                          'returned',
                        ].map((s) => (
                          <option key={s} value={s}>
                            {formatOrderStatusLabel(s)}
                          </option>
                        ))}
                      </select>

                      <label className="block font-semibold pt-1">
                        Payment ({o.payment.method.replace('_', ' ').toUpperCase()})
                      </label>
                      <select
                        value={o.payment.status}
                        onChange={(e) => handleUpdatePaymentStatus(o, e.target.value as PaymentStatus)}
                        className="w-full border border-black/20 px-2.5 py-1.5 bg-[#F5F3EF]"
                      >
                        {['pending', 'pending_verification', 'paid', 'failed', 'refunded'].map((ps) => (
                          <option key={ps} value={ps}>
                            {formatOrderStatusLabel(ps)}
                          </option>
                        ))}
                      </select>
                      {o.payment.transactionReference && (
                        <p className="font-mono text-[11px] text-[#0A0A0A]/70">
                          TID: {o.payment.transactionReference}
                        </p>
                      )}
                      {o.payment.receiptUrl && (
                        <a
                          href={o.payment.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-[#9A7B56] block"
                        >
                          View Uploaded Receipt
                        </a>
                      )}
                    </div>

                    <OrderTrackingEditor order={o} onSave={handleSaveTracking} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="pt-8 space-y-4">
          <h2 className="font-editorial text-2xl font-semibold">
            Registered Customers ({customers.length})
          </h2>
          <div className="bg-white border border-black/10 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EAE5DC] uppercase tracking-[0.1em]">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#0A0A0A]/55">
                      No registered customer accounts yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-4 font-semibold">{c.name}</td>
                      <td className="py-3 px-4">{c.email}</td>
                      <td className="py-3 px-4 font-mono">{c.phone || '—'}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{c.ordersCount}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{formatPKR(c.totalSpent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleCreateCoupon} className="lg:col-span-4 bg-white border border-black/10 p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold">Create Discount Code</h2>
            <div>
              <label className="text-xs font-medium block mb-1">Code</label>
              <input
                type="text"
                required
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="WINTER20"
                className="w-full border border-black/20 px-3 py-2 text-xs uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Discount Type</label>
              <select
                value={newCouponType}
                onChange={(e) => setNewCouponType(e.target.value as typeof newCouponType)}
                className="w-full border border-black/20 px-3 py-2 text-xs"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (PKR)</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Value</label>
                <input
                  type="number"
                  min={0}
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(Number(e.target.value))}
                  className="w-full border border-black/20 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Min Order (PKR)</label>
                <input
                  type="number"
                  min={0}
                  value={newCouponMin}
                  onChange={(e) => setNewCouponMin(Number(e.target.value))}
                  className="w-full border border-black/20 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] cursor-pointer"
            >
              Create Coupon
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-black/10 divide-y divide-black/10">
            {coupons.map((cp) => (
              <div key={cp._id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-sm font-semibold">{cp.code}</span>
                  <p className="text-[#0A0A0A]/65 mt-0.5">
                    {cp.type === 'percentage'
                      ? `${cp.value}% off`
                      : cp.type === 'fixed'
                      ? `${formatPKR(cp.value)} off`
                      : 'Free shipping'}{' '}
                    · Min order {formatPKR(cp.minOrderAmount)} · Used {cp.usedCount} times
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await firestoreService.adminToggleCoupon(cp);
                      await loadAdminData();
                    }}
                    className={`px-3 py-1 border cursor-pointer ${
                      cp.isActive ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'border-black/20'
                    }`}
                  >
                    {cp.isActive ? 'Active' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await firestoreService.adminDeleteCoupon(cp._id);
                      await loadAdminData();
                    }}
                    className="p-1.5 border border-black/20 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: CMS & STORE SETTINGS */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="pt-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-black/10 p-6 space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Homepage &amp; Editorial CMS</h2>
              <div>
                <label className="text-xs font-medium block mb-1">Hero Headline</label>
                <input
                  type="text"
                  value={settings.cms.heroHeadline}
                  onChange={(e) =>
                    setSettings({ ...settings, cms: { ...settings.cms, heroHeadline: e.target.value } })
                  }
                  className="w-full border border-black/20 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Hero Subtitle</label>
                <textarea
                  rows={2}
                  value={settings.cms.heroSubtitle}
                  onChange={(e) =>
                    setSettings({ ...settings, cms: { ...settings.cms, heroSubtitle: e.target.value } })
                  }
                  className="w-full border border-black/20 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Promo Banner Text</label>
                <input
                  type="text"
                  value={settings.cms.promoBannerText}
                  onChange={(e) =>
                    setSettings({ ...settings, cms: { ...settings.cms, promoBannerText: e.target.value } })
                  }
                  className="w-full border border-black/20 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Featured Collection Title</label>
                <input
                  type="text"
                  value={settings.cms.featuredCollectionTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cms: { ...settings.cms, featuredCollectionTitle: e.target.value },
                    })
                  }
                  className="w-full border border-black/20 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Brand Story Title</label>
                <input
                  type="text"
                  value={settings.cms.brandStoryTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cms: { ...settings.cms, brandStoryTitle: e.target.value },
                    })
                  }
                  className="w-full border border-black/20 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="bg-white border border-black/10 p-6 space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Shipping, Currency &amp; Gateways</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={settings.brandName}
                    onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                    className="w-full border border-black/20 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Currency</label>
                  <input
                    type="text"
                    value={settings.currency}
                    readOnly
                    className="w-full border border-black/20 px-3 py-2 text-xs font-mono bg-[#F5F3EF]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Standard Fee</label>
                  <input
                    type="number"
                    value={settings.standardShippingFee}
                    onChange={(e) =>
                      setSettings({ ...settings, standardShippingFee: Number(e.target.value) })
                    }
                    className="w-full border border-black/20 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Free Shipping Threshold</label>
                  <input
                    type="number"
                    value={settings.freeShippingThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })
                    }
                    className="w-full border border-black/20 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2 text-xs">
                <p className="font-semibold">Enabled Payment Methods</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['cod', 'Cash on Delivery'],
                      ['bankTransfer', 'Bank Transfer'],
                      ['easypaisa', 'Easypaisa'],
                      ['jazzcash', 'JazzCash'],
                      ['card', 'Stripe Card'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.paymentMethods[key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            paymentMethods: {
                              ...settings.paymentMethods,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="accent-[#0A0A0A]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-medium block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={settings.bankDetails.bankName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bankDetails: { ...settings.bankDetails, bankName: e.target.value },
                      })
                    }
                    className="w-full border border-black/20 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Bank IBAN</label>
                  <input
                    type="text"
                    value={settings.bankDetails.iban}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bankDetails: { ...settings.bankDetails, iban: e.target.value },
                      })
                    }
                    className="w-full border border-black/20 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Easypaisa Account</label>
                  <input
                    type="text"
                    value={settings.mobileWallets.easypaisaNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mobileWallets: { ...settings.mobileWallets, easypaisaNumber: e.target.value },
                      })
                    }
                    className="w-full border border-black/20 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">JazzCash Account</label>
                  <input
                    type="text"
                    value={settings.mobileWallets.jazzcashNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mobileWallets: { ...settings.mobileWallets, jazzcashNumber: e.target.value },
                      })
                    }
                    className="w-full border border-black/20 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-8 py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold inline-flex items-center gap-2 hover:bg-[#9A7B56] transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </form>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setEditingProduct(null)} />
          <form
            onSubmit={handleSaveProduct}
            className="relative z-10 bg-[#F5F3EF] text-[#0A0A0A] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <h2 className="font-editorial text-2xl font-semibold">
                {editingProduct._id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-xs underline cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-medium block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-white border border-black/20 px-3 py-2"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full bg-white border border-black/20 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Gender *</label>
                <select
                  value={editingProduct.gender || 'men'}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      gender: e.target.value as Product['gender'],
                    })
                  }
                  className="w-full bg-white border border-black/20 px-3 py-2"
                >
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
              <div>
                <label className="font-medium block mb-1">Category *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full bg-white border border-black/20 px-3 py-2"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Price (PKR) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  className="w-full bg-white border border-black/20 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Sale Price (Optional)</label>
                <input
                  type="number"
                  value={editingProduct.salePrice ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      salePrice: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full bg-white border border-black/20 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-medium block mb-1">Description</label>
              <textarea
                rows={3}
                value={editingProduct.description || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                className="w-full bg-white border border-black/20 px-3 py-2"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(editingProduct.isFeatured)}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                />
                <span>Featured</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(editingProduct.isNewArrival)}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isNewArrival: e.target.checked })}
                />
                <span>New Arrival</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(editingProduct.isBestSeller)}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                />
                <span>Best Seller</span>
              </label>
            </div>

            {/* Images */}
            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Product Photography</span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/20 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImg ? 'Uploading...' : 'Upload Image'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingProduct.images || []).map((img, i) => (
                  <div key={i} className="relative w-16 h-20 bg-[#EAE5DC]">
                    <SafeImage src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          images: (editingProduct.images || []).filter((_, idx) => idx !== i),
                        })
                      }
                      className="absolute top-0.5 right-0.5 bg-black text-white px-1 text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Size &amp; Color Variants</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextV: ProductVariant = {
                      id: `VAR-${Date.now()}`,
                      size: 'L',
                      colorName: 'Obsidian',
                      colorHex: '#111111',
                      stock: 10,
                      sku: `${editingProduct.sku || 'SOV'}-${Date.now().toString().slice(-3)}`,
                    };
                    setEditingProduct({
                      ...editingProduct,
                      variants: [...(editingProduct.variants || []), nextV],
                    });
                  }}
                  className="underline cursor-pointer"
                >
                  + Add Variant
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(editingProduct.variants || []).map((v, idx) => (
                  <div key={v.id} className="grid grid-cols-5 gap-2">
                    <input
                      type="text"
                      value={v.size}
                      onChange={(e) => {
                        const list = [...(editingProduct.variants || [])];
                        list[idx] = { ...v, size: e.target.value };
                        setEditingProduct({ ...editingProduct, variants: list });
                      }}
                      placeholder="Size"
                      className="bg-white border border-black/20 px-2 py-1"
                    />
                    <input
                      type="text"
                      value={v.colorName}
                      onChange={(e) => {
                        const list = [...(editingProduct.variants || [])];
                        list[idx] = { ...v, colorName: e.target.value };
                        setEditingProduct({ ...editingProduct, variants: list });
                      }}
                      placeholder="Color"
                      className="bg-white border border-black/20 px-2 py-1 col-span-2"
                    />
                    <input
                      type="color"
                      value={v.colorHex}
                      onChange={(e) => {
                        const list = [...(editingProduct.variants || [])];
                        list[idx] = { ...v, colorHex: e.target.value };
                        setEditingProduct({ ...editingProduct, variants: list });
                      }}
                      className="h-7 w-full bg-white border border-black/20"
                    />
                    <input
                      type="number"
                      min={0}
                      value={v.stock}
                      onChange={(e) => {
                        const list = [...(editingProduct.variants || [])];
                        list[idx] = { ...v, stock: Number(e.target.value) };
                        setEditingProduct({ ...editingProduct, variants: list });
                      }}
                      placeholder="Stock"
                      className="bg-white border border-black/20 px-2 py-1 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold cursor-pointer"
            >
              Save Product
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function OrderTrackingEditor({
  order,
  onSave,
}: {
  order: Order;
  onSave: (orderId: string, courierName: string, trackingNumber: string) => void;
}) {
  const [courier, setCourier] = useState(order.tracking?.courierName || '');
  const [tracking, setTracking] = useState(order.tracking?.trackingNumber || '');

  return (
    <div className="space-y-2">
      <p className="font-semibold">Courier &amp; Tracking</p>
      <input
        type="text"
        value={courier}
        onChange={(e) => setCourier(e.target.value)}
        placeholder="Courier (TCS / Leopards / DHL)"
        className="w-full border border-black/20 px-2.5 py-1.5 bg-white"
      />
      <input
        type="text"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        placeholder="Tracking / AWB Number"
        className="w-full border border-black/20 px-2.5 py-1.5 bg-white font-mono"
      />
      <button
        type="button"
        onClick={() => onSave(order._id, courier, tracking)}
        className="px-3 py-1.5 bg-[#0A0A0A] text-white text-[11px] uppercase tracking-[0.12em] cursor-pointer"
      >
        Save Tracking
      </button>
    </div>
  );
}
