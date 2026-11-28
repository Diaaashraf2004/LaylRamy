function isLocalStorageQuotaError(err) {
    if (!err) return false;
    const msg = String(err.message || '').toLowerCase();
    return (
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014 ||
        msg.includes('quota') ||
        msg.includes('exceeded')
    );
}
window.isLocalStorageQuotaError = isLocalStorageQuotaError;

function buildCompactLocalSnapshot(sourceObj, uid, options = {}) {
    if (!sourceObj || typeof sourceObj !== 'object') return sourceObj;
    const compact = { ...sourceObj };
    if (uid) compact._userId = uid;

    // إزالة التكرار عند وجود operationLog بجانب log
    if (compact.log && compact.operationLog) {
        delete compact.operationLog;
    }

    // إزالة السيريالات الثقيلة من كل نسخة فردية (تُخزّن مرة واحدة فقط في مفتاح مشترك لكل مستخدم)
    if (options.omitSerials !== false) {
        delete compact.serialNumbersLog;
        delete compact.standaloneSerials;
        compact._serialsRef = true;
    }

    // عند الضيق الشديد في المساحة، نقصر السجلات الطويلة في النسخة المحلية فقط (النسخة السحابية تظل كاملة)
    if (options.trimLogs) {
        const maxLogEntries = Number(options.maxLogEntries) || 200;
        if (Array.isArray(compact.log) && compact.log.length > maxLogEntries) {
            compact.log = compact.log.slice(-maxLogEntries);
            compact._trimmedLogs = true;
        }
        if (Array.isArray(compact.liquidityLog) && compact.liquidityLog.length > maxLogEntries) {
            compact.liquidityLog = compact.liquidityLog.slice(-maxLogEntries);
            compact._trimmedLogs = true;
        }
    }

    return compact;
}
window.buildCompactLocalSnapshot = buildCompactLocalSnapshot;

function rehydrateCompactSnapshot(data, currentUid) {
    if (!data || typeof data !== 'object') return data;
    const hydrated = { ...data };
    const needsSerials = Boolean(hydrated._serialsRef || !Array.isArray(hydrated.serialNumbersLog));
    const needsStandalone = Boolean(hydrated._serialsRef || !Array.isArray(hydrated.standaloneSerials));

    if (needsSerials || needsStandalone) {
        let sharedSerials = null;
        try {
            const uid = currentUid || hydrated._userId || (window.currentUser && window.currentUser.uid) || null;
            if (uid) {
                const rawShared = localStorage.getItem(`goodsMgmt_backup_serials_${uid}`);
                if (rawShared) {
                    const parsed = JSON.parse(rawShared);
                    if (parsed && (!parsed._userId || parsed._userId === uid)) {
                        sharedSerials = parsed;
                    }
                }
            }
        } catch (e) {
            console.warn('[LocalBackup] تعذر قراءة مخزن السيريالات المحلي المشترك:', e);
        }

        if (needsSerials) {
            if (sharedSerials && Array.isArray(sharedSerials.serialNumbersLog)) {
                hydrated.serialNumbersLog = sharedSerials.serialNumbersLog;
            } else if (typeof serialNumbersLog !== 'undefined' && Array.isArray(serialNumbersLog)) {
                hydrated.serialNumbersLog = [...serialNumbersLog];
            } else {
                hydrated.serialNumbersLog = [];
            }
        }

        if (needsStandalone) {
            if (sharedSerials && Array.isArray(sharedSerials.standaloneSerials)) {
                hydrated.standaloneSerials = sharedSerials.standaloneSerials;
            } else if (typeof window.getStandaloneSerials === 'function') {
                hydrated.standaloneSerials = window.getStandaloneSerials();
            } else {
                hydrated.standaloneSerials = [];
            }
        }
    }
    return hydrated;
}
window.rehydrateCompactSnapshot = rehydrateCompactSnapshot;

