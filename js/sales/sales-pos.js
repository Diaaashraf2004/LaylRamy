// finance-pos.js — POS Grid Logic
// extracted from finance.html

// --- POS Grid Logic ---
window.pos_currentCategoryQuick = 'الكل';
window.pos_currentCategoryInv = 'الكل';
window.pos_selectedProductQuick = null;
window.pos_selectedProductInv = null;

function pos_getCategories(gridType) {
    if (typeof products !== 'undefined' && Array.isArray(products)) {
        const activeProds = products.filter(p => {
            const inStock = (Number(p.quantity) || 0) > 0;
            const notSold = p.status !== 'sold' && (!p.category || p.category.trim() !== 'تم البيع');
            const notService = gridType === 'quick' ? p.type !== 'service' : true;
            return inStock && notSold && notService;
        });
        const cats = new Set(activeProds.map(p => (p.category || '').trim()).filter(Boolean));
        return ['الكل', ...Array.from(cats)];
    }
    if (typeof categories !== 'undefined' && Array.isArray(categories)) {
        return ['الكل', ...categories.map(c => typeof c === 'string' ? c : (c && c.name ? c.name : '')).filter(Boolean)];
    }
    return ['الكل'];
}

window.togglePOSGrid = function(type) {
    const container = document.getElementById('pos_container_' + type);
    if (container) {
        if (container.style.display === 'none') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
};

function pos_createCategoryButtons(containerId, currentCat, clickHandlerName, gridType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cats = pos_getCategories(gridType);
    container.innerHTML = cats.map(c => 
        `<button type="button" data-cat="${escapeHTML(c)}" onclick="${clickHandlerName}(this.getAttribute('data-cat'))" class="px-4 py-2 border rounded-full text-xs font-bold whitespace-nowrap transition-colors" style="${currentCat === c ? 'background-color: #0f172a !important; color: #ffffff !important; border-color: #0f172a !important;' : 'background-color: #ffffff !important; color: #475569 !important; border-color: #e2e8f0 !important;'}">${escapeHTML(c)}</button>`
    ).join('');
}

window.filterPOSCategoryQuick = function(cat) {
    window.pos_currentCategoryQuick = cat;
    window.renderPOSQuickGrid();
};

window.filterPOSCategoryInv = function(cat) {
    window.pos_currentCategoryInv = cat;
    window.renderPOSInvGrid();
};

window.renderPOSQuickGrid = function() {
    pos_createCategoryButtons('pos_categories_quick', window.pos_currentCategoryQuick, 'window.filterPOSCategoryQuick', 'quick');
    const grid = document.getElementById('pos_grid_quick');
    const searchInput = document.getElementById('pos_search_quick');
    if (!grid || typeof products === 'undefined') return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = products.filter(p => {
        const matchCat = window.pos_currentCategoryQuick === 'الكل' || p.category === window.pos_currentCategoryQuick;
        const matchSearch = p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query));
        const inStock = (Number(p.quantity) || 0) > 0;
        const notSold = p.status !== 'sold' && (!p.category || p.category.trim() !== 'تم البيع');
        return matchCat && matchSearch && p.type !== 'service' && inStock && notSold;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-4">لا توجد منتجات مطابقة</div>';
        grid.className = "block";
        return;
    } else {
        grid.className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2";
    }

    grid.innerHTML = filtered.map(p => {
        const isSelected = window.pos_selectedProductQuick && window.pos_selectedProductQuick.name === p.name;
        let cost = parseFloat(p.costPrice) || 0;
        cost = Number.isInteger(cost) ? cost : parseFloat(cost.toFixed(2));

        return `
            <div data-prod-id="${escapeHTML(p.id || p.name)}" onclick="window.selectPOSProductByIdQuick(this.dataset.prodId)" class="bg-white border rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition shadow-sm ${isSelected ? 'border-slate-900 ring-2 ring-slate-400' : 'border-slate-200 hover:border-slate-400 hover:shadow'}">
                <div class="mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded mb-1.5 inline-block">${escapeHTML(p.category || 'عام')}</span>
                    <h4 class="font-bold text-slate-800 text-xs leading-snug">${escapeHTML(p.name)}</h4>
                </div>
                <div class="mt-auto border-t border-slate-100 pt-1.5 flex justify-between items-center bg-slate-50 -mx-2.5 -mb-2.5 p-1.5 rounded-b-lg">
                    <div><p class="text-[9px] text-slate-500 font-bold">التكلفة</p><p class="font-bold text-slate-700 text-xs font-mono">${cost}</p></div>
                    <div class="text-left"><p class="text-[9px] text-slate-500 font-bold">المتاح</p><p class="font-bold text-emerald-700 text-xs px-1.5 py-0.5 bg-emerald-100/70 rounded font-mono">${p.quantity || 0}</p></div>
                </div>
            </div>
        `;
    }).join('');
};

