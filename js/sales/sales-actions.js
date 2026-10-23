async function handlePendingSaleActions(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const pendingId = button.dataset.pendingId;
    if (!pendingId) return;

    // --- زر تحويل البيع المؤقت إلى مرتجع ---
    if (button.classList.contains('initiate-return-from-pending')) {
        initiateReturnFromPendingSale(pendingId);
        return;
    }
    // --- زر تحويل البيع المؤقت إلى دين ---
if (button.classList.contains('convert-pending-to-debt')) {
    openConvertPendingSaleToDebtDialog(pendingId);
    return;
}
    const saleIndex = pendingSales.findIndex(s => s.id === pendingId);
    if (saleIndex === -1) {
        showGlobalMessage("خطأ: لم يتم العثور على البيع المؤقت.", true);
        return;
    }
    
    const sale = { ...pendingSales[saleIndex] }; // اعمل نسخة من البيانات

    // --- زر تأكيد البيع المؤقت السريع (إيداع بدون فتح الفاتورة الكبيرة) ---
    if (button.classList.contains('confirm-pending')) {
        openQuickConfirmPendingSaleModal(pendingId);
        return;
    }

    // --- زر إلغاء البيع المؤقت ---
    if (button.classList.contains('cancel-pending')) {
    const depositToRefund = Number(sale.depositPaid) || 0;

    if (depositToRefund > 0) {
        // فتح نافذة اختيار الحساب لاسترداد العربون (المودال)
        const refundModal = document.getElementById('refundModal');
        if (refundModal) {
            document.getElementById('refund_pending_id').value = sale.id;
            document.getElementById('refund_amount_val').value = depositToRefund;
            document.getElementById('refund_info_text').innerText = 
                `سيتم إلغاء عملية العميل: ${sale.customerName || '-'} \n ورد مبلغ: ${formatCurrency(depositToRefund)}`;
            
            const select = document.getElementById('refund_account_select');
            if (select) {
                select.innerHTML = accounts.map(acc => 
                    `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (رصيده الحالي: ${formatCurrency(acc.balance)})</option>`
                ).join('');
            }
            refundModal.style.display = 'block';
        } else {
            alert("يرجى إضافة كود الـ HTML الخاص بـ refundModal أولاً.");
        }
    } else {
        // إذا لم يوجد عربون: يتم تنفيذ الإلغاء مباشرة باستخدام منطقك الأصلي
        if (confirm("هل أنت متأكد من إلغاء هذا البيع المؤقت وإرجاع البضاعة للمخزون؟")) {
            executeCancellation(sale.id, null, 0); 
        }
    }

    // --- زر تعديل البيع المؤقت (يفتح الفاتورة الموحدة بكامل البيانات للتعديل) ---
    } else if (button.classList.contains('edit-pending')) {
        openPendingSaleInInvoiceModal(pendingId);
    }
}