function pruneStaleLocalBackups(currentUid, activeDate) {
    try {
        const userBackupPrefix = `goodsMgmt_backup_${currentUid}_`;
        const sharedSerialsKey = `goodsMgmt_backup_serials_${currentUid}`;
        const userEmergencyPrefix = `emergency_backup_${currentUid}_`;
        const userShadowKey = `goodsMgmt_SHADOW_BACKUP_${currentUid}`;
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            // 1. حذف نسخ الأيام السابقة أو الحسابات الأخرى من goodsMgmt_backup_*
            if (key.startsWith('goodsMgmt_backup_')) {
                if (key === sharedSerialsKey) continue;
                if (!key.startsWith(userBackupPrefix)) {
                    keysToRemove.push(key);
                } else if (activeDate && !key.includes(activeDate)) {
                    keysToRemove.push(key);
                }
                continue;
            }

            // 2. حذف نسخ الطوارئ للأيام السابقة أو لحسابات أخرى
            if (key.startsWith('emergency_backup_')) {
                if (!key.startsWith(userEmergencyPrefix) || (activeDate && !key.includes(activeDate))) {
                    keysToRemove.push(key);
                }
                continue;
            }

            // 3. حذف نسخ الظل القديمة غير المربوطة بالمستخدم أو التابعة لحسابات أخرى
            if (key === 'goodsMgmt_SHADOW_BACKUP' || (key.startsWith('goodsMgmt_SHADOW_BACKUP_') && key !== userShadowKey)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
        console.warn('[LocalBackup] pruneStaleLocalBackups warning:', e);
    }
}
window.pruneStaleLocalBackups = pruneStaleLocalBackups;

function evictOldestLocalBackupSlot(excludeKey = null) {
    try {
        const candidates = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || key === excludeKey) continue;
            if (key.startsWith('goodsMgmt_backup_') && key.includes('_slot_')) {
                let ts = 0;
                try {
                    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
                    if (parsed && parsed.savedAt) {
                        const parsedMs = Date.parse(parsed.savedAt);
                        if (!isNaN(parsedMs)) ts = parsedMs;
                    }
                } catch (_) {
                    ts = 0; // الملفات التالفة تُحذف أولاً
                }
                candidates.push({ key, ts });
            }
        }
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.ts - b.ts);
            localStorage.removeItem(candidates[0].key);
            return true;
        }
        // إذا لم يتبق أي slot، نحذف مخزن السيريالات المحلي المشترك (السحابة تحتفظ بالسيريالات كاملة)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== excludeKey && key.startsWith('goodsMgmt_backup_serials_')) {
                localStorage.removeItem(key);
                return true;
            }
        }
    } catch (e) {
        console.warn('[LocalBackup] evictOldestLocalBackupSlot warning:', e);
    }
    return false;
}
window.evictOldestLocalBackupSlot = evictOldestLocalBackupSlot;

function saveCompactShadowBackup(userId, sourceObj) {
    if (!userId || !sourceObj) return false;
    const shadowKey = `goodsMgmt_SHADOW_BACKUP_${userId}`;
    const trySet = (payload) => {
        const serialized = JSON.stringify(payload);
        for (let attempt = 0; attempt < 6; attempt++) {
            try {
                localStorage.setItem(shadowKey, serialized);
                return true;
            } catch (e) {
                if (!isLocalStorageQuotaError(e)) throw e;
                if (!evictOldestLocalBackupSlot(shadowKey)) return false;
            }
        }
        return false;
    };
    try {
        if (trySet(buildCompactLocalSnapshot(sourceObj, userId, { omitSerials: true }))) return true;
        return trySet(buildCompactLocalSnapshot(sourceObj, userId, { omitSerials: true, trimLogs: true }));
    } catch (e) {
        console.warn("تعذر حفظ SHADOW_BACKUP في localStorage:", e);
        return false;
    }
}
window.saveCompactShadowBackup = saveCompactShadowBackup;

