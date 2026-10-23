/**
 * finance-shared.js — الدوال المشتركة بين جميع ملفات النظام
 * ============================================================
 * هذا الملف يحتوي فقط على الدوال التي تُستخدم في أكثر من ملف.
 * لا يُسمح بوضع منطق خاص بقسم معين هنا.
 *
 * الدوال المصدّرة على window:
 *   - formatCurrency(amount)        → تنسيق العملة
 *   - normalizeArabicText(text)     → توحيد كتابة الحروف العربية
 *   - escapeHTML(str)               → تأمين المدخلات ضد XSS
 *   - showGlobalMessage(msg, isErr) → عرض رسائل النظام الموحدة
 *   - generateGlobalID(prefix)      → توليد معرّف فريد
 *
 * ⚠️  لا تعدّل هذا الملف إلا إذا أردت تغيير سلوك مشترك بين كل الأقسام.
 */

// ── 1. تنسيق العملة ──────────────────────────────────────────────────────────
window.formatCurrency = function formatCurrency(amount) {
    const n = Number(amount);
    if (isNaN(n)) return '0 ج.م';
    return Number(n.toFixed(2)).toString() + ' ج.م';
};

// ── 2. توحيد النص العربي للبحث ───────────────────────────────────────────────
window.normalizeArabicText = function normalizeArabicText(text) {
    if (!text) return '';
    return String(text)
        .trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ');
};

// ── 3. تأمين المدخلات ضد XSS ─────────────────────────────────────────────────
window.escapeHTML = function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>"'/]/g, function (s) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[s];
    });
};

// ── 4. رسائل النظام الموحدة ───────────────────────────────────────────────────
window.showGlobalMessage = function showGlobalMessage(message, isError = false) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('global-message');
    if (!el && typeof document !== 'undefined' && document.body) {
        el = document.createElement('div');
        el.id = 'global-message';
        el.style.position = 'fixed';
        el.style.top = '20px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.zIndex = '99999';
        el.style.padding = '12px 24px';
        el.style.borderRadius = '8px';
        el.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)';
        el.style.fontWeight = '700';
        el.style.fontFamily = 'inherit';
        el.style.direction = 'rtl';
        document.body.appendChild(el);
    }
    if (!el) return;
    el.textContent = message;
    el.className = 'section-message ' + (isError ? 'error-message' : 'success-message');
    el.style.display = 'block';
    clearTimeout(window._globalMsgTimer);
    window._globalMsgTimer = setTimeout(() => {
        el.style.display = 'none';
        el.textContent = '';
        el.classList.remove('visible');
        el.style.removeProperty('color');
        el.style.removeProperty('background-color');
        el.style.removeProperty('border-color');
    }, isError ? 6000 : 3500);
};

