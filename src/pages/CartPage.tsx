import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SafeImage } from '../components/common/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { firestoreService } from '../services/firestoreService.ts';
import { formatPKR, getEffectivePrice } from '../utils/format.ts';

export function CartPage() {
  const {
    cart,
    products,
    config,
    navigate,
    updateCartQty,
    updateCartVariant,
    removeFromCart,
    showToast,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [summary, setSummary] = useState<{
    subtotal: number;
    discountAmount: number;
    shippingCost: number;
    taxAmount: number;
    totalAmount: number;
    freeShippingThreshold: number;
  } | null>(null);

  useEffect(() => {
    if (cart.length === 0 || products.length === 0 || !config) {
      if (cart.length === 0) setSummary(null);
      return;
    }
    let cancelled = false;
    firestoreService
      .computeCheckoutPreview(cart, 'standard', appliedCoupon, config, products)
      .then((res) => {
        if (!cancelled) {
          setSummary({
            subtotal: res.subtotal,
            discountAmount: res.discountAmount,
            shippingCost: res.shippingCost,
            taxAmount: res.taxAmount,
            totalAmount: res.totalAmount,
            freeShippingThreshold: config.freeShippingThreshold,
          });
        }
      })
      .catch(() => {
        if (!cancelled && appliedCoupon) {
          setAppliedCoupon('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cart, products, config, appliedCoupon]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim() || !config) return;
    try {
      const res = await firestoreService.computeCheckoutPreview(
        cart,
        'standard',
        couponInput.trim(),
        config,
        products
      );
      setAppliedCoupon(res.discountCode);
      setSummary({
        subtotal: res.subtotal,
        discountAmount: res.discountAmount,
        shippingCost: res.shippingCost,
        taxAmount: res.taxAmount,
        totalAmount: res.totalAmount,
        freeShippingThreshold: config.freeShippingThreshold,
      });
      showToast(`Code ${res.discountCode} applied.`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="pt-32 pb-24 max-w-xl mx-auto px-6 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-[#0A0A0A]/30 mb-4 stroke-[1.25]" />
        <h1 className="font-editorial text-4xl font-semibold">Your Shopping Bag is Empty</h1>
        <p className="text-sm text-[#0A0A0A]/65 mt-2 mb-8">
          Browse our architectural essentials and limited seasonal drops to curate your bag.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-8 py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-medium hover:bg-[#9A7B56] transition-colors cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 max-w-[1440px] mx-auto px-6 sm:px-10">
      <div className="pb-6 border-b border-black/10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Review Selection</p>
          <h1 className="font-editorial text-4xl font-semibold mt-1">Shopping Bag</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="text-xs uppercase tracking-[0.12em] underline underline-offset-4 hover:text-[#9A7B56] cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>

      <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Line Items */}
        <div className="lg:col-span-8 space-y-6">
          {cart.map((item) => {
            const prod = item.product || products.find((p) => p._id === item.productId);
            if (!prod) return null;
            const unitPrice = getEffectivePrice(prod.price, prod.salePrice);
            const colors = Array.from(
              new Map(prod.variants.map((v) => [v.colorName, v.colorHex])).entries()
            );
            const sizesForColor = prod.variants.filter((v) => v.colorName === item.colorName);

            return (
              <div
                key={item.variantId}
                className="flex flex-col sm:flex-row gap-5 bg-white border border-black/10 p-5"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/product/${prod.slug}`)}
                  className="w-28 aspect-[3/4] bg-[#EAE5DC] shrink-0 overflow-hidden cursor-pointer"
                >
                  <SafeImage
                    src={prod.images[0]?.url}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#0A0A0A]/55">
                        {prod.gender} · {prod.category}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${prod.slug}`)}
                        className="font-editorial text-2xl font-semibold hover:text-[#9A7B56] text-left cursor-pointer"
                      >
                        {prod.name}
                      </button>
                      <p className="font-mono text-xs text-[#0A0A0A]/70 mt-1">
                        {formatPKR(unitPrice)} each
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.variantId)}
                      aria-label={`Remove ${prod.name}`}
                      className="p-2 text-[#0A0A0A]/45 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Change Color / Change Size / Qty */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-black/10">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <span className="text-[#0A0A0A]/60">Color:</span>
                        <select
                          value={item.colorName}
                          onChange={(e) => {
                            const nextV =
                              prod.variants.find(
                                (v) => v.colorName === e.target.value && v.size === item.size && v.stock > 0
                              ) ||
                              prod.variants.find(
                                (v) => v.colorName === e.target.value && v.stock > 0
                              );
                            if (nextV) updateCartVariant(item.variantId, nextV, prod);
                          }}
                          className="border border-black/15 px-2 py-1 bg-[#F5F3EF] focus:outline-none"
                        >
                          {colors.map(([name]) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-1.5">
                        <span className="text-[#0A0A0A]/60">Size:</span>
                        <select
                          value={item.size}
                          onChange={(e) => {
                            const nextV = prod.variants.find(
                              (v) => v.colorName === item.colorName && v.size === e.target.value
                            );
                            if (nextV) updateCartVariant(item.variantId, nextV, prod);
                          }}
                          className="border border-black/15 px-2 py-1 bg-[#F5F3EF] focus:outline-none"
                        >
                          {sizesForColor.map((v) => (
                            <option key={v.id} value={v.size} disabled={v.stock <= 0}>
                              {v.size} {v.stock <= 0 ? '(Out)' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-black/15">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variantId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="p-2 hover:bg-black/5 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 font-mono text-xs tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variantId, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="p-2 hover:bg-black/5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono text-base font-semibold tabular-nums">
                        {formatPKR(unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <aside className="lg:col-span-4 bg-white border border-black/10 p-6 sm:p-8 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-editorial text-2xl font-semibold">Order Summary</h2>

          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="flex-1 flex items-center border border-black/20 px-3">
              <Tag className="w-3.5 h-3.5 text-[#0A0A0A]/45 mr-2" />
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Discount code (e.g. SOVRAN10)"
                className="w-full py-2.5 text-xs bg-transparent focus:outline-none uppercase"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] hover:bg-[#9A7B56] transition-colors cursor-pointer"
            >
              Apply
            </button>
          </form>

          {appliedCoupon && (
            <div className="flex items-center justify-between text-xs bg-[#EAE5DC] px-3 py-2">
              <span>
                Active code: <strong className="font-mono">{appliedCoupon}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setAppliedCoupon('');
                  setCouponInput('');
                }}
                className="underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          <div className="space-y-3 text-sm pt-2 border-t border-black/10 tabular-nums">
            <div className="flex justify-between">
              <span className="text-[#0A0A0A]/70">Subtotal</span>
              <span className="font-mono">{formatPKR(summary?.subtotal ?? 0)}</span>
            </div>
            {(summary?.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-[#9A7B56]">
                <span>Discount ({appliedCoupon})</span>
                <span className="font-mono">-{formatPKR(summary?.discountAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#0A0A0A]/70">Standard Shipping</span>
              <span className="font-mono">
                {summary?.shippingCost === 0
                  ? 'Complimentary'
                  : formatPKR(summary?.shippingCost ?? config?.standardShippingFee ?? 350)}
              </span>
            </div>
            {(summary?.taxAmount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-[#0A0A0A]/70">Tax</span>
                <span className="font-mono">{formatPKR(summary?.taxAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-black/10 text-base font-semibold">
              <span>Estimated Total</span>
              <span className="font-mono">{formatPKR(summary?.totalAmount ?? 0)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(appliedCoupon ? `/checkout?coupon=${encodeURIComponent(appliedCoupon)}` : '/checkout')
            }
            className="w-full py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </aside>
      </div>
    </div>
  );
}
