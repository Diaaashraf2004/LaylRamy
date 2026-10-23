// finance-core-accounts.js - Accounts and Treasury Operations
function renderAccounts() {
    const safesGrid = document.getElementById('safes-overview-grid');
    const accountsList = document.getElementById('accounts-list');
    
    // --- ✅ المصفوفة الشاملة لجميع قوائم الحسابات والخزائن في النظام ---
    const allSafeSelects = [
        // قسم الخزينة والمركز المالي
        '#income-safe-select', '#expense-safe-select', 
        '#transfer-from-select', '#transfer-to-select', 
        '#adjust-safe-select', '#log-filter-safe',
        '#return-from-account-select',
        // قسم إضافة بضاعة
        '#product-purchase-account',
        // قسم فاتورة الشراء
        '#pi_payment_account',
        // قسم البيع السريع
        '#sell-account-select',
        // قسم الفواتير المفصلة
        '#inv_payment_account',
        // قسم الديون (لك)
        '#debt-advance-account', '#debt-payment-account',
        '#bulkDebtAccountSelect', '#partial-debt-payment-account',
        '#delete-debt-account-select', '#decreaseAccountSelect',
        // قسم الالتزامات (عليك)
        '#liability-payment-account', '#liability-cash-account',
        '#partial-liability-payment-account', '#bulkLiabilityAccountSelect', '#pfcp-account-select',
        // قسم المصروفات
        '#expense-payment-account', '#expense-refund-account',
        // قسم المشتريات المعلقة والوحدات
        '#pending-purchase-payment-account', '#cancel-pending-account-select',
        '#usm_account_select', '#dep_account',
        // قسم المرتجعات والاسترداد
        '#refund_account_select', '#pr-refund-account', '#sr-account-select'
    ];
    
    // --- باقي الدالة يبقى كما هو ---
    if (!safesGrid || !accountsList) return;

    safesGrid.innerHTML = '';
    accountsList.innerHTML = '';
    allSafeSelects.forEach(selector => {
        const select = document.querySelector(selector);
        if (select) select.innerHTML = '<option value="">-- اختر الحساب --</option>';
    });

    let totalBalance = 0;

  

    accounts.forEach(acc => {
        totalBalance += acc.balance;

        const safeCard = document.createElement('div');
        safeCard.className = 'safe-card';
        safeCard.innerHTML = `<h4><i class="fas fa-cash-register"></i> ${escapeHTML(acc.name)}</h4><div class="safe-card-balance">${formatCurrency(acc.balance)}</div>`;
        safesGrid.appendChild(safeCard);

        const listItem = document.createElement('li');
        listItem.className = 'account-item';
        listItem.innerHTML = `<span class="account-item-name">${escapeHTML(acc.name)}</span><div class="account-item-actions"><button class="edit-btn" data-id="${escapeHTML(acc.id)}" style="background-color: #f59e0b;">تعديل</button><button class="delete-btn" data-id="${escapeHTML(acc.id)}" style="background-color: #ef4444;">حذف</button></div>`;
        accountsList.appendChild(listItem);

        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = acc.name;
        allSafeSelects.forEach(selector => {
            document.querySelector(selector)?.appendChild(option.cloneNode(true));
        });
    });
    
    const totalCard = document.createElement('div');
    totalCard.className = 'safe-card total-card';
    totalCard.innerHTML = `<h4><i class="fas fa-globe"></i> إجمالي السيولة</h4><div class="safe-card-balance">${formatCurrency(totalBalance)}</div>`;
    safesGrid.appendChild(totalCard);
    
    const logFilterSafe = document.querySelector('#log-filter-safe');
    if (logFilterSafe) {
        let firstOpt = null;
        if (typeof logFilterSafe.querySelector === 'function') {
            firstOpt = logFilterSafe.querySelector('option[value=""]');
        } else if (Array.isArray(logFilterSafe.children)) {
            firstOpt = logFilterSafe.children.find(c => c && c.value === "");
        }
        if (firstOpt) {
            firstOpt.value = 'all';
            firstOpt.textContent = 'كل الحسابات';
        } else {
            const allSafesOption = document.createElement('option');
            allSafesOption.value = 'all';
            allSafesOption.textContent = 'كل الحسابات';
            if (typeof logFilterSafe.prepend === 'function') {
                logFilterSafe.prepend(allSafesOption);
            } else if (typeof logFilterSafe.appendChild === 'function') {
                logFilterSafe.appendChild(allSafesOption);
            }
        }
        if (!logFilterSafe.value) logFilterSafe.value = 'all';
        if (!logFilterSafe._hasFilterListener && typeof logFilterSafe.addEventListener === 'function') {
            logFilterSafe.addEventListener('change', () => {
                if (typeof updateLiquidityLogDisplay === 'function') updateLiquidityLogDisplay();
            });
            logFilterSafe._hasFilterListener = true;
        }
    }
}

