// finance-core-fc.js - Financial Center Module
            // ===================================================================================
// START: FINANCIAL CENTER (FC) LOGIC
// ===================================================================================

// Helper to get all data for a specific month (YYYY-MM) from localStorage
 async function fc_get_data_for_month(month) {
    const datesInMonth = getMonthStartDateEndDate(month);
    let monthlyExpenses = new Map();
    let monthlyProductPurchases = new Map();

    // جلب قائمة المصاريف والالتزامات التي تم توزيعها مسبقاً في هذا الشهر لمنع إعادة التوزيع اللانهائي
    const distributedIdsKey = 'fc_distributed_expenses_v1_' + month;
    let distributedExpenseIds = new Set();
    try {
        const saved = JSON.parse(localStorage.getItem(distributedIdsKey) || '[]');
        if (Array.isArray(saved)) distributedExpenseIds = new Set(saved);
    } catch (e) { console.warn('[core-fc.js] تم تجاهل خطأ:', e); }

    // أولاً: أضف كل الالتزامات الشهرية والديون المعالجة (التي لم تكتمل ولم تُوزع في هذا الشهر)
    if (monthlyLiabilities && monthlyLiabilities.length > 0) {
        monthlyLiabilities.forEach(liability => {
            if (liability.isAmortizedDebt) {
                if (liability.periodsProcessed < liability.totalPeriods) {
                    monthlyExpenses.set(liability.id, { name: `${liability.name} [شهر ${liability.periodsProcessed + 1}/${liability.totalPeriods}]`, amount: liability.amount });
                }
            } else {
                if (distributedExpenseIds.has(liability.id)) return;
                monthlyExpenses.set(liability.id, { name: liability.name, amount: liability.amount });
            }
        });
    }

    // ثانياً: أضف المصاريف اليومية المسجلة في السجل (غير الموزعة مسبقاً)
    for (const dateStr of datesInMonth) {
        const dayData = fetchData(lsPrefix + dateStr, null);
        if (dayData && dayData.log) {
            dayData.log.forEach(logEntry => {
                if (logEntry.type === "تسجيل مصروف") {
                    const expenseMatch = logEntry.details.match(/(?:بقيمة|مبلغ)\s*([\d\.,]+)(?:\s*(?:جنيه|ج\.م|EGP))?/);
                    if (expenseMatch && expenseMatch[1]) {
                        const amount = parseFloat(expenseMatch[1].replace(/,/g, ''));
                        const name = `مصروف يومي: ${logEntry.details.split('.')[0]}`;
                        if (!isNaN(amount) && amount > 0) {
                            const expenseId = `daily-${logEntry.id || logEntry.timestamp}`;
                            if (distributedExpenseIds.has(expenseId)) return;
                            monthlyExpenses.set(expenseId, { name: name, amount: (monthlyExpenses.get(expenseId)?.amount || 0) + amount });
                        }
                    }
                }
            });
        }
    }
    
    // تحويل الـ Map إلى مصفوفة للعرض
    const expensesArray = Array.from(monthlyExpenses.entries());
    return { expenses: expensesArray };
}


// Populate the UI lists for the selected month with REAL data
 async function fc_populate_lists(month) {
    if (!month || !fc_expenses_list || !fc_products_list) return;
    
    const { expenses } = await fc_get_data_for_month(month);
    
    fc_expenses_list.innerHTML = expenses.length > 0
        ? expenses.map(([id, exp]) => `<label class="flex flex-wrap items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer"><input type="checkbox" data-id="${window.escapeHTML(id)}" data-amount="${window.escapeHTML(exp.amount)}" class="fc-expense-checkbox ml-3" checked>${window.escapeHTML(exp.name)} <span class="mr-auto font-mono text-gray-600">${formatCurrency(exp.amount)}</span></label>`).join('')
        : '<p class="text-sm text-gray-500">لا توجد مصاريف مسجلة لهذا الشهر.</p>';

    const productsInStock = products.filter(p => p.quantity > 0);

    fc_products_list.innerHTML = productsInStock.length > 0
        ? productsInStock.map(prod => {
            const totalValue = (prod.quantity || 0) * (prod.costPrice || 0);
            return `<label class="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer border"><input type="checkbox" class="fc-product-checkbox ml-3" data-name="${window.escapeHTML(prod.name)}" data-id="${window.escapeHTML(prod.id)}" data-qty="${prod.quantity}" data-value="${totalValue}" data-cost="${prod.costPrice}" checked>${window.escapeHTML(prod.name)} <span class="mr-auto font-mono text-gray-600 text-xs sm:text-sm">(الكمية الحالية: ${prod.quantity}، التكلفة: ${formatCurrency(prod.costPrice)})</span></label>`;
        }).join('')
        : '<p class="text-sm text-gray-500">لا توجد منتجات في المخزون حالياً.</p>';
    
    fc_add_event_listeners_to_lists();
    fc_update_ui();
}


