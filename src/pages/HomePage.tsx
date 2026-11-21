import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { SafeImage } from '../components/common/SafeImage.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';
import { HeroThreeScene } from '../components/three/HeroThreeScene.tsx';
import { useStore } from '../context/StoreContext.tsx';

const MEN_CATEGORIES = [
  { name: 'T-Shirts', img: 'https://images.unsplash.com/photo-1622445275463-afa2ab738c34?auto=format&fit=crop&w=900&q=85' },
  { name: 'Shirts', img: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85' },
  { name: 'Hoodies', img: 'https://live.staticflickr.com/7283/16709196848_bbd4ba3c56_b.jpg' },
  { name: 'Sweatshirts', img: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=85' },
  { name: 'Jeans', img: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85' },
  { name: 'Trousers', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=900&q=85' },
  { name: 'Jackets', img: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=900&q=85' },
  { name: 'Shorts', img: 'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?auto=format&fit=crop&w=900&q=85' },
];

const WOMEN_CATEGORIES = [
  { name: 'Tops', img: 'https://images.unsplash.com/photo-1598522325074-042db73aa4e6?auto=format&fit=crop&w=900&q=85' },
  { name: 'Shirts', img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85' },
  { name: 'Hoodies', img: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=900&q=85' },
  { name: 'Sweatshirts', img: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=900&q=85' },
  { name: 'Jeans', img: 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=900&q=85' },
  { name: 'Trousers', img: 'https://live.staticflickr.com/3668/11299668233_6507399548_b.jpg' },
  { name: 'Dresses', img: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85' },
  { name: 'Jackets', img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85' },
  { name: 'Co-ords', img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=900&q=85' },
];

export function HomePage() {
  const { navigate, config, products, loadingCatalog } = useStore();
  const [catGender, setCatGender] = useState<'men' | 'women'>('men');
  const [bestSellerFilter, setBestSellerFilter] = useState<'all' | 'men' | 'women'>('all');
  const [bestSellerSort, setBestSellerSort] = useState<'sales' | 'price_asc' | 'price_desc'>('sales');

  const cms = config?.cms;
  const heroImg = cms?.heroImage || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85';
  const collectionImg =
    cms?.featuredCollectionImage || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=85';
  const storyImg = cms?.brandStoryImage || 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1200&q=85';

  const newArrivals = useMemo(
    () => products.filter((p) => p.isNewArrival).slice(0, 4),
    [products]
  );

  const trendingList = useMemo(() => {
    const base = products.filter(
      (p) => (p.isBestSeller || p.salesCount > 70) && (bestSellerFilter === 'all' || p.gender === bestSellerFilter)
    );
    return [...base]
      .sort((a, b) => {
        const pa = a.salePrice ?? a.price;
        const pb = b.salePrice ?? b.price;
        if (bestSellerSort === 'price_asc') return pa - pb;
        if (bestSellerSort === 'price_desc') return pb - pa;
        return b.salesCount - a.salesCount;
      })
      .slice(0, 4);
  }, [products, bestSellerFilter, bestSellerSort]);

  const categories = catGender === 'men' ? MEN_CATEGORIES : WOMEN_CATEGORIES;

  return (
    <div className="bg-[#F5F3EF] text-[#0A0A0A]">
      {/* 1. CINEMATIC 3D + EDITORIAL HERO */}
      <section className="relative min-h-[92vh] bg-[#0A0A0A] text-[#F5F3EF] overflow-hidden flex items-center pt-16">
        {/* Background Editorial Photography with measured contrast scrim */}
        <div className="absolute inset-0">
          <SafeImage
            src={heroImg}
            alt="SOVRAN Editorial Campaign"
            loading="eager"
            className="w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]/35" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto w-full px-6 sm:px-10 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Editorial Typography */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#9A7B56] font-medium">
              Atelier Ready-to-Wear · Autumn / Winter
            </p>
            <h1 className="font-editorial text-5xl sm:text-6xl xl:text-7xl font-semibold leading-[1.02] tracking-tight text-balance">
              {cms?.heroHeadline || 'Wear Your Identity.'}
            </h1>
            <p className="text-base sm:text-lg text-[#F5F3EF]/80 max-w-xl leading-relaxed">
              {cms?.heroSubtitle ||
                'Architectural silhouettes crafted in heavyweight organic cotton, selvedge denim, and structured wool.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/shop?gender=men')}
                className="px-6 py-3.5 bg-[#F5F3EF] text-[#0A0A0A] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Shop Men
              </button>
              <button
                type="button"
                onClick={() => navigate('/shop?gender=women')}
                className="px-6 py-3.5 border border-[#F5F3EF]/40 text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:border-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Shop Women
              </button>
              <button
                type="button"
                onClick={() => navigate('/collections')}
                className="px-5 py-3.5 text-xs uppercase tracking-[0.14em] text-[#9A7B56] hover:text-white transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Explore Collection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Right Interactive 3D Couture Mannequin */}
          <div className="lg:col-span-6 h-[420px] sm:h-[520px] lg:h-[600px] w-full">
            <HeroThreeScene fallbackImage={heroImg} />
          </div>
        </div>
      </section>

      {/* 2. PROMOTIONAL BANNER */}
      <div className="bg-[#141414] text-[#F5F3EF] border-y border-white/10 py-3 px-4 text-center text-xs tracking-wide">
        <span>
          {cms?.promoBannerText ||
            'Complimentary Express Delivery Across Pakistan on Orders Above PKR 15,000 · Use SOVRAN10 for 10% Off'}
        </span>
      </div>

      {/* 3. SHOP BY CATEGORY */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56] font-medium">
              Curated Taxonomy
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold mt-1">
              Shop by Category
            </h2>
          </div>

          <div className="inline-flex border border-black/15 bg-white p-1 self-start">
            <button
              type="button"
              onClick={() => setCatGender('men')}
              className={`px-5 py-2 text-xs uppercase tracking-[0.12em] font-medium transition-colors cursor-pointer ${
                catGender === 'men' ? 'bg-[#0A0A0A] text-[#F5F3EF]' : 'text-[#0A0A0A]/70 hover:text-[#0A0A0A]'
              }`}
            >
              Men
            </button>
            <button
              type="button"
              onClick={() => setCatGender('women')}
              className={`px-5 py-2 text-xs uppercase tracking-[0.12em] font-medium transition-colors cursor-pointer ${
                catGender === 'women' ? 'bg-[#0A0A0A] text-[#F5F3EF]' : 'text-[#0A0A0A]/70 hover:text-[#0A0A0A]'
              }`}
            >
              Women
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <button
              key={`${catGender}-${cat.name}`}
              type="button"
              onClick={() =>
                navigate(`/shop?gender=${catGender}&category=${encodeURIComponent(cat.name)}`)
              }
              className="group relative aspect-[4/3] overflow-hidden bg-[#EAE5DC] text-left cursor-pointer"
            >
              <SafeImage
                src={cat.img}
                alt={`${catGender} ${cat.name}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-[#F5F3EF]">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/75 block">
                    {catGender}
                  </span>
                  <span className="font-editorial text-2xl font-medium">{cat.name}</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. NEW ARRIVALS */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-10 pb-20">
        <div className="flex items-end justify-between gap-4 mb-10 border-t border-black/10 pt-14">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56] font-medium">
              Latest Release
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold mt-1">
              New Arrivals
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/shop?newArrival=true')}
            className="text-xs uppercase tracking-[0.14em] font-semibold inline-flex items-center gap-1.5 hover:text-[#9A7B56] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingCatalog ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="space-y-3 animate-pulse">
                <div className="aspect-[3/4] bg-[#E5DFD3]" />
                <div className="h-3 w-20 bg-[#E5DFD3]" />
                <div className="h-4 w-40 bg-[#E5DFD3]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
            {newArrivals.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* 5. FEATURED COLLECTION (DARK EDITORIAL SPLIT) */}
      <section className="bg-[#0A0A0A] text-[#F5F3EF]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 min-h-[380px] lg:min-h-[560px] overflow-hidden">
            <SafeImage
              src={collectionImg}
              alt="The Everyday Collection"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-5 p-8 sm:p-14 flex flex-col justify-center space-y-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[#9A7B56]">
              Seasonal Capsule 01
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold leading-tight text-balance">
              {cms?.featuredCollectionTitle || 'THE EVERYDAY COLLECTION'}
            </h2>
            <p className="text-sm sm:text-base text-[#F5F3EF]/75 leading-relaxed">
              {cms?.featuredCollectionDescription ||
                'Engineered for quiet permanence. Heavyweight 460 GSM combed fleece, structured double-pleat wool trousers, and unwashed selvedge layers.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/shop?collection=everyday')}
                className="px-7 py-3.5 bg-[#F5F3EF] text-[#0A0A0A] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] hover:text-white transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Shop Collection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRENDING / BEST SELLERS */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56] font-medium">
              Client Favorites
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold mt-1">
              Trending &amp; Best Sellers
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex border border-black/15 bg-white p-1">
              {(['all', 'men', 'women'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setBestSellerFilter(g)}
                  className={`px-3.5 py-1.5 text-xs capitalize transition-colors cursor-pointer ${
                    bestSellerFilter === g
                      ? 'bg-[#0A0A0A] text-[#F5F3EF] font-medium'
                      : 'text-[#0A0A0A]/65 hover:text-[#0A0A0A]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <select
              aria-label="Sort best sellers"
              value={bestSellerSort}
              onChange={(e) => setBestSellerSort(e.target.value as typeof bestSellerSort)}
              className="bg-white border border-black/15 px-3 py-2 text-xs focus:outline-none"
            >
              <option value="sales">Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
          {trendingList.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>

      {/* 7. BRAND STORY */}
      <section className="border-t border-black/10 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 aspect-[4/3] overflow-hidden bg-[#EAE5DC]">
            <SafeImage
              src={storyImg}
              alt="SOVRAN Tailoring & Craftsmanship Atelier"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56] font-medium">
              Craft &amp; Provenance
            </p>
            <h2 className="font-editorial text-3xl sm:text-5xl font-semibold leading-tight text-balance">
              {cms?.brandStoryTitle || 'Built in Small Batches. Tailored for Longevity.'}
            </h2>
            <p className="text-sm sm:text-base text-[#0A0A0A]/75 leading-relaxed max-w-xl">
              {cms?.brandStoryBody ||
                'Every SOVRAN garment begins with raw mill-woven textiles, double-needle seam construction, and architectural pattern grading designed to hold its silhouette season after season.'}
            </p>
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-black/10 max-w-lg">
              <div>
                <span className="font-mono text-lg font-semibold block">480 GSM</span>
                <span className="text-xs text-[#0A0A0A]/60">Combed Fleece</span>
              </div>
              <div>
                <span className="font-mono text-lg font-semibold block">14 oz</span>
                <span className="text-xs text-[#0A0A0A]/60">Raw Denim</span>
              </div>
              <div>
                <span className="font-mono text-lg font-semibold block">14 Days</span>
                <span className="text-xs text-[#0A0A0A]/60">Easy Exchanges</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="px-6 py-3 border border-[#0A0A0A] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#0A0A0A] hover:text-[#F5F3EF] transition-colors cursor-pointer"
              >
                Read Our Story
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. LOOKBOOK / SOCIAL GALLERY */}
      <section className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56] font-medium">
              @sovran.atelier
            </p>
            <h2 className="font-editorial text-3xl font-semibold mt-1">
              Styled in Motion
            </h2>
          </div>
          <a
            href={config?.socialLinks?.instagram || 'https://instagram.com'}
            target="_blank"
            rel="noreferrer"
            className="text-xs uppercase tracking-[0.14em] font-semibold hover:text-[#9A7B56] transition-colors"
          >
            Follow Instagram
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85',
              slug: 'denim-jacket',
              label: 'Raw Indigo Layering',
            },
            {
              img: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=900&q=85',
              slug: 'matching-co-ord-set',
              label: 'Oatmeal Linen Set',
            },
            {
              img: 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=900&q=85',
              slug: 'heavyweight-hoodie',
              label: '480 GSM Fleece',
            },
            {
              img: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?auto=format&fit=crop&w=900&q=85',
              slug: 'wide-leg-trousers',
              label: 'Pleated Wool Drape',
            },
          ].map((tile) => (
            <button
              key={tile.slug}
              type="button"
              onClick={() => navigate(`/product/${tile.slug}`)}
              className="group relative aspect-[3/4] overflow-hidden bg-[#EAE5DC] text-left cursor-pointer"
            >
              <SafeImage
                src={tile.img}
                alt={tile.label}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-end p-4">
                <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Shop {tile.label} →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
