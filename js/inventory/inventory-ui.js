document.addEventListener('DOMContentLoaded', function() {
    // Ensure critical DOM elements are resolved early
    if (!addProductButton) addProductButton = d('add-product-button');
    if (!addSupplierButton) addSupplierButton = d('add-supplier-button');
    if (!productList) productList = d('product-list');
    if (!productNameInput) productNameInput = d('product-name-input');
    if (!productQuantityInput) productQuantityInput = d('product-quantity-input');
    if (!productCostPriceInput) productCostPriceInput = d('product-cost-price-input');
    if (!productSupplierSelect) productSupplierSelect = d('product-supplier-select');
    if (!productMessage) productMessage = d('product-message');
    if (!productCategoryInput) productCategoryInput = d('product-category') || d('product-category-input');
    if (!productDeductLiquidityCheckbox) productDeductLiquidityCheckbox = d('product-deduct-liquidity');
    if (!inventorySearchInput) inventorySearchInput = d('inventory-search');
    if (!inventoryCategoryFilter) inventoryCategoryFilter = d('inventory-category-filter');
    if (!productSerialNumbersTextarea) productSerialNumbersTextarea = d('product-serial-numbers');
    if (!smartSearchBtn) smartSearchBtn = d('smart-search-btn');
    if (!reportDirectSearchBtn) reportDirectSearchBtn = d('report-direct-search-btn');
    if (!piAddItemBtn) piAddItemBtn = d('pi_add_item_btn');
    if (!piClearFormBtn) piClearFormBtn = d('pi_clear_form_btn');
    if (!piConfirmBtn) piConfirmBtn = d('pi_confirm_btn');
    if (!importSerialCsvInput) importSerialCsvInput = d('import-serial-csv-input');
    if (!returnProductSelect) returnProductSelect = d('return-product-select');
    if (!confirmManualReturnBtn) confirmManualReturnBtn = d('confirm-manual-return-btn');
    if (!inv_modal) inv_modal = d('invoiceModal');
    if (!inv_openInvoiceModalBtn) inv_openInvoiceModalBtn = d('openInvoiceModalBtn');
    if (!inv_closeBtn) inv_closeBtn = inv_modal ? inv_modal.querySelector('.modal-close-btn') : null;
    if (!inv_closeBtnFooter) inv_closeBtnFooter = inv_modal ? inv_modal.querySelector('.modal-close-btn-footer') : null;
    if (!inv_invoiceForm) inv_invoiceForm = d('invoiceForm');
    if (!inv_customerNameInput) inv_customerNameInput = d('inv_customerName');
    if (!inv_customerAddressInput) inv_customerAddressInput = d('inv_customerAddress');
    if (!inv_phoneNumbersContainer) inv_phoneNumbersContainer = d('inv_phoneNumbersContainer');
    if (!inv_addPhoneBtn) inv_addPhoneBtn = d('inv_addPhoneBtn');
    if (!inv_shippingCostInput) inv_shippingCostInput = d('inv_shippingCost');
    if (!inv_totalShippingCostSpan) inv_totalShippingCostSpan = d('inv_totalShippingCost');
    if (!inv_totalGoodsPriceSpan) inv_totalGoodsPriceSpan = d('inv_totalGoodsPrice');
    if (!inv_grandTotalPriceSpan) inv_grandTotalPriceSpan = d('inv_grandTotalPrice');
    if (!inv_validationErrorDiv) inv_validationErrorDiv = d('inv_validationError');
    if (!inv_itemNameInput) inv_itemNameInput = d('inv_itemName');
    if (!inv_itemQtyInput) inv_itemQtyInput = d('inv_itemQty');
    if (!inv_itemPriceInput) inv_itemPriceInput = d('inv_itemPrice');
    if (!inv_addItemBtn) inv_addItemBtn = d('inv_addItemBtn');
    if (!inv_itemAddErrorDiv) inv_itemAddErrorDiv = d('inv_itemAddError');
    if (!inv_invoiceItemsBody) inv_invoiceItemsBody = d('inv_invoiceItemsBody');
    if (!inv_printInvoiceBtn) inv_printInvoiceBtn = d('inv_printInvoiceBtn');
    if (!inv_deductibleCostsContainer) inv_deductibleCostsContainer = d('inv_deductibleCostsContainer');
    if (!inv_warrantyInput) inv_warrantyInput = d('inv_warranty');
    if (!inv_notesTextarea) inv_notesTextarea = d('inv_notes');
    if (!inv_saveInvoiceBtn) inv_saveInvoiceBtn = d('inv_saveInvoiceBtn');
    if (!inv_serialSelectContainer) inv_serialSelectContainer = d('inv_serialSelectContainer');
if (addProductButton) {
    addProductButton.addEventListener("click", () => {
        saveStateToHistory();
        let name = productNameInput.value.trim();
        const quantity = parseInputNumber(productQuantityInput);
        const costPrice = parseInputNumber(productCostPriceInput);
        const supplierId = productSupplierSelect.value;
        const category = productCategoryInput.value.trim();
        const deductLiquidity = productDeductLiquidityCheckbox.checked;
        const selectedAccountId = d('product-purchase-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);
        const serialNumbersInput = productSerialNumbersTextarea ? productSerialNumbersTextarea.value.trim() : '';

        // 1. التحقق من الحقول الأساسية
        if (!name || isNaN(quantity) || quantity < 0 || isNaN(costPrice) || costPrice < 0) {
            showMessage(productMessage, "يرجى ملء اسم وكمية (>=0) وسعر تكلفة (>=0) المنتج بشكل صحيح.", true);
            return;
        }

        // [تعديل أمني]: التحقق التام من كائن الحساب قبل التعامل معه لمنع توقف البرنامج
        if (deductLiquidity && (!selectedAccountId || !account)) {
            showMessage(productMessage, "يرجى اختيار حساب مالي صحيح للخصم منه.", true);
            return;
        }

        // �� [تنفيذ فكرة د. ضياء]: اعتراض تكرار الاسم وفتح مودال التوجيه الذكي بالـ ID
        // نتحقق من وجود منتج بنفس الاسم، مع استثناء المنتج الحالي الذي نعدله (سواء بالـ ID أو بالاسم القديم)
        const duplicateProduct = products.find(p => {
            if (p.name.toLowerCase() !== name.toLowerCase()) return false;
            if (!window.currentEditingProductID && !editingProductName) {
                // إذا كان المنتج القديم رصيده صفر، نتجاوز التحذير ليتم الدمج بصمت
                if (Number(p.quantity) === 0) return false; 
                return true; 
            }
            
            if (window.currentEditingProductID && p.id) {
                return String(p.id) !== String(window.currentEditingProductID);
            }
            return p.name.toLowerCase() !== (editingProductName || "").toLowerCase();
        });

        if (duplicateProduct && !window.bypassDuplicateCheck) {
            window.currentDuplicateProductID = duplicateProduct.id || null;
            // حفظ البيانات مؤقتاً في كائن الانتظار لحين اختيارك من المودال
            window.pendingDuplicateProduct = {
                editingProductName, name, quantity, costPrice, supplierId, category, deductLiquidity, selectedAccountId
            };

            const modal = document.getElementById("productDuplicateNameModal");
            const modalText = document.getElementById("duplicateModalText");
            if (modal && modalText) {
                modalText.innerHTML = `تنبيه: يوجد بالفعل منتج مسجل بنفس الاسم <strong>"${escapeHTML(duplicateProduct.name)}"</strong> في قسم <strong>"${escapeHTML(duplicateProduct.category || 'عام')}"</strong>.<br><br>الكمية الحالية له: <strong>${duplicateProduct.quantity}</strong> قطعة بمتوسط تكلفة <strong>${formatCurrency(duplicateProduct.costPrice)}</strong>.`;
                modal.style.display = "flex";
                document.querySelector('input[name="duplicateAction"][value="merge"]').checked = true;
                document.getElementById("renameInputContainer").classList.add('hidden');
                document.getElementById("newProductNameInput").value = name + " - جديد";
            }
            return; // �� إيقاف الحفظ الفوري بانتظار قرارك من داخل المودال!
        }

        // تصفير فلاج التخطي بعد العبور الآمن لفحص التكرار
        window.bypassDuplicateCheck = false;

        // 2. معالجة وتقسيم الأرقام التسلسلية (السيريالات) المدخلة إن وجدت
        let enteredSerials = [];
        if (serialNumbersInput) {
            enteredSerials = serialNumbersInput.split(/[\n, ]+/).map(s => s.trim()).filter(Boolean);
        }

        // �� [التمييز الذكي لوضع التعديل بالـ ID والاسم معاً]
        if (editingProductName || window.currentEditingProductID) {
            // =========================================================
            // وضع التعديل (Edit Mode) - معالجة السيريالات والتكلفة بالـ ID لمنع التداخل
            // =========================================================
            let productIndex = -1;
            if (window.currentEditingProductID) {
                productIndex = products.findIndex(p => p.id === window.currentEditingProductID);
            }
            if (productIndex === -1 && editingProductName) {
                productIndex = products.findIndex(p => p.name === editingProductName);
            }
            
            if (productIndex === -1) return;
            
            const oldProduct = products[productIndex];
            const oldQty = Number(oldProduct.quantity) || 0;
            const oldCost = Number(oldProduct.costPrice) || 0;

            // �� [مودال تقليص الكمية]: اعتراض عملية تقليص الكمية وفتح مودال التسوية المالية فوراً
            if (quantity < oldQty) {
                const reducedQty = oldQty - quantity;
                const totalRefundValue = reducedQty * oldCost; // احتساب الفارق بالتكلفة المقيدة حالياً بالسيستم

                // تخزين البيانات مؤقتاً في كائن الانتظار لحين اتخاذ القرار من المودال
                window.pendingProductEdit = {
                    productIndex,
                    name,
                    category,
                    quantity,
                    costPrice, 
                    supplierId,
                    reducedQty,
                    totalRefundValue,
                    enteredSerials // تمرير السيريالات الجديدة إن وجدت
                };

                // فتح وتعبئة مودال التسوية المالية
                const modal = document.getElementById("productDecreaseModal");
                const modalText = document.getElementById("decreaseModalText");
                const accSelect = document.getElementById("decreaseAccountSelect");

                if (modal && modalText && accSelect) {
                    modalText.innerHTML = `لقد قمت بتقليص كمية منتج <strong>"${escapeHTML(oldProduct.name)}"</strong> من <strong>${oldQty}</strong> إلى <strong>${quantity}</strong> قطعة.<br><br>فارق الكمية المنقوصة هو <strong>${reducedQty}</strong> قطعة، وقيمتها المالية الإجمالية تساوي <strong>${formatCurrency(totalRefundValue)}</strong>.`;
                    
                    // شحن الخزن المتاحة بالبرنامج
                    accSelect.innerHTML = accounts.map(acc => `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (الرصيد الحالي: ${formatCurrency(acc.balance)})</option>`).join('');
                    
                    // إظهار المودال وإعادة ضبط الخيارات
                    modal.style.display = "flex";
                    document.querySelector('input[name="decreaseAction"][value="deposit"]').checked = true;
                    document.getElementById("decreaseAccountContainer").classList.remove('hidden');
                }
                return; // �� إيقاف الحفظ المباشر هنا بانتظار قرارك من داخل المودال!
            }

            // أ. التحقق من السيريالات في وضع التعديل (إذا زادت الكمية، يجب أن يطابق عدد السيريالات الفارق الزائد)
            if (enteredSerials.length > 0 && quantity > oldQty) {
                const addedQty = quantity - oldQty;
                if (enteredSerials.length !== addedQty) {
                    showMessage(productMessage, `في وضع التعديل، عدد السيريالات الجديدة المدخلة (${enteredSerials.length}) يجب أن يتطابق تماماً مع كمية القطع المضافة الزائدة (${addedQty}).`, true);
                    return;
                }
            }

            // ��️ معالجة زيادة الكمية محاسبياً وحفظ الخزنة ومتوسط التكلفة
            if (quantity > oldQty) {
                const addedQty = quantity - oldQty;

                if (deductLiquidity) {
                    const costToDeduct = addedQty * costPrice;
                    if (costToDeduct > account.balance) {
                        showMessage(productMessage, `لا توجد سيولة كافية في حساب "${account.name}".`, true);
                        return;
                    }
                    account.balance = window.money(account.balance - costToDeduct);
                    logOperation("شراء بضاعة (تعديل كمية)", `خصم ${formatCurrency(costToDeduct)} من حساب "${account.name}" لزيادة كمية منتج "${name}" بمقدار ${addedQty} قطعة.`);
                    
                    liquidityLog.push({
                        id: 'liq-buy-' + Date.now(),
                        timestamp: new Date().toISOString(),
                        type: "remove",
                        amount: costToDeduct,
                        description: `شراء بضاعة (تعديل): ${addedQty}x ${name}`,
                        currentBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
                        accountId: account.id
                    });
                    
                    // معادلة متوسط التكلفة المرجح الحقيقية لحماية تقارير الأرباح
                    products[productIndex].costPrice = quantity > 0 ? (typeof window.money === 'function' ? window.money(((oldQty * oldCost) + (addedQty * costPrice)) / quantity) : ((oldQty * oldCost) + (addedQty * costPrice)) / quantity) : costPrice;
                } else {
                    // إذا لم يتم تفعيل خصم السيولة، نعتمد التكلفة المدخلة مباشرة للكمية الجديدة
                    products[productIndex].costPrice = costPrice;
                }
            } else {
                // إذا بقيت الكمية ثابتة نعتمد السعر الجديد مباشرة لمنع تجمد الأسعار
                products[productIndex].costPrice = costPrice;
            }

            // ج. حفظ الأرقام التسلسلية الجديدة بنجاح في السجل العام للبرنامج
            if (enteredSerials.length > 0) {
                enteredSerials.forEach(serial => {
                    if (!serialNumbersLog.some(s => s.serial === serial)) {
                        serialNumbersLog.push({
                            id: generateId("SER"),
                            serial, 
                            productName: name, 
                            productId: products[productIndex] ? products[productIndex].id : null,
                            supplierId: supplierId || "", 
                            addedTimestamp: new Date().toISOString(), 
                            status: 'in_stock' 
                        });
                    }
                });
            }

            // ��️ تحديث اسم المنتج داخل سجل السيريالات القديمة لكي لا تنفصل عن المنتج بعد تعديل اسمه
            if (editingProductName !== name) {
                serialNumbersLog.forEach(s => {
                    if (s.productName === editingProductName) {
                        s.productName = name;
                    }
                });
            }

            // د. حفظ البيانات النصية المحدثة بالمنتج
            products[productIndex].name = name;
            products[productIndex].category = category;
            products[productIndex].quantity = quantity;
            products[productIndex].supplierId = supplierId;
            products[productIndex].lastUpdated = new Date().toISOString();
            
            showMessage(productMessage, `تم تحديث المنتج "${name}" بنجاح.`);
            resetProductForm();

        } else {
            // =========================================================
            // وضع الإضافة الجديدة (Add Mode)
            // =========================================================
         // �� [تعديل د. ضياء]: البحث والدمج بالـ ID أولاً لمنع دمج الصنف في القسم الخاطئ عند تشابه الأسماء
        let existingIndex = -1;
        if (window.currentDuplicateProductID) {
            existingIndex = products.findIndex(p => p.id === window.currentDuplicateProductID);
        }
        // خط دفاع بديل بالاسم إذا كان منتجاً قديماً بلا ID
        if (existingIndex === -1) {
            existingIndex = products.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        }

            let newQuantity = Number(quantity);
            const newCostPriceInput = Number(costPrice);

            // التحقق من تطابق السيريالات مع الكمية المضافة عند الإضافة الجديدة أو زيادة المخزون
            if (enteredSerials.length > 0 && enteredSerials.length !== newQuantity) {
                showMessage(productMessage, `عدد الأرقام التسلسلية المدخلة (${enteredSerials.length}) لا يتطابق مع الكمية المضافة (${newQuantity}).`, true);
                return;
            }

            if (existingIndex !== -1) {
                 // الحالة الأولى: المنتج موجود مسبقاً بنفس الاسم والقسم (زيادة كمية عادية)
                 if (newQuantity < 0) { showMessage(productMessage, "الكمية المضافة لا يمكن أن تكون سالبة.", true); return; }
                 const existing = products[existingIndex];
                 
                 if (deductLiquidity && newQuantity > 0) {
                    const costToDeduct = newQuantity * newCostPriceInput;
                    if (costToDeduct > account.balance) {
                        showMessage(productMessage, `لا توجد سيولة كافية في حساب "${account.name}".`, true);
                        return;
                    }
                    account.balance = window.money(account.balance - costToDeduct);
                    logOperation("شراء بضاعة", `خصم ${formatCurrency(costToDeduct)} من حساب "${account.name}" لشراء ${newQuantity}x ${name}.`);
                    liquidityLog.push({
                        id: 'liq-buy-' + Date.now(),
                        timestamp: new Date().toISOString(),
                        type: "remove",
                        amount: costToDeduct,
                        description: `شراء بضاعة: ${newQuantity}x ${name}`,
                        currentBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
                        accountId: account.id
                    });
                }

                const oldQuantity = Number(existing.quantity) || 0;
                const oldCostPrice = Number(existing.costPrice) || 0;
                const totalQuantity = oldQuantity + newQuantity;
                
                existing.quantity = totalQuantity;
                existing.costPrice = totalQuantity > 0 ? (typeof window.money === 'function' ? window.money(((oldQuantity * oldCostPrice) + (newQuantity * newCostPriceInput)) / totalQuantity) : ((oldQuantity * oldCostPrice) + (newQuantity * newCostPriceInput)) / totalQuantity) : newCostPriceInput;
                existing.supplierId = supplierId || existing.supplierId;
                existing.category = category || existing.category;

                // حقن السيريالات الجديدة المضافة بنجاح في السجل العام للبرنامج
                enteredSerials.forEach(serial => {
                    if (!serialNumbersLog.some(s => s.serial === serial)) {
                        serialNumbersLog.push({
                id: generateId("SER"),
                serial, 
                            productName: existing.name, 
                            supplierId: supplierId || "", 
                            addedTimestamp: new Date().toISOString(), 
                            status: 'in_stock' 
                        });
                    }
                });

                showMessage(productMessage, `تم تحديث كمية المنتج "${name}" بنجاح.`);

            } else {
                // الحالة الثانية: منتج جديد كلياً في قاعدة البيانات
                if (newQuantity < 0) { showMessage(productMessage, "كمية المنتج الجديد لا يمكن أن تكون سالبة.", true); return; }

                if (deductLiquidity && newQuantity > 0) {
                    const costToDeduct = newQuantity * costPrice;
                    if (costToDeduct > account.balance) {
                        showMessage(productMessage, `لا توجد سيولة كافية في حساب "${account.name}".`, true);
                        return;
                    }
                    account.balance = window.money(account.balance - costToDeduct);
                    logOperation("شراء بضاعة جديدة", `خصم ${formatCurrency(costToDeduct)} من حساب "${account.name}" لشراء ${newQuantity}x ${name}.`);
                    liquidityLog.push({
                        id: 'liq-buy-new-' + Date.now(),
                        timestamp: new Date().toISOString(),
                        type: "remove",
                        amount: costToDeduct,
                        description: `شراء بضاعة جديدة: ${newQuantity}x ${name}`,
                        currentBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
                        accountId: account.id
                    });
                }

                // �� [توليد كود مخصص وحصري فريد]: منح كود فريد لكل منتج جديد يدخل النظام
                const uniqueProductCode = (typeof window.generateGlobalID === 'function') ? window.generateGlobalID('code') : ('code_' + Date.now().toString(36));

                products.push({ 
                    id: uniqueProductCode, 
                    name, 
                    quantity: newQuantity, 
                    costPrice, 
                    supplierId: supplierId || "", 
                    category: category,
                    lastUpdated: new Date().toISOString()
                });

                // حقن السيريالات للمنتج الجديد كلياً في السجل العام للبرنامج
                enteredSerials.forEach(serial => {
                    if (!serialNumbersLog.some(s => s.serial === serial)) {
                        serialNumbersLog.push({
                id: generateId("SER"),
                serial, 
                            productName: name, 
                            productId: uniqueProductCode,
                            supplierId: supplierId || "", 
                            addedTimestamp: new Date().toISOString(), 
                            status: 'in_stock' 
                        });
                    }
                });

                showMessage(productMessage, "تمت إضافة المنتج الجديد بنجاح بكود فريد.");
            }
            resetProductForm();
        }
        updateUI();
    });
}
                 if (productList) {
                     productList.addEventListener('click', (e) => {
                         const target = e.target.closest('button');
                         if (!target) return;
                         const productName = target.dataset.productName;
                         if (!productName) return;

                    if (target.classList.contains('edit-product-btn')) {
            const productId = target.dataset.productId;
            let productToEdit = null;
            
            // 1. البحث عن المنتج بالـ ID الفريد أولاً لضمان عدم التداخل الحسابي
            if (productId) {
                productToEdit = products.find(p => p.id === productId);
            }
            // 2. خط دفاع بديل بالاسم إذا كان المنتج قديماً جداً ولا يملك كود
            if (!productToEdit) {
                productToEdit = products.find(p => p.name === productName);
            }

            if (productToEdit && productNameInput && productQuantityInput && productCostPriceInput && productSupplierSelect && addProductButton && productFormTitle && cancelEditProductButton) {
                editingProductName = productToEdit.name;
                window.currentEditingProductID = productToEdit.id || null; // �� حفظ الـ ID الفريد للمنتج الجاري تعديله حالياً
                
                productNameInput.value = productToEdit.name;
                productQuantityInput.value = productToEdit.quantity;
                productCostPriceInput.value = productToEdit.costPrice;
                productSupplierSelect.value = productToEdit.supplierId || "";
                productCategoryInput.value = productToEdit.category || "";
                
                addProductButton.textContent = "تحديث المنتج";
                addProductButton.classList.remove('bg-green-500', 'hover:bg-green-600');
                addProductButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
                productFormTitle.textContent = `تعديل المنتج: ${productToEdit.name}`;
                cancelEditProductButton.classList.remove('hidden');
                serialNumberEntryContainer.classList.add('hidden'); // تأكيد إخفاء السيريالات في وضع التعديل
                if(productSerialNumbersTextarea) productSerialNumbersTextarea.value = '';
                d('add-update-product-form').scrollIntoView({ behavior: 'smooth' });
            } else {
                showMessage(productMessage, `لم يتم العثور على المنتج "${productName}" للتعديل أو عناصر النموذج غير جاهزة.`, true);
            }
        } else if (target.classList.contains('delete-product-btn')) {
            const productId = target.dataset.productId;
            const productName = target.dataset.productName;

            if (confirm(`هل أنت متأكد من حذف المنتج "${productName}" نهائياً من المخزن؟`)) {
                saveStateToHistory();
                
                let productIndex = -1;
                // 1. البحث بالـ ID الفريد أولاً منعاً لحذف المنتجات المتشابهة في الاسم
                if (productId) {
                    productIndex = products.findIndex(p => p.id === productId);
                }
                // 2. خط دفاع بديل بالاسم لو منتج قديم لا يملك كود
                if (productIndex === -1) {
                    productIndex = products.findIndex(p => p.name === productName);
                }

                if (productIndex !== -1) {
                    const product = products[productIndex];
                    const qty = Number(product.quantity) || 0;
                    const cost = Number(product.costPrice) || 0;
                    const totalCardValue = qty * cost;

                    // **** حذف السيريالات المرتبطة بالمنتج المحذوف ****
                    const initialSerialCount = serialNumbersLog.length;
                    serialNumbersLog = serialNumbersLog.filter(log => log.productId ? log.productId !== productId : log.productName !== productName);
                    const deletedSerialCount = initialSerialCount - serialNumbersLog.length;

                    logOperation("حذف منتج", `تم حذف المنتج "${productName}" (الكمية: ${qty} قطعة، التكلفة الإجمالية المحذوفة من رأس المال: ${formatCurrency(totalCardValue)}).`);
                    showMessage(productMessage, `تم حذف المنتج "${productName}" و ${deletedSerialCount} رقم تسلسلي مرتبط بنجاح.`);

                    // ��️ [التعديل الأهم]: الحذف الفعلي لعنصر واحد فقط من المصفوفة لمنع تدمير باقي المنتجات
                    products.splice(productIndex, 1);

                    if (editingProductName === productName) {
                        resetProductForm();
                    }
                    updateUI();
                }
            }
       } else if (target.classList.contains('manage-serials-btn')) {
    // **** [تحديث د. ضياء]: التعامل مع زر إدارة السيريالات بالـ ID الفريد لمنع تداخل الأصناف متشابهة الاسم
    const productId = target.dataset.productId;
    openManageSerialsModal(productId || productName);
}              
                     });
                 }
                 const invSearchEl = inventorySearchInput || d('inventory-search');
                 if (invSearchEl) { invSearchEl.addEventListener('input', updateProductListDisplay); }
                 const invFilterEl = inventoryCategoryFilter || d('inventory-category-filter');
                 if (invFilterEl) { invFilterEl.addEventListener('change', updateProductListDisplay); }
if (addSupplierButton) {
    addSupplierButton.addEventListener("click", () => {
        saveStateToHistory(); // <-- أضف هذا السطر
        addOrUpdateSupplier();
    }); 
}
                 if (cancelEditSupplierButton) { cancelEditSupplierButton.addEventListener("click", resetSupplierForm); }
                 if (supplierList) { supplierList.addEventListener('click', (e) => { const target = e.target.closest('button'); if (!target) return; const supplierId = target.dataset.supplierId; if (!supplierId) return; if (target.classList.contains('edit-supplier-btn')) { editSupplier(supplierId); } else if (target.classList.contains('delete-supplier-btn')) {saveStateToHistory();
                  deleteSupplier(supplierId); } }); }

                 // **** جديد: مستمع حدث لزر استيراد CSV للسيريالات (في قسم إضافة البضاعة) ****
                 if (importSerialCsvInput) {
                     importSerialCsvInput.addEventListener("change", (event) => importSerialCSV(event, productSerialNumbersTextarea, serialImportMessage));
                 }
                  // **** جديد: مستمع حدث لزر استيراد CSV للسيريالات (في نافذة إدارة السيريالات) ****
                  const _modalCsvInput = modal_importSerialCsvInput || d('modal-import-serial-csv-input');
                  if (_modalCsvInput) { _modalCsvInput.addEventListener("change", (event) => importSerialCSV(event, modal_productSerialNumbers || d('modal_productSerialNumbers'), modal_serialImportMessage || d('modal-serial-import-message'))); }

                  // **** جديد: مستمع حدث زر البحث عن السيريالات ****
                  const _searchSupBtn = searchSupplierSerialsBtn || d('search-supplier-serials-btn');
                  if (_searchSupBtn) {
                      _searchSupBtn.addEventListener('click', () => { if (typeof window.searchSerialsBySupplier === 'function') window.searchSerialsBySupplier(); else if (typeof searchSerialsBySupplier === 'function') searchSerialsBySupplier(); });
                      const _supSearchInput = searchSupplierSerialNameInput || d('search-supplier-serial-name-input');
                      _supSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') { if (typeof window.searchSerialsBySupplier === 'function') window.searchSerialsBySupplier(); else if (typeof searchSerialsBySupplier === 'function') searchSerialsBySupplier(); } });
                  }

                  // **** جديد: مستمع حدث لفلترة السيريالات المعروضة ****
                  const _filterSerialsInp = filterSerialsInput || d('filter-serials-input');
                  if (_filterSerialsInp) { _filterSerialsInp.addEventListener('input', (e) => { if (typeof displayFilteredSupplierSerials === 'function') displayFilteredSupplierSerials(e.target.value); }); }

                  // **** جديد: مستمعات أحداث نافذة إدارة السيريالات ****
                  const _saveSerialsBtn = modal_saveAddedSerialsBtn || d('modal_saveAddedSerialsBtn');
                  if (_saveSerialsBtn) { _saveSerialsBtn.addEventListener('click', () => { if (typeof window.saveAddedSerialsFromModal === 'function') window.saveAddedSerialsFromModal(); else if (typeof saveAddedSerialsFromModal === 'function') saveAddedSerialsFromModal(); }); }

                  const _serialsModal = manageSerialsModal || d('manageSerialsModal');
                  const _modalCloseBtns = _serialsModal ? _serialsModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer') : [];
                  _modalCloseBtns.forEach(btn => btn.addEventListener('click', () => { if (typeof closeManageSerialsModal === 'function') closeManageSerialsModal(); else if (typeof window.closeManageSerialsModal === 'function') window.closeManageSerialsModal(); }));

                  // Close modal if clicked outside the content
                  window.addEventListener('click', function(event) {
                      const curSerialsModal = manageSerialsModal || d('manageSerialsModal');
                      if (curSerialsModal && event.target == curSerialsModal) { if (typeof closeManageSerialsModal === 'function') closeManageSerialsModal(); else if (typeof window.closeManageSerialsModal === 'function') window.closeManageSerialsModal(); }
                      const modalEl = inv_modal || document.getElementById('invoiceModal');
                      if (modalEl && event.target == modalEl) { inv_closeModal(); }
                  });

                 // Invoice Modal Listeners
                 const _openInvBtn = inv_openInvoiceModalBtn || document.getElementById('openInvoiceModalBtn');
                 if(_openInvBtn) { _openInvBtn.addEventListener('click', () => window.inv_openModal()); }
                 
                 const _closeBtn = inv_closeBtn || document.getElementById('invoiceModal')?.querySelector('.modal-close-btn');
                 if(_closeBtn) { _closeBtn.addEventListener('click', () => window.inv_closeModal()); }
                 
                 const _closeBtnFooter = inv_closeBtnFooter || document.getElementById('invoiceModal')?.querySelector('.modal-close-btn-footer');
                 if(_closeBtnFooter) { _closeBtnFooter.addEventListener('click', () => window.inv_closeModal()); }
                 
                 const addPhoneFieldFunc = function() {
                     inv_phoneCounter++;
                     const newPhoneEntry = document.createElement('div');
                     newPhoneEntry.classList.add('form-row', 'inv-phone-entry');
                     newPhoneEntry.innerHTML = `<div class="form-group"><label for="inv_phone${inv_phoneCounter}">رقم هاتف ${inv_phoneCounter}:</label><input type="tel" id="inv_phone${inv_phoneCounter}" name="phone[]" placeholder="رقم الهاتف"></div><button type="button" class="remove-phone-btn no-print" title="حذف الرقم">×</button>`;
                     const container = inv_phoneNumbersContainer || document.getElementById('inv_phoneNumbersContainer');
                     if(container) container.appendChild(newPhoneEntry);
                 };
                 window.inv_addPhoneField = addPhoneFieldFunc;
                 
                 const _addPhoneBtn = inv_addPhoneBtn || document.getElementById('inv_addPhoneBtn');
                 if (_addPhoneBtn) { _addPhoneBtn.addEventListener('click', addPhoneFieldFunc); }
                 
                 const _phoneNumbersContainer = inv_phoneNumbersContainer || document.getElementById('inv_phoneNumbersContainer');
                 if (_phoneNumbersContainer) {
                     _phoneNumbersContainer.addEventListener('click', function(event) {
                         const button = event.target.closest('.remove-phone-btn');
                         if (button) { button.closest('.inv-phone-entry')?.remove(); }
                     });
                 }
                 
                 const _addItemBtn = inv_addItemBtn || document.getElementById('inv_addItemBtn');
                 if (_addItemBtn) { _addItemBtn.addEventListener('click', () => window.inv_addInvoiceItem()); }
                 
                 const _invoiceItemsBody = inv_invoiceItemsBody || document.getElementById('inv_invoiceItemsBody');
                  if (_invoiceItemsBody) {
                      _invoiceItemsBody.addEventListener('input', function(event) {
                          const input = event.target;
                          if (!input.classList.contains('row-qty-input') && !input.classList.contains('row-price-input')) return;
                          const row = input.closest('.invoice-item-row');
                          if (!row) return;
                          let qty = parseInt(row.querySelector('.row-qty-input')?.value) || 0;
                          let price = parseFloat(row.querySelector('.row-price-input')?.value) || 0;
                          if (qty < 1) qty = 1;
                          if (price < 0) price = 0;
                          const subtotal = qty * price;
                          row.dataset.itemQty = qty;
                          row.dataset.itemPrice = price.toFixed(2);
                          row.dataset.itemSubtotal = subtotal.toFixed(2);
                          const subtotalCell = row.querySelector('.item-subtotal');
                          if (subtotalCell) {
                              subtotalCell.textContent = (typeof formatCurrency === 'function') ? formatCurrency(subtotal) : subtotal.toFixed(2);
                          }
                          if (typeof inv_updateDeductibleCostsCheckboxes === 'function') inv_updateDeductibleCostsCheckboxes();
                          if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
                      });

                      _invoiceItemsBody.addEventListener('click', function(event) {
                          const button = event.target.closest('.remove-item-btn');
                          if (button) {
                              const row = button.closest('.invoice-item-row');
                              if (row) {
                                  const removedSerial = row.dataset.itemSerial;
                                  if (removedSerial && Array.isArray(serialNumbersLog)) {
                                      const serialIndex = serialNumbersLog.findIndex(log => log.serial === removedSerial);
                                      if (serialIndex !== -1 && serialNumbersLog[serialIndex].status === 'in_invoice_temp') {
                                          serialNumbersLog[serialIndex].status = 'in_stock';
                                          console.log(`Serial ${removedSerial} status reverted to 'in_stock' on item removal.`);
                                      }
                                  }
                                  row.remove();
                                  if (typeof inv_updateDeductibleCostsCheckboxes === 'function') inv_updateDeductibleCostsCheckboxes();
                                  if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
                              }
                          }
                      });
                  }
                 const _shippingCostInput = inv_shippingCostInput || document.getElementById('inv_shippingCost');
                 if(_shippingCostInput) { _shippingCostInput.addEventListener('input', () => { if (typeof inv_calculateTotals === 'function') inv_calculateTotals(); }); }
                 
                 const _deductibleCostsContainer = inv_deductibleCostsContainer || document.getElementById('inv_deductibleCostsContainer');
                 if (_deductibleCostsContainer) {
                     _deductibleCostsContainer.addEventListener('change', () => { if(typeof inv_calculateTotals === 'function') inv_calculateTotals(); });
                     _deductibleCostsContainer.addEventListener('input', () => { if(typeof inv_calculateTotals === 'function') inv_calculateTotals(); });
                 }
                 
                 const _saveInvoiceBtn = inv_saveInvoiceBtn || document.getElementById('inv_saveInvoiceBtn');
                 if (_saveInvoiceBtn && !_saveInvoiceBtn.dataset.hasSaveListener) { _saveInvoiceBtn.dataset.hasSaveListener = '1'; if (!_saveInvoiceBtn.getAttribute('onclick')) _saveInvoiceBtn.addEventListener('click', () => window.handleSaveInvoice()); }
                 
                 const _printInvoiceBtn = inv_printInvoiceBtn || document.getElementById('inv_printInvoiceBtn');
                 if (_printInvoiceBtn && !_printInvoiceBtn.dataset.hasPrintListener) { _printInvoiceBtn.dataset.hasPrintListener = '1'; if (!_printInvoiceBtn.getAttribute('onclick')) _printInvoiceBtn.addEventListener('click', () => window.inv_printInvoice()); }
                 // **** جديد: مستمعات الأحداث للتعامل مع اختيار وبحث السيريال في الفاتورة ****
                 if (inv_itemQtyInput && inv_serialSelectContainer) {
                     inv_itemQtyInput.addEventListener('input', () => {
                         const qty = parseInt(inv_itemQtyInput.value);
                         const itemName = inv_itemNameInput.value.trim();
                         const productHasSerialsRegistered = serialNumbersLog.some(log => log.productName === itemName);
                         if (qty === 1 && itemName && products.some(p => p.name === itemName) && productHasSerialsRegistered) {
                             const hasSerials = populateAvailableSerials(itemName, inv_itemSerialSelect, inv_serialSearchInput.value);
                             inv_serialSelectContainer.classList.remove('hidden');
                             if (!hasSerials && !inv_serialSearchInput.value) { // Show error only if no serials exist at all (and no search term)
                                 showMessage(inv_itemAddErrorDiv, `لا توجد أرقام تسلسلية متاحة في المخزون للمنتج "${itemName}".`, true);
                             } else if(!hasSerials && inv_serialSearchInput.value) {
                                 showMessage(inv_itemAddErrorDiv, `لا توجد أرقام تسلسلية مطابقة للبحث.`, false, true); // Info if search yields no results
                             } else {
                                  showMessage(inv_itemAddErrorDiv, ""); // Clear message if serials found
                             }
                         } else {
                             if(inv_serialSelectContainer) inv_serialSelectContainer.classList.add('hidden');
                             if(inv_itemSerialSelect) inv_itemSerialSelect.value = '';
                             if(inv_serialSearchInput) inv_serialSearchInput.value = '';
                             showMessage(inv_itemAddErrorDiv, "");
                         }
                     });
                     // أخف القائمة أيضاً عند تغيير اسم المنتج
                    
                 }
                 // مستمع حدث لحقل بحث السيريال لتحديث القائمة المنسدلة
                 if(inv_serialSearchInput && inv_itemSerialSelect && inv_itemNameInput) {
                     inv_serialSearchInput.addEventListener('input', () => {
                         const itemName = inv_itemNameInput.value.trim();
                         const searchTerm = inv_serialSearchInput.value;
                         if (itemName && inv_serialSelectContainer && !inv_serialSelectContainer.classList.contains('hidden')) {
                             populateAvailableSerials(itemName, inv_itemSerialSelect, searchTerm);
                         }
                     });
                 }


                 // Search Listeners
              // --- ربط أحداث البحث الذكي الشامل ---
if (smartSearchBtn) {
    smartSearchBtn.addEventListener('click', () => performSmartGlobalSearch());
}

if (smartSearchInput) {
    smartSearchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performSmartGlobalSearch();
        }
    });
}
                 if(searchResultsListContainer) {
                     searchResultsListContainer.addEventListener('click', (event) => {
                         const button = event.target.closest('.view-invoice-details-btn');
                         if (button && button.dataset.invoiceId) {
                             viewInvoiceDetails(button.dataset.invoiceId);
                         }
                     });
                 }
              // --- كود تشغيل نافذة الطوارئ والاستعادة ---
    
    // 1. تشغيل الزر الرئيسي في صفحة الإعدادات
    if (openBackupHistoryButton) {
        openBackupHistoryButton.addEventListener('click', openBackupHistoryModal);
    }

    // 2. تفعيل أزرار النافذة نفسها (الإغلاق والاستعادة)
    if (backupHistoryModal) {
        // إغلاق النافذة عند الضغط على الخلفية أو زر الإغلاق
        backupHistoryModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || 
                e.target.closest('.modal-close-btn') || 
                e.target.closest('.modal-close-btn-footer')) {
                // دالة إغلاق النافذة (تأكد من وجودها أو استخدم الكود المباشر)
                if (typeof closeBackupHistoryModal === 'function') {
                    closeBackupHistoryModal();
                } else {
                    backupHistoryModal.style.display = 'none';
                }
            }
        });

        // تنفيذ الاستعادة عند الضغط على الزر الأخضر داخل القائمة
        backupHistoryModal.addEventListener('click', async (e) => {
            const btn = e.target.closest('.restore-backup-btn');
            if (!btn) return;

            const key = btn.dataset.backupKey;
            if (!key) return;

            if (confirm("هل أنت متأكد من استعادة هذه النسخة المحلية؟\nسيتم استبدال البيانات المعروضة حالياً بهذه النسخة.")) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const data = JSON.parse(raw);
                        const dateStr = data.savedForDate || currentLoadedDate;
                        
                        console.log("Restoring backup from key:", key);

                        // تحميل البيانات للذاكرة (المتغيرات)
                        loadState(data, dateStr);
                        
                        // تحديث الواجهة فوراً
                        updateUI();
                        
                        // إغلاق النافذة
                        backupHistoryModal.style.display = 'none';
                        
                        // �� خطوة ذكية: حفظ النسخة المستعادة فوراً للسحابة لتثبيتها ��
                        await saveCurrentStateByDate(dateStr);
                        
                        (window.safeAlert || alert)("تمت الاستعادة بنجاح! وتمت مزامنة البيانات المستعادة مع السحابة.");
                    }
                } catch (err) {
                    console.error("Restore error:", err);
                    (window.safeAlert || alert)("حدث خطأ أثناء استعادة الملف: " + err.message, "error");
                }
            }
        });
    }