window.renderPOSInvGrid = function() {
    pos_createCategoryButtons('pos_categories_inv', window.pos_currentCategoryInv, 'window.filterPOSCategoryInv', 'inv');
    const grid = document.getElementById('pos_grid_inv');
    const searchInput = document.getElementById('pos_search_inv');
    if (!grid || typeof products === 'undefined') return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = products.filter(p => {
        const matchCat = window.pos_currentCategoryInv === 'الكل' || p.category === window.pos_currentCategoryInv;
        const matchSearch = p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query));
        const inStock = (Number(p.quantity) || 0) > 0;
        const notSold = p.status !== 'sold' && (!p.category || p.category.trim() !== 'تم البيع');
        return matchCat && matchSearch && inStock && notSold;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-4">لا توجد منتجات مطابقة</div>';
        grid.className = "block";
        return;
    } else {
        grid.className = "grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2";
    }

    grid.innerHTML = filtered.map(p => {
        const isSelected = window.pos_selectedProductInv && window.pos_selectedProductInv.name === p.name;
        let cost = parseFloat(p.costPrice) || 0;
        cost = Number.isInteger(cost) ? cost : parseFloat(cost.toFixed(2));

        return `
            <div data-prod-id="${escapeHTML(p.id || p.name)}" onclick="window.selectPOSProductByIdInv(this.dataset.prodId)" class="bg-white border rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition shadow-sm ${isSelected ? 'border-slate-900 ring-2 ring-slate-400' : 'border-slate-200 hover:border-slate-400 hover:shadow'}">
                <div class="mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded mb-1.5 inline-block">${escapeHTML(p.category || 'عام')}</span>
                    <h4 class="font-bold text-slate-800 text-xs leading-snug">${escapeHTML(p.name)}</h4>
                </div>
                <div class="mt-auto border-t border-slate-100 pt-1.5 flex justify-between items-center bg-slate-50 -mx-2.5 -mb-2.5 p-1.5 rounded-b-lg">
                    <div><p class="text-[9px] text-slate-500 font-bold">التكلفة</p><p class="font-bold text-slate-700 text-xs font-mono">${cost}</p></div>
                    <div class="text-left"><p class="text-[9px] text-slate-500 font-bold">المتاح</p><p class="font-bold text-emerald-700 text-xs px-1.5 py-0.5 bg-emerald-100/70 rounded font-mono">${p.quantity || 0}</p></div>
                </div>
            </div>
        `;
    }).join('');
};

window.selectPOSProductByIdQuick = function(id) {
    const liveProducts = (typeof products !== 'undefined') ? products : [];
    const p = liveProducts.find(prod => (prod.id && String(prod.id) === String(id)) || prod.name === id);
    if (p) window.selectPOSProductQuick(p);
};

window.selectPOSProductByIdInv = function(id) {
    const liveProducts = (typeof products !== 'undefined') ? products : [];
    const p = liveProducts.find(prod => (prod.id && String(prod.id) === String(id)) || prod.name === id);
    if (p) window.selectPOSProductInv(p);
};

