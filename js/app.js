// ============================================
// Medix Storefront - Main Application
// ============================================
const Store = window.Store;
if (!Store) {
  console.error('❌ Store module failed to load. Check store.js for errors.');
}

// ============================================
// i18n - Internationalization Module
// ============================================
const translations = {
  ar: {
    nav: { home: 'الرئيسية', products: 'المنتجات', cart: 'السلة', search: 'بحث', wishlist: 'المفضلة' },
    hero: { subtitle: 'تسوق بأناقة وراحة', shopNow: 'تسوق الآن' },
    home: {
      featured: 'منتجات مميزة', offers: 'عروض وخصومات', categories: 'التصنيفات',
      seeAll: 'عرض الكل', shopNow: 'تسوق الآن', offersBanner: 'عروض حصرية',
      offersBannerSub: 'خصومات تصل إلى 30% على منتجات مختارة'
    },
    products: {
      title: 'المنتجات', filter: 'تصفية', sort: 'ترتيب حسب', sortNewest: 'الأحدث',
      sortPriceLow: 'السعر: الأقل', sortPriceHigh: 'السعر: الأعلى', sortRating: 'التقييم',
      noResults: 'لا توجد منتجات', searchPlaceholder: 'ابحث عن منتج...', allCategories: 'الكل',
      results: 'نتيجة', noResultsMessage: 'جرب البحث بكلمات أخرى'
    },
    product: {
      addToCart: 'أضف للسلة', outOfStock: 'نفذت الكمية', description: 'الوصف',
      reviews: 'التقييمات', noReviews: 'لا توجد تقييمات بعد', writeReview: 'اكتب تقييم',
      relatedProducts: 'منتجات مشابهة', quantity: 'الكمية', added: 'تمت الإضافة للسلة',
      backToProducts: 'العودة للمنتجات'
    },
    cart: {
      title: 'سلة التسوق', empty: 'السلة فارغة', emptyMessage: 'لم تقم بإضافة أي منتجات بعد',
      continueShopping: 'تابع التسوق', subtotal: 'المجموع الفرعي', shipping: 'الشحن',
      freeShipping: 'مجاني', total: 'الإجمالي', checkout: 'إتمام الطلب',
      remove: 'حذف', clear: 'تفريغ السلة', items: 'منتجات'
    },
    checkout: {
      title: 'إتمام الطلب', name: 'الاسم الكامل', phone: 'رقم الهاتف', email: 'البريد الإلكتروني',
      address: 'العنوان بالتفصيل', city: 'المدينة', notes: 'ملاحظات', placeOrder: 'تأكيد الطلب',
      orderSummary: 'ملخص الطلب', paymentMethod: 'طريقة الدفع', cod: 'الدفع عند الاستلام',
      codNote: 'ادفع نقداً عند استلام طلبك', success: 'تم تأكيد طلبك بنجاح! 🎉',
      orderNumber: 'رقم الطلب', trackOrder: 'تتبع الطلب', backToHome: 'العودة للرئيسية',
      successMessage: 'سنتواصل معك قريباً لتأكيد التفاصيل', required: 'هذا الحقل مطلوب',
      invalidPhone: 'رقم هاتف غير صحيح', emptyCart: 'السلة فارغة',
      selectCity: 'اختر المدينة', customerInfo: 'معلومات العميل', shippingInfo: 'معلومات الشحن',
      discount: 'الخصم', couponCode: 'كود الخصم', applyCoupon: 'تطبيق',
      couponApplied: 'تم تطبيق الخصم', invalidCoupon: 'كود الخصم غير صحيح أو منتهي'
    },
    track: {
      title: 'تتبع الطلب', enterOrder: 'أدخل رقم الطلب', placeholder: 'مثال: LR-78432',
      search: 'بحث', orderDetails: 'تفاصيل الطلب', notFound: 'لم يتم العثور على الطلب',
      notFoundMessage: 'تأكد من رقم الطلب وحاول مرة أخرى', orderItems: 'المنتجات',
      customerInfo: 'معلومات العميل', orderSummary: 'ملخص الطلب'
    },
    auth: {
      login: 'تسجيل الدخول', register: 'إنشاء حساب جديد', profile: 'حسابي', logout: 'تسجيل الخروج',
      email: 'البريد الإلكتروني', password: 'كلمة المرور', name: 'الاسم الكامل', phone: 'رقم الهاتف',
      noAccount: 'ليس لديك حساب؟', haveAccount: 'لديك حساب بالفعل؟',
      createAccount: 'سجل الآن', loginNow: 'سجل دخولك',
      loginSuccess: 'تم تسجيل الدخول بنجاح', registerSuccess: 'تم إنشاء الحساب بنجاح',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', emailExists: 'البريد الإلكتروني مسجل مسبقاً',
      ordersHistory: 'سجل الطلبات', noOrders: 'لا توجد طلبات سابقة',
      personalInfo: 'المعلومات الشخصية',
      guestCheckout: 'الشراء كزائر', guestCheckoutDesc: 'يمكنك إتمام الطلب وتتبعه لاحقاً برقم الطلب'
    },
    status: {
      new: 'جديد', confirmed: 'مؤكد', preparing: 'جاري التحضير',
      shipping: 'جاري الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي'
    },
    review: {
      name: 'اسمك', comment: 'تعليقك', rating: 'التقييم', submit: 'إرسال التقييم',
      thankYou: 'شكراً لتقييمك! سيظهر بعد المراجعة.', nameRequired: 'يرجى إدخال اسمك',
      ratingRequired: 'يرجى اختيار تقييم', commentRequired: 'يرجى كتابة تعليق'
    },
    footer: {
      about: 'عن المتجر', quickLinks: 'روابط سريعة', contact: 'تواصل معنا',
      rights: 'جميع الحقوق محفوظة', phone: 'الهاتف', email: 'البريد', address: 'العنوان',
      categoriesTitle: 'التصنيفات'
    },
    wishlist: {
      title: 'المفضلة',
      empty: 'المفضلة فارغة',
      emptyMessage: 'لا توجد منتجات في المفضلة حالياً',
      addToWishlist: 'إضافة للمفضلة',
      removeFromWishlist: 'إزالة من المفضلة'
    },
    recentViewed: {
      title: 'شاهدتها مؤخراً'
    },
    linked: {
      title: 'أكمل إطلالتك',
      buyTogether: 'إضافة الحزمة للسلة معاً',
      totalSelected: 'السعر الإجمالي المختار:'
    },
    whyUs: {
      title: 'لماذا تختارنا؟',
      fastShipping: 'شحن سريع',
      fastShippingDesc: 'توصيل آمن وسريع لجميع المحافظات خلال 3 إلى 5 أيام عمل.',
      quality: 'جودة ممتازة',
      qualityDesc: 'نستخدم أفضل خامات الطباعة والإطارات لضمان شكل أنيق يدوم طويلاً.',
      support: 'دعم متواصل',
      supportDesc: 'فريق خدمة العملاء متواجد دائماً للرد على استفساراتك وتلبية طلباتك.'
    },
    common: {
      egp: 'ج.م', off: 'خصم', loading: 'جاري التحميل...', close: 'إغلاق', save: 'حفظ',
      cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة', noData: 'لا توجد بيانات',
      product: 'منتج', products: 'منتجات'
    },
    theme: { dark: 'الوضع الداكن', light: 'الوضع الفاتح' },
    lang: { switch: 'EN', current: 'عربي' },
    cities: ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'الزقازيق', 'أسيوط', 'سوهاج', 'المنيا', 'بورسعيد', 'السويس', 'الإسماعيلية', 'دمياط', 'الفيوم', 'بني سويف']
  },
  en: {
    nav: { home: 'Home', products: 'Products', cart: 'Cart', search: 'Search', wishlist: 'Wishlist' },
    hero: { subtitle: 'Shop with Elegance & Comfort', shopNow: 'Shop Now' },
    home: {
      featured: 'Featured Products', offers: 'Offers & Deals', categories: 'Categories',
      seeAll: 'See All', shopNow: 'Shop Now', offersBanner: 'Exclusive Offers',
      offersBannerSub: 'Up to 30% off on selected products'
    },
    products: {
      title: 'Products', filter: 'Filter', sort: 'Sort by', sortNewest: 'Newest',
      sortPriceLow: 'Price: Low to High', sortPriceHigh: 'Price: High to Low', sortRating: 'Top Rated',
      noResults: 'No products found', searchPlaceholder: 'Search products...', allCategories: 'All',
      results: 'results', noResultsMessage: 'Try searching with different keywords'
    },
    product: {
      addToCart: 'Add to Cart', outOfStock: 'Out of Stock', description: 'Description',
      reviews: 'Reviews', noReviews: 'No reviews yet', writeReview: 'Write a Review',
      relatedProducts: 'Related Products', quantity: 'Quantity', added: 'Added to cart',
      backToProducts: 'Back to Products'
    },
    cart: {
      title: 'Shopping Cart', empty: 'Cart is empty', emptyMessage: "You haven't added any products yet",
      continueShopping: 'Continue Shopping', subtotal: 'Subtotal', shipping: 'Shipping',
      freeShipping: 'Free', total: 'Total', checkout: 'Checkout',
      remove: 'Remove', clear: 'Clear Cart', items: 'items'
    },
    checkout: {
      title: 'Checkout', name: 'Full Name', phone: 'Phone Number', email: 'Email',
      address: 'Delivery Address', city: 'City', notes: 'Notes', placeOrder: 'Place Order',
      orderSummary: 'Order Summary', paymentMethod: 'Payment Method', cod: 'Cash on Delivery',
      codNote: 'Pay cash when you receive your order', success: 'Order confirmed! 🎉',
      orderNumber: 'Order Number', trackOrder: 'Track Order', backToHome: 'Back to Home',
      successMessage: "We'll contact you soon to confirm details", required: 'This field is required',
      invalidPhone: 'Invalid phone number', emptyCart: 'Cart is empty',
      selectCity: 'Select city', customerInfo: 'Customer Information', shippingInfo: 'Shipping Information',
      discount: 'Discount', couponCode: 'Coupon Code', applyCoupon: 'Apply',
      couponApplied: 'Coupon applied', invalidCoupon: 'Invalid or expired coupon'
    },
    track: {
      title: 'Track Order', enterOrder: 'Enter order number', placeholder: 'e.g. LR-78432',
      search: 'Search', orderDetails: 'Order Details', notFound: 'Order not found',
      notFoundMessage: 'Check the order number and try again', orderItems: 'Items',
      customerInfo: 'Customer Info', orderSummary: 'Order Summary'
    },
    auth: {
      login: 'Login', register: 'Create Account', profile: 'My Profile', logout: 'Logout',
      email: 'Email', password: 'Password', name: 'Full Name', phone: 'Phone Number',
      noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
      createAccount: 'Register now', loginNow: 'Login now',
      loginSuccess: 'Logged in successfully', registerSuccess: 'Account created successfully',
      invalidCredentials: 'Invalid email or password', emailExists: 'Email is already registered',
      ordersHistory: 'Order History', noOrders: 'No previous orders',
      personalInfo: 'Personal Information',
      guestCheckout: 'Guest Checkout', guestCheckoutDesc: 'You can complete your order and track it later using the order number'
    },
    status: {
      new: 'New', confirmed: 'Confirmed', preparing: 'Preparing',
      shipping: 'Shipping', delivered: 'Delivered', cancelled: 'Cancelled'
    },
    review: {
      name: 'Your name', comment: 'Your comment', rating: 'Rating', submit: 'Submit Review',
      thankYou: 'Thank you! Your review will appear after moderation.', nameRequired: 'Please enter your name',
      ratingRequired: 'Please select a rating', commentRequired: 'Please write a comment'
    },
    footer: {
      about: 'About', quickLinks: 'Quick Links', contact: 'Contact Us',
      rights: 'All rights reserved', phone: 'Phone', email: 'Email', address: 'Address',
      categoriesTitle: 'Categories'
    },
    whyUs: {
      title: 'Why Choose Us?',
      fastShipping: 'Fast Shipping',
      fastShippingDesc: 'Safe and fast delivery to all governorates within 3 to 5 business days.',
      quality: 'Excellent Quality',
      qualityDesc: 'We use the best printing and framing materials to ensure an elegant, long-lasting look.',
      support: 'Ongoing Support',
      supportDesc: 'Our customer service team is always available to answer your questions and fulfill your requests.'
    },
    common: {
      egp: 'EGP', off: 'OFF', loading: 'Loading...', close: 'Close', save: 'Save',
      cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', noData: 'No data',
      product: 'product', products: 'products'
    },
    theme: { dark: 'Dark Mode', light: 'Light Mode' },
    lang: { switch: 'عربي', current: 'EN' },
    wishlist: {
      title: 'Wishlist',
      empty: 'Wishlist is empty',
      emptyMessage: 'No products in your wishlist yet',
      addToWishlist: 'Add to Wishlist',
      removeFromWishlist: 'Remove from Wishlist'
    },
    recentViewed: {
      title: 'Recently Viewed'
    },
    linked: {
      title: 'Complete Your Look',
      buyTogether: 'Add Bundle to Cart',
      totalSelected: 'Total Selected Price:'
    },
    cities: ['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Tanta', 'Zagazig', 'Asyut', 'Sohag', 'Minya', 'Port Said', 'Suez', 'Ismailia', 'Damietta', 'Fayoum', 'Beni Suef']
  }
};

function getLang() {
  try {
    return localStorage.getItem('lr_lang') || 'ar';
  } catch (e) {
    return 'ar';
  }
}

function setLang(lang) {
  try {
    localStorage.setItem('lr_lang', lang);
  } catch (e) {}
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  // Swap font CSS vars
  if (lang === 'ar') {
    document.body.style.fontFamily = "var(--font-ar-body)";
  } else {
    document.body.style.fontFamily = "var(--font-body)";
  }
  renderNavbar();
  renderFooter();
  renderCartSidebar();
  handleRoute(); // Force re-render of current page content
}

function isRTL() {
  return getLang() === 'ar';
}

function t(key) {
  const lang = getLang();
  const keys = key.split('.');
  let val = translations[lang];
  for (const k of keys) {
    if (!val) return key;
    val = val[k];
  }
  return val !== undefined ? val : key;
}

