// دالة مساعدة للتأكد من وجود البيانات قبل تشغيل الميزة
function getAppData() {
    return {
        products: window.products || [],
        accounts: window.accounts || [],
        db: window.db
    };
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("Finance2: جاري تهيئة ميزة التبديل...");

    // 1. إضافة الزر
    const nav = document.getElementById('main-nav');
    if (nav) {
        const btn = document.createElement('button');
        btn.className = 'nav-button';
        btn.style.backgroundColor = "#6c5ce7";
        btn.innerHTML = "🔄 استبدال منتج";
        btn.onclick = () => {
            console.log("تم ضغط زر التبديل");
            // إخفاء كل الأقسام الأصلية
            document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
            
            const panel = document.getElementById('exchange-panel');
            if (panel) {
                panel.classList.remove('hidden');
                loadExchangeData();
            } else {
                alert("خطأ: لم يتم العثور على لوحة التبديل في الصفحة.");
            }
        };
        nav.appendChild(btn);
    }

    // 2. حقن واجهة الميزة في منطقة المحتوى
    const mainArea = document.getElementById('content-area');
    if (mainArea) {
        const div = document.createElement('div');
        div.id = 'exchange-panel';
        div.className = 'content-section hidden'; // نستخدم نفس كلاسات البرنامج الأصلي لضمان التنسيق
        div.innerHTML = `
            <div class="widget-card">
                <h2 style="color: #6c5ce7; border-bottom: 2px solid #6c5ce7; padding-bottom: 10px;">🔄 نظام الاستبدال السحابي</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div style="background: #fff5f5; padding: 15px; border-radius: 10px; border: 1px solid #feb2b2;">
                        <label style="font-weight: bold; display: block; margin-bottom: 8px;">المنتج المرتجع (من العميل):</label>
                        <select id="ex_ret_id" class="form-control" style="width:100%;" onchange="syncExPrice('ret')"></select>
                        <input type="number" id="ex_ret_price" class="form-control" style="width:100%; margin-top:10px;" placeholder="سعر الإرجاع">
                    </div>
                    <div style="background: #f0fff4; padding: 15px; border-radius: 10px; border: 1px solid #9ae6b4;">
                        <label style="font-weight: bold; display: block; margin-bottom: 8px;">المنتج الجديد (للعميل):</label>
                        <select id="ex_new_id" class="form-control" style="width:100%;" onchange="syncExPrice('new')"></select>
                        <input type="number" id="ex_new_price" class="form-control" style="width:100%; margin-top:10px;" placeholder="سعر الجديد">
                    </div>
                </div>
                <div id="ex_summary" style="margin-top: 20px; padding: 15px; border-radius: 8px; text-align: center; font-size: 1.2rem; font-weight: bold; background: #edf2f7;">
                    اختر المنتجات لحساب الفرق المالي
                </div>
                <div id="ex_finance_div" class="hidden" style="margin-top: 20px; border-top: 1px dashed #cbd5e0; pt: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 8px;">اختر الخزنة للعملية المالية:</label>
                    <select id="ex_acc_id" class="form-control" style="width:100%; margin-bottom: 15px;"></select>
                    <button onclick="executeCloudExchange()" id="exec_btn" class="btn-save" style="width: 100%; background: #6c5ce7; color: white; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none;">
                        تأكيد العملية ومزامنة السحابة ✅
                    </button>
                </div>
            </div>
        `;
        mainArea.appendChild(div);
    }
});

// وظيفة تعبئة البيانات (تستخدم المتغيرات العامة الآن)
function loadExchangeData() {
    const { products, accounts } = getAppData();
    console.log("تعبئة البيانات... المنتجات المكتشفة:", products.length);

    const retSelect = document.getElementById('ex_ret_id');
    const newSelect = document.getElementById('ex_new_id');
    const accSelect = document.getElementById('ex_acc_id');
    
    if (products.length === 0) {
        alert("تنبيه: لم يتم تحميل قائمة المنتجات بعد. تأكد من تسجيل الدخول.");
        return;
    }

    let pOptions = '<option value="">-- اختر المنتج --</option>';
    products.forEach(p => {
        pOptions += `<option value="${p.id}" data-price="${p.costPrice || 0}">${p.name} (المخزن: ${p.quantity})</option>`;
    });
    
    retSelect.innerHTML = pOptions;
    newSelect.innerHTML = pOptions;
    
    let aOptions = '<option value="">-- اختر الخزنة --</option>';
    accounts.forEach(a => aOptions += `<option value="${a.id}">${a.name} (${a.balance.toFixed(2)})</option>`);
    accSelect.innerHTML = aOptions;

    // مراقبة التغييرات اليدوية في الأسعار
    [document.getElementById('ex_ret_price'), document.getElementById('ex_new_price')].forEach(el => {
        el.oninput = calculateLiveDiff;
    });
}

