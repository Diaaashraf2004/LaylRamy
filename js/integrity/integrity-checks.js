// js/integrity/integrity-checks.js
// فحوصات التدقيق المحاسبي الـ17 لحارس سلامة رأس المال والسيولة

function _figFindDuplicateIds(arr, label) {
    const seen = new Set();
    const dups = [];
    (arr || []).forEach(item => {
        if (!item || !item.id) return;
        const idStr = String(item.id);
        if (seen.has(idStr)) dups.push(`${label}: ${idStr}`);
        else seen.add(idStr);
    });
    return dups;
}

function _figRecalcSinglePendingCost(sale) {
    if (!sale) return { hasBreakdown: false, cost: 0 };
    const qtyOf = (it) => (it && it.quantity !== undefined && it.quantity !== null ? (Number(it.quantity) || 0) : 1);
    if (sale.mainProduct) {
        let sum = (Number(sale.mainProduct.costPrice) || 0) * qtyOf(sale.mainProduct);
        if (Array.isArray(sale.additionalItems)) {
            sale.additionalItems.forEach(it => { sum += (Number(it && it.costPrice) || 0) * qtyOf(it); });
        }
        return { hasBreakdown: true, cost: _figMoney(sum) };
    }
    const hasItems = Array.isArray(sale.items) && sale.items.length > 0;
    const ded = Array.isArray(sale.deductedItems) ? sale.deductedItems : (sale.invoiceData && Array.isArray(sale.invoiceData.deductedItems) ? sale.invoiceData.deductedItems : []);
    if (!hasItems && ded.length === 0) return { hasBreakdown: false, cost: 0 };
    let sum = 0;
    if (hasItems) {
        sale.items.forEach(it => { sum += (Number(it && it.costPrice) || 0) * qtyOf(it); });
    }
    ded.forEach(it => { sum += (Number(it && it.costPrice) || 0) * qtyOf(it); });
    return { hasBreakdown: true, cost: _figMoney(sum) };
}

function _figIsTransferLogEntry(entry) {
    if (!entry || !entry.id) return false;
    const idStr = String(entry.id);
    return idStr.startsWith('liq-out-') || idStr.startsWith('liq-in-');
}

