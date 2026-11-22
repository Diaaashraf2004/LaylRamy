// finance-dept-logs.js
// Logic for displaying Department Logs (Section Logs) with Enhanced UI & Smart Date Intelligence

window.currentDeptLogCategory = '';
window.currentDeptLogSubFilter = 'all';

window.isLogMatchingDepartment = function(log, deptCategory) {
    if (!log || !log.type) return false;
    const type = String(log.type).trim();
    switch (deptCategory) {
        case 'sales':
            if (type.includes('مرتجع') || type.includes('شراء') || type.includes('مورد')) return false;
            return type.includes('بيع') || type.includes('مبيعات') || type.includes('عربون') || type === 'فاتورة' || (type.includes('فاتورة') && !type.includes('شراء'));
        case 'purchases':
            if (type.includes('مرتجع') || type.includes('بيع') || type.includes('مبيعات')) return false;
            return type.includes('شراء') || type.includes('توريد') || type.includes('استلام بضاعة');
        case 'products':
            if (type.includes('بيع') || type.includes('مبيعات') || type.includes('شراء') || type.includes('توريد') || type.includes('مرتجع')) return false;
            return type.includes('منتج') || type.includes('مخزن') || type.includes('مخزون') || type.includes('سيريال') || type.includes('صنف') || type.includes('تصنيف');
        case 'treasury':
            if (type.includes('بيع') || type.includes('مبيعات') || type.includes('شراء') || type.includes('مصروف') || type.includes('مرتجع') || type.includes('دين') || type.includes('التزام')) return false;
            return type.includes('سيولة') || type.includes('خزينة') || type.includes('حساب') || type.includes('إيراد') || type.includes('تعديل رصيد') || type.includes('تصفير شامل');
        case 'expenses':
            return type.includes('مصروف');
        case 'debts':
            if (type.includes('مرتجع') || type.includes('التزام') || type.includes('مورد') || type.includes('استلام وتسديد') || type.includes('استلام بضاعة')) return false;
            const details = String(log.details || '').trim();
            return type.includes('دين') || type.includes('ديون') || type.includes('سداد') || type.includes('استلام سداد') || type.includes('تحصيل') || type.includes('مقاصة') || type.includes('سلفة') ||
                   details.includes('دين') || details.includes('ديون') || details.includes('سلفة') || details.includes('متبقي') || details.includes('تحصيل ديون');
        case 'liabilities':
            if (type.includes('مرتجع') || (type.includes('دين') && !type.includes('التزام') && !type.includes('مورد'))) return false;
            return type.includes('التزام') || type.includes('دائن') || type.includes('مورد') || type.includes('استقطاع مخفي');
        case 'returns':
            return !type.includes('مورد') && !type.includes('شراء') && type.includes('مرتجع');
        case 'supplier_returns':
            return type.includes('مرتجع') && (type.includes('مورد') || type.includes('شراء'));
        default:
            return type.includes(deptCategory);
    }
};

window.matchesDeptSubFilter = function(log, subFilter, deptCategory) {
    if (!subFilter || subFilter === 'all') return true;
    const type = String(log.type || '');
    if (deptCategory === 'sales') {
        if (subFilter === 'invoice') return type.includes('فاتورة') && !type.includes('مؤقت');
        if (subFilter === 'pending') return type.includes('مؤقت');
        if (subFilter === 'deposit') return type.includes('عربون');
        if (subFilter === 'cancel') return type.includes('إلغاء') || type.includes('حذف');
    } else if (deptCategory === 'purchases') {
        if (subFilter === 'invoice') return type.includes('فاتورة') && !type.includes('معلق');
        if (subFilter === 'pending') return type.includes('معلق');
        if (subFilter === 'receive') return type.includes('استلام');
        if (subFilter === 'cancel') return type.includes('إلغاء');
    } else if (deptCategory === 'treasury') {
        if (subFilter === 'liquidity') return type.includes('سيولة') || type.includes('إيراد');
        if (subFilter === 'transfer') return type.includes('تحويل');
        if (subFilter === 'account') return type.includes('حساب') || type.includes('رصيد');
    } else if (deptCategory === 'debts') {
        const details = String(log.details || '');
        if (subFilter === 'payment') return type.includes('سداد') || type.includes('استلام') || type.includes('تحصيل');
        if (subFilter === 'new_debt') {
            if (type.includes('سداد') || type.includes('تحويل') || type.includes('نقل') || type.includes('شطب') || type.includes('إلغاء') || type.includes('حذف') || type.includes('مقاصة')) return false;
            return type.includes('تسجيل') || type.includes('زيادة') || type.includes('سلفة') || type.includes('دين') || type.includes('ديون') || details.includes('سلفة') || details.includes('تسجيل دين');
        }
        if (subFilter === 'transfer') return type.includes('تحويل') || type.includes('نقل');
        if (subFilter === 'offset') return type.includes('مقاصة');
        if (subFilter === 'cancel') return type.includes('إلغاء') || type.includes('شطب') || type.includes('حذف');
    } else if (deptCategory === 'liabilities') {
        if (subFilter === 'payment') return type.includes('تسديد') || type.includes('سداد');
        if (subFilter === 'supplier') return type.includes('مورد');
        if (subFilter === 'cancel') return type.includes('حذف') || type.includes('إلغاء');
    }
    if (subFilter === 'purchase') return type.includes('شراء') || type.includes('توريد');
    if (subFilter === 'edit') return type.includes('تعديل') || type.includes('تسوية');
    if (subFilter === 'serials') return type.includes('سيريال');
    if (subFilter === 'delete' || subFilter === 'cancel') return type.includes('حذف') || type.includes('إلغاء') || type.includes('مسح');
    return true;
};