// إسناد متغيرات عناصر البحث
reportSearchInput = d('report-search-input');
reportClearSearchBtn = d('report-clear-search-btn');
salesReportSearchContainer = d('sales-report-search-container');
reportDirectSearchBtn = d('report-direct-search-btn'); // <== السطر الجديد

// ربط البحث المباشر (الطريقة 2)
if (reportDirectSearchBtn) {
    reportDirectSearchBtn.addEventListener('click', () => performDirectSearch());
}

// ربط تصفية النتائج المعروضة (الطريقة 1)
if (reportSearchInput) {
    reportSearchInput.addEventListener('input', () => {
        // يتم التصفية فقط للبيانات المحملة بالفعل
        displaySalesReport(currentMonthlySalesData);
    });
}

// ربط وظيفة زر مسح البحث
if (reportClearSearchBtn) {
    reportClearSearchBtn.addEventListener('click', () => {
        if (reportSearchInput) reportSearchInput.value = '';
        displaySalesReport(currentMonthlySalesData); // أعد عرض كل النتائج المحملة
    });
}
// ... بعد كل أسطر addEventListener الأخرى ...

    // --- ربط وتشغيل ميزة الحفظ التلقائي ---
    const autoSaveToggle = d('auto-save-toggle');
    if (autoSaveToggle) {
        // ربط الزر بالدالة
        autoSaveToggle.addEventListener('change', () => window.toggleAutoSave());

        // التحقق من التفضيل المحفوظ عند بدء تشغيل البرنامج
        const savedAutoSavePref = fetchData(lsAutoSaveKey, false);
        if (savedAutoSavePref === true) {
            autoSaveToggle.checked = true; // اجعل الزر في وضعية "التشغيل"
            toggleAutoSave(); // قم بتفعيل الحفظ التلقائي مباشرة
        }
    }
    // --- Event Listeners for Account Management (STEP 2) ---
