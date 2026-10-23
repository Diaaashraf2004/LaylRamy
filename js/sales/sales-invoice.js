            function resetInvoiceForm() {
                window.pos_selectedProductInv = null;
                const alertBox = document.getElementById('pos_selected_alert_inv');
                if (alertBox) alertBox.className = "inv-selected-strip no-print";
                const nameDisplay = document.getElementById('pos_selected_name_inv');
                if (nameDisplay) nameDisplay.innerText = "لم يتم التحديد بعد";
                window.pos_currentCategoryInv = 'الكل';
                const searchInput = document.getElementById('pos_search_inv');
                if (searchInput) searchInput.value = '';
                if (typeof window.renderPOSInvGrid === 'function') window.renderPOSInvGrid();

                if (inv_invoiceForm) inv_invoiceForm.reset();
                if (inv_invoiceItemsBody) inv_invoiceItemsBody.innerHTML = '';
                if (inv_phoneNumbersContainer) {
                    inv_phoneNumbersContainer.innerHTML = '<div class="form-row inv-phone-entry"><div class="form-group"><label for="inv_phone1">رقم الهاتف:</label><input type="tel" id="inv_phone1" name="phone[]" placeholder="رقم الهاتف..."></div></div>';
                }
                inv_phoneCounter = 1;
                const vErr = inv_validationErrorDiv || document.getElementById('inv_validationError'); if (vErr) { vErr.innerHTML = ''; vErr.textContent = ''; vErr.className = 'error-message no-print mb-2'; vErr.style.display = 'none'; if (typeof showMessage === 'function') showMessage(vErr, ''); }
                if (inv_itemAddErrorDiv) { inv_itemAddErrorDiv.textContent = ''; inv_itemAddErrorDiv.classList.remove('visible','error'); }
                if (inv_serialSelectContainer) inv_serialSelectContainer.classList.add('hidden'); if (inv_serialSearchInput) inv_serialSearchInput.value = ''; const serialInput = document.getElementById('inv_itemSerialInput'); if (serialInput) serialInput.value = '';
                const costDisplay = document.getElementById('inv-cost-display'); if (costDisplay) costDisplay.classList.add('hidden');
                const nameInput = document.getElementById('inv_itemName'); if (nameInput) nameInput.value = '';
                const qtyInput = document.getElementById('inv_itemQty'); if (qtyInput) qtyInput.value = '1';
                const priceInput = document.getElementById('inv_itemPrice'); if (priceInput) { priceInput.value = ''; priceInput.placeholder = 'أدخل السعر...'; }
                const existingNote = inv_invoiceItemsBody?.parentNode?.querySelector('p.invoice-origin-note'); if (existingNote) existingNote.remove();
                const depositRow = document.getElementById('inv_deposit_info_row'); if (depositRow) depositRow.style.display = 'none';

                // إغلاق أكورديون التفاصيل الإضافية وتصفير الملحقات المستقطعة
                const extraAccordion = document.getElementById('inv_extra_details_accordion'); if (extraAccordion) extraAccordion.open = false;
                if (typeof inv_updateDeductibleCostsCheckboxes === 'function') inv_updateDeductibleCostsCheckboxes(true);

                // استعادة بيانات الاستقطاع المخفي للفاتورة
                const invDedToggle = document.getElementById('inv-deduction-toggle');
                const invDedAmount = document.getElementById('inv-deduction-amount');
                const invDedList = document.getElementById('inv-deduction-liability-name');
                if (invDedToggle && invDedAmount && invDedList) {
                    if (typeof pendingSaleOriginData !== 'undefined' && pendingSaleOriginData?.deductionAmount > 0) {
                        invDedToggle.checked = true; invDedToggle.dispatchEvent(new Event('change'));
                        invDedAmount.value = pendingSaleOriginData.deductionAmount;
                        invDedList.value = pendingSaleOriginData.deductionLiabilityName || '';
                    } else {
                        invDedToggle.checked = false; invDedToggle.dispatchEvent(new Event('change'));
                        invDedAmount.value = ''; invDedList.value = '';
                    }
                }
                const markPending = document.getElementById('inv_markAsPending'); if (markPending) markPending.checked = false;
                const shippingInput = document.getElementById('inv_shippingCost'); if (shippingInput) shippingInput.value = '0';
                const totalShippingDisplay = document.getElementById('inv_totalShippingCost'); if (totalShippingDisplay) totalShippingDisplay.innerText = '0.00 جنيه';
                const totalGoodsDisplay = document.getElementById('inv_totalGoodsPrice'); if (totalGoodsDisplay) totalGoodsDisplay.innerText = '0.00 جنيه';
                const grandTotalDisplay = document.getElementById('inv_grandTotalPrice'); if (grandTotalDisplay) grandTotalDisplay.innerText = '0.00 جنيه';
                const profitDisplay = document.getElementById('inv_expected_profit_display'); if (profitDisplay) profitDisplay.innerText = '0.00 ج.م';

                if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
            }
