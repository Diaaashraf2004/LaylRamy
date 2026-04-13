/**
 * نظام الاستبدال وإدارة الفواتير المعلقة (ERP V10.5)
 * التحديث: إصلاح أخطاء الـ Null Pointer وتأمين دوال الحساب لضمان استقرار النظام.
 */

let targetOrderId = null;

const getProducts = () => typeof window.getLiveProducts === 'function' ? window.getLiveProducts() : (window.products || []);
const getAccounts = () => typeof window.getLiveAccounts === 'function' ? window.getLiveAccounts() : (window.accounts || []);

const addLogSafe = (logObj) => {
    if (typeof window.injectLogToMain === 'function') window.injectLogToMain(logObj);
    else if (window.operationLog) window.operationLog.push(logObj);
};

document.addEventListener("DOMContentLoaded", function() {
    window.pendingOrders = window.pendingOrders || [];
    initExchangeSystem();
    setupUndoRedoWatcher();
});

function setupUndoRedoWatcher() {
    document.body.addEventListener('click', function(e) {
        const btnText = (e.target.innerText || e.target.id || '').toLowerCase();
        if (btnText.includes('undo') || btnText.includes('redo') || btnText.includes('تراجع') || btnText.includes('اعادة')) {
            setTimeout(() => {
                // تأمين الاستدعاء: نتحقق أننا في صفحة الاستبدال قبل تشغيل الحسابات
                const panel = document.getElementById('exchange-panel');
                if (panel && !panel.classList.contains('hidden')) {
                    if (typeof runCalc === 'function') runCalc();
                    if (typeof loadInitialData === 'function') loadInitialData();
                }
                if (typeof renderLocalPendingOrders === 'function') renderLocalPendingOrders();
            }, 300);
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
                    <h2 style="color: #2b6cb0; margin: 0;">🔄 نظام الاستبدال وإدارة الفواتير المعلقة (V10.5)</h2>
                    <p style="color: #666; margin: 5px 0;">نظام محاسبي دقيق يفصل بين السيولة النقدية والبضاعة قيد التسليم</p>
                </div>
                
                <div class="delivery-status">
                    حدد حالة تسليم الأجهزة الجديدة والسيولة النقدية:
                    <div class="radio-group" style="margin-top:10px;">
                        <input type="radio" id="del_now" name="delivery_type" value="immediate" checked onchange="updateUIState()">
                        <label for="del_now" style="margin-left: 15px;">📦 تسليم وتحصيل فوري</label>
                        
                        <input type="radio" id="del_later" name="delivery_type" value="pending" onchange="updateUIState()">
                        <label for="del_later">⏳ تسليم مؤجل (شحن بضاعة وتعليق فلوس)</label>
                    </div>
                </div>

                <div class="customer-details" style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border: 1px solid #cbd5e0; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #2d3748;">👤 بيانات العميل</h4>
                    <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div><label style="font-size: 14px;">اسم العميل</label><input type="text" id="ex_customer_name" class="form-control" placeholder="اختياري..."></div>
                        <div><label style="font-size: 14px;">رقم الهاتف</label><input type="text" id="ex_customer_phone" class="form-control" placeholder="اختياري..."></div>
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
                        <div class="item-row" style="margin-top: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
                                <h4 style="margin:0;">🎧 مشتملات مسترجعة</h4>
                                <button type="button" onclick="addAccRow('r')" style="background:#3182ce; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;">+ إضافة مشتمل</button>
                            </div>
                            <div id="r_acc_container"></div>
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
                        <div class="item-row" style="margin-top: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
                                <h4 style="margin:0;">🎧 إضافات مباعة</h4>
                                <button type="button" onclick="addAccRow('n')" style="background:#38a169; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;">+ إضافة ملحق</button>
                            </div>
                            <div id="n_acc_container"></div>
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
                            <thead><tr><th>العميل</th><th>المنتجات المطلوبة</th><th>المبلغ المعلق</th><th>إجراءات</th></tr></thead>
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
                    1. 📦 <b>إرجاع البضاعة الجديدة لمخزنك</b> (إلغاء الحجز).<br>
                    2. 📤 <b>سحب البضاعة المرتجعة من مخزنك</b> (كأنها لم تدخل).<br>
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

window.addAccRow = function(type) {
    const container = document.getElementById(`${type}_acc_container`);
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = `acc-row ${type}-acc-row`;
    row.style.cssText = "display: flex; gap: 8px; margin-top: 10px; align-items: center;";
    
    let catSelect = '';
    if (type === 'r') {
        const catHtml = document.getElementById('r_main_cat') ? document.getElementById('r_main_cat').innerHTML : '<option value="عام">عام</option>';
        catSelect = `<select class="acc-cat form-control" style="width: 25%; padding:4px;">${catHtml}</select>`;
    }

    row.innerHTML = `
        <input list="p-list" class="acc-name form-control" style="width: 40%; padding:4px;" placeholder="اسم الصنف..." onchange="autoFillAccRow(this)">
        <input type="number" class="acc-cost form-control" style="width: 20%; padding:4px;" placeholder="التكلفة" value="0" oninput="runCalc()">
        <input type="number" class="acc-price form-control" style="width: 20%; padding:4px;" placeholder="السعر" value="0" oninput="runCalc()">
        ${catSelect}
        <button type="button" onclick="this.parentElement.remove(); runCalc()" style="background: #fc8181; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size:12px;">❌</button>
    `;
    container.appendChild(row);
};

window.autoFillAccRow = function(input) {
    const val = input.value;
    const liveProducts = getProducts();
    const p = liveProducts.find(i => i && i.name && String(i.name).trim().toLowerCase() === String(val).trim().toLowerCase());
    if (p) {
        const row = input.closest('.acc-row');
        if(row) {
            const costInp = row.querySelector('.acc-cost');
            const priceInp = row.querySelector('.acc-price');
            const catEl = row.querySelector('.acc-cat');
            if(costInp) costInp.value = p.costPrice || 0;
            if(priceInp) priceInp.value = p.price || 0;
            if (catEl && p.category) catEl.value = p.category;
        }
    }
    runCalc();
};

function loadInitialData() {
    const liveProducts = getProducts();
    const liveAccounts = getAccounts();
    const pList = document.getElementById('p-list');
    const rCat = document.getElementById('r_main_cat');
    const accSel = document.getElementById('ex_acc_sel');

    if(pList) pList.innerHTML = liveProducts.map(p => `<option value="${p.name}">`).join('');
    
    const cats = [...new Set(liveProducts.map(p => p.category))].filter(c => c);
    const catHtml = cats.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="عام">عام (صنف جديد)</option>`;
    
    if(rCat) rCat.innerHTML = catHtml;
    
    // تفريغ الحاويات عند التحميل الأولي
    const rAccC = document.getElementById('r_acc_container');
    const nAccC = document.getElementById('n_acc_container');
    if(rAccC) rAccC.innerHTML = '';
    if(nAccC) nAccC.innerHTML = '';
    
    if(accSel) accSel.innerHTML = liveAccounts.map(a => `<option value="${a.id}">${a.name} (رصيد: ${a.balance.toFixed(2)})</option>`).join('');
}

function renderLocalPendingOrders() {
    const tbody = document.querySelector('#local-pending-table tbody');
    if(!tbody) return;

    if (!window.pendingOrders || window.pendingOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#a0aec0;">لا توجد فواتير معلقة حالياً.</td></tr>`;
        return;
    }
    tbody.innerHTML = window.pendingOrders.map(o => `
        <tr>
            <td style="font-weight:bold; color:#2b6cb0;">${o.customerName || 'عميل استبدال'}</td>
            <td style="font-size:14px;">${o.itemsDesc}</td>
            <td style="font-weight:bold; color:${o.diffAmount > 0 ? '#48bb78' : (o.diffAmount < 0 ? '#e53e3e' : '#333')};" dir="ltr">
                ${o.diffAmount > 0 ? '+'+o.diffAmount : o.diffAmount} ج.م
            </td>
            <td>
                <button class="btn-action btn-confirm" onclick="confirmPendingOrder('${o.id}')">✔️ تحصيل</button>
                <button class="btn-action btn-edit" onclick="openExModalEdit('${o.id}')">✏️ تعديل</button>
                <button class="btn-action btn-cancel" onclick="openExModalCancel('${o.id}')">❌ إلغاء</button>
            </td>
        </tr>
    `).join('');
}

function updateUIState() {
    const delLaterEl = document.getElementById('del_later');
    const btn = document.getElementById('exec_btn');
    if(!delLaterEl || !btn) return;

    const isPending = delLaterEl.checked;
    if(isPending) {
        btn.style.background = "#ecc94b"; btn.style.color = "#1a202c"; btn.innerHTML = "حفظ كطلب معلق وتأجيل التحصيل ⏳";
    } else {
        btn.style.background = "#2b6cb0"; btn.style.color = "#fff"; btn.innerHTML = "اعتماد وتسجيل بالخزنة فوراً ✅";
    }
}

function autoFill(prefix) {
    const nameInput = document.getElementById(`${prefix}_name`);
    if(!nameInput) return;

    const val = nameInput.value;
    const liveProducts = getProducts();
    const p = liveProducts.find(i => i && i.name && String(i.name).trim().toLowerCase() === String(val).trim().toLowerCase());
    if (p) {
        const costEl = document.getElementById(`${prefix}_cost`);
        const priceEl = document.getElementById(`${prefix}_price`);
        const catEl = document.getElementById(`${prefix}_cat`);
        
        if(costEl) costEl.value = p.costPrice || 0;
        if(priceEl) priceEl.value = p.price || 0;
        if(catEl) catEl.value = p.category || "عام";
    }
    runCalc();
}

/**
 * دالة الحساب المحدثة مع تأمين ضد أخطاء الـ Null
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
                p.quantity = (Number(p.quantity) || 0) - 1;
            } else {
                const newP = { id: "N-"+Date.now(), name: String(name).trim(), category: "عام", quantity: -1, costPrice: Number(cost) || 0, price: Number(price) || 0 };
                if (typeof window.injectProductToMain === 'function') window.injectProductToMain(newP); 
                else liveProducts.push(newP);
            }
        };
        processReturn(rMainName, rMainCost, rMainPrice, rMainCat); 
        rAccs.forEach(a => processReturn(a.name, a.cost, a.price, a.cat));

        processOut(nMainName, nMainCost, nMainPrice); 
        nAccs.forEach(a => processOut(a.name, a.cost, a.price));

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

        if (itemsToSell.length > 0) {
            const saleObj = {
                id: "EX-SALE-" + Date.now(),
                type: 'exchange',
                timestamp: new Date().toISOString(),
                saleDate: (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate) ? window.currentLoadedDate : new Date().toISOString().split('T')[0],
                date: (typeof window.currentLoadedDate !== 'undefined' && window.currentLoadedDate) ? window.currentLoadedDate : new Date().toISOString().split('T')[0],
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

            if (typeof window.injectSaleToMain === 'function') window.injectSaleToMain(saleObj);
            
            if (typeof window.saveInvoiceToFirestore === 'function') {
                try { await window.saveInvoiceToFirestore(saleObj); } catch(e) { }
            }
        }

        if (isPending && itemsToSell.length > 0) {
            window.pendingOrders.push({
                id: "ORD-" + Math.floor(Math.random()*10000),
                customerName: taggedCustomerName,
                customerPhone: custPhone,
                itemsDesc: itemsDescStr,
                diffAmount: diff, accId: accId,
                nMainName, nMainCost, nMainPrice,
                rMainName, rMainCost, rMainPrice,
                nAccs: nAccs, rAccs: rAccs
            });
            addLogSafe({ timestamp: new Date().toISOString(), type: "استلام وشحن جديد", details: `استبدال للعميل [${custNameInput}] - الفلوس معلقة`, amount: 0 });
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

function closeExModals() {
    const editM = document.getElementById('ex-modal-edit');
    const cancelM = document.getElementById('ex-modal-cancel');
    if(editM) editM.style.display = 'none';
    if(cancelM) cancelM.style.display = 'none';
    targetOrderId = null;
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
        if (totalCostOut > 0 && typeof updateCapital === 'function') {
            updateCapital(totalCostOut);
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
                    id: "TEMP-" + Date.now() + Math.floor(Math.random()*100), 
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
        if (totalCostOut > 0 && typeof updateCapital === 'function') {
            updateCapital(totalCostOut);
        }

        // 3. سحب قيمة الأجهزة المرتجعة للعميل من حساب المحل (لأنه هياخد فلوسه ويمشي)
        let payoutAmount = Number(o.rMainPrice) || 0;
        if(o.rAccs) o.rAccs.forEach(a => payoutAmount += (Number(a.price) || 0));

        const liveAccounts = getAccounts();
        const acc = liveAccounts.find(a => a.id === accId);
        if(acc) acc.balance = (Number(acc.balance)||0) - payoutAmount;
        
        addLogSafe({ timestamp: new Date().toISOString(), type: "تحويل لاسترجاع", details: `العميل [${cleanName}] صرف مبلغ أجهزته المرتجعة`, amount: -payoutAmount });
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
    
    let cleanName = o.customerName || '';
    if (cleanName.includes(' (عميل استبدال 🔄)')) cleanName = cleanName.replace(' (عميل استبدال 🔄)', '');
    
    const accSelEl = document.getElementById('ex_acc_sel');
    if(!accSelEl) return;

    const accId = accSelEl.value;
    triggerUndoSave();
    const liveAccounts = getAccounts();
    const acc = liveAccounts.find(a => a.id === accId);
    if(acc) acc.balance = (Number(acc.balance)||0) + o.diffAmount;
    addLogSafe({ timestamp: new Date().toISOString(), type: "إتمام تحصيل", details: `تحصيل مبلغ استبدال العميل [${cleanName}]`, amount: o.diffAmount });
    window.pendingOrders.splice(orderIndex, 1);
    await finalizeSave();
};

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
                id: "TEMP-" + Date.now() + Math.floor(Math.random()*1000), 
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
        if(p) p.quantity = (Number(p.quantity)||0) - 1; 
    };
    
    // إرجاع الجديد للمخزن (مع تمرير التكلفة والسعر لضمان حفظهم في حال كان المنتج مؤقتاً)
    addBack(o.nMainName, o.nMainCost, o.nMainPrice);
    if (o.nAccs) o.nAccs.forEach(a => addBack(a.name, a.cost, a.price)); 

    // سحب المرتجع من المخزن (لأنه سيعود للعميل)
    takeOut(o.rMainName);
    if (o.rAccs) o.rAccs.forEach(a => takeOut(a.name));
}
async function finalizeSave() {
    if (window.saveCurrentStateByDate) {
        await window.saveCurrentStateByDate(window.currentLoadedDate);
        renderLocalPendingOrders();
        if (typeof window.refreshMainUI === 'function') {
            window.refreshMainUI();
        }
    } else {
        console.warn("تنبيه: دالة الحفظ السحابي غير متصلة.");
    }
}