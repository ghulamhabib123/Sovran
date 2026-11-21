import { LogOut, MapPin, Package, Plus, Trash2, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { firestoreService } from '../services/firestoreService.ts';
import { Order } from '../types/store.ts';
import { formatOrderStatusLabel, formatPKR } from '../utils/format.ts';

export function AccountPage() {
  const { user, authChecked, signInWithGoogle, logout, refreshUser, navigate, showToast } = useStore();

  const [signingIn, setSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile editor
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Address form
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrCity, setAddrCity] = useState('');
  const [addrProvince, setAddrProvince] = useState('Punjab');
  const [addrArea, setAddrArea] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrPostal, setAddrPostal] = useState('');

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setLoadingOrders(true);
    firestoreService
      .listUserOrders(user.id)
      .then((list) => setOrders(list))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const profile = await signInWithGoogle();
      if (profile) {
        showToast(`Welcome back, ${profile.name}.`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await firestoreService.updateUserProfileDetails(user.id, editName, editPhone);
      await refreshUser();
      showToast('Profile updated.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await firestoreService.addUserAddress(user.id, {
        label: addrLabel,
        fullName: user.name,
        phone: user.phone || '0300-0000000',
        country: 'Pakistan',
        province: addrProvince,
        city: addrCity,
        area: addrArea,
        streetAddress: addrStreet,
        postalCode: addrPostal,
        isDefault: (user.addresses?.length || 0) === 0,
      });
      await refreshUser();
      setAddrCity('');
      setAddrArea('');
      setAddrStreet('');
      setAddrPostal('');
      showToast('Shipping address saved.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    try {
      await firestoreService.deleteUserAddress(user.id, id);
      await refreshUser();
      showToast('Address removed.', 'info');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  if (!authChecked) {
    return (
      <div className="pt-32 pb-24 max-w-lg mx-auto px-6 text-center text-sm text-[#0A0A0A]/60">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-28 pb-24 max-w-md mx-auto px-6">
        <div className="bg-white border border-black/10 p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Client Portal</p>
            <h1 className="font-editorial text-3xl font-semibold mt-1">Sign In to SOVRAN</h1>
            <p className="text-xs text-[#0A0A0A]/65 mt-2 leading-relaxed">
              Access your order history, saved shipping addresses, and synced wishlist across devices using your verified Google account.
            </p>
          </div>

          <button
            type="button"
            disabled={signingIn}
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors cursor-pointer disabled:opacity-50"
          >
            {signingIn ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="pt-4 border-t border-black/10 text-xs text-[#0A0A0A]/60 flex justify-between">
            <span>Secured by Firebase Authentication</span>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="underline hover:text-[#0A0A0A] cursor-pointer"
            >
              Browse Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 max-w-[1280px] mx-auto px-6 sm:px-10">
      <div className="pb-6 border-b border-black/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Member Account</p>
          <h1 className="font-editorial text-4xl font-semibold mt-1">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-[#0A0A0A]/60 mt-1">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {(user.role === 'admin' || user.role === 'superadmin') && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-[#9A7B56] text-white text-xs uppercase tracking-[0.12em] font-medium cursor-pointer"
            >
              Open Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="px-4 py-2 border border-black/20 text-xs uppercase tracking-[0.12em] inline-flex items-center gap-1.5 hover:border-[#0A0A0A] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Tabs */}
        <aside className="lg:col-span-3 space-y-1">
          {[
            { id: 'orders', label: 'Order History', icon: Package },
            { id: 'profile', label: 'Profile Details', icon: User },
            { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-[0.12em] font-medium border text-left cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                    : 'bg-white border-black/10 hover:border-[#0A0A0A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => navigate('/wishlist')}
            className="w-full px-4 py-3 text-xs uppercase tracking-[0.12em] font-medium border border-black/10 bg-white hover:border-[#0A0A0A] text-left cursor-pointer"
          >
            View Saved Wishlist →
          </button>
        </aside>

        {/* Active Panel */}
        <div className="lg:col-span-9 bg-white border border-black/10 p-6 sm:p-8">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Your Orders</h2>
              {loadingOrders ? (
                <p className="text-xs text-[#0A0A0A]/60">Loading order history...</p>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[#0A0A0A]/65 mb-4">You have not placed any orders yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/shop')}
                    className="px-6 py-2.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div key={o._id} className="border border-black/10 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10 text-xs">
                        <div>
                          <span className="font-mono font-semibold">{o.orderNumber}</span>
                          <span className="text-[#0A0A0A]/55 ml-2">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatOrderStatusLabel(o.orderStatus)}</span>
                          <span className="font-mono font-semibold">{formatPKR(o.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-[#0A0A0A]/75">
                        {o.items.map((it, idx) => (
                          <span key={idx}>
                            {it.quantity}× {it.name} ({it.size})
                            {idx < o.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/track-order?order=${encodeURIComponent(o.orderNumber)}`)}
                          className="text-xs underline underline-offset-4 hover:text-[#9A7B56] cursor-pointer"
                        >
                          Track Order Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
              <h2 className="font-editorial text-2xl font-semibold">Profile Details</h2>
              <div>
                <label className="text-xs font-medium block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-medium cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <h2 className="font-editorial text-2xl font-semibold">Saved Addresses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(user.addresses || []).map((a) => (
                  <div key={a.id} className="border border-black/15 p-4 text-xs space-y-1 relative">
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(a.id)}
                      aria-label="Delete address"
                      className="absolute top-3 right-3 text-[#0A0A0A]/45 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="font-semibold uppercase tracking-[0.1em]">{a.label}</p>
                    <p>{a.streetAddress}</p>
                    <p>
                      {a.area ? `${a.area}, ` : ''}
                      {a.city}, {a.province}
                    </p>
                    <p className="text-[#0A0A0A]/60">{a.country}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddAddress} className="pt-4 border-t border-black/10 space-y-3 max-w-lg">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add New Address</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    placeholder="Label (Home / Office)"
                    className="border border-black/20 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={addrProvince}
                    onChange={(e) => setAddrProvince(e.target.value)}
                    placeholder="Province"
                    className="border border-black/20 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="City"
                    className="border border-black/20 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    value={addrArea}
                    onChange={(e) => setAddrArea(e.target.value)}
                    placeholder="Area / Sector"
                    className="border border-black/20 px-3 py-2 text-xs"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="Street Address"
                  className="w-full border border-black/20 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={addrPostal}
                  onChange={(e) => setAddrPostal(e.target.value)}
                  placeholder="Postal Code"
                  className="w-full border border-black/20 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] cursor-pointer"
                >
                  Save Address
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