function saveLocalBackupSmart(currentUid, dateString, backupKey, stateToSave) {
    pruneStaleLocalBackups(currentUid, dateString);

    const tryWrite = (payloadObj) => {
        const serialized = JSON.stringify(payloadObj);
        for (let attempt = 0; attempt < 8; attempt++) {
            try {
                localStorage.setItem(backupKey, serialized);
                return true;
            } catch (e) {
                if (!isLocalStorageQuotaError(e)) throw e;
                // حذف أقدم slot متاح (غير المفتاح المستهدف) ثم إعادة المحاولة
                const freed = evictOldestLocalBackupSlot(backupKey);
                if (!freed) {
                    // إفراغ المفتاح الحالي نفسه لإعادة الكتابة بمساحة نظيفة
                    if (localStorage.getItem(backupKey) !== null) {
                        localStorage.removeItem(backupKey);
                        try {
                            localStorage.setItem(backupKey, serialized);
                            return true;
                        } catch (retryErr) {
                            if (!isLocalStorageQuotaError(retryErr)) throw retryErr;
                        }
                    }
                    return false;
                }
            }
        }
        return false;
    };

    // المستوى 1: نسخة كاملة بدون تكرار السيريالات داخل كل slot
    let saved = tryWrite(buildCompactLocalSnapshot(stateToSave, currentUid, { omitSerials: true }));

    // المستوى 2: عند الامتلاء الشديد، تقليص السجلات الطويلة في النسخة المحلية فقط وإعادة المحاولة
    if (!saved) {
        saved = tryWrite(buildCompactLocalSnapshot(stateToSave, currentUid, { omitSerials: true, trimLogs: true, maxLogEntries: 200 }));
    }

    // المستوى 3: حذف نسخة الطوارئ المحلية القديمة لنفس اليوم كحل أخير وإعادة المحاولة
    if (!saved) {
        try {
            localStorage.removeItem(`emergency_backup_${currentUid}_${dateString}`);
        } catch (_) {}
        saved = tryWrite(buildCompactLocalSnapshot(stateToSave, currentUid, { omitSerials: true, trimLogs: true, maxLogEntries: 50 }));
    }

    // حفظ السيريالات مرة واحدة فقط في مفتاح مشترك (اختياري؛ لا يعطل النسخة المحلية إن امتلأت المساحة)
    if (saved) {
        const sharedSerialsKey = `goodsMgmt_backup_serials_${currentUid}`;
        try {
            const serialsPayload = {
                _userId: currentUid,
                savedAt: stateToSave.savedAt || new Date().toISOString(),
                serialNumbersLog: Array.isArray(stateToSave.serialNumbersLog) ? stateToSave.serialNumbersLog : [],
                standaloneSerials: Array.isArray(stateToSave.standaloneSerials) ? stateToSave.standaloneSerials : []
            };
            localStorage.setItem(sharedSerialsKey, JSON.stringify(serialsPayload));
        } catch (serErr) {
            if (isLocalStorageQuotaError(serErr)) {
                try { localStorage.removeItem(sharedSerialsKey); } catch (_) {}
                console.warn('[LocalBackup] تم تخطي حفظ السيريالات محلياً لتوفير المساحة (محفوظة بالكامل في السحابة).');
            }
        }
    }

    return saved;
}

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
            const hasCorruption = (window.FinancialIntegrityGuard && typeof window.FinancialIntegrityGuard.hasCriticalCorruption === 'function')
                ? window.FinancialIntegrityGuard.hasCriticalCorruption(stateToSave).length > 0
                : false;
            const hasValidAccounts = Array.isArray(stateToSave.accounts) && stateToSave.accounts.length > 0;
            if (!hasCorruption && options && options.isManualUserSave && hasValidAccounts && typeof window.SaveGuard.allowShrinkOnce === 'function') {
                const approveShrink = confirm(
                    "⚠️ تنبيه حماية البيانات (SaveGuard):\n\n" +
                    "لاحظ النظام نقصاً كبيراً (أكثر من 50%) في عدد عناصر إحدى القوائم مقارنة ببداية الجلسة.\n" +
                    "إذا كنت قد قمت بهذا الحذف أو التصفية عن قصد، اضغط (موافق) لاعتماد الحفظ السحابي، أو (إلغاء) لإيقاف الحفظ."
                );
                if (approveShrink) {
                    window.SaveGuard.allowShrinkOnce();
                } else {
                    console.error('[saveCurrentStateByDate] تم إلغاء الحفظ اليدوي بواسطة المستخدم بعد تنبيه SaveGuard.');
                    if (options && options.throwOnError) throw new Error('تم إلغاء الحفظ بعد تنبيه حماية البيانات.');
                    return false;
                }
            } else {
                console.error('[saveCurrentStateByDate] تم إيقاف الحفظ لمنع تفريغ أو تلف البيانات الحرجة.');
                if (options && options.throwOnError) throw new Error('تم إيقاف الحفظ بواسطة حارس حماية البيانات.');
                return false;
            }
        }
    }

    const currentUid = (window.currentUser && window.currentUser.uid) ? window.currentUser.uid : null;
    if (currentUid) {
        try {
            const userBackupPrefix = `goodsMgmt_backup_${currentUid}_`;
            const backupKey = `${userBackupPrefix}${dateString}_slot_${safeBackupIndex}`;

            const localSaved = saveLocalBackupSmart(currentUid, dateString, backupKey, stateToSave);
            if (localSaved) {
                if (typeof backupSlotIndex !== 'undefined') {
                    backupSlotIndex = (backupSlotIndex + 1) % MAX_BACKUP_SLOTS;
                }
            } else {
                console.warn("[LocalBackup] تعذر حفظ نسخة محلية في localStorage رغم تنظيف الخانات القديمة (الحفظ السحابي مستمر بشكل طبيعي).");
                if (!window._localQuotaWarnedOnce) {
                    window._localQuotaWarnedOnce = true;
                    if (typeof showGlobalMessage === 'function') {
                        showGlobalMessage("تنبيه: ذاكرة المتصفح المحلية ممتلئة؛ تم تنظيف النسخ القديمة والحفظ السحابي يعمل بشكل طبيعي.", false, true);
                    }
                }
            }
        } catch (e) {
            console.warn("Local backup warning (silent):", e);
        }
    }

    // 1. التحقق من تسجيل الدخول
    if (!window.currentUser) {
        showGlobalMessage("تنبيه: أنت غير مسجل دخول. يتم الحفظ على الجهاز فقط.", false, true);
        if (options && options.throwOnError) throw new Error('لم يتم تسجيل الدخول.');
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
            await window.saveSystemToCloud({
                immediate: Boolean(immediate),
                allowArchiveWrite: Boolean(options && (options.allowArchiveWrite || options.isManualUserSave))
            });
            window._autoSaveDirty = false;
            return true;
        } catch (err) {
            console.error('[saveCurrentStateByDate] Unified cloud save failed:', err);
            if (options && options.throwOnError) throw err;
            return false;
        }
    }
    if (options && options.throwOnError) throw new Error('دالة الحفظ السحابي غير متاحة.');
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
    const currentUid = (window.currentUser && window.currentUser.uid) ? window.currentUser.uid : null;
    if (!currentUid) {
        listContainer.innerHTML = `<div class="text-center py-4 text-gray-500">يجب تسجيل الدخول أولاً لعرض النسخ الاحتياطية الخاصة بحسابك.</div>`;
        modal.style.display = 'block';
        return;
    }
    const userBackupPrefix = `goodsMgmt_backup_${currentUid}_`;

    // مسح النسخ الاحتياطية الخاصة بالحساب المسجل حالياً فقط (عزل تام بين الحسابات)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(userBackupPrefix) && key.includes(targetDate) && key.includes('_slot_')) {
            try {
                const raw = localStorage.getItem(key);
                const data = JSON.parse(raw);
                if (data && data.savedAt && data._userId === currentUid) {
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

    const safeEsc = (s) => (typeof window.escapeHTML === 'function' ? window.escapeHTML(s) : String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])));

    // عرض القائمة
    if (backups.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-4">
                <p class="text-gray-500 mb-2">لا توجد نسخ لهذا اليوم (${safeEsc(targetDate)}).</p>
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
                <button type="button" data-backup-key="${safeEsc(backup.key)}" class="restore-backup-btn-action" style="
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
                    const currentUid = (window.currentUser && window.currentUser.uid) ? window.currentUser.uid : null;
                    if (!currentUid || data._userId !== currentUid) {
                        alert("تم رفض الاستعادة: هذه النسخة لا تخص الحساب المسجّل حالياً.");
                        return;
                    }
                    // استخدام التاريخ المحفوظ أو الحالي
                    const dateStr = data.savedForDate || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
                    
                    console.log("Restoring on Chrome logic:", key);
                    
                    // إعادة دمج السيريالات من المفتاح المشترك أو من الذاكرة الحية حتى لا تُفقد عند استعادة نسخة مضغوطة
                    const restoredData = rehydrateCompactSnapshot(data, currentUid);
                    
                    // تحميل البيانات
                    window._loadFailed = false;
                    window._serialsLoadFailed = false;
                    loadState(restoredData, dateStr);
                    updateUI();
                    
                    // إغلاق النافذة
                    document.getElementById('backupHistoryModal').style.display = 'none';
                    
                    // التصريح بالانكماش لمرة واحدة ثم الحفظ الفوري بالسحابة (شاملاً السيريالات)
                    if (window.SaveGuard && typeof window.SaveGuard.allowShrinkOnce === 'function') {
                        window.SaveGuard.allowShrinkOnce();
                    }
                    const savedOk = await saveCurrentStateByDate(dateStr, true, { allowArchiveWrite: true });
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
