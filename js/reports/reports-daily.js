function displaySalesReport(salesToDisplay) {
    if (!salesReportTableBody || !reportTotalSales || !reportTotalCost || !reportTotalProfit) return;

    // تصفية البيانات بأمان تام ضد القيم غير المعرفة
    const safeSales = Array.isArray(salesToDisplay) ? salesToDisplay : (Array.isArray(window.currentMonthlySalesData) ? window.currentMonthlySalesData : []);
    const searchTerm = reportSearchInput ? reportSearchInput.value.trim().toLowerCase() : "";
    const filteredSales = !searchTerm ? safeSales : safeSales.filter(sale => {
        const customerMatch = (sale.customerName || '').toLowerCase().includes(searchTerm);
        const invoiceNumberMatch = (sale.invoiceNumber || '').toLowerCase().includes(searchTerm);
        const itemMatch = (sale.items || []).some(item =>
            (item.name || '').toLowerCase().includes(searchTerm)
        );
        return customerMatch || itemMatch || invoiceNumberMatch;
    });

    let totalMonthSales = 0, totalMonthCost = 0, totalMonthProfit = 0;
    let tableHTML = '';

    if (filteredSales.length === 0) {
        tableHTML = `<tr><td colspan="7" class="text-center text-gray-500 py-8 font-medium">لا توجد بيانات للعرض.</td></tr>`;
    } else {
        filteredSales.forEach(sale => {
            // استخراج التاريخ الأصلي (تاريخ التسجيل الحقيقي وليس التأكيد)
            const rawDate = sale.createdAt || sale.timestamp || sale.saleDate;
            // تحويل أي صيغة إلى تاريخ محلي دقيق بتوقيت القاهرة
            let displayDateStr = '';
            let displayTimeStr = '';
            if (rawDate) {
                try {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                        displayDateStr = typeof getCairoDateString === 'function' ? getCairoDateString(d) : d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
                        displayTimeStr = d.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
                    }
                } catch(e) { console.warn("تنسيق تاريخ الفاتورة للتقرير:", e); }
            }
            // Fallback: لو rawDate نفسه YYYY-MM-DD بالفعل
            if (!displayDateStr && sale.saleDate) displayDateStr = sale.saleDate;
            const saleDateDisplay = formatDateForDisplay(displayDateStr);
            const timeDisplay = displayTimeStr;
            const customer = sale.customerName ? escapeHTML(sale.customerName) : '<span class="text-gray-400">نقدي</span>';
            
            // تنسيق البنود بشكل أنيق
            let itemsDesc = (sale.items || []).map(item => `
                <div style="font-size: 0.85rem; margin-bottom: 2px;">
                    <span style="font-weight:bold; color:#334155;">${item.quantity}x</span> ${escapeHTML(item.name)}
                    ${item.serial ? `<span style="font-size:0.7rem; color:#64748b; background:#f1f5f9; padding:0 4px; border-radius:4px;">${escapeHTML(item.serial)}</span>` : ''}
                </div>
            `).join('');

            const saleAmount = (Number(sale.grandTotal ?? sale.totalSellPrice) || 0) - (Number(sale.returnedAmount) || 0);
            const costAmount = (Number(sale.totalCost) || 0) - (Number(sale.returnedCost) || 0);
            const returnedProfit = (Number(sale.returnedAmount) || 0) - (Number(sale.returnedCost) || 0);
            const profitAmount = (Number(sale.profit) || 0) - returnedProfit;

            totalMonthSales += saleAmount;
            totalMonthCost += costAmount;
            totalMonthProfit += profitAmount;

            // تحديد نوع البادج (Badge)
            let badgeClass = 'badge-invoice';
            let typeName = 'فاتورة';
            if (sale.type === 'quick') { badgeClass = 'badge-quick'; typeName = 'سريع'; }
            else if (sale.type === 'invoice-from-pending') { badgeClass = 'badge-pending'; typeName = 'مؤكدة'; }

            // لون الربح
            const profitColor = profitAmount >= 0 ? '#16a34a' : '#dc2626';

            // �� إضافة زر الحذف (أيقونة سلة مهملات)
            tableHTML += `
                <tr>
                    <td>
                        <div style="font-weight:bold; color:#334155;">${saleDateDisplay}</div>
                        <div style="font-size:0.75rem; color:#94a3b8;">${timeDisplay}</div>
                        ${sale.invoiceNumber ? `<div style="font-size:0.7rem; color:#6366f1; margin-top:2px;">#${sale.invoiceNumber}</div>` : ''}
                    </td>
                    <td style="font-weight:500;">${customer}</td>
                    <td>${itemsDesc}</td>
                    <td class="text-center" style="font-family:monospace; font-weight:bold; font-size:1rem;">${formatCurrency(saleAmount)}</td>
                    <td class="text-center" style="font-family:monospace; color:#64748b;">${formatCurrency(costAmount)}</td>
                    <td class="text-center" style="font-family:monospace; font-weight:bold; color:${profitColor};">${formatCurrency(profitAmount)}</td>
                    <td class="text-center" style="display:flex; justify-content:center; align-items:center; gap:8px; height:100%; border:none;">
                        <button data-sale-id="${escapeHTML(sale.id)}" onclick="removeSaleFromReportOnly(this.dataset.saleId)" title="حذف من العرض فقط (بدون التأثير على المخزون أو الحسابات)" style="background:none; border:none; color:#eab308; cursor:pointer; padding:4px; border-radius:4px; transition: background 0.2s;" onmouseover="this.style.background='#fef08a'" onmouseout="this.style.background='none'">
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            </svg>
                        </button>
                        <button data-sale-id="${escapeHTML(sale.id)}" onclick="deleteSaleRecord(this.dataset.saleId)" title="حذف الفاتورة نهائياً وإرجاع البضاعة" style="background:none; border:none; color:#dc2626; cursor:pointer; padding:4px; border-radius:4px; transition: background 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'">
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    salesReportTableBody.innerHTML = tableHTML;
    
    // تحديث بطاقات الملخص بالأعلى
    reportTotalSales.textContent = formatCurrency(totalMonthSales);
    reportTotalCost.textContent = formatCurrency(totalMonthCost);
    reportTotalProfit.textContent = formatCurrency(totalMonthProfit);
    
    // تغيير لون بطاقة الربح حسب النتيجة
    const profitCardValue = document.querySelector('.stat-profit .stat-value');
    if(profitCardValue) profitCardValue.style.color = totalMonthProfit >= 0 ? '#047857' : '#dc2626';
}
// =======================================================
// ��️ دالة حذف الفاتورة من التقرير فقط (بدون التأثير على الأرصدة)
window.removeSaleFromReportOnly = async function(saleId) {
    if(!confirm("⚠️ سيتم حذف هذا السجل من العرض (السحابة والتقرير) ولن يتم تعديل المخزون أو الأرصدة.\nهل أنت متأكد؟")) return;

    try {
        if (window.db && window.currentUser) {
            const uid = window.currentUser.uid;
            try { window.deleteDoc(window.doc(window.db, "users", uid, "salesToday", saleId)); } catch(e) { console.warn("حذف salesToday:", e); }
            try { window.deleteDoc(window.doc(window.db, "users", uid, "sales", saleId)); } catch(e) { console.warn("حذف sales:", e); }
            try { 
                window.deleteDoc(window.doc(window.db, "users", uid, "invoices", saleId)); 
            } catch(e) {
                console.error("فشل حذف الفاتورة من السحابة:", e);
                alert("⚠️ تحذير: فشل حذف الفاتورة من السحابة (" + e.message + "). قد تظهر مرة أخرى لاحقًا في التقرير.");
            }
        }

        if (typeof salesToday !== 'undefined') {
            const idx = salesToday.findIndex(s => String(s.id) === String(saleId));
            if (idx > -1) salesToday.splice(idx, 1);
        }
        if (typeof invoices !== 'undefined') {
            const idx = invoices.findIndex(s => String(s.id) === String(saleId));
            if (idx > -1) invoices.splice(idx, 1);
        }
        if (typeof allSales !== 'undefined') {
            const idx = allSales.findIndex(s => String(s.id) === String(saleId));
            if (idx > -1) allSales.splice(idx, 1);
        }
        if (typeof salesHistory !== 'undefined') {
            const idx = salesHistory.findIndex(s => String(s.id) === String(saleId));
            if (idx > -1) salesHistory.splice(idx, 1);
        }
        if (typeof currentMonthlySalesData !== 'undefined') {
            const idx = currentMonthlySalesData.findIndex(s => String(s.id) === String(saleId));
            if (idx > -1) currentMonthlySalesData.splice(idx, 1);
        }

        if (typeof saveData === 'function') await saveData();
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error("hideSaleRecord save fail:", e));
        if (typeof generateMonthlySalesReport === 'function') await generateMonthlySalesReport();
        if (typeof showGlobalMessage === 'function') showGlobalMessage("تم حذف الفاتورة من العرض والسحابة بنجاح.");
    } catch (error) {
        console.error("خطأ أثناء الحذف العادي:", error);
    }
};

function parseAmountFromLogDetails(details) {
    // ★★★ السطر الجديد المضاف للإصلاح ★★★
    // يتحقق أولاً إذا كانت التفاصيل موجودة وهي نص قبل المتابعة
    if (typeof details !== 'string') return 0;

    // تبحث عن أي نمط مثل "بقيمة 100.50 جنيه" أو "سحب 50" أو "خصم 200"
    const match = details.match(/(?:بقيمة|سحب|خصم|مبلغ|بدفع)\s*([\d\.,]+)/);
    if (match && match[1]) {
        // تنظيف الرقم من الفواصل وتحويله
        return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0; // إذا لم تجد مبلغًا، ترجع صفرًا
}

window.deleteAllReportData = async function() {
    // 1. التحقق من وجود بيانات للحذف
    if (typeof currentMonthlySalesData === 'undefined' || currentMonthlySalesData.length === 0) {
        alert("لا توجد بيانات معروضة في التقرير لحذفها.");
        return;
    }

    if (window.SessionGuard && typeof window.SessionGuard.assertCanWrite === 'function') {
        const canWrite = await window.SessionGuard.assertCanWrite();
        if (!canWrite) return;
    }

    // 2. رسالة تحذير شديدة اللهجة
    const count = currentMonthlySalesData.length;
    const confirmMsg = `⚠️ تحذير خطير ⚠️\n\nأنت على وشك حذف (${count}) فاتورة ظاهرة في التقرير نهائياً.\n\nسيتم حذفها من السحابة ومن جهازك، ولن يمكنك استرجاعها.\n\nهل أنت متأكد تماماً؟`;
    
    if (!confirm(confirmMsg)) return;

    // تأكيد ثاني للأمان
    if (!confirm("تأكيد أخير: هل أنت متأكد من الحذف النهائي؟")) return;

    if (window.SaveGuard && typeof window.SaveGuard.allowShrinkOnce === 'function') {
        window.SaveGuard.allowShrinkOnce();
    }

    const msgEl = document.getElementById('report-message');
    if (msgEl) showMessage(msgEl, "جاري حذف البيانات من السحابة...", false, true);

    const userId = window.currentUser ? window.currentUser.uid : null;
    let deletedCount = 0;

    try {
        // 3. بدء عملية الحذف
        const deletePromises = currentMonthlySalesData.map(async (sale) => {
            // أ. الحذف من السحابة
            if (userId) {
                try {
                    window.deleteDoc(window.doc(window.db, "users", userId, "invoices", sale.id));
                } catch (e) {
                    console.error(`فشل حذف الفاتورة ${sale.id} من السحابة:`, e);
                }
            }

            // ب. الحذف من الذاكرة المحلية (salesToday)
            if (typeof salesToday !== 'undefined') {
                const localIndex = salesToday.findIndex(s => s.id === sale.id);
                if (localIndex !== -1) {
                    salesToday.splice(localIndex, 1);
                }
            }
            
            deletedCount++;
        });

        // انتظار اكتمال الحذف
        await Promise.all(deletePromises);

        // 4. حفظ التغييرات المحلية (لإزالة الفواتير من ملف اليوم)
        if (typeof saveSystemToCloud === 'function') {
            await saveSystemToCloud();
        }

        // 5. تنظيف الواجهة
        currentMonthlySalesData = [];
        const tableBody = document.getElementById('sales-report-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-red-500 py-8" style="padding: 3rem;">
                        <i class="fas fa-trash-alt fa-2x mb-2" style="display:block; opacity:0.5;"></i>
                        تم حذف ${deletedCount} فاتورة نهائياً.
                    </td>
                </tr>`;
        }

        // تصفير الأرقام
        const zeroFmt = (typeof formatCurrency === 'function') ? formatCurrency(0) : "0.00";
        if (typeof reportTotalSales !== 'undefined' && reportTotalSales) reportTotalSales.textContent = zeroFmt;
        if (typeof reportTotalCost !== 'undefined' && reportTotalCost) reportTotalCost.textContent = zeroFmt;
        if (typeof reportTotalProfit !== 'undefined' && reportTotalProfit) reportTotalProfit.textContent = zeroFmt;

        if (msgEl) showMessage(msgEl, "تمت عملية الحذف بنجاح.", false);

    } catch (error) {
        console.error("Error deleting report data:", error);
        alert("حدث خطأ أثناء الحذف.");
    }
};

