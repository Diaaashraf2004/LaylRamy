/**
 * js/exchanges/exchanges-ui.js
 * واجهة وتهيئة نظام الاستبدال والطلبات المعلقة (Exchange UI & System Initialization)
 */

let targetOrderId = null;

document.addEventListener("DOMContentLoaded", function() {
    window.pendingOrders = window.pendingOrders || [];
    if (typeof initExchangeSystem === 'function') initExchangeSystem();
    if (typeof setupUndoRedoWatcher === 'function') setupUndoRedoWatcher();
});

const getProducts = () => typeof window.getLiveProducts === 'function' ? window.getLiveProducts() : (window.products || []);

const getAccounts = () => typeof window.getLiveAccounts === 'function' ? window.getLiveAccounts() : (window.accounts || []);

const addLogSafe = (logObj) => {
    if (typeof window.injectLogToMain === 'function') window.injectLogToMain(logObj);
    else if (window.operationLog) window.operationLog.push(logObj);
};

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
                        <label for="del_now" style="margin-left: 15px;">📦 استبدال فوري (العميل في المحل وتم التبادل)</label>
                        
                        <input type="radio" id="del_later" name="delivery_type" value="pending" onchange="updateUIState()">
                        <label for="del_later">⏳ شحن للعميل (تعليق البضاعة/الفلوس حتى التسليم)</label>
                    </div>
                    <div id="pending_payment_options" style="display:none; margin-top:15px; padding:10px; background:#ebf8ff; border-radius:6px; border:1px solid #90cdf4;">
                        <p style="margin:0 0 10px 0; font-weight:bold; color:#2b6cb0;">خيارات الدفع للشحن:</p>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <label><input type="radio" name="pending_pay_type" value="pay_later" checked> تأجيل الدفع (استلام/دفع الفلوس وقت تسليم البضاعة)</label>
                            <label><input type="radio" name="pending_pay_type" value="pay_now_safe"> تم استلام/دفع الفلوس الآن (تسجيل في الخزنة المحددة)</label>
                            <label><input type="radio" name="pending_pay_type" value="pay_now_debt"> تسجيل فرق الحساب كـ "دين" على العميل</label>
                        </div>
                    </div>
                    <div id="shipping_info" style="display:none; margin-top:15px; padding:10px; background:#f0fff4; border-radius:6px; border:1px solid #9ae6b4;">
                        <p style="margin:0 0 10px 0; font-weight:bold; color:#276749;">بيانات الشحن:</p>
                        <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div><label>شركة الشحن</label><input type="text" id="ex_shipping_company" class="form-control" placeholder="مثال: ارامكس"></div>
                            <div><label>رقم التتبع / الشحنة</label><input type="text" id="ex_tracking_number" class="form-control" placeholder="رقم بوليصة الشحن"></div>
                        </div>
                    </div>
                </div>

                <div class="customer-details" style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border: 1px solid #cbd5e0; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #2d3748;">👤 بيانات العميل</h4>
                    <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div><label style="font-size: 14px;">اسم العميل</label><input type="text" id="ex_customer_name" class="form-control" placeholder="اختياري..."></div>
                        <div><label style="font-size: 14px;">رقم الهاتف</label><input type="text" id="ex_customer_phone" class="form-control" placeholder="اختياري..."></div>
                    </div>
                    <button type="button" onclick="lookupCustomerInvoices()" style="background:#2b6cb0; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer; margin-top:8px;">🔍 استدعاء فواتير العميل</button>
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

    if(pList) pList.innerHTML = liveProducts.map(p => `<option value="${escapeHTML(p.name)}">`).join('');
    
    const cats = [...new Set(liveProducts.map(p => p.category))].filter(c => c);
    const catHtml = cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('') + `<option value="عام">عام (صنف جديد)</option>`;
    
    if(rCat) rCat.innerHTML = catHtml;
    
    // تفريغ الحاويات عند التحميل الأولي
    const rAccC = document.getElementById('r_acc_container');
    const nAccC = document.getElementById('n_acc_container');
    if(rAccC) rAccC.innerHTML = '';
    if(nAccC) nAccC.innerHTML = '';
    
    if(accSel) accSel.innerHTML = liveAccounts.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)} (رصيد: ${a.balance.toFixed(2)})</option>`).join('');
}

function updateUIState() {
    const delLaterEl = document.getElementById('del_later');
    const btn = document.getElementById('exec_btn');
    if(!delLaterEl || !btn) return;

    const isPending = delLaterEl.checked;
    
    const payOpts = document.getElementById('pending_payment_options');
    const shipInfo = document.getElementById('shipping_info');
    if(payOpts) payOpts.style.display = isPending ? 'block' : 'none';
    if(shipInfo) shipInfo.style.display = isPending ? 'block' : 'none';

    if(isPending) {
        btn.style.background = "#ecc94b"; btn.style.color = "#1a202c"; btn.innerHTML = "حفظ كطلب معلق ⏳";
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

function closeExModals() {
    const editM = document.getElementById('ex-modal-edit');
    const cancelM = document.getElementById('ex-modal-cancel');
    if(editM) editM.style.display = 'none';
    if(cancelM) cancelM.style.display = 'none';
    targetOrderId = null;
}
