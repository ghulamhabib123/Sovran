import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';
import { formatPKR, getEffectivePrice } from '../../utils/format.ts';
import { SafeImage } from '../common/SafeImage.tsx';

export function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    cartSubtotal,
    products,
    config,
    updateCartQty,
    updateCartVariant,
    removeFromCart,
    navigate,
  } = useStore();

  if (!isCartOpen) return null;

  const threshold = config?.freeShippingThreshold ?? 15000;
  const remaining = Math.max(0, threshold - cartSubtotal);
  const progressPct = Math.min(100, Math.round((cartSubtotal / Math.max(1, threshold)) * 100));

  const handleGo = (path: string) => {
    setIsCartOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div
        className="fixed inset-0 bg-black/55 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      <aside
        aria-label="Shopping Bag"
        className="relative z-10 w-full max-w-md bg-[#F5F3EF] text-[#0A0A0A] h-full flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4" />
            <h2 className="font-editorial text-2xl font-semibold">Your Shopping Bag</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close shopping bag"
            className="p-2 hover:opacity-65 transition-opacity cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping indicator */}
        <div className="px-6 py-3 bg-[#EAE5DC] border-b border-black/10 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span>
              {remaining === 0
                ? 'Complimentary standard shipping unlocked'
                : `Add ${formatPKR(remaining)} more for complimentary shipping`}
            </span>
            <span className="font-mono tabular-nums">{progressPct}%</span>
          </div>
          <div className="w-full h-1 bg-black/10 overflow-hidden">
            <div
              className="h-full bg-[#0A0A0A] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <ShoppingBag className="w-10 h-10 text-[#0A0A0A]/30 mb-3 stroke-[1.25]" />
              <p className="font-editorial text-2xl mb-1">Your bag is empty</p>
              <p className="text-sm text-[#0A0A0A]/60 max-w-xs mb-6">
                Explore our new arrivals and heavyweight essentials to build your wardrobe.
              </p>
              <button
                type="button"
                onClick={() => handleGo('/shop')}
                className="px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-medium hover:bg-[#9A7B56] transition-colors cursor-pointer"
              >
                Explore Shop
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const prod = item.product || products.find((p) => p._id === item.productId);
              if (!prod) return null;
              const unitPrice = getEffectivePrice(prod.price, prod.salePrice);
              const availableSizes = Array.from(
                new Set(prod.variants.filter((v) => v.colorName === item.colorName).map((v) => v.size))
              );

              return (
                <div key={item.variantId} className="flex gap-4 pb-5 border-b border-black/10">
                  <button
                    type="button"
                    onClick={() => handleGo(`/product/${prod.slug}`)}
                    className="w-20 h-28 bg-[#EAE5DC] shrink-0 overflow-hidden cursor-pointer"
                  >
                    <SafeImage
                      src={prod.images[0]?.url}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleGo(`/product/${prod.slug}`)}
                          className="text-left text-sm font-semibold hover:text-[#9A7B56] transition-colors truncate cursor-pointer"
                        >
                          {prod.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variantId)}
                          aria-label={`Remove ${prod.name}`}
                          className="text-[#0A0A0A]/45 hover:text-red-700 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#0A0A0A]/65">
                        <span>{item.colorName}</span>
                        <span aria-hidden="true">·</span>
                        <select
                          aria-label={`Change size for ${prod.name}`}
                          value={item.size}
                          onChange={(e) => {
                            const nextV = prod.variants.find(
                              (v) => v.colorName === item.colorName && v.size === e.target.value
                            );
                            if (nextV) updateCartVariant(item.variantId, nextV, prod);
                          }}
                          className="bg-transparent border border-black/15 px-1.5 py-0.5 text-xs focus:outline-none"
                        >
                          {availableSizes.map((sz) => (
                            <option key={sz} value={sz}>
                              Size {sz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border border-black/15">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variantId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="p-1.5 hover:bg-black/5 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-mono tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variantId, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="p-1.5 hover:bg-black/5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-mono text-sm tabular-nums font-medium">
                        {formatPKR(unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-black/10 bg-white space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#0A0A0A]/70">Estimated Subtotal</span>
              <span className="font-mono text-base font-semibold tabular-nums">
                {formatPKR(cartSubtotal)}
              </span>
            </div>
            <p className="text-[11px] text-[#0A0A0A]/55">
              Discount codes, shipping method, and final total are verified at checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGo('/cart')}
                className="py-3 border border-[#0A0A0A] text-[#0A0A0A] text-xs uppercase tracking-[0.12em] font-medium hover:bg-black/5 transition-colors cursor-pointer"
              >
                View Bag
              </button>
              <button
                type="button"
                onClick={() => handleGo('/checkout')}
                className="py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] font-medium hover:bg-[#9A7B56] transition-colors cursor-pointer"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
