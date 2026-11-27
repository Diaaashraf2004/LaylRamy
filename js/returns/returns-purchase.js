window.openPurchaseReturnModal = function(invoiceId) {
    const invoice = (typeof purchaseInvoices !== 'undefined' && Array.isArray(purchaseInvoices)) 
        ? purchaseInvoices.find(inv => inv.id === invoiceId) 
        : null;
    if (!invoice) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage('لم يتم العثور على فاتورة الشراء المحددة.', true);
        else alert('لم يتم العثور على فاتورة الشراء المحددة.');
        return;
    }
    
    window.currentPurchaseReturnInvoice = invoice;
    const invIdInput = document.getElementById('pr-invoice-id');
    if (invIdInput) invIdInput.value = invoice.id;
    
    const supplier = (typeof suppliers !== 'undefined' && Array.isArray(suppliers))
        ? suppliers.find(s => s.id === invoice.supplierId)
        : null;
    
    const numEl = document.getElementById('pr-invoice-num');
    if (numEl) numEl.textContent = invoice.invoiceNumber || invoiceId;
    
    const supEl = document.getElementById('pr-supplier-name');
    if (supEl) supEl.textContent = supplier ? supplier.name : (invoice.supplierName || 'غير محدد');
    
    const tbody = document.getElementById('pr-items-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let items = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        items = invoice.items;
    }
    
    let hasAvailableItems = false;
    items.forEach((item, index) => {
        const returnedQty = Number(item.returnedQuantity) || 0;
        const totalQty = Number(item.quantity) || 0;
        const availableQty = Math.max(0, totalQty - returnedQty);
        const itemCost = Number(item.cost !== undefined ? item.cost : item.costPrice) || 0;
        if (availableQty > 0) hasAvailableItems = true;
        
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50 transition-colors";
        tr.innerHTML = `
            <td class="p-2.5 text-right font-semibold text-gray-800">${escapeHTML(item.name || 'صنف غير مسمى')}</td>
            <td class="p-2.5 text-center font-mono">${totalQty}</td>
            <td class="p-2.5 text-center text-gray-500 font-mono">${returnedQty}</td>
            <td class="p-2.5 text-center font-mono font-medium">${formatCurrency(itemCost)}</td>
            <td class="p-2.5 text-center bg-red-50/60">
                ${availableQty > 0 ? `
                    <input type="number" class="w-20 p-1 border border-red-300 rounded text-center pr-return-qty-input font-bold text-red-700 bg-white" 
                        min="0" max="${availableQty}" value="0" data-index="${index}" data-price="${itemCost}">
                    <span class="block text-[10px] text-gray-400 mt-0.5">متاح: ${availableQty}</span>
                ` : `
                    <span class="text-xs text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded">تم إرجاعه بالكامل</span>
                `}
            </td>
            <td class="p-2.5 text-center font-bold text-red-600 font-mono item-return-val">0.00 ج.م</td>
        `;
        tbody.appendChild(tr);
    });
    
    if (!hasAvailableItems && items.length > 0) {
        const infoRow = document.createElement('tr');
        infoRow.innerHTML = `<td colspan="6" class="p-4 text-center text-amber-700 bg-amber-50 font-bold rounded-b"><i class="fas fa-info-circle ml-1"></i> تم إرجاع جميع كميات أصناف هذه الفاتورة بالكامل مسبقاً.</td>`;
        tbody.appendChild(infoRow);
    }
    
    // Add event listeners to inputs
    document.querySelectorAll('.pr-return-qty-input').forEach(input => {
        const onInputChange = function() {
            let val = parseInt(this.value) || 0;
            const max = parseInt(this.getAttribute('max')) || 0;
            if (val < 0) { val = 0; this.value = 0; }
            if (val > max) { val = max; this.value = max; }
            
            const price = (typeof parseFloatSafe === 'function') ? parseFloatSafe(this.getAttribute('data-price')) : (parseFloat(this.getAttribute('data-price')) || 0);
            const lineSubtotalEl = this.parentElement.nextElementSibling;
            if (lineSubtotalEl) lineSubtotalEl.textContent = formatCurrency(val * price);
            updatePurchaseReturnTotals();
        };
        input.addEventListener('input', onInputChange);
        input.addEventListener('change', onInputChange);
    });
    
    // Reset refund method to default 'safe' and manage confirm button state
    const methodSelect = document.getElementById('pr-refund-method');
    if (methodSelect) methodSelect.value = 'safe';
    const confirmBtn = document.getElementById('confirmPurchaseReturnBtn');
    if (confirmBtn) {
        confirmBtn.disabled = !hasAvailableItems;
        confirmBtn.classList.toggle('opacity-50', !hasAvailableItems);
        confirmBtn.classList.toggle('cursor-not-allowed', !hasAvailableItems);
    }

    // Populate accounts
    const accountSelect = document.getElementById('pr-refund-account');
    if (accountSelect && typeof accounts !== 'undefined' && Array.isArray(accounts)) {
        accountSelect.innerHTML = '';
        accounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = acc.name + " (" + formatCurrency(acc.balance) + ")";
            accountSelect.appendChild(opt);
        });
    }
    
    updatePurchaseReturnTotals();
    
    const modal = document.getElementById('purchaseReturnModal');
    if (modal) modal.classList.remove('hidden');
};

