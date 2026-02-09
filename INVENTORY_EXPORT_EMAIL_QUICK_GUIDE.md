# INVENTORY EXPORT & EMAIL FEATURES - QUICK REFERENCE

## 🚀 Quick Start

### Export Inventory Reports

1. **Inventory Page** → Click **"Export"** button
2. **Select Report Type:**
   - 📦 All Stock - Complete inventory
   - ✓ Available Stock - In-stock items only
   - ✗ Out-of-Stock - Zero quantity items
   - 📋 Stock Taking - For physical counts

3. **Choose Format:**
   - **HTML** - Best for printing, includes styling
   - **CSV** - Best for Excel/Google Sheets

4. **Options:**
   - ✓ Include Summary & Metrics (adds totals, profit, averages)

5. **Click** "Download Report" → File downloads automatically

---

## 📧 Daily Email Reports

### Enable Daily Emails

1. **Inventory Page** → Click **"Daily Email"** button
2. Toggle **"Enable daily emails"** ON
3. **Configure:**
   - **Send Time:** Enter time (e.g., 08:00 = 8 AM)
   - **Send Days:** Pick All/Weekdays/Weekends
   - **Report Type:** Out-of-Stock / Low-Stock / All Stock
   - **Recipients:** Add email addresses (click + button)
4. **Click** "Save Settings"
5. Look for **"ON"** badge on Daily Email button when enabled

### Disable Daily Emails

1. Click **"Daily Email"** button
2. Toggle **"Enable daily emails"** OFF
3. Click **"Save Settings"**

---

## 📊 What's Included in Exports

### HTML/CSV Content

| Field           | Example       |
| --------------- | ------------- |
| SKU             | ACC-IP15-CASE |
| Item Name       | iPhone Case   |
| Category        | Accessories   |
| Quantity        | 15            |
| Status          | In-stock      |
| Wholesale Price | ₦2,500        |
| Selling Price   | ₦4,500        |
| Units Sold      | 28            |
| Supplier        | Tech Co.      |

### Optional Metrics (when enabled)

- **Total Items:** Count of all items
- **Items Included:** Count in this export
- **Stock Value:** Selling price × quantity total
- **Cost Value:** Wholesale price × quantity total
- **Profit:** Stock Value - Cost Value
- **Highest Stock Item:** Item with most units
- **Lowest Stock Item:** Item with least units
- **Out of Stock Count:** How many at 0 qty
- **Low Stock Count:** How many below reorder point

---

## 📁 File Types & Naming

### Downloaded Files

```
Inventory_ALL_STOCK_2026-02-09.html
Inventory_OUT_OF_STOCK_2026-02-09.csv
Inventory_AVAILABLE_STOCK_2026-02-09.html
```

### Open With

| Format | Program                    |
| ------ | -------------------------- |
| HTML   | Browser / Print to PDF     |
| CSV    | Excel, Google Sheets, etc. |

---

## 💡 Pro Tips

### For Daily Emails

- **Best Practice:** Set time 1 hour before business starts
- **Weekend Reports:** Choose "Weekends" to get weekend stock status
- **Multiple Recipients:** Add your entire management team
- **Test:** First send happens at configured time automatically

### For Exports

- **Stock Taking:** Use stock-taking option for physical counts
- **Print HTML:** Press Ctrl+P (or Cmd+P) to print/save as PDF
- **Share CSV:** Email the CSV file to accounting for reconciliation
- **Historical:** Save exports with dates for record keeping

### Storage

- **Email Settings:** Auto-saved to browser - persists across sessions
- **Clear Settings:** Browser data clear will reset email configuration
- **Backup:** Screenshot your recipient list if critical

---

## ❌ Troubleshooting

| Issue                   | Solution                                                       |
| ----------------------- | -------------------------------------------------------------- |
| Email not received      | Set up is for future backend integration - config only for now |
| Invalid email error     | Check email format: abc@domain.com                             |
| Export button missing   | Check user role - ensure you're owner/manager                  |
| Settings not saving     | Enable browser storage; check console for errors               |
| Empty export            | Verify filters don't exclude all items                         |
| CSV won't open in Excel | Try encoding UTF-8; open with Excel for best results           |

---

## 🔄 Workflow Examples

### Daily Manager Briefing

1. Set Daily Email: 07:00 AM, Out-of-Stock, Weekdays
2. Add manager emails as recipients
3. Managers get out-of-stock list every weekday morning

### Monthly Stock Report

1. Click Export → Select "All Stock"
2. Enable "Include Metrics"
3. Choose CSV format
4. Share with finance team for reconciliation

### Physical Inventory Count

1. Click Export → Select "Stock Taking"
2. Print the HTML report
3. Use for physical count verification
4. Compare against report for discrepancies

---

## 📞 Support

**Getting Help:**

- Check the full [INVENTORY_EXPORT_EMAIL_FEATURES.md](./INVENTORY_EXPORT_EMAIL_FEATURES.md) for detailed docs
- Report issues with error messages from browser console
- Email settings configuration is ready; actual sending in Phase 3

**Feedback:**
Share feature requests or improvements with your team lead.

---

**Version:** 1.0 | **Last Updated:** February 9, 2026