const accountForm = document.getElementById('account-form');
const accountsList = document.getElementById('accounts-list');
const cancelEditBtn = document.getElementById('cancel-edit-account-btn');

if (accountForm) {
    accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const accountNameInput = document.getElementById('account-name-input');
        const accountBalanceInput = document.getElementById('account-balance-input');
        const accountIdInput = document.getElementById('account-id-input');
        
        const name = accountNameInput.value.trim();
        const balance = parseFloat(accountBalanceInput.value) || 0;
        const id = accountIdInput.value;

        if (!name) {
            (window.safeAlert || alert)('يرجى إدخال اسم للحساب.');
            return;
        }

        if (id) { // Editing existing account
            const account = accounts.find(acc => acc.id === id);
            if(account) {
                 if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase() && acc.id !== id)) {
                    (window.safeAlert || alert)('اسم الحساب موجود بالفعل.');
                    return;
                }
                logOperation("تعديل حساب", `تم تغيير اسم حساب "${account.name}" إلى "${name}".`);
                account.name = name;
            }
        } else { // Adding new account
            if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
                (window.safeAlert || alert)('اسم الحساب موجود بالفعل.');
                return;
            }
            const newAccount = { id: generateId("acc"), name: name, balance: balance };
            if (!newAccount.id) newAccount.id = generateId("ACC");
            accounts.push(newAccount);
            logOperation("إضافة حساب", `تم إنشاء حساب جديد "${name}" برصيد افتتاحي ${formatCurrency(balance)}.`);
        }
        
        updateUI();
        resetAccountForm();
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => window.resetAccountForm());
}