window.closePurchaseReturnModal = function() {
    const modal = document.getElementById('purchaseReturnModal');
    if (modal) modal.classList.add('hidden');
    window.currentPurchaseReturnInvoice = null;
    const invIdInput = document.getElementById('pr-invoice-id');
    if (invIdInput) invIdInput.value = '';
};

window.setReturnAllQuantities = function() {
    document.querySelectorAll('.pr-return-qty-input').forEach(input => {
        const max = parseInt(input.getAttribute('max')) || 0;
        input.value = max;
        const price = (typeof parseFloatSafe === 'function') ? parseFloatSafe(input.getAttribute('data-price')) : (parseFloat(input.getAttribute('data-price')) || 0);
        const lineSubtotalEl = input.parentElement.nextElementSibling;
        if (lineSubtotalEl) lineSubtotalEl.textContent = formatCurrency(max * price);
    });
    updatePurchaseReturnTotals();
};

window.resetReturnQuantities = function() {
    document.querySelectorAll('.pr-return-qty-input').forEach(input => {
        input.value = 0;
        const lineSubtotalEl = input.parentElement.nextElementSibling;
        if (lineSubtotalEl) lineSubtotalEl.textContent = formatCurrency(0);
    });
    updatePurchaseReturnTotals();
};

function getLivePurchaseReturnRemainingBalance(invoice) {
    if (!invoice) return 0;
    const m = (typeof window.money === 'function') ? window.money : Number;
    const storedRem = (typeof parseFloatSafe === 'function') ? parseFloatSafe(invoice.remainingBalance) : (parseFloat(invoice.remainingBalance) || 0);
    if (typeof liabilities !== 'undefined' && Array.isArray(liabilities) && invoice.id) {
        const linkedSupplierLiabs = liabilities.filter(l => l && l.purchaseInvoiceId === invoice.id && l.source !== 'purchase_extra_cost');
        if (linkedSupplierLiabs.length > 0) {
            const liveSum = m(linkedSupplierLiabs.reduce((s, l) => s + Math.max(0, Number(l.amount) || 0), 0));
            return m(Math.min(Math.max(0, storedRem), liveSum));
        }
    }
    return m(Math.max(0, storedRem));
}

function findMatchingStockProductForReturn(item, minQty = 0) {
    if (!item || typeof products === 'undefined' || !Array.isArray(products)) return null;
    const normRetName = typeof normalizeArabicText === 'function' ? normalizeArabicText(item.name || '') : (item.name || '').toLowerCase().trim();
    if (item.id) {
        const byId = products.find(p => p && p.id === item.id);
        if (byId && (Number(byId.quantity) || 0) >= minQty) return byId;
    }
    const candidates = products.filter(p => p && (
        (item.id && p.id === item.id) ||
        ((typeof normalizeArabicText === 'function' ? normalizeArabicText(p.name || '') : (p.name || '').toLowerCase().trim()) === normRetName)
    ));
    if (candidates.length === 0) return null;
    const withEnoughStock = candidates.find(p => (Number(p.quantity) || 0) >= minQty && (Number(p.quantity) || 0) > 0);
    return withEnoughStock || candidates.find(p => (Number(p.quantity) || 0) > 0) || candidates[0];
}

