async function saveCurrentStateByDate(dateString, immediate = false) {
    if (window._loadFailed) { console.warn('الحفظ متوقف: فشل تحميل البيانات'); return; }
    if (typeof window.syncDualWriteToDB === "function") await window.syncDualWriteToDB();
    const canWrite = await window.SessionGuard.assertCanWrite();
    if (!canWrite) {
        if (typeof autoSaveTimer !== 'undefined' && autoSaveTimer) {
            clearInterval(autoSaveTimer);
        }
        return;
    }
    
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
            console.error('[saveCurrentStateByDate] تم إيقاف الحفظ لمنع تفريغ أو انكماش البيانات الحرجة.');
            return false;
        }
    }

    const sanitizedState = sanitizeDataForFirebase(stateToSave);

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
        if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
            alert("خطأ حرج: الذاكرة المحلية للمتصفح ممتلئة تماماً ولم يتم الحفظ! يرجى إفراغ مساحة أو التأكد من اتصال الإنترنت لتجنب ضياع البيانات.");
            window.isSavingDataLock = false;
        }
    }

    // 1. التحقق من تسجيل الدخول
    if (!window.currentUser) {
        showGlobalMessage("تنبيه: أنت غير مسجل دخول. يتم الحفظ على الجهاز فقط.", false, true);
        return;
    }
    
    const userId = window.currentUser.uid;

    // 2. الحفظ السحابي (Smart Debounce Sync)
    if (window._saveTimeout) clearTimeout(window._saveTimeout);
    window._pendingSaveDate = dateString;

    
    // �� تحديث الملخص
        const latestBalancesSummary = {
            products: products || [],
            suppliers: suppliers || [],
            accounts: accounts || [],
            debtors: debtors || [],
            liabilities: liabilities || [],
            monthlyLiabilities: monthlyLiabilities || [],
            pendingSales: pendingSales || [],
            serialNumbersLog: serialNumbersLog || [],
            inboxTasks: inboxTasks || [],
            pendingPurchases: pendingPurchases || [],
            pendingReturns: pendingReturns || [],
            pendingReturnsValue: safePendingReturnsValue,
            pendingOrders: window.pendingOrders || [], 
            summaryForDate: dateString,
            lastUpdated: new Date().toISOString()
        };
        
        const sanitizedSummary = sanitizeDataForFirebase(latestBalancesSummary);

    window._pendingSaveFunction = async () => {
        try {
            window._saveTimeout = null;
            console.log(`[Smart Sync] Executing debounced cloud save for ${window._pendingSaveDate}...`);
            const docRef = window.doc(window.db, "users", userId, "days", window._pendingSaveDate);
            await window.setDoc(docRef, sanitizedState, { merge: true });

        
        const summaryDocRef = window.doc(window.db, "users", userId, "summaries", "latestBalances");

        const todayStr = typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
        if (dateString === todayStr) {
            if (isStateMeaningful(latestBalancesSummary)) {
                window.setDoc(summaryDocRef, sanitizedSummary, { merge: true }).catch(e => console.log("Summary update delayed (silent)"));
            } else {
                console.log("تم تجاهل تحديث latestBalances لأن الحالة فارغة أو مصفرة.");
            }
        } else {
            console.log("تم منع التحديث الكامل، سيتم حساب وتطبيق الفروقات."); await processSmartDeltaRollover(typeof sanitizedState !== "undefined" ? sanitizedState : sanitizedSummary, typeof dateStr !== "undefined" ? dateStr : dateString);
        }
        
        console.log("Cloud save success.");
        if (typeof window.SaveGuard !== 'undefined' && typeof window.SaveGuard.recordLoadedState === 'function') {
            window.SaveGuard.recordLoadedState(sanitizedState);
        }
        currentLoadedDate = dateString;
        
        // إظهار رسالة نجاح صغيرة وسريعة
        const msgBox = document.getElementById('global-message');
        if (msgBox) {
            msgBox.textContent = "تم الحفظ ✓";
            msgBox.className = "section-message success visible";
            setTimeout(() => { msgBox.classList.remove('visible'); }, 2000);
        }

    } catch (error) {
        console.error("Cloud save warning:", error);
        
        currentLoadedDate = dateString;

        // رسالة ذكية حسب نوع الخطأ
        let userMessage = "تم الحفظ على الجهاز (جاري المزامنة...)";
        let isError = false; 
        let isInfo = true;

        if (error.code === 'unavailable' || error.message.includes('offline')) {
            userMessage = "لا يوجد إنترنت. تم الحفظ محلياً وسيتم الرفع تلقائياً.";
        } else if (error.code === 'permission-denied') {
            userMessage = "خطأ في الصلاحيات. يرجى إعادة تسجيل الدخول.";
            isError = true;
            isInfo = false;
        }

        showGlobalMessage(userMessage, isError, isInfo);
    }
};
    
    if (immediate) {
        if (window._saveTimeout) clearTimeout(window._saveTimeout);
        window._saveTimeout = null;
        await window._pendingSaveFunction();
    } else {
        window._saveTimeout = setTimeout(window._pendingSaveFunction, 3000);
    }
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
            <div class="flex justify-between items-center p-3 mb-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition">
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
                    loadState(data, dateStr);
                    updateUI();
                    
                    // إغلاق النافذة
                    document.getElementById('backupHistoryModal').style.display = 'none';
                    
                    // حفظ لتثبيت الحالة
                    await saveCurrentStateByDate(dateStr);
                    
                    alert("تمت الاستعادة بنجاح!");
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
