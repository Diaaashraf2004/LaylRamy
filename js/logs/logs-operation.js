// finance-core-logs.js - Logs, Backups, and State Loading
var currentLogCategory = window.currentLogCategory || 'all';
function formatLogTime(isoString) {
    if (!isoString) return { date: '', time: '' };
    try {
        const date = new Date(isoString);
        const formattedDate = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
        return { date: formattedDate, time: formattedTime };
    } catch (e) {
        return { date: isoString, time: '' };
    }
}

function getLogBadge(type) {
    if (type.includes("إلغاء") || type.includes("حذف")) {
        return { style: "bg-rose-50 text-rose-700 border-rose-200", icon: "fa-trash-alt text-rose-600" };
    } else if (type.includes("عربون")) {
        return { style: "bg-purple-50 text-purple-700 border-purple-200", icon: "fa-hand-holding-dollar text-purple-600" };
    } else if (type.includes("بيع مؤقت") || type.includes("مؤقتة")) {
        return { style: "bg-amber-50 text-amber-700 border-amber-200", icon: "fa-clock text-amber-600" };
    } else if (type.includes("بيع") || type.includes("مبيعات") || type.includes("فاتورة") || type.includes("إيراد") || type.includes("تسديد")) {
        return { style: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "fa-cart-shopping text-emerald-600" };
    } else if (type.includes("تحويل")) {
        return { style: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "fa-right-left text-indigo-600" };
    } else if (type.includes("ترحيل")) {
        return { style: "bg-amber-50 text-amber-700 border-amber-200", icon: "fa-rotate text-amber-600" };
    } else if (type.includes("مصروف") || type.includes("سحب") || type.includes("شراء")) {
        return { style: "bg-rose-50 text-rose-700 border-rose-200", icon: "fa-minus-circle text-rose-600" };
    } else if (type.includes("دين") || type.includes("مورد")) {
        return { style: "bg-orange-50 text-orange-700 border-orange-200", icon: "fa-handshake text-orange-600" };
    } else {
        return { style: "bg-blue-50 text-blue-700 border-blue-200", icon: "fa-info-circle text-blue-600" };
    }
}

function setLogCategory(category) {
    currentLogCategory = category;
    document.querySelectorAll(".cat-tab").forEach(tab => {
        tab.classList.remove("active", "bg-blue-600", "text-white", "shadow-sm");
        tab.classList.add("bg-slate-100", "text-slate-600");
    });

    const activeTab = document.getElementById(`cat-${category === 'all' ? 'all' : category === 'بيع' ? 'sale' : category === 'مصروف' ? 'expense' : category === 'دين' ? 'debt' : 'add'}`);
    if (activeTab) {
        activeTab.classList.add("active", "bg-blue-600", "text-white", "shadow-sm");
        activeTab.classList.remove("bg-slate-100", "text-slate-600");
    }
    updateLogDisplay();
}

function updateLogStats(filteredLogs) {
    const total = operationLog.length;
    const sales = operationLog.filter(l => ((l.type.includes("بيع") || l.type.includes("مبيعات") || (l.type.includes("فاتورة") && !l.type.includes("شراء") && !l.type.includes("مورد")) || l.type.includes("عربون")) && !l.type.includes("مرتجع"))).length;
    const debts = operationLog.filter(l => l.type.includes("دين") || l.type.includes("مورد")).length;
    const expenses = operationLog.filter(l => l.type.includes("مصروف") || l.type.includes("سحب")).length;
    
    if (document.getElementById("stat-total")) document.getElementById("stat-total").innerText = total;
    if (document.getElementById("stat-sales")) document.getElementById("stat-sales").innerText = sales;
    if (document.getElementById("stat-debts")) document.getElementById("stat-debts").innerText = debts;
    if (document.getElementById("stat-expenses")) document.getElementById("stat-expenses").innerText = expenses;
    
    if (document.getElementById("visible-count")) document.getElementById("visible-count").innerText = filteredLogs.length;
    if (document.getElementById("total-count")) document.getElementById("total-count").innerText = total;

    if (document.getElementById("badge-all")) document.getElementById("badge-all").innerText = total;
    if (document.getElementById("badge-sale")) document.getElementById("badge-sale").innerText = sales;
    if (document.getElementById("badge-expense")) document.getElementById("badge-expense").innerText = expenses;
    if (document.getElementById("badge-debt")) document.getElementById("badge-debt").innerText = debts;
    if (document.getElementById("badge-add")) document.getElementById("badge-add").innerText = operationLog.filter(l => l.type.includes("إضافة")).length;
}

