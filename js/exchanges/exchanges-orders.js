/**
 * js/exchanges/exchanges-orders.js
 * إدارة وتعديل وإلغاء وتأكيد طلبات الاستبدال المعلقة ومراحلها (Exchange Pending Orders & Stages)
 */

function revertInventoryEffect(o) {
    const liveProducts = getProducts();
    
    // دالة داخلية ذكية لإضافة الكمية للمخزن (وإنشاء المنتج المؤقت لو لم يكن موجوداً)
    const addBack = (name, cost, price) => { 
        if(!name) return; 
        const cleanName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
        
        if(p) {
            // لو المنتج موجود في المخزن، رجع الكمية
            p.quantity = (Number(p.quantity)||0) + 1; 
        } else {
            // لو المنتج "مؤقت"، أنشئه في المخزن فوراً عشان الكمية والتكلفة تضبط
            const newP = { 
                id: (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('TEMP') : ("TEMP_" + Date.now().toString(36))), 
                name: String(name).trim(), 
                category: "عام", 
                quantity: 1, 
                costPrice: Number(cost) || 0, 
                price: Number(price) || 0 
            };
            liveProducts.push(newP);
            if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP);
        }
    };

    // دالة داخلية لسحب الكمية من المخزن بأمان تام
    const takeOut = (name) => { 
        if(!name) return; 
        const cleanName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
        if(p) p.quantity = Math.max(0, (Number(p.quantity)||0) - 1); 
    };
    
    // إرجاع الجديد للمخزن (مع تمرير التكلفة والسعر لضمان حفظهم في حال كان المنتج مؤقتاً)
    if (!o.stages || o.stages.newItemShipped) {
        addBack(o.nMainName, o.nMainCost, o.nMainPrice);
        if (o.nAccs) o.nAccs.forEach(a => addBack(a.name, a.cost, a.price)); 
    }

    // سحب المرتجع من المخزن (لأنه سيعود للعميل)
    if (!o.stages || o.stages.oldItemReceived) {
        takeOut(o.rMainName);
        if (o.rAccs) o.rAccs.forEach(a => takeOut(a.name));
    }
}

function cleanupExchangeInvoice(o) {
    if (!o) return;
    const invId = o.sourceInvoiceId;
    const invNum = o.sourceInvoiceNum;

    let removedProfit = 0;

    function matchSale(s) {
        if (!s) return false;
        if (invId && String(s.id) === String(invId)) return true;
        if (invNum && (String(s.invoiceNumber) === String(invNum) || String(s.invoiceId) === String(invNum))) return true;
        if (s.type === 'exchange' && o.customerName && s.customerName === o.customerName) {
            if (o.diffAmount && (Number(s.sellPrice) === Number(o.diffAmount) || Number(s.total) === Number(o.diffAmount))) return true;
        }
        return false;
    }

    if (typeof window.salesToday !== 'undefined' && Array.isArray(window.salesToday)) {
        const idx = window.salesToday.findIndex(matchSale);
        if (idx > -1) {
            const s = window.salesToday[idx];
            removedProfit += Number(s.profit !== undefined ? s.profit : ((s.totalSellPrice || s.sellPrice || 0) - (s.totalCost || s.cost || 0))) || 0;
            window.salesToday.splice(idx, 1);
        }
    }

    if (typeof window.invoices !== 'undefined' && Array.isArray(window.invoices)) {
        const idx = window.invoices.findIndex(matchSale);
        if (idx > -1) window.invoices.splice(idx, 1);
    }

    if (typeof window.allSales !== 'undefined' && Array.isArray(window.allSales)) {
        const idx = window.allSales.findIndex(matchSale);
        if (idx > -1) window.allSales.splice(idx, 1);
    }

    if (removedProfit !== 0 && typeof window.totalProfit !== 'undefined') {
        const moneyFn = typeof window.money === 'function' ? window.money : (val) => Math.round(val * 100) / 100;
        window.totalProfit = moneyFn(window.totalProfit - removedProfit);
    }

    if (invId && window.db && window.currentUser) {
        const uid = window.currentUser.uid;
        try { window.deleteDoc(window.doc(window.db, "users", uid, "salesToday", invId)); } catch(e) {}
        try { window.deleteDoc(window.doc(window.db, "users", uid, "sales", invId)); } catch(e) {}
        try { window.deleteDoc(window.doc(window.db, "users", uid, "invoices", invId)); } catch(e) {}
    }
}
window.cleanupExchangeInvoice = cleanupExchangeInvoice;

