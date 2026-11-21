import { AlertCircle, Check, Lock, ShieldCheck, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SafeImage } from '../components/common/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../services/api.ts';
import { firestoreService } from '../services/firestoreService.ts';
import { PaymentMethod } from '../types/store.ts';
import { formatPKR, getEffectivePrice } from '../utils/format.ts';

const STEPS = [
  '1. Customer Info',
  '2. Shipping Address',
  '3. Delivery Method',
  '4. Payment Method',
  '5. Order Review',
];

export function CheckoutPage() {
  const { cart, products, config, user, signInWithGoogle, clearCart, navigate, route, showToast } =
    useStore();

  const urlParams = new URLSearchParams(route.includes('?') ? route.split('?')[1] : '');
  const initialCoupon = urlParams.get('coupon') || '';

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Customer
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Step 2: Shipping Address
  const [country, setCountry] = useState('Pakistan');
  const [province, setProvince] = useState('Punjab');
  const [city, setCity] = useState('Lahore');
  const [area, setArea] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Step 3: Delivery Method
  const [deliveryMethodId, setDeliveryMethodId] = useState<'standard' | 'express'>('standard');

  // Step 4: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [transactionReference, setTransactionReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Coupon & Checkout Preview
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [couponInput, setCouponInput] = useState(initialCoupon);
  const [preview, setPreview] = useState<{
    subtotal: number;
    discountCode: string;
    discountAmount: number;
    shippingCost: number;
    taxAmount: number;
    totalAmount: number;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName((v) => v || user.name);
      setEmail((v) => v || user.email);
      setPhone((v) => v || user.phone);
      const defAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      if (defAddr && !streetAddress) {
        setCountry(defAddr.country);
        setProvince(defAddr.province);
        setCity(defAddr.city);
        setArea(defAddr.area);
        setStreetAddress(defAddr.streetAddress);
        setPostalCode(defAddr.postalCode);
      }
    }
  }, [user, streetAddress]);

  useEffect(() => {
    if (cart.length === 0 || products.length === 0 || !config) return;
    let cancelled = false;
    firestoreService
      .computeCheckoutPreview(cart, deliveryMethodId, couponCode, config, products)
      .then((res) => {
        if (!cancelled) {
          setPreview({
            subtotal: res.subtotal,
            discountCode: res.discountCode,
            discountAmount: res.discountAmount,
            shippingCost: res.shippingCost,
            taxAmount: res.taxAmount,
            totalAmount: res.totalAmount,
          });
        }
      })
      .catch((err) => {
        if (!cancelled && couponCode) {
          showToast((err as Error).message, 'error');
          setCouponCode('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cart, products, config, deliveryMethodId, couponCode, showToast]);

  if (cart.length === 0) {
    return (
      <div className="pt-32 pb-24 max-w-xl mx-auto px-6 text-center">
        <h1 className="font-editorial text-4xl font-semibold">No Items in Checkout</h1>
        <p className="text-sm text-[#0A0A0A]/65 mt-2 mb-6">
          Your shopping bag is currently empty. Add garments before proceeding to checkout.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-7 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em]"
        >
          Explore Collection
        </button>
      </div>
    );
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      showToast('Please sign in with Google first to upload a payment receipt.', 'info');
      return;
    }
    setUploadingReceipt(true);
    try {
      const form = new FormData();
      form.append('receipt', file);
      const res = await apiFetch<{ url: string }>('/api/store/upload-receipt', {
        method: 'POST',
        body: form,
      });
      setReceiptUrl(res.url);
      showToast('Payment receipt uploaded.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      if (fullName.trim().length < 2 || !email.includes('@') || phone.trim().length < 7) {
        showToast('Please enter a valid full name, email, and phone number.', 'error');
        return;
      }
    }
    if (step === 1) {
      if (!province.trim() || !city.trim() || !streetAddress.trim()) {
        showToast('Please complete province, city, and street address.', 'error');
        return;
      }
    }
    if (step === 3) {
      if (
        (paymentMethod === 'bank_transfer' ||
          paymentMethod === 'easypaisa' ||
          paymentMethod === 'jazzcash') &&
        transactionReference.trim().length < 4
      ) {
        showToast('Please provide the transaction ID / reference from your payment.', 'error');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handlePlaceOrder = async () => {
    if (!config) return;
    if (!user) {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
    }
    setSubmitting(true);
    try {
      const res = await firestoreService.createOrder({
        cartItems: cart,
        customer: { fullName, email, phone },
        shippingAddress: {
          country,
          province,
          city,
          area,
          streetAddress,
          postalCode,
          deliveryInstructions,
        },
        deliveryMethodId,
        paymentMethod,
        transactionReference,
        receiptUrl,
        couponCode,
        settings: config,
        catalog: products,
      });

      try {
        sessionStorage.setItem(`sovran_last_order_${res.order.orderNumber}`, JSON.stringify(res.order));
      } catch {
        // ignore sessionStorage quota errors
      }

      clearCart();
      if (res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
        return;
      }
      navigate(`/checkout/confirmation/${res.order.orderNumber}`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pmConfig = config?.paymentMethods;
  const cardConfigured = config?.paymentCapabilities?.card?.configured;

  return (
    <div className="pt-28 pb-24 max-w-[1320px] mx-auto px-6 sm:px-10">
      <div className="pb-6 border-b border-black/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">Secure Checkout</p>
          <h1 className="font-editorial text-4xl font-semibold mt-1">Complete Your Order</h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#0A0A0A]/65">
          <Lock className="w-3.5 h-3.5 text-[#9A7B56]" />
          <span>Verified account checkout &amp; order protection</span>
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="py-5 border-b border-black/10 flex flex-wrap gap-2">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => idx < step && setStep(idx)}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              idx === step
                ? 'bg-[#0A0A0A] text-[#F5F3EF]'
                : idx < step
                ? 'bg-[#EAE5DC] text-[#0A0A0A] cursor-pointer'
                : 'text-[#0A0A0A]/45 cursor-default'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Active Step Panel */}
        <div className="lg:col-span-7 bg-white border border-black/10 p-6 sm:p-8 space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Customer Information</h2>
              {!user ? (
                <div className="p-4 bg-[#F5F3EF] border border-black/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#0A0A0A]/75 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#9A7B56] shrink-0 mt-0.5" />
                    <span>
                      Sign in with Google to prefill your saved details, attach orders to your account, and unlock tracking.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="shrink-0 px-4 py-2 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] font-medium hover:bg-[#9A7B56] transition-colors cursor-pointer"
                  >
                    Sign In with Google
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#0A0A0A]/65">
                  Signed in as <strong>{user.email}</strong>. Your order will appear in your Member Account automatically.
                </p>
              )}

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-medium block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Shipping Address</h2>
              {user && user.addresses?.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {user.addresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setCountry(addr.country);
                        setProvince(addr.province);
                        setCity(addr.city);
                        setArea(addr.area);
                        setStreetAddress(addr.streetAddress);
                        setPostalCode(addr.postalCode);
                      }}
                      className="px-3 py-1.5 text-xs border border-black/20 hover:border-[#0A0A0A] bg-[#F5F3EF] cursor-pointer"
                    >
                      Use {addr.label}: {addr.city}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium block mb-1">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Province / State *</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full border border-black/20 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#0A0A0A]"
                  >
                    <option value="Punjab">Punjab</option>
                    <option value="Sindh">Sindh</option>
                    <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                    <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                    <option value="Balochistan">Balochistan</option>
                    <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                    <option value="Azad Kashmir">Azad Kashmir</option>
                    <option value="International">International</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lahore / Karachi / Islamabad"
                    className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Area / Sector</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. DHA Phase 5 / Clifton Block 2"
                    className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Street Address *</label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="House / Suite, Street Name"
                  className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium block mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="54600"
                    className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Delivery Instructions</label>
                  <input
                    type="text"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Call upon arrival"
                    className="w-full border border-black/20 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Delivery Method</h2>

              <label
                className={`flex items-start justify-between p-4 border cursor-pointer ${
                  deliveryMethodId === 'standard' ? 'border-[#0A0A0A] bg-[#F5F3EF]' : 'border-black/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethodId === 'standard'}
                    onChange={() => setDeliveryMethodId('standard')}
                    className="mt-1 accent-[#0A0A0A]"
                  />
                  <div>
                    <p className="text-sm font-semibold">Standard Nationwide Delivery</p>
                    <p className="text-xs text-[#0A0A0A]/65 mt-0.5">
                      Estimated 3–5 business days · Free above {formatPKR(config?.freeShippingThreshold ?? 15000)}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm">
                  {(preview?.subtotal ?? 0) >= (config?.freeShippingThreshold ?? 15000)
                    ? 'Free'
                    : formatPKR(config?.standardShippingFee ?? 350)}
                </span>
              </label>

              <label
                className={`flex items-start justify-between p-4 border cursor-pointer ${
                  deliveryMethodId === 'express' ? 'border-[#0A0A0A] bg-[#F5F3EF]' : 'border-black/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethodId === 'express'}
                    onChange={() => setDeliveryMethodId('express')}
                    className="mt-1 accent-[#0A0A0A]"
                  />
                  <div>
                    <p className="text-sm font-semibold">Express Courier (Priority Air)</p>
                    <p className="text-xs text-[#0A0A0A]/65 mt-0.5">
                      Estimated 1–2 business days in major cities
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm">
                  {formatPKR(config?.expressShippingFee ?? 850)}
                </span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-editorial text-2xl font-semibold">Payment Method</h2>
              <p className="text-xs text-[#0A0A0A]/65">
                All payments are verified honestly. Manual transfers remain in pending verification until reviewed.
              </p>

              <div className="space-y-3">
                {pmConfig?.cod !== false && (
                  <label
                    className={`block p-4 border cursor-pointer ${
                      paymentMethod === 'cod' ? 'border-[#0A0A0A] bg-[#F5F3EF]' : 'border-black/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pm"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="accent-[#0A0A0A]"
                      />
                      <div>
                        <p className="text-sm font-semibold">Cash on Delivery (COD)</p>
                        <p className="text-xs text-[#0A0A0A]/65">
                          Pay in PKR upon courier delivery. Payment status remains unpaid until collected.
                        </p>
                      </div>
                    </div>
                  </label>
                )}

                {pmConfig?.bankTransfer !== false && (
                  <label
                    className={`block p-4 border cursor-pointer ${
                      paymentMethod === 'bank_transfer' ? 'border-[#0A0A0A] bg-[#F5F3EF]' : 'border-black/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pm"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={() => setPaymentMethod('bank_transfer')}
                        className="accent-[#0A0A0A]"
                      />
                      <div>
                        <p className="text-sm font-semibold">Bank Transfer (IBFT / Raast)</p>
                        <p className="text-xs text-[#0A0A0A]/65">
                          Transfer total to our verified Meezan Bank account and submit your reference ID.
                        </p>
                      </div>
                    </div>
                  </label>
                )}

                {pmConfig?.easypaisa !== false && (
                  <label
                    className={`block p-4 border cursor-pointer ${
                      paymentMethod === 'easypaisa' ? 'border-[#0A0A0A] bg-[#F5F3EF]' : 'border-black/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pm"
                        checked={paymentMethod === 'easypaisa'}
                        onChange={() => setPaymentMethod('easypaisa')}
                        className="accent-[#0A0A0A]"
                      />
                      <div>
                        <p className="text-sm font-semibold">Easypaisa Mobile Account</p>
                        <p className="text-xs text-[#0A0A0A]/65">
                          {config?.paymentCapabilities?.easypaisa?.mode === 'api'
                            ? 'Easypaisa gateway checkout'
                            : 'Manual wallet transfer with TID verification'}
                        </p>
                      </div>
                    </div>
                  </label>
                )}

                {pmConfig?.jazzcash !== false && (
                  <label
                    className={`block p-4 border cursor-pointer ${
                      paymentMethod === 'jazzcash' ? 'border-[#0A0A0A] bg-[#F5F3EF]' : 'border-black/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pm"
                        checked={paymentMethod === 'jazzcash'}
                        onChange={() => setPaymentMethod('jazzcash')}
                        className="accent-[#0A0A0A]"
                      />
                      <div>
                        <p className="text-sm font-semibold">JazzCash Mobile Account</p>
                        <p className="text-xs text-[#0A0A0A]/65">
                          {config?.paymentCapabilities?.jazzcash?.mode === 'api'
                            ? 'JazzCash merchant gateway'
                            : 'Manual wallet transfer with TID verification'}
                        </p>
                      </div>
                    </div>
                  </label>
                )}

                {pmConfig?.card !== false && (
                  <label
                    className={`block p-4 border cursor-pointer ${
                      paymentMethod === 'card' ? 'border-[#0A0A0A] bg-[#F5F3EF]' : 'border-black/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pm"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="accent-[#0A0A0A]"
                      />
                      <div>
                        <p className="text-sm font-semibold">Debit / Credit Card (Stripe Checkout)</p>
                        <p className="text-xs text-[#0A0A0A]/65">
                          {cardConfigured
                            ? 'Redirects to secure Stripe Checkout; verified via webhook.'
                            : 'Requires server STRIPE_SECRET_KEY configuration (card numbers are never collected directly).'}
                        </p>
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Manual Payment Details & Receipt Upload */}
              {(paymentMethod === 'bank_transfer' ||
                paymentMethod === 'easypaisa' ||
                paymentMethod === 'jazzcash') && (
                <div className="mt-4 p-5 bg-[#EAE5DC] border border-black/15 space-y-4 text-xs">
                  {paymentMethod === 'bank_transfer' && config?.bankDetails && (
                    <div className="space-y-1 font-mono">
                      <p className="font-sans font-semibold text-sm mb-2">Configured Bank Details</p>
                      <p>Bank: {config.bankDetails.bankName}</p>
                      <p>Title: {config.bankDetails.accountTitle}</p>
                      <p>Account: {config.bankDetails.accountNumber}</p>
                      <p>IBAN: {config.bankDetails.iban}</p>
                    </div>
                  )}
                  {paymentMethod === 'easypaisa' && config?.mobileWallets && (
                    <div className="space-y-1 font-mono">
                      <p className="font-sans font-semibold text-sm mb-2">Easypaisa Wallet</p>
                      <p>Title: {config.mobileWallets.easypaisaTitle}</p>
                      <p>Number: {config.mobileWallets.easypaisaNumber}</p>
                    </div>
                  )}
                  {paymentMethod === 'jazzcash' && config?.mobileWallets && (
                    <div className="space-y-1 font-mono">
                      <p className="font-sans font-semibold text-sm mb-2">JazzCash Wallet</p>
                      <p>Title: {config.mobileWallets.jazzcashTitle}</p>
                      <p>Number: {config.mobileWallets.jazzcashNumber}</p>
                    </div>
                  )}

                  <div>
                    <label className="font-semibold block mb-1">
                      Transaction Reference / TID *
                    </label>
                    <input
                      type="text"
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      placeholder="Enter TID / Reference Number"
                      className="w-full bg-white border border-black/20 px-3 py-2 text-xs focus:outline-none focus:border-[#0A0A0A]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Upload Transfer Receipt (Optional)</label>
                    {!user ? (
                      <button
                        type="button"
                        onClick={() => void signInWithGoogle()}
                        className="px-4 py-2 bg-[#0A0A0A] text-white text-xs cursor-pointer"
                      >
                        Sign In with Google to Upload Receipt
                      </button>
                    ) : (
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-black/20 cursor-pointer hover:border-[#0A0A0A]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingReceipt
                            ? 'Uploading...'
                            : receiptUrl
                            ? 'Receipt Uploaded'
                            : 'Choose Screenshot'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && !cardConfigured && (
                <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Stripe server credentials (STRIPE_SECRET_KEY) are not configured in this preview environment.
                    To complete an order now without faking a card charge, choose Cash on Delivery, Bank Transfer,
                    Easypaisa, or JazzCash.
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-editorial text-2xl font-semibold">Review Your Order</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#F5F3EF] p-4 border border-black/10">
                <div>
                  <p className="uppercase tracking-[0.12em] text-[#0A0A0A]/55 mb-1">Contact &amp; Shipping</p>
                  <p className="font-semibold">{fullName}</p>
                  <p>{email} · {phone}</p>
                  <p className="mt-1">
                    {streetAddress}, {area ? `${area}, ` : ''}{city}, {province}, {country}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.12em] text-[#0A0A0A]/55 mb-1">Delivery &amp; Payment</p>
                  <p className="font-semibold capitalize">{deliveryMethodId} Delivery</p>
                  <p className="capitalize mt-1">
                    Payment: {paymentMethod.replace('_', ' ')}
                  </p>
                  {transactionReference && (
                    <p className="font-mono mt-0.5">Ref: {transactionReference}</p>
                  )}
                </div>
              </div>

              {!user && (
                <div className="p-4 bg-[#EAE5DC] border border-black/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span>
                    Please sign in with Google once to authorize and securely record this order to your SOVRAN account.
                  </span>
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="shrink-0 px-4 py-2 bg-[#0A0A0A] text-[#F5F3EF] uppercase tracking-[0.12em] font-medium cursor-pointer"
                  >
                    Sign In with Google
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {cart.map((c) => {
                  const p = c.product || products.find((pr) => pr._id === c.productId);
                  if (!p) return null;
                  const price = getEffectivePrice(p.price, p.salePrice);
                  return (
                    <div key={c.variantId} className="flex items-center justify-between text-sm border-b border-black/10 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-[#EAE5DC]">
                          <SafeImage src={p.images[0]?.url} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-[#0A0A0A]/65">
                            Size {c.size} · {c.colorName} · Qty {c.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums">{formatPKR(price * c.quantity)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step Navigation Buttons */}
          <div className="pt-4 border-t border-black/10 flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-2.5 border border-black/20 text-xs uppercase tracking-[0.12em] hover:border-[#0A0A0A] cursor-pointer"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="px-5 py-2.5 border border-black/20 text-xs uppercase tracking-[0.12em] hover:border-[#0A0A0A] cursor-pointer"
              >
                Return to Bag
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-7 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handlePlaceOrder}
                className="px-8 py-3.5 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#9A7B56] transition-colors inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Placing Order...'
                    : !user
                    ? 'Sign In with Google & Place Order'
                    : 'Place Order'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Right Summary Column */}
        <aside className="lg:col-span-5 bg-white border border-black/10 p-6 sm:p-8 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-editorial text-2xl font-semibold">Bag Summary</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Discount code"
              className="flex-1 border border-black/20 px-3 py-2 text-xs uppercase focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setCouponCode(couponInput.trim())}
              className="px-4 py-2 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.12em] cursor-pointer"
            >
              Apply
            </button>
          </div>

          <div className="space-y-2.5 text-sm pt-2 border-t border-black/10 tabular-nums">
            <div className="flex justify-between">
              <span className="text-[#0A0A0A]/70">Subtotal</span>
              <span className="font-mono">{formatPKR(preview?.subtotal ?? 0)}</span>
            </div>
            {(preview?.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-[#9A7B56]">
                <span>Discount ({preview?.discountCode})</span>
                <span className="font-mono">-{formatPKR(preview?.discountAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#0A0A0A]/70">Delivery</span>
              <span className="font-mono">
                {preview?.shippingCost === 0 ? 'Complimentary' : formatPKR(preview?.shippingCost ?? 0)}
              </span>
            </div>
            {(preview?.taxAmount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-[#0A0A0A]/70">Tax</span>
                <span className="font-mono">{formatPKR(preview?.taxAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-black/10 text-base font-semibold">
              <span>Total</span>
              <span className="font-mono">{formatPKR(preview?.totalAmount ?? 0)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
