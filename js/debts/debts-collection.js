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
        // خصم من المصدر
        const oldSourceName = sourceDebt.name;
        sourceDebt.amount = window.money(sourceDebt.amount - transferAmount);
        if (sourceDebt.amount < 0.01) window.debtors.splice(sourceIndex, 1);

        // إضافة للمستلم (أو دمج إذا كان لديه نفس السبب)
        let targetProfile = getOrCreateDebtorProfile(targetName);
        const existingDebt = window.debtors.find(d => 
            d.customerId === targetProfile.id && 
            normalizeArabicText(d.reason) === normalizeArabicText(finalReason)
        );

        if (existingDebt) {
            existingDebt.amount = window.money(existingDebt.amount + transferAmount);
        } else {
            window.debtors.push({
                id: generateId('debt'),
                customerId: targetProfile.id,
                name: targetProfile.name,
                reason: finalReason,
                amount: transferAmount,
                createdAt: new Date().toISOString()
            });
        }

        logOperation("تحويل دين", `تم تحويل ${formatCurrency(transferAmount)} من ${oldSourceName} إلى ${targetProfile.name}`);

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
    
    checkboxes.forEach(cb => {
        totalAmount = (typeof window.money === 'function' ? window.money : Number)(totalAmount + parseFloat(cb.dataset.amount || 0));
        paidDebtIds.push(cb.dataset.debtId);
    });

    if (confirm(`هل أنت متأكد من سداد ديون بقيمة ${formatCurrency(totalAmount)} وإيداعها في "${account.name}"؟`)) {
        // حفظ الحالة للتراجع
        if (typeof saveStateToHistory === 'function') saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        
        try {
            // تحديث الحساب
            account.balance = window.money(account.balance + totalAmount);
            
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
            
            // تسجيل العملية
            logOperation("سداد ديون محددة", `تم سداد ${paidDebtIds.length} بنود ديون للعميل "${customerName}" بقيمة ${formatCurrency(totalAmount)} وإيداعها في "${account.name}"`);
            
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
        
        const customerId = debt.customerId;
        if (!grouped[customerId]) {
            const profile = debtorProfiles.find(p => p.id === customerId) || {name: debt.name || 'غير معروف'};
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
        header.style.cssText = 'background:#f9fafb; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb;';
        
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:bold; color:#1f2937;">
                    <input type="checkbox" class="bulk-customer-select-all" data-customer-id="${escapeHTML(group.customerId)}" onchange="toggleBulkSelectAll(this.dataset.customerId)" style="accent-color:#8b5cf6;">
                    ${escapeHTML(group.profile.name)} <span style="font-size:12px; color:#6b7280; background:#e5e7eb; padding:2px 6px; border-radius:10px;">${formatCurrency(group.total)}</span>
                </label>
            </div>
        `;
        
        const itemsContainer = document.createElement('div');
        itemsContainer.style.cssText = 'padding:10px 14px; background:white;';
        
        group.debts.forEach(debt => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f3f4f6; font-size:14px;';
            if(debt === group.debts[group.debts.length-1]) itemDiv.style.borderBottom = 'none';
            
            const dateStr = debt.createdAt ? new Date(debt.createdAt).toLocaleDateString('ar-EG') : '';
            
            itemDiv.innerHTML = `
                <label style="cursor:pointer; display:flex; align-items:center; gap:8px; color:#4b5563; flex:1;">
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
    
    checkboxes.forEach(cb => {
        totalAmount += parseFloat(cb.dataset.amount || 0);
        paidDebtIds.push(cb.dataset.debtId);
        
        const customerProfile = debtorProfiles.find(p => p.id === cb.dataset.customerId);
        if (customerProfile) {
            involvedCustomers.add(customerProfile.name);
        }
    });

    const customerNamesStr = Array.from(involvedCustomers).join('، ');

    if (confirm(`تأكيد سداد ديون بقيمة ${formatCurrency(totalAmount)} لعدد ${involvedCustomers.size} عملاء وإيداعها في "${account.name}"؟`)) {
        // حفظ الحالة للتراجع
        if (typeof saveStateToHistory === 'function') saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        
        try {
            // تحديث الخزنة
            account.balance = window.money(account.balance + totalAmount);
            
            const newTotalLiquidity = (typeof window.money === 'function' ? window.money : Number)(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
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

            // إزالة الديون المسددة
            window.debtors = window.debtors.filter(d => !paidDebtIds.includes(d.id));
            
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

    const modal = document.getElementById('deleteDebtRefundModal');
    document.getElementById('delete-debt-info').textContent = `سيتم حذف دين "${debt.reason}" بقيمة ${formatCurrency(debt.amount)}. اختر الحساب الذي تريد استرداد المبلغ إليه:`;

    const select = document.getElementById('delete-debt-account-select');
    select.innerHTML = `<option value="NONE">-- حذف وسقوط الدين فقط (دون إضافة أموال للخزينة) --</option>` + window.accounts.map(acc => `<option value="${escapeHTML(acc.id)}">استرداد نقدي إلى: ${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})</option>`).join('');

    document.getElementById('confirmDeleteRefundBtn').onclick = async () => {
        saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        try {
            if (select.value === "NONE") {
                window.debtors = window.debtors.filter(d => d.id !== debtId);
                logOperation("إلغاء دين", `شطب/حذف دين ${debt.name} بقيمة ${formatCurrency(debt.amount)} دون تعديل الخزينة.`);
                if (_tx) _tx.commit();
                updateUI();
                closeDeleteDebtRefundModal();
                showGlobalMessage("تم حذف الدين بنجاح.");
                if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
            } else {
                const account = window.accounts.find(a => a.id === select.value);
                if (account) {
                    const refundAmount = Number(debt.amount) || 0;
                    account.balance = window.money(account.balance + refundAmount);
                    window.debtors = window.debtors.filter(d => d.id !== debtId);
                    const newTotalLiquidity = (typeof window.money === 'function' ? window.money : Number)(window.accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0));
                    if (typeof liquidityLog !== 'undefined') {
                        liquidityLog.push({
                            id: generateId("liq"),
                            timestamp: new Date().toISOString(),
                            type: "add",
                            amount: refundAmount,
                            description: `استرداد نقدي بعد حذف دين "${debt.name}" (${debt.reason}) في حساب "${account.name}"`,
                            currentBalance: newTotalLiquidity,
                            accountId: account.id
                        });
                    }
                    logOperation("إلغاء دين", `إعادة ${formatCurrency(refundAmount)} لحساب ${account.name} بعد حذف دين ${debt.name}`);
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
                    // Reduce Debtor's Debt
                    let remainingOffsetForDebtor = offsetAmount;
                    debtors = debtors.map(debt => {
                        if (debt.name === debtorName && remainingOffsetForDebtor > 0 && (Number(debt.amount) || 0) > 0.001) {
                            const deduction = Math.min(Number(debt.amount) || 0, remainingOffsetForDebtor);
                            debt.amount = (Number(debt.amount) || 0) - deduction;
                            remainingOffsetForDebtor -= deduction;
                        }
                        return debt;
                    }).filter(debt => (Number(debt.amount) || 0) > 0.001); // Remove zeroed debts

                    // Reduce Creditor's Liability
                    let remainingOffsetForCreditor = offsetAmount;
                     liabilities = liabilities.map(liability => {
                        if (liability.name === creditorName && remainingOffsetForCreditor > 0 && (Number(liability.amount) || 0) > 0.001) {
                            const deduction = Math.min(Number(liability.amount) || 0, remainingOffsetForCreditor);
                            liability.amount = (Number(liability.amount) || 0) - deduction;
                            remainingOffsetForCreditor -= deduction;
                        }
                        return liability;
                    }).filter(liability => (Number(liability.amount) || 0) > 0.001); // Remove zeroed liabilities


                    logOperation("مقاصة", `تنفيذ مقاصة بمبلغ ${formatCurrency(offsetAmount)} بين المدين "${debtorName}" والدائن "${creditorName}".`);

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
