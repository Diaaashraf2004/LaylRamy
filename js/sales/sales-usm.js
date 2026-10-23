window.openUnifiedSellModal = function(originType = 'quick') {
    window.usm_currentOrigin = originType;
    document.getElementById('unifiedSellProductModal').style.display = 'flex';
    
    // تفريغ المدخلات الافتراضية للنافذة
    document.getElementById('usm_extra_charges').value = 0;
    document.getElementById('usm_shipping_cost').value = 0;
    document.getElementById('usm_search_input').value = '';
    window.usm_cart = {};
    
    // سحب اسم العميل إذا كان مكتوباً مسبقاً في واجهات الخلفية تيسيراً للعمل
    if (originType === 'quick') {
        document.getElementById('usm_customer_name').value = document.getElementById('sell-customer-name').value || '';
    } else if (originType === 'invoice') {
        document.getElementById('usm_customer_name').value = document.getElementById('inv_customerName').value || '';
    }
    
    // شحن الخزن المتوفرة بالسيستم داخل المودل ديناميكياً
    const accountSelect = document.getElementById('usm_account_select');
    const liveAccounts = (typeof accounts !== 'undefined') ? accounts : [];
    if (accountSelect && liveAccounts.length > 0) {
        accountSelect.innerHTML = liveAccounts.map(acc => `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (${acc.balance.toFixed(2)} جنيه)</option>`).join('');
    }
    
    // شحن الأقسام
    const liveProducts = (typeof products !== 'undefined') ? products : [];
    const filterSelect = document.getElementById('usm_category_filter');
    if (filterSelect && liveProducts.length > 0) {
        const categories = [...new Set(liveProducts.map(p => p.category).filter(Boolean))];
        filterSelect.innerHTML = '<option value="all">كل الأقسام والـ Categories</option>' + 
            categories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
    }
    
    window.usm_renderProductGrid();
    window.usm_calculateLiveProfit();
};

window.closeUnifiedSellModal = function() {
    document.getElementById('unifiedSellProductModal').style.display = 'none';
};

window.usm_renderProductGrid = function() {
    const body = document.getElementById('usm_product_grid_body');
    const liveProducts = (typeof products !== 'undefined') ? products : [];
    if (!body || !liveProducts) return;
    
    const searchVal = document.getElementById('usm_search_input').value.trim().toLowerCase();
    const catVal = document.getElementById('usm_category_filter').value;
    
    const filtered = liveProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal);
        const matchesCat = (catVal === 'all' || p.category === catVal);
        return matchesSearch && matchesCat && (Number(p.quantity) > 0);
    });
    
    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">لا توجد منتجات متوفرة تطابق التصفية.</td></tr>`;
        return;
    }
    
    body.innerHTML = filtered.map(p => {
        const suggestedSalePrice = p.costPrice * 1.25;
        const cartItem = window.usm_cart[p.id || p.name];
        const currentQty = cartItem ? cartItem.qty : 0;
        const currentPrice = cartItem ? cartItem.salePrice : suggestedSalePrice;
        
        return `
            <tr class="hover:bg-gray-50 border-b" data-product-id="${escapeHTML(p.id || p.name)}" data-cost="${p.costPrice}">
                <td class="p-2 text-right">
                    <span class="font-semibold text-gray-800">${escapeHTML(p.name)}</span>
                    <span class="block text-xs text-gray-400">القسم: ${escapeHTML(p.category || 'عام')}</span>
                </td>
                <td class="p-2 text-center font-bold text-blue-600 font-mono">${p.quantity}</td>
                <td class="p-2 text-center text-purple-600 font-mono">${Number(p.costPrice).toFixed(2)}</td>
                <td class="p-2 text-center">
                    <input type="number" class="usm-sale-price shadow-sm p-1 border rounded text-xs text-center font-mono w-24 bg-gray-50 focus:bg-white" 
                           value="${Number(currentPrice).toFixed(2)}" min="0" step="0.01" oninput="window.usm_saveToCart(this.closest('tr').dataset.productId, this, 'price')">
                </td>
                <td class="p-2 text-center">
                    <input type="number" class="usm-requested-qty shadow-sm p-1 border rounded text-xs text-center font-mono w-20 border-blue-300 bg-blue-50 focus:bg-white" 
                           value="${currentQty}" min="0" max="${p.quantity}" step="1" oninput="window.usm_saveToCart(this.closest('tr').dataset.productId, this, 'qty')">
                </td>
            </tr>
        `;
    }).join('');
};

