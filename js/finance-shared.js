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
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return '0 ج.م';
    return (numAmount % 1 === 0 ? numAmount : numAmount.toFixed(1)) + ' ج.م';
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
    const el = document.getElementById('global-message');
    if (!el) return;
    el.textContent = message;
    el.className = 'section-message ' + (isError ? 'error-message' : 'success-message');
    el.style.display = 'block';
    clearTimeout(window._globalMsgTimer);
    window._globalMsgTimer = setTimeout(() => {
        el.style.display = 'none';
        el.textContent = '';
    }, isError ? 6000 : 3500);
};

// ── 5. توليد معرّف فريد ───────────────────────────────────────────────────────
window.generateGlobalID = function generateGlobalID(prefix = 'id') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
};

console.log('✅ finance-shared.js جاهز — الدوال المشتركة محمّلة.');