const DEPT_SUB_TABS_CONFIG = {
    sales: [
        { id: 'invoice', title: 'فواتير معتمدة', icon: 'fas fa-file-invoice text-emerald-600' },
        { id: 'pending', title: 'مبيعات مؤقتة', icon: 'fas fa-clock text-amber-600' },
        { id: 'deposit', title: 'عربون', icon: 'fas fa-hand-holding-dollar text-purple-600' },
        { id: 'cancel', title: 'إلغاء وحذف', icon: 'fas fa-trash-alt text-rose-600' }
    ],
    purchases: [
        { id: 'invoice', title: 'فواتير شراء', icon: 'fas fa-file-invoice text-emerald-600' },
        { id: 'pending', title: 'شراء معلق', icon: 'fas fa-clock text-amber-600' },
        { id: 'receive', title: 'استلام بضاعة', icon: 'fas fa-truck-ramp-box text-blue-600' },
        { id: 'cancel', title: 'ملغي', icon: 'fas fa-ban text-rose-600' }
    ],
    products: [
        { id: 'edit', title: 'إضافة وتعديل', icon: 'fas fa-edit text-blue-600' },
        { id: 'serials', title: 'سيريالات', icon: 'fas fa-barcode text-purple-600' },
        { id: 'delete', title: 'حذف وتوالف', icon: 'fas fa-trash-alt text-rose-600' }
    ],
    treasury: [
        { id: 'liquidity', title: 'سيولة وإيداع', icon: 'fas fa-coins text-emerald-600' },
        { id: 'transfer', title: 'تحويلات', icon: 'fas fa-exchange-alt text-blue-600' },
        { id: 'account', title: 'إدارة الحسابات', icon: 'fas fa-university text-indigo-600' }
    ],
    debts: [
        { id: 'payment', title: 'سداد وتحصيل', icon: 'fas fa-hand-holding-usd text-emerald-600' },
        { id: 'new_debt', title: 'تسجيل ديون وسلف', icon: 'fas fa-plus-circle text-orange-600' },
        { id: 'transfer', title: 'تحويل ونقل', icon: 'fas fa-exchange-alt text-purple-600' },
        { id: 'offset', title: 'مقاصة', icon: 'fas fa-balance-scale text-blue-600' },
        { id: 'cancel', title: 'شطب وإلغاء', icon: 'fas fa-trash-alt text-rose-600' }
    ],
    liabilities: [
        { id: 'payment', title: 'سداد التزامات', icon: 'fas fa-money-check-alt text-emerald-600' },
        { id: 'supplier', title: 'موردين', icon: 'fas fa-truck text-amber-600' },
        { id: 'cancel', title: 'شطب وحذف', icon: 'fas fa-trash-alt text-rose-600' }
    ],
    returns: [
        { id: 'edit', title: 'تأكيد واستلام', icon: 'fas fa-check-circle text-emerald-600' },
        { id: 'delete', title: 'إلغاء وحذف', icon: 'fas fa-trash-alt text-rose-600' }
    ],
    supplier_returns: [
        { id: 'edit', title: 'تأكيد واستلام', icon: 'fas fa-check-circle text-emerald-600' },
        { id: 'delete', title: 'إلغاء وحذف', icon: 'fas fa-trash-alt text-rose-600' }
    ]
};

