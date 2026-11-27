// finance-smart-delta.js
// This file contains the Smart Delta logic and the loadLatestBalances function.

window.captureHistoricalBaseline = function(dateStr) {
    const todayStr = typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
    if (dateStr !== todayStr) {
        console.log('[Smart Delta] Capturing full balance-sheet baseline for historical day:', dateStr);
        window.historicalBaseline = {
            accounts: JSON.parse(JSON.stringify(typeof accounts !== 'undefined' ? accounts : (window.accounts || []))),
            products: JSON.parse(JSON.stringify(typeof products !== 'undefined' ? products : (window.products || []))),
            debtors: JSON.parse(JSON.stringify(typeof debtors !== 'undefined' ? debtors : (window.debtors || []))),
            debtorProfiles: JSON.parse(JSON.stringify(typeof debtorProfiles !== 'undefined' ? debtorProfiles : (window.debtorProfiles || []))),
            liabilities: JSON.parse(JSON.stringify(typeof liabilities !== 'undefined' ? liabilities : (window.liabilities || []))),
            monthlyLiabilities: JSON.parse(JSON.stringify(typeof monthlyLiabilities !== 'undefined' ? monthlyLiabilities : (window.monthlyLiabilities || []))),
            recordedLosses: Number(typeof recordedLosses !== 'undefined' ? recordedLosses : (window.recordedLosses || 0)) || 0,
            pendingSales: JSON.parse(JSON.stringify(typeof pendingSales !== 'undefined' ? pendingSales : (window.pendingSales || []))),
            pendingPurchases: JSON.parse(JSON.stringify(typeof pendingPurchases !== 'undefined' ? pendingPurchases : (window.pendingPurchases || []))),
            pendingReturns: JSON.parse(JSON.stringify(typeof pendingReturns !== 'undefined' ? pendingReturns : (window.pendingReturns || []))),
            pendingOrders: JSON.parse(JSON.stringify(window.pendingOrders || []))
        };
    } else {
        window.historicalBaseline = null;
    }
};

