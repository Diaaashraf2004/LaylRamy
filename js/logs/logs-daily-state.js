window.toggleAutoSave = function toggleAutoSave() {
    const autoSaveToggle = d('auto-save-toggle');
    isAutoSaveEnabled = autoSaveToggle.checked;

    if (isAutoSaveEnabled) {
        // إذا تم تفعيل الميزة
        if (autoSaveTimer) clearInterval(autoSaveTimer); // أوقف أي مؤقت قديم احتياطياً

        // ابدأ مؤقت جديد يعمل كل 90 ثانية (90000 ميلي ثانية)
        autoSaveTimer = setInterval(() => {
            console.log("Auto-saving data...");
            const targetDate = currentLoadedDate || getTodayDateString();
            saveCurrentStateByDate(targetDate);
            // نعرض رسالة مؤقتة لتأكيد الحفظ
            const tempMsg = d("global-message");
            if(tempMsg) {
                showMessage(tempMsg, `تم الحفظ تلقائياً... ${new Date().toLocaleTimeString()}`, false, true);
            }
        }, 20000); // يمكنك تغيير هذا الرقم (بالمللي ثانية)

        showGlobalMessage("تم تفعيل الحفظ التلقائي.", false);
        saveData(lsAutoSaveKey, true); // حفظ تفضيل المستخدم

    } else {
        // إذا تم إيقاف الميزة
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer); // أوقف المؤقت
            autoSaveTimer = null;
            showGlobalMessage("تم إيقاف الحفظ التلقائي.", false, true);
        }
        saveData(lsAutoSaveKey, false); // حفظ تفضيل المستخدم
    }
}
async function loadDataForDate(dateString) {
    if (typeof window.resetSerialsLoadState === 'function') window.resetSerialsLoadState();
    if (window._saveTimeout && window._pendingSaveFunction) {
        console.log("Flushing pending save before loading new date...");
        clearTimeout(window._saveTimeout);
        window._saveTimeout = null;
        await window._pendingSaveFunction();
    }
    console.log(`--- بدء عملية التحميل والترحيل الذكي لتاريخ: ${dateString} ---`);
    const loadMsg = document.getElementById("load-message-alt");
    
    if (!window.currentUser || !dateString) return false;
    const userId = window.currentUser.uid;

    try {
        // 1. محاولة جلب بيانات اليوم المختار من السحابة
        const docRef = window.doc(window.db, "users", userId, "days", dateString);
        const docSnap = await window.getDoc(docRef);
        if (docSnap && docSnap._unreachable) {
            if (loadMsg) showMessage("تعذر الاتصال بالسحابة. لم يتم تحميل بيانات اليوم، وتم إيقاف الحفظ حمايةً للبيانات. تأكد من الإنترنت وحدّث الصفحة.", "error");
            window._loadFailed = true;
            return false;
        }

        if (docSnap.exists()) {
            // الحالة أ: اليوم موجود بالفعل (تحميل يوم مسجل سابقاً)
            console.log("تم تحميل بيانات مسجلة لهذا اليوم.");
            window._loadFailed = false;
            let loadedDayData = docSnap.data() || {};

            // 🛡️ [مشكلة 3]: استرجاع السيريالات من التخزين المستقل FinanceDB
            if (window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function') {
                try {
                    const offloadedSerials = await window.FinanceDB.loadSerialsData();
                    if (offloadedSerials && Array.isArray(offloadedSerials.serialNumbersLog)) {
                        loadedDayData.serialNumbersLog = offloadedSerials.serialNumbersLog;
                        if (Array.isArray(offloadedSerials.standaloneSerials)) {
                            loadedDayData.standaloneSerials = offloadedSerials.standaloneSerials;
                        }
                        console.log(`[FinanceDB] تم استعادة ${offloadedSerials.serialNumbersLog.length} سيريال من التخزين المنفصل.`);
                    }
                    window._serialsLoadFailed = false;
                } catch(serErr) {
                    console.error("❌ [Cloud Load] فشل استعادة السيريالات المنفصلة:", serErr);
                    window._serialsLoadFailed = true;
                    window._loadFailed = true;
                    if (typeof showGlobalMessage === 'function') {
                        showGlobalMessage("⚠️ فشل تحميل بيانات السيريالات: " + (serErr.message || "خطأ في السيريالات"), true);
                    }
                    throw serErr;
                }
            }

            loadState(loadedDayData, dateString);

            // 🛡️ إنشاء نسخة الظل (Shadow Backup) فور نجاح التحميل للحماية من الانهيارات
            try { 
                localStorage.setItem('goodsMgmt_SHADOW_BACKUP', JSON.stringify(loadedDayData)); 
                window._shadowLengths = { products: (loadedDayData.products||[]).length, debtors: (loadedDayData.debtors||[]).length, liabilities: (loadedDayData.liabilities||[]).length, pendingSales: (loadedDayData.pendingSales||[]).length };
            } catch(e){ console.warn("تعذر حفظ SHADOW_BACKUP في localStorage:", e); }
            if (typeof window.SaveGuard !== 'undefined' && typeof window.SaveGuard.recordLoadedState === 'function') {
                window.SaveGuard.recordLoadedState(loadedDayData);
            }
            
            // �� تأمين تحميل الفواتير المعلقة لنظام الاستبدال
            window.pendingOrders = docSnap.data().pendingOrders || []; 

            migrateDebtorsToProfiles();
            if(loadMsg) showMessage(loadMsg, `تم تحميل بيانات يوم ${dateString} بنجاح.`, false);
            updateUI();
            if (typeof window.initDualWriteState === 'function') window.initDualWriteState();
            return true;
        } else {
            // الحالة ب: يوم جديد (بدء ترحيل الأرصدة من آخر وضع للبرنامج)
            console.log("يوم جديد.. جاري ترحيل الأصول والأرصدة...");
            
            let dataToMigrate = null;
            let sourceName = "";

            const latestValidDay = await findLatestValidDayBeforeDate(userId, dateString);

            if (latestValidDay && latestValidDay.data) {
                dataToMigrate = latestValidDay.data;
                sourceName = `آخر يوم صالح (${latestValidDay.date})`;
            } else {
                const summaryDocRef = window.doc(window.db, "users", userId, "summaries", "latestBalances");
                const summarySnap = await window.getDoc(summaryDocRef);

                if (summarySnap.exists()) {
                    const summaryData = summarySnap.data();
                    if (isStateMeaningful(summaryData)) {
                        dataToMigrate = summaryData;
                        sourceName = "آخر أرصدة مسجلة بالسحابة";
                    }
                }

                if (!dataToMigrate) {
                    const yesterday = new Date(dateString);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const prevDateStr = getCairoDateString(yesterday);
                    const prevDocRef = window.doc(window.db, "users", userId, "days", prevDateStr);
                    const prevSnap = await window.getDoc(prevDocRef);
                    if (prevSnap.exists()) {
                        const prevData = prevSnap.data();
                        if (isStateMeaningful(prevData)) {
                            dataToMigrate = prevData;
                            sourceName = `يوم ${prevDateStr}`;
                        }
                    }
                }
            }

            if (dataToMigrate) {
                // ������ منطقة التطهير والتدقيق المالي ������
                
                // 1. تصفير السجلات اليومية (لا تنتقل لليوم الجديد)
                dataToMigrate.salesToday = [];       
                dataToMigrate.purchaseInvoices = []; 
                dataToMigrate.completedReturns = []; 
                dataToMigrate.expenses = 0;          
                dataToMigrate.profit = 0;            

                // 2. ✅ التأمين المالي للمرتجعات (إصلاح مشكلة الـ 9341 جنيه)
                dataToMigrate.pendingReturns = dataToMigrate.pendingReturns || [];
                dataToMigrate.pendingReturnsValue = dataToMigrate.pendingReturns.reduce((sum, r) => {
                    return sum + (Number(r.returnedAmount) || 0);
                }, 0);

                // 3. ✅ التأمين المالي للمشتريات (Goods in Transit)
                dataToMigrate.pendingPurchases = dataToMigrate.pendingPurchases || [];

                // �� 3.5 ✅ التأمين المالي لطلبيات الاستبدال المعلقة (ERP)
                // الفواتير المعلقة بضاعة خرجت وفلوس لسه مجتش، لازم تترحل لليوم الجديد
                dataToMigrate.pendingOrders = dataToMigrate.pendingOrders || [];

                // 4. السجلات الافتتاحية
                dataToMigrate.log = [{
                    id: typeof generateUniqueId === 'function' ? generateUniqueId('LOG') : `log-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: "ترحيل تلقائي",
                    details: `بدء يوم جديد بترحيل الأصول من: ${sourceName}`
                }];

                const totalLiquidity = (dataToMigrate.accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
                dataToMigrate.liquidityLog = [{
                    id: typeof generateUniqueId === 'function' ? generateUniqueId('LIQ') : `liq-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: "adjust", 
                    amount: 0,
                    description: `رصيد افتتاح مرحل من ${sourceName}`,
                    currentBalance: totalLiquidity
                }];

                console.log(`✅ تمت معالجة وترحيل قيمة المرتجعات: ${dataToMigrate.pendingReturnsValue}`);
                
                // 🛡️ [مشكلة 3]: استرجاع السيريالات لليوم الجديد من وحدة التخزين المستقلة
                if (window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function') {
                    try {
                        const offloadedSerials = await window.FinanceDB.loadSerialsData();
                        if (offloadedSerials && Array.isArray(offloadedSerials.serialNumbersLog)) {
                            dataToMigrate.serialNumbersLog = offloadedSerials.serialNumbersLog;
                            if (Array.isArray(offloadedSerials.standaloneSerials)) {
                                dataToMigrate.standaloneSerials = offloadedSerials.standaloneSerials;
                            }
                            console.log(`[FinanceDB] تم ترحيل ${offloadedSerials.serialNumbersLog.length} سيريال لليوم الجديد.`);
                        }
                        window._serialsLoadFailed = false;
                    } catch(serErr) {
                        console.error("❌ [Cloud Load] فشل استعادة السيريالات المنفصلة لليوم الجديد:", serErr);
                        window._serialsLoadFailed = true;
                        window._loadFailed = true;
                        if (typeof showGlobalMessage === 'function') {
                            showGlobalMessage("⚠️ فشل ترحيل بيانات السيريالات: " + (serErr.message || "خطأ في السيريالات"), true);
                        }
                        throw serErr;
                    }
                }

                // تحميل البيانات المنقحة
                loadState(dataToMigrate, dateString);
                
                // تأمين تحميل الفواتير المعلقة في المتغير العالمي للواجهة
                window.pendingOrders = dataToMigrate.pendingOrders || [];

                // 🛡️ تم ترحيل وتحميل البيانات بنجاح في الذاكرة
                window._loadFailed = false;
                if (typeof window.initDualWriteState === 'function') window.initDualWriteState();

                // حفظ فوري لليوم الجديد بالسحابة لتثبيته كـ "يوم مفتوح"
                try {
                    await saveSystemToCloud();
                } catch (saveErr) {
                    console.warn("تعذر تثبيت اليوم الجديد بالسحابة فوراً:", saveErr);
                }
                
                if(loadMsg) showMessage(loadMsg, `تم بدء يوم جديد وترحيل كافة الأرصدة بنجاح.`, false);
                updateUI();
                // 🛡️ إنشاء نسخة الظل (Shadow Backup) فور نجاح التحميل للحماية من الانهيارات
                try { 
                    localStorage.setItem('goodsMgmt_SHADOW_BACKUP', JSON.stringify(dataToMigrate)); 
                    window._shadowLengths = { products: (dataToMigrate.products||[]).length, debtors: (dataToMigrate.debtors||[]).length, liabilities: (dataToMigrate.liabilities||[]).length, pendingSales: (dataToMigrate.pendingSales||[]).length };
                } catch(e){ console.warn("تعذر حفظ SHADOW_BACKUP في localStorage:", e); }
                if (typeof window.SaveGuard !== 'undefined' && typeof window.SaveGuard.recordLoadedState === 'function') {
                    window.SaveGuard.recordLoadedState(dataToMigrate);
                }
                if (typeof window.initDualWriteState === 'function') window.initDualWriteState();
                return true;

            } else {
                // حالة عدم وجود أي بيانات سابقة نهائياً (بداية النظام لأول مرة)
                console.log("بداية نظام فارغ.");
                resetState(); 
                accounts = [{ id: 'main', name: 'الخزينة الرئيسية', balance: 0.00 }];
                currentLoadedDate = dateString;
                
                window.pendingOrders = []; // تصفير الطلبيات المعلقة
                window._loadFailed = false;

                try {
                    await saveSystemToCloud();
                } catch (saveErr) {
                    console.warn("تعذر حفظ النظام الفارغ بالسحابة فوراً:", saveErr);
                }
                updateUI();
                if (typeof window.initDualWriteState === 'function') window.initDualWriteState();
                if(loadMsg) showMessage(loadMsg, `بدء يوم جديد (نظام فارغ).`, false, true);
                return true;
            }
        }

    } catch (error) {
        console.error("خطأ في التحميل المالي:", error);
        window._loadFailed = true;

        // 🛡️ [مشكلة 5]: فحص وعرض خيار استرجاع النسخة الاحتياطية الطارئة عند فشل السحابة
        const backupInfo = (typeof window.checkEmergencyBackupAvailability === 'function') ? window.checkEmergencyBackupAvailability() : { available: false };
        if (backupInfo.available) {
            const recoveryBanner = `تعذر الاتصال بالسحابة (${error.message || 'خطأ اتصال'}). تتوفر نسخة طوارئ محلية في المتصفح. يمكنك استرجاعها عبر استدعاء restoreFromEmergencyBackup().`;
            console.warn(`[Emergency Recovery] ${recoveryBanner}`);
            if (typeof showGlobalMessage === 'function') {
                showGlobalMessage(recoveryBanner, true);
            }
            if(loadMsg) showMessage(loadMsg, recoveryBanner, true);
        } else {
            if(loadMsg) showMessage(loadMsg, "حدث خطأ أثناء الاتصال بالسحابة: " + error.message, true);
        }
        return false;
    }
}

