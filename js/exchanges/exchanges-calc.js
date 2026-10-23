/**
 * js/exchanges/exchanges-calc.js
 * الحسابات المالية وتنفيذ حركات الاستبدال المباشرة (Exchange Calculations & Execution)
 */

function runCalc() {
    // دالة داخلية للحصول على القيمة بأمان
    const getSafeV = (id) => {
        const el = document.getElementById(id);
        if(!el) return 0;
        return parseFloat(el.value) || 0;
    };

    // نتحقق من وجود لوحة الاستبدال قبل البدء
    if (!document.getElementById('exchange-panel')) return;

    let rCost = getSafeV('r_main_cost'), rPrice = getSafeV('r_main_price');
    let nCost = getSafeV('n_main_cost'), nPrice = getSafeV('n_main_price');

    document.querySelectorAll('.r-acc-row').forEach(row => {
        const costInp = row.querySelector('.acc-cost');
        const priceInp = row.querySelector('.acc-price');
        if(costInp) rCost += parseFloat(costInp.value) || 0;
        if(priceInp) rPrice += parseFloat(priceInp.value) || 0;
    });
    document.querySelectorAll('.n-acc-row').forEach(row => {
        const costInp = row.querySelector('.acc-cost');
        const priceInp = row.querySelector('.acc-price');
        if(costInp) nCost += parseFloat(costInp.value) || 0;
        if(priceInp) nPrice += parseFloat(priceInp.value) || 0;
    });

    const diff = nPrice - rPrice;
    
    // تحديث النصوص في الواجهة مع التأكد من وجود العناصر
    const vOld = document.getElementById('v_old_prof');
    const vNew = document.getElementById('v_new_prof');
    const vDiff = document.getElementById('v_diff');

    if(vOld) vOld.innerText = (rPrice - rCost).toFixed(2);
    if(vNew) vNew.innerText = (nPrice > 0) ? (nPrice - nCost).toFixed(2) : "0.00";
    if(vDiff) vDiff.innerText = diff > 0 ? "تحصيل " + diff : (diff < 0 ? "صرف " + Math.abs(diff) : "0.00");
}

function triggerUndoSave() {
    if (typeof window.saveState === 'function') {
        window.saveState();
    }
}

