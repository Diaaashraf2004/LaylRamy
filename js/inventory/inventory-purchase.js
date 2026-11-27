function pi_addItem() {
    const nameInput = piItemNameInput || d('pi_item_name');
    const categoryInput = document.getElementById('pi_item_category');
    const qtyInput = piItemQuantityInput || d('pi_item_quantity');
    const costInput = piItemCostInput || d('pi_item_cost');
    const totalCostInput = document.getElementById('pi_item_total_cost') || d('pi_item_total_cost');
    const serialsTextarea = piItemSerialsTextarea || d('pi_item_serials');
    const serialsContainer = piItemSerialsContainer || d('pi_item_serials_container');
    const itemAddMsg = piItemAddMessage || d('pi_item_add_message');
    const itemsBody = piItemsBody || d('pi_items_body');
    const noItemsEl = piNoItemsMsg || d('pi_no_items_msg');

    if (!nameInput || !qtyInput || !costInput) {
        console.error("عناصر نموذج إضافة البند غير متوفرة.");
        return;
    }

    const name = nameInput.value.trim();
    const category = categoryInput ? categoryInput.value.trim() : ""; 
    const quantity = parseInt(qtyInput.value);
    // نعتمد على سعر الوحدة كمرجع أساسي لأنه الأدق في التخزين
    const cost = parseFloat(costInput.value) || 0;
    // نستخدم السعر الإجمالي للعرض أو التحقق
    const totalCost = totalCostInput ? (parseFloat(totalCostInput.value) || 0) : (quantity * cost);
    const serialsInput = serialsTextarea ? serialsTextarea.value.trim() : "";

    // التحقق
    if (!name || isNaN(quantity) || quantity <= 0 || cost < 0) {
        if (itemAddMsg) showMessage(itemAddMsg, "يرجى إدخال البيانات بشكل صحيح.", true);
        return;
    }

    const serials = serialsInput ? serialsInput.split('\n').map(s => s.trim()).filter(Boolean) : [];
    if (serials.length > 0 && serials.length !== quantity) {
        if (itemAddMsg) showMessage(itemAddMsg, `عدد السيريالات (${serials.length}) لا يطابق الكمية (${quantity}).`, true);
        return;
    }

    // نستخدم (الكمية × سعر الوحدة) لضمان الدقة الحسابية في الفاتورة
    const subtotal = quantity * cost; 
    const newRow = document.createElement('tr');
    newRow.dataset.name = name;
    newRow.dataset.category = category;
    newRow.dataset.quantity = quantity;
    newRow.dataset.cost = cost;
    newRow.dataset.subtotal = subtotal;
    newRow.dataset.serials = JSON.stringify(serials);
    newRow.innerHTML = `
        <td class="border p-2">
            ${escapeHTML(name)} 
            ${category ? `<span class="text-xs text-blue-600 block">(${escapeHTML(category)})</span>` : ''} 
            ${serials.length > 0 ? `<span class="text-xs text-gray-500 block">(${serials.length} S/N)</span>` : ''}
        </td>
        <td class="border p-2 text-center font-mono">${quantity}</td>
        <td class="border p-2 text-center font-mono">${formatCurrency(cost)}</td>
        <td class="border p-2 text-center font-mono font-bold">${formatCurrency(subtotal)}</td>
        <td class="border p-2 text-center no-print">
            <button type="button" class="pi_edit_item_btn text-blue-500 hover:text-blue-700 font-bold ml-2" title="تعديل البند">✎</button>
            <button type="button" class="pi_remove_item_btn text-red-500 hover:text-red-700 font-bold" title="حذف البند">×</button>
        </td>
    `;
    if (itemsBody) itemsBody.appendChild(newRow);
    if (noItemsEl) noItemsEl.classList.add('hidden');
    if (window.pi_updateTotals) window.pi_updateTotals();

    // تنظيف الحقول
    nameInput.value = '';
    if (categoryInput) categoryInput.value = '';
    qtyInput.value = '1';
    costInput.value = '0';
    if (totalCostInput) totalCostInput.value = '0'; // تصفير الإجمالي أيضاً
    if (serialsTextarea) serialsTextarea.value = '';
    if (serialsContainer) serialsContainer.classList.add('hidden');
    if (itemAddMsg) showMessage(itemAddMsg, "");
    nameInput.focus();
}
window.pi_addItem = pi_addItem;
function pi_clearForm(shouldShowMessage = true) {
    // 1. مسح الحقول الأساسية
    const invoiceNum = d('pi_invoice_number'); if (invoiceNum) invoiceNum.value = '';
    const dateInp = d('pi_date'); if (dateInp) dateInp.value = (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
    const supplierSel = piSupplierSelect || d('pi_supplier'); if (supplierSel) supplierSel.value = '';
    
    // 2. مسح جدول المنتجات
    const itemsBody = piItemsBody || d('pi_items_body'); if (itemsBody) itemsBody.innerHTML = '';
    const noItemsEl = piNoItemsMsg || d('pi_no_items_msg'); if (noItemsEl) noItemsEl.classList.remove('hidden');
    
    // 3. مسح الحقول المالية
    const paidInp = piPaidAmountInput || d('pi_paid_amount'); if (paidInp) paidInp.value = '0';
    const goodsRec = d('pi_goods_received'); if (goodsRec) goodsRec.checked = true; // الوضع الافتراضي
    const deductLiq = d('pi_deduct_from_liquidity'); if (deductLiq) deductLiq.checked = true; // الوضع الافتراضي
    const payAcc = d('pi_payment_account'); if (payAcc) payAcc.value = ''; // تصفير الحساب
    const payAccCont = d('pi-payment-account-container'); if (payAccCont) payAccCont.classList.remove('hidden');

    // 4. مسح حقول إضافة بند جديد أيضاً
    const nameInp = piItemNameInput || d('pi_item_name'); if (nameInp) nameInp.value = '';
    const catInp = document.getElementById('pi_item_category'); if (catInp) catInp.value = '';
    const qtyInp = piItemQuantityInput || d('pi_item_quantity'); if (qtyInp) qtyInp.value = '1';
    const costInp = piItemCostInput || d('pi_item_cost'); if (costInp) costInp.value = '0';
    const totalCostInp = document.getElementById('pi_item_total_cost') || d('pi_item_total_cost'); if (totalCostInp) totalCostInp.value = '0';
    const serialsText = piItemSerialsTextarea || d('pi_item_serials'); if (serialsText) serialsText.value = '';
    const serialsCont = piItemSerialsContainer || d('pi_item_serials_container'); if (serialsCont) serialsCont.classList.add('hidden');
    const itemAddMsg = piItemAddMessage || d('pi_item_add_message'); if (itemAddMsg) showMessage(itemAddMsg, "");

    // 5. مسح التكاليف الإضافية الديناميكية وإظهار رسالة الحالة الفارغة
    const costsContainer = d('pi_additional_costs_container');
    if (costsContainer) {
        costsContainer.innerHTML = ''; // حذف كل صفوف التكاليف المضافة
    }
    const noCostsMsg = d('pi_no_extra_costs_msg');
    if (noCostsMsg) noCostsMsg.style.display = 'block';

    // 6. تحديث الإجماليات لتظهر أصفار
    if (window.pi_updateTotals) window.pi_updateTotals();
    // رسائل النظام
    if (shouldShowMessage !== false) {
        const formMsg = piFormMessage || d('pi_form_message');
        if (formMsg) showMessage(formMsg, "تم بدء فاتورة جديدة فارغة.", false);
    }
}
/**
 * Validates the entire purchase invoice form before confirmation.
 * @returns {boolean} True if the form is valid, otherwise false.
 */
function pi_validateForm() {
    const piSupplierSelect = document.getElementById("pi_supplier");
    const piDateInput = d('pi_date');
    const piItemsBody = d('pi_items_body');
    const piGrandTotalSpan = d('pi_grand_total');
    const piPaidAmountInput = d('pi_paid_amount');
    const piFormMessage = d('pi_form_message');
    const deductFromLiquidity = d('pi_deduct_from_liquidity').checked;
    showMessage(piFormMessage, "");
    let errors = [];
    if (!piSupplierSelect || !piSupplierSelect.value) {
        errors.push("يجب اختيار المورد.");
    }
    if (!piDateInput || !piDateInput.value) {
        errors.push("يجب تحديد تاريخ الفاتورة.");
    }
    if (!piItemsBody || piItemsBody.children.length === 0) {
        errors.push("يجب إضافة بند واحد على الأقل للفاتورة.");
    }

    const grandTotal = parseFloat(piGrandTotalSpan.textContent) || 0;
    const paidAmount = parseInputNumber(piPaidAmountInput) || 0;
    if (paidAmount < 0) {
        errors.push("لا يمكن أن يكون المبلغ المدفوع سالباً.");
    }
    if (paidAmount > grandTotal + 0.001) {
        errors.push(`المبلغ المدفوع (${formatCurrency(paidAmount)}) لا يمكن أن يكون أكبر من إجمالي الفاتورة (${formatCurrency(grandTotal)}).`);
    }

    // --- التحقق من رصيد الحساب المحدد ومنع تضخم رأس المال ---
    if (!deductFromLiquidity && paidAmount > 0.001) {
        errors.push("لا يمكن تسجيل مبلغ مدفوع مع إلغاء خيار الخصم من السيولة؛ صفّر المبلغ المدفوع أو فعّل الخصم من الخزينة لحماية رأس المال.");
    } else if (deductFromLiquidity && paidAmount > 0) {
        const selectedAccountId = d('pi_payment_account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);
        if (!account) {
            errors.push("يرجى اختيار حساب الدفع للتحقق من الرصيد.");
        } else if (paidAmount > (Number(account.balance) || 0) + 0.001) {
            errors.push(`رصيد حساب "${account.name}" (${formatCurrency(account.balance)}) غير كافٍ لتغطية المبلغ المدفوع (${formatCurrency(paidAmount)}).`);
        }
    }
    
    if (errors.length > 0) {
        showMessage(piFormMessage, errors.join('<br>'), true);
        return false;
    }
    return true;
}

function pi_updateRecentPurchasesDisplay() {
    if (!piRecentPurchasesList) return;
    if (purchaseInvoices.length === 0) {
        piRecentPurchasesList.innerHTML = '<p class="text-center text-gray-500">لا توجد فواتير شراء مسجلة لهذا اليوم بعد.</p>';
        return;
    }

    const sortedInvoices = [...purchaseInvoices].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    piRecentPurchasesList.innerHTML = sortedInvoices.map(invoice => {
        const supplier = suppliers.find(s => s.id === invoice.supplierId);
        const extraLiab = (invoice.extraCosts || []).filter(c => c.isLiability).reduce((s, c) => s + (Number(c.amount) || 0), 0);
        const totalLiab = (Number(invoice.remainingBalance) || 0) + extraLiab;
        const liabText = extraLiab > 0 
            ? `متبقي المورد: ${formatCurrency(invoice.remainingBalance)} | ديون إضافية: ${formatCurrency(extraLiab)} | <strong class="text-purple-700">إجمالي الالتزام: ${formatCurrency(totalLiab)}</strong>` 
            : `المتبقي كالتزام: ${formatCurrency(invoice.remainingBalance)}`;
        
        const items = Array.isArray(invoice.items) ? invoice.items : [];
        const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        const returnedQty = items.reduce((s, i) => s + (Number(i.returnedQuantity) || 0), 0);
        const isFullyReturned = totalQty > 0 && returnedQty >= totalQty;
        const isPartiallyReturned = returnedQty > 0 && !isFullyReturned;

        let returnActionHTML = '';
        if (isFullyReturned) {
            returnActionHTML = `
                <span class="text-xs bg-emerald-100 text-emerald-800 font-bold py-1 px-3 rounded-lg border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <i class="fas fa-check-circle text-emerald-600"></i> مرتجع بالكامل
                </span>
            `;
        } else if (isPartiallyReturned) {
            returnActionHTML = `
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs bg-amber-100 text-amber-800 font-bold py-1 px-2.5 rounded-lg border border-amber-300">
                        مرتجع جزئي (${returnedQty}/${totalQty})
                    </span>
                    <button data-invoice-id="${escapeHTML(invoice.id)}" onclick="window.openPurchaseReturnModal(this.dataset.invoiceId)" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-1 px-3 rounded border border-red-300 transition flex items-center gap-1">
                        <i class="fas fa-undo-alt mr-1"></i> متابعة المرتجع (${totalQty - returnedQty} متبقي)
                    </button>
                </div>
            `;
        } else {
            returnActionHTML = `
                <button data-invoice-id="${escapeHTML(invoice.id)}" onclick="window.openPurchaseReturnModal(this.dataset.invoiceId)" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-1 px-3 rounded border border-red-300 transition flex items-center gap-1">
                    <i class="fas fa-undo-alt mr-1"></i> عمل مرتجع للمورد
                </button>
            `;
        }

        return `
            <div class="p-3 border rounded-md bg-gray-50 shadow-sm mb-2">
                <div class="flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <strong class="text-indigo-600">المورد: ${supplier ? escapeHTML(supplier.name) : 'غير محدد'}</strong><br>
                        <span class="text-xs text-gray-500">رقم الفاتورة: ${escapeHTML(invoice.invoiceNumber || 'N/A')} | التاريخ: ${formatDateForDisplay(invoice.date)}</span>
                    </div>
                    <div class="font-semibold text-blue-700 text-lg">${formatCurrency(invoice.grandTotal)}</div>
                </div>
                <div class="text-sm mt-1 text-gray-600">
                    المدفوع: ${formatCurrency(invoice.paidAmount)} | ${liabText}
                </div>
                <div class="mt-2 pt-2 border-t border-gray-200 flex justify-end">
                    ${returnActionHTML}
                </div>
            </div>
        `;
    }).join('');
}

function getPendingPurchaseActiveDebt(purchase) {
    if (!purchase) return 0;
    const m = (typeof window.money === 'function') ? window.money : Number;
    const extraCostsList = Array.isArray(purchase.extraCosts) ? purchase.extraCosts : [];
    const extraCostByLiabId = new Map();
    extraCostsList.forEach(c => {
        if (c && c.isLiability && c.linkedLiabilityId) {
            extraCostByLiabId.set(c.linkedLiabilityId, m((extraCostByLiabId.get(c.linkedLiabilityId) || 0) + (Number(c.amount) || 0)));
        }
    });
    let total = 0;
    let foundAny = false;
    if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
        liabilities.forEach(l => {
            const liveAmt = Number(l.amount) || 0;
            if (liveAmt <= 0.001) return;
            if (extraCostByLiabId.has(l.id)) {
                total = m(total + Math.min(liveAmt, extraCostByLiabId.get(l.id)));
                foundAny = true;
            } else if (l.purchaseInvoiceId === purchase.id) {
                total = m(total + liveAmt);
                foundAny = true;
            }
        });
    }
    if (foundAny) return total;
    return m(Math.min(Number(purchase.remainingBalance) || 0, Math.max(0, (Number(purchase.grandTotal) || 0) - (Number(purchase.paidAmount) || 0))));
}
window.getPendingPurchaseActiveDebt = getPendingPurchaseActiveDebt;

function pi_updatePendingPurchasesDisplay() {
    if (!d('pending-purchases-list')) return;
    const container = d('pending-purchases-list');
    if (pendingPurchases.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">لا توجد فواتير شراء معلقة حاليًا.</p>';
        return;
    }

    const sortedInvoices = [...pendingPurchases].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    container.innerHTML = sortedInvoices.map(invoice => {
        const supplier = suppliers.find(s => s.id === invoice.supplierId);

        const activeDebt = getPendingPurchaseActiveDebt(invoice);
        const hasDebt = activeDebt > 0.001;

        let receiveAndPayButtonHTML = '';
        if (hasDebt) {
            receiveAndPayButtonHTML = `<button data-pending-purchase-id="${invoice.id}" class="receive-and-pay-btn text-xs bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold py-1.5 px-3 rounded shadow-sm transition-all duration-150">استلام وتسديد المتبقي</button>`;
        }

        const itemsTableHTML = `
            <div class="overflow-x-auto mt-2">
                <table class="w-full text-sm min-w-[360px]" style="border-top: 1px dashed #e2e8f0;">
                    <thead>
                        <tr class="text-gray-600">
                            <th class="p-1 text-right">المنتج</th>
                            <th class="p-1 text-center">الكمية</th>
                            <th class="p-1 text-center">التكلفة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr class="border-b border-gray-100">
                                <td class="p-1">${escapeHTML(item.name)}</td>
                                <td class="p-1 text-center font-mono">${item.quantity}</td>
                                <td class="p-1 text-center font-mono">${formatCurrency(item.cost)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        return `
            <div class="p-3 border rounded-md bg-yellow-50 shadow-sm mb-2">
                <div class="flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <strong class="text-yellow-800">المورد: ${supplier ? escapeHTML(supplier.name) : 'غير محدد'}</strong><br>
                        <span class="text-xs text-gray-500">رقم الفاتورة: ${escapeHTML(invoice.invoiceNumber || 'N/A')} | التاريخ: ${formatDateForDisplay(invoice.date)}</span>
                    </div>
                    <div class="font-semibold text-blue-700 text-lg">${formatCurrency(invoice.grandTotal)}</div>
                </div>

                ${itemsTableHTML}

                <div class="text-sm mt-2 pt-2 border-t flex flex-wrap justify-end gap-2">
                    <button data-pending-purchase-id="${invoice.id}" class="cancel-pending-purchase-btn text-xs bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold py-1.5 px-3 rounded shadow-sm transition-all duration-150">إلغاء الشراء</button>
                    ${receiveAndPayButtonHTML}
                    <button data-pending-purchase-id="${invoice.id}" class="receive-goods-btn text-xs ${hasDebt ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'} active:scale-95 text-white font-semibold py-1.5 px-3 rounded shadow-sm transition-all duration-150">${hasDebt ? 'استلام (بقاء الدين)' : '<i class="fas fa-check-circle ml-1"></i> استلام البضاعة (مسددة)'}</button>
                </div>
            </div>
        `;
    }).join('');
}// =======================================================
function handlePendingPurchaseActions(event) {
    const target = event.target.closest('button');
    if (!target) return;

    const pendingId = target.dataset.pendingPurchaseId;
    if (!pendingId) return;

    const purchaseIndex = pendingPurchases.findIndex(p => p.id === pendingId);
    if (purchaseIndex === -1) {
        showGlobalMessage("خطأ: لم يتم العثور على فاتورة الشراء المعلقة.", true);
        return;
    }
    const purchase = pendingPurchases[purchaseIndex];
    const supplier = suppliers.find(s => s.id === purchase.supplierId);

    // --- التعديل هنا: دالة تحديث المخزون المطورة ---
    const updateInventoryFromPurchase = (p) => {
        const totalExtraCosts = (p.extraCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const totalBaseGoodsValue = p.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.cost) || 0)), 0);
        const totalBaseQty = p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        p.items.forEach(item => {
            const itemQty = Number(item.quantity) || 0;
            const itemCost = Number(item.cost) || 0;
            let extraCostPerUnit = 0;
            if (totalExtraCosts > 0 && itemQty > 0) {
                if (totalBaseGoodsValue > 0) {
                    const itemTotalBaseCost = itemQty * itemCost;
                    const itemShareOfExtra = (itemTotalBaseCost / totalBaseGoodsValue) * totalExtraCosts;
                    extraCostPerUnit = itemShareOfExtra / itemQty;
                } else if (totalBaseQty > 0) {
                    extraCostPerUnit = totalExtraCosts / totalBaseQty;
                }
            }
            const finalUnitCost = Math.round((itemCost + extraCostPerUnit) * 1e6) / 1e6;

            const productIndex = (item.duplicateResolution === 'separate')
                ? -1
                : products.findIndex(prod => (item.id && prod.id === item.id) || prod.name.toLowerCase() === item.name.toLowerCase());
            let targetProdId = null;

            if (productIndex !== -1) {
                const existing = products[productIndex];
                const oldQty = Number(existing.quantity) || 0;
                const oldCost = Number(existing.costPrice) || 0;
                const totalQty = oldQty + itemQty;
                
                existing.quantity = totalQty;
                existing.costPrice = totalQty > 0
                    ? Math.round((((oldQty * oldCost) + (itemQty * finalUnitCost)) / totalQty) * 1e6) / 1e6
                    : finalUnitCost;
                if (item.category) existing.category = item.category;
                targetProdId = existing.id;
            } else {
                const uniqueProductCodeTransfer = (typeof window.generateGlobalID === 'function') ? window.generateGlobalID('code') : ('code_' + Date.now().toString(36));
                products.push({ 
                    id: uniqueProductCodeTransfer,
                    name: item.name, 
                    quantity: itemQty, 
                    costPrice: finalUnitCost, 
                    supplierId: p.supplierId,
                    category: item.category || ""
                });
                targetProdId = uniqueProductCodeTransfer;
            }

            if (item.serials && item.serials.length > 0) {
                item.serials.forEach(serial => {
                    if (!serialNumbersLog.some(s => s.serial === serial)) {
                        serialNumbersLog.push({
                            id: generateId("SER"),
                            serial,
                            productId: targetProdId,
                            productName: item.name, 
                            supplierId: p.supplierId, 
                            addedTimestamp: p.timestamp, 
                            status: "in_stock" 
                        });
                    }
                });
            }
        });
    };

    if (target.classList.contains('receive-goods-btn')) {
        if (!confirm(`هل أنت متأكد من استلام بضاعة الفاتورة من المورد "${supplier?.name || '-'}"؟ سيتم توزيع التكاليف الإضافية على البضاعة.`)) return;
        saveStateToHistory();
        const _recTx = typeof createStateTransaction === 'function' ? createStateTransaction('استلام بضاعة') : null;
        try {
            updateInventoryFromPurchase(purchase);

            const activeDebt = getPendingPurchaseActiveDebt(purchase);
            if (activeDebt <= 0.001) {
                purchase.remainingBalance = 0;
                purchase.paidAmount = purchase.grandTotal;
            }

            purchase.status = 'Confirmed';
            if (!purchase.id) purchase.id = generateId("PINV");
            purchaseInvoices.push(purchase);
            pendingPurchases.splice(purchaseIndex, 1);
            logOperation("استلام بضاعة", `تم استلام بضاعة من "${supplier?.name}" وتوزيع التكاليف وتحديث التصنيفات.`);
            if (_recTx) _recTx.commit();
        } catch (e) {
            if (_recTx) _recTx.rollback();
            throw e;
        }
        showGlobalMessage("تم استلام البضاعة وتحديث المخزون بالتصنيفات والتكاليف الصحيحة.", false);
        if (typeof updatePurchaseArchiveInCloud === 'function') updatePurchaseArchiveInCloud(purchase).catch(e => console.warn(e));
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));

    } else if (target.classList.contains('receive-and-pay-btn')) {
        const paymentForm = d('pending-purchase-payment-form');
        d('pp-payment-supplier-name').textContent = supplier?.name || 'غير محدد';
        const curDebt = getPendingPurchaseActiveDebt(purchase);
        d('pp-payment-remaining-amount').textContent = formatCurrency(curDebt);
        d('pp-confirm-payment-btn').dataset.pendingId = pendingId;
        paymentForm.classList.remove('hidden');
        paymentForm.scrollIntoView({ behavior: 'smooth' });

    } else if (target.classList.contains('cancel-pending-purchase-btn')) {
        const targetPendingId = target.dataset.pendingPurchaseId || purchase.id;

        // حارس حماية رأس المال: منع إلغاء شراء معلق تم تسوية التزامه بمقاصة غير نقدية أو تم سداد جزء من التزام مصاريفه المشترك بالفعل
        if (purchase.hasNonCashOffset && (Number(purchase.offsetAmount) || 0) > 0.001) {
            showGlobalMessage(`لا يمكن إلغاء هذه الفاتورة المعلقة تلقائياً لأن التزامها تمت تسويته بمقاصة غير نقدية (${formatCurrency(purchase.offsetAmount)}). يرجى عكس التسوية يدوياً أولاً لحماية رأس المال.`, true);
            return;
        }
        const extraCostsCheck = Array.isArray(purchase.extraCosts) ? purchase.extraCosts : [];
        const sharedNeedByLiab = new Map();
        extraCostsCheck.forEach(c => {
            if (c && c.isLiability && c.linkedLiabilityId) {
                sharedNeedByLiab.set(c.linkedLiabilityId, window.money((sharedNeedByLiab.get(c.linkedLiabilityId) || 0) + (Number(c.amount) || 0)));
            }
        });
        for (const [lid, totalShare] of sharedNeedByLiab.entries()) {
            if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                const sharedLiab = liabilities.find(l => l.id === lid && l.purchaseInvoiceId !== targetPendingId);
                if (sharedLiab && (Number(sharedLiab.amount) || 0) + 0.001 < totalShare) {
                    showGlobalMessage(`لا يمكن إلغاء هذه الفاتورة المعلقة تلقائياً لأن الالتزام المشترك المرتبط بمصاريفها ("${sharedLiab.name}") تم سداده أو تقليصه بالفعل عن إجمالي حصته (${formatCurrency(totalShare)}).`, true);
                    return;
                }
            }
        }

        if (!confirm(`هل أنت متأكد من إلغاء فاتورة الشراء المعلقة من المورد "${supplier?.name || '-'}"؟ سيتم إرجاع كافة المدفوعات وتسوية الالتزامات المرتبطة بها.`)) return;
        
        saveStateToHistory();
        const _cancelPurTx = typeof createStateTransaction === 'function' ? createStateTransaction('إلغاء فاتورة شراء معلقة') : null;
        try {
            // إرجاع كافة المدفوعات المسجلة (الدفعة المقدمة + أي دفعات تمت لاحقاً من قسم الالتزامات) إلى حساباتها الدقيقة
            if (Array.isArray(purchase.payments) && purchase.payments.length > 0) {
                purchase.payments.forEach(pay => {
                    const amt = window.money(Number(pay.amount) || 0);
                    if (amt <= 0.001) return;
                    const accountToRefund = accounts.find(acc => acc.id === pay.accountId) || accounts[0];
                    if (accountToRefund) {
                        accountToRefund.balance = window.money((Number(accountToRefund.balance) || 0) + amt);
                        const totalLiq = window.money(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
                        liquidityLog.push({ 
                            id: generateId("liq"),
                            timestamp: new Date().toISOString(),
                            type: "add", 
                            amount: amt, 
                            description: `إلغاء شراء معلق وإرجاع دفعة للفاتورة ${targetPendingId}`, 
                            currentBalance: totalLiq,
                            accountId: accountToRefund.id
                        });
                    }
                });
            } else if (purchase.deductedFromLiquidity && Number(purchase.paidAmount) > 0 && purchase.paidFromAccountId) {
                const refundAmt = window.money(Number(purchase.paidAmount) || 0);
                const accountToRefund = accounts.find(acc => acc.id === purchase.paidFromAccountId);
                if (accountToRefund) {
                    accountToRefund.balance = window.money((Number(accountToRefund.balance) || 0) + refundAmt);
                    const totalLiq = window.money(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
                    liquidityLog.push({ 
                        id: generateId("liq"),
                        timestamp: new Date().toISOString(),
                        type: "add", 
                        amount: refundAmt, 
                        description: `إلغاء شراء وإرجاع عربون للفاتورة ${targetPendingId}`, 
                        currentBalance: totalLiq,
                        accountId: accountToRefund.id
                    });
                }
            }

            // تسوية الالتزامات المرتبطة بدقة: خصم مساهمة المصاريف الإضافية من أي التزام مشترك دون مسح رصيده القديم
            if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                const ownedLiabIds = new Set(liabilities.filter(l => l && l.purchaseInvoiceId === targetPendingId).map(l => l.id));
                const externalRef = (pendingPurchases || []).find(other =>
                    other && other.id !== targetPendingId &&
                    Array.isArray(other.extraCosts) &&
                    other.extraCosts.some(c => c && c.isLiability && c.linkedLiabilityId && ownedLiabIds.has(c.linkedLiabilityId))
                );
                if (externalRef) {
                    if (_cancelPurTx) _cancelPurTx.rollback();
                    showGlobalMessage(`لا يمكن إلغاء هذه الفاتورة المعلقة لأن التزامها مرتبط بمصاريف فاتورة معلقة أخرى (${externalRef.invoiceNumber || externalRef.id}). ألغِ أو سوِّ الفاتورة الأخرى أولاً لحماية رأس المال.`, true);
                    return;
                }
                const extraCostsList = Array.isArray(purchase.extraCosts) ? purchase.extraCosts : [];
                extraCostsList.forEach(c => {
                    if (c && c.isLiability && c.linkedLiabilityId) {
                        const sharedLiab = liabilities.find(l => l.id === c.linkedLiabilityId && l.purchaseInvoiceId !== targetPendingId);
                        if (sharedLiab) {
                            sharedLiab.amount = window.money(Math.max(0, (Number(sharedLiab.amount) || 0) - (Number(c.amount) || 0)));
                            if (sharedLiab.amount <= 0.001) {
                                sharedLiab.amount = 0;
                                sharedLiab.status = 'paid';
                            }
                        }
                    }
                });
                liabilities = liabilities.filter(l => l.purchaseInvoiceId !== targetPendingId);
            }
            
            pendingPurchases.splice(purchaseIndex, 1);
            
            logOperation("إلغاء فاتورة شراء معلقة", `تم إلغاء شراء من "${supplier?.name}" وإرجاع المدفوعات وتسوية الالتزامات.`);
            if (_cancelPurTx) _cancelPurTx.commit();
        } catch (e) {
            if (_cancelPurTx) _cancelPurTx.rollback();
            throw e;
        }
        showGlobalMessage("تم إلغاء الشراء وإرجاع المدفوعات وتسوية الالتزامات بنجاح.", false, true);

        if (typeof updateUI === 'function') updateUI(); 
        if (typeof markPurchaseArchiveCancelled === 'function') {
            markPurchaseArchiveCancelled(targetPendingId, 'cancelled_pending_purchase').catch(e => console.warn(e));
        }
        if (typeof saveSystemToCloud === 'function') {
            saveSystemToCloud().catch(e => console.error(e));
        }
    }
    updateUI();
}
async function pi_confirmPurchaseInvoice() {
    if (!pi_validateForm()) { return; }

    const goodsReceived = d('pi_goods_received').checked;
    const deductFromLiquidity = d('pi_deduct_from_liquidity').checked;
    const paidAmountValue = parseInputNumber(piPaidAmountInput || d('pi_paid_amount')) || 0;
    const selectedAccountId = d('pi_payment_account').value;
    const account = accounts.find(acc => acc.id === selectedAccountId);

    let itemsSubtotal = 0;
    const targetItemsBody = piItemsBody || d('pi_items_body');
    const rawItems = Array.from(targetItemsBody ? targetItemsBody.querySelectorAll('tr') : []).map(row => {
        const q = parseInt(row.dataset.quantity);
        const c = parseFloat(row.dataset.cost);
        itemsSubtotal += (q * c);
        return { 
            name: row.dataset.name, 
            category: row.dataset.category || "", 
            quantity: q, 
            cost: c, 
            serials: JSON.parse(row.dataset.serials || '[]'),
            // �� [تم التحديث]: قراءة قرار المودال الذكي (دمج / فصل / اسم جديد) المحفور في الـ DOM
            duplicateResolution: row.dataset.duplicateResolution || "" 
        };
    });
    let extraCostsList = [];
    let totalExtraCostsVal = 0;
    let totalLiabilitiesVal = 0;

    document.querySelectorAll('.pi-extra-cost-row').forEach(row => {
        const nameInput = row.querySelector('.pi-cost-name');
        const amountInput = row.querySelector('.pi-cost-amount');
        const liabilityCheckbox = row.querySelector('.pi-cost-liability');
        const liabilitySelect = row.querySelector('.pi-liability-select');

        if (nameInput && amountInput) {
            const name = nameInput.value.trim() || "مصروف إضافي";
            const amount = parseFloat(amountInput.value) || 0;
            const isLiability = liabilityCheckbox ? liabilityCheckbox.checked : false;
            const linkedLiabilityId = (isLiability && liabilitySelect) ? liabilitySelect.value : "";

            if (amount > 0) {
                extraCostsList.push({ name, amount, isLiability, linkedLiabilityId });
                totalExtraCostsVal += amount;
                if (isLiability) totalLiabilitiesVal += amount;
            }
        }
    });

    const trueGrandTotal = window.money(itemsSubtotal + totalExtraCostsVal);
    const maxCashPayment = window.money(trueGrandTotal - totalLiabilitiesVal);
    const cleanPaidAmount = window.money(Number(paidAmountValue) || 0);

    const formMsg = piFormMessage || d('pi_form_message');

    if (cleanPaidAmount < 0) {
        if (formMsg) showMessage(formMsg, `تنبيه: لا يمكن أن يكون المبلغ المدفوع سالباً.`, true);
        return;
    }

    if (cleanPaidAmount > (maxCashPayment + 0.001)) {
        if (formMsg) showMessage(formMsg, `تنبيه: المبلغ المدفوع أكبر من المستحق نقداً.`, true);
        return;
    }

    if (deductFromLiquidity && cleanPaidAmount > 0) {
        if (!selectedAccountId || !account || cleanPaidAmount > (Number(account.balance) || 0) + 0.001) {
            if (formMsg) showMessage(formMsg, `تنبيه: تحقق من رصيد الحساب المختار.`, true);
            return;
        }
    }

    saveStateToHistory();

    const supplierSel = piSupplierSelect || d('pi_supplier');
    const invoiceNumInput = piInvoiceNumberInput || d('pi_invoice_number');
    const dateInput = piDateInput || d('pi_date');

    const invoiceData = {
        id: generateId('pi'),
        supplierId: supplierSel ? supplierSel.value : '',
        invoiceNumber: invoiceNumInput ? invoiceNumInput.value.trim() : '',
        date: dateInput ? dateInput.value : '',
        timestamp: new Date().toISOString(),
        items: rawItems,
        extraCosts: extraCostsList,
        grandTotal: trueGrandTotal,
        paidAmount: cleanPaidAmount,
        remainingBalance: window.money(Math.max(0, trueGrandTotal - cleanPaidAmount - totalLiabilitiesVal)),
        status: goodsReceived ? 'Confirmed' : 'Pending',
        deductedFromLiquidity: deductFromLiquidity && cleanPaidAmount > 0,
        paidFromAccountId: (deductFromLiquidity && cleanPaidAmount > 0) ? selectedAccountId : null,
        payments: (deductFromLiquidity && cleanPaidAmount > 0 && selectedAccountId)
            ? [{ accountId: selectedAccountId, amount: cleanPaidAmount, date: new Date().toISOString(), source: 'initial_payment' }]
            : []
    };

    // =====================================================================
        // ��️ [تعديل ذكي لـ د. ضياء] - اعتراض وفحص تكرار الأسماء داخل فاتورة المشتريات
        // =====================================================================
        let hasDuplicateInInvoice = false;

        for (let i = 0; i < invoiceData.items.length; i++) {
            const item = invoiceData.items[i];
            
            if (!item.duplicateResolution) {
                const duplicate = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
                if (duplicate) {
                    // إذا كان المنتج موجوداً مسبقاً ولكن رصيده صفر، نقوم بدمجه تلقائياً بدون إزعاج المستخدم بالمودال
                    if (Number(duplicate.quantity) <= 0) {
                        item.duplicateResolution = 'merge';
                        continue;
                    }

                    window.lastPurchaseDuplicateID = duplicate.id || null; // �� حفظ كود صنف المشتريات المكرر في الذاكرة
                    hasDuplicateInInvoice = true;
                    
                    window.pendingPurchaseInvoiceItem = {
                        item: item,
                        rowIndex: i,
                        duplicate: duplicate,
                        resumeCallback: async () => {
                            if (typeof pi_confirmPurchaseInvoice === 'function') {
                                await pi_confirmPurchaseInvoice(); 
                            }
                        }
                    };

                    const modal = document.getElementById("productDuplicateNameModal");
                    const modalText = document.getElementById("duplicateModalText");
                    if (modal && modalText) {
                        modalText.innerHTML = `تنبيه (فاتورة المشتريات): البند <strong>"${escapeHTML(item.name)}"</strong> مسجل مسبقاً في المخزن بقسم <strong>"${escapeHTML(duplicate.category || 'عام')}"</strong>.<br><br>الكمية الحالية له بالسيستم: <strong>${duplicate.quantity}</strong> قطعة.<br>اختر الإجراء المناسب لتوجيه هذا البند بالفاتورة:`;
                        modal.style.display = "flex";
                        document.querySelector('input[name="duplicateAction"][value="merge"]').checked = true;
                        document.getElementById("renameInputContainer").classList.add('hidden');
                        document.getElementById("newProductNameInput").value = item.name + " - جديد";
                    }
                    return; // �� إيقاف الحفظ الفوري للفاتورة لحين حل التكرار من خلال المودال
                }
            }
        }

        window.pendingPurchaseInvoiceItem = null; // تصفير كائن الانتظار بعد العبور الآمن

        // بدء المعاملة الذرية لحماية المخزون والسيولة والالتزامات
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        try {
            // [تأمين القيود]: يتم تسجيل التكاليف الإضافية في الالتزامات الآن بعد عبور الفحص بنجاح
            const supplier = suppliers.find(s => s.id === invoiceData.supplierId);
        extraCostsList.forEach(cost => {
            if (!cost.isLiability || cost.amount <= 0) return;

            const existingLiability = cost.linkedLiabilityId ? liabilities.find(l => l.id === cost.linkedLiabilityId) : null;
            if (existingLiability) {
                existingLiability.amount = window.money((Number(existingLiability.amount) || 0) + (Number(cost.amount) || 0));
                existingLiability.status = 'active';
                // لا نطبع purchaseInvoiceId على التزام عام موجود مسبقاً حتى لا يختلط برصيد الفاتورة أو يُحذف عند إلغائها
                if (!Array.isArray(existingLiability.extraCostContributions)) existingLiability.extraCostContributions = [];
                existingLiability.extraCostContributions.push({ invoiceId: invoiceData.id, name: cost.name, amount: window.money(cost.amount), date: new Date().toISOString() });
                logOperation("ربط تكلفة إضافية بالتزام موجود", `تمت إضافة "${cost.name}" بقيمة ${formatCurrency(cost.amount)} إلى الالتزام "${existingLiability.name}" ضمن فاتورة الشراء رقم "${invoiceData.invoiceNumber || invoiceData.id}".`);
            } else {
                const newLiability = {
                    id: generateId('liab') || generateId("LIA"),
                    name: `${cost.name} - ${supplier?.name || 'مورد غير محدد'}`,
                    amount: window.money(cost.amount),
                    status: 'active',
                    date: invoiceData.date || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
                    purchaseInvoiceId: invoiceData.id,
                    source: 'purchase_extra_cost',
                    invoiceNumber: invoiceData.invoiceNumber || '',
                    supplierId: invoiceData.supplierId,
                    type: "supplier",
                    createdAt: new Date().toISOString()
                };
                cost.linkedLiabilityId = newLiability.id;
                liabilities.push(newLiability);
                logOperation("إنشاء التزام تكلفة إضافية", `تم إنشاء التزام جديد باسم "${newLiability.name}" بقيمة ${formatCurrency(cost.amount)} من فاتورة الشراء رقم "${invoiceData.invoiceNumber || invoiceData.id}".`);
            }
        });

        // تنفيذ الخصم المالي الفعلي من حساب السيولة
        if (invoiceData.paidAmount > 0 && deductFromLiquidity && account) {
            account.balance = window.money((Number(account.balance) || 0) - invoiceData.paidAmount);
            const newTotalLiquidity = window.money(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
            liquidityLog.push({ 
                id: generateId("liq"),
                timestamp: new Date().toISOString(),
                type: "remove", 
                amount: invoiceData.paidAmount, 
                description: goodsReceived ? `دفع فاتورة شراء لـ ${supplier?.name}` : `عربون شراء لـ ${supplier?.name}`, 
                currentBalance: newTotalLiquidity,
                accountId: account.id
            });
        }

        // ترحيل البضائع للمخزن الفعلي أو الحفظ كفاتورة معلقة
        if (goodsReceived) {
            const totalInvoiceQty = invoiceData.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
            invoiceData.items.forEach(item => {
                const itemQty = Number(item.quantity) || 0;
                const itemCost = Number(item.cost) || 0;
                let extraCostPerUnit = 0;
                if (totalExtraCostsVal > 0 && itemQty > 0) {
                    if (itemsSubtotal > 0) {
                        const itemTotalBaseCost = itemQty * itemCost;
                        const itemShareOfExtra = (itemTotalBaseCost / itemsSubtotal) * totalExtraCostsVal;
                        extraCostPerUnit = itemShareOfExtra / itemQty;
                    } else if (totalInvoiceQty > 0) {
                        extraCostPerUnit = totalExtraCostsVal / totalInvoiceQty;
                    }
                }
                const finalCostPerUnit = Math.round((itemCost + extraCostPerUnit) * 1e6) / 1e6;

                let productIndex = -1;
                if (item.duplicateResolution === 'separate') {
                    productIndex = -1;
                } else {
                    productIndex = products.findIndex(p => p.name.toLowerCase() === item.name.toLowerCase());
                }
                let targetProdId = null;

                if (productIndex !== -1) {
                    const existing = products[productIndex];
                    const oldQty = Number(existing.quantity) || 0;
                    const oldCost = Number(existing.costPrice) || 0;
                    existing.quantity = oldQty + itemQty;
                    existing.costPrice = existing.quantity > 0
                        ? Math.round((((oldQty * oldCost) + (itemQty * finalCostPerUnit)) / existing.quantity) * 1e6) / 1e6
                        : finalCostPerUnit;
                    if (item.category) existing.category = item.category;
                    targetProdId = existing.id;
                } else {
                    const uniqueProductCode = (typeof window.generateGlobalID === 'function') ? window.generateGlobalID('code') : ('code_' + Date.now().toString(36));
                    products.push({ 
                        id: uniqueProductCode, 
                        name: item.name, 
                        quantity: itemQty, 
                        costPrice: finalCostPerUnit, 
                        supplierId: invoiceData.supplierId, 
                        category: item.category || "" 
                    });
                    targetProdId = uniqueProductCode;
                }
                delete item.duplicateResolution;

                if (item.serials && item.serials.length > 0 && typeof serialNumbersLog !== 'undefined') {
                    item.serials.forEach(serial => {
                        if (!serialNumbersLog.some(s => s.serial === serial)) {
                            serialNumbersLog.push({
                                id: generateId("SER"),
                                serial: serial,
                                productId: targetProdId,
                                productName: item.name,
                                supplierId: invoiceData.supplierId,
                                addedTimestamp: invoiceData.timestamp,
                                status: "in_stock"
                            });
                        }
                    });
                }
            });
            if (!invoiceData.id) invoiceData.id = generateId("PINV");
        purchaseInvoices.push(invoiceData);
        } else {
            pendingPurchases.push(invoiceData);
        }

    // تسجيل الالتزام إذا وجد متبقي
   if (invoiceData.remainingBalance > 0.001) {
    liabilities.push({ 
        id: generateId('liab'), 
        // �� هذا هو السطر الأهم للربط الذي يسمح بالحذف التلقائي عند الإلغاء
        purchaseInvoiceId: invoiceData.id, 
        name: `متبقي فاتورة لـ: ${supplier?.name || '-'}`, 
        amount: invoiceData.remainingBalance,
        status: 'active',
        date: invoiceData.date || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })), // التاريخ ليظهر في الجدول
        supplierId: invoiceData.supplierId, // لربط الدين بالمورد
        type: "supplier" // لتحديد نوع الالتزام
    });
}
    // �� أهم سطر: الأرشفة السحابية تعمل الآن في الحالتين
    // حفظ محلي فوري واستجابة سريعة للواجهة
    logOperation(goodsReceived ? "فاتورة شراء" : "شراء معلق", `فاتورة من ${supplier?.name} بقيمة ${formatCurrency(invoiceData.grandTotal)}.`);
    if (_tx) _tx.commit();
    localStorage.removeItem('finance_pi_draft');
    pi_clearForm(false);
    updateUI();
    const successMsg = goodsReceived 
        ? "تم تأكيد الفاتورة وإدخال البضاعة بنجاح." 
        : "تم تسجيل فاتورة الشراء بنجاح (قيد الاستلام).";
    showMessage(piFormMessage || d('pi_form_message'), successMsg, false);

    savePurchaseInvoiceToCloud(invoiceData).catch(e => console.warn(e));
    if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.warn(e));
    } catch (piErr) {
        if (_tx) await _tx.rollback();
        console.error("❌ فشل حفظ فاتورة المشتريات (تم التراجع عن التعديلات):", piErr);
        if (typeof showMessage === 'function') {
            showMessage(piFormMessage || d('pi_form_message'), "تعذر الحفظ في السحابة؛ تم التراجع التلقائي عن أي تعديل في المخزن أو الخزنة.", true);
        }
        return;
    }
}

// =======================================================
// إدارة مسودة فواتير الشراء (Purchase Invoice Drafts)
// =======================================================
function pi_saveDraft() {
    const items = [];
    const body = d('pi_items_body');
    if (body) {
        Array.from(body.children).forEach(row => {
            if (row.dataset && row.dataset.name) {
                let sArr = [];
                try { sArr = JSON.parse(row.dataset.serials || '[]'); } catch(e){ console.warn("تعذر قراءة السيريالات:", e); sArr = []; }
                items.push({
                    name: row.dataset.name,
                    category: row.dataset.category || '',
                    quantity: parseInt(row.dataset.quantity) || 1,
                    cost: parseFloat(row.dataset.cost) || 0,
                    subtotal: parseFloat(row.dataset.subtotal) || 0,
                    serials: sArr
                });
            }
        });
    }

    const extraCosts = Array.from(document.querySelectorAll('.pi-extra-cost-row')).map(row => ({
        name: (row.querySelector('.pi-cost-name') || {}).value || '',
        amount: (row.querySelector('.pi-cost-amount') || {}).value || '',
        isLiability: !!(row.querySelector('.pi-cost-liability') || {}).checked,
        linkedLiabilityId: (row.querySelector('.pi-liability-select') || {}).value || ''
    })).filter(c => c.name || c.amount);

    const draft = {
        supplierId: d('pi_supplier') ? d('pi_supplier').value : '',
        invoiceNumber: d('pi_invoice_number') ? d('pi_invoice_number').value : '',
        date: d('pi_date') ? d('pi_date').value : '',
        paidAmount: d('pi_paid_amount') ? d('pi_paid_amount').value : '0',
        deductFromLiquidity: d('pi_deduct_from_liquidity') ? d('pi_deduct_from_liquidity').checked : true,
        paymentAccountId: d('pi_payment_account') ? d('pi_payment_account').value : '',
        goodsReceived: d('pi_goods_received') ? d('pi_goods_received').checked : true,
        items: items,
        extraCosts: extraCosts,
        timestamp: new Date().toISOString()
    };

    const formMsg = piFormMessage || d('pi_form_message');

    if (items.length === 0 && !draft.supplierId && !draft.invoiceNumber && extraCosts.length === 0) {
        if (formMsg) showMessage(formMsg, 'لا توجد بيانات بالفاتورة لحفظها كمسودة.', true);
        return;
    }

    localStorage.setItem('finance_pi_draft', JSON.stringify(draft));
    if (formMsg) showMessage(formMsg, 'تم حفظ مسودة فاتورة الشراء بنجاح. يمكنك استعادتها في أي وقت.', false);
}

function pi_loadDraft() {
    const formMsg = piFormMessage || d('pi_form_message');
    const draftStr = localStorage.getItem('finance_pi_draft');
    if (!draftStr) {
        if (formMsg) showMessage(formMsg, 'لا توجد مسودة محفوظة حالياً.', true);
        return;
    }
    try {
        const draft = JSON.parse(draftStr);
        if (d('pi_supplier') && draft.supplierId) d('pi_supplier').value = draft.supplierId;
        if (d('pi_invoice_number') && draft.invoiceNumber) d('pi_invoice_number').value = draft.invoiceNumber;
        if (d('pi_date') && draft.date) d('pi_date').value = draft.date;
        if (d('pi_paid_amount') && draft.paidAmount !== undefined) d('pi_paid_amount').value = draft.paidAmount;
        if (d('pi_deduct_from_liquidity') && draft.deductFromLiquidity !== undefined) {
            d('pi_deduct_from_liquidity').checked = draft.deductFromLiquidity;
            const container = d('pi-payment-account-container');
            if (container) {
                if (draft.deductFromLiquidity) container.classList.remove('hidden');
                else container.classList.add('hidden');
            }
        }
        if (d('pi_payment_account') && draft.paymentAccountId) d('pi_payment_account').value = draft.paymentAccountId;
        if (d('pi_goods_received') && draft.goodsReceived !== undefined) d('pi_goods_received').checked = draft.goodsReceived;

        const costsContainer = d('pi_additional_costs_container');
        if (costsContainer) {
            costsContainer.innerHTML = '';
            if (Array.isArray(draft.extraCosts) && draft.extraCosts.length > 0) {
                draft.extraCosts.forEach(c => {
                    if (window.pi_addExtraCostRow) window.pi_addExtraCostRow();
                    const r = costsContainer.querySelector('.pi-extra-cost-row:last-child');
                    if (r) {
                        const n = r.querySelector('.pi-cost-name'), a = r.querySelector('.pi-cost-amount'), l = r.querySelector('.pi-cost-liability'), s = r.querySelector('.pi-liability-select');
                        if (n) n.value = c.name || '';
                        if (a) a.value = c.amount || '';
                        if (l && c.isLiability) { l.checked = true; l.dispatchEvent(new Event('change')); if (s && c.linkedLiabilityId) s.value = c.linkedLiabilityId; }
                    }
                });
            } else if (d('pi_no_extra_costs_msg')) d('pi_no_extra_costs_msg').style.display = 'block';
        }

        const body = d('pi_items_body');
        if (body) {
            body.innerHTML = '';
            if (Array.isArray(draft.items) && draft.items.length > 0) {
                draft.items.forEach(item => {
                    const newRow = document.createElement('tr');
                    newRow.dataset.name = item.name;
                    newRow.dataset.category = item.category || '';
                    newRow.dataset.quantity = item.quantity;
                    newRow.dataset.cost = item.cost;
                    newRow.dataset.subtotal = item.subtotal || (item.quantity * item.cost);
                    newRow.dataset.serials = JSON.stringify(item.serials || []);

                    newRow.innerHTML = `
                        <td class="border p-2">
                            ${escapeHTML(item.name)} 
                            ${item.category ? `<span class="text-xs text-blue-600 block">(${escapeHTML(item.category)})</span>` : ''} 
                            ${item.serials && item.serials.length > 0 ? `<span class="text-xs text-gray-500 block">(${item.serials.length} S/N)</span>` : ''}
                        </td>
                        <td class="border p-2 text-center font-mono">${item.quantity}</td>
                        <td class="border p-2 text-center font-mono">${formatCurrency(item.cost)}</td>
                        <td class="border p-2 text-center font-mono font-bold">${formatCurrency(newRow.dataset.subtotal)}</td>
                        <td class="border p-2 text-center no-print">
                            <button type="button" class="pi_edit_item_btn text-blue-500 hover:text-blue-700 font-bold ml-2" title="تعديل البند">✎</button>
                            <button type="button" class="pi_remove_item_btn text-red-500 hover:text-red-700 font-bold" title="حذف البند">×</button>
                        </td>
                    `;
                    body.appendChild(newRow);
                });
                if (d('pi_no_items_msg')) d('pi_no_items_msg').classList.add('hidden');
            } else {
                if (d('pi_no_items_msg')) d('pi_no_items_msg').classList.remove('hidden');
            }
        }
        if (window.pi_updateTotals) window.pi_updateTotals();
        if (formMsg) showMessage(formMsg, 'تم استعادة المسودة بنجاح.', false);
    } catch (err) {
        console.error('Error loading draft:', err);
        if (formMsg) showMessage(formMsg, 'حدث خطأ أثناء تحميل المسودة.', true);
    }
}
window.pi_saveDraft = pi_saveDraft;
window.pi_loadDraft = pi_loadDraft;

window.pi_addExtraCostRow = function() {
    const container = document.getElementById('pi_additional_costs_container');
    const noMsg = document.getElementById('pi_no_extra_costs_msg');
    
    if (!container) return;
    if (noMsg) noMsg.style.display = 'none';

    // تجهيز خيارات الالتزامات
    let liabilitiesOptions = '<option value="">-- إنشاء التزام جديد (باسم التكلفة) --</option>';
    if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
        liabilities.filter(l => parseFloat(l.amount) > 0).forEach(l => {
            liabilitiesOptions += `<option value="${l.id}">${escapeHTML(l.name)} (مدين بـ: ${l.amount})</option>`;
        });
    }

    const div = document.createElement('div');
    // تصميم البطاقة
    div.className = "pi-extra-cost-row mb-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group";
    
    div.innerHTML = `
        <div class="flex flex-wrap items-start gap-3">
            
            <div class="flex-grow min-w-[150px]">
                <label class="block text-[10px] text-gray-500 font-bold mb-1">وصف التكلفة</label>
                <input type="text" placeholder="مثلاً: شحن، عتالة" 
                       class="pi-cost-name w-full text-sm border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow bg-gray-50 focus:bg-white">
            </div>

            <div class="w-28">
                <label class="block text-[10px] text-gray-500 font-bold mb-1">المبلغ</label>
                <div class="relative">
                    <input type="number" placeholder="0" value="" min="0" step="0.01" 
                           class="pi-cost-amount w-full text-sm font-bold text-blue-700 border-gray-300 rounded pl-8 pr-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-center" 
                           oninput="window.pi_updateTotals()">
                    <span class="absolute left-1 top-1.5 text-[10px] text-gray-400 font-normal pointer-events-none">ج.م</span>
                </div>
            </div>

            <div class="pt-6">
                <button type="button" onclick="this.closest('.pi-extra-cost-row').remove(); window.pi_updateTotals();" 
                        class="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors" title="حذف هذا البند">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>

        <div class="mt-2 pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
            
            <label class="flex items-center cursor-pointer select-none">
                <input type="checkbox" class="pi-cost-liability w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer" 
                       onchange="
                           const select = this.closest('.pi-extra-cost-row').querySelector('.pi-liability-select');
                           const container = this.closest('.pi-extra-cost-row').querySelector('.liability-options-container');
                           
                           if (this.checked) {
                               container.classList.remove('hidden');
                               container.classList.add('flex');
                               this.parentElement.classList.add('text-red-700');
                           } else {
                               container.classList.add('hidden');
                               container.classList.remove('flex');
                               select.value = ''; 
                               this.parentElement.classList.remove('text-red-700');
                           }
                           window.pi_updateTotals();
                       ">
                <span class="mr-2 text-xs font-bold text-gray-600 transition-colors">تسجيل كدين (آجل)؟</span>
            </label>

            <div class="liability-options-container hidden flex-grow items-center animate-fade-in-down">
                <select class="pi-liability-select w-full text-xs border-yellow-300 bg-yellow-50 rounded text-gray-700 py-1 px-2 focus:ring-1 focus:ring-yellow-500 outline-none">
                    ${liabilitiesOptions}
                </select>
            </div>
        </div>
    `;

    container.appendChild(div);
};

window.pi_updateTotals = function() {
    const m = (typeof window.money === 'function' ? window.money : Number);
    // 1. حساب إجمالي المنتجات (البضاعة)
    let subtotal = 0;
    const itemsBody = document.getElementById('pi_items_body');
    if (itemsBody) {
        itemsBody.querySelectorAll('tr').forEach(row => {
            subtotal = m(subtotal + (parseFloat(row.dataset.subtotal) || 0));
        });
    }

    // 2. حساب المصاريف الإضافية + فصل الديون
    let totalExtra = 0;
    let totalLiabilities = 0; 

    document.querySelectorAll('.pi-extra-cost-row').forEach(row => {
        const amountInput = row.querySelector('.pi-cost-amount');
        const liabilityCheckbox = row.querySelector('.pi-cost-liability');
        
        const amount = parseFloat(amountInput.value) || 0;
        // التأكد من قراءة حالة الصندوق بشكل صحيح
        const isLiability = liabilityCheckbox.checked;

        totalExtra = m(totalExtra + amount);
        
        // إذا كان التزام، نجمعه في متغير الديون لطرحه لاحقاً
        if (isLiability) {
            totalLiabilities = m(totalLiabilities + amount);
        }
    });

    // 3. الحسابات النهائية
    const grandTotal = m(subtotal + totalExtra); // (1000 + 100 + 100) = 1200
    const cashRequired = m(grandTotal - totalLiabilities); // (1200 - 100) = 1100

    // 4. تحديث الواجهة
    
    // أ. عرض الإجمالي الكلي
    const totalSpan = document.getElementById('pi_grand_total');
    if (totalSpan) totalSpan.textContent = grandTotal.toFixed(2) + " جنيه";

    // ب. عرض المطلوب دفعه نقداً (السطر الجديد)
    const cashRequiredSpan = document.getElementById('pi_cash_required');
    if (cashRequiredSpan) cashRequiredSpan.textContent = cashRequired.toFixed(2) + " جنيه";

    // ج. عرض المبلغ المدفوع
    const paidInput = document.getElementById('pi_paid_amount');
    const paid = paidInput ? (parseFloat(paidInput.value) || 0) : 0;
    
    const paidDisplay = document.getElementById('pi_paid_amount_display');
    if (paidDisplay) paidDisplay.textContent = paid.toFixed(2) + " جنيه";
    
    // د. عرض المتبقي للمورد وتفصيل الالتزامات
    const remaining = m(cashRequired - paid);
    const remainingSpan = document.getElementById('pi_remaining_balance');
    if (remainingSpan) remainingSpan.textContent = remaining.toFixed(2) + " جنيه";

    const extraRow = document.getElementById('pi_extra_liabilities_row');
    const extraSpan = document.getElementById('pi_extra_liabilities_display');
    const totalDebtSpan = document.getElementById('pi_total_debt_display');
    if (extraRow && extraSpan) {
        extraRow.classList.toggle('hidden', totalLiabilities <= 0);
        extraSpan.textContent = totalLiabilities.toFixed(2) + " جنيه";
    }
    if (totalDebtSpan) totalDebtSpan.textContent = m(remaining + totalLiabilities).toFixed(2) + " جنيه";

    // تحديث حالة رسالة التكاليف الإضافية الفارغة
    const costsContainer = document.getElementById('pi_additional_costs_container');
    const noCostsMsg = document.getElementById('pi_no_extra_costs_msg');
    if (costsContainer && noCostsMsg) {
        noCostsMsg.style.display = costsContainer.querySelectorAll('.pi-extra-cost-row').length === 0 ? 'block' : 'none';
    }
};