window.openPendingSaleInInvoiceModal = function openPendingSaleInInvoiceModal(pendingId) {
    const sale = pendingSales.find(s => String(s.id).trim() === String(pendingId).trim());
    if (!sale) {
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage("لم يتم العثور على البيع المؤقت للتعديل.", true);
        } else {
            alert("لم يتم العثور على البيع المؤقت للتعديل.");
        }
        return;
    }

    isEditingPendingInvoice = true;
    isInvoiceFromPending = false;
    pendingSaleOriginData = sale;

    // فتح النافذة المنبثقة للفاتورة
    inv_openModal();

    // تفعيل خيار (حفظ كبيعة مؤقتة)
    const markAsPendingCheckbox = document.getElementById('inv_markAsPending');
    if (markAsPendingCheckbox) {
        markAsPendingCheckbox.checked = true;
        markAsPendingCheckbox.dispatchEvent(new Event('change'));
    }

    // 1. ملء بيانات العميل الأساسية
    const customerNameInput = inv_customerNameInput || document.getElementById('inv_customerName');
    if (customerNameInput) {
        customerNameInput.value = sale.customerName || (sale.invoiceData && sale.invoiceData.customerName) || '';
    }

    const addr = (sale.invoiceData && sale.invoiceData.customerAddress) || sale.customerAddress || '';
    const customerAddressInput = inv_customerAddressInput || document.getElementById('inv_customerAddress');
    if (customerAddressInput) {
        customerAddressInput.value = addr;
    }

    // أرقام الهواتف (دعم المصفوفات والحقول المفردة)
    let phones = (sale.invoiceData && sale.invoiceData.phones) || sale.phones || [];
    if (!Array.isArray(phones)) {
        phones = phones ? [phones] : [];
    }
    if (phones.length === 0) {
        const singlePhone = sale.customerPhone || sale.phone || (sale.invoiceData && (sale.invoiceData.customerPhone || sale.invoiceData.phone));
        if (singlePhone) phones = [singlePhone];
    }

    const phoneNumbersContainer = inv_phoneNumbersContainer || document.getElementById('inv_phoneNumbersContainer');
    if (phoneNumbersContainer) {
        phoneNumbersContainer.innerHTML = '';
        const phoneList = (phones && phones.length > 0) ? phones : [''];
        phoneList.forEach((phone, idx) => {
            const phoneRow = document.createElement('div');
            phoneRow.className = 'form-row inv-phone-entry';
            phoneRow.innerHTML = `
                <div class="form-group">
                    <label for="inv_phone${idx + 1}">رقم هاتف ${idx + 1}:</label>
                    <input type="tel" id="inv_phone${idx + 1}" name="phone[]" value="${escapeHTML(phone || '')}" placeholder="رقم الهاتف">
                </div>
                ${idx > 0 ? '<button type="button" class="remove-phone-btn no-print" title="حذف الرقم">×</button>' : ''}
            `;
            phoneNumbersContainer.appendChild(phoneRow);
        });
        inv_phoneCounter = phoneList.length;
    }

    // الضمان والملاحظات ومصاريف الشحن
    const warranty = (sale.invoiceData && sale.invoiceData.warranty) || sale.warranty || '';
    const warrantyInput = inv_warrantyInput || document.getElementById('inv_warranty');
    if (warrantyInput) warrantyInput.value = warranty;

    const notes = (sale.invoiceData && sale.invoiceData.notes) || sale.notes || '';
    const notesTextarea = inv_notesTextarea || document.getElementById('inv_notes');
    if (notesTextarea) notesTextarea.value = notes;

    const shipping = (sale.invoiceData && sale.invoiceData.shippingCost !== undefined)
        ? Number(sale.invoiceData.shippingCost)
        : (sale.shippingCost !== undefined ? Number(sale.shippingCost) : 0);
    const shippingCostInput = inv_shippingCostInput || document.getElementById('inv_shippingCost');
    if (shippingCostInput) shippingCostInput.value = isNaN(shipping) ? 0 : shipping;

    // 2. ملء جدول بنود الفاتورة
    const invoiceItemsBody = inv_invoiceItemsBody || document.getElementById('inv_invoiceItemsBody');
    if (invoiceItemsBody) {
        invoiceItemsBody.innerHTML = '';

        const rawItems = (sale.items && Array.isArray(sale.items) && sale.items.length > 0)
            ? sale.items
            : ((sale.invoiceData && Array.isArray(sale.invoiceData.items) && sale.invoiceData.items.length > 0) ? sale.invoiceData.items : null);

        if (rawItems && rawItems.length > 0) {
            // حالة الفاتورة المفصلة
            rawItems.forEach(item => {
                if (!item) return;
                const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)) || 1;
                const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : (item.price !== undefined ? item.price : (item.sellPrice !== undefined ? item.sellPrice : (item.subtotal && qty > 0 ? (item.subtotal / qty) : 0)))) || 0;
                const subtotal = Number(item.subtotal !== undefined ? item.subtotal : (qty * unitPrice));
                
                // استنتاج التكلفة بأعلى دقة
                let cost = Number(item.costPrice !== undefined ? item.costPrice : (item.cost !== undefined ? item.cost : 0)) || 0;
                if (cost === 0 && typeof products !== 'undefined' && Array.isArray(products)) {
                    const cleanNameLookup = String(item.name || '').replace(/\s*\(S\/N:\s*.*?\)\s*/gi, '').trim().toLowerCase();
                    const matchedProd = products.find(p => (item.id && String(p.id) === String(item.id)) || String(p.name).trim().toLowerCase() === cleanNameLookup);
                    if (matchedProd && matchedProd.costPrice) {
                        cost = Number(matchedProd.costPrice) || 0;
                    }
                }

                // استخراج السيريال بدقة (سواء كان في حقل serial أو مدمجاً في الاسم)
                const serialMatch = String(item.name || '').match(/\(S\/N:\s*(.*?)\)/i);
                const serial = item.serial || (serialMatch ? serialMatch[1].trim() : null);
                const cleanItemName = String(item.name || '').replace(/\s*\(S\/N:\s*.*?\)\s*/gi, '').trim();

                const newRow = document.createElement('tr');
                newRow.classList.add('invoice-item-row');
                if (item.id) newRow.dataset.productId = item.id;
                newRow.dataset.itemName = item.name;
                newRow.dataset.itemQty = qty;
                newRow.dataset.itemPrice = unitPrice.toFixed(2);
                newRow.dataset.itemSubtotal = subtotal.toFixed(2);
                newRow.dataset.itemCost = cost.toFixed(2);
                if (serial) newRow.dataset.itemSerial = serial;

                newRow.innerHTML = `
                    <td class="item-name">
                        ${escapeHTML(cleanItemName || item.name)}
                        ${serial ? `<span class="serial-display no-print">(S/N: ${escapeHTML(serial)})</span><span class="serial-display-print">(S/N: ${escapeHTML(serial)})</span>` : ''}
                    </td>
                    <td class="item-qty" style="text-align:center;">
                        <input type="number" class="row-qty-input" value="${qty}" min="1" style="width: 60px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;" ${serial && qty === 1 ? 'readonly title="لا يمكن تغيير الكمية لمنتج مسيرل"' : ''}>
                    </td>
                    <td class="item-price" style="text-align:center;">
                        <input type="number" class="row-price-input" value="${unitPrice.toFixed(2)}" min="0" step="any" style="width: 80px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;">
                    </td>
                    <td class="item-subtotal" style="text-align:center; font-weight:bold;">${typeof formatCurrency === 'function' ? formatCurrency(subtotal) : subtotal.toFixed(2)}</td>
                    <td class="no-print" style="text-align:center;"><button type="button" class="remove-item-btn" style="color:red; font-weight:bold; border:none; background:none; cursor:pointer;">×</button></td>
                `;
                invoiceItemsBody.appendChild(newRow);
            });
        } else if (sale.mainProduct) {
            // حالة البيع السريع القديم (المنتج الرئيسي)
            const mainProduct = sale.mainProduct;
            const mainQty = Number(mainProduct.quantity !== undefined ? mainProduct.quantity : (mainProduct.qty !== undefined ? mainProduct.qty : 1)) || 1;
            let mainCost = Number(mainProduct.costPrice !== undefined ? mainProduct.costPrice : (mainProduct.cost !== undefined ? mainProduct.cost : 0)) || 0;
            if (mainCost === 0 && typeof products !== 'undefined' && Array.isArray(products)) {
                const cleanMainLookup = String(mainProduct.name || '').replace(/\s*\(S\/N:\s*.*?\)\s*/gi, '').trim().toLowerCase();
                const matchedProd = products.find(p => (mainProduct.id && String(p.id) === String(mainProduct.id)) || String(p.name).trim().toLowerCase() === cleanMainLookup);
                if (matchedProd && matchedProd.costPrice) mainCost = Number(matchedProd.costPrice) || 0;
            }

            const mainSellPrice = Number(sale.totalSellPrice !== undefined ? sale.totalSellPrice : (sale.grandTotal || 0));
            const unitPrice = mainQty > 0 ? (mainSellPrice / mainQty) : mainSellPrice;

            const serialMatch = String(mainProduct.name || '').match(/\(S\/N:\s*(.*?)\)/i);
            const mainSerial = mainProduct.serial || (serialMatch ? serialMatch[1].trim() : null);
            const cleanMainName = String(mainProduct.name || '').replace(/\s*\(S\/N:\s*.*?\)\s*/gi, '').trim();

            const mainRow = document.createElement('tr');
            mainRow.classList.add('invoice-item-row');
            if (mainProduct.id) mainRow.dataset.productId = mainProduct.id;
            mainRow.dataset.itemName = mainProduct.name;
            mainRow.dataset.itemQty = mainQty;
            mainRow.dataset.itemPrice = unitPrice.toFixed(2);
            mainRow.dataset.itemSubtotal = mainSellPrice.toFixed(2);
            mainRow.dataset.itemCost = mainCost.toFixed(2);
            if (mainSerial) mainRow.dataset.itemSerial = mainSerial;

            mainRow.innerHTML = `
                <td class="item-name">
                    ${escapeHTML(cleanMainName || mainProduct.name)}
                    ${mainSerial ? `<span class="serial-display no-print">(S/N: ${escapeHTML(mainSerial)})</span><span class="serial-display-print">(S/N: ${escapeHTML(mainSerial)})</span>` : ''}
                </td>
                <td class="item-qty" style="text-align:center;">
                    <input type="number" class="row-qty-input" value="${mainQty}" min="1" style="width: 60px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;" ${mainSerial && mainQty === 1 ? 'readonly title="لا يمكن تغيير الكمية لمنتج مسيرل"' : ''}>
                </td>
                <td class="item-price" style="text-align:center;">
                    <input type="number" class="row-price-input" value="${unitPrice.toFixed(2)}" min="0" step="any" style="width: 80px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;">
                </td>
                <td class="item-subtotal" style="text-align:center; font-weight:bold;">${typeof formatCurrency === 'function' ? formatCurrency(mainSellPrice) : mainSellPrice.toFixed(2)}</td>
                <td class="no-print" style="text-align:center;"><button type="button" class="remove-item-btn" style="color:red; font-weight:bold; border:none; background:none; cursor:pointer;">×</button></td>
            `;
            invoiceItemsBody.appendChild(mainRow);
        }
    }

    // 3. استعادة بيانات الاستقطاع المخفي
    const invDedToggle = document.getElementById('inv-deduction-toggle');
    const invDedAmount = document.getElementById('inv-deduction-amount');
    const invDedList = document.getElementById('inv-deduction-liability-name');
    if (invDedToggle && invDedAmount && invDedList) {
        if (sale.deductionAmount && sale.deductionAmount > 0) {
            invDedToggle.checked = true;
            invDedToggle.dispatchEvent(new Event('change'));
            invDedAmount.value = sale.deductionAmount;
            invDedList.value = sale.deductionLiabilityName || '';
        } else {
            invDedToggle.checked = false;
            invDedToggle.dispatchEvent(new Event('change'));
            invDedAmount.value = '';
            invDedList.value = '';
        }
    }

    // 4. تحديث قائمة الملحقات والتكاليف المستقطعة أولاً ثم حساب الإجماليات بدقة
    if (typeof inv_updateDeductibleCostsCheckboxes === 'function') inv_updateDeductibleCostsCheckboxes();
    if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
};

