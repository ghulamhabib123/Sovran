export function formatPKR(amount: number, currency = 'PKR'): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${currency} ${safe.toLocaleString('en-PK')}`;
}

export function getEffectivePrice(price: number, salePrice: number | null): number {
  if (salePrice !== null && salePrice > 0 && salePrice < price) {
    return salePrice;
  }
  return price;
}

export function getDiscountPercent(price: number, salePrice: number | null): number {
  if (salePrice === null || salePrice <= 0 || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

export function sanitizeHref(url: string | undefined, fallback = '#'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/)/i.test(trimmed)) return trimmed;
  return fallback;
}

export function formatOrderStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
