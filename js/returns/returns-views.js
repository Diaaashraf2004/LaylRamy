/**
 * js/returns/returns-views.js
 * إدارة واجهات وتبويبات قسم المرتجعات (مرتجعات المبيعات ومرتجعات المشتريات)
 */

window.switchReturnsTab = function(tabName) {
    const salesTabBtn = document.getElementById('tab-btn-sales-returns');
    const purchasesTabBtn = document.getElementById('tab-btn-purchases-returns');
    const salesTabContent = document.getElementById('returns-sales-tab-content');
    const purchasesTabContent = document.getElementById('returns-purchases-tab-content');

    if (!salesTabContent || !purchasesTabContent) return;

    if (tabName === 'sales') {
        salesTabContent.classList.remove('hidden');
        purchasesTabContent.classList.add('hidden');
        if (salesTabBtn) {
            salesTabBtn.className = "returns-nav-tab active px-5 py-2 rounded-lg font-bold shadow-sm transition-all text-sm flex items-center gap-2 bg-blue-600 text-white";
        }
        if (purchasesTabBtn) {
            purchasesTabBtn.className = "returns-nav-tab px-5 py-2 rounded-lg font-bold shadow-sm transition-all text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200";
        }
        if (typeof window.syncReturnsOptionsUI === 'function') {
            window.syncReturnsOptionsUI();
        }
        if (typeof window.renderPendingSaleReturnBreakdown === 'function') {
            window.renderPendingSaleReturnBreakdown();
        }
    } else {
        salesTabContent.classList.add('hidden');
        purchasesTabContent.classList.remove('hidden');
        if (purchasesTabBtn) {
            purchasesTabBtn.className = "returns-nav-tab active px-5 py-2 rounded-lg font-bold shadow-sm transition-all text-sm flex items-center gap-2 bg-blue-600 text-white";
        }
        if (salesTabBtn) {
            salesTabBtn.className = "returns-nav-tab px-5 py-2 rounded-lg font-bold shadow-sm transition-all text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200";
        }
        window.renderSupplierPurchasesReturnList();
        window.renderCompletedPurchaseReturns();
    }
};