window.usm_saveToCart = function(prodId, inputEl, type) {
    if (!window.usm_cart[prodId]) {
        const liveProducts = (typeof products !== 'undefined') ? products : [];
        const p = liveProducts.find(prod => prod.id === prodId || prod.name === prodId);
        window.usm_cart[prodId] = { qty: 0, salePrice: p ? p.costPrice * 1.25 : 0 };
    }
    if (type === 'qty') window.usm_cart[prodId].qty = parseInt(inputEl.value) || 0;
    else if (type === 'price') window.usm_cart[prodId].salePrice = parseFloat(inputEl.value) || 0;
    
    window.usm_calculateLiveProfit();
};

window.usm_calculateLiveProfit = function() {
    let totalCostOfSelected = 0;
    let totalSalesOfSelected = 0;
    const liveProducts = (typeof products !== 'undefined') ? products : [];
    
    for (const prodId in window.usm_cart) {
        const item = window.usm_cart[prodId];
        if (item.qty > 0) {
            const p = liveProducts.find(prod => prod.id === prodId || prod.name === prodId);
            if (p) {
                totalCostOfSelected += ((Number(p.costPrice) || 0) * item.qty);
                totalSalesOfSelected += (item.salePrice * item.qty);
            }
        }
    }
    
    const extraCharges = parseFloat(document.getElementById('usm_extra_charges').value) || 0;
    const shippingCost = parseFloat(document.getElementById('usm_shipping_cost').value) || 0;
    
    const finalGrandTotalSales = totalSalesOfSelected + extraCharges + shippingCost;
    let finalExpectedProfit = (totalSalesOfSelected + extraCharges) - totalCostOfSelected;
    const usmToggle = document.getElementById('usm-deduction-toggle');
    const usmAmount = document.getElementById('usm-deduction-amount');
    if (usmToggle && usmToggle.checked && usmAmount) {
        const amt = parseFloat(usmAmount.value) || 0;
        if (amt > 0) finalExpectedProfit -= amt; const hint = document.getElementById('usm-deduction-real-profit'); if (hint) { hint.textContent = formatCurrency(finalExpectedProfit); hint.style.color = finalExpectedProfit >= 0 ? '#15803d' : '#dc2626'; } }
    
    document.getElementById('usm_total_sales_display').textContent = finalGrandTotalSales.toFixed(2) + " جنيه";
    document.getElementById('usm_total_cost_display').textContent = totalCostOfSelected.toFixed(2) + " جنيه";
    
    const profitDisplay = document.getElementById('usm_expected_profit_display');
    profitDisplay.textContent = finalExpectedProfit.toFixed(2) + " جنيه";
    profitDisplay.className = finalExpectedProfit >= 0 ? "text-xl font-bold text-green-700 font-mono" : "text-xl font-bold text-red-600 font-mono";
};

