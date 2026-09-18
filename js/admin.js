// ============================================
// Medix - Admin Panel
// ============================================
// ============================================
const Store = window.Store;

// ===== UTILS =====
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Settings History for Undo/Redo
let settingsHistory = [];
let settingsHistoryIndex = -1;

// ===== i18n =====
const translations = {
  ar: {
    'admin.login': 'تسجيل الدخول',
    'admin.password': 'كلمة المرور',
    'admin.loginBtn': 'دخول',
    'admin.wrongPassword': 'كلمة المرور غير صحيحة',
    'admin.dashboard': 'لوحة التحكم',
    'admin.products': 'المنتجات',
    'admin.categories': 'التصنيفات',
    'admin.orders': 'الطلبات',
    'admin.settings': 'الإعدادات',
    'admin.reviews': 'التقييمات',
    'admin.logout': 'تسجيل الخروج',
    'admin.totalProducts': 'إجمالي المنتجات',
    'admin.totalOrders': 'إجمالي الطلبات',
    'admin.revenue': 'الإيرادات',
    'admin.pendingOrders': 'طلبات معلقة',
    'admin.addProduct': 'إضافة منتج',
    'admin.editProduct': 'تعديل المنتج',
    'admin.deleteProduct': 'حذف المنتج',
    'admin.confirmDelete': 'هل أنت متأكد من الحذف؟',
    'admin.confirmDeleteDesc': 'لا يمكن التراجع عن هذا الإجراء.',
    'admin.productName_ar': 'اسم المنتج (عربي)',
    'admin.productName_en': 'اسم المنتج (إنجليزي)',
    'admin.description_ar': 'الوصف (عربي)',
    'admin.description_en': 'الوصف (إنجليزي)',
    'admin.price': 'السعر',
    'admin.discount': 'نسبة الخصم %',
    'admin.category': 'التصنيف',
    'admin.stock': 'المخزون',
    'admin.images': 'صور المنتج (روابط)',
    'admin.featured': 'منتج مميز',
    'admin.status': 'الحالة',
    'admin.addCategory': 'إضافة تصنيف',
    'admin.editCategory': 'تعديل التصنيف',
    'admin.categoryName_ar': 'اسم التصنيف (عربي)',
    'admin.categoryName_en': 'اسم التصنيف (إنجليزي)',
    'admin.icon': 'الأيقونة',
    'admin.order': 'الترتيب',
    'admin.orderNumber': 'رقم الطلب',
    'admin.customer': 'العميل',
    'admin.phone': 'الهاتف',
    'admin.address': 'العنوان',
    'admin.total': 'الإجمالي',
    'admin.date': 'التاريخ',
    'admin.updateStatus': 'تحديث الحالة',
    'admin.viewDetails': 'عرض التفاصيل',
    'admin.storeName': 'اسم المتجر',
    'admin.subtitle': 'العنوان الفرعي',
    'admin.fontHeading': 'خط العناوين',
    'admin.fontBody': 'خط النصوص',
    'admin.accentColor': 'اللون الأساسي',
    'admin.contactPhone': 'رقم الهاتف',
    'admin.contactWhatsapp': 'رقم الواتساب',
    'admin.contactEmail': 'البريد الإلكتروني',
    'admin.shippingCost': 'تكلفة الشحن',
    'admin.freeShippingThreshold': 'حد الشحن المجاني',
    'admin.saveSettings': 'حفظ الإعدادات',
    'admin.approve': 'موافقة',
    'admin.pending': 'معلق',
    'admin.approved': 'تم الموافقة',
    'admin.storeIdentity': 'هوية المتجر',
    'admin.typography': 'الخطوط',
    'admin.colors': 'الألوان',
    'admin.contactInfo': 'معلومات التواصل',
    'admin.shippingSettings': 'إعدادات الشحن',
    'admin.subtitleAr': 'العنوان الفرعي (عربي)',
    'admin.subtitleEn': 'العنوان الفرعي (إنجليزي)',
    'admin.aboutAr': 'عن المتجر (عربي)',
    'admin.aboutEn': 'عن المتجر (إنجليزي)',
    'admin.fontArHeading': 'خط العناوين العربي',
    'admin.fontArBody': 'خط النصوص العربي',
    'admin.addressAr': 'العنوان (عربي)',
    'admin.addressEn': 'العنوان (إنجليزي)',
    'admin.livePreview': 'معاينة مباشرة',
    'admin.headingSample': 'نص عنوان تجريبي',
    'admin.bodySample': 'هذا نص تجريبي لمعاينة الخط المختار. يمكنك رؤية كيف سيبدو الخط في المتجر.',
    'admin.recentOrders': 'أحدث الطلبات',
    'admin.quickActions': 'إجراءات سريعة',
    'admin.viewAllOrders': 'عرض كل الطلبات',
    'admin.backToStore': 'العودة للمتجر',
    'admin.product': 'المنتج',
    'admin.rating': 'التقييم',
    'admin.comment': 'التعليق',
    'admin.noReviews': 'لا توجد تقييمات',
    'admin.noProducts': 'لا توجد منتجات',
    'admin.noCategories': 'لا توجد تصنيفات',
    'admin.noOrders': 'لا توجد طلبات',
    'admin.selectCategory': 'اختر التصنيف',
    'admin.all': 'الكل',
    'admin.new': 'جديد',
    'admin.confirmed': 'مؤكد',
    'admin.preparing': 'قيد التحضير',
    'admin.shipping': 'قيد الشحن',
    'admin.delivered': 'تم التوصيل',
    'admin.cancelled': 'ملغي',
    'admin.orderDetails': 'تفاصيل الطلب',
    'admin.customerInfo': 'معلومات العميل',
    'admin.orderItems': 'عناصر الطلب',
    'admin.subtotal': 'المجموع الفرعي',
    'admin.shippingFee': 'رسوم الشحن',
    'admin.grandTotal': 'الإجمالي',
    'admin.notes': 'ملاحظات',
    'admin.messageOnWhatsapp': 'مراسلة واتساب',
    'admin.city': 'المدينة',
    'admin.email': 'البريد',
    'admin.qty': 'الكمية',
    'admin.unitPrice': 'سعر الوحدة',
    'admin.free': 'مجاني',
    'admin.imageUrls': 'أدخل رابط صورة واحد في كل سطر',
    'admin.active': 'نشط',
    'admin.inactive': 'غير نشط',
    'admin.name': 'الاسم',
    'admin.productCount': 'عدد المنتجات',
    'admin.deleteCategory': 'حذف التصنيف',
    'admin.deleteReview': 'حذف التقييم',
    'admin.settingsSaved': 'تم حفظ الإعدادات بنجاح',
    'admin.productSaved': 'تم حفظ المنتج بنجاح',
    'admin.productDeleted': 'تم حذف المنتج',
    'admin.categorySaved': 'تم حفظ التصنيف بنجاح',
    'admin.categoryDeleted': 'تم حذف التصنيف',
    'admin.orderUpdated': 'تم تحديث حالة الطلب',
    'admin.reviewApproved': 'تم الموافقة على التقييم',
    'admin.reviewDeleted': 'تم حذف التقييم',
    'admin.fillRequired': 'يرجى ملء جميع الحقول المطلوبة',
    'admin.currency': 'ج.م',
    'admin.adminPanel': 'لوحة التحكم',
    'admin.welcomeBack': 'مرحباً بك مجدداً',
    'admin.loginSubtitle': 'أدخل كلمة المرور للدخول إلى لوحة التحكم',
    'admin.deleteOrder': 'حذف الطلب',
    'admin.orderDeleted': 'تم حذف الطلب',
    'admin.coupons': 'الكوبونات',
    'admin.addCoupon': 'إضافة كوبون',
    'admin.editCoupon': 'تعديل الكوبون',
    'admin.code': 'كود الخصم',
    'admin.discountType': 'نوع الخصم',
    'admin.discountValue': 'قيمة الخصم',
    'admin.percentage': 'نسبة مئوية (%)',
    'admin.fixed': 'مبلغ ثابت',
    'admin.minOrderAmount': 'الحد الأدنى للطلب',
    'admin.expiryDate': 'تاريخ الانتهاء',
    'admin.deleteCoupon': 'حذف الكوبون',
    'admin.couponSaved': 'تم حفظ الكوبون',
    'admin.couponDeleted': 'تم حذف الكوبون',
    'admin.noCoupons': 'لا توجد كوبونات',
    'admin.couponDiscount': 'خصم الكوبون'
  },
  en: {
    'admin.login': 'Admin Login',
    'admin.password': 'Password',
    'admin.loginBtn': 'Log In',
    'admin.wrongPassword': 'Wrong password',
    'admin.dashboard': 'Dashboard',
    'admin.products': 'Products',
    'admin.categories': 'Categories',
    'admin.orders': 'Orders',
    'admin.settings': 'Settings',
    'admin.reviews': 'Reviews',
    'admin.logout': 'Logout',
    'admin.totalProducts': 'Total Products',
    'admin.totalOrders': 'Total Orders',
    'admin.revenue': 'Revenue',
    'admin.pendingOrders': 'Pending Orders',
    'admin.addProduct': 'Add Product',
    'admin.editProduct': 'Edit Product',
    'admin.deleteProduct': 'Delete Product',
    'admin.confirmDelete': 'Are you sure you want to delete?',
    'admin.confirmDeleteDesc': 'This action cannot be undone.',
    'admin.productName_ar': 'Product Name (Arabic)',
    'admin.productName_en': 'Product Name (English)',
    'admin.description_ar': 'Description (Arabic)',
    'admin.description_en': 'Description (English)',
    'admin.price': 'Price',
    'admin.discount': 'Discount %',
    'admin.category': 'Category',
    'admin.stock': 'Stock',
    'admin.images': 'Product Images (URLs)',
    'admin.featured': 'Featured',
    'admin.status': 'Status',
    'admin.addCategory': 'Add Category',
    'admin.editCategory': 'Edit Category',
    'admin.categoryName_ar': 'Category Name (Arabic)',
    'admin.categoryName_en': 'Category Name (English)',
    'admin.icon': 'Icon',
    'admin.order': 'Order',
    'admin.orderNumber': 'Order #',
    'admin.customer': 'Customer',
    'admin.phone': 'Phone',
    'admin.address': 'Address',
    'admin.total': 'Total',
    'admin.date': 'Date',
    'admin.updateStatus': 'Update Status',
    'admin.viewDetails': 'View Details',
    'admin.storeName': 'Store Name',
    'admin.subtitle': 'Subtitle',
    'admin.fontHeading': 'Heading Font',
    'admin.fontBody': 'Body Font',
    'admin.accentColor': 'Accent Color',
    'admin.contactPhone': 'Phone Number',
    'admin.contactWhatsapp': 'WhatsApp Number',
    'admin.contactEmail': 'Email',
    'admin.shippingCost': 'Shipping Cost',
    'admin.freeShippingThreshold': 'Free Shipping Threshold',
    'admin.saveSettings': 'Save Settings',
    'admin.approve': 'Approve',
    'admin.pending': 'Pending',
    'admin.approved': 'Approved',
    'admin.storeIdentity': 'Store Identity',
    'admin.typography': 'Typography',
    'admin.colors': 'Colors',
    'admin.contactInfo': 'Contact Information',
    'admin.shippingSettings': 'Shipping Settings',
    'admin.subtitleAr': 'Subtitle (Arabic)',
    'admin.subtitleEn': 'Subtitle (English)',
    'admin.aboutAr': 'About Store (Arabic)',
    'admin.aboutEn': 'About Store (English)',
    'admin.fontArHeading': 'Arabic Heading Font',
    'admin.fontArBody': 'Arabic Body Font',
    'admin.addressAr': 'Address (Arabic)',
    'admin.addressEn': 'Address (English)',
    'admin.livePreview': 'Live Preview',
    'admin.headingSample': 'Sample Heading Text',
    'admin.bodySample': 'This is a sample text to preview the selected font. You can see how it will look in the store.',
    'admin.recentOrders': 'Recent Orders',
    'admin.quickActions': 'Quick Actions',
    'admin.viewAllOrders': 'View All Orders',
    'admin.backToStore': 'Back to Store',
    'admin.product': 'Product',
    'admin.rating': 'Rating',
    'admin.comment': 'Comment',
    'admin.noReviews': 'No reviews yet',
    'admin.noProducts': 'No products yet',
    'admin.noCategories': 'No categories yet',
    'admin.noOrders': 'No orders yet',
    'admin.selectCategory': 'Select Category',
    'admin.all': 'All',
    'admin.new': 'New',
    'admin.confirmed': 'Confirmed',
    'admin.preparing': 'Preparing',
    'admin.shipping': 'Shipping',
    'admin.delivered': 'Delivered',
    'admin.cancelled': 'Cancelled',
    'admin.orderDetails': 'Order Details',
    'admin.customerInfo': 'Customer Information',
    'admin.orderItems': 'Order Items',
    'admin.subtotal': 'Subtotal',
    'admin.shippingFee': 'Shipping Fee',
    'admin.grandTotal': 'Grand Total',
    'admin.notes': 'Notes',
    'admin.messageOnWhatsapp': 'Message on WhatsApp',
    'admin.city': 'City',
    'admin.email': 'Email',
    'admin.qty': 'Qty',
    'admin.unitPrice': 'Unit Price',
    'admin.free': 'Free',
    'admin.imageUrls': 'Enter one image URL per line',
    'admin.active': 'Active',
    'admin.inactive': 'Inactive',
    'admin.name': 'Name',
    'admin.productCount': 'Products',
    'admin.deleteCategory': 'Delete Category',
    'admin.deleteReview': 'Delete Review',
    'admin.settingsSaved': 'Settings saved successfully',
    'admin.productSaved': 'Product saved successfully',
    'admin.productDeleted': 'Product deleted',
    'admin.categorySaved': 'Category saved successfully',
    'admin.categoryDeleted': 'Category deleted',
    'admin.orderUpdated': 'Order status updated',
    'admin.reviewApproved': 'Review approved',
    'admin.reviewDeleted': 'Review deleted',
    'admin.fillRequired': 'Please fill all required fields',
    'admin.currency': 'EGP',
    'admin.adminPanel': 'Admin Panel',
    'admin.welcomeBack': 'Welcome Back',
    'admin.loginSubtitle': 'Enter your password to access the admin panel',
    'admin.deleteOrder': 'Delete Order',
    'admin.orderDeleted': 'Order deleted',
    'admin.coupons': 'Coupons',
    'admin.addCoupon': 'Add Coupon',
    'admin.editCoupon': 'Edit Coupon',
    'admin.code': 'Coupon Code',
    'admin.discountType': 'Discount Type',
    'admin.discountValue': 'Discount Value',
    'admin.percentage': 'Percentage (%)',
    'admin.fixed': 'Fixed Amount',
    'admin.minOrderAmount': 'Minimum Order',
    'admin.expiryDate': 'Expiry Date',
    'admin.deleteCoupon': 'Delete Coupon',
    'admin.couponSaved': 'Coupon saved successfully',
    'admin.couponDeleted': 'Coupon deleted',
    'admin.noCoupons': 'No coupons yet',
    'admin.couponDiscount': 'Coupon Discount'
  }
};

let currentLang = localStorage.getItem('lr_admin_lang') || 'ar';
let currentTheme = localStorage.getItem('lr_admin_theme') || 'light';

function t(key) {
  return translations[currentLang]?.[key] || translations['en']?.[key] || key;
}

// ===== THEME & LANGUAGE =====
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lr_admin_theme', theme);
}

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  localStorage.setItem('lr_admin_lang', lang);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  renderCurrentPage();
}