async function executeTransaction() {
    const delLaterEl = document.getElementById('del_later');
    const accSelEl = document.getElementById('ex_acc_sel');
    if(!delLaterEl || !accSelEl) return;

    const isPending = delLaterEl.checked;
    const accId = accSelEl.value;
    
    const pendingPayType = isPending ? (document.querySelector('input[name="pending_pay_type"]:checked')?.value || 'pay_later') : null;
    const shippingCompany = document.getElementById('ex_shipping_company')?.value || "";
    const trackingNumber = document.getElementById('ex_tracking_number')?.value || "";
    
    let custNameInput = (document.getElementById('ex_customer_name')?.value || "").trim() || "عميل بدون اسم";
    let custPhone = (document.getElementById('ex_customer_phone')?.value || "").trim();

    const rMainName = document.getElementById('r_main_name')?.value || "";
    const rMainCost = parseFloat(document.getElementById('r_main_cost')?.value) || 0;
    const rMainPrice = parseFloat(document.getElementById('r_main_price')?.value) || 0;
    const rMainCat = document.getElementById('r_main_cat')?.value || 'عام';

    const nMainName = document.getElementById('n_main_name')?.value || "";
    const nMainCost = parseFloat(document.getElementById('n_main_cost')?.value) || 0;
    const nMainPrice = parseFloat(document.getElementById('n_main_price')?.value) || 0;

    const rAccs = [];
    document.querySelectorAll('.r-acc-row').forEach(row => {
        const name = row.querySelector('.acc-name')?.value.trim();
        if(name) {
            rAccs.push({ 
                name, 
                cost: parseFloat(row.querySelector('.acc-cost')?.value)||0, 
                price: parseFloat(row.querySelector('.acc-price')?.value)||0, 
                cat: row.querySelector('.acc-cat') ? row.querySelector('.acc-cat').value : 'عام' 
            });
        }
    });

    const nAccs = [];
    document.querySelectorAll('.n-acc-row').forEach(row => {
        const name = row.querySelector('.acc-name')?.value.trim();
        if(name) {
            nAccs.push({ 
                name, 
                cost: parseFloat(row.querySelector('.acc-cost')?.value)||0, 
                price: parseFloat(row.querySelector('.acc-price')?.value)||0 
            });
        }
    });

    if (!rMainName && !nMainName && rAccs.length === 0 && nAccs.length === 0) return alert("يرجى إدخال بيانات العملية");

    let totalRCost = rMainCost, totalRPrice = rMainPrice;
    rAccs.forEach(a => { totalRCost += a.cost; totalRPrice += a.price; });
    
    let totalNCost = nMainCost, totalNPrice = nMainPrice;
    nAccs.forEach(a => { totalNCost += a.cost; totalNPrice += a.price; });

    const diff = totalNPrice - totalRPrice;

    // فحص كفاية رصيد الخزينة عند رد فرق نقدي للعميل لمنع تحول الرصيد لسالب
    if ((!isPending || pendingPayType === 'pay_now_safe') && diff < 0) {
        const liveAccs = getAccounts();
        const targetAcc = liveAccs.find(a => a.id === accId);
        if (targetAcc && (Number(targetAcc.balance) || 0) + diff < 0) {
            const btn = document.getElementById('exec_btn');
            if(btn) { btn.disabled = false; btn.innerHTML = "تنفيذ وحفظ الاستبدال"; }
            return alert(`رصيد الخزينة [${targetAcc.name || targetAcc.id}] غير كافٍ لصرف الفرق للعميل!\nالرصيد المتوفر: ${targetAcc.balance} ج.م | المبلغ المطلوب صرفه: ${Math.abs(diff)} ج.م`);
        }
    }

    const btn = document.getElementById('exec_btn');
    if(btn) { btn.disabled = true; btn.innerHTML = "⏳ جاري التحديث..."; }

    try {
        triggerUndoSave();
        const liveProducts = getProducts();

     const processReturn = (name, cost, price, cat) => {
            if(!name) return;
            // 1. تحويل للنص وتجاهل المسافات وحالة الأحرف
            const cleanName = String(name).trim().toLowerCase(); 
            // 2. تأمين البحث ضد قيم null أو undefined في مصفوفة المنتجات
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName);
            
            if(!p) {
                // الحفاظ على الاسم الأصلي بدون تغيير حالة الأحرف (للعرض)، وتأمين الأرقام
                const newP = { id: "R-"+Date.now(), name: String(name).trim(), category: cat, quantity: 1, costPrice: Number(cost) || 0, price: Number(price) || 0 };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
                else liveProducts.push(newP);
            } else {
                // 3. التحديث الآمن للكمية والتكلفة كأرقام فعلية
                p.quantity = (Number(p.quantity) || 0) + 1;
                p.costPrice = Number(cost) || 0; 
            }
        };

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
        if (!isPending) {
            processReturn(rMainName, rMainCost, rMainPrice, rMainCat); 
            rAccs.forEach(a => processReturn(a.name, a.cost, a.price, a.cat));

            processOut(nMainName, nMainCost, nMainPrice); 
            nAccs.forEach(a => processOut(a.name, a.cost, a.price));
        }

        const itemsToSell = [];
        if (nMainName) itemsToSell.push({ 
            name: nMainName, productName: nMainName, quantity: 1, qty: 1, 
            unitPrice: nMainPrice, price: nMainPrice, subtotal: nMainPrice, total: nMainPrice, 
            costPrice: nMainCost, cost: nMainCost, unitCost: nMainCost 
        });
        nAccs.forEach(a => itemsToSell.push({ 
            name: a.name, productName: a.name, quantity: 1, qty: 1, 
            unitPrice: a.price, price: a.price, subtotal: a.price, total: a.price, 
            costPrice: a.cost, cost: a.cost, unitCost: a.cost 
        }));

        let itemsDescStr = nMainName ? nMainName : 'إكسسوارات متنوعة';
        if (nAccs.length > 0) itemsDescStr += ` + ${nAccs.length} عناصر`;
        const invoiceNum = `EX-${Date.now().toString().slice(-5)}`;

        const taggedProductName = `🔄 استبدال: ${itemsDescStr}`;
        const taggedCustomerName = custNameInput + ` (عميل استبدال 🔄)`;

        let createdSaleObj = null;
        if (itemsToSell.length > 0) {
            const saleObj = {
                id: "EX-SALE-" + Date.now(),
                type: 'exchange',
                timestamp: new Date().toISOString(),
                saleDate: (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate) ? window.currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
                date: (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate) ? window.currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })),
                name: taggedProductName,
                productName: taggedProductName + ` (فاتورة: ${invoiceNum})`, 
                itemName: taggedProductName,
                quantity: 1,
                qty: 1,
                sellPrice: totalNPrice,
                price: totalNPrice,
                totalSellPrice: totalNPrice,
                grandTotal: totalNPrice,
                total: totalNPrice,
                totalPrice: totalNPrice,
                cost: totalNCost,
                costPrice: totalNCost,
                totalCost: totalNCost,
                totalCostPrice: totalNCost,
                profit: totalNPrice - totalNCost,
                totalProfit: totalNPrice - totalNCost,
                customerName: taggedCustomerName,
                clientName: taggedCustomerName,
                buyerName: taggedCustomerName,
                customerPhone: custPhone,
                invoiceNumber: invoiceNum,
                invoiceId: invoiceNum,
                items: itemsToSell,
                notes: isPending ? "استبدال وتسليم آجل 🔄" : "استبدال وتسليم فوري 🔄"
            };
            createdSaleObj = saleObj;

            if (typeof window.injectSaleToMain === 'function') window.injectSaleToMain(saleObj);
            
            if (typeof window.saveInvoiceToFirestore === 'function') {
                try { 
                    await window.saveInvoiceToFirestore(saleObj); 
                } catch(e) { 
                    console.error("🔥 خطأ خطير: فشل حفظ الفاتورة في السحابة!", e);
                    if (typeof showGlobalMessage === 'function') {
                        showGlobalMessage("⚠️ فشل رفع الفاتورة للسحابة! تحقق من اتصالك بالإنترنت.", true);
                    }
                    if (window.registerGlobalError) window.registerGlobalError(e, "فشل حفظ الفاتورة: " + saleObj.id);
                }
            }
        }

        if (isPending && itemsToSell.length > 0) {
            const stages = {
                newItemShipped: false,
                newItemShippedDate: null,
                moneyCollected: pendingPayType !== 'pay_later',
                moneyCollectedDate: pendingPayType !== 'pay_later' ? new Date().toISOString() : null,
                moneyMethod: pendingPayType,
                oldItemReceived: false,
                oldItemReceivedDate: null
            };
            window.pendingOrders.push({
                id: (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('ORD') : ("ORD_" + Date.now().toString(36))),
                customerName: taggedCustomerName,
                customerPhone: custPhone,
                itemsDesc: itemsDescStr,
                diffAmount: diff, accId: accId,
                nMainName, nMainCost, nMainPrice,
                rMainName, rMainCost, rMainPrice,
                nAccs: nAccs, rAccs: rAccs,
                stages: stages,
                shippingCompany: shippingCompany,
                trackingNumber: trackingNumber,
                createdAt: new Date().toISOString(),
                sourceInvoiceId: createdSaleObj ? createdSaleObj.id : null,
                sourceInvoiceNum: invoiceNum
            });

            if (pendingPayType === 'pay_now_safe') {
                const liveAccounts = getAccounts();
                const acc = liveAccounts.find(a => a.id === accId);
                if(acc) acc.balance = (Number(acc.balance)||0) + diff;
                addLogSafe({ timestamp: new Date().toISOString(), type: "دفع آجل لخزنة", details: `تسجيل فرق الاستبدال للعميل [${custNameInput}] في الخزنة`, amount: diff });
            } else if (pendingPayType === 'pay_now_debt') {
                window.debtors = window.debtors || [];
                let debtor = window.debtors.find(d => d.name === custNameInput || d.customerName === custNameInput);
                if (!debtor) {
                    debtor = { id: "DEBT-"+Date.now(), name: custNameInput, customerName: custNameInput, phone: custPhone, amount: 0, reason: "دين استبدال مؤجل", createdAt: new Date().toISOString() };
                    window.debtors.push(debtor);
                }
                debtor.amount = (Number(debtor.amount)||0) + diff;
                addLogSafe({ timestamp: new Date().toISOString(), type: "دين استبدال", details: `تسجيل فرق الاستبدال كدين على [${custNameInput}]`, amount: diff });
            } else {
                addLogSafe({ timestamp: new Date().toISOString(), type: "استلام وشحن جديد", details: `استبدال للعميل [${custNameInput}] - الفلوس معلقة`, amount: 0 });
            }
        } else {
            const liveAccounts = getAccounts();
            const acc = liveAccounts.find(a => a.id === accId);
            if(acc) acc.balance = (Number(acc.balance)||0) + diff;
            addLogSafe({ timestamp: new Date().toISOString(), type: "استبدال فوري", details: `استبدال وتحصيل فوري للعميل [${custNameInput}]`, amount: diff });
        }

        await finalizeSave();

        // تنظيف الحقول
        if(document.getElementById('ex_customer_name')) document.getElementById('ex_customer_name').value = '';
        if(document.getElementById('ex_customer_phone')) document.getElementById('ex_customer_phone').value = '';
        if(document.getElementById('r_main_name')) document.getElementById('r_main_name').value = '';
        if(document.getElementById('n_main_name')) document.getElementById('n_main_name').value = '';
        
        ['r_main_cost', 'r_main_price', 'n_main_cost', 'n_main_price'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = '0';
        });

        const rAccCont = document.getElementById('r_acc_container');
        const nAccCont = document.getElementById('n_acc_container');
        if(rAccCont) rAccCont.innerHTML = '';
        if(nAccCont) nAccCont.innerHTML = '';

        runCalc();
        updateUIState();
        if(btn) btn.disabled = false;

    } catch (e) {
        alert("خطأ: " + e.message);
        if(btn) { btn.disabled = false; updateUIState(); }
    }
}

async function finalizeSave() {
    if (window.saveCurrentStateByDate) {
        await window.saveCurrentStateByDate(window.currentLoadedDate);
        if (typeof window.saveSystemToCloud === 'function') {
            await window.saveSystemToCloud();
        }
        renderLocalPendingOrders();
        if (typeof window.refreshMainUI === 'function') {
            window.refreshMainUI();
        }
    } else {
        console.warn("تنبيه: دالة الحفظ السحابي غير متصلة.");
    }
}