// Populate the debt treatment tab with REAL data
function fc_populate_debt_treatment() {
    if (!fc_debt_select) return;
    const validDebts = debtors.filter(d => (Number(d.amount) || 0) > 0.001);
    fc_debt_select.innerHTML = '<option value="">-- اختر الدين للمعالجة --</option>' 
        + validDebts.map(d => {
            const safeName = typeof escapeHTML === 'function' ? escapeHTML(d.name) : (window.escapeHTML ? window.escapeHTML(d.name) : d.name);
            const safeReason = typeof escapeHTML === 'function' ? escapeHTML(d.reason) : (window.escapeHTML ? window.escapeHTML(d.reason) : d.reason);
            const safeId = typeof escapeHTML === 'function' ? escapeHTML(d.id) : (window.escapeHTML ? window.escapeHTML(d.id) : d.id);
            return `<option value="${safeId}" data-amount="${Number(d.amount)||0}">${safeName} - ${safeReason} (${formatCurrency(d.amount)})</option>`;
        }).join('');
}

// =====================================================================
// ★★★ START: NEW FIREBASE-ENABLED MONTH SELECT FUNCTION ★★★
// =====================================================================
async function fc_populate_month_select() {
    if (!fc_month_select || !window.currentUser) return;
    
    // إظهار رسالة تحميل مؤقتة للمستخدم
    const tempOption = fc_month_select.querySelector('option');
    if(tempOption) tempOption.textContent = "جاري جلب الشهور...";

    const userId = window.currentUser.uid;
    const daysColRef = window.collection(window.db, "users", userId, "days");
    const months = new Set();
    
    // إضافة الشهر الحالي دائمًا كخيار متاح
    months.add(getTodayDateString().substring(0, 7)); 

    try {
        // جلب كل المستندات (الأيام) من قاعدة البيانات
        const querySnapshot = await window.getDocs(daysColRef);
        querySnapshot.forEach((doc) => {
            // ID المستند هو التاريخ نفسه 'YYYY-MM-DD'
            const monthStr = doc.id.substring(0, 7); // استخراج 'YYYY-MM'
            months.add(monthStr);
        });

        const sortedMonths = Array.from(months).sort().reverse();
        
        // بناء القائمة المنسدلة بالشهور التي تم العثور عليها
        fc_month_select.innerHTML = sortedMonths.map(month => {
            const [year, m] = month.split('-');
            const date = new Date(year, m - 1);
            const monthName = date.toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
            return `<option value="${month}">${monthName}</option>`;
        }).join('');

        // تحميل بيانات أحدث شهر تلقائيًا
        if (sortedMonths.length > 0) {
            await fc_populate_lists(sortedMonths[0]); 
        }
    } catch (error) {
        console.error("Error fetching available months from Firestore:", error);
        fc_month_select.innerHTML = `<option value="">فشل جلب الشهور</option>`;
    }
}
// =====================================================================
// ★★★ END: NEW FIREBASE-ENABLED MONTH SELECT FUNCTION ★★★
// =====================================================================

 function fc_update_ui() {
    if (!d('fc-auto-cost-mode-radio')) return; // Check if the elements are rendered
    fc_toggle_cost_mode();
    fc_calculate_and_display_totals();
    fc_toggle_manual_distribution();

    // هذا هو السطر المهم الذي تم تعديله
    // سيقوم دائماً بتشغيل المحاكاة، وهي التي ستقرر إظهار النافذة أو إخفائها
    fc_simulate_distribution(); 
}