// ── 4.1. نظام التنبيهات ونوافذ الحوار غير المانعة (Non-blocking Dialogs) ──────
window.safeAlert = function safeAlert(message, type = 'info') {
    if (typeof window !== 'undefined' && typeof window.showGlobalMessage === 'function') {
        window.showGlobalMessage(message, type === 'error');
    } else if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[System Alert - ${type}]:`, message);
    }
    return Promise.resolve(true);
};
window.showCustomAlert = window.safeAlert;

window.showConfirm = function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const title = options.title || 'تأكيد العملية';
        const confirmText = options.confirmText || 'تأكيد';
        const cancelText = options.cancelText || 'إلغاء';
        const isDanger = options.isDanger || false;

        if (typeof document === 'undefined' || !document.body) {
            const fallback = (typeof globalThis !== 'undefined' && typeof globalThis.__mockConfirmResponse !== 'undefined')
                ? Boolean(globalThis.__mockConfirmResponse)
                : true;
            return resolve(fallback);
        }

        const existingModal = document.getElementById('custom-confirm-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-confirm-modal';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.direction = 'rtl';
        overlay.style.fontFamily = 'inherit';
        overlay.style.padding = '16px';

        const box = document.createElement('div');
        box.style.background = '#ffffff';
        box.style.color = '#1e293b';
        box.style.borderRadius = '14px';
        box.style.padding = '24px';
        box.style.maxWidth = '420px';
        box.style.width = '100%';
        box.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)';
        box.style.border = '1px solid #e2e8f0';

        const h3 = document.createElement('h3');
        h3.style.margin = '0 0 12px 0';
        h3.style.fontSize = '18px';
        h3.style.fontWeight = '700';
        h3.style.color = isDanger ? '#dc2626' : '#0f172a';
        h3.textContent = title;

        const p = document.createElement('p');
        p.style.margin = '0 0 20px 0';
        p.style.fontSize = '15px';
        p.style.lineHeight = '1.6';
        p.style.color = '#475569';
        p.style.whiteSpace = 'pre-wrap';
        p.textContent = message;

        const btns = document.createElement('div');
        btns.style.display = 'flex';
        btns.style.gap = '10px';
        btns.style.justifyContent = 'flex-end';

        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.textContent = cancelText;
        btnCancel.style.padding = '9px 18px';
        btnCancel.style.borderRadius = '8px';
        btnCancel.style.border = '1px solid #cbd5e1';
        btnCancel.style.background = '#f8fafc';
        btnCancel.style.color = '#475569';
        btnCancel.style.fontSize = '14px';
        btnCancel.style.fontWeight = '600';
        btnCancel.style.cursor = 'pointer';

        const btnConfirm = document.createElement('button');
        btnConfirm.type = 'button';
        btnConfirm.textContent = confirmText;
        btnConfirm.style.padding = '9px 18px';
        btnConfirm.style.borderRadius = '8px';
        btnConfirm.style.border = 'none';
        btnConfirm.style.background = isDanger ? '#dc2626' : '#2563eb';
        btnConfirm.style.color = '#ffffff';
        btnConfirm.style.fontSize = '14px';
        btnConfirm.style.fontWeight = '600';
        btnConfirm.style.cursor = 'pointer';

        const cleanup = (result) => {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(result);
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') cleanup(false);
            else if (e.key === 'Enter') cleanup(true);
        };

        btnConfirm.onclick = () => cleanup(true);
        btnCancel.onclick = () => cleanup(false);
        overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };

        btns.appendChild(btnConfirm);
        btns.appendChild(btnCancel);
        box.appendChild(h3);
        box.appendChild(p);
        box.appendChild(btns);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.addEventListener('keydown', onKeyDown);
        btnConfirm.focus();
    });
};
window.showCustomConfirm = window.showConfirm;

window.showPrompt = function showPrompt(message, defaultValue = '', options = {}) {
    return new Promise((resolve) => {
        const title = options.title || 'إدخال بيانات';
        const confirmText = options.confirmText || 'موافق';
        const cancelText = options.cancelText || 'إلغاء';
        const inputType = options.inputType || 'text';
        const placeholder = options.placeholder || '';

        if (typeof document === 'undefined' || !document.body) {
            const fallback = (typeof globalThis !== 'undefined' && typeof globalThis.__mockPromptResponse !== 'undefined')
                ? globalThis.__mockPromptResponse
                : (defaultValue || null);
            return resolve(fallback);
        }

        const existingModal = document.getElementById('custom-prompt-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-prompt-modal';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.direction = 'rtl';
        overlay.style.fontFamily = 'inherit';
        overlay.style.padding = '16px';

        const box = document.createElement('div');
        box.style.background = '#ffffff';
        box.style.color = '#1e293b';
        box.style.borderRadius = '14px';
        box.style.padding = '24px';
        box.style.maxWidth = '420px';
        box.style.width = '100%';
        box.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2)';
        box.style.border = '1px solid #e2e8f0';

        const h3 = document.createElement('h3');
        h3.style.margin = '0 0 12px 0';
        h3.style.fontSize = '18px';
        h3.style.fontWeight = '700';
        h3.textContent = title;

        const p = document.createElement('p');
        p.style.margin = '0 0 12px 0';
        p.style.fontSize = '14px';
        p.style.color = '#475569';
        p.textContent = message;

        const input = document.createElement('input');
        input.type = inputType;
        input.value = defaultValue;
        input.placeholder = placeholder;
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.padding = '10px 12px';
        input.style.fontSize = '15px';
        input.style.borderRadius = '8px';
        input.style.border = '1px solid #cbd5e1';
        input.style.marginBottom = '20px';
        input.style.outline = 'none';

        const btns = document.createElement('div');
        btns.style.display = 'flex';
        btns.style.gap = '10px';
        btns.style.justifyContent = 'flex-end';

        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.textContent = cancelText;
        btnCancel.style.padding = '9px 18px';
        btnCancel.style.borderRadius = '8px';
        btnCancel.style.border = '1px solid #cbd5e1';
        btnCancel.style.background = '#f8fafc';
        btnCancel.style.color = '#475569';
        btnCancel.style.fontSize = '14px';
        btnCancel.style.fontWeight = '600';
        btnCancel.style.cursor = 'pointer';

        const btnConfirm = document.createElement('button');
        btnConfirm.type = 'button';
        btnConfirm.textContent = confirmText;
        btnConfirm.style.padding = '9px 18px';
        btnConfirm.style.borderRadius = '8px';
        btnConfirm.style.border = 'none';
        btnConfirm.style.background = '#2563eb';
        btnConfirm.style.color = '#ffffff';
        btnConfirm.style.fontSize = '14px';
        btnConfirm.style.fontWeight = '600';
        btnConfirm.style.cursor = 'pointer';

        const cleanup = (result) => {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(result);
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') cleanup(null);
            else if (e.key === 'Enter') cleanup(input.value.trim());
        };

        btnConfirm.onclick = () => cleanup(input.value.trim());
        btnCancel.onclick = () => cleanup(null);
        overlay.onclick = (e) => { if (e.target === overlay) cleanup(null); };

        btns.appendChild(btnConfirm);
        btns.appendChild(btnCancel);
        box.appendChild(h3);
        box.appendChild(p);
        box.appendChild(input);
        box.appendChild(btns);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.addEventListener('keydown', onKeyDown);
        input.focus();
        input.select();
    });
};
window.showCustomPrompt = window.showPrompt;

// ── 5. توليد معرّف فريد موحد مشفر (Crypto UUID Generator) ───────────────────
window.generateGlobalID = function generateGlobalID(prefix = 'id') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return prefix + '_' + crypto.randomUUID();
    }
    const timestamp = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    return prefix + '_' + timestamp + '_' + rand;
};
window.generateUniqueId = window.generateGlobalID;
window.generateId = window.generateGlobalID;

console.log('✅ finance-shared.js جاهز — الدوال المشتركة محمّلة.');

// دالة موحدة لتقريب الأرقام المالية لتفادي أخطاء الأعداد العشرية (مثال: 0.1 + 0.2 = 0.30000000000000004)
window.money = function(value) {
    const num = Number(value); if (isNaN(num)) return 0; return Math.round((num + Number.EPSILON) * 100) / 100;
};

// ── 6. توحيد تواريخ النظام بتوقيت القاهرة (Cairo Timezone) ──────────────────────
window.getCairoDateString = function getCairoDateString(d) {
    if (!d) d = new Date();
    if (typeof d === 'string') {
        const trimmed = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        d = new Date(trimmed);
    } else if (typeof d === 'number') {
        d = new Date(d);
    } else if (d && typeof d.getTime === 'function' && !(d instanceof Date)) {
        d = new Date(d.getTime());
    }
    if (!d || typeof d.getTime !== 'function' || isNaN(d.getTime())) {
        return '';
    }
    try {
        return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    } catch (e) {
        const cairoTime = new Date(d.getTime() + (2 * 60 + (d.getTimezoneOffset() || 0)) * 60000);
        const y = cairoTime.getFullYear();
        const m = String(cairoTime.getMonth() + 1).padStart(2, '0');
        const day = String(cairoTime.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
};
window.toCairoDateString = window.getCairoDateString;

window.getTodayDateString = function getTodayDateString() {
    return window.getCairoDateString(new Date());
};

window.formatDateForDisplay = function formatDateForDisplay(dateString) {
    if (!dateString || typeof dateString !== 'string') return 'غير محدد';
    const cleanDate = typeof window.getCairoDateString === 'function' ? window.getCairoDateString(dateString) : (dateString.includes('T') ? dateString.substring(0, 10) : dateString.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return 'غير محدد';
    try {
        const date = new Date(cleanDate + 'T00:00:00');
        const options = { timeZone: 'Africa/Cairo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('ar-EG', options);
    } catch (e) {
        return cleanDate;
    }
};

window.formatDateTime = function formatDateTime(isoString) {
    if (!isoString) return '';
    try {
        return new Date(isoString).toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return isoString;
    }
};

window._sharedFormatCurrency = window.formatCurrency;
window._sharedNormalizeArabicText = window.normalizeArabicText;
window._sharedFormatDateForDisplay = window.formatDateForDisplay;
window._sharedFormatDateTime = window.formatDateTime;
window._sharedGenerateGlobalID = window.generateGlobalID;

// ── 7. نظام المعاملات الذرية وحماية الحالة من الانهيار (State Transactions) ───
window.createStateTransaction = function createStateTransaction() {
    const getArr = (name) => {
        const val = (typeof window !== 'undefined' && typeof window[name] !== 'undefined' && Array.isArray(window[name])) 
            ? window[name] 
            : ((typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined' && Array.isArray(globalThis[name])) ? globalThis[name] : null);
        return val ? JSON.parse(JSON.stringify(val)) : [];
    };
    const getNum = (name) => {
        if (typeof window !== 'undefined' && typeof window[name] !== 'undefined') return window[name];
        if (typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined') return globalThis[name];
        return 0;
    };

    const snap = {
        products: getArr('products'),
        accounts: getArr('accounts'),
        debtors: getArr('debtors'),
        debtorProfiles: getArr('debtorProfiles'),
        debtCollectionNotes: getArr('debtCollectionNotes'),
        liabilities: getArr('liabilities'),
        monthlyLiabilities: getArr('monthlyLiabilities'),
        suppliers: getArr('suppliers'),
        salesToday: getArr('salesToday'),
        pendingSales: getArr('pendingSales'),
        pendingOrders: getArr('pendingOrders'),
        purchaseInvoices: getArr('purchaseInvoices'),
        purchaseReturns: getArr('purchaseReturns'),
        pendingPurchases: getArr('pendingPurchases'),
        completedReturns: getArr('completedReturns'),
        pendingReturns: getArr('pendingReturns'),
        pendingReturnsValue: getNum('pendingReturnsValue'),
        liquidityLog: getArr('liquidityLog'),
        serialNumbersLog: getArr('serialNumbersLog'),
        inboxTasks: getArr('inboxTasks'),
        operationLog: getArr('operationLog').length ? getArr('operationLog') : getArr('log'),
        standaloneSerials: (typeof window !== 'undefined' && typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : (typeof window !== 'undefined' && window._tempStandaloneSerials ? window._tempStandaloneSerials : [])),
        expenses: getNum('expenses'),
        recordedLosses: getNum('recordedLosses'),
        totalProfit: getNum('totalProfit')
    };

    const rollbackActions = [];

    return {
        addRollbackAction(fn) {
            if (typeof fn === 'function') rollbackActions.push(fn);
        },
        commit() {
            rollbackActions.length = 0;
        },
        async rollback() {
            try {
                const restoreArr = (name, data) => {
                    const target = (typeof window !== 'undefined' && typeof window[name] !== 'undefined' && Array.isArray(window[name])) 
                        ? window[name] 
                        : ((typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined' && Array.isArray(globalThis[name])) ? globalThis[name] : null);
                    if (target) { target.length = 0; target.push(...data); }
                };
                const restoreNum = (name, val) => {
                    if (typeof window !== 'undefined' && typeof window[name] !== 'undefined') window[name] = val;
                    if (typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined') globalThis[name] = val;
                };

                restoreArr('products', snap.products);
                restoreArr('accounts', snap.accounts);
                restoreArr('debtors', snap.debtors);
                restoreArr('debtorProfiles', snap.debtorProfiles);
                restoreArr('debtCollectionNotes', snap.debtCollectionNotes);
                restoreArr('liabilities', snap.liabilities);
                restoreArr('monthlyLiabilities', snap.monthlyLiabilities);
                restoreArr('suppliers', snap.suppliers);
                restoreArr('salesToday', snap.salesToday);
                restoreArr('pendingSales', snap.pendingSales);
                restoreArr('pendingOrders', snap.pendingOrders);
                restoreArr('purchaseInvoices', snap.purchaseInvoices);
                restoreArr('purchaseReturns', snap.purchaseReturns);
                restoreArr('pendingPurchases', snap.pendingPurchases);
                restoreArr('completedReturns', snap.completedReturns);
                restoreArr('pendingReturns', snap.pendingReturns);
                restoreArr('liquidityLog', snap.liquidityLog);
                restoreArr('serialNumbersLog', snap.serialNumbersLog);
                restoreArr('inboxTasks', snap.inboxTasks);
                restoreArr('operationLog', snap.operationLog);

                restoreNum('pendingReturnsValue', snap.pendingReturnsValue);
                restoreNum('expenses', snap.expenses);
                restoreNum('recordedLosses', snap.recordedLosses);
                restoreNum('totalProfit', snap.totalProfit);

                if (typeof window !== 'undefined' && typeof window._tempStandaloneSerials !== 'undefined') {
                    window._tempStandaloneSerials = JSON.parse(JSON.stringify(snap.standaloneSerials));
                }

                // تنفيذ عمليات التراجع السحابية المسجلة بالتسلسل العكسي
                for (let i = rollbackActions.length - 1; i >= 0; i--) {
                    try {
                        await rollbackActions[i]();
                    } catch (actionErr) {
                        console.error("❌ [Transaction Compensation Error]:", actionErr);
                    }
                }

                if (typeof updateUI === 'function') updateUI();
                else if (typeof window !== 'undefined' && typeof window.updateUI === 'function') window.updateUI();
                console.warn("⚠️ [Transaction Rollback] تم التراجع الشامل عن التعديلات وإعادة حالة الذاكرة والسحابة كما كانت.");
            } catch (e) {
                console.error("❌ [Transaction Rollback Error] فشل التراجع التلقائي:", e);
            }
        }
    };
};

