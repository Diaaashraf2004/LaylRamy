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
    const absDiff = Math.abs(diff).toFixed(2);
    if(vDiff) vDiff.innerText = diff > 0 ? "تحصيل " + absDiff : (diff < 0 ? "صرف " + absDiff : "0.00");
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

    // فحص وجود الحساب وكفاية رصيد الخزينة عند التسوية النقدية لمنع تضخم/نقصان وهمي أو سحب على المكشوف
    if ((!isPending || pendingPayType === 'pay_now_safe') && Math.abs(diff) > 0.001) {
        const liveAccs = getAccounts();
        const targetAcc = liveAccs.find(a => a.id === accId);
        if (!targetAcc) {
            const btn = document.getElementById('exec_btn');
            if(btn) { btn.disabled = false; btn.innerHTML = "تنفيذ وحفظ الاستبدال"; }
            return alert("يرجى اختيار حساب خزينة صالح لتسوية فرق الاستبدال.");
        }
        if (diff < 0 && (Number(targetAcc.balance) || 0) + diff < -0.001) {
            const btn = document.getElementById('exec_btn');
            if(btn) { btn.disabled = false; btn.innerHTML = "تنفيذ وحفظ الاستبدال"; }
            return alert(`رصيد الخزينة [${targetAcc.name || targetAcc.id}] غير كافٍ لصرف الفرق للعميل!\nالرصيد المتوفر: ${targetAcc.balance} ج.م | المبلغ المطلوب صرفه: ${Math.abs(diff)} ج.م`);
        }
    }

    const btn = document.getElementById('exec_btn');
    if(btn) { btn.disabled = true; btn.innerHTML = "⏳ جاري التحديث..."; }

    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction(isPending ? 'إنشاء استبدال مؤجل' : 'تنفيذ استبدال فوري') : null;
    try {
        triggerUndoSave();
        const liveProducts = getProducts();

     const m = (typeof window.money === 'function') ? window.money : (v => Math.round((Number(v) || 0) * 100) / 100);
        let actualNMainCost = nMainCost;

        // التحقق المسبق من توفر مخزون الأصناف الخارجة عند التسليم الفوري (بما في ذلك رفض الأصناف غير الموجودة بالمخزن لمنع رأس المال الوهمي)
        if (!isPending) {
            const neededMap = new Map();
            const addNeed = (nm) => {
                if (!nm) return;
                const k = String(nm).trim().toLowerCase();
                neededMap.set(k, { name: String(nm).trim(), count: (neededMap.get(k)?.count || 0) + 1 });
            };
            addNeed(nMainName);
            nAccs.forEach(a => addNeed(a.name));
            for (const [k, info] of neededMap.entries()) {
                const p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === k && (Number(x.quantity) || 0) >= info.count)
                    || liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === k);
                if (!p || (Number(p.quantity) || 0) < info.count) {
                    if (_tx) await _tx.rollback();
                    if (btn) { btn.disabled = false; updateUIState(); }
                    return alert(`المخزون المتاح للصنف "${info.name}" (${p ? (p.quantity || 0) : 0}) لا يكفي لإتمام الاستبدال (المطلوب: ${info.count}).`);
                }
            }
        }

        const processReturn = (name, cost, price, cat) => {
            if(!name) return;
            const cleanName = String(name).trim().toLowerCase(); 
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName);
            const retCost = Number(cost) || 0;
            if(!p) {
                const newP = { id: "R-"+Date.now()+"-"+Math.floor(Math.random()*1000), name: String(name).trim(), category: cat || "عام", quantity: 1, costPrice: Math.round(retCost * 1e6) / 1e6, price: Number(price) || 0 };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
                else liveProducts.push(newP);
            } else {
                // حساب متوسط التكلفة المرجح بدلاً من استبدال تكلفة المخزون كله!
                const oldQty = Number(p.quantity) || 0;
                const oldCost = Number(p.costPrice) || 0;
                const newQty = oldQty + 1;
                p.costPrice = Math.round((((oldQty * oldCost) + retCost) / newQty) * 1e6) / 1e6;
                p.quantity = newQty;
            }
        };

        const processOut = (name, cost, price, onDeductedInfo) => {
            if(!name) return null;
            const cleanName = String(name).trim().toLowerCase();
            let p = liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName && (Number(x.quantity) || 0) > 0)
                || liveProducts.find(x => x && x.name && String(x.name).trim().toLowerCase() === cleanName);
            if(p) {
                p.quantity = Math.max(0, (Number(p.quantity) || 0) - 1);
                if (typeof onDeductedInfo === 'function') {
                    onDeductedInfo(Number.isFinite(Number(p.costPrice)) ? Number(p.costPrice) : Number(cost) || 0, p.id || null);
                }
                return p.id || null;
            } else {
                const newP = { id: "N-"+Date.now()+"-"+Math.floor(Math.random()*1000), name: String(name).trim(), category: "عام", quantity: 0, costPrice: Math.round((Number(cost) || 0) * 1e6) / 1e6, price: Number(price) || 0 };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
                else liveProducts.push(newP);
                if (typeof onDeductedInfo === 'function') onDeductedInfo(newP.costPrice, newP.id);
                return newP.id;
            }
        };

        let nMainProductId = null;
        if (!isPending) {
            processReturn(rMainName, rMainCost, rMainPrice, rMainCat); 
            rAccs.forEach(a => processReturn(a.name, a.cost, a.price, a.cat));

            processOut(nMainName, nMainCost, nMainPrice, (c, pid) => { actualNMainCost = c; nMainProductId = pid; }); 
            nAccs.forEach(a => processOut(a.name, a.cost, a.price, (c, pid) => { a.cost = c; a.productId = pid; }));
            totalNCost = actualNMainCost + nAccs.reduce((s, a) => s + (Number(a.cost) || 0), 0);
        }
        const netExchangeProfit = m((totalNPrice - totalNCost) - (totalRPrice - totalRCost));

        const itemsToSell = [];
        if (nMainName) itemsToSell.push({ 
            id: nMainProductId || null,
            name: nMainName, productName: nMainName, quantity: 1, qty: 1, 
            unitPrice: nMainPrice, price: nMainPrice, subtotal: nMainPrice, total: nMainPrice, 
            costPrice: actualNMainCost || nMainCost, cost: actualNMainCost || nMainCost, unitCost: actualNMainCost || nMainCost 
        });
        nAccs.forEach(a => itemsToSell.push({ 
            id: a.productId || null,
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
        // لا نسجل فاتورة مكتملة ولا نضيف أرباحاً إلا عند التسليم الفوري (أما الآجل فيسجل عند إتمام المراحل الثلاث)
        if (!isPending && itemsToSell.length > 0) {
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
                paidAmount: diff,
                total: totalNPrice,
                totalPrice: totalNPrice,
                cost: totalNCost,
                costPrice: totalNCost,
                totalCost: totalNCost,
                totalCostPrice: totalNCost,
                profit: netExchangeProfit,
                totalProfit: netExchangeProfit,
                customerName: taggedCustomerName,
                clientName: taggedCustomerName,
                buyerName: taggedCustomerName,
                customerPhone: custPhone,
                invoiceNumber: invoiceNum,
                invoiceId: invoiceNum,
                items: itemsToSell,
                notes: "استبدال وتسليم فوري 🔄"
            };
            createdSaleObj = saleObj;

            if (typeof window.injectSaleToMain === 'function') window.injectSaleToMain(saleObj);
            if (typeof totalProfit !== 'undefined') {
                totalProfit = m((Number(totalProfit) || 0) + netExchangeProfit);
            } else if (typeof window.totalProfit !== 'undefined') {
                window.totalProfit = m((Number(window.totalProfit) || 0) + netExchangeProfit);
            }
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

        const recordExchangeLiquidity = (acc, deltaAmt, desc) => {
            if (!acc || Math.abs(deltaAmt) <= 0.001) return;
            acc.balance = m((Number(acc.balance) || 0) + deltaAmt);
            const liveAccounts = getAccounts();
            const totalLiq = m(liveAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0));
            if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
                liquidityLog.push({
                    id: (typeof generateId === 'function') ? generateId('liq-ex') : ('liq-ex-' + Date.now()),
                    timestamp: new Date().toISOString(),
                    type: deltaAmt >= 0 ? 'add' : 'remove',
                    amount: Math.abs(deltaAmt),
                    description: desc,
                    currentBalance: totalLiq,
                    accountId: acc.id
                });
            }
        };

        if (isPending) {
            const stages = {
                newItemShipped: false,
                newItemShippedDate: null,
                moneyCollected: pendingPayType !== 'pay_later',
                moneyCollectedDate: pendingPayType !== 'pay_later' ? new Date().toISOString() : null,
                moneyMethod: pendingPayType,
                oldItemReceived: false,
                oldItemReceivedDate: null
            };
            const orderObj = {
                id: (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('ORD') : ("ORD_" + Date.now().toString(36))),
                customerName: taggedCustomerName,
                customerPhone: custPhone,
                itemsDesc: itemsDescStr,
                diffAmount: m(diff), accId: accId,
                nMainName, nMainCost, nMainPrice,
                rMainName, rMainCost, rMainPrice, rMainCat,
                nAccs: nAccs, rAccs: rAccs,
                stages: stages,
                shippingCompany: shippingCompany,
                trackingNumber: trackingNumber,
                createdAt: new Date().toISOString(),
                sourceInvoiceId: null,
                sourceInvoiceNum: invoiceNum,
                profitRecorded: false
            };
            window.pendingOrders.push(orderObj);

            if (pendingPayType === 'pay_now_safe') {
                const liveAccounts = getAccounts();
                const acc = liveAccounts.find(a => a.id === accId);
                recordExchangeLiquidity(acc, m(diff), `فرق استبدال مؤجل للعميل [${custNameInput}]`);
                addLogSafe({ timestamp: new Date().toISOString(), type: "دفع آجل لخزنة", details: `تسجيل فرق الاستبدال للعميل [${custNameInput}] في الخزنة`, amount: diff });
            } else if (pendingPayType === 'pay_now_debt') {
                if (diff < 0) {
                    // إذا كان الفرق سالباً (المحل مدين للعميل) يُسجَّل كالتزام وليس ديناً سالباً
                    if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                        const liabId = "LIAB-EX-" + Date.now();
                        liabilities.push({ id: liabId, name: custNameInput, amount: m(Math.abs(diff)), status: 'active', source: 'exchange_credit', orderId: orderObj.id, createdAt: new Date().toISOString() });
                        orderObj.linkedLiabilityId = liabId;
                    }
                    addLogSafe({ timestamp: new Date().toISOString(), type: "التزام استبدال", details: `تسجيل فرق الاستبدال المستحق للعميل [${custNameInput}] كالتزام`, amount: diff });
                } else if (diff > 0) {
                    window.debtors = window.debtors || [];
                    let profileId = undefined;
                    if (typeof debtorProfiles !== 'undefined' && Array.isArray(debtorProfiles)) {
                        let prof = debtorProfiles.find(p => typeof normalizeArabicText === 'function' ? normalizeArabicText(p.name) === normalizeArabicText(custNameInput) : p.name === custNameInput);
                        if (!prof) {
                            prof = { id: (typeof generateId === 'function' ? generateId('dp') : 'dp-' + Date.now()), name: custNameInput, phone: custPhone || '', address: '', notes: '' };
                            debtorProfiles.push(prof);
                        }
                        profileId = prof.id;
                    }
                    const debtId = "DEBT-EX-" + Date.now();
                    window.debtors.push({ id: debtId, customerId: profileId, name: custNameInput, customerName: custNameInput, phone: custPhone, amount: m(diff), reason: "دين استبدال مؤجل", origin: 'exchange_debt', orderId: orderObj.id, createdAt: new Date().toISOString() });
                    orderObj.linkedDebtId = debtId;
                    addLogSafe({ timestamp: new Date().toISOString(), type: "دين استبدال", details: `تسجيل فرق الاستبدال كدين على [${custNameInput}]`, amount: diff });
                }
            } else {
                addLogSafe({ timestamp: new Date().toISOString(), type: "استلام وشحن جديد", details: `استبدال للعميل [${custNameInput}] - الفلوس معلقة`, amount: 0 });
            }
        } else {
            const liveAccounts = getAccounts();
            const acc = liveAccounts.find(a => a.id === accId);
            recordExchangeLiquidity(acc, m(diff), `فرق استبدال فوري للعميل [${custNameInput}]`);
            addLogSafe({ timestamp: new Date().toISOString(), type: "استبدال فوري", details: `استبدال وتحصيل فوري للعميل [${custNameInput}]`, amount: diff });
        }

        if (_tx) _tx.commit();
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
        if (_tx) await _tx.rollback();
        alert("خطأ: " + e.message);
        if(btn) { btn.disabled = false; updateUIState(); }
    }
}

async function finalizeSave() {
    if (window.saveCurrentStateByDate) {
        const savedOk = await window.saveCurrentStateByDate(window.currentLoadedDate, true, { throwOnError: true });
        if (!savedOk) throw new Error('تعذر إتمام الحفظ السحابي لحركة الاستبدال');
        renderLocalPendingOrders();
        if (typeof window.refreshMainUI === 'function') {
            window.refreshMainUI();
        }
    } else {
        console.warn("تنبيه: دالة الحفظ السحابي غير متصلة.");
    }
}