function fc_add_event_listeners_to_lists() {
    document.querySelectorAll('.fc-expense-checkbox, .fc-product-checkbox, input[name="fc-distribution-method"], input[name="fc-cost-mode"], #fc-manual-cost-input').forEach(el => el.addEventListener('change', fc_update_ui));
    if(fc_manual_cost_input) fc_manual_cost_input.addEventListener('input', fc_update_ui);
    const manualRadio = d('fc-distribution-manual-radio');
    if(manualRadio) manualRadio.addEventListener('change', fc_populate_manual_inputs);
    if(fc_products_list) fc_products_list.addEventListener('change', () => { if(d('fc-distribution-manual-radio').checked) fc_populate_manual_inputs(); });
}

function fc_toggle_cost_mode() {
    if(!fc_expenses_wrapper || !fc_manual_cost_wrapper) return;
    const isManual = d('fc-manual-cost-mode-radio').checked;
    fc_expenses_wrapper.classList.toggle('fc-disabled-section', isManual);
    fc_manual_cost_wrapper.classList.toggle('hidden', !isManual);
}

function fc_calculate_and_display_totals() {
    if (!fc_total_expenses_display) return;
    let totalExpenses = 0;
    if (d('fc-manual-cost-mode-radio').checked) {
        totalExpenses = parseFloat(fc_manual_cost_input.value) || 0;
    } else {
        fc_expenses_list.querySelectorAll('input:checked').forEach(e => totalExpenses += parseFloat(e.dataset.amount));
    }
    fc_total_expenses_display.textContent = formatCurrency(totalExpenses);
}

function fc_toggle_manual_distribution() {
    if(!fc_manual_container) return;
    const isManual = d('fc-distribution-manual-radio').checked;
    fc_manual_container.classList.toggle('hidden', !isManual);
    if (isManual) fc_populate_manual_inputs();
}

function fc_populate_manual_inputs() {
    if (!fc_manual_list || !fc_products_list) return;
    const selectedProducts = Array.from(fc_products_list.querySelectorAll('input:checked'));
    
    fc_manual_list.innerHTML = selectedProducts.map(prod => {
        const safeId = typeof escapeHTML === 'function' ? escapeHTML(prod.dataset.id || '') : prod.dataset.id;
        const safeName = typeof escapeHTML === 'function' ? escapeHTML(prod.dataset.name || '') : prod.dataset.name;
        return `
        <div class="flex flex-wrap items-center justify-between gap-2 p-2">
            <label for="fc-perc-${safeId}">${safeName}</label>
            <div class="flex items-center">
                <input type="number" 
                       id="fc-perc-${safeId}" 
                       data-product-id="${safeId}" 
                       data-product-name="${safeName}" 
                       class="fc-manual-dist-input fc-form-input" 
                       min="0" max="100" value="0">
                <span class="mr-2 font-semibold">%</span>
            </div>
        </div>`;
    }).join('') || '<p class="text-sm text-center text-gray-500">اختر المنتجات أولاً.</p>';
    
    document.querySelectorAll('.fc-manual-dist-input').forEach(input => input.addEventListener('input', fc_validate_and_simulate));
    fc_validate_percentages();
}
function fc_validate_percentages() {
    if (!fc_percentage_total) return false;
    let currentTotal = 0;
    document.querySelectorAll('.fc-manual-dist-input').forEach(input => currentTotal += parseFloat(input.value) || 0);
    fc_percentage_total.textContent = `${currentTotal}%`;
    const feedbackEl = d('fc-percentage-total-feedback');
    if (feedbackEl) {
        feedbackEl.className = 'mt-4 p-2 text-center rounded-md'; // Reset
        if (Math.round(currentTotal) === 100) {
            feedbackEl.classList.add('bg-green-100', 'text-green-800');
        } else {
            feedbackEl.classList.add('bg-red-100', 'text-red-800');
        }
    }
    return Math.round(currentTotal) === 100;
}

