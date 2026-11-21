import { Shirt } from 'lucide-react';
import { useState } from 'react';
import { sanitizeHref } from '../../utils/format.ts';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function SafeImage({ src, alt, className = '', loading = 'lazy' }: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const safeSrc = sanitizeHref(src, '');

  if (!safeSrc || errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EAE5DC] to-[#D6CFC2] text-[#0A0A0A]/50 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shirt className="w-8 h-8 mb-2 stroke-[1.25]" />
        <span className="text-[11px] uppercase tracking-[0.18em] font-medium px-4 text-center line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