function renderLocalPendingOrders() {
    const tbody = document.querySelector('#local-pending-table tbody');
    if(!tbody) return;

    if (!window.pendingOrders || window.pendingOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#a0aec0;">لا توجد فواتير معلقة حالياً.</td></tr>`;
        return;
    }
    tbody.innerHTML = window.pendingOrders.map(o => {
        const hasStages = !!o.stages;
        const shippingStr = (o.shippingCompany || o.trackingNumber) ? `${escapeHTML(o.shippingCompany||'-')} <br> ${escapeHTML(o.trackingNumber||'-')}` : '-';
        let stageCol = '-';
        let actionCol = '';

        if (hasStages) {
            const s1 = o.stages.newItemShipped ? '🟢' : '🔴';
            const s2 = o.stages.moneyCollected ? '🟢' : '🔴';
            const s3 = o.stages.oldItemReceived ? '🟢' : '🔴';
            stageCol = `<span title="شحن الجديد">${s1}</span> <span title="التحصيل">${s2}</span> <span title="استلام المرتجع">${s3}</span>`;
            actionCol = `<button class="btn-action" style="background:#4299e1;" data-order-id="${escapeHTML(o.id)}" onclick="openStagesModal(this.dataset.orderId)">⚙️ إدارة المراحل</button>
                         <button class="btn-action btn-edit" data-order-id="${escapeHTML(o.id)}" onclick="openExModalEdit(this.dataset.orderId)">✏️ تعديل</button>
                         <button class="btn-action btn-cancel" data-order-id="${escapeHTML(o.id)}" onclick="openExModalCancel(this.dataset.orderId)">❌ إلغاء</button>`;
        } else {
            actionCol = `<button class="btn-action btn-confirm" data-order-id="${escapeHTML(o.id)}" onclick="confirmPendingOrder(this.dataset.orderId)">✔️ تحصيل</button>
                         <button class="btn-action btn-edit" data-order-id="${escapeHTML(o.id)}" onclick="openExModalEdit(this.dataset.orderId)">✏️ تعديل</button>
                         <button class="btn-action btn-cancel" data-order-id="${escapeHTML(o.id)}" onclick="openExModalCancel(this.dataset.orderId)">❌ إلغاء</button>`;
        }

        return `
            <tr>
                <td style="font-weight:bold; color:#2b6cb0;">${escapeHTML(o.customerName || 'عميل استبدال')}</td>
                <td style="font-size:14px;">${escapeHTML(o.itemsDesc || '')}</td>
                <td style="font-size:12px; text-align:center;">${shippingStr}</td>
                <td style="font-weight:bold; color:${o.diffAmount > 0 ? '#48bb78' : (o.diffAmount < 0 ? '#e53e3e' : '#333')};" dir="ltr">
                    ${o.diffAmount > 0 ? '+'+o.diffAmount : o.diffAmount} ج.م
                </td>
                <td style="font-size:16px; letter-spacing:3px;">${stageCol}</td>
                <td>${actionCol}</td>
            </tr>
        `;
    }).join('');
}

window.openExModalEdit = function(id) {
    targetOrderId = id;
    const editM = document.getElementById('ex-modal-edit');
    if(editM) editM.style.display = 'flex';
};

window.openExModalCancel = function(id) {
    targetOrderId = id;
    const cancelM = document.getElementById('ex-modal-cancel');
    if(cancelM) cancelM.style.display = 'flex';
};

