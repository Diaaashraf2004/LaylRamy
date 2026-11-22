// finance-core-treasury.js - Treasury, Liquidity, and Monthly Liabilities
function updateLiquidityLogDisplay() {
    if (!liquidityLogListContainer) return;
    const filterSelect = document.getElementById('log-filter-safe');
    const selectedSafeId = filterSelect ? filterSelect.value : 'all';

    let displayLogs = [...liquidityLog];
    if (selectedSafeId && selectedSafeId !== 'all') {
        const targetAccount = (typeof accounts !== 'undefined') ? accounts.find(a => String(a.id) === String(selectedSafeId)) : null;
        displayLogs = displayLogs.filter(log => {
            if (log.accountId && String(log.accountId) === String(selectedSafeId)) return true;
            if (targetAccount) {
                if (log.accountName && log.accountName === targetAccount.name) return true;
                if (log.account && log.account === targetAccount.name) return true;
                if (log.description && (log.description.includes(`"${targetAccount.name}"`) || log.description.includes(targetAccount.name))) return true;
            }
            return false;
        });
    }

    if (displayLogs.length === 0) {
        liquidityLogListContainer.innerHTML = '<li class="text-center text-gray-500 py-4">لا توجد عمليات مسجلة تطابق التصفية.</li>';
        return;
    }

    liquidityLogListContainer.innerHTML = displayLogs.reverse().map(log => {
        const isAdd = log.type === 'add';
        const isRemove = log.type === 'remove';
        const amountClass = isAdd ? 'text-green-600 font-bold' : (isRemove ? 'text-red-600 font-bold' : 'text-blue-600 font-bold');
        const amountSign = isAdd ? '+' : (isRemove ? '-' : (Number(log.amount) >= 0 ? '+' : ''));
        const badgeColor = isAdd ? 'bg-green-100 text-green-800 border-green-200' : (isRemove ? 'bg-red-100 text-red-800 border-red-200' : 'bg-blue-100 text-blue-800 border-blue-200');
        const typeLabel = isAdd ? 'وارد / إيداع' : (isRemove ? 'صادر / خصم' : 'تسوية رصيد');

        return `
            <li class="p-3 mb-2 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                <div class="flex flex-wrap justify-between items-start gap-2 sm:gap-3">
                    <div class="flex-grow min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            <span class="text-xs px-2 py-0.5 rounded border font-semibold ${badgeColor}">${typeLabel}</span>
                            <span class="font-mono text-base ${amountClass}">${amountSign}${formatCurrency(Math.abs(Number(log.amount) || 0))}</span>
                        </div>
                        <p class="text-sm text-gray-700 m-0">${escapeHTML(log.description || 'بدون وصف')}</p>
                        <span class="block text-xs text-gray-400 mt-1">${formatDateTime(log.timestamp || log.date)}</span>
                    </div>
                    <div class="text-left flex-shrink-0">
                        <span class="text-xs text-gray-500 block">الرصيد بعد الحركة</span>
                        <span class="text-sm font-mono font-bold text-gray-800">${formatCurrency(log.currentBalance || 0)}</span>
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

// ==========================================
// �� دوال تحويل الالتزامات (Liability Transfer)
// ==========================================

// =================================================================
// START: NEW BULK PAYMENT FUNCTIONS
// =================================================================

function renderDebtorPaymentList() {
    const container = d('payment-debtor-list-container');
    if (!container) return;

    const validDebts = debtors.filter(d => (Number(d.amount) || 0) > 0.001);
    if (validDebts.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">لا توجد ديون متاحة للتحصيل.</p>';
        return;
    }

    const sortedDebts = validDebts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    container.innerHTML = sortedDebts.map(debt => `
        <label>
            <input type="checkbox" class="debt-payment-checkbox" data-debt-id="${debt.id}" data-amount="${debt.amount}">
            <span class="flex-grow min-w-0">${window.escapeHTML(debt.name)} - ${window.escapeHTML(debt.reason || 'دين عام')}</span>
            <strong class="font-mono flex-shrink-0 whitespace-nowrap">${formatCurrency(debt.amount)}</strong>
        </label>
    `).join('');
}

function renderLiabilityPaymentList() {
    const container = d('payment-creditor-list-container');
    if (!container) return;

    const validLiabilities = liabilities.filter(l => !l.isHidden && (Number(l.amount) || 0) > 0.001);
    if (validLiabilities.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">لا توجد التزامات متاحة للتسديد.</p>';
        return;
    }

    const sortedLiabilities = validLiabilities.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    container.innerHTML = sortedLiabilities.map(liability => `
        <label>
            <input type="checkbox" class="liability-payment-checkbox" data-liability-id="${liability.id}" data-amount="${liability.amount}">
            <span class="flex-grow min-w-0">${escapeHTML(liability.name)}</span>
            <strong class="font-mono flex-shrink-0 whitespace-nowrap">${formatCurrency(liability.amount)}</strong>
        </label>
    `).join('');
}

function calculateSelectedTotal(containerSelector, checkboxSelector, summaryEl, totalEl) {
    const container = d(containerSelector);
    if (!container || !summaryEl || !totalEl) return;

    let total = 0;
    const checkedItems = container.querySelectorAll(`${checkboxSelector}:checked`);
    checkedItems.forEach(checkbox => {
        total += parseFloat(checkbox.dataset.amount) || 0;
    });

    if (total > 0) {
        totalEl.textContent = formatCurrency(total);
        summaryEl.classList.remove('hidden');
    } else {
        summaryEl.classList.add('hidden');
    }
}
function updateMonthlyLiabilitiesDisplay() {
    if (!monthlyLiabilitiesList) return;
    monthlyLiabilitiesList.innerHTML = ''; // Clear list

    if (monthlyLiabilities.length === 0) {
        monthlyLiabilitiesList.innerHTML = '<li class="text-center text-gray-500">لا توجد التزامات شهرية مسجلة.</li>';
        return;
    }

    const sortedLiabilities = [...monthlyLiabilities].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    sortedLiabilities.forEach(liability => {
        const li = document.createElement('li');
        li.className = 'flex flex-wrap justify-between items-center gap-2 p-2 bg-gray-50 rounded-md border';
        li.innerHTML = `
            <div class="min-w-0">
                <span class="font-semibold text-gray-800">${escapeHTML(liability.name)}</span>
                <span class="text-red-600 font-mono mr-3">${formatCurrency(liability.amount)}</span>
            </div>
            <div class="actions flex flex-wrap gap-1.5">
                <button data-id="${liability.id}" class="edit-monthly-liability-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-1 px-2 rounded">تعديل</button>
                <button data-id="${liability.id}" class="delete-monthly-liability-btn text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded">حذف</button>
            </div>
        `;
        monthlyLiabilitiesList.appendChild(li);
    });
}

function resetMonthlyLiabilityForm() {
    editingMonthlyLiabilityId = null;
    if (monthlyLiabilityNameInput) monthlyLiabilityNameInput.value = '';
    if (monthlyLiabilityAmountInput) monthlyLiabilityAmountInput.value = '';
    if (monthlyLiabilityFormTitle) monthlyLiabilityFormTitle.textContent = "إضافة التزام شهري جديد";
    if (addMonthlyLiabilityButton) addMonthlyLiabilityButton.textContent = "إضافة / تحديث";
    if (cancelEditMonthlyLiabilityButton) cancelEditMonthlyLiabilityButton.classList.add('hidden');
    if (monthlyLiabilityMessage) showMessage(monthlyLiabilityMessage, '');
}

function addOrUpdateMonthlyLiability() {
    const name = monthlyLiabilityNameInput.value.trim();
    const amount = parseInputNumber(monthlyLiabilityAmountInput);

    if (!name || isNaN(amount) || amount <= 0) {
        showMessage(monthlyLiabilityMessage, "يرجى إدخال اسم ومبلغ صحيح (> 0).", true);
        return;
    }

    if (editingMonthlyLiabilityId) {
        // Update existing
        const liability = monthlyLiabilities.find(l => l.id === editingMonthlyLiabilityId);
        if (liability) {
            liability.name = name;
            liability.amount = amount;
            logOperation("تعديل التزام شهري", `تم تعديل الالتزام الشهري "${name}" إلى مبلغ ${formatCurrency(amount)}.`);
            showMessage(monthlyLiabilityMessage, "تم تحديث الالتزام الشهري بنجاح.");
        }
        resetMonthlyLiabilityForm();
    } else {
        // Add new
        if (monthlyLiabilities.some(l => l.name.toLowerCase() === name.toLowerCase())) {
             showMessage(monthlyLiabilityMessage, `الالتزام الشهري بالاسم "${name}" موجود بالفعل.`, true);
             return;
        }
        const newLiability = { id: generateId('m-liab'), name, amount };
        if (!newLiability.id) newLiability.id = generateId("MLIA");
        monthlyLiabilities.push(newLiability);
        logOperation("إضافة التزام شهري", `تمت إضافة التزام شهري جديد: "${name}" بقيمة ${formatCurrency(amount)}.`);
        showMessage(monthlyLiabilityMessage, "تمت إضافة الالتزام الشهري بنجاح.");
        resetMonthlyLiabilityForm(); // Reset form after adding
    }
    updateUI();
}

function processMonthlyLiabilities() {
    console.log("Checking for monthly liabilities processing...");
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    const lastProcessedMonth = fetchData(lsLastProcessedMonthKey, null);

    if (currentMonthStr === lastProcessedMonth) {
        console.log("Monthly liabilities for", currentMonthStr, "have already been processed.");
        return; // Already processed this month
    }

    if (monthlyLiabilities.length === 0) {
        console.log("No monthly liabilities defined. Skipping.");
        saveData(lsLastProcessedMonthKey, currentMonthStr);
        return;
    }

    console.log(`Processing monthly liabilities for new month: ${currentMonthStr}`);
    let totalAdded = 0;
    let addedItemsLog = [];

    monthlyLiabilities.forEach(mLiability => {
        // تخطي الديون المعالجة (المُقسَّطة محاسبياً للتوزيع الإداري) حتى لا تُخصم مرتين من رأس المال كالتزام حقيقي
        if (mLiability.isAmortizedDebt) return;
        const amt = typeof window.money === 'function' ? window.money(Number(mLiability.amount) || 0) : (Number(mLiability.amount) || 0);
        if (amt <= 0) return;
        const liabilityName = `التزام شهري: ${mLiability.name}`;
        // منع التكرار عبر الأجهزة المختلفة لنفس الشهر
        if (Array.isArray(liabilities) && liabilities.some(l => (l.monthlySourceId && l.monthlySourceId === mLiability.id && l.forMonth === currentMonthStr) || (l.name === liabilityName && l.forMonth === currentMonthStr))) {
            return;
        }
        const newLiability = {
            id: generateId('liab'),
            name: liabilityName,
            amount: amt,
            status: 'active',
            paymentHistory: [],
            monthlySourceId: mLiability.id,
            forMonth: currentMonthStr,
            createdAt: new Date().toISOString()
        };
        liabilities.push(newLiability);
        totalAdded = typeof window.money === 'function' ? window.money(totalAdded + amt) : (totalAdded + amt);
        addedItemsLog.push(`"${mLiability.name}" بقيمة ${formatCurrency(amt)}`);
    });

    if (addedItemsLog.length === 0) {
        saveData(lsLastProcessedMonthKey, currentMonthStr);
        return;
    }

    logOperation("معالجة التزامات شهرية", `تمت إضافة التزامات شهر ${currentMonthStr} تلقائياً: ${addedItemsLog.join(', ')}.`);
    saveData(lsLastProcessedMonthKey, currentMonthStr); // Mark this month as processed
    
    // ��️ حفظ سحابي فوري لمنع ضياع الالتزامات الشهرية
    if (typeof saveSystemToCloud === 'function') {
        saveSystemToCloud().catch(e => console.error("Failed to save monthly liabilities:", e));
    }
    
    showGlobalMessage(`تمت إضافة الالتزامات الشهرية (بمجموع ${formatCurrency(totalAdded)}) تلقائياً لهذا الشهر.`, false, true);
}
       function adjustLiquidityManually() {
    // --- ✅ تم تعديل هذه الدالة بالكامل لتعمل مع الحسابات المتعددة ---
    const accountId = d('adjust-safe-select') ? d('adjust-safe-select').value : '';
    const newBalance = parseInputNumber(d('adjust-amount-input'));
    const reason = d('adjust-reason-input') ? d('adjust-reason-input').value.trim() : '';
    const messageEl = d('adjust-liquidity-message');

    // 1. التحقق من المدخلات
    if (!accountId) {
        if (messageEl && typeof showMessage === 'function') showMessage(messageEl, "يرجى اختيار الحساب للتعديل.", true);
        else if (typeof showGlobalMessage === 'function') showGlobalMessage("يرجى اختيار الحساب للتعديل.", true);
        else alert("يرجى اختيار الحساب للتعديل.");
        return;
    }
    if (isNaN(newBalance) || newBalance < 0) {
        if (messageEl && typeof showMessage === 'function') showMessage(messageEl, "يرجى إدخال رصيد جديد صحيح (رقم موجب).", true);
        else if (typeof showGlobalMessage === 'function') showGlobalMessage("يرجى إدخال رصيد جديد صحيح (رقم موجب).", true);
        else alert("يرجى إدخال رصيد جديد صحيح (رقم موجب).");
        return;
    }
    if (!reason) {
        if (messageEl && typeof showMessage === 'function') showMessage(messageEl, "يرجى إدخال سبب التعديل.", true);
        else if (typeof showGlobalMessage === 'function') showGlobalMessage("يرجى إدخال سبب التعديل.", true);
        else alert("يرجى إدخال سبب التعديل.");
        return;
    }
    
    // 2. العثور على الحساب المحدد
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        if (messageEl && typeof showMessage === 'function') showMessage(messageEl, "خطأ: الحساب المحدد غير موجود.", true);
        else if (typeof showGlobalMessage === 'function') showGlobalMessage("خطأ: الحساب المحدد غير موجود.", true);
        else alert("خطأ: الحساب المحدد غير موجود.");
        return;
    }

    const oldBalance = Number(account.balance) || 0;
    const cleanNewBalance = typeof window.money === 'function' ? window.money(newBalance) : Number(newBalance);
    
    // 3. تأكيد من المستخدم
    if (confirm(`هل أنت متأكد من تغيير رصيد حساب "${account.name}" من ${formatCurrency(oldBalance)} إلى ${formatCurrency(cleanNewBalance)}؟`)) {
        saveStateToHistory(); // حفظ الحالة قبل التغيير للسماح بالتراجع
        const _adjLiqTx = typeof createStateTransaction === 'function' ? createStateTransaction('تعديل رصيد يدوي') : null;
        try {
            // 4. تنفيذ التعديل
            account.balance = cleanNewBalance;
            
            const adjustment = typeof window.money === 'function' ? window.money(cleanNewBalance - oldBalance) : (cleanNewBalance - oldBalance); // حساب قيمة التغيير
            const newTotalLiquidity = typeof window.money === 'function'
                ? window.money(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0))
                : accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

            // 5. تسجيل العملية في السجلات
            logOperation("تعديل رصيد يدوي", `تم تعديل رصيد حساب "${account.name}" إلى ${formatCurrency(cleanNewBalance)}. السبب: ${reason}.`);
            
            liquidityLog.push({
                id: generateId("liq-adj"),
                timestamp: new Date().toISOString(),
                type: "adjust",
                amount: adjustment,
                description: `تعديل يدوي لحساب "${account.name}" - ${reason}`,
                currentBalance: newTotalLiquidity,
                accountId: account.id
            });
            if (_adjLiqTx) _adjLiqTx.commit();
        } catch (e) {
            if (_adjLiqTx) _adjLiqTx.rollback();
            throw e;
        }

        // ☁️ حفظ سحابي فوري
        if (typeof saveSystemToCloud === 'function') {
            saveSystemToCloud().catch(e => console.error("Failed to save liquidity adjustment:", e));
        }

        // 6. تحديث الواجهة وتنظيف النموذج
        updateUI();
        if (messageEl && typeof showMessage === 'function') showMessage(messageEl, `تم تعديل رصيد حساب "${account.name}" بنجاح.`, false);
        else if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تعديل رصيد حساب "${account.name}" بنجاح.`, false);
        if (d('adjust-amount-input')) d('adjust-amount-input').value = '';
        if (d('adjust-reason-input')) d('adjust-reason-input').value = '';
    } else {
        if (messageEl && typeof showMessage === 'function') showMessage(messageEl, "تم إلغاء عملية التعديل.", false, true);
    }
}

