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
    const cleanRefundAmt = (typeof window.money === 'function' ? window.money : Number)(Number(amount) || 0);

    // التحقق من توفر حساب ورصيد كافٍ قبل أي تعديل لمنع السحب على المكشوف أو حذف البيعة دون رد العربون
    let refundAcc = null;
    if (cleanRefundAmt > 0.001) {
        if (!accountId) {
            alert("يرجى اختيار الحساب المالي لرد العربون قبل إلغاء البيعة.");
            return;
        }
        refundAcc = accounts.find(a => String(a.id) === String(accountId));
        if (!refundAcc) {
            alert("الحساب المالي المختار لرد العربون غير موجود.");
            return;
        }
        if (cleanRefundAmt > (Number(refundAcc.balance) || 0) + 0.001) {
            alert(`رصيد حساب "${refundAcc.name}" (${formatCurrency(refundAcc.balance)}) غير كافٍ لرد العربون (${formatCurrency(cleanRefundAmt)}).`);
            return;
        }
    }

    if (typeof saveStateToHistory === 'function') {
        saveStateToHistory();
    }
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        // أ. معالجة السيولة (رد العربون أو المدفوع)
        if (refundAcc && cleanRefundAmt > 0.001) {
            refundAcc.balance = (typeof window.money === 'function' ? window.money : Number)((Number(refundAcc.balance) || 0) - cleanRefundAmt);
            const newTotalLiq = (typeof window.money === 'function' ? window.money : Number)(accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0));
            liquidityLog.push({
                id: generateId("liq-refund"),
                timestamp: new Date().toISOString(),
                type: "remove",
                amount: cleanRefundAmt,
                description: `رد عربون (إلغاء بيعة مؤقتة) - عميل: ${sale.customerName || '-'}`,
                accountId: refundAcc.id,
                currentBalance: newTotalLiq
            });
        }

        // ب. إرجاع البضاعة للمخزن (تجميع الأصناف بحذر لتجنب التكرار)
        let itemsToReturn = [];
        
        if (sale.mainProduct) {
            itemsToReturn.push(sale.mainProduct);
            if (sale.additionalItems && Array.isArray(sale.additionalItems)) {
                itemsToReturn.push(...sale.additionalItems);
            }
        } else {
            if (sale.items && sale.items.length > 0) {
                itemsToReturn.push(...sale.items);
            } else if (sale.invoiceData && sale.invoiceData.items) {
                itemsToReturn.push(...sale.invoiceData.items);
            }
        }
        
        const extraDeducted = sale.deductedItems || (sale.invoiceData ? sale.invoiceData.deductedItems : []) || [];
        itemsToReturn.push(...extraDeducted);
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
            const cleanItemName = (item.name || '').split(' (S/N:')[0].trim().toLowerCase();
            let product = (item.id ? products.find(p => String(p.id) === String(item.id)) : null) || 
                          products.find(p => p.name.trim().toLowerCase() === cleanItemName);
            const returnedQty = Number(item.quantity) || 1;
            const retCost = Number(item.costPrice || item.cost || 0) || 0;

            if (product) {
                const oldQty = Number(product.quantity) || 0;
                const oldCost = Number(product.costPrice) || 0;
                const newQty = oldQty + returnedQty;
                if (newQty > 0 && retCost > 0) {
                    product.costPrice = Math.round((((oldQty * oldCost) + (returnedQty * retCost)) / newQty) * 1e6) / 1e6;
                }
                product.quantity = newQty;
                restoreCancellationSerials(item);
            } else {
                products.push({
                    id: item.id || generateId('P'),
                    name: (item.name || '').split(' (S/N:')[0].trim(),
                    quantity: returnedQty,
                    costPrice: Math.round(retCost * 1e6) / 1e6,
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

        // تسجيل عملية الإلغاء في سجل العمليات
        if (typeof logOperation === 'function') {
            const cust = sale.customerName || 'عميل نقدي';
            const itemsSummary = (itemsToReturn || []).map(i => `${i.quantity || 1}x ${i.name || ''}`).join(', ');
            let refundTxt = '';
            if (refundAcc && cleanRefundAmt > 0.001) {
                refundTxt = ` مع رد عربون بقيمة ${formatCurrency(cleanRefundAmt)} من "${refundAcc.name}"`;
            }
            logOperation("إلغاء بيع مؤقت", `تم إلغاء البيع المؤقت للعميل "${cust}" (${itemsSummary || 'بدون أصناف'})${refundTxt} وإرجاع البضاعة للمخزن.`);
        }
        
        // د. مسح البيعة وتحديث القيم الإجمالية
        pendingSales.splice(saleIndex, 1);
        
        if (typeof calculateConsignmentValue === 'function') {
            goodsOnConsignmentValue = calculateConsignmentValue();
        }
        
        if (_tx) _tx.commit();
        // هـ. حفظ البيانات السحابية فوراً (استبدال saveData المعطوبة بـ saveSystemToCloud)
        if (typeof saveSystemToCloud === 'function') {
            await saveSystemToCloud({ immediate: true });
        }

        if (typeof updateUI === 'function') updateUI();
        if (typeof renderPendingSales === 'function') renderPendingSales(); 
        if (typeof renderDashboard === 'function') renderDashboard(); 
        if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();

        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(`تم الإلغاء بنجاح: تم استرداد ${itemsToReturn.length} صنف للمخزن وإلغاء الأرباح المتوقعة.`, false);
        }

    } catch (error) {
        if (_tx) await _tx.rollback();
        console.error("خطأ حرج في تنفيذ الإلغاء (تم التراجع):", error);
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

