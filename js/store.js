// ============================================
// Medix Store - State Management
// ============================================
// Uses localStorage for persistence
// Will be migrated to Firebase Firestore later
// ============================================

const STORAGE_KEYS = {
  products: 'lr_products_v2',
  categories: 'lr_categories_v2',
  cart: 'lr_cart_v2',
  orders: 'lr_orders_v2',
  reviews: 'lr_reviews_v2',
  settings: 'lr_settings_v2',
  coupons: 'lr_coupons_v2',
  customers: 'lr_customers_v2',
  currentCustomer: 'lr_current_customer_v2',
  seeded: 'lr_seeded_v2',
  wishlist: 'lr_wishlist_v2',
  recent: 'lr_recent_v2'
};

// ===== EVENT SYSTEM =====
const listeners = {};

function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
}

function off(event, callback) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(cb => cb !== callback);
}

function emit(event, data) {
  if (!listeners[event]) return;
  listeners[event].forEach(cb => {
    try { cb(data); } catch (e) { console.error('Event handler error:', e); }
  });
}

// ===== HELPERS =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Detect if localStorage is available (blocked on file:// in some browsers)
const _memoryStore = {};
let _useLocalStorage = true;
try {
  const testKey = '__lr_test__';
  localStorage.setItem(testKey, '1');
  localStorage.removeItem(testKey);
} catch (e) {
  _useLocalStorage = false;
  console.warn('⚠️ localStorage unavailable — using in-memory storage. Data will NOT persist after refresh.');
}

function getFromStorage(key) {
  try {
    if (_useLocalStorage) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
    return _memoryStore[key] !== undefined ? JSON.parse(JSON.stringify(_memoryStore[key])) : null;
  } catch {
    return null;
  }
}

let isFirebaseSyncing = false;

function saveToStorage(key, data) {
  try {
    if (_useLocalStorage) {
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      _memoryStore[key] = JSON.parse(JSON.stringify(data));
    }
  } catch (e) {
    // Last resort fallback to memory
    _memoryStore[key] = JSON.parse(JSON.stringify(data));
  }

  // Background Firebase Sync
  if (window.FirebaseDB && window.FirebaseDB.db && !isFirebaseSyncing) {
    if (key !== STORAGE_KEYS.currentCustomer && key !== STORAGE_KEYS.cart) {
      try {
        const { doc, setDoc } = window.FirebaseDB;
        setDoc(doc(window.FirebaseDB.db, "store_data", key), { data: data })
          .then(() => {
             console.log("☁️ Saved to Cloud: " + key);
          })
          .catch(e => {
             console.error("Firebase write error for " + key + ":", e);
             alert("⚠️ فشل الحفظ على السحابة! راجع اتصال الإنترنت. خطأ: " + e.message);
          });
      } catch (e) {}
    }
  }

  saveHistoryState();
}

// ===== UNDO / REDO HISTORY =====
let historyStack = [];
let historyIndex = -1;
let isUndoRedoAction = false;

function saveHistoryState() {
  if (isUndoRedoAction || !_useLocalStorage) return;
  const state = {};
  for(let i=0; i<localStorage.length; i++) {
    const key = localStorage.key(i);
    if(key.startsWith('lr_')) {
      state[key] = localStorage.getItem(key);
    }
  }
  
  // Don't save if state is identical to last state
  if (historyIndex >= 0) {
    const lastState = historyStack[historyIndex];
    let identical = true;
    for(const key in state) {
      if(state[key] !== lastState[key]) identical = false;
    }
    if (identical) return;
  }

  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(state);
  if (historyStack.length > 50) {
    historyStack.shift();
  } else {
    historyIndex++;
  }
  emit('history-changed', { canUndo: historyIndex > 0, canRedo: historyIndex < historyStack.length - 1 });
}

function storeUndo() {
  if (historyIndex > 0) {
    isUndoRedoAction = true;
    historyIndex--;
    const state = historyStack[historyIndex];
    Object.keys(state).forEach(key => saveToStorage(key, state[key]));
    isUndoRedoAction = false;
    emit('history-changed', { canUndo: historyIndex > 0, canRedo: historyIndex < historyStack.length - 1 });
    // Trigger storage event so admin/app redraws
    window.dispatchEvent(new StorageEvent('storage', { key: 'lr_history_undo' }));
    return true;
  }
  return false;
}