window.selectPOSProductQuick = function(p) {
    window.pos_selectedProductQuick = p;
    document.getElementById('pos_selected_name_quick').innerText = p.name;
    const alertBox = document.getElementById('pos_selected_alert_quick');
    alertBox.classList.replace('bg-blue-50', 'bg-green-50');
    alertBox.classList.replace('border-blue-500', 'border-green-500');
    
    const oldInput = document.getElementById('sell-product-name');
    if (oldInput) {
        oldInput.value = p.name;
        oldInput.dispatchEvent(new Event('input', { bubbles: true }));
        oldInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    document.getElementById('sell-quantity').value = 1;
    document.getElementById('sell-quantity').dispatchEvent(new Event('input', { bubbles: true }));
    if(document.getElementById('sell-price')) {
        const defaultQuickPrice = p.sellPrice || (p.costPrice ? Math.round(p.costPrice * 1.25) : 0);
        document.getElementById('sell-price').value = defaultQuickPrice;
        document.getElementById('sell-price').dispatchEvent(new Event('input', { bubbles: true }));
    }
    window.renderPOSQuickGrid();
};

window.selectPOSProductInv = function(p) {
    window.pos_selectedProductInv = p;
    const nameEl = document.getElementById('pos_selected_name_inv');
    if (nameEl) nameEl.innerText = p.name;
    
    const oldInput = document.getElementById('inv_itemName');
    if (oldInput) {
        oldInput.value = p.name;
        oldInput.dispatchEvent(new Event('input', { bubbles: true }));
        oldInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    const qtyInput = document.getElementById('inv_itemQty');
    if (qtyInput) {
        qtyInput.value = 1;
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const priceInput = document.getElementById('inv_itemPrice');
    if (priceInput) {
        priceInput.value = '';
        priceInput.placeholder = 'أدخل سعر البيع...';
        priceInput.focus();
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    window.renderPOSInvGrid();
};

window.changePOSQtyQuick = function(delta) {
    const input = document.getElementById('sell-quantity');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    if (window.pos_selectedProductQuick && window.pos_selectedProductQuick.quantity && val > window.pos_selectedProductQuick.quantity) {
        val = window.pos_selectedProductQuick.quantity;
    }
    input.value = val;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    if (window.pos_selectedProductQuick && document.getElementById('sell-price')) {
        document.getElementById('sell-price').value = (window.pos_selectedProductQuick.sellPrice * val) || 0;
        document.getElementById('sell-price').dispatchEvent(new Event('input', { bubbles: true }));
    }
};

window.changePOSQtyInv = function(delta) {
    const input = document.getElementById('inv_itemQty');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    if (window.pos_selectedProductInv && window.pos_selectedProductInv.quantity && val > window.pos_selectedProductInv.quantity) {
        val = window.pos_selectedProductInv.quantity;
    }
    input.value = val;
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

const originalOpenQuickSellModal = window.openQuickSellModal;
window.openQuickSellModal = function() {
    if (originalOpenQuickSellModal) originalOpenQuickSellModal();
    window.pos_currentCategoryQuick = 'الكل';
    window.pos_selectedProductQuick = null;
    if(document.getElementById('pos_search_quick')) document.getElementById('pos_search_quick').value = '';
    if(document.getElementById('pos_selected_name_quick')) document.getElementById('pos_selected_name_quick').innerText = 'لم يتم التحديد بعد';
    const alertBox = document.getElementById('pos_selected_alert_quick');
    if (alertBox) alertBox.className = "bg-blue-50 border-r-4 border-blue-500 p-3 mb-4 rounded shadow-sm";
    window.renderPOSQuickGrid();
};

const invoiceModalEl = document.getElementById('invoiceModal');
if (invoiceModalEl) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            if (m.type === 'attributes' && m.attributeName === 'style') {
                if (invoiceModalEl.style.display === 'flex' || invoiceModalEl.style.display === 'block') {
                    window.pos_currentCategoryInv = 'الكل';
                    window.pos_selectedProductInv = null;
                    if(document.getElementById('pos_search_inv')) document.getElementById('pos_search_inv').value = '';
                    if(document.getElementById('pos_selected_name_inv')) document.getElementById('pos_selected_name_inv').innerText = 'لم يتم التحديد بعد';
                    const alertBox = document.getElementById('pos_selected_alert_inv');
                    if (alertBox) alertBox.className = "inv-selected-strip no-print";
                    window.renderPOSInvGrid();
                }
            }
        });
    });
    observer.observe(invoiceModalEl, { attributes: true });
}

