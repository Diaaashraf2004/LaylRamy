// finance-core-returns.js - Returns Logic
function renderReturnCategoriesUI() {
    const container = document.getElementById('return-categories-container');
    const list = document.getElementById('return-categories-list');
    if (!container || !list) return;

    list.innerHTML = '';
    let items = [];

    // استخراج العناصر التي سيتم إرجاعها
    if (typeof returnSourceData !== 'undefined' && returnSourceData !== null) {
        if (typeof window.extractPendingSaleReturnItems === 'function') {
            const extracted = window.extractPendingSaleReturnItems(returnSourceData);
            items = extracted.allItems.map(i => ({ name: i.name, category: i.category || "عام", costPrice: i.costPrice || 0 }));
        } else if (returnSourceData.items) {
            items = returnSourceData.items.map(i => {
                let cat = i.category;
                if (!cat) {
                    const p = products.find(prod => prod.name === i.name);
                    cat = p ? (p.category || "عام") : "عام";
                }
                return { name: i.name, category: cat, costPrice: i.costPrice || 0 };
            });
        } else if (returnSourceData.mainProduct) {
            let mainCat = returnSourceData.mainProduct.category;
            if (!mainCat) {
                const mp = products.find(prod => prod.name === returnSourceData.mainProduct.name);
                mainCat = mp ? (mp.category || "عام") : "عام";
            }
            items.push({ name: returnSourceData.mainProduct.name, category: mainCat, costPrice: returnSourceData.mainProduct.costPrice || 0 });
            
            if (returnSourceData.additionalItems) {
                returnSourceData.additionalItems.forEach(i => {
                    let cat = i.category;
                    if (!cat) {
                        const p = products.find(prod => prod.name === i.name);
                        cat = p ? (p.category || "عام") : "عام";
                    }
                    items.push({ name: i.name, category: cat, costPrice: i.costPrice || 0 });
                });
            }
        }
    } else {
        const prodSelect = document.getElementById('return-product-select');
        const manualInput = document.getElementById('return-manual-product-name');
        if (prodSelect && prodSelect.value) {
            const p = products.find(p => p.id === prodSelect.value);
            if (p) items.push({ name: p.name, category: p.category || "عام" });
        } else if (manualInput && manualInput.value.trim() !== '') {
            items.push({ name: manualInput.value.trim(), category: "عام" });
        }
    }

    if (items.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    
    // الأقسام المتاحة حالياً
    const availableCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    if (!availableCategories.includes("عام")) availableCategories.push("عام");
    if (!availableCategories.includes("مرتجع")) availableCategories.push("مرتجع");

    items.forEach((item, index) => {
        let optionsHtml = availableCategories.map(cat => 
            `<option value="${cat}" ${cat === item.category ? 'selected' : ''}>${cat}</option>`
        ).join('');
        // خيار إضافة قسم جديد
        optionsHtml += `<option value="new_custom_category">+ قسم جديد...</option>`;

        const costBadge = (item.costPrice && item.costPrice > 0) ? `<span class="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mr-2">تكلفة: ${formatCurrency(item.costPrice)}</span>` : '';
        list.innerHTML += `
            <div class="mb-2 flex items-center justify-between return-cat-row border-b pb-2" data-index="${index}">
                <div class="font-semibold text-xs text-gray-800 flex items-center gap-1">${escapeHTML(item.name)}${costBadge}</div>
                <div class="flex items-center gap-2">
                    <select class="form-select text-sm py-1 return-item-cat-select" onchange="handleReturnCategoryChange(this)">
                        ${optionsHtml}
                    </select>
                    <input type="text" class="form-input text-sm py-1 hidden return-item-cat-custom" placeholder="اسم قسم جديد...">
                </div>
            </div>
        `;
    });
}

window.handleReturnCategoryChange = function(selectEl) {
    const customInput = selectEl.nextElementSibling;
    if (selectEl.value === 'new_custom_category') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
    }
};

