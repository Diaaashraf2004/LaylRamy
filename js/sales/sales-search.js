window.deleteSaleRecord = async function(saleId) {
    if(!confirm("هل أنت متأكد من حذف هذه المبيعة؟ سيتم إرجاع المنتجات إلى المخزن.")) return;

    let sale = null;
    if (typeof salesToday !== 'undefined') sale = salesToday.find(s => String(s.id) === String(saleId));
    if (!sale && typeof invoices !== 'undefined') sale = invoices.find(s => String(s.id) === String(saleId));
    if (!sale && typeof allSales !== 'undefined') sale = allSales.find(s => String(s.id) === String(saleId));
    if (!sale && typeof salesHistory !== 'undefined') sale = salesHistory.find(s => String(s.id) === String(saleId));

    if (!sale) {
        try {
            if (window.db && window.currentUser) {
                const uid = window.currentUser.uid;
                const docSnap = await window.getDoc(window.doc(window.db, "users", uid, "invoices", saleId));
                if (docSnap.exists()) sale = docSnap.data();
            }
        } catch (e) {
            console.warn("فشل جلب الفاتورة من Firestore داخل deleteSaleRecord:", e);
        }
    }

    if (!sale) {
        alert("خطأ: لم يتم العثور على الفاتورة في السجلات.");
        return;
    }

    // Prepare refund amount
    const refundAmount = sale.paidAmount !== undefined ? Number(sale.paidAmount) : Number(sale.grandTotal || sale.totalSellPrice || 0);
    
    // Check if modal exists
    const modal = document.getElementById('refundModal');
    if (modal && refundAmount > 0) {
        document.getElementById('refund_info_text').textContent = `قيمة الفاتورة المستردة: ${typeof formatCurrency === 'function' ? formatCurrency(refundAmount) : refundAmount}`;
        document.getElementById('refund_pending_id').value = saleId;
        document.getElementById('refund_amount_val').value = refundAmount;
        
        const accountSelect = document.getElementById('refund_account_select');
        accountSelect.innerHTML = '';
        
        // Add Safe option
        if (typeof accounts !== 'undefined') {
            accounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                opt.textContent = `خصم من: ${acc.name}`;
                accountSelect.appendChild(opt);
            });
        }
        
        // Add Liability option
        const liabilityOpt = document.createElement('option');
        liabilityOpt.value = 'LIABILITY';
        liabilityOpt.textContent = 'تسجيل كدين التزام (إضافة للديون)';
        accountSelect.appendChild(liabilityOpt);
        
        // Custom logic for the modal button
        const oldBtn = document.querySelector('#refundModal .btn-save');
        const confirmBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(confirmBtn, oldBtn);
        confirmBtn.onclick = async function() {
            modal.style.display = 'none';
            const selectedAccount = document.getElementById('refund_account_select').value;
            await processSaleDeletion(sale, selectedAccount, refundAmount);
        };
        
        modal.style.display = 'flex';
    } else {
        // Fallback or 0 amount
        await processSaleDeletion(sale, null, 0);
    }
};

