/**
 * js/exchanges/exchanges-orders.js
 * إدارة وتعديل وإلغاء وتأكيد طلبات الاستبدال المعلقة ومراحلها (Exchange Pending Orders & Stages)
 */

function revertInventoryEffect(o) {
    const liveProducts = getProducts();
    
    // دالة داخلية ذكية لإضافة الكمية للمخزن بمتوسط تكلفة مرجح (وبدون تكرار الإضافة للمصفوفة)
    const addBack = (name, cost, price) => { 
        if(!name) return; 
        const cleanName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
        const retCost = Number(cost) || 0;
        if(p) {
            const oldQty = Number(p.quantity) || 0;
            const oldCost = Number(p.costPrice) || 0;
            const newQty = oldQty + 1;
            if (Number.isFinite(retCost) && retCost >= 0) {
                p.costPrice = Math.round((((oldQty * oldCost) + retCost) / newQty) * 1e6) / 1e6;
            }
            p.quantity = newQty;
        } else {
            const newP = { 
                id: (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('TEMP') : ("TEMP_" + Date.now().toString(36))), 
                name: String(name).trim(), 
                category: "عام", 
                quantity: 1, 
                costPrice: Math.round(retCost * 1e6) / 1e6, 
                price: Number(price) || 0 
            };
            if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP);
            else liveProducts.push(newP);
        }
    };

    // دالة داخلية لسحب الكمية من المخزن بأمان تام مع عكس متوسط التكلفة المرجح لمنع أي انحراف في رأس المال
    const takeOut = (name, retCost) => { 
        if(!name) return; 
        const cleanName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName && (Number(x.quantity) || 0) > 0)
            || liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName); 
        if(p) {
            const oldQty = Number(p.quantity) || 0;
            const oldCost = Number(p.costPrice) || 0;
            const remQty = Math.max(0, oldQty - 1);
            const c = Number(retCost) || 0;
            if (remQty > 0 && Number.isFinite(c) && c >= 0) {
                const remVal = (oldQty * oldCost) - c;
                if (remVal >= 0) {
                    p.costPrice = Math.round((remVal / remQty) * 1e6) / 1e6;
                }
            }
            p.quantity = remQty;
        }
    };
    
    // إرجاع الجديد للمخزن (مع تمرير التكلفة والسعر لضمان حفظهم في حال كان المنتج مؤقتاً)
    if (!o.stages || o.stages.newItemShipped) {
        addBack(o.nMainName, o.nMainCost, o.nMainPrice);
        if (o.nAccs) o.nAccs.forEach(a => addBack(a.name, a.cost, a.price)); 
    }

    // سحب المرتجع من المخزن (لأنه سيعود للعميل) مع عكس متوسط تكلفته
    if (!o.stages || o.stages.oldItemReceived) {
        takeOut(o.rMainName, o.rMainCost);
        if (o.rAccs) o.rAccs.forEach(a => takeOut(a.name, a.cost));
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

    // لا نخصم الربح إلا إذا كان قد أُضيف مسبقاً فعلاً (باستخدام else if لمنع الخصم المزدوج لأن var totalProfit === window.totalProfit)
    if (removedProfit !== 0 && o.profitRecorded !== false) {
        const moneyFn = typeof window.money === 'function' ? window.money : (val) => Math.round(val * 100) / 100;
        if (typeof totalProfit !== 'undefined') totalProfit = moneyFn((Number(totalProfit) || 0) - removedProfit);
        else if (typeof window.totalProfit !== 'undefined') window.totalProfit = moneyFn((Number(window.totalProfit) || 0) - removedProfit);
    }

    if (invId && window.db && window.currentUser) {
        const uid = window.currentUser.uid;
        try { const _r = window.deleteDoc(window.doc(window.db, "users", uid, "salesToday", invId)); if (_r && _r.catch) _r.catch(e => console.warn('[exchanges-orders.js] تعذر حذف salesToday/' + invId, e)); } catch (e) { console.warn('[exchanges-orders.js] تعذر حذف salesToday/' + invId, e); }
        try { const _r = window.deleteDoc(window.doc(window.db, "users", uid, "sales", invId)); if (_r && _r.catch) _r.catch(e => console.warn('[exchanges-orders.js] تعذر حذف sales/' + invId, e)); } catch (e) { console.warn('[exchanges-orders.js] تعذر حذف sales/' + invId, e); }
        try { const _r = window.deleteDoc(window.doc(window.db, "users", uid, "invoices", invId)); if (_r && _r.catch) _r.catch(e => console.warn('[exchanges-orders.js] تعذر حذف invoices/' + invId, e)); } catch (e) { console.warn('[exchanges-orders.js] تعذر حذف invoices/' + invId, e); }
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
            actionCol = `<div style="display:flex; flex-wrap:wrap; gap:4px;"><button class="btn-action" style="background:#4299e1;" data-order-id="${escapeHTML(o.id)}" onclick="openStagesModal(this.dataset.orderId)">⚙️ إدارة المراحل</button>
                         <button class="btn-action btn-edit" data-order-id="${escapeHTML(o.id)}" onclick="openExModalEdit(this.dataset.orderId)">✏️ تعديل</button>
                         <button class="btn-action btn-cancel" data-order-id="${escapeHTML(o.id)}" onclick="openExModalCancel(this.dataset.orderId)">❌ إلغاء</button></div>`;
        } else {
            actionCol = `<div style="display:flex; flex-wrap:wrap; gap:4px;"><button class="btn-action btn-confirm" data-order-id="${escapeHTML(o.id)}" onclick="confirmPendingOrder(this.dataset.orderId)">✔️ تحصيل</button>
                         <button class="btn-action btn-edit" data-order-id="${escapeHTML(o.id)}" onclick="openExModalEdit(this.dataset.orderId)">✏️ تعديل</button>
                         <button class="btn-action btn-cancel" data-order-id="${escapeHTML(o.id)}" onclick="openExModalCancel(this.dataset.orderId)">❌ إلغاء</button></div>`;
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
    const m = (typeof window.money === 'function') ? window.money : Number;

    // فحص مسبق للخزينة قبل التعديل في حال الحاجة لخصم نقدية محصلة سابقاً
    if (o.stages && o.stages.moneyCollected && o.stages.moneyMethod !== 'pay_now_debt') {
        const preDiff = m(Number(o.diffAmount) || 0);
        if (preDiff > 0.001) {
            const liveAccsPre = getAccounts();
            const accPre = liveAccsPre.find(a => a.id === o.accId);
            if (!accPre) return alert("تعذر العثور على الحساب المالي الأصلي لعكس الدفعة النقدية قبل التعديل.");
            if (preDiff > (Number(accPre.balance) || 0) + 0.001) {
                return alert(`رصيد حساب "${accPre.name}" (${accPre.balance}) غير كافٍ لعكس المبلغ المحصّل (${preDiff}) لفتح الطلب للتعديل.`);
            }
        }
    }
    
    triggerUndoSave();
    const _editTx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction('تعديل طلب استبدال') : null;
    try {
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
        
        // إلغاء أثر المبالغ أو الديون/الالتزامات المحصلة سابقاً بدقة لمنع تكرارها عند إعادة الحفظ
        if (o.stages && o.stages.moneyCollected) {
            const diffAmount = m(Number(o.diffAmount) || 0);
            if (o.stages.moneyMethod === 'pay_now_debt') {
                if (diffAmount < 0 && typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                    const lIdx = liabilities.findIndex(l => (o.linkedLiabilityId && l.id === o.linkedLiabilityId) || (l.orderId === o.id));
                    if (lIdx !== -1) {
                        liabilities[lIdx].amount = m(Math.max(0, (Number(liabilities[lIdx].amount) || 0) - Math.abs(diffAmount)));
                        if (liabilities[lIdx].amount <= 0.001) liabilities.splice(lIdx, 1);
                    }
                    addLogSafe({ timestamp: new Date().toISOString(), type: "إلغاء التزام استبدال", details: `إلغاء التزام الاستبدال للعميل [${cleanName}] لفتح الفاتورة للتعديل`, amount: Math.abs(diffAmount) });
                } else if (diffAmount > 0) {
                    window.debtors = window.debtors || [];
                    const rawName = o.customerName || '';
                    let dIdx = window.debtors.findIndex(d => (o.linkedDebtId && d.id === o.linkedDebtId) || d.orderId === o.id || d.name === cleanName || d.customerName === cleanName || d.name === rawName || d.customerName === rawName);
                    if (dIdx !== -1) {
                        window.debtors[dIdx].amount = m(Math.max(0, (Number(window.debtors[dIdx].amount) || 0) - diffAmount));
                        if (window.debtors[dIdx].amount <= 0.001) window.debtors.splice(dIdx, 1);
                        addLogSafe({ timestamp: new Date().toISOString(), type: "إلغاء دين استبدال", details: `إلغاء دين الاستبدال للعميل [${cleanName}] لفتح الفاتورة للتعديل`, amount: -diffAmount });
                    }
                }
            } else if (Math.abs(diffAmount) > 0.001) {
                const liveAccounts = getAccounts();
                const acc = liveAccounts.find(a => a.id === o.accId);
                if (acc) {
                    acc.balance = m((Number(acc.balance) || 0) - diffAmount);
                    const totalLiq = m(liveAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0));
                    if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                        liquidityLog.push({ id: generateId("liq-ex-edit"), timestamp: new Date().toISOString(), type: diffAmount > 0 ? "remove" : "add", amount: Math.abs(diffAmount), description: `عكس فرق نقدية استبدال للتعديل - العميل [${cleanName}]`, currentBalance: totalLiq, accountId: acc.id });
                    }
                    addLogSafe({ timestamp: new Date().toISOString(), type: "استرداد مسودة", details: `إلغاء أثر فرق النقدية للعميل [${cleanName}] لفتح الفاتورة للتعديل`, amount: -diffAmount });
                }
            }
        }

        // تنظيف فاتورة المبيعات السابقة لمنع تكرار الفواتير عند الحفظ مجدداً
        cleanupExchangeInvoice(o);

        addLogSafe({ timestamp: new Date().toISOString(), type: "مسودة تعديل", details: `إلغاء حجز للعميل [${cleanName}] للتعديل`, amount: 0 });
        window.pendingOrders.splice(orderIndex, 1);
        await finalizeSave();
        if (_editTx) _editTx.commit();
        closeExModals();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        if (_editTx) await _editTx.rollback();
        throw e;
    }
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
    const m = (typeof window.money === 'function') ? window.money : Number;
    
    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');

    // التحقق المسبق من كافة أرصدة الحسابات (بما في ذلك مجموع صرف المرتجع + رد الفارق على نفس الحساب) قبل أي تعديل
    const liveAccountsPre = getAccounts();
    const payoutAccPre = liveAccountsPre.find(a => a.id === accId) || liveAccountsPre.find(a => a.id === o.accId);
    const refundAccPre = liveAccountsPre.find(a => a.id === o.accId) || liveAccountsPre.find(a => a.id === accId);
    const payoutNeeded = (cancelType === "convert_return")
        ? m((Number(o.rMainPrice) || 0) + ((o.rAccs || []).reduce((s, a) => s + (Number(a.price) || 0), 0)))
        : 0;
    const diffRefundNeeded = (o.stages && o.stages.moneyCollected && o.stages.moneyMethod !== 'pay_now_debt' && (Number(o.diffAmount) || 0) > 0)
        ? m(Number(o.diffAmount) || 0)
        : 0;

    if (payoutNeeded > 0.001 && !payoutAccPre) {
        return alert("يرجى اختيار حساب خزينة صالح لصرف قيمة المرتجع.");
    }
    if (diffRefundNeeded > 0.001 && !refundAccPre) {
        return alert("يرجى اختيار حساب خزينة صالح لرد فرق الاستبدال.");
    }
    if (payoutAccPre && refundAccPre && payoutAccPre.id === refundAccPre.id) {
        const combinedOut = m(payoutNeeded + diffRefundNeeded);
        if (combinedOut > (Number(payoutAccPre.balance) || 0) + 0.001) {
            return alert(`رصيد حساب "${payoutAccPre.name}" (${payoutAccPre.balance}) غير كافٍ لصرف الإجمالي المطلوب (${combinedOut}).`);
        }
    } else {
        if (payoutNeeded > 0.001 && payoutAccPre && payoutNeeded > (Number(payoutAccPre.balance) || 0) + 0.001) {
            return alert(`رصيد حساب "${payoutAccPre.name}" (${payoutAccPre.balance}) غير كافٍ لصرف قيمة المرتجع (${payoutNeeded}).`);
        }
        if (diffRefundNeeded > 0.001 && refundAccPre && diffRefundNeeded > (Number(refundAccPre.balance) || 0) + 0.001) {
            return alert(`رصيد حساب "${refundAccPre.name}" (${refundAccPre.balance}) غير كافٍ لرد فرق الاستبدال (${diffRefundNeeded}).`);
        }
    }
    
    triggerUndoSave();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
    
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
        const m = (typeof window.money === 'function') ? window.money : Number;
        const liveProducts = getProducts();
        const liveAccounts = getAccounts();
        const payoutAcc = liveAccounts.find(a => a.id === accId) || liveAccounts.find(a => a.id === o.accId);
        let payoutAmount = m((Number(o.rMainPrice) || 0) + ((o.rAccs || []).reduce((s, a) => s + (Number(a.price) || 0), 0)));
        if (payoutAmount > 0 && payoutAcc && payoutAmount > (Number(payoutAcc.balance) || 0) + 0.001) {
            if (_tx) await _tx.rollback();
            return alert(`رصيد حساب "${payoutAcc.name}" (${payoutAcc.balance}) غير كافٍ لصرف قيمة المرتجع (${payoutAmount}) للعميل.`);
        }

        const addBack = (name, cost, price, cat) => { 
            if(!name) return; 
            const cName = String(name).trim().toLowerCase();
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cName); 
            const retCost = Number(cost) || 0;
            if(p) {
                const oldQty = Number(p.quantity) || 0;
                const oldCost = Number(p.costPrice) || 0;
                const newQty = oldQty + 1;
                if (Number.isFinite(retCost) && retCost >= 0) p.costPrice = Math.round((((oldQty * oldCost) + retCost) / newQty) * 1e6) / 1e6;
                p.quantity = newQty;
            } else {
                const newP = { 
                    id: (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('TEMP') : ("TEMP_" + Date.now().toString(36))), 
                    name: String(name).trim(), 
                    category: cat || "عام", 
                    quantity: 1, 
                    costPrice: Math.round(retCost * 1e6) / 1e6, 
                    price: Number(price) || 0 
                };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP);
                else liveProducts.push(newP);
            }
        };

        // 1. نرجع الأجهزة الجديدة للمخزن فقط إذا كانت قد شُحنت بالفعل (لمنع تضخيم المخزون)
        if (!o.stages || o.stages.newItemShipped) {
            addBack(o.nMainName, o.nMainCost, o.nMainPrice, "عام"); 
            if(o.nAccs) o.nAccs.forEach(a => addBack(a.name, a.cost, a.price, "عام"));
        }

        // 2. إذا لم يكن الجهاز المرتجع قد استُلم للمخزون بعد، ندخله للمخزون الآن مقابل المبلغ المدفوع للعميل
        if (o.stages && !o.stages.oldItemReceived) {
            addBack(o.rMainName, o.rMainCost, o.rMainPrice, o.rMainCat || "مرتجع");
            if(o.rAccs) o.rAccs.forEach(a => addBack(a.name, a.cost, a.price, a.cat || "مرتجع"));
        }

        // 3. سحب قيمة الأجهزة المرتجعة للعميل من حساب المحل مع التسجيل في liquidityLog وموازنة فرق التكلفة في totalProfit
        if (payoutAmount > 0.001 && !payoutAcc) {
            if (_tx) await _tx.rollback();
            return alert("يرجى اختيار حساب الخزينة لصرف قيمة المرتجع للعميل.");
        }
        if (payoutAcc && payoutAmount > 0.001) {
            payoutAcc.balance = m((Number(payoutAcc.balance) || 0) - payoutAmount);
            const totalLiq = m(liveAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0));
            if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                liquidityLog.push({ id: generateId("liq-ex-ret"), timestamp: new Date().toISOString(), type: "remove", amount: payoutAmount, description: `تحويل استبدال إلى مرتجع نقدي للعميل [${cleanName}]`, currentBalance: totalLiq, accountId: payoutAcc.id });
            }
        }
        const rTotalCost = m((Number(o.rMainCost) || 0) + ((o.rAccs || []).reduce((s, a) => s + (Number(a.cost) || 0), 0)));
        const retProfitVariance = m(payoutAmount - rTotalCost);
        if (Math.abs(retProfitVariance) > 0.001 && typeof totalProfit !== 'undefined') {
            totalProfit = m((Number(totalProfit) || 0) - retProfitVariance);
        }
        
        addLogSafe({ timestamp: new Date().toISOString(), type: "تحويل لاسترجاع", details: `العميل [${cleanName}] صرف مبلغ أجهزته المرتجعة`, amount: -payoutAmount });
    }
    
    // عكس المبلغ أو الدين/الالتزام المحصل مسبقاً في مرحلة التحصيل باستخدام الحساب الأصلي (o.accId) أولاً
    if (o.stages && o.stages.moneyCollected) {
        const m = (typeof window.money === 'function') ? window.money : Number;
        const diffAmount = m(Number(o.diffAmount) || 0);
        if (o.stages.moneyMethod === 'pay_now_debt') {
            if (diffAmount < 0 && typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                const lIdx = liabilities.findIndex(l => (o.linkedLiabilityId && l.id === o.linkedLiabilityId) || (l.orderId === o.id));
                if (lIdx !== -1) {
                    liabilities[lIdx].amount = m(Math.max(0, (Number(liabilities[lIdx].amount) || 0) - Math.abs(diffAmount)));
                    if (liabilities[lIdx].amount <= 0.001) liabilities.splice(lIdx, 1);
                }
                addLogSafe({ timestamp: new Date().toISOString(), type: "إلغاء التزام استبدال", details: `إلغاء التزام فرق الاستبدال للعميل [${cleanName}] بسبب إلغاء الطلب`, amount: Math.abs(diffAmount) });
            } else if (diffAmount > 0) {
                window.debtors = window.debtors || [];
                const rawName = o.customerName || '';
                let dIdx = window.debtors.findIndex(d => (o.linkedDebtId && d.id === o.linkedDebtId) || d.orderId === o.id || d.name === cleanName || d.customerName === cleanName || d.name === rawName || d.customerName === rawName);
                if (dIdx !== -1) {
                    window.debtors[dIdx].amount = m(Math.max(0, (Number(window.debtors[dIdx].amount) || 0) - diffAmount));
                    if (window.debtors[dIdx].amount <= 0.001) window.debtors.splice(dIdx, 1);
                    addLogSafe({ timestamp: new Date().toISOString(), type: "إلغاء دين استبدال", details: `إلغاء دين فرق الاستبدال للعميل [${cleanName}] بسبب إلغاء الطلب`, amount: -diffAmount });
                }
            }
        } else if (Math.abs(diffAmount) > 0.001) {
            const liveAccounts = getAccounts();
            const refundAcc = liveAccounts.find(a => a.id === o.accId) || liveAccounts.find(a => a.id === accId);
            if (refundAcc) {
                if (diffAmount > 0 && diffAmount > (Number(refundAcc.balance) || 0) + 0.001) {
                    if (_tx) await _tx.rollback();
                    return alert(`رصيد حساب "${refundAcc.name}" (${refundAcc.balance}) غير كافٍ لرد فرق الاستبدال (${diffAmount}) للعميل.`);
                }
                refundAcc.balance = m((Number(refundAcc.balance) || 0) - diffAmount);
                const totalLiq = m(liveAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0));
                if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                    liquidityLog.push({ id: generateId("liq-ex-cancel"), timestamp: new Date().toISOString(), type: diffAmount > 0 ? "remove" : "add", amount: Math.abs(diffAmount), description: diffAmount > 0 ? `رد فرق استبدال ملغى للعميل [${cleanName}]` : `استرداد فرق استبدال ملغى من العميل [${cleanName}]`, currentBalance: totalLiq, accountId: refundAcc.id });
                }
            }
            addLogSafe({ timestamp: new Date().toISOString(), type: diffAmount > 0 ? "رد أموال" : "استرداد أموال", details: `تسوية فرق النقدية للعميل [${cleanName}] بسبب إلغاء الطلب`, amount: -diffAmount });
        }
    }

    // تنظيف فاتورة المبيعات المرتبطة بالطلب المعلق الملغى لمنع بقاء مبيعات أو أرباح شبحية
    cleanupExchangeInvoice(o);

    window.pendingOrders.splice(orderIndex, 1);
    if (_tx) _tx.commit();
    await finalizeSave();
    closeExModals();
    } catch (cancelErr) {
        if (_tx) await _tx.rollback();
        console.error("فشل إلغاء طلب الاستبدال (تم التراجع):", cancelErr);
        alert("حدث خطأ أثناء إلغاء الطلب وتم التراجع عن التعديلات: " + (cancelErr.message || ''));
    }
}