async function executeEditOrder() {
    if(!targetOrderId) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === targetOrderId);
    if(orderIndex === -1) return closeExModals();
    const o = window.pendingOrders[orderIndex];
    
    triggerUndoSave();
    revertInventoryEffect(o);

    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');
    
    if(document.getElementById('ex_customer_name')) document.getElementById('ex_customer_name').value = cleanName;
    if(document.getElementById('ex_customer_phone')) document.getElementById('ex_customer_phone').value = o.customerPhone || '';
    
    if(document.getElementById('r_main_name')) document.getElementById('r_main_name').value = o.rMainName || '';
    if(document.getElementById('r_main_cost')) document.getElementById('r_main_cost').value = o.rMainCost || 0;
    if(document.getElementById('r_main_price')) document.getElementById('r_main_price').value = o.rMainPrice || 0;
    
    if(document.getElementById('n_main_name')) document.getElementById('n_main_name').value = o.nMainName || '';
    if(document.getElementById('n_main_cost')) document.getElementById('n_main_cost').value = o.nMainCost || 0;
    if(document.getElementById('n_main_price')) document.getElementById('n_main_price').value = o.nMainPrice || 0;
    
    const rCont = document.getElementById('r_acc_container');
    const nCont = document.getElementById('n_acc_container');
    if(rCont) rCont.innerHTML = '';
    if(nCont) nCont.innerHTML = '';

    if(o.rAccs) o.rAccs.forEach(a => { 
        addAccRow('r'); 
        if(rCont && rCont.lastElementChild) {
            const row = rCont.lastElementChild;
            if(row.querySelector('.acc-name')) row.querySelector('.acc-name').value = a.name;
            if(row.querySelector('.acc-cost')) row.querySelector('.acc-cost').value = a.cost;
            if(row.querySelector('.acc-price')) row.querySelector('.acc-price').value = a.price;
            if(row.querySelector('.acc-cat')) row.querySelector('.acc-cat').value = a.cat;
        }
    });
    
    if(o.nAccs) o.nAccs.forEach(a => { 
        addAccRow('n'); 
        if(nCont && nCont.lastElementChild) {
            const row = nCont.lastElementChild;
            if(row.querySelector('.acc-name')) row.querySelector('.acc-name').value = a.name;
            if(row.querySelector('.acc-cost')) row.querySelector('.acc-cost').value = a.cost;
            if(row.querySelector('.acc-price')) row.querySelector('.acc-price').value = a.price;
        }
    });

    const delLaterRad = document.getElementById('del_later');
    if(delLaterRad) delLaterRad.checked = true;
    
    updateUIState(); 
    runCalc();
    
    // إلغاء أثر المبالغ أو الديون المحصلة سابقاً إن وجدت لمنع تكرارها عند إعادة الحفظ
    if (o.stages && o.stages.moneyCollected) {
        const diffAmount = Number(o.diffAmount) || 0;
        if (o.stages.moneyMethod === 'pay_now_debt') {
            window.debtors = window.debtors || [];
            const rawName = o.customerName || '';
            let debtor = window.debtors.find(d => 
                d.name === cleanName || 
                d.customerName === cleanName || 
                d.name === rawName || 
                d.customerName === rawName
            );
            if (debtor) {
                debtor.amount = (Number(debtor.amount) || 0) - diffAmount;
                addLogSafe({ timestamp: new Date().toISOString(), type: "إلغاء دين استبدال", details: `إلغاء دين الاستبدال للعميل [${cleanName}] لفتح الفاتورة للتعديل`, amount: -diffAmount });
            }
        } else {
            const liveAccounts = getAccounts();
            const acc = liveAccounts.find(a => a.id === o.accId);
            if (acc && diffAmount !== 0) {
                acc.balance = (Number(acc.balance) || 0) - diffAmount;
                addLogSafe({ timestamp: new Date().toISOString(), type: "استرداد مسودة", details: `إلغاء أثر فرق النقدية للعميل [${cleanName}] لفتح الفاتورة للتعديل`, amount: -diffAmount });
            }
        }
    }

    // تنظيف فاتورة المبيعات السابقة لمنع تكرار الفواتير عند الحفظ مجدداً
    cleanupExchangeInvoice(o);

    addLogSafe({ timestamp: new Date().toISOString(), type: "مسودة تعديل", details: `إلغاء حجز للعميل [${cleanName}] للتعديل`, amount: 0 });
    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
    closeExModals();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function executeCancelOrder() {
    if(!targetOrderId) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === targetOrderId);
    if(orderIndex === -1) return closeExModals();
    const o = window.pendingOrders[orderIndex];
    const accSelEl = document.getElementById('ex_acc_sel');
    const cancelTypeEl = document.querySelector('input[name="cancel_type"]:checked');
    if(!accSelEl || !cancelTypeEl) return;

    const accId = accSelEl.value;
    const cancelType = cancelTypeEl.value;
    
    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');
    
    triggerUndoSave();
    
    // حساب تكلفة الأجهزة الخارجة (سواء جهاز رئيسي أو إكسسوارات) لردها لرأس المال
    let totalCostOut = (Number(o.nMainCost) || 0);
    if (o.nAccs && Array.isArray(o.nAccs)) {
        o.nAccs.forEach(a => totalCostOut += (Number(a.cost) || 0));
    }

    if (cancelType === "revert_all") {
        // 1. إعادة المنتجات للمخزن (تأكد أن دالة revertInventoryEffect محدثة كما اتفقنا)
        revertInventoryEffect(o);
        
        // 2. رد التكلفة لرأس المال لأن العملية أُلغيت بالكامل والبضاعة عادت
        

        if (totalCostOut > 0) {
            window.liquidityLog = window.liquidityLog || [];
            if (typeof addLogSafe === 'function') addLogSafe({ timestamp: new Date().toISOString(), type: "إرجاع تكلفة", details: `إرجاع تكلفة بضاعة ملغاة للعميل [${cleanName}]`, amount: totalCostOut, action: "return_cost" });
        }
        addLogSafe({ timestamp: new Date().toISOString(), type: "إلغاء شامل", details: `إلغاء شحنة العميل [${cleanName}]`, amount: 0 });
        
    } else if (cancelType === "convert_return") {
        const liveProducts = getProducts();
        
        // دالة داخلية ذكية لإضافة الكمية للمخزن وإنشاء المنتج لو كان "مؤقت" وغير موجود
        const addBack = (name, cost, price) => { 
            if(!name) return; 
            const cleanName = String(name).trim().toLowerCase();
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
            
            if(p) {
                p.quantity = (Number(p.quantity)||0) + 1; 
            } else {
                // إنشاء المنتج المؤقت الذي لم يكن موجوداً في المخزن ليعود إليه بشكل صحيح
                const newP = { 
                    id: (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('TEMP') : ("TEMP_" + Date.now().toString(36))), 
                    name: String(name).trim(), 
                    category: "عام", 
                    quantity: 1, 
                    costPrice: Number(cost) || 0, 
                    price: Number(price) || 0 
                };
                liveProducts.push(newP);
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP);
            }
        };

        // 1. نرجع الأجهزة اللي كانت طالعة للعميل للمخزن (مع تمرير التكلفة والسعر)
        addBack(o.nMainName, o.nMainCost, o.nMainPrice); 
        if(o.nAccs) o.nAccs.forEach(a => addBack(a.name, a.cost, a.price));

        // 2. رد التكلفة لرأس المال (لأن الأجهزة الجديدة عادت للمحل)
        

        if (totalCostOut > 0) {
            window.liquidityLog = window.liquidityLog || [];
            if (typeof addLogSafe === 'function') {
                addLogSafe({ timestamp: new Date().toISOString(), type: "إرجاع تكلفة", details: `إرجاع تكلفة أجهزة مستبدلة للمخزن - العميل [${cleanName}]`, amount: totalCostOut, action: "return_cost" });
            }
        }

        // 3. سحب قيمة الأجهزة المرتجعة للعميل من حساب المحل (لأنه هياخد فلوسه ويمشي)
        let payoutAmount = Number(o.rMainPrice) || 0;
        if(o.rAccs) o.rAccs.forEach(a => payoutAmount += (Number(a.price) || 0));

        const liveAccounts = getAccounts();
        const acc = liveAccounts.find(a => a.id === accId);
        if(acc) acc.balance = (Number(acc.balance)||0) - payoutAmount;
        
        addLogSafe({ timestamp: new Date().toISOString(), type: "تحويل لاسترجاع", details: `العميل [${cleanName}] صرف مبلغ أجهزته المرتجعة`, amount: -payoutAmount });
    }
    
    // 🔥 FIX: Refund money/revert debt to customer if they had paid/recorded the difference previously
    if (o.stages && o.stages.moneyCollected) {
        const diffAmount = Number(o.diffAmount) || 0;
        if (o.stages.moneyMethod === 'pay_now_debt') {
            window.debtors = window.debtors || [];
            const rawName = o.customerName || '';
            let debtor = window.debtors.find(d => 
                d.name === cleanName || 
                d.customerName === cleanName || 
                d.name === rawName || 
                d.customerName === rawName
            );
            if (debtor) {
                debtor.amount = (Number(debtor.amount) || 0) - diffAmount;
                addLogSafe({ timestamp: new Date().toISOString(), type: "إلغاء دين استبدال", details: `إلغاء دين فرق الاستبدال للعميل [${cleanName}] بسبب إلغاء الطلب`, amount: -diffAmount });
            }
        } else {
            const liveAccounts = getAccounts();
            const acc = liveAccounts.find(a => a.id === accId);
            if (diffAmount > 0) { // Customer paid us, we must refund them
                if(acc) acc.balance = (Number(acc.balance)||0) - diffAmount;
                addLogSafe({ timestamp: new Date().toISOString(), type: "رد أموال", details: `رد الفارق للعميل [${cleanName}] بسبب إلغاء الطلب`, amount: -diffAmount });
            } else if (diffAmount < 0) { // We paid the customer, they must refund us
                if(acc) acc.balance = (Number(acc.balance)||0) - diffAmount; // diffAmount is negative, so this adds to balance
                addLogSafe({ timestamp: new Date().toISOString(), type: "استرداد أموال", details: `استرداد الفارق من العميل [${cleanName}] بسبب الإلغاء`, amount: Math.abs(diffAmount) });
            }
        }
    }

    // تنظيف فاتورة المبيعات المرتبطة بالطلب المعلق الملغى لمنع بقاء مبيعات أو أرباح شبحية
    cleanupExchangeInvoice(o);

    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
    closeExModals();
}

