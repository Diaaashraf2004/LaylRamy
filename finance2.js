/**
 * نظام الاستبدال وإدارة الفواتير المعلقة (ERP V9.6)
 * مرتبط ببرنامج drashraf للإنتاج المباشر - (مدمج مع نظام التراجع Undo/Redo)
 * تم إصلاح خطأ الأقواس البرمجية لضمان ظهور القسم
 */

let targetOrderId = null;

document.addEventListener("DOMContentLoaded", function() {
    // تهيئة مصفوفة الفواتير المعلقة إذا لم تكن موجودة
    window.pendingOrders = window.pendingOrders || [];
    initExchangeSystem();
    setupUndoRedoWatcher(); // 🌟 تشغيل مراقب التراجع
});

// 🌟 مراقب ذكي لالتقاط ضغطات Undo/Redo في البرنامج الأساسي وتحديث شاشة الاستبدال
function setupUndoRedoWatcher() {
    document.body.addEventListener('click', function(e) {
        const btnText = (e.target.innerText || e.target.id || '').toLowerCase();
        if (btnText.includes('undo') || btnText.includes('redo') || btnText.includes('تراجع') || btnText.includes('اعادة')) {
            setTimeout(() => {
                if (typeof runCalc === 'function') runCalc();
                if (typeof renderLocalPendingOrders === 'function') renderLocalPendingOrders();
                loadInitialData(); 
            }, 300); // تأخير بسيط لضمان أن البرنامج الأساسي أرجع البيانات
        }
    });
}

function initExchangeSystem() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    if (!document.getElementById('exchange-btn')) {
        const btn = document.createElement('button');
        btn.id = 'exchange-btn';
        btn.className = 'nav-button';
        btn.style.cssText = "border-right: 5px solid #2b6cb0 !important; background: #ebf8ff; font-weight: bold; color: #2b6cb0;";
        btn.innerHTML = "🔄 استبدال وتسليم";
        
        nav.addEventListener('click', (e) => {
            const clicked = e.target.closest('.nav-button');
            if (clicked && clicked.id !== 'exchange-btn') {
                const panel = document.getElementById('exchange-panel');
                if (panel) panel.classList.add('hidden');
                btn.classList.remove('active');
            }
        });

        btn.onclick = openExchangePanel;
        nav.appendChild(btn);
    }
}

function openExchangePanel() {
    document.querySelectorAll('.content-section, .tab-content').forEach(s => s.classList.add('hidden'));
    const mainArea = document.getElementById('content-area');
    let panel = document.getElementById('exchange-panel');

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'exchange-panel';
        panel.className = 'content-section'; 
        mainArea.insertBefore(panel, mainArea.firstChild);
    }

    panel.classList.remove('hidden');
    document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
    document.getElementById('exchange-btn').classList.add('active');

    window.pendingOrders = window.pendingOrders || [];
    
    renderExchangeUI(panel);
    loadInitialData();
    renderLocalPendingOrders();
}

