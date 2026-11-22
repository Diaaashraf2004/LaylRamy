async function saveCurrentStateByDate(dateString, immediate = false, options = {}) {
    if (window._loadFailed || window._serialsLoadFailed) { console.warn('الحفظ متوقف: فشل تحميل البيانات'); return false; }

    // Local backup preparation moved UP
    const safePendingReturnsValue = (typeof pendingReturnsValue !== 'undefined') ? pendingReturnsValue : 0;
    const safeBackupIndex = (typeof backupSlotIndex !== 'undefined') ? backupSlotIndex : 0;

    const stateToSave = {
        month: dateString.substring(0, 7),
        products: products || [],
        suppliers: suppliers || [],
        accounts: accounts || [],
        expenses: expenses || 0,
        recordedLosses: recordedLosses || 0,
        debtors: debtors || [],
        liabilities: liabilities || [],
        monthlyLiabilities: monthlyLiabilities || [],
        profit: totalProfit || 0,
        log: operationLog || [],
        pendingSales: pendingSales || [],
        liquidityLog: liquidityLog || [],
        salesToday: salesToday || [],
        serialNumbersLog: serialNumbersLog || [],
        inboxTasks: inboxTasks || [],
        purchaseInvoices: purchaseInvoices || [],
        purchaseReturns: purchaseReturns || [],
        pendingPurchases: pendingPurchases || [],
        completedReturns: completedReturns || [],
        pendingReturns: pendingReturns || [],
        pendingReturnsValue: safePendingReturnsValue,
        debtorProfiles: debtorProfiles || [],
        debtCollectionNotes: debtCollectionNotes || [],
        pendingOrders: window.pendingOrders || [],
        standaloneSerials: typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : [],
        savedAt: new Date().toISOString(),
        savedForDate: dateString
    };

    // 🛡️ حارس حماية الحفظ السحابي من انكماش أو تفريغ البيانات الحرجة
    if (typeof window.SaveGuard !== 'undefined' && typeof window.SaveGuard.canSaveState === 'function') {
        if (!window.SaveGuard.canSaveState(stateToSave)) {
            const hasValidAccounts = Array.isArray(stateToSave.accounts) && stateToSave.accounts.length > 0;
            if (options && options.isManualUserSave && hasValidAccounts && typeof window.SaveGuard.allowShrinkOnce === 'function') {
                const approveShrink = confirm(
                    "⚠️ تنبيه حماية البيانات (SaveGuard):\n\n" +
                    "لاحظ النظام نقصاً كبيراً (أكثر من 50%) في عدد عناصر إحدى القوائم مقارنة ببداية الجلسة.\n" +
                    "إذا كنت قد قمت بهذا الحذف أو التصفية عن قصد، اضغط (موافق) لاعتماد الحفظ السحابي، أو (إلغاء) لإيقاف الحفظ."
                );
                if (approveShrink) {
                    window.SaveGuard.allowShrinkOnce();
                } else {
                    console.error('[saveCurrentStateByDate] تم إلغاء الحفظ اليدوي بواسطة المستخدم بعد تنبيه SaveGuard.');
                    return false;
                }
            } else {
                console.error('[saveCurrentStateByDate] تم إيقاف الحفظ لمنع تفريغ أو انكماش البيانات الحرجة.');
                return false;
            }
        }
    }

    try {
        const fullLocalBackup = { ...stateToSave }; 
        const backupKey = `goodsMgmt_backup_${dateString}_slot_${safeBackupIndex}`;
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("goodsMgmt_backup_") && !key.includes(dateString)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        saveData(backupKey, fullLocalBackup);
        
        if (typeof backupSlotIndex !== 'undefined') {
            backupSlotIndex = (backupSlotIndex + 1) % MAX_BACKUP_SLOTS;
        }
    } catch (e) {
        console.warn("Local backup warning (silent):", e);
        if (e && (e.name === 'QuotaExceededError' || String(e.message || '').toLowerCase().includes('quota'))) {
            alert("خطأ حرج: الذاكرة المحلية للمتصفح ممتلئة تماماً ولم يتم الحفظ المحلي! يرجى إفراغ مساحة أو التأكد من اتصال الإنترنت لتجنب ضياع البيانات.");
        }
    }

    // 1. التحقق من تسجيل الدخول
    if (!window.currentUser) {
        showGlobalMessage("تنبيه: أنت غير مسجل دخول. يتم الحفظ على الجهاز فقط.", false, true);
        return false;
    }
    
    // 2. توحيد مسار الحفظ السحابي عبر البوابة الموحدة saveSystemToCloud (تمنع تصادم المؤقتات وتفرّغ السيريالات وتلتزم بالحراس)
    if (dateString) {
        currentLoadedDate = dateString;
        window.currentLoadedDate = dateString;
    }
    if (window._saveTimeout) {
        clearTimeout(window._saveTimeout);
        window._saveTimeout = null;
    }
    window._pendingSaveFunction = null;

    if (typeof window.saveSystemToCloud === 'function') {
        try {
            await window.saveSystemToCloud({ immediate: Boolean(immediate) });
            window._autoSaveDirty = false;
            return true;
        } catch (err) {
            console.error('[saveCurrentStateByDate] Unified cloud save failed:', err);
            return false;
        }
    }
    return false;
}