window.renderDeptSubFilterTabs = function(category) {
    const container = document.getElementById('dept-log-sub-filters');
    if (!container) return;
    const extra = DEPT_SUB_TABS_CONFIG[category] || [
        { id: 'edit', title: 'تعديل', icon: 'fas fa-sliders-h text-blue-600' },
        { id: 'delete', title: 'حذف وإلغاء', icon: 'fas fa-trash-alt text-rose-600' }
    ];
    const tabs = [{ id: 'all', title: 'الكل', icon: 'fas fa-list' }, ...extra];
    container.innerHTML = tabs.map(tab => {
        const isActive = tab.id === window.currentDeptLogSubFilter;
        const activeClass = isActive 
            ? 'dept-subfilter-btn active-pill px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-blue-600 text-white shadow-sm'
            : 'dept-subfilter-btn px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200';
        return `<button onclick="setDeptLogSubFilter('${tab.id}')" data-subfilter="${tab.id}" class="${activeClass}"><i class="${tab.icon}"></i> ${tab.title}</button>`;
    }).join('');
};

window.setDeptLogSubFilter = function(subType) {
    window.currentDeptLogSubFilter = subType || 'all';
    const buttons = document.querySelectorAll('#dept-log-sub-filters .dept-subfilter-btn');
    buttons.forEach(btn => {
        const isMatch = btn.dataset.subfilter === window.currentDeptLogSubFilter;
        btn.className = isMatch
            ? 'dept-subfilter-btn active-pill px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-blue-600 text-white shadow-sm'
            : 'dept-subfilter-btn px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200';
    });
    if (typeof window.renderDeptLogTimeline === 'function') window.renderDeptLogTimeline();
};

window.closeDeptLogModal = function() {
    const m = document.getElementById('dept-log-modal'); if(m) m.classList.add('hidden');
};

window._deptLogDaysCache = window._deptLogDaysCache || {};
window._deptLogReqSeq = 0;
window._allAvailableDaysList = window._allAvailableDaysList || null;

window.getDeptActiveLogs = async function(targetDate) {
    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    if (!targetDate || targetDate === activeDate) {
        return (typeof window.getOperationLog === 'function') ? window.getOperationLog() : ((typeof operationLog !== 'undefined' && Array.isArray(operationLog)) ? operationLog : []);
    }
    if (window._deptLogDaysCache && window._deptLogDaysCache[targetDate]) {
        return window._deptLogDaysCache[targetDate];
    }
    try {
        if (!window.currentUser || !window.currentUser.uid || !window.db || !window.doc || !window.getDoc) return [];
        const docRef = window.doc(window.db, "users", window.currentUser.uid, "days", targetDate);
        const docSnap = await window.getDoc(docRef);
        if (docSnap && docSnap.exists()) {
            const dayData = docSnap.data() || {};
            const logs = Array.isArray(dayData.log) ? dayData.log : (Array.isArray(dayData.operationLog) ? dayData.operationLog : []);
            window._deptLogDaysCache[targetDate] = logs;
            return logs;
        } else {
            window._deptLogDaysCache[targetDate] = [];
            return [];
        }
    } catch (err) {
        console.error("Error fetching logs for date:", targetDate, err);
        return [];
    }
};

window.initDeptLogDatesList = async function(category) {
    const selectEl = document.getElementById('dept-log-date-select');
    const quickBar = document.getElementById('dept-log-quick-days-bar');
    if (!selectEl && !quickBar) return;

    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    const currentDateFilter = document.getElementById('dept-log-date-filter')?.value || '';

    if (!window._allAvailableDaysList) {
        window._allAvailableDaysList = [];
        try {
            if (window.currentUser && window.currentUser.uid && window.db && window.collection && window.getDocs) {
                const daysColRef = window.collection(window.db, "users", window.currentUser.uid, "days");
                const snap = await window.getDocs(daysColRef);
                const list = [];
                snap.forEach(docSnap => {
                    const dateId = docSnap.id;
                    list.push(dateId);
                    const data = docSnap.data() || {};
                    const logs = Array.isArray(data.log) ? data.log : (Array.isArray(data.operationLog) ? data.operationLog : []);
                    window._deptLogDaysCache[dateId] = logs;
                });
                list.sort().reverse();
                window._allAvailableDaysList = list;
            }
        } catch (err) {
            console.warn("Could not fetch days collection:", err);
        }
    }

    const datesSet = new Set();
    datesSet.add(activeDate);
    (window._allAvailableDaysList || []).forEach(d => datesSet.add(d));
    Object.keys(window._deptLogDaysCache || {}).forEach(d => datesSet.add(d));

    const sortedDates = Array.from(datesSet).sort().reverse();
    const dateStats = sortedDates.map(dateStr => {
        let logs = (dateStr === activeDate)
            ? ((typeof window.getOperationLog === 'function') ? window.getOperationLog() : ((typeof operationLog !== 'undefined' && Array.isArray(operationLog)) ? operationLog : []))
            : (window._deptLogDaysCache[dateStr] || []);
        const count = logs.filter(l => typeof window.isLogMatchingDepartment === 'function' ? window.isLogMatchingDepartment(l, category) : true).length;
        return { date: dateStr, count, isToday: dateStr === activeDate };
    });

    if (selectEl) {
        const todayStat = dateStats.find(s => s.isToday);
        let selectHtml = `<option value="">📅 اليوم الحالي (${activeDate}) - (${todayStat?.count || 0} عملية)</option>`;
        dateStats.forEach(item => {
            if (item.isToday) return;
            const hasOps = item.count > 0;
            const icon = hasOps ? '🟢' : '⚪';
            const statusTxt = hasOps ? `(${item.count} عملية في القسم)` : '(لم تقم بعمليات)';
            const isSelected = item.date === currentDateFilter ? 'selected' : '';
            selectHtml += `<option value="${item.date}" ${isSelected}>${icon} ${item.date} ${statusTxt}</option>`;
        });
        selectEl.innerHTML = selectHtml;
        selectEl.value = currentDateFilter;
    }

    if (quickBar) {
        let barHtml = `<span class="text-slate-400 font-bold shrink-0 flex items-center gap-1"><i class="fas fa-history text-blue-500"></i> التواريخ:</span>`;
        const todayStat = dateStats.find(s => s.isToday);
        const todaySelected = !currentDateFilter || currentDateFilter === activeDate;
        const todayClass = todaySelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200';
        barHtml += `<button onclick="selectDeptLogDate('')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${todayClass}"><i class="fas fa-calendar-day"></i> اليوم الحالي (${todayStat?.count || 0})</button>`;

        const activePastDays = dateStats.filter(s => !s.isToday && s.count > 0);
        activePastDays.forEach(item => {
            const isSelected = item.date === currentDateFilter;
            const pillClass = isSelected ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200';
            barHtml += `<button onclick="selectDeptLogDate('${item.date}')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${pillClass}"><span class="w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}"></span> ${item.date} (${item.count})</button>`;
        });
        quickBar.innerHTML = barHtml;
    }
};

