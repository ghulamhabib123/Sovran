import { Eye, Heart, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { Product } from '../../types/store.ts';
import { formatPKR, getDiscountPercent, getEffectivePrice } from '../../utils/format.ts';
import { SafeImage } from '../common/SafeImage.tsx';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useStore();
  const [hovered, setHovered] = useState(false);

  const wishlisted = isInWishlist(product._id);
  const discount = getDiscountPercent(product.price, product.salePrice);
  const effectivePrice = getEffectivePrice(product.price, product.salePrice);

  const primaryImage = product.images[0]?.url;
  const secondaryImage = product.images[1]?.url || primaryImage;

  const uniqueColors = Array.from(
    new Map(product.variants.map((v) => [v.colorName, v.colorHex])).entries()
  );

  const firstInStockVariant = product.variants.find((v) => v.stock > 0) || product.variants[0];
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

  const statusTag = discount > 0 ? `Sale -${discount}%` : product.isNewArrival ? 'New Arrival' : null;

  return (
    <article
      className="group flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Frame */}
      <div className="relative aspect-[3/4] w-full bg-[#EAE5DC] overflow-hidden">
        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="w-full h-full block cursor-pointer"
          aria-label={`View ${product.name}`}
        >
          <SafeImage
            src={hovered && secondaryImage ? secondaryImage : primaryImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </button>

        {/* Single clean corner tag (zero pill stacks) */}
        {statusTag && (
          <span className="absolute top-3 left-3 bg-[#0A0A0A]/88 text-[#F5F3EF] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-medium pointer-events-none">
            {statusTag}
          </span>
        )}

        {/* Wishlist Heart */}
        <button
          type="button"
          onClick={() => toggleWishlist(product._id)}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`absolute top-3 right-3 p-2 transition-colors cursor-pointer ${
            wishlisted
              ? 'bg-[#0A0A0A] text-[#9A7B56]'
              : 'bg-white/85 text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Quick Actions */}
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <button
            type="button"
            disabled={totalStock <= 0 || !firstInStockVariant}
            onClick={() => {
              if (firstInStockVariant) {
                addToCart(product, firstInStockVariant, 1, true);
              }
            }}
            className="flex-1 py-2.5 px-3 bg-[#0A0A0A] text-[#F5F3EF] hover:bg-[#9A7B56] transition-colors text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{totalStock > 0 ? 'Quick Add' : 'Sold Out'}</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickViewProduct(product)}
            aria-label={`Quick view ${product.name}`}
            className="p-2.5 bg-white text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Metadata (unboxed typography) */}
      <div className="pt-3.5 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-[#0A0A0A]/55">
          <span>
            {product.gender} · {product.category}
          </span>
          {totalStock <= 0 && <span className="text-red-700 font-medium">Out of Stock</span>}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="text-left text-[15px] font-semibold text-[#0A0A0A] hover:text-[#9A7B56] transition-colors line-clamp-1 cursor-pointer"
        >
          {product.name}
        </button>

        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2 font-mono text-sm tabular-nums">
            <span className="font-medium text-[#0A0A0A]">{formatPKR(effectivePrice)}</span>
            {discount > 0 && (
              <span className="text-xs text-[#0A0A0A]/45 line-through">
                {formatPKR(product.price)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5" aria-label="Available colors">
            {uniqueColors.slice(0, 4).map(([name, hex]) => (
              <span
                key={name}
                title={name}
                className="w-3 h-3 rounded-full border border-black/20 inline-block"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