/**
 * Handles switching between tabs in the liquidity section.
 * @param {string} tabId - The ID of the tab content to show.
 */
function showTab(tabId) {
    // هذه الدالة الآن أكثر أمانًا وتتحقق من وجود العناصر قبل التعامل معها
    ['daily-actions', 'adjustments', 'manage-accounts'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    ['tab-daily', 'tab-adjust', 'tab-manage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    const contentEl = document.getElementById(tabId);
    if (contentEl) contentEl.classList.remove('hidden');

    // --- هذا هو الجزء الذي تم إصلاحه ---
    let buttonId;
    if (tabId === 'adjustments') {
        // حالة خاصة للتبويب الذي يسبب المشكلة
        buttonId = 'tab-adjust';
    } else {
        // المنطق القديم يعمل بشكل صحيح مع باقي التبويبات
        buttonId = `tab-${tabId.split('-')[0]}`;
    }

    const buttonEl = document.getElementById(buttonId);
    if (buttonEl) buttonEl.classList.add('active');
}

/**
 * Resets the "Add/Edit Account" form to its default state.
 */
window.resetAccountForm = function resetAccountForm() {
    const accountForm = document.getElementById('account-form');
    const accountIdInput = document.getElementById('account-id-input');
    const accountFormTitle = document.getElementById('account-form-title');
    const saveAccountBtn = document.getElementById('save-account-btn');
    const startingBalanceGroup = document.getElementById('starting-balance-group');
    const cancelEditBtn = document.getElementById('cancel-edit-account-btn');

    accountForm.reset();
    accountIdInput.value = '';
    accountFormTitle.textContent = 'إضافة حساب جديد';
    saveAccountBtn.textContent = 'حفظ الحساب';
    startingBalanceGroup.classList.remove('hidden');
    cancelEditBtn.classList.add('hidden');
}
// =======================================================
// START: NEW LOGIC FOR FINANCIAL TRANSACTIONS (STEP 3)
// =======================================================

/**
 * Handles the logic for adding income to a specified account.
 * @returns {boolean} True on success, false on failure.
 */
function handleIncomeAddition() {
    const accountId = d('income-safe-select').value;
    const category = d('income-category-select').value;
    const amount = parseInputNumber(d('income-amount-input'));
    const details = d('income-details-input') ? d('income-details-input').value.trim() : '';
    const descDetails = details ? ` - ${details}` : '';

    if (!accountId || isNaN(amount) || amount <= 0) {
        alert("يرجى اختيار حساب وإدخال مبلغ إيراد صحيح.");
        return false;
    }

    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        alert("خطأ: الحساب المحدد غير موجود.");
        return false;
    }
    
    saveStateToHistory();
    account.balance = window.money(account.balance + amount);
    logOperation("إضافة إيراد", `إضافة ${formatCurrency(amount)} إلى حساب "${account.name}" تحت فئة "${category}"${descDetails}.`);
    
    const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    liquidityLog.push({
        id: 'liq-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: "add",
        amount: amount,
        description: `إضافة إيراد (${category})${descDetails} لحساب "${account.name}"`,
        currentBalance: newTotalLiquidity,
        accountId: accountId
    });
    
    if (d('income-details-input')) d('income-details-input').value = '';
    if (typeof saveSystemToCloud === 'function') {
        saveSystemToCloud().catch(e => console.error("Cloud save failed after income:", e));
    }
    
    return true;
}

function handleExpenseAddition() {
    const accountId = d('expense-safe-select').value;
    const category = d('expense-category-select').value;
    const amount = parseInputNumber(d('expense-amount-input'));
    const details = d('expense-details-input') ? d('expense-details-input').value.trim() : '';
    const descDetails = details ? ' - ' + details : '';

    // 1. التحقق من المدخلات
    if (!accountId || isNaN(amount) || amount <= 0) {
        alert("يرجى اختيار حساب وإدخال مبلغ مصروف صحيح.");
        return false;
    }

    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        alert("خطأ: الحساب المحدد غير موجود.");
        return false;
    }

    // 2. التحقق من الرصيد
    if (amount > account.balance) {
        alert(`لا يوجد رصيد كافٍ في حساب "${account.name}". الرصيد المتاح: ${formatCurrency(account.balance)}.`);
        return false;
    }
    
    saveStateToHistory();
    
    // 3. التنفيذ
    
    // أ) خصم من الخزنة
    account.balance = window.money(account.balance - amount);

    // ب) زيادة إجمالي المصروفات العام
    expenses = window.money(expenses + amount);

    // ج) تسجيل الحركة في سجل السيولة (يظهر في حركة الخزينة)
    const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    liquidityLog.push({
        id: generateId("liq"),
        timestamp: new Date().toISOString(),
        type: "remove", // نوع remove عشان يظهر باللون الأحمر كسحب
        amount: amount,
        description: `صرف مصروف (${category})${descDetails} من حساب "${account.name}"`,
        currentBalance: newTotalLiquidity,
        accountId: accountId,
        isExpense: true
    });

    // د) [تعديل هام] توحيد صيغة السجل لتظهر في تقرير المصروفات
    // تم تغيير النوع إلى "تسجيل مصروف" وإضافة كلمة "بقيمة" ليتمكن التقرير من قراءتها
    logOperation("تسجيل مصروف", `بقيمة ${formatCurrency(amount)} - صرف من حساب "${account.name}" (فئة: ${category})${descDetails}.`);
    
    if (d('expense-details-input')) d('expense-details-input').value = '';
    if (typeof saveSystemToCloud === 'function') {
        saveSystemToCloud().catch(e => console.error("Cloud save failed after expense:", e));
    }
    
    return true;
}

