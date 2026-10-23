window.openPurchaseReturnModal = function(invoiceId) {
    const invoice = purchaseInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    currentPurchaseReturnInvoice = invoice;
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    
    document.getElementById('pr-invoice-num').textContent = invoice.invoiceNumber || invoiceId;
    document.getElementById('pr-supplier-name').textContent = supplier ? supplier.name : 'غير محدد';
    
    const tbody = document.getElementById('pr-items-body');
    tbody.innerHTML = '';
    
    let items = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        items = invoice.items;
    }
    
    items.forEach((item, index) => {
        const returnedQty = item.returnedQuantity || 0;
        const availableQty = item.quantity - returnedQty;
        const itemCost = Number(item.cost !== undefined ? item.cost : item.costPrice) || 0;
        
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50";
        tr.innerHTML = `
            <td class="p-2 text-right font-semibold">${escapeHTML(item.name)}</td>
            <td class="p-2 text-center">${item.quantity}</td>
            <td class="p-2 text-center text-gray-500">${returnedQty}</td>
            <td class="p-2 text-center">${formatCurrency(itemCost)}</td>
            <td class="p-2 text-center bg-red-50">
                <input type="number" class="w-16 p-1 border rounded text-center pr-return-qty-input" 
                    min="0" max="${availableQty}" value="0" data-index="${index}" data-price="${itemCost}">
            </td>
            <td class="p-2 text-center font-bold text-red-600 item-return-val">0</td>
        `;
        tbody.appendChild(tr);
    });
    
    updatePurchaseReturnTotals();
    
    // Add event listeners to inputs
    document.querySelectorAll('.pr-return-qty-input').forEach(input => {
        input.addEventListener('input', function() {
            let val = parseInt(this.value) || 0;
            const max = parseInt(this.getAttribute('max')) || 0;
            if (val < 0) { val = 0; this.value = 0; }
            if (val > max) { val = max; this.value = max; }
            
            const price = parseFloatSafe(this.getAttribute('data-price'));
            this.parentElement.nextElementSibling.textContent = formatCurrency(val * price);
            updatePurchaseReturnTotals();
        });
    });
    
    // Populate accounts
    const accountSelect = document.getElementById('pr-refund-account');
    if (accountSelect) {
        accountSelect.innerHTML = '';
        accounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = acc.name + " (" + formatCurrency(acc.balance) + ")";
            accountSelect.appendChild(opt);
        });
    }
    
    document.getElementById('purchaseReturnModal').classList.remove('hidden');
};

function updatePurchaseReturnTotals() {
    let totalReturnVal = 0;
    document.querySelectorAll('.pr-return-qty-input').forEach(input => {
        const val = parseInt(input.value) || 0;
        const price = parseFloatSafe(input.getAttribute('data-price'));
        totalReturnVal += (val * price);
    });
    
    document.getElementById('pr-total-return-val').textContent = formatCurrency(totalReturnVal);
    
    const invoice = currentPurchaseReturnInvoice;
    if (!invoice) return;
    
    const settlementInfo = document.getElementById('pr-settlement-info');
    const cashOptions = document.getElementById('pr-cash-options');
    const accSelection = document.getElementById('pr-account-selection');
    
    if (totalReturnVal <= 0) {
        settlementInfo.textContent = 'يرجى تحديد الكميات المرتجعة.';
        cashOptions.classList.add('hidden');
        accSelection.classList.add('hidden');
        return;
    }
    
    // Check if supplier has remaining balance
    const remainingBalance = parseFloatSafe(invoice.remainingBalance);
    if (remainingBalance > 0) {
        if (totalReturnVal <= remainingBalance) {
            settlementInfo.innerHTML = `<span class="text-green-700">سيتم خصم <b>${formatCurrency(totalReturnVal)}</b> من المتبقي للمورد في هذه الفاتورة. (لن يتم إرجاع نقود للخزنة).</span>`;
            cashOptions.classList.add('hidden');
            accSelection.classList.add('hidden');
        } else {
            const cashToRefund = totalReturnVal - remainingBalance;
            settlementInfo.innerHTML = `<span class="text-orange-700">سيتم إطفاء المتبقي للمورد (<b>${formatCurrency(remainingBalance)}</b>).<br>والمتبقي <b>${formatCurrency(cashToRefund)}</b> يجب تسويته:</span>`;
            cashOptions.classList.remove('hidden');
            checkCashOptions();
        }
    } else {
        settlementInfo.innerHTML = `<span class="text-blue-700">هذه الفاتورة مدفوعة بالكامل. يجب تسوية كامل المبلغ <b>${formatCurrency(totalReturnVal)}</b>:</span>`;
        cashOptions.classList.remove('hidden');
        checkCashOptions();
    }
}

function checkCashOptions() {
    const method = document.getElementById('pr-refund-method').value;
    const accSelection = document.getElementById('pr-account-selection');
    if (method === 'safe') {
        accSelection.classList.remove('hidden');
    } else {
        accSelection.classList.add('hidden');
    }
}

