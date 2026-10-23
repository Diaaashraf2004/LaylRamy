// finance-core-customers.js - Customers, Statements, and Inline Payments
     function updateAdditionalCostsCheckboxes(selectedAttachments = []) {
    if (!additionalCostsContainer || !sellProductNameInput) return;

    const mainProductName = sellProductNameInput.value.trim().toLowerCase();

   const safeAttachments = Array.isArray(selectedAttachments)
    ? selectedAttachments
    : selectedAttachments
        ? [selectedAttachments]
        : [];

const selectedMap = new Map(
    safeAttachments
        .map(item => {
            const normalizedItem = typeof item === 'string'
                ? { name: item, quantity: 1, costPrice: 0, supplierId: '' }
                : item;

            const key = String(normalizedItem?.name || '').trim().toLowerCase();

            return key ? [key, normalizedItem] : null;
        })
        .filter(Boolean)
);
   // التعديل: إزالة شرط الاستبعاد بناءً على الاسم للسماح بظهور المنتج الأساسي كملحق
    const availableProducts = products.filter(p =>
        p.quantity > 0
    );
    // أضف أيضًا الملحقات المختارة سابقًا حتى لو كانت كميتها الحالية 0
    const mergedProductsMap = new Map();

    availableProducts.forEach(product => {
        mergedProductsMap.set(product.name.trim().toLowerCase(), {
            name: product.name,
            quantity: Number(product.quantity) || 0,
            costPrice: Number(product.costPrice) || 0,
            supplierId: product.supplierId || ''
        });
    });

    selectedMap.forEach((selectedItem, key) => {
        if (!mergedProductsMap.has(key)) {
            mergedProductsMap.set(key, {
                name: selectedItem.name,
                quantity: 0, // بالمخزون الآن صفر، لكن لازم يظهر لأنه مخصوم في البيعة القديمة
                costPrice: Number(selectedItem.costPrice ?? selectedItem.cost ?? 0) || 0,
                supplierId: selectedItem.supplierId || ''
            });
        }
    });

    const otherProducts = Array.from(mergedProductsMap.values());

    additionalCostsContainer.innerHTML = '';

    if (otherProducts.length === 0) {
        additionalCostsContainer.innerHTML = '<p class="text-center text-gray-500 text-sm">لا توجد منتجات أخرى متاحة لخصم تكلفتها.</p>';
        return;
    }

   otherProducts
    .filter(product => product && product.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'))
    .forEach(product => {
        const key = product.name.trim().toLowerCase();
        const selectedItem = selectedMap.get(key);
        const isPreviouslySelected = !!selectedItem;
        const selectedQty = Number(selectedItem?.quantity || 1);

        const uniqueId = `addcost-${generateId(product.name)}`;
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '10px';
        label.style.marginBottom = '8px';

        label.innerHTML = `
            <input type="checkbox"
                   value="${product.name}"
                   data-cost="${product.costPrice}"
                   id="${uniqueId}"
                   style="flex-shrink: 0;"
                   ${isPreviouslySelected ? 'checked' : ''}>
            <span style="flex-grow: 1;">
                ${product.name}
                (متوسط التكلفة: ${formatCurrency(product.costPrice)}, المتاح: ${product.quantity}${product.quantity <= 0 && isPreviouslySelected ? ' - مخصوم سابقًا في هذه البيعة' : ''})
            </span>
            <span style="flex-shrink: 0;">الكمية للخصم:</span>
            <input type="number"
                   class="additional-item-quantity"
                   min="1"
                   value="${selectedQty}"
                   style="width: 60px; text-align: center; flex-shrink: 0; border: 1px solid #ccc; border-radius: 4px; padding: 2px;">
        `;

        additionalCostsContainer.appendChild(label);
    });

    if (typeof window.updateQuickSaleDebt === 'function') {
        window.updateQuickSaleDebt();
    }
}
    

function openCollectionNotesModal(customerId) {
    let customer = getDebtorProfileById(customerId);
    const customerDebts = getCustomerDebts(customerId);

    if (!customer && customerDebts.length) {
        customer = getOrCreateDebtorProfile(customerDebts[0].name || "عميل");
    }

    if (!customer) {
        showGlobalMessage("تعذر العثور على بيانات العميل.", true);
        return;
    }

    activeCustomerForNotes = customer.id;

    const customerNameEl = d('collection-notes-customer-name');
    if (customerNameEl) {
        customerNameEl.textContent = customer.name || "عميل";
    }

    if (collectionNoteText) collectionNoteText.value = "";
    if (collectionNoteFollowupDate) collectionNoteFollowupDate.value = "";

    renderCollectionNotesHistory(customer.id);

    if (collectionNotesMessage) {
        showMessage(collectionNotesMessage, "");
    }

    if (collectionNotesModal) {
        collectionNotesModal.style.display = 'block';
    } else {
        showGlobalMessage("مودال ملاحظات التحصيل غير موجود.", true);
    }
}

function renderCollectionNotesHistory(customerId) {
    if (!collectionNotesHistory) return;

    const notes = getCustomerNotes(customerId);

    if (!notes.length) {
        collectionNotesHistory.innerHTML = `<p class="text-center text-gray-500">لا توجد ملاحظات تحصيل لهذا العميل.</p>`;
        return;
    }

    collectionNotesHistory.innerHTML = notes.map(note => `
        <div class="p-3 border rounded mb-2 bg-gray-50">
            <div><strong>الملاحظة:</strong> ${escapeHTML(note.note)}</div>
            <div class="text-sm text-gray-600 mt-1">التاريخ: ${new Date(note.createdAt).toLocaleString('ar-EG')}</div>
            <div class="text-sm text-blue-700 mt-1">متابعة: ${escapeHTML(note.nextFollowUpDate || 'لا يوجد')}</div>
        </div>
    `).join("");
}

function saveCollectionNote() {
    if (!activeCustomerForNotes) {
        showMessage(collectionNotesMessage, "لم يتم تحديد العميل.", true);
        return;
    }

    const noteText = collectionNoteText ? collectionNoteText.value.trim() : "";
    const followUpDate = collectionNoteFollowupDate ? collectionNoteFollowupDate.value : "";

    if (!noteText) {
        showMessage(collectionNotesMessage, "اكتب ملاحظة أولًا.", true);
        return;
    }

    if (!Array.isArray(debtCollectionNotes)) {
        debtCollectionNotes = [];
    }

    saveStateToHistory();

    debtCollectionNotes.push({
        id: generateId("note"),
        customerId: activeCustomerForNotes,
        debtId: null,
        note: noteText,
        createdAt: new Date().toISOString(),
        nextFollowUpDate: followUpDate || ""
    });

    if (collectionNoteText) collectionNoteText.value = "";
    if (collectionNoteFollowupDate) collectionNoteFollowupDate.value = "";

    renderCollectionNotesHistory(activeCustomerForNotes);
    updateUI();
    showMessage(collectionNotesMessage, "تم حفظ ملاحظة التحصيل بنجاح.", false);
}







function openCustomerStatement(customerId) {
    let customer = getDebtorProfileById(customerId);
    const customerDebts = getCustomerDebts(customerId);
    const customerNotes = getCustomerNotes(customerId);
    const totalDebt = getCustomerTotalDebt(customerId);

    if (!customer && customerDebts.length) {
        customer = {
            name: customerDebts[0].name || 'عميل',
            phone: '',
            address: ''
        };
    }

    if (!customer || !customerStatementContent || !customerStatementModal) return;

    customerStatementContent.innerHTML = `
        <div class="space-y-3" id="print-customer-statement-area">
            <div><strong>الاسم:</strong> ${escapeHTML(customer.name)}</div>
            <div><strong>الهاتف:</strong> ${escapeHTML(customer.phone || 'غير مسجل')}</div>
            <div><strong>العنوان:</strong> ${escapeHTML(customer.address || 'غير مسجل')}</div>
            <div><strong>إجمالي الدين الحالي:</strong> ${formatCurrency(totalDebt)}</div>

            <hr style="margin: 12px 0;">

            <div>
                <strong>تفاصيل الديون:</strong>
                ${
                    customerDebts.length
                    ? customerDebts.map(debt => `
                        <div style="margin-top:8px;">
                            - ${escapeHTML(debt.reason || 'بدون سبب')} : ${formatCurrency(Number(debt.amount || 0))}
                        </div>
                    `).join("")
                    : `<div style="margin-top:8px;">لا توجد ديون حالية</div>`
                }
            </div>

            <hr style="margin: 12px 0;">

            <div>
                <strong>ملاحظات التحصيل:</strong>
                ${
                    customerNotes.length
                    ? customerNotes.map(note => `
                        <div style="margin-top:8px;">
                            - ${note.note} | متابعة: ${note.nextFollowUpDate || 'لا يوجد'} | ${new Date(note.createdAt).toLocaleString('ar-EG')}
                        </div>
                    `).join("")
                    : `<div style="margin-top:8px;">لا توجد ملاحظات تحصيل</div>`
                }
            </div>
        </div>
    `;

    customerStatementModal.style.display = 'block';
}

function openCustomerProfile(customerId) {
    let customer = getDebtorProfileById(customerId);
    const customerDebts = getCustomerDebts(customerId);
    const totalDebt = getCustomerTotalDebt(customerId);
    const latestNote = getLatestCustomerNote(customerId);

    if (!customer && customerDebts.length) {
        customer = {
            name: customerDebts[0].name || 'عميل',
            phone: '',
            address: '',
            generalNotes: ''
        };
    }

    if (!customer || !customerProfileContent || !customerProfileModal) return;

    customerProfileContent.innerHTML = `
        <div class="space-y-3">
            <div><strong>الاسم:</strong> ${escapeHTML(customer.name)}</div>
            <div><strong>الهاتف:</strong> ${escapeHTML(customer.phone || 'غير مسجل')}</div>
            <div><strong>العنوان:</strong> ${escapeHTML(customer.address || 'غير مسجل')}</div>
            <div><strong>عدد البنود:</strong> ${customerDebts.length}</div>
            <div><strong>إجمالي الديون:</strong> ${formatCurrency(totalDebt)}</div>
            <div><strong>آخر ملاحظة:</strong> ${latestNote ? escapeHTML(latestNote.note) : 'لا توجد'}</div>
            <div><strong>تاريخ المتابعة:</strong> ${latestNote && latestNote.nextFollowUpDate ? escapeHTML(latestNote.nextFollowUpDate) : 'لا يوجد'}</div>
        </div>
    `;

    customerProfileModal.style.display = 'block';
}
window.openCustomerProfile = openCustomerProfile;
window.openCustomerStatement = openCustomerStatement;
window.openCollectionNotesModal = openCollectionNotesModal;

// --- إضافة كشف حساب المورد ---
function openCreditorStatement(liabilityId) {
    const creditorStatementModal = document.getElementById('creditorStatementModal');
    const creditorStatementContent = document.getElementById('creditor-statement-content');
    if (!creditorStatementModal || !creditorStatementContent) return;

    // جلب الالتزام بناءً على المعرف بدلاً من الاسم لضمان عدم تأثره بتغيير الاسم
    const creditorLiability = liabilities.find(l => l.id === liabilityId);
    if (!creditorLiability) return;
    
    // سنضع الالتزام في مصفوفة للتوافق مع الكود السابق، مع أن الالتزام هنا يعبر عن مورد واحد
    const creditorLiabilities = [creditorLiability];
    const creditorName = creditorLiability.name;

    const totalActiveDebt = creditorLiabilities.reduce((sum, l) => sum + (l.status !== 'paid' ? (Number(l.amount) || 0) : 0), 0);
    
    let allPayments = [];
    creditorLiabilities.forEach(l => {
        if (l.paymentHistory && Array.isArray(l.paymentHistory)) {
            allPayments = allPayments.concat(l.paymentHistory.map(p => ({
                ...p,
                liabilityCategory: l.category || 'أخرى'
            })));
        }
    });

    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date)); // الأحدث أولاً

    creditorStatementContent.innerHTML = `
        <div class="space-y-4" id="print-creditor-statement-area">
            <div class="text-center mb-6 border-b pb-4">
                <h3 class="text-xl font-bold text-gray-800">كشف حساب مورد/دائن</h3>
                <p class="text-gray-600 mt-2"><strong>اسم المورد:</strong> ${creditorName}</p>
                <p class="text-pink-700 font-bold mt-2 text-lg"><strong>الرصيد المتبقي المستحق:</strong> ${formatCurrency(totalActiveDebt)}</p>
            </div>

            <div class="mt-6">
                <h4 class="text-lg font-bold text-gray-700 mb-3 border-b pb-2"><i class="fas fa-list-ul ml-2 text-teal-600"></i> الالتزامات الحالية (غير المسددة بالكامل)</h4>
                ${
                    creditorLiabilities.filter(l => l.status !== 'paid' && (Number(l.amount) || 0) > 0.001).length
                    ? `<table class="w-full text-right border-collapse" style="font-size: 14px;">
                        <thead>
                            <tr class="bg-gray-100 text-gray-700">
                                <th class="border p-2">التصنيف</th>
                                <th class="border p-2">المبلغ المتبقي</th>
                                <th class="border p-2">تاريخ الإضافة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${creditorLiabilities.filter(l => l.status !== 'paid' && (Number(l.amount) || 0) > 0.001).map(l => `
                                <tr>
                                    <td class="border p-2">${escapeHTML(l.category || 'أخرى')}</td>
                                    <td class="border p-2 font-mono text-pink-700 font-bold">${formatCurrency(l.amount)}</td>
                                    <td class="border p-2 text-gray-500">${l.createdAt ? new Date(l.createdAt).toLocaleDateString('ar-EG') : 'غير محدد'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
                    : `<p class="text-gray-500 italic">لا توجد التزامات نشطة حالياً.</p>`
                }
            </div>

            <div class="mt-8">
                <h4 class="text-lg font-bold text-gray-700 mb-3 border-b pb-2"><i class="fas fa-history ml-2 text-blue-600"></i> سجل الدفعات السابقة</h4>
                ${
                    allPayments.length
                    ? `<table class="w-full text-right border-collapse" style="font-size: 14px;">
                        <thead>
                            <tr class="bg-gray-100 text-gray-700">
                                <th class="border p-2">تاريخ الدفعة</th>
                                <th class="border p-2">المبلغ</th>
                                <th class="border p-2">الخزنة</th>
                                <th class="border p-2">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allPayments.map(p => `
                                <tr>
                                    <td class="border p-2 text-gray-600">${new Date(p.date).toLocaleString('ar-EG')}</td>
                                    <td class="border p-2 font-mono text-green-700 font-bold">${formatCurrency(p.amount)}</td>
                                    <td class="border p-2">${escapeHTML(p.accountName)}</td>
                                    <td class="border p-2 text-gray-500">${escapeHTML(p.note || '-')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
                    : `<p class="text-gray-500 italic">لا توجد دفعات سابقة مسجلة.</p>`
                }
            </div>
        </div>
    `;

    creditorStatementModal.style.display = 'block';
}

window.openCreditorStatement = openCreditorStatement;
window.printCreditorStatement = printCreditorStatement;

// -----------------------------





// =====================================================================
function toggleInlinePaymentForm(debtorName) {
    console.log(`toggleInlinePaymentForm called for: ${debtorName}`);

    const targetGroup = document.querySelector(`.debtor-group[data-debtor-name="${debtorName}"]`);
    if (!targetGroup) {
        console.error("Error: Could not find the debtor group element!");
        return;
    }

    const alreadyOpenForm = targetGroup.querySelector('.inline-payment-form');

    // الخطوة 1: قم بإغلاق كل النماذج المفتوحة دائمًا
    document.querySelectorAll('.inline-payment-form').forEach(form => form.remove());

    // الخطوة 2: إذا كان النموذج الذي ضغطنا عليه مفتوحًا بالفعل، فإن الخطوة السابقة قد أغلقته بالفعل.
    // لذلك، لا تفعل شيئًا آخر واخرج من الدالة.
    if (alreadyOpenForm) {
        console.log("Form was already open, now closing it.");
        return;
    }

    // الخطوة 3: إذا وصلنا إلى هنا، فهذا يعني أن النموذج كان مغلقًا، والآن سنقوم بإنشائه وفتحه.
    console.log("Form was closed, now creating and opening it.");

    const totalDebt = debtors
        .filter(d => d.name === debtorName)
        .reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0);

    const formDiv = document.createElement('div');
    formDiv.className = 'inline-payment-form';
    formDiv.dataset.debtorName = debtorName;

    let accountOptions = accounts.map(acc => `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})</option>`).join('');

    formDiv.innerHTML = `
        <p class="text-sm font-semibold text-gray-700 mb-3">استلام دفعة من ${escapeHTML(debtorName)} (الإجمالي: ${formatCurrency(totalDebt)})</p>
        <div class="form-grid">
            <div class="form-group">
                <label class="text-xs font-bold">المبلغ المحصّل:</label>
                <input type="number" class="inline-debt-amount-input" placeholder="0.00" min="0.01" max="${totalDebt}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="text-xs font-bold">إيداع في:</label>
                <select class="inline-debt-account-select">
                    <option value="">-- اختر حساب --</option>
                    ${accountOptions}
                </select>
            </div>
        </div>
        <div class="section-message error mt-2" style="display:none;"></div>
        <div class="flex gap-2 mt-4">
            <button class="confirm-inline-debt-payment text-sm bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded">تأكيد</button>
            <button type="button" class="cancel-inline-debt-payment text-sm bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded">إلغاء</button>
        </div>
    `;
    
    targetGroup.appendChild(formDiv);
    
    setTimeout(() => {
        formDiv.classList.add('visible');
        formDiv.querySelector('input[type="number"]').focus();
    }, 10);
}


function handleConfirmInlineDebtPayment(debtorName, formElement) {
    // ... (هذه الدالة لم تتغير)
}
