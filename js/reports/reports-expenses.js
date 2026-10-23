async function generateExpensesReport() {
    if (typeof window.generateExpensesReportExternal === 'function') {
        return window.generateExpensesReportExternal({
            showMessage, 
            formatCurrency, 
            getTodayDateString: typeof getTodayDateString === 'function' ? getTodayDateString : () => (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })), 
            currentLoadedDate: typeof currentLoadedDate !== 'undefined' ? currentLoadedDate : null, 
            operationLog: typeof operationLog !== 'undefined' ? operationLog : [], 
            liquidityLog: typeof liquidityLog !== 'undefined' ? liquidityLog : [],
            formatDateForDisplay: typeof formatDateForDisplay === 'function' ? formatDateForDisplay : (d) => d
        });
    } else {
        const messageEl = document.getElementById('exp-report-message');
        if (messageEl) showMessage(messageEl, "تقرير المصروفات غير متوفر. يتم الاعتماد على الكود الداخلي.", true);
    }
}

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
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4"><i class="fas fa-spinner fa-spin"></i> جاري معالجة البيانات...</td></tr>`;

    setTimeout(async () => {
        try {
            const userId = window.currentUser ? window.currentUser.uid : null;
            if (!userId) {
                processExpensesData([], yearMonth);
                return;
            }
            const startDocId = yearMonth + "-01";
            const endDocId = yearMonth + "-31";
            const q = window.query(
                window.collection(window.db, "users", userId, "days"),
                window.where(firebase.firestore.FieldPath.documentId(), ">=", startDocId),
                window.where(firebase.firestore.FieldPath.documentId(), "<=", endDocId)
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
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-red-500">فشل تحميل البيانات.</td></tr>';
        }
    }, 100);

    function processExpensesData(cloudDays, targetMonth) {
        const extractAmountFromText = (text) => {
            if (!text || typeof text !== 'string') return 0;
            let cleanText = text.replace(/جنيه/g, '').replace(/EGP/g, '').replace(/ج\.م/g, '');
            const regex = /(?:بقيمة|سحب|خصم|مبلغ|بدفع|دفع|تسديد)\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/;
            const match = cleanText.match(regex);
            if (match && match[1]) return parseFloat(match[1].replace(/,/g, ''));
            const startMatch = cleanText.match(/^([\d,]+(?:\.\d+)?)/);
            if (startMatch && startMatch[1]) return parseFloat(startMatch[1].replace(/,/g, ''));
            return 0;
        };

        const todayStr = (typeof getTodayDateString === 'function') ? getTodayDateString() : (typeof currentLoadedDate !== 'undefined' && currentLoadedDate ? currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })));
        
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

            // 1. Extract from operationLog (data.log)
            if (dayData.log && Array.isArray(dayData.log)) {
                dayData.log.forEach(logEntry => {
                    const type = (logEntry.type || "").toString();
                    const details = (logEntry.details || "").toString();

                    // استبعاد الحركات التي ليست مصروفات: إنشاء التزامات، زيادة التزامات، تحويل التزامات، فواتير شراء
                    if (type.includes("زيادة التزام") || type.includes("إنشاء التزام") || type.includes("تحويل التزام") ||
                        details.includes("زيادة التزام") || details.includes("إنشاء التزام") || details.includes("تحويل التزام") ||
                        details.includes("فاتورة شراء") || details.includes("شراء بضاعة")) {
                        return;
                    }

                    const isRefund = 
                        type.includes("تقليل مصروف") || 
                        type.includes("استرداد") || 
                        details.includes("تقليل مصروف") || 
                        details.includes("استرداد مصروف");

                    // سداد التزام مدرج كمصروف: يجب أن يكون قد سُجل فعلياً كـ "مصروف" في سجل العمليات والتفاصيل تشير لسداد التزام
                    const isLiabilityExpense = 
                        type.includes("مصروف") && 
                        (details.includes("تسديد التزام") || details.includes("سداد التزام") || details.includes("دفع التزام") || details.includes("التزام"));

                    // مصروف تشغيلي مباشر
                    const isDirectExpense = 
                        !isLiabilityExpense && 
                        (type.includes("مصروف") || type.includes("سحب") || details.includes("صرف مصروف") || details.includes("سحب شخصي"));

                    // إذا لم تكن الحركة مصروفاً معتمداً ولا استرداداً، يتم تجاهلها تماماً
                    if (!isRefund && !isLiabilityExpense && !isDirectExpense) {
                        return;
                    }

                    const amount = Number(logEntry.amount) || extractAmountFromText(details);
                    if (amount > 0) {
                        if (isRefund) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: 'استرداد / تقليل مصروف',
                                details: details,
                                amount: amount,
                                isRefund: true,
                                category: 'refund',
                                source: dayData.date === todayStr ? 'local' : 'cloud'
                            });
                        } else if (isLiabilityExpense) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: 'سداد التزام (مصروف)',
                                details: details,
                                amount: amount,
                                isRefund: false,
                                category: 'liability',
                                source: dayData.date === todayStr ? 'local' : 'cloud'
                            });
                        } else if (isDirectExpense) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: type || 'مصروف تشغيلي مباشر',
                                details: details,
                                amount: amount,
                                isRefund: false,
                                category: 'direct',
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
                        const desc = logEntry.description || '';
                        if (desc.includes("زيادة التزام") || desc.includes("تحويل التزام") || desc.includes("إنشاء التزام")) return;

                        const isLiab = desc.includes("تسديد التزام") || desc.includes("سداد التزام") || logEntry.isLiabilityPayment === true;
                        const amount = Math.abs(Number(logEntry.amount) || extractAmountFromText(desc) || 0);
                        if (amount > 0) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: isLiab ? 'سداد التزام (مصروف)' : (logEntry.type === 'remove' ? 'صرف مصروف مباشر' : 'مصروف تشغيلي'),
                                details: desc,
                                amount: amount,
                                isRefund: false,
                                category: isLiab ? 'liability' : 'direct',
                                source: dayData.date === todayStr ? 'local' : 'cloud',
                                isVerified: true
                            });
                        }
                    }
                });
            }
        });

        // Remove exact duplicates between logs
        let uniqueExpenses = [];
        let seenKeys = new Set();
        allExpenses.forEach(exp => {
            const timeKey = (exp.timestamp || '').slice(0, 16);
            const key = `${Math.round(exp.amount * 100)}_${timeKey}_${exp.category}`;
            if (!seenKeys.has(key)) {
                uniqueExpenses.push(exp);
                seenKeys.add(key);
            }
        });

        uniqueExpenses.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        let directTotal = 0;
        let liabilityTotal = 0;
        let refundTotal = 0;

        uniqueExpenses.forEach(exp => {
            if (exp.category === 'refund') {
                refundTotal += exp.amount;
            } else if (exp.category === 'liability') {
                liabilityTotal += exp.amount;
            } else {
                directTotal += exp.amount;
            }
        });

        const totalAmount = Math.max(0, (directTotal + liabilityTotal) - refundTotal);
        tableBody.innerHTML = '';
        
        if (uniqueExpenses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">لا توجد مصروفات أو مسحوبات مسجلة في هذا الشهر.</td></tr>`;
        } else {
            uniqueExpenses.forEach(exp => {
                let timeStr = "";
                try {
                    timeStr = new Date(exp.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
                } catch(e){ console.warn("تنسيق وقت المصروف:", e); }

                const tr = document.createElement('tr');
                tr.className = 'expense-row border-b hover:bg-gray-50 transition-colors';
                if (tr.setAttribute) tr.setAttribute('data-exp-category', exp.category);
                tr.dataset = tr.dataset || {};
                tr.dataset.expCategory = exp.category;
                
                let amountClass = 'text-blue-700 font-bold';
                let amountSign = '';
                let badgeHtml = '';

                if (exp.category === 'refund') {
                    amountClass = 'text-green-600 font-bold';
                    amountSign = '-';
                    badgeHtml = `<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200 inline-block font-semibold"><i class="fas fa-undo ml-1"></i> استرداد / تخفيض</span>`;
                } else if (exp.category === 'liability') {
                    amountClass = 'text-amber-600 font-bold';
                    badgeHtml = `<span class="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 inline-block font-semibold"><i class="fas fa-file-invoice-dollar ml-1"></i> سداد التزام</span>`;
                } else {
                    amountClass = 'text-blue-700 font-bold';
                    badgeHtml = exp.isVerified 
                        ? `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 inline-block font-semibold"><i class="fas fa-coins ml-1"></i> مصروف مباشر</span>`
                        : `<span class="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 inline-block"><i class="fas fa-coins ml-1"></i> تشغيلي</span>`;
                }

                tr.innerHTML = `
                    <td class="p-3 text-sm">
                        <div class="font-bold text-gray-700">${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(exp.date) : exp.date}</div>
                        <div class="text-xs text-gray-400">${timeStr}</div>
                    </td>
                    <td class="p-3 text-sm font-semibold text-gray-800">
                        ${window.escapeHTML ? window.escapeHTML(exp.type) : exp.type}
                        <br>${badgeHtml}
                    </td>
                    <td class="p-3 text-sm text-gray-600">${window.escapeHTML ? window.escapeHTML(exp.details) : exp.details}</td>
                    <td class="p-3 text-sm text-center font-mono ${amountClass}">${amountSign}${typeof formatCurrency === 'function' ? formatCurrency(exp.amount) : exp.amount}</td>
                    <td class="p-3 text-sm text-center">
                        ${exp.category === 'refund' ? '<span class="text-xs text-gray-400">-</span>' : `
                        <button data-timestamp="${typeof escapeHTML === 'function' ? escapeHTML(exp.timestamp) : (window.escapeHTML ? window.escapeHTML(exp.timestamp) : exp.timestamp)}" 
                                data-source="${typeof escapeHTML === 'function' ? escapeHTML(exp.source) : (window.escapeHTML ? window.escapeHTML(exp.source) : exp.source)}" 
                                data-amount="${Number(exp.amount) || 0}" 
                                onclick="window.deleteExpenseEntry(this.dataset.timestamp, this.dataset.source, Number(this.dataset.amount))" 
                                class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors" title="حذف المصروف">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        `}
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
        
        // Update summary cards
        const directEl = document.getElementById('exp-report-summary-direct');
        const liabilityEl = document.getElementById('exp-report-summary-liabilities');
        const refundEl = document.getElementById('exp-report-summary-refunds');

        if (directEl) directEl.textContent = formatCurrency(directTotal);
        if (liabilityEl) liabilityEl.textContent = formatCurrency(liabilityTotal);
        if (refundEl) refundEl.textContent = formatCurrency(refundTotal);
        summaryTotalEl.textContent = formatCurrency(totalAmount);
        summaryContainer.classList.remove('hidden');

        // Setup filter tabs delegation
        if (!window._expFilterAttached && typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('click', (e) => {
                const btn = e.target && e.target.closest ? e.target.closest('.exp-filter-btn') : null;
                if (!btn) return;
                const filterType = btn.dataset ? btn.dataset.type : btn.getAttribute('data-type');
                const allFilterBtns = document.querySelectorAll('.exp-filter-btn');
                if (allFilterBtns) {
                    allFilterBtns.forEach(b => {
                        const bType = b.dataset ? b.dataset.type : b.getAttribute('data-type');
                        if (bType === filterType) {
                            b.className = 'exp-filter-btn text-xs px-3 py-1 rounded-full border border-blue-600 bg-blue-600 text-white font-medium shadow-sm transition-all';
                        } else {
                            b.className = 'exp-filter-btn text-xs px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium transition-all';
                        }
                    });
                }
                const rows = document.querySelectorAll('#expenses-report-table-body tr.expense-row');
                if (rows) {
                    rows.forEach(row => {
                        const cat = row.getAttribute ? row.getAttribute('data-exp-category') : (row.dataset ? row.dataset.expCategory : '');
                        if (filterType === 'all' || cat === filterType) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                }
            });
            window._expFilterAttached = true;
        }

        if(messageEl) showMessage(messageEl, `تم عرض ${uniqueExpenses.length} عملية مصروف لشهر ${targetMonth}.`, false);
    }
}


window.deleteExpenseEntry = function(timestamp, source, amount) {
    if (source === 'cloud') {
        alert("لا يمكن حذف مصروفات الأيام السابقة مباشرة من هنا لتأثيرها على رصيد الخزنة المغلق. يرجى استخدام (إضافة سيولة) أو (تقليل مصروف) من القائمة الرئيسية لتسويتها محاسبياً.");
        return;
    }
    
    if (!confirm(`هل أنت متأكد من حذف هذا المصروف بقيمة ${typeof formatCurrency === 'function' ? formatCurrency(amount) : amount}؟ سيتم إرجاع المبلغ لحسابه الأصلي في الخزينة.`)) return;

    let foundAndDeleted = false;

    // 1. Remove from operationLog
    if (typeof window.operationLog !== 'undefined' && Array.isArray(window.operationLog)) {
        const idx = window.operationLog.findIndex(log => 
            log.type !== 'إضافة إيراد' && 
            ((log.type || '').includes('مصروف') || (log.type || '').includes('التزام') || (log.details || '').includes('مصروف') || (log.details || '').includes('التزام')) && 
            (log.timestamp === timestamp || Math.abs(Number(log.amount) - amount) < 0.01)
        );
        if (idx !== -1) {
            window.operationLog.splice(idx, 1);
            foundAndDeleted = true;
        }
    }

    // 2. Remove from liquidityLog and restore account balance
    if (typeof window.liquidityLog !== 'undefined' && Array.isArray(window.liquidityLog) && typeof window.accounts !== 'undefined') {
        const lIdx = window.liquidityLog.findIndex(l => 
            l.type !== 'add' && 
            (l.isExpense || l.type === 'remove' || (l.description || '').includes('مصروف') || (l.description || '').includes('التزام')) && 
            (l.timestamp === timestamp || Math.abs(Number(l.amount) - amount) < 0.01)
        );
        if (lIdx !== -1) {
            const lEntry = window.liquidityLog[lIdx];
            window.liquidityLog.splice(lIdx, 1);
            
            // Restore account balance
            let restored = false;
            if (lEntry.accountId) {
                const acc = window.accounts.find(a => String(a.id) === String(lEntry.accountId));
                if (acc) { 
                    acc.balance = window.money((Number(acc.balance) || 0) + Number(lEntry.amount || amount)); 
                    restored = true; 
                }
            }
            if (!restored && lEntry.description) {
                const match = lEntry.description.match(/من حساب "([^"]+)"/);
                if (match && match[1]) {
                    const accName = match[1];
                    const acc = window.accounts.find(a => a.name === accName);
                    if (acc) acc.balance = window.money((Number(acc.balance) || 0) + Number(lEntry.amount || amount));
                }
            }
            foundAndDeleted = true;
        }
    }

    // 3. Subtract from global expenses
    if (foundAndDeleted && typeof window.expenses !== 'undefined') {
        window.expenses = Math.max(0, window.money((Number(window.expenses) || 0) - amount));
    }

    if (foundAndDeleted) {
        if (typeof window.saveStateToHistory === 'function') window.saveStateToHistory();
        if (typeof window.updateUI === 'function') window.updateUI();
        if (typeof window.saveCurrentStateByDate === 'function') {
            const d = typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate ? window.currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
            window.saveCurrentStateByDate(d);
        }
        
        // Save to cloud immediately!
        if (typeof window.saveSystemToCloud === 'function') {
            window.saveSystemToCloud().catch(e => console.error("Cloud save failed after expense deletion", e));
        }
        
        if (typeof window.logOperation === 'function') {
            window.logOperation("إلغاء مصروف", `تم حذف مصروف بقيمة ${typeof formatCurrency === 'function' ? formatCurrency(amount) : amount} يدوياً من التقرير وإرجاع المبلغ للخزينة.`);
        }
        
        if (typeof generateExpensesReport === 'function') generateExpensesReport();
        
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage("تم حذف المصروف وإرجاع المبلغ بنجاح.", false);
        } else {
            alert("تم حذف المصروف وإرجاع المبلغ بنجاح.");
        }
    } else {
        alert("لم يتم العثور على المصروف في سجلات اليوم الحالي.");
    }
};
