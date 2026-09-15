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
                const _oldQty = Number(p.quantity) - 1; // qty was already incremented
                p.costPrice = _oldQty > 0 ? ((_oldQty * Number(p.costPrice)) + Number(cost)) / Number(p.quantity) : Number(cost) || 0;
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

    const accId = (o && o.accId ? o.accId : accSelEl.value);
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

    const accId = (o && o.accId ? o.accId : accSelEl.value);
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
// Auto-select current month for expenses report on load
document.addEventListener('DOMContentLoaded', () => {
    const m = document.getElementById('exp-report-month-year');
    if (m && !m.value) {
        const t = new Date();
        m.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0');
    }
});


// =========================================
// المصروفات - منقول لزيادة السرعة
// =========================================
window.generateExpensesReportExternal = async function(deps) {
    const { showMessage, formatCurrency, getTodayDateString, currentLoadedDate, operationLog, liquidityLog, formatDateForDisplay } = deps;
    const monthInput = document.getElementById('exp-report-month-year');
    const messageEl = document.getElementById('exp-report-message');
    const tableBody = document.getElementById('expenses-report-table-body');
    const summaryContainer = document.getElementById('exp-report-summary-container');
    const summaryTotalEl = document.getElementById('exp-report-summary-total');

    if (!monthInput || !messageEl || !tableBody || !summaryTotalEl || !summaryContainer) return;

    const yearMonth = monthInput.value;
    if (!yearMonth) {
        showMessage(messageEl, "يرجى اختيار الشهر والسنة.", true);
        return;
    }
    
    // Auto-update UI on state changes by hooking into updateUI
    if (!window._expenseHookAdded) {
        const origUpdateUI = window.updateUI;
        window.updateUI = function() {
            if (origUpdateUI) origUpdateUI();
            if (!document.getElementById('expenses-report-section').classList.contains('hidden')) {
                generateExpensesReport();
            }
        };
        window._expenseHookAdded = true;
    }

    if (window.cachedCloudExpenses && window.cachedCloudExpenses.month === yearMonth && !window._forceRefreshExpenses) {
        // Use cache
        processExpensesData(window.cachedCloudExpenses.data, yearMonth);
        return;
    }
    window._forceRefreshExpenses = false;

    showMessage(messageEl, `جاري جلب وتحليل المصروفات...`, false, true);
    summaryContainer.classList.add('hidden');
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-4"><i class="fas fa-spinner fa-spin"></i> جاري معالجة البيانات...</td></tr>`;

    setTimeout(async () => {
        try {
            const userId = window.currentUser ? window.currentUser.uid : null;
            if(!userId) return;
            
            const daysRef = window.collection(window.db, "users", userId, "days");
            const q = window.query(
                daysRef,
                window.where(firebase.firestore.FieldPath.documentId(), ">=", yearMonth),
                window.where(firebase.firestore.FieldPath.documentId(), "<=", yearMonth + "\uf8ff")
            );
            const daysSnapshot = await window.getDocs(q);

            let allCloudDays = [];

            daysSnapshot.forEach(doc => {
                const dateStr = doc.id; // YYYY-MM-DD
                if (dateStr.startsWith(yearMonth)) {
                    allCloudDays.push({ date: dateStr, ...doc.data() });
                }
            });

            window.cachedCloudExpenses = {
                month: yearMonth,
                data: allCloudDays
            };

            processExpensesData(allCloudDays, yearMonth);

        } catch (error) {
            console.error("Error fetching expenses:", error);
            showMessage(messageEl, "حدث خطأ أثناء جلب البيانات السحابية.", true);
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">فشل تحميل البيانات.</td></tr>';
        }
    }, 100);

    function processExpensesData(cloudDays, targetMonth) {
        const extractAmountFromText = (text) => {
            if (!text || typeof text !== 'string') return 0;
            let cleanText = text.replace('جنيه', '').replace('EGP', '');
            const regex = /(?:بقيمة|سحب|خصم|مبلغ|بدفع|دفع|تسديد)\s*([\d,]+(?:\.\d+)?)/;
            const match = cleanText.match(regex);
            if (match && match[1]) return parseFloat(match[1].replace(/,/g, ''));
            const startMatch = cleanText.match(/^([\d,]+(?:\.\d+)?)/);
            if (startMatch && startMatch[1]) return parseFloat(startMatch[1].replace(/,/g, ''));
            return 0;
        };

        const todayStr = (typeof getTodayDateString === 'function') ? getTodayDateString() : (typeof currentLoadedDate !== 'undefined' && currentLoadedDate ? currentLoadedDate : new Date().toISOString().split('T')[0]);
        
        // Merge cloud days with local day if they match the month
        let mergedDays = [...cloudDays];
        if (todayStr.startsWith(targetMonth)) {
            const cloudDayIndex = mergedDays.findIndex(d => d.date === todayStr);
            const localDayData = {
                date: todayStr,
                log: typeof operationLog !== 'undefined' ? operationLog : [],
                liquidityLog: typeof liquidityLog !== 'undefined' ? liquidityLog : []
            };
            if (cloudDayIndex !== -1) {
                mergedDays[cloudDayIndex] = localDayData;
            } else {
                mergedDays.push(localDayData);
            }
        }

        let allExpenses = [];

        mergedDays.forEach(dayData => {
            if (!dayData.date.startsWith(targetMonth)) return;
            const entryDate = dayData.date;

            // 1. Extract from legacy operationLog (data.log)
            if (dayData.log && Array.isArray(dayData.log)) {
                dayData.log.forEach(logEntry => {
                    const type = logEntry.type || "";
                    const details = logEntry.details || "";

                    const isExpense = 
                        type.includes("مصروف") || 
                        type.includes("سحب") || 
                        details.includes("مصروف") || 
                        details.includes("سحب") ||
                        details.includes("فاتورة شراء");

                    const isRefund = type.includes("add") || details.includes("استرداد") || details.includes("إلغاء") || type.includes("ترحيل");

                    if (isExpense && !isRefund) {
                        const amount = extractAmountFromText(details);
                        if (amount > 0) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: type,
                                details: details,
                                amount: amount,
                                source: dayData.date === todayStr ? 'local' : 'cloud'
                            });
                        }
                    }
                });
            }

            // 2. Extract from modern liquidityLog with isExpense flag
            if (dayData.liquidityLog && Array.isArray(dayData.liquidityLog)) {
                dayData.liquidityLog.forEach(logEntry => {
                    if (logEntry.isExpense === true) {
                        const amount = Number(logEntry.amount) || extractAmountFromText(logEntry.description) || 0;
                        if (amount > 0) {
                            allExpenses.push({
                                date: entryDate,
                                timestamp: logEntry.timestamp || entryDate,
                                type: 'تسديد التزام',
                                details: logEntry.description || '',
                                amount: amount,
                                source: dayData.date === todayStr ? 'local' : 'cloud',
                                isVerified: true
                            });
                        }
                    }
                });
            }
        });

        // Remove exact duplicates
        let uniqueExpenses = [];
        let seenKeys = new Set();
        allExpenses.forEach(exp => {
            const key = `${exp.amount}_${exp.details.trim()}_${exp.date}`;
            if (!seenKeys.has(key)) {
                uniqueExpenses.push(exp);
                seenKeys.add(key);
            }
        });

        uniqueExpenses.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        let totalAmount = 0;
        tableBody.innerHTML = '';
        
        if (uniqueExpenses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-4">لا توجد مصروفات أو مسحوبات مسجلة في هذا الشهر.</td></tr>`;
        } else {
            uniqueExpenses.forEach(exp => {
                totalAmount += exp.amount;
                let timeStr = "";
                try {
                    timeStr = new Date(exp.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
                } catch(e){ console.warn('Could not parse pending-sale date:', e); }

                const tr = document.createElement('tr');
                tr.className = 'expense-row border-b hover:bg-gray-50 transition-colors';
                
                tr.innerHTML = `
                    <td class="p-3 text-sm">
                        <div class="font-bold text-gray-700">${typeof formatDateForDisplay === 'function' ? formatDateForDisplay(exp.date) : exp.date}</div>
                        <div class="text-xs text-gray-400">${timeStr}</div>
                    </td>
                    <td class="p-3 text-sm font-semibold text-blue-800">
                        ${exp.type}
                        ${exp.isVerified ? `<br><span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200 mt-1 inline-block">مصروف معتمد</span>` : ''}
                    </td>
                    <td class="p-3 text-sm text-gray-600">${exp.details}</td>
                    <td class="p-3 text-sm text-center font-mono font-bold text-red-600">-${formatCurrency(exp.amount)}</td>
                `;
                tableBody.appendChild(tr);
            });
        }
        
        summaryTotalEl.textContent = formatCurrency(totalAmount);
        summaryContainer.classList.remove('hidden');
        if(messageEl) showMessage(messageEl, `تم عرض ${uniqueExpenses.length} عملية مصروف لشهر ${targetMonth}.`, false);
    }
}






// --- Injection: Capital Adjustments Report ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const fcTabs = document.getElementById('fc-main-tabs');
        if (fcTabs && !document.getElementById('btn-fc-tab-adjustments')) {
            const btn = document.createElement('button');
            btn.id = 'btn-fc-tab-adjustments';
            btn.className = 'fc-tab-button flex items-center gap-2 text-base font-semibold py-3 px-4 border-b-2 border-transparent hover:border-gray-300 hover:text-gray-600 focus:outline-none';
            btn.setAttribute('data-target', 'fc-tab-adjustments');
            btn.innerHTML = '<i class="fas fa-shield-alt text-red-600"></i><span>التدقيق الشامل (تسويات رأس المال)</span>';
            fcTabs.appendChild(btn);
            
            const sectionsContainer = fcTabs.parentElement;
            const newSec = document.createElement('div');
            newSec.id = 'fc-tab-adjustments';
            newSec.className = 'fc-tab-content hidden';
            newSec.innerHTML = `
                <div class="bg-white p-6 rounded-2xl border border-gray-200 card-shadow mt-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold text-xl">
                            <i class="fas fa-search-dollar"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">سجل التدقيق المالي الشامل</h2>
                            <p class="text-sm text-gray-500 mt-1">يصطاد هذا التقرير <strong>أية تفصيلة</strong> تؤثر على الحسابات (تعديلات صامتة، نواقص، خصومات، ديون جديدة، فواتير ملغاة، تسويات) ولا تظهر في تقارير البيع أو المصروفات العادية.</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                        <div class="flex items-center gap-2">
                            <label class="text-sm font-bold text-slate-700"><i class="far fa-calendar-alt text-blue-500"></i> اختر الشهر:</label>
                            <input type="month" id="adjustments-month" class="border border-slate-300 rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <button id="btn-load-adjustments" class="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center gap-2 hover:scale-105">
                            <i class="fas fa-bolt text-yellow-400"></i> فحص السجلات الآن
                        </button>
                    </div>
                    
                    <!-- Dashboard Cards -->
                    <div id="adj-dashboard" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 hidden">
                        <div class="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                            <div class="text-orange-600 text-sm font-bold mb-1"><i class="fas fa-tags"></i> إجمالي العمليات المرصودة</div>
                            <div id="adj-count" class="text-2xl font-black text-orange-800">0</div>
                        </div>
                        <div class="bg-red-50 border border-red-200 p-4 rounded-xl">
                            <div class="text-red-600 text-sm font-bold mb-1"><i class="fas fa-exclamation-circle"></i> تنبيهات هامة (خصم/خسارة/إلغاء)</div>
                            <div id="adj-alerts" class="text-2xl font-black text-red-800">0</div>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                            <div class="text-blue-600 text-sm font-bold mb-1"><i class="fas fa-info-circle"></i> تعديلات إدارية وقيود</div>
                            <div id="adj-info" class="text-2xl font-black text-blue-800">0</div>
                        </div>
                    </div>
                    
                    <div id="adjustments-loading" class="hidden text-center text-gray-500 py-10">
                        <i class="fas fa-radar fa-spin text-4xl mb-4 text-blue-600"></i>
                        <p class="font-bold text-lg">جاري الفحص العميق للسجلات السحابية...</p>
                        <p class="text-sm text-gray-400 mt-2">نبحث عن الإبرة في كومة القش</p>
                    </div>
                    
                    <div id="adjustments-results" class="hidden">
                        <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                            <table class="w-full text-right border-collapse bg-white">
                                <thead>
                                    <tr class="bg-slate-800 text-white">
                                        <th class="p-3 border-b font-bold w-1/4 rounded-tr-xl">التاريخ والوقت</th>
                                        <th class="p-3 border-b font-bold w-1/4">نوع الحركة المكتشفة</th>
                                        <th class="p-3 border-b font-bold w-1/2 rounded-tl-xl">التفاصيل والأرقام</th>
                                    </tr>
                                </thead>
                                <tbody id="adjustments-table-body" class="divide-y divide-slate-100"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            sectionsContainer.appendChild(newSec);
            
            // Re-bind tabs
            const allTabs = document.querySelectorAll('.fc-tab-button');
            const allContents = document.querySelectorAll('.fc-tab-content');
            allTabs.forEach(t => {
                t.addEventListener('click', () => {
                    allTabs.forEach(tb => tb.classList.remove('active', 'border-blue-600', 'text-blue-600'));
                    allContents.forEach(c => c.classList.add('hidden'));
                    
                    t.classList.add('active', 'border-blue-600', 'text-blue-600');
                    const targetId = t.getAttribute('data-target');
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) targetEl.classList.remove('hidden');
                });
            });
            
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            document.getElementById('adjustments-month').value = `${y}-${m}`;
            
            document.getElementById('btn-load-adjustments').addEventListener('click', async () => {
    const month = document.getElementById('adjustments-month').value;
    if (!month) return;
    
    document.getElementById('adjustments-loading').classList.remove('hidden');
    document.getElementById('adjustments-results').classList.add('hidden');
    document.getElementById('adj-dashboard').classList.add('hidden');
    document.getElementById('monthly-net-dashboard').classList.add('hidden');
    const tbody = document.getElementById('adjustments-table-body');
    tbody.innerHTML = '';
    
    try {
        const userId = window.currentUser ? window.currentUser.uid : null;
        if (!userId) { alert('يجب تسجيل الدخول أولا'); return; }
        
        const daysRef = window.collection(window.db, "users", userId, "days");
        const q = window.query(
            daysRef,
            window.where(firebase.firestore.FieldPath.documentId(), ">=", month),
            window.where(firebase.firestore.FieldPath.documentId(), "<=", month + "\uf8ff")
        );
        const snap = await window.getDocs(q);
        
        let daysData = [];
        
        
        snap.forEach(doc => {
            const data = doc.data();
            
            // Calculate exact capital for this day
            let liquidity = data.accounts ? data.accounts.reduce((s, a) => s + (Number(a.balance)||0), 0) : (Number(data.liquidity)||0);
            let inv = data.products ? data.products.reduce((s, p) => s + ((Number(p.costPrice)||0)*(Number(p.quantity)||0)), 0) : 0;
            let consig = data.pendingSales ? data.pendingSales.reduce((s, sale) => s + (sale.items && sale.totalCost !== undefined ? (Number(sale.totalCost)||0) : ((Number(sale.mainProduct?.costPrice)||0)*(Number(sale.mainProduct?.quantity)||1)) + (sale.additionalItems||[]).reduce((s,i)=>s+((Number(i.costPrice)||0)*(Number(i.quantity)||0)),0)), 0) : 0;
            let debts = data.debtors ? data.debtors.reduce((s, d) => s + (Number(d.amount)||0), 0) : 0;
            let pendingPurchasesVal = data.pendingPurchases ? data.pendingPurchases.reduce((s, p) => s + (Number(p.amountPaid)||0), 0) : 0;
            let pendingReturnsVal = data.pendingReturns ? data.pendingReturns.reduce((s, r) => {
                let cost = 0;
                if (r.costOfGoods !== undefined) {
                    cost = Number(r.costOfGoods);
                } else if (r.items && r.items.length > 0) {
                    cost = r.items.reduce((itemSum, item) => itemSum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)), 0);
                } else {
                    cost = Number(r.returnedAmount) || 0;
                }
                return s + cost;
            }, 0) : 0;
            let liab = data.liabilities ? data.liabilities.filter(l => l.id !== 'hidden-recorded-losses' && !l.isHidden).reduce((s, l) => s + (Number(l.amount)||0), 0) : 0;
            let monthlyLiab = data.monthlyLiabilities ? data.monthlyLiabilities.filter(l => !l.isHidden).reduce((s, l) => s + (Number(l.amount)||0), 0) : 0;
            let pendingDeposits = data.pendingOrders ? data.pendingOrders.reduce((s, o) => s + (Number(o.amountPaid)||0), 0) : 0;
            
            const capital = liquidity + inv + consig + debts + pendingPurchasesVal + pendingReturnsVal - (liab + monthlyLiab) - pendingDeposits;
            
            daysData.push({
                date: doc.id,
                capital: capital,
                profit: Number(data.profit) || 0,
                expenses: Number(data.expenses) || 0,
                losses: Number(data.recordedLosses) || 0
            });
            
            });
// Generate adjustments table...
                    
                    let adjustments = [];
                    
                    const routineTypes = [
                        "بيع بضاعة", "بيع مؤقت", "إنشاء فاتورة", "تعديل بيع مؤقت", "فاتورة مؤقتة", 
                        "شراء بضاعة", "شراء بضاعة جديدة", "فاتورة شراء", "شراء معلق", "استلام بضاعة", "شراء بضاعة (منفصلة الاسم)",
                        "تسجيل مصروف", "تقليل مصروف", "إضافة إيراد", "إضافة سيولة", "سحب سيولة", "تحويل بين الحسابات",
                        "تسديد التزام مجمع", "تسديد جزء من التزام", "استلام سداد مجمع", "استلام سداد جزئي", 
                        "سداد ديون محددة", "سداد ديون جماعي", "استلام وتسديد شامل",
                        "مرتجع فوري", "مرتجع قيد الاستلام", "مرتجع من مؤقت", "مرتجع من فاتورة", "تأكيد استلام مرتجع", "عكس أرباح مرتجع",
                        "استرداد نقدي لمرتجع مشتريات"
                    ];
                    
                    const processEntry = (entry, docId) => {
                        const type = entry.type || '';
                        const details = entry.details || '';
                        const typeTrim = type.trim();
                        
                        // 1. الخسائر المباشرة للمخزون
                        const isProductLoss = typeTrim === 'تسوية مخزن (هالك/خسارة)' || typeTrim === 'حذف منتج' || typeTrim === 'إتلاف';
                        
                        // 2. التعديلات اليدوية للأصناف (قد تتضمن تغيير تكلفة أو كمية صامتاً)
                        const isProductEdit = typeTrim === 'تعديل بيانات صنف' || typeTrim === 'شراء بضاعة (تعديل كمية)' || details.includes('تعديل الصنف');
                        
                        // 3. الخصومات للعملاء (تقلص الأرباح ورأس المال المتوقع)
                        // تجنب الخلط بين كلمة "خصم" كـ (تخفيض للعميل) وبين كلمة "خصم" كـ (سحب من الخزينة)
                        const isDiscount = details.includes('خصم') && !details.includes('بدون خصم') && !details.includes('كسلفة') && !typeTrim.includes('شراء') && !typeTrim.includes('دين') && !typeTrim.includes('التزام');
                        
                        // 4. زيادة التزام بدون دخول سيولة أو بضاعة (يخفض رأس المال فوراً)
                        const isLiabilityIncrease = (typeTrim.includes('التزام') && !typeTrim.includes('تسديد') && !typeTrim.includes('حذف') && !typeTrim.includes('إسقاط') && !typeTrim.includes('تكلفة إضافية'));
                        const isLiabilityWithoutCash = isLiabilityIncrease && !details.includes('تم استلام سيولة') && !details.includes('تكلفة إضافية');
                        
                        // 5. مسح التزام (يزيد رأس المال)
                        const isLiabilityDrop = typeTrim.includes('حذف التزام') || typeTrim.includes('إسقاط التزام');
                        
                        // 6. إسقاط دين مستحق لك (يخفض رأس المال)
                        const isDebtDrop = typeTrim === 'إلغاء دين' || typeTrim === 'معالجة دين متعثر';
                        
                        // 7. تلاعب يدوي بالخزنة
                        const isCashOverride = typeTrim === 'تعديل رصيد يدوي' || typeTrim === 'تصفير شامل';
                        
                        // 8. إلغاء فواتير
                        const isInvoiceCancel = typeTrim === 'إلغاء فاتورة شراء معلقة' || typeTrim === 'حذف مبيعات';
                        
                        const isCapitalLeak = isProductLoss || isProductEdit || isDiscount || isLiabilityWithoutCash || isLiabilityDrop || isDebtDrop || isCashOverride || isInvoiceCancel;
                        
                        if (isCapitalLeak) {
                            adjustments.push({
                                date: docId,
                                time: entry.timestamp || docId,
                                type: typeTrim,
                                details: details,
                                isCritical: isProductLoss || isDiscount || isDebtDrop || isLiabilityWithoutCash
                            });
                        }
                    };

                    snap.forEach(doc => {
                        const data = doc.data();
                        if (data.log && Array.isArray(data.log)) {
                            data.log.forEach(entry => processEntry(entry, doc.id));
                        }
                    });
                    
                    if (typeof window.getTodayDateString === 'function' && window.getTodayDateString().startsWith(month)) {
                         if (window.operationLog) {
                             window.operationLog.forEach(entry => {
                                 // check if not already in array
                                 if (!adjustments.some(a => a.time === entry.timestamp && a.details === (entry.details || ''))) {
                                     processEntry(entry, window.getTodayDateString());
                                 }
                             });
                         }
                    }
                    
                    adjustments.sort((a,b) => new Date(b.time) - new Date(a.time));
                    
                    let criticalCount = 0;
                    let infoCount = 0;
                    
                    if (adjustments.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="3" class="text-center p-10 text-gray-500 font-medium"><i class="fas fa-shield-check text-emerald-500 text-5xl mb-4 block"></i>لا توجد أي تسويات أو حركات غير اعتيادية مسجلة في هذا الشهر. حساباتك مطابقة تماماً للمسار الروتيني.</td></tr>';
                    } else {
                        adjustments.forEach(adj => {
                            let timeStr = '';
                            try { timeStr = new Date(adj.time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}); } catch(e){}
                            
                            if (adj.isCritical) criticalCount++;
                            else infoCount++;
                            
                            let trClass = adj.isCritical ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50";
                            let badgeClass = adj.isCritical ? "bg-red-200 text-red-800 border-red-300" : "bg-blue-100 text-blue-800 border-blue-200";
                            let icon = adj.isCritical ? '<i class="fas fa-exclamation-triangle mr-1"></i>' : '<i class="fas fa-code-branch mr-1"></i>';
                            
                            tbody.innerHTML += `
                                <tr class="transition-colors border-b border-slate-200 ${trClass}">
                                    <td class="p-4 text-sm">
                                        <div class="font-black text-slate-800">${adj.date}</div>
                                        <div class="text-xs text-slate-500 mt-1 font-bold"><i class="far fa-clock"></i> ${timeStr}</div>
                                    </td>
                                    <td class="p-4 text-sm font-bold">
                                        <span class="px-3 py-1.5 rounded-lg border ${badgeClass} shadow-sm inline-block">${icon} ${adj.type}</span>
                                    </td>
                                    <td class="p-4 text-sm text-slate-800 leading-relaxed font-semibold">${adj.details}</td>
                                </tr>
                            `;
                        });
                    }
                    
                    document.getElementById('adj-count').innerText = adjustments.length;
                    document.getElementById('adj-alerts').innerText = criticalCount;
                    document.getElementById('adj-info').innerText = infoCount;
                    
                    document.getElementById('adj-dashboard').classList.remove('hidden');
                    
                } catch(e) {
                    console.error(e);
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center p-6 text-red-500 font-bold"><i class="fas fa-wifi mr-2"></i>حدث خطأ أثناء جلب البيانات من الخادم. تأكد من اتصالك بالإنترنت.</td></tr>';
                }
                
                
                // --- UPDATE NEW DASHBOARD ---
                if (daysData.length > 0) {
                    daysData.sort((a,b) => new Date(a.date) - new Date(b.date));
                    const firstDay = daysData[0];
                    const lastDay = daysData[daysData.length - 1];
                    
                    document.getElementById('dash-month-name').innerText = month;
                    document.getElementById('dash-start-capital').innerText = formatCurrency(firstDay.capital);
                    document.getElementById('dash-start-date').innerText = firstDay.date;
                    
                    document.getElementById('dash-end-capital').innerText = formatCurrency(lastDay.capital);
                    document.getElementById('dash-end-date').innerText = lastDay.date;
                    
                    const actualNetProfit = lastDay.capital - firstDay.capital;
                    const profitEl = document.getElementById('dash-net-profit');
                    profitEl.innerText = formatCurrency(actualNetProfit);
                    if (actualNetProfit < 0) {
                        profitEl.classList.remove('text-emerald-900');
                        profitEl.classList.add('text-red-600');
                    } else {
                        profitEl.classList.add('text-emerald-900');
                        profitEl.classList.remove('text-red-600');
                    }
                    
                    let totalUnaccountedLeak = 0;
                    for (let i = 1; i < daysData.length; i++) {
                        const prev = daysData[i-1];
                        const curr = daysData[i];
                        const actualChange = curr.capital - prev.capital;
                        const newLosses = (curr.losses >= prev.losses) ? (curr.losses - prev.losses) : curr.losses; 
                        const expectedChange = curr.profit - curr.expenses - newLosses;
                        totalUnaccountedLeak += (actualChange - expectedChange);
                    }
                    
                    document.getElementById('dash-unaccounted').innerText = formatCurrency(totalUnaccountedLeak);
                    
                    document.getElementById('monthly-net-dashboard').classList.remove('hidden');
                }
                // ----------------------------

                document.getElementById('adjustments-loading').classList.add('hidden');
                document.getElementById('adjustments-results').classList.remove('hidden');
            });
        }
    }, 1500);
});