function toggleLanguage() {
  applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
  renderCurrentPage();
}

// ===== FONT LOADING =====
const loadedFonts = new Set();

function loadGoogleFont(fontName) {
  if (!fontName || loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// ===== FONT OPTIONS =====
const headingFonts = ['Playfair Display', 'Montserrat', 'Poppins', 'Raleway', 'Lora', 'Merriweather', 'Oswald', 'Dancing Script', 'Pacifico', 'Lobster'];
const bodyFonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Nunito', 'Source Sans Pro', 'Raleway', 'Poppins', 'Montserrat', 'Work Sans'];
const arHeadingFonts = ['Tajawal', 'Cairo', 'Almarai', 'Noto Kufi Arabic', 'Amiri', 'Scheherazade', 'El Messiri', 'Changa', 'Harmattan', 'Lemonada'];
const arBodyFonts = ['Cairo', 'Tajawal', 'Almarai', 'Noto Kufi Arabic', 'Noto Sans Arabic', 'IBM Plex Sans Arabic', 'Readex Pro'];

// ===== ROUTING =====
function getRoute() {
  return window.location.hash.slice(1) || (Store.isAdminLoggedIn() ? 'dashboard' : 'login');
}

function navigate(route) {
  window.location.hash = route;
}

function renderCurrentPage() {
  const route = getRoute();
  if (route !== 'login' && !Store.isAdminLoggedIn()) {
    navigate('login');
    return;
  }
  const root = document.getElementById('admin-root');
  if (route === 'login') {
    root.innerHTML = renderLoginPage();
    return;
  }
  root.innerHTML = renderAdminLayout(route);
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const container = document.getElementById('admin-toast-container');
  const icons = { success: '<i class="ph ph-check-circle"></i>', error: '<i class="ph ph-x-circle"></i>', info: '<i class="ph ph-info"></i>' };
  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.classList.add('leaving');setTimeout(()=>this.parentElement.remove(),300)">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===== MODAL =====
function openModal(title, bodyHTML, footerHTML = '') {
  const container = document.getElementById('admin-modal-container');
  container.innerHTML = `
    <div class="admin-modal-overlay active" id="modal-overlay">
      <div class="admin-modal">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    </div>
  `;
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => {
      document.getElementById('admin-modal-container').innerHTML = '';
    }, 300);
  }
}

function confirmDialog(title, message, onConfirm) {
  openModal(title, `
    <div class="confirm-dialog">
      <div class="confirm-icon"><i class="ph ph-warning"></i></div>
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" data-action="close-modal">${currentLang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
        <button class="btn btn-danger" id="confirm-yes-btn">${currentLang === 'ar' ? 'حذف' : 'Delete'}</button>
      </div>
    </div>
  `);
  document.getElementById('confirm-yes-btn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

// ===== LOGIN PAGE =====
function renderLoginPage() {
  const settings = Store.getSettings();
  const storeName = settings.storeName || 'Medix';
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <span class="logo-icon"><i class="ph ph-moon"></i></span>
          <div class="logo-text">${escapeHtml(storeName)}</div>
          <div class="logo-subtitle">${t('admin.loginSubtitle')}</div>
        </div>
        <form class="login-form" id="login-form">
          <div class="input-group">
            <label for="login-email">البريد الإلكتروني (الإيميل)</label>
            <input type="email" id="login-email" placeholder="admin@example.com" autocomplete="email" autofocus>
          </div>
          <div class="input-group">
            <label for="login-password">${t('admin.password')}</label>
            <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password">
          </div>
          <div class="login-error" id="login-error">${t('admin.wrongPassword')}</div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:14px;">${t('admin.loginBtn')}</button>
        </form>
      </div>
    </div>
  `;
}

// ===== ADMIN LAYOUT =====
function renderAdminLayout(activeRoute) {
  const pendingReviews = Store.getAllReviews().filter(r => !r.approved).length;
  const stats = Store.getOrderStats();
  const settings = Store.getSettings();
  const storeName = settings.storeName || 'Medix';

  const navItems = [
    { route: 'dashboard', icon: '<i class="ph ph-chart-bar"></i>', label: t('admin.dashboard') },
    { route: 'products', icon: '<i class="ph ph-package"></i>', label: t('admin.products') },
    { route: 'categories', icon: '<i class="ph ph-folder"></i>', label: t('admin.categories') },
    { route: 'coupons', icon: '<i class="ph ph-ticket"></i>', label: t('admin.coupons') },
    { route: 'orders', icon: '<i class="ph ph-shopping-cart"></i>', label: t('admin.orders'), badge: stats.pendingOrders || 0 },
    { route: 'reviews', icon: '<i class="ph ph-star"></i>', label: t('admin.reviews'), badge: pendingReviews },
    { route: 'design', icon: '<i class="ph ph-paint-brush-broad"></i>', label: currentLang === 'ar' ? 'التصميم والنصوص' : 'Design & Texts' },
    { route: 'settings', icon: '<i class="ph ph-gear"></i>', label: t('admin.settings') },
  ];

  const navHTML = navItems.map(item => `
    <a href="#${item.route}" class="${activeRoute === item.route ? 'active' : ''}" data-nav="${item.route}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
      ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
    </a>
  `).join('');

  let contentHTML = '';
  switch (activeRoute) {
    case 'dashboard': contentHTML = renderDashboard(); break;
    case 'products': contentHTML = renderProducts(); break;
    case 'categories': contentHTML = renderCategories(); break;
    case 'coupons': contentHTML = renderCoupons(); break;
    case 'orders': contentHTML = renderOrders(); break;
    case 'reviews': contentHTML = renderReviews(); break;
    case 'design': contentHTML = renderDesign(); break;
    case 'settings': contentHTML = renderSettings(); break;
    default: contentHTML = renderDashboard();
  }

  return `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <div class="admin-layout">
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-logo"><i class="ph ph-moon"></i></span>
          <span class="sidebar-title">${escapeHtml(storeName)}</span>
          <span class="sidebar-badge">Admin</span>
        </div>
        <nav class="sidebar-nav">${navHTML}</nav>
        <div class="sidebar-footer">
          <a href="#login" data-action="logout">
            <span class="nav-icon"><i class="ph ph-sign-out"></i></span>
            <span>${t('admin.logout')}</span>
          </a>
        </div>
      </aside>
      <header class="admin-topbar">
        <div class="topbar-start">
          <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle Menu"><i class="ph ph-list"></i></button>
          <span class="topbar-title">${t('admin.adminPanel')}</span>
        </div>
        <div class="topbar-end">
          <button class="topbar-btn" data-action="undo" title="Undo" id="btn-undo" disabled><i class="ph ph-arrow-u-up-left"></i></button>
          <button class="topbar-btn" data-action="redo" title="Redo" id="btn-redo" disabled><i class="ph ph-arrow-u-up-right"></i></button>
          <a href="index.html" class="topbar-link" title="${t('admin.backToStore')}"><i class="ph ph-storefront"></i> ${t('admin.backToStore')}</a>
          <button class="topbar-btn" data-action="toggle-lang" title="AR / EN">${currentLang === 'ar' ? 'EN' : 'ع'}</button>
        </div>
      </header>
      <main class="admin-content" id="admin-content">${contentHTML}</main>
    </div>
  `;
}

// ===== DASHBOARD =====
function renderDashboard() {
  const products = Store.getProducts();
  const stats = Store.getOrderStats();
  const orders = Store.getOrders().slice(0, 5);
  const settings = Store.getSettings();
  const cur = t('admin.currency');

  return `
    <div class="page-header"><h1>${t('admin.dashboard')}</h1></div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon products"><i class="ph ph-package"></i></div>
        <div class="stat-info">
          <h3>${products.length}</h3>
          <p>${t('admin.totalProducts')}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orders"><i class="ph ph-shopping-cart"></i></div>
        <div class="stat-info">
          <h3>${stats.totalOrders}</h3>
          <p>${t('admin.totalOrders')}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon revenue"><i class="ph ph-money"></i></div>
        <div class="stat-info">
          <h3>${stats.totalRevenue.toLocaleString()} ${cur}</h3>
          <p>${t('admin.revenue')}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending"><i class="ph ph-hourglass"></i></div>
        <div class="stat-info">
          <h3>${stats.pendingOrders}</h3>
          <p>${t('admin.pendingOrders')}</p>
        </div>
      </div>
    </div>

    <div class="d-flex gap-12 mb-24 flex-wrap">
      <a href="#products" class="btn btn-primary" data-nav="products"><i class="ph ph-plus"></i> ${t('admin.addProduct')}</a>
      <a href="#orders" class="btn btn-secondary" data-nav="orders"><i class="ph ph-clipboard-text"></i> ${t('admin.viewAllOrders')}</a>
    </div>

    <div class="table-container">
      <div class="table-header">
        <h2>${t('admin.recentOrders')}</h2>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t('admin.orderNumber')}</th>
              <th>${t('admin.customer')}</th>
              <th>${t('admin.total')}</th>
              <th>${t('admin.status')}</th>
              <th>${t('admin.date')}</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><p>${t('admin.noOrders')}</p></div></td></tr>` :
              orders.map(o => `
                <tr style="cursor:pointer" data-action="view-order" data-id="${o.id}">
                  <td><strong>${o.orderNumber}</strong></td>
                  <td>${o.customerName}</td>
                  <td>${o.total.toLocaleString()} ${cur}</td>
                  <td><span class="status-badge status-${o.status}">${Store.getStatusIcon(o.status)} ${t('admin.' + o.status) || o.status}</span></td>
                  <td>${Store.formatDate(o.createdAt, currentLang)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ===== PRODUCTS =====
let productSearchQuery = '';

function renderProducts() {
  const categories = Store.getCategories();
  let products = Store.getProducts();

  if (productSearchQuery) {
    const q = productSearchQuery.toLowerCase();
    products = products.filter(p =>
      (p.name_ar || '').toLowerCase().includes(q) ||
      (p.name_en || '').toLowerCase().includes(q)
    );
  }

  const cur = t('admin.currency');

  return `
    <div class="page-header">
      <h1>${t('admin.products')}</h1>
      <button class="btn btn-primary" data-action="add-product"><i class="ph ph-plus"></i> ${t('admin.addProduct')}</button>
    </div>
    <div class="table-container">
      <div class="table-header">
        <h2>${t('admin.products')} (${products.length})</h2>
        <div class="search-input-wrap">
          <span class="search-icon"><i class="ph ph-magnifying-glass"></i></span>
          <input type="text" id="product-search" placeholder="${currentLang === 'ar' ? 'بحث...' : 'Search...'}" value="${productSearchQuery}">
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th></th>
              <th>${t('admin.name')}</th>
              <th>${t('admin.price')}</th>
              <th>${t('admin.discount')}</th>
              <th>${t('admin.category')}</th>
              <th>${t('admin.stock')}</th>
              <th>${t('admin.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${products.length === 0 ? `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon"><i class="ph ph-package"></i></div><h3>${t('admin.noProducts')}</h3></div></td></tr>` :
              products.map(p => {
                const cat = categories.find(c => c.id === p.categoryId);
                return `
                  <tr>
                    <td><img class="product-thumb" src="${p.images?.[0] || 'https://via.placeholder.com/42'}" alt="" loading="lazy"></td>
                    <td>
                      <div><strong>${currentLang === 'ar' ? (p.name_ar || p.name_en) : (p.name_en || p.name_ar)}</strong></div>
                      ${p.featured ? `<span class="status-badge status-active" style="font-size:10px;padding:2px 6px;"><i class="ph-fill ph-star"></i> ${t('admin.featured')}</span>` : ''}
                    </td>
                    <td>
                      ${(p.discountPercentage > 0 || (p.salePrice > 0 && p.salePrice < p.price)) ? `
                        <div>${Store.getProductPrice(p).toLocaleString()} ${cur}</div>
                        <div style="text-decoration: line-through; color: var(--text-muted); font-size: 11px;">${p.price.toLocaleString()} ${cur}</div>
                      ` : `${p.price.toLocaleString()} ${cur}`}
                    </td>
                    <td>${p.discountPercentage > 0 ? `<span class="text-accent">${p.discountPercentage}%</span>` : (p.salePrice > 0 && p.salePrice < p.price ? `<span class="text-accent">${Math.round((1 - p.salePrice / p.price) * 100)}%</span>` : '-')}</td>
                    <td>${cat ? (currentLang === 'ar' ? cat.name_ar : cat.name_en) : '-'}</td>
                    <td>${p.stock}</td>
                    <td><span class="status-badge status-${p.status}">${t('admin.' + p.status)}</span></td>
                    <td>
                      <div class="actions-cell">
                        <button class="btn-icon" data-action="edit-product" data-id="${p.id}" title="${t('admin.editProduct')}"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon danger" data-action="delete-product" data-id="${p.id}" title="${t('admin.deleteProduct')}"><i class="ph ph-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}


function openProductModal(product = null) {
  const isEdit = !!product;
  const title = isEdit ? t('admin.editProduct') : t('admin.addProduct');
  const categories = Store.getCategories();

  const body = `
    <form class="admin-form" id="product-form">
      <div class="form-group">
        <label for="prod-name-ar">${t('admin.productName_ar')} *</label>
        <input type="text" id="prod-name-ar" value="${product?.name_ar || ''}" required>
      </div>
      <div class="form-group">
        <label for="prod-name-en">${t('admin.productName_en')} *</label>
        <input type="text" id="prod-name-en" value="${product?.name_en || ''}" required>
      </div>
      <div class="form-group full-width">
        <label for="prod-desc-ar">${t('admin.description_ar')}</label>
        <textarea id="prod-desc-ar">${product?.description_ar || ''}</textarea>
      </div>
      <div class="form-group full-width">
        <label for="prod-desc-en">${t('admin.description_en')}</label>
        <textarea id="prod-desc-en">${product?.description_en || ''}</textarea>
      </div>
      <div class="form-group">
        <label for="prod-price">${t('admin.price')} (${currentLang === 'ar' ? 'قبل الخصم' : 'Before Discount'}) *</label>
        <input type="number" id="prod-price" min="0" step="1" value="${product?.price || ''}" required>
      </div>
      <div class="form-group">
        <label for="prod-discount">${t('admin.discount')}</label>
        <input type="number" id="prod-discount" min="0" max="100" step="1" value="${product?.discountPercentage || 0}">
      </div>
      <div class="form-group">
        <label for="prod-sale-price">${currentLang === 'ar' ? 'السعر بعد الخصم (سعر البيع)' : 'Sale Price (After Discount)'}</label>
        <input type="number" id="prod-sale-price" min="0" step="1" value="${product ? Store.getProductPrice(product) : ''}">
      </div>
      <div class="form-group">
        <label for="prod-category">${t('admin.category')}</label>
        <select id="prod-category">
          <option value="">${t('admin.selectCategory')}</option>
          ${categories.map(c => `<option value="${c.id}" ${product?.categoryId === c.id ? 'selected' : ''}>${currentLang === 'ar' ? c.name_ar : c.name_en}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="prod-stock">${t('admin.stock')}</label>
        <input type="number" id="prod-stock" min="0" value="${product?.stock ?? 10}">
      </div>
      <div class="form-group">
        <label for="prod-scarcity-threshold">${currentLang === 'ar' ? 'حد ظهور شارة الاستعجال (أقصى مخزون لظهورها)' : 'Scarcity Threshold'}</label>
        <input type="number" id="prod-scarcity-threshold" min="0" value="${product?.scarcityThreshold ?? 5}">
      </div>
      <div class="form-group full-width checkbox-group" style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="prod-show-scarcity" ${product?.showScarcityBadge !== false ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
        <label for="prod-show-scarcity" style="cursor:pointer; font-weight:bold;">${currentLang === 'ar' ? 'تفعيل شارة الاستعجال (سارع بالشراء! متبقي X فقط)' : 'Enable Scarcity Badge'}</label>
      </div>
      
      <!-- Notes -->
      <div class="form-group full-width">
        <label for="prod-note-ar">${currentLang === 'ar' ? 'ملاحظة المنتج (عربي) - اختياري' : 'Product Note (Ar) - Optional'}</label>
        <input type="text" id="prod-note-ar" value="${product?.note_ar || ''}" placeholder="${currentLang === 'ar' ? 'مثال: يغسل بماء بارد فقط' : 'e.g. Wash with cold water only'}">
      </div>
      <div class="form-group full-width">
        <label for="prod-note-en">${currentLang === 'ar' ? 'ملاحظة المنتج (إنجليزي) - اختياري' : 'Product Note (En) - Optional'}</label>
        <input type="text" id="prod-note-en" value="${product?.note_en || ''}" placeholder="${currentLang === 'ar' ? 'مثال: Wash with cold water only' : 'e.g. Wash with cold water only'}">
      </div>
      
      <!-- Sizes -->
      <div class="form-group full-width">
        <label for="prod-sizes">${currentLang === 'ar' ? 'المقاسات المتاحة (افصل بينها بفاصلة)' : 'Available Sizes (comma separated)'}</label>
        <input type="text" id="prod-sizes" value="${(product?.sizes || []).join(', ')}" placeholder="S, M, L, XL, 2XL">
      </div>

      <!-- Colors -->
      <div class="form-group full-width">
        <label style="display:flex; justify-content:space-between; align-items:center;">
          ${currentLang === 'ar' ? 'الألوان المتاحة' : 'Available Colors'}
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-color" style="padding: 4px 12px;"><i class="ph ph-plus"></i> ${currentLang === 'ar' ? 'إضافة لون' : 'Add Color'}</button>
        </label>
        <div id="colors-container" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
          <!-- Colors will be injected here -->
        </div>
      </div>

      <div class="form-group full-width">
        <label>${t('admin.images')}</label>
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <input type="text" id="prod-image-url-input" placeholder="${currentLang === 'ar' ? 'الصق رابط الصورة هنا (https://...)' : 'Paste image URL here (https://...)'}" style="flex:1;">
          <button type="button" class="btn btn-secondary" id="btn-add-image-url" style="white-space:nowrap;">
            <i class="ph ph-plus"></i> ${currentLang === 'ar' ? 'إضافة' : 'Add'}
          </button>
        </div>
        <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px; margin-top:-4px;">
          ${currentLang === 'ar' ? '💡 ارفع الصورة على موقع مثل <strong><a href="https://imgbb.com" target="_blank" style="color:var(--accent);">imgbb.com</a></strong> أو <strong><a href="https://postimages.org" target="_blank" style="color:var(--accent);">postimages.org</a></strong> ثم الصق الرابط هنا' : '💡 Upload your image to <strong><a href="https://imgbb.com" target="_blank" style="color:var(--accent);">imgbb.com</a></strong> or <strong><a href="https://postimages.org" target="_blank" style="color:var(--accent);">postimages.org</a></strong> then paste the URL here'}
        </p>
        <textarea id="prod-images" placeholder="${t('admin.imageUrls')}" rows="3">${product?.images?.join('\n') || ''}</textarea>
        <div class="image-preview-grid" id="img-preview-grid">
          ${(product?.images || []).map((url, i) => `
            <div class="image-preview-item">
              <img src="${url}" alt="Preview" onerror="this.src='https://via.placeholder.com/72'">
            </div>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label for="prod-status">${t('admin.status')}</label>
        <select id="prod-status">
          <option value="active" ${(product?.status || 'active') === 'active' ? 'selected' : ''}>${t('admin.active')}</option>
          <option value="inactive" ${product?.status === 'inactive' ? 'selected' : ''}>${t('admin.inactive')}</option>
        </select>
      </div>
      <div class="form-group checkbox-group">
        <input type="checkbox" id="prod-featured" ${product?.featured ? 'checked' : ''}>
        <label for="prod-featured">${t('admin.featured')}</label>
      </div>
      <div class="form-group full-width">
        <label>${currentLang === 'ar' ? 'المنتجات المرتبطة (إضافية اختيارية للعميل)' : 'Linked Products (Optional Upsells)'}</label>
        <div class="linked-products-selector" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border); padding: 10px; border-radius: var(--radius-sm); background: var(--bg-input);">
          ${Store.getProducts().filter(p => p.id !== product?.id).map(p => `
            <label class="linked-product-option" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer;">
              <input type="checkbox" name="prod-linked" value="${p.id}" ${product?.linkedProducts?.includes(p.id) ? 'checked' : ''}>
              <img src="${p.images?.[0] || 'https://via.placeholder.com/32'}" alt="" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">
              <span>${currentLang === 'ar' ? (p.name_ar || p.name_en) : (p.name_en || p.name_ar)} (${p.price} ${t('admin.currency')})</span>
            </label>
          `).join('') || `<p class="text-muted" style="font-size: 12px; margin: 0;">${currentLang === 'ar' ? 'لا توجد منتجات أخرى للربط' : 'No other products available to link'}</p>`}
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" data-action="close-modal">${currentLang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
    <button class="btn btn-primary" id="save-product-btn">${currentLang === 'ar' ? 'حفظ' : 'Save'}</button>
  `;

  openModal(title, body, footer);

  // Colors Logic
  const colorsContainer = document.getElementById('colors-container');
  let currentColors = product?.colors ? JSON.parse(JSON.stringify(product.colors)) : [];

  function renderColors() {
    colorsContainer.innerHTML = currentColors.map((color, idx) => `
      <div class="color-row" style="display:flex; gap:10px; align-items:center; background:var(--bg-input); padding:10px; border-radius:8px; border:1px solid var(--border); flex-wrap: wrap;">
        <input type="text" placeholder="${currentLang === 'ar' ? 'اسم اللون (عربي)' : 'Color Name (Ar)'}" value="${color.name_ar || ''}" onchange="updateColor(${idx}, 'name_ar', this.value)" style="flex:1; min-width:120px;">
        <input type="text" placeholder="${currentLang === 'ar' ? 'اسم اللون (إنجليزي)' : 'Color Name (En)'}" value="${color.name_en || ''}" onchange="updateColor(${idx}, 'name_en', this.value)" style="flex:1; min-width:120px;">
        <input type="color" value="${color.hex || '#000000'}" onchange="updateColor(${idx}, 'hex', this.value)" style="width:40px; height:40px; padding:0; border:none; cursor:pointer; border-radius:50%;" title="${currentLang === 'ar' ? 'درجة اللون' : 'Color Hex'}">
        <input type="text" placeholder="${currentLang === 'ar' ? 'رابط الصورة (اختياري)' : 'Image URL (optional)'}" value="${color.image || ''}" onchange="updateColor(${idx}, 'image', this.value)" style="flex:2; min-width:200px;">
        <button type="button" class="btn-icon danger" onclick="removeColorRow(${idx})" style="flex-shrink:0;"><i class="ph ph-trash"></i></button>
      </div>
    `).join('');
  }

  window.updateColor = function(idx, field, value) {
    currentColors[idx][field] = value;
  };

  window.removeColorRow = function(idx) {
    currentColors.splice(idx, 1);
    renderColors();
  };

  document.getElementById('btn-add-color')?.addEventListener('click', () => {
    currentColors.push({ name_ar: '', name_en: '', hex: '#000000', image: '' });
    renderColors();
  });

  renderColors();

  // Image preview update
  const imgTextarea = document.getElementById('prod-images');
  if (imgTextarea) {
    imgTextarea.addEventListener('input', () => {
      const urls = imgTextarea.value.split('\n').map(u => u.trim()).filter(Boolean);
      const grid = document.getElementById('img-preview-grid');
      grid.innerHTML = urls.map((url, i) => `
        <div class="image-preview-item" style="position:relative;">
          <img src="${url}" alt="Preview" onerror="this.src='https://via.placeholder.com/72'">
          <button type="button" class="btn-icon danger" onclick="removeImage(${i})" style="position:absolute; top:-5px; right:-5px; width:24px; height:24px; font-size:12px; background:var(--bg-card); border-radius:50%; box-shadow:var(--shadow);"><i class="ph ph-x"></i></button>
        </div>
      `).join('');
    });

    // Make removeImage function available globally just for the modal
    window.removeImage = function(index) {
      const urls = imgTextarea.value.split('\n').map(u => u.trim()).filter(Boolean);
      urls.splice(index, 1);
      imgTextarea.value = urls.join('\n');
      imgTextarea.dispatchEvent(new Event('input'));
    };
  }

  // Add Image URL button logic
  const urlInput = document.getElementById('prod-image-url-input');
  const addUrlBtn = document.getElementById('btn-add-image-url');
  if (urlInput && addUrlBtn && imgTextarea) {
    const addUrlFn = () => {
      const url = urlInput.value.trim();
      if (!url) return;
      const currentImages = imgTextarea.value ? imgTextarea.value.split('\n').map(u => u.trim()).filter(Boolean) : [];
      currentImages.push(url);
      imgTextarea.value = currentImages.join('\n');
      imgTextarea.dispatchEvent(new Event('input'));
      urlInput.value = '';
      urlInput.focus();
    };
    addUrlBtn.addEventListener('click', addUrlFn);
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addUrlFn(); } });
  }

  // Price & Discount Auto-Calculation Listeners
  const inputPrice = document.getElementById('prod-price');
  const inputDiscount = document.getElementById('prod-discount');
  const inputSalePrice = document.getElementById('prod-sale-price');

  if (inputPrice && inputDiscount && inputSalePrice) {
    const updatePrices = (trigger) => {
      const price = parseFloat(inputPrice.value) || 0;
      if (price <= 0) return;

      if (trigger === 'discount') {
        const discount = parseFloat(inputDiscount.value) || 0;
        if (discount > 0) {
          inputSalePrice.value = Math.round(price * (1 - discount / 100));
        } else {
          inputSalePrice.value = price;
        }
      } else if (trigger === 'sale-price') {
        const salePrice = parseFloat(inputSalePrice.value) || 0;
        if (salePrice > 0 && salePrice < price) {
          inputDiscount.value = Math.round(((price - salePrice) / price) * 100);
        } else if (salePrice >= price) {
          inputDiscount.value = 0;
        }
      } else if (trigger === 'price') {
        const discount = parseFloat(inputDiscount.value) || 0;
        const salePrice = parseFloat(inputSalePrice.value) || 0;
        if (discount > 0) {
          inputSalePrice.value = Math.round(price * (1 - discount / 100));
        } else if (salePrice > 0 && salePrice < price) {
          inputDiscount.value = Math.round(((price - salePrice) / price) * 100);
        }
      }
    };

    inputPrice.addEventListener('input', () => updatePrices('price'));
    inputDiscount.addEventListener('input', () => updatePrices('discount'));
    inputSalePrice.addEventListener('input', () => updatePrices('sale-price'));
  }

  document.getElementById('save-product-btn').addEventListener('click', () => {
    const nameAr = document.getElementById('prod-name-ar').value.trim();
    const nameEn = document.getElementById('prod-name-en').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);

    if (!nameAr || !nameEn || isNaN(price) || price <= 0) {
      showToast(t('admin.fillRequired'), 'error');
      return;
    }

    const imagesRaw = document.getElementById('prod-images').value;
    const images = imagesRaw.split('\n').map(u => u.trim()).filter(Boolean);

    const checkedLinked = Array.from(document.querySelectorAll('input[name="prod-linked"]:checked')).map(cb => cb.value);

    const sizesRaw = document.getElementById('prod-sizes').value;
    const sizes = sizesRaw.split(',').map(s => s.trim()).filter(Boolean);

    const data = {
      name_ar: nameAr,
      name_en: nameEn,
      description_ar: document.getElementById('prod-desc-ar').value.trim(),
      description_en: document.getElementById('prod-desc-en').value.trim(),
      note_ar: document.getElementById('prod-note-ar').value.trim(),
      note_en: document.getElementById('prod-note-en').value.trim(),
      price: price,
      discountPercentage: parseInt(document.getElementById('prod-discount').value) || 0,
      salePrice: parseFloat(document.getElementById('prod-sale-price').value) || 0,
      categoryId: document.getElementById('prod-category').value,
      stock: parseInt(document.getElementById('prod-stock').value) || 0,
      showScarcityBadge: document.getElementById('prod-show-scarcity').checked,
      scarcityThreshold: parseInt(document.getElementById('prod-scarcity-threshold').value) || 5,
      images: images,
      sizes: sizes,
      colors: currentColors.filter(c => c.name_ar || c.name_en), // Only save colors that have names
      status: document.getElementById('prod-status').value,
      featured: document.getElementById('prod-featured').checked,
      linkedProducts: checkedLinked
    };

    if (isEdit) data.id = product.id;

    Store.saveProduct(data);
    closeModal();
    showToast(t('admin.productSaved'), 'success');
    renderContentArea('products');
  });
}

// ===== CATEGORIES =====
function renderCategories() {
  const categories = Store.getCategories();

  return `
    <div class="page-header">
      <h1>${t('admin.categories')}</h1>
      <button class="btn btn-primary" data-action="add-category"><i class="ph ph-plus"></i> ${t('admin.addCategory')}</button>
    </div>
    <div class="table-container">
      <div class="table-header">
        <h2>${t('admin.categories')} (${categories.length})</h2>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t('admin.icon')}</th>
              <th>${t('admin.categoryName_ar')}</th>
              <th>${t('admin.categoryName_en')}</th>
              <th>${t('admin.productCount')}</th>
              <th>${t('admin.order')}</th>
              <th>${t('admin.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${categories.length === 0 ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon"><i class="ph ph-folder"></i></div><h3>${t('admin.noCategories')}</h3></div></td></tr>` :
              categories.map(c => `
                <tr>
                  <td>
                    ${c.image ? `<img src="${c.image}" alt="Category" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : `<div style="width:40px;height:40px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:20px;">${c.icon || '<i class="ph ph-folder"></i>'}</div>`}
                  </td>
                  <td>${c.name_ar}</td>
                  <td>${c.name_en}</td>
                  <td>${Store.getCategoryProductCount(c.id)}</td>
                  <td>${c.order || 0}</td>
                  <td><span class="status-badge status-${c.status}">${t('admin.' + c.status)}</span></td>
                  <td>
                    <div class="actions-cell">
                      <button class="btn-icon" data-action="edit-category" data-id="${c.id}" title="${t('admin.editCategory')}"><i class="ph ph-pencil-simple"></i></button>
                      <button class="btn-icon danger" data-action="delete-category" data-id="${c.id}" title="${t('admin.deleteCategory')}"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openCategoryModal(category = null) {
  const isEdit = !!category;
  const title = isEdit ? t('admin.editCategory') : t('admin.addCategory');

  const body = `
    <form class="admin-form" id="category-form">
      <div class="form-group">
        <label for="cat-name-ar">${t('admin.categoryName_ar')} *</label>
        <input type="text" id="cat-name-ar" value="${category?.name_ar || ''}" required>
      </div>
      <div class="form-group">
        <label for="cat-name-en">${t('admin.categoryName_en')} *</label>
        <input type="text" id="cat-name-en" value="${category?.name_en || ''}" required>
      </div>
      <div class="form-group full-width">
        <label>${t('admin.icon')} (${currentLang === 'ar' ? 'صورة التصنيف' : 'Category Image'})</label>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <input type="text" id="cat-icon-url-input" placeholder="${currentLang === 'ar' ? 'الصق رابط الصورة هنا (https://...)' : 'Paste image URL here (https://...)'}" style="flex:1;">
          <button type="button" class="btn btn-secondary" id="btn-set-cat-image" style="white-space:nowrap;">
            <i class="ph ph-check"></i> ${currentLang === 'ar' ? 'تطبيق' : 'Apply'}
          </button>
        </div>
        <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px; margin-top:-4px;">
          ${currentLang === 'ar' ? '💡 ارفع الصورة على <a href="https://imgbb.com" target="_blank" style="color:var(--accent);">imgbb.com</a> ثم الصق الرابط' : '💡 Upload to <a href="https://imgbb.com" target="_blank" style="color:var(--accent);">imgbb.com</a> then paste the URL'}
        </p>
        <input type="hidden" id="cat-icon" value="${category?.image || category?.icon || ''}">
        <div class="image-preview-grid" id="cat-img-preview">
          ${(category?.image || category?.icon) ? `
            <div class="image-preview-item" style="width:80px;height:80px;">
              <img src="${category.image || category.icon}" alt="Preview" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
            </div>
          ` : ''}
        </div>
      </div>
      <div class="form-group">
        <label for="cat-order">${t('admin.order')}</label>
        <input type="number" id="cat-order" min="0" value="${category?.order ?? 0}">
      </div>
      <div class="form-group">
        <label for="cat-status">${t('admin.status')}</label>
        <select id="cat-status">
          <option value="active" ${(category?.status || 'active') === 'active' ? 'selected' : ''}>${t('admin.active')}</option>
          <option value="inactive" ${category?.status === 'inactive' ? 'selected' : ''}>${t('admin.inactive')}</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" data-action="close-modal">${currentLang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
    <button class="btn btn-primary" id="save-category-btn">${currentLang === 'ar' ? 'حفظ' : 'Save'}</button>
  `;

  openModal(title, body, footer);

  // Handle URL input for category image
  const catIconUrlInput = document.getElementById('cat-icon-url-input');
  const setCatImgBtn = document.getElementById('btn-set-cat-image');
  const catIconHidden = document.getElementById('cat-icon');
  const catImgPreview = document.getElementById('cat-img-preview');
  
  const applyCatImage = () => {
    const url = catIconUrlInput?.value?.trim() || catIconHidden?.value?.trim() || '';
    const finalUrl = catIconUrlInput?.value?.trim() || '';
    if (!finalUrl) return;
    catIconHidden.value = finalUrl;
    catImgPreview.innerHTML = `
      <div class="image-preview-item" style="width:80px;height:80px;">
        <img src="${finalUrl}" alt="Preview" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.src='https://via.placeholder.com/80'">
      </div>
    `;
  };
  if (setCatImgBtn) setCatImgBtn.addEventListener('click', applyCatImage);
  if (catIconUrlInput) catIconUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCatImage(); } });
  // Pre-fill URL input if editing existing category
  if (catIconUrlInput && catIconHidden?.value) catIconUrlInput.value = catIconHidden.value;

  document.getElementById('save-category-btn').addEventListener('click', () => {
    const nameAr = document.getElementById('cat-name-ar').value.trim();
    const nameEn = document.getElementById('cat-name-en').value.trim();

    if (!nameAr || !nameEn) {
      showToast(t('admin.fillRequired'), 'error');
      return;
    }

    const data = {
      name_ar: nameAr,
      name_en: nameEn,
      image: document.getElementById('cat-icon').value.trim(),
      icon: document.getElementById('cat-icon').value.trim(), // fallback
      order: parseInt(document.getElementById('cat-order').value) || 0,
      status: document.getElementById('cat-status').value,
    };

    if (isEdit) data.id = category.id;

    Store.saveCategory(data);
    closeModal();
    showToast(t('admin.categorySaved'), 'success');
    renderContentArea('categories');
  });
}

// ===== ORDERS =====
let orderStatusFilter = 'all';

function renderOrders() {
  const statuses = ['all', 'new', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];
  let orders = Store.getOrders();
  const cur = t('admin.currency');

  if (orderStatusFilter !== 'all') {
    orders = orders.filter(o => o.status === orderStatusFilter);
  }

  return `
    <div class="page-header">
      <h1>${t('admin.orders')}</h1>
    </div>
    <div class="admin-tabs" id="order-tabs">
      ${statuses.map(s => `
        <button class="tab-btn ${orderStatusFilter === s ? 'active' : ''}" data-action="filter-orders" data-status="${s}">
          ${t('admin.' + s)}
        </button>
      `).join('')}
    </div>
    <div class="table-container">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t('admin.orderNumber')}</th>
              <th>${t('admin.customer')}</th>
              <th>${t('admin.phone')}</th>
              <th>${t('admin.total')}</th>
              <th>${t('admin.status')}</th>
              <th>${t('admin.date')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon"><i class="ph ph-shopping-cart"></i></div><h3>${t('admin.noOrders')}</h3></div></td></tr>` :
              orders.map(o => `
                <tr>
                  <td><strong>${o.orderNumber}</strong></td>
                  <td>${o.customerName}</td>
                  <td dir="ltr">${o.customerPhone}</td>
                  <td>${o.total.toLocaleString()} ${cur}</td>
                  <td><span class="status-badge status-${o.status}">${Store.getStatusIcon(o.status)} ${t('admin.' + o.status) || o.status}</span></td>
                  <td>${Store.formatDate(o.createdAt, currentLang)}</td>
                  <td>
                    <div class="actions-cell">
                      <button class="btn-icon" data-action="view-order" data-id="${o.id}" title="${t('admin.viewDetails')}"><i class="ph ph-eye"></i></button>
                      <button class="btn-icon danger" data-action="delete-order" data-id="${o.id}" title="${t('admin.deleteOrder')}"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openOrderDetailModal(orderId) {
  const order = Store.getOrder(orderId);
  if (!order) return;
  const cur = t('admin.currency');
  const settings = Store.getSettings();
  const statuses = ['new', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];

  const body = `
    <div class="order-detail-section">
      <h3>${t('admin.customerInfo')}</h3>
      <div class="order-info-grid">
        <div class="order-info-item">
          <span class="info-label">${t('admin.customer')}</span>
          <span class="info-value">${order.customerName}</span>
        </div>
        <div class="order-info-item">
          <span class="info-label">${t('admin.phone')}</span>
          <span class="info-value" dir="ltr">${order.customerPhone}</span>
        </div>
        <div class="order-info-item">
          <span class="info-label">${t('admin.email')}</span>
          <span class="info-value">${order.customerEmail || '-'}</span>
        </div>
        <div class="order-info-item">
          <span class="info-label">${t('admin.city')}</span>
          <span class="info-value">${order.city || '-'}</span>
        </div>
        <div class="order-info-item" style="grid-column:1/-1">
          <span class="info-label">${t('admin.address')}</span>
          <span class="info-value">${order.customerAddress}</span>
        </div>
      </div>
    </div>

    <div class="order-detail-section">
      <h3>${t('admin.orderItems')}</h3>
      <table class="order-items-mini">
        <thead>
          <tr>
            <th></th>
            <th>${t('admin.product')}</th>
            <th>${t('admin.unitPrice')}</th>
            <th>${t('admin.qty')}</th>
            <th>${t('admin.total')}</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td><img class="item-img" src="${item.image || 'https://via.placeholder.com/36'}" alt="" loading="lazy"></td>
              <td>${currentLang === 'ar' ? item.name_ar : item.name_en}</td>
              <td>${item.discountedPrice.toLocaleString()} ${cur}</td>
              <td>${item.quantity}</td>
              <td>${(item.discountedPrice * item.quantity).toLocaleString()} ${cur}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="order-totals">
        <div class="total-row">
          <span>${t('admin.subtotal')}</span>
          <span>${order.subtotal.toLocaleString()} ${cur}</span>
        </div>
        ${order.discountAmount && order.discountAmount > 0 ? `
          <div class="total-row" style="color: var(--success);">
            <span>${t('admin.couponDiscount')} ${order.couponCode ? `(${order.couponCode})` : ''}</span>
            <span>-${order.discountAmount.toLocaleString()} ${cur}</span>
          </div>
        ` : ''}
        <div class="total-row">
          <span>${t('admin.shippingFee')}</span>
          <span>${order.shipping === 0 ? t('admin.free') : order.shipping.toLocaleString() + ' ' + cur}</span>
        </div>
        <div class="total-row grand">
          <span>${t('admin.grandTotal')}</span>
          <span>${order.total.toLocaleString()} ${cur}</span>
        </div>
      </div>
    </div>

    ${order.notes ? `
      <div class="order-detail-section">
        <h3>${t('admin.notes')}</h3>
        <p style="color:var(--text-secondary);font-size:14px">${order.notes}</p>
      </div>
    ` : ''}

    <div class="order-status-update">
      <select id="order-status-select">
        ${statuses.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${t('admin.' + s)}</option>`).join('')}
      </select>
      <button class="btn btn-primary btn-sm" id="update-order-status-btn">${t('admin.updateStatus')}</button>
    </div>

    <div style="margin-top:16px">
      <a href="https://wa.me/${order.customerPhone.replace(/[^0-9+]/g, '')}" target="_blank" class="whatsapp-btn">
        <i class="ph ph-whatsapp-logo"></i> ${t('admin.messageOnWhatsapp')}
      </a>
    </div>
  `;

  openModal(`${t('admin.orderDetails')} - ${order.orderNumber}`, body);

  document.getElementById('update-order-status-btn').addEventListener('click', () => {
    const newStatus = document.getElementById('order-status-select').value;
    Store.updateOrderStatus(orderId, newStatus);
    closeModal();
    showToast(t('admin.orderUpdated'), 'success');
    renderContentArea(getRoute());
  });
}

// ===== REVIEWS =====
let reviewStatusFilter = 'all';

function renderReviews() {
  const filters = ['all', 'pending', 'approved'];
  let reviews = Store.getAllReviews();

  if (reviewStatusFilter === 'pending') {
    reviews = reviews.filter(r => !r.approved);
  } else if (reviewStatusFilter === 'approved') {
    reviews = reviews.filter(r => r.approved);
  }

  return `
    <div class="page-header">
      <h1>${t('admin.reviews')}</h1>
    </div>
    <div class="admin-tabs" id="review-tabs">
      ${filters.map(f => `
        <button class="tab-btn ${reviewStatusFilter === f ? 'active' : ''}" data-action="filter-reviews" data-status="${f}">
          ${t('admin.' + f)}
        </button>
      `).join('')}
    </div>
    <div class="table-container">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t('admin.product')}</th>
              <th>${t('admin.customer')}</th>
              <th>${t('admin.rating')}</th>
              <th>${t('admin.comment')}</th>
              <th>${t('admin.status')}</th>
              <th>${t('admin.date')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${reviews.length === 0 ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon"><i class="ph ph-star"></i></div><h3>${t('admin.noReviews')}</h3></div></td></tr>` :
              reviews.map(r => {
                const product = Store.getProduct(r.productId);
                const productName = product ? (currentLang === 'ar' ? product.name_ar : product.name_en) : '-';
                const stars = '<i class="ph-fill ph-star" style="color:var(--accent)"></i>'.repeat(r.rating) + '<i class="ph ph-star" style="color:var(--text-muted)"></i>'.repeat(5 - r.rating);
                return `
                  <tr>
                    <td class="truncate">${productName}</td>
                    <td>${r.customerName}</td>
                    <td><span class="star-rating">${stars}</span></td>
                    <td class="truncate" title="${r.comment}">${r.comment}</td>
                    <td><span class="status-badge status-${r.approved ? 'approved' : 'pending'}">${r.approved ? t('admin.approved') : t('admin.pending')}</span></td>
                    <td>${Store.formatDate(r.createdAt, currentLang)}</td>
                    <td>
                      <div class="actions-cell">
                        ${!r.approved ? `<button class="btn btn-success btn-sm" data-action="approve-review" data-id="${r.id}"><i class="ph ph-check"></i> ${t('admin.approve')}</button>` : ''}
                        <button class="btn-icon danger" data-action="delete-review" data-id="${r.id}" title="${t('admin.deleteReview')}"><i class="ph ph-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ===== COUPONS =====
function renderCoupons() {
  const coupons = Store.getCoupons();
  
  return `
    <div class="page-header">
      <h1>${t('admin.coupons')}</h1>
      <button class="btn btn-primary" data-action="add-coupon"><i class="ph ph-plus"></i> ${t('admin.addCoupon')}</button>
    </div>
    
    <div class="table-container">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t('admin.code')}</th>
              <th>${t('admin.discountValue')}</th>
              <th>${t('admin.expiryDate')}</th>
              <th>${t('admin.status')}</th>
              <th width="100"></th>
            </tr>
          </thead>
          <tbody>
            ${coupons.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><p>${t('admin.noCoupons')}</p></div></td></tr>` :
              coupons.map(c => `
                <tr>
                  <td><strong>${c.code}</strong></td>
                  <td>${c.discountType === 'percentage' ? c.discountValue + '%' : Store.formatPrice(c.discountValue, currentLang)}</td>
                  <td>${c.expiryDate ? Store.formatDate(c.expiryDate, currentLang) : '-'}</td>
                  <td><span class="status-badge status-${c.status === 'active' ? 'delivered' : 'cancelled'}">${t('admin.' + c.status) || c.status}</span></td>
                  <td>
                    <div class="actions-cell">
                      <button class="btn-icon" data-action="edit-coupon" data-id="${c.id}"><i class="ph ph-pencil-simple"></i></button>
                      <button class="btn-icon danger" data-action="delete-coupon" data-id="${c.id}"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openCouponModal(coupon = null) {
  const isEdit = !!coupon;
  const title = isEdit ? t('admin.editCoupon') : t('admin.addCoupon');
  
  const body = `
    <form class="admin-form" id="coupon-form">
      <div class="form-group">
        <label for="coup-code">${t('admin.code')} *</label>
        <input type="text" id="coup-code" value="${coupon?.code || ''}" required style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label for="coup-type">${t('admin.discountType')}</label>
        <select id="coup-type">
          <option value="percentage" ${coupon?.discountType === 'percentage' ? 'selected' : ''}>${t('admin.percentage')}</option>
          <option value="fixed" ${coupon?.discountType === 'fixed' ? 'selected' : ''}>${t('admin.fixed')}</option>
        </select>
      </div>
      <div class="form-group">
        <label for="coup-value">${t('admin.discountValue')} *</label>
        <input type="number" id="coup-value" min="0" step="any" value="${coupon?.discountValue || ''}" required>
      </div>
      <div class="form-group">
        <label for="coup-min">${t('admin.minOrderAmount')}</label>
        <input type="number" id="coup-min" min="0" value="${coupon?.minOrderAmount || ''}">
      </div>
      <div class="form-group">
        <label for="coup-expiry">${t('admin.expiryDate')}</label>
        <input type="date" id="coup-expiry" value="${coupon?.expiryDate || ''}">
      </div>
      <div class="form-group">
        <label for="coup-status">${t('admin.status')}</label>
        <select id="coup-status">
          <option value="active" ${(coupon?.status || 'active') === 'active' ? 'selected' : ''}>${t('admin.active')}</option>
          <option value="inactive" ${coupon?.status === 'inactive' ? 'selected' : ''}>${t('admin.inactive')}</option>
        </select>
      </div>
    </form>
  `;
  
  const footer = `
    <button class="btn btn-secondary" data-action="close-modal">${currentLang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
    <button class="btn btn-primary" id="save-coupon-btn">${currentLang === 'ar' ? 'حفظ' : 'Save'}</button>
  `;
  
  openModal(title, body, footer);
  
  document.getElementById('save-coupon-btn').addEventListener('click', () => {
    const code = document.getElementById('coup-code').value.trim().toUpperCase();
    const type = document.getElementById('coup-type').value;
    const value = parseFloat(document.getElementById('coup-value').value);
    
    if (!code || isNaN(value) || value <= 0) {
      showToast(t('admin.fillRequired'), 'error');
      return;
    }
    
    const minAmount = document.getElementById('coup-min').value;
    const expiry = document.getElementById('coup-expiry').value;
    
    Store.saveCoupon({
      id: coupon?.id,
      code: code,
      discountType: type,
      discountValue: value,
      minOrderAmount: minAmount ? parseFloat(minAmount) : null,
      expiryDate: expiry || null,
      status: document.getElementById('coup-status').value
    });
    
    closeModal();
    showToast(t('admin.couponSaved'));
    renderCurrentPage();
  });
}

// ===== SETTINGS =====
function renderSettings() {
  const settings = Store.getSettings();

  const fontSelect = (id, options, currentValue) => `
    <select id="${id}">
      ${options.map(f => `<option value="${f}" ${currentValue === f ? 'selected' : ''}>${f}</option>`).join('')}
    </select>
  `;

  if (settingsHistory.length === 0) {
    settingsHistory = [JSON.parse(JSON.stringify(settings))];
    settingsHistoryIndex = 0;
  }

  return `
    <div class="page-header" style="flex-direction: row; align-items: center; justify-content: space-between;">
      <h1>${t('admin.settings')}</h1>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" id="settings-undo-btn" ${settingsHistoryIndex <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="${currentLang === 'ar' ? 'تراجع' : 'Undo'}">
          <i class="ph ph-arrow-u-up-left"></i> ${currentLang === 'ar' ? 'تراجع' : 'Undo'}
        </button>
        <button class="btn btn-secondary btn-sm" id="settings-redo-btn" ${settingsHistoryIndex >= settingsHistory.length - 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="${currentLang === 'ar' ? 'إعادة' : 'Redo'}">
          <i class="ph ph-arrow-u-up-right"></i> ${currentLang === 'ar' ? 'إعادة' : 'Redo'}
        </button>
      </div>
    </div>

    <!-- Store Identity -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="section-icon"><i class="ph ph-storefront"></i></span>
        <span>${t('admin.storeIdentity')}</span>
      </div>
      <div class="settings-section-body">
        <div class="admin-form" id="settings-identity-form">
          <div class="form-group full-width">
            <label for="set-store-name">${t('admin.storeName')}</label>
            <input type="text" id="set-store-name" value="${settings.storeName}">
          </div>
          <div class="form-group">
            <label for="set-subtitle-ar">${t('admin.subtitleAr')}</label>
            <input type="text" id="set-subtitle-ar" value="${settings.subtitle_ar}">
          </div>
          <div class="form-group">
            <label for="set-subtitle-en">${t('admin.subtitleEn')}</label>
            <input type="text" id="set-subtitle-en" value="${settings.subtitle_en}">
          </div>
          <div class="form-group full-width">
            <label for="set-about-ar">${t('admin.aboutAr')}</label>
            <textarea id="set-about-ar">${settings.aboutText_ar}</textarea>
          </div>
          <div class="form-group full-width">
            <label for="set-about-en">${t('admin.aboutEn')}</label>
            <textarea id="set-about-en">${settings.aboutText_en}</textarea>
          </div>
        </div>
      </div>
    </div>
    ${renderSettingsPart2()}
  `;
}

// ===== DESIGN PAGE =====
function renderDesign() {
  const settings = Store.getSettings();
  const fontSelect = (id, options, selected) => `
    <select id="${id}" class="form-select">
      ${options.map(f => `<option value="${f}" ${selected === f ? 'selected' : ''}>${f}</option>`).join('')}
    </select>
  `;

  return `
    <div class="page-header" style="flex-direction: row; align-items: center; justify-content: space-between;">
      <h1>${currentLang === 'ar' ? 'التصميم والنصوص' : 'Design & Texts'}</h1>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" id="design-undo-btn" ${settingsHistoryIndex <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="${currentLang === 'ar' ? 'تراجع' : 'Undo'}">
          <i class="ph ph-arrow-u-up-left"></i> ${currentLang === 'ar' ? 'تراجع' : 'Undo'}
        </button>
        <button class="btn btn-secondary btn-sm" id="design-redo-btn" ${settingsHistoryIndex >= settingsHistory.length - 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="${currentLang === 'ar' ? 'إعادة' : 'Redo'}">
          <i class="ph ph-arrow-u-up-right"></i> ${currentLang === 'ar' ? 'إعادة' : 'Redo'}
        </button>
      </div>
    </div>



    <!-- Image Dimension Tips -->
    <div class="settings-section" style="border-left: 4px solid var(--accent); background: rgba(201,160,78,0.05);">
      <div class="settings-section-body" style="padding: 15px;">
        <h4 style="margin-bottom: 10px; color: var(--accent);"><i class="ph ph-info"></i> ${currentLang === 'ar' ? 'نصيحة حول أبعاد الصور' : 'Image Dimensions Tip'}</h4>
        <p style="margin-bottom: 5px; font-size: 0.95rem;">${currentLang === 'ar' ? 'للحصول على أفضل مظهر للبنرات وصور السلايدر بدون تشوه:' : 'For the best appearance of banners and slider images without distortion:'}</p>
        <ul style="list-style-type: disc; margin-inline-start: 20px; font-size: 0.9rem; color: var(--text-secondary);">
          <li><b>${currentLang === 'ar' ? 'السلايدر الرئيسي:' : 'Hero Slider:'}</b> ${currentLang === 'ar' ? 'يفضل استخدام صور أفقية عريضة (مثال: 1920 بيكسل عرض × 800 بيكسل طول).' : 'Prefer wide horizontal images (e.g. 1920px width × 800px height).'}</li>
          <li><b>${currentLang === 'ar' ? 'البنرات الحرة:' : 'Custom Banners:'}</b> ${currentLang === 'ar' ? 'يفضل استخدام صور بأبعاد 1200 عرض × 400 طول.' : 'Prefer dimensions of 1200 width × 400 height.'}</li>
          <li>${currentLang === 'ar' ? 'الصور يتم ضبطها تلقائياً لتغطية المساحة المتاحة (Cover) مع التركيز على وسط الصورة.' : 'Images are automatically adjusted to cover the available area, keeping the center focused.'}</li>
        </ul>
      </div>
    </div>

    <!-- Hero Slider -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="section-icon"><i class="ph ph-images"></i></span>
        <span>${currentLang === 'ar' ? 'السلايدر الرئيسي (Hero)' : 'Hero Slider'}</span>
      </div>
      <div class="settings-section-body">
        <div class="admin-form mb-16">
          <div class="form-group">
            <label>${currentLang === 'ar' ? 'مدة التبديل بين الصور (بالثواني)' : 'Slider Interval (seconds)'}</label>
            <input type="number" id="set-slider-interval" value="${settings.sliderInterval || 4}" min="1" max="10">
          </div>
          
          <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="set-hero-title-bold" ${settings.heroTitleBold ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
            <label for="set-hero-title-bold" style="cursor:pointer; font-weight: bold;">${currentLang === 'ar' ? 'العنوان الرئيسي عريض (Bold)' : 'Bold Main Title'}</label>
          </div>
          <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="set-hero-sub-bold" ${settings.heroSubtitleBold ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
            <label for="set-hero-sub-bold" style="cursor:pointer; font-weight: bold;">${currentLang === 'ar' ? 'النص الفرعي عريض (Bold)' : 'Bold Subtitle'}</label>
          </div>
          <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom: 15px;">
            <input type="checkbox" id="set-hero-btn-bold" ${settings.heroBtnBold ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
            <label for="set-hero-btn-bold" style="cursor:pointer; font-weight: bold;">${currentLang === 'ar' ? 'نص الزر عريض (Bold)' : 'Bold Button Text'}</label>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'حجم العنوان' : 'Title Size'}</label>
              <input type="text" id="set-hero-title-size" value="${settings.heroTitleSize || '4rem'}" placeholder="e.g. 4rem or 60px">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'حجم النص الفرعي' : 'Subtitle Size'}</label>
              <input type="text" id="set-hero-sub-size" value="${settings.heroSubtitleSize || '1.5rem'}" placeholder="e.g. 1.5rem or 24px">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'حجم نص الزر' : 'Button Text Size'}</label>
              <input type="text" id="set-hero-btn-size" value="${settings.heroBtnSize || '1.1rem'}" placeholder="e.g. 1.1rem or 18px">
            </div>
          </div>
        </div>
        <div id="slider-settings-container">
          ${(settings.heroSlider || []).map((slide, i) => `
            <div class="slide-setting-item" style="border: 1px solid var(--border); padding: 15px; margin-bottom: 15px; border-radius: 8px; position:relative;">
              <h5 style="margin-bottom: 10px;">Slide ${i + 1}</h5>
              <button class="btn btn-danger btn-sm" style="position:absolute; top:15px; inset-inline-end:15px; padding:6px 12px;" type="button" data-action="delete-slide">${currentLang === 'ar' ? 'حذف' : 'Delete'}</button>
              
              <div class="admin-form">
                <div class="form-group full-width">
                  <label>${currentLang === 'ar' ? 'الصورة (URL)' : 'Image (URL)'}</label>
                  <input type="text" class="slide-img" value="${slide.image || ''}">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
                  <input type="text" class="slide-title-ar" value="${slide.title_ar || ''}">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
                  <input type="text" class="slide-title-en" value="${slide.title_en || ''}">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'النص الفرعي (عربي)' : 'Subtitle (Arabic)'}</label>
                  <input type="text" class="slide-sub-ar" value="${slide.subtitle_ar || ''}">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'النص الفرعي (إنجليزي)' : 'Subtitle (English)'}</label>
                  <input type="text" class="slide-sub-en" value="${slide.subtitle_en || ''}">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'لون العنوان' : 'Title Color'}</label>
                  <input type="color" class="slide-text-color" value="${slide.textColor || '#c9a04e'}" style="height:40px;padding:2px;">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'لون النص الفرعي' : 'Subtitle Color'}</label>
                  <input type="color" class="slide-subtitle-color" value="${slide.subtitleColor || '#ffffff'}" style="height:40px;padding:2px;">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'لون خلفية الزر' : 'Button Background'}</label>
                  <input type="color" class="slide-btn-bg" value="${slide.buttonBg || '#c9a04e'}" style="height:40px;padding:2px;">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'لون نص الزر' : 'Button Text Color'}</label>
                  <input type="color" class="slide-btn-text" value="${slide.buttonText || '#0a0a0f'}" style="height:40px;padding:2px;">
                </div>
              </div>
              
              <!-- Slide Live Preview -->
              <h6 style="margin-top: 15px; margin-bottom: 5px; color: var(--text-secondary);">${currentLang === 'ar' ? 'معاينة السلايدر:' : 'Slide Preview:'}</h6>
              <div class="slide-preview-box" style="border: 1px solid var(--border); border-radius: 8px; overflow: hidden; height: 180px; position: relative; display: flex; align-items: center; justify-content: center; background: #000;">
                <img src="${slide.image || ''}" class="prev-slide-img" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.5;">
                <div style="position: relative; z-index: 1; text-align: center; padding: 20px;">
                  <h3 class="prev-slide-title" style="color:${slide.textColor || '#c9a04e'}; margin-bottom: 5px; font-size: 1.5rem; margin-top: 0;">${(currentLang === 'ar' ? slide.title_ar : slide.title_en) || (currentLang === 'ar' ? 'العنوان التجريبي' : 'Sample Title')}</h3>
                  <p class="prev-slide-sub" style="color:${slide.subtitleColor || '#ffffff'}; margin-bottom: 15px; font-size: 1rem;">${(currentLang === 'ar' ? slide.subtitle_ar : slide.subtitle_en) || (currentLang === 'ar' ? 'النص الفرعي التجريبي' : 'Sample Subtitle')}</p>
                  <button class="prev-slide-btn" style="background:${slide.buttonBg || '#c9a04e'}; color:${slide.buttonText || '#0a0a0f'}; border: 1px solid rgba(128,128,128,0.25); padding:8px 20px; border-radius:6px; font-weight:bold;">${currentLang === 'ar' ? 'تسوق الآن' : 'Shop Now'}</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="text-align: start; margin-top: 15px; margin-bottom: 15px;">
          <button class="btn btn-secondary" id="add-slide-btn" type="button">
            <i class="ph ph-plus"></i> ${currentLang === 'ar' ? 'إضافة صورة جديدة' : 'Add Slide'}
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Promotional Banners -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="section-icon"><i class="ph ph-flag-banner"></i></span>
        <span>${currentLang === 'ar' ? 'النصوص والبنرات الحرة' : 'Custom Banners'}</span>
      </div>
      <div class="settings-section-body">
        <div id="custom-banners-container">
          ${(settings.customBanners || []).map((banner, i) => `
            <div class="banner-setting-item admin-form" style="padding:16px; border:1px solid rgba(255,255,255,0.1); border-radius:8px; margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <h5 style="margin:0">${currentLang === 'ar' ? 'بنر' : 'Banner'} ${i + 1}</h5>
                <button class="btn-icon btn-danger btn-sm" data-action="delete-custom-banner"><i class="ph ph-trash"></i></button>
              </div>
              <div class="form-row">
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" class="banner-active" ${banner.active ? 'checked' : ''}>
                  <label>${currentLang === 'ar' ? 'تفعيل' : 'Active'}</label>
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'الحجم' : 'Size'}</label>
                  <select class="banner-size">
                    <option value="small" ${banner.size === 'small' ? 'selected' : ''}>${currentLang === 'ar' ? 'صغير' : 'Small'}</option>
                    <option value="medium" ${banner.size === 'medium' ? 'selected' : ''}>${currentLang === 'ar' ? 'متوسط' : 'Medium'}</option>
                    <option value="large" ${banner.size === 'large' ? 'selected' : ''}>${currentLang === 'ar' ? 'كبير' : 'Large'}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'المحاذاة' : 'Alignment'}</label>
                  <select class="banner-align">
                    <option value="center" ${banner.align === 'center' ? 'selected' : ''}>${currentLang === 'ar' ? 'وسط' : 'Center'}</option>
                    <option value="right" ${banner.align === 'right' ? 'selected' : ''}>${currentLang === 'ar' ? 'يمين' : 'Right'}</option>
                    <option value="left" ${banner.align === 'left' ? 'selected' : ''}>${currentLang === 'ar' ? 'يسار' : 'Left'}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'مكان الظهور' : 'Position'}</label>
                  <select class="banner-position">
                    <option value="top" ${banner.position === 'top' ? 'selected' : ''}>${currentLang === 'ar' ? 'أعلى الرئيسية (تحت السلايدر)' : 'Home Top (Below Slider)'}</option>
                    <option value="middle" ${banner.position === 'middle' ? 'selected' : ''}>${currentLang === 'ar' ? 'وسط الرئيسية (فوق المنتجات)' : 'Home Middle (Above Products)'}</option>
                    <option value="bottom" ${banner.position === 'bottom' ? 'selected' : ''}>${currentLang === 'ar' ? 'أسفل الرئيسية (فوق الفوتر)' : 'Home Bottom (Above Footer)'}</option>
                    <option value="product_top" ${banner.position === 'product_top' ? 'selected' : ''}>${currentLang === 'ar' ? 'أعلى صفحة المنتج' : 'Product Page Top'}</option>
                    <option value="product_bottom" ${banner.position === 'product_bottom' ? 'selected' : ''}>${currentLang === 'ar' ? 'أسفل صفحة المنتج' : 'Product Page Bottom'}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'النص (عربي)' : 'Text (Arabic)'}</label>
                  <textarea class="banner-text-ar" rows="2">${banner.text_ar || ''}</textarea>
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'النص (إنجليزي)' : 'Text (English)'}</label>
                  <textarea class="banner-text-en" rows="2">${banner.text_en || ''}</textarea>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'لون الخلفية' : 'Background Color'}</label>
                  <input type="color" class="banner-bg-color" value="${banner.bgColor || '#1a1a2e'}" style="height:40px;padding:2px;">
                </div>
                <div class="form-group">
                  <label>${currentLang === 'ar' ? 'لون النص' : 'Text Color'}</label>
                  <input type="color" class="banner-text-color" value="${banner.textColor || '#f0f0f5'}" style="height:40px;padding:2px;">
                </div>
              </div>
              
              <!-- Banner Live Preview -->
              <h6 style="margin-top: 15px; margin-bottom: 5px; color: var(--text-secondary);">${currentLang === 'ar' ? 'معاينة البنر:' : 'Banner Preview:'}</h6>
              <div class="banner-preview-box" style="padding: 20px; text-align: ${banner.align || 'center'}; background:${banner.bgColor || '#1a1a2e'}; color:${banner.textColor || '#f0f0f5'}; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.2);">
                <span class="prev-banner-text" style="font-size: 1.1rem; font-weight: bold;">${(currentLang === 'ar' ? banner.text_ar : banner.text_en) || (currentLang === 'ar' ? 'نص البنر التجريبي' : 'Sample Banner Text')}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="text-align: start; margin-top: 15px; margin-bottom: 15px;">
          <button class="btn btn-secondary" id="add-custom-banner-btn" type="button">
            <i class="ph ph-plus"></i> ${currentLang === 'ar' ? 'إضافة بنر جديد' : 'Add New Banner'}
          </button>
        </div>
      </div>
    </div>
    <div style="text-align:center;padding:20px 0">
      <button class="btn btn-primary" id="save-design-btn" style="padding:14px 40px;font-size:16px">
        <i class="ph ph-floppy-disk"></i> ${currentLang === 'ar' ? 'حفظ التصميم' : 'Save Design'}
      </button>
    </div>
  `;
}

function renderSettingsPart2() {
  const settings = Store.getSettings();
  return `
    <!-- Announcement Bar -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="section-icon"><i class="ph ph-megaphone"></i></span>
        <span>${currentLang === 'ar' ? 'شريط الإعلانات (أعلى الموقع)' : 'Announcement Bar'}</span>
      </div>
      <div class="settings-section-body">
        <div class="admin-form">
          <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; grid-column: 1 / -1; margin-bottom:16px;">
            <input type="checkbox" id="set-announcement-active" ${settings.announcementActive ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
            <label for="set-announcement-active" style="font-weight:bold; cursor:pointer; font-size:15px;">
              ${currentLang === 'ar' ? 'تفعيل شريط الإعلانات' : 'Enable Announcement Bar'}
            </label>
          </div>
          <div class="form-group">
            <label>${currentLang === 'ar' ? 'نص الإعلان (عربي)' : 'Announcement Text (Arabic)'}</label>
            <input type="text" id="set-announcement-ar" value="${settings.announcementText_ar || ''}" placeholder="مثال: خصم 50% لفترة محدودة!">
          </div>
          <div class="form-group">
            <label>${currentLang === 'ar' ? 'نص الإعلان (إنجليزي)' : 'Announcement Text (English)'}</label>
            <input type="text" id="set-announcement-en" value="${settings.announcementText_en || ''}" placeholder="e.g. 50% Off Limited Time!">
          </div>
          <div class="form-group">
            <label>${currentLang === 'ar' ? 'لون الخلفية' : 'Background Color'}</label>
            <input type="color" id="set-announcement-bg" value="${settings.announcementBgColor || '#000000'}" style="height:40px;padding:2px;">
          </div>
          <div class="form-group">
            <label>${currentLang === 'ar' ? 'لون النص' : 'Text Color'}</label>
            <input type="color" id="set-announcement-text" value="${settings.announcementTextColor || '#ffffff'}" style="height:40px;padding:2px;">
          </div>
        </div>
      </div>
    </div>

    <!-- Contact -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="section-icon"><i class="ph ph-phone"></i></span>
        <span>${t('admin.contactInfo')}</span>
      </div>
      <div class="settings-section-body">
        <div class="admin-form">
          <div class="form-group">
            <label for="set-phone">${t('admin.contactPhone')}</label>
            <input type="text" id="set-phone" value="${settings.contactPhone}" dir="ltr">
          </div>
          <div class="form-group">
            <label for="set-whatsapp">${t('admin.contactWhatsapp')}</label>
            <input type="text" id="set-whatsapp" value="${settings.contactWhatsapp || ''}" dir="ltr" placeholder="+201000000000">
          </div>
          <div class="form-group">
            <label>${currentLang === 'ar' ? 'رابط فيسبوك' : 'Facebook Link'}</label>
            <input type="text" id="set-facebook" value="${settings.socialFacebook || ''}" dir="ltr" placeholder="https://facebook.com/...">
          </div>
          <div class="form-group">
            <label>${currentLang === 'ar' ? 'رابط انستجرام' : 'Instagram Link'}</label>
            <input type="text" id="set-instagram" value="${settings.socialInstagram || ''}" dir="ltr" placeholder="https://instagram.com/...">
          </div>
          <div class="form-group">
            <label for="set-email">${t('admin.contactEmail')}</label>
            <input type="email" id="set-email" value="${settings.contactEmail}" dir="ltr">
          </div>
          <div class="form-group">
            <label for="set-address-ar">${t('admin.addressAr')}</label>
            <input type="text" id="set-address-ar" value="${settings.address_ar}">
          </div>
          <div class="form-group">
            <label for="set-address-en">${t('admin.addressEn')}</label>
            <input type="text" id="set-address-en" value="${settings.address_en}">
          </div>
        </div>
      </div>
    </div>

    <!-- Shipping -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="section-icon"><i class="ph ph-truck"></i></span>
        <span>${t('admin.shippingSettings')}</span>
      </div>
      <div class="settings-section-body">
        <div class="admin-form">
          <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; grid-column: 1 / -1; margin-bottom:16px;">
            <input type="checkbox" id="set-free-shipping-active" ${settings.freeShippingActive ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
            <label for="set-free-shipping-active" style="font-weight:bold; cursor:pointer; font-size:15px;">
              ${currentLang === 'ar' ? 'تفعيل الشحن المجاني عند الوصول للحد الأدنى' : 'Enable Free Shipping when reaching threshold'}
            </label>
          </div>
          <div class="form-group">
            <label for="set-shipping-cost">${t('admin.shippingCost')} (${t('admin.currency')})</label>
            <input type="number" id="set-shipping-cost" min="0" value="${settings.shippingCost}">
          </div>
          <div class="form-group">
            <label for="set-free-threshold">${t('admin.freeShippingThreshold')} (${t('admin.currency')})</label>
            <input type="number" id="set-free-threshold" min="0" value="${settings.freeShippingThreshold}">
          </div>
        </div>
        
        <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0; font-size:15px; color:var(--text-primary); font-family:var(--font-ar-heading);">${currentLang === 'ar' ? 'أسعار الشحن التفصيلية للمحافظات' : 'Detailed Shipping Rates by City'}</h4>
            <div>
              <input type="file" id="shipping-csv-upload" accept=".csv" style="display:none;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-shipping-csv" title="${currentLang === 'ar' ? 'رفع ملف CSV للأسعار' : 'Upload CSV for Rates'}">
                <i class="ph ph-upload-simple"></i> ${currentLang === 'ar' ? 'رفع أسعار (CSV)' : 'Upload Rates (CSV)'}
              </button>
            </div>
          </div>
          <div class="shipping-rates-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:12px; max-height:280px; overflow-y:auto; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-input);">
            ${Object.entries(settings.shippingRates || {}).map(([city, rate]) => `
              <div class="form-group" style="margin-bottom:0; display:flex; flex-direction:column; gap:4px;">
                <label style="font-size:12px; color:var(--text-secondary);">${city}</label>
                <input type="number" class="city-shipping-rate" data-city="${city}" value="${rate}" min="0" style="padding:6px 10px; font-size:14px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary);">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- EmailJS Settings -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="section-icon"><i class="ph ph-envelope-simple"></i></span>
        <span>${currentLang === 'ar' ? 'إعدادات البريد (EmailJS)' : 'Email Settings (EmailJS)'}</span>
      </div>
      <div class="settings-section-body">
        <p class="text-muted" style="margin-bottom:16px;font-size:14px">
          ${currentLang === 'ar' ? 'قم بإنشاء حساب في emailjs.com مجاناً لإرسال الطلبات إلى بريدك.' : 'Create a free account at emailjs.com to receive order emails.'}
        </p>
        <div class="form-row">
          <div class="form-group">
            <label>Service ID</label>
            <input type="text" id="set-email-service" value="${settings.emailjs_service_id || ''}" placeholder="e.g. service_xxxx">
          </div>
          <div class="form-group">
            <label>Template ID</label>
            <input type="text" id="set-email-template" value="${settings.emailjs_template_id || ''}" placeholder="e.g. template_xxxx">
          </div>
          <div class="form-group">
            <label>Public Key</label>
            <input type="text" id="set-email-key" value="${settings.emailjs_public_key || ''}" placeholder="e.g. abcd1234EFGH">
          </div>
        </div>
      </div>
    </div>

    <div style="text-align:center;padding:20px 0">
      <button class="btn btn-primary" id="save-settings-btn" style="padding:14px 40px;font-size:16px">
        <i class="ph ph-floppy-disk"></i> ${t('admin.saveSettings')}
      </button>
    </div>
  `;
}

function attachSettingsListeners() {

  // Color live preview
  const colorInput = document.getElementById('set-accent-color');
  const colorSwatch = document.getElementById('color-swatch');
  const colorBtn = document.getElementById('color-btn-sample');

  if (colorInput) {
    colorInput.addEventListener('input', () => {
      const color = colorInput.value;
      if (colorSwatch) colorSwatch.style.background = color;
      if (colorBtn) colorBtn.style.background = color;
    });
  }

  // Save settings
  const saveBtn = document.getElementById('save-settings-btn');

  // CSV Upload Logic
  const csvUploadBtn = document.getElementById('btn-upload-shipping-csv');
  const csvInput = document.getElementById('shipping-csv-upload');
  if (csvUploadBtn && csvInput) {
    csvUploadBtn.addEventListener('click', () => {
      csvInput.click();
    });
    csvInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        let updatedCount = 0;
        lines.forEach((line, index) => {
          if (index === 0 && (line.includes('المحافظة') || line.includes('City') || line.includes('السعر') || line.includes('Price'))) {
            return; // Skip header
          }
          const parts = line.split(',');
          if (parts.length >= 2) {
            const city = parts[0].trim();
            const rate = parseFloat(parts[1].trim());
            if (city && !isNaN(rate)) {
              let input = document.querySelector(`.city-shipping-rate[data-city="${city}"]`);
              if (input) {
                input.value = rate;
                updatedCount++;
              } else {
                const grid = document.querySelector('.shipping-rates-grid');
                if (grid) {
                  const div = document.createElement('div');
                  div.className = 'form-group';
                  div.style = 'margin-bottom:0; display:flex; flex-direction:column; gap:4px;';
                  div.innerHTML = `
                    <label style="font-size:12px; color:var(--text-secondary);">${escapeHtml(city)}</label>
                    <input type="number" class="city-shipping-rate" data-city="${escapeHtml(city)}" value="${rate}" min="0" style="padding:6px 10px; font-size:14px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary);">
                  `;
                  grid.appendChild(div);
                  updatedCount++;
                }
              }
            }
          }
        });
        alert(currentLang === 'ar' ? `تم تحديث ${updatedCount} محافظة بنجاح. لا تنسى ضغط حفظ الإعدادات.` : `Successfully updated ${updatedCount} cities. Don't forget to Save Settings.`);
        csvInput.value = ''; // Reset
      };
      reader.readAsText(file);
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const shippingRates = {};
      document.querySelectorAll('.city-shipping-rate').forEach(input => {
        const city = input.getAttribute('data-city');
        const rate = parseFloat(input.value) || 0;
        if (city) {
          shippingRates[city] = rate;
        }
      });

      const newSettings = {
        storeName: document.getElementById('set-store-name')?.value || 'Medix',
        subtitle_ar: document.getElementById('set-subtitle-ar')?.value || '',
        subtitle_en: document.getElementById('set-subtitle-en')?.value || '',
        aboutText_ar: document.getElementById('set-about-ar')?.value || '',
        aboutText_en: document.getElementById('set-about-en')?.value || '',
        contactPhone: document.getElementById('set-phone')?.value || '',
        contactWhatsapp: document.getElementById('set-whatsapp')?.value || '',
        socialFacebook: document.getElementById('set-facebook')?.value || '',
        socialInstagram: document.getElementById('set-instagram')?.value || '',
        contactEmail: document.getElementById('set-email')?.value || '',
        address_ar: document.getElementById('set-address-ar')?.value || '',
        address_en: document.getElementById('set-address-en')?.value || '',
        
        announcementActive: document.getElementById('set-announcement-active')?.checked || false,
        announcementText_ar: document.getElementById('set-announcement-ar')?.value || '',
        announcementText_en: document.getElementById('set-announcement-en')?.value || '',
        announcementBgColor: document.getElementById('set-announcement-bg')?.value || '#000000',
        announcementTextColor: document.getElementById('set-announcement-text')?.value || '#ffffff',

        shippingCost: parseFloat(document.getElementById('set-shipping-cost')?.value) || 0,
        freeShippingActive: document.getElementById('set-free-shipping-active')?.checked || false,
        freeShippingThreshold: parseFloat(document.getElementById('set-free-threshold')?.value) || 0,
        shippingRates: shippingRates,
        emailjs_service_id: document.getElementById('set-email-service')?.value.trim() || '',
        emailjs_template_id: document.getElementById('set-email-template')?.value.trim() || '',
        emailjs_public_key: document.getElementById('set-email-key')?.value.trim() || ''
      };

      // Add to settings history
      if (settingsHistoryIndex === -1) {
        const current = Store.getSettings();
        settingsHistory = [JSON.parse(JSON.stringify(current))];
        settingsHistoryIndex = 0;
      }
      settingsHistory = settingsHistory.slice(0, settingsHistoryIndex + 1);
      settingsHistory.push(JSON.parse(JSON.stringify({...Store.getSettings(), ...newSettings})));
      settingsHistoryIndex = settingsHistory.length - 1;

      Store.saveSettings(newSettings);
      showToast(t('admin.settingsSaved'), 'success');
      renderContentArea('settings');
    });
  }

  // Undo / Redo Click Handlers
  const undoBtn = document.getElementById('settings-undo-btn');
  const redoBtn = document.getElementById('settings-redo-btn');

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (settingsHistoryIndex > 0) {
        settingsHistoryIndex--;
        const prevSettings = settingsHistory[settingsHistoryIndex];
        Store.saveSettings(prevSettings);
        showToast(currentLang === 'ar' ? 'تم التراجع عن التعديل' : 'Undo successful', 'info');
        renderContentArea('settings');
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      if (settingsHistoryIndex < settingsHistory.length - 1) {
        settingsHistoryIndex++;
        const nextSettings = settingsHistory[settingsHistoryIndex];
        Store.saveSettings(nextSettings);
        showToast(currentLang === 'ar' ? 'تم إعادة تطبيق التعديل' : 'Redo successful', 'info');
        renderContentArea('settings');
      }
    });
  }
}

function attachDesignListeners() {
  // --- Live Previews ---
  const headingSelect = document.getElementById('set-font-heading');
  const bodySelect = document.getElementById('set-font-body');
  const arHeadingSelect = document.getElementById('set-font-ar-heading');
  const arBodySelect = document.getElementById('set-font-ar-body');
  
  const prevArHeading = document.getElementById('font-preview-ar-heading');
  const prevArBody = document.getElementById('font-preview-ar-body');
  const prevEnHeading = document.getElementById('font-preview-en-heading');
  const prevEnBody = document.getElementById('font-preview-en-body');

  if (headingSelect) {
    headingSelect.addEventListener('change', () => {
      loadGoogleFont(headingSelect.value);
      if (prevEnHeading) prevEnHeading.style.fontFamily = `'${headingSelect.value}', serif`;
    });
  }
  if (bodySelect) {
    bodySelect.addEventListener('change', () => {
      loadGoogleFont(bodySelect.value);
      if (prevEnBody) prevEnBody.style.fontFamily = `'${bodySelect.value}', sans-serif`;
    });
  }
  if (arHeadingSelect) {
    arHeadingSelect.addEventListener('change', () => {
      loadGoogleFont(arHeadingSelect.value);
      if (prevArHeading) prevArHeading.style.fontFamily = `'${arHeadingSelect.value}', sans-serif`;
    });
  }
  if (arBodySelect) {
    arBodySelect.addEventListener('change', () => {
      loadGoogleFont(arBodySelect.value);
      if (prevArBody) prevArBody.style.fontFamily = `'${arBodySelect.value}', sans-serif`;
    });
  }

  const colorInput = document.getElementById('set-accent-color');
  const colorSwatch = document.getElementById('color-swatch');
  const colorBtn = document.getElementById('color-btn-sample');

  if (colorInput) {
    colorInput.addEventListener('input', () => {
      const color = colorInput.value;
      if (colorSwatch) colorSwatch.style.background = color;
      if (colorBtn) colorBtn.style.background = color;
    });
  }
  // --- Sliders Live Preview Delegation ---
  const sliderContainerEl = document.getElementById('slider-settings-container');
  if (sliderContainerEl) {
    sliderContainerEl.addEventListener('input', (e) => {
      const item = e.target.closest('.slide-setting-item');
      if (!item) return;
      
      const img = item.querySelector('.prev-slide-img');
      const title = item.querySelector('.prev-slide-title');
      const sub = item.querySelector('.prev-slide-sub');
      const btn = item.querySelector('.prev-slide-btn');
      
      if (e.target.classList.contains('slide-img') && img) {
        img.src = e.target.value;
      }
      if (e.target.classList.contains('slide-title-ar') && currentLang === 'ar' && title) {
        title.textContent = e.target.value || 'العنوان التجريبي';
      }
      if (e.target.classList.contains('slide-title-en') && currentLang === 'en' && title) {
        title.textContent = e.target.value || 'Sample Title';
      }
      if (e.target.classList.contains('slide-sub-ar') && currentLang === 'ar' && sub) {
        sub.textContent = e.target.value || 'النص الفرعي التجريبي';
      }
      if (e.target.classList.contains('slide-sub-en') && currentLang === 'en' && sub) {
        sub.textContent = e.target.value || 'Sample Subtitle';
      }
      if (e.target.classList.contains('slide-text-color') && title) {
        title.style.color = e.target.value;
      }
      if (e.target.classList.contains('slide-subtitle-color') && sub) {
        sub.style.color = e.target.value;
      }
      if (e.target.classList.contains('slide-btn-bg') && btn) {
        btn.style.background = e.target.value;
      }
      if (e.target.classList.contains('slide-btn-text') && btn) {
        btn.style.color = e.target.value;
      }
    });
  }

  // --- Custom Banners Live Preview Delegation ---
  const bannersContainerEl = document.getElementById('custom-banners-container');
  if (bannersContainerEl) {
    bannersContainerEl.addEventListener('input', (e) => {
      const item = e.target.closest('.banner-setting-item');
      if (!item) return;
      
      const previewBox = item.querySelector('.banner-preview-box');
      const previewText = item.querySelector('.prev-banner-text');
      if (!previewBox || !previewText) return;
      
      if (e.target.classList.contains('banner-text-ar') && currentLang === 'ar') {
        previewText.textContent = e.target.value || 'نص البنر التجريبي';
      }
      if (e.target.classList.contains('banner-text-en') && currentLang === 'en') {
        previewText.textContent = e.target.value || 'Sample Banner Text';
      }
      if (e.target.classList.contains('banner-bg-color')) {
        previewBox.style.background = e.target.value;
      }
      if (e.target.classList.contains('banner-text-color')) {
        previewBox.style.color = e.target.value;
      }
      if (e.target.classList.contains('banner-align')) {
        previewBox.style.textAlign = e.target.value;
      }
    });
  }

  // Save design settings
  const saveBtn = document.getElementById('save-design-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const slideItems = document.querySelectorAll('.slide-setting-item');
      const heroSlider = [];
      slideItems.forEach(item => {
        heroSlider.push({
          image: item.querySelector('.slide-img').value,
          title_ar: item.querySelector('.slide-title-ar').value,
          title_en: item.querySelector('.slide-title-en').value,
          subtitle_ar: item.querySelector('.slide-sub-ar').value,
          subtitle_en: item.querySelector('.slide-sub-en').value,
          buttonText_ar: 'تسوق الآن',
          buttonText_en: 'Shop Now',
          buttonLink: '#/products',
          textColor: item.querySelector('.slide-text-color')?.value || '#c9a04e',
          subtitleColor: item.querySelector('.slide-subtitle-color')?.value || '#ffffff',
          buttonBg: item.querySelector('.slide-btn-bg')?.value || '#c9a04e',
          buttonText: item.querySelector('.slide-btn-text')?.value || '#0a0a0f'
        });
      });

      const bannerItems = document.querySelectorAll('.banner-setting-item');
      const customBanners = [];
      bannerItems.forEach(item => {
        customBanners.push({
          active: item.querySelector('.banner-active')?.checked || false,
          size: item.querySelector('.banner-size')?.value || 'medium',
          align: item.querySelector('.banner-align')?.value || 'center',
          position: item.querySelector('.banner-position')?.value || 'top',
          text_ar: item.querySelector('.banner-text-ar')?.value || '',
          text_en: item.querySelector('.banner-text-en')?.value || '',
          bgColor: item.querySelector('.banner-bg-color')?.value || '#1a1a2e',
          textColor: item.querySelector('.banner-text-color')?.value || '#f0f0f5'
        });
      });

      // Only save values for DOM elements that actually exist on the page
      // This prevents wiping font/color/welcome settings when those sections aren't rendered
      const currentSettings = Store.getSettings();
      const getVal = (id, fallback) => {
        const el = document.getElementById(id);
        return el ? el.value : fallback;
      };
      const getChecked = (id, fallback) => {
        const el = document.getElementById(id);
        return el ? el.checked : fallback;
      };

      const newSettings = {
        fontHeading: getVal('set-font-heading', currentSettings.fontHeading),
        fontBody: getVal('set-font-body', currentSettings.fontBody),
        fontArabicHeading: getVal('set-font-ar-heading', currentSettings.fontArabicHeading),
        fontArabicBody: getVal('set-font-ar-body', currentSettings.fontArabicBody),
        sliderInterval: parseFloat(document.getElementById('set-slider-interval')?.value) || currentSettings.sliderInterval || 4,
        heroTitleBold: document.getElementById('set-hero-title-bold')?.checked || false,
        heroSubtitleBold: document.getElementById('set-hero-sub-bold')?.checked || false,
        heroBtnBold: document.getElementById('set-hero-btn-bold')?.checked || false,
        heroTitleSize: document.getElementById('set-hero-title-size')?.value || '4rem',
        heroSubtitleSize: document.getElementById('set-hero-sub-size')?.value || '1.5rem',
        heroBtnSize: document.getElementById('set-hero-btn-size')?.value || '1.1rem',
        heroSlider: heroSlider,
        customBanners: customBanners,
        welcomePopupActive: getChecked('set-welcome-active', currentSettings.welcomePopupActive),
        welcomePopupTitle_ar: getVal('set-welcome-title-ar', currentSettings.welcomePopupTitle_ar),
        welcomePopupTitle_en: getVal('set-welcome-title-en', currentSettings.welcomePopupTitle_en),
        welcomePopupSubtitle_ar: getVal('set-welcome-sub-ar', currentSettings.welcomePopupSubtitle_ar),
        welcomePopupSubtitle_en: getVal('set-welcome-sub-en', currentSettings.welcomePopupSubtitle_en),
        welcomePopupCoupon: getVal('set-welcome-coupon', currentSettings.welcomePopupCoupon),
        welcomePopupBgColor: getVal('set-welcome-bg-color', currentSettings.welcomePopupBgColor),
        welcomePopupTextColor: getVal('set-welcome-text-color', currentSettings.welcomePopupTextColor),
        welcomePopupImage: getVal('set-welcome-image', currentSettings.welcomePopupImage),
        bodyBgColor: getVal('set-body-bg', currentSettings.bodyBgColor),
        textColor: getVal('set-text-color', currentSettings.textColor),
        accentColor: getVal('set-accent-color', currentSettings.accentColor),
        navBgColor: getVal('set-nav-bg', currentSettings.navBgColor),
        navTextColor: getVal('set-nav-text', currentSettings.navTextColor),
        btnBgColor: getVal('set-accent-color', currentSettings.btnBgColor),
        btnTextColor: getVal('set-btn-text', currentSettings.btnTextColor),
        headingColor: getVal('set-text-color', currentSettings.headingColor),
        footerBgColor: getVal('set-footer-bg', currentSettings.footerBgColor),
        footerTextColor: getVal('set-footer-text', currentSettings.footerTextColor)
      };

      loadGoogleFont(newSettings.fontHeading);
      loadGoogleFont(newSettings.fontBody);
      loadGoogleFont(newSettings.fontArabicHeading);
      loadGoogleFont(newSettings.fontArabicBody);

      if (settingsHistoryIndex === -1) {
        const current = Store.getSettings();
        settingsHistory = [JSON.parse(JSON.stringify(current))];
        settingsHistoryIndex = 0;
      }
      settingsHistory = settingsHistory.slice(0, settingsHistoryIndex + 1);
      settingsHistory.push(JSON.parse(JSON.stringify({...Store.getSettings(), ...newSettings})));
      settingsHistoryIndex = settingsHistory.length - 1;

      Store.saveSettings(newSettings);
      showToast(currentLang === 'ar' ? 'تم حفظ التصميم' : 'Design saved', 'success');
      renderContentArea('design');
    });
  }

  // Undo / Redo Click Handlers for Design
  const undoBtn = document.getElementById('design-undo-btn');
  const redoBtn = document.getElementById('design-redo-btn');

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (settingsHistoryIndex > 0) {
        settingsHistoryIndex--;
        const prevSettings = settingsHistory[settingsHistoryIndex];
        Store.saveSettings(prevSettings);
        showToast(currentLang === 'ar' ? 'تم التراجع عن التعديل' : 'Undo successful', 'info');
        renderContentArea('design');
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      if (settingsHistoryIndex < settingsHistory.length - 1) {
        settingsHistoryIndex++;
        const nextSettings = settingsHistory[settingsHistoryIndex];
        Store.saveSettings(nextSettings);
        showToast(currentLang === 'ar' ? 'تم إعادة تطبيق التعديل' : 'Redo successful', 'info');
        renderContentArea('design');
      }
    });
  }

  // Add slide button
  const addSlideBtn = document.getElementById('add-slide-btn');
  const sliderContainer = document.getElementById('slider-settings-container');
  if (addSlideBtn && sliderContainer) {
    addSlideBtn.addEventListener('click', () => {
      const slideIndex = sliderContainer.querySelectorAll('.slide-setting-item').length + 1;
      const slideHTML = `
        <div class="slide-setting-item" style="border: 1px solid var(--border); padding: 15px; margin-bottom: 15px; border-radius: 8px; position:relative;">
          <h5 style="margin-bottom: 10px;">Slide ${slideIndex}</h5>
          <button class="btn btn-danger btn-sm" style="position:absolute; top:15px; inset-inline-end:15px; padding:6px 12px;" type="button" data-action="delete-slide">${currentLang === 'ar' ? 'حذف' : 'Delete'}</button>
          <div class="admin-form">
            <div class="form-group full-width">
              <label>${currentLang === 'ar' ? 'الصورة (URL)' : 'Image (URL)'}</label>
              <input type="text" class="slide-img" value="">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
              <input type="text" class="slide-title-ar" value="">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
              <input type="text" class="slide-title-en" value="">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'النص الفرعي (عربي)' : 'Subtitle (Arabic)'}</label>
              <input type="text" class="slide-sub-ar" value="">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'النص الفرعي (إنجليزي)' : 'Subtitle (English)'}</label>
              <input type="text" class="slide-sub-en" value="">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'لون العنوان' : 'Title Color'}</label>
              <input type="color" class="slide-text-color" value="#c9a04e" style="height:40px;padding:2px;">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'لون النص الفرعي' : 'Subtitle Color'}</label>
              <input type="color" class="slide-subtitle-color" value="#ffffff" style="height:40px;padding:2px;">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'لون خلفية الزر' : 'Button Background'}</label>
              <input type="color" class="slide-btn-bg" value="#c9a04e" style="height:40px;padding:2px;">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'لون نص الزر' : 'Button Text Color'}</label>
              <input type="color" class="slide-btn-text" value="#0a0a0f" style="height:40px;padding:2px;">
            </div>
          </div>
          
          <h6 style="margin-top: 15px; margin-bottom: 5px; color: var(--text-secondary);">${currentLang === 'ar' ? 'معاينة السلايدر:' : 'Slide Preview:'}</h6>
          <div class="slide-preview-box" style="border: 1px solid var(--border); border-radius: 8px; overflow: hidden; height: 180px; position: relative; display: flex; align-items: center; justify-content: center; background: #000;">
            <img src="" class="prev-slide-img" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.5;">
            <div style="position: relative; z-index: 1; text-align: center; padding: 20px;">
              <h3 class="prev-slide-title" style="color:#c9a04e; margin-bottom: 5px; font-size: 1.5rem; margin-top: 0;">${currentLang === 'ar' ? 'العنوان' : 'Title'}</h3>
              <p class="prev-slide-sub" style="color:#ffffff; margin-bottom: 15px; font-size: 1rem;">${currentLang === 'ar' ? 'النص الفرعي' : 'Subtitle'}</p>
              <button class="prev-slide-btn" style="background:#c9a04e; color:#0a0a0f; border:none; padding:8px 20px; border-radius:6px; font-weight:bold;">${currentLang === 'ar' ? 'تسوق الآن' : 'Shop Now'}</button>
            </div>
          </div>
        </div>
      `;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = slideHTML;
      sliderContainer.appendChild(tempDiv.firstElementChild);
    });
  }

  // Add Custom Banner button
  const addCustomBannerBtn = document.getElementById('add-custom-banner-btn');
  const customBannersContainer = document.getElementById('custom-banners-container');
  if (addCustomBannerBtn && customBannersContainer) {
    addCustomBannerBtn.addEventListener('click', () => {
      const bannerIndex = customBannersContainer.querySelectorAll('.banner-setting-item').length + 1;
      const bannerHTML = `
        <div class="banner-setting-item admin-form" style="padding:16px; border:1px solid rgba(255,255,255,0.1); border-radius:8px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <h5 style="margin:0">${currentLang === 'ar' ? 'بنر' : 'Banner'} ${bannerIndex}</h5>
            <button class="btn-icon btn-danger btn-sm" data-action="delete-custom-banner" type="button"><i class="ph ph-trash"></i></button>
          </div>
          <div class="form-row">
            <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" class="banner-active" checked>
              <label>${currentLang === 'ar' ? 'تفعيل' : 'Active'}</label>
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'الحجم' : 'Size'}</label>
              <select class="banner-size">
                <option value="small">${currentLang === 'ar' ? 'صغير' : 'Small'}</option>
                <option value="medium" selected>${currentLang === 'ar' ? 'متوسط' : 'Medium'}</option>
                <option value="large">${currentLang === 'ar' ? 'كبير' : 'Large'}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'المحاذاة' : 'Alignment'}</label>
              <select class="banner-align">
                <option value="center" selected>${currentLang === 'ar' ? 'وسط' : 'Center'}</option>
                <option value="right">${currentLang === 'ar' ? 'يمين' : 'Right'}</option>
                <option value="left">${currentLang === 'ar' ? 'يسار' : 'Left'}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'مكان الظهور' : 'Position'}</label>
              <select class="banner-position">
                <option value="top" selected>${currentLang === 'ar' ? 'أعلى الرئيسية (تحت السلايدر)' : 'Home Top (Below Slider)'}</option>
                <option value="middle">${currentLang === 'ar' ? 'وسط الرئيسية (فوق المنتجات)' : 'Home Middle (Above Products)'}</option>
                <option value="bottom">${currentLang === 'ar' ? 'أسفل الرئيسية (فوق الفوتر)' : 'Home Bottom (Above Footer)'}</option>
                <option value="product_top">${currentLang === 'ar' ? 'أعلى صفحة المنتج' : 'Product Page Top'}</option>
                <option value="product_bottom">${currentLang === 'ar' ? 'أسفل صفحة المنتج' : 'Product Page Bottom'}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'النص (عربي)' : 'Text (Arabic)'}</label>
              <textarea class="banner-text-ar" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'النص (إنجليزي)' : 'Text (English)'}</label>
              <textarea class="banner-text-en" rows="2"></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'لون الخلفية' : 'Background Color'}</label>
              <input type="color" class="banner-bg-color" value="#1a1a2e" style="height:40px;padding:2px;">
            </div>
            <div class="form-group">
              <label>${currentLang === 'ar' ? 'لون النص' : 'Text Color'}</label>
              <input type="color" class="banner-text-color" value="#f0f0f5" style="height:40px;padding:2px;">
            </div>
          </div>
          
          <h6 style="margin-top: 15px; margin-bottom: 5px; color: var(--text-secondary);">${currentLang === 'ar' ? 'معاينة البنر:' : 'Banner Preview:'}</h6>
          <div class="banner-preview-box" style="padding: 20px; text-align: center; background:#1a1a2e; color:#f0f0f5; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.2);">
            <span class="prev-banner-text" style="font-size: 1.1rem; font-weight: bold;">${currentLang === 'ar' ? 'نص البنر' : 'Banner Text'}</span>
          </div>
        </div>
      `;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bannerHTML;
      customBannersContainer.appendChild(tempDiv.firstElementChild);
    });
  }

  // Live Preview Event Delegation for dynamic items (Slides and Banners)
  const designContent = document.getElementById('admin-content');
  if (designContent) {
    designContent.addEventListener('input', (e) => {
      const target = e.target;
      
      // Handle Slide Previews
      const slideItem = target.closest('.slide-setting-item');
      if (slideItem) {
        if (target.classList.contains('slide-img')) slideItem.querySelector('.prev-slide-img').src = target.value;
        if (target.classList.contains('slide-title-ar') && currentLang === 'ar') slideItem.querySelector('.prev-slide-title').textContent = target.value || 'العنوان';
        if (target.classList.contains('slide-title-en') && currentLang === 'en') slideItem.querySelector('.prev-slide-title').textContent = target.value || 'Title';
        if (target.classList.contains('slide-sub-ar') && currentLang === 'ar') slideItem.querySelector('.prev-slide-sub').textContent = target.value || 'النص الفرعي';
        if (target.classList.contains('slide-sub-en') && currentLang === 'en') slideItem.querySelector('.prev-slide-sub').textContent = target.value || 'Subtitle';
        if (target.classList.contains('slide-text-color')) slideItem.querySelector('.prev-slide-title').style.color = target.value;
        if (target.classList.contains('slide-subtitle-color')) slideItem.querySelector('.prev-slide-sub').style.color = target.value;
        if (target.classList.contains('slide-btn-bg')) slideItem.querySelector('.prev-slide-btn').style.background = target.value;
        if (target.classList.contains('slide-btn-text')) slideItem.querySelector('.prev-slide-btn').style.color = target.value;
      }
      
      // Handle Banner Previews
      const bannerItem = target.closest('.banner-setting-item');
      if (bannerItem) {
        const previewBox = bannerItem.querySelector('.banner-preview-box');
        if (target.classList.contains('banner-align')) previewBox.style.textAlign = target.value;
        if (target.classList.contains('banner-bg-color')) previewBox.style.background = target.value;
        if (target.classList.contains('banner-text-color')) previewBox.style.color = target.value;
        if (target.classList.contains('banner-text-ar') && currentLang === 'ar') bannerItem.querySelector('.prev-banner-text').textContent = target.value || 'نص البنر';
        if (target.classList.contains('banner-text-en') && currentLang === 'en') bannerItem.querySelector('.prev-banner-text').textContent = target.value || 'Banner Text';
      }
    });
  }
}

