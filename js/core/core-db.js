/**
 * finance-db.js
 * هذا الملف مخصص لإدارة قواعد البيانات المنفصلة وتوليد المعرفات الفريدة (UUIDs).
 * تم فصله عن الملف الرئيسي لتخفيف الازدحام ولتأسيس بنية تحتية قوية (Database Normalization).
 */

// ==========================================
// 1. توليد المعرفات الفريدة (Unique IDs)
// ==========================================
window.generateUniqueId = function(prefix = 'ID') {
    if (typeof window.generateGlobalID === 'function') {
        return window.generateGlobalID(prefix);
    }
    if (window.crypto && window.crypto.randomUUID) {
        return prefix + '_' + window.crypto.randomUUID();
    }
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
            await window.setDoc(docRef, product, { merge: true });
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
            await window.deleteDoc(docRef);
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
            await window.setDoc(docRef, customer, { merge: true });
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
            await window.setDoc(docRef, debt, { merge: true });
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
    },

    // ---------------- السيريالات (Serials Collection) ----------------
    async saveSerial(serialItem) {
        if (!window.currentUser || !window.db) return false;
        const sKey = (serialItem.serial || serialItem.id || window.generateUniqueId('SER')).toString().replace(/[\/\#\$\.\[\]]/g, '_');
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "serials", sKey);
            await window.setDoc(docRef, serialItem, { merge: true });
            return serialItem;
        } catch (e) {
            console.error("❌ [DB] خطأ في حفظ السيريال:", e);
            return false;
        }
    },

    async loadAllSerials() {
        if (!window.currentUser || !window.db || !window.getDocs || !window.collection) return [];
        try {
            console.log("[DB] جاري تحميل السيريالات من المجموعة المستقلة...");
            const colRef = window.collection(window.db, "users", window.currentUser.uid, "serials");
            const snap = await window.getDocs(colRef);
            const serials = [];
            snap.forEach(doc => serials.push(doc.data()));
            console.log(`[DB] تم تحميل ${serials.length} سيريال بنجاح.`);
            return serials;
        } catch (e) {
            console.error("❌ [DB] خطأ في تحميل السيريالات:", e);
            return [];
        }
    },

    async deleteSerial(serialKey) {
        if (!window.currentUser || !window.db || !window.deleteDoc) return false;
        const sKey = serialKey.toString().replace(/[\/\#\$\.\[\]]/g, '_');
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "serials", sKey);
            await window.deleteDoc(docRef);
            return true;
        } catch (e) {
            console.error("❌ [DB] خطأ في حذف السيريال:", e);
            return false;
        }
    },

    // ---------------- تخزين ونقل السيريالات المفصولة (Dedicated Serials Storage) ----------------
    async saveSerialsData(serialsLog, standaloneSerials) {
        if (!window.currentUser || !window.db) {
            throw new Error("لا يوجد مستخدم مسجل أو اتصال بقاعدة البيانات.");
        }
        if (window._serialsLoadFailed) {
            throw new Error("الحفظ متوقف: فشل تحميل السيريالات مسبقاً، تم إيقاف الحفظ لمنع مسح بيانات السيريالات بالسحابة.");
        }
        const uid = window.currentUser.uid;

        const serialsArray = Array.isArray(serialsLog) ? serialsLog : [];
        const standaloneArray = Array.isArray(standaloneSerials) ? standaloneSerials : [];

        // 🛡️ [النقطة 3]: حساب بصمة هاش قوية ومستقرة للمحتوى فقط (دون تاريخ updatedAt) لمنع تكرار الكتابة
        const hashInput = JSON.stringify({ s: serialsArray, st: standaloneArray });
        let contentHash = '';
        if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
            try {
                const enc = new TextEncoder().encode(hashInput);
                const buf = await crypto.subtle.digest('SHA-256', enc);
                const hexArr = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                contentHash = `${hexArr}_${enc.length}`;
            } catch (hErr) {}
        }
        if (!contentHash) {
            let h1 = 5381, h2 = 2166136261;
            for (let i = 0; i < hashInput.length; i++) {
                const c = hashInput.charCodeAt(i);
                h1 = ((h1 << 5) + h1) ^ c;
                h2 = Math.imul(h2 ^ c, 16777619);
            }
            contentHash = `h_${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}_${hashInput.length}`;
        }

        const userHashKey = `${uid}_${contentHash}`;
        if (window._lastSavedSerialsHash && window._lastSavedSerialsHash === userHashKey) {
            console.log(`[FinanceDB] بيانات السيريالات لم تتغير، تم تخطي الكتابة السحابية.`);
            return true;
        }

        const payload = {
            serialNumbersLog: serialsArray,
            standaloneSerials: standaloneArray,
            updatedAt: new Date().toISOString()
        };
        const jsonStr = JSON.stringify(payload);

        // قياس الحجم الفعلي بالبايت UTF-8 بدقة
        let totalBytes = 0;
        if (typeof Blob !== 'undefined') {
            totalBytes = new Blob([jsonStr]).size;
        } else if (typeof Buffer !== 'undefined') {
            totalBytes = Buffer.byteLength(jsonStr, 'utf8');
        } else if (typeof TextEncoder !== 'undefined') {
            totalBytes = new TextEncoder().encode(jsonStr).length;
        } else {
            totalBytes = encodeURIComponent(jsonStr).replace(/%[A-F\d]{2}/g, 'U').length;
        }

        const CHUNK_LIMIT_BYTES = 300 * 1024; // 300 KB حد أمان صلب بالبايت
        const version = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 8);
        const metaDoc = window.doc(window.db, "users", uid, "serials_storage", "meta");
        let totalChunks = 0;

        if (totalBytes > CHUNK_LIMIT_BYTES) {
            // تقسيم بالبايت UTF-8 مع الحفاظ على حدود الحروف متعددة البايتات
            let chunks = [];
            if (typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined') {
                const encoder = new TextEncoder();
                const decoder = new TextDecoder('utf-8');
                const encoded = encoder.encode(jsonStr);
                let offset = 0;
                while (offset < encoded.length) {
                    let end = Math.min(offset + CHUNK_LIMIT_BYTES, encoded.length);
                    if (end < encoded.length) {
                        while (end > offset && (encoded[end] & 0xC0) === 0x80) {
                            end--;
                        }
                    }
                    chunks.push(decoder.decode(encoded.subarray(offset, end)));
                    offset = end;
                }
            } else {
                const safeCharLimit = 80000;
                for (let i = 0; i < jsonStr.length; i += safeCharLimit) {
                    chunks.push(jsonStr.substring(i, i + safeCharLimit));
                }
            }

            totalChunks = chunks.length;

            // 🛡️ [النقطة 1]: كتابة الأجزاء الجديدة بأسماء تحمل الإصدار chunk_<version>_<i> أولاً
            // بهذه الطريقة لا تلمس الأجزاء القديمة إطلاقاً ولو انقطعت العملية يبقى الإصدار السابق كاملاً بسحابة فايرستور
            for (let i = 0; i < totalChunks; i++) {
                const chunkDoc = window.doc(window.db, "users", uid, "serials_storage", `chunk_${version}_${i}`);
                await window.setDoc(chunkDoc, {
                    chunkIndex: i,
                    totalChunks: totalChunks,
                    data: chunks[i],
                    version: version,
                    updatedAt: new Date().toISOString()
                });
            }

            // كتابة meta الجديد كآخر خطوة في عملية الحفظ
            await window.setDoc(metaDoc, {
                totalChunks: totalChunks,
                chunked: true,
                version: version,
                byteLength: totalBytes,
                updatedAt: new Date().toISOString()
            });
        } else {
            // المسار غير المقسم: كتابة meta الحاوي على كامل البيانات
            await window.setDoc(metaDoc, {
                ...payload,
                chunked: false,
                version: version,
                byteLength: totalBytes,
                updatedAt: new Date().toISOString()
            });
        }

        // 🛡️ [النقطة 2]: مسح الأجزاء الزائدة والقديمة فقط بعد اكتمال كتابة meta بنجاح
        try {
            if (window.collection && window.getDocs) {
                const colRef = window.collection(window.db, "users", uid, "serials_storage");
                const allDocsSnap = await window.getDocs(colRef);
                const docsList = allDocsSnap.docs || (Array.isArray(allDocsSnap) ? allDocsSnap : []);
                
                // تحديد المعرفات التي يجب الإبقاء عليها
                const keepSet = new Set(['meta']);
                if (totalBytes > CHUNK_LIMIT_BYTES) {
                    for (let i = 0; i < totalChunks; i++) {
                        keepSet.add(`chunk_${version}_${i}`);
                    }
                }

                const toDeleteRefs = [];
                docsList.forEach(d => {
                    const docId = d.id;
                    // لا نمسح meta أبداً، ونمسح أي chunk لا يخص الإصدار الحالي
                    if (docId !== 'meta' && docId.startsWith('chunk_') && !keepSet.has(docId)) {
                        toDeleteRefs.push(d.ref || window.doc(window.db, "users", uid, "serials_storage", docId));
                    }
                });

                if (toDeleteRefs.length > 0) {
                    if (window.db.batch && toDeleteRefs.length < 500) {
                        const batch = window.db.batch();
                        toDeleteRefs.forEach(ref => batch.delete(ref));
                        await batch.commit();
                    } else {
                        for (const ref of toDeleteRefs) {
                            if (window.deleteDoc) {
                                await window.deleteDoc(ref);
                            } else if (typeof ref.delete === 'function') {
                                await ref.delete();
                            }
                        }
                    }
                    console.log(`[FinanceDB] تم تنظيف ${toDeleteRefs.length} جزء قديم من وحدة تخزين السيريالات.`);
                }
            }
        } catch (cleanupErr) {
            // لو فشل المسح نسجل تحذيراً فقط ولا نرمي خطأ لأن البيانات الجديدة كُتبت بنجاح
            console.warn("[FinanceDB] تعذر تنظيف الأجزاء السابقة بعد الحفظ:", cleanupErr);
        }

        // تثبيت الهاش بعد اكتمال الحفظ بنجاح
        window._lastSavedSerialsHash = userHashKey;
        console.log(`[FinanceDB] تم حفظ بيانات السيريالات بنجاح في وحدة التخزين المنفصلة (${serialsArray.length} سجل، الحجم: ${(totalBytes/1024).toFixed(1)} KB، إصدار: ${version}).`);
        return true;
    },

    async loadSerialsData() {
        if (!window.currentUser || !window.db || !window.getDoc) return null;
        const uid = window.currentUser.uid;
        const metaDocRef = window.doc(window.db, "users", uid, "serials_storage", "meta");
        const metaSnap = await window.getDoc(metaDocRef);
        if (!metaSnap || !metaSnap.exists()) return null;
        const meta = metaSnap.data();
        if (!meta.chunked) {
            return {
                serialNumbersLog: Array.isArray(meta.serialNumbersLog) ? meta.serialNumbersLog : [],
                standaloneSerials: Array.isArray(meta.standaloneSerials) ? meta.standaloneSerials : []
            };
        }
        const expectedVersion = meta.version;
        const totalChunks = Number(meta.totalChunks) || 0;
        if (totalChunks <= 0) {
            throw new Error("بيانات السيريالات المقسمة تالفة: totalChunks غير صالح.");
        }
        let fullJson = '';
        for (let i = 0; i < totalChunks; i++) {
            // 🛡️ [النقطة 1]: قراءة الجزء باسم chunk_<expectedVersion>_<i> أولاً
            let chunkDocRef = expectedVersion
                ? window.doc(window.db, "users", uid, "serials_storage", `chunk_${expectedVersion}_${i}`)
                : window.doc(window.db, "users", uid, "serials_storage", `chunk_${i}`);

            let chunkSnap = await window.getDoc(chunkDocRef);

            // 🛡️ التوافق مع البيانات القديمة المخزنة بالصيغة السابقة chunk_<i>
            if ((!chunkSnap || !chunkSnap.exists()) && expectedVersion) {
                const fallbackDocRef = window.doc(window.db, "users", uid, "serials_storage", `chunk_${i}`);
                const fallbackSnap = await window.getDoc(fallbackDocRef);
                if (fallbackSnap && fallbackSnap.exists()) {
                    chunkSnap = fallbackSnap;
                }
            }

            if (!chunkSnap || !chunkSnap.exists()) {
                throw new Error(`بيانات السيريالات غير مكتملة: الجزء ${i} من أصل ${totalChunks} مفقود بالسحابة.`);
            }
            const chunkData = chunkSnap.data();
            if (expectedVersion && chunkData.version && chunkData.version !== expectedVersion) {
                throw new Error(`تعارض في إصدار أجزاء السيريالات: الجزء ${i} نسخته ${chunkData.version} بينما النسخة المطلوبة ${expectedVersion}.`);
            }
            if (typeof chunkData.data !== 'string') {
                throw new Error(`بيانات السيريالات في الجزء ${i} غير صالحة.`);
            }
            fullJson += chunkData.data;
        }
        try {
            const parsed = JSON.parse(fullJson);
            return {
                serialNumbersLog: Array.isArray(parsed.serialNumbersLog) ? parsed.serialNumbersLog : [],
                standaloneSerials: Array.isArray(parsed.standaloneSerials) ? parsed.standaloneSerials : []
            };
        } catch(err) {
            throw new Error(`فشل تحليل بيانات السيريالات بعد تجميع الأجزاء: ${err.message}`);
        }
    },

    // ---------------- سجل العمليات (Operation Logs Collection) ----------------
    async saveOperationLog(logEntry) {
        if (!window.currentUser || !window.db) return false;
        const logId = logEntry.id || window.generateUniqueId('LOG');
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "operation_logs", logId);
            await window.setDoc(docRef, logEntry, { merge: true });
            return logEntry;
        } catch (e) {
            console.error("❌ [DB] خطأ في حفظ سجل العملية:", e);
            return false;
        }
    },

    // ---------------- أرشفة السجلات المالية (Archived Financial Records) ----------------
    async archiveLiquidityEntries(entries) {
        if (!window.currentUser || !window.db || !Array.isArray(entries) || entries.length === 0) return true;
        const uid = window.currentUser.uid;
        for (const item of entries) {
            const entryId = item.id || (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('ARCLIQ') : ('LIQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)));
            item.id = entryId;
            const docRef = window.doc(window.db, "users", uid, "archive_liquidity", entryId);
            await window.setDoc(docRef, item, { merge: true });
        }
        return true;
    },

    async archiveLogEntries(entries) {
        if (!window.currentUser || !window.db || !Array.isArray(entries) || entries.length === 0) return true;
        const uid = window.currentUser.uid;
        for (const item of entries) {
            const entryId = item.id || (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('ARCLOG') : ('LOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)));
            item.id = entryId;
            const docRef = window.doc(window.db, "users", uid, "archive_log", entryId);
            await window.setDoc(docRef, item, { merge: true });
        }
        return true;
    },

    async loadArchivedLiquidity() {
        if (!window.currentUser || !window.db || !window.getDocs || !window.collection) return [];
        try {
            const colRef = window.collection(window.db, "users", window.currentUser.uid, "archive_liquidity");
            const snap = await window.getDocs(colRef);
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list;
        } catch (e) {
            console.error("❌ [DB] خطأ في قراءة أرشيف السيولة:", e);
            return [];
        }
    },

    async loadArchivedLogs() {
        if (!window.currentUser || !window.db || !window.getDocs || !window.collection) return [];
        try {
            const colRef = window.collection(window.db, "users", window.currentUser.uid, "archive_log");
            const snap = await window.getDocs(colRef);
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list;
        } catch (e) {
            console.error("❌ [DB] خطأ في قراءة أرشيف العمليات:", e);
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

    // 3. نقل السيريالات (إذا كانت متوفرة)
    let serialCount = 0;
    if (window.serialNumbersLog && Array.isArray(window.serialNumbersLog)) {
        for (const s of window.serialNumbersLog) {
            await window.FinanceDB.saveSerial(s);
            serialCount++;
        }
    }
    
    console.log(`🎉 اكتمل النقل بنجاح! تم فصل: ${prodCount} منتج، ${custCount} عميل، ${debtCount} سجل ديون، ${serialCount} سيريال.`);
    if (typeof showGlobalMessage === 'function') {
        showGlobalMessage('تم نقل وهيكلة قاعدة البيانات بنجاح لتعمل بالنظام المنفصل السريع!');
    } else {
        alert('تم نقل وهيكلة قاعدة البيانات بنجاح لتعمل بالنظام المنفصل السريع!');
    }
};


// ==========================================
// 6. نظام الحفظ المزدوج الذكي (Dual-Write Tracker)
// يكتشف التغييرات في المنتجات والعملاء ويرفع الفروقات فقط للسحابة
// ==========================================
window.lastSyncedProductsState = null;
window.lastSyncedDebtorsState = null;

window._isDualSyncing = false;
window.syncDualWriteToDB = async function() {
    if (!window.products || !window.debtors) return;
    if (window._isDualSyncing) { console.warn('Sync already in progress, skipping...'); return; }
    window._isDualSyncing = true;
    try {

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
    } catch (e) {
        console.error("Error in syncDualWriteToDB:", e);
    } finally {
        window._isDualSyncing = false;
    }
};

// تهيئة الحالة المبدئية يجب أن تُستدعى صراحة بعد التحميل الكامل (مثلاً من loadDataForDate)
window.initDualWriteState = function() {
    if (window.products) window.lastSyncedProductsState = JSON.stringify(window.products);
    if (window.debtors) window.lastSyncedDebtorsState = JSON.stringify(window.debtors);
};