// =================================================================
// 💸 سداد كامل بروفايل الدائن والسداد الجماعي للالتزامات
// =================================================================

function updateLinkedPurchasePayment(liability, paidForThis, accountId) {
    if (!liability) return;
    const paidNum = Number(paidForThis) || 0;
    if (paidNum <= 0) return;
    const invId = liability.purchaseInvoiceId;
    if (!invId) return;
    const pnd = (typeof pendingPurchases !== 'undefined' && Array.isArray(pendingPurchases)) ? pendingPurchases.find(p => p.id === invId) : null;

    // التزامات المصاريف الإضافية للشراء لا تخفض رصيد المورد أو المتبقي من البضاعة،
    // ولكننا نسجل الدفعة النقدية في pnd.payments حتى تُسترد تلقائياً إذا أُلغيت فاتورة الشراء المعلقة لاحقاً
    if (liability.source === 'purchase_extra_cost') {
        if (pnd) {
            if (accountId) {
                if (!Array.isArray(pnd.payments)) pnd.payments = [];
                pnd.payments.push({ accountId: accountId, amount: window.money(paidNum), date: new Date().toISOString(), source: 'extra_cost_liability_payment' });
            } else {
                pnd.hasNonCashOffset = true;
                pnd.offsetAmount = window.money((Number(pnd.offsetAmount) || 0) + paidNum);
            }
        }
        return;
    }

    if (pnd) {
        pnd.paidAmount = window.money((Number(pnd.paidAmount) || 0) + paidNum);
        pnd.remainingBalance = window.money(Math.max(0, (Number(pnd.remainingBalance) || 0) - paidNum));
        if (accountId) {
            if (!Array.isArray(pnd.payments)) pnd.payments = [];
            pnd.payments.push({ accountId: accountId, amount: window.money(paidNum), date: new Date().toISOString(), source: 'liability_payment' });
        } else {
            pnd.hasNonCashOffset = true;
            pnd.offsetAmount = window.money((Number(pnd.offsetAmount) || 0) + paidNum);
        }
    }
    const pinv = (typeof purchaseInvoices !== 'undefined' && Array.isArray(purchaseInvoices)) ? purchaseInvoices.find(p => p.id === invId) : null;
    if (pinv) {
        pinv.paidAmount = window.money((Number(pinv.paidAmount) || 0) + paidNum);
        pinv.remainingBalance = window.money(Math.max(0, (Number(pinv.remainingBalance) || 0) - paidNum));
    }
}
window.updateLinkedPurchasePayment = updateLinkedPurchasePayment;