// ============================================
// Theme Module
// ============================================
function getTheme() {
  try {
    return localStorage.getItem('lr_theme') || 'light';
  } catch (e) {
    return 'light';
  }
}

function setTheme(theme) {
  try {
    localStorage.setItem('lr_theme', theme);
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
  renderNavbar();
}

// ============================================
// Router (Hash-based)
// ============================================
function getCurrentRoute() {
  return window.location.hash || '#/';
}

function navigateTo(hash) {
  window.location.hash = hash;
}

function parseRoute(hash) {
  // Strip query parameters from the hash (e.g. Facebook's ?fbclid appended to the hash)
  let clean = hash.replace('#', '');
  if (clean.includes('?')) {
    clean = clean.split('?')[0];
  }
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return { page: 'home', params: {} };
  if (parts[0] === 'products') return { page: 'products', params: {} };
  if (parts[0] === 'product' && parts[1]) return { page: 'product', params: { id: parts[1] } };
  if (parts[0] === 'category' && parts[1]) return { page: 'category', params: { id: parts[1] } };
  if (parts[0] === 'checkout') return { page: 'checkout', params: {} };
  if (parts[0] === 'track') return { page: 'track', params: { orderNumber: parts[1] || '' } };
  if (parts[0] === 'order-success' && parts[1]) return { page: 'order-success', params: { orderNumber: parts[1] } };
  if (parts[0] === 'login') return { page: 'login', params: {} };
  if (parts[0] === 'register') return { page: 'register', params: {} };
  if (parts[0] === 'profile') return { page: 'profile', params: {} };
  if (parts[0] === 'wishlist') return { page: 'wishlist', params: {} };
  return { page: 'home', params: {} };
}

function handleRoute() {
  const { page, params } = parseRoute(getCurrentRoute());
  const app = document.getElementById('app');
  closeMobileNav();
  closeCartSidebar();
  closeSearchOverlay();

  let html = '';
  switch (page) {
    case 'home': html = renderHomePage(); break;
    case 'products': html = renderProductsPage(); break;
    case 'category': html = renderProductsPage(params.id); break;
    case 'product': html = renderProductDetailPage(params.id); break;
    case 'checkout': html = renderCheckoutPage(); break;
    case 'track': html = renderOrderTrackingPage(params.orderNumber); break;
    case 'order-success': html = renderOrderSuccessPage(params.orderNumber); break;
    case 'login': html = renderLoginPage(); break;
    case 'register': html = renderRegisterPage(); break;
    case 'profile': html = renderProfilePage(); break;
    case 'wishlist': html = renderWishlistPage(); break;
    default: html = renderHomePage();
  }

  app.innerHTML = html;
  app.className = 'page-enter';
  updateActiveNavLink(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Initialize Carousel if on home page
  if (page === 'home' || page === '') {
    const sliderEl = document.getElementById('hero-slider');
    const intervalSec = sliderEl ? parseFloat(sliderEl.dataset.interval) || 4 : 4;
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length > 0) {
      let currentSlide = 0;
      if (window.carouselInterval) clearInterval(window.carouselInterval);
      window.carouselInterval = setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
      }, intervalSec * 1000);
    }
  }

  // Re-trigger animation
  void app.offsetWidth;
}

function updateActiveNavLink(page) {
  document.querySelectorAll('.navbar-link, .mobile-nav-link').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (page === 'home' && href === '#/') link.classList.add('active');
    else if (page === 'products' && href === '#/products') link.classList.add('active');
    else if (page === 'category' && href === '#/products') link.classList.add('active');
    else if (page === 'wishlist' && href === '#/wishlist') link.classList.add('active');
  });
}

// ============================================
// Helper Functions
// ============================================
function getProductName(product) {
  if (!product) return '';
  return getLang() === 'ar' ? (product.name_ar || product.name_en) : (product.name_en || product.name_ar);
}

function getProductDesc(product) {
  if (!product) return '';
  return getLang() === 'ar' ? (product.description_ar || product.description_en) : (product.description_en || product.description_ar);
}

function getCategoryName(category) {
  if (!category) return '';
  return getLang() === 'ar' ? (category.name_ar || category.name_en) : (category.name_en || category.name_ar);
}

function getLocalizedText(obj, field) {
  if (!obj) return '';
  const lang = getLang();
  return obj[`${field}_${lang}`] || obj[`${field}_ar`] || obj[`${field}_en`] || '';
}

function formatPrice(price) {
  return Store.formatPrice(price, getLang());
}

function renderStars(rating, interactive = false, containerId = '') {
  let html = `<div class="stars ${interactive ? '' : 'stars-static'}" ${containerId ? `id="${containerId}"` : ''}>`;
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= Math.round(rating) ? 'filled' : ''}" data-rating="${i}" ${interactive ? `data-action="set-star"` : ''}><i class="ph-fill ph-star"></i></span>`;
  }
  html += '</div>';
  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Components
// ============================================

// --- Navbar ---
function renderNavbar() {
  const settings = Store.getSettings();
  const cartTotal = Store.getCartTotal();
  const lang = getLang();
  const theme = getTheme();
  const storeName = settings.storeName || 'Medix';
  const nameParts = storeName.split(' ');
  const firstName = nameParts[0] || 'ميدكس';
  const lastName = nameParts.slice(1).join(' '); // No fallback for single-word names
  
  document.title = `${storeName} | ${lang === 'ar' ? 'مرحباً بك' : 'Welcome'}`;
  
  const currentCustomer = Store.getCurrentCustomer();

  let announcementHtml = '';
  if (settings.announcementActive) {
    const text = lang === 'ar' ? (settings.announcementText_ar || '') : (settings.announcementText_en || settings.announcementText_ar || '');
    if (text) {
      announcementHtml = `
        <div style="background-color: ${settings.announcementBgColor || '#000000'}; color: ${settings.announcementTextColor || '#ffffff'}; padding: 10px; text-align: center; font-weight: bold; font-size: 0.95rem; display: flex; justify-content: center; align-items: center; gap: 8px;">
          <i class="ph ph-megaphone"></i>
          <span>${escapeHtml(text)}</span>
        </div>
      `;
    }
  }
  const annContainer = document.getElementById('announcement-bar-container');
  if (annContainer) annContainer.innerHTML = announcementHtml;
  let bannerHtml = '';
  let bannerClosed = false;
  try {
    bannerClosed = sessionStorage.getItem('lr_banner_closed') === 'true';
  } catch (e) {}

  if (settings.welcomePopupActive && !bannerClosed) {
    const title = lang === 'ar' ? settings.welcomePopupTitle_ar : settings.welcomePopupTitle_en;
    const desc = lang === 'ar' ? settings.welcomePopupSubtitle_ar : settings.welcomePopupSubtitle_en;
    const coupon = settings.welcomePopupCoupon;
    bannerHtml = `
      <div class="top-banner" id="top-banner" style="background-color: ${settings.welcomePopupBgColor || '#1a1a2e'}; color: ${settings.welcomePopupTextColor || '#f0f0f5'};">
        <div class="top-banner-inner">
          <div class="banner-text">
            <strong>${escapeHtml(title)}</strong> ${desc ? `- ${escapeHtml(desc)}` : ''}
          </div>
          ${coupon ? `
            <div class="banner-coupon" data-action="copy-welcome-coupon" data-code="${escapeHtml(coupon)}" title="${lang === 'ar' ? 'نسخ الكود' : 'Copy Code'}" style="color: ${settings.welcomePopupTextColor || '#f0f0f5'}; border-color: ${settings.welcomePopupTextColor || '#f0f0f5'};">
              <strong>${escapeHtml(coupon)}</strong>
              <i class="ph ph-copy"></i>
            </div>
          ` : ''}
          <button class="btn-icon btn-close-banner" data-action="close-banner" style="color: ${settings.welcomePopupTextColor || '#f0f0f5'};"><i class="ph ph-x"></i></button>
        </div>
      </div>
    `;
  }

  document.getElementById('navbar-container').innerHTML = `
    ${bannerHtml}
    <nav class="navbar" id="main-navbar">
      <div class="navbar-inner">
        <a href="#/" class="navbar-logo" id="navbar-logo">
          <span class="logo-regular">${escapeHtml(firstName)}</span>
          <span class="logo-bold">${escapeHtml(lastName)}</span>
          <span class="logo-moon">✨</span>
        </a>
        <div class="navbar-links" id="navbar-links">
          <a href="#/" class="navbar-link" id="nav-home">${t('nav.home')}</a>
          <a href="#/products" class="navbar-link" id="nav-products">${t('nav.products')}</a>
          <a href="#/wishlist" class="navbar-link" id="nav-wishlist">${t('wishlist.title')}</a>
          <a href="#/track" class="navbar-link" id="nav-track">${t('track.title')}</a>
        </div>
        <div class="navbar-actions">
          <button class="btn-icon" data-action="open-search" id="btn-search" title="${t('nav.search')}"><i class="ph ph-magnifying-glass"></i></button>
          <a href="${currentCustomer ? '#/profile' : '#/login'}" class="btn-icon" title="${currentCustomer ? t('auth.profile') : t('auth.login')}"><i class="ph ph-user"></i></a>
          <button class="lang-toggle" data-action="toggle-lang" id="btn-lang">${t('lang.switch')}</button>
          <button class="btn-icon" data-action="toggle-cart" id="btn-cart" title="${t('nav.cart')}">
            <i class="ph ph-shopping-cart"></i>
            ${cartTotal.itemCount > 0 ? `<span class="cart-badge" id="cart-badge">${cartTotal.itemCount}</span>` : ''}
          </button>
          <button class="hamburger" data-action="toggle-mobile-nav" id="btn-hamburger"><i class="ph ph-list"></i></button>
        </div>
      </div>
    </nav>
    <div class="mobile-nav" id="mobile-nav">
      <a href="#/" class="mobile-nav-link" id="mobile-nav-home">${t('nav.home')}</a>
      <a href="#/products" class="mobile-nav-link" id="mobile-nav-products">${t('nav.products')}</a>
      <a href="#/wishlist" class="mobile-nav-link" id="mobile-nav-wishlist">${t('wishlist.title')}</a>
      <a href="#/track" class="mobile-nav-link" id="mobile-nav-track">${t('track.title')}</a>
      <div style="height:1px; background:var(--border); margin:10px 0;"></div>
      <a href="${currentCustomer ? '#/profile' : '#/login'}" class="mobile-nav-link">${currentCustomer ? t('auth.profile') : t('auth.login')}</a>
    </div>
    <!-- Search Overlay -->
    <div class="search-overlay" id="search-overlay" data-action="close-search-overlay">
      <div class="search-box" id="search-box">
        <div class="search-input-wrapper">
          <span class="search-icon"><i class="ph ph-magnifying-glass"></i></span>
          <input type="text" class="search-input" id="search-input" placeholder="${t('products.searchPlaceholder')}" data-action="search-input">
        </div>
        <div class="search-results" id="search-results"></div>
      </div>
    </div>
  `;
}

// --- Footer ---
function renderFooter() {
  const settings = Store.getSettings();
  const categories = Store.getActiveCategories();
  const lang = getLang();
  const year = new Date().getFullYear();
  const storeName = settings.storeName || 'Medix';
  const nameParts = storeName.split(' ');
  const firstName = nameParts[0] || 'ميدكس';
  const lastName = nameParts.slice(1).join(' ');
  const aboutText = lang === 'ar' ? settings.aboutText_ar : settings.aboutText_en;
  const address = lang === 'ar' ? settings.address_ar : settings.address_en;

  document.getElementById('footer-container').innerHTML = `
    <footer class="footer" id="main-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <div class="footer-logo">
              <span class="logo-regular">${escapeHtml(firstName)}</span>
              <span class="logo-bold">${escapeHtml(lastName)}</span>
              <span>✨</span>
            </div>
            <p class="footer-text">${escapeHtml(aboutText)}</p>
            <div class="footer-social">
              <a href="#" title="Facebook"><i class="ph ph-facebook-logo"></i></a>
              <a href="#" title="Instagram"><i class="ph ph-instagram-logo"></i></a>
              <a href="#" title="WhatsApp"><i class="ph ph-whatsapp-logo"></i></a>
            </div>
          </div>
          <div class="footer-col">
            <h4 class="footer-title">${t('footer.quickLinks')}</h4>
            <a href="#/" class="footer-link">${t('nav.home')}</a>
            <a href="#/products" class="footer-link">${t('nav.products')}</a>
            <a href="#/track" class="footer-link">${t('track.title')}</a>
          </div>
          <div class="footer-col">
            <h4 class="footer-title">${t('footer.categoriesTitle')}</h4>
            ${categories.map(cat => `
              <a href="#/category/${cat.id}" class="footer-link">${getCategoryName(cat)}</a>
            `).join('')}
          </div>
          <div class="footer-col">
            <h4 class="footer-title">${t('footer.contact')}</h4>
            <p class="footer-text"><i class="ph ph-phone"></i> ${t('footer.phone')}: ${settings.contactPhone}</p>
            <p class="footer-text"><i class="ph ph-envelope"></i> ${t('footer.email')}: ${settings.contactEmail}</p>
            <p class="footer-text"><i class="ph ph-map-pin"></i> ${t('footer.address')}: ${escapeHtml(address)}</p>
          </div>
        </div>
        <!-- Footer Bottom -->
        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} ${escapeHtml(settings.storeName_en || 'Medix')}. ${t('footer.rights')}</p>
        </div>
      </div>
    </footer>
    <a href="https://wa.me/${(settings.contactWhatsapp || '201234567890').replace(/[^0-9]/g, '')}" class="floating-wa" target="_blank" title="تواصل معنا على واتساب">
      <i class="ph ph-whatsapp-logo"></i>
    </a>
  `;
}