// =========================================================================
// 🛡️ [مشكلة 5]: دوال فحص واسترجاع النسخة الاحتياطية الطارئة من localStorage
// =========================================================================
window.checkEmergencyBackupAvailability = function() {
    try {
        if (typeof localStorage === 'undefined') return { available: false, source: null, data: null };
        const shadowRaw = localStorage.getItem('goodsMgmt_SHADOW_BACKUP');
        if (shadowRaw) {
            const parsed = JSON.parse(shadowRaw);
            if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.products) || Array.isArray(parsed.accounts))) {
                return { available: true, source: 'goodsMgmt_SHADOW_BACKUP', data: parsed };
            }
        }
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('emergency_backup_')) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.products) || Array.isArray(parsed.accounts))) {
                        return { available: true, source: key, data: parsed };
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error checking emergency backup availability:", e);
    }
    return { available: false, source: null, data: null };
};

window.restoreFromEmergencyBackup = function(force = false) {
    const backupInfo = window.checkEmergencyBackupAvailability();
    if (!backupInfo.available || !backupInfo.data) {
        const msg = "لم يتم العثور على نسخة احتياطية طارئة صالحة في المتصفح.";
        if (typeof showGlobalMessage === 'function') showGlobalMessage(msg, true);
        else if (typeof alert === 'function') alert(msg);
        return false;
    }

    try {
        const data = backupInfo.data;
        const targetDate = data.savedForDate || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
        console.log(`[Emergency Recovery] جاري استرجاع النظام من النسخة الاحتياطية (${backupInfo.source})...`);
        loadState(data, targetDate);
        window.pendingOrders = data.pendingOrders || [];
        window._loadFailed = false;
        window.hasUnsavedChanges = true;
        updateUI();

        const successMsg = `تم استرجاع النظام بنجاح من النسخة الاحتياطية المحلية (${backupInfo.source}). يرجى حفظ البيانات في السحابة فوراً.`;
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(successMsg, false);
        } else {
            console.log(successMsg);
        }
        return true;
    } catch (err) {
        console.error("❌ فشل استرجاع النسخة الاحتياطية الطارئة:", err);
        const errMsg = "حدث خطأ أثناء استرجاع النسخة الاحتياطية: " + err.message;
        if (typeof showGlobalMessage === 'function') showGlobalMessage(errMsg, true);
        else if (typeof alert === 'function') alert(errMsg);
        return false;
    }
};// =======================================================

