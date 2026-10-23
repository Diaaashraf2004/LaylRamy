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
        'purchaseInvoices',
        'completedReturns',
        'pendingReturns',
        'debtorProfiles',
        'debtCollectionNotes'
    ];

    function allowShrinkOnce() {
        shrinkAllowedOnce = true;
        console.log('[SaveGuard] تم السماح بالانكماش لمرة واحدة فقط بتأكيد صريح من المستخدم.');
    }

    function recordLoadedState(state) {
        if (!state) return;
        CRITICAL_ARRAYS.forEach(key => {
            if (Array.isArray(state[key])) {
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

        // إذا تم إعطاء تصريح لمرة واحدة بعد تأكيد المستخدم لتنفيذ حذف جماعي معتمد
        if (shrinkAllowedOnce) {
            console.log('[SaveGuard] تم تجاوز فحص الانكماش لهذه العملية بتصريح allowShrinkOnce.');
            return true;
        }

        for (const key of CRITICAL_ARRAYS) {
            const initial = loadedCounts[key];
            if (typeof initial === 'number' && initial >= 5) {
                let currentArr = stateToSave[key];
                if (key === 'serialNumbersLog' && stateToSave._serialsOffloaded && typeof global.serialNumbersLog !== 'undefined') {
                    currentArr = global.serialNumbersLog;
                } else if (typeof currentArr === 'undefined' && typeof global[key] !== 'undefined') {
                    currentArr = global[key];
                }
                const current = Array.isArray(currentArr) ? currentArr.length : 0;

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