function updatePurchaseReturnTotals() {
    let totalReturnVal = 0;
    document.querySelectorAll('.pr-return-qty-input').forEach(input => {
        const val = parseInt(input.value) || 0;
        const price = (typeof parseFloatSafe === 'function') ? parseFloatSafe(input.getAttribute('data-price')) : (parseFloat(input.getAttribute('data-price')) || 0);
        totalReturnVal += (val * price);
    });
    
    const totalEl = document.getElementById('pr-total-return-val');
    if (totalEl) totalEl.textContent = formatCurrency(totalReturnVal);
    
    const invoice = window.currentPurchaseReturnInvoice;
    if (!invoice) return;
    
    const settlementInfo = document.getElementById('pr-settlement-info');
    const cashOptions = document.getElementById('pr-cash-options');
    const accSelection = document.getElementById('pr-account-selection');
    if (!settlementInfo) return;
    
    if (totalReturnVal <= 0) {
        settlementInfo.innerHTML = '<span class="text-gray-600">يرجى تحديد الكميات المراد إرجاعها أعلاه.</span>';
        if (cashOptions) cashOptions.classList.add('hidden');
        if (accSelection) accSelection.classList.add('hidden');
        return;
    }
    
    // Check if invoice has live remaining balance in liabilities (prevents phantom loss if supplier debt was already paid)
    const remainingBalance = getLivePurchaseReturnRemainingBalance(invoice);
    if (remainingBalance > 0.001) {
        if (totalReturnVal <= remainingBalance) {
            settlementInfo.innerHTML = `<span class="text-emerald-700 font-bold"><i class="fas fa-check-circle ml-1"></i> سيتم خصم <b>${formatCurrency(totalReturnVal)}</b> بالكامل من المتبقي للمورد في هذه الفاتورة (لن يتطلب استرداد نقدي).</span>`;
            if (cashOptions) cashOptions.classList.add('hidden');
            if (accSelection) accSelection.classList.add('hidden');
        } else {
            const cashToRefund = totalReturnVal - remainingBalance;
            settlementInfo.innerHTML = `<span class="text-amber-800 font-bold"><i class="fas fa-info-circle ml-1"></i> سيتم إطفاء كامل المتبقي للمورد (<b>${formatCurrency(remainingBalance)}</b>).<br>والمتبقي <b>${formatCurrency(cashToRefund)}</b> يتم استرداده من المورد:</span>`;
            if (cashOptions) cashOptions.classList.remove('hidden');
            checkCashOptions();
        }
    } else {
        settlementInfo.innerHTML = `<span class="text-blue-800 font-bold"><i class="fas fa-info-circle ml-1"></i> هذه الفاتورة مدفوعة بالكامل. سيتم استرداد كامل قيمة المرتجع <b>${formatCurrency(totalReturnVal)}</b>:</span>`;
        if (cashOptions) cashOptions.classList.remove('hidden');
        checkCashOptions();
    }
}
window.updatePurchaseReturnTotals = updatePurchaseReturnTotals;

function checkCashOptions() {
    const methodEl = document.getElementById('pr-refund-method');
    const method = methodEl ? methodEl.value : 'safe';
    const accSelection = document.getElementById('pr-account-selection');
    if (accSelection) {
        if (method === 'safe') {
            accSelection.classList.remove('hidden');
        } else {
            accSelection.classList.add('hidden');
        }
    }
}
window.checkCashOptions = checkCashOptions;