function storeRedo() {
  if (historyIndex < historyStack.length - 1) {
    isUndoRedoAction = true;
    historyIndex++;
    const state = historyStack[historyIndex];
    Object.keys(state).forEach(key => saveToStorage(key, state[key]));
    isUndoRedoAction = false;
    emit('history-changed', { canUndo: historyIndex > 0, canRedo: historyIndex < historyStack.length - 1 });
    window.dispatchEvent(new StorageEvent('storage', { key: 'lr_history_redo' }));
    return true;
  }
  return false;
}

// ===== SETTINGS =====
const DEFAULT_SETTINGS = {
  storeName: 'Medix',
  subtitle_ar: 'تسوق بأناقة وراحة',
  subtitle_en: 'Shop with Elegance & Comfort',
  fontHeading: 'Playfair Display',
  fontBody: 'Inter',
  fontArabicHeading: 'Tajawal',
  fontArabicBody: 'Cairo',
  accentColor: '#000000',
  welcomePopupActive: false,
  welcomePopupTitle_ar: 'أهلاً بك في ميدكس! ✨',
  welcomePopupTitle_en: 'Welcome to Medix! ✨',
  welcomePopupSubtitle_ar: 'استخدم كود الخصم WELCOME10 للحصول على خصم 10% على طلبك الأول!',
  welcomePopupSubtitle_en: 'Use coupon code WELCOME10 to get 10% off on your first order!',
  welcomePopupCoupon: 'WELCOME10',
  welcomePopupImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop',
  contactPhone: '+20 123 456 7890',
  contactWhatsapp: '+201234567890',
  contactEmail: 'info@medix.com',
  shippingCost: 100,
  freeShippingActive: true,
  freeShippingThreshold: 500,
  shippingRates: {
    'القاهرة': 100,
    'الجيزة': 100,
    'الإسكندرية': 100,
    'القليوبية': 100,
    'الغربية': 100,
    'المنوفية': 100,
    'الدقهلية': 100,
    'الشرقية': 100,
    'البحيرة': 100,
    'دمياط': 100,
    'كفر الشيخ': 100,
    'بورسعيد': 100,
    'السويس': 100,
    'الإسماعيلية': 100,
    'الفيوم': 100,
    'بني سويف': 100,
    'المنيا': 100,
    'أسيوط': 100,
    'سوهاج': 100,
    'قنا': 100,
    'الأقصر': 100,
    'أسوان': 100,
    'البحر الأحمر': 100,
    'الوادي الجديد': 100,
    'مطروح': 185,
    'شمال سيناء': 100,
    'جنوب سيناء': 175
  },
  aboutText_ar: 'ميدكس - متجرك المفضل للتسوق أونلاين. نقدم لك أفضل المنتجات بأعلى جودة وأفضل الأسعار مع توصيل سريع لجميع أنحاء مصر.',
  aboutText_en: 'Medix - Your favorite online shopping destination. We offer the best products with highest quality and best prices with fast delivery across Egypt.',
  address_ar: 'القاهرة، مصر',
  address_en: 'Cairo, Egypt',
  currency_ar: 'ج.م',
  currency_en: 'EGP',
  emailjs_service_id: '',
  emailjs_template_id: '',
  emailjs_public_key: '',
  sliderInterval: 4, // in seconds
  heroSlider: [],
  navBgColor: '#ffffff',
  navTextColor: '#000000',
  btnBgColor: '#000000',
  btnTextColor: '#ffffff',
  footerBgColor: '#f8f8f8',
  footerTextColor: '#333333',
  headingColor: '#000000',
  bodyBgColor: '#ffffff',
  textColor: '#111111',
  customBanners: []
};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(getFromStorage(STORAGE_KEYS.settings) || {}) };
}

function saveSettings(settings) {
  const current = getSettings();
  const updated = { ...current, ...settings };
  saveToStorage(STORAGE_KEYS.settings, updated);
  emit('settings-updated', updated);
  return updated;
}

// ===== PRODUCTS =====
function getProducts() {
  return (getFromStorage(STORAGE_KEYS.products) || []).filter(p => p);
}

function getActiveProducts() {
  return getProducts().filter(p => p.status === 'active');
}

function getProduct(id) {
  return getProducts().find(p => p.id === id) || null;
}

function saveProduct(product) {
  const products = getProducts();
  if (product.id) {
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = { ...products[index], ...product, updatedAt: new Date().toISOString() };
    } else {
      product.createdAt = product.createdAt || new Date().toISOString();
      product.updatedAt = new Date().toISOString();
      products.push(product);
    }
  } else {
    product.id = generateId();
    product.createdAt = new Date().toISOString();
    product.updatedAt = new Date().toISOString();
    product.ratingAvg = product.ratingAvg || 0;
    product.ratingCount = product.ratingCount || 0;
    product.status = product.status || 'active';
    product.linkedProducts = product.linkedProducts || [];
    products.push(product);
  }
  saveToStorage(STORAGE_KEYS.products, products);
  emit('products-updated', products);
  return product.id;
}