function renderExchangeUI(panel) {
    panel.innerHTML = `
        <div class="exchange-container">
            <div class="exchange-card">
                <div class="exchange-header">
                    <h2 style="color: #2b6cb0; margin: 0;">🔄 نظام الاستبدال وإدارة الفواتير المعلقة (ERP)</h2>
                    <p style="color: #666; margin: 5px 0;">نظام محاسبي دقيق يفصل بين السيولة النقدية والبضاعة قيد التسليم</p>
                </div>
                
                <div class="delivery-status">
                    حدد حالة تسليم الأجهزة الجديدة والسيولة النقدية:
                    <div class="radio-group">
                        <input type="radio" id="del_now" name="delivery_type" value="immediate" checked onchange="updateUIState()">
                        <label for="del_now">📦 تسليم وتحصيل فوري</label>
                        
                        <input type="radio" id="del_later" name="delivery_type" value="pending" onchange="updateUIState()">
                        <label for="del_later">⏳ تسليم مؤجل (شحن بضاعة وتعليق فلوس)</label>
                    </div>
                </div>
                
                <div class="exchange-grid">
                    <div class="box-panel return-side">
                        <h3 class="side-title">📥 البضاعة المستلمة (مرتجعات)</h3>
                        <div class="item-row">
                            <h4>📱 الجهاز الأساسي</h4>
                            <input list="p-list" id="r_main_name" class="form-control" placeholder="اسم الجهاز..." onchange="autoFill('r_main')">
                            <div class="grid-2" style="margin-top:10px;">
                                <div class="input-group"><label>تكلفة المخزن:</label><input type="number" id="r_main_cost" class="form-control" value="0" oninput="runCalc()"></div>
                                <div class="input-group"><label>سعر استرداد:</label><input type="number" id="r_main_price" class="form-control" value="0" oninput="runCalc()"></div>
                            </div>
                            <select id="r_main_cat" class="form-control" style="margin-top:5px;"></select>
                        </div>
                        <div class="item-row">
                            <h4>🎧 مشتملات مسترجعة (اختياري)</h4>
                            <input list="p-list" id="r_acc_name" class="form-control" placeholder="اسم الإكسسوار..." onchange="autoFill('r_acc')">
                            <div class="grid-2" style="margin-top:10px;">
                                <div class="input-group"><label>تكلفة المخزن:</label><input type="number" id="r_acc_cost" class="form-control" value="0" oninput="runCalc()"></div>
                                <div class="input-group"><label>سعر استرداد:</label><input type="number" id="r_acc_price" class="form-control" value="0" oninput="runCalc()"></div>
                            </div>
                            <select id="r_acc_cat" class="form-control" style="margin-top:5px;"></select>
                        </div>
                    </div>

                    <div class="box-panel new-side">
                        <h3 class="side-title">📤 البضاعة الصادرة (الجديدة)</h3>
                        <div class="item-row">
                            <h4>📱 الجهاز الجديد</h4>
                            <input list="p-list" id="n_main_name" class="form-control" placeholder="اسم الجهاز..." onchange="autoFill('n_main')">
                            <div class="grid-2" style="margin-top:10px;">
                                <div class="input-group"><label>تكلفة المخزن:</label><input type="number" id="n_main_cost" class="form-control" value="0" oninput="runCalc()"></div>
                                <div class="input-group"><label>سعر البيع:</label><input type="number" id="n_main_price" class="form-control" value="0" oninput="runCalc()"></div>
                            </div>
                        </div>
                        <div class="item-row">
                            <h4>🎧 إضافات مباعة (اختياري)</h4>
                            <input list="p-list" id="n_acc_name" class="form-control" placeholder="اسم الإكسسوار..." onchange="autoFill('n_acc')">
                            <div class="grid-2" style="margin-top:10px;">
                                <div class="input-group"><label>تكلفة المخزن:</label><input type="number" id="n_acc_cost" class="form-control" value="0" oninput="runCalc()"></div>
                                <div class="input-group"><label>سعر البيع:</label><input type="number" id="n_acc_price" class="form-control" value="0" oninput="runCalc()"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <datalist id="p-list"></datalist>

                <div class="profit-analysis">
                    <div class="profit-box"><div class="profit-title">الربح الملغى</div><div id="v_old_prof" class="profit-val text-red">0</div></div>
                    <div class="profit-box" style="border: 2px solid #3182ce;"><div class="profit-title">المبلغ (تحصيل/صرف)</div><div id="v_diff" class="profit-val text-blue" style="font-size: 1.5rem;">0</div></div>
                    <div class="profit-box"><div class="profit-title">الربح الجديد</div><div id="v_new_prof" class="profit-val text-green">0</div></div>
                </div>

                <div class="finance-confirm">
                    <select id="ex_acc_sel" class="form-control" style="height: 45px; margin-bottom: 15px;"></select>
                    <button onclick="executeTransaction()" id="exec_btn" class="main-exec-btn">اعتماد العملية ✅</button>
                </div>

                <div class="pending-section">
                    <h3>⏳ فواتير وطلبيات في الطريق (خصمت البضاعة وبانتظار التحصيل)</h3>
                    <div style="overflow-x: auto;">
                        <table class="pending-table" id="local-pending-table">
                            <thead><tr><th>المنتجات المطلوبة</th><th>المبلغ المعلق</th><th>إجراءات</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div id="ex-modal-edit" class="ex-modal-overlay">
            <div class="ex-modal-content">
                <div class="ex-modal-header" style="color: #d69e2e;">✏️ تأكيد فتح الفاتورة للتعديل</div>
                <div class="ex-modal-body">
                    سيقوم النظام مؤقتاً بـ:<br><br>
                    1. 📦 <b>إرجاع الجهاز الجديد لمخزنك</b> (إلغاء الحجز).<br>
                    2. 📤 <b>سحب الجهاز المرتجع من مخزنك</b> (كأنه لم يدخل).<br>
                    3. 📝 تعبئة الخانات لتتمكن من تغيير الأسعار أو الأصناف لتسجيلها من جديد.<br>
                </div>
                <div class="ex-modal-footer">
                    <button class="ex-btn-modal ex-btn-close" onclick="closeExModals()">تراجع</button>
                    <button class="ex-btn-modal btn-edit" onclick="executeEditOrder()">نعم، افتح للتعديل</button>
                </div>
            </div>
        </div>

        <div id="ex-modal-cancel" class="ex-modal-overlay">
            <div class="ex-modal-content">
                <div class="ex-modal-header" style="color: #e53e3e;">❌ إلغاء الفاتورة المعلقة</div>
                <div class="ex-modal-body">
                    <label class="cancel-option">
                        <input type="radio" name="cancel_type" value="revert_all" checked>
                        <span class="cancel-title">🔄 إلغاء شامل (تراجع تام)</span>
                        <span class="cancel-desc">العميل ألغى الفكرة. سيرد له جهازه المرتجع، ويعود جهازك الجديد للمخزن. (لا تأثير مالي).</span>
                    </label>
                    <label class="cancel-option" style="border-color: #fc8181; background: #fff5f5;">
                        <input type="radio" name="cancel_type" value="convert_return">
                        <span class="cancel-title">💵 تحويل إلى "استرجاع فقط" (دفع للعميل)</span>
                        <span class="cancel-desc">العميل ترك جهازه القديم عندك ورفض الجديد، ويطلب أخذ قيمة جهازه القديم نقداً.</span>
                    </label>
                </div>
                <div class="ex-modal-footer">
                    <button class="ex-btn-modal ex-btn-close" onclick="closeExModals()">تراجع</button>
                    <button class="ex-btn-modal btn-cancel" onclick="executeCancelOrder()">تأكيد وتنفيذ</button>
                </div>
            </div>
        </div>
    `;
}

