function pi_addItem() {
    const name = piItemNameInput.value.trim();
    const categoryInput = document.getElementById('pi_item_category');
    const category = categoryInput ? categoryInput.value.trim() : ""; 
    const quantity = parseInt(piItemQuantityInput.value);
    // نعتمد على سعر الوحدة كمرجع أساسي لأنه الأدق في التخزين
    const cost = parseFloat(piItemCostInput.value) || 0;
    // نستخدم السعر الإجمالي للعرض أو التحقق
    const totalCostInput = document.getElementById('pi_item_total_cost');
    const totalCost = totalCostInput ? (parseFloat(totalCostInput.value) || 0) : (quantity * cost);
    const serialsInput = piItemSerialsTextarea.value.trim();
    // التحقق
    if (!name || isNaN(quantity) || quantity <= 0 || cost < 0) {
        showMessage(piItemAddMessage, "يرجى إدخال البيانات بشكل صحيح.", true);
        return;
    }

    const serials = serialsInput ? serialsInput.split('\n').map(s => s.trim()).filter(Boolean) : [];
    if (serials.length > 0 && serials.length !== quantity) {
         showMessage(piItemAddMessage, `عدد السيريالات (${serials.length}) لا يطابق الكمية (${quantity}).`, true);
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
            ${name} 
            ${category ? `<span class="text-xs text-blue-600 block">(${category})</span>` : ''} 
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
    piItemsBody.appendChild(newRow);
    pi_no_items_msg.classList.add('hidden');
    pi_updateTotals();
    // تنظيف الحقول
    piItemNameInput.value = '';
    if(categoryInput) categoryInput.value = '';
    piItemQuantityInput.value = '1';
    piItemCostInput.value = '0';
    if(totalCostInput) totalCostInput.value = '0'; // تصفير الإجمالي أيضاً
    piItemSerialsTextarea.value = '';
    piItemSerialsContainer.classList.add('hidden');
    showMessage(piItemAddMessage, "");
    piItemNameInput.focus();
}
function pi_clearForm(shouldShowMessage = true) {
    // 1. مسح الحقول الأساسية
    d('pi_invoice_number').value = '';
    d('pi_date').value = (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
    piSupplierSelect.value = '';
    // 2. مسح جدول المنتجات
    piItemsBody.innerHTML = '';
    d('pi_no_items_msg').classList.remove('hidden');
    // 3. مسح الحقول المالية
    piPaidAmountInput.value = '0';
    d('pi_goods_received').checked = true; // الوضع الافتراضي
    d('pi_deduct_from_liquidity').checked = true; // الوضع الافتراضي
    if(d('pi_payment_account')) d('pi_payment_account').value = ''; // تصفير الحساب

    // 4. مسح التكاليف الإضافية الديناميكية وإظهار رسالة الحالة الفارغة
    const costsContainer = d('pi_additional_costs_container');
    if (costsContainer) {
        costsContainer.innerHTML = ''; // حذف كل صفوف التكاليف المضافة
    }
    const noCostsMsg = d('pi_no_extra_costs_msg');
    if (noCostsMsg) noCostsMsg.style.display = 'block';
    // 5. تحديث الإجماليات لتظهر أصفار
    pi_updateTotals();
    // رسائل النظام
    if (shouldShowMessage !== false) {
        showMessage(piFormMessage, "تم بدء فاتورة جديدة فارغة.", false);
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
    if (paidAmount > grandTotal + 0.001) {
        errors.push(`المبلغ المدفوع (${formatCurrency(paidAmount)}) لا يمكن أن يكون أكبر من إجمالي الفاتورة (${formatCurrency(grandTotal)}).`);
    }

    // --- التحقق من رصيد الحساب المحدد ---
    if (deductFromLiquidity && paidAmount > 0) {
        const selectedAccountId = d('pi_payment_account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);
        if (!account) {
            errors.push("يرجى اختيار حساب الدفع للتحقق من الرصيد.");
        } else if (paidAmount > account.balance) {
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
                    <button data-invoice-id="${escapeHTML(invoice.id)}" onclick="window.openPurchaseReturnModal(this.dataset.invoiceId)" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-1 px-3 rounded border border-red-300 transition">
                        <i class="fas fa-undo-alt mr-1"></i> عمل مرتجع للمورد
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

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

        const allInvoiceLiabs = (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) ? liabilities.filter(l => l.purchaseInvoiceId === invoice.id || (invoice.extraCosts || []).some(c => c.isLiability && c.linkedLiabilityId === l.id)) : [];
        const activeDebt = allInvoiceLiabs.length > 0 ? allInvoiceLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0) : Math.min(Number(invoice.remainingBalance) || 0, Math.max(0, (Number(invoice.grandTotal) || 0) - (Number(invoice.paidAmount) || 0)));
        const hasDebt = activeDebt > 0.001;

        let receiveAndPayButtonHTML = '';
        if (hasDebt) {
            receiveAndPayButtonHTML = `<button data-pending-purchase-id="${invoice.id}" class="receive-and-pay-btn text-xs bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold py-1.5 px-3 rounded shadow-sm transition-all duration-150">استلام وتسديد المتبقي</button>`;
        }

        const itemsTableHTML = `
            <table class="w-full text-sm mt-2" style="border-top: 1px dashed #e2e8f0;">
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

                <div class="text-sm mt-2 pt-2 border-t flex justify-end gap-2">
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
        // 1. حساب إجمالي التكاليف الإضافية (مثل الشحن والعتالة) المسجلة في الفاتورة
        const totalExtraCosts = (p.extraCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        
        // 2. حساب إجمالي قيمة البضاعة الأساسية لعمل توزيع نسبي عادل
        const totalBaseGoodsValue = p.items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

        p.items.forEach(item => {
            // 3. توزيع التكاليف الإضافية نسبياً على كل قطعة
            let extraCostPerUnit = 0;
            if (totalBaseGoodsValue > 0 && totalExtraCosts > 0) {
                const itemTotalBaseCost = item.quantity * item.cost;
                const itemShareOfExtra = (itemTotalBaseCost / totalBaseGoodsValue) * totalExtraCosts;
                extraCostPerUnit = itemShareOfExtra / item.quantity;
            }
            
            // التكلفة النهائية للوحدة = السعر الأساسي + نصيبها من المصاريف الإضافية
            const finalUnitCost = item.cost + extraCostPerUnit;

// �� [تعديل د. ضياء الحصري]: البحث بالـ ID الممرر من الفاتورة لضمان خيارات الفصل والدمج
const productIndex = products.findIndex(prod => (item.id && prod.id === item.id) || prod.name.toLowerCase() === item.name.toLowerCase());            
            if (productIndex !== -1) {
                // تحديث منتج موجود
                const existing = products[productIndex];
                const oldQty = Number(existing.quantity) || 0;
                const oldCost = Number(existing.costPrice) || 0;
                const totalQty = oldQty + item.quantity;
                
                existing.quantity = totalQty;
                // تحديث متوسط التكلفة بناءً على السعر الشامل الجديد
                existing.costPrice = totalQty > 0 ? (typeof window.money === 'function' ? window.money(((oldQty * oldCost) + (item.quantity * finalUnitCost)) / totalQty) : ((oldQty * oldCost) + (item.quantity * finalUnitCost)) / totalQty) : finalUnitCost;
                
                // ✅ تحديث التصنيف لضمان انتقاله للمخزون
                if (item.category) existing.category = item.category;
            } else {
                // إضافة منتج جديد تماماً
            // �� [تعديل د. ضياء]: توليد كود فريد للمنتج عند النقل
const uniqueProductCodeTransfer = (typeof window.generateGlobalID === 'function') ? window.generateGlobalID('code') : ('code_' + Date.now().toString(36));
products.push({ 
    id: uniqueProductCodeTransfer, // �� حفر الكود الفريد هنا
    name: item.name, 
    quantity: item.quantity, 
    costPrice: finalUnitCost, 
    supplierId: p.supplierId,
    category: item.category || "" // ✅ نقل التصنيف هنا
});
            }

            // معالجة السيريالات
            if (item.serials && item.serials.length > 0) {
                item.serials.forEach(serial => {
                    if (!serialNumbersLog.some(s => s.serial === serial)) {
                        serialNumbersLog.push({
                id: generateId("SER"),
                serial, 
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

    // --- باقي العمليات تبقى كما هي تماماً لضمان عدم تعطل النظام ---
    if (target.classList.contains('receive-goods-btn')) {
        if (!confirm(`هل أنت متأكد من استلام بضاعة الفاتورة من المورد "${supplier?.name || '-'}"؟ سيتم توزيع التكاليف الإضافية على البضاعة.`)) return;
        saveStateToHistory();
        updateInventoryFromPurchase(purchase);

        const allInvoiceLiabs = (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) ? liabilities.filter(l => l.purchaseInvoiceId === purchase.id || (purchase.extraCosts || []).some(c => c.isLiability && c.linkedLiabilityId === l.id)) : [];
        const activeDebt = allInvoiceLiabs.length > 0 ? allInvoiceLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0) : Math.min(Number(purchase.remainingBalance) || 0, Math.max(0, (Number(purchase.grandTotal) || 0) - (Number(purchase.paidAmount) || 0)));
        if (activeDebt <= 0.001) {
            purchase.remainingBalance = 0;
            purchase.paidAmount = purchase.grandTotal;
        }

        purchase.status = 'Confirmed';
        if (!purchase.id) purchase.id = generateId("PINV");
        purchaseInvoices.push(purchase);
        pendingPurchases.splice(purchaseIndex, 1);
        logOperation("استلام بضاعة", `تم استلام بضاعة من "${supplier?.name}" وتوزيع التكاليف وتحديث التصنيفات.`);
        showGlobalMessage("تم استلام البضاعة وتحديث المخزون بالتصنيفات والتكاليف الصحيحة.", false);

    } else if (target.classList.contains('receive-and-pay-btn')) {
        const paymentForm = d('pending-purchase-payment-form');
        d('pp-payment-supplier-name').textContent = supplier?.name || 'غير محدد';
        const allInvoiceLiabs = (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) ? liabilities.filter(l => l.purchaseInvoiceId === purchase.id || (purchase.extraCosts || []).some(c => c.isLiability && c.linkedLiabilityId === l.id)) : [];
        const curDebt = allInvoiceLiabs.length > 0 ? allInvoiceLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0) : Math.min(Number(purchase.remainingBalance) || 0, Math.max(0, (Number(purchase.grandTotal) || 0) - (Number(purchase.paidAmount) || 0)));
        d('pp-payment-remaining-amount').textContent = formatCurrency(curDebt);
        d('pp-confirm-payment-btn').dataset.pendingId = pendingId;
        paymentForm.classList.remove('hidden');
        paymentForm.scrollIntoView({ behavior: 'smooth' });

} else if (target.classList.contains('cancel-pending-purchase-btn')) {
    // 1. تحديد المعرف بدقة
    const pendingId = target.dataset.pendingPurchaseId || purchase.id;

    if (!confirm(`هل أنت متأكد من إلغاء فاتورة الشراء المعلقة من المورد "${supplier?.name || '-'}"؟ سيتم حذف الالتزام المرتبط بها.`)) return;
    
    saveStateToHistory();
    
    // 2. إرجاع العربون للسيولة
    if (purchase.deductedFromLiquidity && purchase.paidAmount > 0 && purchase.paidFromAccountId) {
        const accountToRefund = accounts.find(acc => acc.id === purchase.paidFromAccountId);
        if (accountToRefund) {
            accountToRefund.balance = window.money(accountToRefund.balance + purchase.paidAmount);
            liquidityLog.push({ 
                id: generateId("liq"), 
                type: "add", 
                amount: purchase.paidAmount, 
                description: `إلغاء شراء وإرجاع عربون للفاتورة ${pendingId}`, 
                currentBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0) 
            });
        }
    }

    // 3. الخطوة الحاسمة: حذف الالتزام
    liabilities = liabilities.filter(l => l.purchaseInvoiceId !== pendingId);
    
    // 4. حذف الفاتورة من المعلقات
    pendingPurchases.splice(purchaseIndex, 1);
    
    logOperation("إلغاء فاتورة شراء معلقة", `تم إلغاء شراء من "${supplier?.name}" وحذف الالتزامات.`);
    showGlobalMessage("تم إلغاء الشراء وحذف الالتزام بنجاح.", false, true);

    // 5. التحديث والحفظ (استخدام المسميات الصحيحة في مشروعك)
    if (typeof updateUI === 'function') updateUI(); 
    
    // تأكد من استخدام دالة الحفظ المتاحة في ملفك (غالباً هي saveSystemToCloud أو saveToLocalStorage)
    if (typeof saveSystemToCloud === 'function') {
        saveSystemToCloud();
    } else if (typeof saveToLocalStorage === 'function') {
        saveToLocalStorage();
    }
}
    updateUI();
}
async function pi_confirmPurchaseInvoice() {
    if (!pi_validateForm()) { return; }

    const goodsReceived = d('pi_goods_received').checked;
    const deductFromLiquidity = d('pi_deduct_from_liquidity').checked;
    const paidAmountValue = parseInputNumber(piPaidAmountInput) || 0;
    const selectedAccountId = d('pi_payment_account').value;
    const account = accounts.find(acc => acc.id === selectedAccountId);

    let itemsSubtotal = 0;
    const rawItems = Array.from(piItemsBody.querySelectorAll('tr')).map(row => {
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

    const trueGrandTotal = itemsSubtotal + totalExtraCostsVal;
    const maxCashPayment = trueGrandTotal - totalLiabilitiesVal;

    if (paidAmountValue > (maxCashPayment + 0.5)) {
        showMessage(piFormMessage, `تنبيه: المبلغ المدفوع أكبر من المستحق نقداً.`, true);
        return;
    }

    if (deductFromLiquidity && paidAmountValue > 0) {
        if (!selectedAccountId || !account || paidAmountValue > account.balance) {
            showMessage(piFormMessage, `تنبيه: تحقق من رصيد الحساب المختار.`, true);
            return;
        }
    }

    saveStateToHistory();

    const invoiceData = {
        id: generateId('pi'),
        supplierId: piSupplierSelect.value,
        invoiceNumber: piInvoiceNumberInput.value.trim(),
        date: piDateInput.value,
        timestamp: new Date().toISOString(),
        items: rawItems,
        extraCosts: extraCostsList,
        grandTotal: trueGrandTotal,
        paidAmount: paidAmountValue,
        remainingBalance: trueGrandTotal - paidAmountValue - totalLiabilitiesVal,
        status: goodsReceived ? 'Confirmed' : 'Pending',
        deductedFromLiquidity: deductFromLiquidity && paidAmountValue > 0,
        paidFromAccountId: (deductFromLiquidity && paidAmountValue > 0) ? selectedAccountId : null
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
                existingLiability.amount = (Number(existingLiability.amount) || 0) + cost.amount;
                if (!existingLiability.purchaseInvoiceId) existingLiability.purchaseInvoiceId = invoiceData.id;
                logOperation("ربط تكلفة إضافية بالتزام موجود", `تمت إضافة "${cost.name}" بقيمة ${formatCurrency(cost.amount)} إلى الالتزام "${existingLiability.name}" ضمن فاتورة الشراء رقم "${invoiceData.invoiceNumber || invoiceData.id}".`);
            } else {
                const newLiability = {
                    id: generateId('liab') || generateId("LIA"),
                    name: `${cost.name} - ${supplier?.name || 'مورد غير محدد'}`,
                    amount: cost.amount,
                    date: invoiceData.date || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
                    purchaseInvoiceId: invoiceData.id,
                    source: 'purchase_extra_cost',
                    invoiceNumber: invoiceData.invoiceNumber || '',
                    supplierId: invoiceData.supplierId,
                    type: "supplier",
                    createdAt: new Date().toISOString()
                };
                liabilities.push(newLiability);
                logOperation("إنشاء التزام تكلفة إضافية", `تم إنشاء التزام جديد باسم "${newLiability.name}" بقيمة ${formatCurrency(cost.amount)} من فاتورة الشراء رقم "${invoiceData.invoiceNumber || invoiceData.id}".`);
            }
        });

        // تنفيذ الخصم المالي الفعلي من حساب السيولة
        if (invoiceData.paidAmount > 0 && deductFromLiquidity && account) {
            account.balance = window.money(account.balance - invoiceData.paidAmount);
            const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
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
            invoiceData.items.forEach(item => {
                let extraCostPerUnit = 0;
                if (itemsSubtotal > 0) {
                    const itemTotalBaseCost = item.quantity * item.cost;
                    const itemShareOfExtra = (itemTotalBaseCost / itemsSubtotal) * totalExtraCostsVal;
                    extraCostPerUnit = itemShareOfExtra / item.quantity;
                }
                const finalCostPerUnit = item.cost + extraCostPerUnit;

                let productIndex = -1;
                if (item.duplicateResolution === 'separate') {
                    productIndex = -1; // إجبار السيستم على الفصل ومنحه كود جديد
                } else {
                    productIndex = products.findIndex(p => p.name.toLowerCase() === item.name.toLowerCase());
                }

                if (productIndex !== -1) {
                    const existing = products[productIndex];
                    const oldQty = Number(existing.quantity) || 0;
                    const oldCost = Number(existing.costPrice) || 0;
                    existing.quantity += item.quantity;
                    existing.costPrice = existing.quantity > 0 ? (typeof window.money === 'function' ? window.money(((oldQty * oldCost) + (item.quantity * finalCostPerUnit)) / existing.quantity) : ((oldQty * oldCost) + (item.quantity * finalCostPerUnit)) / existing.quantity) : finalCostPerUnit;
                    if (item.category) existing.category = item.category;
                } else {
                    const uniqueProductCode = (typeof window.generateGlobalID === 'function') ? window.generateGlobalID('code') : ('code_' + Date.now().toString(36));
                    products.push({ 
                        id: uniqueProductCode, 
                        name: item.name, 
                        quantity: item.quantity, 
                        costPrice: finalCostPerUnit, 
                        supplierId: invoiceData.supplierId, 
                        category: item.category || "" 
                    });
                }
                delete item.duplicateResolution; // تنظيف فلاج القرار بعد اكتمال الترحيل الآمن

                // تسجيل أرقام السيريال في سجل السيريالات العام
                if (item.serials && item.serials.length > 0 && typeof serialNumbersLog !== 'undefined') {
                    item.serials.forEach(serial => {
                        if (!serialNumbersLog.some(s => s.serial === serial)) {
                            serialNumbersLog.push({
                                id: generateId("SER"),
                                serial: serial,
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
        date: invoiceData.date || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })), // التاريخ ليظهر في الجدول
        supplierId: invoiceData.supplierId, // لربط الدين بالمورد
        type: "supplier" // لتحديد نوع الالتزام
    });
}
    // �� أهم سطر: الأرشفة السحابية تعمل الآن في الحالتين
    // حفظ محلي فوري واستجابة سريعة للواجهة
    logOperation(goodsReceived ? "فاتورة شراء" : "شراء معلق", `فاتورة من ${supplier?.name} بقيمة ${formatCurrency(invoiceData.grandTotal)}.`);
    localStorage.removeItem('finance_pi_draft');
    pi_clearForm(false);
    updateUI();
    const successMsg = goodsReceived 
        ? "تم تأكيد الفاتورة وإدخال البضاعة بنجاح." 
        : "تم تسجيل فاتورة الشراء بنجاح (قيد الاستلام).";
    showMessage(piFormMessage, successMsg, false);

    savePurchaseInvoiceToCloud(invoiceData).catch(e => console.warn(e));
    if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.warn(e));
    } catch (piErr) {
        if (_tx) await _tx.rollback();
        console.error("❌ فشل حفظ فاتورة المشتريات (تم التراجع عن التعديلات):", piErr);
        if (typeof showMessage === 'function') {
            showMessage(piFormMessage, "تعذر الحفظ في السحابة؛ تم التراجع التلقائي عن أي تعديل في المخزن أو الخزنة.", true);
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

    if (items.length === 0 && !draft.supplierId && !draft.invoiceNumber && extraCosts.length === 0) {
        showMessage(piFormMessage, 'لا توجد بيانات بالفاتورة لحفظها كمسودة.', true);
        return;
    }

    localStorage.setItem('finance_pi_draft', JSON.stringify(draft));
    showMessage(piFormMessage, 'تم حفظ مسودة فاتورة الشراء بنجاح. يمكنك استعادتها في أي وقت.', false);
}

function pi_loadDraft() {
    const draftStr = localStorage.getItem('finance_pi_draft');
    if (!draftStr) {
        showMessage(piFormMessage, 'لا توجد مسودة محفوظة حالياً.', true);
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
        showMessage(piFormMessage, 'تم استعادة المسودة بنجاح.', false);
    } catch (err) {
        console.error('Error loading draft:', err);
        showMessage(piFormMessage, 'حدث خطأ أثناء تحميل المسودة.', true);
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
                           class="pi-cost-amount w-full text-sm font-bold text-blue-700 border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-center" 
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
};

