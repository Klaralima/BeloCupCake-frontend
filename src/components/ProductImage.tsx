import { useState } from "react";
import placeholder from "@/assets/cupcake-placeholder.jpg";
import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const safeSrc = safeImageUrl(src);
  const url = !safeSrc || failedSrc === safeSrc ? placeholder : safeSrc;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(safeSrc)}
      className={cn("aspect-square w-full bg-muted object-cover", className)}
    />
  );
}

// URLs externas somente por HTTPS, sem usuário/senha embutidos.
export function safeImageUrl(src: string | null): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
