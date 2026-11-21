import { ArrowRight, Heart, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { formatPKR, getDiscountPercent, getEffectivePrice } from '../../utils/format.ts';
import { SafeImage } from '../common/SafeImage.tsx';

export function QuickViewModal() {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    toggleWishlist,
    isInWishlist,
    navigate,
  } = useStore();

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    if (!quickViewProduct) return;
    const first = quickViewProduct.variants.find((v) => v.stock > 0) || quickViewProduct.variants[0];
    if (first) {
      setSelectedColor(first.colorName);
      setSelectedSize(first.size);
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const colors = Array.from(
    new Map(quickViewProduct.variants.map((v) => [v.colorName, v.colorHex])).entries()
  );
  const sizesForColor = quickViewProduct.variants.filter((v) => v.colorName === selectedColor);
  const activeVariant = quickViewProduct.variants.find(
    (v) => v.colorName === selectedColor && v.size === selectedSize
  );

  const effectivePrice = getEffectivePrice(quickViewProduct.price, quickViewProduct.salePrice);
  const discount = getDiscountPercent(quickViewProduct.price, quickViewProduct.salePrice);
  const wishlisted = isInWishlist(quickViewProduct._id);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60"
        onClick={() => setQuickViewProduct(null)}
      />
      <div className="relative z-10 bg-[#F5F3EF] text-[#0A0A0A] max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl">
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          aria-label="Close quick view"
          className="absolute top-3 right-3 z-20 p-2 bg-white/90 hover:bg-[#0A0A0A] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="aspect-[3/4] bg-[#EAE5DC]">
          <SafeImage
            src={quickViewProduct.images[0]?.url}
            alt={quickViewProduct.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 sm:p-8 flex flex-col justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#0A0A0A]/55">
              {quickViewProduct.gender} · {quickViewProduct.category}
            </p>
            <h2 className="font-editorial text-3xl font-semibold mt-1">
              {quickViewProduct.name}
            </h2>

            <div className="mt-2 flex items-baseline gap-3 font-mono tabular-nums">
              <span className="text-lg font-semibold">{formatPKR(effectivePrice)}</span>
              {discount > 0 && (
                <span className="text-sm text-[#0A0A0A]/45 line-through">
                  {formatPKR(quickViewProduct.price)}
                </span>
              )}
            </div>

            <p className="mt-4 text-sm text-[#0A0A0A]/75 leading-relaxed line-clamp-3">
              {quickViewProduct.description}
            </p>

            {/* Color Selection */}
            <div className="mt-5">
              <span className="text-xs font-medium text-[#0A0A0A]/75">
                Color: <strong className="text-[#0A0A0A]">{selectedColor}</strong>
              </span>
              <div className="flex items-center gap-2.5 mt-2">
                {colors.map(([name, hex]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(name);
                      const firstSize = quickViewProduct.variants.find(
                        (v) => v.colorName === name && v.stock > 0
                      ) || quickViewProduct.variants.find((v) => v.colorName === name);
                      if (firstSize) setSelectedSize(firstSize.size);
                    }}
                    aria-label={`Select color ${name}`}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                      selectedColor === name ? 'border-[#0A0A0A] scale-110' : 'border-black/20'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#0A0A0A]/75">Select Size</span>
                {activeVariant && (
                  <span className="text-[#0A0A0A]/60 font-mono">
                    {activeVariant.stock > 0 ? `${activeVariant.stock} in stock` : 'Out of stock'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {sizesForColor.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stock <= 0}
                    onClick={() => setSelectedSize(v.size)}
                    className={`py-2 text-xs font-medium border transition-colors cursor-pointer ${
                      selectedSize === v.size
                        ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                        : 'border-black/20 hover:border-[#0A0A0A]'
                    } disabled:opacity-35 disabled:line-through`}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!activeVariant || activeVariant.stock <= 0}
                onClick={() => {
                  if (activeVariant) {
                    addToCart(quickViewProduct, activeVariant, 1, true);
                    setQuickViewProduct(null);
                  }
                }}
                className="flex-1 py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-medium hover:bg-[#9A7B56] transition-colors disabled:opacity-45 cursor-pointer"
              >
                {activeVariant && activeVariant.stock > 0 ? 'Add to Shopping Bag' : 'Out of Stock'}
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(quickViewProduct._id)}
                aria-label="Toggle wishlist"
                className={`px-4 border transition-colors cursor-pointer ${
                  wishlisted
                    ? 'bg-[#0A0A0A] text-[#9A7B56] border-[#0A0A0A]'
                    : 'border-black/20 hover:border-[#0A0A0A]'
                }`}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const slug = quickViewProduct.slug;
                setQuickViewProduct(null);
                navigate(`/product/${slug}`);
              }}
              className="w-full py-2.5 text-xs font-medium text-[#0A0A0A]/75 hover:text-[#0A0A0A] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Full Product Details &amp; 3D View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
