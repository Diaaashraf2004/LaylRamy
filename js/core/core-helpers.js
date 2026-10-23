// finance-core-helpers.js - Core helper and state functions



// دالة فحص وتأمين البيانات القديمة (تمنح أكواداً للمنتجات التي لا تملك كوداً فور تشغيل البرنامج)
function clearAndSecureOldData() {
    if (Array.isArray(products)) {
        products.forEach(p => {
            if (!p.id) p.id = generateGlobalID('prod');
        });
    }
    if (Array.isArray(suppliers)) {
        suppliers.forEach(s => {
            if (!s.id) s.id = generateGlobalID('supp');
        });
    }
    if (Array.isArray(accounts)) {
        accounts.forEach(acc => {
            if (!acc.id) acc.id = generateGlobalID('acc');
        });
    }
}
// تشغيل التأمين فوراً
clearAndSecureOldData();
        // --- الدوال المساعدة (Helper Functions) ---
// دالة مساعدة لإضافة مبلغ إلى السيولة وتسجيله في السجل
// دالة لحفظ فاتورة الشراء في أرشيف مستقل للرجوع إليها لاحقاً من قسم الالتزامات
async function savePurchaseInvoiceToCloud(invoiceData) {
    if (!window.currentUser) return;
    const userId = window.currentUser.uid;
    try {
        const docRef = window.doc(window.db, "users", userId, "purchase_archives", invoiceData.id);
        await window.setDoc(docRef, invoiceData);
        console.log("✅ تم أرشفة فاتورة الشراء سحابياً.");
    } catch (error) {
        console.error("❌ فشل أرشفة فاتورة الشراء:", error);
    }
}
// ✅✅✅ دالة جديدة لمسح كل البيانات في الجلسة الحالية ✅✅✅
function resetAllData() {
    console.log("resetAllData called - Clearing ALL current session data.");

    // تصفير كل متغيرات الحالة الرئيسية
    products = [];
    suppliers = [];
    // إعادة تعيين الحسابات إلى حساب افتراضي واحد
    accounts = [{ id: 'main', name: 'الخزينة الرئيسية', balance: 0.00 }]; 
    expenses = 0;
    debtors = [];
    debtorProfiles = []; // مسح ملفات المديونيات أيضاً
    debtCollectionNotes = [];
    liabilities = [];
    monthlyLiabilities = []; 
    totalProfit = 0;
    operationLog = [];
    pendingSales = [];
    liquidityLog = [];
    salesToday = [];
    serialNumbersLog = [];
    purchaseInvoices = [];
    pendingPurchases = [];
    completedReturns = [];
    pendingReturns = [];
    pendingReturnsValue = 0;

    // �� السطر المحدث: تصفير كافة الفواتير المعلقة في نظام الاستبدال (ERP)
    window.pendingOrders = []; 
    
    // تصفير حالات التعديل
    editingPendingSaleId = null;
    editingProductName = null;
    editingSupplierId = null;
    editingMonthlyLiabilityId = null;
    
    // تصفير سجل التراجع/الإعادة
    stateHistory = [];
    redoHistory = [];
    updateUndoRedoButtons();

    // مسح الرسائل من الواجهة
    const messageElements = document.querySelectorAll('.section-message, .error-message');
    messageElements.forEach(el => {
        el.textContent = '';
        el.classList.remove('visible', 'error', 'success', 'info');
    });
    
    // إضافة سجل يفيد بالتصفير الشامل
    logOperation("تصفير شامل", "تم مسح جميع بيانات الجلسة الحالية.");

    // تحديث الواجهة بالكامل لتعكس الحالة الفارغة
    updateUI(); 
    showGlobalMessage("تم تصفير جميع بيانات الجلسة الحالية بنجاح.", false, true);
}function addAmountToDefaultAccount(amount, description) {
    if (isNaN(amount) || amount <= 0) {
        console.error("خطأ: لا يمكن إضافة مبلغ غير صحيح للسيولة.");
        return false;
    }
    // حفظ الحالة قبل التغيير للسماح بالتراجع
    saveStateToHistory(); 
    const defaultAcc = (Array.isArray(accounts) && accounts[0]) ? accounts[0] : null;
    if (!defaultAcc) { console.error('addAmountToDefaultAccount: لا يوجد حساب رئيسي.'); return false; }
    defaultAcc.balance = (Number(defaultAcc.balance) || 0) + amount;
    const totalLiq = accounts.reduce((s,a) => s + Number(a.balance||0), 0);
    const logEntry = {
        id: generateId("liq"),
        timestamp: new Date().toISOString(),
        type: "add",
        amount: amount,
        description: description,
        currentBalance: totalLiq
    };
    liquidityLog.push(logEntry);
    logOperation("إضافة سيولة", `إضافة ${formatCurrency(amount)} من "${description}". الرصيد الحالي: ${formatCurrency(totalLiq)}`);
    return true;
}
        function convertNumerals(inputString) { if (typeof inputString !== 'string') return inputString; return inputString.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660).replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0); }
        function parseInputNumber(inputElement) { if (!inputElement) return NaN; const rawValue = inputElement.value; if (rawValue.trim() === '') return NaN; const westernValue = convertNumerals(rawValue.trim()); const normalizedValue = westernValue.replace(/٫/g, '.').replace(/,/g, ''); const number = parseFloat(normalizedValue); return isNaN(number) ? NaN : number; }

        function fetchData(key, defaultValue){ const data = localStorage.getItem(key); try { if(data === null || data === undefined) return defaultValue; const parsed = JSON.parse(data); return parsed } catch(e) { console.error(`Error parsing data for key "${key}":`, e); localStorage.removeItem(key); return defaultValue } }
        window.fetchData = fetchData;
        window.parseInputNumber = parseInputNumber;
        window.convertNumerals = convertNumerals;
        window.calculateTotals = calculateTotals;
        window.calculateTotalCapital = calculateTotals;
        // دالة جديدة لجلب بيانات يوم واحد من Firebase