if (accountsList) {
    accountsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains('edit-btn')) {
            const account = accounts.find(acc => acc.id === id);
            if (account) {
                document.getElementById('account-id-input').value = account.id;
                document.getElementById('account-name-input').value = account.name;
                document.getElementById('account-form-title').textContent = `تعديل حساب: ${account.name}`;
                document.getElementById('save-account-btn').textContent = 'تحديث الاسم';
                document.getElementById('starting-balance-group').classList.add('hidden');
                document.getElementById('cancel-edit-account-btn').classList.remove('hidden');
                document.getElementById('account-name-input').focus();
            }
        }

        if (target.classList.contains('delete-btn')) {
            const account = accounts.find(acc => acc.id === id);
            if (!account) return;
            if (account.id === 'main' || accounts.length <= 1) {
                (window.safeAlert || alert)('لا يمكن حذف الحساب الرئيسي أو الحساب الوحيد المتبقي في النظام.');
                return;
            }
            if (Math.abs(Number(account.balance) || 0) > 0.001) {
                if ((Number(account.balance) || 0) > 0) {
                    if (!confirm(`تحذير: حساب "${account.name}" يحتوي على رصيد (${formatCurrency(account.balance)}).\nهل أنت متأكد من حذفه؟ سيتم تصفير هذا الرصيد وتخفيض السيولة.`)) {
                        return;
                    }
                    if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                        const bal = Number(account.balance) || 0;
                        liquidityLog.push({
                            id: 'liq-del-' + Date.now(),
                            date: new Date().toISOString(),
                            timestamp: new Date().toISOString(),
                            type: 'remove',
                            amount: bal,
                            description: `حذف حساب "${account.name}" مع رصيده المتبقي (${formatCurrency(bal)})`,
                            reason: `حذف حساب "${account.name}" مع رصيده المتبقي`,
                            accountId: account.id,
                            accountName: account.name,
                            currentBalance: Math.max(0, (typeof totalLiquidity !== 'undefined' ? totalLiquidity : 0) - bal)
                        });
                    }
                } else {
                    if (!confirm(`تحذير: حساب "${account.name}" عليه رصيد سالب (${formatCurrency(account.balance)}).\nهل أنت متأكد من حذفه؟`)) {
                        return;
                    }
                }
            } else if (!confirm(`هل أنت متأكد من حذف حساب "${account.name}"؟`)){
                return;
            }
            
            if (typeof saveStateToHistory === 'function') saveStateToHistory();
            accounts = accounts.filter(acc => acc.id !== id);
            logOperation("حذف حساب", `تم حذف حساب "${account.name}".`);
            if (typeof saveSystemToCloud === 'function') saveSystemToCloud();
            updateUI();
        }
    });
}
const addIncomeBtn = d('add-income-btn');
const addExpenseBtn = d('add-expense-btn');
const transferBtn = d('transfer-btn');
const adjustBalanceBtn = d('adjust-balance-btn');