function fc_validate_and_simulate() {
    fc_validate_percentages();
    fc_simulate_distribution();
}

function fc_get_simulation_results() {
    let totalExpenses = 0;
    if (d('fc-manual-cost-mode-radio').checked) { 
        totalExpenses = parseFloat(fc_manual_cost_input.value) || 0; 
    } else { 
        fc_expenses_list.querySelectorAll('input:checked').forEach(e => totalExpenses += parseFloat(e.dataset.amount)); 
    }
    
    const selectedProductsEls = Array.from(fc_products_list.querySelectorAll('input:checked'));
    if (selectedProductsEls.length === 0 || totalExpenses <= 0) {
        return null;
    }

    const distributionMethod = document.querySelector('input[name="fc-distribution-method"]:checked').value;
    let productUpdates = [];
    
    // �� 1. التوزيع حسب الكمية
    if (distributionMethod === 'quantity') {
        let totalQty = 0; selectedProductsEls.forEach(p => totalQty += parseInt(p.dataset.qty));
        if (totalQty === 0) return { error: "مجموع كميات المنتجات صفر." };
        const costPerItem = totalExpenses / totalQty;
        selectedProductsEls.forEach(p => {
            productUpdates.push({ id: p.dataset.id, name: p.dataset.name, addedCost: costPerItem });
        });
    } 
    // �� 2. التوزيع حسب القيمة
    else if (distributionMethod === 'value') {
        let totalValue = 0; selectedProductsEls.forEach(p => totalValue += parseFloat(p.dataset.value));
        if (totalValue === 0) return { error: "مجموع قيمة المنتجات صفر." };
        selectedProductsEls.forEach(p => {
            const qty = parseInt(p.dataset.qty);
            const val = parseFloat(p.dataset.value);
            const costShare = (val / totalValue) * totalExpenses;
            const addedPerItem = qty > 0 ? costShare / qty : 0;
            productUpdates.push({ id: p.dataset.id, name: p.dataset.name, addedCost: addedPerItem });
        });
    } 
    // �� 3. التوزيع اليدوي
    else if (distributionMethod === 'manual') {
        if (!fc_validate_percentages()) return { error: "مجموع النسب المئوية يجب أن يكون 100%." };
        selectedProductsEls.forEach(p => {
            // التعديل هنا: البحث عن الـ input بالـ ID وليس بالاسم
            const percentageInput = d(`fc-perc-${p.dataset.id}`);
            const percentage = parseFloat(percentageInput?.value) || 0;
            const qty = parseInt(p.dataset.qty);
            const costShare = (percentage / 100) * totalExpenses;
            const addedPerItem = qty > 0 ? costShare / qty : 0;
            productUpdates.push({ id: p.dataset.id, name: p.dataset.name, addedCost: addedPerItem });
        });
    }
    return { productUpdates };
}
function fc_simulate_distribution() {
    if (!fc_preview_results || !fc_preview_container) return;

    const results = fc_get_simulation_results();
    let resultsHTML = '';

    if (!results) {
        fc_preview_container.classList.remove('visible');
        return;
    }
    if (results.error) {
        resultsHTML = `<p class="text-center text-red-700 font-semibold">${results.error}</p>`;
    } else {
        resultsHTML += `<p class="font-semibold pb-2 mb-2 border-b">نتائج المحاكاة (التحميل الإداري للتسعير — لا يُغيّر قيمة رأس المال المخزني):</p>`;
        results.productUpdates.forEach(update => {
            const originalProduct = products.find(p => p.id === update.id) || products.find(p => p.name === update.name);
            if (originalProduct) {
                const originalCost = Number(originalProduct.costPrice) || 0;
                const existingOverhead = Number(originalProduct.allocatedOverhead) || 0;
                const newOverhead = Math.round((existingOverhead + update.addedCost) * 1e6) / 1e6;
                const safeName = typeof escapeHTML === 'function' ? escapeHTML(update.name) : (window.escapeHTML ? window.escapeHTML(update.name) : update.name);
                resultsHTML += `<div class="p-2 border-l-4 border-gray-200"><strong>${safeName}:</strong><br><span class="text-sm">تكلفة الشراء: <span class="font-mono text-gray-500">${formatCurrency(originalCost)}</span> | تحميل إداري: <span class="font-mono text-orange-500">+${formatCurrency(update.addedCost)}</span> (إجمالي التحميل: ${formatCurrency(newOverhead)}) &larr; <span class="font-bold text-green-700 font-mono">التكلفة المحمّلة للتسعير: ${formatCurrency(originalCost + newOverhead)}</span></span></div>`;
            }
        });
    }
    
    fc_preview_results.innerHTML = resultsHTML;
    fc_preview_container.classList.add('visible');
}

