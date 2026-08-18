"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Language = "en" | "ar";

type TranslateOptions = {
  values?: Record<string, string | number>;
  fallback?: string;
};

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  t: (key: string, options?: TranslateOptions) => string;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  formatCurrency: (
    amount: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const translations: Record<Language, Record<string, string>> = {
  en: {
    "Modern Sales Management": "Modern Sales Management",
    "Made Simple": "Made Simple",
    "Streamline your inventory, track sales, and gain AI-powered insights to grow your business faster than ever before.":
      "Streamline your inventory, track sales, and gain AI-powered insights to grow your business faster than ever before.",
    "Get Started": "Get Started",
    "Learn More": "Learn More",
    "Powerful Features": "Powerful Features",
    "Everything you need to manage your business efficiently":
      "Everything you need to manage your business efficiently",
    "Real-time Analytics": "Real-time Analytics",
    "Track your sales, inventory, and business metrics in real-time":
      "Track your sales, inventory, and business metrics in real-time",
    "AI-Powered Insights": "AI-Powered Insights",
    "Get intelligent recommendations to optimize your business":
      "Get intelligent recommendations to optimize your business",
    "Inventory Management": "Inventory Management",
    "Keep track of stock levels and get low-stock alerts":
      "Keep track of stock levels and get low-stock alerts",
    "Fast & Responsive": "Fast & Responsive",
    "Lightning-fast performance for smooth experience":
      "Lightning-fast performance for smooth experience",
    "Secure & Reliable": "Secure & Reliable",
    "Enterprise-grade security to protect your data":
      "Enterprise-grade security to protect your data",
    "Team Collaboration": "Team Collaboration",
    "Invite team members and manage roles easily":
      "Invite team members and manage roles easily",
    "Active Users": "Active Users",
    Uptime: "Uptime",
    Support: "Support",
    "Ready to Transform Your Business?": "Ready to Transform Your Business?",
    "Join thousands of businesses using LUXA to manage sales and inventory efficiently.":
      "Join thousands of businesses using LUXA to manage sales and inventory efficiently.",
    "Start Free Trial": "Start Free Trial",
    "Profile Picture": "Profile Picture",
    "Change Photo": "Change Photo",
    "JPG, PNG or GIF (max 2MB)": "JPG, PNG or GIF (max 2MB)",
    "Appearance Settings": "Appearance Settings",
    "Customize the app appearance and theme":
      "Customize the app appearance and theme",
    Theme: "Theme",
    Light: "Light",
    Dark: "Dark",
    Auto: "Auto",
    Language: "Language",
    "Profit Updates": "Profit Updates",
    "Get notified about your monthly earnings":
      "Get notified about your monthly earnings",
    "Withdrawal Status": "Withdrawal Status",
    "Updates on your withdrawal requests":
      "Updates on your withdrawal requests",
    "AI Insights": "AI Insights",
    "Investment recommendations and analysis":
      "Investment recommendations and analysis",
    "Business Updates": "Business Updates",
    "Important business announcements": "Important business announcements",
    "Product Additions": "Product Additions",
    "Owner added new items to sell": "Owner added new items to sell",
    "Price Updates": "Price Updates",
    "Pricing changes for products": "Pricing changes for products",
    "Stock Discrepancies": "Stock Discrepancies",
    "Alerts for inventory mismatches": "Alerts for inventory mismatches",
    "Sales Targets": "Sales Targets",
    "Your weekly sales performance": "Your weekly sales performance",
  },
  ar: {
    "Modern Sales Management": "إدارة المبيعات الحديثة",
    "Made Simple": "مبسطة وسهلة",
    "Streamline your inventory, track sales, and gain AI-powered insights to grow your business faster than ever before.":
      "قم بتبسيط مخزونك وتتبع المبيعات والحصول على رؤى مدعومة بالذكاء الاصطناعي لتنمية عملك بشكل أسرع من أي وقت مضى.",
    "Get Started": "ابدأ الآن",
    "Learn More": "تعرف على المزيد",
    "Powerful Features": "ميزات قوية",
    "Everything you need to manage your business efficiently":
      "كل ما تحتاجه لإدارة عملك بكفاءة",
    "Real-time Analytics": "تحليلات فورية",
    "Track your sales, inventory, and business metrics in real-time":
      "تتبع مبيعاتك والمخزون والمقاييس التجارية في الوقت الفعلي",
    "AI-Powered Insights": "رؤى مدعومة بالذكاء الاصطناعي",
    "Get intelligent recommendations to optimize your business":
      "احصل على توصيات ذكية لتحسين عملك",
    "Inventory Management": "إدارة المخزون",
    "Keep track of stock levels and get low-stock alerts":
      "تتبع مستويات المخزون والحصول على تنبيهات انخفاض المخزون",
    "Fast & Responsive": "سريع وفعال",
    "Lightning-fast performance for smooth experience":
      "أداء سريع البرق لتجربة سلسة",
    "Secure & Reliable": "آمن وموثوق",
    "Enterprise-grade security to protect your data":
      "أمان من المستوى الإنترنتي لحماية بياناتك",
    "Team Collaboration": "التعاون الفريقي",
    "Invite team members and manage roles easily":
      "ادعُ أعضاء الفريق وأدر الأدوار بسهولة",
    "Active Users": "المستخدمون النشطون",
    Uptime: "وقت التشغيل",
    Support: "الدعم",
    "Ready to Transform Your Business?": "هل أنت مستعد لتحويل عملك؟",
    "Join thousands of businesses using LUXA to manage sales and inventory efficiently.":
      "انضم إلى آلاف الشركات التي تستخدم LUXA لإدارة المبيعات والمخزون بكفاءة.",
    "Start Free Trial": "ابدأ النسخة التجريبية المجانية",
    StockFlow: "ستوك فلو",
    "Sales & Inventory": "المبيعات والمخزون",
    Dashboard: "لوحة التحكم",
    Inventory: "المخزون",
    Sales: "المبيعات",
    Analytics: "التحليلات",
    Notifications: "الإشعارات",
    "AI Insights": "تحليلات الذكاء الاصطناعي",
    Settings: "الإعدادات",
    Logout: "تسجيل الخروج",
    Owner: "المالك",
    Admin: "المشرف",
    User: "مستخدم",
    "Search inventory, sales, reports...":
      "ابحث في المخزون والمبيعات والتقارير...",
    "Welcome back, {name}!": "مرحباً بعودتك، {name}!",
    "Here's what's happening with your business today.":
      "إليك ما يحدث في عملك اليوم.",
    "Today's Sales": "مبيعات اليوم",
    "Items Sold": "العناصر المباعة",
    "In Stock": "متوفر",
    "Low Stock Alerts": "تنبيهات انخفاض المخزون",
    "vs yesterday": "مقارنة بالأمس",
    "from last week": "مقارنة بالأسبوع الماضي",
    "need attention": "بحاجة للانتباه",
    "Add New Item": "إضافة منتج جديد",
    "Add products to inventory": "إضافة منتجات إلى المخزون",
    "Record Sale": "تسجيل عملية بيع",
    "Log a new transaction": "تسجيل عملية جديدة",
    "View Reports": "عرض التقارير",
    "Check analytics & insights": "عرض التحليلات والرؤى",
    "Stock Check": "فحص المخزون",
    "Verify inventory levels": "التحقق من مستويات المخزون",
    "Hourly breakdown": "توزيع حسب الساعة",
    Today: "اليوم",
    Week: "الأسبوع",
    Month: "الشهر",
    "Recent Sales": "آخر المبيعات",
    "Last {count} transactions": "آخر {count} معاملات",
    "View All": "عرض الكل",
    "by {name}": "بواسطة {name}",
    "Inventory Alerts": "تنبيهات المخزون",
    "{count} items need attention": "{count} عناصر تحتاج إلى الانتباه",
    "All items are in good stock": "جميع العناصر في حالة جيدة",
    "{quantity} remaining": "متبقي {quantity}",
    "Out of Stock": "غير متوفر",
    "Low Stock": "مخزون منخفض",
    Critical: "حرج",
    "Smart recommendations for your business": "توصيات ذكية لعملك",
    "Restock iPhone Chargers": "إعادة تخزين شواحن آيفون",
    "Based on sales velocity, you'll run out in 2 days. Order now to maintain stock.":
      "بناءً على سرعة المبيعات، سينفد المخزون خلال يومين. اطلب الآن للحفاظ على التوفر.",
    "Order Now": "اطلب الآن",
    "Wireless Earbuds are Hot!": "سماعات الأذن اللاسلكية رائجة!",
    "Sales up 45% this week. Consider increasing stock and promoting.":
      "المبيعات ارتفعت بنسبة 45٪ هذا الأسبوع. فكر في زيادة المخزون والترويج.",
    "View Details": "عرض التفاصيل",
    "Slow Moving: Laptop Sleeves": "بطيئة الحركة: حافظات اللابتوب",
    "Only 2 sold in 30 days. Consider price reduction or bundle deals.":
      "تم بيع قطعتين فقط خلال 30 يوماً. فكر في خفض السعر أو عروض الباقات.",
    "Adjust Pricing": "تعديل الأسعار",
    "Manage your products and stock levels": "إدارة منتجاتك ومستويات المخزون",
    "Search items...": "ابحث عن العناصر...",
    "Total Items": "إجمالي العناصر",
    "Qty Available": "الكمية المتاحة",
    Sold: "المباع",
    "Cost Price": "سعر التكلفة",
    "Selling Price": "سعر البيع",
    Item: "العنصر",
    Status: "الحالة",
    Qty: "الكمية",
    Cost: "التكلفة",
    Price: "السعر",
    Actions: "الإجراءات",
    "Pending confirmation": "في انتظار التأكيد",
    "Confirm Receipt": "تأكيد الاستلام",
    Edit: "تعديل",
    Sell: "بيع",
    Confirm: "تأكيد",
    "Add Item": "إضافة عنصر",
    Cancel: "إلغاء",
    "Item Name": "اسم العنصر",
    "Image URL (optional)": "رابط الصورة (اختياري)",
    "e.g. Bluetooth Speaker": "مثال: مكبر صوت بلوتوث",
    "Cost Price (NGN)": "سعر التكلفة (نايرا)",
    "Selling Price (NGN)": "سعر البيع (نايرا)",
    Quantity: "الكمية",
    "Select status": "اختر الحالة",
    "Please enter an item name": "يرجى إدخال اسم العنصر",
    "Item added successfully": "تمت إضافة العنصر بنجاح",
    "Select items and record transactions": "اختر العناصر وسجل المعاملات",
    "Search products...": "ابحث عن المنتجات...",
    "Current Sale": "البيع الحالي",
    item: "عنصر",
    items: "عناصر",
    available: "متاح",
    "Click on products to add them to the sale":
      "اضغط على المنتجات لإضافتها إلى عملية البيع",
    "Enter your email": "أدخل بريدك الإلكتروني",
    "Enter your password": "أدخل كلمة المرور",
    "Actual Price": "السعر الفعلي",
    Subtotal: "المجموع الفرعي",
    Total: "الإجمالي",
    "Complete Sale": "إتمام البيع",
    "Cart is empty": "السلة فارغة",
    "Insufficient stock for {name}": "المخزون غير كافٍ لـ {name}",
    "Sale completed": "تم إتمام البيع",
    "Total {amount}": "الإجمالي {amount}",
    "Track your business performance and insights": "تتبع أداء عملك والرؤى",
    "Pick date": "اختر التاريخ",
    "Total Revenue": "إجمالي الإيرادات",
    "Net Profit": "صافي الربح",
    "Total Orders": "إجمالي الطلبات",
    "Avg Order Value": "متوسط قيمة الطلب",
    "Weekly Performance": "الأداء الأسبوعي",
    "Hourly Sales Trend": "اتجاه المبيعات حسب الساعة",
    "Sales by Category": "المبيعات حسب الفئة",
    "Top Performing Products": "أفضل المنتجات أداءً",
    Profit: "الربح",
    "units sold": "وحدات مباعة",
    revenue: "إيرادات",
    "Smart recommendations powered by your sales data":
      "توصيات ذكية مستندة إلى بيانات مبيعاتك",
    "Refresh Insights": "تحديث التوصيات",
    "High Priority": "أولوية عالية",
    Medium: "متوسط",
    Low: "منخفض",
    "Actions needed": "إجراءات مطلوبة",
    "Potential Gain": "العائد المحتمل",
    "Monthly opportunity": "فرصة شهرية",
    "AI Accuracy": "دقة الذكاء الاصطناعي",
    "Prediction rate": "معدل التنبؤ",
    Impact: "التأثير",
    "Current Stock": "المخزون الحالي",
    "Daily Sales Avg": "متوسط المبيعات اليومي",
    "Days Until Stockout": "أيام حتى نفاد المخزون",
    "This Week": "هذا الأسبوع",
    "Last Week": "الأسبوع الماضي",
    Growth: "النمو",
    "Current Price": "السعر الحالي",
    "Suggested Price": "السعر المقترح",
    "Profit Increase": "زيادة الربح",
    "Related Purchases": "مشتريات مرتبطة",
    "Avg Margin": "متوسط الهامش",
    "Est. Weekly Sales": "المبيعات الأسبوعية المتوقعة",
    Phones: "الهواتف",
    Accessories: "الإكسسوارات",
    Gadgets: "الأجهزة",
    Others: "أخرى",
    "Stay updated with your business activities": "ابقَ على اطلاع بأنشطة عملك",
    "Mark all as read": "تحديد الكل كمقروء",
    All: "الكل",
    Unread: "غير مقروء",
    "All caught up!": "انتهيت من كل شيء!",
    "No unread notifications at the moment.":
      "لا توجد إشعارات غير مقروءة حالياً.",
    "No notifications at the moment.": "لا توجد إشعارات حالياً.",
    "Mark as read": "وضع علامة كمقروء",
    "Take Action": "اتخاذ إجراء",
    "Manage your account and preferences": "إدارة حسابك وتفضيلاتك",
    "Profile Settings": "إعدادات الملف الشخصي",
    "Manage your account information": "إدارة معلومات حسابك",
    "Configure alert preferences": "تكوين تفضيلات التنبيه",
    "Password and authentication": "كلمة المرور والمصادقة",
    Appearance: "المظهر",
    "Customize the app look": "تخصيص مظهر التطبيق",
    "Data & Backup": "البيانات والنسخ الاحتياطي",
    "Export and backup options": "خيارات التصدير والنسخ الاحتياطي",
    "Help & Support": "المساعدة والدعم",
    "Get help and documentation": "الحصول على المساعدة والوثائق",
    "Staff & Invitations": "الموظفون والدعوات",
    "Invite and manage your staff": "دعوة وإدارة موظفيك",
    "Update your personal information": "تحديث معلوماتك الشخصية",
    "First Name": "الاسم الأول",
    "Last Name": "اسم العائلة",
    Email: "البريد الإلكتروني",
    Password: "كلمة المرور",
    "Phone Number": "رقم الهاتف",
    "Business Name": "اسم العمل",
    "Save Changes": "حفظ التغييرات",
    "Notification Preferences": "تفضيلات الإشعارات",
    "Choose what notifications you receive": "اختر الإشعارات التي تستلمها",
    "Sales Alerts": "تنبيهات المبيعات",
    "Get notified when a sale is recorded": "استلم تنبيهاً عند تسجيل بيع",
    "Low Stock Warnings": "تحذيرات انخفاض المخزون",
    "Alert when items are running low": "تنبيه عند انخفاض المخزون",
    "Discrepancy Alerts": "تنبيهات التفاوت",
    "Immediate alert for stock mismatches": "تنبيه فوري لعدم تطابق المخزون",
    "Receive smart business recommendations": "استلم توصيات ذكية لعملك",
    "Daily Summary": "ملخص يومي",
    "End of day sales summary": "ملخص المبيعات نهاية اليوم",
    "Security Settings": "إعدادات الأمان",
    "Manage your password and security options":
      "إدارة كلمة المرور وخيارات الأمان",
    "Current Password": "كلمة المرور الحالية",
    "New Password": "كلمة المرور الجديدة",
    "Confirm Password": "تأكيد كلمة المرور",
    "Update Password": "تحديث كلمة المرور",
    "Invite team members to help manage your store":
      "دعوة أعضاء الفريق للمساعدة في إدارة متجرك",
    "Full Name": "الاسم الكامل",
    "Enter full name": "أدخل الاسم الكامل",
    "Remember me": "تذكرني",
    "Forgot password?": "هل نسيت كلمة المرور؟",
    "Sign In": "تسجيل الدخول",
    "Signing in...": "جاري تسجيل الدخول...",
    "Login as": "تسجيل الدخول كـ",
    "Demo Credentials:": "بيانات الدخول للتجربة:",
    "Owner:": "المالك:",
    "Admin:": "المشرف:",
    "Name and email are required": "الاسم والبريد الإلكتروني مطلوبان",
    "Enter a valid email": "أدخل بريداً إلكترونياً صالحاً",
    "Send Invite": "إرسال دعوة",
    "Only owners can invite staff. Contact your owner to get access.":
      "يمكن للمالكين فقط دعوة الموظفين. تواصل مع المالك للحصول على صلاحية.",
    Active: "نشط",
    Invited: "مدعو",
    "No staff members yet. Invite your first admin to get started.":
      "لا يوجد أعضاء فريق بعد. قم بدعوة أول مشرف للبدء.",
    "This section will be available soon.": "سيكون هذا القسم متاحاً قريباً.",
    "Loading your workspace...": "جاري تحميل مساحة العمل...",
    "Login failed. Please try again.": "فشل تسجيل الدخول. حاول مرة أخرى.",
    "Invalid email or password": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "You don't have owner access": "ليست لديك صلاحية مالك",
    "You don't have apprentice access": "ليست لديك صلاحية مشرف",
    "Welcome to LUXA": "مرحباً بكم في لوكسا",
    "Sign in to manage your business": "سجل الدخول لإدارة عملك",
    "All rights reserved.": "جميع الحقوق محفوظة.",
    "Insufficient stock": "المخزون غير كافٍ",
    "just now": "الآن",
    completed: "مكتمل",
    pending: "قيد الانتظار",
    "5 mins ago": "قبل 5 دقائق",
    "2 mins ago": "قبل دقيقتين",
    "15 mins ago": "قبل 15 دقيقة",
    "32 mins ago": "قبل 32 دقيقة",
    "1 hour ago": "قبل ساعة",
    "2 hours ago": "قبل ساعتين",
    "3 hours ago": "قبل 3 ساعات",
    "5 hours ago": "قبل 5 ساعات",
    "Urgent: Restock iPhone Chargers": "عاجل: إعادة تخزين شواحن آيفون",
    "Based on current sales velocity of 8 units/day, you'll run out of USB-C Fast Chargers in approximately 2 days. Historical data shows stockouts result in 15% customer loss.":
      "استناداً إلى سرعة المبيعات الحالية البالغة 8 وحدات يومياً، سينفد مخزون شواحن USB-C السريعة خلال يومين تقريباً. تظهر البيانات أن نفاد المخزون يؤدي إلى خسارة 15٪ من العملاء.",
    "Potential revenue loss: ₦96,000/day":
      "خسارة الإيرادات المحتملة: ₦96,000 يومياً",
    "Order 50 units now": "اطلب 50 وحدة الآن",
    "Wireless Earbuds are Trending!": "سماعات الأذن اللاسلكية تشهد رواجاً!",
    "Sales of Wireless Earbuds Pro have increased by 45% this week compared to last week. This product is outperforming all other accessories.":
      "ارتفعت مبيعات سماعات الأذن اللاسلكية برو بنسبة 45٪ هذا الأسبوع مقارنة بالأسبوع الماضي. هذا المنتج يتفوق على بقية الإكسسوارات.",
    "Additional profit opportunity: ₦125,000/week":
      "فرصة ربح إضافية: ₦125,000 أسبوعياً",
    "Increase stock by 50%": "زيادة المخزون بنسبة 50٪",
    'Laptop Sleeve 15" has only sold 2 units in the last 30 days. Current inventory of 22 units will take approximately 11 months to sell at this rate.':
      "لم يتم بيع سوى قطعتين من حافظة اللابتوب 15 بوصة خلال آخر 30 يوماً. المخزون الحالي البالغ 22 قطعة سيستغرق حوالي 11 شهراً للبيع بهذا المعدل.",
    "Capital locked: ₦154,000": "رأس مال مجمد: ₦154,000",
    "Consider 20% discount": "فكر في خصم 20٪",
    "Price Optimization Opportunity": "فرصة تحسين الأسعار",
    "Samsung Galaxy A54 is selling faster than average. Market analysis suggests you can increase the price by ₦5,000 without affecting demand.":
      "هاتف سامسونج جالاكسي A54 يُباع أسرع من المتوسط. تشير تحليلات السوق إلى إمكانية زيادة السعر بمقدار ₦5,000 دون التأثير على الطلب.",
    "Additional profit: ₦60,000/month": "ربح إضافي: ₦60,000 شهرياً",
    "Update pricing": "تحديث الأسعار",
    "New Product Suggestion": "اقتراح منتج جديد",
    "Based on customer purchase patterns, customers buying phones often look for screen protectors. Consider adding tempered glass protectors to your inventory.":
      "استناداً إلى أنماط الشراء، يبحث عملاء الهواتف غالباً عن واقيات الشاشة. فكر في إضافة واقيات زجاجية إلى مخزونك.",
    "Estimated additional revenue: ₦45,000/week":
      "إيراد إضافي متوقع: ₦45,000 أسبوعياً",
    "Add to inventory": "أضف إلى المخزون",
    "New Items Added": "تمت إضافة عناصر جديدة",
    "Ahmed added 20 units of iPhone 15 Pro Max Cases to inventory. Please confirm receipt.":
      "أضاف أحمد 20 قطعة من أغطية iPhone 15 Pro Max إلى المخزون. يرجى تأكيد الاستلام.",
    "Stock Discrepancy Detected": "تم اكتشاف تفاوت في المخزون",
    "Expected 12 Wireless Mouse units but system shows 8. Please verify physical count.":
      "المتوقع 12 وحدة من الفأرة اللاسلكية لكن النظام يظهر 8 فقط. يرجى التحقق من العدد الفعلي.",
    "Large Sale Recorded": "تم تسجيل عملية بيع كبيرة",
    "Ibrahim sold Samsung Galaxy A54 for ₦185,000. Transaction completed successfully.":
      "قام إبراهيم ببيع سامسونج جالاكسي A54 بسعر ₦185,000. اكتملت العملية بنجاح.",
    "Restock Recommendation": "توصية بإعادة التخزين",
    "USB-C Fast Chargers are selling fast. Consider restocking within 48 hours to avoid stockout.":
      "تُباع شواحن USB-C السريعة بسرعة. فكر في إعادة التخزين خلال 48 ساعة لتجنب نفاد المخزون.",
    "Low Stock Warning": "تحذير انخفاض المخزون",
    "iPhone 15 Pro Max Case has only 2 units left. Reorder to maintain stock levels.":
      "بقيت قطعتان فقط من غطاء iPhone 15 Pro Max. أعد الطلب للحفاظ على مستويات المخزون.",
    "Daily Sales Summary": "ملخص المبيعات اليومي",
    "Total sales for today: ₦892,400 with 47 items sold. Profit margin: 24.8%.":
      "إجمالي مبيعات اليوم: ₦892,400 مع بيع 47 عنصراً. هامش الربح: 24.8٪.",
    "Price Optimization": "تحسين السعر",
    "Wireless Earbuds Pro are trending. Consider a slight price increase to maximize profits.":
      "سماعات الأذن اللاسلكية برو رائجة. فكر في زيادة طفيفة في السعر لتعظيم الأرباح.",
    "Investor Profile Not Found": "لم يتم العثور على ملف المستثمر",
    "Please contact support": "يرجى الاتصال بالدعم",
    "Investment Dashboard": "لوحة تحكم الاستثمار",
    "Track your investment performance and earnings":
      "تتبع أداء استثمارك وأرباحك",
    "Investment Amount": "مبلغ الاستثمار",
    "Initial capital invested": "رأس المال الأولي المستثمر",
    Ownership: "نسبة الملكية",
    "{value} of business equity": "{value} من ملكية العمل",
    "Total Profit Accrued": "إجمالي الأرباح المتراكمة",
    "Cumulative profit earned": "الأرباح المتراكمة المكتسبة",
    "Investment Date": "تاريخ الاستثمار",
    "When you invested": "تاريخ استثمارك",
    "Profit Summary": "ملخص الأرباح",
    "ROI Percentage": "نسبة العائد على الاستثمار",
    "Break-even Reached!": "تم تحقيق نقطة التعادل!",
    "Break-even Status": "حالة التعادل",
    "Recovery in progress": "جاري استرداد رأس المال",
    "Still to recover": "المتبقي للاسترداد",
    "Your Total Earnings": "إجمالي أرباحك",
    "{share} share": "حصة {share}",
    "Withdrawal Requests": "طلبات السحب",
    "{count} pending": "{count} قيد الانتظار",
    "Your profit withdrawal history": "سجل سحب أرباحك",
    "No withdrawal records yet": "لا توجد سجلات سحب بعد",
    Pending: "قيد الانتظار",
    Approved: "مقبول",
    Completed: "مكتمل",
    "Profit Trend": "اتجاه الأرباح",
    "Monthly breakdown of total profit and your share":
      "تفصيل شهري لإجمالي الأرباح وحصتك",
    "Average Monthly": "المتوسط الشهري",
    "Highest Month": "أعلى شهر",
    "Total 4-Month": "إجمالي الأربعة أشهر",
    "Your Share": "حصتك",
    "AI Investment Insights": "رؤى استثمارية مدعومة بالذكاء الاصطناعي",
    "Data-driven analysis of your investment performance":
      "تحليل قائم على البيانات لأداء استثمارك",
    "{count} High Priority Insights": "{count} من الرؤى ذات الأولوية العالية",
    "Medium Priority": "أولوية متوسطة",
    "Low Priority": "أولوية منخفضة",
    IMPACT: "التأثير",
    "RECOMMENDED ACTION": "الإجراء الموصى به",
    "AI Analysis Complete": "تم إكمال تحليل الذكاء الاصطناعي",
    "These insights are generated based on your investment data, business financials, and market trends. Review regularly for optimal returns.":
      "تم إنشاء هذه الرؤى بناءً على بيانات استثمارك والبيانات المالية للأعمال واتجاهات السوق. راجعها بانتظام لتحقيق أفضل عائد.",
    "Total Profit": "إجمالي الأرباح",
    "Profile Picture": "صورة الملف الشخصي",
    "Change Photo": "تغيير الصورة",
    "JPG, PNG or GIF (max 2MB)": "JPG أو PNG أو GIF (بحد أقصى 2 ميجابايت)",
    "Appearance Settings": "إعدادات المظهر",
    "Customize the app appearance and theme": "خصص مظهر التطبيق والمظهر",
    Theme: "المظهر",
    Light: "فاتح",
    Dark: "داكن",
    Auto: "تلقائي",
    Language: "اللغة",
    "Profit Updates": "تحديثات الأرباح",
    "Get notified about your monthly earnings":
      "احصل على إشعارات حول أرباحك الشهرية",
    "Withdrawal Status": "حالة الانسحاب",
    "Updates on your withdrawal requests": "تحديثات حول طلبات السحب الخاصة بك",
    "Investment recommendations and analysis": "توصيات الاستثمار والتحليل",
    "Business Updates": "تحديثات الأعمال",
    "Important business announcements": "إعلانات الأعمال المهمة",
    "Product Additions": "إضافة منتجات",
    "Owner added new items to sell": "أضاف المالك عناصر جديدة للبيع",
    "Price Updates": "تحديثات الأسعار",
    "Pricing changes for products": "تغييرات الأسعار للمنتجات",
    "Stock Discrepancies": "تناقضات المخزون",
    "Alerts for inventory mismatches": "تنبيهات عدم تطابق المخزون",
    "Sales Targets": "أهداف المبيعات",
    "Your weekly sales performance": "أداء مبيعاتك الأسبوعية",
  },
};

const LANGUAGE_STORAGE_KEY = "luxa_language";

const interpolate = (
  template: string,
  values?: Record<string, string | number>,
) => {
  if (!values) return template;
  return template.replace(/\{(.*?)\}/g, (_, key) => {
    const replacement = values[key];
    return replacement !== undefined ? String(replacement) : "";
  });
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(
      LANGUAGE_STORAGE_KEY,
    ) as Language | null;
    if (stored === "en" || stored === "ar") {
      setLanguage(stored);
    }
  }, []);

  const isRTL = language === "ar";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", isRTL);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language, isRTL]);

  const formatCurrency = useMemo(() => {
    return (
      amount: number,
      options: Intl.NumberFormatOptions = { minimumFractionDigits: 0 },
    ) => {
      const locale = language === "ar" ? "ar-EG" : "en-NG";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "NGN",
        ...options,
      }).format(amount);
    };
  }, [language]);

  const t = React.useCallback(
    (key: string, options?: TranslateOptions) => {
      const template =
        translations[language][key] ??
        translations.en[key as keyof typeof translations.en] ??
        options?.fallback ??
        key;
      return interpolate(template, options?.values);
    },
    [language],
  );

  const toggleLanguage = React.useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  }, []);

  const value = React.useMemo(
    () => ({
      language,
      isRTL,
      t,
      setLanguage,
      toggleLanguage,
      formatCurrency,
    }),
    [language, isRTL, t, formatCurrency, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}