function updateQuickSaleSerialUI() {
    // 1. التأكد من وجود العناصر
    if (!sellSerialContainer || !sellSerialsDatalist || !sellSerialInput) return;

    const productName = sellProductNameInput.value.trim();
    
    // تحديث عرض التكلفة
    const costDisplay = document.getElementById('quick-sell-cost-display');
    if (costDisplay && typeof products !== 'undefined') {
        const product = products.find(p => p.name === productName);
        if (product) {
            costDisplay.querySelector('span').textContent = typeof formatCurrency === 'function' ? formatCurrency(product.costPrice) : product.costPrice;
            costDisplay.classList.remove('hidden');
        } else {
            costDisplay.classList.add('hidden');
        }
    }

    // 2. إذا كان هناك اسم منتج، أظهر الحقل فوراً
    if (productName) {
        sellSerialContainer.classList.remove('hidden');
        
        // 3. محاولة مساعدة المستخدم باقتراح السيريالات الموجودة (اختياري)
        const availableSerials = serialNumbersLog.filter(log => 
            log.productName === productName && log.status === 'in_stock'
        );
        
        sellSerialsDatalist.innerHTML = availableSerials.map(s => `<option value="${escapeHTML(s.serial)}">`).join('');
    } else {
        // إخفاء الحقل فقط إذا كان اسم المنتج فارغاً
        sellSerialContainer.classList.add('hidden');
        sellSerialInput.value = '';
    }
}

window.closeConfirmSaleModal = function() {
    document.getElementById('confirmSaleModal').style.display = 'none';
};

window.closePostSaleModal = function() {
    document.getElementById('postSaleModal').style.display = 'none';
};

window.showConfirmSaleModal = function(profit, onConfirmCallback) {
    const modal = document.getElementById('confirmSaleModal');
    const profitEl = document.getElementById('confirmSaleProfitAmount');
    const confirmBtn = document.getElementById('confirmSaleBtn');
    
    profitEl.textContent = formatCurrency(profit);
    
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    
    newBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if(onConfirmCallback) onConfirmCallback();
    });
    
    modal.style.display = 'flex';
};

