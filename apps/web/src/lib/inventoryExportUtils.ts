import { InventoryItem } from "@/types/inventoryTypes";
import { ExportOptions, InventoryExportData, StockTakingConfig } from "@/types/inventoryExportTypes";

/**
 * Generate inventory export data based on selected options
 */
export function generateInventoryExportData(
  inventory: InventoryItem[],
  options: ExportOptions,
): InventoryExportData {
  let filteredItems = inventory;

  // Filter items based on export type
  switch (options.type) {
    case "out-of-stock":
      filteredItems = inventory.filter(item => item.status === "out-of-stock");
      break;
    case "available-stock":
      filteredItems = inventory.filter(item => item.status !== "out-of-stock");
      break;
    case "all-stock":
      filteredItems = inventory;
      break;
    case "stock-taking":
      filteredItems = inventory;
      break;
  }

  // Process items for export
  const processedItems = filteredItems.map(item => ({
    id: item.id,
    sku: item.sku || "N/A",
    name: item.name,
    category: Array.isArray(item.category) ? item.category.join(", ") : item.category,
    quantity: item.quantity,
    status: item.status,
    wholesalePrice: item.wholesalePrice,
    sellingPrice: item.sellingPrice,
    sold: item.sold,
    supplier: item.supplier || "N/A",
    reorderPoint: item.reorderPoint || "N/A",
    lastRestocked: item.lastRestocked || "N/A",
  }));

  // Calculate summary metrics
  const summary = {
    totalValue: processedItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0),
    totalCost: processedItems.reduce((sum, item) => sum + (item.wholesalePrice * item.quantity), 0),
    totalProfit: processedItems.reduce((sum, item) => sum + ((item.sellingPrice - item.wholesalePrice) * item.quantity), 0),
    averagePrice: processedItems.length > 0 ? processedItems.reduce((sum, item) => sum + item.sellingPrice, 0) / processedItems.length : 0,
    highestStockItem: processedItems.length > 0 ? processedItems.reduce((max, item) => item.quantity > max.quantity ? item : max).name : "N/A",
    lowestStockItem: processedItems.length > 0 ? processedItems.reduce((min, item) => item.quantity < min.quantity ? item : min).name : "N/A",
    outOfStockCount: inventory.filter(i => i.status === "out-of-stock").length,
    lowStockCount: inventory.filter(i => i.status === "low-stock").length,
  };

  return {
    generatedAt: new Date().toISOString(),
    exportType: options.type,
    totalItems: inventory.length,
    itemsIncluded: filteredItems.length,
    items: processedItems,
    summary: options.includeMetrics ? summary : undefined,
  };
}

/**
 * Format currency value
 */
export function formatCurrencyValue(value: number, currencyCode = "NGN"): string {
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  });
  return formatter.format(value);
}

/**
 * Format date for display
 */
export function formatExportDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generate CSV content from inventory data
 */
export function generateCSVContent(data: InventoryExportData): string {
  let csv = "SKU,Item Name,Category,Quantity,Status,Wholesale Price,Selling Price,Sold,Supplier,Reorder Point,Last Restocked\n";

  data.items.forEach(item => {
    csv += `"${item.sku}","${item.name}","${item.category}",${item.quantity},"${item.status}",${item.wholesalePrice},${item.sellingPrice},${item.sold},"${item.supplier}",${item.reorderPoint},"${item.lastRestocked}"\n`;
  });

  // Add summary if present
  if (data.summary) {
    csv += "\n\nSUMMARY\n";
    csv += `Total Items,${data.totalItems}\n`;
    csv += `Items Included,${ data.itemsIncluded}\n`;
    csv += `Total Stock Value,${data.summary.totalValue ?? 0}\n`;
    csv += `Total Cost Value,${data.summary.totalCost ?? 0}\n`;
    csv += `Total Profit,${data.summary.totalProfit ?? 0}\n`;
    csv += `Average Price,${((data.summary.averagePrice ?? 0) as number).toFixed(2)}\n`;
    csv += `Highest Stock Item,${data.summary.highestStockItem}\n`;
    csv += `Lowest Stock Item,${ data.summary.lowestStockItem}\n`;
    csv += `Out of Stock Count,${data.summary.outOfStockCount}\n`;
    csv += `Low Stock Count,${data.summary.lowStockCount}\n`;
  }

  return csv;
}

/**
 * Generate HTML table for PDF/Email
 */
export function generateHTMLTable(
  data: InventoryExportData,
  title: string,
  includeImages = false,
): string {
  const summaryHtml = data.summary ? `
    <div style="margin-top: 30px; page-break-before: always;">
      <h2>Summary Report</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Total Items:</strong> ${data.totalItems}
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Items Included:</strong> ${data.itemsIncluded}
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Total Stock Value:</strong> ${formatCurrencyValue(data.summary.totalValue || 0)}
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Total Cost:</strong> ${formatCurrencyValue(data.summary.totalCost || 0)}
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Total Profit:</strong> ${formatCurrencyValue(data.summary.totalProfit || 0)}
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Out of Stock Items:</strong> ${data.summary.outOfStockCount}
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Low Stock Items:</strong> ${data.summary.lowStockCount}
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <strong>Average Price:</strong> ${formatCurrencyValue(data.summary.averagePrice || 0)}
        </div>
      </div>
    </div>
  ` : "";

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #1a1a1a;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
          }
          h2 {
            color: #333;
            margin-top: 20px;
          }
          .header {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #007bff;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          tr:hover {
            background-color: #e9ecef;
          }
          .status-in-stock { color: #28a745; font-weight: bold; }
          .status-low-stock { color: #ffc107; font-weight: bold; }
          .status-out-of-stock { color: #dc3545; font-weight: bold; }
          .no-data {
            text-align: center;
            padding: 20px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="header">
          <p><strong>Generated:</strong> ${formatExportDate(data.generatedAt)}</p>
          <p><strong>Type:</strong> ${data.exportType.toUpperCase().replace(/-/g, " ")}</p>
        </div>

        ${data.items.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Wholesale Price</th>
                <th>Selling Price</th>
                <th>Sold (Units)</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr>
                  <td>${item.sku}</td>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>${item.quantity}</td>
                  <td><span class="status-${item.status.replace(/-/g, "-")}">${item.status}</span></td>
                  <td>${formatCurrencyValue(item.wholesalePrice)}</td>
                  <td>${formatCurrencyValue(item.sellingPrice)}</td>
                  <td>${item.sold}</td>
                  <td>${item.supplier}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `
          <div class="no-data">
            <p>No items found matching the selected criteria.</p>
          </div>
        `}

        ${summaryHtml}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
          <p>This report was automatically generated by LUXA Sales Management System.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Get filename for export based on type and date
 */
export function getExportFilename(exportType: string, format: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const typeLabel = exportType.toUpperCase().replace(/-/g, "_");
  return `Inventory_${typeLabel}_${timestamp}.${format}`;
}
