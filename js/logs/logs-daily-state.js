window.toggleAutoSave = function toggleAutoSave() {
    const autoSaveToggle = d('auto-save-toggle');
    if (!autoSaveToggle) return;
    isAutoSaveEnabled = autoSaveToggle.checked;

    if (isAutoSaveEnabled) {
        // إذا تم تفعيل الميزة
        if (autoSaveTimer) clearInterval(autoSaveTimer); // أوقف أي مؤقت قديم احتياطياً

        // ابدأ مؤقت جديد يعمل كل 20 ثانية مع حماية صارمة لبيانات الأرشيف
        autoSaveTimer = setInterval(() => {
            if (window._isLoadingDate) {
                console.log("[AutoSave Guard] تم تخطي الحفظ: جاري تحميل بيانات يوم جديد حالياً.");
                return;
            }

            const todayStr = (typeof getTodayDateString === 'function') 
                ? getTodayDateString() 
                : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
            
            const activeDate = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) 
                ? currentLoadedDate 
                : (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate ? window.currentLoadedDate : null);

            // 🛡️ حماية حاسمة: منع الحفظ التلقائي منعاً باتاً إذا كان المستخدم يستعرض يوماً سابقاً
            if (activeDate && activeDate !== todayStr) {
                console.log(`[AutoSave Guard] تم تخطي الحفظ التلقائي لحماية بيانات اليوم الحالي؛ البرنامج الآن يستعرض أرشيف يوم (${activeDate}).`);
                return;
            }

            if (!activeDate) {
                console.log("[AutoSave Guard] تم تخطي الحفظ التلقائي: لم يتم تعيين تاريخ نشط.");
                return;
            }

            console.log("Auto-saving data for active date:", activeDate);
            saveCurrentStateByDate(activeDate);
            // نعرض رسالة مؤقتة لتأكيد الحفظ
            const tempMsg = d("global-message");
            if(tempMsg) {
                showMessage(tempMsg, `تم الحفظ تلقائياً... ${new Date().toLocaleTimeString()}`, false, true);
            }
        }, 20000);

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
    if (window._pendingCloudSave) {
        clearTimeout(window._pendingCloudSave);
        window._pendingCloudSave = null;
    }
    window._isLoadingDate = true;
    console.log(`--- بدء عملية التحميل والترحيل الذكي لتاريخ: ${dateString} ---`);
    const loadMsg = document.getElementById("load-message-alt");
    
    if (!window.currentUser || !dateString) {
        window._isLoadingDate = false;
        return false;
    }
    const userId = window.currentUser.uid;

    try {
        // 1. محاولة جلب بيانات اليوم المختار من السحابة
        const docRef = window.doc(window.db, "users", userId, "days", dateString);
        const docSnap = await window.getDoc(docRef);
        if (docSnap && docSnap._unreachable) {
            if (loadMsg) showMessage(loadMsg, "تعذر الاتصال بالسحابة. لم يتم تحميل بيانات اليوم، وتم إيقاف الحفظ حمايةً للبيانات. تأكد من الإنترنت وحدّث الصفحة.", true);
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

            // ⚡ المسار السريع: فحص وثيقة latestBalances الخفيفة فوراً (توفر 95% من وقت ترحيل اليوم الجديد)
            try {
                const summaryDocRef = window.doc(window.db, "users", userId, "summaries", "latestBalances");
                const summarySnap = await window.getDoc(summaryDocRef);

                if (summarySnap && summarySnap.exists()) {
                    const summaryData = summarySnap.data() || {};
                    const sDate = summaryData.summaryForDate || summaryData.savedForDate || '';
                    const todayStr = (typeof getTodayDateString === 'function') 
                        ? getTodayDateString() 
                        : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
                    if (isStateMeaningful(summaryData) && (sDate ? sDate <= dateString : dateString >= todayStr)) {
                        dataToMigrate = JSON.parse(JSON.stringify(summaryData));
                        sourceName = sDate ? `أحدث أرصدة معتمدة (${sDate})` : "أحدث أرصدة مسجلة بالسحابة";
                        console.log(`⚡ [Fast Rollover] تم اعتماد وثيقة latestBalances للترحيل السريع بنجاح (${sourceName}).`);
                    }
                }
            } catch (sumErr) {
                console.warn("تعذر جلب latestBalances للترحيل السريع، سيتم البحث في الأيام:", sumErr);
            }

            // إذا لم تتوفر وثيقة latestBalances، يتم البحث السريع في آخر الأيام السابقة (3 أيام كحد أقصى)
            if (!dataToMigrate) {
                const latestValidDay = await findLatestValidDayBeforeDate(userId, dateString);

                if (latestValidDay && latestValidDay.data) {
                    dataToMigrate = latestValidDay.data;
                    sourceName = `آخر يوم صالح (${latestValidDay.date})`;
                } else {
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

                // 🚀 عرض البيانات فوراً على الشاشة بدون حظر واجهة المستخدم
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

                // ☁️ حفظ اليوم الجديد في السحابة بالخلفية دون تعطيل الشاشة أو تأخير المستخدم
                saveSystemToCloud().catch(saveErr => {
                    console.warn("تنبيه: محاولة تثبيت اليوم الجديد بالسحابة بالخلفية ستعاد لاحقاً:", saveErr);
                });
                
                return true;

            } else {
                // حالة عدم وجود أي بيانات سابقة نهائياً (بداية النظام لأول مرة)
                // 🛡️ حماية حاسمة: فحص النسخ الاحتياطية المحلية لمنع التصفير العرضي للبيانات
                const backupInfo = (typeof window.checkEmergencyBackupAvailability === 'function') ? window.checkEmergencyBackupAvailability() : { available: false };
                if (backupInfo.available && backupInfo.data) {
                    console.warn("[Rollover Guard] تم إلغاء بدء النظام الفارغ: عُثر على نسخة احتياطية محلية صالحة.");
                    const restoredData = backupInfo.data;
                    loadState(restoredData, dateString);
                    updateUI();
                    if(loadMsg) showMessage(loadMsg, "تم استرجاع الأرصدة من النسخة المحلية لتفادي تصفير النظام.", false);
                    return true;
                }

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
    } finally {
        window._isLoadingDate = false;
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
        window._serialsLoadFailed = false;
        window.hasUnsavedChanges = true;

        if (typeof window.SaveGuard !== 'undefined') {
            if (typeof window.SaveGuard.recordLoadedState === 'function') {
                window.SaveGuard.recordLoadedState(data);
            }
            if (typeof window.SaveGuard.allowShrinkOnce === 'function') {
                window.SaveGuard.allowShrinkOnce();
            }
        }

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
};

// =========================================================================
// 🔄 دالة الترحيل اليدوي الآمن للأرصدة من يوم سابق إلى اليوم المفتوح حالياً
// =========================================================================
window.manualRolloverFromDate = async function(sourceDate) {
    if (!window.currentUser) {
        alert("يجب تسجيل الدخول أولاً.");
        return;
    }

    // 🛡️ فحص حارس الجلسة النشطة مبكراً لمنع التضارب
    if (window.SessionGuard && typeof window.SessionGuard.assertCanWrite === 'function') {
        const canWrite = await window.SessionGuard.assertCanWrite();
        if (!canWrite) return;
    }

    const todayStr = (typeof getTodayDateString === 'function') 
        ? getTodayDateString() 
        : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));

    const targetDate = (currentLoadedDate && currentLoadedDate === todayStr) ? currentLoadedDate : todayStr;

    if (!sourceDate || typeof sourceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) {
        alert("يرجى اختيار تاريخ صالح بصيغة (YYYY-MM-DD) أولاً.");
        return;
    }

    if (sourceDate === targetDate) {
        alert(`التاريخ المختار (${sourceDate}) هو نفس اليوم المستهدف (${targetDate}). لا يمكن ترحيل اليوم لنفسه.`);
        return;
    }

    if (sourceDate > targetDate) {
        alert(`لا يمكن الترحيل من تاريخ مستقبلي (${sourceDate}) إلى تاريخ سابق أو حالي (${targetDate}).`);
        return;
    }

    const confirmMsg = `⚠️ تأكيد عملية الترحيل اليدوي للأرصدة:\n\n` +
        `• سيتم نقل الأرصدة التراكمية (المخزون، الخزينة، الديون، الالتزامات) من يوم (${sourceDate}).\n` +
        `• وتثبيتها كيوم جديد لتاريخ اليوم الحالي (${targetDate}).\n` +
        `• سيتم تصفير المبيعات والمصروفات والفواتير السابقة لمنع تداخل الحسابات.\n\n` +
        `هل تريد المتابعة بالتأكيد؟`;

    if (!confirm(confirmMsg)) return;

    const loadMsg = document.getElementById("load-message-alt");
    if (loadMsg) showMessage(loadMsg, "جاري جلب وترحيل الأرصدة من السحابة...", false, true);

    try {
        const userId = window.currentUser.uid;
        const docRef = window.doc(window.db, "users", userId, "days", sourceDate);
        const docSnap = await window.getDoc(docRef);

        if (!docSnap || !docSnap.exists()) {
            alert(`عذراً، لم يتم العثور على أي بيانات مسجلة في السحابة لتاريخ (${sourceDate}).`);
            if (loadMsg) showMessage(loadMsg, "لم يتم العثور على بيانات للتاريخ المختار.", true);
            return;
        }

        const sourceData = docSnap.data() || {};

        // 🛡️ التحقق من أن بيانات تاريخ المصدر صالحة وليست مصفرة أو فارغة
        if (typeof isStateMeaningful === 'function' && !isStateMeaningful(sourceData)) {
            alert(`⚠️ تم إلغاء العملية: بيانات تاريخ (${sourceDate}) فارغة أو مصفرة، ولا يمكن الترحيل منها تجنباً لتفريغ النظام.`);
            if (loadMsg) showMessage(loadMsg, "بيانات تاريخ المصدر غير صالحة للترحيل.", true);
            return;
        }

        const dataToMigrate = JSON.parse(JSON.stringify(sourceData));

        // 🛡️ تصفير الحركات اليومية المنتهية (منع تسريب أي مبيعات أو مصروفات أو مرتجعات منتهية)
        dataToMigrate.salesToday = [];
        dataToMigrate.purchaseInvoices = [];
        dataToMigrate.completedReturns = [];
        dataToMigrate.purchaseReturns = [];
        dataToMigrate.expenses = 0;
        dataToMigrate.profit = 0;
        dataToMigrate.recordedLosses = 0;

        // الحفاظ على الأصول المعلقة والأرصدة التراكمية
        dataToMigrate.pendingReturns = dataToMigrate.pendingReturns || [];
        dataToMigrate.pendingReturnsValue = (dataToMigrate.pendingReturns || []).reduce((sum, r) => sum + (Number(r.returnedAmount) || 0), 0);
        dataToMigrate.pendingPurchases = dataToMigrate.pendingPurchases || [];
        dataToMigrate.pendingOrders = dataToMigrate.pendingOrders || [];

        // 🛡️ استرجاع وترحيل بيانات السيريالات من التخزين المستقل FinanceDB لليوم الجديد
        if (window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function') {
            try {
                const offloadedSerials = await window.FinanceDB.loadSerialsData();
                if (offloadedSerials && Array.isArray(offloadedSerials.serialNumbersLog)) {
                    dataToMigrate.serialNumbersLog = offloadedSerials.serialNumbersLog;
                    if (Array.isArray(offloadedSerials.standaloneSerials)) {
                        dataToMigrate.standaloneSerials = offloadedSerials.standaloneSerials;
                    }
                }
                window._serialsLoadFailed = false;
            } catch (serErr) {
                console.error("❌ فشل استعادة السيريالات أثناء الترحيل اليدوي:", serErr);
            }
        }

        // سجل عمليات بداية الترحيل
        dataToMigrate.log = [{
            id: typeof generateUniqueId === 'function' ? generateUniqueId('LOG') : `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "ترحيل يدوي",
            details: `ترحيل يدوي معتمد للأصول والأرصدة من يوم (${sourceDate}) إلى (${targetDate})`
        }];

        const totalLiquidity = (dataToMigrate.accounts && Array.isArray(dataToMigrate.accounts) && dataToMigrate.accounts.length > 0)
            ? dataToMigrate.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
            : (Number(dataToMigrate.liquidity) || 0);

        dataToMigrate.liquidityLog = [{
            id: typeof generateUniqueId === 'function' ? generateUniqueId('LIQ') : `liq-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "adjust",
            amount: 0,
            description: `رصيد افتتاح مرحل يدوياً من يوم ${sourceDate}`,
            currentBalance: totalLiquidity
        }];

        // تطبيق الحالة على اليوم المستهدف
        loadState(dataToMigrate, targetDate);
        window.pendingOrders = dataToMigrate.pendingOrders || [];
        window._loadFailed = false;

        // 🛡️ تحديث حارس الحفظ بالسماح بالانكماش وتسجيل الحالة الجديدة لتفادي إيقاف الحفظ
        if (typeof window.SaveGuard !== 'undefined') {
            if (typeof window.SaveGuard.recordLoadedState === 'function') {
                window.SaveGuard.recordLoadedState(dataToMigrate);
            }
            if (typeof window.SaveGuard.allowShrinkOnce === 'function') {
                window.SaveGuard.allowShrinkOnce();
            }
        }

        // تحديث نسخة الظل الاحتياطية في المتصفح
        try {
            localStorage.setItem('goodsMgmt_SHADOW_BACKUP', JSON.stringify(dataToMigrate));
        } catch(e) {}

        // تهيئة المزامنة الثنائية
        if (typeof window.initDualWriteState === 'function') window.initDualWriteState();

        // تحديث الواجهة فوراً
        updateUI();

        // حفظ اليوم المفتوح بالسحابة بالأرصدة الجديدة
        await saveSystemToCloud({ immediate: true });

        const successText = `✅ تم ترحيل كافة الأرصدة من يوم (${sourceDate}) وتثبيتها بنجاح لتاريخ اليوم (${targetDate}).`;
        if (loadMsg) showMessage(loadMsg, successText, false);
        if (typeof showGlobalMessage === 'function') showGlobalMessage(successText, false);
        alert(successText);

    } catch (err) {
        console.error("❌ خطأ أثناء الترحيل اليدوي:", err);
        const errMsg = "حدث خطأ أثناء الترحيل اليدوي: " + (err.message || err);
        if (loadMsg) showMessage(loadMsg, errMsg, true);
        alert(errMsg);
    }
};

// =========================================================================
// 🔙 دالة العودة الفورية لليوم الحالي من وضع استعراض الأرشيف
// =========================================================================
window.returnToCurrentDay = async function() {
    const todayStr = (typeof getTodayDateString === 'function') 
        ? getTodayDateString() 
        : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));

    const warningBanner = document.getElementById('historical-date-warning');

    if (currentLoadedDate === todayStr) {
        if (warningBanner) warningBanner.classList.add('hidden');
        return;
    }

    const loadMsg = document.getElementById("load-message-alt");
    if (loadMsg) showMessage(loadMsg, "جاري العودة لليوم الحالي...", false, true);
    
    const loadResult = await loadDataForDate(todayStr);
    if (loadResult) {
        if (warningBanner) warningBanner.classList.add('hidden');
        const dateInp = document.getElementById('load-date-alt');
        if (dateInp) {
            dateInp.value = todayStr;
            const dayNameDisplay = document.getElementById('load-date-day-name-alt');
            if (typeof updateLoadDateDayName === 'function' && dayNameDisplay) {
                updateLoadDateDayName(todayStr, dayNameDisplay);
            }
        }
        updateUI();
        if (loadMsg) showMessage(loadMsg, `تمت العودة لبيانات اليوم الحالي (${todayStr}).`, false);
    } else {
        if (loadMsg) showMessage(loadMsg, "تعذر العودة لليوم الحالي، يرجى التأكد من اتصال الإنترنت.", true);
    }
};// =======================================================

