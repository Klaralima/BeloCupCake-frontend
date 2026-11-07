import { useState } from "react";
import placeholder from "@/assets/cupcake-placeholder.jpg";
import { cn } from "@/lib/utils";

export function ProductImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? placeholder : src;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("aspect-square w-full bg-muted object-cover", className)}
    />
  );
}
