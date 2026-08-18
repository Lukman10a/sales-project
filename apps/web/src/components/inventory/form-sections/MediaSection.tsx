import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";
import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { compressImage, isImageTooLarge } from "@/lib/imageCompression";

interface MediaSectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
}

export default function MediaSection({
  item,
  onItemChange,
}: MediaSectionProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert(t("Please select a valid image file"));
      return;
    }

    // Validate file size (max 20MB for initial upload)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(t("Image size must be less than 20MB"));
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      try {
        // Compress image to reduce localStorage size
        const compressedDataUrl = await compressImage(dataUrl, 800, 800, 0.75);

        // Check final size
        if (isImageTooLarge(compressedDataUrl, 200)) {
          // If still too large, compress more aggressively
          const furtherCompressed = await compressImage(
            compressedDataUrl,
            600,
            600,
            0.6,
          );
          onItemChange({ ...item, image: furtherCompressed });
        } else {
          onItemChange({ ...item, image: compressedDataUrl });
        }
      } catch (error) {
        console.error("Image compression failed:", error);
        // Fallback to original if compression fails
        onItemChange({ ...item, image: dataUrl });
      } finally {
        setIsCompressing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onItemChange({ ...item, image: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("Media")}
      </h3>
      <div className="space-y-4">
        {/* Image Preview */}
        {item.image && (
          <div className="relative w-full max-w-xs">
            <img
              src={item.image}
              alt={item.name || "Item preview"}
              className="w-full h-48 object-cover rounded-lg border border-muted"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* File Input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="imageFile" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-muted-foreground/60 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isCompressing
                  ? t("Optimizing image...")
                  : t("Click to upload image")}
              </span>
            </div>
          </Label>
          <input
            ref={fileInputRef}
            id="imageFile"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isCompressing}
          />
          <p className="text-xs text-muted-foreground">
            {t("PNG, JPG, WebP up to 20MB (auto-optimized)")}
          </p>
        </div>

        {/* URL Input */}
        <div className="grid gap-2">
          <Label htmlFor="image">{t("Or paste Image URL")}</Label>
          <Input
            id="image"
            placeholder="https://..."
            value={item.image}
            onChange={(e) => onItemChange({ ...item, image: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}


