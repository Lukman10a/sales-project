import {
  EmailExportOptions,
  DailyEmailConfig,
  EmailTemplate,
  InventoryExportData,
} from "@/types/inventoryExportTypes";
import { formatCurrencyValue, formatExportDate, generateHTMLTable } from "./inventoryExportUtils";
import { InventoryItem } from "@/types/inventoryTypes";

/**
 * Generate email template for out-of-stock items
 */
export function generateOutOfStockEmailTemplate(
  outOfStockItems: InventoryItem[],
  companyName: string = "LUXA"
): EmailTemplate {
  const itemsList = outOfStockItems
    .map(
      item =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.sku || item.id}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${Array.isArray(item.category) ? item.category.join(", ") : item.category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">0</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.reorderPoint || "N/A"} units</td>
        </tr>`
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 20px; border-bottom: 1px solid #ddd; }
          .info-box { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .info-box strong { color: #ff9800; }
          table { width: 100%; border-collapse: collapse; background: white; margin: 15px 0; }
          th { background: #667eea; color: white; padding: 12px; text-align: left; font-weight: bold; }
          .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px; }
          .alert { color: #dc3545; font-weight: bold; }
          .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Daily Out-of-Stock Report</h1>
            <p>${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          <div class="content">
            <p>Hello,</p>

            <p>This is your <strong>Daily Out-of-Stock Report</strong> from ${companyName}. The following items have zero stock and require immediate restocking:</p>

            <div class="info-box">
              <strong>⚠️ Alert:</strong> You have <span class="alert">${outOfStockItems.length} items</span> that are currently out of stock.
            </div>

            ${
              outOfStockItems.length > 0
                ? `
              <h3>Out-of-Stock Items:</h3>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Reorder Point</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>

              <p><strong>Recommended Actions:</strong></p>
              <ul>
                <li>Contact suppliers to expedite restocking of these items</li>
                <li>Review sales patterns to optimize inventory levels</li>
                <li>Check if alternative products can fulfill customer demands</li>
                <li>Update customers about expected restocking dates</li>
              </ul>
            `
                : `
              <p style="color: #28a745;">✓ Great news! All items are currently in stock.</p>
            `
            }

            <a href="https://your-app-url.com/inventory" class="button">View Full Inventory Report</a>
          </div>

          <div class="footer">
            <p>This is an automated email from <strong>${companyName}</strong> Sales Management System.</p>
            <p>Generated on ${formatExportDate(new Date().toISOString())}</p>
            <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
DAILY OUT-OF-STOCK REPORT
${new Date().toLocaleDateString("en-NG")}

You have ${outOfStockItems.length} items out of stock.

OUT-OF-STOCK ITEMS:
${outOfStockItems
  .map(
    item =>
      `- ${item.name} (SKU: ${item.sku || item.id}) - Reorder Point: ${item.reorderPoint || "N/A"} units`
  )
  .join("\n")}

RECOMMENDED ACTIONS:
- Contact suppliers to expedite restocking
- Review sales patterns
- Update customers about restocking dates

Generated by LUXA Sales Management System
  `;

  return {
    subject: `📦 Daily Out-of-Stock Report - ${new Date().toLocaleDateString("en-NG")}`,
    htmlContent,
    textContent,
  };
}

/**
 * Generate email template for export data
 */
export function generateExportEmailTemplate(
  exportData: InventoryExportData,
  recipientEmail: string,
  companyName: string = "LUXA"
): EmailTemplate {
  const reportTypeMap: Record<string, string> = {
    "all-stock": "Complete Inventory",
    "available-stock": "Available Stock",
    "out-of-stock": "Out-of-Stock Items",
    "stock-taking": "Stock Taking Report",
  };

  const reportTitle = reportTypeMap[exportData.exportType] || "Inventory Report";
  const htmlTable = generateHTMLTable(exportData, reportTitle);

  // Extract just the table content for email
  const tableMatch = htmlTable.match(/<table>[\s\S]*?<\/table>/);
  const tableContent = tableMatch ? tableMatch[0] : "";

  const summaryHtml =
    exportData.summary &&
    `
    <div style="margin-top: 20px; padding: 15px; background: #f0f7ff; border-left: 4px solid #667eea; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #667eea;">Summary</h3>
      <ul>
        <li><strong>Total Items:</strong> ${exportData.totalItems}</li>
        <li><strong>Items Included:</strong> ${exportData.itemsIncluded}</li>
        <li><strong>Stock Value:</strong> ${formatCurrencyValue(exportData.summary.totalValue || 0)}</li>
        <li><strong>Cost Value:</strong> ${formatCurrencyValue(exportData.summary.totalCost || 0)}</li>
        <li><strong>Profit Value:</strong> ${formatCurrencyValue(exportData.summary.totalProfit || 0)}</li>
        <li><strong>Out-of-Stock Items:</strong> ${exportData.summary.outOfStockCount}</li>
        <li><strong>Low-Stock Items:</strong> ${exportData.summary.lowStockCount}</li>
      </ul>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 900px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: white; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
          th { background: #667eea; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          tr:hover { background: #f5f5f5; }
          .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 ${reportTitle} Report</h1>
            <p>${formatExportDate(exportData.generatedAt)}</p>
          </div>

          <div class="content">
            <p>Hello,</p>

            <p>Please find your <strong>${reportTitle}</strong> report attached and below. This report contains ${exportData.itemsIncluded} items from your inventory.</p>

            ${tableContent}

            ${summaryHtml}

            <p style="margin-top: 20px; color: #666;">
              If you have any questions about this report, please contact your inventory manager or system administrator.
            </p>
          </div>

          <div class="footer">
            <p>This is an automated email from <strong>LUXA</strong> Sales Management System.</p>
            <p>© ${new Date().getFullYear()} LUXA. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
${reportTitle.toUpperCase()} REPORT
Generated: ${formatExportDate(exportData.generatedAt)}

Total Items: ${exportData.totalItems}
Items Included: ${exportData.itemsIncluded}

${exportData.summary ? `Summary: Stock Value: ${formatCurrencyValue(exportData.summary.totalValue || 0)}, Out-of-Stock: ${exportData.summary.outOfStockCount}` : ""}

Please see attached PDF for complete details.
  `;

  return {
    subject: `${reportTitle} Report - ${new Date().toLocaleDateString("en-NG")}`,
    htmlContent,
    textContent,
  };
}

/**
 * Load daily email configuration from localStorage
 */
export function loadDailyEmailConfig(): DailyEmailConfig {
  try {
    const stored = localStorage.getItem("luxa_daily_email_config");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load email config:", error);
  }

  // Default configuration
  return {
    enabled: false,
    sendTime: "08:00",
    recipients: [],
    reportType: "out-of-stock",
    dayOfWeek: "weekdays",
  };
}

/**
 * Save daily email configuration to localStorage
 */
export function saveDailyEmailConfig(config: DailyEmailConfig): void {
  try {
    localStorage.setItem("luxa_daily_email_config", JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save email config:", error);
  }
}

/**
 * Check if it's time to send daily email
 */
export function shouldSendDailyEmail(config: DailyEmailConfig): boolean {
  if (!config.enabled || config.recipients.length === 0) {
    return false;
  }

  const now = new Date();
  const [hours, minutes] = config.sendTime.split(":").map(Number);

  // Check if current time matches send time (within a 1-minute window)
  if (now.getHours() !== hours || now.getMinutes() !== minutes) {
    return false;
  }

  // Check day of week
  const dayOfWeek = now.getDay();
  if (config.dayOfWeek === "weekdays" && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }
  if (config.dayOfWeek === "weekends" && dayOfWeek !== 0 && dayOfWeek !== 6) {
    return false;
  }

  return true;
}

/**
 * Format email configuration for display
 */
export function formatEmailConfig(config: DailyEmailConfig): string {
  const dayLabel =
    config.dayOfWeek === "weekdays"
      ? "Weekdays"
      : config.dayOfWeek === "weekends"
        ? "Weekends"
        : "Daily";
  const reportLabel =
    config.reportType === "out-of-stock"
      ? "Out-of-Stock Items"
      : config.reportType === "low-stock"
        ? "Low-Stock Items"
        : "All Stock";

  return `${config.enabled ? "✓ Enabled" : "✗ Disabled"} | ${config.sendTime} ${dayLabel} | ${reportLabel} | ${config.recipients.length} recipient(s)`;
}
