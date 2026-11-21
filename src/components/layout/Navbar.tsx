import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';

export function Navbar() {
  const {
    route,
    navigate,
    config,
    user,
    cartCount,
    wishlistIds,
    setIsCartOpen,
    setIsSearchOpen,
  } = useStore();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = route === '/' || route === '';

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 36);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const brandName = config?.brandName || 'SOVRAN';
  const darkHeroMode = isHome && !scrolled && !mobileOpen;

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'Men', to: '/shop?gender=men' },
    { label: 'Women', to: '/shop?gender=women' },
    { label: 'New Arrivals', to: '/shop?newArrival=true' },
    { label: 'Collections', to: '/collections' },
    { label: 'Sale', to: '/shop?sale=true' },
  ];

  const handleNav = (to: string) => {
    setMobileOpen(false);
    navigate(to);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          darkHeroMode
            ? 'bg-transparent text-[#F5F3EF] border-b border-white/10'
            : 'bg-[#F5F3EF]/95 text-[#0A0A0A] border-b border-black/10 shadow-xs'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
          {/* Left: Mobile Menu + Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 hover:opacity-70 transition-opacity"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleNav('/')}
              className="font-editorial text-2xl sm:text-[28px] font-semibold tracking-[0.16em] uppercase whitespace-nowrap shrink-0 cursor-pointer"
            >
              {brandName}
            </button>
          </div>

          {/* Center: Single-line Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-[13px] font-medium tracking-wide"
          >
            {navLinks.map((link) => {
              const active = route === link.to;
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleNav(link.to)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-opacity cursor-pointer hover:opacity-70 ${
                    active ? 'underline underline-offset-4 decoration-[#9A7B56]' : ''
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search products"
              className="p-2.5 hover:opacity-70 transition-opacity cursor-pointer"
            >
              <Search className="w-[18px] h-[18px] stroke-[1.7]" />
            </button>

            <button
              type="button"
              onClick={() => handleNav(user?.role === 'admin' || user?.role === 'superadmin' ? '/admin' : '/account')}
              aria-label="Account"
              className="p-2.5 hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-[18px] h-[18px] stroke-[1.7]" />
              {user && (
                <span className="hidden xl:inline text-xs font-medium max-w-[90px] truncate">
                  {user.name.split(' ')[0]}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNav('/wishlist')}
              aria-label={`Wishlist (${wishlistIds.length} items)`}
              className="relative p-2.5 hover:opacity-70 transition-opacity cursor-pointer"
            >
              <Heart className="w-[18px] h-[18px] stroke-[1.7]" />
              {wishlistIds.length > 0 && (
                <span className="absolute top-1.5 right-1 text-[10px] font-mono tabular-nums leading-none">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Shopping bag (${cartCount} items)`}
              className="relative p-2.5 hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1"
            >
              <ShoppingBag className="w-[18px] h-[18px] stroke-[1.7]" />
              <span className="text-xs font-mono tabular-nums">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-80 max-w-[85vw] bg-[#F5F3EF] text-[#0A0A0A] h-full flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-black/10">
                <span className="font-editorial text-2xl font-semibold tracking-[0.16em]">
                  {brandName}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => handleNav(link.to)}
                    className="text-left py-3 text-base font-medium border-b border-black/5 hover:text-[#9A7B56] transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNav('/track-order')}
                  className="text-left py-3 text-base font-medium border-b border-black/5 hover:text-[#9A7B56] transition-colors"
                >
                  Track Order
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/about')}
                  className="text-left py-3 text-base font-medium border-b border-black/5 hover:text-[#9A7B56] transition-colors"
                >
                  Brand Story
                </button>
              </nav>
            </div>
            <div className="pt-6 border-t border-black/10 flex flex-col gap-3 text-sm">
              <button
                type="button"
                onClick={() => handleNav('/account')}
                className="w-full py-3 bg-[#0A0A0A] text-[#F5F3EF] font-medium"
              >
                {user ? `Account · ${user.name.split(' ')[0]}` : 'Sign In / Register'}
              </button>
              <button
                type="button"
                onClick={() => handleNav('/admin')}
                className="w-full py-2.5 border border-black/20 text-[#0A0A0A] text-xs font-medium"
              >
                Admin Workspace
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
