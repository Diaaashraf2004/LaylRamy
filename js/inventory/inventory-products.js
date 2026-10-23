// finance-core-inventory.js - Inventory, Products, Suppliers & Purchases Module
        // --- Supplier Management Functions ---
        function resetSupplierForm() { editingSupplierId = null; if(supplierNameInput) supplierNameInput.value = ""; if(supplierContactInput) supplierContactInput.value = ""; if(supplierAddressInput) supplierAddressInput.value = ""; if(addSupplierButton) addSupplierButton.textContent = "إضافة / تحديث المورد"; if(supplierFormTitle) supplierFormTitle.textContent = "إضافة مورد جديد"; if(cancelEditSupplierButton) cancelEditSupplierButton.classList.add('hidden'); if(supplierMessage) { showMessage(supplierMessage,""); supplierMessage.classList.remove('visible','error','success','info'); } }
        function updateSuppliersListDisplay() {
             if(!supplierList) return;
             if (suppliers.length === 0) {
                 supplierList.innerHTML = '<p class="text-center text-gray-500 col-span-full">لا يوجد موردين مسجلين بعد.</p>';
             } else {
                 const sortedSuppliers = [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
                 supplierList.innerHTML = sortedSuppliers.map(supplier => `
                     <div class="bg-gray-50 rounded-lg shadow p-4 border border-gray-200 flex flex-col justify-between">
                         <div>
                             <h4 class="text-lg font-semibold text-gray-800 mb-2">${escapeHTML(supplier.name)}</h4>
                             ${supplier.contact ? `<p class="text-gray-600 text-sm">الاتصال: ${escapeHTML(supplier.contact)}</p>` : ''}
                             ${supplier.address ? `<p class="text-gray-600 text-sm">العنوان: ${escapeHTML(supplier.address)}</p>` : ''}
                         </div>
                         <div class="mt-3 pt-3 border-t border-gray-200 flex justify-end gap-2 supplier-actions">
                             <button data-supplier-id="${supplier.id}" class="edit-supplier-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-1 px-2 rounded border border-yellow-500">تعديل</button>
                             <button data-supplier-id="${supplier.id}" class="delete-supplier-btn text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded border border-red-600">حذف</button>
                         </div>
                     </div>
                 `).join('');
             }
             // **** تحديث datalist لأسماء الموردين للبحث ****
             if(supplierNamesDatalist) {
                 supplierNamesDatalist.innerHTML = suppliers.map(s => `<option value="${window.escapeHTML(s.name)}"></option>`).join('');
             }
         }
        function updateSupplierDropdown(selectElementId, selectedSupplierId = null) { const selectElement = d(selectElementId); if (!selectElement) { /*console.warn(`Dropdown element #${selectElementId} not found yet.`);*/ return; } const currentVal = selectElement.value; selectElement.innerHTML = '<option value="">-- اختر المورد --</option>'; const sortedSuppliers = [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'ar')); sortedSuppliers.forEach(supplier => { const option = document.createElement('option'); option.value = supplier.id; option.textContent = supplier.name; if (selectedSupplierId && supplier.id === selectedSupplierId) { option.selected = true; } else if (!selectedSupplierId && supplier.id === currentVal) { // Retain current selection if not specifically overridden
                 option.selected = true; } selectElement.appendChild(option); }); }
        function addOrUpdateSupplier() { if (!supplierNameInput || !supplierContactInput || !supplierAddressInput || !supplierMessage) return; // Ensure elements exist
             const name = supplierNameInput.value.trim(); const contact = supplierContactInput.value.trim(); const address = supplierAddressInput.value.trim(); if (!name) { showMessage(supplierMessage, "اسم المورد مطلوب.", true); return; } if (editingSupplierId) { const supplierIndex = suppliers.findIndex(s => s.id === editingSupplierId); if (supplierIndex > -1) { const oldName = suppliers[supplierIndex].name; suppliers[supplierIndex].name = name; suppliers[supplierIndex].contact = contact; suppliers[supplierIndex].address = address; logOperation("تعديل مورد", `تم تعديل بيانات المورد "${oldName}" إلى "${name}".`); showMessage(supplierMessage, `تم تحديث المورد "${name}" بنجاح.`); } else { showMessage(supplierMessage, `خطأ: المورد المحدد للتعديل غير موجود.`, true); } resetSupplierForm(); } else { // Check if name already exists
             const nameExists = suppliers.some(s => s.name.toLowerCase() === name.toLowerCase());
             if (nameExists) {
                 showMessage(supplierMessage, `المورد "${name}" موجود بالفعل.`, true);
                 return;
             }
             const newSupplier = { id: generateId('sup'), name: name, contact: contact, address: address }; suppliers.push(newSupplier); logOperation("إضافة مورد", `تم إضافة مورد جديد: "${name}".`); showMessage(supplierMessage, `تمت إضافة المورد "${name}" بنجاح.`); supplierNameInput.value = ""; // Clear only name on successful add
                 supplierContactInput.value = ""; supplierAddressInput.value = ""; supplierNameInput.focus(); } updateUI(); } // Update UI including dropdowns
        function editSupplier(supplierId) { const supplier = suppliers.find(s => s.id === supplierId); if (supplier && supplierNameInput && supplierContactInput && supplierAddressInput && supplierFormTitle && addSupplierButton && cancelEditSupplierButton) { editingSupplierId = supplierId; supplierNameInput.value = supplier.name; supplierContactInput.value = supplier.contact || ""; supplierAddressInput.value = supplier.address || ""; supplierFormTitle.textContent = `تعديل المورد: ${supplier.name}`; addSupplierButton.textContent = "تحديث المورد"; cancelEditSupplierButton.classList.remove('hidden'); d('add-update-supplier-form').scrollIntoView({ behavior: 'smooth' }); } else { showMessage(supplierMessage, "المورد المحدد غير موجود أو عناصر النموذج غير جاهزة.", true); } }
        function deleteSupplier(supplierId) {
             const supplierIndex = suppliers.findIndex(s => s.id === supplierId);
             if (supplierIndex > -1) {
                 const supplierName = suppliers[supplierIndex].name;
                 if (confirm(`هل أنت متأكد من حذف المورد "${supplierName}"؟ سيتم إزالة ربطه من جميع المنتجات والأرقام التسلسلية المسجلة باسمه.`)) {
                     suppliers.splice(supplierIndex, 1);
                     let updatedProductsCount = 0;
                     products.forEach(p => {
                         if (p.supplierId === supplierId) {
                             p.supplierId = "";
                             updatedProductsCount++;
                         }
                     });
                                         // **** فك ارتباط السيريالات المرتبطة بالمورد المحذوف بدلاً من حذفها من المخزن ****
                    let unlinkedSerialCount = 0;
                    serialNumbersLog.forEach(log => {
                        if (log.supplierId === supplierId) {
                            log.supplierId = "";
                            unlinkedSerialCount++;
                        }
                    });

                    logOperation("حذف مورد", `تم حذف المورد "${supplierName}". تم فك ارتباط ${updatedProductsCount} منتج و ${unlinkedSerialCount} رقم تسلسلي.`);
                    showMessage(supplierMessage, `تم حذف المورد "${supplierName}" وفك ارتباط منتجاته وسيريالاته بنجاح دون التأثير على المخزون.`);
                     if (editingSupplierId === supplierId) { resetSupplierForm(); }
                     updateUI();
                 }
             } else {
                 showMessage(supplierMessage, "المورد المحدد غير موجود.", true);
             }
          }

        // *** JavaScript - (Corresponding to original Part 5) Ends Here ***
        // *** JavaScript - (Corresponding to original Part 6) Starts Here ***

        // --- دوال تحديث الواجهة (UI Updates) ---
    // === 3. استبدل الدالة القديمة بالكامل بهذه الدالة ===