function loadInitialData() {
    const products = window.products || [];
    const accounts = window.accounts || [];
    document.getElementById('p-list').innerHTML = products.map(p => `<option value="${p.name}">`).join('');
    const cats = [...new Set(products.map(p => p.category))].filter(c => c);
    const catHtml = cats.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="عام">عام (صنف جديد)</option>`;
    document.getElementById('r_main_cat').innerHTML = catHtml;
    document.getElementById('r_acc_cat').innerHTML = catHtml;
    document.getElementById('ex_acc_sel').innerHTML = accounts.map(a => `<option value="${a.id}">${a.name} (رصيد: ${a.balance.toFixed(2)})</option>`).join('');
}

function renderLocalPendingOrders() {
    const tbody = document.querySelector('#local-pending-table tbody');
    if (!window.pendingOrders || window.pendingOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#a0aec0;">لا توجد فواتير معلقة حالياً.</td></tr>`;
        return;
    }
    tbody.innerHTML = window.pendingOrders.map(o => `
        <tr>
            <td>${o.itemsDesc}</td>
            <td style="font-weight:bold; color:${o.diffAmount > 0 ? '#48bb78' : (o.diffAmount < 0 ? '#e53e3e' : '#333')};" dir="ltr">
                ${o.diffAmount > 0 ? '+'+o.diffAmount : o.diffAmount} ج.م
            </td>
            <td>
                <button class="btn-action btn-confirm" onclick="confirmPendingOrder('${o.id}')">✔️ تحصيل الفلوس</button>
                <button class="btn-action btn-edit" onclick="openExModalEdit('${o.id}')">✏️ تعديل</button>
                <button class="btn-action btn-cancel" onclick="openExModalCancel('${o.id}')">❌ إلغاء</button>
            </td>
        </tr>
    `).join('');
}

function updateUIState() {
    const isPending = document.getElementById('del_later').checked;
    const btn = document.getElementById('exec_btn');
    if(isPending) {
        btn.style.background = "#ecc94b"; btn.style.color = "#1a202c"; btn.innerHTML = "حفظ كطلب معلق وتأجيل التحصيل ⏳";
    } else {
        btn.style.background = "#2b6cb0"; btn.style.color = "#fff"; btn.innerHTML = "اعتماد وتسجيل بالخزنة فوراً ✅";
    }
}

function autoFill(prefix) {
    const val = document.getElementById(`${prefix}_name`).value;
    const p = (window.products || []).find(i => i.name === val);
    if (p) {
        document.getElementById(`${prefix}_cost`).value = p.costPrice || 0;
        document.getElementById(`${prefix}_price`).value = p.price || 0;
        if(document.getElementById(`${prefix}_cat`)) document.getElementById(`${prefix}_cat`).value = p.category || "عام";
    }
    runCalc();
}

