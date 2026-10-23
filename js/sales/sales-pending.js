// finance-core-sales.js - Sales, Invoices, and Cart Logic
window.currentPendingSaleFilter = window.currentPendingSaleFilter || 'all';
window.currentPendingViewMode = window.currentPendingViewMode || 'list';

window.setPendingViewMode = function(mode) {
    window.currentPendingViewMode = mode === 'list' ? 'list' : 'grid';
    const gridBtn = document.getElementById('pending-view-grid-btn');
    const listBtn = document.getElementById('pending-view-list-btn');
    if (gridBtn && listBtn) {
        if (window.currentPendingViewMode === 'grid') {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        }
    }
    const container = document.getElementById('pending-sales-list');
    if (container) {
        if (window.currentPendingViewMode === 'list') {
            container.classList.remove('pending-sales-grid');
            container.classList.add('pending-sales-list-view');
        } else {
            container.classList.remove('pending-sales-list-view');
            container.classList.add('pending-sales-grid');
        }
    }
};

window.setPendingSalesFilter = function(filterName) {
    window.currentPendingSaleFilter = filterName || 'all';
    const pills = document.querySelectorAll('.pending-filter-pill');
    pills.forEach(pill => {
        if (pill.dataset.filter === window.currentPendingSaleFilter) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    updatePendingSalesDisplay();
};

window.clearPendingSalesSearch = function() {
    const input = document.getElementById('pending-sales-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    updatePendingSalesDisplay();
};

function updatePendingSalesDisplay() {
    const container = pendingSalesListContainer || document.getElementById('pending-sales-list');
    const searchInput = pendingSalesSearchInput || document.getElementById('pending-sales-search-input');
    if (!container || !searchInput) return;

    const list = Array.isArray(pendingSales) ? pendingSales : [];

    let totalPendingCost = 0;
    let totalPendingProfit = 0;
    let totalPendingValue = 0;
    let totalPendingDeposits = 0;
    let totalPendingDeductions = 0;
    const totalPendingCount = list.length;

    list.forEach(sale => {
        let saleCost = 0;
        if (typeof calculateSinglePendingSaleCost === 'function') {
            saleCost = calculateSinglePendingSaleCost(sale);
        } else if (typeof window.calculateSinglePendingSaleCost === 'function') {
            saleCost = window.calculateSinglePendingSaleCost(sale);
        } else if (sale.mainProduct) {
            const qty = sale.mainProduct.quantity !== undefined ? (Number(sale.mainProduct.quantity) || 0) : 1;
            const mainCost = (Number(sale.mainProduct.costPrice) || 0) * qty;
            const addCost = (sale.additionalItems || []).reduce((sum, i) => sum + ((Number(i.costPrice) || 0) * (Number(i.quantity) || 0)), 0);
            saleCost = mainCost + addCost;
        } else if (sale.totalCost !== undefined) {
            saleCost = Number(sale.totalCost) || 0;
        }
        totalPendingCost += saleCost;
        totalPendingProfit += (Number(sale.potentialProfit) || 0);
        totalPendingValue += Number(sale.totalSellPrice || sale.grandTotal || 0);
        totalPendingDeposits += (Number(sale.depositPaid) || 0);
        totalPendingDeductions += (Number(sale.deductionAmount) || 0);
    });

    const statCountEl = document.getElementById('pending-sales-stat-count');
    const statValEl = document.getElementById('pending-sales-stat-value');
    const statDepEl = document.getElementById('pending-sales-stat-deposits');
    const statDedEl = document.getElementById('pending-sales-stat-deductions');
    const costSpan = pendingSalesTotalCostSpan || document.getElementById('pending-sales-total-cost');
    const profitSpan = pendingSalesTotalProfitSpan || document.getElementById('pending-sales-total-profit');

    if (statCountEl) statCountEl.textContent = totalPendingCount;
    if (statValEl) statValEl.textContent = formatCurrency(totalPendingValue);
    if (statDepEl) statDepEl.textContent = formatCurrency(totalPendingDeposits);
    if (statDedEl) statDedEl.textContent = formatCurrency(totalPendingDeductions);
    if (costSpan) costSpan.textContent = formatCurrency(totalPendingCost);
    if (profitSpan) profitSpan.textContent = formatCurrency(totalPendingProfit);
    if (typeof window.updateSalesPendingBadge === 'function') window.updateSalesPendingBadge();

    const rawSearch = searchInput.value || '';
    const clearBtn = document.getElementById('pending-sales-clear-search');
    if (clearBtn) {
        if (rawSearch.trim()) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    const normalizePendingSearchText = (str) => {
        if (!str) return '';
        if (typeof window.normalizeArabicText === 'function') return window.normalizeArabicText(str).toLowerCase().trim();
        return String(str).toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    };

    const searchTerm = normalizePendingSearchText(rawSearch);
    const activeFilter = window.currentPendingSaleFilter || 'all';

    const filteredSales = list.filter(sale => {
        if (activeFilter === 'deposit') {
            if ((Number(sale.depositPaid) || 0) <= 0) return false;
        } else if (activeFilter === 'no-deposit') {
            if ((Number(sale.depositPaid) || 0) > 0) return false;
        } else if (activeFilter === 'deduction') {
            if ((Number(sale.deductionAmount) || 0) <= 0) return false;
        } else if (activeFilter === 'invoices') {
            if (!sale.items && (!sale.invoiceData || !sale.invoiceData.items)) return false;
        } else if (activeFilter === 'quick') {
            if (!sale.mainProduct) return false;
        }

        if (!searchTerm) return true;

        const cust = normalizePendingSearchText(sale.customerName || '');
        if (cust.includes(searchTerm)) return true;

        const phone = String(sale.customerPhone || sale.phone || (sale.invoiceData && (sale.invoiceData.customerPhone || sale.invoiceData.phone)) || '');
        if (phone.includes(searchTerm)) return true;

        if (sale.items && Array.isArray(sale.items)) {
            if (sale.items.some(item => normalizePendingSearchText(item.name).includes(searchTerm) || (item.serial && normalizePendingSearchText(item.serial).includes(searchTerm)))) return true;
        }
        if (sale.mainProduct) {
            if (normalizePendingSearchText(sale.mainProduct.name).includes(searchTerm) || (sale.mainProduct.serial && normalizePendingSearchText(sale.mainProduct.serial).includes(searchTerm))) return true;
        }
        if (sale.additionalItems && Array.isArray(sale.additionalItems)) {
            if (sale.additionalItems.some(i => normalizePendingSearchText(i.name).includes(searchTerm))) return true;
        }
        if (sale.deductedItems && Array.isArray(sale.deductedItems)) {
            if (sale.deductedItems.some(i => normalizePendingSearchText(i.name).includes(searchTerm))) return true;
        }
        if (sale.deductionLiabilityName && normalizePendingSearchText(sale.deductionLiabilityName).includes(searchTerm)) return true;
        if (sale.id && normalizePendingSearchText(sale.id).includes(searchTerm)) return true;

        return false;
    });

    if (filteredSales.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <i class="fas fa-search-minus text-slate-300 text-3xl mb-2"></i>
                <p class="text-slate-500 font-semibold text-sm">لا توجد مبيعات مؤقتة تطابق خيارات البحث والفلترة.</p>
                <button type="button" onclick="window.clearPendingSalesSearch(); window.setPendingSalesFilter('all');" class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold">
                    إعادة ضبط الفلاتر
                </button>
            </div>`;
        return;
    }

    container.innerHTML = filteredSales.map(sale => {
        let itemsText = '', attachmentsHTML = '';

        const attachments = [];
        if (Array.isArray(sale.additionalItems)) attachments.push(...sale.additionalItems);
        const ded = (sale.invoiceData && Array.isArray(sale.invoiceData.deductedItems)) ? sale.invoiceData.deductedItems : (Array.isArray(sale.deductedItems) ? sale.deductedItems : []);
        ded.forEach(d => { if (!attachments.some(a => (a.id && a.id === d.id) || a.name === d.name)) attachments.push(d); });

        if (attachments && attachments.length > 0) {
            attachmentsHTML = `<div class="flex items-center flex-wrap gap-1 pt-0.5"><span class="text-[11px] font-bold text-slate-400 flex items-center gap-1"><i class="ri-add-line"></i> ملحقات:</span> ${attachments.map(item => `<span class="inline-flex items-center text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/70"><b class="text-indigo-600 font-mono ml-1">${item.quantity || 1}x</b> ${escapeHTML(item.name)}</span>`).join(' ')}</div>`;
        }

        if (sale.items && Array.isArray(sale.items)) {
            itemsText = sale.items.map(item => `${item.quantity || 1}x "${escapeHTML(item.name)}"${item.serial ? ` (S/N: ${escapeHTML(item.serial)})` : ''}`).join('، ');
            if (itemsText.length > 50) itemsText = itemsText.substring(0, 50) + "...";
            itemsText = `<span class="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200/80 ml-1"><i class="ri-file-text-line"></i> فاتورة</span> ${itemsText}`;
        } else if (sale.mainProduct) {
            itemsText = `<span class="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-md border border-sky-200/80 ml-1"><i class="ri-flashlight-line"></i> سريع</span> ${sale.mainProduct.quantity !== undefined ? sale.mainProduct.quantity : 1}x "${escapeHTML(sale.mainProduct.name)}"${sale.mainProduct.serial ? ` (S/N: ${escapeHTML(sale.mainProduct.serial)})` : ''}`;
        }

        let phoneStr = sale.customerPhone || sale.phone || (sale.invoiceData && (sale.invoiceData.customerPhone || sale.invoiceData.phone)) || '';
        if (Array.isArray(phoneStr)) phoneStr = phoneStr[0] || '';

        let customerInfo = sale.customerName ? `<div class="text-xs sm:text-sm text-slate-700 font-semibold flex items-center gap-1.5"><span class="text-slate-400 font-normal">العميل:</span> <span class="text-blue-700 font-bold">${escapeHTML(sale.customerName)}</span>${phoneStr ? ` <a href="tel:${escapeHTML(phoneStr)}" class="text-xs text-slate-400 font-mono font-normal hover:text-indigo-600">(${escapeHTML(phoneStr)})</a>` : ''}</div>` : '';

        const totalSell = Number(sale.totalSellPrice || sale.grandTotal || 0);
        const totalPaid = Number(sale.depositPaid) || 0;
        const remaining = Math.max(0, totalSell - totalPaid);
        let saleCost = 0;
        if (typeof calculateSinglePendingSaleCost === 'function') saleCost = calculateSinglePendingSaleCost(sale);
        else saleCost = Number(sale.totalCost) || 0;
        const profit = Number(sale.potentialProfit) || 0;

        let paymentBadge = "";
        if (totalPaid > 0) {
            paymentBadge = `<span class="text-slate-300">|</span><span class="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-xs font-bold">
                <i class="ri-coin-line text-amber-600"></i> مدفوع عربون: <b class="font-mono text-amber-900">${formatCurrency(totalPaid)}</b> | متبقي: <b class="font-mono text-slate-700">${formatCurrency(remaining)}</b>
            </span>`;
        }

        const dedAmt = Number(sale.deductionAmount) || 0;
        let deductionBadge = "";
        let deductionPill = "";
        if (dedAmt > 0) {
            const liabName = sale.deductionLiabilityName ? escapeHTML(sale.deductionLiabilityName) : 'التزام جانبي';
            deductionPill = `<span class="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 border border-rose-200/90 px-2 py-0.5 rounded-md font-bold mr-1.5 shadow-2xs">
                <i class="ri-scissors-cut-line text-xs"></i> استقطاع خفي
            </span>`;
            deductionBadge = `
            <div class="inline-flex items-center gap-2 bg-rose-50/90 text-rose-900 text-xs px-3 py-1.5 rounded-xl font-medium border border-rose-200 shadow-2xs mt-2 flex-wrap" title="استقطاع مخفي سيُرحل تلقائياً إلى التزام عند التأكيد">
                <span class="flex items-center gap-1 font-bold text-rose-700">
                    <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <i class="ri-scissors-cut-line text-sm"></i>
                    استقطاع خفي:
                </span>
                <span class="font-mono font-extrabold text-rose-800 text-xs sm:text-sm bg-white px-2 py-0.5 rounded-md border border-rose-200">${formatCurrency(dedAmt)}</span>
                <span class="text-slate-600 text-[11px] flex items-center gap-1">
                    <i class="ri-arrow-left-line text-rose-400"></i> يُسجل لـ: <strong class="text-slate-900 font-bold">${liabName}</strong>
                </span>
            </div>`;
        }

        const displayDate = (typeof formatDateTime === 'function') ? formatDateTime(sale.createdAt || sale.timestamp) : (sale.createdAt || sale.timestamp || '');
        let themeClass = 'pending-sale-theme-invoice';
        if (dedAmt > 0) themeClass = 'pending-sale-theme-deduction';
        else if (totalPaid > 0) themeClass = 'pending-sale-theme-deposit';
        else if (sale.mainProduct) themeClass = 'pending-sale-theme-quick';

        return `
        <li class="pending-sale-row ${themeClass}">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div class="flex-1 min-w-0 space-y-2">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center flex-wrap gap-1.5">
                            <span class="font-bold text-slate-800 cursor-pointer hover:text-blue-700 transition text-sm sm:text-base leading-snug" data-pending-id="${escapeHTML(sale.id)}" onclick="window.showPendingSaleDetails(this.dataset.pendingId)" title="اضغط لعرض تفاصيل الربحية">
                                ${itemsText} <i class="fas fa-info-circle text-xs text-blue-500 ml-1"></i>
                            </span>
                            ${deductionPill}
                        </div>
                        <span class="text-xs text-slate-500 font-medium inline-flex items-center gap-1 font-mono bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60"><i class="ri-time-line"></i> ${displayDate}</span>
                    </div>

                    ${customerInfo}
                    ${attachmentsHTML}

                    <div>
                        <div class="flex items-center flex-wrap gap-2 pt-1">
                            <span class="pending-metric-chip pending-metric-price">
                                <i class="ri-price-tag-3-line text-slate-400"></i>
                                <span>السعر:</span>
                                <strong class="font-mono text-slate-900">${formatCurrency(totalSell)}</strong>
                            </span>
                            <span class="pending-metric-chip ${profit >= 0 ? 'pending-metric-profit-pos' : 'pending-metric-profit-neg'}">
                                <i class="${profit >= 0 ? 'ri-arrow-up-circle-line text-emerald-600' : 'ri-arrow-down-circle-line text-red-600'}"></i>
                                <span>الربح:</span>
                                <strong class="font-mono">${formatCurrency(profit)}</strong>
                            </span>
                            ${dedAmt > 0 ? `
                            <span class="pending-metric-chip pending-metric-deduction">
                                <i class="ri-scissors-cut-line text-rose-600"></i>
                                <span>مستقطع:</span>
                                <strong class="font-mono">${formatCurrency(dedAmt)}</strong>
                            </span>` : ''}
                            ${totalPaid > 0 ? `
                            <span class="pending-metric-chip pending-metric-deposit">
                                <i class="ti ti-coin text-amber-600"></i>
                                <span>مقبوض:</span>
                                <strong class="font-mono">${formatCurrency(totalPaid)}</strong>
                                <span class="text-amber-500">|</span>
                                <span>متبقي:</span>
                                <strong class="font-mono text-slate-700">${formatCurrency(remaining)}</strong>
                            </span>` : ''}
                        </div>
                    </div>

                    ${deductionBadge ? `<div>${deductionBadge}</div>` : ''}
                </div>

                <div class="actions flex-shrink-0 flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0 lg:border-r lg:pr-3 border-slate-200/70">
                    <button type="button" data-pending-id="${escapeHTML(sale.id)}" onclick="window.openDepositModal(this.dataset.pendingId)" class="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold border border-amber-600 shadow-2xs transition flex items-center gap-1" title="استلام عربون">
                        <i class="ti ti-coin text-xs"></i> استلام عربون
                    </button>
                    <button type="button" data-pending-id="${escapeHTML(sale.id)}" class="edit-pending bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold border border-blue-700 shadow-2xs transition flex items-center gap-1">
                        <i class="ri-edit-line text-xs"></i> تعديل
                    </button>
                    <button type="button" data-pending-id="${escapeHTML(sale.id)}" class="confirm-pending bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold border border-emerald-700 shadow-2xs transition flex items-center gap-1">
                        <i class="ri-check-line text-xs"></i> تأكيد
                    </button>
                    <button type="button" data-pending-id="${escapeHTML(sale.id)}" class="cancel-pending bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold border border-rose-700 shadow-2xs transition flex items-center gap-1">
                        <i class="ri-close-line text-xs"></i> إلغاء
                    </button>
                    ${(sale.editHistory && sale.editHistory.length > 0) ? `<button type="button" data-pending-id="${escapeHTML(sale.id)}" onclick="window.showPendingEditHistory(this.dataset.pendingId)" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2 py-1.5 text-xs font-bold border border-indigo-700 shadow-2xs transition" title="عرض سجل التعديلات">📜 (${sale.editHistory.length})</button>` : ''}
                    <button type="button" data-pending-id="${escapeHTML(sale.id)}" class="convert-pending-to-debt text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold py-1.5 px-2.5 rounded-lg border border-purple-800 shadow-2xs transition flex items-center gap-1">
                        <i class="ri-exchange-dollar-line text-xs"></i> دين
                    </button>
                    <button type="button" data-pending-id="${escapeHTML(sale.id)}" class="initiate-return-from-pending bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold border border-orange-700 shadow-2xs transition flex items-center gap-1">
                        <i class="ri-arrow-go-back-line text-xs"></i> مرتجع
                    </button>
                </div>
            </div>
        </li>`;
    }).join('');
}
window.updatePendingSalesDisplay = updatePendingSalesDisplay;
function calculateSinglePendingSaleCost(sale) {
    if (!sale) return 0;

    // 1. إذا كان البيع يحتوي على منتج أساسي: يتم حساب التكلفة الفعلية الحالية للصنف والملحقات بدقة
    // (لتفادي تجاهل أي ملحقات كالسماعات في حال وجود حقل totalCost قديم غير محدث)
    if (sale.mainProduct) {
        const qty = sale.mainProduct.quantity !== undefined ? (Number(sale.mainProduct.quantity) || 0) : 1;
        const mainCost = (Number(sale.mainProduct.costPrice) || 0) * qty;
        const addCost = (sale.additionalItems || []).reduce((addSum, item) => 
            addSum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 1)), 0);
        return mainCost + addCost;
    }

    // 2. إذا كانت فاتورة تفصيلية أو بيع مؤقت يحتوي على تكلفة مسجلة مسبقاً
    if (sale.totalCost !== undefined) {
        return Number(sale.totalCost) || 0;
    }

    // 3. إذا كانت فاتورة تفصيلية متعددة البنود بدون totalCost مسجل
    if (sale.items && Array.isArray(sale.items)) {
        const itemsCost = sale.items.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)), 0);
        const extraItems = (sale.additionalItems || (sale.invoiceData ? sale.invoiceData.deductedItems : []) || sale.deductedItems || []);
        const extraCost = extraItems.reduce((sum, i) => sum + ((Number(i.costPrice) || 0) * (Number(i.quantity) || 0)), 0);
        return itemsCost + extraCost;
    }

    return 0;
}
function initiateReturnFromPendingSale(pendingId) {
    const saleIndex = pendingSales.findIndex(s => s.id === pendingId);
    if (saleIndex === -1) {
        showGlobalMessage("خطأ: لم يتم العثور على البيع المؤقت.", true);
        return;
    }

    if (!confirm(`هل تريد تحضير بيانات هذا البيع المؤقت في قسم المرتجعات؟\n(ملاحظة: سيظل البيع المؤقت محفوظاً حتى تضغط على تأكيد المرتجع).`)) {
        return;
    }
    
    saveStateToHistory();

    // نسخ بيانات البيع المؤقت وتحضيرها للمرتجع بدون حذفه قبل التأكيد الفعلي
    returnSourceData = { ...pendingSales[saleIndex], _originPendingId: pendingId }; 

    logOperation("تحضير مرتجع", `تحضير مرتجع من بيع مؤقت للعميل ${returnSourceData.customerName || '-'}.`);
    
    // الانتقال إلى قسم المرتجعات
    const returnsSection = d('returns-section');
    const navButton = document.querySelector('button[data-target="returns-section"]');
    if (returnsSection && navButton) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
        returnsSection.classList.remove('hidden');
        navButton.classList.add('active');
        returnsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // ملء نموذج المرتجعات بجميع التفاصيل والملحقات ليراها المستخدم
    let displayNames = [];
    if (returnSourceData.items) {
        returnSourceData.items.forEach(item => displayNames.push(`${item.quantity}x ${item.name}`));
    } else if (returnSourceData.mainProduct) {
        displayNames.push(`${returnSourceData.mainProduct.quantity}x ${returnSourceData.mainProduct.name}`);
        if (returnSourceData.additionalItems) {
            returnSourceData.additionalItems.forEach(item => displayNames.push(`${item.quantity}x ${item.name}`));
        }
    }
    
    if (displayNames.length > 0) {
        d('return-manual-product-name').value = displayNames.join(' + ');
        d('return-product-select').value = ""; // تصفير الاختيار ليعتمد على الاسم اليدوي
        d('return-quantity').value = 1; // الكمية 1 لأنها تعتبر "حزمة" كاملة في واجهة المستخدم، برمجياً سيتم تفكيكها لاحقاً
    }
    d('return-customer-name').value = returnSourceData.customerName || '';
    
    const depositAmt = Number(returnSourceData.depositPaid || returnSourceData.paidAmount || 0);
    let origCost = 0;
    if (typeof window.extractPendingSaleReturnItems === 'function') {
        const extracted = window.extractPendingSaleReturnItems(returnSourceData);
        if (extracted.mainProduct && Number(extracted.mainProduct.costPrice) > 0) {
            origCost = (Number(extracted.mainProduct.costPrice) || 0) * (Number(extracted.mainProduct.quantity) || 1);
        } else {
            origCost = extracted.totalCost;
        }
    } else if (returnSourceData.mainProduct && Number(returnSourceData.mainProduct.costPrice) > 0) {
        origCost = (Number(returnSourceData.mainProduct.costPrice) || 0) * (Number(returnSourceData.mainProduct.quantity) || 1);
    } else if (typeof calculateSinglePendingSaleCost === 'function') {
        origCost = calculateSinglePendingSaleCost(returnSourceData);
    } else {
        origCost = Number(returnSourceData.totalCost || 0);
    }
    d('return-sale-price-input').value = (typeof window.money === 'function' ? window.money(origCost) : Math.round((Number(origCost) || 0) * 100) / 100);

    // تعبئة السيريال تلقائياً إن وجد
    const returnSerialInp = d('return-serial-input');
    if (returnSerialInp) {
        returnSerialInp.value = returnSourceData.mainProduct?.serial || returnSourceData.serial || '';
    }

    // تحديد الإجراء المالي تلقائياً: إرجاع نقدي إن وُجد عربون مدفوع، أو إرجاع للمخزون فقط إذا لم يُدفع نقد
    if (depositAmt > 0) {
        const cashRadio = d('return-type-cash');
        if (cashRadio) cashRadio.checked = true;
    } else {
        const stockRadio = d('return-type-stock');
        if (stockRadio) stockRadio.checked = true;
    }

    renderReturnCategoriesUI(); 
    
    // تعطيل خيار الإرجاع بسعر البيع (لأنها بيعة مؤقتة لم تتحقق بعد، فيجب أن تعود البضاعة بتكلفتها الأصلية)
    const atSalePriceCheckbox = d('return-at-sale-price');
    if (atSalePriceCheckbox) {
        atSalePriceCheckbox.checked = false;
        atSalePriceCheckbox.dispatchEvent(new Event('change'));
    }

    d('return-receive-now').checked = false; // افتراضياً قيد الاستلام
    
    if (typeof window.renderPendingSaleReturnBreakdown === 'function') {
        window.renderPendingSaleReturnBreakdown();
    }
    if (typeof window.syncReturnsOptionsUI === 'function') {
        window.syncReturnsOptionsUI();
    }

    updateUI();
    showGlobalMessage("تم تحضير بيانات المرتجع والتكلفة الأصلية. يرجى المراجعة والضغط على تأكيد المرتجع.", false, true);
}

// --- دوال التحكم في تبويبات المبيعات وإعادة ضبط الفاتورة ---
window.resetInvoiceModeToNew = function resetInvoiceModeToNew() {
    if (typeof window.inv_setInvoiceMode === 'function') {
        window.inv_setInvoiceMode('new', null);
    } else {
        window.isInvoiceFromPending = false;
        window.isEditingPendingInvoice = false;
        window.pendingSaleOriginData = null;

        const modal = document.getElementById('invoiceModal');
        if (modal && typeof modal.querySelector === 'function') {
            const titleEl = modal.querySelector('.invoice-modal-header h2') || modal.querySelector('.invoice-card-header h2') || modal.querySelector('h2');
            if (titleEl) {
                titleEl.innerHTML = `<i class="fas fa-file-invoice text-indigo-600"></i><span>إنشاء فاتورة جديدة</span><button type="button" onclick="loadInvoiceDraft()" class="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition shadow-sm font-semibold inline-flex items-center gap-1 mr-2" title="استعادة المسودة السابقة"><i class="fas fa-folder-open text-amber-600"></i> مسودة</button>`;
            }
            const saveBtn = document.getElementById('inv_saveInvoiceBtn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save ml-1"></i> حفظ الفاتورة';
            }
            const itemControls = modal.querySelector('.inv-item-controls');
            const addItemDivider = document.getElementById('inv_addItemDivider');
            const unifiedBtn = document.getElementById('inv_unifiedSellModalBtn');
            const deductibleFieldset = document.getElementById('inv_deductibleCostsFieldset');
            if (itemControls) itemControls.classList.remove('hidden');
            if (addItemDivider) addItemDivider.classList.remove('hidden');
            if (unifiedBtn) unifiedBtn.classList.remove('hidden');
            if (deductibleFieldset) deductibleFieldset.classList.remove('hidden');
        }
    }

    const markPending = document.getElementById('inv_markAsPending');
    if (markPending) markPending.checked = false;

    if (typeof window.updateInvoiceModeAlert === 'function') {
        window.updateInvoiceModeAlert();
    }
    if (typeof window.inv_updateDeductibleCostsCheckboxes === 'function') {
        window.inv_updateDeductibleCostsCheckboxes(true);
    }
};

window.switchSalesTab = function switchSalesTab(tabName) {
    const tabNewBtn = document.getElementById('tab-btn-sales-new');
    const tabPendingBtn = document.getElementById('tab-btn-sales-pending');
    const tabNewContent = document.getElementById('tab-content-sales-new');
    const tabPendingContent = document.getElementById('tab-content-sales-pending');

    const activeClasses = 'sales-tab-btn flex-1 py-3 px-4 rounded-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 bg-white text-indigo-600 shadow-sm border border-indigo-100 active';
    const inactiveClasses = 'sales-tab-btn flex-1 py-3 px-4 rounded-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-white/60';

    if (tabName === 'new') {
        if (tabNewBtn) tabNewBtn.className = activeClasses;
        if (tabPendingBtn) tabPendingBtn.className = inactiveClasses;
        if (tabNewContent) tabNewContent.classList.remove('hidden');
        if (tabPendingContent) tabPendingContent.classList.add('hidden');

        // إذا لم نكن في وضع تعديل أو تأكيد بيعة مؤقتة، نضمن أن واجهة الفاتورة جديدة ونظيفة
        if (!window.isInvoiceFromPending && !window.isEditingPendingInvoice) {
            if (typeof window.resetInvoiceModeToNew === 'function') {
                window.resetInvoiceModeToNew();
            }
        }

        const invModal = document.getElementById('invoiceModal');
        if (invModal) {
            invModal.style.display = 'block';
            if (typeof window.renderPOSInvGrid === 'function') {
                window.renderPOSInvGrid();
            }
        }
        if (typeof window.inv_updateDeductibleCostsCheckboxes === 'function') {
            window.inv_updateDeductibleCostsCheckboxes();
        }
    } else {
        if (tabNewBtn) tabNewBtn.className = inactiveClasses;
        if (tabPendingBtn) tabPendingBtn.className = activeClasses;
        if (tabNewContent) tabNewContent.classList.add('hidden');
        if (tabPendingContent) tabPendingContent.classList.remove('hidden');

        const vErr = document.getElementById('inv_validationError');
        if (vErr) { vErr.innerHTML = ''; vErr.textContent = ''; vErr.className = 'error-message no-print mb-2'; vErr.style.display = 'none'; }
        if (typeof updatePendingSalesDisplay === 'function') {
            updatePendingSalesDisplay();
        }
    }
    if (typeof window.updateSalesPendingBadge === 'function') {
        window.updateSalesPendingBadge();
    }
};

window.updateSalesPendingBadge = function updateSalesPendingBadge() {
    const badge = document.getElementById('sales-pending-tab-badge');
    if (!badge) return;
    const count = Array.isArray(window.pendingSales) ? window.pendingSales.length : 0;
    badge.textContent = count;
    if (count > 0) {
        badge.className = 'text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse';
    } else {
        badge.className = 'text-xs bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full ml-1';
    }
};

window.inv_cancelEditMode = function inv_cancelEditMode() {
    if (typeof window.resetInvoiceModeToNew === 'function') {
        window.resetInvoiceModeToNew();
    }
    if (typeof resetInvoiceForm === 'function') {
        resetInvoiceForm();
    }
    if (typeof window.inv_closeModal === 'function') {
        window.inv_closeModal();
    }
    if (typeof window.switchSalesTab === 'function') {
        window.switchSalesTab('pending');
    }
};

window.updateInvoiceModeAlert = function updateInvoiceModeAlert() {
    const modeAlert = document.getElementById('inv_mode_alert');
    const modeAlertText = document.getElementById('inv_mode_alert_text');
    if (!modeAlert) return;
    if (window.isInvoiceFromPending) {
        modeAlert.classList.remove('hidden');
        if (modeAlertText) modeAlertText.innerHTML = `<strong>وضع تأكيد بيعة مؤقتة:</strong> أنت الآن في وضع تأكيد الفاتورة رقم <span class="font-mono bg-blue-100 text-blue-800 px-1 rounded">${escapeHTML(window.pendingSaleOriginData?.id || '')}</span> للعميل <b>${escapeHTML(window.pendingSaleOriginData?.customerName || '')}</b>.`;
    } else if (window.isEditingPendingInvoice) {
        modeAlert.classList.remove('hidden');
        if (modeAlertText) modeAlertText.innerHTML = `<strong>وضع تعديل بيعة مؤقتة:</strong> أنت الآن تعدل بيانات البيعة رقم <span class="font-mono bg-amber-100 text-amber-800 px-1 rounded">${escapeHTML(window.pendingSaleOriginData?.id || '')}</span> للعميل <b>${escapeHTML(window.pendingSaleOriginData?.customerName || '')}</b>.`;
    } else {
        modeAlert.classList.add('hidden');
    }
};