window.confirmPendingOrder = async function(id) {
    if(!confirm("تأكيد التسليم للعميل وتحصيل الفلوس بالخزنة؟")) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === id);
    if(orderIndex === -1) return;
    const o = window.pendingOrders[orderIndex];
    
    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');
    
    const accSelEl = document.getElementById('ex_acc_sel');
    if(!accSelEl) return;

    const accId = accSelEl.value;
    triggerUndoSave();
    const liveAccounts = getAccounts();
    const acc = liveAccounts.find(a => a.id === accId);
    
    // Add money ONLY IF the money hasn't been collected yet!
    if (!o.stages || !o.stages.moneyCollected) {
        if(acc) acc.balance = (Number(acc.balance)||0) + (Number(o.diffAmount)||0);
        addLogSafe({ timestamp: new Date().toISOString(), type: "إتمام تحصيل", details: `تحصيل مبلغ استبدال العميل [${cleanName}]`, amount: o.diffAmount });
    }
    
    // Process Inventory Now for uncompleted stages
    const liveProducts = getProducts();
    const processReturn = (name, cost, price) => {
        if(!name) return;
        const cName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cName);
        if(!p) {
            const newP = { id: "R-"+Date.now(), name: String(name).trim(), category: 'عام', quantity: 1, costPrice: Number(cost) || 0, price: Number(price) || 0 };
            if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
            else liveProducts.push(newP);
        } else {
            p.quantity = (Number(p.quantity) || 0) + 1;
            p.costPrice = Number(cost) || 0; 
        }
    };
    const processOut = (name, cost, price) => {
        if(!name) return;
        const cName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cName);
        if(p) {
            p.quantity = Math.max(0, (Number(p.quantity) || 0) - 1);
        } else {
            const newP = { id: "N-"+Date.now(), name: String(name).trim(), category: "عام", quantity: 0, costPrice: Number(cost) || 0, price: Number(price) || 0 };
            if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
            else liveProducts.push(newP);
        }
    };
    
    if (!o.stages || !o.stages.oldItemReceived) {
        processReturn(o.rMainName, o.rMainCost, o.rMainPrice);
        if(o.rAccs) o.rAccs.forEach(a => processReturn(a.name, a.cost, a.price));
    }
    
    if (!o.stages || !o.stages.newItemShipped) {
        processOut(o.nMainName, o.nMainCost, o.nMainPrice);
        if(o.nAccs) o.nAccs.forEach(a => processOut(a.name, a.cost, a.price));
    }

    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
};