async function fetchOnlineDataForDate(dateString) {
    if (!window.currentUser) {
        console.error("Cannot fetch report data. No user logged in.");
        return null;
    }
    const userId = window.currentUser.uid;
    try {
        const docRef = window.doc(window.db, "users", userId, "days", dateString);
        const docSnap = await window.getDoc(docRef);
        if (docSnap.exists()) {
            console.log(`Report: Found online data for ${dateString}`);
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching online report data for", dateString, error);
        return null;
    }
}
        function saveData(key, data){ console.log(`saveData: Saving data for key: ${key}`); try { localStorage.setItem(key, JSON.stringify(data)) } catch(e) { console.error(`Error saving data for key "${key}":`, e); showGlobalMessage("حدث خطأ أثناء حفظ البيانات. قد يكون التخزين ممتلئًا.", true) } }


function generateId(prefix = "id") {
    if (typeof window !== 'undefined' && typeof window._sharedGenerateGlobalID === 'function') {
        return window._sharedGenerateGlobalID(prefix);
    }
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return prefix + "_" + crypto.randomUUID();
    }
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function getDebtorProfileById(customerId) {
    return debtorProfiles.find(p => p.id === customerId) || null;
}

function getOrCreateDebtorProfile(name, phone = "", address = "") {
    if (!name) return null;
    const normalizedTarget = normalizeArabicText(name);
    
    // البحث في البروفايلات الحالية باستخدام الاسم الموحد
    let existing = debtorProfiles.find(p => normalizeArabicText(p.name) === normalizedTarget);
    
    if (existing) {
        // تحديث البيانات الناقصة فقط للبروفايل القديم
        if (phone && !existing.phone) existing.phone = phone;
        if (address && !existing.address) existing.address = address;
        return existing;
    }
    
    // إنشاء بروفايل جديد فقط إذا لم يوجد تطابق تماماً
    const newProfile = {
        id: generateId("cust"),
        name: String(name).trim(),
        phone: String(phone || "").trim(),
        address: String(address || "").trim(),
        generalNotes: "",
        createdAt: new Date().toISOString()
    };
    debtorProfiles.push(newProfile);
    return newProfile;
}
function getCustomerDebts(customerId) {
    return debtors.filter(d => d.customerId === customerId);
}

function getCustomerNotes(customerId) {
    return debtCollectionNotes
        .filter(n => n.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getCustomerTotalDebt(customerId) {
    return getCustomerDebts(customerId).reduce((sum, d) => sum + Number(d.amount || 0), 0);
}

function getLatestCustomerNote(customerId) {
    return getCustomerNotes(customerId)[0] || null;
}
function sanitizeDataForFirebase(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeDataForFirebase(item));
    }

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value === undefined) {
                newObj[key] = null; // <--- هذا هو السطر المهم: تحويل undefined إلى null
            } else {
                newObj[key] = sanitizeDataForFirebase(value);
            }
        }
    }
    return newObj;
}
       

        function showMessage(messageElement, text, isError = false, isInfo = false) {
            if (!messageElement) return;
            if (messageElement._hideTimer) { clearTimeout(messageElement._hideTimer); messageElement._hideTimer = null; }
            if (messageElement.style && typeof messageElement.style.removeProperty === 'function') {
                messageElement.style.removeProperty('color');
                messageElement.style.removeProperty('background-color');
                messageElement.style.removeProperty('border-color');
            } else if (messageElement.style) {
                messageElement.style.color = '';
                messageElement.style.backgroundColor = '';
                messageElement.style.borderColor = '';
            }
            messageElement.innerHTML = text || '';
            messageElement.className = 'section-message';
            if (text) {
                if (messageElement.classList && typeof messageElement.classList.add === 'function') {
                    if (isError) messageElement.classList.add('error');
                    else if (isInfo) messageElement.classList.add('info');
                    else messageElement.classList.add('success');
                    messageElement.classList.add('visible');
                }
                if (messageElement.style) messageElement.style.display = 'block';
                const delay = isError ? 5000 : 3500;
                messageElement._hideTimer = setTimeout(() => {
                    if (messageElement) {
                        if (messageElement.classList && typeof messageElement.classList.remove === 'function') messageElement.classList.remove('visible');
                        if (messageElement.style) messageElement.style.display = 'none';
                        messageElement.innerHTML = '';
                    }
                }, delay);
            } else {
                if (messageElement.classList && typeof messageElement.classList.remove === 'function') messageElement.classList.remove('visible');
                if (messageElement.style) messageElement.style.display = 'none';
            }
        }
        function showGlobalMessage(text, isError = false, isInfo = false){ const element = d("global-message"); if(!element) { if (typeof window.showGlobalMessage === 'function') return window.showGlobalMessage(text, isError); return; } showMessage(element, text, isError, isInfo); }
        function updateLoadDateDayName(dateString, displayElement) { if (!displayElement) { /* console.warn("Day name display element not provided!"); */ return; } if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) { displayElement.textContent = ''; return; } try { const date = new Date(dateString + 'T00:00:00'); // Ensure it's treated as local
             const options = { timeZone: 'Africa/Cairo', weekday: 'long' }; const dayName = date.toLocaleDateString('ar-EG', options); displayElement.textContent = `(${dayName})`; } catch (e) { console.error("Error getting day name for", dateString, ":", e); displayElement.textContent = ''; } }
       function isStateMeaningful(state) {
    if (!state) return false;

    return (
        (Array.isArray(state.products) && state.products.length > 0) ||
        (Array.isArray(state.suppliers) && state.suppliers.length > 0) ||
        (Array.isArray(state.accounts) && state.accounts.length > 0) ||
        (Array.isArray(state.debtors) && state.debtors.length > 0) ||
        (Array.isArray(state.debtorProfiles) && state.debtorProfiles.length > 0) ||
        (Array.isArray(state.debtCollectionNotes) && state.debtCollectionNotes.length > 0) ||
        (Array.isArray(state.liabilities) && state.liabilities.length > 0) ||
        (Array.isArray(state.monthlyLiabilities) && state.monthlyLiabilities.length > 0) ||
        (Array.isArray(state.pendingSales) && state.pendingSales.length > 0) ||
        (Array.isArray(state.serialNumbersLog) && state.serialNumbersLog.length > 0) ||
        (Array.isArray(state.inboxTasks) && state.inboxTasks.length > 0) ||
        (Array.isArray(state.pendingPurchases) && state.pendingPurchases.length > 0) ||
        (Array.isArray(state.pendingReturns) && state.pendingReturns.length > 0) ||
        (Array.isArray(state.pendingOrders) && state.pendingOrders.length > 0) ||
        (Array.isArray(state.recordedLosses) && state.recordedLosses.length > 0) ||
        Number(state.pendingReturnsValue || 0) !== 0 ||
        Number(state.expenses || 0) !== 0 ||
        Number(state.profit || 0) !== 0
    );
}

