import { CheckCircle2, PackageSearch, Truck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { firestoreService } from '../services/firestoreService.ts';
import { Order } from '../types/store.ts';
import { formatOrderStatusLabel, formatPKR } from '../utils/format.ts';

const TIMELINE_STAGES = [
  'placed',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
];

export function OrderTrackingPage() {
  const { route, user, authChecked, signInWithGoogle } = useStore();
  const params = new URLSearchParams(route.includes('?') ? route.split('?')[1] : '');
  const urlOrderNumber = params.get('order') || '';

  const [orderNumber, setOrderNumber] = useState(urlOrderNumber);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setRecentOrders([]);
      return;
    }
    firestoreService
      .listUserOrders(user.id)
      .then((list) => {
        setRecentOrders(list);
        if (urlOrderNumber) {
          const matched = list.find(
            (o) => o.orderNumber.toUpperCase() === urlOrderNumber.trim().toUpperCase()
          );
          if (matched) setOrder(matched);
        }
      })
      .catch(() => {});
  }, [user, urlOrderNumber]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const found = await firestoreService.findOrderByNumberForUser(
        orderNumber,
        user.id,
        user.role === 'admin' || user.role === 'superadmin'
      );
      if (!found) {
        setOrder(null);
        setError('No matching order was found under your account.');
      } else {
        setOrder(found);
      }
    } catch (err) {
      setOrder(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const currentStageIndex = order ? TIMELINE_STAGES.indexOf(order.orderStatus) : -1;

  return (
    <div className="pt-28 pb-24 max-w-3xl mx-auto px-6">
      <div className="pb-6 border-b border-black/10">
        <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Logistics Concierge</p>
        <h1 className="font-editorial text-4xl font-semibold mt-1">Track Your Order</h1>
        <p className="text-sm text-[#0A0A0A]/65 mt-2">
          Look up real-time fulfillment milestones and courier AWB tracking for your SOVRAN orders.
        </p>
      </div>

      {!authChecked ? (
        <div className="mt-8 bg-white border border-black/10 p-8 text-center text-xs text-[#0A0A0A]/60">
          Verifying session...
        </div>
      ) : !user ? (
        <div className="mt-8 bg-white border border-black/10 p-8 text-center space-y-4">
          <p className="text-sm text-[#0A0A0A]/75">
            Sign in with Google to view live tracking for orders placed with your account.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-7 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors cursor-pointer"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleTrack} className="mt-8 bg-white border border-black/10 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Order # (e.g. SOV-26-A1B2C3)"
              className="sm:col-span-2 border border-black/20 px-3.5 py-2.5 text-sm uppercase font-mono focus:outline-none focus:border-[#0A0A0A]"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold py-2.5 hover:bg-[#9A7B56] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <PackageSearch className="w-4 h-4" />
              <span>{loading ? 'Locating...' : 'Track Order'}</span>
            </button>
          </form>

          {recentOrders.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#0A0A0A]/55">Your Recent Orders:</span>
              {recentOrders.slice(0, 5).map((ro) => (
                <button
                  key={ro._id}
                  type="button"
                  onClick={() => {
                    setOrderNumber(ro.orderNumber);
                    setOrder(ro);
                    setError('');
                  }}
                  className={`px-3 py-1 font-mono border cursor-pointer ${
                    order?._id === ro._id
                      ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                      : 'bg-white border-black/15 hover:border-[#0A0A0A]'
                  }`}
                >
                  {ro.orderNumber}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-900 text-xs">
          {error}
        </div>
      )}

      {order && (
        <div className="mt-8 bg-white border border-black/10 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10">
            <div>
              <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
              <p className="text-xs text-[#0A0A0A]/60 mt-0.5">
                Placed {new Date(order.createdAt).toLocaleDateString()} · Total {formatPKR(order.totalAmount)}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">{formatOrderStatusLabel(order.orderStatus)}</p>
              <p className="text-[#0A0A0A]/60">
                Payment: {formatOrderStatusLabel(order.payment.status)}
              </p>
            </div>
          </div>

          {order.tracking.trackingNumber && (
            <div className="p-4 bg-[#F5F3EF] border border-black/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#9A7B56]" />
                <span>
                  Courier: <strong>{order.tracking.courierName || 'Assigned Courier'}</strong>
                </span>
              </div>
              <span className="font-mono font-semibold">AWB: {order.tracking.trackingNumber}</span>
            </div>
          )}

          {order.orderStatus === 'cancelled' || order.orderStatus === 'returned' ? (
            <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-900">
              This order is marked as <strong>{formatOrderStatusLabel(order.orderStatus)}</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-2">
              {TIMELINE_STAGES.map((stage, idx) => {
                const completed = idx <= currentStageIndex;
                return (
                  <div
                    key={stage}
                    className={`p-3 border text-center ${
                      completed
                        ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F5F3EF]'
                        : 'border-black/10 bg-[#F5F3EF] text-[#0A0A0A]/45'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 mx-auto mb-1.5 ${completed ? 'text-[#9A7B56]' : 'opacity-30'}`} />
                    <span className="text-[11px] font-medium block leading-tight">
                      {formatOrderStatusLabel(stage)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {order.statusHistory?.length > 0 && (
            <div className="pt-4 border-t border-black/10 space-y-2">
              <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/60">
                Activity Log
              </h3>
              {order.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span>
                    <strong>{formatOrderStatusLabel(h.status)}</strong> — {h.note}
                  </span>
                  <span className="font-mono text-[#0A0A0A]/50">
                    {new Date(h.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
