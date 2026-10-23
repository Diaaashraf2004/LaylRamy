window.confirmRefundAndCancel = async function() {
    const saleId = document.getElementById('refund_pending_id').value;
    const amount = Number(document.getElementById('refund_amount_val').value);
    const accountId = document.getElementById('refund_account_select').value;

    if (!accountId) { 
        alert("يرجى اختيار الحساب!"); 
        return; 
    }

    const confirmMsg = `هل أنت متأكد من خصم ${formatCurrency(amount)} من الحساب المختار وإلغاء العملية؟`;
    
    if (confirm(confirmMsg)) {
        // �� ملاحظة: تم إزالة saveStateToHistory من هنا لمنع الحفظ المزدوج
        // لأننا أضفناها بالفعل داخل executeCancellation لتشمل كل حالات الإلغاء

        try {
            // تنفيذ الإلغاء (الدالة الآن تتولى الحفظ وتحديث الواجهة بالكامل)
            await executeCancellation(saleId, accountId, amount);
        } catch (error) {
            console.error("Error in confirmRefundAndCancel:", error);
            alert("حدث خطأ أثناء الإلغاء، يرجى المحاولة مرة أخرى.");
        } finally {
            // التركيز هنا فقط على إغلاق المودال
            const modal = document.getElementById('refundModal');
            if (modal) modal.style.display = 'none';
            
            // تم إزالة دوال تحديث الواجهة من هنا لأن executeCancellation تقوم بها بالفعل
        }
    }
};

window.executeCancellation = async function(saleId, accountId, amount) {
    const saleIndex = pendingSales.findIndex(s => String(s.id) === String(saleId));
    if (saleIndex === -1) {
        console.error("لم يتم العثور على البيعة المطلوبة.");
        return;
    }

    const sale = pendingSales[saleIndex];

    // �� 1. أخذ لقطة للحالة قبل التنفيذ لكي يعمل زر التراجع (Undo)
    if (typeof saveStateToHistory === 'function') {
        saveStateToHistory();
    }

    try {
        // أ. معالجة السيولة (رد العربون أو المدفوع)
        if (accountId && Number(amount) > 0) {
            const acc = accounts.find(a => String(a.id) === String(accountId));
            if (acc) {
                acc.balance = Number(acc.balance) - Number(amount);
                liquidityLog.push({
                    id: generateId("liq-refund"),
                    timestamp: new Date().toISOString(),
                    type: "remove",
                    amount: Number(amount),
                    description: `رد عربون (إلغاء بيعة مؤقتة) - عميل: ${sale.customerName || '-'}`,
                    accountId: acc.id,
                    currentBalance: accounts.reduce((sum, a) => sum + Number(a.balance), 0)
                });
            }
        }

        // ب. إرجاع البضاعة للمخزن (تجميع الأصناف بحذر لتجنب التكرار)
        let itemsToReturn = [];
        
        if (sale.mainProduct) {
            // هذا لبيعات السريع المؤقتة (تحتوي على mainProduct و additionalItems منفصلة)
            itemsToReturn.push(sale.mainProduct);
            if (sale.additionalItems && Array.isArray(sale.additionalItems)) {
                itemsToReturn.push(...sale.additionalItems);
            }
        } else {
            // للفواتير التفصيلية المؤقتة
            if (sale.items && sale.items.length > 0) {
                itemsToReturn.push(...sale.items);
            } else if (sale.invoiceData && sale.invoiceData.items) {
                itemsToReturn.push(...sale.invoiceData.items);
            }
        }
        
        const extraDeducted = sale.deductedItems || (sale.invoiceData ? sale.invoiceData.deductedItems : []) || [];
        itemsToReturn.push(...extraDeducted);

        // إزالة أي قيم فارغة (null/undefined)
        itemsToReturn = itemsToReturn.filter(Boolean);

        const restoreCancellationSerials = (it) => {
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

      itemsToReturn.forEach(item => {
    // تنظيف الاسم من السيريال إن وجد للبحث الدقيق
    const cleanItemName = (item.name || '').split(' (S/N:')[0].trim().toLowerCase();
    
    let product = (item.id ? products.find(p => String(p.id) === String(item.id)) : null) || 
                  products.find(p => p.name.trim().toLowerCase() === cleanItemName);
                  
    const returnedQty = Number(item.quantity) || 1;

    if (product) {
        // إذا كان المنتج موجوداً، نزيد كميته فقط
        product.quantity = Number(product.quantity || 0) + returnedQty;
        restoreCancellationSerials(item);
    } else {
        // ��️ حماية حرجـة لرأس المال: إذا قمت بحذف المنتج يدوياً سابقاً ولم يجده البرنامج
        // نقوم بإعادة إنشائه وضخه في المخزن فوراً بتكلفته الأصلية حتى لا يقل رأس المال
        products.push({
            id: item.id || generateId('P'),
            name: (item.name || '').split(' (S/N:')[0].trim(),
            quantity: returnedQty,
            costPrice: Number(item.costPrice || item.cost) || 0,
            supplierId: item.supplierId || "",
            category: item.category || "عام"
        });
        restoreCancellationSerials(item);
    }
});
        // ج. معالجة "الربح المتوقع" 
        if (typeof expectedProfitsTotal !== 'undefined' && sale.expectedProfit) {
            expectedProfitsTotal -= Number(sale.expectedProfit);
        }

        // تسجيل عملية الإلغاء في سجل العمليات وسجل المبيعات
        if (typeof logOperation === 'function') {
            const cust = sale.customerName || 'عميل نقدي';
            const itemsSummary = (itemsToReturn || []).map(i => `${i.quantity || 1}x ${i.name || ''}`).join(', ');
            let refundTxt = '';
            if (accountId && Number(amount) > 0) {
                const acc = accounts.find(a => String(a.id) === String(accountId));
                const accName = acc ? acc.name : 'الحساب المالي';
                refundTxt = ` مع رد عربون بقيمة ${formatCurrency(amount)} من "${accName}"`;
            }
            logOperation("إلغاء بيع مؤقت", `تم إلغاء البيع المؤقت للعميل "${cust}" (${itemsSummary || 'بدون أصناف'})${refundTxt} وإرجاع البضاعة للمخزن.`);
        }
        
        // د. مسح البيعة وتحديث القيم الإجمالية
        pendingSales.splice(saleIndex, 1);
        
        if (typeof calculateConsignmentValue === 'function') {
            goodsOnConsignmentValue = calculateConsignmentValue();
        }
        
        // هـ. حفظ البيانات (Cloud & Local)
        if (typeof saveData === 'function') await saveData();

        // و. تحديث الواجهة بالكامل لتختفي البيعة ويتعدل الربح أمامك
        if (typeof updateUI === 'function') updateUI();
        if (typeof renderPendingSales === 'function') renderPendingSales(); 
        if (typeof renderDashboard === 'function') renderDashboard(); 

        // �� 2. تحديث وتفعيل أزرار التراجع بعد إتمام العملية بنجاح
        if (typeof updateUndoRedoButtons === 'function') {
            updateUndoRedoButtons();
        }

        // ز. رسالة النجاح
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(`تم الإلغاء بنجاح: تم استرداد ${itemsToReturn.length} صنف للمخزن وإلغاء الأرباح المتوقعة.`, false);
        }

    } catch (error) {
        console.error("خطأ حرج في تنفيذ الإلغاء:", error);
        throw error; 
    }
};

