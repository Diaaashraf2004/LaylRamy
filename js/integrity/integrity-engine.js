// js/integrity/integrity-engine.js
// محرك حارس سلامة رأس المال والسيولة (Financial Integrity Guard Engine)

const _FIG_DRIFT_TOLERANCE = 1.00;
const _FIG_CUMULATIVE_SIGNED_LIMIT = 5.00;
const _FIG_CUMULATIVE_ABS_LIMIT = 10.00;
const _FIG_MAX_HISTORY = 60;

const _figAuditHistory = [];
let _figLastAuditReport = null;
let _figLastObservedSnapshot = null;
let _figLastLoadedDate = null;
let _figActiveTxCount = 0;
let _figCumulativeIgnoredDrift = 0;
let _figCumulativeAbsIgnoredDrift = 0;
let _figIgnoredDriftOpsCount = 0;

// قائمة صريحة ومحددة لأنواع العمليات اليدوية المقصودة فقط (تُطابق مع label و type فقط وليس details)
const _FIG_EXACT_MANUAL_OP_TYPES = new Set([
    'تسوية رصيد',
    'تسوية رصيد خزينة',
    'تسوية سيولة',
    'تعديل رصيد',
    'تعديل رصيد خزينة',
    'تعديل رصيد يدوي',
    'إضافة سيولة',
    'سحب سيولة',
    'إضافة إيراد',
    'إضافة حساب',
    'تعديل حساب',
    'حذف حساب',
    'تعديل خزينة',
    'تعديل منتج',
    'إضافة منتج',
    'اضافة منتج',
    'إضافة منتج (اسم مستقل)',
    'حذف منتج',
    'تعديل كمية',
    'إعادة تقييم تكلفة منتج',
    'تسوية مخزن (إيداع)',
    'تسوية مخزن (هالك/خسارة)',
    'إضافة التزام',
    'اضافة التزام',
    'زيادة التزام',
    'تسجيل/زيادة التزام',
    'زيادة يدوية',
    'حذف التزام',
    'تعديل التزام',
    'تسجيل/زيادة دين',
    'إلغاء دين',
    'إيداع رأس مال',
    'ايداع راس مال',
    'سحب رأس مال',
    'سحب راس مال',
    'إضافة خزينة',
    'اضافة خزينة',
    'حذف خزينة',
    'رصيد افتتاح',
    'شطب دين',
    'مصادرة عربون',
    'تعديل فاتورة شراء',
    'معالجة التزامات شهرية',
    'تصفير شامل'
]);

// عمليات تشغيلية متزنة محاسبياً (تغيّر رأس المال المتوقع لها = 0) لها الأولوية على التصنيف اليدوي لو ظهرت مع قيود مساعدة
const _FIG_STRICT_OPERATIONAL_TYPES = new Set([
    'شراء بضاعة (تعديل كمية)',
    'شراء بضاعة (منفصلة الاسم)',
    'شراء بضاعة جديدة',
    'شراء بضاعة',
    'بيع بضاعة',
    'بيع مؤقت',
    'تأكيد بيع مؤقت',
    'مرتجع فوري',
    'مرتجع من فاتورة',
    'مرتجع مشتريات',
    'توزيع تكاليف (تحميل إداري)'
]);

// أنواع سداد الالتزامات التي قد يُفعّل معها خيار "تسجيل كمصروف بتقرير المصروفات" كمذكرة تقريرية
const _FIG_LIABILITY_PAYMENT_OP_TYPES = new Set([
    'تسديد جزء من التزام',
    'تسديد التزام مجمع',
    'سداد كامل التزامات دائن',
    'سداد جماعي للالتزامات'
]);