function _figRunFullAudit() {
    const snap = captureFinancialIntegritySnapshot();
    const checks = [];
    const addCheck = (id, title, severity, status, summary, details = []) => {
        checks.push({ id, title, severity, status, passed: status === 'passed', skipped: status === 'skipped', summary, details });
    };

    // 1. NaN / Infinity
    const nanProblems = _figHasCriticalCorruption(null);
    addCheck('nan_corruption', 'سلامة الأرقام الحسابية (منع NaN / Infinity)', 'critical',
        nanProblems.length === 0 ? 'passed' : 'failed',
        nanProblems.length === 0 ? 'جميع الأرقام في الخزن والمخزن والفواتير والسجلات صالحة.' : `تم رصد ${nanProblems.length} قيمة رقمية فاسدة!`, nanProblems);

    // 2. Negative values
    const negProblems = [];
    _figGetArr('accounts').forEach(a => { if (a && (Number(a.balance) || 0) < -0.01) negProblems.push(`خزينة برصيد سالب: "${a.name}" (${_figFmt(a.balance)})`); });
    _figGetArr('products').forEach(p => {
        if (!p) return;
        if ((Number(p.quantity) || 0) < 0) negProblems.push(`صنف بكمية سالبة: "${p.name}" (${p.quantity})`);
        if ((Number(p.costPrice) || 0) < 0) negProblems.push(`صنف بتكلفة سالبة: "${p.name}" (${_figFmt(p.costPrice)})`);
    });
    _figGetArr('debtors').forEach(d => { if (d && (Number(d.amount) || 0) < -0.01) negProblems.push(`دين بقيمة سالبة: "${d.name}" (${_figFmt(d.amount)})`); });
    _figGetArr('liabilities').forEach(l => { if (l && (Number(l.amount) || 0) < -0.01) negProblems.push(`التزام بقيمة سالبة: "${l.name}" (${_figFmt(l.amount)})`); });
    addCheck('negative_values', 'منع الأرصدة والكميات والتكاليف السالبة', 'critical',
        negProblems.length === 0 ? 'passed' : 'failed',
        negProblems.length === 0 ? 'لا توجد أي أرصدة خزن أو كميات أو ديون أو التزامات سالبة.' : `تم رصد ${negProblems.length} قيمة سالبة.`, negProblems);

    // 3. Duplicate IDs (شامل products و purchaseInvoices و salesToday)
    const dupIdProblems = [
        ..._figFindDuplicateIds(_figGetArr('accounts'), 'خزينة'),
        ..._figFindDuplicateIds(_figGetArr('products'), 'صنف'),
        ..._figFindDuplicateIds(_figGetArr('debtors'), 'دين'),
        ..._figFindDuplicateIds(_figGetArr('liabilities'), 'التزام'),
        ..._figFindDuplicateIds(_figGetArr('pendingSales'), 'بيع مؤقت'),
        ..._figFindDuplicateIds(_figGetArr('pendingReturns'), 'مرتجع معلق'),
        ..._figFindDuplicateIds(_figGetArr('pendingOrders'), 'استبدال معلق'),
        ..._figFindDuplicateIds(_figGetArr('purchaseInvoices'), 'فاتورة شراء'),
        ..._figFindDuplicateIds(_figGetArr('salesToday'), 'فاتورة بيع')
    ];
    addCheck('duplicate_ids', 'منع تكرار المعرّفات (Duplicate IDs)', 'critical',
        dupIdProblems.length === 0 ? 'passed' : 'failed',
        dupIdProblems.length === 0 ? 'جميع السجلات والأصناف والفواتير تحمل معرّفات فريدة.' : `تم رصد ${dupIdProblems.length} معرّف مكرر.`, dupIdProblems);

    // 4. Liquidity Log vs Live Accounts + Chain Check (skipped if empty)
    const liqLog = _figGetArr('liquidityLog');
    if (liqLog.length === 0) {
        addCheck('liquidity_log_sync', 'مطابقة إجمالي الخزن وسلسلة سجل السيولة', 'warning', 'skipped', 'غير مفحوص — سجل السيولة فارغ لهذا اليوم.', []);
    } else {
        const liqIssues = [];
        const lastLog = liqLog[liqLog.length - 1];
        if (lastLog && lastLog.currentBalance !== undefined && lastLog.currentBalance !== null) {
            const diff = _figMoney(snap.liquidity - (Number(lastLog.currentBalance) || 0));
            if (Math.abs(diff) > _FIG_DRIFT_TOLERANCE) {
                liqIssues.push(`إجمالي الخزن الفعلي: ${_figFmt(snap.liquidity)} | آخر رصيد بالسجل: ${_figFmt(lastLog.currentBalance)} | الفرق: ${_figFmt(diff)}`);
            }
        }
        for (let i = 1; i < liqLog.length; i++) {
            const prev = liqLog[i - 1], cur = liqLog[i];
            if (!prev || !cur || prev.currentBalance == null || cur.currentBalance == null) continue;
            if (_figIsTransferLogEntry(cur)) {
                const transferDiff = _figMoney((Number(cur.currentBalance) || 0) - (Number(prev.currentBalance) || 0));
                if (Math.abs(transferDiff) > _FIG_DRIFT_TOLERANCE) {
                    liqIssues.push(`تغير غير متوقع في إجمالي السيولة أثناء تحويل داخلي "${cur.description || cur.id}": الفارق ${_figFmt(transferDiff)}`);
                }
                continue;
            }
            if (cur.type === 'add' || cur.type === 'remove') {
                const expected = _figMoney((Number(prev.currentBalance) || 0) + (cur.type === 'add' ? (Number(cur.amount) || 0) : -(Number(cur.amount) || 0)));
                const stepDiff = _figMoney((Number(cur.currentBalance) || 0) - expected);
                if (Math.abs(stepDiff) > _FIG_DRIFT_TOLERANCE) {
                    liqIssues.push(`قفزة في سلسلة السيولة عند "${cur.description || cur.id}": المتوقع ${_figFmt(expected)} والمسجل ${_figFmt(cur.currentBalance)}`);
                }
            }
        }
        addCheck('liquidity_log_sync', 'مطابقة إجمالي الخزن وسلسلة سجل السيولة', 'warning',
            liqIssues.length === 0 ? 'passed' : 'failed',
            liqIssues.length === 0 ? `إجمالي السيولة (${_figFmt(snap.liquidity)}) وسلسلة السجل متطابقة.` : `يوجد ${liqIssues.length} عدم تطابق في سجل السيولة!`, liqIssues);
    }

    // 5. Pending sales cost audit (فحص حقيقي لبنود كل بيعة مؤقتة مقابل totalCost المخزّن)
    const pSalesArr = _figGetArr('pendingSales');
    if (pSalesArr.length === 0) {
        addCheck('consignment_sync', 'تطابق تكلفة المبيعات المؤقتة مع بنودها', 'warning', 'skipped', 'غير مفحوص — لا توجد مبيعات مؤقتة حالياً.', []);
    } else {
        const consIssues = [];
        pSalesArr.forEach(s => {
            if (!s) return;
            const stored = Number(s.totalCost);
            const res = _figRecalcSinglePendingCost(s);
            if (Number.isFinite(stored) && res.hasBreakdown && Math.abs(stored - res.cost) > _FIG_DRIFT_TOLERANCE) {
                consIssues.push(`بيعة "${s.customerName || s.id}": التكلفة المخزنة (${_figFmt(stored)}) تختلف عن مجموع البنود (${_figFmt(res.cost)})`);
            }
        });
        addCheck('consignment_sync', 'تطابق تكلفة المبيعات المؤقتة مع بنودها', 'warning',
            consIssues.length === 0 ? 'passed' : 'failed',
            consIssues.length === 0 ? `تكلفة كافة المبيعات المؤقتة (${_figFmt(snap.consignment)}) مطابقة لبنودها.` : `يوجد ${consIssues.length} بيعة مؤقتة بتكلفة غير مطابقة لبنودها.`, consIssues);
    }

    // 6. Pending sales excess deposits
    if (pSalesArr.length === 0) {
        addCheck('excess_pending_deposits', 'فحص عربونات المبيعات المؤقتة', 'warning', 'skipped', 'غير مفحوص — لا توجد مبيعات مؤقتة حالياً.', []);
    } else {
        const excessDep = [];
        pSalesArr.forEach(s => {
            if (!s) return;
            const dep = Number(s.depositPaid || s.paidAmount || s.depositAmount) || 0;
            const tot = Number(s.grandTotal || s.totalSellPrice) || 0;
            if (dep > tot + 0.01) excessDep.push(`بيعة "${s.customerName || s.id}": العربون (${_figFmt(dep)}) أكبر من الإجمالي (${_figFmt(tot)})`);
        });
        addCheck('excess_pending_deposits', 'فحص عربونات المبيعات المؤقتة', 'warning',
            excessDep.length === 0 ? 'passed' : 'failed',
            excessDep.length === 0 ? 'جميع العربونات ضمن حدود قيم فواتيرها.' : `يوجد ${excessDep.length} بيعة بعربون يتجاوز إجمالي الفاتورة.`, excessDep);
    }

    // 7. Pending returns cost
    const pRetsArr = _figGetArr('pendingReturns');
    if (pRetsArr.length === 0) {
        addCheck('pending_returns_cost', 'تقييم المرتجعات قيد الاستلام (بالتكلفة)', 'warning', 'skipped', 'غير مفحوص — لا توجد مرتجعات معلقة حالياً.', []);
    } else {
        const prIssues = [];
        pRetsArr.forEach(r => {
            if (!r) return;
            const hasCost = (r.costOfGoods !== undefined && Number(r.costOfGoods) > 0) || (Array.isArray(r.items) && r.items.some(it => (Number(it.costPrice) || 0) > 0));
            if (!hasCost && (Number(r.returnedAmount) || 0) > 0) prIssues.push(`مرتجع "${r.customerName || r.id}" بدون تكلفة بضاعة مسجلة.`);
        });
        addCheck('pending_returns_cost', 'تقييم المرتجعات قيد الاستلام (بالتكلفة)', 'warning',
            prIssues.length === 0 ? 'passed' : 'failed',
            prIssues.length === 0 ? 'جميع المرتجعات المعلقة مقيمة بالتكلفة بدقة.' : `يوجد ${prIssues.length} مرتجع معلق بتكلفة ناقصة.`, prIssues);
    }

    // 8. Exchange pending orders health
    const pOrdsArr = _figGetArr('pendingOrders');
    if (pOrdsArr.length === 0) {
        addCheck('exchange_orders_health', 'سلامة طلبات الاستبدال (بضاعة ببضاعة)', 'warning', 'skipped', 'غير مفحوص — لا توجد طلبات استبدال معلقة حالياً.', []);
    } else {
        const exIssues = [];
        pOrdsArr.forEach(o => {
            if (!o) return;
            const st = o.stages || {};
            if (st.newItemShipped && st.oldItemReceived && st.moneyCollected) exIssues.push(`طلب "${o.customerName || o.id}" اكتملت مراحله الـ3 وما زال معلقاً!`);
            if ((Number(o.nMainCost) || 0) < 0 || (Number(o.rMainCost) || 0) < 0) exIssues.push(`طلب "${o.customerName || o.id}" يحتوي على تكلفة سالبة.`);
            if (st.moneyCollected && st.moneyMethod === 'pay_now_safe' && Math.abs(Number(o.diffAmount) || 0) > 0.01 && !o.accId) exIssues.push(`طلب "${o.customerName || o.id}" محصّل بالخزنة بدون حساب محدد.`);
        });
        addCheck('exchange_orders_health', 'سلامة طلبات الاستبدال (بضاعة ببضاعة)', 'warning',
            exIssues.length === 0 ? 'passed' : 'failed',
            exIssues.length === 0 ? 'جميع طلبات الاستبدال المعلقة متزنة.' : `تم رصد ${exIssues.length} ملاحظة في طلبات الاستبدال.`, exIssues);
    }

    // 9. Purchase invoices vs live supplier liabilities (skipped if none)
    const purInvs = _figGetArr('purchaseInvoices');
    const liabsArr = _figGetArr('liabilities');
    const invoicesWithLiab = purInvs.filter(inv => inv && inv.id && (Number(inv.remainingBalance) || 0) > 0.01 && liabsArr.some(l => l && l.purchaseInvoiceId === inv.id && l.source !== 'purchase_extra_cost'));
    if (invoicesWithLiab.length === 0) {
        addCheck('stale_purchase_remaining', 'تطابق متبقي فواتير الشراء مع التزامات الموردين', 'warning', 'skipped', 'غير مفحوص — لا توجد فواتير شراء اليوم بمتبقٍ مرتبط بالتزام.', []);
    } else {
        const purIssues = [];
        invoicesWithLiab.forEach(inv => {
            const storedRem = Number(inv.remainingBalance) || 0;
            const linked = liabsArr.filter(l => l && l.purchaseInvoiceId === inv.id && l.source !== 'purchase_extra_cost');
            const liveSum = _figMoney(linked.reduce((s, l) => s + Math.max(0, Number(l.amount) || 0), 0));
            if (storedRem > liveSum + 0.5) purIssues.push(`فاتورة ${inv.invoiceNumber || inv.id}: المتبقي المسجل (${_figFmt(storedRem)}) > الالتزام الحي (${_figFmt(liveSum)})`);
        });
        addCheck('stale_purchase_remaining', 'تطابق متبقي فواتير الشراء مع التزامات الموردين', 'warning',
            purIssues.length === 0 ? 'passed' : 'failed',
            purIssues.length === 0 ? 'متبقي فواتير الشراء متطابق مع التزاماتها الحية.' : `يوجد ${purIssues.length} فاتورة بمتبقٍ قديم.`, purIssues);
    }

    // 10. Duplicate active debt for same invoice/saleId
    const dupSaleDebts = [];
    const seenDebtSaleRef = new Map();
    _figGetArr('debtors').forEach(d => {
        if (!d || (Number(d.amount) || 0) <= 0.001) return;
        const ref = (d.saleId && String(d.saleId).trim()) || (d.linkedInvoice && d.linkedInvoice !== '-' && d.linkedInvoice !== 'بدون فاتورة' ? String(d.linkedInvoice).trim() : '');
        if (!ref) return;
        const key = ref.toLowerCase();
        if (seenDebtSaleRef.has(key)) dupSaleDebts.push(`الفاتورة (${ref}) عليها أكثر من دين نشط! (${d.name} — ${_figFmt(d.amount)})`);
        else seenDebtSaleRef.set(key, d);
    });
    addCheck('duplicate_credit_sale_debts', 'منع تكرار دين نشط لنفس رقم الفاتورة', 'critical',
        dupSaleDebts.length === 0 ? 'passed' : 'failed',
        dupSaleDebts.length === 0 ? 'لا توجد أي فاتورة مسجل عليها أكثر من دين نشط.' : `تحذير: ${dupSaleDebts.length} فاتورة عليها دين مكرر!`, dupSaleDebts);

    // 11. Hidden deductions over-reversal (اليوم الحالي فقط — skipped إذا لا توجد استقطاعات اليوم)
    const salesTodayArr = _figGetArr('salesToday');
    const dedSales = salesTodayArr.filter(s => s && (Number(s.deductionAmount) || 0) > 0);
    if (dedSales.length === 0) {
        addCheck('deduction_over_reversal', 'سلامة عكس الاستقطاعات المخفية (فواتير اليوم)', 'warning', 'skipped', 'غير مفحوص — لا توجد مبيعات باستقطاع مخفي اليوم.', []);
    } else {
        const dedIssues = [];
        dedSales.forEach(s => {
            const ded = Number(s.deductionAmount) || 0, rev = Number(s._deductionReversed) || 0;
            if (rev > ded + 0.01) dedIssues.push(`فاتورة ${s.invoiceNumber || s.id}: عكس (${_figFmt(rev)}) > الاستقطاع (${_figFmt(ded)})`);
        });
        addCheck('deduction_over_reversal', 'سلامة عكس الاستقطاعات المخفية (فواتير اليوم)', 'warning',
            dedIssues.length === 0 ? 'passed' : 'failed',
            dedIssues.length === 0 ? 'جميع استقطاعات اليوم متزنة.' : `يوجد ${dedIssues.length} حالة عكس زائد.`, dedIssues);
    }

    // 12. Serials in_stock vs product quantity (بند 5)
    const serialsArr = _figGetArr('serialNumbersLog');
    if (serialsArr.length === 0) {
        addCheck('serials_vs_inventory', 'مطابقة السيريالات المتاحة مع كميات المخزون', 'warning', 'skipped', 'غير مفحوص — لا توجد سيريالات مسجلة.', []);
    } else {
        const byIdCounts = new Map();
        const byNameCounts = new Map();
        serialsArr.forEach(sn => {
            if (!sn || sn.status !== 'in_stock') return;
            if (sn.productId) {
                const k = String(sn.productId);
                byIdCounts.set(k, (byIdCounts.get(k) || 0) + 1);
            } else {
                const n = String(sn.productName || '').trim().toLowerCase();
                if (n) byNameCounts.set(n, (byNameCounts.get(n) || 0) + 1);
            }
        });
        const snIssues = [];
        const nameQtyTotals = new Map();
        const nameAssignedById = new Map();
        _figGetArr('products').forEach(p => {
            if (!p) return;
            const pQty = Number(p.quantity) || 0;
            const idCount = p.id ? (byIdCounts.get(String(p.id)) || 0) : 0;
            if (idCount > pQty) snIssues.push(`"${p.name}": سيريالات متاحة (${idCount}) أكبر من كمية المخزون (${pQty})`);
            const n = String(p.name || '').trim().toLowerCase();
            if (n) {
                nameQtyTotals.set(n, (nameQtyTotals.get(n) || 0) + pQty);
                nameAssignedById.set(n, (nameAssignedById.get(n) || 0) + idCount);
            }
        });
        byNameCounts.forEach((legacyCount, n) => {
            const totalQty = nameQtyTotals.get(n) || 0;
            const alreadyById = nameAssignedById.get(n) || 0;
            if (alreadyById + legacyCount > totalQty) {
                snIssues.push(`"${n}": إجمالي السيريالات المتاحة (${alreadyById + legacyCount}) أكبر من رصيد المخزون (${totalQty})`);
            }
        });
        addCheck('serials_vs_inventory', 'مطابقة السيريالات المتاحة مع كميات المخزون', 'warning',
            snIssues.length === 0 ? 'passed' : 'failed',
            snIssues.length === 0 ? 'أعداد السيريالات المتاحة متوافقة مع كميات المخزون.' : `يوجد ${snIssues.length} صنف بسيريالات أكثر من رصيد المخزن.`, snIssues);
    }

    // 13. Debtors vs DebtorProfiles consistency (بند 5)
    const liveDebtors = _figGetArr('debtors').filter(d => d && (Number(d.amount) || 0) > 0.001);
    if (liveDebtors.length === 0) {
        addCheck('debtors_vs_profiles', 'مطابقة ديون العملاء مع بروفايلاتهم', 'warning', 'skipped', 'غير مفحوص — لا توجد ديون نشطة.', []);
    } else {
        const profileIds = new Set(_figGetArr('debtorProfiles').filter(Boolean).map(p => String(p.id)));
        const orphanIssues = [];
        liveDebtors.forEach(d => {
            if (d.customerId && profileIds.size > 0 && !profileIds.has(String(d.customerId))) {
                orphanIssues.push(`دين "${d.name || d.id}" (${_figFmt(d.amount)}) مرتبط ببروفايل غير موجود (${d.customerId})`);
            }
        });
        addCheck('debtors_vs_profiles', 'مطابقة ديون العملاء مع بروفايلاتهم', 'warning',
            orphanIssues.length === 0 ? 'passed' : 'failed',
            orphanIssues.length === 0 ? 'جميع الديون النشطة مربوطة ببروفايلات عملاء صالحة.' : `يوجد ${orphanIssues.length} دين مرتبط ببروفايل مفقود.`, orphanIssues);
    }

    // 14. Inter-account transfers net zero (بند 5)
    const transferEntries = liqLog.filter(l => _figIsTransferLogEntry(l));
    if (transferEntries.length === 0) {
        addCheck('transfers_net_zero', 'توازن التحويلات بين الخزائن (صافي = 0)', 'warning', 'skipped', 'غير مفحوص — لا توجد تحويلات بين خزائن اليوم.', []);
    } else {
        const netTransfer = _figMoney(transferEntries.reduce((s, l) => s + (l.type === 'add' ? (Number(l.amount) || 0) : -(Number(l.amount) || 0)), 0));
        const ok = Math.abs(netTransfer) <= 0.01;
        addCheck('transfers_net_zero', 'توازن التحويلات بين الخزائن (صافي = 0)', 'warning',
            ok ? 'passed' : 'failed',
            ok ? 'صافي التحويلات الداخلية بين الخزائن متزن (= 0).' : `تحويلات الخزائن غير متزنة بفارق (${_figFmt(netTransfer)})!`,
            ok ? [] : [`عدد قيود التحويل: ${transferEntries.length} | صافي الفارق: ${_figFmt(netTransfer)}`]);
    }

    // 15. Sales cost/profit consistency in salesToday (بند 5)
    if (salesTodayArr.length === 0) {
        addCheck('sales_profit_consistency', 'تطابق سعر وتكلفة وربح مبيعات اليوم', 'warning', 'skipped', 'غير مفحوص — لا توجد مبيعات مؤكدة اليوم.', []);
    } else {
        const spIssues = [];
        salesTodayArr.forEach(s => {
            if (!s || s.type === 'exchange') return;
            const sell = Number(s.grandTotal !== undefined ? s.grandTotal : s.totalSellPrice);
            const cost = Number(s.totalCost);
            const prof = Number(s.profit);
            const ded = Number(s.deductionAmount) || 0;
            if (!Number.isFinite(sell) || !Number.isFinite(cost) || !Number.isFinite(prof)) return;
            const expectedProf = _figMoney(sell - cost - ded);
            if (Math.abs(prof - expectedProf) > _FIG_DRIFT_TOLERANCE) {
                spIssues.push(`فاتورة ${s.invoiceNumber || s.id}: الربح المسجل (${_figFmt(prof)}) ≠ المتوقع (${_figFmt(expectedProf)})`);
            }
        });
        addCheck('sales_profit_consistency', 'تطابق سعر وتكلفة وربح مبيعات اليوم', 'warning',
            spIssues.length === 0 ? 'passed' : 'failed',
            spIssues.length === 0 ? 'أرباح وتكاليف جميع فواتير اليوم متطابقة.' : `يوجد ${spIssues.length} فاتورة بفرق بين الربح والتكلفة.`, spIssues);
    }

    // 16. Cumulative small ignored drift check (بند 2)
    const cumExceeded = Math.abs(_figCumulativeIgnoredDrift) > _FIG_CUMULATIVE_SIGNED_LIMIT || _figCumulativeAbsIgnoredDrift > _FIG_CUMULATIVE_ABS_LIMIT;
    addCheck('cumulative_small_drift', 'الفحص التراكمي للفروق الصغيرة (≤ 1 ج.م)', 'warning',
        _figIgnoredDriftOpsCount === 0 ? 'skipped' : (cumExceeded ? 'failed' : 'passed'),
        _figIgnoredDriftOpsCount === 0
            ? 'غير مفحوص — لم تُسجل أي فروق صغيرة في هذه الجلسة.'
            : (cumExceeded
                ? `تراكم فروق صغيرة (${_figIgnoredDriftOpsCount} عمليات): صافي ${_figFmt(_figCumulativeIgnoredDrift)} | مطلق ${_figFmt(_figCumulativeAbsIgnoredDrift)}`
                : `ضمن الحد الآمن (${_figIgnoredDriftOpsCount} عمليات، صافي ${_figFmt(_figCumulativeIgnoredDrift)}).`),
        cumExceeded ? [`الحد الصافي: ${_figFmt(_FIG_CUMULATIVE_SIGNED_LIMIT)} | الحد المطلق: ${_figFmt(_FIG_CUMULATIVE_ABS_LIMIT)}`] : []);

    // 17. Info-only check: zero-cost in-stock products (لا يدخل في كسر العدّاد!)
    const zeroCostItems = [];
    _figGetArr('products').forEach(p => {
        if (p && (Number(p.quantity) || 0) > 0 && (Number(p.costPrice) || 0) <= 0) {
            zeroCostItems.push(`"${p.name}" (كمية: ${p.quantity}، تكلفة: 0 ج.م)`);
        }
    });
    addCheck('zero_cost_in_stock', 'أصناف متوفرة في المخزن بتكلفة صفر (معلومة)', 'info',
        zeroCostItems.length === 0 ? 'passed' : 'failed',
        zeroCostItems.length === 0 ? 'جميع الأصناف المتوفرة لها تكلفة شراء.' : `يوجد ${zeroCostItems.length} صنف بتكلفة صفر.`, zeroCostItems);

    const evaluatedCore = checks.filter(c => (c.severity === 'critical' || c.severity === 'warning') && c.status !== 'skipped');
    const passedCore = evaluatedCore.filter(c => c.status === 'passed').length;
    const skippedCount = checks.filter(c => c.status === 'skipped').length;
    const criticalCount = checks.filter(c => c.status === 'failed' && c.severity === 'critical').length;
    const warningCount = checks.filter(c => c.status === 'failed' && c.severity === 'warning').length;
    const infoCount = checks.filter(c => c.status === 'failed' && c.severity === 'info').length;
    const driftAlertCount = _figAuditHistory.filter(h => h.status === 'alert').length;
    const manualDriftEntries = _figAuditHistory.filter(h => h.status === 'manual');
    const manualDriftCount = manualDriftEntries.length;
    const manualDriftSum = _figMoney(manualDriftEntries.reduce((s, h) => s + (Number(h.drift) || 0), 0));

    _figLastAuditReport = {
        timestamp: new Date().toISOString(),
        snapshot: snap,
        checks,
        evaluatedCoreCount: evaluatedCore.length,
        passedCoreCount: passedCore,
        skippedCount,
        criticalCount,
        warningCount,
        infoCount,
        driftAlertCount,
        manualDriftCount,
        manualDriftSum,
        cumulativeIgnoredDrift: _figCumulativeIgnoredDrift,
        cumulativeAbsIgnoredDrift: _figCumulativeAbsIgnoredDrift,
        isHealthy: criticalCount === 0 && warningCount === 0 && driftAlertCount === 0
    };
    return _figLastAuditReport;
}
