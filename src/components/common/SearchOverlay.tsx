import { ArrowRight, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { formatPKR, getEffectivePrice } from '../../utils/format.ts';
import { SafeImage } from '../common/SafeImage.tsx';

export function SearchOverlay() {
  const { isSearchOpen, setIsSearchOpen, products, navigate } = useStore();
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 4);
    return products
      .filter((p) =>
        `${p.name} ${p.category} ${p.gender} ${p.description}`.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [products, query]);

  if (!isSearchOpen) return null;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchOpen(false);
    navigate(query.trim() ? `/shop?q=${encodeURIComponent(query.trim())}` : '/shop');
  };

  return (
    <div className="fixed inset-0 z-[85] flex flex-col">
      <div
        className="fixed inset-0 bg-black/55"
        onClick={() => setIsSearchOpen(false)}
      />
      <div className="relative z-10 bg-[#F5F3EF] text-[#0A0A0A] border-b border-black/15 shadow-xl">
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          <form onSubmit={submitSearch} className="flex items-center gap-4 border-b border-black/20 pb-3">
            <Search className="w-5 h-5 text-[#0A0A0A]/55" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hoodies, Oxford shirts, cargo trousers, denim..."
              className="flex-1 bg-transparent text-lg sm:text-xl font-editorial focus:outline-none placeholder:text-[#0A0A0A]/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-[#0A0A0A]/55 hover:text-[#0A0A0A]"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
              className="p-2 hover:opacity-65 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </form>

          {/* Suggestions */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-[0.14em] text-[#0A0A0A]/55">
                {query ? `Suggestions (${suggestions.length})` : 'Curated Highlights'}
              </span>
              <button
                type="button"
                onClick={submitSearch}
                className="text-xs font-medium flex items-center gap-1 hover:text-[#9A7B56] cursor-pointer"
              >
                <span>View All Results</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-sm text-[#0A0A0A]/60 py-6">
                No garments matched &ldquo;{query}&rdquo;. Try searching for Hoodies, Jeans, Shirts, or Co-ords.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {suggestions.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      navigate(`/product/${p.slug}`);
                    }}
                    className="text-left group cursor-pointer"
                  >
                    <div className="aspect-[3/4] bg-[#EAE5DC] overflow-hidden mb-2">
                      <SafeImage
                        src={p.images[0]?.url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-xs font-semibold line-clamp-1 group-hover:text-[#9A7B56]">
                      {p.name}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#0A0A0A]/70 mt-0.5">
                      {formatPKR(getEffectivePrice(p.price, p.salePrice))}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
