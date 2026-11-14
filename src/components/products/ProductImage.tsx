"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  iconClassName?: string;
  fallbackText?: string;
}

export function ProductImage({
  src,
  alt,
  className,
  fallbackClassName = "flex items-center justify-center text-zinc-600",
  iconClassName = "h-5 w-5",
  fallbackText,
}: ProductImageProps) {
  const source = src?.trim() || null;
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (source && failedSource !== source) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt={alt}
        className={className}
        onError={() => setFailedSource(source)}
      />
    );
  }

  return (
    <div className={fallbackClassName} role="img" aria-label={`${alt}: bez obrázku produktu`}>
      <ImageOff className={iconClassName} aria-hidden="true" />
      {fallbackText && <span className="text-xs font-medium">{fallbackText}</span>}
    </div>
  );
}