// ===== CONTENT AREA RENDERER =====
function renderContentArea(route) {
  const content = document.getElementById('admin-content');
  if (!content) return;

  switch (route) {
    case 'dashboard': content.innerHTML = renderDashboard(); break;
    case 'products': content.innerHTML = renderProducts(); break;
    case 'categories': content.innerHTML = renderCategories(); break;
    case 'coupons': content.innerHTML = renderCoupons(); break;
    case 'orders': content.innerHTML = renderOrders(); break;
    case 'reviews': content.innerHTML = renderReviews(); break;
    case 'settings':
      content.innerHTML = renderSettings();
      attachSettingsListeners();
      break;
    case 'design':
      content.innerHTML = renderDesign();
      attachDesignListeners();
      break;
    default: content.innerHTML = renderDashboard();
  }

  // Update active nav
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === route);
  });
}

// ===== EVENT DELEGATION =====
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.id;
  const btn = target;

  switch (action) {
    case 'close-modal':
      closeModal();
      break;

    case 'toggle-theme':
      toggleTheme();
      break;

    case 'toggle-lang':
      toggleLanguage();
      break;

    case 'logout':
      e.preventDefault();
      Store.adminLogout();
      navigate('login');
      renderCurrentPage();
      break;

    case 'undo':
      if (Store.storeUndo()) {
        showToast(currentLang === 'ar' ? 'تم التراجع' : 'Undo successful', 'info');
        renderContentArea(getRoute());
      }
      break;

    case 'redo':
      if (Store.storeRedo()) {
        showToast(currentLang === 'ar' ? 'تم إعادة التطبيق' : 'Redo successful', 'info');
        renderContentArea(getRoute());
      }
      break;

    // Products
    case 'add-product':
      openProductModal();
      break;
    case 'edit-product':
      openProductModal(Store.getProduct(id));
      break;
    case 'delete-product':
      confirmDialog(t('admin.deleteProduct'), t('admin.confirmDeleteDesc'), () => {
        Store.deleteProduct(id);
        showToast(t('admin.productDeleted'), 'success');
        renderContentArea('products');
      });
      break;

    // Categories
    case 'add-category':
      openCategoryModal();
      break;
    case 'edit-category':
      openCategoryModal(Store.getCategory(id));
      break;
    case 'delete-category':
      confirmDialog(t('admin.deleteCategory'), t('admin.confirmDeleteDesc'), () => {
        Store.deleteCategory(id);
        showToast(t('admin.categoryDeleted'), 'success');
        renderCurrentPage();
      });
      break;

    // Slide settings
    case 'delete-slide':
      if (confirm(t('admin.confirmDelete'))) {
        target.closest('.slide-setting-item').remove();
        // Recalculate slide numbers
        const container = document.getElementById('slider-settings-container');
        if (container) {
          container.querySelectorAll('.slide-setting-item').forEach((slide, i) => {
            const h5 = slide.querySelector('h5');
            if (h5) h5.textContent = `Slide ${i + 1}`;
          });
        }
      }
      break;

    case 'delete-custom-banner':
      if (confirm(t('admin.confirmDelete'))) {
        target.closest('.banner-setting-item').remove();
        // Recalculate banner numbers
        const bannerContainer = document.getElementById('custom-banners-container');
        if (bannerContainer) {
          bannerContainer.querySelectorAll('.banner-setting-item').forEach((b, i) => {
            const h5 = b.querySelector('h5');
            if (h5) h5.textContent = (currentLang === 'ar' ? 'بنر ' : 'Banner ') + (i + 1);
          });
        }
      }
      break;

    // Coupons
    case 'add-coupon':
      openCouponModal();
      break;
    case 'edit-coupon':
      const coupon = Store.getCoupons().find(c => c.id === id);
      if (coupon) openCouponModal(coupon);
      break;
    case 'delete-coupon':
      confirmDialog(t('admin.deleteCoupon'), t('admin.confirmDeleteDesc'), () => {
        Store.deleteCoupon(id);
        showToast(t('admin.couponDeleted'), 'success');
        renderCurrentPage();
      });
      break;

    // Orders
    case 'view-order':
      openOrderDetailModal(id);
      break;
    case 'delete-order':
      confirmDialog(t('admin.deleteOrder'), t('admin.confirmDeleteDesc'), () => {
        Store.deleteOrder(id);
        showToast(t('admin.orderDeleted'), 'success');
        renderContentArea('orders');
      });
      break;
    case 'filter-orders':
      orderStatusFilter = target.dataset.status;
      renderContentArea('orders');
      break;

    // Reviews
    case 'approve-review':
      Store.approveReview(id);
      showToast(t('admin.reviewApproved'), 'success');
      renderContentArea('reviews');
      break;
    case 'delete-review':
      confirmDialog(t('admin.deleteReview'), t('admin.confirmDeleteDesc'), () => {
        Store.deleteReview(id);
        showToast(t('admin.reviewDeleted'), 'success');
        renderContentArea('reviews');
      });
      break;
    case 'filter-reviews':
      reviewStatusFilter = target.dataset.status;
      renderContentArea('reviews');
      break;
  }
});

