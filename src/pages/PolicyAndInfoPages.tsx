import { ArrowRight } from 'lucide-react';
import { SafeImage } from '../components/common/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';

export function CollectionsPage() {
  const { navigate } = useStore();
  const collections = [
    {
      slug: 'everyday',
      title: 'THE EVERYDAY COLLECTION',
      subtitle: '480 GSM Heavyweight Cotton & Architectural Essentials',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85',
    },
    {
      slug: 'atelier-denim',
      title: 'ATELIER DENIM',
      subtitle: '14 oz Raw Indigo & Carbon Washed Cuts',
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=85',
    },
    {
      slug: 'monolith',
      title: 'MONOLITH TAILORING',
      subtitle: 'Pleated Wool Trousers, Utility Cargo & Draped Silhouettes',
      image: 'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=1200&q=85',
    },
  ];

  return (
    <div className="pt-28 pb-24 max-w-[1440px] mx-auto px-6 sm:px-10 space-y-12">
      <div className="pb-6 border-b border-black/10">
        <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Seasonal Capsules</p>
        <h1 className="font-editorial text-4xl sm:text-5xl font-semibold mt-1">Collections</h1>
      </div>

      <div className="space-y-12">
        {collections.map((c, idx) => (
          <div
            key={c.slug}
            className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-black/10 items-stretch"
          >
            <div className={`lg:col-span-7 aspect-[16/10] bg-[#EAE5DC] overflow-hidden ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
              <SafeImage src={c.image} alt={c.title} className="w-full h-full object-cover" />
            </div>
            <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-center space-y-4">
              <span className="font-mono text-xs text-[#9A7B56]">0{idx + 1}.</span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold">{c.title}</h2>
              <p className="text-sm text-[#0A0A0A]/75 leading-relaxed">{c.subtitle}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/shop?collection=${c.slug}`)}
                  className="px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold inline-flex items-center gap-2 hover:bg-[#9A7B56] transition-colors cursor-pointer"
                >
                  <span>Shop Capsule</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AboutPage() {
  const { config, navigate } = useStore();
  return (
    <div className="pt-28 pb-24 max-w-[1280px] mx-auto px-6 sm:px-10 space-y-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Brand Story</p>
          <h1 className="font-editorial text-4xl sm:text-6xl font-semibold leading-tight">
            {config?.cms?.brandStoryTitle || 'Built in Small Batches. Tailored for Longevity.'}
          </h1>
          <p className="text-base text-[#0A0A0A]/75 leading-relaxed">
            {config?.cms?.brandStoryBody ||
              'Every SOVRAN garment begins with raw mill-woven textiles, double-needle seam construction, and architectural pattern grading designed to hold its silhouette season after season.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-7 py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold cursor-pointer"
          >
            Explore Catalog
          </button>
        </div>
        <div className="lg:col-span-6 aspect-[4/3] bg-[#EAE5DC] overflow-hidden">
          <SafeImage
            src={config?.cms?.brandStoryImage || 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1200&q=85'}
            alt="SOVRAN Atelier Craftsmanship"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export function PoliciesPage() {
  const { config, setIsSizeGuideOpen } = useStore();
  return (
    <div className="pt-28 pb-24 max-w-4xl mx-auto px-6 space-y-12">
      <div className="pb-6 border-b border-black/10">
        <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Client Care</p>
        <h1 className="font-editorial text-4xl font-semibold mt-1">Policies, FAQs &amp; Contact</h1>
      </div>

      <section id="shipping" className="space-y-2">
        <h2 className="font-editorial text-2xl font-semibold">Shipping Policy</h2>
        <p className="text-sm text-[#0A0A0A]/75 leading-relaxed">
          Standard nationwide delivery across Pakistan arrives within 3–5 business days (PKR{' '}
          {config?.standardShippingFee ?? 350}, complimentary on orders above PKR{' '}
          {(config?.freeShippingThreshold ?? 15000).toLocaleString()}). Priority Express Air arrives
          within 1–2 business days for Lahore, Karachi, Islamabad, and Rawalpindi.
        </p>
      </section>

      <section id="returns" className="space-y-2 pt-6 border-t border-black/10">
        <h2 className="font-editorial text-2xl font-semibold">Returns &amp; Exchange Policy</h2>
        <p className="text-sm text-[#0A0A0A]/75 leading-relaxed">
          Unworn garments with original atelier tags and packaging may be exchanged or returned within 14
          days of delivery. Contact our client concierge with your order number to arrange pickup.
        </p>
      </section>

      <section id="faqs" className="space-y-3 pt-6 border-t border-black/10">
        <h2 className="font-editorial text-2xl font-semibold">Frequently Asked Questions</h2>
        <div className="space-y-2 text-sm text-[#0A0A0A]/75">
          <p>
            <strong className="text-[#0A0A0A]">How do I choose my size?</strong> Most heavyweight tees and
            hoodies feature an intentional boxy drop-shoulder cut. Consult our{' '}
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="underline cursor-pointer text-[#0A0A0A]"
            >
              Atelier Size Guide
            </button>{' '}
            for exact garment measurements.
          </p>
          <p>
            <strong className="text-[#0A0A0A]">Which payment methods are supported?</strong> We support Cash
            on Delivery (COD), Bank Transfer (IBFT/Raast), Easypaisa, JazzCash, and Debit/Credit Cards where
            enabled.
          </p>
        </div>
      </section>

      <section id="privacy" className="space-y-2 pt-6 border-t border-black/10">
        <h2 className="font-editorial text-2xl font-semibold">Privacy Policy &amp; Terms</h2>
        <p className="text-sm text-[#0A0A0A]/75 leading-relaxed">
          Client contact and shipping details are used exclusively to fulfill orders and provide shipment
          updates. Card details are never stored on SOVRAN servers; all card transactions are handled via
          tokenized checkout providers.
        </p>
      </section>

      <section id="contact" className="space-y-2 pt-6 border-t border-black/10">
        <h2 className="font-editorial text-2xl font-semibold">Contact Atelier Concierge</h2>
        <p className="text-sm text-[#0A0A0A]/75">
          Email: {config?.contactEmail || 'concierge@sovranatelier.com'} · Phone:{' '}
          {config?.contactPhone || '+92 300 0482910'} · {config?.studioAddress || '14-B Gulberg III, Lahore'}
        </p>
      </section>
    </div>
  );
}