if (addIncomeBtn) {
    addIncomeBtn.addEventListener('click', () => {
        if (handleIncomeAddition()) {
            updateUI();
            d('income-amount-input').value = '';
        }
    });
}
if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', () => {
        if (handleExpenseAddition()) {
            updateUI();
            d('expense-amount-input').value = '';
        }
    });
}
if (transferBtn) {
    transferBtn.addEventListener('click', () => {
        if (handleTransfer()) {
            updateUI();
            d('transfer-amount-input').value = '';
        }
    });
}
if (adjustBalanceBtn) {
    adjustBalanceBtn.addEventListener('click', () => {
        if (handleBalanceAdjustment()) {
            updateUI();
            d('adjust-amount-input').value = '';
            d('adjust-reason-input').value = '';
        }
    });
}
const actionTabsContainer = document.querySelector('.action-tabs');
if (actionTabsContainer) {
    actionTabsContainer.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (targetButton) {
            const tabId = targetButton.dataset.target;
            if (tabId) {
                showTab(tabId);
            }
        }
    });


}


    // --- Initial Load Logic ---
    const todayString = getTodayDateString();
    // =======================================================
// START: Returns Section Event Listeners
// =======================================================
if (returnProductSelect) {
    returnProductSelect.addEventListener('change', () => {
        const selectedOption = returnProductSelect.options[returnProductSelect.selectedIndex];
        const cost = selectedOption.dataset.cost || 0;
        if (returnCostPriceDisplay) returnCostPriceDisplay.textContent = formatCurrency(cost);
    });
}