function openBackupHistoryModal() {
    const modal = document.getElementById('backupHistoryModal');
    const listContainer = document.getElementById('backup-history-list');
    
    if (!modal || !listContainer) return;

    // تحديد التاريخ المستهدف (أو استخدام تاريخ اليوم كاحتياطي)
    let targetDate = currentLoadedDate;
    if (!targetDate) {
        const now = new Date();
        // تنسيق التاريخ يدوياً لضمان التوافق (YYYY-MM-DD)
        const offset = now.getTimezoneOffset() * 60000;
        targetDate = typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    }

    console.log(`Chrome-Safe Backup Search for: ${targetDate}`);
    
    let backups = [];

    // �� التغيير الجذري: مسح شامل لكل مفاتيح الذاكرة بدلاً من التخمين
    // هذا يتجاوز مشاكل ترتيب المفاتيح في كروم
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // هل المفتاح يخص برنامجنا ويخص التاريخ المطلوب؟
        if (key && key.includes("goodsMgmt_backup_") && key.includes(targetDate)) {
            try {
                const raw = localStorage.getItem(key);
                const data = JSON.parse(raw);
                
                if (data && data.savedAt) {
                    // حساب حجم البيانات
                    const infoCount = (data.products?.length || 0) + (data.log?.length || 0);
                    
                    backups.push({
                        key: key,
                        time: new Date(data.savedAt),
                        info: infoCount
                    });
                }
            } catch (e) {
                console.warn("ملف تالف تم تجاهله:", key);
            }
        }
    }

    // ترتيب النسخ: الأحدث أولاً
    backups.sort((a, b) => b.time - a.time);

    // عرض القائمة
    if (backups.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-4">
                <p class="text-gray-500 mb-2">لا توجد نسخ لهذا اليوم (${targetDate}).</p>
                <small class="text-gray-400">تأكد أنك قمت بعملية حفظ واحدة على الأقل.</small>
            </div>`;
    } else {
        listContainer.innerHTML = backups.map(backup => `
            <div class="flex flex-wrap justify-between items-center gap-2 p-3 mb-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition">
                <div>
                    <div class="font-bold text-gray-800" style="font-size: 1rem;">
                        ⏰ ${backup.time.toLocaleTimeString('ar-EG')}
                    </div>
                    <div class="text-xs text-gray-600 mt-1">
                        محتوى النسخة: <b>${backup.info}</b> عنصر
                    </div>
                </div>
                <button type="button" data-backup-key="${backup.key}" class="restore-backup-btn-action" style="
                    background-color: #16a34a; 
                    color: white; 
                    font-weight: bold; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    border: none; 
                    cursor: pointer;
                    font-size: 0.85rem;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">
                    استعادة فورية
                </button>
            </div>
        `).join('');
    }
    
    modal.style.display = 'block';
}

// 2. تفعيل الأزرار بتقنية (Event Delegation) لتعمل على كروم
// ضع هذا الجزء مرة واحدة في نهاية الملف أو داخل initializeApp
document.addEventListener('click', async function(e) {
    // أ: التعامل مع زر "استعادة فورية"
    if (e.target.classList.contains('restore-backup-btn-action')) {
        const btn = e.target;
        const key = btn.dataset.backupKey;
        
        if (confirm("هل أنت متأكد من استعادة هذه النسخة؟\nسيتم استبدال البيانات الحالية.")) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const data = JSON.parse(raw);
                    // استخدام التاريخ المحفوظ أو الحالي
                    const dateStr = data.savedForDate || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
                    
                    console.log("Restoring on Chrome logic:", key);
                    
                    // تحميل البيانات
                    window._loadFailed = false;
                    window._serialsLoadFailed = false;
                    loadState(data, dateStr);
                    updateUI();
                    
                    // إغلاق النافذة
                    document.getElementById('backupHistoryModal').style.display = 'none';
                    
                    // التصريح بالانكماش لمرة واحدة ثم الحفظ الفوري بالسحابة (شاملاً السيريالات)
                    if (window.SaveGuard && typeof window.SaveGuard.allowShrinkOnce === 'function') {
                        window.SaveGuard.allowShrinkOnce();
                    }
                    const savedOk = await saveCurrentStateByDate(dateStr, true);
                    if (savedOk) {
                        alert("تمت الاستعادة والحفظ في السحابة بنجاح!");
                    } else {
                        alert("تم تحميل النسخة محلياً ولكن تعذر تثبيتها في السحابة. يرجى التحقق من الاتصال.");
                    }
                }
            } catch (err) {
                alert("حدث خطأ: " + err.message);
            }
        }
    }

    // ب: التعامل مع فتح النافذة
    if (e.target.id === 'open-backup-history-button') {
        openBackupHistoryModal();
    }

    // ج: التعامل مع إغلاق النافذة
    if (e.target.classList.contains('modal') || 
        e.target.closest('.modal-close-btn') || 
        e.target.closest('.modal-close-btn-footer')) {
        const modal = document.getElementById('backupHistoryModal');
        if (modal && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    }
});

// دالة لإغلاق نافذة سجل النسخ الاحتياطية
function closeBackupHistoryModal() {
    const modal = d('backupHistoryModal');
    if (modal) modal.style.display = 'none';
}
// دالة لتشغيل أو إيقاف الحفظ التلقائي