window.inv_addInvoiceItem = function inv_addInvoiceItem() {
    // تعريف حقول الإدخال الأساسية
    const nameInput = document.getElementById('inv_itemName');
    const qtyInput = document.getElementById('inv_itemQty');
    const priceInput = document.getElementById('inv_itemPrice');
    const errorDiv = document.getElementById('inv_itemAddError');
    const itemsBody = document.getElementById('inv_invoiceItemsBody');
    
    // --- التعديل الجديد: قراءة السيريال من حقل الكتابة الجديد ---
    const serialInput = document.getElementById('inv_itemSerialInput');
    const serialContainer = document.getElementById('inv_serialSelectContainer');
    
    if (!nameInput || !qtyInput || !priceInput || !itemsBody) return;

    const name = nameInput.value.trim();
    const qty = parseInt(qtyInput.value);
    const price = window.parseInputNumber(priceInput); // استخدام parseFloat مباشرة
    
    // قراءة قيمة السيريال (إذا كان الحقل موجوداً)
    const selectedSerial = serialInput ? serialInput.value.trim() : '';

    // تفريغ رسائل الخطأ السابقة
    if (errorDiv) {
        errorDiv.textContent = "";
        errorDiv.classList.remove('visible', 'error');
    }

    // 1. التحقق من البيانات الأساسية
    if (!name || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        if(errorDiv) {
            errorDiv.textContent = 'يرجى إدخال اسم البند وكمية (>0) وسعر (>=0) صحيحين.';
            errorDiv.classList.add('visible', 'error');
        }
        return;
    }

    // 2. التحقق من تكرار السيريال في نفس الفاتورة الحالية
    if (selectedSerial && itemsBody.querySelector(`tr[data-item-serial="${selectedSerial}"]`)) {
        if(errorDiv) {
            errorDiv.textContent = `الرقم التسلسلي "${selectedSerial}" تم إضافته بالفعل لهذه الفاتورة.`;
            errorDiv.classList.add('visible', 'error');
        }
        return;
    }
    
    // 3. التحقق من أن السيريال ليس مباعاً من قبل (فقط إذا كان مسجلاً في النظام)
    if (selectedSerial && typeof serialNumbersLog !== 'undefined') {
        const existingSerialLog = serialNumbersLog.find(s => s.serial === selectedSerial && s.productName === name);
        if (existingSerialLog && existingSerialLog.status === 'sold') {
             if(errorDiv) {
                errorDiv.textContent = `تنبيه: السيريال "${selectedSerial}" مسجل كمباع مسبقاً.`;
                errorDiv.classList.add('visible', 'error');
             }
             return;
        }
    }

    // 4. التحقق من توفر الكمية في المخزون    // 4. التحقق من وجود الصنف في المخزن وتغليب الصنف المتوفر
    let currentProduct = null;
    if (typeof products !== 'undefined') {
        const matches = products.filter(p => p.name.toLowerCase() === name.toLowerCase());
        currentProduct = matches.find(p => Number(p.quantity) > 0) || matches[0];
    }
    
    const availableQty = currentProduct ? (Number(currentProduct.quantity) || 0) : Infinity; 
    const currentCostPrice = currentProduct ? (Number(currentProduct.costPrice) || 0) : 0; 

    let alreadyAddedQty = 0;
    itemsBody.querySelectorAll('.invoice-item-row').forEach(row => {
        if (row.dataset.itemName.toLowerCase() === name.toLowerCase()) {
            alreadyAddedQty += parseInt(row.dataset.itemQty);
        }
    });

    const originReserved = (typeof inv_getOriginReservedQty === 'function') 
        ? inv_getOriginReservedQty(currentProduct ? (currentProduct.id || name) : name) 
        : 0;
    const effectiveAvailable = availableQty + originReserved;

    if (currentProduct && (qty + alreadyAddedQty) > effectiveAvailable) {
        if(errorDiv) {
            errorDiv.textContent = `الكمية الإجمالية المطلوبة غير متوفرة بالمخزون (المتاح: ${effectiveAvailable}).`;
            errorDiv.classList.add('visible', 'error');
        }
        return;
    }

    // 5. إضافة الصف إلى الجدول
    const subtotal = qty * price;
    const newRow = document.createElement('tr');
    newRow.classList.add('invoice-item-row');
    newRow.dataset.itemName = name;
    newRow.dataset.itemQty = qty;
    newRow.dataset.itemPrice = price.toFixed(2);
    newRow.dataset.itemSubtotal = subtotal.toFixed(2);
    newRow.dataset.itemCost = currentCostPrice.toFixed(2);
if (currentProduct) newRow.dataset.productId = currentProduct.id || ""; // حفر كود المنتج الفريد في صف الجدول
    // إضافة بيانات السيريال للصف
    if (selectedSerial && qty === 1) {
        newRow.dataset.itemSerial = selectedSerial;
        // حجز مؤقت في سجل السيريالات (إن وجد في النظام)
        if (typeof serialNumbersLog !== 'undefined') {
            const serialIndex = serialNumbersLog.findIndex(log => log.serial === selectedSerial);
            if (serialIndex !== -1) {
                serialNumbersLog[serialIndex].status = 'in_invoice_temp';
            }
        }
    }

    // تنسيق العملة (يمكنك استخدام دالة formatCurrency الخاصة بك بدلاً من هذا إذا كانت متاحة)
    const formatMoney = (amount) => typeof formatCurrency === 'function' ? formatCurrency(amount) : amount.toFixed(2);

    newRow.innerHTML = `
        <td class="item-name">
            ${name}
            ${selectedSerial && qty === 1 ? `<span class="serial-display no-print" style="display:block; font-size:0.8em; color:#666;">(S/N: ${selectedSerial})</span>` : ''}
        </td>
        <td class="item-qty" style="text-align:center;">
            <input type="number" class="row-qty-input" value="${qty}" min="1" style="width: 60px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;" ${selectedSerial && qty === 1 ? 'readonly title="لا يمكن تغيير الكمية لمنتج مسيرل"' : ''}>
        </td>
        <td class="item-price" style="text-align:center;">
            <input type="number" class="row-price-input" value="${price}" min="0" step="any" style="width: 80px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;">
        </td>
        <td class="item-subtotal" style="text-align:center; font-weight:bold;">${formatMoney(subtotal)}</td>
        <td class="no-print" style="text-align:center;"><button type="button" class="remove-item-btn" style="color:red; font-weight:bold; border:none; background:none; cursor:pointer;">×</button></td>
    `;
    itemsBody.appendChild(newRow);

    // 6. تنظيف الحقول وإعادة التعيين
    nameInput.value = '';
    qtyInput.value = '1';
    priceInput.value = '';
    
    // إخفاء وتفريغ حقل السيريال الجديد
    if (serialContainer) serialContainer.classList.add('hidden');
    if (serialInput) serialInput.value = ''; 
    
    nameInput.focus();
    
    // تحديث الإجماليات (تأكد أن دالة inv_calculateTotals موجودة لديك)
    if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
    if (typeof inv_updateDeductibleCostsCheckboxes === 'function') inv_updateDeductibleCostsCheckboxes();
}
function getInvoiceFormData() {
    return {
        customerName: inv_customerNameInput.value.trim(),
        customerAddress: inv_customerAddressInput ? inv_customerAddressInput.value.trim() : '',
        phones: inv_invoiceForm ? Array.from(inv_invoiceForm.querySelectorAll('input[name="phone[]"]')).map(i => i.value.trim()).filter(Boolean) : [],
        shippingCost: parseInputNumber(inv_shippingCostInput) || 0,
        warranty: inv_warrantyInput ? inv_warrantyInput.value.trim() : '',
        notes: inv_notesTextarea ? inv_notesTextarea.value.trim() : '',
        selectedAccountId: d('inv_payment_account').value,
        isPendingCheckbox: d('inv_markAsPending').checked,
        
        // تجميع البنود من الجدول
        items: inv_invoiceItemsBody ? Array.from(inv_invoiceItemsBody.querySelectorAll('.invoice-item-row')).map(row => ({
            name: row.dataset.itemName,
            quantity: parseInt(row.dataset.itemQty) || 0,
            unitPrice: window.parseFloatSafe ? window.parseFloatSafe(row.dataset.itemPrice) : (parseFloat(row.dataset.itemPrice) || 0),
            subtotal: window.parseFloatSafe ? window.parseFloatSafe(row.dataset.itemSubtotal) : (parseFloat(row.dataset.itemSubtotal) || 0),
            costPrice: window.parseFloatSafe ? window.parseFloatSafe(row.dataset.itemCost) : (parseFloat(row.dataset.itemCost) || 0),
            serial: row.dataset.itemSerial || null
        })) : []
    };
}