window.confirmPurchaseReturn = async function() {
    if (window._isConfirmingPurchaseReturn) return;
    window._isConfirmingPurchaseReturn = true;
    try {
        const invIdInput = document.getElementById('pr-invoice-id');
        const invoiceId = invIdInput ? invIdInput.value : '';
        let invoice = window.currentPurchaseReturnInvoice;
        if (!invoice && invoiceId && typeof purchaseInvoices !== 'undefined' && Array.isArray(purchaseInvoices)) {
            invoice = purchaseInvoices.find(inv => inv.id === invoiceId);
        }
        if (!invoice) {
            if (typeof showGlobalMessage === 'function') showGlobalMessage("لم يتم العثور على الفاتورة المحددة للمرتجع.", true);
            else alert("لم يتم العثور على الفاتورة المحددة للمرتجع.");
            return;
        }
        
        let totalReturnVal = 0;
        let itemsReturned = [];
        
        let stockShortageError = null;
        let qtyExceededError = null;
        document.querySelectorAll('.pr-return-qty-input').forEach(input => {
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                const index = parseInt(input.getAttribute('data-index'));
                const price = (typeof parseFloatSafe === 'function') ? parseFloatSafe(input.getAttribute('data-price')) : (parseFloat(input.getAttribute('data-price')) || 0);
                totalReturnVal = (typeof window.money === 'function' ? window.money : Number)(totalReturnVal + (qty * price));
                
                const item = (invoice.items && invoice.items[index]) ? invoice.items[index] : null;
                if (item) {
                    const maxReturnable = Math.max(0, (Number(item.quantity) || 0) - (Number(item.returnedQuantity) || 0));
                    if (qty > maxReturnable) {
                        qtyExceededError = `الكمية المرتجعة (${qty}) للصنف "${item.name}" تتجاوز المتبقي القابل للإرجاع في الفاتورة (${maxReturnable}).`;
                    }
                    const stockProd = findMatchingStockProductForReturn(item, qty);
                    const availableStock = stockProd ? (Number(stockProd.quantity) || 0) : 0;
                    if (!stockProd || availableStock < qty) {
                        stockShortageError = `الكمية المتاحة في المخزون للصنف "${item.name}" (${availableStock}) لا تكفي لإرجاع ${qty} قطعة للمورد.`;
                    }
                    itemsReturned.push({
                        ...item,
                        returnedQty: qty,
                        returnUnitPrice: price,
                        returnValue: (typeof window.money === 'function' ? window.money : Number)(qty * price),
                        itemIndex: index
                    });
                }
            }
        });

        if (qtyExceededError) {
            if (typeof showGlobalMessage === 'function') showGlobalMessage(qtyExceededError, true);
            else alert(qtyExceededError);
            return;
        }
        if (stockShortageError) {
            if (typeof showGlobalMessage === 'function') showGlobalMessage(stockShortageError, true);
            else alert(stockShortageError);
            return;
        }
        
        if (totalReturnVal <= 0 || itemsReturned.length === 0) {
            if (typeof showGlobalMessage === 'function') showGlobalMessage("يرجى تحديد كمية صنف واحد على الأقل للإرجاع (أكبر من صفر).", true);
            else alert("يرجى تحديد كمية صنف واحد على الأقل للإرجاع (أكبر من صفر).");
            return;
        }
        
        if (typeof saveStateToHistory === 'function') saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        
        try {
            const remainingBalance = getLivePurchaseReturnRemainingBalance(invoice);
            invoice.remainingBalance = remainingBalance;
            let cashToRefund = 0;
            let appliedToDebt = 0;
            
            if (remainingBalance > 0.001) {
                if (totalReturnVal <= remainingBalance) {
                    appliedToDebt = totalReturnVal;
                    invoice.remainingBalance = window.money ? window.money(remainingBalance - appliedToDebt) : Math.max(0, remainingBalance - appliedToDebt);
                } else {
                    appliedToDebt = remainingBalance;
                    invoice.remainingBalance = 0;
                    cashToRefund = totalReturnVal - remainingBalance;
                }
            } else {
                cashToRefund = totalReturnVal;
            }
            
            // 1. خصم من التزام/التزامات المورد النشطة للفاتورة (يدعم الالتزامات المجزأة/المحولة ويمنع المساس بالتزامات المصاريف الإضافية)
            if (appliedToDebt > 0) {
                if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                    let remDebtToApply = appliedToDebt;
                    const activeInvLiabs = liabilities.filter(l => l.purchaseInvoiceId === invoice.id && l.source !== 'purchase_extra_cost' && (Number(l.amount) || 0) > 0.001);
                    for (const invLiability of activeInvLiabs) {
                        if (remDebtToApply <= 0.001) break;
                        const liveAmt = Number(invLiability.amount) || 0;
                        const deduct = window.money ? window.money(Math.min(liveAmt, remDebtToApply)) : Math.min(liveAmt, remDebtToApply);
                        invLiability.amount = window.money ? window.money(Math.max(0, liveAmt - deduct)) : Math.max(0, liveAmt - deduct);
                        remDebtToApply = window.money ? window.money(Math.max(0, remDebtToApply - deduct)) : Math.max(0, remDebtToApply - deduct);
                        if (invLiability.amount <= 0.001) {
                            invLiability.amount = 0;
                            invLiability.status = 'paid';
                        }
                    }
                }
                if (invoice.supplierId && typeof suppliers !== 'undefined' && Array.isArray(suppliers)) {
                    const supplier = suppliers.find(s => s.id === invoice.supplierId);
                    if (supplier && supplier.balance !== undefined) {
                        supplier.balance = window.money ? window.money(Math.max(0, parseFloat(supplier.balance) - appliedToDebt)) : Math.max(0, parseFloat(supplier.balance) - appliedToDebt);
                    }
                }
            }
            
            // 2. معالجة الاسترداد النقدي أو الآجل
            let settlementDescription = '';
            if (cashToRefund > 0) {
                const methodEl = document.getElementById('pr-refund-method');
                const method = methodEl ? methodEl.value : 'safe';
                
                if (method === 'safe') {
                    const accId = document.getElementById('pr-refund-account') ? document.getElementById('pr-refund-account').value : '';
                    let account = (typeof accounts !== 'undefined' && Array.isArray(accounts)) ? accounts.find(a => a.id === accId) : null;
                    if (!account && typeof accounts !== 'undefined' && Array.isArray(accounts) && accounts.length > 0) {
                        account = accounts[0];
                    }
                    if (!account) {
                        if (_tx) await _tx.rollback();
                        if (typeof showGlobalMessage === 'function') showGlobalMessage("لا يوجد حساب خزينة متاح لاستلام المبلغ المسترد. يرجى إضافة خزينة أولاً أو اختيار التسوية كدين على المورد.", true);
                        else alert("لا يوجد حساب خزينة متاح لاستلام المبلغ المسترد.");
                        return;
                    }
                    account.balance = window.money ? window.money(parseFloat(account.balance) + cashToRefund) : (parseFloat(account.balance) + cashToRefund);
                    const newTotalLiquidity = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
                    if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                        liquidityLog.push({
                            id: (typeof generateId === 'function') ? generateId("liq-pr") : ('liq-' + Date.now()),
                            timestamp: new Date().toISOString(),
                            type: "add",
                            amount: cashToRefund,
                            description: `استرداد نقدي من مرتجع مشتريات - فاتورة ${invoice.invoiceNumber || invoice.id}`,
                            accountId: account.id,
                            currentBalance: newTotalLiquidity
                        });
                    }
                    settlementDescription = `استرداد نقدي إلى حساب "${account.name}" بقيمة ${formatCurrency(cashToRefund)}`;
                } else if (method === 'debt') {
                    // دين على المورد لصالحنا
                    const supplier = (typeof suppliers !== 'undefined' && Array.isArray(suppliers)) ? suppliers.find(s => s.id === invoice.supplierId) : null;
                    const debtorName = supplier ? supplier.name : (invoice.supplierName || "مورد غير محدد");
                    
                    let profile = null;
                    if (typeof debtorProfiles !== 'undefined' && Array.isArray(debtorProfiles)) {
                        profile = debtorProfiles.find(p => normalizeArabicText(p.name) === normalizeArabicText(debtorName));
                        if (!profile) {
                            profile = { id: (typeof generateId === 'function') ? generateId("dp") : ('dp-' + Date.now()), name: debtorName, phone: '', address: '', notes: '' };
                            debtorProfiles.push(profile);
                        }
                    }
                    
                    const debtReason = `متبقي مرتجع فاتورة مشتريات رقم ${invoice.invoiceNumber || invoice.id}`;
                    const newDebt = {
                        id: (typeof generateId === 'function') ? generateId("debt") : ('debt-' + Date.now()),
                        customerId: profile ? profile.id : undefined,
                        name: debtorName,
                        amount: cashToRefund,
                        reason: debtReason,
                        note: debtReason,
                        date: typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toISOString().split('T')[0],
                        createdAt: new Date().toISOString(),
                        type: 'debt',
                        origin: 'purchase_return'
                    };
                    if (typeof debtors !== 'undefined' && Array.isArray(debtors)) {
                        debtors.push(newDebt);
                    }
                    settlementDescription = `تسجيل دين على المورد "${debtorName}" بقيمة ${formatCurrency(cashToRefund)}`;
                }
                
                // تحديث المبلغ المدفوع الفعلي في الفاتورة بعد الاسترداد
                invoice.paidAmount = window.money ? window.money(Math.max(0, (Number(invoice.paidAmount) || 0) - cashToRefund)) : Math.max(0, (Number(invoice.paidAmount) || 0) - cashToRefund);
            }
            
            // 3. خصم الكميات المرتجعة من المخزون مع تسوية فروق التكاليف الإضافية بدقة لمنع أي تضخم أو نقصان غير مفسّر في رأس المال
            let totalExtraCostLoss = 0;
            let totalReturnCostGain = 0;
            const moneyFn = (typeof window.money === 'function') ? window.money : Number;

            itemsReturned.forEach(ret => {
                const retQty = Number(ret.returnedQty) || 0;
                const product = findMatchingStockProductForReturn(ret, retQty);
                
                if (product) {
                    const oldQty = Number(product.quantity) || 0;
                    const oldCost = Number(product.costPrice) || 0;
                    const rawRetUnit = ret.returnUnitPrice !== undefined ? ret.returnUnitPrice : (ret.cost !== undefined ? ret.cost : ret.costPrice);
                    const retUnitCost = (rawRetUnit !== undefined && rawRetUnit !== null && rawRetUnit !== '' && Number.isFinite(Number(rawRetUnit))) ? Number(rawRetUnit) : oldCost;
                    const remQty = Math.max(0, oldQty - retQty);
                    const oldTotalVal = oldQty * oldCost;
                    const retTotalVal = retQty * retUnitCost;
                    const remVal = oldTotalVal - retTotalVal;

                    // عكس تكلفة الدفعة المرتجعة من متوسط التكلفة المرجح للحفاظ على تطابق رأس المال
                    if (remQty > 0) {
                        if (remVal >= 0) {
                            product.costPrice = Math.round((remVal / remQty) * 1e6) / 1e6;
                        } else {
                            // إذا كان الاسترداد أكبر من القيمة الدفترية المتبقية: نصفّر تكلفة الباقي ونسجل الفارق الصافي كربح تسوية لمنع تضخم غير مفسّر
                            product.costPrice = 0;
                            totalReturnCostGain = moneyFn(totalReturnCostGain + Math.abs(remVal));
                        }
                    } else {
                        // إرجاع آخر قطعة بالمخزون: أي فارق بين القيمة الدفترية (بما فيها المصاريف الإضافية كالشحن) والمبلغ المسترد من المورد يُسجَّل بوضوح
                        if (remVal > 0.009) {
                            totalExtraCostLoss = moneyFn(totalExtraCostLoss + remVal);
                        } else if (remVal < -0.009) {
                            totalReturnCostGain = moneyFn(totalReturnCostGain + Math.abs(remVal));
                        }
                    }
                    product.quantity = remQty;
                }
                
                // تحديث الكمية المرتجعة داخل بند الفاتورة
                if (invoice.items && invoice.items[ret.itemIndex]) {
                    invoice.items[ret.itemIndex].returnedQuantity = (Number(invoice.items[ret.itemIndex].returnedQuantity) || 0) + ret.returnedQty;
                }
                
                // تحديث حالة السيريالات المرتجعة (البحث عن السيريالات المتاحة in_stock لتجنب التكرار في المرتجعات الجزئية)
                if (ret.serials && Array.isArray(ret.serials) && ret.serials.length > 0 && typeof serialNumbersLog !== 'undefined' && Array.isArray(serialNumbersLog)) {
                    let remainingSerialsToReturn = Number(ret.returnedQty) || 0;
                    for (let i = 0; i < ret.serials.length && remainingSerialsToReturn > 0; i++) {
                        const serialCode = ret.serials[i];
                        const snEntry = serialNumbersLog.find(sn => sn.serial === serialCode && sn.status === 'in_stock');
                        if (snEntry) {
                            snEntry.status = 'returned';
                            snEntry.returnedTimestamp = new Date().toISOString();
                            snEntry.returnReason = `مرتجع للمورد - فاتورة ${invoice.invoiceNumber || invoice.id}`;
                            remainingSerialsToReturn--;
                        }
                    }
                }
            });

            if (totalExtraCostLoss > 0.009) {
                if (typeof recordedLosses !== 'undefined') {
                    recordedLosses = moneyFn((Number(recordedLosses) || 0) + totalExtraCostLoss);
                }
                if (typeof logOperation === 'function') {
                    logOperation("خسارة تكاليف إضافية (مرتجع مشتريات)", `تسجيل فرق تكاليف إضافية غير مستردة (مثل الشحن/المصاريف الموزعة) بقيمة ${formatCurrency(totalExtraCostLoss)} عند إرجاع أصناف فاتورة ${invoice.invoiceNumber || invoice.id}.`);
                }
            }
            if (totalReturnCostGain > 0.009) {
                if (typeof totalProfit !== 'undefined') {
                    totalProfit = moneyFn((Number(totalProfit) || 0) + totalReturnCostGain);
                }
                if (typeof logOperation === 'function') {
                    logOperation("تسوية فرق تكلفة مرتجع مشتريات", `تسجيل فرق تكلفة إيجابي بقيمة ${formatCurrency(totalReturnCostGain)} على فاتورة ${invoice.invoiceNumber || invoice.id}.`);
                }
            }
            
            // 4. فحص هل تم إرجاع كامل الفاتورة
            const allItemsReturned = (invoice.items || []).every(item => (Number(item.returnedQuantity) || 0) >= Number(item.quantity));
            if (allItemsReturned) {
                invoice.returnStatus = 'fully_returned';
            } else {
                invoice.returnStatus = 'partially_returned';
            }
            
            // 5. تسجيل المرتجع في سجل purchaseReturns
            const newReturnRecord = {
                id: (typeof generateId === 'function') ? generateId("pr") : ('pr-' + Date.now()),
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber || '',
                supplierId: invoice.supplierId,
                date: new Date().toISOString(),
                totalValue: totalReturnVal,
                appliedToDebt: appliedToDebt,
                cashRefunded: cashToRefund,
                items: itemsReturned.map(i => ({
                    id: i.id || '',
                    name: i.name,
                    qty: i.returnedQty,
                    price: Number(i.cost !== undefined ? i.cost : i.costPrice) || 0
                }))
            };
            
            if (typeof purchaseReturns !== 'undefined' && Array.isArray(purchaseReturns)) {
                purchaseReturns.push(newReturnRecord);
            }
            
            // 6. تسجيل في سجل العمليات
            if (typeof logOperation === 'function') {
                const supplier = (typeof suppliers !== 'undefined' && Array.isArray(suppliers)) ? suppliers.find(s => s.id === invoice.supplierId) : null;
                const supName = supplier ? supplier.name : (invoice.supplierName || 'غير محدد');
                const itemsSummary = itemsReturned.map(i => `${i.returnedQty}x ${i.name}`).join('، ');
                logOperation("مرتجع مشتريات", `مرتجع للمورد "${supName}" بقيمة ${formatCurrency(totalReturnVal)} (${itemsSummary}). ${settlementDescription}`);
            }
            
            if (_tx) _tx.commit();
            
            // 7. إغلاق المودال وتحديث الواجهة والحفظ
            window.closePurchaseReturnModal();
            if (typeof updateUI === 'function') updateUI();
            if (typeof window.renderSupplierPurchasesReturnList === 'function') window.renderSupplierPurchasesReturnList();
            if (typeof window.renderCompletedPurchaseReturns === 'function') window.renderCompletedPurchaseReturns();
            if (typeof showGlobalMessage === 'function') {
                showGlobalMessage(`تم إتمام مرتجع المشتريات للمورد بقيمة ${formatCurrency(totalReturnVal)} بنجاح.`);
            }
            if (typeof updatePurchaseArchiveInCloud === 'function') {
                updatePurchaseArchiveInCloud(invoice).catch(e => console.warn("Purchase archive update error after return:", e));
            }
            if (typeof saveSystemToCloud === 'function') {
                saveSystemToCloud().catch(e => console.error("Cloud save error after purchase return:", e));
            }
        } catch(err) {
            if (_tx) await _tx.rollback();
            console.error("Error executing purchase return:", err);
            if (typeof showGlobalMessage === 'function') showGlobalMessage("حدث خطأ أثناء تنفيذ المرتجع.", true);
            else alert("حدث خطأ أثناء تنفيذ المرتجع.");
        }
    } finally {
        window._isConfirmingPurchaseReturn = false;
    }
};