function deleteProduct(id) {
  const products = getProducts().filter(p => p.id !== id);
  saveToStorage(STORAGE_KEYS.products, products);
  emit('products-updated', products);
}

function getFeaturedProducts() {
  return getActiveProducts().filter(p => p.featured);
}

function getProductsByCategory(categoryId) {
  return getActiveProducts().filter(p => p.categoryId === categoryId);
}

function searchProducts(query, lang = 'ar') {
  if (!query || !query.trim()) return getActiveProducts();
  const q = query.toLowerCase().trim();
  return getActiveProducts().filter(p => {
    const name = lang === 'ar' ? (p.name_ar || '') : (p.name_en || '');
    const desc = lang === 'ar' ? (p.description_ar || '') : (p.description_en || '');
    const nameAlt = lang === 'ar' ? (p.name_en || '') : (p.name_ar || '');
    return name.toLowerCase().includes(q) ||
           desc.toLowerCase().includes(q) ||
           nameAlt.toLowerCase().includes(q);
  });
}

function getDiscountedProducts() {
  return getActiveProducts().filter(p => p.discountPercentage > 0);
}

function getProductPrice(product) {
  if (!product) return 0;
  if (product.salePrice !== undefined && product.salePrice > 0 && product.salePrice < product.price) {
    return product.salePrice;
  }
  if (product.discountPercentage > 0) {
    return Math.round(product.price * (1 - product.discountPercentage / 100));
  }
  return product.price;
}

// ===== CATEGORIES =====
function getCategories() {
  return (getFromStorage(STORAGE_KEYS.categories) || []).sort((a, b) => (a.order || 0) - (b.order || 0));
}

function getActiveCategories() {
  return getCategories().filter(c => c.status === 'active');
}

function getCategory(id) {
  return getCategories().find(c => c.id === id) || null;
}

function saveCategory(category) {
  const categories = getFromStorage(STORAGE_KEYS.categories) || [];
  if (category.id) {
    const index = categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...category };
    } else {
      categories.push(category);
    }
  } else {
    category.id = generateId();
    category.status = category.status || 'active';
    categories.push(category);
  }
  saveToStorage(STORAGE_KEYS.categories, categories);
  emit('categories-updated', categories);
  return category.id;
}

function deleteCategory(id) {
  const categories = (getFromStorage(STORAGE_KEYS.categories) || []).filter(c => c.id !== id);
  saveToStorage(STORAGE_KEYS.categories, categories);
  emit('categories-updated', categories);
}

function getCategoryProductCount(categoryId) {
  return getActiveProducts().filter(p => p.categoryId === categoryId).length;
}

// ===== CART =====
function getCart() {
  return getFromStorage(STORAGE_KEYS.cart) || [];
}

function addToCart(productId, quantity = 1, options = {}) {
  const cart = getCart();
  const product = getProduct(productId);
  if (!product || product.stock <= 0) return false;

  const { color = null, size = null } = options;
  const cartItemId = `${productId}_${color || 'none'}_${size || 'none'}`;

  const existing = cart.find(item => item.cartItemId === cartItemId || (item.productId === productId && item.color === color && item.size === size));
  if (existing) {
    const newQty = existing.quantity + quantity;
    existing.quantity = Math.min(newQty, product.stock);
    if (!existing.cartItemId) existing.cartItemId = cartItemId;
  } else {
    cart.push({ cartItemId, productId, quantity: Math.min(quantity, product.stock), color, size });
  }
  saveToStorage(STORAGE_KEYS.cart, cart);
  emit('cart-updated', cart);
  return true;
}

function removeFromCart(cartItemId) {
  const cart = getCart().filter(item => item.cartItemId !== cartItemId && item.productId !== cartItemId);
  saveToStorage(STORAGE_KEYS.cart, cart);
  emit('cart-updated', cart);
}

function updateCartQuantity(cartItemId, quantity) {
  if (quantity <= 0) {
    return removeFromCart(cartItemId);
  }
  const cart = getCart();
  const item = cart.find(i => i.cartItemId === cartItemId || i.productId === cartItemId);
  if (item) {
    const product = getProduct(item.productId);
    item.quantity = Math.min(quantity, product ? product.stock : quantity);
    saveToStorage(STORAGE_KEYS.cart, cart);
    emit('cart-updated', cart);
  }
}