window.openPendingSaleForEdit = function openPendingSaleForEdit(pendingId) {
    window.openPendingSaleInInvoiceModal(pendingId);
};
            // --- Invoice Search Functions ---
            function searchInvoiceByNumber() {
                if (!searchInvoiceNumberInput || !searchResultsListContainer || !searchMessageContainer) return;
                const searchTerm = searchInvoiceNumberInput.value.trim();
                 showMessage(searchMessageContainer, ""); // Clear previous messages

                if (!searchTerm) {
                    showMessage(searchMessageContainer, "يرجى إدخال رقم الفاتورة للبحث.", true);
                    searchResultsListContainer.innerHTML = '<p class="text-center text-gray-500">أدخل رقم الفاتورة.</p>';
                    return;
                }
                 console.log(`Searching for invoice number: ${searchTerm} in salesToday:`, salesToday);
                // Search within the currently loaded day's sales
                const results = salesToday.filter(sale => sale.invoiceNumber && sale.invoiceNumber === searchTerm);
                displaySearchResults(results);
            }
async function handleInvoiceSearchForReturn() {
    if (!searchInvoiceInput || !invoiceSearchResults) return;
    const invoiceNumber = searchInvoiceInput.value.trim();
    invoiceSearchResults.innerHTML = ''; // Clear previous results

    if (!invoiceNumber) {
        invoiceSearchResults.innerHTML = `<p class="text-red-600">يرجى إدخال رقم فاتورة للبحث.</p>`;
        return;
    }

    // Search in today's sales first, then search online in the invoices collection
    let invoice = salesToday.find(s => s.invoiceNumber === invoiceNumber);

    if (!invoice && window.currentUser) {
        try {
            const docRef = window.doc(window.db, "users", window.currentUser.uid, "invoices", invoiceNumber);
            const docSnap = await window.getDoc(docRef);
            if (docSnap.exists()) {
                invoice = docSnap.data();
            }
        } catch (error) {
            console.error("Error searching for invoice online:", error);
        }
    }


    if (!invoice) {
        invoiceSearchResults.innerHTML = `<p class="text-red-600">لم يتم العثور على فاتورة بهذا الرقم.</p>`;
        return;
    }

    let itemsHTML = invoice.items.map((item, index) => `
        <tr class="border-b border-gray-100">
            <td class="p-2">${escapeHTML(item.name)}</td>
            <td class="p-2 text-center">${item.quantity}</td>
            <td class="p-2 text-center font-mono">${formatCurrency(item.unitPrice)}</td>
            <td class="p-2" style="width: 100px;">
                <input type="number" value="0" min="0" max="${item.quantity}" class="text-center return-invoice-qty" data-item-index="${index}" data-unit-price="${item.unitPrice}" data-cost-price="${item.costPrice}" data-serial="${escapeHTML(item.serial || '')}" data-serials='${JSON.stringify(item.serials || (item.serial ? [item.serial] : []))}'>
            </td>
        </tr>
    `).join('');

    invoiceSearchResults.innerHTML = `
        <div class="p-3 bg-gray-50 rounded-md border">
            <p><strong>العميل:</strong> ${escapeHTML(invoice.customerName || 'نقدي')}</p>
            <p><strong>التاريخ:</strong> ${formatDateForDisplay(invoice.saleDate || invoice.timestamp)}</p>
            <table class="w-full mt-2 text-sm">
                <thead><tr class="bg-gray-200">
                    <th class="p-2 text-right">المنتج</th><th class="p-2">الكمية المباعة</th><th class="p-2">سعر البيع</th><th class="p-2">الكمية المرتجعة</th>
                </tr></thead>
                <tbody>${itemsHTML}</tbody>
            </table>
            <div class="my-4">
                <label for="return-invoice-receive-now" class="inline-flex items-center cursor-pointer font-semibold">
                    <input type="checkbox" id="return-invoice-receive-now" checked>
                    <span class="text-sm">استلام البضاعة في المخزن الآن؟</span>
                </label>
            </div>
            <button id="confirm-invoice-return-btn" data-invoice-id="${escapeHTML(invoice.id || '')}" data-invoice-number="${escapeHTML(invoice.invoiceNumber || '')}" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-3">تأكيد الإرجاع من الفاتورة</button>
        </div>
    `;
}

