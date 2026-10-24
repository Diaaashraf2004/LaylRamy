// finance-core-reports.js - Printing and Reporting Module
function printCreditorStatement() {
    const area = document.getElementById('print-creditor-statement-area');
    if (!area) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage('يرجى فتح كشف حساب المورد أولاً قبل الطباعة', true);
        return;
    }
    const printContent = area.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <title>طباعة كشف حساب مورد</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 20px; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
                th { background-color: #f3f4f6; }
                .text-center { text-align: center; }
                .text-pink-700 { color: #be185d; }
                .text-green-700 { color: #15803d; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mt-6 { margin-top: 1.5rem; }
                .border-b { border-bottom: 1px solid #eee; }
                .pb-4 { padding-bottom: 1rem; }
                .font-bold { font-weight: bold; }
                .text-gray-500 { color: #6b7280; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function printCustomerStatement() {
    const area = document.getElementById('print-customer-statement-area') || document.getElementById('customer-statement-content');
    if (!area || !area.innerHTML.trim()) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage('يرجى فتح كشف حساب العميل أولاً قبل الطباعة', true);
        return;
    }
    const printContent = area.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <title>طباعة كشف حساب عميل</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 20px; color: #333; direction: rtl; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
                th { background-color: #f3f4f6; }
                .text-center { text-align: center; }
                hr { border: 0; border-top: 1px solid #ddd; margin: 15px 0; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
                <h2 style="margin: 0;">كشف حساب عميل</h2>
                <small>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</small>
            </div>
            ${printContent}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
window.printCustomerStatement = printCustomerStatement;
       function exportData() {
    if (window._loadFailed) { alert('تحذير: النظام لم يكتمل تحميله بشكل صحيح. تصدير البيانات الآن قد يؤدي لنسخة غير مكتملة. يرجى تحديث الصفحة.'); return; }
    console.log("Starting full system backup...");
    
    // تحديد تاريخ البيانات المصدرة (إما التاريخ المحمل حالياً أو اليوم)
    const dateToExport = currentLoadedDate || getTodayDateString();

    // تجميع الحالة الكاملة للنظام (شاملة كل التحديثات الجديدة)
    const stateToExport = {
        // 1. بيانات التعريف
        meta: {
            appName: "نظام إدارة البضائع",
            version: "3.0 (تحديث العربونات والتكاليف)",
            backupDate: new Date().toISOString(),
            targetDate: dateToExport
        },

        // 2. البيانات الأساسية (المخزون والعملاء)
        products: products || [],       // يشمل الفئة (Category) وتكلفة الشراء المحدثة
        suppliers: suppliers || [],
        
        // 3. النظام المالي الجديد (الخزائن المتعددة)
        accounts: accounts || [],       // بديل السيولة الواحدة القديمة

        // 4. المبيعات (شاملة العربونات)
        salesToday: salesToday || [],       // الفواتير النهائية
        pendingSales: pendingSales || [],   // يشمل حقل depositPaid (العربون) الجديد
        completedReturns: completedReturns || [],
        pendingReturns: pendingReturns || [],
        pendingReturnsValue: (typeof pendingReturnsValue !== 'undefined') ? pendingReturnsValue : 0,

        // 5. المشتريات (شاملة التكاليف الإضافية)
        purchaseInvoices: purchaseInvoices || [], // يشمل حقل extraCosts والديون المرتبطة
        pendingPurchases: pendingPurchases || [],

        // 6. الديون والالتزامات
        debtors: debtors || [],
        liabilities: liabilities || [],
        monthlyLiabilities: monthlyLiabilities || [],

        // 7. السجلات والتقارير
        expenses: expenses || 0,
        recordedLosses: recordedLosses || 0,
        profit: totalProfit || 0,
        log: operationLog || [],
        liquidityLog: liquidityLog || [], // سجل الخزينة التفصيلي
        serialNumbersLog: serialNumbersLog || [],
        inboxTasks: inboxTasks || [],
        pendingOrders: window.pendingOrders || []
    };

    // تحويل البيانات لنص JSON وتنزيل الملف
    try {
        const jsonString = JSON.stringify(stateToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        // تسمية الملف باسم معبر يحتوي على التاريخ
        link.download = `Backup_${dateToExport}_WithDeposits.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showGlobalMessage(`تم تصدير نسخة احتياطية شاملة لتاريخ ${formatDateForDisplay(dateToExport)} بنجاح.`, false);
        console.log("Backup completed successfully.");
    } catch (e) {
        console.error("Export failed:", e);
        showGlobalMessage("حدث خطأ أثناء التصدير. راجع الـ Console.", true);
    }
}
 function importData(event) {
    const file = event.target.files[0];
    const importMsgElement = document.getElementById("import-message");
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // التحقق الأساسي من صحة الملف
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error("صيغة الملف غير صالحة.");
            }

            // ��️ الإصلاح: إذا لم يكن التاريخ موجوداً في الملف، نستخدم التاريخ المختار في الواجهة
            const targetDateInput = document.getElementById("load-date-alt");
            let targetDate = targetDateInput ? targetDateInput.value : null;

            if (!importedData.savedForDate) {
                console.warn("الملف لا يحتوي على تاريخ محفوظ، سيتم استخدام التاريخ المختار.");
                if (targetDate) {
                    importedData.savedForDate = targetDate;
                } else {
                    // إذا لم يحدد المستخدم تاريخاً، نستخدم تاريخ اليوم
                    importedData.savedForDate = (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
                }
            } else {
                // إذا كان الملف يحتوي على تاريخ، نستخدمه
                // لكن، الأفضل دائماً أن نسأل المستخدم هل يريد الاستيراد لليوم المحدد أم لتاريخ الملف
                if (!targetDate) targetDate = importedData.savedForDate;
            }
            
            // التأكد النهائي من التاريخ المستهدف
            const finalDate = targetDate || importedData.savedForDate;

            const confirmationMsg = `سيتم استيراد البيانات وتطبيقها على تاريخ (${finalDate}).\n\nتحذير: سيتم استبدال البيانات الحالية لهذا اليوم. هل أنت متأكد؟`;

            if (confirm(confirmationMsg)) {
                loadState(importedData, finalDate);
                saveCurrentStateByDate(finalDate, true); // حفظ فوري
                updateUI();
                
                // تحديث الواجهة
                if (targetDateInput) targetDateInput.value = finalDate;
                if (typeof updateLoadDateDayName === 'function') {
                    updateLoadDateDayName(finalDate, document.getElementById("load-date-day-name-alt"));
                }
                
                showMessage(importMsgElement, "تم استيراد البيانات بنجاح.", false);
            } else {
                showMessage(importMsgElement, "تم إلغاء الاستيراد.", false, true);
            }

        } catch (error) {
            console.error("Import Error:", error);
            showMessage(importMsgElement, `خطأ في الملف: ${error.message}`, true);
        } finally {
            event.target.value = null; // تصفير الحقل للسماح بإعادة الاختيار
        }
    };
    reader.readAsText(file);
}

        // --- تقرير الطباعة العام ---
        function generateReportHTML(){
            const {totalInventoryValue, totalCapital, totalDebtsValue, totalLiabilitiesValue} = calculateTotals();
            const now = new Date();
            const reportDate = currentLoadedDate ? formatDateForDisplay(currentLoadedDate) : "بيانات حالية غير محفوظة";
            const printDateTime = now.toLocaleString('ar-EG', {timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium'});
            
            let productsTable = '<p>لا توجد منتجات في المخزون.</p>';
            if(products.length > 0){
                productsTable = `<table border="1" style="width:100%;border-collapse:collapse;margin-top:10px;font-size:.9em"><thead><tr style="background-color:#f2f2f2"><th style="padding:5px">اسم البضاعة</th><th style="padding:5px">الكمية</th><th style="padding:5px">المورد</th><th style="padding:5px">متوسط التكلفة</th><th style="padding:5px">إجمالي التكلفة</th></tr></thead><tbody>${[...products].sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(p => { const supplier = suppliers.find(s => s.id === p.supplierId); return `<tr><td style="padding:5px">${escapeHTML(p.name || 'غير مسمى')}</td><td style="padding:5px;text-align:center;">${Number(p.quantity) || 0}</td><td style="padding:5px">${supplier ? escapeHTML(supplier.name) : '-'}</td><td style="padding:5px;text-align:center;">${formatCurrency(p.costPrice)}</td><td style="padding:5px;text-align:center;">${formatCurrency((Number(p.quantity) || 0) * (Number(p.costPrice) || 0))}</td></tr>` }).join('')}</tbody><tfoot><tr style="background-color:#f2f2f2;font-weight:bold;"><td colspan="5" style="padding:5px;text-align:left;">إجمالي قيمة المخزون:</td><td style="padding:5px;text-align:center;">${formatCurrency(totalInventoryValue)}</td></tr></tfoot></table>`
            }
            
            let logList = '<p>لا توجد عمليات مسجلة.</p>';
            if(operationLog.length > 0){
                logList = `<ul style="list-style:none;padding-right:0;margin-top:10px;font-size:.85em">${[...operationLog].reverse().map(log => `<li style="border-bottom:1px dotted #ccc;margin-bottom:5px;padding-bottom:5px"><strong style="color:#333;">${escapeHTML(log.type || '')}:</strong> ${escapeHTML(log.details || '')}<br><small style="color:#555">${formatDateTime(log.timestamp)}</small></li>`).join('')}</ul>`
            }
            
            let debtorsTable = '<p>لا توجد ديون مستحقة.</p>';
            if(debtors.length > 0){
                const groupedDebtsForPrint = debtors.reduce((acc, debt) => {
                    const name = debt.name;
                    if (!acc[name]) acc[name] = { total: 0, items: [] };
                    const amount = Number(debt.amount) || 0;
                    if(amount > 0.001){
                        acc[name].total += amount;
                        acc[name].items.push({ reason: debt.reason || '-', amount: amount });
                    }
                    return acc;
                }, {});
                const sortedDebtorNames = Object.keys(groupedDebtsForPrint).filter(name => groupedDebtsForPrint[name].total > 0.001).sort((a, b) => a.localeCompare(b, 'ar'));
                if(sortedDebtorNames.length > 0) {
                    debtorsTable = `<table border="1" style="width:100%;border-collapse:collapse;margin-top:10px;font-size:.9em"><thead><tr style="background-color:#f2f2f2"><th style="padding:5px">اسم المدين</th><th style="padding:5px">السبب</th><th style="padding:5px">المبلغ المستحق</th></tr></thead><tbody>`;
                    sortedDebtorNames.forEach(name => {
                        const data = groupedDebtsForPrint[name];
                        debtorsTable += `<tr style="background-color:#f9f9f9;"><td style="padding:5px; font-weight:bold;" colspan="2">${escapeHTML(name)} (الإجمالي)</td><td style="padding:5px; font-weight:bold;text-align:center;">${formatCurrency(data.total)}</td></tr>`;
                        data.items.sort((a,b) => a.reason.localeCompare(b.reason, 'ar')).forEach(item => {
                            debtorsTable += `<tr><td style="padding:5px; padding-right: 15px;"></td><td style="padding:5px;">${escapeHTML(item.reason || '-')}</td><td style="padding:5px;text-align:center;">${formatCurrency(item.amount)}</td></tr>`;
                        });
                    });
                    debtorsTable += `</tbody><tfoot><tr style="background-color:#f2f2f2;font-weight:bold;"><td colspan="2" style="padding:5px;text-align:left;">إجمالي الديون (لك):</td><td style="padding:5px;text-align:center;">${formatCurrency(totalDebtsValue)}</td></tr></tfoot></table>`;
                }
            }
            
            let liabilitiesTable = '<p>لا توجد التزامات مستحقة.</p>';
            const validLiabilities = liabilities.filter(l => !l.isHidden && (Number(l.amount) || 0) > 0.001);
            if(validLiabilities.length > 0){
                liabilitiesTable = `<table border="1" style="width:100%;border-collapse:collapse;margin-top:10px;font-size:.9em"><thead><tr style="background-color:#f2f2f2"><th style="padding:5px">اسم الدائن</th><th style="padding:5px">المبلغ المستحق</th></tr></thead><tbody>${[...validLiabilities].sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(l => `<tr><td style="padding:5px">${escapeHTML(l.name || '')}</td><td style="padding:5px;text-align:center;">${formatCurrency(l.amount)}</td></tr>`).join('')}</tbody><tfoot><tr style="background-color:#f2f2f2;font-weight:bold;"><td style="padding:5px;text-align:left;">إجمالي الالتزامات (عليك):</td><td style="padding:5px;text-align:center;">${formatCurrency(totalLiabilitiesValue)}</td></tr></tfoot></table>`
            }
            
            let suppliersTable = '<p>لا يوجد موردين مسجلين.</p>';
            if(suppliers.length > 0){
                suppliersTable = `<table border="1" style="width:100%;border-collapse:collapse;margin-top:10px;font-size:.9em"><thead><tr style="background-color:#f2f2f2"><th style="padding:5px">اسم المورد</th><th style="padding:5px">الاتصال</th><th style="padding:5px">العنوان</th></tr></thead><tbody>${[...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(s => `<tr><td style="padding:5px">${escapeHTML(s.name || '')}</td><td style="padding:5px">${escapeHTML(s.contact || '-')}</td><td style="padding:5px">${escapeHTML(s.address || '-')}</td></tr>`).join('')}</tbody></table>`
            }
            
            return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير العمليات - ${reportDate}</title><style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:20px; line-height: 1.4;}h1,h2{color:#333;border-bottom:1px solid #ccc;padding-bottom:5px;margin-bottom:15px}h1{text-align:center;font-size:1.4em}h2{font-size:1.1em;margin-top:25px;margin-bottom:10px;}p{margin:5px 0;}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:.9em}th,td{border:1px solid #ddd;padding:6px;text-align:right; vertical-align:top;}th{background-color:#f2f2f2;font-weight:bold;}.summary p{font-size:1em;margin:5px 0; padding-right: 10px;}.print-info{text-align:center;font-size:.8em;color:#666;margin-bottom:20px}ul{list-style:none; padding-right:0;} tfoot td {font-weight:bold;} @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } h2 { page-break-before: auto; page-break-after: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } tfoot { display: table-footer-group; } } </style></head><body><h1>تقرير العمليات</h1><p class="print-info">تاريخ بيانات التقرير: ${reportDate}<br>تاريخ ووقت الطباعة: ${printDateTime}</p><div class="summary"><h2>الملخص المالي</h2><p><strong>السيولة المتاحة:</strong> ${formatCurrency(accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0))}</p><p><strong>إجمالي قيمة المخزون:</strong> ${formatCurrency(totalInventoryValue)}</p><p><strong>قيمة البضاعة المؤقتة:</strong> ${formatCurrency(goodsOnConsignmentValue)}</p><p><strong>إجمالي الديون المستحقة للشركة:</strong> ${formatCurrency(totalDebtsValue)}</p><p><strong>إجمالي الالتزامات المستحقة على الشركة:</strong> ${formatCurrency(totalLiabilitiesValue)}</p><p><strong>إجمالي المصروفات المسجلة:</strong> ${formatCurrency(expenses)}</p><p><strong>إجمالي الربح المحقق:</strong> ${formatCurrency(totalProfit)}</p><p><strong>رأس المال الحالي:</strong> ${formatCurrency(totalCapital)}</p></div><h2>تفاصيل الالتزامات المستحقة على الشركة</h2>${liabilitiesTable}<h2>تفاصيل الديون المستحقة للشركة</h2>${debtorsTable}<h2>تفاصيل المخزون</h2>${productsTable}<h2>تفاصيل الموردين</h2>${suppliersTable}<h2>سجل العمليات</h2>${logList}</body></html>`
        }
            // (استكمالاً للجزء 8أ)
function printPendingSaleAsInvoice(pendingId) {
    console.log("printPendingSaleAsInvoice function started for ID:", pendingId);
    console.log("Attempting to print pending sale as invoice for ID:", pendingId);
    const saleIndex = pendingSales.findIndex(s => s.id === pendingId);
    if (saleIndex === -1) {
        console.error("Pending sale not found for printing:", pendingId);
        showGlobalMessage("خطأ: لم يتم العثور على البيع المؤقت للطباعة.", true);
        return;
    }
    const saleData = pendingSales[saleIndex];
    console.log("Found pending sale data:", saleData);

    // تهيئة بيانات مشابهة لكائن الفاتورة الذي تتوقعه دالة inv_printInvoice
    let itemsForPrint = [];
    const mainProductQty = Number(saleData.mainProduct.quantity) || 0;

    // سعر الوحدة للمنتج الرئيسي - تقدير بسيط للعرض
    let mainProductUnitPrice = 0;
    if (mainProductQty > 0) {
       mainProductUnitPrice = saleData.totalSellPrice / mainProductQty; // نفترض أن السعر موزع على المنتج الرئيسي بشكل أساسي للعرض
    }


    itemsForPrint.push({
        name: saleData.mainProduct.name,
        quantity: mainProductQty,
        unitPrice: mainProductUnitPrice,
        subtotal: mainProductUnitPrice * mainProductQty, // قد لا يكون دقيقاً إذا وجدت منتجات إضافية بسعر
        serial: null // البيع المؤقت لا يخزن سيريال محدد عادة
    });

    let totalGoodsForPrint = mainProductUnitPrice * mainProductQty;

    if (saleData.additionalItems && saleData.additionalItems.length > 0) {
        saleData.additionalItems.forEach(item => {
            itemsForPrint.push({
                name: item.name,
                quantity: Number(item.quantity) || 0,
                unitPrice: 0, // سعر المنتجات الإضافية يعتبر 0 في هذا العرض
                subtotal: 0,
                serial: null
            });
        });
         // إذا كان هناك منتجات إضافية، الإجمالي الكلي للبضاعة هو سعر البيع المؤقت
         totalGoodsForPrint = saleData.totalSellPrice;
         // يمكنك تعديل سعر المنتج الرئيسي إذا أردت (اختياري)
         if (itemsForPrint[0]) {
           // itemsForPrint[0].unitPrice = 0; // أو أي قيمة مناسبة
           // itemsForPrint[0].subtotal = 0;
         }
    }


    const invoiceDataForPrint = {
        customerName: saleData.customerName || '',
        customerAddress: '', // لا يوجد عنوان في البيع المؤقت
        phones: [], // لا توجد هواتف في البيع المؤقت
        items: itemsForPrint,
        shippingCost: 0, // لا يوجد شحن منفصل في البيع المؤقت
        grandTotal: saleData.totalSellPrice, // الإجمالي المطلوب هو سعر البيع المؤقت
        totalGoodsPrice: totalGoodsForPrint, // إجمالي البضاعة هو سعر البيع المؤقت
        warranty: '', // لا يوجد ضمان في البيع المؤقت
        notes: `*** فاتورة بيع مؤقت (للعرض فقط - لم يتم تأكيد العملية) ***\nالربح المتوقع (غير مؤكد): ${formatCurrency(saleData.potentialProfit)}`, // ملاحظة مهمة
        invoiceNumber: `مؤقت-${saleData.id.slice(-6)}`, // رقم فاتورة مؤقت
        timestamp: saleData.timestamp // استخدم وقت إنشاء البيع المؤقت
    };
    console.log("Data prepared for printing:", invoiceDataForPrint);

    // استدعاء دالة الطباعة الحالية مع البيانات المهيأة
    inv_printInvoice(invoiceDataForPrint); // مرر الكائن المنسق
}
            function inv_printInvoice(invoiceToPrint = null) { // Modified to accept an invoice object
                 let customerName, customerAddress, phones, items, shippingCost, grandTotal, warranty, notes, invoiceNumber, timestamp;
                 let totalGoodsPriceForPrint;
                 if (invoiceToPrint) { // Printing a saved/searched invoice
                      customerName = invoiceToPrint.customerName || '';
                      customerAddress = invoiceToPrint.customerAddress || '';
                      phones = invoiceToPrint.phones || [];
                      items = invoiceToPrint.items || []; // Items already include serial if saved
                      shippingCost = Number(invoiceToPrint.shippingCost) || 0;
                      grandTotal = Number(invoiceToPrint.grandTotal) || 0;
                      warranty = invoiceToPrint.warranty || '';
                      notes = invoiceToPrint.notes || '';
                      invoiceNumber = invoiceToPrint.invoiceNumber || `INV-${invoiceToPrint.id.slice(-6)}`; // Fallback ID based number
                      timestamp = invoiceToPrint.timestamp;
                       totalGoodsPriceForPrint = invoiceToPrint.totalGoodsPrice !== undefined ? Number(invoiceToPrint.totalGoodsPrice) : items.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0);
                 } else { // Printing directly from modal before saving (or if validation fails on view)
                      if (!inv_validateForm()){ // Validate before generating preview print
                          console.log("Invoice Validation failed for printing!");
                          return;
                      }
                      customerName = d('inv_customerName').value.trim();
                      customerAddress = d('inv_customerAddress').value.trim();
                      phones = inv_invoiceForm ? Array.from(inv_invoiceForm.querySelectorAll('input[name="phone[]"]')).map(input => input.value.trim()).filter(phone => phone) : [];
                      items = inv_invoiceItemsBody ? Array.from(inv_invoiceItemsBody.querySelectorAll('.invoice-item-row')).map(row => ({
                          name: row.dataset.itemName || '',
                          quantity: row.dataset.itemQty || 0,
                          unitPrice: parseFloat(row.dataset.itemPrice || 0).toFixed(2), // Use dataset, fallback might not work well
                          subtotal: parseFloat(row.dataset.itemSubtotal || 0).toFixed(2),
                          serial: row.dataset.itemSerial || null // **** احصل على السيريال للطباعة ****
                      })) : [];
                      shippingCost = inv_shippingCostInput ? (parseInputNumber(inv_shippingCostInput) || 0) : 0;
                      const totalGoods = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
                      totalGoodsPriceForPrint = totalGoods;
                      grandTotal = totalGoods + shippingCost;
                      warranty = inv_warrantyInput ? inv_warrantyInput.value.trim() : '';
                      notes = inv_notesTextarea ? inv_notesTextarea.value.trim() : '';
                      timestamp = new Date().toISOString(); // Use current time for preview
                      invoiceNumber = `PREVIEW-${Date.now().toString().slice(-6)}`; // Preview number
                  }

                  const invoiceDate = new Date(timestamp);
                  const formattedDate = invoiceDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
                  const formattedTime = invoiceDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit', hour12: true });

                  // Generate HTML for printing
                  let printHTML = `
                  <!DOCTYPE html>
                  <html lang="ar" dir="rtl">
                  <head>
                      <meta charset="UTF-8">
                      <title>فاتورة مبيعات - ${escapeHTML(invoiceNumber)}</title>
                      <style>
                          * { box-sizing: border-box; }
                          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.5; }
                          .inv-card { max-width: 820px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                          .inv-head { background: #0f172a; color: #fff; padding: 22px 28px; display: flex; justify-content: space-between; align-items: center; }
                          .inv-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
                          .inv-sub { margin: 3px 0 0; color: #94a3b8; font-size: 11px; }
                          .inv-badge { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; text-align: left; }
                          .inv-badge-lbl { font-size: 10px; color: #cbd5e1; }
                          .inv-badge-num { font-size: 16px; font-weight: 800; font-family: monospace; color: #38bdf8; }
                          .inv-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 20px 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                          .info-box { background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; }
                          .info-box-title { font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; font-size: 11px; text-transform: uppercase; }
                          .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                          .info-lbl { color: #64748b; }
                          .info-val { font-weight: 600; color: #0f172a; }
                          .inv-body { padding: 24px 28px; }
                          table.items-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                          table.items-table th { background: #1e293b; color: #fff; padding: 9px 12px; font-size: 12px; font-weight: 700; }
                          table.items-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
                          table.items-table tr:nth-child(even) td { background: #f8fafc; }
                          .serial-pill { display: inline-block; font-size: 11px; font-family: monospace; background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; margin-top: 3px; }
                          .num-col { text-align: center; font-family: monospace; font-size: 13px; font-weight: 600; }
                          .total-pane { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
                          .notes-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; font-size: 11px; color: #475569; }
                          .totals-tbl { width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc; }
                          .t-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
                          .t-grand { background: #0f172a; color: #fff; font-size: 14px; font-weight: 800; border-bottom: none; }
                          .t-grand .num-val { color: #38bdf8; font-family: monospace; font-size: 16px; }
                          .inv-footer { margin-top: 28px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; }
                          @media print {
                              body { padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                              .inv-card { border: none; box-shadow: none; max-width: 100%; border-radius: 0; }
                              .inv-head { background: #0f172a !important; color: #fff !important; }
                              .t-grand { background: #0f172a !important; color: #fff !important; }
                          }
                      </style>
                  </head>
                  <body>
                      <div class="inv-card">
                          <div class="inv-head">
                              <div>
                                  <h1 class="inv-title">فاتورة مبيعات</h1>
                                  <div class="inv-sub">المؤسسة لإدارة المبيعات والتجارة</div>
                              </div>
                              <div class="inv-badge">
                                  <div class="inv-badge-lbl">رقم الفاتورة:</div>
                                  <div class="inv-badge-num">${escapeHTML(invoiceNumber)}</div>
                              </div>
                          </div>
                          <div class="inv-info-grid">
                              <div class="info-box">
                                  <div class="info-box-title">بيانات العميل</div>
                                  <div class="info-row"><span class="info-lbl">الاسم:</span><span class="info-val">${escapeHTML(customerName || 'عميل نقدي')}</span></div>
                                  ${phones.length > 0 ? `<div class="info-row"><span class="info-lbl">الهاتف:</span><span class="info-val" style="font-family:monospace;">${phones.map(escapeHTML).join(' / ')}</span></div>` : ''}
                                  ${customerAddress ? `<div class="info-row"><span class="info-lbl">العنوان:</span><span class="info-val">${escapeHTML(customerAddress)}</span></div>` : ''}
                              </div>
                              <div class="info-box">
                                  <div class="info-box-title">تفاصيل الإصدار</div>
                                  <div class="info-row"><span class="info-lbl">التاريخ:</span><span class="info-val">${formattedDate}</span></div>
                                  <div class="info-row"><span class="info-lbl">الوقت:</span><span class="info-val">${formattedTime}</span></div>
                                  ${warranty ? `<div class="info-row"><span class="info-lbl">مدة الضمان:</span><span class="info-val">${escapeHTML(warranty)}</span></div>` : ''}
                              </div>
                          </div>
                          <div class="inv-body">
                              <table class="items-table">
                                  <thead>
                                      <tr>
                                          <th style="width:36px; text-align:center;">#</th>
                                          <th style="text-align:right;">بيان الصنف</th>
                                          <th style="text-align:center; width:70px;">الكمية</th>
                                          <th style="text-align:center; width:120px;">سعر الوحدة</th>
                                          <th style="text-align:left; width:130px;">الإجمالي</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      ${items.map((item, idx) => `
                                          <tr>
                                              <td class="num-col" style="color:#94a3b8;">${idx + 1}</td>
                                              <td>
                                                  <strong>${escapeHTML(item.name)}</strong>
                                                  ${item.serial ? `<br><span class="serial-pill">S/N: ${escapeHTML(item.serial)}</span>` : ''}
                                              </td>
                                              <td class="num-col">${item.quantity}</td>
                                              <td class="num-col">${formatCurrency(item.unitPrice)}</td>
                                              <td class="num-col" style="text-align:left; font-weight:700;">${formatCurrency(item.subtotal)}</td>
                                          </tr>
                                      `).join('')}
                                  </tbody>
                              </table>
                              <div class="total-pane">
                                  <div class="notes-box">
                                      <strong>شروط وملاحظات:</strong>
                                      <div style="margin-top:4px; line-height:1.6;">${notes ? escapeHTML(notes).replace(/\n/g, '<br>') : 'البضاعة المباعة تخضع لسياسة الضمان المعتمدة. يرجى الاحتفاظ بنسخة الفاتورة.'}</div>
                                  </div>
                                  <div class="totals-tbl">
                                      <div class="t-row"><span>إجمالي البضاعة:</span><strong style="font-family:monospace;">${formatCurrency(totalGoodsPriceForPrint)}</strong></div>
                                      ${shippingCost > 0 ? `<div class="t-row"><span>تكلفة الشحن:</span><strong style="font-family:monospace;">${formatCurrency(shippingCost)}</strong></div>` : ''}
                                      <div class="t-row t-grand"><span>الإجمالي النهائي:</span><span class="num-val">${formatCurrency(grandTotal)}</span></div>
                                  </div>
                              </div>
                              <div class="inv-footer">
                                  <div>ختم واعتماد المؤسسة: ____________________</div>
                                  <div>✨ شكراً لتعاملكم معنا ونسعد بخدمتكم ✨</div>
                              </div>
                          </div>
                      </div>
                  </body>
                  </html>
                  `;

                  // Trigger print
                  document.body.classList.add('print-invoice'); // Add class for print styling
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                      printWindow.document.open();
                      printWindow.document.write(printHTML);
                      printWindow.document.close();
                      setTimeout(() => { // Timeout allows content to render before print dialog
                          try {
                              printWindow.focus();
                              printWindow.print();
                              // printWindow.close(); // Optional: Close after printing attempt
                          } catch (e) {
                              console.error("Print error:", e);
                              alert("حدث خطأ أثناء محاولة الطباعة.");
                          } finally {
                              document.body.classList.remove('print-invoice'); // Remove class after printing attempt
                          }
                      }, 500);
                  } else {
                      alert('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.');
                      document.body.classList.remove('print-invoice');
                  }
             }
