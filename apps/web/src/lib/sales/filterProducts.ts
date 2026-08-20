import type { SaleItem } from "@/types/salesTypes";

export function filterProducts(
  products: SaleItem[],
  searchQuery: string,
  selectedCategory: string,
): SaleItem[] {
  const query = searchQuery.trim().toLowerCase();
  return products.filter((item) => {
    const nameMatches = item.name.toLowerCase().includes(query);
    const categoryMatches =
      selectedCategory === "All" ||
      (item.categories ?? []).some((category) => category === selectedCategory);
    return nameMatches && categoryMatches;
  });
}