window.openPayFullCreditorProfileModal = function(creditorName) {
    const activeLiabs = liabilities.filter(l => normalizeArabicText(l.name) === normalizeArabicText(creditorName) && Number(l.amount) > 0.001);
    if (!activeLiabs.length) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage('لا توجد التزامات نشطة لهذا الدائن.', true);
        else alert('لا توجد التزامات نشطة لهذا الدائن.');
        return;
    }
    const modal = document.getElementById('payFullCreditorProfileModal');
    if (!modal) return;
    const totalAmount = activeLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    document.getElementById('pfcp-creditor-name').textContent = creditorName;
    document.getElementById('pfcp-liabs-count').textContent = `${activeLiabs.length} بنود`;
    document.getElementById('pfcp-total-amount').textContent = formatCurrency(totalAmount);
    document.getElementById('pfcp-note').value = '';
    const accSelect = document.getElementById('pfcp-account-select');
    accSelect.innerHTML = accounts.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)} (${formatCurrency(a.balance)})</option>`).join('');
    const confirmBtn = document.getElementById('pfcp-confirm-btn');
    confirmBtn.dataset.creditorName = creditorName;
    modal.style.display = 'flex';
};

window.confirmPayFullCreditorProfile = async function() {
    const confirmBtn = document.getElementById('pfcp-confirm-btn');
    const creditorName = confirmBtn ? confirmBtn.dataset.creditorName : '';
    if (!creditorName) return;
    const activeLiabs = liabilities.filter(l => normalizeArabicText(l.name) === normalizeArabicText(creditorName) && Number(l.amount) > 0.001);
    if (!activeLiabs.length) return alert('لا توجد التزامات نشطة لهذا الدائن.');
    const accountId = document.getElementById('pfcp-account-select').value;
    const account = accounts.find(a => a.id === accountId);
    if (!account) return alert('يرجى اختيار حساب مالي صحيح');
    const totalAmount = (typeof window.money === 'function' ? window.money : Number)(activeLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0));
    if (totalAmount > (Number(account.balance) || 0) + 0.001) {
        return alert(`رصيد حساب "${account.name}" (${formatCurrency(account.balance)}) غير كافٍ لسداد ${formatCurrency(totalAmount)}`);
    }
    const isExpense = document.getElementById('pfcp-is-expense') ? document.getElementById('pfcp-is-expense').checked : true;
    const note = (document.getElementById('pfcp-note') && document.getElementById('pfcp-note').value.trim()) || '';
    if (!confirm(`هل أنت متأكد من سداد كامل التزامات "${creditorName}" بقيمة ${formatCurrency(totalAmount)} وخصمها من حساب "${account.name}"؟`)) return;

    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
        account.balance = (typeof window.money === 'function' ? window.money : Number)((Number(account.balance) || 0) - totalAmount);
        activeLiabs.forEach(l => {
            const paidForThis = Number(l.amount) || 0;
            if (!Array.isArray(l.paymentHistory)) l.paymentHistory = [];
            l.paymentHistory.push({
                id: generateId('pay'),
                amount: paidForThis,
                date: new Date().toISOString(),
                accountId: account.id,
                accountName: account.name,
                note: note || 'سداد كامل البروفايل'
            });
            l.amount = 0;
            l.status = 'paid';
            updateLinkedPurchasePayment(l, paidForThis, account.id);
        });
        let desc = `سداد كامل التزامات الدائن "${creditorName}" (${activeLiabs.length} بنود) من حساب "${account.name}"` + (note ? ` - ملاحظات: ${note}` : '');

        const newTotalLiquidity = (typeof window.money === 'function' ? window.money : Number)(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
        if (typeof liquidityLog !== 'undefined') {
            liquidityLog.push({
                id: generateId("liq"),
                timestamp: new Date().toISOString(),
                type: "remove",
                amount: totalAmount,
                description: desc,
                currentBalance: newTotalLiquidity,
                accountId: account.id,
                isExpense: isExpense,
                isLiabilityPayment: true
            });
        }

        logOperation("سداد كامل التزامات دائن", `تم سداد كامل التزامات "${creditorName}" بقيمة ${formatCurrency(totalAmount)} من "${account.name}".`);
        if (isExpense) {
            expenses = (typeof window.money === 'function' ? window.money : Number)((Number(expenses) || 0) + totalAmount);
            logOperation("تسجيل مصروف", `سداد كامل التزامات "${creditorName}" بقيمة ${formatCurrency(totalAmount)} من حساب "${account.name}".`);
        }

        if (_tx) _tx.commit();
        const m = document.getElementById('payFullCreditorProfileModal');
        if (m) m.style.display = 'none';
        updateUI();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم سداد كامل التزامات "${creditorName}" بنجاح (${formatCurrency(totalAmount)})`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch(err) {
        if (_tx) await _tx.rollback();
        console.error("فشل سداد كامل الالتزامات:", err);
        alert("حدث خطأ أثناء السداد: " + (err.message || ''));
    }
};