/**
 * ب. دالة الحسابات المالية (Financial Logic)
 * وظيفتها: حساب الإجماليات، والتعامل مع العربون، وتحديد المبلغ المطلوب تحصيله الآن
 */
function calculateInvoiceFinancials(items, shippingCost, isFromPending, originData) {
    const totalGoods = items.reduce((sum, item) => sum + item.subtotal, 0);
    const grandTotal = totalGoods + shippingCost;
    
    // --- منطق العربون الحساس ---
    let depositPaid = 0;
    if (isFromPending && originData && originData.depositPaid) {
        depositPaid = Number(originData.depositPaid) || 0;
    }

    // حساب المطلوب دفعه الآن (الإجمالي - العربون)
    let amountToCollect = grandTotal - depositPaid;
    if (amountToCollect < 0) amountToCollect = 0;

    return { 
        totalGoods, 
        grandTotal, 
        depositPaid, 
        amountToCollect 
    };
}
async function handleSaveInvoice(skipConfirmation = true) {
    if (window.isInvoiceSavingInProgress || window.isPostSaveCooldown) return;
    const saveBtn = document.getElementById('inv_saveInvoiceBtn');
    if (saveBtn && (saveBtn.disabled || saveBtn.dataset.saving === 'true')) return;
    if (!inv_validateForm()) return;
    window.isInvoiceSavingInProgress = true;
    if (saveBtn) {
        saveBtn.disabled = true; saveBtn.dataset.saving = 'true';
        saveBtn.dataset.originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    }
    const restoreSaveBtn = () => {
        window.isPostSaveCooldown = true;
        setTimeout(() => { window.isInvoiceSavingInProgress = false; window.isPostSaveCooldown = false; }, 1000);
        if (saveBtn) {
            saveBtn.disabled = false; saveBtn.dataset.saving = 'false';
            if (saveBtn.dataset.originalText) saveBtn.innerHTML = saveBtn.dataset.originalText;
        }
    };

    const isPending = d('inv_markAsPending').checked; 
    const selectedAccountId = d('inv_payment_account').value;
    const account = accounts.find(acc => acc.id === selectedAccountId);

    if (!isPending && !account) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage("الرجاء اختيار الخزنة (حساب الإيداع) أولاً قبل تأكيد الفاتورة.", true);
        showMessage(d('inv_validationError'), "يرجى اختيار حساب الإيداع.", true);
        restoreSaveBtn();
        return;
    }

    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
        const customerName = inv_customerNameInput.value.trim();
    const customerAddress = inv_customerAddressInput ? inv_customerAddressInput.value.trim() : '';
    const phones = inv_invoiceForm ? Array.from(inv_invoiceForm.querySelectorAll('input[name="phone[]"]')).map(input => input.value.trim()).filter(phone => phone) : [];
    
    const invoiceItems = inv_invoiceItemsBody ? Array.from(inv_invoiceItemsBody.querySelectorAll('.invoice-item-row')).map(row => {
        const qtyInput = row.querySelector('.row-qty-input');
        const priceInput = row.querySelector('.row-price-input');
        const qty = qtyInput ? (parseInt(qtyInput.value) || 0) : (parseInt(row.dataset.itemQty) || 0);
        const unitPrice = priceInput ? (window.parseFloatSafe ? window.parseFloatSafe(priceInput.value) : (parseFloat(priceInput.value) || 0)) : (window.parseFloatSafe ? window.parseFloatSafe(row.dataset.itemPrice) : (parseFloat(row.dataset.itemPrice) || 0));
        const subtotal = qty * unitPrice;
        const costPrice = window.parseFloatSafe ? window.parseFloatSafe(row.dataset.itemCost) : (parseFloat(row.dataset.itemCost) || 0);
        return {
            id: row.dataset.productId || null,
            name: row.dataset.itemName,
            quantity: qty,
            unitPrice: unitPrice,
            subtotal: subtotal,
            costPrice: costPrice,
            serial: row.dataset.itemSerial || null
        };
    }) : [];
    const shippingCost = parseInputNumber(inv_shippingCostInput) || 0;
    const warranty = inv_warrantyInput ? inv_warrantyInput.value.trim() : '';
    const notes = inv_notesTextarea ? inv_notesTextarea.value.trim() : '';
    
    const totalGoods = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
    const grandTotal = totalGoods + shippingCost; 

    let depositAlreadyPaid = 0;
    if ((isInvoiceFromPending || isEditingPendingInvoice) && pendingSaleOriginData && pendingSaleOriginData.depositPaid) {
        depositAlreadyPaid = Number(pendingSaleOriginData.depositPaid) || 0;
    }
    
    let amountToCollectNow = grandTotal - depositAlreadyPaid;
    if (amountToCollectNow < 0) amountToCollectNow = 0; 

    let totalInvoiceCost = 0;
    let deductedItemsData = [];
    let quantitiesToDeduct = {}; 

    invoiceItems.forEach(item => {
        totalInvoiceCost += (item.costPrice * item.quantity);
        quantitiesToDeduct[item.id || item.name] = (quantitiesToDeduct[item.id || item.name] || 0) + item.quantity;
    });

    let hasDOMDeductions = false;
    if (inv_deductibleCostsContainer) {
        const checkedBoxes = inv_deductibleCostsContainer.querySelectorAll('input[type="checkbox"]:checked');
        if (checkedBoxes.length > 0) {
            hasDOMDeductions = true;
            checkedBoxes.forEach(checkbox => {
                const name = checkbox.value, cost = parseFloat(checkbox.dataset.cost) || 0;
                const parentLabel = checkbox.parentElement;
                const quantityInput = parentLabel ? parentLabel.querySelector('.inv-deducted-item-quantity') : null;
                const qtyToDeduct = parseInt(quantityInput?.value || '0');
                if (qtyToDeduct > 0) {
                    const itemId = checkbox.dataset.id || name, displayName = checkbox.dataset.name || name;
                    deductedItemsData.push({ id: itemId, name: displayName, quantity: qtyToDeduct, costPrice: cost });
                    totalInvoiceCost += (cost * qtyToDeduct);
                    quantitiesToDeduct[itemId] = (quantitiesToDeduct[itemId] || 0) + qtyToDeduct;
                }
            });
        }
    }
    if (!hasDOMDeductions && isInvoiceFromPending && pendingSaleOriginData) {
        const prevDeducted = (pendingSaleOriginData.invoiceData && pendingSaleOriginData.invoiceData.deductedItems) 
                             ? pendingSaleOriginData.invoiceData.deductedItems 
                             : (pendingSaleOriginData.deductedItems || (!pendingSaleOriginData.mainProduct && pendingSaleOriginData.additionalItems) || []);
        prevDeducted.forEach(item => {
            const cost = Number(item.costPrice || item.cost || 0), qty = Number(item.quantity || 1);
            totalInvoiceCost += (cost * qty);
            deductedItemsData.push(item);
            quantitiesToDeduct[item.id || item.name] = (quantitiesToDeduct[item.id || item.name] || 0) + qty;
        });
    }

    const finalInvoiceProfit = totalGoods - totalInvoiceCost;
    
    let invoiceDeductionData = null;
    let netInvoiceProfit = finalInvoiceProfit;
    if (typeof getDeductionData === 'function') {
        invoiceDeductionData = getDeductionData('invoice');
        if (invoiceDeductionData && invoiceDeductionData.error) {
            restoreSaveBtn();
            return;
        }
        if (invoiceDeductionData && invoiceDeductionData.amount > 0) {
            netInvoiceProfit -= invoiceDeductionData.amount;
        }
    }

    if (!skipConfirmation) {
        window.showConfirmSaleModal(netInvoiceProfit, () => {
            window.isInvoiceSavingInProgress = false; window.isPostSaveCooldown = false;
            handleSaveInvoice(true);
        });
        restoreSaveBtn();
        return;
    }

    saveStateToHistory(); 

    // تخطيط وتنفيذ حركات المخزون عبر sales-invoice-stock.js
    const itemsToDeductList = Object.entries(quantitiesToDeduct).map(([key, q]) => ({ id: key, name: key, quantity: q }));
    const stockOrigin = (isInvoiceFromPending || isEditingPendingInvoice) ? pendingSaleOriginData : null; // حماية إرجاع المخزون: (!pendingSaleOriginData.deductedItems || pendingSaleOriginData.deductedItems !== pendingSaleOriginData.additionalItems)
    const stockPlan = (typeof planInvoiceStockChanges === 'function') 
        ? planInvoiceStockChanges(products, itemsToDeductList, stockOrigin)
        : { valid: true, changes: [] };

    if (!stockPlan.valid) {
        restoreSaveBtn();
        const errDiv = d('inv_validationError') || globalMessage;
        if (typeof showMessage === 'function') showMessage(errDiv, stockPlan.error || "المخزون المتاح غير كافٍ.", true);
        return;
    }

    if (typeof executeInvoiceStockChanges === 'function') {
        executeInvoiceStockChanges(products, stockPlan.changes);
    }

    if (isPending) {
        invoiceItems.forEach(it => {
            if (it.serial && typeof serialNumbersLog !== 'undefined' && Array.isArray(serialNumbersLog)) {
                const sIdx = serialNumbersLog.findIndex(log => log.serial === it.serial);
                if (sIdx !== -1) serialNumbersLog[sIdx].status = 'pending_sale';
            }
        });
        const prevHist = Array.isArray(pendingSaleOriginData?.editHistory) ? [...pendingSaleOriginData.editHistory] : [];
        if (isInvoiceFromPending || isEditingPendingInvoice) prevHist.push({ date: new Date().toISOString(), type: 'تعديل فاتورة' });
        const pendingInvoiceData = {
            id: (isInvoiceFromPending || isEditingPendingInvoice) && pendingSaleOriginData ? pendingSaleOriginData.id : `pending-inv-${Date.now()}`,
            createdAt: pendingSaleOriginData?.createdAt || pendingSaleOriginData?.timestamp || new Date().toISOString(),
            timestamp: new Date().toISOString(),
            saleDate: pendingSaleOriginData?.saleDate || currentLoadedDate || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
            customerName,
            customerAddress,
            phones,
            items: invoiceItems,
            shippingCost,
            warranty,
            notes,
            deductedItems: deductedItemsData,
            totalSellPrice: grandTotal,
            totalCost: totalInvoiceCost,
            potentialProfit: netInvoiceProfit,
            depositPaid: depositAlreadyPaid,
            depositHistory: pendingSaleOriginData?.depositHistory || [],
            editHistory: prevHist,
            status: 'pending',
            deductionAmount: invoiceDeductionData ? invoiceDeductionData.amount : 0,
            deductionLiabilityName: invoiceDeductionData ? invoiceDeductionData.liabilityName : '',
            invoiceData: {
                customerAddress,
                phones,
                warranty,
                notes,
                deductedItems: deductedItemsData
            }
        };

        if ((isInvoiceFromPending || isEditingPendingInvoice) && pendingSaleOriginData && pendingSaleOriginData.id) {
            const idx = pendingSales.findIndex(s => String(s.id).trim() === String(pendingSaleOriginData.id).trim());
            if (idx !== -1) pendingSales.splice(idx, 1);
        }

        pendingSales.push(pendingInvoiceData);
        const opType = (isInvoiceFromPending || isEditingPendingInvoice) ? "تعديل فاتورة مبيعات مؤقتة" : "فاتورة مبيعات مؤقتة";
        logOperation(opType, `تم حفظ فاتورة مفصلة مؤقتة للعميل ${customerName} بقيمة ${formatCurrency(grandTotal)}.`);
        showMessage(globalMessage, "تم حفظ الفاتورة في قائمة المبيعات المؤقتة بنجاح.", false);
    } else {
        if (amountToCollectNow > 0) {
            account.balance = window.money(account.balance + amountToCollectNow);
            const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
            
            let logDesc = `فاتورة مبيعات ${customerName}`;
            if (depositAlreadyPaid > 0) {
                logDesc = `استلام باقي فاتورة ${customerName} (إجمالي: ${grandTotal} - عربون: ${depositAlreadyPaid})`;
            }

            liquidityLog.push({ 
                id: generateId("liq"), 
                timestamp: new Date().toISOString(), 
                type: "add", 
                amount: amountToCollectNow, 
                description: logDesc, 
                currentBalance: newTotalLiquidity,
                accountId: selectedAccountId
            });
        }

        invoiceItems.forEach(item => {
            if (item.serial) {
                const idx = serialNumbersLog.findIndex(log => log.serial === item.serial);
                if (idx !== -1) serialNumbersLog[idx].status = 'sold';
            }
        });

        totalProfit = window.money(totalProfit + (typeof netInvoiceProfit !== "undefined" ? netInvoiceProfit : finalInvoiceProfit));

        if ((isInvoiceFromPending || isEditingPendingInvoice) && pendingSaleOriginData && pendingSaleOriginData.id) {
            const idx = pendingSales.findIndex(s => String(s.id).trim() === String(pendingSaleOriginData.id).trim());
            if (idx !== -1) pendingSales.splice(idx, 1);
        }

        const todayStr = currentLoadedDate ? currentLoadedDate.replace(/-/g, '') : getTodayDateString().replace(/-/g, '');
        let maxSeq = 0;
        salesToday.forEach(sale => {
            if (sale.invoiceNumber && sale.invoiceNumber.startsWith(todayStr)) {
                const seq = parseInt(sale.invoiceNumber.split('-')[1] || '0');
                if (seq > maxSeq) maxSeq = seq;
            }
        });
        const generatedInvoiceNumber = `${todayStr}-${(maxSeq + 1).toString().padStart(3, '0')}`;

        // Editing a pending sale, or confirming it to a new one -> ALWAYS keep original date
        let originalSaleDate =
            pendingSaleOriginData?.saleDate ||
            (pendingSaleOriginData?.createdAt ? (typeof getCairoDateString === 'function' ? getCairoDateString(pendingSaleOriginData.createdAt) : new Date(pendingSaleOriginData.createdAt).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : null) ||
            (pendingSaleOriginData?.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(pendingSaleOriginData.timestamp) : new Date(pendingSaleOriginData.timestamp).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : null) ||
            currentLoadedDate ||
            getTodayDateString();

        const invoiceRecord = {
            id: isInvoiceFromPending && pendingSaleOriginData ? pendingSaleOriginData.id.replace('pending','inv') : `inv-${Date.now()}`,
            invoiceNumber: generatedInvoiceNumber,
            type: 'invoice',
            timestamp: new Date().toISOString(), // وقت التأكيد
            confirmedAt: new Date().toISOString(),
            createdAt: pendingSaleOriginData?.createdAt || pendingSaleOriginData?.timestamp || new Date().toISOString(), // التاريخ الأصلي الحقيقي
            saleDate: originalSaleDate,
            customerName,
            customerAddress,
            phones,
            items: invoiceItems,
            shippingCost,
            totalGoodsPrice: totalGoods,
            grandTotal,
            paidAmount: grandTotal,
            depositPaid: depositAlreadyPaid,
            warranty,
            notes,
            deductedItems: deductedItemsData,
            totalCost: totalInvoiceCost,
            profit: netInvoiceProfit,
            deductionAmount: invoiceDeductionData?.amount || 0,
            deductionLiabilityName: invoiceDeductionData?.liabilityName || '',
            accountId: selectedAccountId
        };
        if (invoiceDeductionData && invoiceDeductionData.amount > 0 && typeof applyDeduction === 'function') {
            applyDeduction(invoiceDeductionData, invoiceRecord);
        }
        
        if (isInvoiceFromPending) { invoiceRecord.confirmedAt = new Date().toISOString(); }
        salesToday.push(invoiceRecord);
        await saveInvoiceToFirestore(invoiceRecord); 
        if (_tx && typeof _tx.addRollbackAction === 'function') {
            _tx.addRollbackAction(async () => {
                try {
                    if (window.db && window.currentUser && invoiceRecord && invoiceRecord.id) {
                        const invDocRef = window.doc(window.db, "users", window.currentUser.uid, "invoices", invoiceRecord.id);
                        if (typeof window.deleteDoc === 'function') {
                            await window.deleteDoc(invDocRef);
                            console.log(`[Transaction Rollback] تم إلغاء وحذف الفاتورة ${invoiceRecord.id} من السحابة.`);
                        }
                    }
                } catch (delErr) {
                    console.error("فشل حذف الفاتورة من السحابة أثناء التراجع:", delErr);
                }
            });
        }
        const invOpType = (isInvoiceFromPending || isEditingPendingInvoice) ? "تأكيد بيع مؤقت وفاتورة" : "فاتورة مبيعات";
        logOperation(invOpType, `فاتورة ${generatedInvoiceNumber} للعميل ${customerName}. (إجمالي: ${formatCurrency(grandTotal)})`);
        
        let successMsg = `تم حفظ الفاتورة بنجاح.`;
        if (depositAlreadyPaid > 0) {
            successMsg += ` تم خصم العربون (${depositAlreadyPaid}) وإضافة الباقي (${amountToCollectNow}) للخزنة.`;
        }
        showMessage(globalMessage, successMsg, false);
    }

    const wasPending = isInvoiceFromPending || isEditingPendingInvoice;
    const isPendingSave = isPending;
    isInvoiceFromPending = false; isEditingPendingInvoice = false; pendingSaleOriginData = null;
    updateUI();
    inv_closeModal();
    if (isPendingSave && typeof window.switchSalesTab === 'function') window.switchSalesTab('pending');
    if (typeof saveCurrentStateByDate === 'function') { await saveCurrentStateByDate(currentLoadedDate || (typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })))); }
    if (!isPendingSave) window.showPostSaleModal('invoice', wasPending);
    restoreSaveBtn();
    } catch (invErr) {
        if (_tx) await _tx.rollback();
        restoreSaveBtn();
        console.error("❌ خطأ أثناء حفظ الفاتورة (تم التراجع عن التعديلات):", invErr);
        if (typeof showMessage === 'function') {
            showMessage(d('inv_validationError') || globalMessage, "فشل حفظ الفاتورة؛ تم التراجع التلقائي عن تعديل المخزن والسيولة لحماية البيانات.", true);
        } else if (typeof showGlobalMessage === 'function') {
            showGlobalMessage("فشل حفظ الفاتورة؛ تم التراجع التلقائي عن تعديل المخزن والسيولة لحماية البيانات.", true);
        }
        throw invErr;
    }
}
window.handleSaveInvoice = handleSaveInvoice;