async function findLatestValidDayBeforeDate(userId, targetDate) {
    try {
        const daysColRef = window.collection(window.db, "users", userId, "days");
        const q = window.query(
            daysColRef,
            window.where("savedForDate", "<", targetDate),
            window.orderBy("savedForDate", "desc"),
            window.limit(15)
        );

        const snap = await window.getDocs(q);
        if (snap.empty) return null;

        for (const docSnap of snap.docs) {
            const data = docSnap.data() || {};
            if (isStateMeaningful(data)) {
                return {
                    date: data.savedForDate || docSnap.id,
                    data: data
                };
            }
        }

        return null;
    } catch (error) {
        console.error("خطأ أثناء البحث عن آخر يوم صالح:", error);
        return null;
    }
}
       
       
       
       
        function getPreviousDayString(dateString) { try { const date = new Date(dateString + 'T00:00:00'); date.setDate(date.getDate() - 1); const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { console.error("Error calculating previous day for", dateString, e); return null; } }
        // الدالة الجديدة لتحديد اليوم التالي
        function getNextDayString(dateString) {
             try {
                 const date = new Date(dateString + 'T00:00:00'); // Treat as local date
                 date.setDate(date.getDate() + 1);
                 const year = date.getFullYear();
                 const month = String(date.getMonth() + 1).padStart(2, '0');
                 const day = String(date.getDate()).padStart(2, '0');
                 return `${year}-${month}-${day}`;
             } catch (e) {
                 console.error("Error calculating next day for", dateString, e);
                 return null;
             }
          }
        // Removed duplicated generateId
        function getMonthStartDateEndDate(yearMonth) { //YYYY-MM format
             try {
                 const [year, month] = yearMonth.split('-').map(Number);
                 if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                     throw new Error("Invalid year-month format");
                 }
                 const startDate = new Date(Date.UTC(year, month - 1, 1));
                 const endDate = new Date(Date.UTC(year, month, 0)); // Last day of the month
                 const dates = [];
                 let currentDate = new Date(startDate);
                 // Ensure loop doesn't run indefinitely if date logic is flawed
                 let safetyCounter = 0;
                 while (currentDate <= endDate && safetyCounter < 32) {
                     const y = currentDate.getUTCFullYear();
                     const m = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
                     const d = String(currentDate.getUTCDate()).padStart(2, '0');
                     dates.push(`${y}-${m}-${d}`);
                     currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                     safetyCounter++;
                 }
                 return dates; // Array of YYYY-MM-DD strings for the month
             } catch (error) {
                 console.error("Error generating dates for month:", yearMonth, error);
                 return []; // Return empty array on error
             }
          }
        function updateTimeDisplay() {
            if (!currentTimeDisplay) return;
            const now = new Date();
            // Use Intl.DateTimeFormat for better locale support and options
            const options = { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
            currentTimeDisplay.textContent = new Intl.DateTimeFormat('ar-EG', options).format(now);
        }
        // ================== بداية الدالة المساعدة الجديدة ==================
async function saveInvoiceToFirestore(invoiceRecord) {
    if (!window.currentUser) return;
    const userId = window.currentUser.uid;
    
    // ضمان وجود تاريخ البيع
   if (!invoiceRecord.saleDate) {
    invoiceRecord.saleDate =
        (invoiceRecord.createdAt ? (typeof getCairoDateString === 'function' ? getCairoDateString(invoiceRecord.createdAt) : null) : null) ||
        (invoiceRecord.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(invoiceRecord.timestamp) : null) : null) ||
        currentLoadedDate ||
        (typeof getCairoDateString === 'function' ? getCairoDateString() : getTodayDateString());
}

    try {
        const invoiceDocRef = window.doc(window.db, "users", userId, "invoices", invoiceRecord.id);
        // ننتظر حتى ينتهي الحفظ تماماً
        window.setDoc(invoiceDocRef, invoiceRecord, { merge: true });
        console.log(`تم رفع الفاتورة ${invoiceRecord.invoiceNumber} للسحابة بنجاح.`);
    } catch (error) {
        console.error("خطأ في الرفع للسحابة:", error);
        // تنبيه المستخدم بوجود مشكلة في السحابة
        alert(`تنبيه: تم حفظ الفاتورة محلياً، ولكن فشل رفعها للسحابة.\nالسبب: ${error.message}`);
    }
}
// ================== بداية دالة ترحيل البيانات القديمة ==================
async function migrateOldSalesToInvoicesCollection() {
    if (!window.currentUser) { 
        alert("يرجى تسجيل الدخول أولاً قبل بدء الترحيل.");
        return; 
    }
    if (!confirm("هل أنت متأكد من رغبتك في بدء عملية ترحيل المبيعات القديمة؟ قد تستغرق هذه العملية بعض الوقت. تأكد من أنك أخذت نسخة احتياطية.")) {
        return;
    }

    const userId = window.currentUser.uid;
    console.log("Starting migration of old sales data...");
    alert("بدأت عملية ترحيل البيانات. يرجى إبقاء هذه النافذة مفتوحة ومراقبة الـ Console (F12) للمتابعة.");
    let migratedCount = 0;
    
    // حدد نطاق التاريخ الذي تريد ترحيل بياناته (عدّل التاريخ حسب الحاجة)
    const startDate = new Date('2023-01-01'); // ابدأ من تاريخ قديم
    const endDate = new Date(); // حتى اليوم
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = getCairoDateString(d);
        const dayDocRef = window.doc(window.db, "users", userId, "days", dateStr);
        
        try {
            const dayDocSnap = await window.getDoc(dayDocRef);

            if (dayDocSnap.exists()) {
                const dayData = dayDocSnap.data();
                const salesForThisDay = dayData.salesToday || [];
                
                if (salesForThisDay.length > 0) {
                    console.log(`Found ${salesForThisDay.length} sales for ${dateStr}. Migrating...`);
                    for (const sale of salesForThisDay) {
                        // أهم خطوة: إضافة تاريخ البيع للبحث
                        if(sale.id && !sale.saleDate) { // تأكد من وجود ID وأنها ليست مرحّلة من قبل
                           sale.saleDate = dateStr; 
                           const invoiceDocRef = window.doc(window.db, "users", userId, "invoices", sale.id);
                           window.setDoc(invoiceDocRef, sale);
                           migratedCount++;
                        }
                    }
                }
            }
        } catch(e) {
            console.error(`Could not process date ${dateStr}:`, e);
        }
    }
    console.log(`Migration complete! Total sales migrated: ${migratedCount}`);
    alert(`اكتملت عملية الترحيل! تم ترحيل ${migratedCount} عملية بيع قديمة بنجاح!`);
    
}
// =================== نهاية دالة ترحيل البيانات القديمة ===================
window.migrateOldSalesToInvoicesCollection = migrateOldSalesToInvoicesCollection;