/**
 * Handles the logic for transferring money between two accounts.
 * @returns {boolean} True on success, false on failure.
 */
function handleTransfer() {
    const fromId = d('transfer-from-select').value;
    const toId = d('transfer-to-select').value;
    const amount = parseInputNumber(d('transfer-amount-input'));
    const details = d('transfer-details-input') ? d('transfer-details-input').value.trim() : '';
    const descDetails = details ? ` (السبب: ${details})` : '';

    if (!fromId || !toId || isNaN(amount) || amount <= 0) {
        alert("يرجى اختيار الحسابات وإدخال مبلغ صحيح للتحويل.");
        return false;
    }

    if (fromId === toId) {
        alert("لا يمكن التحويل من وإلى نفس الحساب.");
        return false;
    }

    const fromAccount = accounts.find(acc => acc.id === fromId);
    const toAccount = accounts.find(acc => acc.id === toId);

    if (!fromAccount || !toAccount) {
        alert("خطأ: أحد الحسابات المحددة غير موجود.");
        return false;
    }

    if (amount > fromAccount.balance) {
        alert(`لا يوجد رصيد كافٍ في حساب "${fromAccount.name}" لإتمام التحويل.`);
        return false;
    }
    
    saveStateToHistory();
    fromAccount.balance = window.money(fromAccount.balance - amount);
    toAccount.balance = window.money(toAccount.balance + amount);
    logOperation("تحويل بين الحسابات", `تم تحويل ${formatCurrency(amount)} من "${fromAccount.name}" إلى "${toAccount.name}"${descDetails}.`);
    
    liquidityLog.push({
        id: 'liq-out-' + Date.now(),
        date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        type: "remove",
        amount: amount,
        description: `تحويل صادر من "${fromAccount.name}" إلى "${toAccount.name}"${descDetails}`,
        reason: `تحويل صادر إلى "${toAccount.name}"${descDetails}`,
        currentBalance: fromAccount.balance,
        accountId: fromAccount.id,
        accountName: fromAccount.name,
        account: fromAccount.name
    });
    liquidityLog.push({
        id: 'liq-in-' + (Date.now() + 1),
        date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        type: "add",
        amount: amount,
        description: `تحويل وارد إلى "${toAccount.name}" من "${fromAccount.name}"${descDetails}`,
        reason: `تحويل وارد من "${fromAccount.name}"${descDetails}`,
        currentBalance: toAccount.balance,
        accountId: toAccount.id,
        accountName: toAccount.name,
        account: toAccount.name
    });
    if (d('transfer-details-input')) d('transfer-details-input').value = '';
    if (typeof saveSystemToCloud === 'function') saveSystemToCloud();
    return true;
}