function clearCart() {
  saveToStorage(STORAGE_KEYS.cart, []);
  emit('cart-updated', []);
}

function getShippingCost(city, subtotal) {
  const settings = getSettings();
  if (settings.freeShippingActive && subtotal >= settings.freeShippingThreshold) return 0;
  if (!city) return settings.shippingCost || 0;
  return settings.shippingRates && settings.shippingRates[city] !== undefined
    ? settings.shippingRates[city]
    : (settings.shippingCost || 0);
}

function getCartTotal(city = '') {
  const cart = getCart();
  const settings = getSettings();
  let subtotal = 0;
  let itemCount = 0;

  cart.forEach(item => {
    const product = getProduct(item.productId);
    if (product) {
      subtotal += getProductPrice(product) * item.quantity;
      itemCount += item.quantity;
    }
  });

  const shipping = subtotal > 0 ? getShippingCost(city, subtotal) : 0;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    itemCount
  };
}

function getCartWithProducts() {
  const cart = getCart();
  return cart.map(item => {
    const product = getProduct(item.productId);
    return {
      ...item,
      product,
      unitPrice: product ? getProductPrice(product) : 0,
      totalPrice: product ? getProductPrice(product) * item.quantity : 0
    };
  }).filter(item => item.product);
}

// ===== ORDERS =====
function getOrders() {
  return (getFromStorage(STORAGE_KEYS.orders) || []).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function getOrder(id) {
  return getOrders().find(o => o.id === id) || null;
}

function getOrderByNumber(orderNumber) {
  if (!orderNumber) return null;
  return getOrders().find(o => o.orderNumber.toUpperCase() === orderNumber.toUpperCase()) || null;
}

function createOrder(orderData) {
  const orders = getFromStorage(STORAGE_KEYS.orders) || [];
  const cart = getCartWithProducts();
  const cartTotal = getCartTotal(orderData.city);

  if (cart.length === 0) return null;

  const discountAmount = orderData.discountAmount || 0;
  const finalTotal = Math.max(0, cartTotal.total - discountAmount);
  
  const customerId = getCurrentCustomer()?.id || null;

  const order = {
    id: generateId(),
    customerId: customerId,
    orderNumber: 'LR-' + String(Math.floor(10000 + Math.random() * 90000)),
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    customerEmail: orderData.customerEmail || '',
    customerAddress: orderData.customerAddress,
    city: orderData.city || '',
    items: cart.map(item => ({
      productId: item.productId,
      name_ar: item.product.name_ar,
      name_en: item.product.name_en,
      price: item.product.price,
      discountedPrice: getProductPrice(item.product),
      quantity: item.quantity,
      image: item.product.images?.[0] || ''
    })),
    subtotal: cartTotal.subtotal,
    shipping: cartTotal.shipping,
    discountAmount: discountAmount,
    couponCode: orderData.couponCode || '',
    total: finalTotal,
    status: 'new',
    notes: orderData.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Update stock
  cart.forEach(item => {
    const product = getProduct(item.productId);
    if (product) {
      saveProduct({ ...product, stock: Math.max(0, product.stock - item.quantity) });
    }
  });

  orders.push(order);
  saveToStorage(STORAGE_KEYS.orders, orders);
  clearCart();
  emit('orders-updated', orders);
  return order;
}

function updateOrderStatus(id, status) {
  const orders = getFromStorage(STORAGE_KEYS.orders) || [];
  const order = orders.find(o => o.id === id);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.orders, orders);
    emit('orders-updated', orders);
  }
  return order;
}

function deleteOrder(id) {
  const orders = (getFromStorage(STORAGE_KEYS.orders) || []).filter(o => o.id !== id);
  saveToStorage(STORAGE_KEYS.orders, orders);
  emit('orders-updated', orders);
}

function getOrderStats() {
  const orders = getOrders();
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.createdAt.startsWith(today));
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => ['new', 'confirmed', 'preparing', 'shipping'].includes(o.status));

  return {
    totalOrders: orders.length,
    todayOrders: todayOrders.length,
    totalRevenue,
    pendingOrders: pendingOrders.length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length
  };
}