function fc_execute_cost_distribution() {
    if (!confirm("هل أنت متأكد من تنفيذ هذا التوزيع؟ سيتم تسجيل التحميل الإداري على المنتجات المحددة كمؤشر للتسعير دون تضخيم قيمة رأس المال المحاسبي.")) return;

    const results = fc_get_simulation_results();
    if (!results || results.error) {
        showGlobalMessage(results ? results.error : "لا يمكن التنفيذ، يرجى مراجعة المدخلات.", true);
        return;
    }

    if (typeof saveStateToHistory === 'function') saveStateToHistory();

    // تسجيل المصاريف المحملة في allocatedOverhead فقط لحماية رأس المال وتكلفة الشراء الأصلية من التضخيم الوهمي
    let logDetails = [];
    results.productUpdates.forEach(update => {
        const added = Number(update.addedCost) || 0;
        if (added <= 0) return;
        let productIndex = products.findIndex(p => p.id === update.id);
        if (productIndex === -1) {
            productIndex = products.findIndex(p => p.name === update.name);
        }
        if (productIndex > -1) {
            const prod = products[productIndex];
            const oldOverhead = Number(prod.allocatedOverhead) || 0;
            const newOverhead = Math.round((oldOverhead + added) * 1e6) / 1e6;
            prod.allocatedOverhead = newOverhead;
            const loadedCost = (Number(prod.costPrice) || 0) + newOverhead;
            logDetails.push(`"${prod.name}" (تحميل إداري +${formatCurrency(added)} -> تكلفة محمّلة ${formatCurrency(loadedCost)})`);
        }
    });

    // تحديث عداد الديون المعالجة وتسجيل المصاريف اليومية الموزعة فقط في الوضع التلقائي (وليس الوضع اليدوي)
    const isManualCostMode = Boolean(d('fc-manual-cost-mode-radio') && d('fc-manual-cost-mode-radio').checked);
    if (!isManualCostMode && d('fc-expenses-to-distribute-list')) {
        const currentMonth = fc_month_select ? fc_month_select.value : getTodayDateString().substring(0, 7);
        const distributedIdsKey = 'fc_distributed_expenses_v1_' + currentMonth;
        let distributedIds = [];
        try {
            const parsed = JSON.parse(localStorage.getItem(distributedIdsKey) || '[]');
            if (Array.isArray(parsed)) distributedIds = parsed;
        } catch (e) { console.warn('[core-fc.js] تم تجاهل خطأ:', e); }
        const distSet = new Set(distributedIds);

        const distributedExpenseCheckboxes = Array.from(d('fc-expenses-to-distribute-list').querySelectorAll('input:checked'));
        distributedExpenseCheckboxes.forEach(checkbox => {
            const expId = checkbox.dataset.id;
            if (!expId) return;
            const liabilityToUpdate = monthlyLiabilities.find(l => l.id === expId && l.isAmortizedDebt);
            if (liabilityToUpdate && (Number(liabilityToUpdate.periodsProcessed) || 0) < (Number(liabilityToUpdate.totalPeriods) || 1)) {
                liabilityToUpdate.periodsProcessed = (Number(liabilityToUpdate.periodsProcessed) || 0) + 1;
                logOperation("تحديث معالجة دين", `تم توزيع القسط ${liabilityToUpdate.periodsProcessed} من ${liabilityToUpdate.totalPeriods} للدين "${liabilityToUpdate.name}".`);
            } else {
                distSet.add(expId);
            }
        });
        try { localStorage.setItem(distributedIdsKey, JSON.stringify(Array.from(distSet))); } catch (e) { console.warn('[core-fc.js] تم تجاهل خطأ:', e); }
    }

    logOperation("توزيع تكاليف (تحميل إداري)", `تم تسجيل التحميل الإداري للمنتجات: ${logDetails.join(', ')}.`);
    showGlobalMessage("تم تسجيل التحميل الإداري للتسعير بنجاح دون تضخيم رأس المال.", false);
    updateUI();
    if (fc_month_select && fc_month_select.value) {
        fc_populate_lists(fc_month_select.value);
    }
    if (typeof saveSystemToCloud === 'function') {
        saveSystemToCloud().catch(e => console.error("Cloud save failed after FC cost distribution:", e));
    }
}