function handleBalanceAdjustment() {
    const accountId = d('adjust-safe-select').value;
    const newBalance = parseInputNumber(d('adjust-amount-input'));
    const reason = d('adjust-reason-input').value.trim();

    if (!accountId || isNaN(newBalance) || newBalance < 0) {
        alert("يرجى اختيار حساب وإدخال رصيد جديد صحيح.");
        return false;
    }
    if (!reason) {
        alert("يرجى إدخال سبب التعديل.");
        return false;
    }
    
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        alert("خطأ: الحساب المحدد غير موجود.");
        return false;
    }

    if (confirm(`هل أنت متأكد من تغيير رصيد حساب "${account.name}" إلى ${formatCurrency(newBalance)}؟`)) {
        saveStateToHistory();
        const difference = newBalance - account.balance;
        account.balance = newBalance;
        logOperation("تعديل رصيد يدوي", `تم تعديل رصيد حساب "${account.name}" إلى ${formatCurrency(newBalance)}. السبب: ${reason}.`);
        
        const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        liquidityLog.push({
            id: 'liq-adj-' + Date.now(),
            timestamp: new Date().toISOString(),
            type: difference >= 0 ? "add" : "remove",
            amount: Math.abs(difference),
            description: `تعديل رصيد (السبب: ${reason}) لحساب "${account.name}"`,
            currentBalance: newTotalLiquidity,
            accountId: account.id
        });
        return true;
    }
    return false;
}

