window.openTransferDebtModal = function(debtId) {
    const debt = window.debtors.find(d => d.id === debtId);
    if (!debt) return;

    const modal = document.getElementById('transferDebtModal');
    document.getElementById('trans-source-name').textContent = debt.name;
    document.getElementById('trans-source-reason').textContent = debt.reason;
    document.getElementById('trans-available').textContent = formatCurrency(debt.amount);
    document.getElementById('trans-amount').value = debt.amount;
    
    // ربط عملية التأكيد بالـ ID المختار
    document.getElementById('confirmTransferBtn').onclick = () => processTransfer(debtId);
    
    // تصفير المدخلات
    document.getElementById('trans-target-name').value = '';
    document.getElementById('trans-new-reason').value = '';
    document.getElementById('trans-new-reason').classList.add('hidden');
    document.querySelector('input[name="reason-opt"][value="keep"]').checked = true;
    
    modal.style.display = 'block';
};

window.closeTransferDebtModal = function() {
    document.getElementById('transferDebtModal').style.display = 'none';
};

async function processTransfer(sourceDebtId) {
    const sourceIndex = window.debtors.findIndex(d => d.id === sourceDebtId);
    if (sourceIndex === -1) return;

    const sourceDebt = window.debtors[sourceIndex];
    const targetName = document.getElementById('trans-target-name').value.trim();
    const transferAmount = parseFloat(document.getElementById('trans-amount').value);
    const checkedOpt = document.querySelector('input[name="reason-opt"]:checked');
    if (!checkedOpt) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage('يرجى تحديد سبب النقل', true);
        else alert('يرجى تحديد سبب النقل');
        return;
    }
    const useNewReason = checkedOpt.value === 'change';
    const newReason = document.getElementById('trans-new-reason').value.trim();
    
    const finalReason = (useNewReason && newReason) ? newReason : sourceDebt.reason;

    if (!targetName || isNaN(transferAmount) || transferAmount <= 0 || transferAmount > sourceDebt.amount) {
        alert("يرجى التأكد من اسم المستلم والمبلغ المحول");
        return;
    }

    saveStateToHistory(); // للحفظ قبل التغيير
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        // خصم من المصدر مع الحفاظ الكامل على origin و linkedInvoice و saleId لمنع التحايل على الاسترداد النقدي
        const oldSourceName = sourceDebt.name;
        const cleanTransfer = window.money(Number(transferAmount) || 0);
        const sourceOrigin = sourceDebt.origin || 'manual_debt';
        sourceDebt.amount = window.money(Math.max(0, (Number(sourceDebt.amount) || 0) - cleanTransfer));
        if (sourceDebt.amount < 0.01) window.debtors.splice(sourceIndex, 1);

        // إضافة للمستلم: يُسمح بالدمج فقط عند تطابق الأصل (origin) وعدم وجود ربط فاتورة
        let targetProfile = getOrCreateDebtorProfile(targetName);
        const existingDebt = (!sourceDebt.linkedInvoice) ? window.debtors.find(d => 
            d.customerId === targetProfile.id && 
            !d.linkedInvoice &&
            (d.origin || 'manual_debt') === sourceOrigin &&
            normalizeArabicText(d.reason) === normalizeArabicText(finalReason)
        ) : null;

        if (existingDebt) {
            existingDebt.amount = window.money((Number(existingDebt.amount) || 0) + cleanTransfer);
        } else {
            const transferredDebt = {
                id: generateId('debt'),
                customerId: targetProfile.id,
                name: targetProfile.name,
                customerName: targetProfile.name,
                reason: finalReason,
                amount: cleanTransfer,
                origin: sourceOrigin,
                createdAt: new Date().toISOString()
            };
            if (sourceDebt.linkedInvoice) transferredDebt.linkedInvoice = sourceDebt.linkedInvoice;
            if (sourceDebt.saleId) transferredDebt.saleId = sourceDebt.saleId;
            window.debtors.push(transferredDebt);
        }

        logOperation("تحويل دين", `تم تحويل ${formatCurrency(cleanTransfer)} من ${oldSourceName} إلى ${targetProfile.name}`);

        if (_tx) _tx.commit();
        updateUI();
        closeTransferDebtModal();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحويل الدين بنجاح إلى ${targetProfile.name}`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("فشل تحويل الدين:", err);
        if (typeof showGlobalMessage === 'function') showGlobalMessage("فشل تحويل الدين؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
    }
}

// --- 2. دوال الحذف والاسترداد ---
// =====================================================================
// �� نظام السداد المرن للديون (تحديد عدة بنود والسداد الجماعي)
// =====================================================================

// --- 1. السداد الانتقائي داخل بطاقة العميل ---

window.toggleSelectAllDebts = function(customerId) {
    const isChecked = document.querySelector(`.debt-select-all-cb[data-customer-id="${customerId}"]`).checked;
    const checkboxes = document.querySelectorAll(`.debt-item-cb[data-customer-id="${customerId}"]`);
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateDebtSelectionTotal(customerId);
};

window.updateDebtSelectionTotal = function(customerId) {
    const checkboxes = document.querySelectorAll(`.debt-item-cb[data-customer-id="${customerId}"]:checked`);
    let total = 0;
    checkboxes.forEach(cb => total += parseFloat(cb.dataset.amount || 0));
    
    const totalSpan = document.querySelector(`.debt-selected-total[data-customer-id="${customerId}"]`);
    const payBar = document.querySelector(`.debt-pay-selected-bar[data-customer-id="${customerId}"]`);
    
    if (total > 0) {
        totalSpan.textContent = `المحدد: ${formatCurrency(total)}`;
        totalSpan.style.display = 'inline';
        payBar.style.display = 'block';
    } else {
        totalSpan.style.display = 'none';
        payBar.style.display = 'none';
    }
};

window.paySelectedDebtsForCustomer = async function(customerId) {
    const checkboxes = document.querySelectorAll(`.debt-item-cb[data-customer-id="${customerId}"]:checked`);
    if (checkboxes.length === 0) return;
    
    const accountSelect = document.querySelector(`.debt-pay-account-select[data-customer-id="${customerId}"]`);
    const accountId = accountSelect.value;
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) {
        showGlobalMessage('يرجى اختيار حساب مالي صحيح', true);
        return;
    }

    let totalAmount = 0;
    let paidDebtIds = [];
    let paidDebtsList = [];
    
    // قراءة المبالغ دائماً من المصفوفة الحية window.debtors لمنع السداد المزدوج أو استخدام قيم DOM قديمة
    checkboxes.forEach(cb => {
        const dObj = window.debtors.find(d => d.id === cb.dataset.debtId && (Number(d.amount) || 0) > 0.001);
        if (!dObj) return;
        const itemAmt = (typeof window.money === 'function' ? window.money : Number)(Number(dObj.amount) || 0);
        totalAmount = (typeof window.money === 'function' ? window.money : Number)(totalAmount + itemAmt);
        paidDebtIds.push(dObj.id);
        paidDebtsList.push(`${dObj.reason || 'دين'} (${formatCurrency(itemAmt)})`);
    });

    if (paidDebtIds.length === 0 || totalAmount <= 0.001) {
        showGlobalMessage('الديون المحددة تم سدادها بالفعل أو لم تعد نشطة.', true);
        return;
    }

    if (confirm(`هل أنت متأكد من سداد ديون بقيمة ${formatCurrency(totalAmount)} وإيداعها في "${account.name}"؟`)) {
        if (typeof saveStateToHistory === 'function') saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        
        try {
            account.balance = window.money((Number(account.balance) || 0) + totalAmount);
            
            const customerProfile = debtorProfiles.find(p => p.id === customerId);
            const customerName = customerProfile ? customerProfile.name : "عميل";
            
            const newTotalLiquidity = (typeof window.money === 'function' ? window.money : Number)(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
            if (typeof liquidityLog !== 'undefined') {
                liquidityLog.push({
                    id: generateId("liq"),
                    timestamp: new Date().toISOString(),
                    type: "add",
                    amount: totalAmount,
                    description: `تحصيل ديون من العميل "${customerName}" في حساب "${account.name}"`,
                    currentBalance: newTotalLiquidity,
                    accountId: account.id
                });
            }

            // إزالة الديون من النظام
            window.debtors = window.debtors.filter(d => !paidDebtIds.includes(d.id));
            
            // تسجيل العملية في بروفايل العميل للرجوع إليها في أي وقت
            if (customerProfile) {
                if (!Array.isArray(customerProfile.paymentHistory)) customerProfile.paymentHistory = [];
                const payDate = new Date().toISOString();
                customerProfile.paymentHistory.unshift({
                    id: generateId("pay"),
                    date: payDate,
                    amount: totalAmount,
                    accountId: account.id,
                    accountName: account.name,
                    debtReason: paidDebtsList.length > 0 ? paidDebtsList.join('، ') : `سداد ${paidDebtIds.length} بند دين`,
                    debtIds: [...paidDebtIds],
                    type: 'selected_debts',
                    note: `سداد ديون محددة بقيمة ${formatCurrency(totalAmount)} في حساب "${account.name}"`
                });
            }

            // تسجيل العملية بتفاصيل البنود كاملة
            const debtsDetailsStr = paidDebtsList.length > 0 ? ` [البنود المسددة: ${paidDebtsList.join('، ')}]` : '';
            logOperation("سداد ديون محددة", `تم سداد ${paidDebtIds.length} بنود ديون للعميل "${customerName}" بقيمة ${formatCurrency(totalAmount)} وإيداعها في "${account.name}".${debtsDetailsStr}`);
            
            if (_tx) _tx.commit();
            updateUI();
            showGlobalMessage(`تم سداد الديون بنجاح وإيداع ${formatCurrency(totalAmount)}`, false);
            if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
        } catch (err) {
            if (_tx) await _tx.rollback();
            console.error("فشل سداد الديون:", err);
            showGlobalMessage("فشل سداد الديون؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
        }
    }
};

// --- 2. مودال السداد الجماعي للعملاء ---

window.openBulkDebtModal = function() {
    const modal = document.getElementById('bulkDebtPaymentModal');
    if (!modal) return;
    
    // تعبئة الخزن
    const accSelect = document.getElementById('bulkDebtAccountSelect');
    accSelect.innerHTML = accounts.map(acc => `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})</option>`).join('');
    
    document.getElementById('bulkDebtSearchInput').value = '';
    renderBulkDebtList();
    
    modal.style.display = 'flex';
};

window.closeBulkDebtModal = function() {
    document.getElementById('bulkDebtPaymentModal').style.display = 'none';
};

window.renderBulkDebtList = function() {
    const container = document.getElementById('bulkDebtListContainer');
    const searchInput = document.getElementById('bulkDebtSearchInput').value.trim();
    const normalizedSearch = normalizeArabicText(searchInput);
    
    container.innerHTML = '';
    
    // تجميع الديون حسب العميل
    const grouped = {};
    window.debtors.forEach(debt => {
        const amount = Number(debt.amount) || 0;
        if (amount <= 0.001) return;
        
        const matchedProfile = debt.customerId
            ? debtorProfiles.find(p => p.id === debt.customerId)
            : debtorProfiles.find(p => normalizeArabicText(p.name) === normalizeArabicText(debt.name || debt.customerName || ''));
        const customerId = debt.customerId || (matchedProfile ? matchedProfile.id : ('legacy_' + normalizeArabicText(debt.name || debt.customerName || 'unknown')));
        if (!grouped[customerId]) {
            const profile = matchedProfile || { id: customerId, name: debt.name || debt.customerName || 'غير معروف' };
            grouped[customerId] = {
                customerId,
                profile,
                total: 0,
                debts: []
            };
        }
        grouped[customerId].debts.push(debt);
        grouped[customerId].total += amount;
    });

    let customers = Object.values(grouped);
    
    // الفلترة بالبحث
    if (normalizedSearch) {
        customers = customers.filter(group => {
            const name = normalizeArabicText(group.profile.name || "");
            const phone = normalizeArabicText(group.profile.phone || "");
            return name.includes(normalizedSearch) || phone.includes(normalizedSearch);
        });
    }
    
    if (customers.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">لا توجد ديون تطابق بحثك.</p>';
        updateBulkSelectionTotal();
        return;
    }

    customers.forEach(group => {
        const div = document.createElement('div');
        div.style.cssText = 'border:1px solid #e5e7eb; border-radius:8px; margin-bottom:12px; overflow:hidden;';
        
        const header = document.createElement('div');
        header.style.cssText = 'background:#f9fafb; padding:10px 14px; display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb;';
        
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                <label style="cursor:pointer; display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-weight:bold; color:#1f2937;">
                    <input type="checkbox" class="bulk-customer-select-all" data-customer-id="${escapeHTML(group.customerId)}" onchange="toggleBulkSelectAll(this.dataset.customerId)" style="accent-color:#8b5cf6;">
                    ${escapeHTML(group.profile.name)} <span style="font-size:12px; color:#6b7280; background:#e5e7eb; padding:2px 6px; border-radius:10px;">${formatCurrency(group.total)}</span>
                </label>
            </div>
        `;
        
        const itemsContainer = document.createElement('div');
        itemsContainer.style.cssText = 'padding:10px 14px; background:white;';
        
        group.debts.forEach(debt => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f3f4f6; font-size:14px;';
            if(debt === group.debts[group.debts.length-1]) itemDiv.style.borderBottom = 'none';
            
            const dateStr = debt.createdAt ? new Date(debt.createdAt).toLocaleDateString('ar-EG') : '';
            
            itemDiv.innerHTML = `
                <label style="cursor:pointer; display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:#4b5563; flex:1 1 160px; min-width:0;">
                    <input type="checkbox" class="bulk-debt-item-cb" data-customer-id="${escapeHTML(group.customerId)}" data-debt-id="${escapeHTML(debt.id)}" data-amount="${debt.amount}" onchange="updateBulkSelectionTotal()" style="accent-color:#8b5cf6;">
                    ${escapeHTML(debt.reason || 'دين بدون تفاصيل')} <span style="font-size:11px; color:#9ca3af;">${dateStr}</span>
                </label>
                <span style="font-weight:bold; color:#4c1d95;">${formatCurrency(debt.amount)}</span>
            `;
            itemsContainer.appendChild(itemDiv);
        });
        
        div.appendChild(header);
        div.appendChild(itemsContainer);
        container.appendChild(div);
    });
    
    updateBulkSelectionTotal();
};

