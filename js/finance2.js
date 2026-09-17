/**
});
    }, 1500);
window.confirmPendingOrder = async function(id) {
    if(!confirm('تأكيد تسليم البضاعة للعميل وإنهاء الطلب؟')) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === id);
    if(orderIndex === -1) return;
    const o = window.pendingOrders[orderIndex];
    
    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');
    
    const accSelEl = document.getElementById('ex_acc_sel');
    if(!accSelEl) return;

    triggerUndoSave();

    if (o.paymentStatus === 'pay_now_safe' || o.paymentStatus === 'pay_now_debt') {
        // Payment was already processed at the time of order creation
        addLogSafe({ timestamp: new Date().toISOString(), type: 'تسليم بضاعة مؤجلة', details: 'إتمام تسليم بضاعة مؤجلة [' + cleanName + '] (تم الدفع مسبقاً)', amount: 0 });
    } else {
        // Regular pay_later: receive money now
        const accId = (o && o.accId ? o.accId : accSelEl.value);
        const liveAccounts = getAccounts();
        const acc = liveAccounts.find(a => a.id === accId);
        if(acc) acc.balance = (Number(acc.balance)||0) + o.diffAmount;
        addLogSafe({ timestamp: new Date().toISOString(), type: 'إنهاء عملية معلقة', details: 'إنهاء وتأكيد استبدال للعميل [' + cleanName + ']', amount: o.diffAmount });
    }

    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
};

function revertInventoryEffect(o) {
    const liveProducts = getProducts();
    
    // دالة داخلية ذكية لإضافة الكمية للمخزن (وإنشاء المنتج المؤقت لو لم يكن موجوداً)
        const addBack = (name, cost, price) => { 
            if(!name) return; 
            const cleanName = String(name).trim().toLowerCase();
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
            
            if(p) {
                p.quantity = (Number(p.quantity)||0) + 1; 
            } else {
                // إنشاء المنتج المؤقت الذي لم يكن موجوداً في المخزن ليعود إليه بشكل صحيح
                const newP = { 
                    id: "TEMP-" + Date.now() + Math.floor(Math.random()*100), 
                    name: String(name).trim(), 
                    category: "عام", 
                    quantity: 1, 
                    costPrice: Number(cost) || 0, 
                    price: Number(price) || 0 
                };
                liveProducts.push(newP);
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP);
            }
        };

        // 1. نرجع الأجهزة اللي كانت طالعة للعميل للمخزن (مع تمرير التكلفة والسعر)
        addBack(o.nMainName, o.nMainCost, o.nMainPrice); 
        if(o.nAccs) o.nAccs.forEach(a => addBack(a.name, a.cost, a.price));

        // 2. رد التكلفة لرأس المال (لأن الأجهزة الجديدة عادت للمحل)
        

        // 3. سحب قيمة الأجهزة المرتجعة للعميل من حساب المحل (لأنه هياخد فلوسه ويمشي)
        let payoutAmount = Number(o.rMainPrice) || 0;
        if(o.rAccs) o.rAccs.forEach(a => payoutAmount += (Number(a.price) || 0));

        const liveAccounts = getAccounts();
        const acc = liveAccounts.find(a => a.id === accId);
        if(acc) acc.balance = (Number(acc.balance)||0) - payoutAmount;
        
        addLogSafe({ timestamp: new Date().toISOString(), type: "تحويل لاسترجاع", details: `العميل [${cleanName}] صرف مبلغ أجهزته المرتجعة`, amount: -payoutAmount });
    }
    
    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
    closeExModals();
}

window.confirmPendingOrder = async function(id) {
    if(!confirm("تأكيد التسليم للعميل وتحصيل الفلوس بالخزنة؟")) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === id);
    if(orderIndex === -1) return;
    const o = window.pendingOrders[orderIndex];
    
    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');
    // دالة داخلية ذكية لإضافة الكمية للمخزن (وإنشاء المنتج المؤقت لو لم يكن موجوداً)
    const addBack = (name, cost, price) => { 
        if(!name) return; 
        const cleanName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
        
        if(p) {
            // لو المنتج موجود في المخزن، رجع الكمية
            p.quantity = (Number(p.quantity)||0) + 1; 
        } else {
            // لو المنتج "مؤقت"، أنشئه في المخزن فوراً عشان الكمية والتكلفة تضبط
            const newP = { 
                id: "TEMP-" + Date.now() + Math.floor(Math.random()*1000), 
                name: String(name).trim(), 
                category: "عام", 
                quantity: 1, 
                costPrice: Number(cost) || 0, 
                price: Number(price) || 0 
            };
            liveProducts.push(newP);
            if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP);
        }
    };

    // دالة داخلية لسحب الكمية من المخزن بأمان تام
    const takeOut = (name) => { 
        if(!name) return; 
        const cleanName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
        if(p) p.quantity = (Number(p.quantity)||0) - 1; 
    };
    
    // إرجاع الجديد للمخزن (مع تمرير التكلفة والسعر لضمان حفظهم في حال كان المنتج مؤقتاً)
    addBack(o.nMainName, o.nMainCost, o.nMainPrice);
    if (o.nAccs) o.nAccs.forEach(a => addBack(a.name, a.cost, a.price)); 

    // سحب المرتجع من المخزن (لأنه سيعود للعميل)
    takeOut(o.rMainName);
    if (o.rAccs) o.rAccs.forEach(a => takeOut(a.name));
}
async function finalizeSave() {
    if (window.saveCurrentStateByDate) {
        await window.saveCurrentStateByDate(window.currentLoadedDate);
        renderLocalPendingOrders();
        if (typeof window.refreshMainUI === 'function') {
            window.refreshMainUI();
        }
    } else {
        console.warn("تنبيه: دالة الحفظ السحابي غير متصلة.");
    }
}
// Auto-select current month for expenses report on load
document.addEventListener('DOMContentLoaded', () => {
    const m = document.getElementById('exp-report-month-year');
    if (m && !m.value) {
        const t = new Date();
        m.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0');
    }
});


// =========================================
// المصروفات - منقول لزيادة السرعة
// =========================================
window.generateExpensesReportExternal = async function(deps) {
    const { showMessage, formatCurrency, getTodayDateString, currentLoadedDate, operationLog, liquidityLog, formatDateForDisplay } = deps;
    const monthInput = document.getElementById('exp-report-month-year');
    const messageEl = document.getElementById('exp-report-message');
    const tableBody = document.getElementById('expenses-report-table-body');
    const summaryContainer = document.getElementById('exp-report-summary-container');
    const summaryTotalEl = document.getElementById('exp-report-summary-total');

    if (!monthInput || !messageEl || !tableBody || !summaryTotalEl || !summaryContainer) return;

    const yearMonth = monthInput.value;
    if (!yearMonth) {
        showMessage(messageEl, "يرجى اختيار الشهر والسنة.", true);
        return;
    }
    
    // Auto-update UI on state changes by hooking into updateUI
    if (!window._expenseHookAdded) {
        const origUpdateUI = window.updateUI;
        window.updateUI = function() {
            if (origUpdateUI) origUpdateUI();
            if (!document.getElementById('expenses-report-section').classList.contains('hidden')) {
                generateExpensesReport();
            }
        };
        window._expenseHookAdded = true;
    }

    if (window.cachedCloudExpenses && window.cachedCloudExpenses.month === yearMonth && !window._forceRefreshExpenses) {
        // Use cache
        processExpensesData(window.cachedCloudExpenses.data, yearMonth);
        return;
    }
    window._forceRefreshExpenses = false;

    showMessage(messageEl, `جاري جلب وتحليل المصروفات...`, false, true);
    summaryContainer.classList.add('hidden');
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-4"><i class="fas fa-spinner fa-spin"></i> جاري معالجة البيانات...</td></tr>`;

    setTimeout(async () => {
        try {
            const userId = window.currentUser ? window.currentUser.uid : null;
            if(!userId) return;
            
            const daysRef = window.collection(window.db, "users", userId, "days");
            const q = window.query(
                daysRef,
                window.where(firebase.firestore.FieldPath.documentId(), ">=", yearMonth),
                window.where(firebase.firestore.FieldPath.documentId(), "<=", yearMonth + "\uf8ff")
            );
            const daysSnapshot = await window.getDocs(q);

            let allCloudDays = [];

            daysSnapshot.forEach(doc => {
                const dateStr = doc.id; // YYYY-MM-DD
                if (dateStr.startsWith(yearMonth)) {
                    allCloudDays.push({ date: dateStr, ...doc.data() });
                }
            });

            window.cachedCloudExpenses = {
                month: yearMonth,
                data: allCloudDays
            };

            processExpensesData(allCloudDays, yearMonth);

        } catch (error) {
            console.error("Error fetching expenses:", error);
            showMessage(messageEl, "حدث خطأ أثناء جلب البيانات السحابية.", true);
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">فشل تحميل البيانات.</td></tr>';
        }
    }, 100);

    function processExpensesData(cloudDays, targetMonth) {
        const extractAmountFromText = (text) => {
            if (!text || typeof text !== 'string') return 0;
            let cleanText = text.replace('جنيه', '').replace('EGP', '');
            const regex = /(?:بقيمة|سحب|خصم|مبلغ|بدفع|دفع|تسديد)\s*([\d,]+(?:\.\d+)?)/;
            const match = cleanText.match(regex);
            if (match && match[1]) return parseFloat(match[1].replace(/,/g, ''));
            const startMatch = cleanText.match(/^([\d,]+(?:\.\d+)?)/);
            if (startMatch && startMatch[1]) return parseFloat(startMatch[1].replace(/,/g, ''));
            return 0;
        };

        const todayStr = (typeof getTodayDateString === 'function') ? getTodayDateString() : (typeof currentLoadedDate !== 'undefined' && currentLoadedDate ? currentLoadedDate : new Date().toISOString().split('T')[0]);
        
        // Merge cloud days with local day if they match the month
        let mergedDays = [...cloudDays];
        if (todayStr.startsWith(targetMonth)) {
            const cloudDayIndex = mergedDays.findIndex(d => d.date === todayStr);
            const localDayData = {
                date: todayStr,
                log: typeof operationLog !== 'undefined' ? operationLog : [],
                liquidityLog: typeof liquidityLog !== 'undefined' ? liquidityLog : []
            };
            if (cloudDayIndex !== -1) {
                mergedDays[cloudDayIndex] = localDayData;
            } else {
                mergedDays.push(localDayData);
            }
        }

        let allExpenses = [];

        mergedDays.forEach(dayData => {
            if (!dayData.date.startsWith(targetMonth)) return;
            const entryDate = dayData.date;

            // 1. Extract from legacy operationLog (data.log)
            if (dayData.log && Array.isArray(dayData.log)) {
                dayData.log.forEach(logEntry => {
                    const type = logEntry.type || "";
                    const details = logEntry.details || "";

                    const isExpense = 
                        type.includes("مصروف") || 
                        type.includes("سحب") || 
                        details.includes("مصروف") || 
                        details.includes("سحب") ||
                        details.includes("فاتورة شراء");

                    const isRefund = type.includes("add") || details.includes("استرداد") || details.includes("إلغاء") || type.includes("ترحيل");

                    if (isExpense && !isRefund) {
                        const amount = extractAmountFromText(details);
                        if (amount > 0) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: type,
                                details: details,
                                amount: amount,
                                source: dayData.date === todayStr ? 'local' : 'cloud'
                            });
                        }
                    }
                });
            }

            // 2. Extract from modern liquidityLog with isExpense flag
            if (dayData.liquidityLog && Array.isArray(dayData.liquidityLog)) {
                dayData.liquidityLog.forEach(logEntry => {
                    if (logEntry.isExpense === true) {
                        const amount = Number(logEntry.amount) || extractAmountFromText(logEntry.description) || 0;
                        if (amount > 0) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: 'تسديد التزام',
                                details: logEntry.description || '',
                                amount: amount,
                                source: dayData.date === todayStr ? 'local' : 'cloud',
                                isVerified: true
                            });
                        }
                    }
                });
            }
        });

        // Remove exact duplicates
        let uniqueExpenses = [];
        let seenKeys = new Set();
        allExpenses.forEach(exp => {
            const key = `${exp.amount}_${exp.details.trim()}_${exp.date}`;
            if (!seenKeys.has(key)) {
                uniqueExpenses.push(exp);
                seenKeys.add(key);
            }
        });

        uniqueExpenses.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        let totalAmount = 0;
        tableBody.innerHTML = '';
        
        if (uniqueExpenses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-4">لا توجد مصروفات أو مسحوبات مسجلة في هذا الشهر.</td></tr>`;
        } else {
            uniqueExpenses.forEach(exp => {
                totalAmount += exp.amount;
                let timeStr = "";
                try {
                    timeStr = new Date(exp.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
                } catch(e){ console.warn('Could not parse pending-sale date:', e); }

                const tr = document.createElement('tr');
                tr.className = 'expense-row border-b hover:bg-gray-50 transition-colors';
                
                tr.innerHTML = `
                    <td class="p-3 text-sm">
                        <div class="font-bold text-gray-700">${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(exp.date) : exp.date}</div>
                        <div class="text-xs text-gray-400">${timeStr}</div>
                    </td>
                    <td class="p-3 text-sm font-semibold text-blue-800">
                        ${exp.type}
                        ${exp.isVerified ? `<br><span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200 mt-1 inline-block">مصروف معتمد</span>` : ''}
                    </td>
                    <td class="p-3 text-sm text-gray-600">${exp.details}</td>
                    <td class="p-3 text-sm text-center font-mono font-bold text-red-600">-${formatCurrency(exp.amount)}</td>
                `;
                tableBody.appendChild(tr);
            });
        }
        
        summaryTotalEl.textContent = formatCurrency(totalAmount);
        summaryContainer.classList.remove('hidden');
        if(messageEl) showMessage(messageEl, `تم عرض ${uniqueExpenses.length} عملية مصروف لشهر ${targetMonth}.`, false);
    }
}






// --- Injection: Capital Adjustments Report ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const fcTabs = document.getElementById('fc-main-tabs');
        if (fcTabs && !document.getElementById('btn-fc-tab-adjustments')) {
            const btn = document.createElement('button');
            btn.id = 'btn-fc-tab-adjustments';
            btn.className = 'fc-tab-button flex items-center gap-2 text-base font-semibold py-3 px-4 border-b-2 border-transparent hover:border-gray-300 hover:text-gray-600 focus:outline-none';
            btn.setAttribute('data-target', 'fc-tab-adjustments');
            btn.innerHTML = '<i class="fas fa-shield-alt text-red-600"></i><span>التدقيق الشامل (تسويات رأس المال)</span>';
            fcTabs.appendChild(btn);
            
            const sectionsContainer = fcTabs.parentElement;
            const newSec = document.createElement('div');
            newSec.id = 'fc-tab-adjustments';
            newSec.className = 'fc-tab-content hidden';
            newSec.innerHTML = `
                <div class="bg-white p-6 rounded-2xl border border-gray-200 card-shadow mt-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold text-xl">
                            <i class="fas fa-search-dollar"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">سجل التدقيق المالي الشامل</h2>
                            <p class="text-sm text-gray-500 mt-1">يصطاد هذا التقرير <strong>أية تفصيلة</strong> تؤثر على الحسابات (تعديلات صامتة، نواقص، خصومات، ديون جديدة، فواتير ملغاة، تسويات) ولا تظهر في تقارير البيع أو المصروفات العادية.</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                        <div class="flex items-center gap-2">
                            <label class="text-sm font-bold text-slate-700"><i class="far fa-calendar-alt text-blue-500"></i> اختر الشهر:</label>
                            <input type="month" id="adjustments-month" class="border border-slate-300 rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <button id="btn-load-adjustments" class="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center gap-2 hover:scale-105">
                            <i class="fas fa-bolt text-yellow-400"></i> فحص السجلات الآن
                        </button>
                    </div>
                    
                    <!-- Dashboard Cards -->
                    <div id="adj-dashboard" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 hidden">
                        <div class="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                            <div class="text-orange-600 text-sm font-bold mb-1"><i class="fas fa-tags"></i> إجمالي العمليات المرصودة</div>
                            <div id="adj-count" class="text-2xl font-black text-orange-800">0</div>
                        </div>
                        <div class="bg-red-50 border border-red-200 p-4 rounded-xl">
                            <div class="text-red-600 text-sm font-bold mb-1"><i class="fas fa-exclamation-circle"></i> تنبيهات هامة (خصم/خسارة/إلغاء)</div>
                            <div id="adj-alerts" class="text-2xl font-black text-red-800">0</div>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                            <div class="text-blue-600 text-sm font-bold mb-1"><i class="fas fa-info-circle"></i> تعديلات إدارية وقيود</div>
                            <div id="adj-info" class="text-2xl font-black text-blue-800">0</div>
                        </div>
                    </div>
                    
                    <div id="adjustments-loading" class="hidden text-center text-gray-500 py-10">
                        <i class="fas fa-radar fa-spin text-4xl mb-4 text-blue-600"></i>
                        <p class="font-bold text-lg">جاري الفحص العميق للسجلات السحابية...</p>
                        <p class="text-sm text-gray-400 mt-2">نبحث عن الإبرة في كومة القش</p>
                    </div>
                    
                    <div id="adjustments-results" class="hidden">
                        <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                            <table class="w-full text-right border-collapse bg-white">
                                <thead>
                                    <tr class="bg-slate-800 text-white">
                                        <th class="p-3 border-b font-bold w-1/4 rounded-tr-xl">التاريخ والوقت</th>
                                        <th class="p-3 border-b font-bold w-1/4">نوع الحركة المكتشفة</th>
                                        <th class="p-3 border-b font-bold w-1/2 rounded-tl-xl">التفاصيل والأرقام</th>
                                    </tr>
                                </thead>
                                <tbody id="adjustments-table-body" class="divide-y divide-slate-100"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            sectionsContainer.appendChild(newSec);
            
            // Re-bind tabs
            const allTabs = document.querySelectorAll('.fc-tab-button');
            const allContents = document.querySelectorAll('.fc-tab-content');
            allTabs.forEach(t => {
                t.addEventListener('click', () => {
                    allTabs.forEach(tb => tb.classList.remove('active', 'border-blue-600', 'text-blue-600'));
                    allContents.forEach(c => c.classList.add('hidden'));
                    
                    t.classList.add('active', 'border-blue-600', 'text-blue-600');
                    const targetId = t.getAttribute('data-target');
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) targetEl.classList.remove('hidden');
                });
            });
            
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            document.getElementById('adjustments-month').value = `${y}-${m}`;
            
            document.getElementById('btn-load-adjustments').addEventListener('click', async () => {
    const month = document.getElementById('adjustments-month').value;
    if (!month) return;
    
    document.getElementById('adjustments-loading').classList.remove('hidden');
    document.getElementById('adjustments-results').classList.add('hidden');
    document.getElementById('adj-dashboard').classList.add('hidden');
    document.getElementById('monthly-net-dashboard').classList.add('hidden');
    const tbody = document.getElementById('adjustments-table-body');
    tbody.innerHTML = '';
    
    try {
        const userId = window.currentUser ? window.currentUser.uid : null;
        if (!userId) { alert('يجب تسجيل الدخول أولا'); return; }
        
        const daysRef = window.collection(window.db, "users", userId, "days");
        const q = window.query(
            daysRef,
            window.where(firebase.firestore.FieldPath.documentId(), ">=", month),
            window.where(firebase.firestore.FieldPath.documentId(), "<=", month + "\uf8ff")
        );
        const snap = await window.getDocs(q);
        
        let daysData = [];
        
        
        snap.forEach(doc => {
            const data = doc.data();
            
            // Calculate exact capital for this day
            let liquidity = data.accounts ? data.accounts.reduce((s, a) => s + (Number(a.balance)||0), 0) : (Number(data.liquidity)||0);
            let inv = data.products ? data.products.reduce((s, p) => s + ((Number(p.costPrice)||0)*(Number(p.quantity)||0)), 0) : 0;
            let consig = data.pendingSales ? data.pendingSales.reduce((s, sale) => s + (sale.items && sale.totalCost !== undefined ? (Number(sale.totalCost)||0) : ((Number(sale.mainProduct?.costPrice)||0)*(Number(sale.mainProduct?.quantity)||1)) + (sale.additionalItems||[]).reduce((s,i)=>s+((Number(i.costPrice)||0)*(Number(i.quantity)||0)),0)), 0) : 0;
            let debts = data.debtors ? data.debtors.reduce((s, d) => s + (Number(d.amount)||0), 0) : 0;
            let pendingPurchasesVal = data.pendingPurchases ? data.pendingPurchases.reduce((s, p) => s + (Number(p.amountPaid)||0), 0) : 0;
            let pendingReturnsVal = data.pendingReturns ? data.pendingReturns.reduce((s, r) => {
                let cost = 0;
                if (r.costOfGoods !== undefined) {
                    cost = Number(r.costOfGoods);
                } else if (r.items && r.items.length > 0) {
                    cost = r.items.reduce((itemSum, item) => itemSum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)), 0);
                } else {
                    cost = Number(r.returnedAmount) || 0;
                }
                return s + cost;
            }, 0) : 0;
            let liab = data.liabilities ? data.liabilities.filter(l => l.id !== 'hidden-recorded-losses' && !l.isHidden).reduce((s, l) => s + (Number(l.amount)||0), 0) : 0;
            let monthlyLiab = data.monthlyLiabilities ? data.monthlyLiabilities.filter(l => !l.isHidden).reduce((s, l) => s + (Number(l.amount)||0), 0) : 0;
            let pendingDeposits = data.pendingOrders ? data.pendingOrders.reduce((s, o) => s + (Number(o.amountPaid)||0), 0) : 0;
            
            const capital = liquidity + inv + consig + debts + pendingPurchasesVal + pendingReturnsVal - (liab + monthlyLiab) - pendingDeposits;
            
            daysData.push({
                date: doc.id,
                capital: capital,
                profit: Number(data.profit) || 0,
                expenses: Number(data.expenses) || 0,
                losses: Number(data.recordedLosses) || 0
            });
            
            });
// Generate adjustments table...
                    
                    let adjustments = [];
                    
                    const routineTypes = [
                        "بيع بضاعة", "بيع مؤقت", "إنشاء فاتورة", "تعديل بيع مؤقت", "فاتورة مؤقتة", 
                        "شراء بضاعة", "شراء بضاعة جديدة", "فاتورة شراء", "شراء معلق", "استلام بضاعة", "شراء بضاعة (منفصلة الاسم)",
                        "تسجيل مصروف", "تقليل مصروف", "إضافة إيراد", "إضافة سيولة", "سحب سيولة", "تحويل بين الحسابات",
                        "تسديد التزام مجمع", "تسديد جزء من التزام", "استلام سداد مجمع", "استلام سداد جزئي", 
                        "سداد ديون محددة", "سداد ديون جماعي", "استلام وتسديد شامل",
                        "مرتجع فوري", "مرتجع قيد الاستلام", "مرتجع من مؤقت", "مرتجع من فاتورة", "تأكيد استلام مرتجع", "عكس أرباح مرتجع",
                        "استرداد نقدي لمرتجع مشتريات"
                    ];
                    
                    const processEntry = (entry, docId) => {
                        const type = entry.type || '';
                        const details = entry.details || '';
                        const typeTrim = type.trim();
                        
                        // 1. الخسائر المباشرة للمخزون
                        const isProductLoss = typeTrim === 'تسوية مخزن (هالك/خسارة)' || typeTrim === 'حذف منتج' || typeTrim === 'إتلاف';
                        
                        // 2. التعديلات اليدوية للأصناف (قد تتضمن تغيير تكلفة أو كمية صامتاً)
                        const isProductEdit = typeTrim === 'تعديل بيانات صنف' || typeTrim === 'شراء بضاعة (تعديل كمية)' || details.includes('تعديل الصنف');
                        
                        // 3. الخصومات للعملاء (تقلص الأرباح ورأس المال المتوقع)
                        // تجنب الخلط بين كلمة "خصم" كـ (تخفيض للعميل) وبين كلمة "خصم" كـ (سحب من الخزينة)
                        const isDiscount = details.includes('خصم') && !details.includes('بدون خصم') && !details.includes('كسلفة') && !typeTrim.includes('شراء') && !typeTrim.includes('دين') && !typeTrim.includes('التزام');
                        
                        // 4. زيادة التزام بدون دخول سيولة أو بضاعة (يخفض رأس المال فوراً)
                        const isLiabilityIncrease = (typeTrim.includes('التزام') && !typeTrim.includes('تسديد') && !typeTrim.includes('حذف') && !typeTrim.includes('إسقاط') && !typeTrim.includes('تكلفة إضافية'));
                        const isLiabilityWithoutCash = isLiabilityIncrease && !details.includes('تم استلام سيولة') && !details.includes('تكلفة إضافية');
                        
                        // 5. مسح التزام (يزيد رأس المال)
                        const isLiabilityDrop = typeTrim.includes('حذف التزام') || typeTrim.includes('إسقاط التزام');
                        
                        // 6. إسقاط دين مستحق لك (يخفض رأس المال)
                        const isDebtDrop = typeTrim === 'إلغاء دين' || typeTrim === 'معالجة دين متعثر';
                        
                        // 7. تلاعب يدوي بالخزنة
                        const isCashOverride = typeTrim === 'تعديل رصيد يدوي' || typeTrim === 'تصفير شامل';
                        
                        // 8. إلغاء فواتير
                        const isInvoiceCancel = typeTrim === 'إلغاء فاتورة شراء معلقة' || typeTrim === 'حذف مبيعات';
                        
                        const isCapitalLeak = isProductLoss || isProductEdit || isDiscount || isLiabilityWithoutCash || isLiabilityDrop || isDebtDrop || isCashOverride || isInvoiceCancel;
                        
                        if (isCapitalLeak) {
                            adjustments.push({
                                date: docId,
                                time: entry.timestamp || docId,
                                type: typeTrim,
                                details: details,
                                isCritical: isProductLoss || isDiscount || isDebtDrop || isLiabilityWithoutCash
                            });
                        }
                    };

                    snap.forEach(doc => {
                        const data = doc.data();
                        if (data.log && Array.isArray(data.log)) {
                            data.log.forEach(entry => processEntry(entry, doc.id));
                        }
                    });
                    
                    if (typeof window.getTodayDateString === 'function' && window.getTodayDateString().startsWith(month)) {
                         if (window.operationLog) {
                             window.operationLog.forEach(entry => {
                                 // check if not already in array
                                 if (!adjustments.some(a => a.time === entry.timestamp && a.details === (entry.details || ''))) {
                                     processEntry(entry, window.getTodayDateString());
                                 }
                             });
                         }
                    }
                    
                    adjustments.sort((a,b) => new Date(b.time) - new Date(a.time));
                    
                    let criticalCount = 0;
                    let infoCount = 0;
                    
                    if (adjustments.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="3" class="text-center p-10 text-gray-500 font-medium"><i class="fas fa-shield-check text-emerald-500 text-5xl mb-4 block"></i>لا توجد أي تسويات أو حركات غير اعتيادية مسجلة في هذا الشهر. حساباتك مطابقة تماماً للمسار الروتيني.</td></tr>';
                    } else {
                        adjustments.forEach(adj => {
                            let timeStr = '';
                            try { timeStr = new Date(adj.time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}); } catch(e){}
                            
                            if (adj.isCritical) criticalCount++;
                            else infoCount++;
                            
                            let trClass = adj.isCritical ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50";
                            let badgeClass = adj.isCritical ? "bg-red-200 text-red-800 border-red-300" : "bg-blue-100 text-blue-800 border-blue-200";
                            let icon = adj.isCritical ? '<i class="fas fa-exclamation-triangle mr-1"></i>' : '<i class="fas fa-code-branch mr-1"></i>';
                            
                            tbody.innerHTML += `
                                <tr class="transition-colors border-b border-slate-200 ${trClass}">
                                    <td class="p-4 text-sm">
                                        <div class="font-black text-slate-800">${adj.date}</div>
                                        <div class="text-xs text-slate-500 mt-1 font-bold"><i class="far fa-clock"></i> ${timeStr}</div>
                                    </td>
                                    <td class="p-4 text-sm font-bold">
                                        <span class="px-3 py-1.5 rounded-lg border ${badgeClass} shadow-sm inline-block">${icon} ${adj.type}</span>
                                    </td>
                                    <td class="p-4 text-sm text-slate-800 leading-relaxed font-semibold">${adj.details}</td>
                                </tr>
                            `;
                        });
                    }
                    
                    document.getElementById('adj-count').innerText = adjustments.length;
                    document.getElementById('adj-alerts').innerText = criticalCount;
                    document.getElementById('adj-info').innerText = infoCount;
                    
                    document.getElementById('adj-dashboard').classList.remove('hidden');
                    
                } catch(e) {
                    console.error(e);
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center p-6 text-red-500 font-bold"><i class="fas fa-wifi mr-2"></i>حدث خطأ أثناء جلب البيانات من الخادم. تأكد من اتصالك بالإنترنت.</td></tr>';
                }
                
                
                // --- UPDATE NEW DASHBOARD ---
                if (daysData.length > 0) {
                    daysData.sort((a,b) => new Date(a.date) - new Date(b.date));
                    const firstDay = daysData[0];
                    const lastDay = daysData[daysData.length - 1];
                    
                    document.getElementById('dash-month-name').innerText = month;
                    document.getElementById('dash-start-capital').innerText = formatCurrency(firstDay.capital);
                    document.getElementById('dash-start-date').innerText = firstDay.date;
                    
                    document.getElementById('dash-end-capital').innerText = formatCurrency(lastDay.capital);
                    document.getElementById('dash-end-date').innerText = lastDay.date;
                    
                    const actualNetProfit = lastDay.capital - firstDay.capital;
                    const profitEl = document.getElementById('dash-net-profit');
                    profitEl.innerText = formatCurrency(actualNetProfit);
                    if (actualNetProfit < 0) {
                        profitEl.classList.remove('text-emerald-900');
                        profitEl.classList.add('text-red-600');
                    } else {
                        profitEl.classList.add('text-emerald-900');
                        profitEl.classList.remove('text-red-600');
                    }
                    
                    let totalUnaccountedLeak = 0;
                    for (let i = 1; i < daysData.length; i++) {
                        const prev = daysData[i-1];
                        const curr = daysData[i];
                        const actualChange = curr.capital - prev.capital;
                        const newLosses = (curr.losses >= prev.losses) ? (curr.losses - prev.losses) : curr.losses; 
                        const expectedChange = curr.profit - curr.expenses - newLosses;
                        totalUnaccountedLeak += (actualChange - expectedChange);
                    }
                    
                    document.getElementById('dash-unaccounted').innerText = formatCurrency(totalUnaccountedLeak);
                    
                    document.getElementById('monthly-net-dashboard').classList.remove('hidden');
                }
                // ----------------------------

                document.getElementById('adjustments-loading').classList.add('hidden');
                document.getElementById('adjustments-results').classList.remove('hidden');
            });
        }
    }, 1500);
});