window.lookupCustomerInvoices = async function() {
    const custName = document.getElementById('ex_customer_name').value.trim();
    if(!custName) return alert('يرجى إدخال اسم العميل أولاً للبحث عن فواتيره');
    
    let results = [];
    const lowerName = custName.toLowerCase();
    
    if(window.salesToday) {
        results = results.concat(window.salesToday.filter(s => s.customerName && s.customerName.toLowerCase().includes(lowerName)));
    }
    if(window.invoices) {
        results = results.concat(window.invoices.filter(s => s.customerName && s.customerName.toLowerCase().includes(lowerName)));
    }
    
    // Search Firestore
    if(window.db && window.currentUser && window.currentUser.uid) {
        try {
            const q = window.query(
                window.collection(window.db, "users", window.currentUser.uid, "invoices"),
                window.where("customerName", ">=", custName),
                window.where("customerName", "<=", custName + "\uf8ff")
            );
            const querySnapshot = await window.getDocs(q);
            querySnapshot.forEach(doc => {
                results.push(doc.data());
            });
        } catch (e) {
            console.error("Firestore search error:", e);
        }
    }
    
    // إزالة المكرر
    const uniqueIds = new Set();
    results = results.filter(s => {
        if(uniqueIds.has(s.id)) return false;
        uniqueIds.add(s.id);
        return true;
    });

    let modal = document.getElementById('ex-invoice-lookup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ex-invoice-lookup-modal';
        modal.className = 'modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; padding:12px; overflow-y:auto; background:rgba(0,0,0,0.5); z-index:9999; display:none; justify-content:center; align-items:center; box-sizing:border-box;';
        document.body.appendChild(modal);
    }

    window._currentCustomerInvoices = results;
    window.selectInvoiceByIdForReturn = function(id) {
        const s = (window._currentCustomerInvoices || []).find(inv => String(inv.id) === String(id));
        if (s) selectInvoiceForReturn(s);
    };

    let tbody = results.length === 0 ? `<tr><td colspan="4" style="text-align:center;">لا توجد فواتير مطابقة</td></tr>` :
        results.map(s => `
            <tr>
                <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0;">${escapeHTML(s.invoiceNumber || s.id)}</td>
                <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0;">${escapeHTML(s.date || '')}</td>
                <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0;">${escapeHTML(s.productName || s.name)}</td>
                <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0;"><button data-sale-id="${escapeHTML(s.id)}" onclick="window.selectInvoiceByIdForReturn(this.dataset.saleId)" style="background:#3182ce; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">اختيار</button></td>
            </tr>
        `).join('');

    let html = `
    <div style="background:#fff; width:100%; max-width:600px; max-height:calc(100dvh - 24px); overflow-y:auto; border-radius:8px; padding:18px; text-align:right; box-sizing:border-box;" dir="rtl">
        <h3 style="margin-top:0; color:#2b6cb0;">فواتير العميل: ${escapeHTML(custName)}</h3>
        <div style="overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:20px;">
            <table style="width:100%; min-width:420px; border-collapse:collapse;">
                <thead>
                    <tr style="background:#edf2f7;">
                        <th style="padding:10px; border-bottom:2px solid #cbd5e0;">رقم الفاتورة</th>
                        <th style="padding:10px; border-bottom:2px solid #cbd5e0;">التاريخ</th>
                        <th style="padding:10px; border-bottom:2px solid #cbd5e0;">المنتج</th>
                        <th style="padding:10px; border-bottom:2px solid #cbd5e0;">إجراء</th>
                    </tr>
                </thead>
                <tbody>${tbody}</tbody>
            </table>
        </div>
        <div style="text-align:left;">
            <button onclick="document.getElementById('ex-invoice-lookup-modal').style.display='none'" style="background:#e53e3e; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">إغلاق</button>
        </div>
    </div>
    `;
    modal.innerHTML = html;
    modal.style.display = 'flex';
};