// ===== REVIEWS =====
function getReviews(productId) {
  const reviews = getFromStorage(STORAGE_KEYS.reviews) || [];
  return reviews.filter(r => r.productId === productId).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function getApprovedReviews(productId) {
  return getReviews(productId).filter(r => r.approved);
}

function getAllReviews() {
  return (getFromStorage(STORAGE_KEYS.reviews) || []).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function addReview(review) {
  const reviews = getFromStorage(STORAGE_KEYS.reviews) || [];
  review.id = generateId();
  review.approved = false;
  review.createdAt = new Date().toISOString();
  reviews.push(review);
  saveToStorage(STORAGE_KEYS.reviews, reviews);
  emit('reviews-updated', reviews);
  return review.id;
}

function approveReview(id) {
  const reviews = getFromStorage(STORAGE_KEYS.reviews) || [];
  const review = reviews.find(r => r.id === id);
  if (review) {
    review.approved = true;
    saveToStorage(STORAGE_KEYS.reviews, reviews);
    updateProductRating(review.productId);
    emit('reviews-updated', reviews);
  }
}

function deleteReview(id) {
  const reviews = getFromStorage(STORAGE_KEYS.reviews) || [];
  const review = reviews.find(r => r.id === id);
  const filtered = reviews.filter(r => r.id !== id);
  saveToStorage(STORAGE_KEYS.reviews, filtered);
  if (review) updateProductRating(review.productId);
  emit('reviews-updated', filtered);
}

function updateProductRating(productId) {
  const approved = getApprovedReviews(productId);
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (product) {
    if (approved.length > 0) {
      product.ratingAvg = Math.round((approved.reduce((sum, r) => sum + r.rating, 0) / approved.length) * 10) / 10;
      product.ratingCount = approved.length;
    } else {
      product.ratingAvg = 0;
      product.ratingCount = 0;
    }
    saveToStorage(STORAGE_KEYS.products, products);
    emit('products-updated', products);
  }
}

// ===== WISHLIST =====
function getWishlist() {
  return getFromStorage(STORAGE_KEYS.wishlist) || [];
}

function toggleWishlist(productId) {
  let wishlist = getWishlist();
  const index = wishlist.indexOf(productId);
  let added = false;
  if (index !== -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
    added = true;
  }
  saveToStorage(STORAGE_KEYS.wishlist, wishlist);
  emit('wishlist-updated', wishlist);
  return added;
}

function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

// ===== RECENTLY VIEWED =====
function getRecentlyViewed() {
  return getFromStorage(STORAGE_KEYS.recent) || [];
}

function addRecentlyViewed(productId) {
  let recent = getRecentlyViewed();
  // Remove if already exists to move to the front
  recent = recent.filter(id => id !== productId);
  recent.unshift(productId);
  // Keep last 10
  if (recent.length > 10) {
    recent = recent.slice(0, 10);
  }
  saveToStorage(STORAGE_KEYS.recent, recent);
  emit('recent-updated', recent);
}

// ===== ADMIN AUTH (Firebase Auth Integrated) =====
function adminLogin(email, password) {
  if (!window.FirebaseAuth) return Promise.resolve(false);
  
  return window.FirebaseAuth.signInWithEmailAndPassword(window.FirebaseAuth.auth, email, password)
    .then((userCredential) => {
      // Set a local flag so the synchronous UI knows to show the dashboard
      try { localStorage.setItem('lr_admin', 'true'); } catch(e) { _memoryStore['_admin'] = true; }
      return true;
    })
    .catch((error) => {
      console.error("Admin Login failed:", error.message);
      let errorMsg = error.message;
      if (error.code === 'auth/invalid-email') errorMsg = "صيغة الإيميل خاطئة.";
      else if (error.code === 'auth/user-not-found') errorMsg = "هذا الإيميل غير مسجل كأدمن.";
      else if (error.code === 'auth/wrong-password') errorMsg = "كلمة المرور خاطئة.";
      return errorMsg;
    });
}

function isAdminLoggedIn() {
  try { return localStorage.getItem('lr_admin') === 'true'; } catch(e) { return _memoryStore['_admin'] === true; }
}

function adminLogout() {
  if (window.FirebaseAuth) {
    window.FirebaseAuth.signOut(window.FirebaseAuth.auth).catch(e => console.error("Logout error", e));
  }
  try { localStorage.removeItem('lr_admin'); } catch(e) {}
  _memoryStore['_admin'] = false;
}

function changeAdminPassword(oldPassword, newPassword) {
  // Passwords are now managed in the Firebase Console
  alert("عذراً، يجب تغيير كلمة المرور من داخل لوحة تحكم Firebase (Authentication) لضمان أقصى درجات الأمان.");
  return false;
}

// ===== CUSTOMERS & AUTH =====
function getCustomers() {
  return getFromStorage(STORAGE_KEYS.customers) || [];
}

function getCurrentCustomer() {
  return getFromStorage(STORAGE_KEYS.currentCustomer) || null;
}

// ------------------------------------
// Google Firebase Auth
// ------------------------------------
async function loginWithGoogle() {
  if (!window.FirebaseAuth) {
    return { success: false, message: 'firebase_not_loaded' };
  }
  
  if (window.location.protocol === 'file:') {
    alert("تنبيه: تسجيل الدخول بواسطة جوجل (Google Sign-In) لا يعمل عند فتح الملف محلياً من الجهاز (file://) بسبب حماية جوجل. يرجى تجربة هذه الميزة بعد رفع الموقع على السحابة (GitHub).");
    return { success: false, message: 'unsupported_environment' };
  }
  
  try {
    const result = await window.FirebaseAuth.signInWithPopup(window.FirebaseAuth.auth, window.FirebaseAuth.provider);
    const user = result.user;
    
    // Check if customer exists in our storage, otherwise create
    let customers = getCustomers();
    let customer = customers.find(c => c.email === user.email);
    
    if (!customer) {
      customer = {
        id: user.uid,
        name: user.displayName || 'Google User',
        email: user.email,
        phone: user.phoneNumber || '',
        password: '', // Google users don't have a local password
        createdAt: new Date().toISOString()
      };
      customers.push(customer);
      saveToStorage(STORAGE_KEYS.customers, customers);
    }
    
    const sessionData = { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
    saveToStorage(STORAGE_KEYS.currentCustomer, sessionData);
    emit('auth-changed', sessionData);
    
    return { success: true, customer };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return { success: false, message: error.message };
  }
}

// Automatically sync with Firebase Auth state and Firestore
document.addEventListener('DOMContentLoaded', () => {
  // Listen to changes in localStorage from other tabs for instant sync
  window.addEventListener('storage', (e) => {
    if (Object.values(STORAGE_KEYS).includes(e.key)) {
      emit('data-synced', null);
    }
  });

  if (window.FirebaseAuth) {
    window.FirebaseAuth.onAuthStateChanged(window.FirebaseAuth.auth, (user) => {
      if (!user && getCurrentCustomer()) {
        // If logged out from Firebase but local shows logged in, sync it (if it's a Google user)
        // For simplicity, we won't auto logout unless explicitly clicked
      }
    });
  }
});
// ------------------------------------

function registerCustomer(customerData) {
  const customers = getCustomers();

  // Check if email already exists
  if (customers.find(c => c.email === customerData.email)) {
    return { success: false, message: 'email_exists' };
  }

  const newCustomer = {
    id: generateId(),
    name: customerData.name,
    email: customerData.email,
    phone: customerData.phone,
    password: customerData.password,
    createdAt: new Date().toISOString()
  };

  customers.push(newCustomer);
  saveToStorage(STORAGE_KEYS.customers, customers);

  // Auto login
  const sessionData = { id: newCustomer.id, name: newCustomer.name, email: newCustomer.email, phone: newCustomer.phone };
  saveToStorage(STORAGE_KEYS.currentCustomer, sessionData);
  emit('auth-changed', sessionData);

  return { success: true, customer: newCustomer };
}

function loginCustomer(email, password) {
  const customers = getCustomers();
  const customer = customers.find(c => c.email === email && c.password === password);

  if (customer) {
    const sessionData = { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
    saveToStorage(STORAGE_KEYS.currentCustomer, sessionData);
    emit('auth-changed', sessionData);
    return { success: true, customer };
  }
  return { success: false, message: 'invalid_credentials' };
}

function logoutCustomer() {
  if (_useLocalStorage) {
    try { localStorage.removeItem(STORAGE_KEYS.currentCustomer); } catch(e) {}
  }
  delete _memoryStore[STORAGE_KEYS.currentCustomer];
  emit('auth-changed', null);
}

function getCustomerOrders(customerId) {
  const orders = getFromStorage(STORAGE_KEYS.orders) || [];
  return orders.filter(o => o.customerId === customerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ===== COUPONS =====
function getCoupons() {
  return getFromStorage(STORAGE_KEYS.coupons) || [];
}

function getCoupon(code) {
  if (!code) return null;
  return getCoupons().find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
}

function saveCoupon(coupon) {
  const coupons = getCoupons();
  coupon.code = coupon.code.toUpperCase();
  if (coupon.id) {
    const index = coupons.findIndex(c => c.id === coupon.id);
    if (index !== -1) {
      coupons[index] = { ...coupons[index], ...coupon };
    } else {
      coupons.push(coupon);
    }
  } else {
    coupon.id = generateId();
    coupon.status = coupon.status || 'active';
    coupons.push(coupon);
  }
  saveToStorage(STORAGE_KEYS.coupons, coupons);
  emit('coupons-updated', coupons);
  return coupon.id;
}

function deleteCoupon(id) {
  const coupons = getCoupons().filter(c => c.id !== id);
  saveToStorage(STORAGE_KEYS.coupons, coupons);
  emit('coupons-updated', coupons);
}

function validateCoupon(code, cartSubtotal) {
  const coupon = getCoupon(code);
  if (!coupon || coupon.status !== 'active') return { valid: false, message: 'Invalid or inactive coupon' };
  
  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { valid: false, message: 'Coupon expired' };
  }
  if (coupon.minOrderAmount && cartSubtotal < coupon.minOrderAmount) {
    return { valid: false, message: `Minimum order amount is ${coupon.minOrderAmount}` };
  }
  
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((cartSubtotal * coupon.discountValue) / 100);
  } else {
    discountAmount = coupon.discountValue;
  }
  
  // Cap discount if maxDiscountAmount is set
  if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
    discountAmount = coupon.maxDiscountAmount;
  }
  
  return { valid: true, discountAmount, coupon };
}

// ===== SEED DATA =====
function seedData() {
  if (getFromStorage(STORAGE_KEYS.seeded)) return;

  // If Firebase is available, DO NOT seed empty data.
  // Wait for Firestore to populate the store!
  if (window.FirebaseDB && window.FirebaseDB.db) {
    return;
  }

  saveToStorage(STORAGE_KEYS.categories, []);
  saveToStorage(STORAGE_KEYS.products, []);
  saveToStorage(STORAGE_KEYS.reviews, []);
  saveToStorage(STORAGE_KEYS.orders, []);
  saveToStorage(STORAGE_KEYS.coupons, []);

  saveToStorage(STORAGE_KEYS.seeded, true);
  console.log('✨ Medix: Store initialized with empty data!');
}

// ===== RESET DATA (for testing) =====
function resetAllData() {
  if (!_useLocalStorage) {
    Object.keys(_memoryStore).forEach(k => delete _memoryStore[k]);
  } else {
    Object.keys(STORAGE_KEYS).forEach(k => {
      localStorage.removeItem(STORAGE_KEYS[k]);
    });
  }
  historyStack = [];
  historyIndex = -1;
  seedData();
}

// ===== FIREBASE REAL-TIME SYNC =====
function initFirebaseSync() {
  if (!window.FirebaseDB || !window.FirebaseDB.db) return;
  const { db, doc, onSnapshot } = window.FirebaseDB;

  const keysToSync = [
    STORAGE_KEYS.products, 
    STORAGE_KEYS.categories, 
    STORAGE_KEYS.settings, 
    STORAGE_KEYS.orders,
    STORAGE_KEYS.coupons,
    STORAGE_KEYS.reviews,
    STORAGE_KEYS.customers
  ];

  // Track initial sync completion
  let syncedCount = 0;
  const totalKeys = keysToSync.length;
  let initialSyncDone = false;

  keysToSync.forEach(key => {
    onSnapshot(doc(db, "store_data", key), (docSnap) => {
      const exists = typeof docSnap.exists === 'function' ? docSnap.exists() : docSnap.exists;
      if (exists) {
        const payload = docSnap.data().data;
        if (payload) {
          const localDataStr = _useLocalStorage ? localStorage.getItem(key) : JSON.stringify(_memoryStore[key]);
          let localData = null;
          try { localData = localDataStr ? JSON.parse(localDataStr) : null; } catch(e){}

          // Removed the override logic. Cloud is the absolute source of truth.
          const isCloudEmpty = Array.isArray(payload) ? payload.length === 0 : (payload && Object.keys(payload).length === 0);
          
          if (isCloudEmpty) {
            // If cloud is empty, we must wipe local data to match cloud.
            if (_useLocalStorage) {
              try { localStorage.removeItem(key); } catch(e){}
            }
            delete _memoryStore[key];
            
            // Trigger sync event to clear UI
            try { window.dispatchEvent(new StorageEvent('storage', { key: key })); } catch(e){}
            window.dispatchEvent(new CustomEvent('firebase-data-synced', { detail: { key: key } }));
            
            if (!initialSyncDone) { syncedCount++; if (syncedCount >= totalKeys) { initialSyncDone = true; window.dispatchEvent(new CustomEvent('firebase-initial-sync-done')); } }
            return;
          }

          const newPayloadStr = JSON.stringify(payload);
          let isDifferent = true;
          
          if (_useLocalStorage) {
            if (localStorage.getItem(key) === newPayloadStr) {
              isDifferent = false;
            } else {
              try {
                localStorage.setItem(key, newPayloadStr);
              } catch (e) {
                console.warn(`LocalStorage quota exceeded for ${key}, falling back to memory store.`);
                _memoryStore[key] = JSON.parse(newPayloadStr);
              }
            }
          } else {
            if (JSON.stringify(_memoryStore[key]) === newPayloadStr) {
              isDifferent = false;
            } else {
              _memoryStore[key] = JSON.parse(newPayloadStr);
            }
          }

          if (isDifferent) {
            isFirebaseSyncing = true;
            isFirebaseSyncing = false;
            
            try {
              window.dispatchEvent(new StorageEvent('storage', { key: key }));
            } catch(e) {}
            window.dispatchEvent(new CustomEvent('firebase-data-synced', { detail: { key: key } }));
          }
        }
      } else {
        // Cloud document does not exist. If we have local data, push it to cloud.
        const localDataStr = _useLocalStorage ? localStorage.getItem(key) : JSON.stringify(_memoryStore[key]);
        if (localDataStr) {
          try {
            const localData = JSON.parse(localDataStr);
            const hasData = Array.isArray(localData) ? localData.length > 0 : (localData && Object.keys(localData).length > 0);
            if (hasData) {
              const { setDoc } = window.FirebaseDB;
              setDoc(doc(db, "store_data", key), { data: localData })
                .then(() => console.log("Initial push to cloud for " + key))
                .catch(e => console.error("Initial push failed for " + key, e));
            }
          } catch(e) {}
        }
      }
      // Count initial sync
      if (!initialSyncDone) {
        syncedCount++;
        if (syncedCount >= totalKeys) {
          initialSyncDone = true;
          window.dispatchEvent(new CustomEvent('firebase-initial-sync-done'));
        }
      }
    });
  });
}

window.addEventListener('firebase-ready', initFirebaseSync);
if (window.FirebaseDB) initFirebaseSync();

// Initialize
seedData();

// ===== FORMAT HELPERS =====
function formatPrice(price, lang = 'ar') {
  const settings = getSettings();
  const currency = lang === 'ar' ? settings.currency_ar : settings.currency_en;
  const formatted = price.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG');
  return lang === 'ar' ? `${formatted} ${currency}` : `${currency} ${formatted}`;
}

function formatDate(dateStr, lang = 'ar') {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatDateTime(dateStr, lang = 'ar') {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getStatusColor(status) {
  const colors = {
    new: '#3498db',
    confirmed: '#9b59b6',
    preparing: '#f39c12',
    shipping: '#e67e22',
    delivered: '#2ecc71',
    cancelled: '#e74c3c'
  };
  return colors[status] || '#888';
}

function getStatusIcon(status) {
  const icons = {
    new: '<i class="ph ph-sparkle"></i>',
    confirmed: '<i class="ph ph-check-circle"></i>',
    preparing: '<i class="ph ph-package"></i>',
    shipping: '<i class="ph ph-truck"></i>',
    delivered: '<i class="ph ph-check-square"></i>',
    cancelled: '<i class="ph ph-x-circle"></i>'
  };
  return icons[status] || '•';
}

window.Store = {
  on, off, emit, getSettings, saveSettings, getProducts, getActiveProducts, getProduct, saveProduct, deleteProduct, getFeaturedProducts, getProductsByCategory, searchProducts, getDiscountedProducts, getProductPrice, getCategories, getActiveCategories, getCategory, saveCategory, deleteCategory, getCategoryProductCount, getCart, addToCart, removeFromCart, updateCartQuantity, clearCart, getCartTotal, getCartWithProducts, getOrders, getOrder, getOrderByNumber, createOrder, updateOrderStatus, deleteOrder, getOrderStats, getReviews, getApprovedReviews, getAllReviews, addReview, approveReview, deleteReview, adminLogin, isAdminLoggedIn, adminLogout, changeAdminPassword, getCoupons, getCoupon, saveCoupon, deleteCoupon, validateCoupon, seedData, resetAllData, formatPrice, formatDate, formatDateTime, getStatusColor, getStatusIcon, getCustomers, getCurrentCustomer, registerCustomer, loginCustomer, loginWithGoogle, logoutCustomer, getCustomerOrders, storeUndo, storeRedo, getWishlist, toggleWishlist, isInWishlist, getRecentlyViewed, addRecentlyViewed, getShippingCost
};