function finalizeCompletedExchangeOrder(o) {
    const m = (typeof window.money === 'function') ? window.money : (v => Math.round((Number(v) || 0) * 100) / 100);
    let nCost = Number(o.nMainCost) || 0;
    let nPrice = Number(o.nMainPrice) || 0;
    if (Array.isArray(o.nAccs)) o.nAccs.forEach(a => { nCost += (Number(a.cost) || 0); nPrice += (Number(a.price) || 0); });
    let rCost = Number(o.rMainCost) || 0;
    let rPrice = Number(o.rMainPrice) || 0;
    if (Array.isArray(o.rAccs)) o.rAccs.forEach(a => { rCost += (Number(a.cost) || 0); rPrice += (Number(a.price) || 0); });
    const netExchangeProfit = m((Number(o.diffAmount) || 0) - nCost + rCost);

    if (!o.profitRecorded) {
        if (typeof totalProfit !== 'undefined') totalProfit = m((Number(totalProfit) || 0) + netExchangeProfit);
        else if (typeof window.totalProfit !== 'undefined') window.totalProfit = m((Number(window.totalProfit) || 0) + netExchangeProfit);
        o.profitRecorded = true;
    }

    const itemsToSell = [];
    if (o.nMainName) itemsToSell.push({ name: o.nMainName, productName: o.nMainName, quantity: 1, qty: 1, unitPrice: Number(o.nMainPrice) || 0, price: Number(o.nMainPrice) || 0, subtotal: Number(o.nMainPrice) || 0, total: Number(o.nMainPrice) || 0, costPrice: Number(o.nMainCost) || 0, cost: Number(o.nMainCost) || 0 });
    if (Array.isArray(o.nAccs)) o.nAccs.forEach(a => itemsToSell.push({ name: a.name, productName: a.name, quantity: 1, qty: 1, unitPrice: Number(a.price) || 0, price: Number(a.price) || 0, subtotal: Number(a.price) || 0, total: Number(a.price) || 0, costPrice: Number(a.cost) || 0, cost: Number(a.cost) || 0 }));

    if (itemsToSell.length > 0 && !o.sourceInvoiceId) {
        const invNum = o.sourceInvoiceNum || `EX-${Date.now().toString().slice(-5)}`;
        const saleObj = {
            id: "EX-SALE-" + Date.now(),
            type: 'exchange',
            timestamp: new Date().toISOString(),
            saleDate: (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate) ? window.currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
            date: (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate) ? window.currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
            name: `🔄 استبدال: ${o.itemsDesc || o.nMainName || ''}`,
            productName: `🔄 استبدال: ${o.itemsDesc || o.nMainName || ''} (فاتورة: ${invNum})`,
            quantity: 1, qty: 1,
            sellPrice: nPrice, price: nPrice, totalSellPrice: nPrice, grandTotal: nPrice, paidAmount: Number(o.diffAmount) || 0,
            cost: nCost, costPrice: nCost, totalCost: nCost,
            profit: netExchangeProfit, totalProfit: netExchangeProfit,
            customerName: o.customerName || 'عميل استبدال',
            customerPhone: o.customerPhone || '',
            invoiceNumber: invNum, invoiceId: invNum,
            items: itemsToSell,
            notes: "استبدال مكتمل المراحل 🔄"
        };
        o.sourceInvoiceId = saleObj.id;
        if (typeof window.injectSaleToMain === 'function') window.injectSaleToMain(saleObj);
        if (typeof window.saveInvoiceToFirestore === 'function') {
            window.saveInvoiceToFirestore(saleObj).catch(e => console.error("Failed to save completed exchange invoice:", e));
        }
    }
}