// �� الدالة التنفيذية الكبرى: تضخ البيانات فورياً وتضغط على أزرار الحفظ الأصلية لسيستمك!
window.usm_applySelectionToOrigin = function() {
    let selectedItems = [];
    let totalItemsPrice = 0;
    const liveProducts = (typeof products !== 'undefined') ? products : [];
    
    for (const prodId in window.usm_cart) {
        const item = window.usm_cart[prodId];
        if (item.qty > 0) {
            const p = liveProducts.find(prod => prod.id === prodId || prod.name === prodId);
            if (p) {
                selectedItems.push({
                    id: p.id || p.name,
                    name: p.name,
                    quantity: item.qty,
                    costPrice: Number(p.costPrice) || 0,
                    unitPrice: item.salePrice,
                    subtotal: item.salePrice * item.qty
                });
                totalItemsPrice += (item.salePrice * item.qty);
            }
        }
    }
    
    if (selectedItems.length === 0) {
        alert("يرجى اختيار كمية (1 على الأقل) لأحد المنتجات قبل التأكيد.");
        return;
    }
    
    const extraCharges = parseFloat(document.getElementById('usm_extra_charges').value) || 0;
    const shippingCost = parseFloat(document.getElementById('usm_shipping_cost').value) || 0;
    const customerName = document.getElementById('usm_customer_name').value.trim();
    const targetAccountId = document.getElementById('usm_account_select').value;
    const isPending = (document.getElementById('usm_sale_type').value === 'pending');
    
    // �� [الوضع 1]: تحويل وتنفيذ فوري للبيع السريع
    if (window.usm_currentOrigin === 'quick') {
        const firstItem = selectedItems[0];
        document.getElementById('sell-product-name').value = firstItem.name;
        document.getElementById('sell-quantity').value = firstItem.quantity;
        document.getElementById('sell-customer-name').value = customerName;
        document.getElementById('sell-price').value = (totalItemsPrice + extraCharges + shippingCost).toFixed(2);
        document.getElementById('sell-account-select').value = targetAccountId;
        document.getElementById('sell-pending').checked = isPending;
        
        // ترحيل بقية العناصر كملحقات إضافية تلقائياً لحماية المخازن
        const remainingAttachments = selectedItems.slice(1).map(item => ({
            name: item.name, quantity: item.quantity, costPrice: item.costPrice
        }));
        if (typeof updateAdditionalCostsCheckboxes === 'function') {
            updateAdditionalCostsCheckboxes(remainingAttachments);
        }
        
        { // --- نقل قيم الاستقطاع المخفي بأمان ---
        let targetPrefix = window.usm_currentOrigin === 'quick' ? 'sell' : 'inv';
        if (document.getElementById('usm-deduction-toggle') && document.getElementById('usm-deduction-toggle').checked) {
            const targetToggle = document.getElementById(targetPrefix + '-deduction-toggle');
            if (targetToggle) {
                targetToggle.checked = true;
                const targetAmt = document.getElementById(targetPrefix + '-deduction-amount');
                const usmAmt = document.getElementById('usm-deduction-amount');
                if (targetAmt && usmAmt) targetAmt.value = usmAmt.value;
                
                const targetName = document.getElementById(targetPrefix + '-deduction-liability-name');
                const usmName = document.getElementById('usm-deduction-liability-name');
                if (targetName && usmName) targetName.value = usmName.value;
            }
        }
}
        
        { // --- نقل قيم الاستقطاع المخفي بأمان ---
        let targetPrefix = window.usm_currentOrigin === 'quick' ? 'sell' : 'inv';
        if (document.getElementById('usm-deduction-toggle') && document.getElementById('usm-deduction-toggle').checked) {
            const targetToggle = document.getElementById(targetPrefix + '-deduction-toggle');
            if (targetToggle) {
                targetToggle.checked = true;
                const targetAmt = document.getElementById(targetPrefix + '-deduction-amount');
                const usmAmt = document.getElementById('usm-deduction-amount');
                if (targetAmt && usmAmt) targetAmt.value = usmAmt.value;
                
                const targetName = document.getElementById(targetPrefix + '-deduction-liability-name');
                const usmName = document.getElementById('usm-deduction-liability-name');
                if (targetName && usmName) targetName.value = usmName.value;
            }
        }
}
        
        window.closeUnifiedSellModal();
        
        // �� إطلاق قذيفة التنفيذ الفوري والحفظ لقاعدة البيانات وسيرفر Firebase!
        if (typeof sellProduct === 'function') {
            sellProduct(); 
        } else {
            const nativeBtn = document.getElementById('sell-button');
            if (nativeBtn) nativeBtn.click();
        }
        
    // �� [الوضع 2]: تحويل وتنفيذ فوري للفاتورة التفصيلية
    } else if (window.usm_currentOrigin === 'invoice') {
        const itemsBody = document.getElementById('inv_invoiceItemsBody');
        if (itemsBody) {
            itemsBody.innerHTML = ''; 
            selectedItems.forEach(item => {
                const newRow = document.createElement('tr');
                newRow.classList.add('invoice-item-row');
                newRow.dataset.productId = item.id;
                newRow.dataset.itemName = item.name;
                newRow.dataset.itemQty = item.quantity;
                newRow.dataset.itemPrice = item.unitPrice.toFixed(2);
                newRow.dataset.itemSubtotal = item.subtotal.toFixed(2);
                newRow.dataset.itemCost = item.costPrice.toFixed(2);
                
                newRow.innerHTML = `
                    <td class="item-name">${escapeHTML(item.name)}</td>
                    <td class="item-qty" style="text-align:center;">${item.quantity}</td>
                    <td class="item-price" style="text-align:center;">${item.unitPrice.toFixed(2)}</td>
                    <td class="item-subtotal" style="text-align:center; font-weight:bold;">${item.unitPrice * item.quantity}</td>
                    <td class="no-print" style="text-align:center;"><button type="button" class="remove-item-btn" style="color:red; font-weight:bold; border:none; background:none; cursor:pointer;" onclick="this.closest('tr').remove(); if(typeof inv_calculateTotals==='function') inv_calculateTotals();">×</button></td>
                `;
                itemsBody.appendChild(newRow);
            });
            
            // شحن حقول الفاتورة الخلفية صراحة لمنع الكراش
            document.getElementById('inv_customerName').value = customerName || 'عميل كاش';
            if (document.getElementById('inv_shippingCost')) document.getElementById('inv_shippingCost').value = (shippingCost + extraCharges).toFixed(2);
            if (document.getElementById('inv_payment_account')) document.getElementById('inv_payment_account').value = targetAccountId;
            if (document.getElementById('inv_markAsPending')) document.getElementById('inv_markAsPending').checked = isPending;
            if (document.getElementById('inv_notes') && extraCharges > 0) {
                document.getElementById('inv_notes').value += `\n[خدمات وتكاليف إضافية مضافة: ${extraCharges.toFixed(2)} جنيه]`;
            }
            
            if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
            
            window.closeUnifiedSellModal();
            
            // �� إطلاق قذيفة الحفظ النهائي للفاتورة والمزامنة السحابية مع الأرشيف!
            if (typeof handleSaveInvoice === 'function') {
                handleSaveInvoice();
            } else {
                const nativeInvBtn = document.getElementById('inv_saveInvoiceBtn');
                if (nativeInvBtn) nativeInvBtn.click();
            }
        }
    }
};
// ============================================================
// END: Unified Sell Product Modal Logic
// ============================================================
window.openQuickSellModal = function() {
    const invBtn = document.getElementById('openInvoiceModalBtn');
    if (invBtn) {
        invBtn.click();
    } else if (typeof inv_openModal === 'function') {
        inv_openModal();
    } else if (document.getElementById('quickSellModal')) {
        document.getElementById('quickSellModal').style.display = 'flex';
        if (typeof resetSellForm === 'function') resetSellForm();
    }
};