window.openDepositModal = function(pendingId) {
        // التأكد من وجود البيانات
        if (typeof pendingSales === 'undefined' || typeof accounts === 'undefined') {
            console.error("Critical Error: Data arrays not found.");
            return;
        }

        const sale = pendingSales.find(s => s.id === pendingId);
        if (!sale) {
            alert("لم يتم العثور على البيعة.");
            return;
        }

        // --- ��️ التصحيح الذاتي: إنشاء النافذة في HTML لو مش موجودة ---
        let modal = document.getElementById('depositModal');
        if (!modal) {
            console.log("جاري إنشاء نافذة العربون تلقائياً...");
            modal = document.createElement('div');
            modal.id = 'depositModal';
            modal.className = 'modal'; 
            // ستايل احتياطي لضمان الظهور حتى لو CSS فيه مشكلة
            modal.style.cssText = "display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5);";
            
            modal.innerHTML = `
                <div class="modal-content" style="background-color:#fff; margin:15% auto; padding:20px; border-radius:8px; width:90%; max-width:400px; position:relative; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <span onclick="document.getElementById('depositModal').style.display='none'" style="position:absolute; left:15px; top:10px; cursor:pointer; font-size:24px; font-weight:bold; color:#666;">&times;</span>
                    
                    <h3 style="margin-top:0; color:#1f2937; border-bottom:1px solid #eee; padding-bottom:10px; font-family:sans-serif;">استلام دفعة / عربون</h3>
                    
                    <div style="margin-top:15px;">
                        <div style="background:#f9fafb; padding:10px; border-radius:6px; margin-bottom:15px; font-size:13px;">
                            <p style="margin:5px 0;"><strong>العميل:</strong> <span id="dep_customer_name">...</span></p>
                            <p style="margin:5px 0;"><strong>إجمالي الفاتورة:</strong> <span id="dep_total_amount" style="color:#2563eb;">0.00</span></p>
                            <p style="margin:5px 0;"><strong>تم دفع سابقاً:</strong> <span id="dep_already_paid" style="color:#16a34a;">0.00</span></p>
                        </div>
                        
                        <div class="form-group" style="margin-bottom:15px;">
                            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px;">المبلغ المستلم الآن:</label>
                            <input type="number" id="dep_amount" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; font-size:16px; font-weight:bold;" placeholder="0.00">
                        </div>
                        
                        <div class="form-group" style="margin-bottom:20px;">
                            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px;">إيداع في الخزنة:</label>
                            <select id="dep_account" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; background:#fff;"></select>
                        </div>
                        
                        <input type="hidden" id="dep_pending_id">
                        
                        <button onclick="window.confirmDeposit()" style="width:100%; background-color:#7c3aed; color:white; padding:12px; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px;">تأكيد وحفظ العربون</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        // -------------------------------------------------------

        // تعبئة البيانات (الآن نحن واثقين 100% أن العناصر موجودة)
        document.getElementById('dep_pending_id').value = pendingId;
        document.getElementById('dep_customer_name').textContent = sale.customerName || 'عميل نقدي';
        document.getElementById('dep_total_amount').textContent = formatCurrency(sale.totalSellPrice);
        document.getElementById('dep_already_paid').textContent = formatCurrency(sale.depositPaid || 0);
        
        // اقتراح المبلغ المتبقي
        const remaining = (sale.totalSellPrice || 0) - (sale.depositPaid || 0);
        document.getElementById('dep_amount').value = remaining > 0 ? remaining : '';

        // تعبئة الخزائن
        const select = document.getElementById('dep_account');
        if (select) {
            select.innerHTML = '';
            accounts.forEach(acc => {
                const op = document.createElement('option');
                op.value = acc.id;
                op.textContent = `${acc.name} (${formatCurrency(acc.balance)})`;
                select.appendChild(op);
            });
        }

        // إظهار النافذة
        modal.style.display = 'block';
    };

window.confirmDeposit = function() {
    const pendingEl = document.getElementById('dep_pending_id');
    const amountEl = document.getElementById('dep_amount');
    const accountEl = document.getElementById('dep_account');

    if (!pendingEl || !amountEl || !accountEl) {
        alert("خطأ داخلي: عناصر النافذة غير موجودة.");
        return;
    }

    const pendingId = pendingEl.value;
    const amount = parseFloat(amountEl.value);
    const accountId = accountEl.value;
    
    if (!amount || amount <= 0) { alert("أدخل مبلغاً صحيحاً."); return; }
    if (!accountId) { alert("اختر الخزنة."); return; }

    const saleIndex = pendingSales.findIndex(s => s.id === pendingId);
    const account = accounts.find(a => a.id === accountId);

    if (saleIndex === -1 || !account) return;

    const targetSale = pendingSales[saleIndex];
    const saleTotal = Number(targetSale.totalSellPrice || targetSale.grandTotal || 0);
    const currentPaid = Number(targetSale.depositPaid || 0);
    const maxAllowed = Math.max(0, saleTotal - currentPaid);
    if (amount > maxAllowed) {
        const fmt = typeof formatCurrency === 'function' ? formatCurrency : (val => val + ' ج.م');
        alert(`المبلغ المدخل (${fmt(amount)}) يتجاوز المتبقي من قيمة البيعة (${fmt(maxAllowed)})!`);
        return;
    }

    saveStateToHistory(); // حفظ نقطة استعادة قبل التغيير

    // 1. زيادة رصيد الخزنة المحددة
    account.balance = (Number(account.balance) || 0) + amount;

    // 2. تطوير: تسجيل سجل العربون داخل البيعة (لكي نعرف من أين نسحب عند الإلغاء)
    if (!pendingSales[saleIndex].depositHistory) {
        pendingSales[saleIndex].depositHistory = [];
    }
    pendingSales[saleIndex].depositHistory.push({
        accountId: account.id,
        accountName: account.name,
        amount: amount
    });

    const oldPaid = Number(pendingSales[saleIndex].depositPaid) || 0;
    pendingSales[saleIndex].depositPaid = oldPaid + amount;

    // 3. تسجيل في السجل المالي
    const totalLiquidity = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    liquidityLog.push({
        id: generateId("liq-dep"),
        timestamp: new Date().toISOString(),
        type: "add",
        amount: amount,
        description: `عربون من: ${pendingSales[saleIndex].customerName} إلى "${account.name}"`,
        currentBalance: totalLiquidity,
        accountId: account.id
    });

    // 4. تسجيل في سجل العمليات وسجل المبيعات
    if (typeof logOperation === 'function') {
        const custName = pendingSales[saleIndex].customerName || 'عميل نقدي';
        logOperation("عربون مبيعات", `استلام عربون بقيمة ${formatCurrency(amount)} للعميل "${custName}" في حساب "${account.name}".`);
    }

    // إغلاق وتحديث
    document.getElementById('depositModal').style.display = 'none';
    updateUI(); 
    
    // إشعار النجاح
    const msgBox = document.getElementById('global-message');
    if(msgBox) {
        showGlobalMessage(`تم استلام عربون ${formatCurrency(amount)} بنجاح في ${account.name}.`, false);
    } else {
        alert(`تم استلام ${formatCurrency(amount)} بنجاح.`);
    }
};

window.getLiveAccounts = function() { return (typeof accounts !== 'undefined') ? accounts : []; };