async function fc_execute_debt_treatment() {
    if (!fc_debt_select) return;
    const selectedOption = fc_debt_select.options[fc_debt_select.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        showGlobalMessage("يرجى اختيار دين للمعالجة أولاً.", true);
        return;
    }
    
    const debtId = selectedOption.value;
    const debtIndex = debtors.findIndex(d => d.id === debtId);
    
    if (debtIndex === -1) {
        showGlobalMessage("لم يتم العثور على الدين المحدد.", true);
        return;
    }

    const debtInfo = debtors[debtIndex];
    const debtAmount = typeof window.money === 'function' ? window.money(Number(debtInfo.amount) || 0) : (Number(debtInfo.amount) || 0);
    if (debtAmount <= 0.001) {
        showGlobalMessage("قيمة هذا الدين صفر بالفعل ولا يحتاج للمعالجة.", true);
        return;
    }

    const periodValue = Math.max(1, parseInt(d('fc-distribution-period-value').value, 10) || 1);
    const costPerMonth = typeof window.money === 'function' ? window.money(debtAmount / periodValue) : (debtAmount / periodValue);

    if (!confirm(`هل أنت متأكد من تحويل دين "${debtInfo.name}" بقيمة ${formatCurrency(debtAmount)} إلى التزام شهري؟\nسيتم حذف الدين الحالي وإنشاء التزام شهري بقيمة ${formatCurrency(costPerMonth)} لمدة ${periodValue} شهور.`)) {
        return;
    }

    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        // 1. Remove the debt from debtors list and record formal loss memo
        debtors.splice(debtIndex, 1);
        if (typeof recordedLosses !== 'undefined') {
            recordedLosses = (typeof window.money === 'function' ? window.money : Number)((Number(recordedLosses) || 0) + (Number(debtAmount) || 0));
        }

        // 2. Add a new "smart" monthly liability with tracking properties
        const newMonthlyLiability = {
            id: generateId('amortized-debt') || generateId("MLIA"),
            name: `معالجة دين (${debtInfo.name})`,
            amount: costPerMonth,
            isAmortizedDebt: true,       // علامة لتمييز هذا النوع من الالتزام
            totalPeriods: periodValue,       // إجمالي عدد الشهور
            periodsProcessed: 0,             // عدد الشهور التي تم توزيعها (يبدأ بصفر)
        };
        monthlyLiabilities.push(newMonthlyLiability);
        
        logOperation("معالجة دين متعثر", `تم تحويل دين "${debtInfo.name}" (${formatCurrency(debtAmount)}) إلى التزام شهري ثابت بقيمة ${formatCurrency(costPerMonth)} لمدة ${periodValue} شهور.`);
        
        if (_tx) _tx.commit();
        showGlobalMessage("تم تحويل الدين إلى التزام شهري بنجاح.", false);
        updateUI();
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error("Cloud save error:", e));
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("فشل معالجة الدين المتعثر:", err);
        showGlobalMessage("فشل معالجة الدين المتعثر؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
    }
}