window.toggleBulkSelectAll = function(customerId) {
    const isChecked = document.querySelector(`.bulk-customer-select-all[data-customer-id="${customerId}"]`).checked;
    const checkboxes = document.querySelectorAll(`.bulk-debt-item-cb[data-customer-id="${customerId}"]`);
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateBulkSelectionTotal();
};

window.updateBulkSelectionTotal = function() {
    const checkboxes = document.querySelectorAll('.bulk-debt-item-cb:checked');
    let total = 0;
    checkboxes.forEach(cb => total += parseFloat(cb.dataset.amount || 0));
    
    const summaryBar = document.getElementById('bulkDebtSummaryBar');
    const totalEl = document.getElementById('bulkDebtTotalAmount');
    
    if (total > 0) {
        totalEl.textContent = formatCurrency(total);
        summaryBar.style.display = 'block';
    } else {
        summaryBar.style.display = 'none';
    }
};

window.confirmBulkDebtPayment = async function() {
    const checkboxes = document.querySelectorAll('.bulk-debt-item-cb:checked');
    if (checkboxes.length === 0) return;
    
    const accountId = document.getElementById('bulkDebtAccountSelect').value;
    const note = document.getElementById('bulkDebtNote').value.trim();
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) {
        alert('يرجى اختيار حساب مالي صحيح');
        return;
    }

    let totalAmount = 0;
    let paidDebtIds = [];
    let involvedCustomers = new Set();
    const custAmounts = {};
    
    // قراءة المبالغ من المصفوفة الحية window.debtors وليس من dataset القديمة
    checkboxes.forEach(cb => {
        const liveDebt = window.debtors.find(d => d.id === cb.dataset.debtId && (Number(d.amount) || 0) > 0.001);
        if (!liveDebt) return;
        const amt = window.money(Number(liveDebt.amount) || 0);
        totalAmount = window.money(totalAmount + amt);
        paidDebtIds.push(liveDebt.id);

        const cId = liveDebt.customerId || cb.dataset.customerId;
        const customerProfile = debtorProfiles.find(p => p.id === cId) || debtorProfiles.find(p => normalizeArabicText(p.name) === normalizeArabicText(liveDebt.name || ''));
        involvedCustomers.add(customerProfile ? customerProfile.name : (liveDebt.name || 'عميل'));
        const profKey = customerProfile ? customerProfile.id : cId;
        if (!custAmounts[profKey]) custAmounts[profKey] = { total: 0, count: 0 };
        custAmounts[profKey].total = window.money(custAmounts[profKey].total + amt);
        custAmounts[profKey].count++;
    });

    if (paidDebtIds.length === 0 || totalAmount <= 0.001) {
        alert('الديون المحددة تم سدادها بالفعل أو لم تعد نشطة.');
        return;
    }

    const customerNamesStr = Array.from(involvedCustomers).join('، ');

    if (confirm(`تأكيد سداد ديون بقيمة ${formatCurrency(totalAmount)} لعدد ${involvedCustomers.size} عملاء وإيداعها في "${account.name}"؟`)) {
        if (typeof saveStateToHistory === 'function') saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        
        try {
            account.balance = window.money((Number(account.balance) || 0) + totalAmount);
            
            const newTotalLiquidity = window.money(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
            if (typeof liquidityLog !== 'undefined') {
                liquidityLog.push({
                    id: generateId("liq"),
                    timestamp: new Date().toISOString(),
                    type: "add",
                    amount: totalAmount,
                    description: `سداد جماعي لعدد ${paidDebtIds.length} بند دين من العملاء: (${customerNamesStr}) في حساب "${account.name}"`,
                    currentBalance: newTotalLiquidity,
                    accountId: account.id
                });
            }

            window.debtors = window.debtors.filter(d => !paidDebtIds.includes(d.id));

            Object.entries(custAmounts).forEach(([cId, data]) => {
                const prof = debtorProfiles.find(p => p.id === cId);
                if (prof) {
                    if (!Array.isArray(prof.paymentHistory)) prof.paymentHistory = [];
                    prof.paymentHistory.unshift({
                        id: generateId("pay"),
                        date: new Date().toISOString(),
                        amount: data.total,
                        accountId: account.id,
                        accountName: account.name,
                        debtReason: `سداد جماعي (${data.count} بنود)`,
                        type: 'bulk_payment',
                        note: note ? `سداد جماعي: ${note}` : `سداد جماعي في حساب "${account.name}"`
                    });
                }
            });

            // تسجيل اللوج
            let logDesc = `سداد جماعي لعدد ${paidDebtIds.length} بند دين بإجمالي ${formatCurrency(totalAmount)} من العملاء: (${customerNamesStr}) وإيداعها في "${account.name}"`;
            if (note) logDesc += ` - ملاحظة: ${note}`;
            
            logOperation("سداد ديون جماعي", logDesc);
            
            if (_tx) _tx.commit();
            closeBulkDebtModal();
            updateUI();
            showGlobalMessage(`تم إيداع ${formatCurrency(totalAmount)} في الخزنة بنجاح`, false);
            if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
        } catch (err) {
            if (_tx) await _tx.rollback();
            console.error("فشل السداد الجماعي للديون:", err);
            showGlobalMessage("فشل السداد الجماعي؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
        }
    }
};

window.deleteDebtItem = function(debtId) {
    const debt = window.debtors.find(d => d.id === debtId);
    if (!debt) return;

    // الاسترداد النقدي متاح فقط للسلف النقدية (origin === 'cash_loan')؛ الديون الناتجة عن مبيعات آجلة أو مرتجعات أو استبدال لا يجوز تحويل شطبها لكاش
    const isNonCashOrigin = (debt.origin === 'credit_sale' || debt.origin === 'exchange_debt' || debt.origin === 'purchase_return' || debt.origin === 'manual_debt' || (debt.linkedInvoice && debt.linkedInvoice !== 'بدون فاتورة'));
    const canRefundCash = (debt.origin === 'cash_loan') || (!debt.origin && !isNonCashOrigin);

    const modal = document.getElementById('deleteDebtRefundModal');
    document.getElementById('delete-debt-info').textContent = canRefundCash
        ? `سيتم حذف دين "${debt.reason}" بقيمة ${formatCurrency(debt.amount)}. اختر الإجراء المناسب:`
        : `سيتم شطب وإلغاء دين "${debt.reason}" بقيمة ${formatCurrency(debt.amount)} (دين غير نقدي — يُشطب فقط دون إضافة أموال للخزينة لحماية رأس المال).`;

    const select = document.getElementById('delete-debt-account-select');
    const refundOptions = canRefundCash
        ? window.accounts.map(acc => `<option value="${escapeHTML(acc.id)}">استرداد سلفة نقدية إلى: ${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})${!debt.origin ? ' [للسلف النقدية فقط]' : ''}</option>`).join('')
        : '';
    select.innerHTML = `<option value="NONE">-- شطب وإسقاط الدين فقط (دون إضافة أموال للخزينة) --</option>` + refundOptions;

    const confirmBtn = document.getElementById('confirmDeleteRefundBtn');
    confirmBtn.disabled = false;
    confirmBtn.onclick = async () => {
        if (confirmBtn.disabled) return;
        // إعادة فحص وجود الدين لحظياً لمنع التكرار عند الضغط السريع
        const liveDebt = window.debtors.find(d => d.id === debtId);
        if (!liveDebt) {
            closeDeleteDebtRefundModal();
            return;
        }
        if (select.value !== "NONE" && !canRefundCash) {
            showGlobalMessage("لا يمكن عمل استرداد نقدي لدين غير نقدي (مبيعات/مرتجع/استبدال).", true);
            return;
        }
        if (select.value !== "NONE" && !liveDebt.origin) {
            if (!confirm("تأكيد أمان: هل هذا الدين كان سلفة نقدية خُصمت فعلياً من الخزنة عند إنشائه؟\nإذا كان دين مبيعات أو رصيد غير نقدي، اختر (إلغاء) ثم اختر (شطب الدين فقط).")) {
                return;
            }
        }

        confirmBtn.disabled = true;
        saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        try {
            const debtAmt = window.money(Number(liveDebt.amount) || 0);
            if (select.value === "NONE") {
                window.debtors = window.debtors.filter(d => d.id !== debtId);
                if (typeof recordedLosses !== 'undefined') {
                    recordedLosses = window.money((Number(recordedLosses) || 0) + debtAmt);
                }
                
                let cProf = liveDebt.customerId ? debtorProfiles.find(p => p.id === liveDebt.customerId) : debtorProfiles.find(p => normalizeArabicText(p.name) === normalizeArabicText(liveDebt.name));
                if (cProf) {
                    if (!Array.isArray(cProf.paymentHistory)) cProf.paymentHistory = [];
                    cProf.paymentHistory.unshift({
                        id: generateId("pay"),
                        date: new Date().toISOString(),
                        amount: debtAmt,
                        accountId: 'CANCEL',
                        accountName: 'شطب / إعفاء',
                        debtReason: liveDebt.reason || 'شطب دين',
                        type: 'cancelled',
                        note: `شطب وإعفاء الدين بقيمة ${formatCurrency(debtAmt)} دون استرداد نقدي`
                    });
                }

                logOperation("إلغاء دين", `شطب/حذف دين ${liveDebt.name} بقيمة ${formatCurrency(debtAmt)} دون تعديل الخزينة.`);
                if (_tx) _tx.commit();
                updateUI();
                closeDeleteDebtRefundModal();
                showGlobalMessage("تم شطب وحذف الدين بنجاح.");
                if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
            } else {
                const account = window.accounts.find(a => a.id === select.value);
                if (account) {
                    account.balance = window.money((Number(account.balance) || 0) + debtAmt);
                    window.debtors = window.debtors.filter(d => d.id !== debtId);
                    
                    let cProf = liveDebt.customerId ? debtorProfiles.find(p => p.id === liveDebt.customerId) : debtorProfiles.find(p => normalizeArabicText(p.name) === normalizeArabicText(liveDebt.name));
                    if (cProf) {
                        if (!Array.isArray(cProf.paymentHistory)) cProf.paymentHistory = [];
                        cProf.paymentHistory.unshift({
                            id: generateId("pay"),
                            date: new Date().toISOString(),
                            amount: debtAmt,
                            accountId: account.id,
                            accountName: account.name,
                            debtReason: liveDebt.reason || 'استرداد سلفة نقدية',
                            type: 'refund',
                            note: `إلغاء السلفة واسترداد المبلغ لحساب "${account.name}"`
                        });
                    }

                    const newTotalLiquidity = window.money(window.accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0));
                    if (typeof liquidityLog !== 'undefined') {
                        liquidityLog.push({
                            id: generateId("liq"),
                            timestamp: new Date().toISOString(),
                            type: "add",
                            amount: debtAmt,
                            description: `استرداد سلفة نقدية بعد حذف دين "${liveDebt.name}" (${liveDebt.reason}) في حساب "${account.name}"`,
                            currentBalance: newTotalLiquidity,
                            accountId: account.id
                        });
                    }
                    logOperation("إلغاء دين", `إعادة ${formatCurrency(debtAmt)} لحساب ${account.name} بعد حذف سلفة ${liveDebt.name}`);
                    if (_tx) _tx.commit();
                    updateUI();
                    closeDeleteDebtRefundModal();
                    showGlobalMessage("تم استرداد المبلغ وحذف البند.");
                    if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
                }
            }
        } catch (err) {
            if (_tx) await _tx.rollback();
            console.error("فشل حذف الدين:", err);
            showGlobalMessage("فشل حذف الدين؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
        } finally {
            confirmBtn.disabled = false;
        }
    };
    modal.style.display = 'block';
};

window.closeDeleteDebtRefundModal = function() {
    document.getElementById('deleteDebtRefundModal').style.display = 'none';
   };

async function performTwoPartyOffset() {
                if (!offsetDebtorNameInput || !offsetCreditorNameInput || !offsetAmountInput || !offsetMessage) return;
                const debtorName = offsetDebtorNameInput.value.trim();
                const creditorName = offsetCreditorNameInput.value.trim();
                const offsetAmount = parseInputNumber(offsetAmountInput);

                if (!debtorName || !creditorName || isNaN(offsetAmount) || offsetAmount <= 0) {
                    showMessage(offsetMessage, "يرجى إدخال اسم المدين والدائن ومبلغ مقاصة صحيح (> 0).", true);
                    return;
                }
                 if (debtorName === creditorName) {
                    showMessage(offsetMessage, "لا يمكن إجراء مقاصة لنفس الشخص (المدين هو الدائن).", true);
                    return;
                 }

                // Find total debt for the debtor
                const debtorTotal = debtors
                    .filter(d => d.name === debtorName)
                    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

                // Find total liability for the creditor
                const creditorTotal = liabilities
                    .filter(l => l.name === creditorName)
                    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

                if (debtorTotal < offsetAmount - 0.001) { // Use tolerance
                    showMessage(offsetMessage, `مبلغ المقاصة (${formatCurrency(offsetAmount)}) أكبر من إجمالي دين المدين "${debtorName}" (${formatCurrency(debtorTotal)}).`, true);
                    return;
                }
                if (creditorTotal < offsetAmount - 0.001) { // Use tolerance
                    showMessage(offsetMessage, `مبلغ المقاصة (${formatCurrency(offsetAmount)}) أكبر من إجمالي التزام الدائن "${creditorName}" (${formatCurrency(creditorTotal)}).`, true);
                    return;
                }

                if (typeof saveStateToHistory === 'function') saveStateToHistory();
                const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

                try {
                    // --- Apply Offset ---
                    const cleanOffset = window.money(Number(offsetAmount) || 0);
                    // Reduce Debtor's Debt
                    let remainingOffsetForDebtor = cleanOffset;
                    debtors = debtors.map(debt => {
                        if (debt.name === debtorName && remainingOffsetForDebtor > 0.001 && (Number(debt.amount) || 0) > 0.001) {
                            const deduction = window.money(Math.min(Number(debt.amount) || 0, remainingOffsetForDebtor));
                            debt.amount = window.money(Math.max(0, (Number(debt.amount) || 0) - deduction));
                            remainingOffsetForDebtor = window.money(Math.max(0, remainingOffsetForDebtor - deduction));
                        }
                        return debt;
                    }).filter(debt => (Number(debt.amount) || 0) > 0.001);

                    // Reduce Creditor's Liability + sync linked purchases & supplier balance
                    let remainingOffsetForCreditor = cleanOffset;
                    liabilities = liabilities.map(liability => {
                        if (liability.name === creditorName && remainingOffsetForCreditor > 0.001 && (Number(liability.amount) || 0) > 0.001) {
                            const deduction = window.money(Math.min(Number(liability.amount) || 0, remainingOffsetForCreditor));
                            liability.amount = window.money(Math.max(0, (Number(liability.amount) || 0) - deduction));
                            remainingOffsetForCreditor = window.money(Math.max(0, remainingOffsetForCreditor - deduction));
                            if (liability.amount < 0.001) {
                                liability.amount = 0;
                                liability.status = 'paid';
                            }
                            if (typeof window.updateLinkedPurchasePayment === 'function') {
                                window.updateLinkedPurchasePayment(liability, deduction);
                            }
                            if (liability.supplierId && liability.source !== 'purchase_extra_cost' && typeof suppliers !== 'undefined' && Array.isArray(suppliers)) {
                                const sup = suppliers.find(s => s.id === liability.supplierId);
                                if (sup && sup.balance !== undefined) {
                                    sup.balance = window.money(Math.max(0, (Number(sup.balance) || 0) - deduction));
                                }
                            }
                            if (!Array.isArray(liability.paymentHistory)) liability.paymentHistory = [];
                            liability.paymentHistory.unshift({
                                id: generateId("pay"),
                                date: new Date().toISOString(),
                                amount: deduction,
                                accountId: 'OFFSET',
                                accountName: `مقاصة مع (${debtorName})`,
                                type: 'offset',
                                note: `مقاصة ثنائية مع دين المدين "${debtorName}"`
                            });
                        }
                        return liability;
                    }).filter(liability => (Number(liability.amount) || 0) > 0.001 || (liability.paymentHistory && liability.paymentHistory.length > 0));


                    logOperation("مقاصة", `تنفيذ مقاصة بمبلغ ${formatCurrency(offsetAmount)} بين المدين "${debtorName}" والدائن "${creditorName}".`);

                    // تسجيل المقاصة في بروفايل العميل
                    const dProf = debtorProfiles.find(p => normalizeArabicText(p.name) === normalizeArabicText(debtorName));
                    if (dProf) {
                        if (!Array.isArray(dProf.paymentHistory)) dProf.paymentHistory = [];
                        dProf.paymentHistory.unshift({
                            id: generateId("pay"),
                            date: new Date().toISOString(),
                            amount: offsetAmount,
                            accountId: 'OFFSET',
                            accountName: `مقاصة مع (${creditorName})`,
                            debtReason: 'تسوية مقاصة',
                            type: 'offset',
                            note: `مقاصة ثنائية مع التزام الدائن "${creditorName}"`
                        });
                    }

                    if (_tx) _tx.commit();
                    showMessage(offsetMessage, `تم تنفيذ المقاصة بنجاح بمبلغ ${formatCurrency(offsetAmount)}.`, false);
                    offsetDebtorNameInput.value = '';
                    offsetCreditorNameInput.value = '';
                    offsetAmountInput.value = '';
                    updateUI();
                    if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
                } catch (err) {
                    if (_tx) await _tx.rollback();
                    console.error("فشل تنفيذ المقاصة:", err);
                    showMessage(offsetMessage, `فشل تنفيذ المقاصة؛ تم التراجع عن التعديلات: ${err.message || ''}`, true);
                }
            }

function openPartialLiabilityPaymentModal(liabilityId) {
    const liability = liabilities.find(l => l.id === liabilityId);
    if (!liability) {
        showGlobalMessage("خطأ: لم يتم العثور على الالتزام المحدد.", true);
        return;
    }

    const accountSelect = d('partial-liability-payment-account');
    accountSelect.innerHTML = '<option value="">-- اختر الحساب --</option>';
    accounts.forEach(acc => {
        accountSelect.innerHTML += `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})</option>`;
    });

    d('partial-liability-creditor-name').textContent = liability.name;
    d('partial-liability-total-amount').textContent = formatCurrency(liability.amount);
    d('partial-liability-payment-amount').value = '';
    d('partial-liability-payment-amount').max = liability.amount;
    d('confirm-partial-liability-payment-btn').dataset.liabilityId = liability.id;
    if (d('partial-liability-payment-note')) {
        d('partial-liability-payment-note').value = '';
    }
    
    showMessage(partialLiabilityPaymentMessage, "");
    partialLiabilityPaymentModal.style.display = 'block';
}

function closePartialLiabilityPaymentModal() {
    partialLiabilityPaymentModal.style.display = 'none';
}

function openPartialDebtPaymentModal(debtId) {
    const debt = debtors.find(d => d.id === debtId);
    if (!debt) {
        showGlobalMessage("خطأ: لم يتم العثور على الدين المحدد.", true);
        return;
    }

    const accountSelect = d('partial-debt-payment-account');
    accountSelect.innerHTML = '<option value="">-- اختر الحساب --</option>';
    accounts.forEach(acc => {
        accountSelect.innerHTML += `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})</option>`;
    });

    d('partial-debtor-name').textContent = debt.name;
    d('partial-debt-reason').textContent = debt.reason || 'دين عام';
    d('partial-debt-total-amount').textContent = formatCurrency(debt.amount);
    
    const amountInput = d('partial-debt-payment-amount');
    amountInput.value = '';
    amountInput.max = debt.amount;
    
    d('confirm-partial-debt-payment-btn').dataset.debtId = debt.id;
    
    showMessage(partialDebtPaymentMessage, "");
    partialDebtPaymentModal.style.display = 'block';
    amountInput.focus();
}

function closePartialDebtPaymentModal() {
    partialDebtPaymentModal.style.display = 'none';
}