// confirmManualReturnBtn listener handled centrally in finance-core.js
// =======================================================
// END: Returns Section Event Listeners
// =======================================================
    // --- Purchase Invoice (PI) Event Listeners ---
if (piAddItemBtn) {
    piAddItemBtn.addEventListener('click', pi_addItem);
}

if (piItemNameInput) {
    piItemNameInput.addEventListener('change', () => {
        const name = piItemNameInput.value.trim();
        const product = products.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (product && piItemCostInput) {
            piItemCostInput.value = product.costPrice.toFixed(2);
            const catInput = document.getElementById('pi_item_category');
            if (catInput && product.category && !catInput.value) { catInput.value = product.category; }
            if (piItemTotalCostInput && piItemQuantityInput) {
                const qty = parseFloat(piItemQuantityInput.value) || 1;
                piItemTotalCostInput.value = (qty * product.costPrice).toFixed(2);
            }
            showMessage(piItemAddMessage, `تم جلب متوسط التكلفة للمنتج "${name}".`, false, true);
        }
    });
}

if (piItemQuantityInput) {
    piItemQuantityInput.addEventListener('input', () => {
        const qty = parseInt(piItemQuantityInput.value);
        if (qty > 0) {
            piItemSerialsContainer.classList.remove('hidden');
        } else {
            piItemSerialsContainer.classList.add('hidden');
        }
    });
}