window.showPostSaleModal = function(type, isFromPending = false) {
    const modal = document.getElementById('postSaleModal');
    const newBtn = document.getElementById('postSaleNewBtn');
    const closeBtn = document.getElementById('postSaleCloseBtn');
    
    // --- تخصيص نافذة النجاح إذا كانت العملية تأكيد بيعة مؤقتة ---
    const titleEl = modal.querySelector('h2');
    const msgEl = modal.querySelector('p');
    if (isFromPending) {
        newBtn.style.display = 'none';
        closeBtn.innerText = 'إغلاق النافذة';
        if (titleEl) titleEl.innerText = 'تم تأكيد وتسجيل الفاتورة بنجاح!';
        if (msgEl) msgEl.style.display = 'none';
    } else {
        newBtn.style.display = 'block';
        closeBtn.innerText = 'إغلاق نافذة البيع';
        if (titleEl) titleEl.innerText = 'تمت العملية بنجاح!';
        if (msgEl) msgEl.style.display = 'block';
    }
    
    const newBtnClone = newBtn.cloneNode(true);
    newBtn.parentNode.replaceChild(newBtnClone, newBtn);
    
    const closeBtnClone = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(closeBtnClone, closeBtn);
    
    newBtnClone.addEventListener('click', () => {
        modal.style.display = 'none';
        if(type === 'quick') {
            resetSellForm();
        } else if(type === 'invoice') {
            resetInvoiceForm();
        }
    });
    
    closeBtnClone.addEventListener('click', () => {
        modal.style.display = 'none';
        // تنظيف البيانات القديمة دائماً عند الإغلاق لمنع ظهورها في البيعة التالية
        if(type === 'quick') {
            resetSellForm();
            if (typeof window.closeQuickSellModal === 'function') window.closeQuickSellModal();
        } else if(type === 'invoice') {
            resetInvoiceForm();
            if (typeof inv_closeModal === 'function') {
                inv_closeModal();
            } else {
                const invModal = document.getElementById('invoiceModal');
                if (invModal) invModal.style.display = 'none';
            }
        }
    });
    
    modal.style.display = 'flex';
};

function calculateQuickSellProfit() {
                     const mainProductName = sellProductNameInput ? sellProductNameInput.value.trim() : '';
                     const quantitySold = sellQuantityInput ? (parseInputNumber(sellQuantityInput) || 0) : 0;
                     const totalSellPrice = sellPriceInput ? (parseInputNumber(sellPriceInput) || 0) : 0;

                     const matches = products.filter(p => p.id === mainProductName || p.name.trim().toLowerCase() === mainProductName.trim().toLowerCase());
                     const mainProduct = matches.find(p => Number(p.quantity) >= quantitySold) || matches.find(p => Number(p.quantity) > 0) || matches[0];
                     const profitDisplay = document.getElementById('quick-sell-profit-display');
                     if (!profitDisplay) return;

                     if (!mainProduct || quantitySold <= 0) {
                         profitDisplay.textContent = formatCurrency(0);
                         return;
                     }

                     let costOfGoodsSold = (Number(mainProduct.costPrice) || 0) * quantitySold;

                     const additionalCheckboxes = additionalCostsContainer ? additionalCostsContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
                     additionalCheckboxes.forEach(checkbox => {
                         const parentLabel = checkbox.closest('label');
                         const quantityInput = parentLabel.querySelector('.additional-item-quantity');
                         const qtyToDeduct = parseInt(quantityInput?.value) || 0;
                         const additionalProductName = checkbox.value;
                         const additionalProduct = products.find(p => p.name === additionalProductName);
                         if (qtyToDeduct > 0 && additionalProduct) {
                             costOfGoodsSold += (Number(additionalProduct.costPrice) || 0) * qtyToDeduct;
                         }
                     });

                     let profit = totalSellPrice - costOfGoodsSold;
                     const dedToggle = document.getElementById('sell-deduction-toggle');
                     const dedAmount = document.getElementById('sell-deduction-amount');
                     if (dedToggle && dedToggle.checked && dedAmount) {
                         const amt = parseFloat(dedAmount.value) || 0;
                         if (amt > 0) profit -= amt; const hint = document.getElementById('sell-deduction-real-profit'); if (hint) { hint.textContent = formatCurrency(profit); hint.style.color = profit >= 0 ? '#15803d' : '#dc2626'; } }
                     profitDisplay.textContent = formatCurrency(profit);
                     if (profit >= 0) {
                         profitDisplay.style.color = '#166534';
                     } else {
                         profitDisplay.style.color = '#dc2626';
                     }
                 }

// --- Deductible Costs Live Search & Selected Chips Summary ---
function normalizeDeductibleSearchText(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ى]/g, 'ي').replace(/[ة]/g, 'ه').replace(/[\u064B-\u065F\u0670\u0640]/g, '').trim();
}