window.selectDeptLogDate = function(dateStr) {
    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    const target = (dateStr === activeDate) ? '' : (dateStr || '');
    const filterEl = document.getElementById('dept-log-date-filter');
    const selectEl = document.getElementById('dept-log-date-select');
    if (filterEl) filterEl.value = target;
    if (selectEl) selectEl.value = target;
    window.renderDeptLogTimeline();
};

window.onDeptLogDateSelectChange = function(dateVal) {
    const val = dateVal || '';
    const f = document.getElementById('dept-log-date-filter'); if (f && f.value !== val) f.value = val;
    const s = document.getElementById('dept-log-date-select'); if (s && s.value !== val) s.value = val;
    window.renderDeptLogTimeline();
};

window.onDeptLogDateInputChange = function(dateVal) {
    const val = dateVal || '';
    const f = document.getElementById('dept-log-date-filter'); if (f && f.value !== val) f.value = val;
    const s = document.getElementById('dept-log-date-select'); if (s && s.value !== val) s.value = val;
    window.renderDeptLogTimeline();
};

window.openDeptLogModal = function(category, title, subtitle, iconClass) {
    window.currentDeptLogCategory = category;
    window.currentDeptLogSubFilter = 'all';
    const t = document.getElementById('dept-log-title'); if(t) t.innerText = title || 'سجل القسم';
    const s = document.getElementById('dept-log-subtitle'); if(s) s.innerText = subtitle || 'تتبع العمليات';
    const i = document.getElementById('dept-log-icon'); if(i) i.className = iconClass || 'fas fa-list-alt';
    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    const d = document.getElementById('dept-log-date-filter'); 
    if(d) { d.value = ''; d.max = activeDate; }
    const sel = document.getElementById('dept-log-date-select'); if(sel) sel.value = '';
    const txt = document.getElementById('dept-log-text-filter'); if(txt) txt.value = '';
    
    if(typeof window.renderDeptSubFilterTabs === 'function') window.renderDeptSubFilterTabs(category);
    if(typeof window.initDeptLogDatesList === 'function') window.initDeptLogDatesList(category);
    if(typeof window.renderDeptLogTimeline === 'function') window.renderDeptLogTimeline();
    
    const m = document.getElementById('dept-log-modal'); if(m) m.classList.remove('hidden');
};