if (piItemsBody) {
    piItemsBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('pi_remove_item_btn')) {
            e.target.closest('tr').remove();
            window.pi_updateTotals();
            if (piItemsBody.children.length === 0) {
                pi_no_items_msg.classList.remove('hidden');
            }
        } else if (e.target.classList.contains('pi_edit_item_btn')) {
            const row = e.target.closest('tr');
            
            const nameInput = document.getElementById('pi_item_name');
            const catInput = document.getElementById('pi_item_category');
            const qtyInput = document.getElementById('pi_item_quantity');
            const costInput = document.getElementById('pi_item_cost');
            const totalCostInput = document.getElementById('pi_item_total_cost');
            const serialsInput = document.getElementById('pi_item_serials');
            const serialsContainer = document.getElementById('pi_item_serials_container');

            if (nameInput) nameInput.value = row.dataset.name || '';
            if (catInput) catInput.value = row.dataset.category || '';
            if (qtyInput) qtyInput.value = row.dataset.quantity || '1';
            if (costInput) costInput.value = row.dataset.cost || '0';
            if (totalCostInput) totalCostInput.value = row.dataset.subtotal || '0';
            
            try {
                const serials = JSON.parse(row.dataset.serials || '[]');
                if (serialsInput) serialsInput.value = serials.join('\n');
                if (serialsContainer) {
                    if (serials.length > 0) serialsContainer.classList.remove('hidden');
                    else serialsContainer.classList.add('hidden');
                }
            } catch (err) {
                console.warn("تعذر استرجاع السيريالات للتعديل:", err);
            }

            row.remove();
            window.pi_updateTotals();
            if (piItemsBody.children.length === 0) {
                pi_no_items_msg.classList.remove('hidden');
            }
            if (nameInput) nameInput.focus();
        }
    });
}
piPaidAmountInput = d('pi_paid_amount');
if (piPaidAmountInput) {
    piPaidAmountInput.addEventListener('input', function() {
        // نستخدم window لضمان مناداة الدالة الجديدة الموجودة في الشارع الرئيسي
        if (window.pi_updateTotals) {
            window.pi_updateTotals();
        }
    });
}