function syncExPrice(type) {
    const sel = document.getElementById(`ex_${type}_id`);
    const price = sel.options[sel.selectedIndex].getAttribute('data-price');
    document.getElementById(`ex_${type}_price`).value = price;
    calculateLiveDiff();
}

function calculateLiveDiff() {
    const r = parseFloat(document.getElementById('ex_ret_price').value) || 0;
    const n = parseFloat(document.getElementById('ex_new_price').value) || 0;
    const diff = n - r;
    const summary = document.getElementById('ex_summary');
    const financeDiv = document.getElementById('ex_finance_div');

    if (r >= 0 && n >= 0) {
        financeDiv.classList.remove('hidden');
        if (diff > 0) {
            summary.innerHTML = `العميل سيدفع فرق: <span style="color: green;">${diff.toFixed(2)} جنيه</span>`;
            summary.style.background = "#f0fff4";
        } else if (diff < 0) {
            summary.innerHTML = `المحل سيرد للعميل: <span style="color: red;">${Math.abs(diff).toFixed(2)} جنيه</span>`;
            summary.style.background = "#fff5f5";
        } else {
            summary.innerHTML = `تبديل متساوي (0.00 جنيه)`;
            summary.style.background = "#edf2f7";
        }
    }
}

// تنفيذ المزامنة السحابية (Cloud Execution)
async function executeCloudExchange() {
    const { products, accounts, db } = getAppData();
    const retId = document.getElementById('ex_ret_id').value;
    const newId = document.getElementById('ex_new_id').value;
    const accId = document.getElementById('ex_acc_id').value;
    const rP = parseFloat(document.getElementById('ex_ret_price').value) || 0;
    const nP = parseFloat(document.getElementById('ex_new_price').value) || 0;
    const diff = nP - rP;

    if (!retId || !newId || !accId) return alert("من فضلك أكمل كافة البيانات واختيار الخزنة");
    if (!db || !window.currentUser) return alert("خطأ: السحابة غير متصلة. يرجى تسجيل الدخول.");

    const btn = document.getElementById('exec_btn');
    btn.disabled = true;
    btn.innerText = "⏳ جاري تحديث السحابة والمخزن...";

    try {
        const userId = window.currentUser.uid;
        const retProd = products.find(p => p.id === retId);
        const newProd = products.find(p => p.id === newId);
        const account = accounts.find(a => a.id === accId);

        // 1. تحديث المخزون (المرتجع +1 والجديد -1)
        const retRef = window.doc(db, "users", userId, "days", currentLoadedDate || getTodayDateString()); // نحدث في بيانات اليوم
        // ملاحظة: البرنامج الأصلي يحفظ كل بيانات اليوم في مستند واحد.
        // لذا سنقوم بتعديل المصفوفات المحلية أولاً ثم حفظ الحالة كاملة.

        retProd.quantity = (Number(retProd.quantity) || 0) + 1;
        newProd.quantity = (Number(newProd.quantity) || 0) - 1;
        account.balance = (Number(account.balance) || 0) + diff;

        // 2. تسجيل العملية في سجل العمليات العام
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: "استبدال منتج",
            details: `تبديل (${retProd.name}) بـ (${newProd.name}). الفرق: ${diff.toFixed(2)} جنيه.`
        };
        window.operationLog.push(logEntry);

        // 3. استدعاء دالة الحفظ السحابي الأصلية الموجودة في البرنامج (إذا كانت متوفرة)
        // أو حفظ الحالة يدوياً كما يفعل البرنامج
        if (typeof window.saveCurrentStateByDate === 'function') {
            await window.saveCurrentStateByDate(currentLoadedDate);
        } else {
            alert("تنبيه: تمت العملية محلياً، يرجى الضغط على زر 'حفظ التغييرات' يدوياً لضمان المزامنة.");
        }

        alert("✅ تمت العملية بنجاح! تم تحديث المخزون والخزنة وسجل العمليات.");
        location.reload(); 
    } catch (error) {
        console.error("Cloud Error:", error);
        alert("حدث خطأ أثناء الاتصال بالسحابة: " + error.message);
        btn.disabled = false;
        btn.innerText = "تأكيد العملية وربطها بالسحابة ✅";
    }
}