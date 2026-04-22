import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
  showFallback?: boolean;
}

export default function ImageDisplay({
  src,
  alt,
  className,
  onError,
  showFallback = true,
}: ImageDisplayProps) {
  const hasImage = src && src.trim().length > 0;

  if (!hasImage && !showFallback) {
    return null;
  }

  if (!hasImage) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          className || "w-full h-48",
        )}
      >
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className || "w-full h-48")}
      onError={onError}
    />
  );
}