window.processSmartDeltaRollover = async function(newState, dateStr) {
    if (!window.historicalBaseline) return;
    const oldState = window.historicalBaseline;
    const userId = window.currentUser ? window.currentUser.uid : null;
    if (!userId) return;

    if (window.SessionGuard && typeof window.SessionGuard.assertCanWrite === 'function') {
        const canWrite = await window.SessionGuard.assertCanWrite();
        if (!canWrite) return;
    }

    const m = (v) => (typeof window.money === 'function' ? window.money(v) : Math.round((Number(v) || 0) * 100) / 100);
    const computeNumDeltaMap = (oldArr, newArr, getVal) => {
        const deltaMap = {};
        const added = [];
        const deletedIds = [];
        let changed = false;
        (newArr || []).forEach(n => {
            const o = (oldArr || []).find(x => x.id === n.id);
            if (!o) {
                added.push(JSON.parse(JSON.stringify(n)));
                changed = true;
            } else {
                const diff = m(getVal(n) - getVal(o));
                if (diff !== 0) {
                    deltaMap[n.id] = diff;
                    changed = true;
                }
            }
        });
        (oldArr || []).forEach(o => {
            if (!(newArr || []).some(n => n.id === o.id)) {
                deletedIds.push(o.id);
                changed = true;
            }
        });
        return { deltaMap, added, deletedIds, changed };
    };

    const accDiff = computeNumDeltaMap(oldState.accounts, newState.accounts, a => Number(a.balance) || 0);
    const prodQtyDiff = computeNumDeltaMap(oldState.products, newState.products, p => Number(p.quantity) || 0);
    const prodCostChanged = {};
    (newState.products || []).forEach(np => {
        const op = (oldState.products || []).find(x => x.id === np.id);
        if (op && Number(op.costPrice) !== Number(np.costPrice)) {
            prodCostChanged[np.id] = Number(np.costPrice) || 0;
            prodQtyDiff.changed = true;
        }
    });
    const debtDiff = computeNumDeltaMap(oldState.debtors, newState.debtors, d => d.amount !== undefined ? Number(d.amount) : (Number(d.total_debt) || 0));
    const liabDiff = computeNumDeltaMap(oldState.liabilities, newState.liabilities, l => Number(l.amount) || 0);

    // تتبع التغييرات الوصفية وتاريخ السدادات في الالتزامات وبروفايلات العملاء والخسائر المسجلة
    const liabMetaById = {};
    (newState.liabilities || []).forEach(nl => {
        const ol = (oldState.liabilities || []).find(x => x.id === nl.id);
        if (ol && (
            JSON.stringify(ol.paymentHistory || []) !== JSON.stringify(nl.paymentHistory || []) ||
            JSON.stringify(ol.history || []) !== JSON.stringify(nl.history || []) ||
            JSON.stringify(ol.extraCostContributions || []) !== JSON.stringify(nl.extraCostContributions || []) ||
            ol.name !== nl.name || ol.status !== nl.status
        )) {
            liabMetaById[nl.id] = JSON.parse(JSON.stringify(nl));
            liabDiff.changed = true;
        }
    });

    const syncListDiff = (oldArr, newArr) => {
        const added = (newArr || []).filter(n => !(oldArr || []).some(o => o.id === n.id)).map(n => JSON.parse(JSON.stringify(n)));
        const deletedIds = (oldArr || []).filter(o => !(newArr || []).some(n => n.id === o.id)).map(o => o.id);
        const modified = (newArr || []).filter(n => {
            const o = (oldArr || []).find(x => x.id === n.id);
            return o && JSON.stringify(o) !== JSON.stringify(n);
        }).map(n => JSON.parse(JSON.stringify(n)));
        return { added, deletedIds, modified, changed: added.length > 0 || deletedIds.length > 0 || modified.length > 0 };
    };

    const psDiff = syncListDiff(oldState.pendingSales, newState.pendingSales);
    const ppDiff = syncListDiff(oldState.pendingPurchases, newState.pendingPurchases);
    const prDiff = syncListDiff(oldState.pendingReturns, newState.pendingReturns);
    const poDiff = syncListDiff(oldState.pendingOrders, newState.pendingOrders);
    const profDiff = syncListDiff(oldState.debtorProfiles || [], newState.debtorProfiles || []);
    const mLiabDiff = syncListDiff(oldState.monthlyLiabilities || [], newState.monthlyLiabilities || []);
    const lossesDelta = m((Number(newState.recordedLosses) || 0) - (Number(oldState.recordedLosses) || 0));

    const anyChanged = accDiff.changed || prodQtyDiff.changed || debtDiff.changed || liabDiff.changed
        || psDiff.changed || ppDiff.changed || prDiff.changed || poDiff.changed
        || profDiff.changed || mLiabDiff.changed || lossesDelta !== 0;
    if (!anyChanged) return;

    const mergeUniqueByKey = (arrA, arrB, keyFn) => {
        const map = new Map();
        (arrA || []).forEach(x => { if (x) map.set(keyFn(x), JSON.parse(JSON.stringify(x))); });
        (arrB || []).forEach(x => { if (x) map.set(keyFn(x), JSON.parse(JSON.stringify(x))); });
        return Array.from(map.values());
    };

    const applyAllDeltasToDoc = (targetData) => {
        const applyNum = (arr, diffObj, field, altField) => {
            let out = JSON.parse(JSON.stringify(arr || []));
            out.forEach(item => {
                if (diffObj.deltaMap[item.id]) {
                    const key = (item[field] !== undefined || !altField) ? field : altField;
                    item[key] = m((Number(item[key]) || 0) + diffObj.deltaMap[item.id]);
                }
            });
            diffObj.added.forEach(a => { if (!out.some(x => x.id === a.id)) out.push(JSON.parse(JSON.stringify(a))); });
            out = out.filter(x => !diffObj.deletedIds.includes(x.id));
            return out;
        };

        const applyList = (arr, diffObj) => {
            let out = JSON.parse(JSON.stringify(arr || []));
            out = out.filter(x => !diffObj.deletedIds.includes(x.id));
            diffObj.modified.forEach(mod => {
                const idx = out.findIndex(x => x.id === mod.id);
                if (idx > -1) out[idx] = JSON.parse(JSON.stringify(mod));
            });
            diffObj.added.forEach(a => { if (!out.some(x => x.id === a.id)) out.push(JSON.parse(JSON.stringify(a))); });
            return out;
        };

        const updatedProducts = applyNum(targetData.products, prodQtyDiff, 'quantity', null);
        updatedProducts.forEach(p => {
            if (prodCostChanged[p.id] !== undefined) p.costPrice = prodCostChanged[p.id];
        });

        const updatedLiabilities = applyNum(targetData.liabilities, liabDiff, 'amount', null);
        updatedLiabilities.forEach(l => {
            const metaSrc = liabMetaById[l.id];
            if (metaSrc) {
                if (metaSrc.name) l.name = metaSrc.name;
                if (Array.isArray(metaSrc.paymentHistory)) {
                    l.paymentHistory = mergeUniqueByKey(l.paymentHistory, metaSrc.paymentHistory, p => p.id || `${p.date || ''}|${Number(p.amount) || 0}|${p.accountId || ''}`);
                }
                if (Array.isArray(metaSrc.history)) {
                    l.history = mergeUniqueByKey(l.history, metaSrc.history, h => `${h.date || ''}|${Number(h.addedAmount) || 0}|${h.saleId || ''}`);
                }
                if (Array.isArray(metaSrc.extraCostContributions)) {
                    l.extraCostContributions = mergeUniqueByKey(l.extraCostContributions, metaSrc.extraCostContributions, c => `${c.invoiceId || ''}|${c.name || ''}|${Number(c.amount) || 0}`);
                }
                if (metaSrc.lastUpdated) l.lastUpdated = metaSrc.lastUpdated;
            }
            if ((Number(l.amount) || 0) <= 0.001) {
                l.amount = 0;
                l.status = 'paid';
            } else {
                l.status = 'active';
            }
        });

        // دمج بروفايلات العملاء مع الحفاظ على تاريخ السدادات paymentHistory
        let updatedProfiles = JSON.parse(JSON.stringify(targetData.debtorProfiles || []));
        if (profDiff.changed) {
            updatedProfiles = updatedProfiles.filter(x => !profDiff.deletedIds.includes(x.id));
            profDiff.modified.forEach(mod => {
                const idx = updatedProfiles.findIndex(x => x.id === mod.id);
                if (idx > -1) {
                    const mergedPays = mergeUniqueByKey(updatedProfiles[idx].paymentHistory, mod.paymentHistory, p => p.id || `${p.date || ''}|${Number(p.amount) || 0}|${p.debtReason || ''}`);
                    updatedProfiles[idx] = { ...updatedProfiles[idx], ...JSON.parse(JSON.stringify(mod)), paymentHistory: mergedPays };
                }
            });
            profDiff.added.forEach(a => { if (!updatedProfiles.some(x => x.id === a.id)) updatedProfiles.push(JSON.parse(JSON.stringify(a))); });
        }

        const updatedPendingReturns = applyList(targetData.pendingReturns, prDiff);
        const updatedPendingReturnsValue = m(updatedPendingReturns.reduce((s, r) => s + (Number(r.returnedAmount) || 0), 0));

        return {
            accounts: applyNum(targetData.accounts, accDiff, 'balance', null),
            products: updatedProducts,
            debtors: applyNum(targetData.debtors, debtDiff, 'amount', 'total_debt'),
            debtorProfiles: updatedProfiles,
            liabilities: updatedLiabilities,
            monthlyLiabilities: mLiabDiff.changed ? applyList(targetData.monthlyLiabilities, mLiabDiff) : (targetData.monthlyLiabilities || []),
            recordedLosses: m((Number(targetData.recordedLosses) || 0) + lossesDelta),
            pendingSales: applyList(targetData.pendingSales, psDiff),
            pendingPurchases: applyList(targetData.pendingPurchases, ppDiff),
            pendingReturns: updatedPendingReturns,
            pendingReturnsValue: updatedPendingReturnsValue,
            pendingOrders: applyList(targetData.pendingOrders, poDiff),
            lastUpdated: new Date().toISOString()
        };
    };

    try {
        const db = window.db;
        const summaryRef = window.doc(db, 'users', userId, 'summaries', 'latestBalances');
        const todayStr = typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
        const todayRef = (todayStr && todayStr !== dateStr) ? window.doc(db, 'users', userId, 'days', todayStr) : null;

        // قراءة المستندين معاً من الخادم أولاً ثم الكتابة الذرية بدفعة واحدة (Batch) لمنع تضاعف الفروقات عند إعادة المحاولة
        const [summarySnap, todaySnap] = await Promise.all([
            window.getDoc(summaryRef, { serverOnly: true }),
            todayRef ? window.getDoc(todayRef, { serverOnly: true }) : Promise.resolve(null)
        ]);

        if (!summarySnap || summarySnap._unreachable) {
            throw new Error('Smart Delta aborted: latestBalances server read unreachable');
        }
        if (todayRef && (!todaySnap || todaySnap._unreachable)) {
            throw new Error(`Smart Delta aborted: days/${todayStr} server read unreachable`);
        }

        const summaryPatch = summarySnap.exists() ? JSON.parse(JSON.stringify(applyAllDeltasToDoc(summarySnap.data() || {}))) : null;
        const todayPatch = (todayRef && todaySnap && todaySnap.exists()) ? JSON.parse(JSON.stringify(applyAllDeltasToDoc(todaySnap.data() || {}))) : null;

        if (summaryPatch || todayPatch) {
            if (typeof db.batch === 'function') {
                const batch = db.batch();
                if (summaryPatch) batch.set(summaryRef, summaryPatch, { merge: true });
                if (todayPatch) batch.set(todayRef, todayPatch, { merge: true });
                await batch.commit();
            } else {
                const writes = [];
                if (summaryPatch) writes.push(window.setDoc(summaryRef, summaryPatch, { merge: true }));
                if (todayPatch) writes.push(window.setDoc(todayRef, todayPatch, { merge: true }));
                await Promise.all(writes);
            }
        }

        console.log('[Smart Delta] Successfully rolled over full balance-sheet deltas atomically to latestBalances & today doc');
        window.historicalBaseline = {
            accounts: JSON.parse(JSON.stringify(newState.accounts || [])),
            products: JSON.parse(JSON.stringify(newState.products || [])),
            debtors: JSON.parse(JSON.stringify(newState.debtors || [])),
            debtorProfiles: JSON.parse(JSON.stringify(newState.debtorProfiles || [])),
            liabilities: JSON.parse(JSON.stringify(newState.liabilities || [])),
            monthlyLiabilities: JSON.parse(JSON.stringify(newState.monthlyLiabilities || [])),
            recordedLosses: Number(newState.recordedLosses) || 0,
            pendingSales: JSON.parse(JSON.stringify(newState.pendingSales || [])),
            pendingPurchases: JSON.parse(JSON.stringify(newState.pendingPurchases || [])),
            pendingReturns: JSON.parse(JSON.stringify(newState.pendingReturns || [])),
            pendingOrders: JSON.parse(JSON.stringify(newState.pendingOrders || []))
        };
    } catch (err) {
        console.error('Smart Delta error (historicalBaseline NOT advanced so delta can retry):', err);
        throw err;
    }
};

