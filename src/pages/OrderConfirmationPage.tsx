import { CheckCircle2, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { firestoreService } from '../services/firestoreService.ts';
import { Order } from '../types/store.ts';
import { formatOrderStatusLabel, formatPKR } from '../utils/format.ts';

interface OrderConfirmationPageProps {
  orderNumber: string;
}

export function OrderConfirmationPage({ orderNumber }: OrderConfirmationPageProps) {
  const { user, authChecked, signInWithGoogle, navigate } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`sovran_last_order_${orderNumber}`);
      if (cached) {
        setOrder(JSON.parse(cached) as Order);
        setLoading(false);
        return;
      }
    } catch {
      // ignore storage parse failure
    }

    if (!authChecked) return;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    firestoreService
      .findOrderByNumberForUser(
        orderNumber,
        user.id,
        user.role === 'admin' || user.role === 'superadmin'
      )
      .then((found) => setOrder(found))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderNumber, user, authChecked]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 max-w-2xl mx-auto px-6 text-center">
        <p className="text-sm text-[#0A0A0A]/60">Retrieving order confirmation...</p>
      </div>
    );
  }

  if (!order && !user) {
    return (
      <div className="pt-32 pb-24 max-w-xl mx-auto px-6 text-center space-y-4">
        <h1 className="font-editorial text-4xl font-semibold">Sign In to View Confirmation</h1>
        <p className="text-sm text-[#0A0A0A]/65">
          Order records are protected under your SOVRAN account. Sign in with Google to view receipt{' '}
          <span className="font-mono font-semibold">{orderNumber}</span>.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] cursor-pointer"
          >
            Sign In with Google
          </button>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3 border border-black/20 text-xs uppercase tracking-[0.14em] cursor-pointer"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pt-32 pb-24 max-w-2xl mx-auto px-6 text-center">
        <h1 className="font-editorial text-4xl font-semibold">Order Not Found</h1>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="mt-6 px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] cursor-pointer"
        >
          Return to Store
        </button>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 max-w-3xl mx-auto px-6">
      <div className="bg-white border border-black/10 p-8 sm:p-10 space-y-6">
        <div className="flex items-start gap-4 border-b border-black/10 pb-6">
          <CheckCircle2 className="w-8 h-8 text-[#9A7B56] shrink-0 mt-1" />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56] font-medium">
              Order Recorded
            </p>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold mt-1">
              Thank You — {order.orderNumber}
            </h1>
            <p className="text-sm text-[#0A0A0A]/70 mt-1">{order.payment.notes}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-[#F5F3EF] p-4 border border-black/10">
          <div>
            <span className="text-[#0A0A0A]/55 block">Order Number</span>
            <span className="font-mono font-semibold">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-[#0A0A0A]/55 block">Order Status</span>
            <span className="font-semibold">{formatOrderStatusLabel(order.orderStatus)}</span>
          </div>
          <div>
            <span className="text-[#0A0A0A]/55 block">Payment Method</span>
            <span className="font-semibold uppercase">{order.payment.method.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-[#0A0A0A]/55 block">Payment Status</span>
            <span className="font-semibold">{formatOrderStatusLabel(order.payment.status)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/65">
            Items Summary
          </h2>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-black/10">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-[#0A0A0A]/60">
                  Size {item.size} · {item.colorName} · Qty {item.quantity}
                </p>
              </div>
              <span className="font-mono tabular-nums">{formatPKR(item.lineTotal)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm tabular-nums pt-2">
          <div className="flex justify-between text-[#0A0A0A]/70">
            <span>Subtotal</span>
            <span className="font-mono">{formatPKR(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-[#9A7B56]">
              <span>Discount ({order.discountCode})</span>
              <span className="font-mono">-{formatPKR(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[#0A0A0A]/70">
            <span>Shipping ({order.deliveryMethod.label})</span>
            <span className="font-mono">
              {order.shippingCost === 0 ? 'Complimentary' : formatPKR(order.shippingCost)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-black/10">
            <span>Total</span>
            <span className="font-mono">{formatPKR(order.totalAmount)}</span>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(`/track-order?order=${encodeURIComponent(order.orderNumber)}`)}
            className="px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold inline-flex items-center gap-2 hover:bg-[#9A7B56] transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Track Shipment</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3 border border-black/20 text-xs uppercase tracking-[0.14em] font-semibold hover:border-[#0A0A0A] transition-colors cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
