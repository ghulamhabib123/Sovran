/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { CartDrawer } from './components/cart/CartDrawer.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { SearchOverlay } from './components/common/SearchOverlay.tsx';
import { SizeGuideModal } from './components/common/SizeGuideModal.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { QuickViewModal } from './components/product/QuickViewModal.tsx';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.tsx';
import { OrderTrackingPage } from './pages/OrderTrackingPage.tsx';
import { AboutPage, CollectionsPage, PoliciesPage } from './pages/PolicyAndInfoPages.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { WishlistPage } from './pages/WishlistPage.tsx';

function StoreRouter() {
  const { route } = useStore();
  const pathname = route.split('?')[0].split('#')[0] || '/';

  let pageView = <HomePage />;

  if (pathname === '/' || pathname === '') {
    pageView = <HomePage />;
  } else if (pathname === '/shop') {
    pageView = <ShopPage />;
  } else if (pathname.startsWith('/product/')) {
    const slug = decodeURIComponent(pathname.replace('/product/', ''));
    pageView = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/cart') {
    pageView = <CartPage />;
  } else if (pathname === '/wishlist') {
    pageView = <WishlistPage />;
  } else if (pathname === '/checkout') {
    pageView = <CheckoutPage />;
  } else if (pathname.startsWith('/checkout/confirmation/')) {
    const orderNumber = decodeURIComponent(pathname.replace('/checkout/confirmation/', ''));
    pageView = <OrderConfirmationPage orderNumber={orderNumber} />;
  } else if (pathname === '/track-order') {
    pageView = <OrderTrackingPage />;
  } else if (pathname === '/account') {
    pageView = <AccountPage />;
  } else if (pathname === '/collections') {
    pageView = <CollectionsPage />;
  } else if (pathname === '/about') {
    pageView = <AboutPage />;
  } else if (pathname === '/policies') {
    pageView = <PoliciesPage />;
  } else if (pathname === '/admin') {
    pageView = <AdminDashboardPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EF] text-[#0A0A0A]">
      <Navbar />
      <main className="flex-1">{pageView}</main>
      <Footer />
      <CartDrawer />
      <QuickViewModal />
      <SearchOverlay />
      <SizeGuideModal />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <StoreRouter />
      </StoreProvider>
    </ErrorBoundary>
  );
}