window.renderDeptLogTimeline = async function() {
    const container = document.getElementById('dept-log-timeline-container');
    const countBadge = document.getElementById('dept-log-count');
    const headerCountBadge = document.getElementById('dept-log-count-header');
    const filterEl = document.getElementById('dept-log-date-filter');
    const textFilterEl = document.getElementById('dept-log-text-filter');
    const dateFilter = filterEl ? filterEl.value : '';
    const textFilter = textFilterEl ? textFilterEl.value.toLowerCase().trim() : '';
    const subFilter = window.currentDeptLogSubFilter || 'all';
    const c = window.currentDeptLogCategory;

    if (!container) return;

    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    const isPastDate = !!(dateFilter && dateFilter !== activeDate);

    const selectEl = document.getElementById('dept-log-date-select');
    if (selectEl && selectEl.value !== dateFilter) selectEl.value = dateFilter;

    if (isPastDate && (!window._deptLogDaysCache || !window._deptLogDaysCache[dateFilter])) {
        const safeDate = typeof escapeHTML === 'function' ? escapeHTML(dateFilter) : dateFilter;
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                <h3 class="text-sm font-bold text-slate-700 mb-1">جاري تحميل سجلات يوم ${safeDate}...</h3>
                <p class="text-xs text-slate-400">يتم جلب البيانات المؤرشفة من السحابة</p>
            </div>`;
    }

    const currentReq = ++window._deptLogReqSeq;
    const logs = await window.getDeptActiveLogs(dateFilter);
    if (currentReq !== window._deptLogReqSeq) return;

    let filteredLogs = logs.filter(log => {
        const matchesCat = typeof window.isLogMatchingDepartment === 'function' ? window.isLogMatchingDepartment(log, c) : true;
        const matchesSub = typeof window.matchesDeptSubFilter === 'function' ? window.matchesDeptSubFilter(log, subFilter, c) : true;
        let matchesDate = true;
        if (dateFilter && !isPastDate) { 
            if (log.timestamp) {
                const cDate = typeof window.getCairoDateString === 'function' ? window.getCairoDateString(log.timestamp) : '';
                matchesDate = (cDate === dateFilter) || log.timestamp.includes(dateFilter);
            }
        }
        let matchesText = true;
        if (textFilter) {
            const type = (log.type || ''), details = (log.details || '');
            matchesText = (details.toLowerCase().includes(textFilter)) || (type.toLowerCase().includes(textFilter));
        }
        return matchesCat && matchesSub && matchesDate && matchesText;
    });

    const totalCount = filteredLogs.length;
    if (countBadge) countBadge.innerText = totalCount;
    if (headerCountBadge) headerCountBadge.innerText = totalCount;

    if (totalCount === 0) {
        const safeDate = typeof escapeHTML === 'function' ? escapeHTML(dateFilter) : dateFilter;
        const deptNames = { sales: 'المبيعات', purchases: 'المشتريات', products: 'المخزون', treasury: 'الخزينة', debts: 'الديون', liabilities: 'الالتزامات', returns: 'المرتجعات', supplier_returns: 'مرتجعات الموردين', expenses: 'المصروفات' };
        const deptName = deptNames[c] || 'هذا القسم';
        const noDataTitle = isPastDate ? 'لم تقم بأي عمليات في هذا اليوم' : 'لا توجد حركات مسجلة تطابق التصفية';
        const noDataSub = isPastDate ? `لم يتم تسجيل أي حركات خاصة بقسم "${deptName}" في تاريخ ${safeDate}.` : 'يتم تسجيل جميع حركات إضافة البضائع، المشتريات، تعديل الكميات، وتتبع السيريالات تلقائياً هنا فور حدوثها.';
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 text-3xl mb-3 border border-slate-200 shadow-sm">
                    <i class="far fa-calendar-times text-slate-300"></i>
                </div>
                <h3 class="text-base font-bold text-slate-700 mb-1">${noDataTitle}</h3>
                <p class="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">${noDataSub}</p>
                <button onclick="selectDeptLogDate('')" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold border border-blue-200 transition shadow-sm flex items-center gap-1.5">
                    <i class="fas fa-redo-alt"></i> ${isPastDate ? 'العودة لسجل اليوم الحالي' : 'إظهار كافة الحركات المسجلة'}
                </button>
            </div>`;
        return;
    }

    filteredLogs = [...filteredLogs].reverse();
    let html = '';
    if (isPastDate) {
        const safeDate = typeof escapeHTML === 'function' ? escapeHTML(dateFilter) : dateFilter;
        html += `<div class="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap gap-2 items-center justify-between text-xs text-amber-800">
            <span class="font-bold flex items-center gap-1.5"><i class="fas fa-history text-amber-600"></i> عرض سجلات مؤرشفة ليوم: ${safeDate}</span>
            <button onclick="selectDeptLogDate('')" class="text-amber-700 hover:text-amber-900 underline font-semibold">العودة لليوم الحالي</button>
        </div>`;
    }
    html += '<div class="space-y-3">';
    filteredLogs.forEach((log, index) => {
        const timeParts = log.timestamp ? log.timestamp.split(' - ') : ['', ''];
        const timeOnly = timeParts.length > 1 ? timeParts[1] : (log.timestamp ? new Date(log.timestamp).toLocaleTimeString('ar-EG') : '');
        const dateOnly = (typeof window.getCairoDateString === 'function' && log.timestamp ? window.getCairoDateString(log.timestamp) : null) || timeParts[0] || (log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-CA') : '');

        const formatSafeLogText = (rawStr) => {
            const escaped = typeof escapeHTML === 'function' ? escapeHTML(rawStr || '') : String(rawStr || '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            // 1. إبراز النصوص بين علامات التنصيص المهربة (&quot;) فقط حتى لا تلمس وسوم HTML أبداً
            let formatted = escaped.replace(/&quot;([^&]+?)&quot;/g,
                '<strong class="text-indigo-900 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">"$1"</strong>');

            // 2. إبراز المبالغ المالية بأمان تام
            formatted = formatted.replace(/(\d[\d,]*(?:\.\d+)?)\s*(ج\.م|جنيه)/g,
                '<span class="font-mono font-black text-xs sm:text-sm bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200 inline-block mx-0.5">$1 $2</span>');

            // 3. تظليل كلمة البحث خارج وسوم HTML فقط لمنع كسر أي وسم عند البحث بحروف إنجليزية
            if (textFilter) {
                const safe = textFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const re = new RegExp(safe, 'gi');
                formatted = formatted.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, text) => {
                    if (tag) return tag;
                    return text.replace(re, match => `<mark class="bg-yellow-200 text-yellow-900 font-bold px-1 rounded">${match}</mark>`);
                });
            }
            return formatted;
        };

        const lType = (log.type || '');
        let cardBorder = 'border-slate-200', badgeBg = 'bg-slate-100 text-slate-700 border-slate-200', actionIcon = 'fa-info-circle';

        if (c === 'debts' || lType.includes('دين') || lType.includes('سداد') || lType.includes('مقاصة') || lType.includes('سلفة')) {
            if (lType.includes('سداد') || lType.includes('استلام') || lType.includes('تحصيل')) {
                cardBorder = 'border-emerald-300 hover:border-emerald-400 bg-gradient-to-r from-emerald-50/20 to-white';
                badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                actionIcon = 'fa-hand-holding-usd text-emerald-600';
            } else if (lType.includes('تحويل') || lType.includes('نقل')) {
                cardBorder = 'border-purple-300 hover:border-purple-400 bg-gradient-to-r from-purple-50/20 to-white';
                badgeBg = 'bg-purple-100 text-purple-900 border-purple-300';
                actionIcon = 'fa-exchange-alt text-purple-600';
            } else if (lType.includes('مقاصة')) {
                cardBorder = 'border-blue-300 hover:border-blue-400 bg-gradient-to-r from-blue-50/20 to-white';
                badgeBg = 'bg-blue-100 text-blue-900 border-blue-300';
                actionIcon = 'fa-balance-scale text-blue-600';
            } else if (lType.includes('شطب') || lType.includes('إلغاء') || lType.includes('حذف')) {
                cardBorder = 'border-rose-300 hover:border-rose-400 bg-gradient-to-r from-rose-50/20 to-white';
                badgeBg = 'bg-rose-100 text-rose-900 border-rose-300';
                actionIcon = 'fa-trash-alt text-rose-600';
            } else {
                cardBorder = 'border-orange-300 hover:border-orange-400 bg-gradient-to-r from-orange-50/20 to-white';
                badgeBg = 'bg-orange-100 text-orange-900 border-orange-300';
                actionIcon = 'fa-plus-circle text-orange-600';
            }
        } else if (lType.includes('شراء') || lType.includes('إضافة') || lType.includes('توريد')) {
            cardBorder = 'border-emerald-200 hover:border-emerald-300'; badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200'; actionIcon = 'fa-cart-plus';
        } else if (lType.includes('حذف') || lType.includes('مسح') || lType.includes('إلغاء')) {
            cardBorder = 'border-rose-200 hover:border-rose-300'; badgeBg = 'bg-rose-50 text-rose-800 border-rose-200'; actionIcon = 'fa-trash-alt';
        } else if (lType.includes('سيريال')) {
            cardBorder = 'border-purple-200 hover:border-purple-300'; badgeBg = 'bg-purple-50 text-purple-800 border-purple-200'; actionIcon = 'fa-barcode';
        } else if (lType.includes('تعديل') || lType.includes('تسوية')) {
            cardBorder = 'border-blue-200 hover:border-blue-300'; badgeBg = 'bg-blue-50 text-blue-800 border-blue-200'; actionIcon = 'fa-sliders-h';
        } else if (lType.includes('بيع') || lType.includes('فاتورة') || lType.includes('عربون')) {
            cardBorder = 'border-cyan-200 hover:border-cyan-300'; badgeBg = 'bg-cyan-50 text-cyan-800 border-cyan-200'; actionIcon = 'fa-receipt';
        }

        // تنسيق أنيق لقائمة البنود المسددة [البنود المسددة: ...] إن وُجدت بدلاً من نص متلاصق طويل
        const rawDetails = String(log.details || '');
        const itemsBlockMatch = rawDetails.match(/^(.*?)\s*\[البنود المسددة:\s*([^\]]+)\]\s*$/);
        let formattedDetails = '';
        if (itemsBlockMatch) {
            const headPart = formatSafeLogText(itemsBlockMatch[1].trim());
            const itemsList = itemsBlockMatch[2].split('،').map(s => s.trim()).filter(Boolean);
            const chipsHtml = itemsList.map((it, i) => `
                <span class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700">
                    <span class="text-[10px] font-mono text-slate-400">${i + 1}.</span>
                    <span>${formatSafeLogText(it)}</span>
                </span>
            `).join('');
            formattedDetails = `
                <div class="mb-2">${headPart}</div>
                <div class="pt-2 border-t border-slate-100">
                    <div class="text-[11px] font-bold text-slate-500 mb-1.5">البنود المسددة (${itemsList.length}):</div>
                    <div class="flex flex-wrap gap-1.5">${chipsHtml}</div>
                </div>
            `;
        } else {
            formattedDetails = formatSafeLogText(rawDetails);
        }

        html += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border ${cardBorder} transition hover:shadow-md">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${badgeBg}">
                            <i class="fas ${actionIcon}"></i>
                            ${typeof escapeHTML === 'function' ? escapeHTML(lType) : lType}
                        </span>
                        <span class="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">#${log.id || (index + 1)}</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                        <span class="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1"><i class="far fa-clock text-slate-400"></i> ${timeOnly || '-'}</span>
                        <span class="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1"><i class="far fa-calendar-alt text-slate-400"></i> ${dateOnly || '-'}</span>
                    </div>
                </div>
                <div class="text-sm text-slate-700 leading-relaxed font-medium m-0 pr-1">${formattedDetails}</div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
};

window.printDeptLog = function() {
    const title = document.getElementById('dept-log-title')?.innerText || 'سجل القسم';
    const container = document.getElementById('dept-log-timeline-container');
    if (!container) return;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
        alert('يرجى السماح بالنوافذ المنبثقة لطباعة السجل.');
        return;
    }
    const htmlContent = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>' + title + '</title><style>body{font-family:Arial,sans-serif;direction:rtl;padding:25px;color:#1e293b;}h1{color:#1e40af;font-size:22px;border-bottom:2px solid #2563eb;padding-bottom:10px;margin-bottom:20px;}button{display:none !important;}</style></head><body><h1>' + title + '</h1><div>' + container.innerHTML + '</div></body></html>';
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 250);
};