function weightedReturnProduct(liveProducts, name, cost, price, cat) {
    if (!name) return;
    const cName = String(name).trim().toLowerCase();
    let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cName);
    const retCost = Number(cost) || 0;
    if (!p) {
        const newP = { id: "R-" + Date.now() + "-" + Math.floor(Math.random()*1000), name: String(name).trim(), category: cat || 'عام', quantity: 1, costPrice: Math.round(retCost * 1e6) / 1e6, price: Number(price) || 0 };
        if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP);
        else liveProducts.push(newP);
    } else {
        const oldQty = Number(p.quantity) || 0;
        const oldCost = Number(p.costPrice) || 0;
        const newQty = oldQty + 1;
        p.costPrice = Math.round((((oldQty * oldCost) + retCost) / newQty) * 1e6) / 1e6;
        p.quantity = newQty;
    }
}

function checkExchangeOutStock(liveProducts, o) {
    const needed = new Map();
    const addN = (nm) => {
        if (!nm) return;
        const k = String(nm).trim().toLowerCase();
        needed.set(k, { name: String(nm).trim(), count: (needed.get(k)?.count || 0) + 1 });
    };
    addN(o.nMainName);
    if (Array.isArray(o.nAccs)) o.nAccs.forEach(a => addN(a.name));
    for (const [k, info] of needed.entries()) {
        const p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === k && (Number(x.quantity) || 0) >= info.count)
            || liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === k);
        if (!p || (Number(p.quantity) || 0) < info.count) {
            return `المخزون المتاح للصنف "${info.name}" (${p ? (p.quantity || 0) : 0}) لا يكفي لشحن الطلب (المطلوب: ${info.count}).`;
        }
    }
    return null;
}