// =========================================================
// ترحيل تلقائي صامت: نسخ المبيعات القديمة من ملفات الأيام إلى invoices
// يتم مرة واحدة فقط في الخلفية بدون تأثير على سرعة البرنامج
// =========================================================
(async function autoMigrateOldSales() {
    const MIGRATION_KEY = 'sales_migration_done_v2';
    if (localStorage.getItem(MIGRATION_KEY) === 'true') return; // تم الترحيل مسبقاً
    
    // ننتظر تسجيل الدخول
    const waitForUser = () => new Promise(resolve => {
        if (window.currentUser) return resolve(window.currentUser);
        const check = setInterval(() => {
            if (window.currentUser) { clearInterval(check); resolve(window.currentUser); }
        }, 2000);
        // توقف بعد 30 ثانية لو مفيش مستخدم
        setTimeout(() => { clearInterval(check); resolve(null); }, 30000);
    });
    
    const user = await waitForUser();
    if (!user) return;
    
    const userId = user.uid;
    console.log('[ترحيل تلقائي] بدء ترحيل المبيعات القديمة في الخلفية...');
    
    let migratedCount = 0;
    const startDate = new Date('2023-01-01');
    const endDate = new Date();
    
    try {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = getCairoDateString(d);
            
            try {
                const dayDocRef = window.doc(window.db, "users", userId, "days", dateStr);
                const dayDocSnap = await window.getDoc(dayDocRef);

                if (dayDocSnap.exists()) {
                    const dayData = dayDocSnap.data();
                    const sales = dayData.salesToday || [];
                    
                    for (const sale of sales) {
                        if (!sale.id) continue;
                        if (!sale.saleDate) sale.saleDate = dateStr;
                        
                        try {
                            const invoiceDocRef = window.doc(window.db, "users", userId, "invoices", sale.id);
                            const existing = await window.getDoc(invoiceDocRef);
                            if (!existing.exists()) {
                                window.setDoc(invoiceDocRef, sale);
                                migratedCount++;
                            }
                        } catch(e) { /* skip individual errors */ }
                    }
                }
            } catch(e) { /* skip days that fail */ }
        }
        
        localStorage.setItem(MIGRATION_KEY, 'true');
        console.log('[ترحيل تلقائي] ✅ اكتمل! تم ترحيل ' + migratedCount + ' فاتورة.');
    } catch(e) {
        console.warn('[ترحيل تلقائي] خطأ:', e);
    }
})();


        // --- Undo/Redo State Management Functions ---

function createStateSnapshot() {
    return {
        products: JSON.parse(JSON.stringify(products)),
        suppliers: JSON.parse(JSON.stringify(suppliers)),
        accounts: JSON.parse(JSON.stringify(accounts)),
        expenses: expenses,
        recordedLosses: recordedLosses,
        debtors: JSON.parse(JSON.stringify(debtors)),
        debtorProfiles: JSON.parse(JSON.stringify(debtorProfiles)),
        debtCollectionNotes: JSON.parse(JSON.stringify(debtCollectionNotes)),
        liabilities: JSON.parse(JSON.stringify(liabilities)),
        monthlyLiabilities: JSON.parse(JSON.stringify(monthlyLiabilities)),
        totalProfit: totalProfit,
        operationLog: JSON.parse(JSON.stringify(operationLog)),
        pendingSales: JSON.parse(JSON.stringify(pendingSales)),
        liquidityLog: JSON.parse(JSON.stringify(liquidityLog)),
        salesToday: JSON.parse(JSON.stringify(salesToday)),
        serialNumbersLog: JSON.parse(JSON.stringify(serialNumbersLog)),
        purchaseInvoices: JSON.parse(JSON.stringify(purchaseInvoices)),
                purchaseReturns: JSON.parse(JSON.stringify(purchaseReturns)),
        pendingPurchases: JSON.parse(JSON.stringify(pendingPurchases)),
        completedReturns: JSON.parse(JSON.stringify(completedReturns)),
        pendingReturns: JSON.parse(JSON.stringify(pendingReturns)),
        // �� السطر الجديد: أخذ لقطة من الفواتير المعلقة لنظام الاستبدال
        pendingOrders: JSON.parse(JSON.stringify(window.pendingOrders || [])),
        standaloneSerials: typeof window.getStandaloneSerials === 'function' ? JSON.parse(JSON.stringify(window.getStandaloneSerials())) : []
    };
}

function migrateLiabilitiesToAdvancedStructure() {
    if (!Array.isArray(liabilities) || liabilities.length === 0) return;
    
    let migratedCount = 0;
    liabilities.forEach(l => {
        if (!l.createdAt) {
            // إضافة تاريخ وهمي قديم للالتزامات القديمة حتى لا يتعطل النظام
            l.createdAt = new Date('2024-01-01T00:00:00Z').toISOString();
            migratedCount++;
        }
        if (!l.paymentHistory) {
            l.paymentHistory = [];
        }
        if (!l.status) {
            l.status = (Number(l.amount) || 0) <= 0.001 ? 'paid' : 'active';
        }
        if (!l.category) {
            l.category = 'أخرى'; // التصنيف الافتراضي
        }
    });
    
    if (migratedCount > 0) {
        console.log(`تم ترحيل وتحديث ${migratedCount} التزام لتتوافق مع الهيكل الجديد بنجاح.`);
    }
}

function migrateDebtorsToProfiles() {
    if (!Array.isArray(debtors) || debtors.length === 0) return;

    debtors.forEach(debt => {
        const rawName = debt.name || debt.customerName || "عميل بدون اسم";
        const normalizedName = normalizeArabicText(rawName);

        const linkedProfile = debt.customerId
            ? debtorProfiles.find(p => p.id === debt.customerId)
            : null;

        // لو customerId غير موجود أو موجود لكنه مكسور/لا يشير لبروفايل فعلي
        if (!linkedProfile) {
            let profile = debtorProfiles.find(p =>
                normalizeArabicText(p.name || "") === normalizedName
            );

            if (!profile) {
                profile = getOrCreateDebtorProfile(rawName);
            }

            debt.customerId = profile.id;
        }

        // توحيد الاسم المخزن داخل الدين نفسه
        const finalProfile = debtorProfiles.find(p => p.id === debt.customerId);
        if (finalProfile) {
            debt.name = finalProfile.name;
            debt.customerName = finalProfile.name;
        }

        if (!debt.createdAt) {
            debt.createdAt = new Date().toISOString();
        }
    });
}
function assignMissingProductIds() {
    if (typeof products !== 'undefined' && Array.isArray(products)) {
        products.forEach(p => {
            if (!p.id) {
                p.id = generateGlobalID('P');
            }
        });
    }
}

