import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { SafeImage } from '../components/common/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatPKR, getEffectivePrice } from '../utils/format.ts';

export function WishlistPage() {
  const { wishlistIds, products, toggleWishlist, addToCart, navigate } = useStore();

  const savedProducts = wishlistIds
    .map((id) => products.find((p) => p._id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (savedProducts.length === 0) {
    return (
      <div className="pt-32 pb-24 max-w-xl mx-auto px-6 text-center">
        <Heart className="w-12 h-12 mx-auto text-[#0A0A0A]/30 mb-4 stroke-[1.25]" />
        <h1 className="font-editorial text-4xl font-semibold">Your Wishlist is Empty</h1>
        <p className="text-sm text-[#0A0A0A]/65 mt-2 mb-8">
          Save pieces you admire to revisit sizes, fabrics, and colors whenever you are ready.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-8 py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-medium hover:bg-[#9A7B56] transition-colors cursor-pointer"
        >
          Discover Collection
        </button>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 max-w-[1440px] mx-auto px-6 sm:px-10">
      <div className="pb-6 border-b border-black/10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Saved Pieces</p>
          <h1 className="font-editorial text-4xl font-semibold mt-1">
            Wishlist ({savedProducts.length})
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="text-xs uppercase tracking-[0.12em] underline underline-offset-4 hover:text-[#9A7B56] cursor-pointer"
        >
          Browse More
        </button>
      </div>

      <div className="pt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {savedProducts.map((product) => {
          const firstAvailable = product.variants.find((v) => v.stock > 0);
          const price = getEffectivePrice(product.price, product.salePrice);

          return (
            <div key={product._id} className="bg-white border border-black/10 flex flex-col">
              <button
                type="button"
                onClick={() => navigate(`/product/${product.slug}`)}
                className="aspect-[3/4] bg-[#EAE5DC] overflow-hidden cursor-pointer"
              >
                <SafeImage
                  src={product.images[0]?.url}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </button>

              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#0A0A0A]/55">
                    {product.gender} · {product.category}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/product/${product.slug}`)}
                    className="text-left text-sm font-semibold mt-0.5 hover:text-[#9A7B56] cursor-pointer"
                  >
                    {product.name}
                  </button>
                  <p className="font-mono text-sm tabular-nums mt-1">{formatPKR(price)}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={!firstAvailable}
                    onClick={() => {
                      if (firstAvailable) {
                        addToCart(product, firstAvailable, 1, true);
                        toggleWishlist(product._id);
                      }
                    }}
                    className="flex-1 py-2.5 px-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs font-medium hover:bg-[#9A7B56] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{firstAvailable ? `Move (${firstAvailable.size})` : 'Sold Out'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product._id)}
                    aria-label="Remove from wishlist"
                    className="p-2.5 border border-black/15 hover:border-red-700 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
