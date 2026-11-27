window.toggleAutoSave = function toggleAutoSave(silent = false) {
    const autoSaveToggle = d('auto-save-toggle');
    if (!autoSaveToggle) return;
    isAutoSaveEnabled = autoSaveToggle.checked;

    if (isAutoSaveEnabled) {
        // إذا تم تفعيل الميزة
        if (autoSaveTimer) clearInterval(autoSaveTimer); // أوقف أي مؤقت قديم احتياطياً

        // ابدأ مؤقت جديد يعمل كل 20 ثانية مع حماية صارمة لبيانات الأرشيف ومنع الحفظ الفارغ المتكرر
        autoSaveTimer = setInterval(async () => {
            if (window._isLoadingDate || window.isSavingDataLock || !window.currentUser || window._loadFailed || window._serialsLoadFailed) {
                return;
            }

            const todayStr = (typeof getTodayDateString === 'function') 
                ? getTodayDateString() 
                : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
            
            const activeDate = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) 
                ? currentLoadedDate 
                : (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate ? window.currentLoadedDate : null);

            if (!activeDate) {
                return;
            }

            // 🌅 الترحيل التلقائي عند عبور منتصف الليل (12:00 ص) والبرنامج مفتوح في وضع العمل العادي (وليس وضع الأرشيف)
            if (!window._isArchiveBrowsingMode && activeDate < todayStr && !window._midnightRolloverInProgress) {
                const openModal = document.querySelector('.modal[style*="display: block"], .modal[style*="display: flex"]');
                if (!openModal) {
                    window._midnightRolloverInProgress = true;
                    try {
                        console.log(`🌅 [Midnight Rollover] تم رصد دخول يوم جديد (${todayStr}) بعد (${activeDate}). جاري حفظ اليوم المنقضي وترحيل الأرصدة تلقائياً...`);
                        if (window.hasUnsavedChanges || window._autoSaveDirty || window._pendingCloudSave) {
                            const prevSavedOk = await saveCurrentStateByDate(activeDate, true);
                            if (!prevSavedOk) {
                                console.warn("[Midnight Rollover] تم تأجيل الترحيل لأن حفظ اليوم المنقضي لم يكتمل بعد.");
                                return;
                            }
                        }
                        const rolledOk = await loadDataForDate(todayStr);
                        if (rolledOk) {
                            const dateInp = document.getElementById('load-date-alt');
                            if (dateInp) {
                                dateInp.value = todayStr;
                                const dayNameDisplay = document.getElementById('load-date-day-name-alt');
                                if (typeof updateLoadDateDayName === 'function' && dayNameDisplay) {
                                    updateLoadDateDayName(todayStr, dayNameDisplay);
                                }
                            }
                            if (typeof showGlobalMessage === 'function') {
                                showGlobalMessage(`🌅 بدأ يوم جديد (${todayStr}) — تم حفظ يوم أمس وترحيل الأرصدة تلقائياً.`, false, true);
                            }
                        }
                    } catch (midErr) {
                        console.warn("[Midnight Rollover] تعذر الترحيل التلقائي عند منتصف الليل:", midErr);
                    } finally {
                        window._midnightRolloverInProgress = false;
                    }
                }
                return;
            }

            // 🛡️ حماية حاسمة: منع الحفظ التلقائي منعاً باتاً إذا كان المستخدم يستعرض يوماً سابقاً في الأرشيف
            if (activeDate !== todayStr || window._isArchiveBrowsingMode) {
                console.log(`[AutoSave Guard] تم تخطي الحفظ التلقائي لحماية بيانات اليوم الحالي؛ البرنامج الآن يستعرض أرشيف يوم (${activeDate}).`);
                return;
            }

            // 🛡️ منع استهلاك فتحات النسخ الاحتياطي المحلية الـ 5 أو إرسال طلبات سحابية متكررة إذا لم يحدث أي تغيير منذ آخر حفظ
            if (!window.hasUnsavedChanges && !window._autoSaveDirty && !window._pendingCloudSave) {
                return;
            }

            console.log("Auto-saving modified data for active date:", activeDate);
            const savedOk = await saveCurrentStateByDate(activeDate);
            if (savedOk) {
                const tempMsg = d("global-message");
                if (tempMsg) {
                    showMessage(tempMsg, `تم الحفظ تلقائياً... ${new Date().toLocaleTimeString()}`, false, true);
                }
            }
        }, 20000);

        if (!silent) {
            showGlobalMessage("تم تفعيل الحفظ التلقائي.", false);
        }
        saveData(lsAutoSaveKey, true); // حفظ تفضيل المستخدم

    } else {
        // إذا تم إيقاف الميزة
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer); // أوقف المؤقت
            autoSaveTimer = null;
            if (!silent) {
                showGlobalMessage("تم إيقاف الحفظ التلقائي.", false, true);
            }
        }
        saveData(lsAutoSaveKey, false); // حفظ تفضيل المستخدم
    }
}
async function loadDataForDate(dateString) {
    window._loadDateReqSeq = (window._loadDateReqSeq || 0) + 1;
    const myLoadSeq = window._loadDateReqSeq;
    window._isLoadingDate = true;
    if (typeof window.resetSerialsLoadState === 'function') window.resetSerialsLoadState();
    const todayStr = (typeof getTodayDateString === 'function') 
        ? getTodayDateString() 
        : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
    const prevLoadedDate = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate)
        ? currentLoadedDate
        : (window.currentLoadedDate || null);

    if (window._saveTimeout && window._pendingSaveFunction) {
        clearTimeout(window._saveTimeout);
        window._saveTimeout = null;
        if (!prevLoadedDate || prevLoadedDate === todayStr) {
            console.log("Flushing pending save before loading new date...");
            await window._pendingSaveFunction();
        } else {
            window._pendingSaveFunction = null;
        }
    }
    if ((window._pendingCloudSave || window.hasUnsavedChanges) && !window._loadFailed && !window._serialsLoadFailed && typeof window.saveSystemToCloud === 'function') {
        if (!prevLoadedDate || prevLoadedDate === todayStr) {
            console.log("Flushing pending saveSystemToCloud for today before loading new date...");
            try {
                await window.saveSystemToCloud({ immediate: true });
            } catch (flushErr) {
                console.warn("Failed to flush pending cloud save before switching dates:", flushErr);
            }
        } else {
            // إذا كنا نغادر يوم أرشيف سابق بدون حفظ يدوي، نلغي أي مؤقت معلق حتى لا يُكتب الأرشيف بدون تأكيد
            if (window._pendingCloudSave) {
                clearTimeout(window._pendingCloudSave);
                window._pendingCloudSave = null;
            }
            window.hasUnsavedChanges = false;
        }
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
        // 🚀 استهلاك الجلب المسبق المتوازي (إن وجد عند فتح البرنامج) أو تشغيل جلب اليوم والسيريالات بالتوازي فوراً
        const prefetch = (
            window._startupDataPrefetch &&
            window._startupDataPrefetch.uid === userId &&
            window._startupDataPrefetch.dateString === dateString &&
            (Date.now() - (window._startupDataPrefetch.createdAt || 0)) < 30000
        ) ? window._startupDataPrefetch : null;
        window._startupDataPrefetch = null;

        const docRef = window.doc(window.db, "users", userId, "days", dateString);
        const dayDocPromise = (prefetch && prefetch.dayDocPromise)
            ? prefetch.dayDocPromise
            : window.getDoc(docRef, { serverOnly: true });

        const serialsPromise = (prefetch && prefetch.serialsPromise)
            ? prefetch.serialsPromise
            : ((window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function')
                ? window.FinanceDB.loadSerialsData(userId).catch(err => ({ __prefetchError: err }))
                : Promise.resolve(null));

        const summaryPrefetchPromise = (prefetch && prefetch.summaryDocPromise)
            ? prefetch.summaryDocPromise
            : null;

        // 1. محاولة جلب بيانات اليوم المختار مباشرة من السيرفر لمنع تحميل كاش قديم ومسح حركات أحدث
        const docSnap = await dayDocPromise;
        if (myLoadSeq !== window._loadDateReqSeq) {
            console.log(`[loadDataForDate] تم تجاهل نتيجة تحميل قديمة للتاريخ ${dateString} لوجود طلب أحدث.`);
            return false;
        }
        if (docSnap && docSnap.__prefetchError) {
            throw docSnap.__prefetchError;
        }
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

            // 🛡️ [مشكلة 3]: استرجاع السيريالات من التخزين المستقل FinanceDB (تعمل بالتوازي منذ بداية الطلب)
            if (window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function') {
                try {
                    const offloadedSerials = await serialsPromise;
                    if (offloadedSerials && offloadedSerials.__prefetchError) {
                        throw offloadedSerials.__prefetchError;
                    }
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

            // 🛡️ إنشاء نسخة الظل (Shadow Backup) مقيدة بمعرف المستخدم لمنع تسرب البيانات بين الحسابات
            try { 
                const shadowPayload = { ...loadedDayData, _userId: userId };
                localStorage.setItem(`goodsMgmt_SHADOW_BACKUP_${userId}`, JSON.stringify(shadowPayload)); 
                window._shadowLengths = { products: (loadedDayData.products||[]).length, debtors: (loadedDayData.debtors||[]).length, liabilities: (loadedDayData.liabilities||[]).length, pendingSales: (loadedDayData.pendingSales||[]).length };
            } catch(e){ console.warn("تعذر حفظ SHADOW_BACKUP في localStorage:", e); }
            if (typeof window.SaveGuard !== 'undefined' && typeof window.SaveGuard.recordLoadedState === 'function') {
                window.SaveGuard.recordLoadedState(loadedDayData);
            }
            
            // �� تأمين تحميل الفواتير المعلقة لنظام الاستبدال
            window.pendingOrders = docSnap.data().pendingOrders || []; 

            migrateDebtorsToProfiles();
            window._isArchiveBrowsingMode = Boolean(dateString !== todayStr);
            window._autoSaveDirty = false;
            if(loadMsg) showMessage(loadMsg, `تم تحميل بيانات يوم ${dateString} بنجاح.`, false);
            updateUI();
            if (typeof window.initDualWriteState === 'function') window.initDualWriteState();
            return true;
        } else {
            // 🛡️ حماية الأرشيف: إذا طلب المستخدم استعراض تاريخ غير اليوم الحالي (سابق أو مستقبلي) ولم تكن له وثيقة مسجلة في السحابة،
            // يُمنع منعاً باتاً تشغيل "الترحيل التلقائي ليوم جديد" على تاريخ أرشيفي حتى لا يُنشأ يوم وهمي في الماضي أو تُرحل فروقات خاطئة!
            if (dateString !== todayStr) {
                const noArchiveMsg = `⚠️ لا توجد بيانات مسجلة في الأرشيف لتاريخ (${dateString}). لم يتم تغيير اليوم المعروض حالياً.`;
                console.warn(`[Archive Guard] ${noArchiveMsg}`);
                if (loadMsg) showMessage(loadMsg, noArchiveMsg, true);
                if (typeof showGlobalMessage === 'function') showGlobalMessage(noArchiveMsg, true);
                const dateInp = document.getElementById('load-date-alt');
                if (dateInp && prevLoadedDate) {
                    dateInp.value = prevLoadedDate;
                    const dayNameDisplay = document.getElementById('load-date-day-name-alt');
                    if (typeof updateLoadDateDayName === 'function' && dayNameDisplay) {
                        updateLoadDateDayName(prevLoadedDate, dayNameDisplay);
                    }
                }
                return false;
            }

            // الحالة ب: يوم جديد لتاريخ اليوم الحالي فقط (بدء ترحيل الأرصدة من آخر وضع للبرنامج)
            window._isArchiveBrowsingMode = false;
            console.log("يوم جديد.. جاري ترحيل الأصول والأرصدة...");
            
            let dataToMigrate = null;
            let sourceName = "";

            // ⚡ المسار السريع: فحص وثيقة latestBalances من الخادم مباشرة (تستخدم الجلب المسبق المتوازي إن وجد)
            try {
                const summaryDocRef = window.doc(window.db, "users", userId, "summaries", "latestBalances");
                const summarySnap = summaryPrefetchPromise
                    ? await summaryPrefetchPromise
                    : await window.getDoc(summaryDocRef, { serverOnly: true });
                if (summarySnap && summarySnap.__prefetchError) {
                    throw summarySnap.__prefetchError;
                }
                if (summarySnap && summarySnap._unreachable) {
                    const unreachErr = new Error("تعذر الاتصال بالخادم لقراءة أحدث الأرصدة (latestBalances).");
                    unreachErr._unreachable = true;
                    throw unreachErr;
                }

                if (summarySnap && summarySnap.exists()) {
                    const summaryData = summarySnap.data() || {};
                    const datesCandidates = [summaryData.summaryForDate || '', summaryData.savedForDate || ''].filter(Boolean).sort();
                    const sDate = datesCandidates.length > 0 ? datesCandidates[datesCandidates.length - 1] : '';
                    if (isStateMeaningful(summaryData) && (sDate ? sDate <= dateString : dateString >= todayStr)) {
                        dataToMigrate = JSON.parse(JSON.stringify(summaryData));
                        sourceName = sDate ? `أحدث أرصدة معتمدة (${sDate})` : "أحدث أرصدة مسجلة بالسحابة";
                        console.log(`⚡ [Fast Rollover] تم اعتماد وثيقة latestBalances للترحيل السريع بنجاح (${sourceName}).`);
                    }
                }
            } catch (sumErr) {
                if (sumErr && sumErr._unreachable) throw sumErr;
                console.warn("تعذر جلب latestBalances للترحيل السريع، سيتم البحث في الأيام:", sumErr);
            }

            // إذا لم تتوفر وثيقة latestBalances، يتم البحث السريع في آخر الأيام السابقة (5 أيام كحد أقصى)
            if (!dataToMigrate) {
                const latestValidDay = await findLatestValidDayBeforeDate(userId, dateString);

                if (latestValidDay && latestValidDay.data) {
                    dataToMigrate = latestValidDay.data;
                    sourceName = `آخر يوم صالح (${latestValidDay.date})`;
                } else {
                    const prevDateStr = (typeof getPreviousDayString === 'function')
                        ? getPreviousDayString(dateString)
                        : (() => {
                            const yesterday = new Date(dateString + 'T00:00:00');
                            yesterday.setDate(yesterday.getDate() - 1);
                            return getCairoDateString(yesterday);
                        })();
                    const prevDocRef = window.doc(window.db, "users", userId, "days", prevDateStr);
                    const prevSnap = await window.getDoc(prevDocRef, { serverOnly: true });
                    if (prevSnap && prevSnap._unreachable) {
                        throw new Error(`تعذر الاتصال بالخادم لقراءة بيانات يوم ${prevDateStr}.`);
                    }
                    if (prevSnap && prevSnap.exists()) {
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
                dataToMigrate.purchaseReturns = [];
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
                
                // 🛡️ [مشكلة 3]: استرجاع السيريالات لليوم الجديد من وحدة التخزين المستقلة (بالتوازي منذ بداية الطلب)
                if (window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function') {
                    try {
                        const offloadedSerials = await serialsPromise;
                        if (offloadedSerials && offloadedSerials.__prefetchError) {
                            throw offloadedSerials.__prefetchError;
                        }
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

                // 🛡️ إنشاء نسخة الظل (Shadow Backup) مقيدة بمعرف المستخدم
                try { 
                    const shadowPayload = { ...dataToMigrate, _userId: userId };
                    localStorage.setItem(`goodsMgmt_SHADOW_BACKUP_${userId}`, JSON.stringify(shadowPayload)); 
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
                    const restoredData = JSON.parse(JSON.stringify(backupInfo.data));
                    if (restoredData.savedForDate && restoredData.savedForDate !== dateString) {
                        restoredData.salesToday = [];
                        restoredData.purchaseInvoices = [];
                        restoredData.purchaseReturns = [];
                        restoredData.completedReturns = [];
                        restoredData.expenses = 0;
                        restoredData.profit = 0;
                    }
                    window._loadFailed = false;
                    window._serialsLoadFailed = false;
                    loadState(restoredData, dateString);
                    if (typeof window.SaveGuard !== 'undefined' && typeof window.SaveGuard.recordLoadedState === 'function') {
                        window.SaveGuard.recordLoadedState(restoredData);
                    }
                    updateUI();
                    if (typeof window.initDualWriteState === 'function') window.initDualWriteState();
                    if(loadMsg) showMessage(loadMsg, "تم استرجاع الأرصدة من النسخة المحلية لتفادي تصفير النظام.", false);
                    return true;
                }

                console.log("بداية نظام فارغ.");
                if (typeof resetAllData === 'function') resetAllData();
                else resetState();
                accounts = [{ id: 'main', name: 'الخزينة الرئيسية', balance: 0.00 }];
                currentLoadedDate = dateString;
                
                window.pendingOrders = []; // تصفير الطلبيات المعلقة
                window._loadFailed = false;
                window._serialsLoadFailed = false;

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
        const currentUid = (window.currentUser && window.currentUser.uid) ? window.currentUser.uid : null;
        if (!currentUid) return { available: false, source: null, data: null };
        const isValidBackup = (parsed) => {
            if (!parsed || typeof parsed !== 'object') return false;
            // عند تسجيل الدخول، لا نقبل إلا النسخ التي تخص نفس المستخدم لمنع تسرب بيانات مستخدم آخر
            if (currentUid && parsed._userId !== currentUid) return false;
            if (typeof isStateMeaningful === 'function') return isStateMeaningful(parsed);
            return (Array.isArray(parsed.products) && parsed.products.length > 0) || (Array.isArray(parsed.accounts) && parsed.accounts.length > 0);
        };
        const candidates = [];
        const shadowKey = currentUid ? `goodsMgmt_SHADOW_BACKUP_${currentUid}` : 'goodsMgmt_SHADOW_BACKUP';
        const shadowRaw = localStorage.getItem(shadowKey);
        if (shadowRaw) {
            const parsed = JSON.parse(shadowRaw);
            if (isValidBackup(parsed)) {
                candidates.push({ source: shadowKey, data: parsed, ts: String(parsed.savedAt || parsed.lastUpdated || parsed.savedForDate || '') });
            }
        }
        const userPrefix = currentUid ? `emergency_backup_${currentUid}_` : 'emergency_backup_';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(userPrefix)) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (isValidBackup(parsed)) {
                        candidates.push({ source: key, data: parsed, ts: String(parsed.savedAt || parsed.lastUpdated || parsed.savedForDate || '') });
                    }
                }
            }
        }
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.ts.localeCompare(a.ts));
            return { available: true, source: candidates[0].source, data: candidates[0].data };
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

    if (window._saveTimeout) {
        clearTimeout(window._saveTimeout);
        window._saveTimeout = null;
        window._pendingSaveFunction = null;
    }
    if (window._pendingCloudSave) {
        clearTimeout(window._pendingCloudSave);
        window._pendingCloudSave = null;
    }
    window._isLoadingDate = true;

    try {
        const userId = window.currentUser.uid;
        const docRef = window.doc(window.db, "users", userId, "days", sourceDate);
        const dayPromise = window.getDoc(docRef, { serverOnly: true });
        const serialsPromise = (window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function')
            ? window.FinanceDB.loadSerialsData(userId).catch(err => ({ __serialsError: err }))
            : Promise.resolve(null);

        const docSnap = await dayPromise;
        if (docSnap && docSnap._unreachable) {
            alert(`تعذر الاتصال بالخادم لقراءة بيانات تاريخ (${sourceDate}). يرجى التحقق من الإنترنت.`);
            if (loadMsg) showMessage(loadMsg, "تعذر الاتصال بالخادم.", true);
            return;
        }

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

        // 🛡️ تصفير الحركات اليومية المنتهية فقط (مع الحفاظ على الخسائر المسجلة التراكمية recordedLosses لتتطابق مع الترحيل التلقائي)
        dataToMigrate.salesToday = [];
        dataToMigrate.purchaseInvoices = [];
        dataToMigrate.completedReturns = [];
        dataToMigrate.purchaseReturns = [];
        dataToMigrate.expenses = 0;
        dataToMigrate.profit = 0;

        // الحفاظ على الأصول المعلقة والأرصدة التراكمية
        dataToMigrate.pendingReturns = dataToMigrate.pendingReturns || [];
        dataToMigrate.pendingReturnsValue = (dataToMigrate.pendingReturns || []).reduce((sum, r) => sum + (Number(r.returnedAmount) || 0), 0);
        dataToMigrate.pendingPurchases = dataToMigrate.pendingPurchases || [];
        dataToMigrate.pendingOrders = dataToMigrate.pendingOrders || [];

        // 🛡️ استرجاع وترحيل بيانات السيريالات من التخزين المستقل FinanceDB لليوم الجديد (وإيقاف الترحيل إذا فشل الجلب لمنع مسح السيريالات)
        if (window.FinanceDB && typeof window.FinanceDB.loadSerialsData === 'function') {
            const offloadedSerials = await serialsPromise;
            if (offloadedSerials && offloadedSerials.__serialsError) {
                console.error("❌ فشل استعادة السيريالات أثناء الترحيل اليدوي:", offloadedSerials.__serialsError);
                throw new Error("تعذر استعادة بيانات السيريالات من السحابة أثناء الترحيل اليدوي. تم إلغاء العملية لحماية السيريالات من الضياع.");
            }
            if (offloadedSerials && Array.isArray(offloadedSerials.serialNumbersLog)) {
                dataToMigrate.serialNumbersLog = offloadedSerials.serialNumbersLog;
                if (Array.isArray(offloadedSerials.standaloneSerials)) {
                    dataToMigrate.standaloneSerials = offloadedSerials.standaloneSerials;
                }
            }
            window._serialsLoadFailed = false;
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
        window._isArchiveBrowsingMode = false;
        window._autoSaveDirty = false;

        // تحديث حقل التاريخ في الواجهة ليطابق اليوم المستهدف (اليوم الحالي)
        const dateInp = document.getElementById('load-date-alt');
        if (dateInp) {
            dateInp.value = targetDate;
            const dayNameDisplay = document.getElementById('load-date-day-name-alt');
            if (typeof updateLoadDateDayName === 'function' && dayNameDisplay) {
                updateLoadDateDayName(targetDate, dayNameDisplay);
            }
        }

        // 🛡️ تحديث حارس الحفظ بالسماح بالانكماش وتسجيل الحالة الجديدة لتفادي إيقاف الحفظ
        if (typeof window.SaveGuard !== 'undefined') {
            if (typeof window.SaveGuard.recordLoadedState === 'function') {
                window.SaveGuard.recordLoadedState(dataToMigrate);
            }
            if (typeof window.SaveGuard.allowShrinkOnce === 'function') {
                window.SaveGuard.allowShrinkOnce();
            }
        }

        // تحديث نسخة الظل الاحتياطية المقيدة بمعرف المستخدم في المتصفح
        try {
            localStorage.setItem(`goodsMgmt_SHADOW_BACKUP_${userId}`, JSON.stringify({ ...dataToMigrate, _userId: userId }));
        } catch (e) { console.warn('[logs-daily-state.js] تم تجاهل خطأ:', e); }

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
    } finally {
        window._isLoadingDate = false;
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

