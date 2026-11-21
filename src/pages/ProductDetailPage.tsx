import { Box, Check, Heart, Minus, Plus, Ruler, ShieldCheck, Star, Truck } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { SafeImage } from '../components/common/SafeImage.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';
import { ProductThreeViewer } from '../components/three/ProductThreeViewer.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { firestoreService } from '../services/firestoreService.ts';
import { Product, Review } from '../types/store.ts';
import { formatPKR, getDiscountPercent, getEffectivePrice } from '../utils/format.ts';

interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const {
    navigate,
    products,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setIsSizeGuideOpen,
    recentlyViewedIds,
    markViewed,
    user,
    signInWithGoogle,
    showToast,
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'gallery' | '3d'>('gallery');
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50, active: false });

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review form state
  const [revName, setRevName] = useState(user?.name || '');
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await firestoreService.getProductDetail(slug);
        if (!active) return;
        if (!res) {
          setProduct(null);
          return;
        }
        setProduct(res.product);
        setRelated(res.related || []);
        setReviews(res.reviews || []);
        setActiveImageIdx(0);
        setViewMode('gallery');
        setQuantity(1);
        markViewed(res.product._id);

        const defaultColor = res.product.variants[0]?.colorName || '';
        setSelectedColor(defaultColor);
        setSelectedSize('');
      } catch {
        if (active) setProduct(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, markViewed]);

  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => products.find((p) => p._id === id))
        .filter((p): p is Product => Boolean(p && p._id !== product?._id))
        .slice(0, 4),
    [recentlyViewedIds, products, product]
  );

  if (loading) {
    return (
      <div className="pt-28 pb-20 max-w-[1440px] mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
        <div className="lg:col-span-7 aspect-[3/4] bg-[#E5DFD3]" />
        <div className="lg:col-span-5 space-y-4">
          <div className="h-4 w-32 bg-[#E5DFD3]" />
          <div className="h-10 w-72 bg-[#E5DFD3]" />
          <div className="h-6 w-40 bg-[#E5DFD3]" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-24 max-w-xl mx-auto text-center px-6">
        <h1 className="font-editorial text-4xl font-semibold">Piece Not Found</h1>
        <p className="text-sm text-[#0A0A0A]/65 mt-2 mb-6">
          This garment may have been archived or moved to a new seasonal capsule.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em]"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const colors = Array.from(
    new Map(product.variants.map((v) => [v.colorName, v.colorHex])).entries()
  );
  const selectedColorHex =
    colors.find(([name]) => name === selectedColor)?.[1] || colors[0]?.[1] || '#1A1A1A';

  const sizesForColor = product.variants.filter((v) => v.colorName === selectedColor);
  const activeVariant = product.variants.find(
    (v) => v.colorName === selectedColor && v.size === selectedSize
  );

  const effectivePrice = getEffectivePrice(product.price, product.salePrice);
  const discount = getDiscountPercent(product.price, product.salePrice);
  const wishlisted = isInWishlist(product._id);

  const validateSelectionAndGetVariant = () => {
    if (!selectedColor) {
      showToast('Please select a color first.', 'error');
      return null;
    }
    if (!selectedSize) {
      showToast('Please select your size before adding to bag.', 'error');
      return null;
    }
    if (!activeVariant || activeVariant.stock <= 0) {
      showToast(`Size ${selectedSize} in ${selectedColor} is currently out of stock.`, 'error');
      return null;
    }
    return activeVariant;
  };

  const handleAddToCart = () => {
    const v = validateSelectionAndGetVariant();
    if (!v) return;
    addToCart(product, v, quantity, true);
  };

  const handleBuyNow = () => {
    const v = validateSelectionAndGetVariant();
    if (!v) return;
    addToCart(product, v, quantity, false);
    navigate('/checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const logged = await signInWithGoogle();
      if (!logged) return;
    }
    setSubmittingRev(true);
    try {
      const updatedReviews = await firestoreService.addProductReview(product._id, {
        authorName: revName || user?.name || 'Verified Client',
        rating: revRating,
        title: revTitle,
        comment: revComment,
      });
      setReviews(updatedReviews);
      setRevTitle('');
      setRevComment('');
      showToast('Thank you for sharing your review.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmittingRev(false);
    }
  };

  return (
    <div className="pt-24 pb-20 max-w-[1440px] mx-auto px-6 sm:px-10">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-[#0A0A0A]/60 flex items-center gap-2 pb-6">
        <button type="button" onClick={() => navigate('/')} className="hover:text-[#0A0A0A] cursor-pointer">
          Home
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => navigate(`/shop?gender=${product.gender}`)}
          className="capitalize hover:text-[#0A0A0A] cursor-pointer"
        >
          {product.gender}
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() =>
            navigate(`/shop?gender=${product.gender}&category=${encodeURIComponent(product.category)}`)
          }
          className="hover:text-[#0A0A0A] cursor-pointer"
        >
          {product.category}
        </button>
        <span>/</span>
        <span className="text-[#0A0A0A] font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Split: Gallery / 3D Viewer Left + Sticky Purchase Panel Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Media Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex border border-black/15 bg-white p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className={`px-3.5 py-1.5 font-medium cursor-pointer ${
                  viewMode === 'gallery' ? 'bg-[#0A0A0A] text-[#F5F3EF]' : 'text-[#0A0A0A]/70'
                }`}
              >
                Editorial Gallery
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`px-3.5 py-1.5 font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === '3d' ? 'bg-[#0A0A0A] text-[#F5F3EF]' : 'text-[#0A0A0A]/70'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Interactive 3D Fit</span>
              </button>
            </div>
            <span className="font-mono text-xs text-[#0A0A0A]/50">SKU: {activeVariant?.sku || product.sku}</span>
          </div>

          <div className="relative aspect-[3/4] w-full bg-[#EAE5DC] overflow-hidden">
            {viewMode === '3d' ? (
              <ProductThreeViewer
                silhouetteType={product.silhouetteType}
                colorHex={selectedColorHex}
                colorName={selectedColor}
                productName={product.name}
              />
            ) : (
              <div
                className="w-full h-full relative overflow-hidden cursor-zoom-in"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setZoomOrigin({ x, y, active: true });
                }}
                onMouseLeave={() => setZoomOrigin((z) => ({ ...z, active: false }))}
              >
                <SafeImage
                  src={product.images[activeImageIdx]?.url || product.images[0]?.url}
                  alt={product.name}
                  loading="eager"
                  className="w-full h-full object-cover transition-transform duration-200"
                />
                {zoomOrigin.active && (
                  <div
                    className="hidden lg:block absolute inset-0 pointer-events-none bg-no-repeat"
                    style={{
                      backgroundImage: `url(${product.images[activeImageIdx]?.url || product.images[0]?.url})`,
                      backgroundPosition: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                      backgroundSize: '175%',
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && viewMode === 'gallery' && (
            <div className="grid grid-cols-5 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={`${img.url}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[3/4] overflow-hidden border-2 cursor-pointer ${
                    activeImageIdx === idx ? 'border-[#0A0A0A]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img.url} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Sticky Purchase Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 bg-white p-6 sm:p-8 border border-black/10">
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[#0A0A0A]/55">
              <span>
                {product.gender} · {product.category}
              </span>
              <span className="flex items-center gap-1 text-[#0A0A0A]">
                <Star className="w-3.5 h-3.5 fill-[#9A7B56] text-[#9A7B56]" />
                <span className="font-mono tabular-nums">{product.ratingAvg.toFixed(1)}</span>
                <span className="text-[#0A0A0A]/50">({reviews.length})</span>
              </span>
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold mt-1.5">
              {product.name}
            </h1>

            <div className="mt-3 flex items-baseline gap-3 font-mono tabular-nums">
              <span className="text-2xl font-semibold">{formatPKR(effectivePrice)}</span>
              {discount > 0 && (
                <>
                  <span className="text-base text-[#0A0A0A]/45 line-through">
                    {formatPKR(product.price)}
                  </span>
                  <span className="text-xs text-[#9A7B56] font-semibold">-{discount}%</span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-[#0A0A0A]/75 leading-relaxed">{product.description}</p>

          {/* Color Picker */}
          <div className="pt-2">
            <span className="text-xs font-medium text-[#0A0A0A]/75">
              Color: <strong className="text-[#0A0A0A]">{selectedColor}</strong>
            </span>
            <div className="flex items-center gap-3 mt-2.5">
              {colors.map(([name, hex]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setSelectedColor(name);
                    setSelectedSize('');
                  }}
                  aria-label={`Color ${name}`}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                    selectedColor === name ? 'border-[#0A0A0A] scale-110' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-[#0A0A0A]/75">
                Select Size{' '}
                {!selectedSize && <span className="text-[#9A7B56]">(Required)</span>}
              </span>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-[#9A7B56] cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {sizesForColor.map((v) => {
                const out = v.stock <= 0;
                const active = selectedSize === v.size;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={out}
                    onClick={() => {
                      setSelectedSize(v.size);
                      setQuantity(1);
                    }}
                    className={`py-2.5 text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                        : 'border-black/20 hover:border-[#0A0A0A]'
                    } disabled:opacity-35 disabled:line-through disabled:cursor-not-allowed`}
                  >
                    {v.size}
                  </button>
                );
              })}
            </div>

            {selectedSize && activeVariant && (
              <p className="mt-2 text-xs font-mono text-[#0A0A0A]/70">
                {activeVariant.stock > 0
                  ? activeVariant.stock <= 4
                    ? `Low stock: only ${activeVariant.stock} units remaining in ${selectedSize}`
                    : `In stock (${activeVariant.stock} ready to dispatch)`
                  : `Size ${selectedSize} is out of stock`}
              </p>
            )}
          </div>

          {/* Quantity & Primary Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-black/20 h-12">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="px-3.5 h-full hover:bg-black/5 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 font-mono text-sm tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) =>
                      activeVariant ? Math.min(activeVariant.stock, q + 1) : q + 1
                    )
                  }
                  aria-label="Increase quantity"
                  className="px-3.5 h-full hover:bg-black/5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 h-12 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors cursor-pointer"
              >
                Add to Shopping Bag
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product._id)}
                aria-label="Save to wishlist"
                className={`h-12 w-12 border flex items-center justify-center transition-colors cursor-pointer ${
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
              onClick={handleBuyNow}
              className="w-full h-12 border border-[#0A0A0A] text-[#0A0A0A] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#0A0A0A] hover:text-white transition-colors cursor-pointer"
            >
              Buy Now
            </button>
          </div>

          {/* Fabric, Specs & Delivery Info */}
          <div className="pt-4 border-t border-black/10 space-y-4 text-xs text-[#0A0A0A]/75">
            {product.fabricDetails && (
              <div>
                <h3 className="font-semibold text-[#0A0A0A] uppercase tracking-[0.12em] mb-1">
                  Material &amp; Fabric
                </h3>
                <p>{product.fabricDetails}</p>
              </div>
            )}

            {product.specifications?.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#0A0A0A] uppercase tracking-[0.12em] mb-1.5">
                  Tailoring Specifications
                </h3>
                <ul className="grid grid-cols-2 gap-1.5">
                  {product.specifications.map((spec) => (
                    <li key={spec} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#9A7B56] shrink-0" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-black/10 space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#9A7B56]" />
                <span>Estimated Delivery: 2–5 business days across Pakistan (Free above PKR 15,000)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9A7B56]" />
                <span>14-day unworn exchange &amp; return guarantee with original tags</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <section className="mt-20 pt-14 border-t border-black/10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Client Feedback</p>
            <h2 className="font-editorial text-3xl font-semibold mt-1">
              Reviews ({reviews.length})
            </h2>
          </div>

          <form onSubmit={handleReviewSubmit} className="bg-white border border-black/10 p-6 space-y-4">
            <h3 className="text-sm font-semibold">Write a Review</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                placeholder="Your Name"
                className="border border-black/15 px-3 py-2 text-xs focus:outline-none focus:border-[#0A0A0A]"
              />
              <select
                value={revRating}
                onChange={(e) => setRevRating(Number(e.target.value))}
                className="border border-black/15 px-3 py-2 text-xs focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} Stars
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={revTitle}
              onChange={(e) => setRevTitle(e.target.value)}
              placeholder="Headline (e.g. Tailored drape)"
              className="w-full border border-black/15 px-3 py-2 text-xs focus:outline-none focus:border-[#0A0A0A]"
            />
            <textarea
              required
              rows={3}
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="Share fit, fabric weight, and finish impressions..."
              className="w-full border border-black/15 px-3 py-2 text-xs focus:outline-none focus:border-[#0A0A0A]"
            />
            <button
              type="submit"
              disabled={submittingRev}
              className="px-5 py-2.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] font-medium hover:bg-[#9A7B56] transition-colors cursor-pointer"
            >
              {submittingRev ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-[#0A0A0A]/60 py-6">
              No reviews yet for this garment. Share the first impression.
            </p>
          ) : (
            reviews.map((r) => (
              <div key={r._id} className="bg-white border border-black/10 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.authorName}</span>
                    {r.verifiedPurchase && (
                      <span className="text-[11px] text-[#9A7B56] font-medium">· Verified</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-[#9A7B56] text-[#9A7B56]" />
                    ))}
                  </div>
                </div>
                {r.title && <p className="text-sm font-medium">{r.title}</p>}
                <p className="text-sm text-[#0A0A0A]/75 leading-relaxed">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20 pt-14 border-t border-black/10">
          <h2 className="font-editorial text-3xl font-semibold mb-8">Complement Your Look</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      {recentlyViewedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-black/10">
          <h2 className="font-editorial text-2xl font-semibold mb-6">Recently Viewed</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
            {recentlyViewedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
