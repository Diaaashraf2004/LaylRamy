/**
 * finance-db.js
 * هذا الملف مخصص لإدارة قواعد البيانات المنفصلة وتوليد المعرفات الفريدة (UUIDs).
 * تم فصله عن الملف الرئيسي لتخفيف الازدحام ولتأسيس بنية تحتية قوية (Database Normalization).
 */

// ==========================================
// 1. توليد المعرفات الفريدة (Unique IDs)
// ==========================================
window.generateUniqueId = function(prefix = 'ID') {
    // استخدم التوليد المشفر إذا كان متاحاً في المتصفح
    if (window.crypto && window.crypto.randomUUID) {
        return prefix + '_' + window.crypto.randomUUID();
    }
    // طريقة بديلة قوية تعتمد على الوقت ورقم عشوائي
    const timestamp = new Date().getTime().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return prefix + '_' + timestamp + '_' + randomStr;
};

// ==========================================
// 2. عمليات الفحص والتوحيد (Data Audit & Migration)
// ==========================================
// هذه الدوال تتأكد أن البيانات الحالية القديمة أصبحت تمتلك معرفات فريدة بدون حذف أي شيء

window.auditAndFixProducts = function() {
    if (!window.products || !Array.isArray(window.products)) return;
    
    let fixedCount = 0;
    window.products.forEach(product => {
        if (!product.id) {
            product.id = window.generateUniqueId('PROD');
            fixedCount++;
        }
    });
    
    if (fixedCount > 0) {
        console.log(`[DB Audit] تم تعيين معرفات فريدة لعدد ${fixedCount} منتج.`);
    }
};

window.auditAndFixDebtors = function() {
    if (!window.debtors || !Array.isArray(window.debtors)) return;
    
    let fixedCount = 0;
    window.debtors.forEach(debt => {
        if (!debt.id) {
            debt.id = window.generateUniqueId('DEBT');
            fixedCount++;
        }
        // التأكد من وجود معرف للعميل لربط الديون ببعضها
        if (!debt.customerId) {
            // نعتمد على اسم العميل مؤقتاً لتوليد معرف موحد لكل اسم
            // (سيتم تحويل هذا لجدول عملاء منفصل لاحقاً)
            debt.customerId = 'CUST_' + btoa(unescape(encodeURIComponent(debt.name || 'مجهول'))).substring(0, 10);
            fixedCount++;
        }
    });
    
    if (fixedCount > 0) {
        console.log(`[DB Audit] تم تعيين معرفات فريدة لعدد ${fixedCount} سجل ديون.`);
    }
};

// ==========================================
// 3. الخطوات القادمة (مجهزة للعمل مستقبلاً)
// ==========================================
/*
window.saveProductToCollection = async function(product) { ... }
window.saveInvoiceToCollection = async function(invoice) { ... }
*/

// تشغيل الفحص التلقائي بمجرد تحميل هذا الملف
window.addEventListener('DOMContentLoaded', () => {
    // سيتم التشغيل بعد تحميل finance-core للتأكد من وجود المتغيرات
    setTimeout(() => {
        if (typeof window.auditAndFixProducts === 'function') window.auditAndFixProducts();
        if (typeof window.auditAndFixDebtors === 'function') window.auditAndFixDebtors();
    }, 2000);
});