window.loadLatestBalances = function(callback) {
    console.log("Loading latestBalances...");
    if (!window.currentUser) {
        if (typeof callback === 'function') callback();
        return;
    }
    const docRef = window.doc(window.db, "users", window.currentUser.uid, "summaries", "latestBalances");
    window.getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.accounts) window.accounts = data.accounts;
            if (data.products) window.products = data.products;
            if (data.debtors) window.debtors = data.debtors;
            if (data.suppliers) window.suppliers = data.suppliers;
            if (data.liabilities) window.liabilities = data.liabilities;
            if (data.monthlyLiabilities) window.monthlyLiabilities = data.monthlyLiabilities;
            if (data.serialNumbersLog) window.serialNumbersLog = data.serialNumbersLog;
            if (data.debtorProfiles) window.debtorProfiles = data.debtorProfiles;
            if (data.debtCollectionNotes) window.debtCollectionNotes = data.debtCollectionNotes;
            if (data.pendingOrders) window.pendingOrders = data.pendingOrders;
            
            // Handle standaloneSerials correctly through the setter if available
            if (data.standaloneSerials) {
                if (typeof window.setStandaloneSerials === 'function') {
                    window.setStandaloneSerials(data.standaloneSerials);
                } else {
                    window.standaloneSerials = data.standaloneSerials;
                }
            }
            
            console.log("Loaded all arrays from latest balances.");
        } else {
            console.log("No latest balances found.");
        }
        if (typeof callback === 'function') callback();
    }).catch(err => {
        console.error("Error loading latest balances:", err);
        if (typeof callback === 'function') callback();
    });
};

// Expose globally for finance-core.js to use without "window." prefix
window.addEventListener('DOMContentLoaded', () => {
    // If not already in global scope, declare it
    if (typeof loadLatestBalances === 'undefined') {
        window.loadLatestBalances = window.loadLatestBalances; // Ensures it's available
    }
});
