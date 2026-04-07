// 1. إضافة الميزة للواجهة تلقائياً
document.addEventListener("DOMContentLoaded", function() {
    const nav = document.getElementById('main-nav') || document.querySelector('.nav-links');
    if (nav) {
        const btn = document.createElement('button');
        btn.className = 'nav-button';
        btn.style.backgroundColor = "#6c5ce7";
        btn.innerHTML = "🔄 استبدال منتج";
        btn.onclick = () => {
            document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
            document.getElementById('exchange-panel').classList.remove('hidden');
            loadExchangeData();
        };
        nav.appendChild(btn);
    }

    const main = document.getElementById('content-area');
    if (main) {
        const div = document.createElement('div');
        div.id = 'exchange-panel';
        div.className = 'content-section hidden';
        div.innerHTML = `
            <div class="exchange-section">
                <div class="exchange-header"><h3>🔄 نظام الاستبدال المباشر</h3></div>
                <div class="exchange-grid">
                    <div class="box-item return-box">
                        <label>المنتج المرتجع (من العميل):</label>
                        <select id="ex_ret_id" class="form-control" onchange="syncExPrice('ret')"></select>
                        <input type="number" id="ex_ret_price" class="form-control" placeholder="سعر الإرجاع">
                    </div>
                    <div class="box-item new-box">
                        <label>المنتج الجديد (للعميل):</label>
                        <select id="ex_new_id" class="form-control" onchange="syncExPrice('new')"></select>
                        <input type="number" id="ex_new_price" class="form-control" placeholder="سعر الجديد">
                    </div>
                </div>
                <div id="ex_summary" class="result-area neutral">قم باختيار المنتجات لحساب الفرق</div>
                <div id="ex_finance_div" class="hidden" style="margin-top:15px;">
                    <label>اختر الخزنة للعملية المالية:</label>
                    <select id="ex_acc_id" class="form-control"></select>
                    <button onclick="executeCloudExchange()" id="exec_btn" class="btn-save" style="width:100%; margin-top:15px; background:#6c5ce7;">تأكيد العملية وربطها بالسحابة</button>
                </div>
            </div>
        `;
        main.appendChild(div);
    }
});

// 2. مزامنة البيانات والأسعار
function loadExchangeData() {
    const retSelect = document.getElementById('ex_ret_id');
    const newSelect = document.getElementById('ex_new_id');
    const accSelect = document.getElementById('ex_acc_id');
    
    let pOptions = '<option value="">-- اختر المنتج --</option>';
    products.forEach(p => pOptions += `<option value="${p.id}" data-price="${p.price}">${p.name} (موجود: ${p.stock})</option>`);
    
    retSelect.innerHTML = pOptions;
    newSelect.innerHTML = pOptions;
    
    let aOptions = '<option value="">-- اختر الخزنة --</option>';
    accounts.forEach(a => aOptions += `<option value="${a.id}">${a.name}</option>`);
    accSelect.innerHTML = aOptions;

    // مراقبة التغييرات في الأسعار لحظياً
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

    if (r > 0 && n > 0) {
        financeDiv.classList.remove('hidden');
        if (diff > 0) {
            summary.innerHTML = `العميل سيدفع فرق: ${diff} ج.م`;
            summary.className = 'result-area gain';
        } else if (diff < 0) {
            summary.innerHTML = `المحل سيرد للعميل: ${Math.abs(diff)} ج.م`;
            summary.className = 'result-area loss';
        } else {
            summary.innerHTML = `تبديل متساوي (0 ج.م)`;
            summary.className = 'result-area neutral';
        }
    }
}

// 3. التنفيذ السحابي (Cloud Sync)
async function executeCloudExchange() {
    const retId = document.getElementById('ex_ret_id').value;
    const newId = document.getElementById('ex_new_id').value;
    const accId = document.getElementById('ex_acc_id').value;
    const rP = parseFloat(document.getElementById('ex_ret_price').value) || 0;
    const nP = parseFloat(document.getElementById('ex_new_price').value) || 0;
    const diff = nP - rP;

    if (!retId || !newId || !accId) return alert("من فضلك أكمل كافة البيانات");

    const btn = document.getElementById('exec_btn');
    btn.disabled = true;
    btn.innerText = "جاري التحديث في السحابة...";

    try {
        // أ) تحديث المخزن (المرتجع يزيد +1 والجديد ينقص -1)
        const retProd = products.find(p => p.id === retId);
        const newProd = products.find(p => p.id === newId);

        await updateDoc(doc(db, "products", retId), { stock: (retProd.stock || 0) + 1 });
        await updateDoc(doc(db, "products", newId), { stock: (newProd.stock || 0) - 1 });

        // ب) تحديث الخزنة بالفرق المالي
        const acc = accounts.find(a => a.id === accId);
        await updateDoc(doc(db, "accounts", accId), { balance: (acc.balance || 0) + diff });

        // ج) تسجيل العملية في الأرشيف
        await addDoc(collection(db, "transactions"), {
            type: "استبدال منتج",
            details: `إرجاع (${retProd.name}) وأخذ (${newProd.name})`,
            amount: diff,
            accountId: accId,
            timestamp: serverTimestamp()
        });

        alert("✅ تم التنفيذ بنجاح وتحديث السحابة!");
        location.reload();
    } catch (error) {
        console.error(error);
        alert("حدث خطأ في الاتصال بالسحابة");
        btn.disabled = false;
    }
}