// ==========================================
// 4. واجهة قاعدة البيانات السحابية (Cloud DB API)
// هذا القسم مسؤول عن حفظ وجلب البيانات كملفات منفصلة بدلاً من تخزينها في ملف اليوم
// ==========================================
window.FinanceDB = {
    // ---------------- المنتجات (Products) ----------------
    async saveProduct(product) {
        if (!window.currentUser || !window.db) return false;
        if (!product.id) product.id = window.generateUniqueId('PROD');
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "products", product.id);
            window.setDoc(docRef, product, { merge: true });
            console.log(`[DB] تم حفظ المنتج ${product.name} بنجاح كملف مستقل.`);
            return product;
        } catch (e) {
            console.error("❌ [DB] خطأ في حفظ المنتج:", e);
            return false;
        }
    },
    
    async deleteProduct(productId) {
        if (!window.currentUser || !window.db || !window.deleteDoc) return false;
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "products", productId);
            window.deleteDoc(docRef);
            console.log(`[DB] تم حذف المنتج ${productId} من السحابة.`);
            return true;
        } catch (e) {
            console.error("❌ [DB] خطأ في حذف المنتج:", e);
            return false;
        }
    },
    
    async loadAllProducts() {
        if (!window.currentUser || !window.db || !window.getDocs || !window.collection) return [];
        try {
            console.log("[DB] جاري تحميل المنتجات من السحابة...");
            const colRef = window.collection(window.db, "users", window.currentUser.uid, "products");
            const snap = await window.getDocs(colRef);
            const products = [];
            snap.forEach(doc => products.push(doc.data()));
            console.log(`[DB] تم تحميل ${products.length} منتج بنجاح.`);
            return products;
        } catch (e) {
            console.error("❌ [DB] خطأ في تحميل المنتجات:", e);
            return [];
        }
    },

    // ---------------- العملاء (Customers) ----------------
    async saveCustomer(customer) {
        if (!window.currentUser || !window.db) return false;
        if (!customer.id) customer.id = window.generateUniqueId('CUST');
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "customers", customer.id);
            window.setDoc(docRef, customer, { merge: true });
            console.log(`[DB] تم حفظ العميل ${customer.name} بنجاح كملف مستقل.`);
            return customer;
        } catch (e) {
            console.error("❌ [DB] خطأ في حفظ العميل:", e);
            return false;
        }
    },
    
    async loadAllCustomers() {
        if (!window.currentUser || !window.db || !window.getDocs || !window.collection) return [];
        try {
            console.log("[DB] جاري تحميل العملاء من السحابة...");
            const colRef = window.collection(window.db, "users", window.currentUser.uid, "customers");
            const snap = await window.getDocs(colRef);
            const customers = [];
            snap.forEach(doc => customers.push(doc.data()));
            console.log(`[DB] تم تحميل ${customers.length} عميل بنجاح.`);
            return customers;
        } catch (e) {
            console.error("❌ [DB] خطأ في تحميل العملاء:", e);
            return [];
        }
    },

    // ---------------- الديون (Debts) ----------------
    async saveDebt(debt) {
        if (!window.currentUser || !window.db) return false;
        if (!debt.id) debt.id = window.generateUniqueId('DEBT');
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "debts", debt.id);
            window.setDoc(docRef, debt, { merge: true });
            console.log(`[DB] تم حفظ دين للعميل ${debt.name} بنجاح كملف مستقل.`);
            return debt;
        } catch (e) {
            console.error("❌ [DB] خطأ في حفظ الدين:", e);
            return false;
        }
    },

    async loadAllDebts() {
        if (!window.currentUser || !window.db || !window.getDocs || !window.collection) return [];
        try {
            console.log("[DB] جاري تحميل الديون من السحابة...");
            const colRef = window.collection(window.db, "users", window.currentUser.uid, "debts");
            const snap = await window.getDocs(colRef);
            const debts = [];
            snap.forEach(doc => debts.push(doc.data()));
            console.log(`[DB] تم تحميل ${debts.length} سجل ديون بنجاح.`);
            return debts;
        } catch (e) {
            console.error("❌ [DB] خطأ في تحميل الديون:", e);
            return [];
        }
    }
};