// --- Cart Sidebar ---
function renderCartSidebar() {
  const cartItems = Store.getCartWithProducts();
  const cartTotal = Store.getCartTotal();
  const settings = Store.getSettings();
  const lang = getLang();

  const wasOpen = document.getElementById('cart-sidebar')?.classList.contains('open');

  let itemsHtml = '';
  if (cartItems.length === 0) {
    itemsHtml = `
      <div class="cart-empty">
        <span class="cart-empty-icon"><i class="ph ph-shopping-cart"></i></span>
        <h4>${t('cart.empty')}</h4>
        <p class="cart-empty-message">${t('cart.emptyMessage')}</p>
        <button class="btn btn-secondary" data-action="close-cart">${t('cart.continueShopping')}</button>
      </div>
    `;
  } else {
    itemsHtml = cartItems.map(item => `
      <div class="cart-item" id="cart-item-${item.cartItemId || item.productId}">
        <img src="${item.product.images?.[0] || 'https://picsum.photos/seed/placeholder/150/150'}" alt="${escapeHtml(getProductName(item.product))}" class="cart-item-image" loading="lazy">
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(getProductName(item.product))}</div>
          ${(item.color || item.size) ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">
              ${item.color ? `${lang === 'ar' ? 'اللون:' : 'Color:'} <strong style="color:var(--text);">${escapeHtml(item.color)}</strong> ` : ''}
              ${item.size ? `${lang === 'ar' ? 'المقاس:' : 'Size:'} <strong style="color:var(--text);">${escapeHtml(item.size)}</strong>` : ''}
            </div>
          ` : ''}
          <div class="cart-item-price">
            <span>${formatPrice(item.unitPrice)}</span>
            ${item.product.discountPercentage > 0 ? `<span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.85em; margin-inline-start: 8px;">${formatPrice(item.product.price)}</span>` : ''}
          </div>
          <div class="cart-item-actions">
            <div class="qty-selector">
              <button class="qty-btn" data-action="cart-qty-decrease" data-product-id="${item.productId}" data-cart-item-id="${item.cartItemId || item.productId}"><i class="ph ph-minus"></i></button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" data-action="cart-qty-increase" data-product-id="${item.productId}" data-cart-item-id="${item.cartItemId || item.productId}"><i class="ph ph-plus"></i></button>
            </div>
            <button class="btn btn-ghost btn-sm" data-action="cart-remove" data-product-id="${item.productId}" data-cart-item-id="${item.cartItemId || item.productId}" style="color:var(--danger)"><i class="ph ph-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('');
  }

  const shippingText = (cartTotal.shipping === 0 && cartTotal.subtotal > 0 && settings.freeShippingActive)
    ? `<span class="free-shipping">${t('cart.freeShipping')} ✓</span>`
    : formatPrice(cartTotal.shipping);

  document.getElementById('cart-sidebar-container').innerHTML = `
    <div class="cart-overlay ${wasOpen ? 'open' : ''}" id="cart-overlay" data-action="close-cart"></div>
    <div class="cart-sidebar ${wasOpen ? 'open' : ''}" id="cart-sidebar">
      <div class="cart-header">
        <h3>${t('cart.title')} (${cartTotal.itemCount})</h3>
        <button class="btn-icon" data-action="close-cart" id="btn-close-cart"><i class="ph ph-x"></i></button>
      </div>
      <div class="cart-body">${itemsHtml}</div>
      ${cartItems.length > 0 ? `
        <div class="cart-footer">
          <div class="cart-summary-row">
            <span>${t('cart.subtotal')}</span>
            <span>${formatPrice(cartTotal.subtotal)}</span>
          </div>
          <div class="cart-summary-row">
            <span>${t('cart.shipping')}</span>
            <span>${shippingText}</span>
          </div>
          <div class="cart-summary-row total">
            <span>${t('cart.total')}</span>
            <span>${formatPrice(cartTotal.total)}</span>
          </div>
          <button class="btn btn-primary w-100 mt-2" data-action="go-checkout" id="btn-checkout">${t('cart.checkout')}</button>
        </div>
      ` : ''}
    </div>
  `;
}

function openCartSidebar() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// --- Mobile Nav ---
function toggleMobileNav() {
  document.getElementById('mobile-nav')?.classList.toggle('open');
}

function closeMobileNav() {
  document.getElementById('mobile-nav')?.classList.remove('open');
}

// --- Search Overlay ---
function openSearchOverlay() {
  const overlay = document.getElementById('search-overlay');
  overlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    document.getElementById('search-input')?.focus();
  }, 100);
}