window.openStagesModal = function(id) {
    const o = window.pendingOrders.find(x => x.id === id);
    if(!o || !o.stages) return alert("لا توجد مراحل لهذا الطلب");
    
    let modal = document.getElementById('ex-stages-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ex-stages-modal';
        modal.className = 'modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:none; justify-content:center; align-items:center;';
        document.body.appendChild(modal);
    }
    
    let html = `
    <div style="background:#fff; width:90%; max-width:500px; border-radius:8px; padding:20px; text-align:right;" dir="rtl">
        <h3 style="margin-top:0; color:#2b6cb0;">إدارة مراحل الطلب: ${escapeHTML(o.customerName || '')}</h3>
        
        <div style="margin-bottom:15px; padding:10px; border:1px solid #e2e8f0; border-radius:6px; background:${o.stages.newItemShipped ? '#f0fff4' : '#fff'}">
            <h4 style="margin:0 0 10px 0;">1. شحن البضاعة الجديدة ${o.stages.newItemShipped ? '✅' : '⏳'}</h4>
            <p style="margin:0 0 10px 0; font-size:14px; color:#4a5568;">المنتجات: ${escapeHTML(o.nMainName || '')} ${o.nAccs && o.nAccs.length ? '+ '+o.nAccs.length+' إضافات' : ''}</p>
            ${!o.stages.newItemShipped ? `<button data-id="${escapeHTML(id)}" onclick="confirmStage(this.dataset.id, 'newItemShipped')" style="background:#38a169; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">تأكيد خروج البضاعة</button>` : ''}
        </div>

        <div style="margin-bottom:15px; padding:10px; border:1px solid #e2e8f0; border-radius:6px; background:${o.stages.moneyCollected ? '#f0fff4' : '#fff'}">
            <h4 style="margin:0 0 10px 0;">2. تحصيل الفلوس (${o.diffAmount} ج.م) ${o.stages.moneyCollected ? '✅' : '⏳'}</h4>
            ${!o.stages.moneyCollected ? `
                <select id="stage_pay_method" style="margin-bottom:10px; width:100%; padding:5px;">
                    <option value="pay_now_safe">تسجيل في الخزنة (${escapeHTML(o.accId || '')})</option>
                    <option value="pay_now_debt">تسجيل كدين على العميل</option>
                </select>
                <button data-id="${escapeHTML(id)}" onclick="confirmStage(this.dataset.id, 'moneyCollected')" style="background:#38a169; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">تأكيد التحصيل</button>
            ` : ''}
        </div>

        <div style="margin-bottom:15px; padding:10px; border:1px solid #e2e8f0; border-radius:6px; background:${o.stages.oldItemReceived ? '#f0fff4' : '#fff'}">
            <h4 style="margin:0 0 10px 0;">3. استلام المرتجع ${o.stages.oldItemReceived ? '✅' : '⏳'}</h4>
            <p style="margin:0 0 10px 0; font-size:14px; color:#4a5568;">المنتجات: ${escapeHTML(o.rMainName || '')} ${o.rAccs && o.rAccs.length ? '+ '+o.rAccs.length+' إضافات' : ''}</p>
            ${!o.stages.oldItemReceived ? `<button data-id="${escapeHTML(id)}" onclick="confirmStage(this.dataset.id, 'oldItemReceived')" style="background:#38a169; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">تأكيد استلام المرتجع</button>` : ''}
        </div>

        <div style="text-align:left; margin-top:20px;">
            <button onclick="document.getElementById('ex-stages-modal').style.display='none'" style="background:#e53e3e; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">إغلاق</button>
        </div>
    </div>
    `;
    
    modal.innerHTML = html;
    modal.style.display = 'flex';
};