function loadStateFromSnapshot(snapshot) {
    products = snapshot.products || [];
    assignMissingProductIds();
    suppliers = snapshot.suppliers || [];
    accounts = snapshot.accounts || [];
    expenses = snapshot.expenses || 0;
    recordedLosses = snapshot.recordedLosses || 0;
    debtors = snapshot.debtors || [];
    debtorProfiles = snapshot.debtorProfiles || [];
    debtCollectionNotes = snapshot.debtCollectionNotes || [];
    
    migrateDebtorsToProfiles();
    mergeDuplicateDebtorProfiles();
    
    liabilities = snapshot.liabilities || [];
    
    // Migration: extract hidden liabilities to recordedLosses
    liabilities = liabilities.filter(l => {
        if (l.id === 'hidden-recorded-losses' || l.isHidden) {
            recordedLosses += (Number(l.amount) || 0);
            return false;
        }
        return true;
    });

    monthlyLiabilities = snapshot.monthlyLiabilities || [];
    totalProfit = snapshot.totalProfit || 0;

    operationLog = snapshot.operationLog || [];
    pendingSales = snapshot.pendingSales || [];
    liquidityLog = snapshot.liquidityLog || [];
    salesToday = snapshot.salesToday || [];
    serialNumbersLog = snapshot.serialNumbersLog || [];
    purchaseInvoices = snapshot.purchaseInvoices || [];
        purchaseReturns = snapshot.purchaseReturns || [];
    pendingPurchases = snapshot.pendingPurchases || [];
    completedReturns = snapshot.completedReturns || [];
    pendingReturns = snapshot.pendingReturns || [];
    
    // �� السطر المحدث: استرجاع الفواتير المعلقة الخاصة بنظام الاستبدال عند التراجع
    window.pendingOrders = snapshot.pendingOrders || [];
    
    // �� استرجاع حالة السيريالات
    if (typeof window.setStandaloneSerials === 'function') {
        window.setStandaloneSerials(snapshot.standaloneSerials || []);
    } else {
        window._tempStandaloneSerials = snapshot.standaloneSerials || [];
    }
}
function saveStateToHistory() {
    // هذه هي الدالة الرئيسية التي سنستدعيها قبل كل إجراء
    // 1. أضف الحالة الحالية إلى ذاكرة التراجع
    stateHistory.push(createStateSnapshot());

    // 2. امسح ذاكرة الإعادة، لأن أي إجراء جديد يلغيها
    redoHistory = [];

    // 3. تفعيل زر التراجع وتعطيل زر الإعادة
    const undoBtn = d('undo-button');
    const redoBtn = d('redo-button');
    if (undoBtn) undoBtn.disabled = false;
    if (redoBtn) redoBtn.disabled = true;

    // اختياري: وضع حد لذاكرة التراجع لمنع استهلاك ذاكرة كبير جدًا
    if (stateHistory.length > 5) { // تم تقليص الحد لتقليل استهلاك الذاكرة
        stateHistory.shift(); // إزالة أقدم عنصر
    }
}
function updateUndoRedoButtons() {
    // تحديث حالة أزرار التراجع والإعادة
    const undoBtn = d('undo-button');
    const redoBtn = d('redo-button');
    if (undoBtn) undoBtn.disabled = stateHistory.length === 0;
    if (redoBtn) redoBtn.disabled = redoHistory.length === 0;
}
// ==========================================
// 1. دالة التراجع الذكية فائقة السرعة (Instant Undo)
// ==========================================
async function undo() {
    if (stateHistory.length === 0) {
        console.log("No more states to undo.");
        return;
    }

    try {
        // 1. أخذ لقطة للوضع الحالي قبل التغيير (لغرض الإعادة Redo)
        redoHistory.push(createStateSnapshot());

        // 2. الحصول على الحالة السابقة من الذاكرة
        const lastState = stateHistory.pop();
        
        // تجهيز قائمة المعرفات للمقارنة
        const currentInvoiceIds = (salesToday || []).map(inv => inv.id);
        const previousInvoiceIds = (lastState.salesToday || []).map(inv => inv.id);

        // 3. تطبيق الحالة السابقة محلياً فوراً
        loadStateFromSnapshot(lastState);

        // ⚡⚡ التحديث الفوري للواجهة والأزرار في أجزاء من الثانية دون انتظار الشبكة ⚡⚡
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
        if (typeof generateMonthlySalesReport === 'function') {
            const reportSection = document.getElementById('sales-report-section');
            if (reportSection && !reportSection.classList.contains('hidden')) {
                generateMonthlySalesReport();
            }
        }
        showGlobalMessage("تم التراجع بنجاح.", false);

        // 4. مزامنة التغييرات مع السحابة (Firebase) في الخلفية دون تعطيل الواجهة
        const userId = window.currentUser ? window.currentUser.uid : null;
        if (userId) {
            // أ. السيناريو الأول: حذف الفواتير التي أُنشئت حديثاً وتم التراجع عنها
            const createdInvoiceIds = currentInvoiceIds.filter(id => !previousInvoiceIds.includes(id));
            if (createdInvoiceIds.length > 0) {
                await Promise.all(createdInvoiceIds.map(id => 
                    window.deleteDoc(window.doc(window.db, "users", userId, "invoices", id))
                    .catch(e => console.error("خطأ أثناء حذف فاتورة في التراجع:", e))
                ));
            }

            // ب. السيناريو الثاني: استعادة الفواتير التي كانت محذوفة وتم التراجع عن حذفها
            const restoredInvoiceIds = previousInvoiceIds.filter(id => !currentInvoiceIds.includes(id));
            if (restoredInvoiceIds.length > 0) {
                const restorePromises = restoredInvoiceIds.map(id => {
                    const invoiceData = lastState.salesToday.find(inv => inv.id === id);
                    if (invoiceData) {
                        if (!invoiceData.saleDate) {
                             invoiceData.saleDate = invoiceData.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(invoiceData.timestamp) : invoiceData.timestamp.substring(0, 10)) : "";
                        }
                        return window.setDoc(window.doc(window.db, "users", userId, "invoices", id), invoiceData, { merge: true })
                               .catch(e => console.error("خطأ أثناء استعادة فاتورة في التراجع:", e));
                    }
                });
                await Promise.all(restorePromises);
            }
        }

        // 5. حفظ التغييرات الشاملة بالسحابة فوراً وبدون تأخير
        await saveSystemToCloud({ immediate: true });

    } catch (error) {
        console.error("حدث خطأ أثناء مزامنة التراجع بالسحابة:", error);
    } finally {
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
    }
}
// ==========================================
// 2. دالة الإعادة الذكية فائقة السرعة (Instant Redo)
// ==========================================
async function redo() {
    if (redoHistory.length === 0) {
        console.log("No more states to redo.");
        return;
    }

    try {
        // لقطة للوضع الحالي قبل التغيير
        const currentInvoiceIds = salesToday.map(inv => inv.id);

        // نقل الحالة الحالية إلى ذاكرة "التراجع"
        stateHistory.push(createStateSnapshot());

        // استرجاع الحالة القادمة (المستقبل)
        const nextState = redoHistory.pop();
        const nextInvoiceIds = nextState.salesToday.map(inv => inv.id);

        // تطبيق الحالة القادمة محلياً
        loadStateFromSnapshot(nextState);

        // ⚡⚡ التحديث الفوري للواجهة والأزرار في أجزاء من الثانية دون انتظار الشبكة ⚡⚡
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
        if (typeof generateMonthlySalesReport === 'function') {
            const reportSection = document.getElementById('sales-report-section');
            if (reportSection && !reportSection.classList.contains('hidden')) {
                generateMonthlySalesReport();
            }
        }
        showGlobalMessage("تمت الإعادة بنجاح.", false);

        const userId = window.currentUser ? window.currentUser.uid : null;
        if (userId) {
            // أ. السيناريو الأول: إعادة "الإنشاء" (استعادة ما تم التراجع عن إنشائه)
            const reCreatedInvoiceIds = nextInvoiceIds.filter(id => !currentInvoiceIds.includes(id));

            if (reCreatedInvoiceIds.length > 0) {
                console.log(`Redo: جاري إعادة رفع ${reCreatedInvoiceIds.length} فاتورة للسحابة...`);
                const restorePromises = reCreatedInvoiceIds.map(id => {
                    const invoiceData = nextState.salesToday.find(inv => inv.id === id);
                    if (invoiceData) {
                        if (!invoiceData.saleDate) invoiceData.saleDate = invoiceData.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(invoiceData.timestamp) : invoiceData.timestamp.substring(0, 10)) : "";
                        return window.setDoc(window.doc(window.db, "users", userId, "invoices", id), invoiceData, { merge: true });
                    }
                });
                await Promise.all(restorePromises);
            }

            // ب. السيناريو الثاني: إعادة "الحذف" (حذف ما تم التراجع عن حذفه)
            const reDeletedInvoiceIds = currentInvoiceIds.filter(id => !nextInvoiceIds.includes(id));

            if (reDeletedInvoiceIds.length > 0) {
                console.log(`Redo: جاري إعادة حذف ${reDeletedInvoiceIds.length} فاتورة من السحابة...`);
                await Promise.all(reDeletedInvoiceIds.map(id => 
                    window.deleteDoc(window.doc(window.db, "users", userId, "invoices", id)).catch(e => console.error(e))
                ));
            }
        }

        // حفظ التغييرات الشاملة بالسحابة فوراً وبدون تأخير
        await saveSystemToCloud({ immediate: true });

    } catch (error) {
        console.error("حدث خطأ أثناء مزامنة الإعادة بالسحابة:", error);
    } finally {
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
    }
}