function closeSearchOverlay() {
  document.getElementById('search-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  const results = document.getElementById('search-results');
  if (results) results.innerHTML = '';
}

function handleSearch(query) {
  const results = Store.searchProducts(query, getLang());
  const container = document.getElementById('search-results');
  if (!container) return;

  if (!query.trim()) {
    container.innerHTML = '';
    return;
  }

  if (results.length === 0) {
    container.innerHTML = `<div class="search-no-results">${t('products.noResults')}</div>`;
    return;
  }

  container.innerHTML = results.slice(0, 8).map(product => `
    <a href="#/product/${product.id}" class="search-result-item" data-action="search-result-click">
      <img src="${product.images?.[0] || 'https://picsum.photos/seed/placeholder/100/100'}" alt="" class="search-result-image" loading="lazy">
      <div class="search-result-info">
        <div class="search-result-name">${escapeHtml(getProductName(product))}</div>
        <div class="search-result-price">${formatPrice(Store.getProductPrice(product))}</div>
      </div>
    </a>
  `).join('');
}

// --- Toast ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '<i class="ph ph-check-circle"></i>' : type === 'error' ? '<i class="ph ph-x-circle"></i>' : '<i class="ph ph-warning-circle"></i>'}</span> ${escapeHtml(message)}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Modal ---
function showModal(title, content) {
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay open" id="modal-overlay" data-action="close-modal">
      <div class="modal" id="modal-box">
        <div class="modal-header">
          <h3>${escapeHtml(title)}</h3>
          <button class="btn-icon" data-action="close-modal"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    </div>
  `;
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => {
      document.getElementById('modal-container').innerHTML = '';
    }, 300);
  }
}

// --- Product Card ---
function renderProductCard(product) {
  const category = Store.getCategory(product.categoryId);
  const discountedPrice = Store.getProductPrice(product);
  const lang = getLang();
  const settings = Store.getSettings();
  const hasDiscount = product.discountPercentage > 0;
  const outOfStock = product.stock <= 0;

  const discountLabel = lang === 'ar'
    ? `${t('common.off')} ${product.discountPercentage}%`
    : `${product.discountPercentage}% ${t('common.off')}`;

  const isInWishlist = Store.isInWishlist(product.id);
  return `
    <article class="product-card" data-action="go-product" data-product-id="${product.id}" id="product-card-${product.id}">
      <div class="product-card-image">
        ${hasDiscount ? `<span class="discount-badge">${discountLabel}</span>` : ''}
        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-action="toggle-wishlist" data-product-id="${product.id}" title="${t('wishlist.addToWishlist')}">
          <i class="${isInWishlist ? 'ph-fill' : 'ph'} ph-heart"></i>
        </button>
        <div class="product-image-blur-bg" style="background-image: url('${product.images?.[0] || 'https://picsum.photos/seed/placeholder/600/800'}')"></div>
        <img src="${product.images?.[0] || 'https://picsum.photos/seed/placeholder/600/800'}" alt="${escapeHtml(getProductName(product))}" class="product-image-fg" loading="lazy">
      </div>
      <div class="product-card-body">
        <div class="product-card-category">${category ? escapeHtml(getCategoryName(category)) : ''}</div>
        <h3 class="product-card-name">${escapeHtml(getProductName(product))}</h3>
        <div class="product-card-rating">
          ${renderStars(product.ratingAvg)}
          <span style="color:var(--text-muted);font-size:0.75rem;">(${product.ratingCount})</span>
        </div>
        ${(product.showScarcityBadge !== false && product.stock > 0 && product.stock <= (product.scarcityThreshold ?? 5)) ? `
          <div class="scarcity-badge">
            <i class="ph-fill ph-fire"></i>
            ${lang === 'ar' ? `سارع بالشراء! متبقي ${product.stock} فقط` : `Hurry up! Only ${product.stock} left`}
          </div>
        ` : ''}
        <div class="product-card-footer" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <div class="price-group ${hasDiscount ? 'has-discount' : ''}">
            <span class="price-current">${formatPrice(discountedPrice)}</span>
            ${hasDiscount ? `<span class="price-original">${formatPrice(product.price)}</span>` : ''}
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-primary btn-sm" style="flex: 1; padding: 8px 6px; font-weight: bold; font-size: 0.95rem;" data-action="buy-now" data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''}>
               ${outOfStock ? t('product.outOfStock') : (lang === 'ar' ? 'شراء سريع' : 'Buy Now')}
            </button>
            <button class="btn btn-secondary btn-sm" style="padding: 8px 12px; font-size: 1.1rem;" data-action="add-to-cart" data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''} title="${t('product.addToCart')}">
              <i class="ph ph-shopping-cart"></i>
            </button>
            <a href="https://wa.me/${(settings.contactWhatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent('أريد الاستفسار عن المنتج: ' + getProductName(product))}" target="_blank" class="btn btn-sm" style="background-color: #25D366; color: white; border: none; padding: 8px 12px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center;" title="WhatsApp" onclick="event.stopPropagation();">
              <i class="ph ph-whatsapp-logo"></i>
            </a>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ============================================
// Pages
// ============================================

// --- Home Page ---
function renderHomePage() {
  const settings = Store.getSettings();
  const lang = getLang();
  let featured = Store.getFeaturedProducts().slice(0, 8);
  if (featured.length === 0) {
    featured = Store.getActiveProducts().slice(0, 8);
  }
  const categories = Store.getActiveCategories();
  const offers = Store.getDiscountedProducts().slice(0, 8);
  const subtitle = lang === 'ar' ? settings.subtitle_ar : settings.subtitle_en;
  const storeName = settings.storeName || 'Medix';
  const nameParts = storeName.split(' ');
  const firstName = nameParts[0] || 'ميدكس';
  const lastName = nameParts.slice(1).join(' ');

  const renderBannersForPosition = (pos) => {
    return (settings.customBanners || [])
      .filter(b => b.active && (b.position || 'top') === pos)
      .map(b => `
        <div class="custom-banner" style="background-color: ${b.bgColor}; color: ${b.textColor}; padding: ${b.size === 'small' ? '15px' : b.size === 'large' ? '40px' : '25px'} 0; text-align: ${b.align}; margin-bottom: 24px;">
          <div class="container">
            <div style="font-size: ${b.size === 'small' ? '1.1rem' : b.size === 'large' ? '2rem' : '1.5rem'}; font-weight: bold; line-height: 1.4;">
              ${escapeHtml(lang === 'ar' ? b.text_ar : b.text_en).replace(/\\n/g, '<br>')}
            </div>
          </div>
        </div>
      `).join('');
  };

  return `
    <div class="hero-carousel" id="hero-slider" data-interval="${settings.sliderInterval || 4}">
      ${(settings.heroSlider || []).map((slide, i) => `
        <div class="carousel-slide ${i === 0 ? 'active' : ''}">
          <div class="carousel-slide-blur-bg" style="background-image: url('${slide.image || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2070&auto=format&fit=crop'}');"></div>
          <div class="carousel-overlay"></div>
          <div class="carousel-slide-inner">
            <div class="carousel-content">
              <h1 style="color: ${slide.textColor || '#c9a04e'} !important;">${escapeHtml(lang === 'ar' ? slide.title_ar : slide.title_en)}</h1>
              <p style="color: ${slide.subtitleColor || '#ffffff'} !important;">${escapeHtml(lang === 'ar' ? slide.subtitle_ar : slide.subtitle_en)}</p>
              ${slide.buttonLink ? `<a href="${escapeHtml(slide.buttonLink)}" class="btn btn-primary btn-lg" style="border-radius:30px !important; background: ${slide.buttonBg || '#c9a04e'} !important; color: ${slide.buttonText || '#0a0a0f'} !important; border: none !important;">${escapeHtml(lang === 'ar' ? slide.buttonText_ar : slide.buttonText_en) || t('hero.shopNow')}</a>` : ''}
            </div>
            <div class="carousel-slide-image-wrap">
              <img src="${slide.image || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2070&auto=format&fit=crop'}" class="carousel-slide-img" alt="">
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Top Banners -->
    ${renderBannersForPosition('top')}

    <div class="container">
      <div class="section-header">
        <h2 class="section-title">${t('home.categories')}</h2>
      </div>
      <!-- 2. Categories Circles -->
      <div class="categories-scroll">
        ${categories.map(cat => `
          <a href="#/category/${cat.id}" class="cat-circle-wrap">
            ${cat.image ? `<div class="cat-circle" style="background-image: url('${cat.image}');"></div>` : `<div class="cat-circle" style="font-size:30px;">${cat.icon || '📦'}</div>`}
            <span>${escapeHtml(getCategoryName(cat))}</span>
          </a>
        `).join('')}
      </div>

      <!-- 3. Why Choose Us -->
      <div class="section-header">
        <h2 class="section-title">${t('whyUs.title')}</h2>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><i class="ph ph-truck"></i></div>
          <h3>${t('whyUs.fastShipping')}</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">${t('whyUs.fastShippingDesc')}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="ph ph-shield-check"></i></div>
          <h3>${t('whyUs.quality')}</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">${t('whyUs.qualityDesc')}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="ph ph-headset"></i></div>
          <h3>${t('whyUs.support')}</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">${t('whyUs.supportDesc')}</p>
        </div>
      </div>
    </div>

    <!-- Middle Banners -->
    ${renderBannersForPosition('middle')}

    <!-- Featured Products -->
    <section class="page-section" id="featured-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">${t('home.featured')}</h2>
          <a href="#/products" class="section-link">${t('home.seeAll')} →</a>
        </div>
        <div class="products-grid">
          ${featured.map(p => renderProductCard(p)).join('')}
        </div>
      </div>
    </section>

    <!-- Offers -->
    ${offers.length > 0 ? `
      <section class="page-section" id="offers-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">${t('home.offers')}</h2>
            <a href="#/products" class="section-link">${t('home.seeAll')} →</a>
          </div>
          <div class="products-grid">
            ${offers.map(p => renderProductCard(p)).join('')}
          </div>
        </div>
      </section>
    ` : ''}

    <!-- Recently Viewed Section -->
    ${(() => {
      const recentIds = Store.getRecentlyViewed();
      const recentProducts = Store.getActiveProducts().filter(p => recentIds.includes(p.id));
      const orderedRecent = recentIds.map(id => recentProducts.find(p => p.id === id)).filter(Boolean);
      return orderedRecent.length > 0 ? `
        <section class="page-section recent-viewed-section">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">${t('recentViewed.title')}</h2>
            </div>
            <div class="products-grid">
              ${orderedRecent.map(p => renderProductCard(p)).join('')}
            </div>
          </div>
        </section>
      ` : '';
    })()}

    <!-- Bottom Banners -->
    ${renderBannersForPosition('bottom')}
  `;
}

// --- Products Page ---
function renderProductsPage(categoryId = null) {
  const categories = Store.getActiveCategories();
  const category = categoryId ? Store.getCategory(categoryId) : null;
  const pageTitle = category ? getCategoryName(category) : t('products.title');
  let products = categoryId ? Store.getProductsByCategory(categoryId) : Store.getActiveProducts();

  return `
    <div class="page-content">
      <div class="container">
        <h1 class="mb-3">${escapeHtml(pageTitle)}</h1>

        <!-- Toolbar -->
        <div class="products-toolbar" id="products-toolbar">
          <div class="products-search" id="products-search-bar">
            <span class="products-search-icon"><i class="ph ph-magnifying-glass"></i></span>
            <input type="text" placeholder="${t('products.searchPlaceholder')}" id="products-search-input" data-action="products-search">
          </div>
          <div class="products-sort">
            <select class="form-select" id="products-sort-select" data-action="products-sort">
              <option value="newest">${t('products.sortNewest')}</option>
              <option value="price-low">${t('products.sortPriceLow')}</option>
              <option value="price-high">${t('products.sortPriceHigh')}</option>
              <option value="rating">${t('products.sortRating')}</option>
            </select>
          </div>
        </div>

        <!-- Category Filters -->
        <div class="filter-pills" id="category-filters">
          <button class="filter-pill ${!categoryId ? 'active' : ''}" data-action="filter-category" data-category-id="" id="filter-all">${t('products.allCategories')}</button>
          ${categories.map(cat => `
            <button class="filter-pill ${categoryId === cat.id ? 'active' : ''}" data-action="filter-category" data-category-id="${cat.id}" id="filter-${cat.id}">${escapeHtml(getCategoryName(cat))}</button>
          `).join('')}
        </div>

        <!-- Products Count -->
        <p class="products-count mb-2" id="products-count">${products.length} ${t('products.results')}</p>

        <!-- Products Grid -->
        <div class="products-grid" id="products-grid">
          ${products.length > 0
            ? products.map(p => renderProductCard(p)).join('')
            : `<div class="empty-state">
                <span class="empty-icon"><i class="ph ph-package"></i></span>
                <h3 class="empty-title">${t('products.noResults')}</h3>
                <p class="empty-message">${t('products.noResultsMessage')}</p>
              </div>`
          }
        </div>
      </div>
    </div>
  `;
}

// --- Wishlist Page ---
function renderWishlistPage() {
  const wishlistIds = Store.getWishlist();
  const products = Store.getActiveProducts().filter(p => wishlistIds.includes(p.id));

  return `
    <div class="page-content">
      <div class="container">
        <h1 class="mb-3">${t('wishlist.title')}</h1>
        <div class="products-grid" id="wishlist-grid">
          ${products.length > 0
            ? products.map(p => renderProductCard(p)).join('')
            : `<div class="empty-state">
                <span class="empty-icon" style="font-size: 3rem; opacity: 0.3;"><i class="ph ph-heart-break"></i></span>
                <h3 class="empty-title">${t('wishlist.empty')}</h3>
                <p class="empty-message">${t('wishlist.emptyMessage')}</p>
                <a href="#/products" class="btn btn-primary mt-3">${t('cart.continueShopping')}</a>
              </div>`
          }
        </div>
      </div>
    </div>
  `;
}

// --- Product Detail Page ---
function renderProductDetailPage(productId) {
  const product = Store.getProduct(productId);
  if (!product) {
    return `
      <div class="page-content">
        <div class="container">
          <div class="empty-state">
            <span class="empty-icon"><i class="ph ph-x-circle"></i></span>
            <h3 class="empty-title">${t('common.noData')}</h3>
            <a href="#/products" class="btn btn-primary mt-2">${t('product.backToProducts')}</a>
          </div>
        </div>
      </div>
    `;
  }

  const category = Store.getCategory(product.categoryId);
  const discountedPrice = Store.getProductPrice(product);
  const hasDiscount = product.discountPercentage > 0;
  const outOfStock = product.stock <= 0;
  const reviews = Store.getApprovedReviews(product.id);
  const related = Store.getProductsByCategory(product.categoryId).filter(p => p.id !== product.id).slice(0, 4);
  const lang = getLang();
  const settings = Store.getSettings();

  const discountLabel = lang === 'ar'
    ? `${t('common.off')} ${product.discountPercentage}%`
    : `${product.discountPercentage}% ${t('common.off')}`;

  // Record recently viewed
  setTimeout(() => Store.addRecentlyViewed(product.id), 100);

  const linkedIds = product.linkedProducts || [];
  const linkedProducts = Store.getActiveProducts().filter(p => linkedIds.includes(p.id));

  const renderBannersForPosition = (pos) => {
    return (settings.customBanners || [])
      .filter(b => b.active && (b.position || 'top') === pos)
      .map(b => `
        <div class="custom-banner" style="background-color: ${b.bgColor}; color: ${b.textColor}; padding: ${b.size === 'small' ? '15px' : b.size === 'large' ? '40px' : '25px'} 0; text-align: ${b.align}; margin-bottom: 24px;">
          <div class="container">
            <div style="font-size: ${b.size === 'small' ? '1.1rem' : b.size === 'large' ? '2rem' : '1.5rem'}; font-weight: bold; line-height: 1.4;">
              ${escapeHtml(lang === 'ar' ? b.text_ar : b.text_en).replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
      `).join('');
  };

  return `
    <div class="page-content">
      ${renderBannersForPosition('product_top')}
      <div class="container">
        <!-- Breadcrumb -->
        <nav class="breadcrumb" id="product-breadcrumb">
          <a href="#/">${t('nav.home')}</a>
          <span class="breadcrumb-separator">/</span>
          <a href="#/products">${t('nav.products')}</a>
          ${category ? `
            <span class="breadcrumb-separator">/</span>
            <a href="#/category/${category.id}">${escapeHtml(getCategoryName(category))}</a>
          ` : ''}
          <span class="breadcrumb-separator">/</span>
          <span>${escapeHtml(getProductName(product))}</span>
        </nav>

        <div class="product-detail-grid">
          <!-- Image -->
          <!-- Image Gallery -->
          <div class="product-detail-gallery">
            <div class="product-detail-image" id="product-detail-image-viewer">
              ${hasDiscount ? `<span class="discount-badge">${discountLabel}</span>` : ''}
              <!-- Smart Background Ambient Blur -->
              <div class="product-image-blur-bg" id="detail-main-image-blur" style="background-image: url('${product.images?.[0] || 'https://picsum.photos/seed/placeholder/600/800'}')"></div>
              <img src="${product.images?.[0] || 'https://picsum.photos/seed/placeholder/600/800'}" alt="${escapeHtml(getProductName(product))}" class="product-image-fg" id="detail-main-image-fg">
              
              ${(product.images && product.images.length > 1) ? `
                <button class="gallery-nav-btn prev" data-action="prev-detail-image" data-product-id="${product.id}" data-index="0" aria-label="Previous image"><i class="ph ph-caret-left"></i></button>
                <button class="gallery-nav-btn next" data-action="next-detail-image" data-product-id="${product.id}" data-index="0" aria-label="Next image"><i class="ph ph-caret-right"></i></button>
              ` : ''}
            </div>
            
            ${(product.images && product.images.length > 1) ? `
              <div class="product-detail-thumbnails">
                ${product.images.map((img, idx) => `
                  <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-action="select-detail-image" data-index="${idx}" data-img-url="${escapeHtml(img)}">
                    <img src="${img}" alt="" loading="lazy">
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Info -->
          <div class="product-detail-info">
            <div class="product-detail-category">${category ? escapeHtml(getCategoryName(category)) : ''}</div>
            <h1 class="product-detail-name" id="product-detail-name">${escapeHtml(getProductName(product))}</h1>

            <div class="product-detail-rating">
              ${renderStars(product.ratingAvg)}
              <span class="rating-count">(${product.ratingCount} ${t('product.reviews')})</span>
            </div>

            <div class="product-detail-price ${hasDiscount ? 'has-discount' : ''}">
              <span class="price-current">${formatPrice(discountedPrice)}</span>
              ${hasDiscount ? `<span class="price-original">${formatPrice(product.price)}</span>` : ''}
            </div>

            ${(product.showScarcityBadge !== false && product.stock > 0 && product.stock <= (product.scarcityThreshold ?? 5)) ? `
              <div class="scarcity-badge" style="margin-bottom: 20px; display: inline-flex;">
                <i class="ph-fill ph-fire"></i>
                ${lang === 'ar' ? `سارع بالشراء! متبقي ${product.stock} فقط` : `Hurry up! Only ${product.stock} left`}
              </div>
            ` : ''}

            <p class="product-detail-description">${escapeHtml(getProductDesc(product))}</p>

            ${(product.colors && product.colors.length > 0) ? `
              <div class="product-variant-section" style="margin-bottom:20px;">
                <div class="variant-title" style="margin-bottom:8px;">${lang === 'ar' ? 'اللون:' : 'Color:'} <span id="selected-color-name" style="font-weight:bold; color:var(--text); margin-inline-start:4px;">${lang === 'ar' ? 'اختر اللون' : 'Select Color'}</span></div>
                <div class="color-swatches" id="product-colors-container" style="display:flex; gap:10px; flex-wrap:wrap;">
                  ${product.colors.map(c => `
                    <button class="color-swatch" data-action="select-color" data-color-ar="${escapeHtml(c.name_ar)}" data-color-en="${escapeHtml(c.name_en)}" data-image="${escapeHtml(c.image || '')}" style="background-color: ${c.hex}; width:36px; height:36px; border-radius:50%; border:2px solid var(--border); cursor:pointer; position:relative;" aria-label="${escapeHtml(lang === 'ar' ? c.name_ar : c.name_en)}" title="${escapeHtml(lang === 'ar' ? c.name_ar : c.name_en)}"></button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${(product.sizes && product.sizes.length > 0) ? `
              <div class="product-variant-section" style="margin-bottom:20px;">
                <div class="variant-title" style="margin-bottom:8px;">${lang === 'ar' ? 'المقاس:' : 'Size:'} <span id="selected-size-name" style="font-weight:bold; color:var(--text); margin-inline-start:4px;">${lang === 'ar' ? 'اختر المقاس' : 'Select Size'}</span></div>
                <div class="size-selectors" id="product-sizes-container" style="display:flex; gap:10px; flex-wrap:wrap;">
                  ${product.sizes.map(s => `
                    <button class="size-swatch" data-action="select-size" data-size="${escapeHtml(s)}" style="padding:8px 16px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-card); cursor:pointer; font-weight:600;">${escapeHtml(s)}</button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${(product.note_ar || product.note_en) ? `
              <div class="product-note-alert" style="background-color: var(--bg-card); border: 1px solid var(--primary); padding: 12px; border-radius: var(--radius-md); margin-bottom: 20px; display: flex; gap: 10px; align-items: flex-start;">
                <i class="ph-fill ph-info" style="color: var(--primary); font-size: 20px; margin-top:2px;"></i>
                <span style="font-weight:500; font-size: 0.95rem;">${escapeHtml(lang === 'ar' ? (product.note_ar || product.note_en) : (product.note_en || product.note_ar))}</span>
              </div>
            ` : ''}
            
            <div id="variant-error" style="color: var(--danger); font-size: 14px; margin-bottom: 15px; display: none; font-weight:600;">
              ${lang === 'ar' ? 'الرجاء اختيار اللون والمقاس أولاً' : 'Please select color and size first'}
            </div>

            <div class="product-detail-actions" id="product-actions">
              <div class="qty-selector" id="qty-selector-detail">
                <button class="qty-btn" data-action="detail-qty-decrease" id="detail-qty-minus"><i class="ph ph-minus"></i></button>
                <span class="qty-value" id="detail-qty-value">1</span>
                <button class="qty-btn" data-action="detail-qty-increase" id="detail-qty-plus"><i class="ph ph-plus"></i></button>
              </div>
              <div style="display: flex; gap: 12px; flex: 1;">
                <button class="btn btn-primary btn-lg" style="flex: 1;" data-action="detail-buy-now" data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''}>
                  ${outOfStock ? t('product.outOfStock') : (lang === 'ar' ? 'شراء سريع' : 'Buy Now')}
                </button>
                <button class="btn btn-secondary btn-lg" data-action="detail-add-to-cart" data-product-id="${product.id}" id="btn-add-to-cart" ${outOfStock ? 'disabled' : ''} title="${t('product.addToCart')}">
                  <i class="ph ph-shopping-cart"></i>
                </button>
                <a href="https://wa.me/${(settings.contactWhatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent('أريد الاستفسار عن المنتج: ' + getProductName(product))}" target="_blank" class="btn btn-lg" style="background-color: #25D366; color: white; border: none;" title="WhatsApp">
                  <i class="ph ph-whatsapp-logo"></i>
                </a>
              </div>

            ${outOfStock ? `<p style="color:var(--danger);font-weight:600;">${t('product.outOfStock')}</p>` : ''}
          </div>

        <!-- Linked/Upsell Products -->
        ${linkedProducts.length > 0 ? `
          <div class="linked-products-section" style="margin-top: 25px; border-top: 1px dashed var(--border); padding-top: 20px;">
            <h3 class="linked-products-title" style="font-size: 1.1rem; margin-bottom: 15px;">${t('linked.title')}</h3>
            <div class="linked-products-grid" style="display:flex; flex-direction:column; gap:10px;">
              ${linkedProducts.map(p => `
                <div class="linked-product-item" id="linked-item-${p.id}" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); border:1px solid var(--border); padding:10px; border-radius:8px;">
                  <div class="linked-product-info" style="display:flex; align-items:center; gap:10px; flex:1;">
                    <input type="checkbox" class="linked-product-check" data-action="toggle-linked-price" data-price="${Store.getProductPrice(p)}" value="${p.id}" checked style="cursor:pointer; width:18px; height:18px;">
                    <img class="linked-product-img" src="${p.images?.[0] || 'https://via.placeholder.com/50'}" alt="" loading="lazy" style="width:40px; height:40px; object-fit:cover; border-radius:6px;">
                    <div class="linked-product-details" style="display:flex; flex-direction:column;">
                      <span class="linked-product-name" style="font-weight:600; font-size:0.9rem;">${escapeHtml(getProductName(p))}</span>
                      <span class="linked-product-price" style="color:var(--primary); font-weight:bold; font-size:0.85rem;">${formatPrice(Store.getProductPrice(p))}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="linked-products-action-bar" style="margin-top:15px; padding:15px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border); display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center;">
              <div class="linked-products-total-desc" style="font-size:0.9rem;">
                <span>${t('linked.totalSelected')} </span>
                <strong id="linked-total-price-display" style="font-size:1.1rem; color:var(--primary);">${formatPrice(discountedPrice + linkedProducts.reduce((sum, p) => sum + Store.getProductPrice(p), 0))}</strong>
              </div>
              <button class="btn btn-primary btn-sm" data-action="add-linked-bundle" data-main-id="${product.id}">
                <i class="ph ph-shopping-bag-open"></i> ${t('linked.buyTogether')}
              </button>
            </div>
          </div>
        ` : ''}

        </div>



        <!-- Reviews Section -->
        <section class="page-section" id="reviews-section">
          <div class="section-header">
            <h2 class="section-title">${t('product.reviews')} (${reviews.length})</h2>
          </div>

          ${reviews.length > 0 ? reviews.map(rev => `
            <div class="review-card" id="review-${rev.id}">
              <div class="review-header">
                <div>
                  <div class="review-author">${escapeHtml(rev.customerName)}</div>
                  ${renderStars(rev.rating)}
                </div>
                <span class="review-date">${Store.formatDate(rev.createdAt, lang)}</span>
              </div>
              <p class="review-comment">${escapeHtml(rev.comment)}</p>
            </div>
          `).join('') : `
            <p style="color:var(--text-muted);padding:24px 0;">${t('product.noReviews')}</p>
          `}

          <!-- Review Form -->
          <div class="review-form" id="review-form">
            <h4 class="review-form-title">${t('product.writeReview')}</h4>
            <div class="form-group">
              <label class="form-label">${t('review.name')}</label>
              <input type="text" class="form-input" id="review-name" placeholder="${t('review.name')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('review.rating')}</label>
              <div class="review-stars-input" id="review-stars-input">
                ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}" data-action="review-star"><i class="ph-fill ph-star"></i></span>`).join('')}
              </div>
              <input type="hidden" id="review-rating-value" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">${t('review.comment')}</label>
              <textarea class="form-textarea" id="review-comment" placeholder="${t('review.comment')}"></textarea>
            </div>
            <button class="btn btn-primary" data-action="submit-review" data-product-id="${product.id}" id="btn-submit-review">
              ${t('review.submit')}
            </button>
          </div>
        </section>

        <!-- Related Products -->
        ${related.length > 0 ? `
          <section class="related-products" id="related-products">
            <div class="section-header">
              <h2 class="section-title">${t('product.relatedProducts')}</h2>
            </div>
            <div class="products-grid">
              ${related.map(p => renderProductCard(p)).join('')}
            </div>
          </section>
        ` : ''}
      </div>
      ${renderBannersForPosition('product_bottom')}
    </div>
  `;
}

function updateProductDetailViewer(imgUrl, index) {
  const fg = document.getElementById('detail-main-image-fg');
  const bg = document.getElementById('detail-main-image-blur');
  if (fg) fg.src = imgUrl;
  if (bg) bg.style.backgroundImage = `url('${imgUrl}')`;

  // Update navigation buttons dataset index
  document.querySelectorAll('[data-action=\"prev-detail-image\"], [data-action=\"next-detail-image\"]').forEach(btn => {
    btn.dataset.index = index;
  });

  // Update thumbnails active border
  document.querySelectorAll('.thumb-item').forEach(thumb => {
    thumb.classList.toggle('active', parseInt(thumb.dataset.index) === index);
  });
}

// --- Checkout Page ---
function renderCheckoutPage() {
  const cartItems = Store.getCartWithProducts();
  const cartTotal = Store.getCartTotal();
  const settings = Store.getSettings();
  const lang = getLang();
  const cities = Object.keys(settings.shippingRates || {});

  if (cartItems.length === 0) {
    return `
      <div class="page-content">
        <div class="container">
          <div class="empty-state">
            <span class="empty-icon"><i class="ph ph-shopping-cart"></i></span>
            <h3 class="empty-title">${t('checkout.emptyCart')}</h3>
            <a href="#/products" class="btn btn-primary mt-2">${t('cart.continueShopping')}</a>
          </div>
        </div>
      </div>
    `;
  }

  const shippingText = '—';

  let discountRow = '';
  let finalTotal = cartTotal.subtotal;
  
  if (currentCouponCode) {
    const val = Store.validateCoupon(currentCouponCode, cartTotal.subtotal);
    if (val.valid) {
      currentDiscountAmount = val.discountAmount;
      finalTotal = Math.max(0, cartTotal.total - currentDiscountAmount);
      discountRow = `
        <div class="cart-summary-row" style="color:var(--success)">
          <span>${t('checkout.discount')} (${currentCouponCode})</span>
          <span>-${formatPrice(currentDiscountAmount)}</span>
        </div>
      `;
    } else {
      currentCouponCode = '';
      currentDiscountAmount = 0;
    }
  }

  const customer = Store.getCurrentCustomer();
  const defName = customer ? customer.name : '';
  const defPhone = customer ? customer.phone : '';
  const defEmail = customer ? customer.email : '';

  return `
    <div class="page-content">
      <div class="container">
        <h1 class="mb-4">${t('checkout.title')}</h1>
        <div class="checkout-grid">
          <!-- Form -->
          <div>
            ${!customer ? `
              <div class="mb-4" style="background:var(--accent-light); border:1px solid var(--accent); border-radius:var(--radius-sm); padding:16px;">
                <strong>${t('auth.guestCheckout')}</strong><br>
                <span style="color:var(--text-secondary);font-size:0.9rem;">${t('auth.guestCheckoutDesc')}</span><br>
                <div class="mt-2"><a href="#/login" style="color:var(--accent);font-weight:bold;">${t('auth.loginNow')}</a></div>
              </div>
            ` : ''}
            <h3 class="mb-3">${t('checkout.customerInfo')}</h3>
            <form id="checkout-form">
              <div class="form-group">
                <label class="form-label" for="checkout-name">${t('checkout.name')} *</label>
                <input type="text" class="form-input" id="checkout-name" value="${escapeHtml(defName)}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="checkout-phone">${t('checkout.phone')} *</label>
                <input type="tel" class="form-input" id="checkout-phone" value="${escapeHtml(defPhone)}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="checkout-email">${t('checkout.email')}</label>
                <input type="email" class="form-input" id="checkout-email" value="${escapeHtml(defEmail)}">
              </div>

              <h3 class="mb-3 mt-4">${t('checkout.shippingInfo')}</h3>
              <div class="form-group">
                <label class="form-label" for="checkout-city">${t('checkout.city')} (اختياري - للاستلام من الفرع اتركه فارغاً)</label>
                <select class="form-select" id="checkout-city">
                  <option value="">بدون شحن (استلام من الفرع)</option>
                  ${(Array.isArray(cities) ? cities : []).map(city => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="checkout-address">${t('checkout.address')} *</label>
                <input type="text" class="form-input" id="checkout-address" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="checkout-notes">${t('checkout.notes')}</label>
                <textarea class="form-textarea" id="checkout-notes"></textarea>
              </div>

              <!-- Payment -->
              <h3 class="mb-3 mt-4">${t('checkout.paymentMethod')}</h3>
              <div class="cod-notice">
                <span class="cod-notice-icon"><i class="ph ph-money"></i></span>
                <div>
                  <div class="cod-notice-text">${t('checkout.cod')}</div>
                  <div class="cod-notice-subtext">${t('checkout.codNote')}</div>
                </div>
              </div>

              <button type="button" class="btn btn-primary btn-lg w-100" data-action="place-order" id="btn-place-order">
                ${t('checkout.placeOrder')}
              </button>
            </form>
          </div>

          <!-- Order Summary -->
          <div class="order-summary-card" id="checkout-summary">
            <h3 class="mb-3">${t('checkout.orderSummary')}</h3>
            ${cartItems.map(item => `
              <div class="order-summary-item" id="checkout-item-${item.cartItemId || item.productId}">
                <img src="${item.product.images?.[0] || 'https://picsum.photos/seed/placeholder/100/100'}" alt="" class="order-summary-item-image" loading="lazy">
                <div class="order-summary-item-info">
                  <div class="order-summary-item-name">${escapeHtml(getProductName(item.product))}</div>
                  ${(item.color || item.size) ? `
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2px;">
                      ${item.color ? `${lang === 'ar' ? 'اللون:' : 'Color:'} <strong style="color:var(--text);">${escapeHtml(item.color)}</strong> ` : ''}
                      ${item.size ? `${lang === 'ar' ? 'المقاس:' : 'Size:'} <strong style="color:var(--text);">${escapeHtml(item.size)}</strong>` : ''}
                    </div>
                  ` : ''}
                  <div class="checkout-item-actions" style="margin-top: 8px;">
                    <div class="qty-selector" style="transform: scale(0.9); transform-origin: ${isRTL() ? 'right' : 'left'} center;">
                      <button type="button" class="qty-btn" data-action="checkout-qty-decrease" data-product-id="${item.productId}" data-cart-item-id="${item.cartItemId || item.productId}"><i class="ph ph-minus"></i></button>
                      <span class="qty-value">${item.quantity}</span>
                      <button type="button" class="qty-btn" data-action="checkout-qty-increase" data-product-id="${item.productId}" data-cart-item-id="${item.cartItemId || item.productId}"><i class="ph ph-plus"></i></button>
                    </div>
                  </div>
                </div>
                <div class="order-summary-item-price" style="text-align: end;">
                  <div>${formatPrice(item.totalPrice)}</div>
                  ${item.product.discountPercentage > 0 ? `<div style="text-decoration: line-through; color: var(--text-muted); font-size: 0.85em;">${formatPrice(item.product.price * item.quantity)}</div>` : ''}
                </div>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="cart-summary-row">
              <span>${t('cart.subtotal')}</span>
              <span>${formatPrice(cartTotal.subtotal)}</span>
            </div>
            ${discountRow}
            <div class="cart-summary-row">
              <span>${t('cart.shipping')}</span>
              <span id="checkout-shipping-display">${shippingText}</span>
            </div>
            <div class="cart-summary-row total">
              <span>${t('cart.total')}</span>
              <span id="checkout-total-display">${formatPrice(finalTotal)}</span>
            </div>
            
            <div class="divider"></div>
            <div class="coupon-section mt-4 mb-2" style="display:flex;gap:8px;">
              <input type="text" class="form-input" id="checkout-coupon" placeholder="${t('checkout.couponCode')}" style="text-transform:uppercase" value="${currentCouponCode}">
              <button type="button" class="btn btn-secondary" data-action="apply-coupon">${t('checkout.applyCoupon')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateCheckoutSummary() {
  const summaryContainer = document.getElementById('checkout-summary');
  if (!summaryContainer) return;

  const cartItems = Store.getCartWithProducts();
  if (cartItems.length === 0) {
    handleRoute();
    return;
  }

  const citySelect = document.getElementById('checkout-city');
  const selectedCity = citySelect ? citySelect.value : '';
  const settings = Store.getSettings();
  const cartTotal = Store.getCartTotal(selectedCity);
  const lang = getLang();

  let discountRow = '';
  let finalTotal = cartTotal.subtotal;
  
  if (currentCouponCode) {
    const val = Store.validateCoupon(currentCouponCode, cartTotal.subtotal);
    if (val.valid) {
      currentDiscountAmount = val.discountAmount;
      finalTotal = Math.max(0, cartTotal.total - currentDiscountAmount);
      discountRow = `
        <div class="cart-summary-row" style="color:var(--success)">
          <span>${t('checkout.discount')} (${currentCouponCode})</span>
          <span>-${formatPrice(currentDiscountAmount)}</span>
        </div>
      `;
    } else {
      currentCouponCode = '';
      currentDiscountAmount = 0;
    }
  }

  const shippingText = (cartTotal.shipping === 0 && settings.freeShippingActive)
    ? `<span class="free-shipping">${t('cart.freeShipping')} ✓</span>`
    : formatPrice(cartTotal.shipping);

  summaryContainer.innerHTML = `
    <h3 class="mb-3">${t('checkout.orderSummary')}</h3>
    ${cartItems.map(item => `
      <div class="order-summary-item" id="checkout-item-${item.cartItemId || item.productId}">
        <img src="${item.product.images?.[0] || 'https://picsum.photos/seed/placeholder/100/100'}" alt="" class="order-summary-item-image" loading="lazy">
        <div class="order-summary-item-info">
          <div class="order-summary-item-name">${escapeHtml(getProductName(item.product))}</div>
          ${(item.color || item.size) ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2px;">
              ${item.color ? `${lang === 'ar' ? 'اللون:' : 'Color:'} <strong style="color:var(--text);">${escapeHtml(item.color)}</strong> ` : ''}
              ${item.size ? `${lang === 'ar' ? 'المقاس:' : 'Size:'} <strong style="color:var(--text);">${escapeHtml(item.size)}</strong>` : ''}
            </div>
          ` : ''}
          <div class="checkout-item-actions" style="margin-top: 8px;">
            <div class="qty-selector" style="transform: scale(0.9); transform-origin: ${isRTL() ? 'right' : 'left'} center;">
              <button type="button" class="qty-btn" data-action="checkout-qty-decrease" data-product-id="${item.productId}" data-cart-item-id="${item.cartItemId || item.productId}"><i class="ph ph-minus"></i></button>
              <span class="qty-value">${item.quantity}</span>
              <button type="button" class="qty-btn" data-action="checkout-qty-increase" data-product-id="${item.productId}" data-cart-item-id="${item.cartItemId || item.productId}"><i class="ph ph-plus"></i></button>
            </div>
          </div>
        </div>
        <div class="order-summary-item-price" style="text-align: end;">
          <div>${formatPrice(item.totalPrice)}</div>
          ${item.product.discountPercentage > 0 ? `<div style="text-decoration: line-through; color: var(--text-muted); font-size: 0.85em;">${formatPrice(item.product.price * item.quantity)}</div>` : ''}
        </div>
      </div>
    `).join('')}
    <div class="divider"></div>
    <div class="cart-summary-row">
      <span>${t('cart.subtotal')}</span>
      <span>${formatPrice(cartTotal.subtotal)}</span>
    </div>
    ${discountRow}
    <div class="cart-summary-row">
      <span>${t('cart.shipping')}</span>
      <span id="checkout-shipping-display">${selectedCity ? shippingText : '—'}</span>
    </div>
    <div class="cart-summary-row total">
      <span>${t('cart.total')}</span>
      <span id="checkout-total-display">${formatPrice(finalTotal)}</span>
    </div>
    
    <div class="divider"></div>
    <div class="coupon-section mt-4 mb-2" style="display:flex;gap:8px;">
      <input type="text" class="form-input" id="checkout-coupon" placeholder="${t('checkout.couponCode')}" style="text-transform:uppercase" value="${currentCouponCode}">
      <button type="button" class="btn btn-secondary" data-action="apply-coupon">${t('checkout.applyCoupon')}</button>
    </div>
  `;
}

// --- Order Success Page ---
function renderOrderSuccessPage(orderNumber) {
  return `
    <div class="page-content">
      <div class="container">
        <div class="success-page">
          <span class="success-icon"><i class="ph ph-check-circle"></i></span>
          <h1 class="success-title">${t('checkout.success')}</h1>
          <p style="color:var(--text-secondary);margin-bottom:24px;">${getLang() === 'ar' ? 'سنتواصل معك قريباً لتأكيد التفاصيل. يمكنك متابعة طلبك من خلال الكود الظاهر بالأسفل أو باستخدام رقم هاتفك المسجل.' : "We'll contact you soon. You can track your order using the code below or your registered phone number."}</p>
          <div class="success-order-number" onclick="navigator.clipboard.writeText('${orderNumber}').then(()=>showToast('${getLang() === 'ar' ? 'تم النسخ بنجاح!' : 'Copied successfully!'}', 'success'))" title="${getLang() === 'ar' ? 'اضغط للنسخ' : 'Click to copy'}">
            ${orderNumber || ''} <i class="ph ph-copy" style="font-size: 1.2rem; margin-inline-start: 8px;"></i>
          </div>
          <div class="mt-4 flex-center gap-2" style="flex-wrap:wrap;">
            <a href="#/track/${orderNumber || ''}" class="btn btn-primary" id="btn-track-success">${t('checkout.trackOrder')}</a>
            <a href="#/" class="btn btn-secondary" id="btn-home-success">${t('checkout.backToHome')}</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Order Tracking Page ---
function renderOrderTrackingPage(orderNumber = '') {
  let orderHtml = '';

  if (orderNumber) {
    const orders = Store.getOrders();
    const query = orderNumber.trim().toUpperCase();
    
    let foundOrders = orders.filter(o => o.orderNumber.toUpperCase() === query);
    if (foundOrders.length === 0) {
      foundOrders = orders.filter(o => o.customerPhone && o.customerPhone.replace(/\s+/g, '') === query.replace(/\s+/g, ''));
    }

    if (foundOrders.length > 0) {
      // Sort by date descending (newest first)
      foundOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const newestOrder = foundOrders[0];
      const previousOrders = foundOrders.slice(1);
      
      orderHtml = renderOrderDetails(newestOrder);
      
      if (previousOrders.length > 0) {
        const previousOrdersHtml = previousOrders.map(o => renderOrderDetails(o)).join('<div style="margin:40px 0;border-top:1px dashed var(--border);"></div>');
        const prevText = getLang() === 'ar' ? 'الطلبات السابقة' : 'Previous Orders';
        orderHtml += `
          <div class="text-center mt-5">
            <button class="btn btn-secondary" id="btn-show-previous" onclick="document.getElementById('previous-orders-list').style.display='block'; this.style.display='none';"><i class="ph ph-clock-counter-clockwise"></i> ${prevText} (${previousOrders.length})</button>
          </div>
          <div id="previous-orders-list" style="display:none; margin-top:40px; padding-top:40px; border-top:2px solid var(--border);">
            <h3 class="text-center mb-4">${prevText}</h3>
            ${previousOrdersHtml}
          </div>
        `;
      }
    } else {
      orderHtml = `
        <div class="empty-state">
          <span class="empty-icon"><i class="ph ph-magnifying-glass"></i></span>
          <h3 class="empty-title">${t('track.notFound')}</h3>
          <p class="empty-message">${t('track.notFoundMessage')}</p>
        </div>
      `;
    }
  }

  return `
    <div class="page-content">
      <div class="container">
        <h1 class="text-center mb-4">${t('track.title')}</h1>
        <div class="track-search" id="track-search">
          <p class="text-center mb-3" style="color:var(--text-secondary);">${getLang() === 'ar' ? 'أدخل رقم الطلب أو رقم الهاتف المسجل' : 'Enter order number or phone number'}</p>
          <div class="track-search-form">
            <input type="text" class="form-input" id="track-input" placeholder="${getLang() === 'ar' ? 'مثال: LR-78432 أو 010...' : 'e.g. LR-78432 or 010...'}" value="${escapeHtml(orderNumber)}">
            <button class="btn btn-primary" data-action="track-order" id="btn-track-search">${t('track.search')}</button>
          </div>
        </div>
        <div id="track-results">${orderHtml}</div>
      </div>
    </div>
  `;
}

function renderOrderDetails(order) {
  const lang = getLang();
  const statuses = ['new', 'confirmed', 'preparing', 'shipping', 'delivered'];
  const currentIndex = statuses.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  const trackSettings = Store.getSettings();
  const shippingText = (order.shipping === 0 && trackSettings.freeShippingActive)
    ? `<span class="free-shipping">${t('cart.freeShipping')} ✓</span>`
    : formatPrice(order.shipping);

  return `
    <div class="order-details-card" id="order-details">
      <div class="order-details-header">
        <div>
          <span class="order-number-display">${order.orderNumber}</span>
          <div style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">${Store.formatDateTime(order.createdAt, lang)}</div>
        </div>
        <span class="status-badge status-${order.status}">${Store.getStatusIcon(order.status)} ${t('status.' + order.status)}</span>
      </div>

      <!-- Timeline -->
      ${!isCancelled ? `
        <div class="order-timeline" id="order-timeline">
          ${statuses.map((status, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            const isLast = index === statuses.length - 1;
            return `
              <div class="timeline-step">
                <div class="timeline-dot ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
                  ${isCompleted ? '✓' : isActive ? '●' : ''}
                </div>
                ${!isLast ? `<div class="timeline-line ${isCompleted ? 'completed' : ''}"></div>` : ''}
                <div class="timeline-info">
                  <div class="timeline-label ${!isCompleted && !isActive ? 'muted' : ''}">${Store.getStatusIcon(status)} ${t('status.' + status)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <div class="divider"></div>

      <!-- Order Items -->
      <h4 class="mb-2">${t('track.orderItems')}</h4>
      <div class="order-items-list">
        ${order.items.map(item => `
          <div class="order-item-row">
            <img src="${item.image || 'https://picsum.photos/seed/placeholder/100/100'}" alt="" class="order-item-image" loading="lazy">
            <div class="order-item-info">
              <div class="order-item-name">${escapeHtml(lang === 'ar' ? item.name_ar : item.name_en)}</div>
              <div class="order-item-qty">× ${item.quantity}</div>
            </div>
            <div class="order-item-price">${formatPrice(item.discountedPrice * item.quantity)}</div>
          </div>
        `).join('')}
      </div>

      <div class="divider"></div>

      <!-- Summary -->
      <div class="cart-summary-row">
        <span>${t('cart.subtotal')}</span>
        <span>${formatPrice(order.subtotal)}</span>
      </div>
      ${order.discountAmount && order.discountAmount > 0 ? `
        <div class="cart-summary-row" style="color:var(--success)">
          <span>${t('checkout.discount')} ${order.couponCode ? `(${order.couponCode})` : ''}</span>
          <span>-${formatPrice(order.discountAmount)}</span>
        </div>
      ` : ''}
      <div class="cart-summary-row">
        <span>${t('cart.shipping')}</span>
        <span>${shippingText}</span>
      </div>
      <div class="cart-summary-row total">
        <span>${t('cart.total')}</span>
        <span>${formatPrice(order.total)}</span>
      </div>

      <div class="divider"></div>

      <!-- Customer Info -->
      <h4 class="mb-2">${t('track.customerInfo')}</h4>
      <div style="color:var(--text-secondary);line-height:2;">
        <div><i class="ph ph-user"></i> ${escapeHtml(order.customerName)}</div>
        <div><i class="ph ph-phone"></i> ${escapeHtml(order.customerPhone)}</div>
        ${order.customerEmail ? `<div><i class="ph ph-envelope"></i> ${escapeHtml(order.customerEmail)}</div>` : ''}
        <div><i class="ph ph-map-pin"></i> ${escapeHtml(order.customerAddress)}${order.city ? `, ${escapeHtml(order.city)}` : ''}</div>
        ${order.notes ? `<div><i class="ph ph-note"></i> ${escapeHtml(order.notes)}</div>` : ''}
      </div>
    </div>
  `;
}

// --- Auth Pages ---
function renderLoginPage() {
  if (Store.getCurrentCustomer()) {
    setTimeout(() => navigateTo('#/profile'), 0);
    return '';
  }
  return `
    <div class="page-content">
      <div class="container" style="max-width: 480px;">
        <div class="card" style="padding: 40px 32px;">
          <h2 class="text-center mb-4" style="color:var(--accent); font-family:var(--font-heading);">${t('auth.loginNow')}</h2>
          
          <button type="button" class="btn btn-secondary w-100 mb-3" data-action="google-login" style="display:flex; justify-content:center; align-items:center; gap:8px; background:white; color:#333;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
            Sign in with Google
          </button>
          
          <div style="display:flex; align-items:center; text-align:center; color:var(--text-muted); margin-bottom:16px;">
            <hr style="flex:1; border:none; border-top:1px solid var(--border);">
            <span style="padding:0 10px; font-size:0.9rem;">or</span>
            <hr style="flex:1; border:none; border-top:1px solid var(--border);">
          </div>

          <form id="login-form">
            <div class="form-group">
              <label class="form-label">${t('auth.email')}</label>
              <input type="email" id="login-email" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">${t('auth.password')}</label>
              <input type="password" id="login-password" class="form-input" required>
            </div>
            <button type="submit" class="btn btn-primary w-100 mt-2">${t('auth.login')}</button>
          </form>
          <div class="text-center mt-4" style="color:var(--text-secondary);">
            ${t('auth.noAccount')} <a href="#/register" style="color:var(--accent);font-weight:bold;">${t('auth.createAccount')}</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRegisterPage() {
  if (Store.getCurrentCustomer()) {
    setTimeout(() => navigateTo('#/profile'), 0);
    return '';
  }
  return `
    <div class="page-content">
      <div class="container" style="max-width: 480px;">
        <div class="card" style="padding: 40px 32px;">
          <h2 class="text-center mb-4" style="color:var(--accent); font-family:var(--font-heading);">${t('auth.createAccount')}</h2>
          
          <button type="button" class="btn btn-secondary w-100 mb-3" data-action="google-login" style="display:flex; justify-content:center; align-items:center; gap:8px; background:white; color:#333;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
            Sign up with Google
          </button>
          
          <div style="display:flex; align-items:center; text-align:center; color:var(--text-muted); margin-bottom:16px;">
            <hr style="flex:1; border:none; border-top:1px solid var(--border);">
            <span style="padding:0 10px; font-size:0.9rem;">or</span>
            <hr style="flex:1; border:none; border-top:1px solid var(--border);">
          </div>

          <form id="register-form">
            <div class="form-group">
              <label class="form-label">${t('auth.name')}</label>
              <input type="text" id="reg-name" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">${t('auth.phone')}</label>
              <input type="tel" id="reg-phone" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">${t('auth.email')}</label>
              <input type="email" id="reg-email" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">${t('auth.password')}</label>
              <input type="password" id="reg-password" class="form-input" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary w-100 mt-2">${t('auth.register')}</button>
          </form>
          <div class="text-center mt-4" style="color:var(--text-secondary);">
            ${t('auth.haveAccount')} <a href="#/login" style="color:var(--accent);font-weight:bold;">${t('auth.loginNow')}</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProfilePage() {
  const customer = Store.getCurrentCustomer();
  if (!customer) {
    setTimeout(() => navigateTo('#/login'), 0);
    return '';
  }

  const orders = Store.getCustomerOrders(customer.id);
  const lang = getLang();

  let ordersHtml = '';
  if (orders.length === 0) {
    ordersHtml = `
      <div class="empty-state">
        <span class="empty-icon"><i class="ph ph-receipt"></i></span>
        <h3 class="empty-title">${t('auth.noOrders')}</h3>
      </div>
    `;
  } else {
    ordersHtml = orders.map(order => `
      <div class="card mb-3" style="padding: 20px;">
        <div class="flex-between mb-2">
          <span style="font-weight:bold; font-family:monospace; font-size:1.1rem; color:var(--text-primary)">${order.orderNumber}</span>
          <span class="status-badge status-${order.status}">${Store.getStatusIcon(order.status)} ${t('status.' + order.status)}</span>
        </div>
        <div style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:12px;">${Store.formatDateTime(order.createdAt, lang)}</div>
        <div class="flex-between">
          <span style="color:var(--text-muted);">${order.items.length} ${t('common.products')}</span>
          <span style="font-weight:bold; color:var(--accent);">${formatPrice(order.total)}</span>
        </div>
        <div class="mt-3">
          <a href="#/track/${order.orderNumber}" class="btn btn-secondary btn-sm">${t('track.orderDetails')}</a>
        </div>
      </div>
    `).join('');
  }

  return `
    <div class="page-content">
      <div class="container" style="max-width: 800px;">
        <div class="flex-between mb-4">
          <h2>${t('auth.profile')}</h2>
          <button class="btn btn-danger btn-sm" data-action="logout" id="btn-logout"><i class="ph ph-sign-out"></i> ${t('auth.logout')}</button>
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr; gap: 24px;">
          <div class="card" style="padding: 24px;">
            <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:16px;">
              <i class="ph ph-user-circle"></i> ${t('auth.personalInfo')}
            </h3>
            <div style="color:var(--text-secondary); line-height:2;">
              <div><strong>${t('auth.name')}:</strong> <span style="color:var(--text-primary)">${escapeHtml(customer.name)}</span></div>
              <div><strong>${t('auth.phone')}:</strong> <span style="color:var(--text-primary); direction:ltr; display:inline-block;">${escapeHtml(customer.phone)}</span></div>
              <div><strong>${t('auth.email')}:</strong> <span style="color:var(--text-primary)">${escapeHtml(customer.email)}</span></div>
            </div>
          </div>
          
          <div>
            <h3 class="mb-3"><i class="ph ph-receipt"></i> ${t('auth.ordersHistory')}</h3>
            ${ordersHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// Products Page - Filtering/Sorting Logic
// ============================================
let productsState = {
  categoryId: null,
  search: '',
  sort: 'newest'
};

let currentCouponCode = '';
let currentDiscountAmount = 0;

function applyProductsFilters() {
  let products;
  if (productsState.categoryId) {
    products = Store.getProductsByCategory(productsState.categoryId);
  } else {
    products = Store.getActiveProducts();
  }

  // Search
  if (productsState.search.trim()) {
    const q = productsState.search.toLowerCase().trim();
    products = products.filter(p => {
      const name = getProductName(p).toLowerCase();
      const desc = getProductDesc(p).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }

  // Sort
  switch (productsState.sort) {
    case 'price-low':
      products.sort((a, b) => Store.getProductPrice(a) - Store.getProductPrice(b));
      break;
    case 'price-high':
      products.sort((a, b) => Store.getProductPrice(b) - Store.getProductPrice(a));
      break;
    case 'rating':
      products.sort((a, b) => b.ratingAvg - a.ratingAvg);
      break;
    case 'newest':
    default:
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }

  // Update grid
  const grid = document.getElementById('products-grid');
  const count = document.getElementById('products-count');
  if (grid) {
    if (products.length > 0) {
      grid.innerHTML = products.map(p => renderProductCard(p)).join('');
    } else {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon"><i class="ph ph-package"></i></span>
          <h3 class="empty-title">${t('products.noResults')}</h3>
          <p class="empty-message">${t('products.noResultsMessage')}</p>
        </div>
      `;
    }
  }
  if (count) {
    count.textContent = `${products.length} ${t('products.results')}`;
  }
}

// ============================================
// Event Delegation
// ============================================
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const productId = target.dataset.productId;
  const categoryId = target.dataset.categoryId;

  switch (action) {
    // Product Gallery
    case 'select-detail-image': {
      const index = parseInt(target.dataset.index);
      const imgUrl = target.dataset.imgUrl;
      updateProductDetailViewer(imgUrl, index);
      break;
    }
    case 'prev-detail-image': {
      const product = Store.getProduct(productId);
      if (!product || !product.images || product.images.length === 0) return;
      const images = product.images;
      let index = parseInt(target.dataset.index);
      index = (index - 1 + images.length) % images.length;
      updateProductDetailViewer(images[index], index);
      break;
    }
    case 'next-detail-image': {
      const product = Store.getProduct(productId);
      if (!product || !product.images || product.images.length === 0) return;
      const images = product.images;
      let index = parseInt(target.dataset.index);
      index = (index + 1) % images.length;
      updateProductDetailViewer(images[index], index);
      break;
    }
    // Wishlist
    case 'toggle-wishlist': {
      e.preventDefault();
      e.stopPropagation();
      const added = Store.toggleWishlist(productId);
      if (added) {
        showToast(t('wishlist.addToWishlist'), 'success');
      } else {
        showToast(t('wishlist.removeFromWishlist'), 'info');
      }
      
      // Update all hearts on screen for this product
      document.querySelectorAll(`[data-action="toggle-wishlist"][data-product-id="${productId}"]`).forEach(btn => {
        btn.classList.toggle('active', added);
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = added ? 'ph-fill ph-heart' : 'ph ph-heart';
        }
      });
      
      // If we are on wishlist page, re-render
      const { page } = parseRoute(getCurrentRoute());
      if (page === 'wishlist') {
        handleRoute();
      }
      break;
    }

    // Linked Products
    case 'toggle-linked-price': {
      const mainId = document.getElementById('btn-add-to-cart')?.dataset.productId;
      if (!mainId) return;
      const mainProduct = Store.getProduct(mainId);
      if (!mainProduct) return;
      let total = Store.getProductPrice(mainProduct);
      
      document.querySelectorAll('.linked-product-check:checked').forEach(cb => {
        total += parseFloat(cb.dataset.price) || 0;
      });
      
      const display = document.getElementById('linked-total-price-display');
      if (display) {
        display.textContent = formatPrice(total);
      }
      break;
    }

    case 'add-linked-bundle': {
      const mainId = target.dataset.mainId;
      const mainQty = parseInt(document.getElementById('detail-qty-value')?.textContent) || 1;
      
      let addedAny = false;
      if (Store.addToCart(mainId, mainQty)) {
        addedAny = true;
      }
      
      document.querySelectorAll('.linked-product-check:checked').forEach(cb => {
        if (Store.addToCart(cb.value, 1)) {
          addedAny = true;
        }
      });
      
      if (addedAny) {
        showToast(t('product.added'), 'success');
        openCartSidebar();
      }
      break;
    }

    // Top Banner
    case 'close-banner': {
      const banner = document.getElementById('top-banner');
      if (banner) {
        banner.style.display = 'none';
      }
      try {
        sessionStorage.setItem('lr_banner_closed', 'true');
      } catch (e) {}
      break;
    }
    case 'copy-welcome-coupon': {
      const code = target.dataset.code;
      navigator.clipboard.writeText(code).then(() => {
        showToast(getLang() === 'ar' ? 'تم نسخ الكود!' : 'Coupon copied!', 'success');
        const originalHTML = target.innerHTML;
        target.innerHTML = getLang() === 'ar' ? '<i class="ph ph-check"></i> تم النسخ' : '<i class="ph ph-check"></i> Copied';
        target.style.background = 'var(--success)';
        target.style.color = '#fff';
        setTimeout(() => {
          target.innerHTML = originalHTML;
          target.style.background = '';
          target.style.color = '';
        }, 2000);
      });
      break;
    }

    // Navigation
    case 'go-product':
      e.preventDefault();
      navigateTo(`#/product/${productId}`);
      break;

    // Cart
    case 'buy-now':
      e.preventDefault();
      e.stopPropagation();
      if (Store.addToCart(productId)) {
        window.location.hash = '/checkout';
      }
      break;

    case 'add-to-cart':
      e.preventDefault();
      e.stopPropagation();
      if (Store.addToCart(productId)) {
        showToast(t('product.added'), 'success');
      }
      break;

    case 'toggle-cart':
      const sidebar = document.getElementById('cart-sidebar');
      if (sidebar?.classList.contains('open')) {
        closeCartSidebar();
      } else {
        openCartSidebar();
      }
      break;

    case 'close-cart':
      closeCartSidebar();
      break;

    case 'cart-qty-increase': {
      const cartId = target.dataset.cartItemId || productId;
      const item = Store.getCart().find(i => i.cartItemId === cartId || i.productId === cartId);
      if (item) Store.updateCartQuantity(cartId, item.quantity + 1);
      break;
    }

    case 'cart-qty-decrease': {
      const cartId = target.dataset.cartItemId || productId;
      const item = Store.getCart().find(i => i.cartItemId === cartId || i.productId === cartId);
      if (item) Store.updateCartQuantity(cartId, item.quantity - 1);
      break;
    }

    case 'cart-remove': {
      const cartId = target.dataset.cartItemId || productId;
      Store.removeFromCart(cartId);
      break;
    }

    case 'go-checkout':
      closeCartSidebar();
      navigateTo('#/checkout');
      break;

    // Product detail
    case 'detail-qty-increase': {
      const el = document.getElementById('detail-qty-value');
      if (el) {
        let val = parseInt(el.textContent) || 1;
        el.textContent = val + 1;
      }
      break;
    }

    case 'detail-qty-decrease': {
      const el = document.getElementById('detail-qty-value');
      if (el) {
        let val = parseInt(el.textContent) || 1;
        if (val > 1) el.textContent = val - 1;
      }
      break;
    }

    case 'select-color': {
      const container = target.closest('#product-colors-container');
      container.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('selected'));
      target.classList.add('selected');
      const colorName = getLang() === 'ar' ? target.dataset.colorAr : target.dataset.colorEn;
      document.getElementById('selected-color-name').textContent = colorName;
      
      const imageUrl = target.dataset.image;
      if (imageUrl && imageUrl !== 'undefined') {
        document.getElementById('detail-main-image-fg').src = imageUrl;
        document.getElementById('detail-main-image-blur').style.backgroundImage = `url('${imageUrl}')`;
      }
      document.getElementById('variant-error').style.display = 'none';
      break;
    }
    
    case 'select-size': {
      const container = target.closest('#product-sizes-container');
      container.querySelectorAll('.size-swatch').forEach(btn => btn.classList.remove('selected'));
      target.classList.add('selected');
      document.getElementById('selected-size-name').textContent = target.dataset.size;
      document.getElementById('variant-error').style.display = 'none';
      break;
    }

    case 'detail-buy-now': {
      const product = Store.getProduct(productId);
      if (!product) break;
      
      const colorSwatches = document.getElementById('product-colors-container');
      const sizeSwatches = document.getElementById('product-sizes-container');
      
      let selectedColor = null;
      let selectedSize = null;
      
      if (colorSwatches) {
        const selectedBtn = colorSwatches.querySelector('.color-swatch.selected');
        if (!selectedBtn) {
          document.getElementById('variant-error').style.display = 'block';
          return;
        }
        selectedColor = getLang() === 'ar' ? selectedBtn.dataset.colorAr : selectedBtn.dataset.colorEn;
      }
      
      if (sizeSwatches) {
        const selectedBtn = sizeSwatches.querySelector('.size-swatch.selected');
        if (!selectedBtn) {
          document.getElementById('variant-error').style.display = 'block';
          return;
        }
        selectedSize = selectedBtn.dataset.size;
      }

      const qty = parseInt(document.getElementById('detail-qty-value')?.textContent) || 1;
      
      let addedAny = false;
      if (Store.addToCart(productId, qty, { color: selectedColor, size: selectedSize })) {
        addedAny = true;
      }

      const linkedCheckboxes = document.querySelectorAll('.linked-product-check:checked');
      linkedCheckboxes.forEach(cb => {
        if (Store.addToCart(cb.value, 1)) {
          addedAny = true;
        }
      });

      if (addedAny) {
        document.getElementById('modal-overlay')?.classList.remove('open');
        window.location.hash = '/checkout';
      }
      break;
    }

    case 'detail-add-to-cart': {
      const product = Store.getProduct(productId);
      if (!product) break;
      
      const colorSwatches = document.getElementById('product-colors-container');
      const sizeSwatches = document.getElementById('product-sizes-container');
      
      let selectedColor = null;
      let selectedSize = null;
      
      if (colorSwatches) {
        const selectedBtn = colorSwatches.querySelector('.color-swatch.selected');
        if (!selectedBtn) {
          document.getElementById('variant-error').style.display = 'block';
          return;
        }
        selectedColor = getLang() === 'ar' ? selectedBtn.dataset.colorAr : selectedBtn.dataset.colorEn;
      }
      
      if (sizeSwatches) {
        const selectedBtn = sizeSwatches.querySelector('.size-swatch.selected');
        if (!selectedBtn) {
          document.getElementById('variant-error').style.display = 'block';
          return;
        }
        selectedSize = selectedBtn.dataset.size;
      }

      const qty = parseInt(document.getElementById('detail-qty-value')?.textContent) || 1;
      if (Store.addToCart(productId, qty, { color: selectedColor, size: selectedSize })) {
        showToast(t('product.added'), 'success');
      }
      break;
    }

    // Review
    case 'review-star': {
      const rating = parseInt(target.dataset.rating);
      const container = document.getElementById('review-stars-input');
      const hiddenInput = document.getElementById('review-rating-value');
      if (container && hiddenInput) {
        hiddenInput.value = rating;
        container.querySelectorAll('.star').forEach((star, i) => {
          star.classList.toggle('filled', i < rating);
        });
      }
      break;
    }

    case 'submit-review': {
      const name = document.getElementById('review-name')?.value?.trim();
      const rating = parseInt(document.getElementById('review-rating-value')?.value) || 0;
      const comment = document.getElementById('review-comment')?.value?.trim();

      if (!name) { showToast(t('review.nameRequired'), 'error'); return; }
      if (rating === 0) { showToast(t('review.ratingRequired'), 'error'); return; }
      if (!comment) { showToast(t('review.commentRequired'), 'error'); return; }

      Store.addReview({
        productId,
        customerName: name,
        rating,
        comment
      });

      showToast(t('review.thankYou'), 'success');

      // Clear form
      document.getElementById('review-name').value = '';
      document.getElementById('review-comment').value = '';
      document.getElementById('review-rating-value').value = '0';
      document.getElementById('review-stars-input')?.querySelectorAll('.star').forEach(s => s.classList.remove('filled'));
      break;
    }

    // Filters
    case 'filter-category':
      productsState.categoryId = categoryId || null;
      // Update active pill
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      target.classList.add('active');
      applyProductsFilters();
      break;

    // Theme/Lang
    case 'toggle-theme':
      toggleTheme();
      break;

    case 'toggle-lang':
      setLang(getLang() === 'ar' ? 'en' : 'ar');
      break;

    // Search
    case 'open-search':
      openSearchOverlay();
      break;

    case 'close-search-overlay':
      if (e.target.id === 'search-overlay') closeSearchOverlay();
      break;

    case 'search-result-click':
      closeSearchOverlay();
      break;

    // Mobile Nav
    case 'toggle-mobile-nav':
      toggleMobileNav();
      break;

    // Checkout
    case 'place-order':
      handlePlaceOrder();
      break;

    // Track
    case 'track-order':
      handleTrackOrder();
      break;

    // Coupon
    case 'apply-coupon': {
      const code = document.getElementById('checkout-coupon')?.value?.trim().toUpperCase();
      if (!code) return;
      const val = Store.validateCoupon(code, Store.getCartTotal().subtotal);
      if (val.valid) {
        currentCouponCode = code;
        showToast(t('checkout.couponApplied'), 'success');
        updateCheckoutSummary();
      } else {
        currentCouponCode = '';
        currentDiscountAmount = 0;
        showToast(val.message || t('checkout.invalidCoupon'), 'error');
        updateCheckoutSummary();
      }
      break;
    }

    // Checkout Quantities
    case 'checkout-qty-increase': {
      const cartId = target.dataset.cartItemId || productId;
      const item = Store.getCart().find(i => i.cartItemId === cartId || i.productId === cartId);
      if (item) Store.updateCartQuantity(cartId, item.quantity + 1);
      break;
    }

    case 'checkout-qty-decrease': {
      const cartId = target.dataset.cartItemId || productId;
      const item = Store.getCart().find(i => i.cartItemId === cartId || i.productId === cartId);
      if (item && item.quantity > 1) {
        Store.updateCartQuantity(cartId, item.quantity - 1);
      } else if (item && item.quantity <= 1) {
        const confirmMsg = getLang() === 'ar' ? 'هل تريد إزالة هذا المنتج من الطلب؟' : 'Remove this item from order?';
        if (confirm(confirmMsg)) {
          Store.removeFromCart(cartId);
        }
      }
      break;
    }

    // Auth
    case 'google-login':
      target.disabled = true;
      target.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Loading...';
      Store.loginWithGoogle().then(res => {
        if (res.success) {
          showToast(t('auth.login'), 'success');
          navigateTo('#/profile');
        } else {
          target.disabled = false;
          target.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg> Sign in with Google';
          showToast(res.message, 'error');
        }
      });
      break;

    case 'logout':
      Store.logoutCustomer();
      showToast(t('auth.logout'), 'success');
      navigateTo('#/login');
      break;

    // Modal
    case 'close-modal':
      if (e.target.id === 'modal-overlay' || e.target.closest('[data-action="close-modal"]')) {
        closeModal();
      }
      break;
  }
});

// Form Submissions
document.addEventListener('submit', (e) => {
  if (e.target.id === 'login-form') {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    const res = Store.loginCustomer(email, password);
    if (res.success) {
      showToast(t('auth.loginSuccess'), 'success');
      navigateTo('#/profile');
    } else {
      showToast(t('auth.invalidCredentials'), 'error');
    }
  }

  if (e.target.id === 'register-form') {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    
    const res = Store.registerCustomer({ name, phone, email, password });
    if (res.success) {
      showToast(t('auth.registerSuccess'), 'success');
      navigateTo('#/profile');
    } else if (res.message === 'email_exists') {
      showToast(t('auth.emailExists'), 'error');
    } else {
      showToast('Error', 'error');
    }
  }
});

// Search input event
document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') {
    handleSearch(e.target.value);
  }
  if (e.target.id === 'products-search-input') {
    productsState.search = e.target.value;
    applyProductsFilters();
  }
});

// Sort change event
document.addEventListener('change', (e) => {
  if (e.target.id === 'products-sort-select') {
    productsState.sort = e.target.value;
    applyProductsFilters();
  }
  if (e.target.id === 'checkout-city') {
    updateCheckoutShipping(e.target.value);
  }
});

function updateCheckoutShipping(city) {
  const shippingDisplay = document.getElementById('checkout-shipping-display');
  const totalDisplay = document.getElementById('checkout-total-display');

  if (!city) {
    if (shippingDisplay) shippingDisplay.textContent = '—';
    const cartTotal = Store.getCartTotal('');
    let finalTotal = cartTotal.subtotal;
    if (currentCouponCode) {
      const val = Store.validateCoupon(currentCouponCode, cartTotal.subtotal);
      if (val.valid) {
        finalTotal = Math.max(0, cartTotal.subtotal - val.discountAmount);
      }
    }
    if (totalDisplay) totalDisplay.textContent = formatPrice(finalTotal);
    return;
  }

  const cartTotal = Store.getCartTotal(city);
  let finalTotal = cartTotal.total;
  if (currentCouponCode) {
    const val = Store.validateCoupon(currentCouponCode, cartTotal.subtotal);
    if (val.valid) {
      finalTotal = Math.max(0, cartTotal.total - val.discountAmount);
    }
  }

  if (shippingDisplay) {
    const settings = Store.getSettings();
    shippingDisplay.innerHTML = (cartTotal.shipping === 0 && settings.freeShippingActive)
      ? `<span class="free-shipping">${t('cart.freeShipping')} ✓</span>`
      : formatPrice(cartTotal.shipping);
  }
  if (totalDisplay) {
    totalDisplay.textContent = formatPrice(finalTotal);
  }
}

// Keyboard events
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSearchOverlay();
    closeCartSidebar();
    closeModal();
    closeMobileNav();
  }
  if (e.key === 'Enter' && e.target.id === 'track-input') {
    handleTrackOrder();
  }
});

// ============================================
// Order Placement
// ============================================
function handlePlaceOrder() {
  const name = document.getElementById('checkout-name')?.value?.trim();
  const phone = document.getElementById('checkout-phone')?.value?.trim();
  const email = document.getElementById('checkout-email')?.value?.trim();
  const city = document.getElementById('checkout-city')?.value?.trim();
  const address = document.getElementById('checkout-address')?.value?.trim();
  const notes = document.getElementById('checkout-notes')?.value?.trim();

  // Validation
  if (!name) {
    showToast(`${t('checkout.name')}: ${t('checkout.required')}`, 'error');
    document.getElementById('checkout-name')?.focus();
    return;
  }
  const cleanPhone = phone ? phone.replace(/[\s\-\(\)]/g, '') : '';
  const phoneRegex = /^(?:\+20|0020)?01[0125]\d{8}$/;
  if (!phoneRegex.test(cleanPhone)) {
    showToast(t('checkout.invalidPhone'), 'error');
    document.getElementById('checkout-phone')?.focus();
    return;
  }
  if (!address) {
    showToast(`${t('checkout.address')}: ${t('checkout.required')}`, 'error');
    document.getElementById('checkout-address')?.focus();
    return;
  }

  const order = Store.createOrder({
    customerName: name,
    customerPhone: phone,
    customerEmail: email,
    city: city,
    customerAddress: address,
    notes: notes,
    couponCode: currentCouponCode,
    discountAmount: currentDiscountAmount
  });

  if (order) {
    // Send email via emailjs if configured
    const settings = Store.getSettings();
    if (window.emailjs && settings.emailjs_service_id && settings.emailjs_template_id && settings.emailjs_public_key) {
      const emailParams = {
        // معلومات الطلب
        order_number:   order.orderNumber,

        // بيانات العميل - بنفس أسماء المتغيرات في القالب
        customer_name:    order.customerName,
        customer_region:  order.city,
        customer_phone1:  order.customerPhone,
        customer_phone2:  order.customerEmail || '—',
        customer_address: order.customerAddress,

        // تفاصيل المنتجات
        order_details: order.items.map(item =>
          `${item.quantity} × ${item.name_ar || item.name_en}  —  ${Store.formatPrice(item.discountedPrice * item.quantity, 'ar')}`
        ).join('\n'),

        // ملخص الحساب
        subtotal:      Store.formatPrice(order.subtotal, 'ar'),
        shipping_fee:  (order.shipping === 0 && Store.getSettings().freeShippingActive) ? 'مجاني 🎁' : Store.formatPrice(order.shipping, 'ar'),
        delivery_time: '3 - 5 أيام عمل',
        total_price:   Store.formatPrice(order.total, 'ar'),
      };
      
      emailjs.send(
        settings.emailjs_service_id, 
        settings.emailjs_template_id, 
        emailParams, 
        settings.emailjs_public_key
      ).then(
        () => console.log('Order email sent successfully'),
        (err) => {
          console.error('Failed to send order email:', err);
          alert("خطأ في إرسال الإيميل (EmailJS): " + JSON.stringify(err));
        }
      );
    }
    
    // Clear local coupon state
    currentCouponCode = '';
    currentDiscountAmount = 0;
    
    navigateTo(`#/order-success/${order.orderNumber}`);
  } else {
    showToast(t('checkout.emptyCart'), 'error');
  }
}

// ============================================
// Order Tracking
// ============================================
function handleTrackOrder() {
  const input = document.getElementById('track-input');
  const orderNumber = input?.value?.trim();
  if (orderNumber) {
    navigateTo(`#/track/${orderNumber}`);
  }
}

// ============================================
// Store Event Listeners
// ============================================
Store.on('cart-updated', () => {
  renderCartSidebar();
  // Update badge in navbar
  const cartTotal = Store.getCartTotal();
  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.textContent = cartTotal.itemCount;
    if (cartTotal.itemCount === 0) badge.remove();
  } else if (cartTotal.itemCount > 0) {
    const cartBtn = document.getElementById('btn-cart');
    if (cartBtn) {
      const newBadge = document.createElement('span');
      newBadge.className = 'cart-badge';
      newBadge.id = 'cart-badge';
      newBadge.textContent = cartTotal.itemCount;
      cartBtn.appendChild(newBadge);
    }
  }

  // Update checkout page summary if currently on checkout page
  const { page } = parseRoute(getCurrentRoute());
  if (page === 'checkout') {
    updateCheckoutSummary();
  }
});

Store.on('settings-updated', (settings) => {
  // Re-apply accent color
  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }
  if (settings.textColor) {
    document.documentElement.style.setProperty('--text-primary', settings.textColor);
  }
  // applyDynamicStyles removed — styles are managed via CSS custom properties above
  renderNavbar();
  renderFooter();
  renderCartSidebar();
  handleRoute();
});

Store.on('auth-changed', () => {
  renderNavbar();
  // Auto-redirect if on checkout and auth state changes? Not necessary.
});

Store.on('data-synced', () => {
  renderNavbar();
  renderFooter();
  renderCartSidebar();
  handleRoute(); // Re-render the current page with new data
});

// Hash change
window.addEventListener('hashchange', () => {
  productsState = { categoryId: null, search: '', sort: 'newest' };
  const { page, params } = parseRoute(getCurrentRoute());
  if (page === 'category') {
    productsState.categoryId = params.id;
  }
  handleRoute();
});

// ============================================
// Welcome Popup logic
// ============================================
// ============================================
// Welcome Banner logic
// ============================================
// (Logic handled in renderNavbar and event listeners)

// ============================================
// Initialization
// ============================================
function loadGoogleFont(fontFamily) {
  if (!fontFamily) return;
  const id = 'font-' + fontFamily.replace(/\s+/g, '-').toLowerCase();
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
    document.head.appendChild(link);
  }
}

function applyFonts(settings) {
  if (settings.fontHeading) {
    loadGoogleFont(settings.fontHeading);
    document.documentElement.style.setProperty('--font-heading', `'${settings.fontHeading}', serif`);
  }
  if (settings.fontBody) {
    loadGoogleFont(settings.fontBody);
    document.documentElement.style.setProperty('--font-body', `'${settings.fontBody}', sans-serif`);
  }
  if (settings.fontArabicHeading) {
    loadGoogleFont(settings.fontArabicHeading);
    document.documentElement.style.setProperty('--font-ar-heading', `'${settings.fontArabicHeading}', sans-serif`);
  }
  if (settings.fontArabicBody) {
    loadGoogleFont(settings.fontArabicBody);
    document.documentElement.style.setProperty('--font-ar-body', `'${settings.fontArabicBody}', sans-serif`);
  }
}

function init() {
  // Seed data
  Store.seedData();

  // Force clean light theme
  setTheme('light');

  // Apply saved language
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (lang === 'ar') {
    document.body.style.fontFamily = "var(--font-ar-body)";
  } else {
    document.body.style.fontFamily = "var(--font-body)";
  }

  const settings = Store.getSettings();
  applyFonts(settings);

  // Render shell
  renderNavbar();
  renderFooter();
  renderCartSidebar();

  // Initial route
  const { page, params } = parseRoute(getCurrentRoute());
  if (page === 'category') {
    productsState.categoryId = params.id;
  }
  handleRoute();

  console.log('✨ Medix Storefront initialized!');
}

// applyDynamicStyles removed as per user request for fixed professional palette

// Listen for updates from Admin Panel (other tabs)
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('lr_')) {
    // Re-fetch data and re-render
    const settings = Store.getSettings();
    applyFonts(settings);
    renderNavbar();
    renderFooter();
    renderCartSidebar();
    handleRoute();
  }
});

// Listen for updates from Firebase sync locally
window.addEventListener('firebase-data-synced', (e) => {
  const key = e.detail.key;
  if (key && key.startsWith('lr_')) {
    const settings = Store.getSettings();
    applyFonts(settings);
    renderNavbar();
    renderFooter();
    renderCartSidebar();
    handleRoute();
  }
});

// ===== SMART LOADING: Wait for Firebase before showing content =====
function revealApp() {
  const loader = document.getElementById('app-loader');
  const app = document.getElementById('app');
  const navbar = document.getElementById('navbar-container');
  const footer = document.getElementById('footer-container');
  const announcement = document.getElementById('announcement-bar-container');
  
  if (app) app.style.opacity = '1';
  if (navbar) navbar.style.opacity = '1';
  if (footer) footer.style.opacity = '1';
  if (announcement) announcement.style.opacity = '1';
  
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 400);
  }
}

let appRevealed = false;

function revealOnce() {
  if (appRevealed) return;
  appRevealed = true;
  // Re-render with fresh data then reveal
  const settings = Store.getSettings();
  applyFonts(settings);
  renderNavbar();
  renderFooter();
  renderCartSidebar();
  handleRoute();
  revealApp();
}

if (window.FirebaseDB && window.FirebaseDB.db) {
  init();
  // Always wait for Firebase to ensure cloud data is priority
  window.addEventListener('firebase-initial-sync-done', revealOnce);
  // Safety timeout: max 5 seconds, after which it reveals whatever is there
  setTimeout(revealOnce, 5000);
} else {
  // No Firebase at all
  init();
  revealApp();
}