window.selectInvoiceForReturn = function(invoice) {
    if(!invoice || !invoice.items || invoice.items.length === 0) {
        document.getElementById('r_main_name').value = invoice.productName || invoice.name || '';
        document.getElementById('r_main_cost').value = invoice.cost || invoice.costPrice || 0;
        document.getElementById('r_main_price').value = invoice.sellPrice || invoice.price || 0;
    } else {
        document.getElementById('r_main_name').value = invoice.items[0].productName || invoice.items[0].name || '';
        document.getElementById('r_main_cost').value = invoice.items[0].cost || invoice.items[0].costPrice || 0;
        document.getElementById('r_main_price').value = invoice.items[0].price || invoice.items[0].unitPrice || 0;
        
        const accCont = document.getElementById('r_acc_container');
        if(accCont) accCont.innerHTML = '';
        
        for(let i=1; i<invoice.items.length; i++) {
            if (typeof addAccRow === 'function') {
                addAccRow('r');
                const rows = accCont.querySelectorAll('.r-acc-row');
                const newRow = rows[rows.length - 1];
                if(newRow) {
                    const nInput = newRow.querySelector('.acc-name');
                    const cInput = newRow.querySelector('.acc-cost');
                    const pInput = newRow.querySelector('.acc-price');
                    if(nInput) nInput.value = invoice.items[i].productName || invoice.items[i].name || '';
                    if(cInput) cInput.value = invoice.items[i].cost || invoice.items[i].costPrice || 0;
                    if(pInput) pInput.value = invoice.items[i].price || invoice.items[i].unitPrice || 0;
                }
            }
        }
    }
    
    document.getElementById('ex-invoice-lookup-modal').style.display='none';
    if(typeof runCalc === 'function') runCalc();
};