function calculateConsignmentValue() {
    const m = (typeof window.money === 'function' ? window.money : Number);
    return m(pendingSales.reduce((sum, sale) => sum + calculateSinglePendingSaleCost(sale), 0));
}
if (typeof window !== 'undefined') window.calculateConsignmentValue = calculateConsignmentValue;
    // ✅✅✅ الكود النهائي والصحيح لدالة loadState (لحل مشكلة الاستيراد) ✅✅✅
function loadState(data, dateString) {
    resetState(); // ابدأ دائمًا بحالة نظيفة

    products = data.products || [];
    assignMissingProductIds();
    suppliers = data.suppliers || [];
    
    // هذا الجزء يعالج السيولة القديمة والجديدة
    if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
        accounts = data.accounts;
    } else {
        console.log("Migrating old 'liquidity' value to new 'accounts' system.");
        accounts = [{ id: 'main', name: 'الخزينة الرئيسية', balance: parseFloat(data.liquidity) || 0 }];
    }

    expenses = parseFloat(data.expenses) || 0;
    recordedLosses = parseFloat(data.recordedLosses) || 0;
    debtors = data.debtors || [];
    debtorProfiles = data.debtorProfiles || [];
    debtCollectionNotes = data.debtCollectionNotes || [];
    migrateDebtorsToProfiles();
    mergeDuplicateDebtorProfiles();
    liabilities = data.liabilities || [];
    
    // Migration: extract hidden liabilities to recordedLosses
    liabilities = liabilities.filter(l => {
        if (l.id === 'hidden-recorded-losses' || l.isHidden) {
            recordedLosses += (Number(l.amount) || 0);
            return false;
        }
        return true;
    });

    migrateLiabilitiesToAdvancedStructure();
    monthlyLiabilities = data.monthlyLiabilities || [];
    totalProfit = parseFloat(data.profit) || 0;
    operationLog = data.log || [];
    pendingSales = data.pendingSales || [];
    liquidityLog = data.liquidityLog || [];
    salesToday = data.salesToday || [];
    serialNumbersLog = data.serialNumbersLog || [];
    inboxTasks = data.inboxTasks || [];

    // الأسطر الخاصة بالاستيراد والمشتريات
    purchaseInvoices = data.purchaseInvoices || [];
        purchaseReturns = data.purchaseReturns || []; 
    pendingPurchases = data.pendingPurchases || [];
    completedReturns = data.completedReturns || [];
    pendingReturns = data.pendingReturns || [];
    pendingReturnsValue = data.pendingReturnsValue || 0;

    // �� السطر المحدث: تحميل الفواتير المعلقة لنظام الاستبدال ERP من البيانات
    window.pendingOrders = data.pendingOrders || [];

    // تحميل السيريالات المستقلة عند فتح اليوم
    if (typeof window.setStandaloneSerials === 'function') {
        window.setStandaloneSerials(data.standaloneSerials || [], true);
    } else {
        window._tempStandaloneSerials = data.standaloneSerials || [];
    }

    currentLoadedDate = dateString;

    // === ترحيل المعرفات الفريدة: إضافة id لأي عنصر قديم بدون id ===
    suppliers.forEach(s => { if (!s.id) s.id = generateId('SUP'); });
    accounts.forEach(a => { if (!a.id) a.id = generateId('ACC'); });
    debtors.forEach(d => { if (!d.id) d.id = generateId('DEBT'); });
    debtorProfiles.forEach(dp => { if (!dp.id) dp.id = generateId('DPROF'); });
    liabilities.forEach(l => { if (!l.id) l.id = generateId('LIA'); });
    monthlyLiabilities.forEach(ml => { if (!ml.id) ml.id = generateId('MLIA'); });
    operationLog.forEach(log => { if (!log.id) log.id = generateId('LOG'); });
    liquidityLog.forEach(ll => { if (!ll.id) ll.id = generateId('LIQ'); });
    salesToday.forEach(s => { if (!s.id) s.id = generateId('SALE'); });
    serialNumbersLog.forEach(s => { if (!s.id) s.id = generateId('SER'); });
    pendingSales.forEach(ps => { if (!ps.id) ps.id = generateId('PSALE'); });
    purchaseInvoices.forEach(pi => { if (!pi.id) pi.id = generateId('PINV'); });
    completedReturns.forEach(cr => { if (!cr.id) cr.id = generateId('RET'); });
    pendingReturns.forEach(pr => { if (!pr.id) pr.id = generateId('PRET'); });
    debtCollectionNotes.forEach(dn => { if (!dn.id) dn.id = generateId('DNOTE'); });
    // === نهاية ترحيل المعرفات ===

    if (typeof window.captureHistoricalBaseline === "function") window.captureHistoricalBaseline(dateString);

    // تصفير سجل التراجع/الإعادة لتجنب التداخل بين الأيام
    stateHistory = []; 
    redoHistory = [];
    updateUndoRedoButtons();
}// ✅✅✅ الكود الجديد والصحيح لدالة resetState ✅✅✅
function resetState() {
    console.log("resetState called - Clearing DAILY transactions only.");

    // تصفير بيانات العمليات اليومية فقط
    expenses = 0;
    recordedLosses = 0;
    totalProfit = 0;
    operationLog = [];
    liquidityLog = [];
    salesToday = [];
    purchaseInvoices = [];
    purchaseReturns = [];
    pendingReturns = [];
    pendingReturnsValue = 0;
    completedReturns = [];
    
    // �� ملاحظة محاسبية: window.pendingOrders لا يتم تصفيرها هنا 
    // لأنها تمثل بضاعة خرجت ولم تُحصل أموالها بعد، فهي أصل مستمر عبر الأيام.

    // تصفير حالات التعديل
    editingPendingSaleId = null;
    editingProductName = null;
    editingSupplierId = null;
    editingMonthlyLiabilityId = null;
    currentLoadedDate = null;

    // تصفير سجل التراجع/الإعادة لتجنب تداخل العمليات بين أيام مختلفة
    stateHistory = [];
    redoHistory = [];
    updateUndoRedoButtons();

    // مسح الرسائل من الواجهة
    const messageElements = document.querySelectorAll('.section-message, .error-message');
    messageElements.forEach(el => {
        el.textContent = '';
        el.classList.remove('visible', 'error', 'success', 'info');
    });
}        function logOperation(type, details){ const timestamp = new Date().toISOString(); operationLog.push({id: generateId("LOG"), timestamp, type, details}); updateLogDisplay() } // Log display updated immediately
        function calculateTotalDebts(){ const total = (typeof window.money === 'function' ? window.money : Number)(debtors.reduce((sum, debtor) => sum + (Number(debtor.amount) || 0), 0)); return total; }
        function calculateTotalLiabilities(){ return (typeof window.money === 'function' ? window.money : Number)(liabilities.reduce((sum, liability) => sum + (Number(liability.amount) || 0), 0)); }
      