window.processSaleDeletion = async function(sale, selectedAccount, refundAmount) {
    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    
    const saleId = sale.id;
    let itemsToReturn = sale.mainProduct ? [sale.mainProduct, ...(Array.isArray(sale.additionalItems) ? sale.additionalItems : [])]
        : (Array.isArray(sale.items) ? sale.items : (sale.invoiceData && Array.isArray(sale.invoiceData.items) ? sale.invoiceData.items : []));
    if (sale.deductedItems && Array.isArray(sale.deductedItems)) itemsToReturn.push(...sale.deductedItems);
    else if (sale.invoiceData && Array.isArray(sale.invoiceData.deductedItems)) itemsToReturn.push(...sale.invoiceData.deductedItems);
    
    const restoreItemSerials = (it) => {
        if (!it || typeof serialNumbersLog === 'undefined' || !Array.isArray(serialNumbersLog)) return;
        const collected = [];
        if (it.serial) collected.push(it.serial);
        if (it.serialNumber && !collected.includes(it.serialNumber)) collected.push(it.serialNumber);
        if (Array.isArray(it.serials)) it.serials.forEach(s => { if (s && !collected.includes(s)) collected.push(s); });
        if (Array.isArray(it.serialNumbers)) it.serialNumbers.forEach(s => { if (s && !collected.includes(s)) collected.push(s); });
        if (typeof it.name === 'string' && it.name.includes('(S/N:')) {
            const match = it.name.match(/\(S\/N:\s*([^)]+)\)/);
            if (match && match[1]) {
                const sn = match[1].trim();
                if (sn && !collected.includes(sn)) collected.push(sn);
            }
        }
        collected.forEach(sn => {
            const sLog = serialNumbersLog.find(l => l.serial === sn);
            if (sLog) sLog.status = 'in_stock';
        });
    };

    itemsToReturn = itemsToReturn.filter(Boolean);
    itemsToReturn.forEach(item => {
        if (!item || !item.name) return;
        const cleanName = String(item.name).split(' (S/N:')[0].trim().toLowerCase();
        let productIndex = item.id ? products.findIndex(p => String(p.id) === String(item.id)) : -1;
        if (productIndex === -1) productIndex = products.findIndex(p => String(p.name).trim().toLowerCase() === cleanName);
        const returnedQty = Number(item.quantity) || 1;
        
        if (productIndex !== -1) {
            products[productIndex].quantity = Number(products[productIndex].quantity || 0) + returnedQty;
            restoreItemSerials(item);
        } else {
            products.push({
                id: item.id || generateId('P'),
                name: String(item.name).split(' (S/N:')[0].trim(),
                quantity: returnedQty,
                costPrice: Number(item.costPrice || item.cost || 0) || 0,
                supplierId: item.supplierId || "",
                category: item.category || "عام"
            });
            restoreItemSerials(item);
        }
    });

    if (refundAmount > 0) {
        if (selectedAccount === 'LIABILITY') {
            // Add to debts (liability)
            const liabilityObj = {
                id: "debt-" + Date.now(),
                name: sale.customerName || "عميل غير معروف",
                amount: refundAmount,
                date: typeof getTodayDateString === 'function' ? getTodayDateString() : new Date().toISOString(),
                type: "liability",
                note: "مرتجع فاتورة " + (sale.invoiceNumber || saleId)
            };
            if (typeof liabilities !== 'undefined') liabilities.push(liabilityObj);
        } else {
            // Deduct from safe
            const accId = selectedAccount || (accounts.length > 0 ? accounts[0].id : 'main');
            const acc = accounts.find(a => String(a.id) === String(accId));
            if (acc) {
                acc.balance = Number(acc.balance) - refundAmount;
                const newTotalLiquidity = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
                liquidityLog.push({
                    id: generateId("liq-delete"),
                    timestamp: new Date().toISOString(),
                    type: "remove",
                    amount: refundAmount,
                    description: `مرتجع فاتورة للعميل ${sale.customerName || '-'} - الفاتورة: ${sale.invoiceNumber || ''}`,
                    accountId: acc.id,
                    currentBalance: newTotalLiquidity
                });
            }
        }
    }

    const saleProfit = Number(sale.profit !== undefined ? sale.profit : (sale.totalSellPrice - (sale.totalCost || 0)));
    const activeDate = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) ? currentLoadedDate : (typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })));
    const saleDateStr = sale.saleDate || (sale.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(sale.timestamp) : new Date(sale.timestamp).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : '');
    const isTodaySale = (saleDateStr === activeDate) || (typeof salesToday !== 'undefined' && salesToday.some(s => String(s.id) === String(saleId)));
    if (isTodaySale && typeof totalProfit !== 'undefined') {
        totalProfit = window.money(totalProfit - saleProfit);
    }

    if (sale.invoiceNumber && typeof pendingReturns !== 'undefined') {
        const retIdx = pendingReturns.findIndex(r => r.fromInvoice === sale.invoiceNumber);
        if (retIdx > -1) pendingReturns.splice(retIdx, 1);
    }

    if (window.db && window.currentUser) {
        const uid = window.currentUser.uid;
        try { window.deleteDoc(window.doc(window.db, "users", uid, "sales", saleId)); } catch(e) { console.warn("تعذر حذف سجل البيع:", e); }
        try { window.deleteDoc(window.doc(window.db, "users", uid, "invoices", saleId)); } catch(e) { console.warn("تعذر حذف الفاتورة:", e); }
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

    if (typeof debtors !== 'undefined' && Array.isArray(debtors)) {
        const invoiceRef = String(sale.invoiceNumber || sale.id || '').trim();
        if (invoiceRef) {
            for (let i = debtors.length - 1; i >= 0; i--) {
                const d = debtors[i];
                if ((d.linkedInvoice && String(d.linkedInvoice).trim() === invoiceRef) ||
                    (d.saleId && String(d.saleId).trim() === String(sale.id)) ||
                    (d.invoiceNumber && String(d.invoiceNumber).trim() === invoiceRef)) {
                    debtors.splice(i, 1);
                }
            }
        }
    }

    if (typeof logOperation === 'function') {
        const cust = sale.customerName || 'عميل نقدي';
        const inv = sale.invoiceNumber ? `(فاتورة: ${sale.invoiceNumber})` : '';
        const refundTxt = (refundAmount > 0) ? ` مع رد مبلغ ${formatCurrency(refundAmount)}` : '';
        logOperation("حذف عملية بيع", `تم حذف عملية البيع للعميل "${cust}" ${inv}${refundTxt} وإرجاع الأصناف للمخزن.`);
    }

    if (typeof saveData === 'function') await saveData();
    if (typeof saveSystemToCloud === 'function') saveSystemToCloud();
    if (typeof updateUI === 'function') updateUI();
    
    if (typeof showGlobalMessage === 'function') {
        showGlobalMessage("تم حذف المبيعة وإرجاع المنتجات بنجاح.");
    } else {
        alert("تم حذف المبيعة بنجاح.");
    }
};