function inv_filterDeductibleCosts(query) {
    const dedContainer = document.getElementById('inv_deductibleCostsContainer');
    const clearBtn = document.getElementById('inv_deductible_search_clear');
    const raw = (query || '').trim();

    if (clearBtn) {
        if (raw.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (!dedContainer) return;
    const labels = dedContainer.querySelectorAll('label');
    let visibleCount = 0;

    const normQ = normalizeDeductibleSearchText(raw);
    const words = normQ.split(/\s+/).filter(Boolean);

    labels.forEach(lbl => {
        const text = lbl.textContent || '';
        const cb = lbl.querySelector('input[type="checkbox"]');
        const name = (cb && cb.dataset && cb.dataset.name) ? cb.dataset.name : (cb ? cb.value : '');
        const normTarget = normalizeDeductibleSearchText(text + ' ' + name);

        let matches = true;
        if (words.length > 0) {
            matches = words.every(w => {
                if (normTarget.includes(w)) return true;
                if (w.startsWith('ا') && normTarget.includes(w.slice(1))) return true;
                if (!w.startsWith('ا') && normTarget.includes('ا' + w)) return true;
                return false;
            });
        }

        if (matches) {
            lbl.classList.remove('inv-deductible-hidden');
            if (lbl.style && typeof lbl.style.removeProperty === 'function') lbl.style.removeProperty('display');
            else if (lbl.style) lbl.style.display = '';
            visibleCount++;
        } else {
            lbl.classList.add('inv-deductible-hidden');
            if (lbl.style && typeof lbl.style.setProperty === 'function') lbl.style.setProperty('display', 'none', 'important');
            else if (lbl.style) lbl.style.display = 'none';
        }
    });

    let noResultsEl = dedContainer.querySelector('#inv_deductible_no_results');
    if (labels.length > 0 && visibleCount === 0 && raw) {
        if (!noResultsEl) {
            noResultsEl = document.createElement('p');
            noResultsEl.id = 'inv_deductible_no_results';
            noResultsEl.className = 'text-center text-xs text-slate-400 py-3';
            dedContainer.appendChild(noResultsEl);
        }
        noResultsEl.textContent = `لا توجد ملحقات تطابق: "${raw}"`;
        noResultsEl.classList.remove('inv-deductible-hidden');
        if (noResultsEl.style && typeof noResultsEl.style.removeProperty === 'function') noResultsEl.style.removeProperty('display');
        else if (noResultsEl.style) noResultsEl.style.display = '';
    } else if (noResultsEl) {
        noResultsEl.classList.add('inv-deductible-hidden');
        if (noResultsEl.style && typeof noResultsEl.style.setProperty === 'function') noResultsEl.style.setProperty('display', 'none', 'important');
        else if (noResultsEl.style) noResultsEl.style.display = 'none';
    }
}

function inv_clearDeductibleSearch() {
    const searchInput = document.getElementById('inv_deductible_search');
    if (searchInput) { searchInput.value = ''; if (typeof searchInput.focus === 'function') searchInput.focus(); }
    inv_filterDeductibleCosts('');
}

function inv_updateDeductibleSelectedSummary() {
    const dedContainer = document.getElementById('inv_deductibleCostsContainer');
    const summaryBox = document.getElementById('inv_deductible_selected_summary');
    const chipsContainer = document.getElementById('inv_deductible_selected_chips');
    const countSpan = document.getElementById('inv_deductible_selected_count');
    const totalCostSpan = document.getElementById('inv_deductible_selected_total_cost');

    if (!summaryBox || !chipsContainer) return;

    const checkedBoxes = dedContainer ? dedContainer.querySelectorAll('input[type="checkbox"]:checked') : [];

    if (!checkedBoxes || checkedBoxes.length === 0) {
        summaryBox.classList.add('hidden');
        chipsContainer.innerHTML = '';
        if (countSpan) countSpan.textContent = '0';
        if (totalCostSpan) totalCostSpan.textContent = (typeof formatCurrency === 'function' ? formatCurrency(0) : '0.00 ج.م');
        return;
    }

    summaryBox.classList.remove('hidden');
    let totalCost = 0;
    const chips = [];

    checkedBoxes.forEach(cb => {
        const row = cb.closest('label');
        const qtyInput = row ? row.querySelector('.inv-deducted-item-quantity') : null;
        const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
        const unitCost = Number(cb.dataset.cost) || 0;
        const subtotal = unitCost * qty;
        totalCost += subtotal;
        const name = (cb.dataset && cb.dataset.name) ? cb.dataset.name : (cb.value || 'بند');
        const cbId = cb.id || '';
        const formattedSubtotal = typeof formatCurrency === 'function' ? formatCurrency(subtotal) : subtotal.toFixed(2) + ' ج.م';

        chips.push(`
            <span class="inv-deductible-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-300 text-slate-800 shadow-sm font-semibold transition hover:border-slate-400">
                <span class="text-indigo-600 font-bold">•</span>
                <span class="truncate max-w-[170px]" title="${escapeHTML(name)}">${escapeHTML(name)}</span>
                <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-mono font-normal">× ${qty}</span>
                <span class="text-[11px] text-emerald-700 font-mono font-bold">(${formattedSubtotal})</span>
                <button type="button" onclick="window.inv_uncheckDeductibleItem('${escapeHTML(cbId)}')" class="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded px-1 transition text-sm leading-none font-bold" title="إلغاء تحديد هذا البند">&times;</button>
            </span>
        `);
    });

    chipsContainer.innerHTML = chips.join('');
    if (countSpan) countSpan.textContent = String(checkedBoxes.length);
    if (totalCostSpan) totalCostSpan.textContent = typeof formatCurrency === 'function' ? formatCurrency(totalCost) : totalCost.toFixed(2) + ' ج.م';
}

function inv_uncheckDeductibleItem(checkboxId) {
    if (!checkboxId) return;
    const cb = document.getElementById(checkboxId);
    if (cb) {
        cb.checked = false;
        try { cb.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
    inv_updateDeductibleSelectedSummary();
}

function initDeductibleCostsUI() {
    const dedContainer = document.getElementById('inv_deductibleCostsContainer');
    if (!dedContainer) return;

    if (typeof dedContainer.getAttribute === 'function' && !dedContainer.getAttribute('data-listeners-attached')) {
        if (typeof dedContainer.setAttribute === 'function') dedContainer.setAttribute('data-listeners-attached', '1');
        if (typeof dedContainer.addEventListener === 'function') {
            dedContainer.addEventListener('change', () => inv_updateDeductibleSelectedSummary());
            dedContainer.addEventListener('input', () => inv_updateDeductibleSelectedSummary());
        }
    }

    if (typeof MutationObserver !== 'undefined' && typeof dedContainer.getAttribute === 'function' && !dedContainer.getAttribute('data-observer-attached')) {
        if (typeof dedContainer.setAttribute === 'function') dedContainer.setAttribute('data-observer-attached', '1');
        const observer = new MutationObserver(() => {
            const searchInput = document.getElementById('inv_deductible_search');
            if (searchInput && searchInput.value.trim()) inv_filterDeductibleCosts(searchInput.value);
            inv_updateDeductibleSelectedSummary();
        });
        observer.observe(dedContainer, { childList: true });
    }
}

window.normalizeDeductibleSearchText = normalizeDeductibleSearchText;
window.inv_filterDeductibleCosts = inv_filterDeductibleCosts;
window.inv_clearDeductibleSearch = inv_clearDeductibleSearch;
window.inv_updateDeductibleSelectedSummary = inv_updateDeductibleSelectedSummary;
window.inv_uncheckDeductibleItem = inv_uncheckDeductibleItem;
window.initDeductibleCostsUI = initDeductibleCostsUI;

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDeductibleCostsUI);
    else initDeductibleCostsUI();
}