window.confirmPendingOrder = async function(id) {
    if(!confirm("تأكيد التسليم للعميل وتحصيل الفلوس بالخزنة؟")) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === id);
    if(orderIndex === -1) return;
    const o = window.pendingOrders[orderIndex];
    const m = (typeof window.money === 'function') ? window.money : Number;
    
    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');
    
    const accSelEl = document.getElementById('ex_acc_sel');
    if(!accSelEl) return;
    const accId = accSelEl.value;
    const liveAccounts = getAccounts();
    const acc = liveAccounts.find(a => a.id === accId) || liveAccounts.find(a => a.id === o.accId);
    const liveProducts = getProducts();

    // التحقق من الرصيد والمخزون قبل أي تعديل
    const diffNum = m(Number(o.diffAmount) || 0);
    if ((!o.stages || !o.stages.moneyCollected) && Math.abs(diffNum) > 0.001 && !acc) {
        return alert("يرجى اختيار حساب خزينة صالح لإتمام التحصيل.");
    }
    if ((!o.stages || !o.stages.moneyCollected) && diffNum < 0 && acc && Math.abs(diffNum) > (Number(acc.balance) || 0) + 0.001) {
        return alert(`رصيد الخزينة [${acc.name}] غير كافٍ لصرف فرق الاستبدال (${Math.abs(diffNum)} ج.م).`);
    }
    if (!o.stages || !o.stages.newItemShipped) {
        const stockErr = checkExchangeOutStock(liveProducts, o);
        if (stockErr) return alert(stockErr);
    }

    triggerUndoSave();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction('إتمام طلب استبدال معلق') : null;
    try {
    
    if (!o.stages || !o.stages.moneyCollected) {
        if (acc && Math.abs(diffNum) > 0.001) {
            acc.balance = m((Number(acc.balance) || 0) + diffNum);
            const totalLiq = m(liveAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0));
            if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                liquidityLog.push({ id: generateId("liq-ex-conf"), timestamp: new Date().toISOString(), type: diffNum >= 0 ? "add" : "remove", amount: Math.abs(diffNum), description: `تحصيل استبدال العميل [${cleanName}]`, currentBalance: totalLiq, accountId: acc.id });
            }
        }
        addLogSafe({ timestamp: new Date().toISOString(), type: "إتمام تحصيل", details: `تحصيل مبلغ استبدال العميل [${cleanName}]`, amount: diffNum });
    }
    
    const processOut = (name, cost, price, onDeductedCost) => {
        if(!name) return;
        const cName = String(name).trim().toLowerCase();
        let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cName && (Number(x.quantity) || 0) > 0)
            || liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cName);
        if(p) {
            p.quantity = Math.max(0, (Number(p.quantity) || 0) - 1);
            if (typeof onDeductedCost === 'function' && Number.isFinite(Number(p.costPrice))) {
                onDeductedCost(Number(p.costPrice));
            }
        } else {
            const newP = { id: "N-"+Date.now(), name: String(name).trim(), category: "عام", quantity: 0, costPrice: Math.round((Number(cost) || 0) * 1e6) / 1e6, price: Number(price) || 0 };
            if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
            else liveProducts.push(newP);
        }
    };
    if (!o.stages || !o.stages.oldItemReceived) {
        weightedReturnProduct(liveProducts, o.rMainName, o.rMainCost, o.rMainPrice, o.rMainCat || 'عام');
        if(o.rAccs) o.rAccs.forEach(a => weightedReturnProduct(liveProducts, a.name, a.cost, a.price, a.cat || 'عام'));
    }
    if (!o.stages || !o.stages.newItemShipped) {
        processOut(o.nMainName, o.nMainCost, o.nMainPrice, (actualCost) => { o.nMainCost = actualCost; });
        if(o.nAccs) o.nAccs.forEach(a => processOut(a.name, a.cost, a.price, (actualCost) => { a.cost = actualCost; }));
    }
    finalizeCompletedExchangeOrder(o);
    window.pendingOrders.splice(orderIndex, 1);
    if (_tx) _tx.commit();
    await finalizeSave();
    } catch (confErr) {
        if (_tx) await _tx.rollback();
        console.error("فشل إتمام طلب الاستبدال (تم التراجع):", confErr);
        alert("حدث خطأ أثناء إتمام طلب الاستبدال وتم التراجع عن التعديلات.");
    }
};