function updateLogDisplay() {
    const tableBody = document.getElementById("operation-log-table-body");
    const emptyState = document.getElementById("empty-state");
    const searchInput = document.getElementById("log-search-input2");
    
    if (!tableBody) return;
    
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const clearBtn = document.getElementById("clear-search-btn");
    if (clearBtn) {
        if (searchVal) clearBtn.classList.remove("hidden");
        else clearBtn.classList.add("hidden");
    }

    const filteredLogs = [...operationLog].reverse().filter(log => {
        const matchesSearch = !searchVal || log.details.toLowerCase().includes(searchVal) || log.type.toLowerCase().includes(searchVal);
        const matchesType = currentLogCategory === "all" || 
            (currentLogCategory === "بيع" 
                ? (((log.type.includes("بيع") || log.type.includes("مبيعات") || (log.type.includes("فاتورة") && !log.type.includes("شراء") && !log.type.includes("مورد")) || log.type.includes("عربون")) && !log.type.includes("مرتجع"))) 
                : log.type.includes(currentLogCategory));
        return matchesSearch && matchesType;
    });

    updateLogStats(filteredLogs);

    if (filteredLogs.length === 0) {
        tableBody.innerHTML = "";
        if (emptyState) emptyState.classList.remove("hidden");
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");

    tableBody.innerHTML = filteredLogs.map((log, index) => {
        const timeObj = formatLogTime(log.timestamp);
        const badge = getLogBadge(log.type);
        const logId = operationLog.length - index; // simple reverse id logic

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="px-4 py-3.5 text-center font-mono text-slate-400 text-xs font-semibold">${logId}</td>
                <td class="px-4 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                    <div class="font-semibold text-slate-800">${timeObj.date}</div>
                    <div class="text-[11px] text-slate-400 font-mono mt-0.5">${timeObj.time}</div>
                </td>
                <td class="px-4 py-3.5 align-middle">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${badge.style}">
                        <i class="fas ${badge.icon}"></i>
                        <span>${typeof escapeHTML === 'function' ? escapeHTML(log.type) : (window.escapeHTML ? window.escapeHTML(log.type) : log.type)}</span>
                    </span>
                </td>
                <td class="px-4 py-3.5 text-slate-700 font-semibold leading-relaxed">${typeof escapeHTML === 'function' ? escapeHTML(log.details) : (window.escapeHTML ? window.escapeHTML(log.details) : log.details)}</td>
                <td class="px-4 py-3.5 text-center">
                    <button onclick="openDetailModal(${index})" class="text-xs bg-slate-100 hover:bg-slate-200/80 text-slate-600 p-2 px-3 rounded-lg transition-all font-bold">
                        <i class="fas fa-eye text-blue-600"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openDetailModal(filteredIndex) {
    const searchInput = document.getElementById("log-search-input2");
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filteredLogs = [...operationLog].reverse().filter(log => {
        const matchesSearch = !searchVal || log.details.toLowerCase().includes(searchVal) || log.type.toLowerCase().includes(searchVal);
        const matchesType = currentLogCategory === "all" || log.type.includes(currentLogCategory);
        return matchesSearch && matchesType;
    });

    const log = filteredLogs[filteredIndex];
    if (!log) return;

    const timeObj = formatLogTime(log.timestamp);
    const badge = getLogBadge(log.type);
    const logId = operationLog.length - filteredIndex;

    document.getElementById("modal-ref-id").innerText = `#LOG-${logId}`;
    document.getElementById("modal-time").innerText = `${timeObj.date} - ${timeObj.time}`;
    document.getElementById("modal-details").innerText = log.details;

    const iconBox = document.getElementById("modal-type-icon");
    iconBox.className = `w-8 h-8 rounded-xl flex items-center justify-center text-sm border ${badge.style}`;
    iconBox.innerHTML = `<i class="fas ${badge.icon}"></i>`;

    document.getElementById("modal-badge").innerHTML = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${badge.style}">
            <span>${log.type}</span>
        </span>
    `;

    const modal = document.getElementById("detail-modal");
    if(modal) {
        modal.classList.remove("hidden");
    }
}

function closeDetailModal() {
    const modal = document.getElementById("detail-modal");
    if(modal) {
        modal.classList.add("hidden");
    }
}

function openClearLogModal() {
    const modal = document.getElementById("clear-modal");
    if(modal) {
        modal.classList.remove("hidden");
    }
}

function closeClearLogModal() {
    const modal = document.getElementById("clear-modal");
    if(modal) {
        modal.classList.add("hidden");
    }
}

function clearLogConfirm() {
    operationLog = [];
    updateLogDisplay();
    closeClearLogModal();
    const banner = document.getElementById("status-banner");
    if(banner) {
        banner.className = "px-4 py-2.5 text-xs font-semibold text-center border-t transition-opacity duration-300 bg-rose-50 text-rose-700 border-rose-200";
        banner.innerText = "تم مسح السجل بنجاح.";
        banner.classList.remove("hidden");
        setTimeout(() => banner.classList.add("hidden"), 3000);
    }
}

// Expose these functions to the global window scope since they are referenced by HTML onclick attributes
// and this entire block is wrapped in a DOMContentLoaded listener.
window.setLogCategory = setLogCategory;
window.updateLogDisplay = updateLogDisplay;
window.exportCSVLog = exportCSVLog;
window.openDetailModal = openDetailModal;
window.closeDetailModal = closeDetailModal;
window.openClearLogModal = openClearLogModal;
window.closeClearLogModal = closeClearLogModal;
window.clearLogConfirm = clearLogConfirm;

function exportCSVLog() {
    if (operationLog.length === 0) return;
    let csvContent = "\\uFEFF#;الوقت والتاريخ;نوع العملية;التفاصيل\\n";
    [...operationLog].reverse().forEach((log, index) => {
        const timeObj = formatLogTime(log.timestamp);
        const logId = operationLog.length - index;
        csvContent += `"${logId}";"${timeObj.date} ${timeObj.time}";"${log.type}";"${log.details.replace(/"/g, '""')}"\\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_العمليات_${typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
