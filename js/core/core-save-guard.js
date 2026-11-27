// js/core/core-save-guard.js — حارس حماية الحفظ السحابي من انكماش أو تفريغ البيانات
(function (global) {
    'use strict';

    const loadedCounts = {};
    let shrinkAllowedOnce = false;

    const CRITICAL_ARRAYS = [
        'products',
        'suppliers',
        'accounts',
        'debtors',
        'liabilities',
        'monthlyLiabilities',
        'pendingSales',
        'salesToday',
        'serialNumbersLog',
        'standaloneSerials',
        'purchaseInvoices',
        'purchaseReturns',
        'pendingPurchases',
        'pendingOrders',
        'completedReturns',
        'pendingReturns',
        'debtorProfiles',
        'debtCollectionNotes'
    ];

    function allowShrinkOnce() {
        shrinkAllowedOnce = true;
        console.log('[SaveGuard] تم السماح بالانكماش لمرة واحدة فقط بتأكيد صريح من المستخدم.');
    }

    function clearAllowShrinkOnce() {
        shrinkAllowedOnce = false;
    }

    function recordLoadedState(state) {
        if (!state) return;
        CRITICAL_ARRAYS.forEach(key => {
            if (key === 'serialNumbersLog' && (state._serialsOffloaded || state._serialsCount)) {
                loadedCounts[key] = state._serialsCount || (Array.isArray(state[key]) && state[key].length ? state[key].length : (typeof global.serialNumbersLog !== 'undefined' && Array.isArray(global.serialNumbersLog) ? global.serialNumbersLog.length : (loadedCounts[key] || 0)));
            } else if (key === 'standaloneSerials' && (state._serialsOffloaded || typeof state._standaloneSerialsCount === 'number' || typeof state[key] === 'undefined')) {
                const liveStandalone = (typeof global.getStandaloneSerials === 'function') ? global.getStandaloneSerials() : (Array.isArray(global._tempStandaloneSerials) ? global._tempStandaloneSerials : []);
                loadedCounts[key] = (typeof state._standaloneSerialsCount === 'number') ? state._standaloneSerialsCount : (Array.isArray(state[key]) && state[key].length ? state[key].length : liveStandalone.length);
            } else if (Array.isArray(state[key])) {
                loadedCounts[key] = state[key].length;
            } else if (typeof global[key] !== 'undefined' && Array.isArray(global[key])) {
                loadedCounts[key] = global[key].length;
            }
        });
        shrinkAllowedOnce = false; // إعادة التصفير التلقائي فور إتمام وتسجيل أي حفظ
        console.log('[SaveGuard] تم تحديث أعداد المصفوفات الحرجة وتصفير تصريح الانكماش:', loadedCounts);
    }

    function canSaveState(stateToSave) {
        if (!stateToSave) return true;

        // حارس منع حفظ أي قيم مالية فاسدة (NaN / Infinity) إلى السحابة حتى مع التصاريح
        if (global.FinancialIntegrityGuard && typeof global.FinancialIntegrityGuard.hasCriticalCorruption === 'function') {
            const corruptions = global.FinancialIntegrityGuard.hasCriticalCorruption(stateToSave);
            if (corruptions.length > 0) {
                const msg = `🚨 خطأ حرج: تم منع الحفظ السحابي لحماية رأس المال والسيولة بسبب قيم رقمية فاسدة (${corruptions[0]}).`;
                if (typeof global.showGlobalMessage === 'function') global.showGlobalMessage(msg, true);
                console.error('[SaveGuard][IntegrityGuard]', msg, corruptions);
                return false;
            }
        }

        // حماية صارمة للخزائن (accounts): يُمنع تفريغها بالكامل حتى مع تصريح allowShrinkOnce
        const initialAccounts = loadedCounts['accounts'];
        if (typeof initialAccounts === 'number' && initialAccounts >= 1) {
            const currentAccArr = Array.isArray(stateToSave['accounts'])
                ? stateToSave['accounts']
                : (Array.isArray(global['accounts']) ? global['accounts'] : []);
            if (currentAccArr.length === 0) {
                const msg = `⚠️ خطأ حرج: تم منع الحفظ السحابي لأن مصفوفة الخزائن (accounts) أصبحت فارغة (كانت ${initialAccounts} والآن 0).`;
                if (typeof global.showGlobalMessage === 'function') global.showGlobalMessage(msg, true);
                console.error('[SaveGuard]', msg);
                return false;
            }
        }

        // إذا تم إعطاء تصريح لمرة واحدة بعد تأكيد المستخدم لتنفيذ حذف جماعي معتمد
        if (shrinkAllowedOnce) {
            console.log('[SaveGuard] تم تجاوز فحص الانكماش لهذه العملية بتصريح allowShrinkOnce.');
            return true;
        }

        for (const key of CRITICAL_ARRAYS) {
            const initial = loadedCounts[key];
            if (typeof initial !== 'number') continue;

            let currentArr = stateToSave[key];
            if (key === 'serialNumbersLog' && stateToSave._serialsOffloaded && typeof global.serialNumbersLog !== 'undefined') {
                currentArr = global.serialNumbersLog;
            } else if (key === 'standaloneSerials' && (stateToSave._serialsOffloaded || typeof currentArr === 'undefined')) {
                currentArr = (typeof global.getStandaloneSerials === 'function') ? global.getStandaloneSerials() : (Array.isArray(global._tempStandaloneSerials) ? global._tempStandaloneSerials : []);
            } else if (typeof currentArr === 'undefined' && typeof global[key] !== 'undefined') {
                currentArr = global[key];
            }
            const current = Array.isArray(currentArr) ? currentArr.length : 0;

            // حماية صارمة للخزائن (accounts): يُمنع تفريغها بالكامل حتى لو كان عددها أقل من 5
            if (key === 'accounts' && initial >= 1 && current === 0) {
                const msg = `⚠️ خطأ حرج: تم منع الحفظ السحابي لأن مصفوفة الخزائن (accounts) أصبحت فارغة (كانت ${initial} والآن 0).`;
                if (typeof global.showGlobalMessage === 'function') global.showGlobalMessage(msg, true);
                console.error('[SaveGuard]', msg);
                return false;
            }

            if (initial >= 5) {
                if (current === 0) {
                    const msg = `⚠️ خطأ حرج: تم منع الحفظ السحابي لأن مصفوفة ${key} أصبحت فارغة (كانت ${initial} والآن 0).`;
                    if (typeof global.showGlobalMessage === 'function') global.showGlobalMessage(msg, true);
                    console.error('[SaveGuard]', msg);
                    return false;
                }

                const decreaseRatio = (initial - current) / initial;
                if (decreaseRatio > 0.5) {
                    const msg = `⚠️ خطأ حرج: تم منع الحفظ السحابي لأن مصفوفة ${key} نقصت بأكثر من 50% (كانت ${initial} والآن ${current}).`;
                    if (typeof global.showGlobalMessage === 'function') global.showGlobalMessage(msg, true);
                    console.error('[SaveGuard]', msg);
                    return false;
                }
            }
        }
        return true;
    }

    global.SaveGuard = {
        CRITICAL_ARRAYS,
        recordLoadedState,
        canSaveState,
        allowShrinkOnce,
        clearAllowShrinkOnce,
        isShrinkAllowed: () => shrinkAllowedOnce,
        getLoadedCounts: () => ({ ...loadedCounts }),
        setLoadedCounts: (counts) => {
            Object.assign(loadedCounts, counts);
        },
        reset: () => {
            Object.keys(loadedCounts).forEach(k => delete loadedCounts[k]);
            shrinkAllowedOnce = false;
        }
    };
})(typeof window !== 'undefined' ? window : global);
