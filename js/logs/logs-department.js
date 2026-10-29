// finance-dept-logs.js
// Logic for displaying Department Logs (Section Logs) with Enhanced UI

window.currentDeptLogCategory = '';
window.currentDeptLogSubFilter = 'all';

window.isLogMatchingDepartment = function(log, deptCategory) {
    if (!log || !log.type) return false;
    const type = String(log.type).trim();

    switch (deptCategory) {
        case 'sales':
            // سجل المبيعات: يختص حصراً بعمليات البيع وفواتير المبيعات والعربون وإلغاء/حذف البيع
            if (type.includes('مرتجع')) return false;
            if (type.includes('شراء')) return false;
            if (type.includes('مورد')) return false;
            return type.includes('بيع') || 
                   type.includes('مبيعات') || 
                   type.includes('عربون') || 
                   type === 'فاتورة' ||
                   (type.includes('فاتورة') && !type.includes('شراء'));

        case 'purchases':
            // سجل المشتريات: يختص حصراً بعمليات الشراء وتوريد واستلام البضاعة
            if (type.includes('مرتجع')) return false;
            if (type.includes('بيع') || type.includes('مبيعات')) return false;
            return type.includes('شراء') || 
                   type.includes('توريد') || 
                   type.includes('استلام بضاعة');

        case 'products':
            // سجل المخزون: يختص حصراً ببطاقات الأصناف، السيريالات، وتسويات المخزن المباشرة
            if (type.includes('بيع') || type.includes('مبيعات')) return false;
            if (type.includes('شراء') || type.includes('توريد')) return false;
            if (type.includes('مرتجع')) return false;
            return type.includes('منتج') || 
                   type.includes('مخزن') || 
                   type.includes('مخزون') || 
                   type.includes('سيريال') || 
                   type.includes('صنف') || 
                   type.includes('تصنيف');

        case 'treasury':
            // سجل الخزينة: يختص حصراً بحركات السيولة المباشرة والخزائن والحسابات
            if (type.includes('بيع') || type.includes('مبيعات')) return false;
            if (type.includes('شراء')) return false;
            if (type.includes('مصروف')) return false;
            if (type.includes('مرتجع')) return false;
            if (type.includes('دين') || type.includes('التزام')) return false;
            return type.includes('سيولة') || 
                   type.includes('خزينة') || 
                   type.includes('حساب') || 
                   type.includes('إيراد') || 
                   type.includes('تعديل رصيد') || 
                   type.includes('تصفير شامل');

        case 'expenses':
            // سجل المصروفات: يختص بالمصروفات التشغيلية فقط
            return type.includes('مصروف');

        case 'debts':
            // سجل الديون: يختص بديون العملاء وسداداتها والتحويل والمقاصة
            if (type.includes('مرتجع')) return false;
            if (type.includes('التزام') || type.includes('مورد')) return false;
            return type.includes('دين') || 
                   type.includes('سداد ديون') || 
                   type.includes('استلام سداد') || 
                   type.includes('مقاصة');

        case 'liabilities':
            // سجل الالتزامات: يختص بالتزامات الموردين وإدارتها وسدادها
            if (type.includes('مرتجع')) return false;
            if (type.includes('دين') && !type.includes('التزام') && !type.includes('مورد')) return false;
            return type.includes('التزام') || 
                   type.includes('دائن') || 
                   type.includes('مورد') || 
                   type.includes('استقطاع مخفي');

        case 'returns':
            // سجل المرتجعات: يختص بمرتجعات العملاء والمبيعات
            if (type.includes('مورد') || type.includes('شراء')) return false;
            return type.includes('مرتجع');

        case 'supplier_returns':
            // سجل مرتجعات الموردين: يختص بمرتجعات البضاعة للموردين/المشتريات
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
        if (subFilter === 'payment') return type.includes('سداد') || type.includes('استلام');
        if (subFilter === 'offset') return type.includes('مقاصة');
        if (subFilter === 'cancel') return type.includes('إلغاء') || type.includes('شطب');
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

window.renderDeptSubFilterTabs = function(category) {
    const container = document.getElementById('dept-log-sub-filters');
    if (!container) return;

    let tabs = [{ id: 'all', title: 'الكل', icon: 'fas fa-list' }];

    if (category === 'sales') {
        tabs.push(
            { id: 'invoice', title: 'فواتير معتمدة', icon: 'fas fa-file-invoice text-emerald-600' },
            { id: 'pending', title: 'مبيعات مؤقتة', icon: 'fas fa-clock text-amber-600' },
            { id: 'deposit', title: 'عربون', icon: 'fas fa-hand-holding-dollar text-purple-600' },
            { id: 'cancel', title: 'إلغاء وحذف', icon: 'fas fa-trash-alt text-rose-600' }
        );
    } else if (category === 'purchases') {
        tabs.push(
            { id: 'invoice', title: 'فواتير شراء', icon: 'fas fa-file-invoice text-emerald-600' },
            { id: 'pending', title: 'شراء معلق', icon: 'fas fa-clock text-amber-600' },
            { id: 'receive', title: 'استلام بضاعة', icon: 'fas fa-truck-ramp-box text-blue-600' },
            { id: 'cancel', title: 'ملغي', icon: 'fas fa-ban text-rose-600' }
        );
    } else if (category === 'products') {
        tabs.push(
            { id: 'edit', title: 'إضافة وتعديل', icon: 'fas fa-edit text-blue-600' },
            { id: 'serials', title: 'سيريالات', icon: 'fas fa-barcode text-purple-600' },
            { id: 'delete', title: 'حذف وتوالف', icon: 'fas fa-trash-alt text-rose-600' }
        );
    } else if (category === 'treasury') {
        tabs.push(
            { id: 'liquidity', title: 'سيولة وإيداع', icon: 'fas fa-coins text-emerald-600' },
            { id: 'transfer', title: 'تحويلات', icon: 'fas fa-exchange-alt text-blue-600' },
            { id: 'account', title: 'إدارة الحسابات', icon: 'fas fa-university text-indigo-600' }
        );
    } else if (category === 'debts') {
        tabs.push(
            { id: 'payment', title: 'سداد وتحصيل', icon: 'fas fa-hand-holding-usd text-emerald-600' },
            { id: 'offset', title: 'مقاصة', icon: 'fas fa-balance-scale text-blue-600' },
            { id: 'cancel', title: 'شطب وإلغاء', icon: 'fas fa-trash-alt text-rose-600' }
        );
    } else if (category === 'liabilities') {
        tabs.push(
            { id: 'payment', title: 'سداد التزامات', icon: 'fas fa-money-check-alt text-emerald-600' },
            { id: 'supplier', title: 'موردين', icon: 'fas fa-truck text-amber-600' },
            { id: 'cancel', title: 'شطب وحذف', icon: 'fas fa-trash-alt text-rose-600' }
        );
    } else if (category === 'returns' || category === 'supplier_returns') {
        tabs.push(
            { id: 'edit', title: 'تأكيد واستلام', icon: 'fas fa-check-circle text-emerald-600' },
            { id: 'delete', title: 'إلغاء وحذف', icon: 'fas fa-trash-alt text-rose-600' }
        );
    } else {
        tabs.push(
            { id: 'edit', title: 'تعديل', icon: 'fas fa-sliders-h text-blue-600' },
            { id: 'delete', title: 'حذف وإلغاء', icon: 'fas fa-trash-alt text-rose-600' }
        );
    }

    container.innerHTML = tabs.map(tab => {
        const isActive = tab.id === window.currentDeptLogSubFilter;
        const activeClass = isActive 
            ? 'dept-subfilter-btn active-pill px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-blue-600 text-white shadow-sm'
            : 'dept-subfilter-btn px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200';
        return `<button onclick="setDeptLogSubFilter('${tab.id}')" data-subfilter="${tab.id}" class="${activeClass}">
            <i class="${tab.icon}"></i> ${tab.title}
        </button>`;
    }).join('');
};

window.openDeptLogModal = function(category, title, subtitle, iconClass) {
    window.currentDeptLogCategory = category;
    window.currentDeptLogSubFilter = 'all';
    const t = document.getElementById('dept-log-title'); if(t) t.innerText = title || 'سجل القسم';
    const s = document.getElementById('dept-log-subtitle'); if(s) s.innerText = subtitle || 'تتبع العمليات';
    const i = document.getElementById('dept-log-icon'); if(i) i.className = iconClass || 'fas fa-list-alt';
    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    const d = document.getElementById('dept-log-date-filter'); 
    if(d) {
        d.value = '';
        d.max = activeDate;
    }
    const txt = document.getElementById('dept-log-text-filter'); if(txt) txt.value = '';
    
    if(typeof window.renderDeptSubFilterTabs === 'function') window.renderDeptSubFilterTabs(category);
    if(typeof window.renderDeptLogTimeline === 'function') window.renderDeptLogTimeline();
    
    const m = document.getElementById('dept-log-modal'); if(m) m.classList.remove('hidden');
};

window.closeDeptLogModal = function() {
    const m = document.getElementById('dept-log-modal'); if(m) m.classList.add('hidden');
};

window.setDeptLogSubFilter = function(subType) {
    window.currentDeptLogSubFilter = subType || 'all';
    const buttons = document.querySelectorAll('#dept-log-sub-filters .dept-subfilter-btn');
    buttons.forEach(btn => {
        const isMatch = btn.dataset.subfilter === window.currentDeptLogSubFilter;
        if (isMatch) {
            btn.className = 'dept-subfilter-btn active-pill px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-blue-600 text-white shadow-sm';
        } else {
            btn.className = 'dept-subfilter-btn px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200';
        }
    });
    if (typeof window.renderDeptLogTimeline === 'function') {
        window.renderDeptLogTimeline();
    }
};

window._deptLogDaysCache = window._deptLogDaysCache || {};
window._deptLogReqSeq = 0;

window.getDeptActiveLogs = async function(targetDate) {
    const activeDate = window.currentLoadedDate || (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : new Date().toLocaleDateString('en-CA'));
    if (!targetDate || targetDate === activeDate) {
        return (typeof window.getOperationLog === 'function') ? window.getOperationLog() : ((typeof operationLog !== 'undefined' && Array.isArray(operationLog)) ? operationLog : []);
    }
    if (window._deptLogDaysCache && window._deptLogDaysCache[targetDate]) {
        return window._deptLogDaysCache[targetDate];
    }
    try {
        if (!window.currentUser || !window.currentUser.uid || !window.db || !window.doc || !window.getDoc) {
            return [];
        }
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
        const matchesCat = typeof window.isLogMatchingDepartment === 'function' 
            ? window.isLogMatchingDepartment(log, c) 
            : true;

        const matchesSub = typeof window.matchesDeptSubFilter === 'function' 
            ? window.matchesDeptSubFilter(log, subFilter, c) 
            : true;

        let matchesDate = true;
        if (dateFilter && !isPastDate) { 
            if (log.timestamp) {
                const cDate = typeof window.getCairoDateString === 'function' ? window.getCairoDateString(log.timestamp) : '';
                matchesDate = (cDate === dateFilter) || log.timestamp.includes(dateFilter);
            }
        }

        let matchesText = true;
        if (textFilter) {
            const type = (log.type || '');
            const details = (log.details || '');
            matchesText = (details.toLowerCase().includes(textFilter)) || (type.toLowerCase().includes(textFilter));
        }

        return matchesCat && matchesSub && matchesDate && matchesText;
    });

    const totalCount = filteredLogs.length;
    if (countBadge) countBadge.innerText = totalCount;
    if (headerCountBadge) headerCountBadge.innerText = totalCount;

    if (totalCount === 0) {
        const safeDate = typeof escapeHTML === 'function' ? escapeHTML(dateFilter) : dateFilter;
        const noDataTitle = isPastDate 
            ? `لا توجد حركات مسجلة لهذا القسم في أرشيف ${safeDate}` 
            : 'لا توجد حركات مسجلة تطابق التصفية';
        const noDataSub = isPastDate
            ? 'لم يُعثر على حركات خاصة بهذا القسم في هذا اليوم المؤرشف.'
            : 'يتم تسجيل جميع حركات إضافة البضائع، المشتريات، تعديل الكميات، وتتبع السيريالات تلقائياً هنا فور حدوثها.';
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 text-3xl mb-3 border border-slate-200 shadow-sm">
                    <i class="fas fa-boxes-stacked text-slate-300"></i>
                </div>
                <h3 class="text-base font-bold text-slate-700 mb-1">${noDataTitle}</h3>
                <p class="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">${noDataSub}</p>
                <button onclick="document.getElementById('dept-log-date-filter').value=''; document.getElementById('dept-log-text-filter').value=''; setDeptLogSubFilter('all');" 
                    class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold border border-blue-200 transition shadow-sm flex items-center gap-1.5">
                    <i class="fas fa-redo-alt"></i> ${isPastDate ? 'العودة لسجل اليوم الحالي' : 'إظهار كافة الحركات المسجلة'}
                </button>
            </div>`;
        return;
    }

    filteredLogs = [...filteredLogs].reverse();
    let html = '';
    if (isPastDate) {
        const safeDate = typeof escapeHTML === 'function' ? escapeHTML(dateFilter) : dateFilter;
        html += `<div class="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
            <span class="font-bold flex items-center gap-1.5"><i class="fas fa-history text-amber-600"></i> عرض سجلات مؤرشفة ليوم: ${safeDate}</span>
            <button onclick="document.getElementById('dept-log-date-filter').value=''; renderDeptLogTimeline();" class="text-amber-700 hover:text-amber-900 underline font-semibold">العودة لليوم الحالي</button>
        </div>`;
    }
    html += '<div class="space-y-3">';
    filteredLogs.forEach((log, index) => {
        const timeParts = log.timestamp ? log.timestamp.split(' - ') : ['', ''];
        const timeOnly = timeParts.length > 1 ? timeParts[1] : (log.timestamp ? new Date(log.timestamp).toLocaleTimeString('ar-EG') : '');
        const dateOnly = (typeof window.getCairoDateString === 'function' && log.timestamp ? window.getCairoDateString(log.timestamp) : null) || timeParts[0] || (log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-CA') : '');

        let highlightedDetails = typeof escapeHTML === 'function' ? escapeHTML(log.details || '') : (log.details || '');
        if (textFilter) {
            const safe = textFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(safe, 'gi');
            highlightedDetails = highlightedDetails.replace(regex, match => `<mark class="bg-yellow-200 text-yellow-900 font-bold px-1 rounded">${match}</mark>`);
        }

        const lType = (log.type || '');
        let cardBorder = 'border-slate-200';
        let badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
        let actionIcon = 'fa-info-circle';

        if (lType.includes('شراء') || lType.includes('إضافة') || lType.includes('توريد')) {
            cardBorder = 'border-emerald-200 hover:border-emerald-300';
            badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            actionIcon = 'fa-cart-plus';
        } else if (lType.includes('حذف') || lType.includes('مسح') || lType.includes('إلغاء')) {
            cardBorder = 'border-rose-200 hover:border-rose-300';
            badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
            actionIcon = 'fa-trash-alt';
        } else if (lType.includes('سيريال')) {
            cardBorder = 'border-purple-200 hover:border-purple-300';
            badgeBg = 'bg-purple-50 text-purple-800 border-purple-200';
            actionIcon = 'fa-barcode';
        } else if (lType.includes('تعديل') || lType.includes('تسوية')) {
            cardBorder = 'border-blue-200 hover:border-blue-300';
            badgeBg = 'bg-blue-50 text-blue-800 border-blue-200';
            actionIcon = 'fa-sliders-h';
        } else if (lType.includes('بيع') || lType.includes('فاتورة') || lType.includes('عربون')) {
            cardBorder = 'border-cyan-200 hover:border-cyan-300';
            badgeBg = 'bg-cyan-50 text-cyan-800 border-cyan-200';
            actionIcon = 'fa-receipt';
        }

        html += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border ${cardBorder} transition hover:shadow-md">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${badgeBg}">
                            <i class="fas ${actionIcon}"></i>
                            ${typeof escapeHTML === 'function' ? escapeHTML(lType) : lType}
                        </span>
                        <span class="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            #${log.id || (index + 1)}
                        </span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span class="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                            <i class="far fa-clock text-slate-400"></i> ${timeOnly || '-'}
                        </span>
                        <span class="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                            <i class="far fa-calendar-alt text-slate-400"></i> ${dateOnly || '-'}
                        </span>
                    </div>
                </div>
                <p class="text-sm text-slate-700 leading-relaxed font-medium m-0 pr-1">
                    ${highlightedDetails}
                </p>
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
        const matchesCat = typeof window.isLogMatchingDepartment === 'function' 
            ? window.isLogMatchingDepartment(log, c) 
            : true;

        const matchesSub = typeof window.matchesDeptSubFilter === 'function' 
            ? window.matchesDeptSubFilter(log, subFilter, c) 
            : true;

        let matchesDate = true;
        if (dateFilter && !isPastDate) { 
            if (log.timestamp) {
                const cDate = typeof window.getCairoDateString === 'function' ? window.getCairoDateString(log.timestamp) : '';
                matchesDate = (cDate === dateFilter) || log.timestamp.includes(dateFilter);
            }
        }

        let matchesText = true;
        if (textFilter) {
            const type = (log.type || '');
            const details = (log.details || '');
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
            if (parentDiv && parentDiv.style.display === 'flex') {
                parentDiv.appendChild(btn);
            } else if (header.style.display === 'flex' || header.classList.contains('flex')) {
                header.appendChild(btn);
            } else {
                const wrapper = document.createElement('div');
                wrapper.className = 'flex justify-between items-center w-full mb-4 border-b pb-2';
                parentDiv.insertBefore(wrapper, header);
                header.style.marginBottom = '0';
                wrapper.appendChild(header);
                btn.classList.remove('mr-auto');
                wrapper.appendChild(btn);
            }
        }
    });
}, 1500);