window.openBulkLiabilityModal = function() {
    const modal = document.getElementById('bulkLiabilityPaymentModal');
    if (!modal) return;

    const accSelect = document.getElementById('bulkLiabilityAccountSelect');
    accSelect.innerHTML = accounts.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)} (${formatCurrency(a.balance)})</option>`).join('');

    document.getElementById('bulkLiabilitySearchInput').value = '';
    renderBulkLiabilityList();
    modal.style.display = 'flex';
};

window.closeBulkLiabilityModal = function() {
    const modal = document.getElementById('bulkLiabilityPaymentModal');
    if (modal) modal.style.display = 'none';
};

window.renderBulkLiabilityList = function() {
    const container = document.getElementById('bulkLiabilityListContainer');
    if (!container) return;
    const searchVal = normalizeArabicText((document.getElementById('bulkLiabilitySearchInput') && document.getElementById('bulkLiabilitySearchInput').value) || '');

    container.innerHTML = '';

    const grouped = {};
    liabilities.forEach(l => {
        const amount = Number(l.amount) || 0;
        if (amount <= 0.001) return;
        const rawName = l.name || 'دائن بدون اسم';
        const normName = normalizeArabicText(rawName);
        if (!grouped[normName]) grouped[normName] = { name: rawName, liabilities: [], total: 0 };
        grouped[normName].liabilities.push(l);
        grouped[normName].total += amount;
    });

    let creditors = Object.values(grouped).sort((a, b) => b.total - a.total);
    if (searchVal) {
        creditors = creditors.filter(c => normalizeArabicText(c.name).includes(searchVal));
    }

    if (!creditors.length) {
        container.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">لا توجد التزامات تطابق بحثك.</p>';
        updateBulkLiabilitySelectionTotal();
        return;
    }

    creditors.forEach(c => {
        const div = document.createElement('div');
        div.style.cssText = 'border:1px solid #e5e7eb; border-radius:8px; margin-bottom:12px; overflow:hidden;';

        const header = document.createElement('div');
        header.style.cssText = 'background:#fdf2f8; padding:10px 14px; display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; border-bottom:1px solid #fbcfe8;';
        header.innerHTML = `
            <label style="cursor:pointer; display:flex; flex-wrap:wrap; align-items:center; gap:8px; font-weight:bold; color:#831843;">
                <input type="checkbox" class="bulk-creditor-select-all" data-creditor-name="${escapeHTML(c.name)}" onchange="toggleBulkLiabilitySelectAll(this.dataset.creditorName)" style="accent-color:#be185d;">
                <span>${escapeHTML(c.name)}</span>
                <span style="font-size:12px; color:#9d174d; background:#fce7f3; padding:2px 8px; border-radius:10px;">${formatCurrency(c.total)}</span>
            </label>
        `;

        const itemsBox = document.createElement('div');
        itemsBox.style.cssText = 'padding:8px 14px; background:white;';

        c.liabilities.forEach(l => {
            const itemRow = document.createElement('div');
            itemRow.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #fdf2f8; font-size:13px;';
            const orig = l.originalCreditorName ? `<span style="font-size:10px; color:#7c3aed; background:#ede9fe; padding:1px 5px; border-radius:4px; margin-right:4px;">منقول من ${escapeHTML(l.originalCreditorName)}</span>` : '';
            itemRow.innerHTML = `
                <label style="cursor:pointer; display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:#4b5563; flex:1 1 160px; min-width:0;">
                    <input type="checkbox" class="bulk-liability-item-cb" data-creditor-name="${escapeHTML(c.name)}" data-liability-id="${escapeHTML(l.id)}" data-amount="${l.amount}" onchange="updateBulkLiabilitySelectionTotal()" style="accent-color:#be185d;">
                    <span>${orig}${escapeHTML(l.category || 'التزام عام')}</span>
                </label>
                <span style="font-weight:bold; color:#be185d; font-family:monospace;">${formatCurrency(l.amount)}</span>
            `;
            itemsBox.appendChild(itemRow);
        });

        div.appendChild(header);
        div.appendChild(itemsBox);
        container.appendChild(div);
    });

    updateBulkLiabilitySelectionTotal();
};

window.toggleBulkLiabilitySelectAll = function(creditorName) {
    const isChecked = document.querySelector(`.bulk-creditor-select-all[data-creditor-name="${creditorName}"]`).checked;
    const cbs = document.querySelectorAll(`.bulk-liability-item-cb[data-creditor-name="${creditorName}"]`);
    cbs.forEach(cb => cb.checked = isChecked);
    updateBulkLiabilitySelectionTotal();
};

window.updateBulkLiabilitySelectionTotal = function() {
    const checkboxes = document.querySelectorAll('.bulk-liability-item-cb:checked');
    let total = 0;
    checkboxes.forEach(cb => total += (parseFloat(cb.dataset.amount) || 0));

    const bar = document.getElementById('bulkLiabilitySummaryBar');
    const totalEl = document.getElementById('bulkLiabilityTotalAmount');
    if (!bar || !totalEl) return;

    if (total > 0) {
        totalEl.textContent = formatCurrency(total);
        bar.style.display = 'block';
    } else {
        bar.style.display = 'none';
    }
};

window.confirmBulkLiabilityPayment = async function() {
    const checkboxes = document.querySelectorAll('.bulk-liability-item-cb:checked');
    if (!checkboxes.length) return alert('يرجى تحديد التزام واحد على الأقل للسداد');

    const accountId = document.getElementById('bulkLiabilityAccountSelect').value;
    const account = accounts.find(a => a.id === accountId);
    if (!account) return alert('يرجى اختيار حساب مالي صحيح');

    let totalAmount = 0;
    const paidIds = [];
    const involvedCreditors = new Set();

    // حساب الإجمالي دائماً من المصفوفة الحية liabilities وليس من dataset القديمة
    checkboxes.forEach(cb => {
        const lid = cb.dataset.liabilityId;
        const liveLiab = liabilities.find(it => it.id === lid && (Number(it.amount) || 0) > 0.001);
        if (liveLiab) {
            totalAmount += (Number(liveLiab.amount) || 0);
            paidIds.push(liveLiab.id);
            involvedCreditors.add(liveLiab.name || cb.dataset.creditorName || '');
        }
    });

    if (paidIds.length === 0 || totalAmount <= 0.001) {
        return alert('الالتزامات المحددة تم سدادها بالفعل أو لم تعد نشطة.');
    }

    totalAmount = (typeof window.money === 'function' ? window.money : Number)(totalAmount);
    if (totalAmount > (Number(account.balance) || 0) + 0.001) {
        return alert(`رصيد حساب "${account.name}" (${formatCurrency(account.balance)}) غير كافٍ لسداد ${formatCurrency(totalAmount)}`);
    }

    const isExpense = document.getElementById('bulkLiabilityIsExpense') ? document.getElementById('bulkLiabilityIsExpense').checked : true;
    const note = (document.getElementById('bulkLiabilityNote') && document.getElementById('bulkLiabilityNote').value.trim()) || '';
    const creditorsStr = Array.from(involvedCreditors).join('، ');

    if (!confirm(`تأكيد سداد التزامات بقيمة ${formatCurrency(totalAmount)} لـ (${involvedCreditors.size} دائنين) وخصمها من "${account.name}"؟`)) {
        return;
    }

    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        account.balance = (typeof window.money === 'function' ? window.money : Number)((Number(account.balance) || 0) - totalAmount);

        paidIds.forEach(id => {
            const l = liabilities.find(it => it.id === id);
            if (l && (Number(l.amount) || 0) > 0.001) {
                const paidForThis = Number(l.amount) || 0;
                if (!Array.isArray(l.paymentHistory)) l.paymentHistory = [];
                l.paymentHistory.push({
                    id: generateId('pay'),
                    amount: paidForThis,
                    date: new Date().toISOString(),
                    accountId: account.id,
                    accountName: account.name,
                    note: note || 'سداد جماعي'
                });
                l.amount = 0;
                l.status = 'paid';
                updateLinkedPurchasePayment(l, paidForThis, account.id);
            }
        });

        let desc = `سداد جماعي لعدد ${paidIds.length} بند التزام للدائنين: (${creditorsStr}) من حساب "${account.name}"`;
        if (note) desc += ` - ملاحظات: ${note}`;

        const newTotalLiquidity = (typeof window.money === 'function' ? window.money : Number)(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
        if (typeof liquidityLog !== 'undefined') {
            liquidityLog.push({
                id: generateId("liq"),
                timestamp: new Date().toISOString(),
                type: "remove",
                amount: totalAmount,
                description: desc,
                currentBalance: newTotalLiquidity,
                accountId: account.id,
                isExpense: isExpense,
                isLiabilityPayment: true
            });
        }

        logOperation("سداد جماعي للالتزامات", `تم سداد ${paidIds.length} بند التزام بقيمة ${formatCurrency(totalAmount)} من حساب "${account.name}".`);
        if (isExpense) {
            expenses = (typeof window.money === 'function' ? window.money : Number)((Number(expenses) || 0) + totalAmount);
            logOperation("تسجيل مصروف", `سداد جماعي للالتزامات (${creditorsStr}) بقيمة ${formatCurrency(totalAmount)} من حساب "${account.name}".`);
        }

        if (_tx) _tx.commit();
        closeBulkLiabilityModal();
        updateUI();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم سداد الالتزامات بنجاح وخصم ${formatCurrency(totalAmount)}`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch(err) {
        if (_tx) await _tx.rollback();
        console.error("فشل السداد الجماعي للالتزامات:", err);
        alert("حدث خطأ أثناء السداد: " + (err.message || ''));
    }
};