// =====================================================================
// 🌟 نظام تأكيد البيع المؤقت السريع (Quick Confirm & Treasury Deposit)
// =====================================================================

window.openQuickConfirmPendingSaleModal = function(pendingId) {
    if (typeof pendingSales === 'undefined') return;
    const sale = pendingSales.find(s => String(s.id).trim() === String(pendingId).trim());
    if (!sale) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage("لم يتم العثور على البيعة المعلقة.", true);
        else alert("لم يتم العثور على البيعة المعلقة.");
        return;
    }

    const modal = document.getElementById('quickConfirmPendingModal');
    if (!modal) return;

    const totalAmount = Number(sale.grandTotal || sale.totalSellPrice || 0);
    const depositPaid = Number(sale.depositPaid || sale.paidAmount || 0);
    const remainingAmount = Math.max(0, (typeof window.money === 'function' ? window.money(totalAmount - depositPaid) : totalAmount - depositPaid));

    document.getElementById('qc_pending_id').value = pendingId;
    document.getElementById('qc_customer_name').textContent = sale.customerName || (sale.invoiceData && sale.invoiceData.customerName) || 'عميل بدون اسم';
    document.getElementById('qc_total_amount').textContent = (typeof formatCurrency === 'function') ? formatCurrency(totalAmount) : (totalAmount + ' ج.م');
    document.getElementById('qc_deposit_paid').textContent = (typeof formatCurrency === 'function') ? formatCurrency(depositPaid) : (depositPaid + ' ج.م');
    document.getElementById('qc_remaining_amount').textContent = (typeof formatCurrency === 'function') ? formatCurrency(remainingAmount) : (remainingAmount + ' ج.م');

    const accSelect = document.getElementById('qc_account_select');
    const accContainer = document.getElementById('qc_account_container');
    if (accSelect) {
        accSelect.innerHTML = (typeof accounts !== 'undefined' && Array.isArray(accounts)) ? accounts.map(a => 
            `<option value="${escapeHTML(a.id)}" ${(sale.depositAccountId === a.id || sale.accountId === a.id) ? 'selected' : ''}>${escapeHTML(a.name)} (رصيد: ${Number(a.balance || 0).toFixed(2)})</option>`
        ).join('') : '';
    }

    if (accContainer) {
        accContainer.style.display = remainingAmount > 0 ? 'block' : 'none';
    }

    modal.style.display = 'block';
};

