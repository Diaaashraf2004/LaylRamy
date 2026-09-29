// finance-dept-logs.js
// Logic for displaying Department Logs (Section Logs)

window.currentDeptLogCategory = '';

window.openDeptLogModal = function(category, title, subtitle, iconClass) {
    window.currentDeptLogCategory = category;
    const t = document.getElementById('dept-log-title'); if(t) t.innerText = title || 'سجل القسم';
    const s = document.getElementById('dept-log-subtitle'); if(s) s.innerText = subtitle || 'تتبع العمليات';
    const i = document.getElementById('dept-log-icon'); if(i) i.className = iconClass || 'fas fa-list-alt';
    const d = document.getElementById('dept-log-date-filter'); if(d) d.value = '';
    
    if(typeof window.renderDeptLogTimeline === 'function') window.renderDeptLogTimeline();
    
    const m = document.getElementById('dept-log-modal'); if(m) m.classList.remove('hidden');
};

window.closeDeptLogModal = function() {
    const m = document.getElementById('dept-log-modal'); if(m) m.classList.add('hidden');
};

window.renderDeptLogTimeline = function() {
    const container = document.getElementById('dept-log-timeline-container');
    const countBadge = document.getElementById('dept-log-count');
    const filterEl = document.getElementById('dept-log-date-filter');
    const textFilterEl = document.getElementById('dept-log-text-filter');
    const dateFilter = filterEl ? filterEl.value : '';
    const textFilter = textFilterEl ? textFilterEl.value.toLowerCase().trim() : '';
    
    if (!container) return;
    
    let logs = (typeof window.getOperationLog === 'function') ? window.getOperationLog() : [];
    
    let filteredLogs = logs.filter(log => {
        let matchesCat = false;
        let c = window.currentDeptLogCategory;
        let type = log.type || '';
        
        if (c === 'treasury') matchesCat = type.includes('خزينة') || type.includes('إيراد') || type.includes('مصروف') || type.includes('تحويل') || type.includes('سيولة');
        else if (c === 'sales') matchesCat = type.includes('بيع') || type.includes('مبيعات');
        else if (c === 'purchases') matchesCat = type.includes('شراء') || type.includes('مورد');
        else if (c === 'debts') matchesCat = type.includes('دين') || type.includes('سداد') || type.includes('استلام');
        else if (c === 'liabilities') matchesCat = type.includes('التزام') || type.includes('دائن');
        else if (c === 'products') matchesCat = type.includes('منتج') || type.includes('مخزون') || type.includes('بضاعة');
        else if (c === 'expenses') matchesCat = type.includes('مصروف');
        else if (c === 'returns') matchesCat = type.includes('مرتجع');
        else matchesCat = type.includes(c);
        
        let matchesDate = true;
        if (dateFilter) { matchesDate = log.timestamp && log.timestamp.includes(dateFilter); }
        
        let matchesText = true;
        if (textFilter) {
             let details = (log.details || '').toLowerCase();
             let ltype = (log.type || '').toLowerCase();
             matchesText = details.includes(textFilter) || ltype.includes(textFilter);
        }
        
        return matchesCat && matchesDate && matchesText;
    });
    
    if (countBadge) countBadge.innerText = filteredLogs.length;
    
    if (filteredLogs.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-8"><i class="fas fa-inbox text-4xl mb-3 opacity-50"></i><p>لا توجد عمليات مطابقة</p></div>';
        return;
    }
    
    filteredLogs = [...filteredLogs].reverse();
    let html = '<div class="relative border-r-2 border-blue-200 pr-4 mr-2 space-y-6">';
    filteredLogs.forEach(log => {
        const timeParts = log.timestamp ? log.timestamp.split(' - ') : ['',''];
        const timeOnly = timeParts.length > 1 ? timeParts[1] : log.timestamp;
        const dateOnly = timeParts[0];
        
        let highlightedDetails = log.details;
        if (textFilter) {
            const regex = new RegExp(textFilter, 'gi');
            highlightedDetails = log.details.replace(regex, match => `<span class="bg-yellow-200 text-yellow-900 font-bold px-1 rounded">${match}</span>`);
        }
        
        html += `<div class="relative">
                <div class="absolute -right-6 top-1 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow"></div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-bold text-blue-700 text-sm">${log.type}</span>
                        <span class="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">${timeOnly}</span>
                    </div>
                    <p class="text-slate-600 text-sm m-0">${highlightedDetails}</p>
                    <div class="text-xs text-slate-400 mt-2"><i class="far fa-calendar-alt ml-1"></i>${dateOnly}</div>
                </div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
};


// Inject buttons dynamically into the UI safely
setInterval(() => {
    const configs = [
        { id: 'treasury', section: '#liquidity-section h2', title: 'سجل الخزينة', sub: 'تتبع الحركات المالية', icon: 'fas fa-wallet', color: 'indigo' },
        { id: 'products', section: '#inventory-section h2', title: 'سجل المخزون', sub: 'تتبع المنتجات', icon: 'fas fa-boxes', color: 'blue' },
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
            btn.innerHTML = `<i class="fas fa-list-alt"></i> ${cfg.title}`;
            btn.onclick = () => window.openDeptLogModal(cfg.id, cfg.title, cfg.sub, cfg.icon);
            
            const parentDiv = header.parentElement;
            if (parentDiv && parentDiv.style.display === 'flex') {
                parentDiv.appendChild(btn);
            } else if (header.style.display === 'flex' || header.classList.contains('flex')) {
                header.appendChild(btn);
            } else {
                // نلف العنوان والزر في ديف مرن
                const wrapper = document.createElement('div');
                wrapper.className = 'flex justify-between items-center w-full mb-4 border-b pb-2';
                parentDiv.insertBefore(wrapper, header);
                header.style.marginBottom = '0';
                wrapper.appendChild(header);
                btn.classList.remove('mr-auto'); // لا نحتاجه في الفليكس هنا
                wrapper.appendChild(btn);
            }
        }
    });
}, 1500);