function getSelectedReturnCategories() {
    const cats = [];
    document.querySelectorAll('.return-cat-row').forEach(row => {
        const select = row.querySelector('.return-item-cat-select');
        const custom = row.querySelector('.return-item-cat-custom');
        if (select.value === 'new_custom_category' && custom.value.trim() !== '') {
            cats.push(custom.value.trim());
        } else if (select.value !== 'new_custom_category') {
            cats.push(select.value);
        } else {
            cats.push("عام");
        }
    });
    return cats;
}
function populateReturnProductSelect() {
    const returnProductSelect = d('return-product-select');
    if (!returnProductSelect) return;
    
    const currentSelection = returnProductSelect.value; // حفظ الـ ID أو القيمة الحالية
    returnProductSelect.innerHTML = '<option value="">-- اختر من القائمة --</option>';

    const productsInStock = products.filter(p => (p.quantity || 0) > 0);
    const sortedProducts = productsInStock.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    // �� [تعديل د. ضياء]: جعل قائمة أصناف المرتجعات ترسل الـ ID الفريد لمنع تداخل الأصناف متشابهة الاسم
    sortedProducts.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id || p.name; // �� تمرير الـ ID الفريد كقيمة للخيار
        option.textContent = `${p.name} (القسم: ${p.category || 'عام'}) - المتاح: ${p.quantity}`;
        option.dataset.cost = p.costPrice;
        option.dataset.sellPrice = p.sellPrice || p.price || p.costPrice || 0;
        option.dataset.id = p.id || ""; // أمان إضافي لحفظ الـ ID في الداتا سيت
        returnProductSelect.appendChild(option);
    });

    // �� [تأمين د. ضياء]: التحقق بالـ ID أو الاسم لضمان بقاء المنتج المختار نشطاً دون مسحه أثناء التحديث
    if (sortedProducts.some(p => (p.id && p.id === currentSelection) || p.name === currentSelection)) {
        returnProductSelect.value = currentSelection;
    }
}
function updateReturnsUI() {
    updateCompletedReturnsDisplay();
    updatePendingReturnsDisplay();
    if (typeof window.renderSupplierPurchasesReturnList === 'function') window.renderSupplierPurchasesReturnList();
    if (typeof window.renderCompletedPurchaseReturns === 'function') window.renderCompletedPurchaseReturns();
}

function updateCompletedReturnsDisplay() {
    const completedReturnsList = d('completed-returns-list');
    if (!completedReturnsList) return;
    if (completedReturns.length === 0) {
        completedReturnsList.innerHTML = '<p class="text-center text-gray-500">لم تتم أي عمليات إرجاع اليوم.</p>';
        return;
    }
    const sortedReturns = [...completedReturns].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    completedReturnsList.innerHTML = sortedReturns.map(ret => `
        <div class="p-2 border-b">
            <div><strong>${(ret.items || []).map(item => `${item.quantity}x ${escapeHTML(item.name)}`).join(', ')}</strong> <span class="text-sm text-gray-500">(${escapeHTML(ret.customerName)})</span></div>
            <div class="font-mono text-red-600">-${formatCurrency(ret.returnedAmount)}</div>
            <div class="text-xs text-gray-400">${formatDateTime(ret.timestamp)}</div>
        </div>
    `).join('');
}