window.executeQuickConfirmPendingSale = async function() {
    const pendingId = document.getElementById('qc_pending_id')?.value;
    if (!pendingId) return;

    const saleIndex = pendingSales.findIndex(s => String(s.id).trim() === String(pendingId).trim());
    if (saleIndex === -1) {
        showGlobalMessage("خطأ: لم يتم العثور على البيعة المعلقة.", true);
        return;
    }

    const sale = pendingSales[saleIndex];
    const totalAmount = Number(sale.grandTotal || sale.totalSellPrice || 0);
    const depositPaid = Number(sale.depositPaid || sale.paidAmount || 0);
    const remainingAmount = Math.max(0, (typeof window.money === 'function' ? window.money(totalAmount - depositPaid) : totalAmount - depositPaid));

    let selectedAccountId = document.getElementById('qc_account_select')?.value;
    if (remainingAmount > 0 && !selectedAccountId) {
        if (typeof accounts !== 'undefined' && accounts.length > 0) selectedAccountId = accounts[0].id;
        else {
            if (typeof showGlobalMessage === 'function') showGlobalMessage("يرجى اختيار الخزنة للإيداع.", true);
            else if (typeof alert === 'function') alert("يرجى اختيار الخزنة للإيداع.");
            return;
        }
    }

    const submitBtn = document.getElementById('qc_submit_btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "جاري الحفظ..."; }

    try {
        if (typeof saveStateToHistory === 'function') saveStateToHistory();

        // 1. تحديث رصيد الخزينة والسيولة بالمبلغ المحصل الآن
        if (remainingAmount > 0) {
            const acc = (typeof accounts !== 'undefined') ? accounts.find(a => a.id === selectedAccountId) : null;
            if (acc) {
                acc.balance = (typeof window.money === 'function') ? window.money(Number(acc.balance || 0) + remainingAmount) : (Number(acc.balance || 0) + remainingAmount);
                const newTotalLiquidity = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
                const logDesc = depositPaid > 0 
                    ? `استلام باقي فاتورة ${sale.customerName || '-'} (إجمالي: ${totalAmount} - عربون: ${depositPaid})`
                    : `استلام فاتورة مبيعات ${sale.customerName || '-'}`;
                
                if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                    liquidityLog.push({
                        id: (typeof generateId === 'function') ? generateId("liq") : ("liq_" + Date.now()),
                        timestamp: new Date().toISOString(),
                        type: "add",
                        amount: remainingAmount,
                        description: logDesc,
                        currentBalance: newTotalLiquidity,
                        accountId: selectedAccountId
                    });
                }
            }
        }

        // 2. تحديث السيريال نمبرز إلى مباعة
        let normalizedItems = [];
        if (Array.isArray(sale.items) && sale.items.length > 0) {
            normalizedItems = [...sale.items];
        } else if (sale.mainProduct) {
            const mainQty = Number(sale.mainProduct.quantity || 1);
            normalizedItems.push({
                name: sale.mainProduct.name,
                quantity: mainQty,
                costPrice: Number(sale.mainProduct.costPrice || sale.mainProduct.cost || 0),
                unitPrice: totalAmount / mainQty,
                subtotal: totalAmount
            });
            if (Array.isArray(sale.additionalItems)) {
                sale.additionalItems.forEach(att => {
                    normalizedItems.push({ name: att.name, quantity: Number(att.quantity || 1), costPrice: Number(att.costPrice || att.cost || 0), unitPrice: 0, subtotal: 0 });
                });
            }
        }

        normalizedItems.forEach(item => {
            if (item && item.serial && typeof serialNumbersLog !== 'undefined' && Array.isArray(serialNumbersLog)) {
                const sIdx = serialNumbersLog.findIndex(log => log.serial === item.serial);
                if (sIdx !== -1) serialNumbersLog[sIdx].status = 'sold';
            }
        });

        // 3. إضافة الربح للأرباح الإجمالية
        const netProfit = Number(sale.profit !== undefined ? sale.profit : (sale.potentialProfit || 0));
        if (typeof totalProfit !== 'undefined') {
            const moneyFn = typeof window.money === 'function' ? window.money : (v) => Math.round(v * 100) / 100;
            totalProfit = moneyFn(totalProfit + netProfit);
        }

        // 4. توليد رقم الفاتورة
        const todayStr = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) ? currentLoadedDate.replace(/-/g, '') : (typeof getTodayDateString === 'function' ? getTodayDateString().replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        let maxSeq = 0;
        if (typeof salesToday !== 'undefined' && Array.isArray(salesToday)) {
            salesToday.forEach(s => {
                if (s.invoiceNumber && s.invoiceNumber.startsWith(todayStr)) {
                    const seq = parseInt(s.invoiceNumber.split('-')[1] || '0');
                    if (seq > maxSeq) maxSeq = seq;
                }
            });
        }
        const generatedInvoiceNumber = `${todayStr}-${(maxSeq + 1).toString().padStart(3, '0')}`;

        // 5. بناء كائن الفاتورة المؤكدة
        const invoiceRecord = {
            id: sale.id ? String(sale.id).replace('pending', 'inv') : `inv-${Date.now()}`,
            invoiceNumber: generatedInvoiceNumber,
            type: 'invoice',
            timestamp: new Date().toISOString(),
            confirmedAt: new Date().toISOString(),
            createdAt: sale.createdAt || sale.timestamp || new Date().toISOString(),
            saleDate: sale.saleDate || (typeof currentLoadedDate !== 'undefined' ? currentLoadedDate : null) || (typeof getTodayDateString === 'function' ? getTodayDateString() : new Date().toISOString().slice(0, 10)),
            customerName: sale.customerName || '',
            customerAddress: sale.customerAddress || (sale.invoiceData && sale.invoiceData.customerAddress) || '',
            phones: sale.phones || (sale.invoiceData && sale.invoiceData.phones) || [],
            items: normalizedItems,
            shippingCost: Number(sale.shippingCost || 0),
            totalGoodsPrice: Number(sale.totalGoodsPrice || totalAmount),
            grandTotal: totalAmount,
            paidAmount: totalAmount,
            depositPaid: depositPaid,
            warranty: sale.warranty || (sale.invoiceData && sale.invoiceData.warranty) || '',
            notes: sale.notes || (sale.invoiceData && sale.invoiceData.notes) || '',
            deductedItems: sale.deductedItems || (sale.invoiceData && sale.invoiceData.deductedItems) || [],
            totalCost: Number(sale.totalCost || sale.cost || 0),
            profit: netProfit,
            deductionAmount: sale.deductionAmount || 0,
            deductionLiabilityName: sale.deductionLiabilityName || '',
            accountId: selectedAccountId || (accounts && accounts[0] && accounts[0].id) || 'main',
            status: 'completed'
        };

        // 6. تطبيق الاستقطاع إن وجد
        if (invoiceRecord.deductionAmount > 0 && typeof applyDeduction === 'function') {
            applyDeduction({ amount: invoiceRecord.deductionAmount, liabilityName: invoiceRecord.deductionLiabilityName }, invoiceRecord);
        }

        // 7. الحذف من pendingSales والإضافة إلى salesToday
        pendingSales.splice(saleIndex, 1);
        if (typeof salesToday !== 'undefined' && Array.isArray(salesToday)) salesToday.push(invoiceRecord);
        if (typeof invoices !== 'undefined' && Array.isArray(invoices)) invoices.push(invoiceRecord);

        // 8. الحفظ في السحابة وحفظ الحالة
        if (typeof saveInvoiceToFirestore === 'function') {
            try { await saveInvoiceToFirestore(invoiceRecord); } catch(e) { console.warn("تعذر رفع الفاتورة للسحابة:", e); }
        }
        if (typeof saveCurrentStateByDate === 'function') await saveCurrentStateByDate(typeof currentLoadedDate !== 'undefined' ? currentLoadedDate : null);
        if (typeof saveSystemToCloud === 'function') await saveSystemToCloud();

        if (typeof logOperation === 'function') {
            logOperation("تأكيد بيع مؤقت", `تم تأكيد البيع المؤقت للعميل ${invoiceRecord.customerName} بقيمة ${totalAmount} ج.م.`);
        }

        // 9. إغلاق النافذة وتحديث الواجهة
        const m = document.getElementById('quickConfirmPendingModal');
        if (m) m.style.display = 'none';

        if (typeof renderPendingSales === 'function') renderPendingSales();
        if (typeof updateUI === 'function') updateUI();
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(`✅ تم تأكيد الفاتورة رقم (${invoiceRecord.invoiceNumber}) وإيداع المبلغ بنجاح!`);
        }
    } catch(err) {
        console.error("خطأ أثناء تأكيد البيع المؤقت:", err);
        if (typeof showGlobalMessage === 'function') showGlobalMessage("حدث خطأ أثناء التأكيد: " + err.message, true);
        else if (typeof alert === 'function') alert("حدث خطأ أثناء التأكيد: " + err.message);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "تأكيد الإيداع والبيع ✅"; }
    }
};
