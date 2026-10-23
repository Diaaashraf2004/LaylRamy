/**
 * نظام الاستبدال وإدارة الفواتير المعلقة (ERP V10.5)
 * التحديث: إصلاح أخطاء الـ Null Pointer وتأمين دوال الحساب لضمان استقرار النظام.
 */
// targetOrderId moved to js/exchanges/exchanges-ui.js






document.addEventListener("DOMContentLoaded", function() {
    window.pendingOrders = window.pendingOrders || [];
    initExchangeSystem();
    setupUndoRedoWatcher();
});





















/**
 * دالة الحساب المحدثة مع تأمين ضد أخطاء الـ Null
 */





















// Auto-select current month for expenses report on load
document.addEventListener('DOMContentLoaded', () => {
    const m = document.getElementById('exp-report-month-year');
    if (m && !m.value) {
        const t = new Date();
        m.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0');
    }
});


// =========================================
// المصروفات - منقول لزيادة السرعة
// =========================================




// =======================
// مراحل الطلبات المعلقة والفواتير
// =======================














