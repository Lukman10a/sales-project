import { useState, useEffect } from "react";
import { InventoryItem } from "@/types/inventoryTypes";

export function useBarcodeScanner(
  isOpen: boolean,
  item: Omit<InventoryItem, "id">,
  onItemChange: (item: Omit<InventoryItem, "id">) => void,
) {
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime;

      // If more than 100ms between keys, reset buffer (human typing)
      if (timeDiff > 100) {
        setBarcodeBuffer("");
      }

      // Accumulate characters for barcode (fast input from scanner)
      if (e.key === "Enter" && barcodeBuffer.length > 0) {
        // Barcode scanner sends Enter after barcode
        e.preventDefault();
        onItemChange({ ...item, barcode: barcodeBuffer.trim() });
        setBarcodeBuffer("");
      } else if (e.key.length === 1 && timeDiff < 100) {
        // Fast keypresses indicate scanner input
        setBarcodeBuffer((prev) => prev + e.key);
      }

      setLastKeyTime(now);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [isOpen, barcodeBuffer, lastKeyTime, item, onItemChange]);

  return barcodeBuffer;
}