if (piClearFormBtn) {
    piClearFormBtn.addEventListener('click', pi_clearForm);
}
if (piConfirmBtn) {
    piConfirmBtn.addEventListener('click', pi_confirmPurchaseInvoice);
}

if (d('pi_save_draft_btn')) {
    d('pi_save_draft_btn').addEventListener('click', pi_saveDraft);
}
if (d('pi_restore_draft_btn')) {
    d('pi_restore_draft_btn').addEventListener('click', pi_loadDraft);
}
const piDeductCheckbox = d('pi_deduct_from_liquidity');
const piAccountContainer = d('pi-payment-account-container');
if (piDeductCheckbox && piAccountContainer) {
    piDeductCheckbox.addEventListener('change', () => {
        if (piDeductCheckbox.checked) {
            piAccountContainer.classList.remove('hidden');
        } else {
            piAccountContainer.classList.add('hidden');
        }
    });
}
const invProfitEl = d('inventory-total-profit');
if (invProfitEl) {
    const profitObs = new MutationObserver(function() {
        profitObs.disconnect();
        const m = (typeof window.money === 'function' ? window.money : Number);
        const pot = m((window.pendingSales || []).reduce((s, x) => s + (Number(x.potentialProfit) || 0), 0)), real = m(Number(window.totalProfit) || 0);
        if (real > 0 && pot > 0) invProfitEl.textContent = `إجمالي الربح المتوقع: ${formatCurrency(real + pot)} (محقق: ${formatCurrency(real)} | مؤقت: ${formatCurrency(pot)})`;
        else if (pot > 0) invProfitEl.textContent = `الأرباح المتوقعة (مؤقتة): ${formatCurrency(pot)}`;
        else invProfitEl.textContent = `إجمالي الربح: ${formatCurrency(real)}`;
        profitObs.observe(invProfitEl, { childList: true, characterData: true, subtree: true });
    });
    profitObs.observe(invProfitEl, { childList: true, characterData: true, subtree: true });
    if (d('product-list')) profitObs.observe(d('product-list'), { childList: true });
    invProfitEl.textContent = invProfitEl.textContent;
}

if (d('pending-purchases-container')) {
    d('pending-purchases-container').addEventListener('click', handlePendingPurchaseActions);
}

});
