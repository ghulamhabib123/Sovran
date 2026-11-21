import { SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ProductCard } from '../components/product/ProductCard.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { Product } from '../types/store.ts';
import { formatPKR } from '../utils/format.ts';

interface Facets {
  categories: string[];
  collections: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  minPrice: number;
  maxPrice: number;
}

export function ShopPage() {
  const { route, navigate, products, loadingCatalog } = useStore();
  const [items, setItems] = useState<Product[]>([]);
  const [facets, setFacets] = useState<Facets>({
    categories: [],
    collections: [],
    sizes: [],
    colors: [],
    minPrice: 0,
    maxPrice: 30000,
  });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const params = new URLSearchParams(route.includes('?') ? route.split('?')[1] : '');
  const [q, setQ] = useState(params.get('q') || '');
  const [gender, setGender] = useState(params.get('gender') || 'all');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [collection, setCollection] = useState(params.get('collection') || 'all');
  const [size, setSize] = useState(params.get('size') || '');
  const [color, setColor] = useState(params.get('color') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const [inStock, setInStock] = useState(params.get('inStock') === 'true');
  const [newArrival, setNewArrival] = useState(params.get('newArrival') === 'true');
  const [sale, setSale] = useState(params.get('sale') === 'true');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [page, setPage] = useState(Number(params.get('page') || 1));

  // Sync URL query changes (e.g. clicking Men / Women / Sale from Navbar)
  useEffect(() => {
    const p = new URLSearchParams(route.includes('?') ? route.split('?')[1] : '');
    setQ(p.get('q') || '');
    setGender(p.get('gender') || 'all');
    setCategory(p.get('category') || 'all');
    setCollection(p.get('collection') || 'all');
    setSize(p.get('size') || '');
    setColor(p.get('color') || '');
    setMaxPrice(p.get('maxPrice') || '');
    setInStock(p.get('inStock') === 'true');
    setNewArrival(p.get('newArrival') === 'true');
    setSale(p.get('sale') === 'true');
    setSort(p.get('sort') || 'newest');
    setPage(Number(p.get('page') || 1));
  }, [route]);

  const fetchCatalog = useCallback(() => {
    setLoading(loadingCatalog);

    const qLower = q.trim().toLowerCase();
    const gLower = gender.toLowerCase();
    const catLower = category.toLowerCase();
    const colLower = collection.toLowerCase();
    const sizeLower = size.toLowerCase();
    const colorLower = color.toLowerCase();
    const maxP = maxPrice ? Number(maxPrice) : null;

    const filtered = products.filter((p) => {
      const effectivePrice = p.salePrice ?? p.price;
      if (qLower) {
        const hay = `${p.name} ${p.description} ${p.category} ${p.gender} ${p.sku}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      if (gLower && gLower !== 'all' && p.gender.toLowerCase() !== gLower) return false;
      if (catLower && catLower !== 'all' && p.category.toLowerCase() !== catLower) return false;
      if (colLower && colLower !== 'all' && p.collectionSlug.toLowerCase() !== colLower) return false;
      if (sizeLower && !p.variants.some((v) => v.size.toLowerCase() === sizeLower && v.stock > 0)) return false;
      if (colorLower && !p.variants.some((v) => v.colorName.toLowerCase() === colorLower)) return false;
      if (maxP !== null && !Number.isNaN(maxP) && effectivePrice > maxP) return false;
      if (inStock && !p.variants.some((v) => v.stock > 0)) return false;
      if (newArrival && !p.isNewArrival) return false;
      if (sale && !(p.salePrice !== null && p.salePrice < p.price)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;
      switch (sort) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'bestselling':
        case 'popularity':
          return b.salesCount - a.salesCount;
        case 'rating':
          return b.ratingAvg - a.ratingAvg;
        case 'newest':
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    const limit = 12;
    const totalCount = filtered.length;
    const pages = Math.max(1, Math.ceil(totalCount / limit));
    const offset = (page - 1) * limit;

    const categories = Array.from(new Set(products.map((p) => p.category))).sort();
    const collections = Array.from(new Set(products.map((p) => p.collectionSlug))).sort();
    const sizes = Array.from(new Set(products.flatMap((p) => p.variants.map((v) => v.size))));
    const colorsMap = new Map<string, string>();
    for (const p of products) {
      for (const v of p.variants) {
        if (!colorsMap.has(v.colorName)) {
          colorsMap.set(v.colorName, v.colorHex);
        }
      }
    }
    const prices = products.map((p) => p.salePrice ?? p.price);

    setItems(filtered.slice(offset, offset + limit));
    setTotal(totalCount);
    setTotalPages(pages);
    setFacets({
      categories,
      collections,
      sizes,
      colors: Array.from(colorsMap.entries()).map(([name, hex]) => ({ name, hex })),
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 50000,
    });
    setLoading(loadingCatalog);
  }, [products, loadingCatalog, q, gender, category, collection, size, color, maxPrice, inStock, newArrival, sale, sort, page]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const clearAllFilters = () => {
    setQ('');
    setGender('all');
    setCategory('all');
    setCollection('all');
    setSize('');
    setColor('');
    setMaxPrice('');
    setInStock(false);
    setNewArrival(false);
    setSale(false);
    setSort('newest');
    setPage(1);
    navigate('/shop');
  };

  const FilterPanel = (
    <div className="space-y-6 text-sm">
      {/* Search */}
      <div>
        <label className="text-xs uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/70 block mb-2">
          Search
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Keyword, SKU, fabric..."
          className="w-full bg-white border border-black/15 px-3 py-2 text-xs focus:outline-none focus:border-[#0A0A0A]"
        />
      </div>

      {/* Gender */}
      <div>
        <span className="text-xs uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/70 block mb-2">
          Department
        </span>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'men', 'women'].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGender(g);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs capitalize border cursor-pointer ${
                gender === g
                  ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                  : 'bg-white border-black/15 hover:border-[#0A0A0A]'
              }`}
            >
              {g === 'all' ? 'All' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <span className="text-xs uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/70 block mb-2">
          Category
        </span>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setPage(1);
            }}
            className={`text-left text-xs py-1 cursor-pointer ${
              category === 'all' ? 'font-semibold text-[#0A0A0A]' : 'text-[#0A0A0A]/65 hover:text-[#0A0A0A]'
            }`}
          >
            All Categories
          </button>
          {facets.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={`text-left text-xs py-1 cursor-pointer ${
                category.toLowerCase() === cat.toLowerCase()
                  ? 'font-semibold text-[#9A7B56]'
                  : 'text-[#0A0A0A]/65 hover:text-[#0A0A0A]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Collection */}
      <div>
        <span className="text-xs uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/70 block mb-2">
          Collection
        </span>
        <select
          value={collection}
          onChange={(e) => {
            setCollection(e.target.value);
            setPage(1);
          }}
          className="w-full bg-white border border-black/15 px-3 py-2 text-xs capitalize focus:outline-none"
        >
          <option value="all">All Collections</option>
          {facets.collections.map((c) => (
            <option key={c} value={c}>
              {c.replace(/-/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Size */}
      <div>
        <span className="text-xs uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/70 block mb-2">
          Size
        </span>
        <div className="flex flex-wrap gap-1.5">
          {facets.sizes.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => {
                setSize(size === sz ? '' : sz);
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs border cursor-pointer ${
                size === sz
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white border-black/15 hover:border-[#0A0A0A]'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <span className="text-xs uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/70 block mb-2">
          Color
        </span>
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={() => {
                setColor(color === c.name ? '' : c.name);
                setPage(1);
              }}
              className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                color === c.name ? 'border-[#9A7B56] scale-110' : 'border-black/20'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Max Price */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/70">
            Max Price
          </span>
          <span className="font-mono tabular-nums">
            {maxPrice ? formatPKR(Number(maxPrice)) : 'Any'}
          </span>
        </div>
        <input
          type="range"
          min={4000}
          max={Math.max(25000, facets.maxPrice)}
          step={500}
          value={maxPrice || Math.max(25000, facets.maxPrice)}
          onChange={(e) => {
            setMaxPrice(e.target.value);
            setPage(1);
          }}
          className="w-full accent-[#0A0A0A]"
        />
      </div>

      {/* Availability & Flags */}
      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => {
              setInStock(e.target.checked);
              setPage(1);
            }}
            className="accent-[#0A0A0A]"
          />
          <span>In Stock Only</span>
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={newArrival}
            onChange={(e) => {
              setNewArrival(e.target.checked);
              setPage(1);
            }}
            className="accent-[#0A0A0A]"
          />
          <span>New Arrivals</span>
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={sale}
            onChange={(e) => {
              setSale(e.target.checked);
              setPage(1);
            }}
            className="accent-[#0A0A0A]"
          />
          <span>On Sale</span>
        </label>
      </div>

      <button
        type="button"
        onClick={clearAllFilters}
        className="w-full py-2.5 border border-black/20 text-xs uppercase tracking-[0.12em] hover:bg-[#0A0A0A] hover:text-white transition-colors cursor-pointer"
      >
        Reset All Filters
      </button>
    </div>
  );

  return (
    <div className="pt-24 pb-20 max-w-[1440px] mx-auto px-6 sm:px-10">
      {/* Header */}
      <div className="pb-8 border-b border-black/10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56] font-medium">
            SOVRAN Catalog
          </p>
          <h1 className="font-editorial text-4xl sm:text-5xl font-semibold mt-1 capitalize">
            {sale
              ? 'Seasonal Archive Sale'
              : newArrival
              ? 'New Arrivals'
              : gender !== 'all'
              ? `${gender}'s Wardrobe`
              : 'All Garments'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden px-4 py-2 border border-black/20 bg-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <span className="text-xs font-mono tabular-nums text-[#0A0A0A]/60">
            {total} {total === 1 ? 'Piece' : 'Pieces'}
          </span>

          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-black/15 px-3 py-2 text-xs focus:outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popularity">Popularity</option>
            <option value="bestselling">Best Selling</option>
            <option value="rating">Customer Rating</option>
          </select>
        </div>
      </div>

      {/* Main Layout */}
      <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="hidden lg:block lg:col-span-3 pr-4 border-r border-black/10">
          {FilterPanel}
        </aside>

        <div className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="aspect-[3/4] bg-[#E5DFD3]" />
                  <div className="h-3 w-24 bg-[#E5DFD3]" />
                  <div className="h-4 w-44 bg-[#E5DFD3]" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center bg-white border border-black/10 p-8">
              <p className="font-editorial text-3xl mb-2">No Garments Found</p>
              <p className="text-sm text-[#0A0A0A]/65 mb-6">
                Try adjusting your selected size, color, or price filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 sm:gap-7">
                {items.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPage(pg)}
                      className={`w-9 h-9 font-mono text-xs border cursor-pointer ${
                        page === pg
                          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                          : 'bg-white border-black/15 hover:border-[#0A0A0A]'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/55"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <aside className="relative z-10 w-80 max-w-[85vw] bg-[#F5F3EF] h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-black/10 mb-5">
              <span className="font-editorial text-2xl font-semibold">Filters</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {FilterPanel}
          </aside>
        </div>
      )}
    </div>
  );
}