window.exportDeptLogCSV = async function() {
    const filterEl = document.getElementById('dept-log-date-filter');
    const textFilterEl = document.getElementById('dept-log-text-filter');
    const dateFilter = filterEl ? filterEl.value : '';
    const textFilter = textFilterEl ? textFilterEl.value.toLowerCase().trim() : '';
    const subFilter = window.currentDeptLogSubFilter || 'all';
    const c = window.currentDeptLogCategory;
    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    const isPastDate = !!(dateFilter && dateFilter !== activeDate);

    let logs = await window.getDeptActiveLogs(dateFilter);
    let filtered = logs.filter(log => {
        const matchesCat = typeof window.isLogMatchingDepartment === 'function' ? window.isLogMatchingDepartment(log, c) : true;
        const matchesSub = typeof window.matchesDeptSubFilter === 'function' ? window.matchesDeptSubFilter(log, subFilter, c) : true;
        let matchesDate = true;
        if (dateFilter && !isPastDate) { 
            if (log.timestamp) {
                const cDate = typeof window.getCairoDateString === 'function' ? window.getCairoDateString(log.timestamp) : '';
                matchesDate = (cDate === dateFilter) || log.timestamp.includes(dateFilter);
            }
        }
        let matchesText = true;
        if (textFilter) {
            const type = (log.type || ''), details = (log.details || '');
            matchesText = type.toLowerCase().includes(textFilter) || details.toLowerCase().includes(textFilter);
        }
        return matchesCat && matchesSub && matchesDate && matchesText;
    });

    if (filtered.length === 0) {
        alert('لا توجد حركات للتصدير.');
        return;
    }

    let csv = '\uFEFFم,نوع الحركة,التفاصيل,التاريخ والوقت\n';
    filtered.forEach((log, idx) => {
        const cleanType = (log.type || '').replace(/"/g, '""');
        const cleanDetails = (log.details || '').replace(/"/g, '""');
        const cleanTime = (log.timestamp || '').replace(/"/g, '""');
        csv += `"${idx + 1}","${cleanType}","${cleanDetails}","${cleanTime}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const deptNameMap = { sales: 'المبيعات', purchases: 'المشتريات', products: 'المخزون', treasury: 'الخزينة', debts: 'الديون', liabilities: 'الالتزامات', returns: 'المرتجعات', supplier_returns: 'مرتجعات_الموردين', expenses: 'المصروفات' };
    const deptTitle = deptNameMap[c] || c || 'القسم';
    link.download = `سجل_${deptTitle}_${dateFilter || activeDate}.csv`;
    link.click();
    setTimeout(() => { if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(link.href); }, 1000);
};

// Keyboard listener for Escape key to close modal
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const m = document.getElementById('dept-log-modal');
        if (m && !m.classList.contains('hidden') && m.style.display !== 'none') {
            window.closeDeptLogModal();
        }
    }
});

// Inject buttons dynamically into the UI safely
setInterval(() => {
    const configs = [
        { id: 'treasury', section: '#liquidity-section h2', title: 'سجل الخزينة', sub: 'تتبع الحركات المالية', icon: 'fas fa-wallet', color: 'indigo' },
        { id: 'products', section: '#inventory-section h2', title: 'سجل المخزون', sub: 'تتبع المنتجات', icon: 'fas fa-boxes-stacked', color: 'blue' },
        { id: 'debts', section: '#debts-section h2', title: 'سجل الديون', sub: 'تتبع الديون والسدادات', icon: 'fas fa-hand-holding-usd', color: 'amber' },
        { id: 'liabilities', section: '#liabilities-section h2', title: 'سجل الالتزامات', sub: 'تتبع التزامات الموردين', icon: 'fas fa-file-invoice-dollar', color: 'rose' },
        { id: 'purchases', section: '#purchases-section h2', title: 'سجل المشتريات', sub: 'تتبع فواتير الشراء', icon: 'fas fa-cart-arrow-down', color: 'emerald' },
        { id: 'sales', section: '#sell-product h2', title: 'سجل المبيعات', sub: 'تتبع حركة البيع', icon: 'fas fa-shopping-cart', color: 'cyan' },
        { id: 'expenses', section: '#expenses-report-section h2', title: 'سجل المصروفات', sub: 'تتبع المصروفات', icon: 'fas fa-money-bill-wave', color: 'purple' },
        { id: 'returns', section: '#returns-section h2', title: 'سجل المرتجعات', sub: 'تتبع المرتجعات', icon: 'fas fa-undo', color: 'orange' },
        { id: 'supplier_returns', section: '#supplier-returns-section h2', title: 'سجل مرتجعات الموردين', sub: 'تتبع مرتجعات الموردين', icon: 'fas fa-undo-alt', color: 'red' }
    ];

    configs.forEach(cfg => {
        const header = document.querySelector(cfg.section);
        const btnId = 'btn-dept-log-' + cfg.id;
        
        if (header && !document.getElementById(btnId)) {
            const btn = document.createElement('button');
            btn.id = btnId;
            btn.className = `text-xs bg-${cfg.color}-50 text-${cfg.color}-700 px-3 py-1.5 rounded-lg border border-${cfg.color}-200 hover:bg-${cfg.color}-100 mr-auto transition shadow-sm font-bold flex items-center gap-1`;
            btn.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.title}`;
            btn.onclick = () => window.openDeptLogModal(cfg.id, cfg.title, cfg.sub, cfg.icon);
            
            const parentDiv = header.parentElement;
            if (cfg.id === 'sales' && parentDiv) {
                btn.classList.remove('mr-auto'); btn.classList.add('mx-auto', 'mt-2');
                parentDiv.appendChild(btn);
            } else if ((cfg.id === 'products' || cfg.id === 'supplier_returns') && parentDiv?.parentElement && window.getComputedStyle(parentDiv.parentElement).display === 'flex') {
                const g = parentDiv.parentElement; btn.classList.remove('mr-auto');
                g.style.flexWrap = 'wrap'; g.style.gap = g.style.gap || '0.5rem'; g.appendChild(btn);
            } else if (parentDiv && window.getComputedStyle(parentDiv).display === 'flex' && !parentDiv.classList.contains('widget-card')) {
                parentDiv.style.flexWrap = 'wrap'; parentDiv.style.gap = parentDiv.style.gap || '0.5rem'; parentDiv.appendChild(btn);
            } else {
                const wrapper = document.createElement('div');
                wrapper.className = 'flex flex-wrap justify-between items-center gap-2 w-full mb-4 border-b pb-2';
                parentDiv.insertBefore(wrapper, header);
                header.style.marginBottom = '0'; header.style.borderBottom = 'none'; header.style.paddingBottom = '0';
                wrapper.appendChild(header); btn.classList.remove('mr-auto'); wrapper.appendChild(btn);
            }
        }
    });
    window.switchDeptSubTab = window.setDeptLogSubFilter;
}, 1500);