window.confirmStage = async function(id, stageName) {
    const o = window.pendingOrders.find(x => x.id === id);
    if(!o || !o.stages) return;

    if(stageName === 'newItemShipped') {
        const liveProducts = getProducts();
        const processOut = (name, cost, price) => {
            if(!name) return;
            const cleanName = String(name).trim().toLowerCase();
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName);
            if(p) {
                p.quantity = Math.max(0, (Number(p.quantity) || 0) - 1);
            } else {
                const newP = { id: "N-"+Date.now(), name: String(name).trim(), category: "عام", quantity: 0, costPrice: Number(cost) || 0, price: Number(price) || 0 };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
                else liveProducts.push(newP);
            }
        };
        processOut(o.nMainName, o.nMainCost, o.nMainPrice);
        if(o.nAccs) o.nAccs.forEach(a => processOut(a.name, a.cost, a.price));
        
        o.stages.newItemShipped = true;
        o.stages.newItemShippedDate = new Date().toISOString();
        addLogSafe({ timestamp: new Date().toISOString(), type: "شحن بضاعة", details: `تم شحن البضاعة للعميل [${o.customerName}]`, amount: 0 });
    }
    else if(stageName === 'moneyCollected') {
        const method = document.getElementById('stage_pay_method').value;
        if (method === 'pay_now_safe') {
            const liveAccounts = getAccounts();
            const acc = liveAccounts.find(a => a.id === o.accId);
            if (acc && o.diffAmount < 0 && (Number(acc.balance) || 0) + o.diffAmount < 0) {
                return alert(`رصيد الخزينة [${acc.name || acc.id}] غير كافٍ لصرف فرق الاستبدال للعميل!\nالرصيد المتوفر: ${acc.balance} ج.م | المطلوب: ${Math.abs(o.diffAmount)} ج.م`);
            }
            if(acc) acc.balance = (Number(acc.balance)||0) + o.diffAmount;
            addLogSafe({ timestamp: new Date().toISOString(), type: "تحصيل آجل لخزنة", details: `تحصيل فرق الاستبدال للعميل [${o.customerName}] في الخزنة`, amount: o.diffAmount });
        } else if (method === 'pay_now_debt') {
            window.debtors = window.debtors || [];
            const rawName = o.customerName || '';
            const cleanCustName = rawName.replace(' (عميل استبدال 🔄)', '').trim();
            let debtor = window.debtors.find(d => 
                d.name === cleanCustName || 
                d.customerName === cleanCustName || 
                d.name === rawName || 
                d.customerName === rawName
            );
            if (!debtor) {
                debtor = { id: "DEBT-"+Date.now(), name: cleanCustName, customerName: cleanCustName, phone: o.customerPhone, amount: 0, reason: "دين استبدال", createdAt: new Date().toISOString() };
                window.debtors.push(debtor);
            }
            debtor.amount = (Number(debtor.amount)||0) + o.diffAmount;
            addLogSafe({ timestamp: new Date().toISOString(), type: "دين استبدال", details: `تسجيل فرق الاستبدال كدين على [${cleanCustName}]`, amount: o.diffAmount });
        }
        
        o.stages.moneyCollected = true;
        o.stages.moneyCollectedDate = new Date().toISOString();
        o.stages.moneyMethod = method;
    }
    else if(stageName === 'oldItemReceived') {
        const liveProducts = getProducts();
        const processReturn = (name, cost, price) => {
            if(!name) return;
            const cleanName = String(name).trim().toLowerCase(); 
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName);
            if(!p) {
                const newP = { id: "R-"+Date.now(), name: String(name).trim(), category: "عام", quantity: 1, costPrice: Number(cost) || 0, price: Number(price) || 0 };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
                else liveProducts.push(newP);
            } else {
                p.quantity = (Number(p.quantity) || 0) + 1;
                p.costPrice = Number(cost) || 0; 
            }
        };
        processReturn(o.rMainName, o.rMainCost, o.rMainPrice);
        if(o.rAccs) o.rAccs.forEach(a => processReturn(a.name, a.cost, a.price));
        
        o.stages.oldItemReceived = true;
        o.stages.oldItemReceivedDate = new Date().toISOString();
        addLogSafe({ timestamp: new Date().toISOString(), type: "استلام مرتجع", details: `تم استلام البضاعة المرتجعة من العميل [${o.customerName}]`, amount: 0 });
    }

    if (o.stages.newItemShipped && o.stages.moneyCollected && o.stages.oldItemReceived) {
        const orderIndex = window.pendingOrders.findIndex(x => x.id === id);
        if(orderIndex !== -1) window.pendingOrders.splice(orderIndex, 1);
        document.getElementById('ex-stages-modal').style.display='none';
    } else {
        openStagesModal(id);
    }
    
    await finalizeSave();
};
