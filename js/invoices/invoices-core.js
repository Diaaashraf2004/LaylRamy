// finance-core-invoices.js - Invoices and Serials Logic
        function resetProductForm() {
             editingProductName = null;
             window.currentEditingProductID = null;
             window.bypassDuplicateCheck = false;
             if(productNameInput) productNameInput.value = "";
             if(productQuantityInput) productQuantityInput.value = "0";
             if(productCostPriceInput) productCostPriceInput.value = "0";
             if(productSupplierSelect) productSupplierSelect.value = "";
             if(productCategoryInput) productCategoryInput.value = "";
             if(productDeductLiquidityCheckbox) productDeductLiquidityCheckbox.checked = false; // Reset checkbox
             if(serialNumberEntryContainer) serialNumberEntryContainer.classList.add('hidden'); // Hide serial field
             if(productSerialNumbersTextarea) productSerialNumbersTextarea.value = ''; // Clear serial field
             if(serialImportMessage) showMessage(serialImportMessage, ''); // Clear serial import message
             if(addProductButton) {
                 addProductButton.textContent = "إضافة/تحديث البضاعة";
                 addProductButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                 addProductButton.classList.add('bg-green-500', 'hover:bg-green-600');
             }
             if(productFormTitle) productFormTitle.textContent = "إضافة / تحديث بضاعة";
             if(cancelEditProductButton) cancelEditProductButton.classList.add('hidden');
             if(productMessage) { showMessage(productMessage,""); productMessage.classList.remove('visible','error','success','info');}
         }

        // --- <<< دالة جديدة لتعديل السيولة اليدوي >>> ---
            // --- Invoice Modal Logic ---
            window.resetInvoiceForm = resetInvoiceForm;

            window.inv_openModal = function inv_openModal() {
                if (typeof window.inv_setInvoiceMode === 'function') {
                    const mode = window.isInvoiceFromPending ? 'confirm' : (window.isEditingPendingInvoice ? 'edit' : 'new');
                    window.inv_setInvoiceMode(mode, window.pendingSaleOriginData);
                }
                if (typeof window.switchSalesTab === 'function') window.switchSalesTab('new');
                if (typeof window.resetInvoiceForm === 'function') window.resetInvoiceForm();
            };

            window.inv_closeModal = function inv_closeModal() {
                const wasFromPending = window.isInvoiceFromPending || window.isEditingPendingInvoice;
                // توافق فحص المودال المدمج: isEmbedded ? 'block' : 'none'
                if (typeof window.inv_resetInvoiceView === 'function') {
                    window.inv_resetInvoiceView();
                } else if (typeof window.resetInvoiceModeToNew === 'function') {
                    window.resetInvoiceModeToNew();
                }
                if (wasFromPending && typeof window.switchSalesTab === 'function') {
                    window.switchSalesTab('pending');
                }
            };

         function populateAvailableSerials(productIdOrName, selectElement, searchTerm = '') {
    if (!selectElement) return;
    const currentSelectedValue = selectElement.value; // الاحتفاظ بالسيريال المختار حالياً إن وجد
    selectElement.innerHTML = ''; // مسح الخيارات القديمة

    // �� [تعديل د. ضياء الحصري]: العثور على كائن المنتج أولاً للفلترة بكوده الفريد واسمه بدقة
    const product = products.find(p => p.id === productIdOrName || p.name === productIdOrName);
    const currentProductName = product ? product.name : productIdOrName;
    const currentProductId = product ? product.id : null;

    // تصفية السيريالات المتوفرة بالمخزن والتابعة لهذا الـ ID أو الاسم كخط دفاع بديل
    const availableSerials = serialNumbersLog.filter(log => {
        if (currentProductId && log.productId) {
            return log.productId === currentProductId && log.status === 'in_stock';
        }
        return log.productName === currentProductName && log.status === 'in_stock';
    });

    // استبعاد السيريالات الموجودة بالفعل في الفاتورة الحالية (المحجوزة مؤقتاً في بقية الأسطر)
    const serialsInCurrentInvoice = [];
    if (inv_invoiceItemsBody) {
        inv_invoiceItemsBody.querySelectorAll('.invoice-item-row').forEach(row => {
            if (row.dataset.itemSerial) {
                serialsInCurrentInvoice.push(row.dataset.itemSerial);
            }
        });
    }

    // فلترة إضافية بناءً على مصطلح البحث المكتوب واستبعاد المحجوز مؤقتاً
    const filteredSerials = availableSerials
        .filter(log => !serialsInCurrentInvoice.includes(log.serial))
        .filter(log => log.serial.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filteredSerials.length > 0) {
        selectElement.innerHTML = '<option value="">-- اختر الرقم التسلسلي --</option>'; 
        filteredSerials.forEach(log => {
            const option = document.createElement('option');
            option.value = log.serial;
            option.textContent = log.serial;
            if (log.serial === currentSelectedValue) { 
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
        
        // التأكيد على بقاء القيمة المختارة نشطة إذا كانت لا تزال تطابق الفلترة
        if (filteredSerials.some(log => log.serial === currentSelectedValue)) {
            selectElement.value = currentSelectedValue;
        } else {
            selectElement.value = ""; 
        }
        return true; 
    } else {
        selectElement.innerHTML = `<option value="">-- لا توجد سيريالات مطابقة${searchTerm ? ' للبحث' : ''} --</option>`;
        return false; 
    }
}
            function inv_validateForm() {
                 if (window.isInvoiceSavingInProgress || window.isPostSaveCooldown) return false;
                 const errDiv = inv_validationErrorDiv || document.getElementById('inv_validationError');
                 if(!errDiv) return true;
                 showMessage(errDiv, "", false);
                 let isValid = true, errors = [];
                 const custInput = inv_customerNameInput || document.getElementById('inv_customerName');
                 const itemsBody = inv_invoiceItemsBody || document.getElementById('inv_invoiceItemsBody');
                 const nameInput = document.getElementById('inv_itemName');
                 // إضافة الصنف المحدد تلقائياً لو كان الجدول فارغاً والمستخدم لم يضغط زر الإضافة
                 if (itemsBody && itemsBody.querySelectorAll('.invoice-item-row').length === 0) {
                     const selProd = window.pos_selectedProductInv;
                     if (!nameInput?.value?.trim() && selProd?.name && nameInput) nameInput.value = selProd.name;
                     if (nameInput?.value?.trim() && typeof window.inv_addInvoiceItem === 'function') window.inv_addInvoiceItem();
                 }
                 const isPending = !!document.getElementById('inv_markAsPending')?.checked;
                 const custVal = custInput ? custInput.value.trim() : '';
                 if (!custVal) {
                     if (!isPending) { if (custInput) custInput.value = 'عميل نقدي'; }
                     else { isValid = false; errors.push('اسم العميل مطلوب للبيعات المؤقتة.'); if(custInput) custInput.style.borderColor = 'red'; }
                 } else { if(custInput) custInput.style.borderColor = ''; }
                 const itemRows = itemsBody ? itemsBody.querySelectorAll('.invoice-item-row') : [];
                 if (itemRows.length === 0) {
                     isValid = false; errors.push('يجب إضافة بند واحد على الأقل للفاتورة.');
                 } else {
                     itemRows.forEach(row => {
                         const q = parseFloat(row.dataset.itemQty || row.querySelector('.row-qty-input')?.value || '0');
                         if (isNaN(q) || q <= 0) { isValid = false; errors.push('يجب أن تكون كمية كل بند في الفاتورة أكبر من صفر.'); }
                     });
                 }
                 // Validate deductible items stock just before saving
                 const dedContainer = inv_deductibleCostsContainer || document.getElementById('inv_deductibleCostsContainer');
                 const deductibleCheckboxes = dedContainer ? dedContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
                 let tempUnavailableDeducted = null;
                 deductibleCheckboxes.forEach(checkbox => {
                     if (tempUnavailableDeducted) return;
                     const name = checkbox.value, available = parseInt(checkbox.dataset.available) || 0;
                     const parentLabel = checkbox.closest('label'), qi = parentLabel ? parentLabel.querySelector('.inv-deducted-item-quantity') : null;
                     const qtyToDeduct = parseInt(qi?.value || '0') || 0;
                     if (available < qtyToDeduct) tempUnavailableDeducted = { name: name, required: qtyToDeduct, available: available };
                 });
                 if (tempUnavailableDeducted) {
                     isValid = false; errors.push(`الكمية المطلوبة للخصم (${tempUnavailableDeducted.required}) من "${tempUnavailableDeducted.name}" غير متوفرة (${tempUnavailableDeducted.available}).`);
                 }
                 if (!isValid) showMessage(errDiv, errors.join('<br>'), true);
                 return isValid;
            }

/**
 * ج. دالة معالجة المخزون والتكلفة (Inventory & Cost Logic)
 * وظيفتها: خصم الكميات من المخزون (لو فاتورة جديدة) وحساب التكلفة الكلية شاملة الملحقات
 */

/**
 * د. دالة تحديث الحالة العامة (Global State Updates)
 * وظيفتها: تحديث السيولة، السيريالات، وحذف البيع المؤقت القديم
 */
function updateGlobalState(account, amountToCollect, customerName, grandTotal, depositPaid, accountId, items, isFromPending, pendingOrigin) {
    // 1. تحديث السيولة
    if (amountToCollect > 0 && account) {
        account.balance = window.money(account.balance + amountToCollect);
        const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        let logDesc = `فاتورة مبيعات ${customerName}`;
        if (depositPaid > 0) {
            logDesc = `استلام باقي فاتورة ${customerName} (إجمالي: ${grandTotal} - عربون: ${depositPaid})`;
        }
        
        liquidityLog.push({ 
            id: generateId("liq"), 
            timestamp: new Date().toISOString(), 
            type: "add", 
            amount: amountToCollect, 
            description: logDesc, 
            currentBalance: newTotalLiquidity,
            accountId: accountId
        });
    }

    // 2. تحديث السيريالات
    items.forEach(item => {
        if (item.serial) {
            const idx = serialNumbersLog.findIndex(log => log.serial === item.serial);
            if (idx !== -1) serialNumbersLog[idx].status = 'sold';
        }
    });

    // 3. حذف البيع المؤقت الأصلي
    if (isFromPending && pendingOrigin && pendingOrigin.id) {
        const idx = pendingSales.findIndex(s => String(s.id).trim() === String(pendingOrigin.id).trim());
        if (idx !== -1) pendingSales.splice(idx, 1);
    }
}


            function inv_calculateTotals() {
                const m = (typeof window.money === 'function' ? window.money : Number);
                let goodsTotal = 0;
                let goodsCost = 0;
                const itemsBody = inv_invoiceItemsBody || document.getElementById('inv_invoiceItemsBody');
                if(itemsBody) {
                    itemsBody.querySelectorAll('.invoice-item-row').forEach(row => {
                        goodsTotal = m(goodsTotal + (parseFloat(row.dataset.itemSubtotal || 0)));
                        const qty = parseInt(row.dataset.itemQty || 0);
                        const cost = parseFloat(row.dataset.itemCost || 0);
                        goodsCost = m(goodsCost + (cost * qty));
                    });
                }
                const shippingInput = inv_shippingCostInput || document.getElementById('inv_shippingCost');
                const shippingCost = shippingInput ? (parseInputNumber(shippingInput) || 0) : 0;
                const grandTotal = m(goodsTotal + shippingCost);

                const totalGoodsPriceSpan = inv_totalGoodsPriceSpan || document.getElementById('inv_totalGoodsPrice');
                const totalShippingCostSpan = inv_totalShippingCostSpan || document.getElementById('inv_totalShippingCost');
                const grandTotalPriceSpan = inv_grandTotalPriceSpan || document.getElementById('inv_grandTotalPrice');

                if(totalGoodsPriceSpan) totalGoodsPriceSpan.textContent = formatCurrency(goodsTotal);
                if(totalShippingCostSpan) totalShippingCostSpan.textContent = formatCurrency(shippingCost);
                if(grandTotalPriceSpan) grandTotalPriceSpan.textContent = formatCurrency(grandTotal);

                // عرض العربون المدفوع والمتبقي إذا كانت البيعة قيد التعديل/التأكيد وبها عربون
                const depRow = document.getElementById('inv_deposit_info_row'), depPaid = Number(window.pendingSaleOriginData?.depositPaid) || 0;
                if (depRow) { depRow.style.display = depPaid > 0 ? 'block' : 'none'; if (depPaid > 0) { const dEl = document.getElementById('inv_depositPaidDisplay'), rEl = document.getElementById('inv_remainingAmountDisplay'); if (dEl) dEl.textContent = formatCurrency(depPaid); if (rEl) rEl.textContent = formatCurrency(Math.max(0, m(grandTotal - depPaid))); } }

                // حساب التكاليف المخصومة المحددة (الملحقات)
                let deductedItemsCost = 0;
                const dedContainer = inv_deductibleCostsContainer || document.getElementById('inv_deductibleCostsContainer');
                if (dedContainer) {
                    const checkedBoxes = dedContainer.querySelectorAll('input[type="checkbox"]:checked');
                    checkedBoxes.forEach(checkbox => {
                        const cost = parseFloat(checkbox.dataset.cost) || 0;
                        const parentLabel = checkbox.parentElement;
                        const quantityInput = parentLabel.querySelector('.inv-deducted-item-quantity');
                        const qtyToDeduct = parseInt(quantityInput?.value || '0');
                        if (qtyToDeduct > 0) {
                            deductedItemsCost = m(deductedItemsCost + (cost * qtyToDeduct));
                        }
                    });
                }

                const totalCost = m(goodsCost + deductedItemsCost);
                let expectedProfit = m(goodsTotal - totalCost);
                const dedToggleInv = document.getElementById('inv-deduction-toggle');
                const dedAmountInv = document.getElementById('inv-deduction-amount');
                if (dedToggleInv && dedToggleInv.checked && dedAmountInv) {
                    const amtInv = parseFloat(dedAmountInv.value) || 0;
                    if (amtInv > 0) expectedProfit = m(expectedProfit - amtInv); const hint = document.getElementById('inv-deduction-real-profit'); if (hint) { hint.textContent = formatCurrency(expectedProfit); hint.style.color = expectedProfit >= 0 ? '#15803d' : '#dc2626'; } }

                const profitDisplay = document.getElementById('inv_expected_profit_display');
                if (profitDisplay) {
                    profitDisplay.textContent = formatCurrency(expectedProfit);
                    if (expectedProfit >= 0) {
                        profitDisplay.style.color = '#166534';
                    } else {
                        profitDisplay.style.color = '#dc2626';
                    }
                }
            }
            window.inv_calculateTotals = inv_calculateTotals;

  function inv_updateDeductibleCostsCheckboxes(forceReset = false) {
    const dedContainer = inv_deductibleCostsContainer || document.getElementById('inv_deductibleCostsContainer');
    if (!dedContainer) return;
    
    // حفظ العناصر المحددة حالياً قبل مسح الحاوية لضمان عدم فقدان اختيارات المستخدم (ما لم يُطلب التصفير)
    const currentCheckedMap = new Map();
    if (!forceReset) {
        const existingCbs = dedContainer.querySelectorAll('input[type="checkbox"]:checked');
        existingCbs.forEach(cb => {
            const k = (cb.dataset.id || cb.dataset.name || cb.value || "").trim().toLowerCase();
            const row = cb.closest('label'), qi = row ? row.querySelector('.inv-deducted-item-quantity') : null;
            if (k) currentCheckedMap.set(k, { id: cb.dataset.id || '', name: cb.dataset.name || cb.value, quantity: qi ? (parseInt(qi.value) || 1) : 1 });
        });
    }
    dedContainer.innerHTML = '';
    
    // 1. حساب الكميات المستخدمة حالياً داخل جدول الفاتورة بالـ ID والاسم معاً لضمان عدم التداخل
    const itemsInTable = {};
    if (inv_invoiceItemsBody) {
        const rows = Array.from(inv_invoiceItemsBody.querySelectorAll('.invoice-item-row'));
        rows.forEach(row => {
            const id = row.dataset.productId || "", name = (row.dataset.itemName || "").toLowerCase().trim();
            const qty = parseInt(row.dataset.itemQty) || 0, key = id || name;
            if (key) itemsInTable[key] = (itemsInTable[key] || 0) + qty;
        });
    }
    
    // 2. الحصول على الملحقات المختارة سابقاً إن وجدنا في وضع التعديل/التأكيد بالإضافة للمحددة حالياً
    const prevDeducted = (!forceReset && pendingSaleOriginData && (
        (pendingSaleOriginData.invoiceData && pendingSaleOriginData.invoiceData.deductedItems) || 
        pendingSaleOriginData.deductedItems || 
        (!pendingSaleOriginData.mainProduct && pendingSaleOriginData.additionalItems)
    )) || [];
    
    const prevDeductedMap = new Map();
    prevDeducted.forEach(item => {
        if (!item) return;
        const idKey = item.id ? String(item.id).trim().toLowerCase() : "", nameKey = item.name ? String(item.name).trim().toLowerCase() : "", key = idKey || nameKey;
        if (key) prevDeductedMap.set(key, item);
    });
    currentCheckedMap.forEach((item, k) => { if (!prevDeductedMap.has(k)) prevDeductedMap.set(k, item); });
    
    // 3. تجهيز قائمة المنتجات وحساب المتبقي الحقيقي بالـ ID الفريد
    const mergedProductsMap = new Map();
    
    products.forEach(p => {
        const qtyInStock = Number(p.quantity) || 0;
        const idKey = p.id ? String(p.id).trim().toLowerCase() : "";
        const nameKey = p.name ? String(p.name).toLowerCase().trim() : "";
        
        // فحص الكمية المحجوزة في الجدول بناءً على الـ ID أولاً ثم الاسم كبديل أمان
        const qtyInTable = (idKey && itemsInTable[idKey]) ? itemsInTable[idKey] : (itemsInTable[nameKey] || 0);
        
        // الحصول على الكمية المستخدمة سابقاً في هذا الصنف
        const prevItem = (idKey && prevDeductedMap.get(idKey)) || prevDeductedMap.get(nameKey);
        const prevQty = prevItem ? (Number(prevItem.quantity) || 0) : 0;
        
        const originRes = (typeof inv_getOriginReservedQty === 'function') ? inv_getOriginReservedQty(idKey || nameKey) : prevQty;
        const realAvailable = qtyInStock - qtyInTable + Math.max(prevQty, originRes);
        
        mergedProductsMap.set(idKey || nameKey, {
            ...p,
            realAvailable: realAvailable,
            prevQty: prevQty,
            isPrevSelected: !!prevItem
        });
    });
    
    // أضف أيضاً الملحقات المختارة سابقاً التي ربما حُذفت تماماً من المخزون أو لم تعد مسجلة
    prevDeductedMap.forEach((prevItem, key) => {
        if (!mergedProductsMap.has(key)) {
            mergedProductsMap.set(key, {
                id: prevItem.id || "",
                name: prevItem.name,
                quantity: 0,
                costPrice: Number(prevItem.costPrice || prevItem.cost || 0) || 0,
                category: "عام",
                realAvailable: Number(prevItem.quantity) || 1,
                prevQty: Number(prevItem.quantity) || 1,
                isPrevSelected: true
            });
        }
    });

    const availableForDeduction = Array.from(mergedProductsMap.values()).filter(p => p.realAvailable > 0);

    // 4. التحقق من وجود منتجات للعرض
    if (availableForDeduction.length === 0) {
        inv_deductibleCostsContainer.innerHTML = '<p class="text-center text-sm" style="color:grey; padding:10px;">لا توجد منتجات متبقية متاحة لخصم تكلفتها.</p>';
        return;
    }

    // 5. ترتيب المنتجات أبجدياً وبناء الواجهة مع حفر الـ ID في الـ Checkbox وتحديد الحالة المختارة سابقاً
    availableForDeduction.sort((a, b) => a.name.localeCompare(b.name, 'ar')).forEach(product => {
        const cost = Number(product.costPrice) || 0;
        const uniqueId = `inv_deductcost_${generateId(product.id || product.name)}`;
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.marginBottom = '5px';
        label.style.cursor = 'pointer';
        label.htmlFor = uniqueId;
        
        const isChecked = product.isPrevSelected ? 'checked' : '';
        const qtyValue = product.isPrevSelected ? product.prevQty : 1;
        
        label.innerHTML = `
          <input type="checkbox" 
       id="${uniqueId}" 
       value="${product.id || product.name}" 
       data-id="${product.id || ''}"
       data-name="${escapeHTML(product.name)}"
       data-cost="${cost}" 
       data-available="${product.realAvailable}"
       ${isChecked}>
            <span style="flex-grow: 1; font-size: 0.9em;">
                 ${escapeHTML(product.name)} <span class="text-xs text-blue-500">(${escapeHTML(product.category || 'عام')})</span>
                 <span class="text-gray-500 text-xs" style="display:block;">
                    (ت: ${formatCurrency(cost)} | المتبقي المتاح: ${product.realAvailable})
                 </span>
            </span>
            <span style="flex-shrink: 0; font-size: 0.8em; color: #555;">خصم:</span>
            <input type="number" 
                   class="inv-deducted-item-quantity" 
                   min="1" 
                   max="${product.realAvailable}" 
                   value="${qtyValue}" 
                   style="width: 50px; text-align: center; flex-shrink: 0; border: 1px solid #ccc; border-radius: 4px; padding: 2px; font-size: 0.9em;" 
                   onclick="event.stopPropagation()">
        `;
        const targetContainer = inv_deductibleCostsContainer || document.getElementById('inv_deductibleCostsContainer');
        if (targetContainer) targetContainer.appendChild(label);
    });
}
window.inv_updateDeductibleCostsCheckboxes = inv_updateDeductibleCostsCheckboxes;      // =====================================================================
// �� [تحديث د. ضياء]: دالة فتح مودال السيريالات بناءً على الـ ID الفريد منعاً للتداخل
// =====================================================================
function openManageSerialsModal(productIdOrName) {
    let product = null;

    // 1. البحث أولاً باستخدام الكود الفريد المميز للمنتج لضمان الدقة
    if (productIdOrName) {
        product = products.find(p => p.id === productIdOrName);
    }
    
    // 2. خط دفاع بديل بالاسم إذا كان المنتج قديماً جداً ولا يملك كود
    if (!product) {
        product = products.find(p => p.name === productIdOrName);
    }

    if (!product || !manageSerialsModal) {
        showGlobalMessage(`خطأ: لم يتم العثور على المنتج لإدارة سيريالاته.`, true);
        return;
    }

    // تخزين المعرفات في كائن النظام الحالي لتعرف الدوال الأخرى أي منتج نقوم بإدارته
    currentManagingSerialsProduct = product.name; 
    window.currentManagingSerialsProductID = product.id || null; // �� حفظ الـ ID الفريد للمنتج الحالي

    // تحديث معلومات الواجهة في المودال
    if (modal_productNameDisplay) modal_productNameDisplay.textContent = product.name;
    const totalQty = Number(product.quantity) || 0;

    // تصفية السيريالات المرتبطة بهذا المنتج تحديداً (بالـ ID أو بالاسم كخط دفاع بديل)
    const registeredSerials = serialNumbersLog.filter(log => {
        if (product.id && log.productId) {
            return log.productId === product.id;
        }
        return log.productName === product.name;
    });

    const inStockSerials = registeredSerials.filter(log => log.status === 'in_stock' || (!log.status && log.status !== 'sold'));
    const registeredCount = inStockSerials.length;
    const unregisteredCount = Math.max(0, totalQty - registeredCount);

    if (modal_totalQuantity) modal_totalQuantity.textContent = totalQty;
    if (modal_registeredCount) modal_registeredCount.textContent = registeredCount;
    if (modal_unregisteredCount) modal_unregisteredCount.textContent = unregisteredCount;
    if (modal_maxSerialsToAdd) modal_maxSerialsToAdd.textContent = unregisteredCount;

    // مسح حقل الإضافة ورسالة الاستيراد
    if (modal_productSerialNumbers) modal_productSerialNumbers.value = '';
    if (modal_serialImportMessage) showMessage(modal_serialImportMessage, '');

    // عرض السيريالات المسجلة حالياً للمنتج المحدد
    if (modal_registeredSerialsList) {
        if (registeredCount === 0) {
            modal_registeredSerialsList.innerHTML = '<p class="text-center text-gray-500">لا توجد سيريالات مسجلة حالياً.</p>';
        } else {
            let listHtml = '<ul class="space-y-1">';
            registeredSerials.sort((a, b) => a.serial.localeCompare(b.serial)).forEach(log => {
                let statusColor = log.status === 'in_stock' ? 'text-green-600' : (log.status === 'sold' ? 'text-red-500' : 'text-gray-500');
                let statusText = log.status === 'in_stock' ? 'متوفر' : (log.status === 'sold' ? 'مباع' : (log.status === 'in_invoice_temp' ? 'في فاتورة' : log.status));
                listHtml += `<li class="text-sm flex justify-between items-center bg-gray-50 p-1 rounded border border-gray-100">
                                <span class="font-mono"><strong>${escapeHTML(log.serial || '')}</strong></span>
                                <span class="text-xs ${statusColor}">[${statusText}]</span>
                             </li>`;
            });
            listHtml += '</ul>';
            modal_registeredSerialsList.innerHTML = listHtml;
        }
    }

    // إظهار النافذة
    manageSerialsModal.style.display = 'block';
}
            function closeManageSerialsModal() {
                if (manageSerialsModal) {
                    manageSerialsModal.style.display = 'none';
                }
                currentManagingSerialsProduct = null; // Reset managed product name
            }

window.saveAddedSerialsFromModal = function saveAddedSerialsFromModal() {
    saveStateToHistory();
    if (!currentManagingSerialsProduct || !modal_productSerialNumbers) return;

    // �� [تعديل د. ضياء]: جلب المنتج التابع له السيريال بالـ ID الفريد المخزن في النافذة حالياً لضمان الدقة
    const product = window.currentManagingSerialsProductID ? products.find(p => p.id === window.currentManagingSerialsProductID) : products.find(p => p.name === currentManagingSerialsProduct);
    
    if (!product) {
        showMessage(d('modal-serial-import-message'), 'خطأ: المنتج لم يعد موجوداً.', true);
        return;
    }

    const newSerialsInput = modal_productSerialNumbers.value.trim();
    if (!newSerialsInput) {
        showMessage(d('modal-serial-import-message'), 'لم يتم إدخال أرقام تسلسلية جديدة.', false, true);
        return; 
    }

    const totalQty = Number(product.quantity) || 0;

    // �� [تعديل أمني]: تصفية السيريالات بالـ ID أولاً لضمان دقة العدّ وعدم تداخل الأصناف متشابهة الاسم
    const initialRegisteredSerials = serialNumbersLog.filter(log => {
        if (product.id && log.productId) return log.productId === product.id;
        return log.productName === currentManagingSerialsProduct;
    });
    
    const inStockSerials = initialRegisteredSerials.filter(log => log.status === 'in_stock' || (!log.status && log.status !== 'sold'));
    const registeredCount = inStockSerials.length;
    const unregisteredCount = Math.max(0, totalQty - registeredCount);

    // فصل السيريالات المدخلة
    const cleanedInput = newSerialsInput.replace(/[,;\s\t]+/g, '\n');
    const newSerials = cleanedInput.split('\n').map(s => s.trim()).filter(s => s !== '');

    if (newSerials.length === 0) {
         showMessage(d('modal-serial-import-message'), 'لم يتم إدخال أرقام تسلسلية صالحة.', true);
         return;
    }

    if (unregisteredCount <= 0) {
         showMessage(d('modal-serial-import-message'), `جميع قطع هذا الصنف (${totalQty} قطعة) مسجل لها سيريالات متوفرة بالفعل. لا يمكن إضافة المزيد إلا بزيادة كمية المخزون.`, true);
         return;
    }

    if (newSerials.length > unregisteredCount) {
         showMessage(d('modal-serial-import-message'), `لا يمكن إضافة ${newSerials.length} سيريال، العدد المتبقي غير المسجل هو ${unregisteredCount} فقط.`, true);
         return;
    }

    // التحقق من تكرار السيريال في النظام
    const duplicateCheck = new Set();
    let error = false;
    for (const serial of newSerials) {
         if (duplicateCheck.has(serial)) {
             showMessage(d('modal-serial-import-message'), `الرقم التسلسلي "${serial}" مكرر في المدخلات.`, true);
             error = true; break;
         }
         if (serialNumbersLog.some(log => log.serial === serial)) {
             showMessage(d('modal-serial-import-message'), `الرقم التسلسلي "${serial}" مسجل بالفعل في النظام لمنتج آخر أو لهذا المنتج.`, true);
             error = true; break;
         }
         duplicateCheck.add(serial);
    }
    if (error) return;

    // إضافة السيريالات الجديدة
    const timestamp = new Date().toISOString();
    const supplierId = product.supplierId || ""; 

    // �� [تعديل د. ضياء]: ربط السيريال المضاف حديثاً بالـ ID الفريد للمنتج لمنع التداخل
    newSerials.forEach(serial => {
        serialNumbersLog.push({
                id: generateId("SER"),
                serial: serial, 
            productName: currentManagingSerialsProduct,
            productId: product.id || "", // �� حفظ الـ ID هنا خطوة حاسمة لمنع تداخل الأصناف متشابهة الاسم
            supplierId: supplierId, 
            addedTimestamp: timestamp, 
            status: "in_stock" 
        });
    });

    logOperation("إدارة سيريالات", `تمت إضافة ${newSerials.length} رقم تسلسلي للمنتج "${currentManagingSerialsProduct}".`);
    showMessage(d('modal-serial-import-message'), `تم حفظ ${newSerials.length} رقم تسلسلي بنجاح.`, false);
    modal_productSerialNumbers.value = ''; // أفرغ الحقل بعد الحفظ

    // �� [تعديل أمني]: إعادة تحديث القائمة والعدادات بناءً على الـ ID بدقة
    const updatedRegisteredSerials = serialNumbersLog.filter(log => {
        if (product.id && log.productId) return log.productId === product.id;
        return log.productName === currentManagingSerialsProduct;
    });
    
    const updatedInStockSerials = updatedRegisteredSerials.filter(log => log.status === 'in_stock' || (!log.status && log.status !== 'sold'));
    const updatedRegisteredCount = updatedInStockSerials.length;
    const updatedUnregisteredCount = Math.max(0, totalQty - updatedRegisteredCount);

    if (modal_registeredCount) modal_registeredCount.textContent = updatedRegisteredCount;
    if (modal_unregisteredCount) modal_unregisteredCount.textContent = updatedUnregisteredCount;
    if (modal_maxSerialsToAdd) modal_maxSerialsToAdd.textContent = updatedUnregisteredCount;

    if (modal_registeredSerialsList) {
         if (updatedRegisteredCount === 0) {
              modal_registeredSerialsList.innerHTML = '<p class="text-center text-gray-500">لا توجد سيريالات مسجلة حالياً.</p>';
         } else {
              let listHtml = '<ul class="space-y-1">';
              updatedRegisteredSerials.sort((a,b) => a.serial.localeCompare(b.serial)).forEach(log => {
                  let statusColor = log.status === 'in_stock' ? 'text-green-600' : (log.status === 'sold' ? 'text-red-500' : 'text-gray-500');
                  let statusText = log.status === 'in_stock' ? 'متوفر' : (log.status === 'sold' ? 'مباع' : (log.status === 'in_invoice_temp' ? 'في فاتورة' : log.status));
                  
                  // تصحيح صياغة الـ HTML بالكامل هنا من الأخطاء النصية القديمة
                  listHtml += `<li class="text-sm flex justify-between items-center bg-gray-50 p-1 rounded border border-gray-100">
                                   <span class="font-mono"><strong>${escapeHTML(log.serial || '')}</strong></span>
                                   <span class="text-xs ${statusColor}">[${statusText}]</span>
                               </li>`;
              });
              listHtml += '</ul>';
              modal_registeredSerialsList.innerHTML = listHtml;
         }
    }

    updateUI(); // تحديث الواجهة الرئيسية لعكس التغييرات
}

window.closeManageSerialsModal = closeManageSerialsModal;
window.openManageSerialsModal = openManageSerialsModal;
