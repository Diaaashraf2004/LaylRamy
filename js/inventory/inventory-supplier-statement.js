// js/inventory/inventory-supplier-statement.js
// شاشة أرشيف فواتير الشراء وكشف حساب الموردين (للقراءة فقط — صافي حق المورد بدون خلط التكاليف الإضافية الداخلية)
(function (global) {
    'use strict';

    let _lastStatementReport = null;
    let _isLoadingStatement = false;

    const norm = (s) => String(s || '')
        .trim().toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ');

    const esc = (s) => (typeof global.escapeHTML === 'function')
        ? global.escapeHTML(s)
        : String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

    const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const money = (v) => (typeof global.money === 'function')
        ? global.money(v)
        : (Math.round((num(v) + Number.EPSILON) * 100) / 100);

    const fmt = (v) => num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';

    const toCairoDate = (val) => {
        if (!val) return '';
        if (typeof val === 'string') {
            const m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (m && val.length <= 10) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        }
        try {
            const dObj = (typeof val.toDate === 'function') ? val.toDate() : new Date(val);
            if (isNaN(dObj.getTime())) return '';
            return dObj.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
        } catch {
            return '';
        }
    };

    const toCairoDateTime = (val) => {
        if (!val) return '-';
        try {
            const dObj = (typeof val.toDate === 'function') ? val.toDate() : new Date(val);
            if (isNaN(dObj.getTime())) return String(val);
            return dObj.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', hour12: true });
        } catch {
            return String(val);
        }
    };

    const isExtraCostText = (txt) => {
        const t = norm(txt);
        return /(صدقات|دين|ديون|زياده)\s*[-–]/.test(t) || t.includes('تكلفه اضافيه');
    };

    function getActiveMonthString() {
        const activeDate = global.currentLoadedDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
        return String(activeDate).slice(0, 7);
    }

    function populateSupplierStatementDropdown(preselectSupplierId = null) {
        const sel = document.getElementById('ss-supplier-select');
        if (!sel) return;
        const currentVal = preselectSupplierId || sel.value || '';
        const list = (typeof global.getSuppliers === 'function' ? global.getSuppliers() : (global.suppliers || []));
        const sorted = [...list].filter(s => s && s.id).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));

        sel.innerHTML = '<option value="">-- اختر المورد --</option>' + sorted.map(s =>
            `<option value="${esc(s.id)}">${esc(s.name || s.id)}</option>`
        ).join('');

        if (currentVal && sorted.some(s => s.id === currentVal)) {
            sel.value = currentVal;
        }
    }

    function openSupplierStatementSection(preselectSupplierId = null) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
        const section = document.getElementById('supplier-statement-section');
        if (!section) return;
        section.classList.remove('hidden');

        // إزالة التفعيل عن أزرار التنقل الرئيسية أو إبراز المشتريات
        document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
        const purNav = document.querySelector('.nav-button[data-target="purchases-section"]');
        if (purNav) purNav.classList.add('active');

        populateSupplierStatementDropdown(preselectSupplierId);

        const monthInput = document.getElementById('ss-month-input');
        if (monthInput && !monthInput.value) {
            monthInput.value = getActiveMonthString();
        }

        if (preselectSupplierId) {
            loadSupplierStatementReport();
        }
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function fetchSupplierStatementData(supplierId, yearMonth, allPeriods) {
        const user = global.currentUser || (global.auth && global.auth.currentUser);
        if (!user || !global.db) {
            throw new Error('يجب تسجيل الدخول أولاً لعرض كشف الحساب من السحابة.');
        }

        const uid = user.uid;
        const activeDate = global.currentLoadedDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
        const userRef = global.db.collection('users').doc(uid);

        const matchesPeriod = (val) => allPeriods ? true : toCairoDate(val).startsWith(yearMonth);

        const [daysList, archivesList, archLiqList] = await Promise.all([
            (async () => {
                try {
                    if (allPeriods) {
                        const snap = await userRef.collection('days').get();
                        return snap.docs.map(d => ({ _docDate: d.id, ...(d.data() || {}) }));
                    }
                    const snap = await userRef.collection('days')
                        .where(firebase.firestore.FieldPath.documentId(), '>=', `${yearMonth}-01`)
                        .where(firebase.firestore.FieldPath.documentId(), '<=', `${yearMonth}-31`)
                        .get();
                    return snap.docs.map(d => ({ _docDate: d.id, ...(d.data() || {}) }));
                } catch {
                    const snap = await userRef.collection('days').get();
                    return snap.docs
                        .filter(d => allPeriods || d.id.startsWith(yearMonth))
                        .map(d => ({ _docDate: d.id, ...(d.data() || {}) }));
                }
            })(),
            userRef.collection('purchase_archives').get().then(s => s.docs.map(d => ({ id: d.id, ...(d.data() || {}) }))).catch(() => []),
            userRef.collection('archive_liquidity').get().then(s => s.docs.map(d => ({ id: d.id, ...(d.data() || {}) }))).catch(() => [])
        ]);

        const liveSuppliers = (typeof global.getSuppliers === 'function' ? global.getSuppliers() : (global.suppliers || []));
        const liveLiabilities = (typeof global.getLiabilities === 'function' ? global.getLiabilities() : (global.liabilities || []));
        const liveOpLog = (typeof global.getOperationLog === 'function' ? global.getOperationLog() : (global.operationLog || []));

        if (allPeriods || activeDate.startsWith(yearMonth)) {
            const idx = daysList.findIndex(d => d._docDate === activeDate);
            const liveDay = {
                _docDate: activeDate,
                suppliers: liveSuppliers,
                accounts: global.accounts || [],
                liabilities: liveLiabilities,
                purchaseInvoices: global.purchaseInvoices || [],
                pendingPurchases: global.pendingPurchases || [],
                purchaseReturns: global.purchaseReturns || [],
                liquidityLog: global.liquidityLog || [],
                log: liveOpLog
            };
            if (idx !== -1) daysList[idx] = { ...daysList[idx], ...liveDay };
            else daysList.push(liveDay);
        }
        daysList.sort((a, b) => a._docDate.localeCompare(b._docDate));

        const suppliersMap = new Map();
        const accountsMap = new Map();
        const ingestSup = (arr) => (arr || []).forEach(s => { if (s && s.id) suppliersMap.set(s.id, s.name || s.id); });
        const ingestAcc = (arr) => (arr || []).forEach(a => { if (a && a.id) accountsMap.set(a.id, a.name || a.id); });
        daysList.forEach(d => { ingestSup(d.suppliers); ingestAcc(d.accounts); });
        ingestSup(liveSuppliers);
        ingestAcc(global.accounts || []);

        const supplierName = suppliersMap.get(supplierId) || 'مورد غير محدد';
        const targetNorm = norm(supplierName);

        // 1) فواتير الشراء الخاصة بهذا المورد فقط (بمطابقة supplierId المباشرة)
        // ندمج ملفات الأيام أولاً ثم purchase_archives حتى لا تطغى لقطة قديمة على الحالة الأحدث (Confirmed / returnedQuantity / isCancelled)
        const invMap = new Map();
        const seenInRealDays = new Set();
        const scannedDatesSet = new Set(daysList.map(d => d._docDate));

        const ingestInv = (inv, src, docDate) => {
            if (!inv || inv.supplierId !== supplierId) return;
            const id = inv.id || `${inv.date || docDate}_${inv.invoiceNumber || ''}_${num(inv.grandTotal)}`;
            if (src !== 'purchase_archives') seenInRealDays.add(id);
            const prev = invMap.get(id);

            const incomingItems = (inv.items || []).map(it => ({
                name: it.name || 'صنف',
                category: it.category || '',
                quantity: num(it.quantity),
                returnedQuantity: num(it.returnedQuantity),
                unitCost: num(it.cost),
                goodsSubtotal: money(num(it.quantity) * num(it.cost)),
                serialsCount: Array.isArray(it.serials) ? it.serials.length : 0
            }));
            let mergedItems = incomingItems.length ? incomingItems : (prev?.items || []);
            if (prev?.items && incomingItems.length && prev.items.length === incomingItems.length) {
                mergedItems = incomingItems.map((it, idx) => ({
                    ...it,
                    returnedQuantity: Math.max(it.returnedQuantity, num(prev.items[idx]?.returnedQuantity))
                }));
            }

            const goodsTotal = money(mergedItems.reduce((s, it) => s + it.goodsSubtotal, 0));
            const extraCosts = Array.isArray(inv.extraCosts) && inv.extraCosts.length ? inv.extraCosts : (prev?.extraCosts || []);
            const extraCostsTotal = money(extraCosts.reduce((s, c) => s + num(c.amount), 0));
            const isExplicitlyCancelled = Boolean(inv.isCancelled || inv.status === 'Cancelled' || prev?.isExplicitlyCancelled);

            // تفضيل Confirmed على Pending عند الدمج بين يوم سابق وأرشيف أحدث
            let resolvedStatus = inv.status || prev?.status || 'Confirmed';
            if (isExplicitlyCancelled) resolvedStatus = 'Cancelled';
            else if (prev?.status === 'Confirmed' && resolvedStatus === 'Pending') resolvedStatus = 'Confirmed';

            const mergedInvPayments = new Map();
            [...(prev?.payments || []), ...(inv.payments || [])].forEach(p => {
                if (p && num(p.amount) > 0) {
                    mergedInvPayments.set(`${p.date || ''}|${num(p.amount)}|${p.accountId || ''}|${p.source || ''}`, p);
                }
            });

            invMap.set(id, {
                ...(prev || {}),
                id,
                date: toCairoDate(inv.date) || toCairoDate(inv.timestamp) || prev?.date || docDate || '',
                timestamp: inv.timestamp || prev?.timestamp || '',
                invoiceNumber: inv.invoiceNumber || prev?.invoiceNumber || '',
                supplierId,
                supplierName,
                status: resolvedStatus,
                returnStatus: inv.returnStatus || prev?.returnStatus || null,
                items: mergedItems,
                extraCosts,
                goodsTotalForSupplier: goodsTotal || prev?.goodsTotalForSupplier || 0,
                internalExtraCostsTotal: extraCostsTotal || prev?.internalExtraCostsTotal || 0,
                grandTotalWithExtras: num(inv.grandTotal) || prev?.grandTotalWithExtras || 0,
                paidFromAccount: accountsMap.get(inv.paidFromAccountId) || prev?.paidFromAccount || null,
                payments: Array.from(mergedInvPayments.values()),
                isExplicitlyCancelled,
                _sources: Array.from(new Set([...(prev?._sources || []), src])),
                _inRealDayRecord: seenInRealDays.has(id)
            });
        };

        daysList.forEach(d => {
            (d.purchaseInvoices || []).forEach(inv => ingestInv(inv, `day:${d._docDate}`, d._docDate));
            (d.pendingPurchases || []).forEach(inv => ingestInv(inv, `pending:${d._docDate}`, d._docDate));
        });
        archivesList.forEach(inv => ingestInv(inv, 'purchase_archives', ''));

        const allSupplierInvoices = Array.from(invMap.values());
        const supplierInvIds = new Set(allSupplierInvoices.map(i => i.id));

        const periodInvoices = allSupplierInvoices
            .filter(inv => matchesPeriod(inv.date) || matchesPeriod(inv.timestamp))
            .map(inv => {
                // اعتبار الفاتورة "أرشيف غير مؤكد / ملغاة" فقط إذا وُسمت صراحة كملغاة، أو إذا كان يوم إنشائها ضمن الأيام التي تم فحصها ومع ذلك لم تظهر في أي يوم فعلي
                const createdDay = toCairoDate(inv.timestamp) || inv.date;
                const dayWasScanned = allPeriods || !createdDay || createdDay.startsWith(yearMonth) || scannedDatesSet.has(createdDay);
                const isGhost = !inv._inRealDayRecord && dayWasScanned && daysList.length > 0;
                return {
                    ...inv,
                    isCancelledOrGhost: Boolean(inv.isExplicitlyCancelled || isGhost)
                };
            })
            .sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.timestamp || '').localeCompare(String(b.timestamp || '')));

        const confirmedInvoices = periodInvoices.filter(i => !i.isCancelledOrGhost);
        const cancelledOrGhostInvoices = periodInvoices.filter(i => i.isCancelledOrGhost);

        // 2) التزامات المورد الأساسية فقط (استبعاد purchase_extra_cost تماماً)
        const isMatchingSupplierLiability = (l) => {
            if (!l || !l.id) return false;
            if (l.source === 'purchase_extra_cost' || isExtraCostText(l.name)) return false;
            return (l.supplierId === supplierId && (!l.purchaseInvoiceId || supplierInvIds.has(l.purchaseInvoiceId))) ||
                (l.purchaseInvoiceId && supplierInvIds.has(l.purchaseInvoiceId)) ||
                norm(l.name) === norm(`متبقي فاتورة لـ: ${supplierName}`) ||
                norm(l.name) === targetNorm;
        };

        const liveLiabIds = new Set((liveLiabilities || []).filter(l => l && l.id).map(l => l.id));
        const liabMap = new Map();
        const ingestLiab = (arr, seenDate, isLiveSnapshot = false) => (arr || []).forEach(l => {
            if (!isMatchingSupplierLiability(l)) return;
            const prev = liabMap.get(l.id);
            const histMap = new Map();
            [...(prev?.paymentHistory || []), ...(l.paymentHistory || [])].forEach(p => {
                histMap.set(p.id || `${p.date || ''}|${num(p.amount)}|${p.accountId || ''}`, p);
            });
            const existsLive = isLiveSnapshot || liveLiabIds.has(l.id);
            const liveAmt = existsLive ? num(l.amount) : 0;
            liabMap.set(l.id, {
                id: l.id,
                name: l.name,
                date: l.date || '',
                purchaseInvoiceId: l.purchaseInvoiceId || null,
                currentAmount: liveAmt,
                currentStatus: (!existsLive || l.status === 'paid' || liveAmt <= 0.001) ? 'paid' : 'active',
                paymentHistory: Array.from(histMap.values()).sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
                lastSeenDate: seenDate
            });
        });
        daysList.forEach(d => ingestLiab(d.liabilities, d._docDate, false));
        ingestLiab(liveLiabilities, activeDate, true);
        const supplierLiabilities = Array.from(liabMap.values());

        // حساب الرصيد المتبقي حالياً حصراً من الالتزامات الحية الآن (منع أي أرصدة وهمية لالتزامات ملغاة)
        const currentRemainingBalance = money(
            (liveLiabilities || [])
                .filter(l => isMatchingSupplierLiability(l) && l.status !== 'paid' && num(l.amount) > 0.001)
                .reduce((s, l) => s + num(l.amount), 0)
        );

        // 3) الحركات المالية الخاصة بالمورد فقط (دمج دقيق بين سجل دفعات الالتزامات + دفعات الفواتير + حركات الخزينة المطابقة بحدود الاسم بدقة)
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const exactSupplierNameRegex = targetNorm
            ? new RegExp(`(^|[\\s:"'«(]|لـ:?\\s*)${escapeRegExp(targetNorm)}($|[\\s:"'»).,،؛(])`)
            : null;

        const isSupplierCashMove = (desc) => {
            if (!desc || isExtraCostText(desc)) return false;
            const t = norm(desc);
            // استبعاد قيد السداد المجمع متعدد الدائنين هنا لأنه يُحسب بدقة لكل مورد من paymentHistory
            if (t.includes('تسديد التزام مجمع') && t.includes('،')) return false;
            const mentionsInvId = Array.from(supplierInvIds).some(id => id && desc.includes(id));
            if (mentionsInvId) return true;
            if (!exactSupplierNameRegex || !exactSupplierNameRegex.test(t)) return false;
            return /(عربون شراء|دفع فاتوره شراء|متبقي فاتوره|مرتجع مشتريات|الغاء شراء|استلام وتسديد|مورد|تسديد.*التزام|سداد كامل التزامات)/.test(t);
        };

        const liqMap = new Map();
        const addCashMove = (key, entry) => {
            if (!entry || num(entry.amount) <= 0.001) return;
            if (!liqMap.has(key)) liqMap.set(key, entry);
        };

        // أ) حركات الخزينة المطابقة بدقة لاسم المورد أو معرّفات فواتيره
        const ingestLiq = (arr, fb) => (arr || []).forEach(e => {
            if (!e) return;
            const dStr = toCairoDate(e.timestamp) || fb || '';
            if (!matchesPeriod(dStr) || !isSupplierCashMove(e.description)) return;
            const key = e.id || `liq|${dStr}|${e.type}|${num(e.amount)}|${norm(e.description)}`;
            addCashMove(key, {
                date: dStr,
                timestamp: e.timestamp || dStr,
                type: e.type === 'remove' ? 'صرف للمورد' : (e.type === 'add' ? 'استرداد من المورد' : e.type),
                rawType: e.type,
                amount: num(e.amount),
                account: accountsMap.get(e.accountId) || e.accountId || '-',
                description: e.description || ''
            });
        });
        daysList.forEach(d => ingestLiq(d.liquidityLog, d._docDate));
        ingestLiq(archLiqList, '');

        // ب) إضافة دفعات paymentHistory الدقيقة من التزامات المورد (يغطي السداد المجمع واستلام وتسديد ppConfirmBtn والالتزامات اليدوية دون تضخيم أو تكرار)
        const existingLiqEntries = Array.from(liqMap.values());
        supplierLiabilities.forEach(l => {
            (l.paymentHistory || []).forEach(p => {
                const dStr = toCairoDate(p.date);
                const amt = num(p.amount);
                if (!matchesPeriod(dStr) || amt <= 0.001) return;
                const pTime = new Date(p.date || 0).getTime();
                const alreadyCovered = existingLiqEntries.some(ex => {
                    if (ex.rawType !== 'remove' || ex.date !== dStr) return false;
                    const exTime = new Date(ex.timestamp || 0).getTime();
                    const nearTime = !isNaN(pTime) && !isNaN(exTime) && Math.abs(pTime - exTime) <= 5000;
                    return (Math.abs(ex.amount - amt) <= 0.01 && nearTime) || (nearTime && ex.amount >= amt - 0.01 && norm(ex.description).includes('سداد كامل'));
                });
                if (!alreadyCovered) {
                    const key = `payhist|${p.id || `${p.date}|${amt}|${l.id}`}`;
                    addCashMove(key, {
                        date: dStr,
                        timestamp: p.date || dStr,
                        type: 'صرف للمورد',
                        rawType: 'remove',
                        amount: amt,
                        account: p.accountName || accountsMap.get(p.accountId) || p.accountId || '-',
                        description: `${l.name || 'سداد التزام مورد'}${p.note ? ' — ' + p.note : ''}`
                    });
                }
            });
        });

        const cashMovements = Array.from(liqMap.values()).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

        // 4) مرتجعات المشتريات للمورد فقط
        const retMap = new Map();
        daysList.forEach(d => (d.purchaseReturns || []).forEach(r => {
            if (!r) return;
            const dStr = toCairoDate(r.date) || d._docDate;
            if (!matchesPeriod(dStr)) return;
            if (!(r.supplierId === supplierId || supplierInvIds.has(r.invoiceId))) return;
            retMap.set(r.id || `${dStr}|${r.invoiceId}|${num(r.totalValue)}`, {
                ...r,
                date: dStr,
                totalValue: num(r.totalValue),
                appliedToDebt: num(r.appliedToDebt),
                cashRefunded: num(r.cashRefunded)
            });
        }));
        const returnsList = Array.from(retMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // 5) ملخص إحصائي صافي
        const totalUnits = confirmedInvoices.reduce((s, inv) => s + inv.items.reduce((is, it) => is + it.quantity, 0), 0);
        const totalGoodsValue = money(confirmedInvoices.reduce((s, i) => s + i.goodsTotalForSupplier, 0));
        const totalInternalExtras = money(confirmedInvoices.reduce((s, i) => s + i.internalExtraCostsTotal, 0));
        const totalCashOutGross = money(cashMovements.filter(m => m.rawType === 'remove').reduce((s, m) => s + m.amount, 0));
        const totalCashRefunded = money(cashMovements.filter(m => m.rawType === 'add').reduce((s, m) => s + m.amount, 0));
        const totalCashPaid = money(Math.max(0, totalCashOutGross - totalCashRefunded));
        const totalReturnsValue = money(returnsList.reduce((s, r) => s + r.totalValue, 0));

        return {
            supplierId,
            supplierName,
            periodLabel: allPeriods ? 'كل الفترات (شامل)' : `شهر ${yearMonth}`,
            yearMonth,
            allPeriods,
            scannedDaysCount: daysList.length,
            summary: {
                confirmedInvoicesCount: confirmedInvoices.length,
                cancelledOrGhostCount: cancelledOrGhostInvoices.length,
                totalUnits,
                totalGoodsValue,
                totalInternalExtras,
                totalCashOutGross,
                totalCashPaid,
                totalCashRefunded,
                totalReturnsValue,
                currentRemainingBalance
            },
            confirmedInvoices,
            cancelledOrGhostInvoices,
            supplierLiabilities,
            cashMovements,
            returnsList
        };
    }

    function renderInvoiceBlock(inv, idx, isCancelled = false) {
        const statusBadge = isCancelled
            ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">ملغاة / أرشيف غير مؤكد</span>'
            : (inv.status === 'Pending'
                ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">معلقة قيد الاستلام</span>'
                : '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">مؤكدة ومستلمة</span>');

        const itemsRows = inv.items.map(it => `
            <tr class="border-b border-gray-100">
                <td class="p-2 text-right font-medium text-gray-800">${esc(it.name)}${it.category ? ` <span class="text-xs text-gray-500">(${esc(it.category)})</span>` : ''}</td>
                <td class="p-2 text-center font-mono font-bold">${it.quantity}</td>
                <td class="p-2 text-center font-mono ${it.returnedQuantity > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}">${it.returnedQuantity}</td>
                <td class="p-2 text-center font-mono">${fmt(it.unitCost)}</td>
                <td class="p-2 text-center font-mono font-bold text-indigo-700">${fmt(it.goodsSubtotal)}</td>
            </tr>
        `).join('');

        const extraNote = inv.internalExtraCostsTotal > 0
            ? `<div class="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                    <strong>تكاليف إضافية داخلية (لا تُحسب على المورد):</strong> ${fmt(inv.internalExtraCostsTotal)}
                    ${inv.extraCosts.length ? ' — ' + inv.extraCosts.map(c => `${esc(c.name)}: ${fmt(c.amount)}`).join(' | ') : ''}
               </div>`
            : '';

        return `
            <div class="border ${isCancelled ? 'border-rose-200 bg-rose-50/30' : 'border-gray-200 bg-white'} rounded-lg p-3 mb-3 shadow-sm">
                <div class="flex flex-wrap justify-between items-center gap-2 pb-2 mb-2 border-b border-gray-100">
                    <div class="flex flex-wrap items-center gap-2 text-sm">
                        <span class="font-bold text-gray-800">#${idx + 1}</span>
                        <span class="font-mono text-gray-700">${esc(toCairoDateTime(inv.timestamp || inv.date))}</span>
                        ${inv.invoiceNumber ? `<span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">رقم: ${esc(inv.invoiceNumber)}</span>` : ''}
                        <span class="text-[11px] text-gray-400 font-mono">${esc(inv.id)}</span>
                        ${statusBadge}
                    </div>
                    <div class="text-sm font-bold text-indigo-700 font-mono">
                        حق المورد: ${fmt(inv.goodsTotalForSupplier)}
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs sm:text-sm border-collapse min-w-[460px]">
                        <thead>
                            <tr class="bg-gray-100 text-gray-700">
                                <th class="p-2 text-right">الصنف</th>
                                <th class="p-2 text-center">الكمية</th>
                                <th class="p-2 text-center">المرتجع</th>
                                <th class="p-2 text-center">سعر الوحدة</th>
                                <th class="p-2 text-center">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>${itemsRows || '<tr><td colspan="5" class="p-2 text-center text-gray-400">لا توجد أصناف</td></tr>'}</tbody>
                    </table>
                </div>
                ${extraNote}
            </div>
        `;
    }

    function renderStatementReport(report) {
        const container = document.getElementById('ss-report-container');
        if (!container) return;
        const showCancelled = Boolean(document.getElementById('ss-show-cancelled-cb')?.checked);
        const s = report.summary;

        const cancelledBanner = (s.cancelledOrGhostCount > 0 && !showCancelled)
            ? `<div class="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <i class="fas fa-info-circle ml-1"></i>
                    تم استبعاد <strong>${s.cancelledOrGhostCount}</strong> فاتورة ملغاة أو أرشيفية غير مؤكدة من الإجماليات لحماية دقة الحساب. (فعّل خيار "إظهار الفواتير الملغاة" بالأعلى لمراجعتها).
               </div>`
            : '';

        const cancelledSection = (showCancelled && report.cancelledOrGhostInvoices.length > 0)
            ? `<div class="mt-6">
                    <h3 class="text-base font-bold text-rose-700 mb-3 border-b pb-1">⚠️ فواتير ملغاة / أرشيف غير مؤكد (غير داخلة في الإجمالي) (${report.cancelledOrGhostInvoices.length})</h3>
                    ${report.cancelledOrGhostInvoices.map((inv, idx) => renderInvoiceBlock(inv, idx, true)).join('')}
               </div>`
            : '';

        const cashRows = report.cashMovements.map((m, idx) => `
            <tr class="border-b border-gray-100">
                <td class="p-2 text-center font-mono text-gray-500">${idx + 1}</td>
                <td class="p-2 text-right font-mono text-xs">${esc(toCairoDateTime(m.timestamp))}</td>
                <td class="p-2 text-center">
                    <span class="px-2 py-0.5 rounded text-xs font-bold ${m.rawType === 'remove' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}">${esc(m.type)}</span>
                </td>
                <td class="p-2 text-center font-mono font-bold">${fmt(m.amount)}</td>
                <td class="p-2 text-right">${esc(m.account)}</td>
                <td class="p-2 text-right text-gray-700">${esc(m.description)}</td>
            </tr>
        `).join('');

        const returnsRows = report.returnsList.map((r, idx) => `
            <tr class="border-b border-gray-100">
                <td class="p-2 text-center font-mono">${idx + 1}</td>
                <td class="p-2 text-right font-mono">${esc(r.date)}</td>
                <td class="p-2 text-right font-mono">${esc(r.invoiceNumber || r.invoiceId || '-')}</td>
                <td class="p-2 text-center font-mono font-bold text-amber-700">${fmt(r.totalValue)}</td>
                <td class="p-2 text-center font-mono">${fmt(r.appliedToDebt)}</td>
                <td class="p-2 text-center font-mono">${fmt(r.cashRefunded)}</td>
                <td class="p-2 text-right text-xs">${esc((r.items || []).map(i => `${num(i.qty)}× ${i.name}`).join('، '))}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div id="ss-print-area">
                <div class="mb-4 pb-3 border-b flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800 m-0">كشف حساب المورد: <span class="text-indigo-700">${esc(report.supplierName)}</span></h3>
                        <p class="text-xs text-gray-500 mt-1 m-0">الفترة: <strong>${esc(report.periodLabel)}</strong> | أيام تم فحصها من السحابة: ${report.scannedDaysCount} يوم</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                    <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div class="text-xs text-gray-500">الفواتير المؤكدة</div>
                        <div class="text-lg font-extrabold text-gray-800 font-mono">${s.confirmedInvoicesCount} <span class="text-xs font-normal text-gray-500">(${s.totalUnits} قطعة)</span></div>
                    </div>
                    <div class="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div class="text-xs text-blue-700">مشتريات البضاعة (حق المورد)</div>
                        <div class="text-lg font-extrabold text-blue-800 font-mono">${fmt(s.totalGoodsValue)}</div>
                    </div>
                    <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div class="text-xs text-emerald-700">صافي المدفوع للمورد</div>
                        <div class="text-lg font-extrabold text-emerald-800 font-mono">${fmt(s.totalCashPaid)}</div>
                        ${s.totalCashRefunded > 0.01 ? `<div class="text-[11px] text-emerald-700 mt-0.5">مصروف: ${fmt(s.totalCashOutGross)} | مسترد: ${fmt(s.totalCashRefunded)}</div>` : ''}
                    </div>
                    <div class="p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div class="text-xs text-amber-700">مرتجعات المشتريات</div>
                        <div class="text-lg font-extrabold text-amber-800 font-mono">${fmt(s.totalReturnsValue)}</div>
                    </div>
                    <div class="p-3 rounded-lg ${s.currentRemainingBalance > 0.01 ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'} border">
                        <div class="text-xs ${s.currentRemainingBalance > 0.01 ? 'text-red-700' : 'text-teal-700'}">الرصيد المتبقي حالياً</div>
                        <div class="text-lg font-extrabold ${s.currentRemainingBalance > 0.01 ? 'text-red-700' : 'text-teal-800'} font-mono">${fmt(s.currentRemainingBalance)}</div>
                    </div>
                    <div class="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div class="text-xs text-gray-500">تكاليف إضافية داخلية</div>
                        <div class="text-lg font-bold text-gray-700 font-mono">${fmt(s.totalInternalExtras)}</div>
                    </div>
                </div>

                ${cancelledBanner}

                <div class="mb-6">
                    <h4 class="text-base font-bold text-indigo-800 mb-3 border-b pb-1">🧾 فواتير الشراء المؤكدة من المورد (${report.confirmedInvoices.length})</h4>
                    ${report.confirmedInvoices.length
                        ? report.confirmedInvoices.map((inv, idx) => renderInvoiceBlock(inv, idx, false)).join('')
                        : '<p class="text-center text-gray-500 py-4 bg-gray-50 rounded border">لا توجد فواتير شراء مؤكدة لهذا المورد في الفترة المحددة.</p>'}
                </div>

                <div class="mb-6">
                    <h4 class="text-base font-bold text-emerald-800 mb-3 border-b pb-1">💳 الحركات المالية مع المورد فقط (${report.cashMovements.length})</h4>
                    <div class="overflow-x-auto border rounded-lg">
                        <table class="w-full text-xs sm:text-sm border-collapse min-w-[540px]">
                            <thead>
                                <tr class="bg-gray-100 text-gray-700">
                                    <th class="p-2 text-center">#</th>
                                    <th class="p-2 text-right">التاريخ والوقت</th>
                                    <th class="p-2 text-center">النوع</th>
                                    <th class="p-2 text-center">المبلغ</th>
                                    <th class="p-2 text-right">الحساب</th>
                                    <th class="p-2 text-right">البيان</th>
                                </tr>
                            </thead>
                            <tbody>${cashRows || '<tr><td colspan="6" class="p-4 text-center text-gray-400">لا توجد حركات مالية مسجلة مع هذا المورد في هذه الفترة.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>

                ${report.returnsList.length > 0 ? `
                <div class="mb-6">
                    <h4 class="text-base font-bold text-amber-800 mb-3 border-b pb-1">↩️ مرتجعات المشتريات (${report.returnsList.length})</h4>
                    <div class="overflow-x-auto border rounded-lg">
                        <table class="w-full text-xs sm:text-sm border-collapse min-w-[540px]">
                            <thead>
                                <tr class="bg-gray-100 text-gray-700">
                                    <th class="p-2 text-center">#</th>
                                    <th class="p-2 text-right">التاريخ</th>
                                    <th class="p-2 text-right">الفاتورة</th>
                                    <th class="p-2 text-center">القيمة</th>
                                    <th class="p-2 text-center">خصم التزام</th>
                                    <th class="p-2 text-center">مسترد نقدي</th>
                                    <th class="p-2 text-right">الأصناف</th>
                                </tr>
                            </thead>
                            <tbody>${returnsRows}</tbody>
                        </table>
                    </div>
                </div>` : ''}

                ${cancelledSection}
            </div>
        `;
    }

    async function loadSupplierStatementReport() {
        if (_isLoadingStatement) return;
        const supplierId = document.getElementById('ss-supplier-select')?.value || '';
        const yearMonth = document.getElementById('ss-month-input')?.value || getActiveMonthString();
        const allPeriods = Boolean(document.getElementById('ss-all-periods-cb')?.checked);
        const msgEl = document.getElementById('ss-status-message');
        const container = document.getElementById('ss-report-container');

        if (!supplierId) {
            if (msgEl && typeof global.showMessage === 'function') global.showMessage(msgEl, 'يرجى اختيار المورد أولاً.', true);
            return;
        }

        _isLoadingStatement = true;
        if (msgEl && typeof global.showMessage === 'function') global.showMessage(msgEl, 'جاري تحميل فواتير وحركات المورد من السحابة...', false, true);
        if (container) container.innerHTML = '<div class="text-center py-8 text-indigo-600 font-bold"><i class="fas fa-spinner fa-spin ml-2"></i> جاري فحص الأرشيف وأيام الشهر من السحابة...</div>';

        try {
            const report = await fetchSupplierStatementData(supplierId, yearMonth, allPeriods);
            _lastStatementReport = report;
            renderStatementReport(report);
            if (msgEl && typeof global.showMessage === 'function') global.showMessage(msgEl, `تم تحميل كشف حساب "${report.supplierName}" بنجاح.`, false);
        } catch (err) {
            console.error('[SupplierStatement] Error loading report:', err);
            if (container) container.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-center">${esc(err.message || 'تعذر تحميل التقرير من السحابة.')}</div>`;
            if (msgEl && typeof global.showMessage === 'function') global.showMessage(msgEl, err.message || 'فشل تحميل التقرير.', true);
        } finally {
            _isLoadingStatement = false;
        }
    }

    function printSupplierStatementReport() {
        if (!_lastStatementReport) {
            alert('يرجى عرض كشف حساب مورد أولاً قبل الطباعة.');
            return;
        }
        const printArea = document.getElementById('ss-print-area');
        if (!printArea) return;

        // استنساخ منطقة الطباعة داخل حاوية مباشرة في body لتجاوز قاعدة display:none !important على section/.widget-card في finance.css
        const existingPortal = document.getElementById('ss-print-portal');
        if (existingPortal) existingPortal.remove();
        const existingStyle = document.getElementById('ss-temp-print-style');
        if (existingStyle) existingStyle.remove();

        const portal = document.createElement('div');
        portal.id = 'ss-print-portal';
        portal.setAttribute('dir', 'rtl');
        portal.innerHTML = printArea.innerHTML;
        document.body.appendChild(portal);

        const styleEl = document.createElement('style');
        styleEl.id = 'ss-temp-print-style';
        styleEl.textContent = `
            #ss-print-portal { display: none; }
            @media print {
                body > *:not(#ss-print-portal) { display: none !important; }
                #ss-print-portal {
                    display: block !important;
                    visibility: visible !important;
                    width: 100% !important;
                    padding: 12px !important;
                    background: #ffffff !important;
                    color: #0f172a !important;
                }
                #ss-print-portal * { visibility: visible !important; }
            }
        `;
        document.head.appendChild(styleEl);

        const cleanup = () => {
            const p = document.getElementById('ss-print-portal');
            if (p) p.remove();
            const s = document.getElementById('ss-temp-print-style');
            if (s) s.remove();
        };
        window.addEventListener('afterprint', cleanup, { once: true });
        window.print();
        setTimeout(cleanup, 60000);
    }

    function exportSupplierStatementCSV() {
        if (!_lastStatementReport) {
            alert('يرجى عرض كشف حساب مورد أولاً قبل التصدير.');
            return;
        }
        const r = _lastStatementReport;
        const qCsv = (v) => {
            let s = String(v == null ? '' : v);
            if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // حماية من حقن صيغ Excel (CSV Formula Injection)
            return `"${s.replace(/"/g, '""')}"`;
        };
        const rows = [
            ['القسم', 'التاريخ', 'المرجع / الفاتورة', 'البيان / الصنف', 'الكمية', 'سعر الوحدة', 'المبلغ (ج.م)', 'الحساب / ملاحظات']
        ];
        r.confirmedInvoices.forEach(inv => {
            inv.items.forEach(it => {
                rows.push(['فاتورة شراء مؤكدة', inv.date, inv.invoiceNumber || inv.id, it.name, it.quantity, it.unitCost, it.goodsSubtotal, inv.status === 'Pending' ? 'معلقة' : 'مستلمة']);
            });
        });
        r.cashMovements.forEach(m => {
            rows.push([m.type, m.date, '', m.description, '', '', m.amount, m.account]);
        });
        r.returnsList.forEach(ret => {
            rows.push(['مرتجع مشتريات', ret.date, ret.invoiceNumber || ret.invoiceId || '', (ret.items || []).map(i => `${num(i.qty)}x ${i.name}`).join(' | '), '', '', ret.totalValue, `خصم التزام: ${ret.appliedToDebt} | نقدي: ${ret.cashRefunded}`]);
        });
        rows.push(['الملخص الصافي', r.periodLabel, r.supplierName, `فواتير مؤكدة: ${r.summary.confirmedInvoicesCount}`, r.summary.totalUnits, '', r.summary.totalGoodsValue, `المدفوع: ${r.summary.totalCashPaid} | المرتجعات: ${r.summary.totalReturnsValue} | المتبقي: ${r.summary.currentRemainingBalance}`]);

        const csv = '\uFEFF' + rows.map(row => row.map(qCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const periodSlug = r.allPeriods ? 'all' : r.yearMonth;
        a.download = `كشف_حساب_${r.supplierName}_${periodSlug}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const loadBtn = document.getElementById('ss-load-btn');
        const printBtn = document.getElementById('ss-print-btn');
        const csvBtn = document.getElementById('ss-csv-btn');
        const allPeriodsCb = document.getElementById('ss-all-periods-cb');
        const monthInput = document.getElementById('ss-month-input');
        const showCancelledCb = document.getElementById('ss-show-cancelled-cb');

        if (loadBtn) loadBtn.addEventListener('click', loadSupplierStatementReport);
        if (printBtn) printBtn.addEventListener('click', printSupplierStatementReport);
        if (csvBtn) csvBtn.addEventListener('click', exportSupplierStatementCSV);
        if (allPeriodsCb && monthInput) {
            allPeriodsCb.addEventListener('change', () => {
                monthInput.disabled = allPeriodsCb.checked;
            });
        }
        if (showCancelledCb) {
            showCancelledCb.addEventListener('change', () => {
                if (_lastStatementReport) renderStatementReport(_lastStatementReport);
            });
        }
    });

    global.openSupplierStatementSection = openSupplierStatementSection;
    global.populateSupplierStatementDropdown = populateSupplierStatementDropdown;
    global.loadSupplierStatementReport = loadSupplierStatementReport;
    global.printSupplierStatementReport = printSupplierStatementReport;
    global.exportSupplierStatementCSV = exportSupplierStatementCSV;
})(typeof window !== 'undefined' ? window : global);