function runCalc() {
    const getV = (id) => parseFloat(document.getElementById(id).value) || 0;
    const rCost = getV('r_main_cost') + getV('r_acc_cost'), rPrice = getV('r_main_price') + getV('r_acc_price');
    const nCost = getV('n_main_cost') + getV('n_acc_cost'), nPrice = getV('n_main_price') + getV('n_acc_price');
    const diff = nPrice - rPrice;
    document.getElementById('v_old_prof').innerText = (rPrice - rCost).toFixed(2);
    document.getElementById('v_new_prof').innerText = (nPrice > 0) ? (nPrice - nCost).toFixed(2) : "0.00";
    document.getElementById('v_diff').innerText = diff > 0 ? "تحصيل " + diff : (diff < 0 ? "صرف " + Math.abs(diff) : "0.00");
}

function triggerUndoSave() {
    if (typeof window.saveState === 'function') {
        window.saveState();
        console.log("📸 تم أخذ لقطة تراجع بنجاح.");
    } else {
        console.warn("⚠️ دالة حفظ الحالة غير متصلة بالجسر.");
    }
}

async function executeTransaction() {
    const isPending = document.getElementById('del_later').checked;
    const accId = document.getElementById('ex_acc_sel').value;
    
    const rMainName = document.getElementById('r_main_name').value, rMainCost = parseFloat(document.getElementById('r_main_cost').value) || 0, rMainPrice = parseFloat(document.getElementById('r_main_price').value) || 0, rMainCat = document.getElementById('r_main_cat')?.value || 'عام';
    const rAccName = document.getElementById('r_acc_name').value, rAccCost = parseFloat(document.getElementById('r_acc_cost').value) || 0, rAccPrice = parseFloat(document.getElementById('r_acc_price').value) || 0, rAccCat = document.getElementById('r_acc_cat')?.value || 'عام';
    const nMainName = document.getElementById('n_main_name').value, nMainCost = parseFloat(document.getElementById('n_main_cost').value) || 0, nMainPrice = parseFloat(document.getElementById('n_main_price').value) || 0;
    const nAccName = document.getElementById('n_acc_name').value, nAccCost = parseFloat(document.getElementById('n_acc_cost').value) || 0, nAccPrice = parseFloat(document.getElementById('n_acc_price').value) || 0;

    const diff = (nMainPrice + nAccPrice) - (rMainPrice + rAccPrice);

    if (!rMainName && !nMainName) return alert("يرجى إدخال بيانات العملية");

    const btn = document.getElementById('exec_btn');
    btn.disabled = true; btn.innerHTML = "⏳ جاري التحديث السحابي...";

    try {
        triggerUndoSave();

        const processReturn = (name, cost, price, cat) => {
            if(!name) return; let p = window.products.find(x => x.name === name);
            if(!p) window.products.push({ id: "R-"+Date.now(), name, category: cat, quantity: 1, costPrice: cost, price: price });
            else { p.quantity = (Number(p.quantity)||0) + 1; p.costPrice = cost; }
        };
        const processOut = (name, cost, price) => {
            if(!name) return; let p = window.products.find(x => x.name === name);
            if(!p) window.products.push({ id: "N-"+Date.now(), name, category: "عام", quantity: -1, costPrice: cost, price: price });
            else p.quantity = (Number(p.quantity)||0) - 1;
        };

        processReturn(rMainName, rMainCost, rMainPrice, rMainCat); 
        processReturn(rAccName, rAccCost, rAccPrice, rAccCat);
        processOut(nMainName, nMainCost, nMainPrice); 
        processOut(nAccName, nAccCost, nAccPrice);

        if (isPending && (nMainName || nAccName)) {
            window.pendingOrders.push({
                id: "ORD-" + Math.floor(Math.random()*10000),
                itemsDesc: `${nMainName} ${nAccName ? '+ '+nAccName : ''}`,
                expectedProfit: (nMainPrice + nAccPrice) - (nMainCost + nAccCost), diffAmount: diff, accId: accId,
                nMainName, nMainCost, nMainPrice, nAccName, nAccCost, nAccPrice, rMainName, rMainCost, rMainPrice, rAccName, rAccCost, rAccPrice 
            });
            window.operationLog.push({ timestamp: new Date().toISOString(), type: "استلام مرتجع وشحن جديد", details: `استلام وتسليم [${nMainName}] - الفلوس معلقة`, amount: 0 });
        } else {
            const acc = window.accounts.find(a => a.id === accId);
            if(acc) acc.balance = (Number(acc.balance)||0) + diff;
            window.operationLog.push({ timestamp: new Date().toISOString(), type: "استبدال فوري", details: `استلام [${rMainName}] -- تسليم [${nMainName}] وتحصيل`, amount: diff });
        }

        await finalizeSave();

        ['r_main', 'r_acc', 'n_main', 'n_acc'].forEach(p => {
            document.getElementById(`${p}_name`).value = '';
            document.getElementById(`${p}_cost`).value = '0';
            document.getElementById(`${p}_price`).value = '0';
        });
        runCalc();
        updateUIState();
        btn.disabled = false;

    } catch (e) {
        alert("خطأ: " + e.message);
        btn.disabled = false; updateUIState();
    }
}

