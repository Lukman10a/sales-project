/**
 * Compress image while maintaining reasonable quality
 * Reduces file size significantly for localStorage storage
 */
export async function compressImage(
  dataUrl: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.7,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Convert to compressed data URL
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      // If image fails to load, return original
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Get approximate size of data URL in KB
 */
export function getDataUrlSizeKb(dataUrl: string): number {
  // Data URL format: "data:image/jpeg;base64,<base64string>"
  const base64String = dataUrl.split(",")[1];
  if (!base64String) return 0;

  // Base64 encoding increases size by ~33%
  // So we calculate actual size from base64 length
  const sizeInBytes = (base64String.length * 3) / 4;
  return Math.round(sizeInBytes / 1024);
}

/**
 * Check if image is small enough for localStorage (~4KB threshold)
 */
export function isImageTooLarge(dataUrl: string, thresholdKb: number = 100): boolean {
  return getDataUrlSizeKb(dataUrl) > thresholdKb;
}
