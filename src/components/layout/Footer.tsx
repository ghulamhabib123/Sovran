import { ArrowRight } from 'lucide-react';
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { firestoreService } from '../../services/firestoreService.ts';
import { sanitizeHref } from '../../utils/format.ts';

export function Footer() {
  const { navigate, config, setIsSizeGuideOpen, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const brandName = config?.brandName || 'SOVRAN';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const msg = await firestoreService.subscribeNewsletter(email);
      setStatusMsg(msg);
      setEmail('');
      showToast('Subscribed to SOVRAN Private Client List.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#0A0A0A] text-[#F5F3EF] border-t border-white/10">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-14 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="font-editorial text-3xl font-semibold tracking-[0.16em]">{brandName}</div>
            <p className="text-sm text-[#F5F3EF]/70 max-w-sm leading-relaxed">
              Architectural ready-to-wear and elevated streetwear crafted in small batches with
              custom-milled textiles. Designed in Lahore, worn globally.
            </p>
            <div className="pt-2 text-xs text-[#F5F3EF]/60 space-y-1">
              <p>{config?.studioAddress || '14-B Gulberg III, Lahore, Pakistan'}</p>
              <p>{config?.contactEmail || 'concierge@sovranatelier.com'}</p>
              <p>{config?.contactPhone || '+92 300 0482910'}</p>
            </div>
          </div>

          {/* Shop Links */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9A7B56]">
              Collections
            </h3>
            <ul className="space-y-2.5 text-sm text-[#F5F3EF]/75">
              <li>
                <button type="button" onClick={() => navigate('/shop?gender=men')} className="hover:text-white transition-colors">
                  Shop Men
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/shop?gender=women')} className="hover:text-white transition-colors">
                  Shop Women
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/shop?newArrival=true')} className="hover:text-white transition-colors">
                  New Arrivals
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/collections')} className="hover:text-white transition-colors">
                  The Everyday Collection
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/shop?sale=true')} className="hover:text-white transition-colors">
                  Seasonal Archive Sale
                </button>
              </li>
            </ul>
          </div>

          {/* Client Care & Policies */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9A7B56]">
              Client Care
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-[#F5F3EF]/75">
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-white transition-colors">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/track-order')} className="hover:text-white transition-colors">
                  Track Order
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/policies#contact')} className="hover:text-white transition-colors">
                  Contact
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/policies#faqs')} className="hover:text-white transition-colors">
                  FAQs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/policies#shipping')} className="hover:text-white transition-colors">
                  Shipping Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/policies#returns')} className="hover:text-white transition-colors">
                  Returns &amp; Exchange
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/policies#privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/policies#terms')} className="hover:text-white transition-colors">
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setIsSizeGuideOpen(true)} className="hover:text-white transition-colors">
                  Size Guide
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/admin')} className="hover:text-white transition-colors text-[#9A7B56]">
                  Admin Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9A7B56]">
              Private Client List
            </h3>
            <p className="text-sm text-[#F5F3EF]/70 leading-relaxed">
              Receive early access to numbered capsule releases and seasonal lookbooks.
            </p>
            <form onSubmit={handleSubscribe} className="flex border border-white/20 focus-within:border-[#9A7B56] transition-colors">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Newsletter email address"
                className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                aria-label="Subscribe to newsletter"
                className="px-4 bg-[#F5F3EF] text-[#0A0A0A] hover:bg-[#9A7B56] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            {statusMsg && <p className="text-xs text-[#9A7B56]">{statusMsg}</p>}
            <div className="pt-3 flex items-center gap-5 text-xs text-[#F5F3EF]/60">
              <a
                href={sanitizeHref(config?.socialLinks?.instagram, 'https://instagram.com')}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram
              </a>
              <a
                href={sanitizeHref(config?.socialLinks?.tiktok, 'https://tiktok.com')}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                TikTok
              </a>
              <a
                href={sanitizeHref(config?.socialLinks?.pinterest, 'https://pinterest.com')}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Pinterest
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar: Payment Methods & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#F5F3EF]/55">
          <p>© {new Date().getFullYear()} {brandName} Atelier. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-wider uppercase text-[#F5F3EF]/70">
            <span>COD</span>
            <span aria-hidden="true">·</span>
            <span>Bank Transfer</span>
            <span aria-hidden="true">·</span>
            <span>Easypaisa</span>
            <span aria-hidden="true">·</span>
            <span>JazzCash</span>
            <span aria-hidden="true">·</span>
            <span>Visa / Mastercard</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