window.openStagesModal = function(id) {
    const o = window.pendingOrders.find(x => x.id === id);
    if(!o || !o.stages) return alert("لا توجد مراحل لهذا الطلب");
    
    let modal = document.getElementById('ex-stages-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ex-stages-modal';
        modal.className = 'modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; padding:12px; overflow-y:auto; background:rgba(0,0,0,0.5); z-index:9999; display:none; justify-content:center; align-items:center; box-sizing:border-box;';
        document.body.appendChild(modal);
    }
    
    let html = `
    <div style="background:#fff; width:100%; max-width:500px; max-height:calc(100dvh - 24px); overflow-y:auto; border-radius:8px; padding:18px; text-align:right; box-sizing:border-box;" dir="rtl">
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
                    <option value="pay_now_debt">تسجيل كدين / التزام للعميل</option>
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
    const m = (typeof window.money === 'function') ? window.money : Number;

    // فحص مسبق قبل فتح المعاملة الذرية
    if (stageName === 'newItemShipped') {
        const liveProductsCheck = getProducts();
        const stockErr = checkExchangeOutStock(liveProductsCheck, o);
        if (stockErr) return alert(stockErr);
    } else if (stageName === 'moneyCollected') {
        const methodCheck = document.getElementById('stage_pay_method')?.value;
        const diffCheck = m(Number(o.diffAmount) || 0);
        if (methodCheck === 'pay_now_safe') {
            const liveAccountsCheck = getAccounts();
            const accCheck = liveAccountsCheck.find(a => a.id === o.accId);
            if (Math.abs(diffCheck) > 0.001 && !accCheck) {
                return alert("الحساب المالي المرتبط بهذا الطلب غير موجود.");
            }
            if (accCheck && diffCheck < 0 && (Number(accCheck.balance) || 0) + diffCheck < -0.001) {
                return alert(`رصيد الخزينة [${accCheck.name || accCheck.id}] غير كافٍ لصرف فرق الاستبدال للعميل!\nالرصيد المتوفر: ${accCheck.balance} ج.م | المطلوب: ${Math.abs(diffCheck)} ج.م`);
            }
        }
    }

    triggerUndoSave();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction(`مرحلة استبدال (${stageName})`) : null;
    try {

    if(stageName === 'newItemShipped') {
        const liveProducts = getProducts();
        const processOut = (name, cost, price, onDeductedCost) => {
            if(!name) return;
            const cleanName = String(name).trim().toLowerCase();
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName && (Number(x.quantity) || 0) > 0)
                || liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName);
            if(p) {
                p.quantity = Math.max(0, (Number(p.quantity) || 0) - 1);
                if (typeof onDeductedCost === 'function' && Number.isFinite(Number(p.costPrice))) {
                    onDeductedCost(Number(p.costPrice));
                }
            } else {
                const newP = { id: "N-"+Date.now(), name: String(name).trim(), category: "عام", quantity: 0, costPrice: Math.round((Number(cost) || 0) * 1e6) / 1e6, price: Number(price) || 0 };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
                else liveProducts.push(newP);
            }
        };
        processOut(o.nMainName, o.nMainCost, o.nMainPrice, (actualCost) => { o.nMainCost = actualCost; });
        if(o.nAccs) o.nAccs.forEach(a => processOut(a.name, a.cost, a.price, (actualCost) => { a.cost = actualCost; }));
        
        o.stages.newItemShipped = true;
        o.stages.newItemShippedDate = new Date().toISOString();
        addLogSafe({ timestamp: new Date().toISOString(), type: "شحن بضاعة", details: `تم شحن البضاعة للعميل [${o.customerName}]`, amount: 0 });
    }
    else if(stageName === 'moneyCollected') {
        const method = document.getElementById('stage_pay_method').value;
        const diffNum = m(Number(o.diffAmount) || 0);
        if (method === 'pay_now_safe') {
            const liveAccounts = getAccounts();
            const acc = liveAccounts.find(a => a.id === o.accId);
            if(acc && Math.abs(diffNum) > 0.001) {
                acc.balance = m((Number(acc.balance)||0) + diffNum);
                const totalLiq = m(liveAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0));
                if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                    liquidityLog.push({ id: generateId("liq-ex-stage"), timestamp: new Date().toISOString(), type: diffNum >= 0 ? "add" : "remove", amount: Math.abs(diffNum), description: `تحصيل مرحلة استبدال للعميل [${o.customerName}]`, currentBalance: totalLiq, accountId: acc.id });
                }
            }
            addLogSafe({ timestamp: new Date().toISOString(), type: "تحصيل آجل لخزنة", details: `تحصيل فرق الاستبدال للعميل [${o.customerName}] في الخزنة`, amount: diffNum });
        } else if (method === 'pay_now_debt') {
            const rawName = o.customerName || '';
            const cleanCustName = rawName.replace(' (عميل استبدال 🔄)', '').trim();
            if (diffNum < 0) {
                if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                    const liabId = "LIAB-EX-" + Date.now();
                    liabilities.push({ id: liabId, name: cleanCustName, amount: m(Math.abs(diffNum)), status: 'active', source: 'exchange_credit', orderId: o.id, createdAt: new Date().toISOString() });
                    o.linkedLiabilityId = liabId;
                }
                addLogSafe({ timestamp: new Date().toISOString(), type: "التزام استبدال", details: `تسجيل فرق الاستبدال المستحق للعميل [${cleanCustName}] كالتزام`, amount: diffNum });
            } else if (diffNum > 0) {
                window.debtors = window.debtors || [];
                let profileId = undefined;
                if (typeof debtorProfiles !== 'undefined' && Array.isArray(debtorProfiles)) {
                    let prof = debtorProfiles.find(p => typeof normalizeArabicText === 'function' ? normalizeArabicText(p.name) === normalizeArabicText(cleanCustName) : p.name === cleanCustName);
                    if (!prof) {
                        prof = { id: (typeof generateId === 'function' ? generateId('dp') : 'dp-' + Date.now()), name: cleanCustName, phone: o.customerPhone || '', address: '', notes: '' };
                        debtorProfiles.push(prof);
                    }
                    profileId = prof.id;
                }
                const debtId = "DEBT-EX-" + Date.now();
                window.debtors.push({ id: debtId, customerId: profileId, name: cleanCustName, customerName: cleanCustName, phone: o.customerPhone, amount: m(diffNum), reason: "دين استبدال", origin: 'exchange_debt', orderId: o.id, createdAt: new Date().toISOString() });
                o.linkedDebtId = debtId;
                addLogSafe({ timestamp: new Date().toISOString(), type: "دين استبدال", details: `تسجيل فرق الاستبدال كدين على [${cleanCustName}]`, amount: diffNum });
            }
        }
        
        o.stages.moneyCollected = true;
        o.stages.moneyCollectedDate = new Date().toISOString();
        o.stages.moneyMethod = method;
    }
    else if(stageName === 'oldItemReceived') {
        const liveProducts = getProducts();
        weightedReturnProduct(liveProducts, o.rMainName, o.rMainCost, o.rMainPrice, o.rMainCat || 'عام');
        if(o.rAccs) o.rAccs.forEach(a => weightedReturnProduct(liveProducts, a.name, a.cost, a.price, a.cat || 'عام'));
        
        o.stages.oldItemReceived = true;
        o.stages.oldItemReceivedDate = new Date().toISOString();
        addLogSafe({ timestamp: new Date().toISOString(), type: "استلام مرتجع", details: `تم استلام البضاعة المرتجعة من العميل [${o.customerName}]`, amount: 0 });
    }

    if (o.stages.newItemShipped && o.stages.moneyCollected && o.stages.oldItemReceived) {
        finalizeCompletedExchangeOrder(o);
        const orderIndex = window.pendingOrders.findIndex(x => x.id === id);
        if(orderIndex !== -1) window.pendingOrders.splice(orderIndex, 1);
        document.getElementById('ex-stages-modal').style.display='none';
    } else {
        openStagesModal(id);
    }
    if (_tx) _tx.commit();
    await finalizeSave();
    } catch (stageErr) {
        if (_tx) await _tx.rollback();
        console.error("فشل تنفيذ مرحلة الاستبدال (تم التراجع):", stageErr);
        alert("حدث خطأ أثناء تنفيذ المرحلة وتم التراجع التلقائي.");
    }
};