function _figMoney(v) {
    if (typeof window !== 'undefined' && typeof window.money === 'function') return window.money(v);
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function _figFmt(v) {
    if (typeof window !== 'undefined' && typeof window.formatCurrency === 'function') return window.formatCurrency(Number(v) || 0);
    return `${_figMoney(v).toFixed(2)} ج.م`;
}

function _figGetArr(name) {
    try {
        if (typeof window !== 'undefined' && typeof window[name] !== 'undefined' && Array.isArray(window[name])) return window[name];
        if (typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined' && Array.isArray(globalThis[name])) return globalThis[name];
    } catch (_) {}
    return [];
}

function _figGetNum(name) {
    try {
        if (typeof window !== 'undefined' && typeof window[name] !== 'undefined') return Number(window[name]) || 0;
        if (typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined') return Number(globalThis[name]) || 0;
    } catch (_) {}
    return 0;
}

function _figGetCurrentDateKey() {
    try {
        if (typeof window !== 'undefined' && window.currentLoadedDate) return String(window.currentLoadedDate);
        if (typeof globalThis !== 'undefined' && globalThis.currentLoadedDate) return String(globalThis.currentLoadedDate);
    } catch (_) {}
    return '';
}

function _figComputeConsignment() {
    if (typeof window !== 'undefined' && typeof window.calculateConsignmentValue === 'function') {
        return _figMoney(window.calculateConsignmentValue());
    }
    return _figMoney(_figGetArr('pendingSales').reduce((sum, s) => sum + (Number(s && s.totalCost) || 0), 0));
}

function _figComputePendingReturnsCost(list) {
    return _figMoney((list || []).reduce((sum, r) => {
        if (!r) return sum;
        let cost = 0;
        if (r.costOfGoods !== undefined) {
            cost = Number(r.costOfGoods) || 0;
        } else if (Array.isArray(r.items) && r.items.length > 0) {
            cost = r.items.reduce((isum, it) => isum + ((Number(it.costPrice) || 0) * (Number(it.quantity) || 0)), 0);
        }
        return sum + cost;
    }, 0));
}

function _figComputePendingOrdersBalance(list) {
    return _figMoney((list || []).reduce((sum, order) => {
        if (!order) return sum;
        const stages = order.stages || { newItemShipped: false, moneyCollected: false, oldItemReceived: false };
        if (stages.newItemShipped && stages.oldItemReceived && stages.moneyCollected) return sum;
        let nCost = Number(order.nMainCost) || 0;
        if (Array.isArray(order.nAccs)) order.nAccs.forEach(a => { nCost += (Number(a.cost) || 0); });
        let rCost = Number(order.rMainCost) || 0;
        if (Array.isArray(order.rAccs)) order.rAccs.forEach(a => { rCost += (Number(a.cost) || 0); });
        const diff = Number(order.diffAmount) || 0;
        let orderNet = 0;
        if (stages.newItemShipped) orderNet += nCost;
        if (stages.oldItemReceived) orderNet -= rCost;
        if (stages.moneyCollected) orderNet -= diff;
        return sum + orderNet;
    }, 0));
}

function captureFinancialIntegritySnapshot() {
    const productsArr = _figGetArr('products');
    const accountsArr = _figGetArr('accounts');
    const debtorsArr = _figGetArr('debtors');
    const liabilitiesArr = _figGetArr('liabilities');
    const pendingSalesArr = _figGetArr('pendingSales');
    const pendingPurchasesArr = _figGetArr('pendingPurchases');
    const pendingReturnsArr = _figGetArr('pendingReturns');
    const pendingOrdersArr = _figGetArr('pendingOrders');

    const inventory = _figMoney(productsArr.reduce((s, p) => s + ((Number(p && p.quantity) || 0) * (Number(p && p.costPrice) || 0)), 0));
    const consignment = _figComputeConsignment();
    const liquidity = _figMoney(accountsArr.reduce((s, a) => s + (Number(a && a.balance) || 0), 0));
    const debts = _figMoney(debtorsArr.reduce((s, d) => s + (Number(d && d.amount) || 0), 0));
    const pendingPurchases = _figMoney(pendingPurchasesArr.reduce((s, p) => s + (Number(p && p.grandTotal) || 0), 0));
    const pendingReturns = _figComputePendingReturnsCost(pendingReturnsArr);
    const pendingOrders = _figComputePendingOrdersBalance(pendingOrdersArr);
    const liabilitiesVal = _figMoney(liabilitiesArr.reduce((s, l) => s + (Number(l && l.amount) || 0), 0));
    const pendingDeposits = _figMoney(pendingSalesArr.reduce((s, sObj) => s + (Number(sObj && (sObj.depositPaid || sObj.paidAmount || sObj.depositAmount)) || 0), 0));

    const totalAssets = _figMoney(inventory + consignment + liquidity + debts + pendingPurchases + pendingReturns + pendingOrders);
    const totalDeductions = _figMoney(liabilitiesVal + pendingDeposits);
    const totalCapital = _figMoney(totalAssets - totalDeductions);
    const opLog = _figGetArr('operationLog').length ? _figGetArr('operationLog') : _figGetArr('log');
    const liqLog = _figGetArr('liquidityLog');

    return {
        timestamp: new Date().toISOString(),
        dateKey: _figGetCurrentDateKey(),
        inventory,
        consignment,
        liquidity,
        debts,
        pendingPurchases,
        pendingReturns,
        pendingOrders,
        liabilities: liabilitiesVal,
        pendingDeposits,
        totalAssets,
        totalDeductions,
        totalCapital,
        totalProfit: _figMoney(_figGetNum('totalProfit')),
        expenses: _figMoney(_figGetNum('expenses')),
        recordedLosses: _figMoney(_figGetNum('recordedLosses')),
        opLogLength: opLog.length,
        liqLogLength: liqLog.length
    };
}

function _figIsBadNumber(val) {
    if (val === undefined || val === null || val === '') return false;
    const n = Number(val);
    return Number.isNaN(n) || !Number.isFinite(n);
}

function _figHasCriticalCorruption(stateObj) {
    const problems = [];
    const src = stateObj || {};
    const accs = Array.isArray(src.accounts) ? src.accounts : _figGetArr('accounts');
    const prods = Array.isArray(src.products) ? src.products : _figGetArr('products');
    const dbts = Array.isArray(src.debtors) ? src.debtors : _figGetArr('debtors');
    const liabs = Array.isArray(src.liabilities) ? src.liabilities : _figGetArr('liabilities');
    const pSales = Array.isArray(src.pendingSales) ? src.pendingSales : _figGetArr('pendingSales');
    const pPurs = Array.isArray(src.pendingPurchases) ? src.pendingPurchases : _figGetArr('pendingPurchases');
    const mLiabs = Array.isArray(src.monthlyLiabilities) ? src.monthlyLiabilities : _figGetArr('monthlyLiabilities');
    const pRets = Array.isArray(src.pendingReturns) ? src.pendingReturns : _figGetArr('pendingReturns');
    const pOrds = Array.isArray(src.pendingOrders) ? src.pendingOrders : _figGetArr('pendingOrders');
    const liqLog = Array.isArray(src.liquidityLog) ? src.liquidityLog : _figGetArr('liquidityLog');
    const purInvs = Array.isArray(src.purchaseInvoices) ? src.purchaseInvoices : _figGetArr('purchaseInvoices');
    const sToday = Array.isArray(src.salesToday) ? src.salesToday : _figGetArr('salesToday');

    accs.forEach(a => { if (a && _figIsBadNumber(a.balance)) problems.push(`رصيد خزينة فاسد (NaN) في "${a.name || a.id}"`); });
    prods.forEach(p => { if (p && (_figIsBadNumber(p.quantity) || _figIsBadNumber(p.costPrice))) problems.push(`كمية أو تكلفة فاسدة (NaN) في الصنف "${p.name || p.id}"`); });
    dbts.forEach(d => { if (d && _figIsBadNumber(d.amount)) problems.push(`قيمة دين فاسدة (NaN) للعميل "${d.name || d.id}"`); });
    liabs.forEach(l => { if (l && _figIsBadNumber(l.amount)) problems.push(`قيمة التزام فاسدة (NaN) لـ "${l.name || l.id}"`); });
    mLiabs.forEach(ml => { if (ml && _figIsBadNumber(ml.amount)) problems.push(`قيمة التزام شهري فاسدة (NaN) لـ "${ml.name || ml.id}"`); });
    pSales.forEach(s => { if (s && (_figIsBadNumber(s.totalCost) || _figIsBadNumber(s.totalSellPrice) || _figIsBadNumber(s.depositPaid))) problems.push(`أرقام فاسدة (NaN) في بيع مؤقت "${s.customerName || s.id}"`); });
    pPurs.forEach(pp => { if (pp && (_figIsBadNumber(pp.grandTotal) || _figIsBadNumber(pp.paidAmount) || _figIsBadNumber(pp.remainingBalance))) problems.push(`أرقام فاسدة (NaN) في شراء معلق "${pp.invoiceNumber || pp.id}"`); });
    pRets.forEach(r => { if (r && (_figIsBadNumber(r.costOfGoods) || _figIsBadNumber(r.returnedAmount))) problems.push(`أرقام فاسدة (NaN) في مرتجع معلق "${r.customerName || r.id}"`); });
    pOrds.forEach(o => { if (o && (_figIsBadNumber(o.diffAmount) || _figIsBadNumber(o.nMainCost) || _figIsBadNumber(o.rMainCost))) problems.push(`أرقام فاسدة (NaN) في طلب استبدال "${o.customerName || o.id}"`); });
    liqLog.forEach(l => { if (l && (_figIsBadNumber(l.amount) || _figIsBadNumber(l.currentBalance))) problems.push(`قيد سيولة فاسد (NaN) في "${l.description || l.id}"`); });
    purInvs.forEach(inv => { if (inv && (_figIsBadNumber(inv.grandTotal) || _figIsBadNumber(inv.paidAmount) || _figIsBadNumber(inv.remainingBalance))) problems.push(`فاتورة شراء فاسدة (NaN) رقم "${inv.invoiceNumber || inv.id}"`); });
    sToday.forEach(s => { if (s && (_figIsBadNumber(s.grandTotal) || _figIsBadNumber(s.totalCost) || _figIsBadNumber(s.profit))) problems.push(`فاتورة بيع فاسدة (NaN) رقم "${s.invoiceNumber || s.id}"`); });

    ['expenses', 'recordedLosses', 'profit', 'totalProfit', 'pendingReturnsValue'].forEach(k => {
        const val = (stateObj && src[k] !== undefined)
            ? src[k]
            : ((typeof window !== 'undefined' && window[k] !== undefined) ? window[k] : (typeof globalThis !== 'undefined' ? globalThis[k] : undefined));
        if (val !== undefined && _figIsBadNumber(val)) problems.push(`حقل مالي فاسد (NaN): ${k}`);
    });
    return problems;
}

function _figComputeLiabilityExpenseMemo(beforeSnap, deltaExpenses, deltaLiabilities) {
    // عند سداد التزام (جزئي / مجمع / كامل دائن / جماعي) مع تفعيل خيار "تسجيل كمصروف بتقرير المصروفات":
    // ينقص النقد والالتزام معاً بنفس القيمة (تغيّر رأس المال الفعلي = 0 لأن الالتزام خُصم من رأس المال وقت نشأته)
    // بينما يزداد عداد expenses كمذكرة لتقرير المصروفات فقط.
    // نقوم بالتحقق الفعلي من قيود liquidityLog الجديدة (isLiabilityPayment && isExpense) ونقيّد الاستثناء
    // رياضياً بالحد الأدنى بين (المسجّل بالسجل، زيادة المصروفات، ونقص الالتزام الفعلي) لمنع إخفاء أي خطأ حقيقي.
    if (deltaExpenses <= 0.005 || deltaLiabilities >= -0.005) return 0;
    const liqLog = _figGetArr('liquidityLog');
    const startIdx = Math.max(0, Number(beforeSnap && beforeSnap.liqLogLength) || 0);
    if (liqLog.length <= startIdx) return 0;

    let taggedSum = 0;
    for (let i = startIdx; i < liqLog.length; i++) {
        const entry = liqLog[i];
        if (entry && entry.type === 'remove' && entry.isLiabilityPayment === true && entry.isExpense === true) {
            const amt = Number(entry.amount) || 0;
            if (amt > 0) taggedSum = _figMoney(taggedSum + amt);
        }
    }
    if (taggedSum <= 0.005) return 0;
    return _figMoney(Math.min(taggedSum, deltaExpenses, Math.abs(deltaLiabilities)));
}

function _figDetectOpMeta(beforeSnap, explicitLabel, memoLiabilityExpense) {
    const opLog = _figGetArr('operationLog').length ? _figGetArr('operationLog') : _figGetArr('log');
    const startIdx = Math.max(0, Number(beforeSnap && beforeSnap.opLogLength) || 0);
    const newEntries = opLog.length > startIdx ? opLog.slice(startIdx).filter(Boolean) : [];

    let detectedType = '';
    let detectedDetails = '';
    let isManual = false;

    if (newEntries.length > 0) {
        const latest = newEntries[newEntries.length - 1];
        detectedType = String(latest.type || '').trim();
        detectedDetails = String(latest.details || '').trim();

        // لو العملية الأساسية كانت سداد التزام ثم تبعها قيد "تسجيل مصروف" تلقائي، نعرض اسم العملية الحقيقية بوضوح
        if (memoLiabilityExpense > 0.005) {
            const liabEntry = newEntries.find(e => _FIG_LIABILITY_PAYMENT_OP_TYPES.has(String(e.type || '').trim()));
            if (liabEntry) {
                detectedType = `${String(liabEntry.type).trim()} (مسجّل كمصروف)`;
                detectedDetails = String(liabEntry.details || detectedDetails || '').trim();
            }
        }

        // فحص جميع القيود الجديدة في نفس المعاملة: للعمليات التشغيلية الصارمة أولوية على التصنيف اليدوي
        const hasStrictOp = newEntries.some(e => _FIG_STRICT_OPERATIONAL_TYPES.has(String(e.type || '').trim()));
        if (!hasStrictOp) {
            isManual = newEntries.some(e => _FIG_EXACT_MANUAL_OP_TYPES.has(String(e.type || '').trim()));
        }
    }

    const cleanLabel = String(explicitLabel || '').trim();
    const displayLabel = cleanLabel || detectedType || 'عملية مالية';
    if (_FIG_EXACT_MANUAL_OP_TYPES.has(cleanLabel) && !_FIG_STRICT_OPERATIONAL_TYPES.has(cleanLabel)) isManual = true;

    return { label: displayLabel, details: detectedDetails, isManual };
}

function _figRecordDelta(before, after, explicitLabel, sourceTag) {
    const deltaCapital = _figMoney(after.totalCapital - before.totalCapital);
    const deltaLiquidity = _figMoney(after.liquidity - before.liquidity);
    const deltaInventory = _figMoney(after.inventory - before.inventory);
    const deltaDebts = _figMoney(after.debts - before.debts);
    const deltaLiabilities = _figMoney(after.liabilities - before.liabilities);
    const deltaProfit = _figMoney(after.totalProfit - before.totalProfit);
    const deltaExpenses = _figMoney(after.expenses - before.expenses);
    const deltaLosses = _figMoney(after.recordedLosses - before.recordedLosses);

    // استثناء محاسبي مضبوط لسداد الالتزامات المسجّلة كمصروف تقريري (تغيّر رأس المال المتوقع لها = 0)
    const memoLiabilityExpense = _figComputeLiabilityExpenseMemo(before, deltaExpenses, deltaLiabilities);
    const effectiveDeltaExpenses = _figMoney(deltaExpenses - memoLiabilityExpense);

    const expectedDeltaCapital = _figMoney(deltaProfit - effectiveDeltaExpenses - deltaLosses);
    const drift = _figMoney(deltaCapital - expectedDeltaCapital);
    const opInfo = _figDetectOpMeta(before, explicitLabel, memoLiabilityExpense);

    // تتبع تراكمي للفروق الصغيرة (<= 1 ج.م) في العمليات غير اليدوية (بند 2)
    if (!opInfo.isManual && Math.abs(drift) > 0.005 && Math.abs(drift) <= _FIG_DRIFT_TOLERANCE) {
        _figCumulativeIgnoredDrift = _figMoney(_figCumulativeIgnoredDrift + drift);
        _figCumulativeAbsIgnoredDrift = _figMoney(_figCumulativeAbsIgnoredDrift + Math.abs(drift));
        _figIgnoredDriftOpsCount++;
    }

    const hasDrift = Math.abs(drift) > _FIG_DRIFT_TOLERANCE;
    let status = 'ok';
    if (hasDrift) status = opInfo.isManual ? 'manual' : 'alert';

    const entry = {
        id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        timestamp: after.timestamp,
        label: sourceTag ? `${opInfo.label} (${sourceTag})` : opInfo.label,
        details: opInfo.details,
        deltaCapital, deltaLiquidity, deltaInventory, deltaDebts, deltaLiabilities,
        expectedDeltaCapital, drift, status,
        capitalAfter: after.totalCapital,
        liquidityAfter: after.liquidity
    };

    _figAuditHistory.unshift(entry);
    if (_figAuditHistory.length > _FIG_MAX_HISTORY) _figAuditHistory.length = _FIG_MAX_HISTORY;

    if (status === 'alert') {
        console.warn('[FinancialIntegrityGuard] 🚨 فرق غير مفسّر في رأس المال:', entry);
        if (typeof window !== 'undefined' && typeof window._figShowLiveDriftAlertBanner === 'function') {
            window._figShowLiveDriftAlertBanner(entry);
        }
    }
    return entry;
}

function _figResetBaseline() {
    const snap = captureFinancialIntegritySnapshot();
    _figLastObservedSnapshot = snap;
    _figLastLoadedDate = snap.dateKey;
    return snap;
}

function _figOnTransactionStart(label) {
    _figActiveTxCount++;
    return { label: label || '', before: captureFinancialIntegritySnapshot(), closed: false };
}

function _figOnTransactionCommit(token) {
    if (!token || !token.before) return null;
    if (!token.closed) {
        token.closed = true;
        _figActiveTxCount = Math.max(0, _figActiveTxCount - 1);
    }
    const after = captureFinancialIntegritySnapshot();
    const entry = _figRecordDelta(token.before, after, token.label, '');
    _figLastObservedSnapshot = after;
    _figLastLoadedDate = after.dateKey;
    if (typeof window !== 'undefined' && typeof window._figRenderGuardBar === 'function') {
        window._figRenderGuardBar();
    }
    return entry;
}

function _figOnTransactionRollback(token) {
    if (token && !token.closed) {
        token.closed = true;
        _figActiveTxCount = Math.max(0, _figActiveTxCount - 1);
    }
    _figResetBaseline();
}

// مراقب سلبي بين عمليات التحديث لالتقاط أي تعديل لم يمر عبر createStateTransaction (بند 3)
function _figCheckPassiveDrift() {
    if (_figActiveTxCount > 0) return null;
    if (typeof window !== 'undefined' && (window._isLoadingDate || window._isArchiveBrowsingMode || window._loadFailed)) {
        return null;
    }
    const current = captureFinancialIntegritySnapshot();
    if (!_figLastObservedSnapshot || _figLastLoadedDate !== current.dateKey) {
        _figLastObservedSnapshot = current;
        _figLastLoadedDate = current.dateKey;
        return null;
    }
    const prev = _figLastObservedSnapshot;
    const changed = Math.abs(current.totalCapital - prev.totalCapital) > 0.005 || Math.abs(current.liquidity - prev.liquidity) > 0.005;
    _figLastObservedSnapshot = current;
    _figLastLoadedDate = current.dateKey;
    if (!changed) return null;
    return _figRecordDelta(prev, current, '', 'خارج المعاملة الذرية');
}

window.FinancialIntegrityGuard = {
    takeSnapshot: captureFinancialIntegritySnapshot,
    captureSnapshot: captureFinancialIntegritySnapshot,
    runFullAudit: function () {
        if (typeof _figRunFullAudit === 'function') return _figRunFullAudit();
        return null;
    },
    hasCriticalCorruption: _figHasCriticalCorruption,
    onTransactionStart: _figOnTransactionStart,
    onTransactionCommit: _figOnTransactionCommit,
    onTransactionRollback: _figOnTransactionRollback,
    resetBaseline: _figResetBaseline,
    isTransactionActive: function () { return _figActiveTxCount > 0; },
    checkPassiveDrift: _figCheckPassiveDrift,
    renderGuardBar: function () {
        if (typeof window._figRenderGuardBar === 'function') window._figRenderGuardBar();
    },
    openAuditModal: function () {
        if (typeof window._figOpenAuditModal === 'function') window._figOpenAuditModal();
    },
    getAuditHistory: function () { return [..._figAuditHistory]; },
    getLastReport: function () { return _figLastAuditReport; },
    getCumulativeDrift: function () {
        return {
            signed: _figCumulativeIgnoredDrift,
            abs: _figCumulativeAbsIgnoredDrift,
            count: _figIgnoredDriftOpsCount
        };
    },
    clearHistory: function () {
        _figAuditHistory.length = 0;
        _figCumulativeIgnoredDrift = 0;
        _figCumulativeAbsIgnoredDrift = 0;
        _figIgnoredDriftOpsCount = 0;
        _figLastObservedSnapshot = null;
    }
};
