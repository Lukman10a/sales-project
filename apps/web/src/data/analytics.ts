// Daily sales data (Today's hourly breakdown)
export const dailySalesData = [
  { time: "8AM", sales: 45000 },
  { time: "9AM", sales: 78000 },
  { time: "10AM", sales: 125000 },
  { time: "11AM", sales: 98000 },
  { time: "12PM", sales: 145000 },
  { time: "1PM", sales: 88000 },
  { time: "2PM", sales: 112000 },
  { time: "3PM", sales: 165000 },
  { time: "4PM", sales: 134000 },
  { time: "5PM", sales: 189000 },
  { time: "6PM", sales: 156000 },
];

// Weekly sales data
export const weeklySalesData = [
  { time: "Mon", sales: 450000 },
  { time: "Tue", sales: 380000 },
  { time: "Wed", sales: 520000 },
  { time: "Thu", sales: 410000 },
  { time: "Fri", sales: 680000 },
  { time: "Sat", sales: 890000 },
  { time: "Sun", sales: 320000 },
];

// Monthly sales data
export const monthlySalesData = [
  { time: "Week 1", sales: 1250000 },
  { time: "Week 2", sales: 1450000 },
  { time: "Week 3", sales: 1820000 },
  { time: "Week 4", sales: 2130000 },
];

// For analytics page - weekly performance
export const salesData = [
  { day: "Mon", sales: 450000, profit: 95000, revenue: 450000, orders: 32, expenses: 355000 },
  { day: "Tue", sales: 380000, profit: 78000, revenue: 380000, orders: 28, expenses: 302000 },
  { day: "Wed", sales: 520000, profit: 112000, revenue: 520000, orders: 41, expenses: 408000 },
  { day: "Thu", sales: 410000, profit: 88000, revenue: 410000, orders: 35, expenses: 322000 },
  { day: "Fri", sales: 680000, profit: 145000, revenue: 680000, orders: 52, expenses: 535000 },
  { day: "Sat", sales: 890000, profit: 198000, revenue: 890000, orders: 67, expenses: 692000 },
  { day: "Sun", sales: 320000, profit: 68000, revenue: 320000, orders: 24, expenses: 252000 },
];

// Daily data for analytics
export const dailyAnalyticsData = [
  { time: "8AM", sales: 45000, profit: 9500, revenue: 45000, orders: 4, expenses: 35500 },
  { time: "9AM", sales: 78000, profit: 16400, revenue: 78000, orders: 7, expenses: 61600 },
  { time: "10AM", sales: 125000, profit: 26300, revenue: 125000, orders: 11, expenses: 98700 },
  { time: "11AM", sales: 98000, profit: 20600, revenue: 98000, orders: 9, expenses: 77400 },
  { time: "12PM", sales: 145000, profit: 30500, revenue: 145000, orders: 13, expenses: 114500 },
  { time: "1PM", sales: 88000, profit: 18500, revenue: 88000, orders: 8, expenses: 69500 },
  { time: "2PM", sales: 112000, profit: 23500, revenue: 112000, orders: 10, expenses: 88500 },
  { time: "3PM", sales: 165000, profit: 34700, revenue: 165000, orders: 15, expenses: 130300 },
  { time: "4PM", sales: 134000, profit: 28200, revenue: 134000, orders: 12, expenses: 105800 },
  { time: "5PM", sales: 189000, profit: 39700, revenue: 189000, orders: 17, expenses: 149300 },
  { time: "6PM", sales: 156000, profit: 32800, revenue: 156000, orders: 14, expenses: 123200 },
];

// Monthly data for analytics
export const monthlyAnalyticsData = [
  { time: "Week 1", sales: 1250000, profit: 262500, revenue: 1250000, orders: 95, expenses: 987500 },
  { time: "Week 2", sales: 1450000, profit: 304500, revenue: 1450000, orders: 112, expenses: 1145500 },
  { time: "Week 3", sales: 1820000, profit: 382200, revenue: 1820000, orders: 141, expenses: 1437800 },
  { time: "Week 4", sales: 2130000, profit: 447300, revenue: 2130000, orders: 167, expenses: 1682700 },
];

const hourlyData = dailySalesData;

const categoryData = [
  { name: "Phones", value: 45, color: "hsl(160, 60%, 45%)" },
  { name: "Accessories", value: 30, color: "hsl(230, 45%, 50%)" },
  { name: "Gadgets", value: 15, color: "hsl(38, 92%, 50%)" },
  { name: "Others", value: 10, color: "hsl(280, 60%, 55%)" },
];

const topProducts = [
  { name: "Samsung Galaxy A54", sold: 45, revenue: 8325000 },
  { name: "Wireless Earbuds Pro", sold: 89, revenue: 2225000 },
  { name: "iPhone Charger Cable", sold: 156, revenue: 702000 },
  { name: 'Laptop Sleeve 15"', sold: 34, revenue: 408000 },
  { name: "Wireless Mouse", sold: 67, revenue: 502500 },
];

export { hourlyData, categoryData, topProducts };