// Hamburger & sidebar mobile
document.addEventListener('click', (e) => {
  if (e.target.closest('#hamburger-btn')) {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
  }
  if (e.target.closest('#sidebar-overlay')) {
    document.getElementById('admin-sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }
  // Close sidebar on nav click (mobile)
  if (e.target.closest('.sidebar-nav a') && window.innerWidth < 768) {
    document.getElementById('admin-sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }
});

// Modal overlay close - Disabled to prevent accidental data loss
document.addEventListener('click', (e) => {
  // if (e.target.id === 'modal-overlay') {
  //   closeModal();
  // }
});

// Login form
document.addEventListener('submit', (e) => {
  if (e.target.id === 'login-form') {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.querySelector('#login-form button');
    
    errorEl.classList.remove('visible');
    const originalText = btn.textContent;
    btn.textContent = 'جاري تسجيل الدخول...';
    btn.disabled = true;

    Store.adminLogin(email, password).then(result => {
      if (result === true) {
        navigate('dashboard');
        renderCurrentPage();
      } else {
        errorEl.textContent = "خطأ: " + (result || "بيانات الدخول خاطئة");
        errorEl.classList.add('visible');
        btn.textContent = originalText;
        btn.disabled = false;
        setTimeout(() => errorEl.classList.remove('visible'), 5000);
      }
    });
  }
});

// Product search (delegated via input event)
document.addEventListener('input', (e) => {
  if (e.target.id === 'product-search') {
    productSearchQuery = e.target.value;
    // Debounce
    clearTimeout(e.target._timer);
    e.target._timer = setTimeout(() => {
      renderContentArea('products');
      // Restore focus and cursor
      const newInput = document.getElementById('product-search');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(productSearchQuery.length, productSearchQuery.length);
      }
    }, 300);
  }
});

// Hash change routing
window.addEventListener('hashchange', () => {
  const route = getRoute();
  if (route === 'login') {
    renderCurrentPage();
  } else if (!Store.isAdminLoggedIn()) {
    navigate('login');
    renderCurrentPage();
  } else {
    renderContentArea(route);
    // Attach settings listeners when navigating to settings
    if (route === 'settings') {
      // Intentionally not re-attaching listeners with setTimeout
      // renderContentArea already attaches them
    }
  }
});

// Store events — auto-refresh
Store.on('products-updated', () => {
  if (getRoute() === 'products' || getRoute() === 'dashboard') {
    renderContentArea(getRoute());
  }
});

Store.on('orders-updated', () => {
  if (getRoute() === 'orders' || getRoute() === 'dashboard') {
    renderContentArea(getRoute());
  }
});

Store.on('reviews-updated', () => {
  if (getRoute() === 'reviews') {
    renderContentArea('reviews');
  }
});

Store.on('categories-updated', () => {
  if (getRoute() === 'categories') {
    renderContentArea('categories');
  }
});

Store.on('data-synced', () => {
  renderContentArea(getRoute());
});

Store.on('history-changed', (data) => {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) undoBtn.disabled = !data.canUndo;
  if (redoBtn) redoBtn.disabled = !data.canRedo;
});

// ===== INITIALIZATION =====
function init() {
  Store.seedData();
  applyTheme('light');
  applyLanguage(currentLang);
  
  let currentSettings = Store.getSettings();
  document.title = `${currentSettings.storeName || 'Medix'} - Admin Panel | لوحة التحكم`;
  
  // Initialize settings history
  settingsHistory = [JSON.parse(JSON.stringify(currentSettings))];
  settingsHistoryIndex = 0;
  
  renderCurrentPage();

  // Attach settings listeners if we're on settings page
  if (getRoute() === 'settings') {
    setTimeout(attachSettingsListeners, 100);
  }
}

// Listen for updates from Firebase sync or other tabs
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('lr_')) {
    const currentSettings = Store.getSettings();
    document.title = `${currentSettings.storeName || 'Medix'} - Admin Panel | لوحة التحكم`;
    renderCurrentPage();
  }
});

// Listen for updates from Firebase sync locally
window.addEventListener('firebase-data-synced', (e) => {
  const key = e.detail.key;
  if (key && key.startsWith('lr_')) {
    const currentSettings = Store.getSettings();
    document.title = `${currentSettings.storeName || 'Medix'} - Admin Panel | لوحة التحكم`;
    renderCurrentPage();
  }
});

init();
