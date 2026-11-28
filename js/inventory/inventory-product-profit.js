// js/inventory/inventory-product-profit.js
// شاشة تحليل أرباح منتج محدد بالمعرّف الفريد (product.id) فقط — عزل تام بدون أي تداخل مع منتجات أخرى حتى لو تشابهت الأسماء
(function (global) {
    'use strict';

    let _lastProfitReport = null;
    let _isLoadingProfit = false;
    let _modalCreated = false;

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

    function getActiveMonthString() {
        const activeDate = global.currentLoadedDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
        return String(activeDate).slice(0, 7);
    }

    function ensureProductProfitModal() {
        let modal = document.getElementById('productProfitAnalyticsModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'productProfitAnalyticsModal';
        modal.className = 'modal';
        modal.setAttribute('dir', 'rtl');
        modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:99990; background:rgba(15,23,42,0.65); backdrop-filter:blur(3px); padding:14px; overflow-y:auto; box-sizing:border-box;';

        modal.innerHTML = `
            <div style="background:#ffffff; width:min(1120px,100%); margin:16px auto; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,0.3); overflow:hidden; border-top:5px solid #059669;">
                <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:14px 18px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px;">
                    <div>
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#065f46;">
                            <i class="fas fa-chart-line" style="margin-left:6px; color:#059669;"></i>
                            تحليل أرباح منتج محدد (بالمعرّف الخاص فقط — بدون تداخل)
                        </h3>
                        <div style="font-size:12px; color:#475569; margin-top:2px;">المطابقة تتم حصراً بكود المنتج الفريد (ID) ولا تتأثر بأي منتج آخر يحمل نفس الاسم.</div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                        <button type="button" id="pp-print-btn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow">
                            <i class="fas fa-print ml-1"></i> طباعة / PDF
                        </button>
                        <button type="button" id="pp-csv-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow">
                            <i class="fas fa-file-excel ml-1"></i> تصدير Excel
                        </button>
                        <button type="button" id="pp-close-btn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1.5 px-3 rounded-lg text-xs">
                            ✖ إغلاق
                        </button>
                    </div>
                </div>

                <div style="padding:16px 18px;">
                    <div class="bg-gray-50 p-3.5 rounded-lg border border-gray-200 mb-4">
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div class="md:col-span-5">
                                <label for="pp-product-select" class="block text-xs font-bold text-gray-700 mb-1">اختر المنتج (مميّز بالكود والمورد والتكلفة):</label>
                                <select id="pp-product-select" class="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm"></select>
                            </div>
                            <div class="md:col-span-3">
                                <label for="pp-month-input" class="block text-xs font-bold text-gray-700 mb-1">الشهر:</label>
                                <input type="month" id="pp-month-input" class="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm">
                            </div>
                            <div class="md:col-span-2 pb-1">
                                <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                                    <input type="checkbox" id="pp-all-periods-cb" checked class="rounded border-gray-300 text-emerald-600">
                                    <span>كل الفترات (شامل)</span>
                                </label>
                            </div>
                            <div class="md:col-span-2">
                                <button type="button" id="pp-load-btn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-sm shadow">
                                    <i class="fas fa-calculator ml-1"></i> احسب الربح
                                </button>
                            </div>
                        </div>
                        <div id="pp-status-message" class="section-message mt-2"></div>
                    </div>

                    <div id="pp-report-container">
                        <div class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            اختر المنتج من القائمة واضغط <strong>"احسب الربح"</strong>.
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        if (!_modalCreated) {
            _modalCreated = true;
            document.getElementById('pp-close-btn').addEventListener('click', closeProductProfitModal);
            document.getElementById('pp-load-btn').addEventListener('click', loadProductProfitReport);
            document.getElementById('pp-print-btn').addEventListener('click', printProductProfitReport);
            document.getElementById('pp-csv-btn').addEventListener('click', exportProductProfitCSV);
            const allCb = document.getElementById('pp-all-periods-cb');
            const mInp = document.getElementById('pp-month-input');
            allCb.addEventListener('change', () => { mInp.disabled = allCb.checked; });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeProductProfitModal();
            });
        }
        return modal;
    }

    function populateProductProfitDropdown(preselectProductId = null) {
        const sel = document.getElementById('pp-product-select');
        if (!sel) return;
        const currentVal = preselectProductId || sel.value || '';
        const liveProds = Array.isArray(global.products) ? global.products : [];
        const liveSups = (typeof global.getSuppliers === 'function' ? global.getSuppliers() : (global.suppliers || []));
        const supMap = new Map(liveSups.filter(s => s && s.id).map(s => [s.id, s.name || '']));

        // كشف الأسماء المكررة لتمييزها بوضوح
        const nameCounts = new Map();
        liveProds.forEach(p => {
            if (!p) return;
            const k = norm(p.name);
            nameCounts.set(k, (nameCounts.get(k) || 0) + 1);
        });

        const sorted = [...liveProds]
            .filter(p => p && p.id)
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar') || String(a.id).localeCompare(String(b.id)));

        sel.innerHTML = '<option value="">-- اختر المنتج --</option>' + sorted.map(p => {
            const supName = supMap.get(p.supplierId) || '';
            const dupTag = (nameCounts.get(norm(p.name)) || 0) > 1 ? ' ⚠️[اسم مكرر]' : '';
            const label = `${p.name || 'غير مسمى'}${dupTag} | كود: ${p.id} | متاح: ${num(p.quantity)} | تكلفة: ${num(p.costPrice).toFixed(2)}${supName ? ' | مورد: ' + supName : ''}${p.category ? ' | قسم: ' + p.category : ''}`;
            return `<option value="${esc(p.id)}">${esc(label)}</option>`;
        }).join('');

        if (currentVal && sorted.some(p => String(p.id) === String(currentVal))) {
            sel.value = String(currentVal);
        }
    }

    function openProductProfitModal(productId = null) {
        const modal = ensureProductProfitModal();
        populateProductProfitDropdown(productId);

        const mInp = document.getElementById('pp-month-input');
        const allCb = document.getElementById('pp-all-periods-cb');
        if (mInp && !mInp.value) mInp.value = getActiveMonthString();
        if (mInp && allCb) mInp.disabled = allCb.checked;

        modal.style.display = 'block';
        if (productId) {
            loadProductProfitReport();
        }
    }

    function closeProductProfitModal() {
        const modal = document.getElementById('productProfitAnalyticsModal');
        if (modal) modal.style.display = 'none';
    }

    async function fetchStrictProductProfit(targetProductId, yearMonth, allPeriods) {
        const user = global.currentUser || (global.auth && global.auth.currentUser);
        if (!user || !global.db) {
            throw new Error('يجب تسجيل الدخول أولاً لحساب الأرباح من السحابة.');
        }

        const uid = user.uid;
        const targetId = String(targetProductId).trim();
        const activeDate = global.currentLoadedDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
        const userRef = global.db.collection('users').doc(uid);

        const liveProds = Array.isArray(global.products) ? global.products : [];
        const liveSups = (typeof global.getSuppliers === 'function' ? global.getSuppliers() : (global.suppliers || []));
        const productInfo = liveProds.find(p => p && String(p.id) === targetId) || { id: targetId, name: 'منتج غير موجود حالياً بالمخزن', quantity: 0, costPrice: 0, category: '', supplierId: '' };
        const supplierObj = liveSups.find(s => s && s.id === productInfo.supplierId);
        const targetNameNorm = norm(productInfo.name);

        const matchesPeriod = (val) => allPeriods ? true : toCairoDate(val).startsWith(yearMonth);

        // جلب الفواتير السحابية + أيام الشهر (إن كان هناك بيع سريع لم يُرفع في invoices) بالتوازي
        const [cloudInvoices, daysList] = await Promise.all([
            (async () => {
                try {
                    if (allPeriods) {
                        const snap = await userRef.collection('invoices').get();
                        return snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
                    }
                    const [y, m] = yearMonth.split('-');
                    const lastDay = new Date(Number(y), Number(m), 0).getDate();
                    const startDate = `${yearMonth}-01`;
                    const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
                    const snap = await userRef.collection('invoices')
                        .where('saleDate', '>=', startDate)
                        .where('saleDate', '<=', endDate)
                        .get();
                    return snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
                } catch {
                    const snap = await userRef.collection('invoices').get();
                    return snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
                }
            })(),
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
                    return [];
                }
            })()
        ]);

        // دمج وإزالة التكرار لجميع الفواتير والمبيعات المؤكدة (مع تفضيل النسخة التي تحمل أحدث returnedQuantity)
        const salesById = new Map();
        const ingestSale = (sale, fallbackDate) => {
            if (!sale) return;
            const saleDate = toCairoDate(sale.saleDate) || toCairoDate(sale.createdAt) || toCairoDate(sale.timestamp) || fallbackDate || '';
            if (!matchesPeriod(saleDate)) return;
            const id = String(sale.id || `${saleDate}_${sale.invoiceNumber || ''}_${num(sale.grandTotal || sale.totalSellPrice)}`);
            const prev = salesById.get(id);
            if (!prev) {
                salesById.set(id, { ...sale, id, _resolvedDate: saleDate });
                return;
            }
            // دمج returnedQuantity القصوى لكل بند عند وجود نسخة في days وأخرى محدثة في invoices
            const prevItems = Array.isArray(prev.items) ? prev.items : [];
            const newItems = Array.isArray(sale.items) ? sale.items : [];
            const mergedItems = newItems.length ? newItems.map((it, idx) => ({
                ...it,
                returnedQuantity: Math.max(num(it.returnedQuantity), num(prevItems[idx]?.returnedQuantity))
            })) : prevItems;
            salesById.set(id, {
                ...prev,
                ...sale,
                id,
                items: mergedItems,
                _deductionReversed: Math.max(num(prev._deductionReversed), num(sale._deductionReversed)),
                _resolvedDate: saleDate || prev._resolvedDate
            });
        };

        daysList.forEach(d => (d.salesToday || []).forEach(s => ingestSale(s, d._docDate)));
        cloudInvoices.forEach(s => ingestSale(s, ''));
        (global.salesToday || []).forEach(s => ingestSale(s, activeDate));

        // إزالة أي تكرار بنفس رقم الفاتورة (للفواتير القديمة التي قد تكون بـ IDs مختلفة)
        const uniqueSales = [];
        const seenInvNums = new Set();
        for (const sale of salesById.values()) {
            const invNum = String(sale.invoiceNumber || '').trim();
            if (invNum) {
                if (seenInvNums.has(invNum)) continue;
                seenInvNums.add(invNum);
            }
            uniqueSales.push(sale);
        }
        uniqueSales.sort((a, b) => (a._resolvedDate || '').localeCompare(b._resolvedDate || '') || String(a.timestamp || a.createdAt || '').localeCompare(String(b.timestamp || b.createdAt || '')));

        const directSaleRows = [];
        const accessoryUsageRows = [];
        let legacyUnlinkedSameNameCount = 0;

        uniqueSales.forEach(sale => {
            const items = Array.isArray(sale.items) ? sale.items : [];
            const deductedItems = Array.isArray(sale.deductedItems) ? sale.deductedItems : [];
            const isQuick = sale.type === 'quick' || (items.length > 0 && items[0].unitPrice === undefined && items[0].price === undefined && items[0].subtotal === undefined);

            // التحقق من وجود سجلات قديمة بدون id تحمل نفس الاسم (للتنبيه فقط بدون خلطها أبداً)
            const hasLegacyNoIdSameName = targetNameNorm && items.some(it => it && !it.id && norm(it.name) === targetNameNorm);
            if (hasLegacyNoIdSameName) legacyUnlinkedSameNameCount++;

            if (isQuick && items.length > 0) {
                const mainItem = items[0];
                const extraItems = items.slice(1);
                const mainId = mainItem && mainItem.id ? String(mainItem.id).trim() : '';

                if (mainId === targetId) {
                    const soldQty = num(mainItem.quantity) || 1;
                    const returnedQty = Math.min(soldQty, num(mainItem.returnedQuantity));
                    const netQty = Math.max(0, soldQty - returnedQty);
                    const totalSell = num(sale.totalSellPrice || sale.grandTotal);
                    const unitSellPrice = soldQty > 0 ? money(totalSell / soldQty) : 0;
                    const unitCost = num(mainItem.costPrice ?? mainItem.cost);
                    const ratio = soldQty > 0 ? (netQty / soldQty) : 0;

                    const netRevenue = money(unitSellPrice * netQty);
                    const netItemCost = money(unitCost * netQty);
                    const directProfit = money(netRevenue - netItemCost);

                    const extrasCostFull = money(extraItems.reduce((s, ex) => s + (num(ex.costPrice ?? ex.cost) * (num(ex.quantity) || 1)), 0));
                    const netDedFull = Math.max(0, money(num(sale.deductionAmount) - num(sale._deductionReversed)));
                    const extrasAndDedShare = money((extrasCostFull + netDedFull) * ratio);
                    const netActualProfit = money(directProfit - extrasAndDedShare);

                    directSaleRows.push({
                        date: sale._resolvedDate,
                        timestamp: sale.createdAt || sale.timestamp || sale._resolvedDate,
                        invoiceNumber: sale.invoiceNumber || sale.id,
                        customerName: sale.customerName || 'نقدي',
                        saleType: 'بيع سريع',
                        soldQty,
                        returnedQty,
                        netQty,
                        unitSellPrice,
                        unitCost,
                        netRevenue,
                        netItemCost,
                        directProfit,
                        extrasAndDedShare,
                        shippingShare: 0,
                        netActualProfit,
                        isMultiItem: false,
                        serial: mainItem.serial || ''
                    });
                }

                // هل استُخدم المنتج كمُلحق مخصوم داخل هذه البيعة السريعة؟
                extraItems.forEach(ex => {
                    if (ex && ex.id && String(ex.id).trim() === targetId) {
                        const qty = num(ex.quantity) || 1;
                        const cost = num(ex.costPrice ?? ex.cost);
                        accessoryUsageRows.push({
                            date: sale._resolvedDate,
                            invoiceNumber: sale.invoiceNumber || sale.id,
                            customerName: sale.customerName || 'نقدي',
                            qty,
                            unitCost: cost,
                            totalCost: money(qty * cost)
                        });
                    }
                });
            } else {
                // فاتورة تفصيلية (أو بيعة مؤقتة مؤكدة)
                // تصفية البنود المدفوعة (غير الملحقات المجانية unitPrice === 0)
                const matchedSoldItems = items.filter(it => it && it.id && String(it.id).trim() === targetId && (num(it.unitPrice ?? it.price) > 0 || num(it.subtotal) > 0 || items.length === 1));
                const matchedZeroPriceAttachments = items.filter(it => it && it.id && String(it.id).trim() === targetId && num(it.unitPrice ?? it.price) === 0 && num(it.subtotal) === 0 && items.length > 1);

                const totalInvoiceGoods = money(items.reduce((s, it) => {
                    const q = num(it.quantity) || 0;
                    const up = num(it.unitPrice ?? it.price);
                    return s + (num(it.subtotal) || (q * up));
                }, 0));

                const allItemsAreTarget = items.length > 0 && items.every(it => !it || (it.id && String(it.id).trim() === targetId) || (num(it.unitPrice ?? it.price) === 0 && num(it.subtotal) === 0));
                const deductedCostFull = money(
                    deductedItems.reduce((s, d) => s + (num(d.costPrice ?? d.cost) * (num(d.quantity) || 1)), 0) +
                    items.filter(it => num(it.unitPrice ?? it.price) === 0 && num(it.subtotal) === 0 && items.length > 1)
                        .reduce((s, d) => s + (num(d.costPrice ?? d.cost) * (num(d.quantity) || 1)), 0)
                );
                const shippingFull = num(sale.shippingCost);
                const netDedFull = Math.max(0, money(num(sale.deductionAmount) - num(sale._deductionReversed)));

                matchedSoldItems.forEach(it => {
                    const soldQty = num(it.quantity) || 1;
                    const returnedQty = Math.min(soldQty, num(it.returnedQuantity));
                    const netQty = Math.max(0, soldQty - returnedQty);
                    const unitSellPrice = num(it.unitPrice ?? it.price) || (soldQty > 0 ? money(num(it.subtotal) / soldQty) : 0);
                    const unitCost = num(it.costPrice ?? it.cost);
                    const ratio = soldQty > 0 ? (netQty / soldQty) : 0;

                    const itemGrossTotal = money(unitSellPrice * soldQty);
                    const shareWeight = allItemsAreTarget
                        ? (matchedSoldItems.length > 1 && totalInvoiceGoods > 0 ? (itemGrossTotal / totalInvoiceGoods) : 1)
                        : (totalInvoiceGoods > 0 ? (itemGrossTotal / totalInvoiceGoods) : (1 / Math.max(1, items.length)));

                    const netRevenue = money(unitSellPrice * netQty);
                    const netItemCost = money(unitCost * netQty);
                    const directProfit = money(netRevenue - netItemCost);

                    const shippingShare = money(shippingFull * shareWeight * ratio);
                    const extrasAndDedShare = money((deductedCostFull + netDedFull) * shareWeight * ratio);
                    const netActualProfit = money(directProfit + shippingShare - extrasAndDedShare);

                    directSaleRows.push({
                        date: sale._resolvedDate,
                        timestamp: sale.createdAt || sale.timestamp || sale._resolvedDate,
                        invoiceNumber: sale.invoiceNumber || sale.id,
                        customerName: sale.customerName || 'نقدي',
                        saleType: sale.type === 'exchange' ? 'استبدال' : 'فاتورة مبيعات',
                        soldQty,
                        returnedQty,
                        netQty,
                        unitSellPrice,
                        unitCost,
                        netRevenue,
                        netItemCost,
                        directProfit,
                        extrasAndDedShare,
                        shippingShare,
                        netActualProfit,
                        isMultiItem: !allItemsAreTarget,
                        serial: it.serial || ''
                    });
                });

                // استهلاك المنتج كمُلحق مخصوم في deductedItems أو بند مجاني
                [...deductedItems, ...matchedZeroPriceAttachments].forEach(d => {
                    if (d && d.id && String(d.id).trim() === targetId) {
                        const qty = num(d.quantity) || 1;
                        const cost = num(d.costPrice ?? d.cost);
                        accessoryUsageRows.push({
                            date: sale._resolvedDate,
                            invoiceNumber: sale.invoiceNumber || sale.id,
                            customerName: sale.customerName || 'نقدي',
                            qty,
                            unitCost: cost,
                            totalCost: money(qty * cost)
                        });
                    }
                });
            }
        });

        // فحص المبيعات المعلّقة الحالية لهذا المعرّف فقط (للعرض المنفصل كربح متوقع)
        const pendingRows = [];
        (global.pendingSales || []).forEach(ps => {
            if (!ps) return;
            const psDate = toCairoDate(ps.saleDate || ps.createdAt || ps.timestamp);
            if (!matchesPeriod(psDate)) return;

            if (Array.isArray(ps.items) && ps.items.length > 0) {
                ps.items.forEach(it => {
                    if (it && it.id && String(it.id).trim() === targetId) {
                        const q = num(it.quantity) || 1;
                        const up = num(it.unitPrice ?? it.price);
                        const uc = num(it.costPrice ?? it.cost);
                        pendingRows.push({
                            date: psDate,
                            customerName: ps.customerName || 'عميل',
                            qty: q,
                            expectedRevenue: money(q * up),
                            expectedProfit: money(q * (up - uc))
                        });
                    }
                });
            } else if (ps.mainProduct && ps.mainProduct.id && String(ps.mainProduct.id).trim() === targetId) {
                const q = num(ps.mainProduct.quantity) || 1;
                const rev = num(ps.totalSellPrice || ps.grandTotal);
                const prof = num(ps.potentialProfit);
                pendingRows.push({
                    date: psDate,
                    customerName: ps.customerName || 'عميل',
                    qty: q,
                    expectedRevenue: money(rev),
                    expectedProfit: money(prof)
                });
            }
        });

        // التجميع النهائي
        const totalSoldQty = directSaleRows.reduce((s, r) => s + r.soldQty, 0);
        const totalReturnedQty = directSaleRows.reduce((s, r) => s + r.returnedQty, 0);
        const totalNetQty = directSaleRows.reduce((s, r) => s + r.netQty, 0);
        const totalNetRevenue = money(directSaleRows.reduce((s, r) => s + r.netRevenue, 0));
        const totalNetItemCost = money(directSaleRows.reduce((s, r) => s + r.netItemCost, 0));
        const totalDirectProfit = money(directSaleRows.reduce((s, r) => s + r.directProfit, 0));
        const totalShippingShare = money(directSaleRows.reduce((s, r) => s + r.shippingShare, 0));
        const totalExtrasAndDedShare = money(directSaleRows.reduce((s, r) => s + r.extrasAndDedShare, 0));
        const totalNetActualProfit = money(directSaleRows.reduce((s, r) => s + r.netActualProfit, 0));
        const avgProfitPerUnit = totalNetQty > 0 ? money(totalNetActualProfit / totalNetQty) : 0;
        const avgSellPrice = totalNetQty > 0 ? money(totalNetRevenue / totalNetQty) : 0;
        const profitMarginPct = totalNetRevenue > 0 ? ((totalNetActualProfit / totalNetRevenue) * 100) : 0;

        const totalAccessoryQty = accessoryUsageRows.reduce((s, r) => s + r.qty, 0);
        const totalAccessoryCost = money(accessoryUsageRows.reduce((s, r) => s + r.totalCost, 0));
        const totalPendingQty = pendingRows.reduce((s, r) => s + r.qty, 0);
        const totalPendingProfit = money(pendingRows.reduce((s, r) => s + r.expectedProfit, 0));

        return {
            product: {
                id: productInfo.id,
                name: productInfo.name || 'غير مسمى',
                category: productInfo.category || '-',
                supplierName: supplierObj ? supplierObj.name : (productInfo.supplierName || '-'),
                currentStock: num(productInfo.quantity),
                currentCostPrice: num(productInfo.costPrice)
            },
            periodLabel: allPeriods ? 'كل الفترات (شامل)' : `شهر ${yearMonth}`,
            yearMonth,
            allPeriods,
            summary: {
                salesCount: directSaleRows.length,
                totalSoldQty,
                totalReturnedQty,
                totalNetQty,
                totalNetRevenue,
                totalNetItemCost,
                totalDirectProfit,
                totalShippingShare,
                totalExtrasAndDedShare,
                totalNetActualProfit,
                avgProfitPerUnit,
                avgSellPrice,
                profitMarginPct,
                totalAccessoryQty,
                totalAccessoryCost,
                totalPendingQty,
                totalPendingProfit,
                legacyUnlinkedSameNameCount
            },
            directSaleRows,
            accessoryUsageRows,
            pendingRows
        };
    }

    function renderProductProfitReport(report) {
        const container = document.getElementById('pp-report-container');
        if (!container) return;
        const p = report.product;
        const s = report.summary;

        const legacyNotice = s.legacyUnlinkedSameNameCount > 0
            ? `<div class="mb-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <i class="fas fa-shield-alt ml-1"></i>
                    <strong>تنبيه عزل المعرّف:</strong> توجد <strong>${s.legacyUnlinkedSameNameCount}</strong> عمليات قديمة لا تحمل كود منتج (<code>id</code> فارغ) بنفس الاسم، وتم <strong>استبعادها تماماً</strong> لضمان عدم التداخل مع أي منتج آخر.
               </div>`
            : '';

        const pendingSection = report.pendingRows.length > 0
            ? `<div class="mb-4 p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900">
                    <div class="font-bold mb-1"><i class="fas fa-clock ml-1"></i> مبيعات معلّقة حالياً لهذا الكود (غير داخلة في الربح المحقق بعد):</div>
                    <div>عدد القطع المعلقة: <strong>${s.totalPendingQty}</strong> | الربح المتوقع عند التأكيد: <strong class="font-mono">${fmt(s.totalPendingProfit)}</strong></div>
               </div>`
            : '';

        const accessorySection = report.accessoryUsageRows.length > 0
            ? `<div class="mb-4 p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900">
                    <div class="font-bold mb-1"><i class="fas fa-gift ml-1"></i> استهلاك هذا الكود كمُلحق / هدية مخصومة مع بيعات أخرى:</div>
                    <div>إجمالي القطع المستهلكة كملحق: <strong>${s.totalAccessoryQty}</strong> قطعة | إجمالي تكلفتها: <strong class="font-mono">${fmt(s.totalAccessoryCost)}</strong></div>
               </div>`
            : '';

        const rowsHtml = report.directSaleRows.map((r, idx) => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="p-2 text-center font-mono text-gray-500">${idx + 1}</td>
                <td class="p-2 text-right font-mono text-xs">${esc(r.date)}</td>
                <td class="p-2 text-right font-mono text-xs">
                    ${esc(r.invoiceNumber)}
                    ${r.isMultiItem ? '<span class="block text-[10px] text-indigo-600">فاتورة متعددة الأصناف</span>' : ''}
                    ${r.serial ? `<span class="block text-[10px] text-gray-500">S/N: ${esc(r.serial)}</span>` : ''}
                </td>
                <td class="p-2 text-right text-xs font-medium">${esc(r.customerName)}</td>
                <td class="p-2 text-center font-mono">
                    <span class="font-bold">${r.netQty}</span>
                    ${r.returnedQty > 0 ? `<span class="block text-[10px] text-red-600">(مباع ${r.soldQty} / مرتجع ${r.returnedQty})</span>` : ''}
                </td>
                <td class="p-2 text-center font-mono text-xs">${fmt(r.unitSellPrice)}</td>
                <td class="p-2 text-center font-mono text-xs text-gray-600">${fmt(r.unitCost)}</td>
                <td class="p-2 text-center font-mono text-xs font-bold text-blue-700">${fmt(r.netRevenue)}</td>
                <td class="p-2 text-center font-mono text-xs font-bold ${r.directProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}">${fmt(r.directProfit)}</td>
                <td class="p-2 text-center font-mono text-xs text-amber-700">${r.extrasAndDedShare > 0.005 ? '-' + fmt(r.extrasAndDedShare) : (r.shippingShare > 0.005 ? '+' + fmt(r.shippingShare) : '0.00')}</td>
                <td class="p-2 text-center font-mono text-xs font-extrabold ${r.netActualProfit >= 0 ? 'text-emerald-800 bg-emerald-50/50' : 'text-red-700 bg-red-50/50'}">${fmt(r.netActualProfit)}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div id="pp-print-area">
                <div class="mb-4 pb-3 border-b bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <div class="text-lg font-extrabold text-gray-900">${esc(p.name)}</div>
                        <div class="text-xs text-gray-600 mt-1 flex flex-wrap gap-3">
                            <span>المعرّف الفريد: <code class="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">${esc(p.id)}</code></span>
                            <span>القسم: <strong>${esc(p.category)}</strong></span>
                            <span>المورد: <strong>${esc(p.supplierName)}</strong></span>
                            <span>المخزون الحالي: <strong>${p.currentStock}</strong></span>
                            <span>متوسط التكلفة الحالي: <strong class="font-mono">${fmt(p.currentCostPrice)}</strong></span>
                        </div>
                    </div>
                    <div class="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                        الفترة: ${esc(report.periodLabel)}
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
                    <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div class="text-[11px] text-gray-500">صافي القطع المباعة</div>
                        <div class="text-lg font-extrabold text-gray-800 font-mono">${s.totalNetQty}</div>
                        <div class="text-[10px] text-gray-500">مباع: ${s.totalSoldQty} | مرتجع: ${s.totalReturnedQty}</div>
                    </div>
                    <div class="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div class="text-[11px] text-blue-700">إجمالي المبيعات (صافي)</div>
                        <div class="text-base font-extrabold text-blue-800 font-mono">${fmt(s.totalNetRevenue)}</div>
                        <div class="text-[10px] text-blue-600">متوسط البيع: ${fmt(s.avgSellPrice)}</div>
                    </div>
                    <div class="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div class="text-[11px] text-purple-700">تكلفة البضاعة المباعة</div>
                        <div class="text-base font-extrabold text-purple-800 font-mono">${fmt(s.totalNetItemCost)}</div>
                        <div class="text-[10px] text-purple-600">في ${s.salesCount} عملية بيع</div>
                    </div>
                    <div class="p-3 rounded-lg bg-teal-50 border border-teal-200">
                        <div class="text-[11px] text-teal-700">ربح الصنف المباشر</div>
                        <div class="text-base font-extrabold text-teal-800 font-mono">${fmt(s.totalDirectProfit)}</div>
                        <div class="text-[10px] text-teal-600">قبل الملحقات والاستقطاع</div>
                    </div>
                    <div class="p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div class="text-[11px] text-amber-700">حصة الملحقات/الاستقطاع</div>
                        <div class="text-base font-extrabold text-amber-800 font-mono">-${fmt(s.totalExtrasAndDedShare)}</div>
                        ${s.totalShippingShare > 0.005 ? `<div class="text-[10px] text-emerald-700">شحن: +${fmt(s.totalShippingShare)}</div>` : '<div class="text-[10px] text-amber-600">موزعة بدقة على الصنف</div>'}
                    </div>
                    <div class="p-3 rounded-lg ${s.totalNetActualProfit >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'} border-2">
                        <div class="text-[11px] font-bold ${s.totalNetActualProfit >= 0 ? 'text-emerald-800' : 'text-red-800'}">صافي الربح الفعلي</div>
                        <div class="text-lg font-black ${s.totalNetActualProfit >= 0 ? 'text-emerald-700' : 'text-red-700'} font-mono">${fmt(s.totalNetActualProfit)}</div>
                        <div class="text-[10px] ${s.totalNetActualProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}">هامش: ${s.profitMarginPct.toFixed(1)}% | للقطعة: ${fmt(s.avgProfitPerUnit)}</div>
                    </div>
                </div>

                ${legacyNotice}
                ${pendingSection}
                ${accessorySection}

                <div>
                    <h4 class="text-sm font-bold text-gray-800 mb-2 border-b pb-1">📋 تفصيل جميع عمليات البيع المؤكدة لهذا الكود فقط (${report.directSaleRows.length})</h4>
                    <div class="overflow-x-auto border rounded-lg">
                        <table class="w-full text-xs border-collapse min-w-[720px]">
                            <thead>
                                <tr class="bg-gray-100 text-gray-700">
                                    <th class="p-2 text-center">#</th>
                                    <th class="p-2 text-right">التاريخ</th>
                                    <th class="p-2 text-right">الفاتورة</th>
                                    <th class="p-2 text-right">العميل</th>
                                    <th class="p-2 text-center">صافي الكمية</th>
                                    <th class="p-2 text-center">سعر البيع</th>
                                    <th class="p-2 text-center">التكلفة</th>
                                    <th class="p-2 text-center">إجمالي البيع</th>
                                    <th class="p-2 text-center">ربح مباشر</th>
                                    <th class="p-2 text-center">ملحقات/استقطاع</th>
                                    <th class="p-2 text-center bg-emerald-50 text-emerald-900">صافي الربح</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml || '<tr><td colspan="11" class="p-5 text-center text-gray-400">لا توجد مبيعات مؤكدة مسجلة لهذا المعرّف في الفترة المحددة.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadProductProfitReport() {
        if (_isLoadingProfit) return;
        const targetId = document.getElementById('pp-product-select')?.value || '';
        const yearMonth = document.getElementById('pp-month-input')?.value || getActiveMonthString();
        const allPeriods = Boolean(document.getElementById('pp-all-periods-cb')?.checked);
        const msgEl = document.getElementById('pp-status-message');
        const container = document.getElementById('pp-report-container');

        if (!targetId) {
            if (msgEl && typeof global.showMessage === 'function') global.showMessage(msgEl, 'يرجى اختيار المنتج أولاً.', true);
            return;
        }

        _isLoadingProfit = true;
        if (msgEl && typeof global.showMessage === 'function') global.showMessage(msgEl, 'جاري فحص المبيعات والمرتجعات المطابقة للمعرّف الفريد من السحابة...', false, true);
        if (container) container.innerHTML = '<div class="text-center py-8 text-emerald-700 font-bold"><i class="fas fa-spinner fa-spin ml-2"></i> جاري حساب أرباح المنتج بدقة حسب المعرّف (ID)...</div>';

        try {
            const report = await fetchStrictProductProfit(targetId, yearMonth, allPeriods);
            _lastProfitReport = report;
            renderProductProfitReport(report);
            if (msgEl && typeof global.showMessage === 'function') {
                global.showMessage(msgEl, `تم حساب أرباح "${report.product.name}" (كود: ${report.product.id}) بنجاح.`, false);
            }
        } catch (err) {
            console.error('[ProductProfit] Error:', err);
            if (container) container.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-center">${esc(err.message || 'تعذر تحميل البيانات.')}</div>`;
            if (msgEl && typeof global.showMessage === 'function') global.showMessage(msgEl, err.message || 'حدث خطأ أثناء الحساب.', true);
        } finally {
            _isLoadingProfit = false;
        }
    }

    function printProductProfitReport() {
        if (!_lastProfitReport) {
            alert('يرجى حساب أرباح منتج أولاً قبل الطباعة.');
            return;
        }
        const printArea = document.getElementById('pp-print-area');
        if (!printArea) return;

        const oldPortal = document.getElementById('pp-print-portal');
        if (oldPortal) oldPortal.remove();
        const oldStyle = document.getElementById('pp-temp-print-style');
        if (oldStyle) oldStyle.remove();

        const portal = document.createElement('div');
        portal.id = 'pp-print-portal';
        portal.setAttribute('dir', 'rtl');
        portal.innerHTML = printArea.innerHTML;
        document.body.appendChild(portal);

        const styleEl = document.createElement('style');
        styleEl.id = 'pp-temp-print-style';
        styleEl.textContent = `
            #pp-print-portal { display: none; }
            @media print {
                body > *:not(#pp-print-portal) { display: none !important; }
                #pp-print-portal {
                    display: block !important;
                    visibility: visible !important;
                    width: 100% !important;
                    padding: 12px !important;
                    background: #ffffff !important;
                    color: #0f172a !important;
                }
                #pp-print-portal * { visibility: visible !important; }
            }
        `;
        document.head.appendChild(styleEl);

        const cleanup = () => {
            const p = document.getElementById('pp-print-portal');
            if (p) p.remove();
            const s = document.getElementById('pp-temp-print-style');
            if (s) s.remove();
        };
        window.addEventListener('afterprint', cleanup, { once: true });
        window.print();
        setTimeout(cleanup, 60000);
    }

    function exportProductProfitCSV() {
        if (!_lastProfitReport) {
            alert('يرجى حساب أرباح منتج أولاً قبل التصدير.');
            return;
        }
        const r = _lastProfitReport;
        const qCsv = (v) => {
            let s = String(v == null ? '' : v);
            if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
            return `"${s.replace(/"/g, '""')}"`;
        };

        const rows = [
            ['التاريخ', 'رقم الفاتورة', 'العميل', 'النوع', 'الكمية المباعة', 'المرتجع', 'صافي الكمية', 'سعر البيع', 'التكلفة', 'إجمالي البيع', 'ربح مباشر', 'ملحقات/استقطاع', 'شحن', 'صافي الربح الفعلي']
        ];
        r.directSaleRows.forEach(row => {
            rows.push([row.date, row.invoiceNumber, row.customerName, row.saleType, row.soldQty, row.returnedQty, row.netQty, row.unitSellPrice, row.unitCost, row.netRevenue, row.directProfit, row.extrasAndDedShare, row.shippingShare, row.netActualProfit]);
        });
        rows.push([
            'الإجمالي', r.product.id, r.product.name, r.periodLabel,
            r.summary.totalSoldQty, r.summary.totalReturnedQty, r.summary.totalNetQty,
            r.summary.avgSellPrice, r.product.currentCostPrice, r.summary.totalNetRevenue,
            r.summary.totalDirectProfit, r.summary.totalExtrasAndDedShare, r.summary.totalShippingShare, r.summary.totalNetActualProfit
        ]);

        const csv = '\uFEFF' + rows.map(row => row.map(qCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const periodSlug = r.allPeriods ? 'all' : r.yearMonth;
        a.download = `ارباح_${r.product.name}_${r.product.id}_${periodSlug}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    global.openProductProfitModal = openProductProfitModal;
    global.closeProductProfitModal = closeProductProfitModal;
    global.loadProductProfitReport = loadProductProfitReport;
    global.printProductProfitReport = printProductProfitReport;
    global.exportProductProfitCSV = exportProductProfitCSV;
})(typeof window !== 'undefined' ? window : global);
