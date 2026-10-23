function resetSellForm() {
        // ✅ تصفير حقول الاستقطاع المخفي
        if (typeof resetDeductionFields === 'function') resetDeductionFields('quick');

    editingPendingSaleId = null; // الخروج من وضع التعديل
    
    if (sellProductNameInput) sellProductNameInput.value = "";
    if (sellCustomerNameInput) sellCustomerNameInput.value = "";
    if (sellQuantityInput) sellQuantityInput.value = "1";
    if (sellPriceInput) sellPriceInput.value = "0";
    if (sellPendingCheckbox) sellPendingCheckbox.checked = false;
    
    // إخفاء حقل السيريال
    if (sellSerialContainer) sellSerialContainer.classList.add('hidden');
    if (sellSerialInput) sellSerialInput.value = '';

    // إعادة الزر لشكله الطبيعي
    if (sellButton) {
        sellButton.textContent = "بيع البضاعة (سريع/مؤقت)";
        sellButton.classList.remove('bg-orange-500', 'hover:bg-orange-600');
        sellButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
    }

    // إخفاء زر الإلغاء
    if (d('cancel-edit-pending-button')) {
        d('cancel-edit-pending-button').classList.add('hidden');
    }

    // تفريغ الملحقات
    if (additionalCostsContainer) {
        additionalCostsContainer.innerHTML = '<p class="text-center text-gray-500 text-sm">أدخل اسم المنتج الرئيسي لعرض المرفقات المتاحة.</p>';
    }

    // تفريغ تحديد الـ POS
    window.pos_selectedProductQuick = null;
    const alertBox = document.getElementById('pos_selected_alert_quick');
    if (alertBox) {
        alertBox.className = "bg-blue-50 border-r-4 border-blue-500 p-3 mb-4 rounded shadow-sm";
    }
    const nameDisplay = document.getElementById('pos_selected_name_quick');
    if (nameDisplay) {
        nameDisplay.innerText = 'لم يتم التحديد بعد';
    }
    window.pos_currentCategoryQuick = 'الكل';
    const searchInput = document.getElementById('pos_search_quick');
    if (searchInput) searchInput.value = '';
    if (typeof window.renderPOSQuickGrid === 'function') window.renderPOSQuickGrid();

    // إخفاء تكلفة المنتج
    const costDisplay = document.getElementById('quick-sell-cost-display');
    if (costDisplay) costDisplay.classList.add('hidden');
    
    // تصفير الربح المتوقع
    const profitDisplay = document.getElementById('quick-sell-profit-display');
    if (profitDisplay) {
        profitDisplay.textContent = '0.00 ج.م';
        profitDisplay.style.color = '#166534';
    }
    
    showMessage(sellMessage, ""); 
}
async function sellProduct(skipConfirmation = true) {


    const isPendingSale = sellPendingCheckbox.checked;
    const mainProductName = sellProductNameInput.value.trim();
    const customerName = d("sell-customer-name").value.trim();
    const quantitySold = parseInputNumber(sellQuantityInput);
    const totalSellPrice = parseInputNumber(sellPriceInput);
    
    const selectedSerial = sellSerialInput ? sellSerialInput.value.trim() : '';
    
    const selectedAccountId = d('sell-account-select').value;
    const account = accounts.find(acc => acc.id === selectedAccountId);

    if (!mainProductName || isNaN(quantitySold) || quantitySold <= 0 || isNaN(totalSellPrice) || totalSellPrice < 0) {
        showMessage(sellMessage, "يرجى ملء البيانات بشكل صحيح.", true);
        return;
    }

    if (!isPendingSale && !account) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage('الرجاء اختيار الخزنة أولاً.', true);
        showMessage(sellMessage, 'الرجاء اختيار الخزنة.', true);
        return;
    }

    let mainProductIndex = products.findIndex(p => (p.id === mainProductName || p.name.trim().toLowerCase() === mainProductName.trim().toLowerCase()) && Number(p.quantity) >= quantitySold);
    if (mainProductIndex === -1) {
        // Fallback to any match (will trigger insufficient quantity error below)
        mainProductIndex = products.findIndex(p => p.id === mainProductName || p.name.trim().toLowerCase() === mainProductName.trim().toLowerCase());
    }
    if (mainProductIndex === -1) {
        showMessage(sellMessage, `المنتج "${mainProductName}" غير موجود في المخزن.`, true);
        return;
    }
    const mainProduct = products[mainProductIndex];
    if (mainProduct.quantity < quantitySold) {
        showMessage(sellMessage, `الكمية غير متوفرة. المتاح: ${mainProduct.quantity}`, true);
        return;
    }

    let serialIndex = -1;
    if (selectedSerial) {
        if (quantitySold !== 1) {
             showMessage(sellMessage, "تنبيه: عند تحديد سيريال، يفضل بيع قطعة واحدة فقط لضمان الدقة.", true);
             return;
        }
        
        serialIndex = serialNumbersLog.findIndex(s => s.serial === selectedSerial && s.productName === mainProductName);
        
        if (serialIndex !== -1) {
            if (serialNumbersLog[serialIndex].status === 'sold') {
                showMessage(sellMessage, `تحذير: هذا السيريال (${selectedSerial}) مسجل كمباع مسبقاً!`, true);
                return;
            }
        }
    }

    let costOfGoodsSold = (Number(mainProduct.costPrice) || 0) * quantitySold;
    let additionalItemsDataForPending = [];
    let additionalItemsToUpdate = [];
    
    const additionalCheckboxes = additionalCostsContainer ? additionalCostsContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
    let stockCheckFailed = false;

    additionalCheckboxes.forEach(checkbox => {
        if (stockCheckFailed) return;
        const parentLabel = checkbox.closest('label');
        const quantityInput = parentLabel ? parentLabel.querySelector('.additional-item-quantity') : null;
        const qtyToDeduct = parseInt(quantityInput?.value || '0') || 0;
        if (qtyToDeduct <= 0) return;
        const additionalProductName = checkbox.value;
        const additionalProductIndex = products.findIndex(p => p.name === additionalProductName);

        if (qtyToDeduct > 0 && additionalProductIndex !== -1) {
            const additionalProduct = products[additionalProductIndex];
            if (additionalProduct.quantity < qtyToDeduct) {
                showMessage(sellMessage, `الكمية المطلوبة (${qtyToDeduct}) للمرفق "${additionalProductName}" غير متوفرة.`, true);
                stockCheckFailed = true;
            } else {
                costOfGoodsSold += (Number(additionalProduct.costPrice) || 0) * qtyToDeduct;
                additionalItemsDataForPending.push({ 
                    id: additionalProduct.id,
                    name: additionalProduct.name, 
                    quantity: qtyToDeduct, 
                    costPrice: additionalProduct.costPrice,
                    category: additionalProduct.category || "عام",
                    supplierId: additionalProduct.supplierId || ""
                });
                additionalItemsToUpdate.push({ index: additionalProductIndex, quantity: qtyToDeduct });
            }
        }
    });

    if (stockCheckFailed) return;

    const m = (typeof window.money === 'function' ? window.money : Number);
    const profit = m(totalSellPrice - costOfGoodsSold);

    // تجهيز الربح الصافي للعرض في نافذة التأكيد (شاملاً الاستقطاع المخفي إن وجد)
    let netProfitForDisplay = profit;
    try {
        const _ded = (typeof getDeductionData === 'function') ? getDeductionData('quick') : null;
        if (_ded && !_ded.error && _ded.amount > 0) {
            netProfitForDisplay = m(netProfitForDisplay - _ded.amount);
        }
    } catch(e) { console.warn("تعذر حساب الاستقطاع في البيع السريع:", e); }

    if (!skipConfirmation) {
        window.showConfirmSaleModal(netProfitForDisplay, () => {
            sellProduct(true);
        });
        return;
    }
    if (typeof saveStateToHistory === 'function') saveStateToHistory(); // �� تفعيل نظام التراجع للبيع السريع

    if (selectedSerial) {
        if (serialIndex !== -1) {
            serialNumbersLog[serialIndex].status = isPendingSale ? 'pending_sale' : 'sold';
        } else {
            serialNumbersLog.push({
                id: generateId("SER"),
                serial: selectedSerial,
                productName: mainProductName,
                supplierId: mainProduct.supplierId || "",
                addedTimestamp: new Date().toISOString(),
                status: isPendingSale ? 'pending_sale' : 'sold'
            });
        }
    }

    // بدء المعاملة الذرية لحماية المخزون والسيولة
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
        // استخدام الدالة الآمنة لخصم المخزون بدل الخصم المباشر
        if (typeof window.adjustStock === 'function') {
        if (!window.adjustStock(mainProductIndex, -quantitySold, "بيع مباشر / معلق")) {
            showMessage(sellMessage, "المخزون الحالي لا يكفي لإتمام البيع!", true);
            if (typeof rollback === 'function') rollback();
            return;
        }
    } else {
        products[mainProductIndex].quantity -= quantitySold;
    }
    
    additionalItemsToUpdate.forEach(item => {
        if (typeof window.adjustStock === 'function') {
            window.adjustStock(item.index, -item.quantity, "إكسسوارات مباعة");
        } else {
            products[item.index].quantity -= item.quantity;
        }
    });

    let productNameWithSerial = mainProduct.name;
    if (selectedSerial) {
        productNameWithSerial += ` (S/N: ${selectedSerial})`;
    }

    if (isPendingSale) {
        goodsOnConsignmentValue += costOfGoodsSold;
        const pendingSaleData = {
            id: generateId("PSALE"),
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            saleDate: currentLoadedDate || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
            customerName,

            mainProduct: {
                id: mainProduct.id,
                name: mainProduct.name,
                quantity: Number(quantitySold) || 0,
                costPrice: Number(mainProduct.costPrice) || 0,
                category: mainProduct.category || "عام",
                supplierId: mainProduct.supplierId || "",
                serial: selectedSerial || null
            },

            additionalItems: (additionalItemsDataForPending || []).map(item => ({
                ...item,
                quantity: Number(item.quantity) || 0,
                costPrice: Number(item.costPrice) || 0
            })),

            totalSellPrice: Number(totalSellPrice) || 0,
            totalCost: Number(costOfGoodsSold) || 0,
            potentialProfit: Number(profit) || 0,
            depositPaid: 0,
            paidAmount: 0,
            status: 'pending'
        };
        // ✅ نظام الاستقطاع المخفي: حفظ بيانات الاستقطاع داخل البيع المؤقت
        const _pendingDeduction = (typeof getDeductionData === 'function') ? getDeductionData('quick') : null;
        if (_pendingDeduction && !_pendingDeduction.error) {
            pendingSaleData.deductionAmount = _pendingDeduction.amount;
            pendingSaleData.deductionLiabilityName = _pendingDeduction.liabilityName; pendingSaleData.potentialProfit = netProfitForDisplay; }
        pendingSales.push(pendingSaleData);
        logOperation("بيع مؤقت", `بيع مؤقت: ${productNameWithSerial}`);
        showMessage(sellMessage, "تم تسجيل البيع المؤقت بنجاح.");
    } else {
        account.balance = window.money(account.balance + totalSellPrice); totalProfit = window.money(totalProfit + (typeof netProfitForDisplay !== "undefined" ? netProfitForDisplay : profit));
        
        const newTotalLiquidity = (typeof window.money === 'function' ? window.money : Number)(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0));
        liquidityLog.push({ id: generateId("liq"), timestamp: new Date().toISOString(), type: "add", amount: totalSellPrice, description: `بيع بضاعة: ${productNameWithSerial}`, currentBalance: newTotalLiquidity, accountId: account.id });

        const allItems = [
            { name: mainProduct.name, quantity: quantitySold, costPrice: mainProduct.costPrice, serial: selectedSerial },
            ...additionalItemsDataForPending
        ];

        // توليد رقم فاتورة تلقائي للبيع السريع - يستخدم تاريخ اليوم المحمل بدل تاريخ اليوم الحقيقي
        const quickRandNum = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? (10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000)) : Math.floor(10000 + Math.random() * 90000);
        const quickInvoiceNumber = `${quickDateStr}-${quickRandNum}`;

        const saleRecord = { 
            id: generateId('sale'), 
            type: 'quick', 
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            saleDate: currentLoadedDate || getTodayDateString(),
            invoiceNumber: quickInvoiceNumber,
            customerName, 
            items: allItems, 
            totalSellPrice, totalCost: costOfGoodsSold, profit: (typeof netProfitForDisplay !== "undefined" ? netProfitForDisplay : profit),
            grandTotal: totalSellPrice,
            accountId: selectedAccountId,
            deductionAmount: (typeof getDeductionData === 'function') ? (getDeductionData('quick')?.amount || 0) : 0,
            deductionLiabilityName: (typeof getDeductionData === 'function') ? (getDeductionData('quick')?.liabilityName || '') : ''
        };
        salesToday.push(saleRecord);
        // ✅ نظام الاستقطاع المخفي: تطبيق الاستقطاع عند البيع النهائي
        const _deductionData = (typeof getDeductionData === 'function') ? getDeductionData('quick') : null;
        if (_deductionData && !_deductionData.error) {
            if (typeof applyDeduction === 'function') applyDeduction(_deductionData, saleRecord);
        }
        if (typeof saveInvoiceToFirestore === 'function') {
            await saveInvoiceToFirestore(saleRecord);
        }
        logOperation("بيع بضاعة", `بيع ${productNameWithSerial} بسعر ${formatCurrency(totalSellPrice)}`);
        showMessage(sellMessage, "تم تسجيل البيعة بنجاح.");
    }

    updateUI();
    resetSellForm(); // تنظيف النموذج فوراً بعد البيع لمنع ظهور البيانات القديمة
    window.showPostSaleModal('quick');

        if (typeof saveCurrentStateByDate === 'function') { 
            await saveCurrentStateByDate(currentLoadedDate || (typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })))); 
        }
    } catch (sellErr) {
        if (_tx) await _tx.rollback();
        console.error("❌ فشلت عملية البيع السريع (تم التراجع عن التعديلات):", sellErr);
        showMessage(sellMessage, "فشلت عملية البيع؛ تم التراجع التلقائي عن أي تعديل في المخزن أو الخزنة.", true);
        throw sellErr;
    }
}
async function updatePendingSale(pendingId) {
    const saleIndex = pendingSales.findIndex(s => s.id === pendingId);
    if (saleIndex === -1) {
        showGlobalMessage("خطأ: لم يتم العثور على البيع المؤقت.", true);
        resetSellForm();
        return;
    }

    const originalSale = pendingSales[saleIndex];
    if (!originalSale || !originalSale.mainProduct) {
        if (typeof showGlobalMessage === "function") showGlobalMessage("لا يمكن تعديل هذه الفاتورة من هنا كبيع سريع لأنها فاتورة تفصيلية متعددة البنود.", true);
        return;
    }

    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        // =========================================================
        // خطوة 1: إرجاع المخزون القديم بالكامل (Revert Stock)
        // =========================================================
        const oldMainProduct = originalSale.mainProduct;
        const oldAttachments = originalSale.additionalItems || [];
        const oldMainNameSimple = oldMainProduct.name.split(' (S/N:')[0];
        const oldMainIndex = products.findIndex(p => p.name === oldMainNameSimple);
        
        if (oldMainIndex !== -1) {
            products[oldMainIndex].quantity += Number(oldMainProduct.quantity);
        } else {
            // لو المنتج اتحذف بالغلط، نرجعه عشان الحسابات تظبط
            products.push({ ...oldMainProduct, id: oldMainProduct.id || generateId("PROD"), name: oldMainNameSimple });
        }

        // إرجاع الملحقات
        oldAttachments.forEach(att => {
            const attIndex = products.findIndex(p => p.name === att.name);
            if (attIndex !== -1) {
                products[attIndex].quantity += Number(att.quantity);
            }
        });

        // =========================================================
        // خطوة 2: التحقق من البيانات الجديدة
        // =========================================================
        const newMainProductName = sellProductNameInput.value.trim();
        const newCustomerName = sellCustomerNameInput.value.trim();
        const newQuantitySold = parseInputNumber(sellQuantityInput);
        const newTotalSellPrice = parseInputNumber(sellPriceInput);
        const newSerial = sellSerialInput ? sellSerialInput.value.trim() : '';

        // التحقق من صحة المدخلات
        if (!newMainProductName || isNaN(newQuantitySold) || newQuantitySold <= 0 || isNaN(newTotalSellPrice)) {
            showMessage(sellMessage, "البيانات المدخلة غير صحيحة. تم التراجع عن العملية وإعادة المخزون السابق.", true);
            if (_tx) await _tx.rollback();
            return;
        }

        // التحقق من توفر الكميات الجديدة في المخزون
        const newMainIndex = products.findIndex(p => p.name === newMainProductName);
        if (newMainIndex === -1 || products[newMainIndex].quantity < newQuantitySold) {
            showMessage(sellMessage, `الكمية الجديدة المطلوبة غير متوفرة. (المتاح: ${newMainIndex !== -1 ? products[newMainIndex].quantity : 0})`, true);
            if (_tx) await _tx.rollback();
            return;
        }

        // =========================================================
        // خطوة 3: خصم المخزون الجديد (Apply New Stock Deduction)
        // =========================================================
        
        // خصم المنتج الرئيسي الجديد
        if (typeof window.adjustStock === 'function') {
            if (!window.adjustStock(newMainIndex, -newQuantitySold, "استبدال منتج")) {
                if (_tx) await _tx.rollback();
                if (typeof showGlobalMessage === "function") showGlobalMessage("المخزون الحالي للمنتج الجديد لا يكفي!", true); else alert("المخزون الحالي للمنتج الجديد لا يكفي!");
                return;
            }
        } else {
            products[newMainIndex].quantity -= newQuantitySold;
        }
        
        // حساب التكلفة الجديدة
        let newTotalCost = (Number(products[newMainIndex].costPrice) || 0) * newQuantitySold;
        
        let newAdditionalItemsData = [];
        const additionalCheckboxes = additionalCostsContainer ? additionalCostsContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
        let attFailed = false;

        for (const checkbox of additionalCheckboxes) {
            if (attFailed) break;
            const attName = checkbox.value;
            const parentLabel = checkbox.closest('label');
            const qtyInput = parentLabel ? parentLabel.querySelector('.additional-item-quantity') : null;
            const qtyToDeduct = parseInt(qtyInput?.value || '0') || 0;
            
            if (qtyToDeduct <= 0) continue;
            const attIndex = products.findIndex(p => p.name === attName);
            
            if (attIndex !== -1) {
                if (products[attIndex].quantity >= qtyToDeduct) {
                    if (typeof window.adjustStock === 'function') {
                        if (!window.adjustStock(attIndex, -qtyToDeduct, "إكسسوارات استبدال")) {
                            if (_tx) await _tx.rollback();
                            if (typeof showGlobalMessage === "function") showGlobalMessage("مخزون الملحقات لا يكفي!", true); else alert("مخزون الملحقات لا يكفي!");
                            return;
                        }
                    } else {
                        products[attIndex].quantity -= qtyToDeduct;
                    }
                    newTotalCost += (Number(products[attIndex].costPrice) || 0) * qtyToDeduct;
                    
                    newAdditionalItemsData.push({
                        name: attName,
                        quantity: qtyToDeduct,
                        costPrice: products[attIndex].costPrice,
                        supplierId: products[attIndex].supplierId
                    });
                } else {
                    showMessage(sellMessage, `الكمية المطلوبة (${qtyToDeduct}) للمرفق "${attName}" غير متوفرة.`, true);
                    attFailed = true;
                }
            }
        }

        if (attFailed) {
            if (_tx) await _tx.rollback();
            return;
        }

        // ضبط الاسم بالسيريال الجديد
        let displayName = newMainProductName;
        if (newSerial) displayName += ` (S/N: ${newSerial})`;

        // تحديث حالة السيريال
        if (typeof serialNumbersLog !== 'undefined') {
            const oldSerialName = oldMainProduct.name;
            const oldSerialMatch = oldSerialName.match(/\(S\/N: (.*?)\)/);
            if (oldSerialMatch) {
                const oldS = oldSerialMatch[1];
                const oldLogIdx = serialNumbersLog.findIndex(l => l.serial === oldS);
                if (oldLogIdx !== -1) serialNumbersLog[oldLogIdx].status = 'in_stock';
            }
            if (newSerial) {
                 const newLogIdx = serialNumbersLog.findIndex(l => l.serial === newSerial);
                 if (newLogIdx !== -1) {
                     serialNumbersLog[newLogIdx].status = 'pending_sale';
                 } else {
                     serialNumbersLog.push({
                         id: generateId("SER"),
                         serial: newSerial,
                         productName: newMainProductName,
                         supplierId: products[newMainIndex].supplierId || "",
                         addedTimestamp: new Date().toISOString(),
                         status: 'pending_sale'
                     });
                 }
            }
        }

        // حساب الفروقات لسجل التعديلات
        var _diffChanges = [];
        if ((originalSale.customerName || '').trim() !== (newCustomerName || '').trim()) {
            _diffChanges.push("تغيير اسم العميل: \"" + (originalSale.customerName || "غير محدد") + "\" ← \"" + newCustomerName + "\"");
        }
        var _oldMainName = (originalSale.mainProduct && originalSale.mainProduct.name) ? originalSale.mainProduct.name.split(' (S/N:')[0].trim() : '';
        var _newMainName = displayName.split(' (S/N:')[0].trim();
        if (_oldMainName !== _newMainName) {
            _diffChanges.push("تغيير المنتج: \"" + _oldMainName + "\" ← \"" + _newMainName + "\"");
        }
        var _oldQty = Number(originalSale.mainProduct && originalSale.mainProduct.quantity) || 0;
        if (_oldQty !== newQuantitySold) {
            _diffChanges.push("تغيير الكمية: " + _oldQty + " ← " + newQuantitySold);
        }
        var _oldPrice = Number(originalSale.totalSellPrice) || 0;
        if (Math.abs(_oldPrice - newTotalSellPrice) > 0.01) {
            _diffChanges.push("تغيير السعر: " + _oldPrice + " ← " + newTotalSellPrice);
        }
        var _editHistory = Array.isArray(originalSale.editHistory) ? originalSale.editHistory.slice() : [];
        if (_diffChanges.length > 0) {
            _editHistory.push({ date: new Date().toISOString(), changes: _diffChanges });
        }

        // التحديث النهائي للكائن - مع الحفاظ على التاريخ الأصلي
        let finalPotentialProfit = newTotalSellPrice - newTotalCost;
        const _pendingDeduction = (typeof getDeductionData === 'function') ? getDeductionData('quick') : null;
        let _deductionAmount = 0;
        let _deductionLiabilityName = '';
        
        if (_pendingDeduction && !_pendingDeduction.error) {
            _deductionAmount = _pendingDeduction.amount;
            _deductionLiabilityName = _pendingDeduction.liabilityName;
            finalPotentialProfit -= _deductionAmount;
        }

        pendingSales[saleIndex] = {
            ...originalSale,
            customerName: newCustomerName,
            mainProduct: { 
                name: displayName, 
                quantity: newQuantitySold, 
                costPrice: products[newMainIndex].costPrice, 
                supplierId: products[newMainIndex].supplierId 
            },
            additionalItems: newAdditionalItemsData,
            totalSellPrice: newTotalSellPrice,
            totalCost: newTotalCost,
            potentialProfit: finalPotentialProfit,
            deductionAmount: _deductionAmount,
            deductionLiabilityName: _deductionLiabilityName,
            timestamp: originalSale.timestamp || new Date().toISOString(),
            editHistory: _editHistory
        };

        logOperation("تعديل بيع مؤقت", "تم تحديث بيانات البيع للعميل: " + newCustomerName + ".");

        if (_tx) _tx.commit();
        if (typeof saveSystemToCloud === 'function') {
            await saveSystemToCloud();
        }

        showMessage(sellMessage, "تم تحديث البيع المؤقت وتعديل المخزون بنجاح.");
        resetSellForm();
        updateUI();
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("فشل تعديل البيع المؤقت:", err);
        showMessage(sellMessage, "حدث خطأ أثناء تعديل البيع المؤقت؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
    }
}
window.injectSaleToMain = function(saleObj) { 
    // 1. الحقن في مبيعات اليوم (مع فحص أمان للمتغيرات)
    if (typeof salesToday !== 'undefined' && Array.isArray(salesToday)) {
        salesToday.push(saleObj); 
    } else if (window.salesToday && Array.isArray(window.salesToday)) {
        window.salesToday.push(saleObj);
    }
    
    // 2. الحقن في سجلات البحث والفواتير المتراكمة (للتوافق الشامل مع محركات البحث)
    if (typeof invoices !== 'undefined' && Array.isArray(invoices)) invoices.push(saleObj);
    if (typeof salesHistory !== 'undefined' && Array.isArray(salesHistory)) salesHistory.push(saleObj);
    if (typeof allSales !== 'undefined' && Array.isArray(allSales)) allSales.push(saleObj);
    if (typeof sales !== 'undefined' && Array.isArray(sales)) sales.push(saleObj); // إضافة احتياطية لمصفوفة sales
};
window.usm_currentOrigin = 'quick'; 
window.usm_cart = {}; 