window.closeQuickSellModal = function() {
    document.getElementById('quickSellModal').style.display = 'none';
    if (typeof resetSellForm === 'function') resetSellForm();
};
window.showPendingEditHistory = function(pendingId) {
    var sale = (typeof pendingSales !== "undefined") ? pendingSales.find(function(s){ return String(s.id) === String(pendingId); }) : null;
    var modal = document.getElementById("pendingEditHistoryModal");
    var container = document.getElementById("pendingEditHistoryContent");
    if (!modal || !container) return;
    if (!sale || !sale.editHistory || sale.editHistory.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#64748b;padding:16px;">لا يوجد سجل تعديلات لهذه البيعة.</p>';
    } else {
        var reversed = sale.editHistory.slice().reverse();
        container.innerHTML = reversed.map(function(entry) {
            var dateStr = "";
            try { dateStr = new Date(entry.date).toLocaleString("ar-EG"); } catch(e) { dateStr = entry.date; }
            var items = (entry.changes || []).map(function(c){ return '<li style="margin:3px 0;">' + c + '</li>'; }).join("");
            return '<div style="margin-bottom:12px;padding:12px;border-radius:8px;border:1px solid #c7d2fe;background:#eef2ff;">'
                + '<div style="font-size:0.78rem;font-weight:700;color:#4338ca;margin-bottom:6px;"><i class="fas fa-clock ml-1 text-indigo-500"></i> ' + dateStr + '</div>'
                + '<ul style="margin:0;padding-right:18px;font-size:0.87rem;color:#334155;">' + items + '</ul>'
                + '</div>';
        }).join("");
    }
    modal.style.display = "block";
};
window.loadInvoiceDraft = function() { if(typeof showGlobalMessage === 'function') showGlobalMessage('ميزة المسودة قيد التطوير ولم تكتمل برمجتها بعد.', true); else alert('ميزة المسودة قيد التطوير ولم تكتمل برمجتها بعد.'); };
window.loadQuickSellDraft = function() { if(typeof showGlobalMessage === 'function') showGlobalMessage('ميزة استعادة المسودة قيد التطوير ولم تكتمل برمجتها بعد.', true); else alert('ميزة المسودة قيد التطوير ولم تكتمل برمجتها بعد.'); };
window.saveQuickSellDraft = function() { if(typeof showGlobalMessage === 'function') showGlobalMessage('ميزة حفظ المسودة قيد التطوير ولم تكتمل برمجتها بعد.', true); else alert('ميزة المسودة قيد التطوير ولم تكتمل برمجتها بعد.'); };