function closeExModals() {
    document.getElementById('ex-modal-edit').style.display = 'none';
    document.getElementById('ex-modal-cancel').style.display = 'none';
    targetOrderId = null;
}

window.openExModalEdit = function(id) {
    targetOrderId = id;
    document.getElementById('ex-modal-edit').style.display = 'flex';
};

window.openExModalCancel = function(id) {
    targetOrderId = id;
    document.getElementById('ex-modal-cancel').style.display = 'flex';
};

async function executeEditOrder() {
    if(!targetOrderId) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === targetOrderId);
    if(orderIndex === -1) return closeExModals();
    const o = window.pendingOrders[orderIndex];
    triggerUndoSave();
    revertInventoryEffect(o);
    ['r_main', 'r_acc', 'n_main', 'n_acc'].forEach(p => {
        if(o[`${p}Name`]) {
            document.getElementById(`${p}_name`).value = o[`${p}Name`];
            document.getElementById(`${p}_cost`).value = o[`${p}Cost`];
            document.getElementById(`${p}_price`).value = o[`${p}Price`];
        }
    });
    document.getElementById('del_later').checked = true;
    updateUIState(); runCalc();
    window.operationLog.push({ timestamp: new Date().toISOString(), type: "مسودة تعديل", details: `إلغاء حجز [${o.itemsDesc}] للتعديل`, amount: 0 });
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
    const accId = document.getElementById('ex_acc_sel').value;
    const cancelType = document.querySelector('input[name="cancel_type"]:checked').value;
    triggerUndoSave();
    if (cancelType === "revert_all") {
        revertInventoryEffect(o);
        window.operationLog.push({ timestamp: new Date().toISOString(), type: "إلغاء شامل", details: `إلغاء شحنة [${o.itemsDesc}] ورد الأجهزة لأصحابها`, amount: 0 });
    } else if (cancelType === "convert_return") {
        const addBack = (name) => { let p = window.products.find(x => x.name === name); if(p) p.quantity = (Number(p.quantity)||0) + 1; };
        addBack(o.nMainName); addBack(o.nAccName);
        const payoutAmount = (o.rMainPrice + o.rAccPrice);
        const acc = window.accounts.find(a => a.id === accId);
        if(acc) acc.balance = (Number(acc.balance)||0) - payoutAmount;
        window.operationLog.push({ timestamp: new Date().toISOString(), type: "تحويل لاسترجاع", details: `العميل ترك [${o.rMainName}] وصرفنا مبلغه`, amount: -payoutAmount });
    }
    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
    closeExModals();
}

window.confirmPendingOrder = async function(id) {
    if(!confirm("تأكيد التسليم للعميل وتحصيل الفلوس بالخزنة؟")) return;
    const orderIndex = window.pendingOrders.findIndex(o => o.id === id);
    if(orderIndex === -1) return;
    const o = window.pendingOrders[orderIndex];
    const accId = document.getElementById('ex_acc_sel').value;
    triggerUndoSave();
    const acc = window.accounts.find(a => a.id === accId);
    if(acc) acc.balance = (Number(acc.balance)||0) + o.diffAmount;
    window.operationLog.push({ timestamp: new Date().toISOString(), type: "إتمام تحصيل", details: `تسليم [${o.itemsDesc}] للعميل وتحصيل المبلغ`, amount: o.diffAmount });
    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
};

function revertInventoryEffect(o) {
    const addBack = (name) => { let p = window.products.find(x => x.name === name); if(p) p.quantity = (Number(p.quantity)||0) + 1; };
    const takeOut = (name) => { let p = window.products.find(x => x.name === name); if(p) p.quantity = (Number(p.quantity)||0) - 1; };
    addBack(o.nMainName); addBack(o.nAccName);
    takeOut(o.rMainName); takeOut(o.rAccName);
}

async function finalizeSave() {
    if (window.saveCurrentStateByDate) {
        await window.saveCurrentStateByDate(window.currentLoadedDate);
        renderLocalPendingOrders();
        if (typeof window.refreshMainUI === 'function') {
            window.refreshMainUI();
        }
    } else {
        alert("تنبيه: دالة الحفظ السحابي غير متصلة.");
    }
}