function updateProductListDisplay() {
    // --- 1. تحديث قائمة الأقسام (للفلترة وللإكمال التلقائي) ---
    const allCategories = [...new Set(products.map(p => (p.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
    
    // الأقسام التي تحتوي على بضاعة فعلية متوفرة في المخزن (رصيد أكبر من صفر)
    const inStockProducts = products.filter(p => (Number(p.quantity) || 0) > 0);
    const activeCategories = [...new Set(inStockProducts.map(p => (p.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
    
    const showOutOfStock = document.getElementById('show-out-of-stock-toggle')?.checked ?? false;
    const filterCategories = showOutOfStock ? allCategories : activeCategories;
    
    // تحديث قائمة الفلترة <select> (إخفاء الأقسام منتهية البضاعة تماماً)
    if (inventoryCategoryFilter) {
        const currentCategoryFilter = inventoryCategoryFilter.value;
        inventoryCategoryFilter.innerHTML = '<option value="all">كل الأقسام</option>';
        filterCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            inventoryCategoryFilter.appendChild(option);
        });
        
        if (currentCategoryFilter && filterCategories.includes(currentCategoryFilter)) {
            inventoryCategoryFilter.value = currentCategoryFilter;
        } else {
            inventoryCategoryFilter.value = 'all';
        }
    }

    // تحديث قائمة الإكمال التلقائي <datalist> في نموذج الإضافة
    if (categoryDatalist) {
        categoryDatalist.innerHTML = allCategories.map(cat => `<option value="${window.escapeHTML(cat)}"></option>`).join('');
    }

    // التأكد من تحميل كل العناصر قبل المتابعة
    if (!productList || !inventorySearchInput) {
        return;
    }

    // --- 2. الحصول على قيم التصفية الحالية ---
    const searchTerm = inventorySearchInput.value.trim().toLowerCase();
    const selectedCategory = inventoryCategoryFilter ? inventoryCategoryFilter.value : 'all';
    const showOutOfStockProducts = document.getElementById('show-out-of-stock-toggle')?.checked ?? false;

    // --- 3. تصفية المنتجات بناءً على البحث والقسم وحالة الرصيد ---
    const filteredProducts = products.filter(product => {
        const nameMatch = !searchTerm || (product.name && product.name.toLowerCase().includes(searchTerm));
        const categoryMatch = (selectedCategory === 'all') || (product.category === selectedCategory) || ((product.category || '').trim() === selectedCategory);
        const qty = Number(product.quantity) || 0;
        const qtyMatch = showOutOfStockProducts ? true : qty > 0;
        
        return nameMatch && categoryMatch && qtyMatch;
    });

    // --- 4. عرض المنتجات المفلترة ---
    if (filteredProducts.length === 0) {
        if (products.length === 0) {
            productList.innerHTML = '<p class="text-center text-gray-500 col-span-full">لا توجد بضائع حتى الآن.</p>';
        } else {
            productList.innerHTML = '<p class="text-center text-gray-500 col-span-full">لا توجد منتجات تطابق البحث أو التصفية.</p>';
        }
    } else {
        // فرز المنتجات المفلترة أبجديًا
        const sortedProducts = [...filteredProducts].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        
        // بناء HTML
        const productsHTML = sortedProducts.map(product => {
            const supplier = suppliers.find(s => s.id === product.supplierId);
            const inStockSerials = serialNumbersLog.filter(s => 
                (product.id && s.productId ? s.productId === product.id : s.productName === product.name) && 
                (s.status === 'in_stock' || (!s.status && s.status !== 'sold'))
            );
            const registeredSerialsCount = inStockSerials.length;
            const quantity = Number(product.quantity) || 0;
            const unregisteredCount = Math.max(0, quantity - registeredSerialsCount);
            const isOutOfStock = quantity <= 0;
            const stockBadge = isOutOfStock ? `<span class="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-block mr-2">منتهي من المخزن (رصيد 0)</span>` : '';
            
            // إضافة كود HTML لعرض القسم (إذا كان موجودًا)
            const categoryHTML = product.category ? `<p class="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-2">${escapeHTML(product.category)}</p>` : '';

            // كود بطاقة المنتج مع إضافة القسم وتنبيه انتهاء المخزون
            return `<div class="bg-gray-50 rounded-lg shadow p-4 border ${isOutOfStock ? 'border-red-300 bg-red-50/20' : 'border-gray-200'} flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-lg font-semibold text-gray-800">${escapeHTML(product.name || 'غير مسمى')}</h3>
                                ${stockBadge}
                            </div>
                            <p class="text-gray-600 text-sm">الكمية الإجمالية: <span class="font-semibold ${isOutOfStock ? 'text-red-600' : 'text-blue-500'}">${quantity}</span></p>
                            <p class="text-gray-600 text-sm">السيريالات المتوفرة: <span class="font-semibold text-green-600">${registeredSerialsCount}</span></p>
                            ${unregisteredCount > 0 ? `<p class="text-xs text-red-500">قطع غير مسجلة: ${unregisteredCount}</p>` : ''}
                            <p class="text-gray-600 text-sm">المورد: <span class="font-semibold text-cyan-600">${supplier ? escapeHTML(supplier.name) : '-'}</span></p>
                            <p class="text-gray-600 text-sm">متوسط التكلفة: <span class="font-semibold text-purple-500">${formatCurrency(product.costPrice)}</span></p>
                            <p class="text-gray-600 text-sm">إجمالي التكلفة: <span class="font-semibold text-gray-700">${formatCurrency(quantity * (Number(product.costPrice) || 0))}</span></p>
                            ${categoryHTML}
                        </div>
                        <div class="mt-3 pt-3 border-t border-gray-200 flex justify-end gap-2 product-actions">
                            <button data-product-id="${escapeHTML(product.id || '')}" data-product-name="${escapeHTML(product.name || '')}" class="manage-serials-btn text-xs font-semibold py-1 px-2 rounded">إدارة السيريالات</button>
                            <button data-product-id="${escapeHTML(product.id || '')}" data-product-name="${escapeHTML(product.name || '')}" class="edit-product-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-1 px-2 rounded border border-yellow-500">تعديل</button>
                            <button data-product-id="${escapeHTML(product.id || '')}" data-product-name="${escapeHTML(product.name || '')}" class="delete-product-btn text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded border border-red-600">حذف</button>
                        </div>
                    </div>`;
        }).join('');
        
        productList.innerHTML = productsHTML;
    }
    
    // --- 5. تحديث قائمة الإكمال التلقائي لاسم المنتج ---
    if (productNamesDatalist) {
        productNamesDatalist.innerHTML = products.map(p => `<option value="${window.escapeHTML(p.name)}">${window.escapeHTML(p.name)} (القسم: ${window.escapeHTML(p.category || 'عام')}) - المتاح: ${p.quantity}</option>`).join('');
    }
}
function processInventoryAndCosts(items, isFromPending) {
    let totalItemsCost = 0;
    let deductedItemsData = [];
    let requiredQuantities = {};

    // 1. تجميع المنتجات المباعة وحساب تكلفتها
    items.forEach(item => {
        totalItemsCost += (item.costPrice * item.quantity);
        if (!isFromPending) { 
            // نجمع الكميات لخصمها لاحقاً (فقط لو فاتورة جديدة)
            requiredQuantities[item.name] = (requiredQuantities[item.name] || 0) + item.quantity;
        }
    });

    // 2. تجميع وخصم الملحقات (الهدايا)
    // يتم هذا فقط للفواتير الجديدة، لأن الفواتير القادمة من "معلق" تم خصم ملحقاتها مسبقاً
   // �� [تعديل د. ضياء]: جمع الملحقات المخصومة بالـ ID والاسم معاً لضمان عدم التداخل برمجياً
    if (!isFromPending && inv_deductibleCostsContainer) {
        const checkedBoxes = inv_deductibleCostsContainer.querySelectorAll('input[type="checkbox"]:checked');
        checkedBoxes.forEach(checkbox => {
            const productIdOrName = checkbox.value;
            const pId = checkbox.dataset.id || "";
            const pName = checkbox.dataset.name || productIdOrName;
            const cost = parseFloat(checkbox.dataset.cost) || 0;
            const parentLabel = checkbox.parentElement;
            const qtyInput = parentLabel.querySelector('.inv-deducted-item-quantity');
            const qtyToDeduct = parseInt(qtyInput?.value || '0');
            
            if (qtyToDeduct > 0) {
                // �� حفظ الـ id والاسم معاً داخل مصفوفة الملحقات
                deductedItemsData.push({ 
                    id: pId || null, 
                    name: pName, 
                    quantity: qtyToDeduct, 
                    costPrice: cost 
                });
                
                totalItemsCost += (cost * qtyToDeduct); // إضافة التكلفة الكلية للملحق
                
                // الاعتماد على الـ ID كمفتاح فريد لحجز الكمية، والاسم كبديل للأصناف القديمة
                const key = pId || pName;
                requiredQuantities[key] = (requiredQuantities[key] || 0) + qtyToDeduct;
            }
        });
    }
   // �� [تعديل د. ضياء الحصري]: التنفيذ الفعلي للخصم المباشر من المخزن بالـ ID الفريد
if (!isFromPending) {
    items.forEach(item => {
        let productIndex = -1;
        if (item.id) {
            productIndex = products.findIndex(p => p.id === item.id);
        }
        if (productIndex === -1) {
            productIndex = products.findIndex(p => p.name.toLowerCase() === item.name.toLowerCase());
        }
        if (productIndex !== -1) {
            if (typeof window.adjustStock === 'function') {
                if (!window.adjustStock(productIndex, -item.quantity, "بيع / تسوية")) {
                    console.error("Failed to adjust stock");
                }
            } else {
                products[productIndex].quantity -= item.quantity;
            }
        }
    });
}
    return { totalItemsCost, deductedItemsData };
}

window.injectProductToMain = function(prodObj) { 
        if (typeof products !== 'undefined') if (!prodObj.id) prodObj.id = generateId("PROD");
    products.push(prodObj); 
    };

window.getLiveProducts = function() { return (typeof products !== 'undefined') ? products : []; };