function calculateTotals() {
    // 1. قيمة المخزون (بسعر التكلفة)
    const m = (typeof window.money === 'function' ? window.money : Number);
    const totalInventoryValue = m(products.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.costPrice) || 0)), 0));
    
    // 2. قيمة البضاعة المؤقتة (أصل)
    // goodsOnConsignmentValue يقوم بحساب إجمالي تكلفة الفواتير المؤقتة بشكل صحيح
    goodsOnConsignmentValue = 0;
    if (typeof calculateConsignmentValue === 'function') {
        goodsOnConsignmentValue = m(calculateConsignmentValue());
    }

    // 3. الديون والالتزامات
    const totalDebtsValue = m(calculateTotalDebts()); 
    const totalLiabilitiesValue = m(calculateTotalLiabilities()); 

    // 4. السيولة النقدية
    const totalLiquidity = m(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));

    const pendingPurchasesAssetValue = m(pendingPurchases.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0));
    const pendingReturnsAssetValue = m(pendingReturns.reduce((sum, r) => {
        let cost = 0;
        if (r.costOfGoods !== undefined) {
            cost = Number(r.costOfGoods);
        } else if (r.items && r.items.length > 0) {
            cost = r.items.reduce((itemSum, item) => itemSum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)), 0);
        } else {
            // لا نستخدم سعر البيع (returnedAmount) كبديل لأنه يُضخم رأس المال بالأرباح الوهمية
            cost = 0;
        }
        return sum + cost;
    }, 0));

    // 6. العربونات المستلمة (التزام مؤقت)
    const totalPendingDeposits = m(pendingSales.reduce((sum, sale) => sum + (Number(sale.depositPaid) || 0), 0));

    // حساب المبالغ المطلوبة من نظام الاستبدال (الفلوس اللي في الطريق) كأصل
    const pendingOrdersAssetValue = m((window.pendingOrders || []).reduce((sum, order) => {
        return sum + (Number(order.diffAmount) || 0);
    }, 0));

    const totalCapital = m((totalInventoryValue + goodsOnConsignmentValue + totalLiquidity + totalDebtsValue + pendingPurchasesAssetValue + pendingReturnsAssetValue + pendingOrdersAssetValue) - (totalLiabilitiesValue + totalPendingDeposits));

    return {
        totalInventoryValue,
        totalCapital,
        totalDebtsValue,
        totalLiabilitiesValue,
        totalPendingDeposits,
        calculatedPendingReturnsValue: pendingReturnsAssetValue,
        calculatedPendingPurchasesValue: pendingPurchasesAssetValue
    };
}

function calculateTotalPurchasesToday() {
    if (!purchaseInvoices || purchaseInvoices.length === 0) {
        return 0;
    }
    const m = (typeof window.money === 'function' ? window.money : Number);
    return m(purchaseInvoices.reduce((total, invoice) => total + (Number(invoice.grandTotal) || 0), 0));
}

window.mergeDuplicateDebtorProfiles = mergeDuplicateDebtorProfiles;
function mergeDuplicateDebtorProfiles() {
    if (!Array.isArray(debtorProfiles) || debtorProfiles.length === 0) return;

    const profileMap = new Map();
    const duplicateMap = new Map();
    const uniqueProfiles = [];

    debtorProfiles.forEach(profile => {
        const normalizedName = normalizeArabicText(profile.name || "");

        if (!normalizedName) return;

        if (!profileMap.has(normalizedName)) {
            profileMap.set(normalizedName, profile);
            uniqueProfiles.push(profile);
        } else {
            const mainProfile = profileMap.get(normalizedName);

            // احتفظ بعلاقة القديم -> الرئيسي
            duplicateMap.set(profile.id, mainProfile.id);

            // دمج البيانات الناقصة
            if (!mainProfile.phone && profile.phone) mainProfile.phone = profile.phone;
            if (!mainProfile.address && profile.address) mainProfile.address = profile.address;
            if (!mainProfile.generalNotes && profile.generalNotes) mainProfile.generalNotes = profile.generalNotes;
        }
    });

    // تحديث الديون لتشير إلى البروفايل الرئيسي
    debtors.forEach(debt => {
        if (debt.customerId && duplicateMap.has(debt.customerId)) {
            debt.customerId = duplicateMap.get(debt.customerId);
        }
    });

    if (typeof debtCollectionNotes !== 'undefined' && Array.isArray(debtCollectionNotes)) {
        debtCollectionNotes.forEach(note => {
            if (note.customerId && duplicateMap.has(note.customerId)) {
                note.customerId = duplicateMap.get(note.customerId);
            }
        });
    }

    debtorProfiles = uniqueProfiles;
}