// ==========================================
// 5. دالة نقل البيانات من النظام القديم للجديد (Migration Trigger)
// ==========================================
window.migrateDataToIsolatedCollections = async function() {
    if (!window.products || !window.debtors || !window.currentUser) {
        console.log("⚠️ بيانات النظام غير متوفرة بعد، يجب تسجيل الدخول والتحميل أولاً.");
        return;
    }
    
    console.log("🚀 جاري بدء عملية النقل الآمن للبيانات إلى الملفات المنفصلة...");
    
    // 1. نقل المنتجات
    let prodCount = 0;
    for (const prod of window.products) {
        if (!prod.id) prod.id = window.generateUniqueId('PROD');
        await window.FinanceDB.saveProduct(prod);
        prodCount++;
    }
    
    // 2. نقل الديون والعملاء
    let debtCount = 0;
    let customerMap = {};
    
    for (const debt of window.debtors) {
        if (!debt.id) debt.id = window.generateUniqueId('DEBT');
        
        // استخراج بيانات العميل من الدين
        const custId = debt.customerId || ('CUST_' + btoa(unescape(encodeURIComponent(debt.name || 'مجهول'))).substring(0, 10));
        debt.customerId = custId;
        
        if (!customerMap[custId]) {
            customerMap[custId] = {
                id: custId,
                name: debt.name || 'مجهول',
                createdAt: new Date().toISOString()
            };
        }
        
        await window.FinanceDB.saveDebt(debt);
        debtCount++;
    }
    
    // حفظ العملاء
    let custCount = 0;
    for (const custId in customerMap) {
        await window.FinanceDB.saveCustomer(customerMap[custId]);
        custCount++;
    }
    
    console.log(`🎉 اكتمل النقل بنجاح! تم فصل: ${prodCount} منتج، ${custCount} عميل، ${debtCount} سجل ديون.`);
    alert('تم نقل وهيكلة قاعدة البيانات بنجاح لتعمل بالنظام المنفصل السريع!');
};


// ==========================================
// 6. نظام الحفظ المزدوج الذكي (Dual-Write Tracker)
// يكتشف التغييرات في المنتجات والعملاء ويرفع الفروقات فقط للسحابة
// ==========================================
window.lastSyncedProductsState = null;
window.lastSyncedDebtorsState = null;

window.syncDualWriteToDB = async function() {
    if (!window.products || !window.debtors) return;

    // --- 1. مزامنة المنتجات (Products Sync) ---
    const currentProductsStr = JSON.stringify(window.products);
    if (window.lastSyncedProductsState !== currentProductsStr) {
        const oldProducts = JSON.parse(window.lastSyncedProductsState || '[]');
        const currentProducts = window.products;
        
        for (const prod of currentProducts) {
            const oldProd = oldProducts.find(p => p.id === prod.id);
            if (!oldProd || JSON.stringify(oldProd) !== JSON.stringify(prod)) {
                if (!prod.id) prod.id = window.generateUniqueId('PROD');
                await window.FinanceDB.saveProduct(prod);
            }
        }
        
        for (const oldProd of oldProducts) {
            if (!currentProducts.find(p => p.id === oldProd.id)) {
                await window.FinanceDB.deleteProduct(oldProd.id);
            }
        }
        
        window.lastSyncedProductsState = currentProductsStr;
    }

    // --- 2. مزامنة الديون (Debtors Sync) ---
    // (سنقوم بتفعيلها لاحقاً في المرحلة الثانية، ولكن نجهز الكود لها)
    const currentDebtorsStr = JSON.stringify(window.debtors);
    if (window.lastSyncedDebtorsState !== currentDebtorsStr) {
        const oldDebtors = JSON.parse(window.lastSyncedDebtorsState || '[]');
        const currentDebtors = window.debtors;
        
        for (const debt of currentDebtors) {
            const oldDebt = oldDebtors.find(d => d.id === debt.id);
            if (!oldDebt || JSON.stringify(oldDebt) !== JSON.stringify(debt)) {
                if (!debt.id) debt.id = window.generateUniqueId('DEBT');
                if (!debt.customerId) debt.customerId = 'CUST_' + btoa(unescape(encodeURIComponent(debt.name || 'مجهول'))).substring(0, 10);
                await window.FinanceDB.saveDebt(debt);
            }
        }
        
        window.lastSyncedDebtorsState = currentDebtorsStr;
    }
};

// تهيئة الحالة المبدئية يجب أن تُستدعى صراحة بعد التحميل الكامل (مثلاً من loadDataForDate)
window.initDualWriteState = function() {
    if (window.products) window.lastSyncedProductsState = JSON.stringify(window.products);
    if (window.debtors) window.lastSyncedDebtorsState = JSON.stringify(window.debtors);
};