window.renderSupplierPurchasesReturnList = function() {
    const listContainer = document.getElementById('supplier-purchases-return-list');
    if (!listContainer) return;

    const searchInput = document.getElementById('sr-invoice-search-filter');
    const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const invoices = (typeof purchaseInvoices !== 'undefined' && Array.isArray(purchaseInvoices)) ? purchaseInvoices : [];

    let filtered = [...invoices];
    if (searchTerm) {
        filtered = filtered.filter(inv => {
            const supplier = (typeof suppliers !== 'undefined' && Array.isArray(suppliers)) ? suppliers.find(s => s.id === inv.supplierId) : null;
            const supName = (supplier ? supplier.name : '').toLowerCase();
            const invNum = (inv.invoiceNumber || '').toLowerCase();
            return supName.includes(searchTerm) || invNum.includes(searchTerm);
        });
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                <i class="fas fa-receipt text-3xl mb-2 text-gray-300"></i>
                <p class="text-sm">لا توجد فواتير شراء مسجلة مطابقة للبحث.</p>
            </div>
        `;
        return;
    }

    const sorted = filtered.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

    listContainer.innerHTML = sorted.map(inv => {
        const supplier = (typeof suppliers !== 'undefined' && Array.isArray(suppliers)) ? suppliers.find(s => s.id === inv.supplierId) : null;
        const totalItemsCount = (inv.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        const rem = Number(inv.remainingBalance) || 0;

        return `
            <div class="p-4 border rounded-xl bg-white shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-gray-800 text-base">${escapeHTML(supplier ? supplier.name : 'غير محدد')}</span>
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-mono font-bold">فاتورة #${escapeHTML(inv.invoiceNumber || inv.id)}</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span><i class="fas fa-calendar-alt text-gray-400 ml-1"></i> ${formatDateForDisplay(inv.date || inv.timestamp)}</span>
                        <span><i class="fas fa-box text-gray-400 ml-1"></i> ${totalItemsCount} قطعة</span>
                        <span><i class="fas fa-money-bill text-gray-400 ml-1"></i> الإجمالي: <strong class="text-blue-700 font-mono">${formatCurrency(inv.grandTotal)}</strong></span>
                        <span><i class="fas fa-hand-holding-usd text-gray-400 ml-1"></i> المدفوع: <strong class="text-green-600 font-mono">${formatCurrency(inv.paidAmount)}</strong></span>
                        ${rem > 0 ? `<span class="text-red-600 font-bold"><i class="fas fa-exclamation-circle ml-1"></i> متبقي: ${formatCurrency(rem)}</span>` : '<span class="text-emerald-600 font-bold"><i class="fas fa-check ml-1"></i> مسددة بالكامل</span>'}
                    </div>
                </div>
                <div class="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button type="button" data-invoice-id="${escapeHTML(inv.id)}" onclick="window.openPurchaseReturnModal(this.dataset.invoiceId)" class="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5 text-xs">
                        <i class="fas fa-undo-alt"></i> عمل مرتجع للمورد
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.renderCompletedPurchaseReturns = function() {
    const container = document.getElementById('completed-purchase-returns-list');
    if (!container) return;
    const pReturns = (typeof purchaseReturns !== 'undefined' && Array.isArray(purchaseReturns)) ? purchaseReturns : [];

    if (pReturns.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 text-xs py-3">لا توجد مرتجعات مشتريات مسجلة بعد.</p>';
        return;
    }

    const sorted = [...pReturns].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(pr => {
        const sup = (typeof suppliers !== 'undefined' && Array.isArray(suppliers)) ? suppliers.find(s => s.id === pr.supplierId) : null;
        return `
            <div class="p-2.5 border-b border-gray-200 last:border-0 flex justify-between items-center text-xs">
                <div>
                    <strong class="text-gray-800">${escapeHTML(sup ? sup.name : 'مورد')}</strong>
                    <span class="text-gray-500 mr-2 font-mono">${(pr.items || []).map(i => `${i.qty}x ${escapeHTML(i.name)}`).join('، ')}</span>
                </div>
                <div class="text-left font-mono">
                    <span class="font-bold text-red-600">-${formatCurrency(pr.totalValue)}</span>
                    <span class="text-gray-400 block text-[10px]">${formatDateForDisplay(pr.date)}</span>
                </div>
            </div>
        `;
    }).join('');
};

window.handleReturnProductSelection = function() {
    const sel = document.getElementById('return-product-select');
    const priceInp = document.getElementById('return-sale-price-input');
    const helperSpan = document.getElementById('return-selected-item-info');
    if (!sel || !sel.value) {
        if (helperSpan) helperSpan.classList.add('hidden');
        return;
    }

    const opt = sel.options[sel.selectedIndex];
    const cost = parseFloat(opt.dataset.cost) || 0;
    const sellPrice = parseFloat(opt.dataset.sellPrice) || cost;

    if (priceInp) {
        priceInp.value = sellPrice || cost;
    }

    if (helperSpan) {
        helperSpan.classList.remove('hidden');
        helperSpan.innerHTML = `
            <div class="flex items-center justify-between text-xs">
                <span class="text-blue-700 font-semibold">سعر البيع المسجل: <strong class="font-mono">${formatCurrency(sellPrice)}</strong></span>
                <span class="text-gray-600">سعر التكلفة: <strong class="font-mono">${formatCurrency(cost)}</strong></span>
            </div>
        `;
    }

    if (typeof renderReturnCategoriesUI === 'function') {
        renderReturnCategoriesUI();
    }
};

window.syncReturnsOptionsUI = function() {
    const typeRadios = document.querySelectorAll('input[name="return-financial-type"]');
    typeRadios.forEach(radio => {
        const card = radio.closest('.return-option-card');
        if (!card) return;
        const indicator = card.querySelector('.return-radio-indicator');
        const val = radio.value;

        if (radio.checked) {
            card.classList.remove('border-slate-200', 'bg-white');
            if (val === 'cash') {
                card.classList.add('border-emerald-500', 'bg-emerald-50/90', 'ring-2', 'ring-emerald-500/25', 'shadow-xs');
            } else if (val === 'credit') {
                card.classList.add('border-amber-500', 'bg-amber-50/90', 'ring-2', 'ring-amber-500/25', 'shadow-xs');
            } else {
                card.classList.add('border-blue-500', 'bg-blue-50/90', 'ring-2', 'ring-blue-500/25', 'shadow-xs');
            }
            if (indicator) {
                const colorClass = val === 'cash' ? 'text-emerald-600' : (val === 'credit' ? 'text-amber-600' : 'text-blue-600');
                indicator.innerHTML = `<i class="fas fa-check-circle text-lg ${colorClass}"></i>`;
            }
        } else {
            card.classList.remove(
                'border-emerald-500', 'bg-emerald-50/90', 'ring-emerald-500/25',
                'border-amber-500', 'bg-amber-50/90', 'ring-amber-500/25',
                'border-blue-500', 'bg-blue-50/90', 'ring-blue-500/25',
                'ring-2', 'shadow-xs'
            );
            card.classList.add('border-slate-200', 'bg-white');
            if (indicator) {
                indicator.innerHTML = '<i class="far fa-circle text-lg text-slate-300"></i>';
            }
        }
    });

    const receiveNowCb = document.getElementById('return-receive-now');
    if (receiveNowCb) {
        const card = receiveNowCb.closest('.return-option-card');
        const indicator = card ? card.querySelector('.return-checkbox-indicator') : null;
        const badge = document.getElementById('receive-status-badge');
        if (card) {
            if (receiveNowCb.checked) {
                card.classList.remove('border-slate-200', 'bg-white');
                card.classList.add('border-teal-500', 'bg-teal-50/90', 'ring-2', 'ring-teal-500/25', 'shadow-xs');
                if (indicator) indicator.innerHTML = '<i class="fas fa-check-square text-lg text-teal-600"></i>';
                if (badge) {
                    badge.textContent = 'استلام فوري';
                    badge.className = 'text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded';
                }
            } else {
                card.classList.remove('border-teal-500', 'bg-teal-50/90', 'ring-2', 'ring-teal-500/25', 'shadow-xs');
                card.classList.add('border-slate-200', 'bg-white');
                if (indicator) indicator.innerHTML = '<i class="far fa-square text-lg text-slate-300"></i>';
                if (badge) {
                    badge.textContent = 'معلق قيد الاستلام';
                    badge.className = 'text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded';
                }
            }
        }
    }

    const atSalePriceCb = document.getElementById('return-at-sale-price');
    if (atSalePriceCb) {
        const card = atSalePriceCb.closest('.return-option-card');
        const indicator = card ? card.querySelector('.return-checkbox-indicator') : null;
        if (card) {
            if (atSalePriceCb.checked) {
                card.classList.remove('border-slate-200', 'bg-white');
                card.classList.add('border-purple-500', 'bg-purple-50/90', 'ring-2', 'ring-purple-500/25', 'shadow-xs');
                if (indicator) indicator.innerHTML = '<i class="fas fa-check-square text-lg text-purple-600"></i>';
            } else {
                card.classList.remove('border-purple-500', 'bg-purple-50/90', 'ring-2', 'ring-purple-500/25', 'shadow-xs');
                card.classList.add('border-slate-200', 'bg-white');
                if (indicator) indicator.innerHTML = '<i class="far fa-square text-lg text-slate-300"></i>';
            }
        }
    }

    const stockRadio = document.getElementById('return-type-stock');
    const creditRadio = document.getElementById('return-type-credit');
    const labelText = document.getElementById('return-sale-price-label-text');
    const labelIcon = document.getElementById('return-sale-price-icon');
    const priceInput = document.getElementById('return-sale-price-input');

    if (labelText && labelIcon) {
        if (stockRadio && stockRadio.checked) {
            labelText.textContent = 'قيمة تكلفة المرتجع (التكلفة الأصلية للبضاعة):';
            labelIcon.className = 'fas fa-boxes text-blue-600';
            if (priceInput) {
                priceInput.classList.remove('text-red-600', 'text-amber-700');
                priceInput.classList.add('text-blue-700');
            }
        } else if (creditRadio && creditRadio.checked) {
            labelText.textContent = 'قيمة المرتجع (المبلغ المسجل كرصيد للعميل):';
            labelIcon.className = 'fas fa-user-clock text-amber-600';
            if (priceInput) {
                priceInput.classList.remove('text-blue-700', 'text-red-600');
                priceInput.classList.add('text-amber-700');
            }
        } else {
            labelText.textContent = 'قيمة المرتجع (المبلغ المسترد نقداً للعميل):';
            labelIcon.className = 'fas fa-hand-holding-usd text-red-600';
            if (priceInput) {
                priceInput.classList.remove('text-blue-700', 'text-amber-700');
                priceInput.classList.add('text-red-600');
            }
        }
    }
};

window.setReturnPriceInputValue = function(val) {
    const inp = document.getElementById('return-sale-price-input');
    if (inp) {
        inp.value = val;
        inp.dispatchEvent(new Event('input'));
    }
};

window.initReturnsInteractiveUI = function() {
    const radioInputs = document.querySelectorAll('input[name="return-financial-type"]');
    radioInputs.forEach(r => {
        r.addEventListener('change', () => {
            window.syncReturnsOptionsUI();
            if (typeof updateReturnFormVisibility === 'function') updateReturnFormVisibility();
        });
    });

    const cbs = [document.getElementById('return-receive-now'), document.getElementById('return-at-sale-price')];
    cbs.forEach(cb => {
        if (cb) cb.addEventListener('change', () => window.syncReturnsOptionsUI());
    });

    const navBtn = document.querySelector('button[data-target="returns-section"]');
    if (navBtn) {
        navBtn.addEventListener('click', () => {
            setTimeout(() => window.syncReturnsOptionsUI(), 50);
        });
    }

    window.syncReturnsOptionsUI();
};

window.extractPendingSaleReturnItems = function(sourceData) {
    if (!sourceData) {
        return { mainProduct: null, additionalItems: [], allItems: [], totalCost: 0 };
    }

    const findProductCost = (id, name) => {
        if (typeof products !== 'undefined' && Array.isArray(products)) {
            const p = products.find(prod => (id && prod.id === id) || (name && prod.name.trim().toLowerCase() === name.trim().toLowerCase()));
            if (p && Number(p.costPrice) > 0) return Number(p.costPrice);
        }
        return 0;
    };

    let mainProduct = null;
    let additionalItems = [];
    let allItems = [];

    if (sourceData.mainProduct) {
        const pQty = Number(sourceData.mainProduct.quantity) || 1;
        let pCost = Number(sourceData.mainProduct.costPrice) || 0;
        if (pCost <= 0) pCost = findProductCost(sourceData.mainProduct.id, sourceData.mainProduct.name);
        
        mainProduct = {
            id: sourceData.mainProduct.id || null,
            name: sourceData.mainProduct.name || 'منتج غير محدد',
            quantity: pQty,
            costPrice: pCost,
            serial: sourceData.mainProduct.serial || sourceData.serial || '',
            category: sourceData.mainProduct.category || 'عام',
            supplierId: sourceData.mainProduct.supplierId || ''
        };
        allItems.push(mainProduct);
    }

    const rawExtras = [];
    const sourceDeducted = (Array.isArray(sourceData.deductedItems) && sourceData.deductedItems.length > 0)
        ? sourceData.deductedItems
        : (sourceData.invoiceData && Array.isArray(sourceData.invoiceData.deductedItems) ? sourceData.invoiceData.deductedItems : []);
    if (sourceDeducted.length > 0) rawExtras.push(...sourceDeducted);
    else if (Array.isArray(sourceData.additionalItems) && sourceData.additionalItems.length > 0) rawExtras.push(...sourceData.additionalItems);

    rawExtras.forEach(item => {
        if (!item || !item.name) return;
        const iQty = Number(item.quantity) || 1;
        let iCost = Number(item.costPrice !== undefined ? item.costPrice : item.cost) || 0;
        if (iCost <= 0) iCost = findProductCost(item.id, item.name);

        const normalized = {
            id: item.id || null,
            name: item.name,
            quantity: iQty,
            costPrice: iCost,
            serial: item.serial || '',
            category: item.category || 'عام',
            supplierId: item.supplierId || ''
        };
        additionalItems.push(normalized);
        allItems.push(normalized);
    });

    if (!mainProduct && Array.isArray(sourceData.items)) {
        sourceData.items.forEach(item => {
            if (!item || !item.name) return;
            const iQty = Number(item.quantity) || 1;
            let iCost = Number(item.costPrice !== undefined ? item.costPrice : item.cost) || 0;
            if (iCost <= 0) iCost = findProductCost(item.id, item.name);

            const normalized = {
                id: item.id || null,
                name: item.name,
                quantity: iQty,
                costPrice: iCost,
                serial: item.serial || '',
                category: item.category || 'عام',
                supplierId: item.supplierId || ''
            };
            allItems.push(normalized);
        });
    }

    let totalCost = allItems.reduce((sum, it) => sum + (it.costPrice * it.quantity), 0);
    if (totalCost <= 0 && sourceData.totalCost && Number(sourceData.totalCost) > 0) {
        totalCost = Number(sourceData.totalCost);
    }
    totalCost = typeof window.money === 'function' ? window.money(totalCost) : Math.round((Number(totalCost) || 0) * 100) / 100;

    return { mainProduct, additionalItems, allItems, totalCost };
};

window.renderPendingSaleReturnBreakdown = function() {
    const container = document.getElementById('return-pending-sale-breakdown');
    if (!container) return;

    if (typeof returnSourceData === 'undefined' || !returnSourceData) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    const { mainProduct, additionalItems, allItems, totalCost } = window.extractPendingSaleReturnItems(returnSourceData);

    if (mainProduct && returnSourceData.mainProduct) {
        returnSourceData.mainProduct.costPrice = mainProduct.costPrice;
    }
    returnSourceData.totalCost = totalCost;

    const serialInput = document.getElementById('return-serial-input');
    if (serialInput && (mainProduct?.serial || returnSourceData.serial)) {
        serialInput.value = mainProduct?.serial || returnSourceData.serial;
    }

    const deposit = Number(returnSourceData.depositPaid || returnSourceData.paidAmount || 0);
    if (deposit > 0) {
        const cashRadio = document.getElementById('return-type-cash');
        if (cashRadio) cashRadio.checked = true;
    } else {
        const stockRadio = document.getElementById('return-type-stock');
        if (stockRadio) stockRadio.checked = true;
    }

    const mainCost = mainProduct ? (typeof window.money === 'function' ? window.money((Number(mainProduct.costPrice) || 0) * (Number(mainProduct.quantity) || 1)) : Math.round((Number(mainProduct.costPrice) || 0) * (Number(mainProduct.quantity) || 1) * 100) / 100) : 0;
    const roundedTotalCost = typeof window.money === 'function' ? window.money(totalCost) : Math.round((Number(totalCost) || 0) * 100) / 100;
    const defaultVal = (mainCost > 0) ? mainCost : roundedTotalCost;

    const priceInput = document.getElementById('return-sale-price-input');
    if (priceInput) {
        priceInput.value = defaultVal;
    }

    const hintContainer = document.getElementById('return-sale-price-hint');
    if (hintContainer) {
        hintContainer.classList.remove('hidden');
        let buttonsHtml = '';
        if (mainProduct && additionalItems.length > 0) {
            buttonsHtml = `
                <button type="button" onclick="window.setReturnPriceInputValue(this.dataset.val)" data-val="${mainCost}" class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer" title="تكلفة الصنف الأساسي فقط">
                    البضاعة الأساسية: ${formatCurrency(mainCost)}
                </button>
                <button type="button" onclick="window.setReturnPriceInputValue(this.dataset.val)" data-val="${roundedTotalCost}" class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer" title="إجمالي التكلفة شاملة جميع الملحقات">
                    الإجمالي بالملحقات: ${formatCurrency(roundedTotalCost)}
                </button>
            `;
        } else {
            buttonsHtml = `
                <button type="button" onclick="window.setReturnPriceInputValue(this.dataset.val)" data-val="${roundedTotalCost}" class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer" title="تطبيق التكلفة الأصلية">
                    التكلفة الأصلية: ${formatCurrency(roundedTotalCost)}
                </button>
            `;
        }

        if (deposit > 0) {
            const depositVal = typeof window.money === 'function' ? window.money(deposit) : Math.round((Number(deposit) || 0) * 100) / 100;
            buttonsHtml += `
                <button type="button" onclick="window.setReturnPriceInputValue(this.dataset.val)" data-val="${depositVal}" class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer" title="تطبيق العربون فقط">
                    العربون: ${formatCurrency(deposit)}
                </button>
            `;
        }

        const msgText = (mainCost > 0 && additionalItems.length > 0) 
            ? `تم كتابة التكلفة الأساسية للبضاعة (${formatCurrency(mainCost)}) تلقائياً`
            : `تم ملء التكلفة الأصلية للبضاعة تلقائياً`;

        hintContainer.innerHTML = `
            <div class="flex items-center justify-between text-xs flex-wrap gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full">
                <span class="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                    <i class="fas fa-magic text-blue-600"></i> ${msgText}
                </span>
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${buttonsHtml}
                </div>
            </div>
        `;
    }

    let mainProductHtml = '';
    if (mainProduct) {
        mainProductHtml = `
            <div class="bg-white/95 p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                <div class="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span class="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <i class="fas fa-mobile-alt text-blue-600"></i>
                        ${mainProduct.quantity}x ${escapeHTML(mainProduct.name)}
                    </span>
                    <span class="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 text-xs">
                        التكلفة الأصلية: ${formatCurrency(mainProduct.costPrice)}
                    </span>
                </div>
                ${mainProduct.serial ? `<div class="text-[11px] text-purple-700 font-mono mt-1.5 flex items-center gap-1"><i class="fas fa-barcode"></i> <strong>السيريال:</strong> ${escapeHTML(mainProduct.serial)}</div>` : ''}
            </div>
        `;
    }

    let extraItemsHtml = '';
    if (additionalItems.length > 0) {
        extraItemsHtml = `
            <div class="space-y-1.5 pt-1">
                <div class="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                    <i class="fas fa-plus-circle text-amber-600"></i> التكاليف والملحقات الإضافية المسجلة بالبيعة:
                </div>
                ${additionalItems.map(item => `
                    <div class="flex items-center justify-between text-xs bg-white/90 p-2 rounded-lg border border-amber-200/60 shadow-2xs">
                        <span class="text-slate-800 font-medium flex items-center gap-1">
                            <i class="fas fa-tag text-teal-600 text-[10px]"></i>
                            ${item.quantity}x ${escapeHTML(item.name)}
                        </span>
                        <span class="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            تكلفة أصلية: ${formatCurrency(item.costPrice)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        extraItemsHtml = `
            <div class="text-[11px] text-slate-500 bg-white/70 p-2 rounded-lg text-center border border-amber-200/50">
                <i class="fas fa-info-circle text-slate-400 ml-1"></i> لا توجد ملحقات أو تكاليف إضافية مسجلة لهذه البيعة.
            </div>
        `;
    }

    container.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-amber-200/80">
            <span class="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                <i class="fas fa-history text-amber-600"></i>
                بيانات البيع المؤقت والتكلفة الأصلية المستردة
            </span>
            <span class="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                بيعة مؤقتة محولة
            </span>
        </div>

        ${mainProductHtml}
        ${extraItemsHtml}

        <div class="flex items-center justify-between pt-2 border-t border-amber-200/80 text-xs">
            <span class="font-bold text-slate-700">إجمالي التكلفة الأصلية المستردة للمخزن:</span>
            <span class="font-mono font-black text-emerald-800 text-sm bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300">
                ${formatCurrency(totalCost)}
            </span>
        </div>
    `;

    container.classList.remove('hidden');

    if (typeof window.syncReturnsOptionsUI === 'function') {
        window.syncReturnsOptionsUI();
    }
};

window.clearPendingSaleReturnBreakdown = function() {
    const container = document.getElementById('return-pending-sale-breakdown');
    if (container) { container.innerHTML = ''; container.classList.add('hidden'); }
    const hintContainer = document.getElementById('return-sale-price-hint');
    if (hintContainer) { hintContainer.innerHTML = ''; hintContainer.classList.add('hidden'); }
};

window.resetReturnFormUI = function() {
    ['return-product-select', 'return-manual-product-name', 'return-customer-name', 'return-serial-input'].forEach(id => {
        const elem = document.getElementById(id); if (elem) elem.value = '';
    });
    const q = document.getElementById('return-quantity'); if (q) q.value = '1';
    const p = document.getElementById('return-sale-price-input'); if (p) p.value = 0;
    const acc = document.getElementById('return-from-account-select'); if (acc) acc.selectedIndex = 0;
    const cash = document.getElementById('return-type-cash'); if (cash) cash.checked = true;
    const cred = document.getElementById('return-type-credit'); if (cred) cred.checked = false;
    const stk = document.getElementById('return-type-stock'); if (stk) stk.checked = false;
    const rec = document.getElementById('return-receive-now'); if (rec) rec.checked = true;
    const asp = document.getElementById('return-at-sale-price'); if (asp) asp.checked = false;
    const info = document.getElementById('return-selected-item-info'); if (info) { info.classList.add('hidden'); info.innerHTML = ''; }
    if (typeof window.clearPendingSaleReturnBreakdown === 'function') window.clearPendingSaleReturnBreakdown();
    const catC = document.getElementById('return-categories-container'); if (catC) catC.classList.add('hidden');
    const catL = document.getElementById('return-categories-list'); if (catL) catL.innerHTML = '';
    if (typeof window.syncReturnsOptionsUI === 'function') window.syncReturnsOptionsUI();
    if (typeof updateReturnFormVisibility === 'function') updateReturnFormVisibility();
    if (typeof returnSourceData !== 'undefined') returnSourceData = null;
};

window.manualResetReturnForm = function() {
    window.resetReturnFormUI();
    const msgEl = document.getElementById('return-message');
    if (msgEl) msgEl.innerHTML = '';
    if (typeof showGlobalMessage === 'function') showGlobalMessage("تم تصفير نموذج المرتجعات بنجاح.", false);
};

document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('return-product-select');
    if (sel) {
        sel.addEventListener('change', window.handleReturnProductSelection);
    }
    window.initReturnsInteractiveUI();
});