function updatePendingReturnsDisplay() {
    const pendingReceiptList = d('pending-receipt-list');
    if (!pendingReceiptList) return;
    if (pendingReturns.length === 0) {
        pendingReceiptList.innerHTML = '<p class="text-center text-gray-500">لا توجد مرتجعات معلقة حاليًا.</p>';
        return;
    }
    const sortedReturns = [...pendingReturns].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    pendingReceiptList.innerHTML = sortedReturns.map(ret => `
        <div class="p-3 border rounded-md bg-yellow-50 shadow-sm mb-2">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <span class="font-bold text-gray-800">عميل: ${escapeHTML(ret.customerName)}</span>
                    <div class="text-xs text-gray-400">${formatDateTime(ret.timestamp)}</div>
                </div>
                <button data-pending-return-id="${ret.id}" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded text-xs confirm-receipt-btn">تأكيد الاستلام</button>
            </div>
            <div class="bg-white p-2 rounded border border-yellow-100 text-sm">
                <div class="font-semibold mb-1 border-b pb-1 text-gray-600">تفاصيل البضاعة المعادة وتكلفتها:</div>
                ${(ret.items || []).map(item => `
                    <div class="flex justify-between py-1 border-gray-50 last:border-0">
                        <span>${item.quantity}x ${escapeHTML(item.name)}</span>
                        <span class="text-gray-600 font-mono text-xs">تكلفة: ${formatCurrency((Number(item.costPrice) || 0) * (Number(item.quantity) || 1))}</span>
                    </div>
                `).join('')}
                <div class="flex justify-between mt-2 pt-1 border-t text-red-600 font-bold">
                    <span>المبلغ المسترد للعميل:</span>
                    <span>${formatCurrency(ret.returnedAmount)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// أضف هذه الدالة الجديدة بالكامل
// الكود الجديد (الصحيح)
function updateReturnFormVisibility() {
    const returnType = document.querySelector('input[name="return-financial-type"]:checked')?.value;
    const amountGroup = d('return-sale-price-group');
    const accountGroup = d('return-account-selector-container');

    if (!amountGroup || !accountGroup) return;

    // ✅ التعديل الجديد: إظهار حقل القيمة مع خيار "المخزون فقط"
    if (returnType === 'stock') {
        amountGroup.classList.remove('hidden'); // <-- أصبحت ظاهرة
        accountGroup.classList.add('hidden');
    } else if (returnType === 'credit') {
        amountGroup.classList.remove('hidden');
        accountGroup.classList.add('hidden');
    } else { // 'cash'
        amountGroup.classList.remove('hidden');
        accountGroup.classList.remove('hidden');
    }
}
function handleManualReturn() {
    saveStateToHistory();
    const returnMessage = d('return-message');
    
    // قراءة البيانات من المدخلات
   // قراءة البيانات من المدخلات بالـ ID أو الاسم لمنع المنتجات الوهمية
    const selectedValue = d('return-product-select').value;
    const manualName = d('return-manual-product-name').value.trim();
    let productData = null;
    let productName = '';

    if (selectedValue) {
        productData = products.find(p => p.id === selectedValue) || products.find(p => p.name === selectedValue);
        productName = productData ? productData.name : selectedValue;
    } else {
        productName = manualName;
        if (manualName) {
            productData = products.find(p => p.name.trim().toLowerCase() === manualName.toLowerCase());
        }
    }
     const quantity = parseInputNumber(d('return-quantity'));
    const customerName = d('return-customer-name').value.trim() || 'عميل';
    const returnedAmount = parseInputNumber(d('return-sale-price-input'));
    const financialTypeElement = document.querySelector('input[name="return-financial-type"]:checked');
    const financialType = financialTypeElement ? financialTypeElement.value : 'cash';
    const receiveNow = d('return-receive-now').checked;
    const returnAtSalePrice = d('return-at-sale-price').checked;
    const selectedAccountId = d('return-from-account-select').value;
    const account = accounts.find(acc => acc.id === selectedAccountId);

    // التحقق من صحة المدخلات
    if (!productName || isNaN(quantity) || quantity <= 0) {
        showMessage(returnMessage, "يرجى إدخال اسم المنتج وكمية صحيحة.", true); return;
    }
    if (financialType !== 'stock' && (isNaN(returnedAmount) || returnedAmount < 0)) {
        showMessage(returnMessage, "يرجى إدخال مبلغ صحيح للمرتجع.", true); return;
    }
    if (financialType === 'cash' && !account) {
        showMessage(returnMessage, "للإرجاع النقدي، يجب اختيار الحساب الذي سيتم الخصم منه.", true); return;
    }
    
    // =================================================================
    // ���� التعديل الجوهري هنا: حساب تكلفة البضاعة بناءً على خيارك ����
    // =================================================================
    let costOfGoods = 0;
    let isFromPendingSale = false;

    if (typeof returnSourceData !== 'undefined' && returnSourceData !== null) {
        // إذا كان المرتجع قادماً من بيعة مؤقتة، نستخدم التكلفة الحقيقية الأصلية الإجمالية (بما فيها الملحقات إن وجدت)
        if (returnSourceData.totalCost !== undefined) {
            costOfGoods = Number(returnSourceData.totalCost) || 0;
        } else if (returnSourceData.mainProduct) {
            const mainCost = (Number(returnSourceData.mainProduct.costPrice) || 0) * (Number(returnSourceData.mainProduct.quantity) || 1);
            const additionalCost = (returnSourceData.additionalItems || []).reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)), 0);
            costOfGoods = mainCost + additionalCost;
        } else if (returnSourceData.items) {
            costOfGoods = returnSourceData.items.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)), 0);
        }
        isFromPendingSale = true;
    } else if (returnAtSalePrice) {
        // الحالة 1: إذا اخترت الإرجاع بسعر البيع
        // نعتبر أن التكلفة هي نفس المبلغ الذي أرجعته للعميل (إعادة شراء)
        costOfGoods = returnedAmount;
    } else if (productData) {
        // الحالة 2: إرجاع عادي والمنتج موجود -> نستخدم متوسط التكلفة القديم
        costOfGoods = (productData.costPrice || 0) * quantity;
    } else {
        // الحالة 3: إرجاع عادي لمنتج غير موجود -> نستخدم مبلغ الإرجاع كتكلفة
        costOfGoods = returnedAmount;
    }

    let logDetails = "";

    // --- 2. الإجراء المالي (السيولة أو الديون) ---
    if (financialType === 'cash') {
        if (returnedAmount > account.balance) { 
            showMessage(returnMessage, `رصيد حساب "${account.name}" غير كافٍ.`, true); 
            return; 
        }
        account.balance = window.money(account.balance - returnedAmount);
        if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
            liquidityLog.push({
                id: 'liq-ret-' + Date.now(),
                date: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                type: 'remove',
                amount: returnedAmount,
                description: `إرجاع نقدي للعميل "${customerName}" من حساب "${account.name}"`,
                reason: `إرجاع نقدي للعميل "${customerName}"`,
                accountId: account.id,
                accountName: account.name,
                account: account.name,
                currentBalance: account.balance
            });
        }
        logDetails = `إرجاع نقدي ${formatCurrency(returnedAmount)} للعميل "${customerName}" من حساب "${account.name}".`;
    } else if (financialType === 'credit') {
        liabilities.push({ id: generateId('liab'), name: `رصيد مرتجع للعميل: ${customerName}`, amount: returnedAmount });
        logDetails = `تسجيل رصيد للعميل "${customerName}" بقيمة ${formatCurrency(returnedAmount)}.`;
    }

    // --- 3. حساب الأرباح المراد عكسها (دون خصمها الآن إذا كان قيد الاستلام) ---
    let profitToReverse = 0;
    let pendingSaleProfit = 0; // للاحتفاظ بالربح المتوقع للبيعات المؤقتة
    if ((financialType === 'cash' || financialType === 'credit')) {
        profitToReverse = returnedAmount - costOfGoods;
        
        // لا يتم عكس أرباح البيعات المؤقتة أبداً لأن ربحها غير محقق
        if (isFromPendingSale) {
            profitToReverse = 0;
            pendingSaleProfit = Number(returnSourceData.potentialProfit) || 0;
        }
    }

    // --- 4. إجراء المخزون ---
    // بناء مصفوفة الأصناف المرتجعة بدقة للحفاظ على الملحقات بشكل منفصل بدلاً من دمجها
    let itemsToReturn = [];
    if (isFromPendingSale && typeof returnSourceData !== 'undefined' && returnSourceData !== null) {
        if (typeof window.extractPendingSaleReturnItems === 'function') {
            itemsToReturn = window.extractPendingSaleReturnItems(returnSourceData).allItems;
        } else if (returnSourceData.items) {
            itemsToReturn = returnSourceData.items.map(i => ({...i}));
        } else if (returnSourceData.mainProduct) {
            itemsToReturn.push({...returnSourceData.mainProduct});
            if (returnSourceData.additionalItems) returnSourceData.additionalItems.forEach(i => itemsToReturn.push({...i}));
        }
    } else {
        const newUnitCost = (quantity > 0) ? (costOfGoods / quantity) : 0;
        itemsToReturn = [{ 
            id: productData ? productData.id : null, 
            name: productName, 
            quantity: quantity, 
            costPrice: newUnitCost,
            category: productData ? (productData.category || "مرتجع") : "مرتجع",
            supplierId: productData ? (productData.supplierId || "") : "",
            serial: (document.getElementById('return-serial-input')?.value || '').trim()
        }];
    }
    const selectedCats = getSelectedReturnCategories();
        itemsToReturn.forEach((item, index) => {
            if (selectedCats[index]) {
                item.category = selectedCats[index];
            }
        });

    if (receiveNow) {
        itemsToReturn.forEach(item => {
            const itemQty = Number(item.quantity) || 1;
            if (returnAtSalePrice) {
                // إذا كان المرتجع بسعر البيع، يتم توليد منتج جديد منفصل
                const uniqueProductCode = (typeof window.generateGlobalID === 'function') ? window.generateGlobalID('code') : ('code_' + Date.now().toString(36));
                products.push({ 
                    id: uniqueProductCode, 
                    name: `${item.name} - ${customerName} (مرتجع)`, 
                    quantity: itemQty, 
                    costPrice: Number(item.costPrice) || 0,
                    category: item.category || "مرتجع", 
                    supplierId: item.supplierId || ""        
                });
            } else {
                // إرجاع المنتج إلى مكانه الأصلي مع حساب متوسط التكلفة
                let existingProd = products.find(p => p.id === item.id) || products.find(p => p.name === item.name);
                if (existingProd) {
                    const oldTotalValue = (Number(existingProd.costPrice) || 0) * (Number(existingProd.quantity) || 0);
                    const newTotalValue = (Number(item.costPrice) || 0) * itemQty; 
                    existingProd.quantity += itemQty;
                    existingProd.costPrice = existingProd.quantity > 0 ? (oldTotalValue + newTotalValue) / existingProd.quantity : (Number(item.costPrice) || 0);
                } else {
                    const uniqueProductCode = (typeof window.generateGlobalID === 'function') ? window.generateGlobalID('code') : ('code_' + Date.now().toString(36));
                    products.push({ 
                        id: uniqueProductCode, 
                        name: item.name, 
                        quantity: itemQty, 
                        costPrice: Number(item.costPrice) || 0,
                        category: item.category || "عام", 
                        supplierId: item.supplierId || ""
                    });
                }
            }

            // إعادة حالة السيريالات المرتبطة بهذا الصنف إلى المخزن (in_stock)
            const restoreSerial = (sn) => {
                if (!sn) return;
                const sLog = serialNumbersLog.find(log => log.serial === sn);
                if (sLog) sLog.status = 'in_stock';
            };
            if (item.serial) restoreSerial(item.serial);
            if (item.serialNumber) restoreSerial(item.serialNumber);
            if (Array.isArray(item.serials)) item.serials.forEach(restoreSerial);
        });
        
        // �� خصم الأرباح فوراً لأن المرتجع استُلم
        if (Math.abs(profitToReverse) > 0.001) {
            totalProfit = window.money(totalProfit - profitToReverse);
            logOperation("عكس أرباح مرتجع", `عكس أرباح بقيمة ${formatCurrency(profitToReverse)}.`);
        }

        completedReturns.push({ id: generateId('ret'), items: itemsToReturn, customerName, returnedAmount, timestamp: new Date().toISOString() });
        logOperation("مرتجع فوري", logDetails + " وتم استلام البضاعة.");
        showMessage(returnMessage, "تم تسجيل المرتجع واستلامه بالمخزن بنجاح.", false);
        
    } else {
        if (typeof pendingReturnsValue !== 'undefined') {
             pendingReturnsValue += returnedAmount;
        }
        
        pendingReturns.push({
            id: generateId('pend-ret'),
            items: itemsToReturn,
            customerName,
            returnedAmount,
            returnAtSalePrice: returnAtSalePrice,
            profitToReverse: profitToReverse, // حفظ الأرباح المراد عكسها لخصمها لاحقاً
            pendingSaleProfit: pendingSaleProfit // حفظ الربح المتوقع للبيعات المؤقتة
        });
        logOperation("مرتجع قيد الاستلام", logDetails + " والبضاعة قيد الاستلام.");
        showMessage(returnMessage, "تم تسجيل المرتجع كـ 'قيد الاستلام' بنجاح. تم تنفيذ الإجراء المالي.", false, true);
    }
    if (isFromPendingSale && returnSourceData) {
        const pIdx = Array.isArray(pendingSales) ? pendingSales.findIndex(s => String(s.id).trim() === String(returnSourceData._originPendingId || returnSourceData.id).trim()) : -1;
        if (pIdx !== -1) pendingSales.splice(pIdx, 1);
        returnSourceData = null;
    }

    resetReturnForm();
    updateUI();

    // ��️ حفظ سحابي فوري لمنع ضياع المرتجع
    if (typeof saveSystemToCloud === 'function') {
        saveSystemToCloud().catch(e => console.error("Failed to save manual return:", e));
    }
}

// دالة مساعدة لتنظيف نموذج المرتجعات
function resetReturnForm() {
    if (typeof window.resetReturnFormUI === 'function') {
        window.resetReturnFormUI();
    } else {
        if(d('return-product-select')) d('return-product-select').value = '';
        if(d('return-manual-product-name')) d('return-manual-product-name').value = '';
        if(d('return-quantity')) d('return-quantity').value = '1';
        if(d('return-customer-name')) d('return-customer-name').value = '';
        if(d('return-sale-price-input')) d('return-sale-price-input').value = 0;
        if(d('return-at-sale-price')) d('return-at-sale-price').checked = false;
        if(d('return-serial-input')) d('return-serial-input').value = '';
        if(d('return-selected-item-info')) d('return-selected-item-info').classList.add('hidden');
        if(typeof window.clearPendingSaleReturnBreakdown === 'function') window.clearPendingSaleReturnBreakdown();
    }
    returnSourceData = null; 
}

async function handleInvoiceReturnConfirmation(invoiceId, invoiceNumber) {
    saveStateToHistory();
    const itemsToReturn = [];
    let totalReturnValue = 0;
    let totalCostOfReturn = 0;

    let validationFailed = false;
    document.querySelectorAll('.return-invoice-qty').forEach(input => {
        const qty = parseInt(input.value);
        const maxQty = parseInt(input.max) || 0;
        if (qty > maxQty) {
            validationFailed = true;
        }
        if (qty > 0 && !validationFailed) {
            let serialsList = [];
            try { serialsList = JSON.parse(input.dataset.serials || '[]'); } catch(e){ console.warn("تعذر قراءة قائمة السيريالات:", e); }
            itemsToReturn.push({
                name: invoiceSearchResults.querySelector(`[data-item-index="${input.dataset.itemIndex}"]`).closest('tr').cells[0].textContent.trim(),
                quantity: qty,
                unitPrice: parseFloat(input.dataset.unitPrice),
                costPrice: parseFloat(input.dataset.costPrice),
                serial: input.dataset.serial || '',
                serials: serialsList
            });
            totalReturnValue = (typeof window.money === 'function' ? window.money : Number)(totalReturnValue + (qty * parseFloat(input.dataset.unitPrice)));
            totalCostOfReturn = (typeof window.money === 'function' ? window.money : Number)(totalCostOfReturn + (qty * parseFloat(input.dataset.costPrice)));
        }
    });

    if (validationFailed) {
        showMessage(returnMessage, "تنبيه: كمية الإرجاع تتجاوز الكمية الأصلية المتاحة في الفاتورة.", true);
        return;
    }

    if (itemsToReturn.length === 0) {
        showMessage(returnMessage, "لم يتم تحديد أي كميات للإرجاع.", true);
        return;
    }

    
    const selectedAccountId = document.getElementById('return-from-account-select')?.value;
    const account = accounts.find(acc => acc.id === selectedAccountId);
    
    if (!account) {
        showMessage(returnMessage, "يرجى اختيار الحساب الذي سيتم سحب مبلغ المرتجع منه.", true);
        return;
    }

    if (totalReturnValue > account.balance) {
        showMessage(returnMessage, `السيولة غير كافية في حساب "${account.name}" (${formatCurrency(account.balance)}) لإرجاع هذا المبلغ (${formatCurrency(totalReturnValue)}).`, true);
        return;
    }

    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        const receiveNow = d('return-invoice-receive-now')?.checked ?? true;
        
        // Fix null pointer possibility
        const strongEl = invoiceSearchResults.querySelector('p > strong');
        const customerName = strongEl && strongEl.nextSibling ? strongEl.nextSibling.textContent.trim() : 'غير محدد';

        // Process the return
        account.balance = window.money(account.balance - totalReturnValue);

        const profitToReverse = totalReturnValue - totalCostOfReturn;

        if(receiveNow) {
            itemsToReturn.forEach(item => {
                const productIndex = products.findIndex(p => (item.id && p.id === item.id) || p.name === item.name);
                if (productIndex !== -1) {
                    products[productIndex].quantity += item.quantity;
                } else {
                  //  [تعديل د. ضياء]: توليد ID فريد للمنتج الجديد لحمايته من التداخل
                  const uniqueProductCodeReturn = generateId('code');
                  products.push({ id: uniqueProductCodeReturn, name: item.name, quantity: item.quantity, costPrice: item.costPrice, supplierId: '' });
                }
            });
            if (typeof totalProfit !== 'undefined') {
                totalProfit = window.money(totalProfit - profitToReverse);
            }
            
            // Update the original sale in salesToday if it exists so daily reports are accurate
            const originalSale = salesToday.find(s => s.id === invoiceId || s.invoiceNumber === invoiceNumber);
            if (originalSale) {
                originalSale.grandTotal = (originalSale.grandTotal || 0) - totalReturnValue;
                originalSale.totalSellPrice = (originalSale.totalSellPrice || 0) - totalReturnValue;
                originalSale.profit = (originalSale.profit || 0) - profitToReverse;
                // Also deduct quantities from the items array in the sale record
                itemsToReturn.forEach(returnedItem => {
                    const saleItem = originalSale.items.find(i => i.name === returnedItem.name);
                    if (saleItem) saleItem.quantity -= returnedItem.quantity;
                });
            }

            completedReturns.push({ id: generateId('ret'), items: itemsToReturn, customerName, returnedAmount: totalReturnValue, timestamp: new Date().toISOString(), fromInvoice: invoiceNumber });
            logOperation("مرتجع من فاتورة", `إرجاع بضاعة من فاتورة ${invoiceNumber} واستلامها. تم إرجاع ${formatCurrency(totalReturnValue)}.`);
        } else {
            pendingReturns.push({ id: generateId('pend-ret'), items: itemsToReturn, customerName, returnedAmount: totalReturnValue, costOfGoods: totalCostOfReturn, fromInvoice: invoiceNumber, profitToReverse: profitToReverse });
            logOperation("مرتجع معلق من فاتورة", `إرجاع مبلغ ${formatCurrency(totalReturnValue)} للعميل من فاتورة ${invoiceNumber}. البضاعة قيد الاستلام.`);
        }

        liquidityLog.push({ id: generateId("liq"), timestamp: new Date().toISOString(), type: "remove", amount: totalReturnValue, description: `مرتجع من فاتورة ${invoiceNumber}`, currentBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0), accountId: account.id });

        if (_tx && typeof _tx.commit === 'function') _tx.commit();
        if (typeof saveSystemToCloud === 'function') {
            await saveSystemToCloud();
        }

        showMessage(returnMessage, "تم تسجيل عملية الإرجاع من الفاتورة بنجاح.", false);
        invoiceSearchResults.innerHTML = '';
        updateUI();
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("فشل تسجيل عملية الإرجاع:", err);
        showMessage(returnMessage, "حدث خطأ أثناء تسجيل الإرجاع وتم التراجع: " + (err.message || ''), true);
    }
}

async function handleConfirmReceipt(pendingId) {
    saveStateToHistory();
    
    const returnIndex = pendingReturns.findIndex(r => r.id === pendingId);
    if (returnIndex === -1) {
        showGlobalMessage("خطأ: لم يتم العثور على المرتجع المعلق.", true);
        return;
    }

    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        const ret = pendingReturns.splice(returnIndex, 1)[0];

    // --- �� إجراء لوجيستي ومخزني آمن بالكامل ---

    // 1. خصم القيمة من "الأصول المعلقة" (إن كان المتغير معرفاً بالسيستم)
    if (typeof pendingReturnsValue !== 'undefined') {
        pendingReturnsValue -= (ret.returnedAmount || 0);
    }

    // 2. تحديث المخزون باستخدام المعرف الفريد ID لمنع تداخل الأصناف متشابهة الاسم
    ret.items.forEach(item => {
        if (ret.returnAtSalePrice) {
            const newProductName = `${item.name} - ${ret.customerName} (مرتجع)`;
            const uniqueProductCode = generateId('code');
            
            products.push({ 
                id: uniqueProductCode, 
                name: newProductName, 
                quantity: item.quantity, 
                costPrice: item.costPrice,
                category: "مرتجع"
            });
        } else {
            // �� [التأمين بالأكواد]: البحث بالـ ID أولاً لضمان زيادة المنتج الصحيح
            let pIndex = -1;
            if (item.id) {
                pIndex = products.findIndex(p => p.id === item.id);
            }
            // خط دفاع بديل بالاسم إذا كان منتجاً قديماً
            if (pIndex === -1) {
                pIndex = products.findIndex(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
            }

            if (pIndex !== -1) {
                // المنتج موجود: نقوم بزيادة كميته وتعديل متوسط التكلفة بدقة
                const existing = products[pIndex];
                const oldTotalValue = (existing.costPrice || 0) * (existing.quantity || 0);
                const newTotalValue = (item.costPrice || 0) * item.quantity;
                
                existing.quantity += item.quantity;
                existing.costPrice = existing.quantity > 0 ? (oldTotalValue + newTotalValue) / existing.quantity : (item.costPrice || 0);
            } else {
                // المنتج غير موجود: يتم إنشاؤه لأول مرة بكود فريد جديد
                const uniqueProductCode = generateId('code');
                products.push({ 
                    id: item.id || uniqueProductCode, 
                    name: item.name, 
                    quantity: item.quantity, 
                    costPrice: item.costPrice || 0,
                    category: item.category || "عام",
                    supplierId: item.supplierId || ""
                });
            }
        }

        // إعادة حالة السيريالات المرتبطة بهذا الصنف إلى المخزن (in_stock)
        const restoreSerial = (sn) => {
            if (!sn) return;
            const sLog = typeof serialNumbersLog !== 'undefined' ? serialNumbersLog.find(log => log.serial === sn) : null;
            if (sLog) sLog.status = 'in_stock';
        };
        if (item.serial) restoreSerial(item.serial);
        if (item.serialNumber) restoreSerial(item.serialNumber);
        if (Array.isArray(item.serials)) item.serials.forEach(restoreSerial);
    });

    // 3. نقل المرتجع إلى قائمة المكتملة
    completedReturns.push({ id: generateId("RET"), ...ret, status: 'Completed', timestamp: new Date().toISOString() });

    // �� خصم الأرباح المؤجلة الآن لأن المرتجع استُلم فعلياً
    if (ret.profitToReverse && Math.abs(ret.profitToReverse) > 0.001) {
        totalProfit = window.money(totalProfit - ret.profitToReverse);
        logOperation("عكس أرباح مرتجع مؤجل", `تم عكس أرباح مؤجلة بقيمة ${formatCurrency(ret.profitToReverse)} بعد تأكيد الاستلام.`);
    }

    // 4. تسجيل العملية كإجراء لوجيستي في العمليات
    logOperation("تأكيد استلام مرتجع", `تم تأكيد استلام ${ret.items.map(i => i.quantity + 'x ' + i.name).join(', ')} في المخزن.`);
    
        if (_tx && typeof _tx.commit === 'function') _tx.commit();
        updateUI();
        showGlobalMessage("تم تأكيد استلام البضاعة وتحديث المخزون بنجاح.", false);
        if (typeof saveSystemToCloud === 'function') {
            saveSystemToCloud().catch(e => console.error("Confirm return cloud sync error:", e));
        }
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("Confirm return cloud sync error:", err);
        showGlobalMessage("حدث خطأ أثناء تأكيد الاستلام وتم التراجع: " + (err.message || ''), true);
    }
}
