// finance-pos.js — POS Grid Logic
// extracted from finance.html

// --- POS Grid Logic ---
window.pos_currentCategoryQuick = 'الكل';
window.pos_currentCategoryInv = 'الكل';
window.pos_selectedProductQuick = null;
window.pos_selectedProductInv = null;

function pos_getCategories() {
    if (typeof categories !== 'undefined') return ['الكل', ...categories.map(c => typeof c === 'string' ? c : c.name)];
    if (typeof products !== 'undefined') {
        const cats = new Set(products.map(p => p.category).filter(c => c));
        return ['الكل', ...Array.from(cats)];
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

function pos_createCategoryButtons(containerId, currentCat, clickHandlerName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cats = pos_getCategories();
    container.innerHTML = cats.map(c => 
        `<button type="button" onclick="${clickHandlerName}('${c}')" class="px-4 py-2 border rounded-full text-xs font-bold whitespace-nowrap" style="${currentCat === c ? 'background-color: #2563eb !important; color: white !important; border-color: #2563eb !important;' : 'background-color: white !important; color: #374151 !important; border-color: #e5e7eb !important;'}">${c}</button>`
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
    pos_createCategoryButtons('pos_categories_quick', window.pos_currentCategoryQuick, 'window.filterPOSCategoryQuick');
    const grid = document.getElementById('pos_grid_quick');
    const searchInput = document.getElementById('pos_search_quick');
    if (!grid || typeof products === 'undefined') return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = products.filter(p => {
        const matchCat = window.pos_currentCategoryQuick === 'الكل' || p.category === window.pos_currentCategoryQuick;
        const matchSearch = p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query));
        const inStock = (Number(p.quantity) || 0) > 0;
        return matchCat && matchSearch && p.type !== 'service' && inStock;
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
            <div onclick='window.selectPOSProductQuick(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="bg-white border rounded-xl p-2 flex flex-col justify-between cursor-pointer transition ${isSelected ? 'border-blue-500 ring-2 ring-blue-300 shadow-md' : 'border-gray-200 hover:border-blue-300'}">
                <div class="mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded mb-1 inline-block">${p.category || 'عام'}</span>
                    <h4 class="font-bold text-gray-800 text-xs leading-snug">${p.name}</h4>
                </div>
                <div class="mt-auto border-t border-gray-100 pt-1 flex justify-between items-center bg-gray-50 -mx-2 -mb-2 p-1 rounded-b-lg">
                    <div><p class="text-[9px] text-gray-500 font-bold">التكلفة</p><p class="font-bold text-red-600 text-xs">${cost}</p></div>
                    <div class="text-left"><p class="text-[9px] text-gray-500 font-bold">المتاح</p><p class="font-bold text-green-700 text-xs px-1 bg-green-100 rounded">${p.quantity || 0}</p></div>
                </div>
            </div>
        `;
    }).join('');
};

window.renderPOSInvGrid = function() {
    pos_createCategoryButtons('pos_categories_inv', window.pos_currentCategoryInv, 'window.filterPOSCategoryInv');
    const grid = document.getElementById('pos_grid_inv');
    const searchInput = document.getElementById('pos_search_inv');
    if (!grid || typeof products === 'undefined') return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = products.filter(p => {
        const matchCat = window.pos_currentCategoryInv === 'الكل' || p.category === window.pos_currentCategoryInv;
        const matchSearch = p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query));
        const inStock = (Number(p.quantity) || 0) > 0;
        return matchCat && matchSearch && inStock;
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
            <div onclick='window.selectPOSProductInv(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="bg-white border rounded-xl p-2 flex flex-col justify-between cursor-pointer transition ${isSelected ? 'border-blue-500 ring-2 ring-blue-300 shadow-md' : 'border-gray-200 hover:border-blue-300'}">
                <div class="mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded mb-1 inline-block">${p.category || 'عام'}</span>
                    <h4 class="font-bold text-gray-800 text-xs leading-snug">${p.name}</h4>
                </div>
                <div class="mt-auto border-t border-gray-100 pt-1 flex justify-between items-center bg-gray-50 -mx-2 -mb-2 p-1 rounded-b-lg">
                    <div><p class="text-[9px] text-gray-500 font-bold">التكلفة</p><p class="font-bold text-red-600 text-xs">${cost}</p></div>
                    <div class="text-left"><p class="text-[9px] text-gray-500 font-bold">المتاح</p><p class="font-bold text-green-700 text-xs px-1 bg-green-100 rounded">${p.quantity || 0}</p></div>
                </div>
            </div>
        `;
    }).join('');
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
        document.getElementById('sell-price').value = p.sellPrice || 0;
        document.getElementById('sell-price').dispatchEvent(new Event('input', { bubbles: true }));
    }
    window.renderPOSQuickGrid();
};

window.selectPOSProductInv = function(p) {
    window.pos_selectedProductInv = p;
    document.getElementById('pos_selected_name_inv').innerText = p.name;
    const alertBox = document.getElementById('pos_selected_alert_inv');
    alertBox.classList.replace('bg-blue-50', 'bg-green-50');
    alertBox.classList.replace('border-blue-500', 'border-green-500');
    
    const oldInput = document.getElementById('inv_itemName');
    if (oldInput) {
        oldInput.value = p.name;
        oldInput.dispatchEvent(new Event('input', { bubbles: true }));
        oldInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    document.getElementById('inv_itemQty').value = 1;
    document.getElementById('inv_itemQty').dispatchEvent(new Event('input', { bubbles: true }));
    if(document.getElementById('inv_itemPrice')) {
        document.getElementById('inv_itemPrice').value = p.sellPrice || 0;
        document.getElementById('inv_itemPrice').dispatchEvent(new Event('input', { bubbles: true }));
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
                    if (alertBox) alertBox.className = "bg-blue-50 border-r-4 border-blue-500 p-3 mb-4 rounded shadow-sm w-full";
                    window.renderPOSInvGrid();
                }
            }
        });
    });
    observer.observe(invoiceModalEl, { attributes: true });
}