window.performDirectSearch = async function performDirectSearch() {
    if (!reportMonthYearInput || !reportMessage || !reportSearchInput || !window.currentUser) return;
    const yearMonth = reportMonthYearInput.value;
    const searchTerm = reportSearchInput.value.trim().toLowerCase();
    if (!yearMonth) { showMessage(reportMessage, "يرجى اختيار الشهر للبحث فيه.", true); return; }
    if (!searchTerm) { showMessage(reportMessage, "يرجى كتابة ما تريد البحث عنه أولاً.", true); return; }
    showMessage(reportMessage, `جاري البحث المباشر عن "${searchTerm}" في شهر ${yearMonth}...`, false, true);
    displaySalesReport([]); // عرض جدول فارغ مبدئيًا

    try {
        // بما أن جلب كل بيانات الشهر أصبح سريعًا، سنقوم بجلبها كلها ثم التصفية محليًا
        // هذا أسرع وأكثر مرونة من عمل استعلامات معقدة
        const userId = window.currentUser.uid;
        const [year, month] = yearMonth.split('-');
        
        const startDate = `${yearMonth}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

        const invoicesColRef = window.collection(window.db, "users", userId, "invoices");
        const q = window.query(invoicesColRef, 
            window.where("saleDate", ">=", startDate), 
            window.where("saleDate", "<=", endDate)
        );

        const querySnapshot = await window.getDocs(q);
        
        let allMonthSales = [];
        querySnapshot.forEach((doc) => {
            allMonthSales.push(doc.data());
        });

        // الآن نقوم بالتصفية على البيانات التي تم جلبها بسرعة
        const matchedSales = allMonthSales.filter(sale => {
            const customerMatch = (sale.customerName || '').toLowerCase().includes(searchTerm);
            const invoiceNumberMatch = (sale.invoiceNumber || '').toLowerCase().includes(searchTerm);
            const itemMatch = (sale.items || []).some(item => (item.name || '').toLowerCase().includes(searchTerm));
            return customerMatch || itemMatch || invoiceNumberMatch;
        });

        if (matchedSales.length === 0) {
            showMessage(reportMessage, `لم يتم العثور على نتائج للبحث المباشر.`, false, true);
            return;
        }

        matchedSales.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        currentMonthlySalesData = matchedSales; // نخزن نتائج البحث فقط
        displaySalesReport(currentMonthlySalesData);
        
        showMessage(reportMessage, `تم العثور على ${matchedSales.length} نتيجة للبحث المباشر.`, false);

    } catch (error) {
        console.error("Error during direct search: ", error);
        showMessage(reportMessage, "حدث خطأ أثناء البحث. راجع الـ Console.", true);
    }
}

function searchInvoiceByName() {
                if (!searchCustomerNameInput || !searchResultsListContainer || !searchMessageContainer) return;
                const searchTerm = searchCustomerNameInput.value.trim().toLowerCase();
                 showMessage(searchMessageContainer, ""); // Clear previous messages

                if (!searchTerm) {
                    showMessage(searchMessageContainer, "يرجى إدخال اسم العميل للبحث.", true);
                    searchResultsListContainer.innerHTML = '<p class="text-center text-gray-500">أدخل اسم العميل.</p>';
                    return;
                }
                 console.log(`Searching for customer name: ${searchTerm} in salesToday:`, salesToday);
                // Search within the currently loaded day's sales (case-insensitive partial match)
                const results = salesToday.filter(sale => sale.customerName && sale.customerName.toLowerCase().includes(searchTerm));
                displaySearchResults(results);
            }

function displaySearchResults(results) {
    if (!searchResultsListContainer || !searchMessageContainer) return;
    window.lastSearchResults = Array.isArray(results) ? results : [];
    if (!results || results.length === 0) {
        searchResultsListContainer.innerHTML = '<p class="text-center text-slate-400 py-6">لم يتم العثور على فواتير مطابقة.</p>';
        showMessage(searchMessageContainer, "لم يتم العثور على نتائج.", false, true);
        return;
    }
    searchResultsListContainer.innerHTML = `<div class="space-y-3">${results.map((sale, idx) => {
        const invNum = escapeHTML(sale.invoiceNumber || sale.id || 'N/A');
        const dt = (typeof formatDateTime === 'function') ? formatDateTime(sale.timestamp) : (sale.timestamp || '');
        const cust = escapeHTML(sale.customerName || 'عميل نقدي');
        const total = (typeof formatCurrency === 'function') ? formatCurrency(sale.grandTotal || sale.totalSellPrice || 0) : (sale.grandTotal || 0);
        const profit = (typeof formatCurrency === 'function') ? formatCurrency(sale.profit || sale.potentialProfit || 0) : 0;
        const cost = (typeof formatCurrency === 'function') ? formatCurrency(sale.totalCost || 0) : 0;
        const hasDeductions = (sale.deductedItems && sale.deductedItems.length > 0) || (Number(sale.deductionAmount) > 0);
        const dedAmt = hasDeductions ? ((typeof formatCurrency === 'function') ? formatCurrency(sale.deductionAmount || 0) : sale.deductionAmount) : null;
        return `<div class="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div class="space-y-1 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="bg-indigo-50 text-indigo-700 font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border border-indigo-100">#${invNum}</span>
                    <span class="text-xs text-slate-400">${dt}</span>
                    ${hasDeductions ? `<span class="bg-amber-50 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-200">تكاليف إضافية: ${dedAmt}</span>` : ''}
                </div>
                <div class="text-sm font-bold text-slate-800 flex items-center gap-1.5"><i class="fas fa-user-circle text-slate-400"></i> ${cust}</div>
                <div class="flex items-center gap-3 text-xs flex-wrap pt-0.5">
                    <span class="text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">التكلفة: <strong class="text-rose-600 font-mono">${cost}</strong></span>
                    <span class="text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">صافي الربح: <strong class="text-emerald-600 font-mono">${profit}</strong></span>
                </div>
            </div>
            <div class="flex flex-row md:flex-col items-end justify-between w-full md:w-auto gap-2 border-t md:border-t-0 pt-2 md:pt-0">
                <div class="font-black text-slate-900 text-lg font-mono">${total}</div>
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="window.viewSearchInvoiceByIndex(${idx})" data-invoice-id="${sale.id || invNum}" class="view-invoice-details-btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-colors"><i class="fas fa-eye"></i> تفاصيل الفاتورة</button>
                    <button type="button" onclick="window.printCustomerInvoiceByIndex(${idx})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"><i class="fas fa-print"></i> طباعة للعميل</button>
                </div>
            </div>
        </div>`;
    }).join('')}</div>`;
    showMessage(searchMessageContainer, `تم العثور على ${results.length} فاتورة/فواتير.`, false);
}

window.viewSearchInvoiceByIndex = function(idx) {
    const inv = (window.lastSearchResults || globalSearchResults || salesToday || [])[idx];
    if (inv && window.openInvoiceViewModal) window.openInvoiceViewModal(inv);
    else if (inv && window.inv_printInvoice) window.inv_printInvoice(inv);
};

window.printCustomerInvoiceByIndex = function(idx) {
    const inv = (window.lastSearchResults || globalSearchResults || salesToday || [])[idx];
    if (inv && window.inv_printInvoice) window.inv_printInvoice(inv);
    else if (inv && window.openInvoiceViewModal) window.openInvoiceViewModal(inv);
};

async function viewInvoiceDetails(invoiceId) {
    let invoice = (window.lastSearchResults && Array.isArray(window.lastSearchResults)) ? window.lastSearchResults.find(s => String(s.id) === String(invoiceId) || String(s.invoiceNumber) === String(invoiceId)) : null;
    if (!invoice) invoice = (typeof salesToday !== 'undefined' ? salesToday.find(s => String(s.id) === String(invoiceId) || String(s.invoiceNumber) === String(invoiceId)) : null)
        || (typeof globalSearchResults !== 'undefined' ? globalSearchResults.find(s => String(s.id) === String(invoiceId) || String(s.invoiceNumber) === String(invoiceId)) : null)
        || (typeof currentMonthlySalesData !== 'undefined' ? currentMonthlySalesData.find(s => String(s.id) === String(invoiceId) || String(s.invoiceNumber) === String(invoiceId)) : null);
    if (invoice) {
        if (typeof window.openInvoiceViewModal === 'function') window.openInvoiceViewModal(invoice);
        else if (typeof inv_printInvoice === 'function') inv_printInvoice(invoice);
        return;
    }
    if (window.currentUser) {
        try {
            const docSnap = await window.getDoc(window.doc(window.db, "users", window.currentUser.uid, "invoices", invoiceId));
            if (docSnap.exists()) {
                invoice = docSnap.data();
                if (typeof window.openInvoiceViewModal === 'function') window.openInvoiceViewModal(invoice);
                else if (typeof inv_printInvoice === 'function') inv_printInvoice(invoice);
            } else { alert("عذراً، لم يتم العثور على بيانات هذه الفاتورة."); }
        } catch (e) { alert("حدث خطأ أثناء محاولة جلب تفاصيل الفاتورة."); }
    } else { alert("يرجى تسجيل الدخول لعرض تفاصيل الفواتير."); }
}

window.printCustomerInvoice = async function(invoiceId) {
    let invoice = (typeof salesToday !== 'undefined' ? salesToday.find(s => s.id === invoiceId) : null)
        || (typeof globalSearchResults !== 'undefined' ? globalSearchResults.find(s => s.id === invoiceId) : null)
        || (typeof currentMonthlySalesData !== 'undefined' ? currentMonthlySalesData.find(s => s.id === invoiceId) : null);
    if (!invoice && window.currentUser) {
        try {
            const docSnap = await window.getDoc(window.doc(window.db, "users", window.currentUser.uid, "invoices", invoiceId));
            if (docSnap.exists()) invoice = docSnap.data();
        } catch (e) {}
    }
    if (invoice && typeof window.inv_printInvoice === 'function') window.inv_printInvoice(invoice);
    else alert("تعذر العثور على بيانات الفاتورة للطباعة.");
};

window.showPendingSaleDetails = function(pendingId) {
    const sale = pendingSales.find(s => s.id === pendingId);
    if (!sale) return;

    // 1. فحص وجود النافذة، وإنشاؤها إذا كانت مفقودة
    let modal = document.getElementById('pendingDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pendingDetailsModal';
        modal.className = 'modal';
        modal.style.cssText = "display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.6); backdrop-filter: blur(2px);";
        
        modal.innerHTML = `
            <div class="modal-content" style="background-color:#fff; margin:5% auto; padding:0; border-radius:12px; width:90%; max-width:450px; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <div style="background: linear-gradient(to right, #1e40af, #3b82f6); padding: 15px 20px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0; font-size:16px; font-weight:bold;">تفاصيل الربحية والتكلفة</h3>
                    <span onclick="document.getElementById('pendingDetailsModal').style.display='none'" style="cursor:pointer; font-size:24px; opacity:0.8;">&times;</span>
                </div>
                <div style="padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 id="pd_product_name" style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">...</h2>
                        <p id="pd_customer_name" style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">...</p>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                            <span style="color: #64748b;">تكلفة المنتج الأصلي:</span>
                            <span id="pd_main_cost" style="font-weight: bold; font-family: monospace;">0.00</span>
                        </div>
                        <div id="pd_attachments_container" style="display: none; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">+ تكلفة الملحقات المضافة:</div>
                            <ul id="pd_attachments_list" style="margin: 0; padding-right: 15px; font-size: 13px; color: #475569;"></ul>
                            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-weight: bold; font-size: 13px; color: #475569;">
                                <span>إجمالي تكلفة الملحقات:</span>
                                <span id="pd_attachments_cost">0.00</span>
                            </div>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: #ef4444; font-weight: bold;">إجمالي التكلفة (عليك):</span>
                            <span id="pd_total_cost" style="color: #ef4444; font-weight: bold; font-family: monospace; font-size: 15px;">0.00</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: #1f2937; font-weight: bold;">سعر البيع (للعميل):</span>
                            <span id="pd_sell_price" style="color: #1f2937; font-weight: bold; font-family: monospace; font-size: 15px;">0.00</span>
                        </div>
                        <div id="pd_deduction_container" style="display:none; justify-content:space-between; margin-top:5px; color:#c2410c; font-weight:bold; font-size:13px;">
                            <span id="pd_deduction_name">استقطاع مخفي:</span>
                            <span id="pd_deduction_amount" style="font-family:monospace;">0.00</span>
                        </div>
                    </div>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="display: block; font-size: 12px; color: #166534; font-weight: bold; text-transform: uppercase;">صافي الربح المتوقع</span>
                        <span id="pd_profit" style="display: block; font-size: 24px; color: #15803d; font-weight: 800; margin-top: 5px; font-family: monospace;">0.00</span>
                    </div>
                </div>
                <div style="background: #f9fafb; padding: 12px 20px; text-align: right; border-top: 1px solid #e5e7eb;">
                    <button onclick="document.getElementById('pendingDetailsModal').style.display='none'" style="background: #fff; border: 1px solid #d1d5db; padding: 6px 15px; border-radius: 6px; color: #374151; font-weight: bold; cursor: pointer;">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 2. تعبئة البيانات (الآن العناصر مضمونة الوجود)
    document.getElementById('pd_customer_name').textContent = sale.customerName || 'عميل غير مسجل';
    
    let mainProductName = "فاتورة مجمعة";
    let mainCost = 0;

    if (sale.mainProduct) {
        mainProductName = `${sale.mainProduct.quantity !== undefined ? sale.mainProduct.quantity : 1}x ${sale.mainProduct.name}`;
        mainCost = (Number(sale.mainProduct.costPrice) || 0) * (sale.mainProduct.quantity !== undefined ? (Number(sale.mainProduct.quantity) || 0) : 1);
    } else if (sale.items) {
        mainProductName = `فاتورة تحتوي على ${sale.items.length} بنود`;
        mainCost = sale.items.reduce((sum, item) => sum + ((Number(item.costPrice)||0) * (Number(item.quantity)||0)), 0);
    }
    
    document.getElementById('pd_product_name').textContent = mainProductName;
    document.getElementById('pd_main_cost').textContent = formatCurrency(mainCost);

    const attachmentsList = document.getElementById('pd_attachments_list');
    const attachmentsContainer = document.getElementById('pd_attachments_container');
    attachmentsList.innerHTML = '';
    
    const attachments = [];
    if (Array.isArray(sale.additionalItems)) attachments.push(...sale.additionalItems);
    const ded = (sale.invoiceData && Array.isArray(sale.invoiceData.deductedItems)) ? sale.invoiceData.deductedItems : (Array.isArray(sale.deductedItems) ? sale.deductedItems : []);
    ded.forEach(d => { if (!attachments.some(a => (a.id && a.id === d.id) || a.name === d.name)) attachments.push(d); });
    
    let attachmentsTotalCost = 0;

    if (attachments.length > 0) {
        attachmentsContainer.style.display = 'block';
        attachments.forEach(att => {
            const attQty = Number(att.quantity) || 0, attUnitCost = Number(att.costPrice) || 0, attTotal = attQty * attUnitCost;
            attachmentsTotalCost += attTotal;
            const li = document.createElement('li');
            li.style.cssText = "display:flex; justify-content:space-between; margin-bottom:3px;";
            li.innerHTML = `<span>${attQty}x ${escapeHTML(att.name)}</span><span style="font-family: monospace;">${formatCurrency(attTotal)}</span>`;
            attachmentsList.appendChild(li);
        });
        document.getElementById('pd_attachments_cost').textContent = formatCurrency(attachmentsTotalCost);
    } else {
        attachmentsContainer.style.display = 'none';
    }

    const totalCalculatedCost = mainCost + attachmentsTotalCost;
    const sellPrice = Number(sale.totalSellPrice) || 0;
    const dedAmount = Number(sale.deductionAmount) || 0;
    const profit = sellPrice - totalCalculatedCost - dedAmount;
    const deductionContainer = document.getElementById('pd_deduction_container');
    if (deductionContainer) {
        if (dedAmount > 0) {
            deductionContainer.style.display = 'flex';
            document.getElementById('pd_deduction_name').textContent = `استقطاع (${sale.deductionLiabilityName || 'التزام'}):`;
            document.getElementById('pd_deduction_amount').textContent = "-" + formatCurrency(dedAmount);
        } else {
            deductionContainer.style.display = 'none';
        }
    }

    document.getElementById('pd_total_cost').textContent = formatCurrency(totalCalculatedCost);
    document.getElementById('pd_sell_price').textContent = formatCurrency(sellPrice);
    
    const profitEl = document.getElementById('pd_profit');
    profitEl.textContent = formatCurrency(profit);
    profitEl.style.color = profit >= 0 ? '#15803d' : '#dc2626';

    modal.style.display = 'block';
};

window.debugShowAllInvoices = function() {
    if (!salesToday || salesToday.length === 0) {
        alert("⚠️ ذاكرة المتصفح (salesToday) فارغة تماماً! لم يتم حفظ أي فاتورة في هذه الجلسة.");
        return;
    }

    let report = "تقرير بكل الفواتير في الذاكرة:\n--------------------------------\n";
    
    salesToday.forEach((inv, index) => {
        report += `${index + 1}. رقم: ${inv.invoiceNumber || 'بدون'}\n`;
        report += `   - العميل: ${inv.customerName}\n`;
        report += `   - المبلغ: ${inv.grandTotal}\n`;
        report += `   - التاريخ المسجل: ${inv.saleDate} (Timestamp: ${inv.timestamp})\n`;
        report += `   - النوع: ${inv.type}\n`;
        report += "--------------------------------\n";
    });

    console.log(report); // طباعة في الكونسول للمراجعة الدقيقة
    alert(report); // إظهار للمستخدم
};

window.fixInvoiceDates = async function() {
    if (!salesToday || salesToday.length === 0) {
        alert("⚠️ لا توجد فواتير حالياً في ذاكرة المتصفح لإصلاحها.");
        return;
    }

    // 1. طلب التاريخ الصحيح من المستخدم
    const defaultDate = (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })); // تاريخ اليوم
    const correctDate = prompt("أدخل التاريخ الصحيح الذي تريد أن تظهر فيه هذه الفواتير (YYYY-MM-DD):", defaultDate);
    
    if (!correctDate) return; // إلغاء

    // 2. تغيير رسالة الزر للتحميل
    const msgBox = document.getElementById('global-message');
    if(msgBox) showMessage(msgBox, "جاري تصحيح التواريخ والمزامنة...", false, true);

   let count = 0;

const canWrite = await window.SessionGuard.assertCanWrite();
if (!canWrite) return;

const userId = window.currentUser ? window.currentUser.uid : null;
    // 3. المرور على الفواتير وتصحيحها
    for (const inv of salesToday) {
        // تحديث التاريخ في الذاكرة المحلية
        inv.saleDate = correctDate;
        
        // إذا كان هناك اتصال، نحدث السحابة أيضاً
        if (userId) {
            try {
                 const docRef = window.doc(window.db, "users", userId, "invoices", inv.id);
                 await window.setDoc(docRef, inv, { merge: true });
            } catch(e) { 
                console.error("فشل تحديث السحابة للفاتورة:", inv.id); 
            }
        }
        count++;
    }

    // 4. حفظ النسخة المحلية الجديدة
    if(typeof saveCurrentStateByDate === 'function') {
        saveCurrentStateByDate(correctDate); 
    }

    alert(`✅ تم تصحيح تاريخ ${count} فاتورة إلى (${correctDate}).\n\nالآن اذهب لتقرير المبيعات واختر شهر (${correctDate.substring(0, 7)}) وستظهر الفواتير بإذن الله.`);
    if(msgBox) showMessage(msgBox, "تم التصحيح بنجاح.", false);
};

window.fixMissingInvoice = function() {
    window.pendingOrders = window.pendingOrders || [];
    if(!window.pendingOrders.find(o => o.customerName && o.customerName.includes("مراد شاهين"))) {
        window.pendingOrders.push({
            id: "po_morad_" + Date.now(),
            customerName: "مراد شاهين (عميل استبدال)",
            itemsDesc: "مبرشم 1 + A9 plus 5g عناصر",
            diffAmount: 1050,
            timestamp: new Date().toISOString()
        });
        if (typeof updateUI === "function") updateUI();
        if (typeof saveStateToHistory === "function") saveStateToHistory();
        if (typeof saveSystemToCloud === "function") saveSystemToCloud();
        alert("تم استرجاع فاتورة مراد شاهين بقيمة 1050 ج.م بنجاح، وتم تأمينها سحابياً!");
    } else {
        alert("الفاتورة موجودة بالفعل!");
    }
};