// =====================================================================
// START: SAFE GUARD & DOM HELPERS (حماية الواجهة والتعامل الآمن مع العناصر)
// =====================================================================

/**
 * قراءة قيمة أي عنصر واجهة بأمان تام مع قيمة افتراضية دون رمي أي خطأ
 */
window.safeVal = function(id, defaultVal = '') {
    const el = document.getElementById(id);
    return el ? el.value : defaultVal;
};

/**
 * قراءة رقم من أي عنصر واجهة بأمان
 */
window.safeNum = function(id, defaultVal = 0) {
    const el = document.getElementById(id);
    if (!el) return defaultVal;
    const n = parseFloat(el.value);
    return isNaN(n) ? defaultVal : n;
};

/**
 * ربط مستمع حدث بعنصر واجهة بأمان دون رمي خطأ إذا لم يكن العنصر موجوداً
 */
window.safeOn = function(id, event, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, callback);
};

/**
 * تعيين نص أو محتوى لعنصر بأمان
 */
window.safeText = function(id, text = '') {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

/**
 * فحص الاتساق المحاسبي العام (Accounting Integrity Guard)
 * يتأكد من تطابق رصيد الخزائن والديون وقيم المنتجات دون توقف النظام
 */
window.verifyAccountingIntegrity = function() {
    let issuesFound = 0;
    // 1. فحص وجود حساب رئيسي
    if (Array.isArray(window.accounts) && window.accounts.length === 0) {
        window.accounts.push({ id: 'main', name: 'الخزينة الرئيسية', balance: 0 });
        issuesFound++;
    }
    // 2. فحص سيريالات بدون حالة
    if (Array.isArray(window.serialNumbersLog)) {
        window.serialNumbersLog.forEach(s => {
            if (!s.status) { s.status = 'in_stock'; issuesFound++; }
        });
    }
    // 3. فحص قيم NaN في الأرصدة
    if (Array.isArray(window.accounts)) {
        window.accounts.forEach(a => {
            if (isNaN(a.balance)) { a.balance = 0; issuesFound++; }
        });
    }
    if (issuesFound > 0) {
        console.warn(`[Integrity Guard] تم ضبط وتصحيح ${issuesFound} نقطة في اتساق البيانات.`);
    }
};

/**
 * حارس الأخطاء العام (Global Runtime Error Boundary)
 * يمنع انهيار الصفحة أو تجمد الأزرار في حال حدوث أي خطأ تشغيلي غير متوقع
 */
if (typeof window !== 'undefined' && !window._erpErrorGuardInstalled) {
    window._erpErrorGuardInstalled = true;
    window.addEventListener('error', function(e) {
        // تجاهل أخطاء الإضافات الخارجية للمتصفح
        if (e.filename && !e.filename.includes(window.location.host) && !e.filename.includes('localhost') && !e.filename.includes('file:')) {
            return;
        }
        console.error("🛡️ [ERP Guard] خطأ تم اعتراضه بأمان:", e.message, "في:", e.filename, ":", e.lineno);
    });
    window.addEventListener('unhandledrejection', function(e) {
        console.warn("🛡️ [ERP Guard] استثناء وعد غير معالج:", e.reason);
    });
}
// =====================================================================
// END: SAFE GUARD & DOM HELPERS
// =====================================================================

// =====================================================================
// START: UNIFIED FINANCIAL TRANSACTION COORDINATOR (FinanceTx)
// =====================================================================
window.FinanceTx = {
    /**
     * تسجيل حركة سيولة موحدة وخصم/إيداع الخزينة وحفظ السحابة تلقائياً
     */
    recordLiquidityMovement: function(options) {
        if (!options || typeof options !== 'object') return false;
        const { type, amount, accountId, reason, description } = options;
        const numAmount = Number(amount) || 0;
        if (numAmount <= 0) return false;
        
        let account = null;
        if (Array.isArray(window.accounts)) {
            account = accountId ? window.accounts.find(a => a.id === accountId) : window.accounts.find(a => a.id === 'main');
            if (!account && window.accounts.length > 0) account = window.accounts[0];
        }
        
        if (account) {
            if (type === 'add') {
                account.balance = window.money((Number(account.balance) || 0) + numAmount);
            } else if (type === 'remove') {
                account.balance = window.money((Number(account.balance) || 0) - numAmount);
            }
        }
        
        const entry = {
            id: generateGlobalID('liq'),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            type: type,
            amount: numAmount,
            description: description || reason || 'حركة سيولة',
            reason: reason || description || 'حركة سيولة',
            accountId: account ? account.id : 'unknown',
            accountName: account ? account.name : 'غير محدد',
            account: account ? account.name : 'غير محدد',
            currentBalance: account ? account.balance : (typeof totalLiquidity !== 'undefined' ? totalLiquidity : 0)
        };
        
        if (Array.isArray(window.liquidityLog)) {
            window.liquidityLog.push(entry);
        }
        
        if (typeof window.saveStateToHistory === 'function') window.saveStateToHistory();
        if (typeof window.saveSystemToCloud === 'function') window.saveSystemToCloud();
        if (typeof window.updateUI === 'function') window.updateUI();
        return true;
    },
    
    /**
     * استرجاع السيريالات المرتبطة بقائمة منتجات إلى حالة in_stock
     */
    restoreSerials: function(items) {
        if (!Array.isArray(items) || !Array.isArray(window.serialNumbersLog)) return 0;
        let count = 0;
        const restore = (sn) => {
            if (!sn) return;
            const log = window.serialNumbersLog.find(l => l.serial === sn);
            if (log) { log.status = 'in_stock'; count++; }
        };
        items.forEach(item => {
            if (item.serial) restore(item.serial);
            if (item.serialNumber) restore(item.serialNumber);
            if (Array.isArray(item.serials)) item.serials.forEach(restore);
        });
        return count;
    }
};
// =====================================================================
// END: UNIFIED FINANCIAL TRANSACTION COORDINATOR (FinanceTx)
// =====================================================================