window.fixMyOldReturns = function() {
    let deletedCount = 0;
    const names = ["زياد سعد", "فهد محمد كمال", "عمر عبد الحي"];
    
    // 1. مسح المرتجعات القديمة من قائمة قيد الاستلام
    names.forEach(name => {
        const idx = pendingReturns.findIndex(r => r.customerName === name);
        if (idx > -1) {
            pendingReturns.splice(idx, 1);
            deletedCount++;
        }
    });
    
    if (deletedCount === 0) {
        alert("لم أجد هذه المرتجعات في قائمة قيد الاستلام. ربما قمت بحذفها أو تأكيدها مسبقاً.");
        return;
    }

    // 2. إعادة زرع البيعات المؤقتة بكامل تفاصيلها من الصور
    pendingSales.push({
        id: 'ps_zyad_' + Date.now(),
        customerName: "زياد سعد",
        timestamp: new Date().toISOString(),
        totalSellPrice: 7650,
        totalCost: 6891.8,
        mainProduct: { name: "فاتورة تحتوي على 2 بنود", quantity: 1, costPrice: 6600 },
        additionalItems: [
            { name: "اقلام جديدة", quantity: 1, costPrice: 15.5 },
            { name: "جرابات A9 plus 5g", quantity: 1, costPrice: 107.3 },
            { name: "شواحن جديده اصلية", quantity: 1, costPrice: 89 },
            { name: "وصلات", quantity: 1, costPrice: 80 }
        ],
        potentialProfit: 758.2
    });

    pendingSales.push({
        id: 'ps_fahd_' + Date.now(),
        customerName: "فهد محمد كمال",
        timestamp: new Date().toISOString(),
        totalSellPrice: 4600,
        totalCost: 3964.9,
        mainProduct: { name: "اجهزة a7", quantity: 1, costPrice: 3700 },
        additionalItems: [
            { name: "اقلام جديدة", quantity: 1, costPrice: 15.5 },
            { name: "جرابات a7 - الوزير", quantity: 1, costPrice: 140.9 },
            { name: "سماعات ثانية", quantity: 1, costPrice: 26.1 },
            { name: "شاحن 45 وات اصلي", quantity: 1, costPrice: 82.5 }
        ],
        potentialProfit: 635.1
    });

    pendingSales.push({
        id: 'ps_omar_' + Date.now(),
        customerName: "عمر عبد الحي",
        timestamp: new Date().toISOString(),
        totalSellPrice: 250,
        totalCost: 110,
        mainProduct: { name: "جرابات A7", quantity: 1, costPrice: 110 },
        additionalItems: [],
        potentialProfit: 140
    });

    if (typeof updateUI === 'function') updateUI();
    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    if (typeof saveSystemToCloud === 'function') saveSystemToCloud();
    
    alert("تم تنفيذ السحر! ��‍♂️\nتم حذف المرتجعات المعلقة واستعادتها كبيعات مؤقتة بنجاح، وتم حفظها في السحابة!");
};

