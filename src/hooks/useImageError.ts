import { useState } from "react";

export function useImageError() {
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setImageError((prev) => ({ ...prev, [id]: true }));
  };

  const hasError = (id: string) => imageError[id] ?? false;

  return { handleImageError, hasError };
}