window.lookupCustomerInvoices = async function() {
    const custName = document.getElementById('ex_customer_name').value.trim();
    if(!custName) return alert('يرجى إدخال اسم العميل أولاً للبحث عن فواتيره');
    
    let results = [];
    const lowerName = custName.toLowerCase();
    
    if(window.salesToday) {
        results = results.concat(window.salesToday.filter(s => s.customerName && s.customerName.toLowerCase().includes(lowerName)));
    }
    if(window.invoices) {
        results = results.concat(window.invoices.filter(s => s.customerName && s.customerName.toLowerCase().includes(lowerName)));
    }
    
    // Search Firestore
    if(window.db && window.currentUser && window.currentUser.uid) {
        try {
            const q = window.query(
                window.collection(window.db, "users", window.currentUser.uid, "invoices"),
                window.where("customerName", ">=", custName),
                window.where("customerName", "<=", custName + "\uf8ff")
            );
            const querySnapshot = await window.getDocs(q);
            querySnapshot.forEach(doc => {
                results.push(doc.data());
            });
        } catch (e) {
            console.error("Firestore search error:", e);
        }
    }
    
    // إزالة المكرر
    const uniqueIds = new Set();
    results = results.filter(s => {
        if(uniqueIds.has(s.id)) return false;
        uniqueIds.add(s.id);
        return true;
    });

    let modal = document.getElementById('ex-invoice-lookup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ex-invoice-lookup-modal';
        modal.className = 'modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:none; justify-content:center; align-items:center;';
        document.body.appendChild(modal);
    }

    window._currentCustomerInvoices = results;
    window.selectInvoiceByIdForReturn = function(id) {
        const s = (window._currentCustomerInvoices || []).find(inv => String(inv.id) === String(id));
        if (s) selectInvoiceForReturn(s);
    };

    let tbody = results.length === 0 ? `<tr><td colspan="5" style="text-align:center;">لا توجد فواتير مطابقة</td></tr>` :
        results.map(s => `
            <tr>
                <td>${escapeHTML(s.invoiceNumber || s.id)}</td>
                <td>${escapeHTML(s.date || '')}</td>
                <td>${escapeHTML(s.productName || s.name)}</td>
                <td><button data-sale-id="${escapeHTML(s.id)}" onclick="window.selectInvoiceByIdForReturn(this.dataset.saleId)" style="background:#3182ce; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">اختيار</button></td>
            </tr>
        `).join('');

    let html = `
    <div style="background:#fff; width:90%; max-width:600px; max-height:80vh; overflow-y:auto; border-radius:8px; padding:20px; text-align:right;" dir="rtl">
        <h3 style="margin-top:0; color:#2b6cb0;">فواتير العميل: ${escapeHTML(custName)}</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <thead>
                <tr style="background:#edf2f7;">
                    <th style="padding:10px; border-bottom:2px solid #cbd5e0;">رقم الفاتورة</th>
                    <th style="padding:10px; border-bottom:2px solid #cbd5e0;">التاريخ</th>
                    <th style="padding:10px; border-bottom:2px solid #cbd5e0;">المنتج</th>
                    <th style="padding:10px; border-bottom:2px solid #cbd5e0;">إجراء</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
        <div style="text-align:left;">
            <button onclick="document.getElementById('ex-invoice-lookup-modal').style.display='none'" style="background:#e53e3e; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">إغلاق</button>
        </div>
    </div>
    `;
    modal.innerHTML = html;
    modal.style.display = 'flex';
};

window.selectInvoiceForReturn = function(invoice) {
    if(!invoice || !invoice.items || invoice.items.length === 0) {
        document.getElementById('r_main_name').value = invoice.productName || invoice.name || '';
        document.getElementById('r_main_cost').value = invoice.cost || invoice.costPrice || 0;
        document.getElementById('r_main_price').value = invoice.sellPrice || invoice.price || 0;
    } else {
        document.getElementById('r_main_name').value = invoice.items[0].productName || invoice.items[0].name || '';
        document.getElementById('r_main_cost').value = invoice.items[0].cost || invoice.items[0].costPrice || 0;
        document.getElementById('r_main_price').value = invoice.items[0].price || invoice.items[0].unitPrice || 0;
        
        const accCont = document.getElementById('r_acc_container');
        if(accCont) accCont.innerHTML = '';
        
        for(let i=1; i<invoice.items.length; i++) {
            if (typeof addAccRow === 'function') {
                addAccRow('r');
                const rows = accCont.querySelectorAll('.r-acc-row');
                const newRow = rows[rows.length - 1];
                if(newRow) {
                    const nInput = newRow.querySelector('.acc-name');
                    const cInput = newRow.querySelector('.acc-cost');
                    const pInput = newRow.querySelector('.acc-price');
                    if(nInput) nInput.value = invoice.items[i].productName || invoice.items[i].name || '';
                    if(cInput) cInput.value = invoice.items[i].cost || invoice.items[i].costPrice || 0;
                    if(pInput) pInput.value = invoice.items[i].price || invoice.items[i].unitPrice || 0;
                }
            }
        }
    }
    
    document.getElementById('ex-invoice-lookup-modal').style.display='none';
    if(typeof runCalc === 'function') runCalc();
};
