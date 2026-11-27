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

        const uniqueId = generateId('addcost');
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.flexWrap = 'wrap';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.marginBottom = '8px';

        label.innerHTML = `
            <input type="checkbox"
                   value="${window.escapeHTML(product.name)}"
                   data-cost="${product.costPrice}"
                   id="${uniqueId}"
                   style="flex-shrink: 0;"
                   ${isPreviouslySelected ? 'checked' : ''}>
            <span style="flex: 1 1 160px; min-width: 0;">
                ${window.escapeHTML(product.name)}
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







function getCustomerFullStatementData(customerId) {
    let customer = getDebtorProfileById(customerId);
    const customerDebts = getCustomerDebts(customerId);
    const totalRemainingDebt = getCustomerTotalDebt(customerId);
    const customerNotes = getCustomerNotes(customerId);

    if (!customer && customerDebts.length) {
        customer = {
            id: customerId,
            name: customerDebts[0].name || 'عميل',
            phone: '',
            address: '',
            paymentHistory: []
        };
    }

    if (!customer) return null;

    // 1. الدفعات المسجلة في بروفايل العميل
    let payments = Array.isArray(customer.paymentHistory) ? [...customer.paymentHistory] : [];

    // 2. البحث الذكي في سجل السيولة القديم (liquidityLog) عن أي سدادات تاريخية سابقة لهذا العميل
    if (typeof liquidityLog !== 'undefined' && Array.isArray(liquidityLog)) {
        const normName = normalizeArabicText(customer.name || '');
        if (normName) {
            liquidityLog.forEach(log => {
                if (log.type === 'add' && log.description) {
                    const normDesc = normalizeArabicText(log.description);
                    if (normDesc.includes(normName) && 
                        !normDesc.includes('سداد جماعي') && 
                        !normDesc.includes('سداد مجمع') && 
                        (normDesc.includes('تحصيل ديون') || normDesc.includes('سداد') || normDesc.includes('دين'))) {
                        const logTime = new Date(log.timestamp || 0).getTime();
                        const logAmt = Number(log.amount) || 0;
                        const alreadyExists = payments.some(p => 
                            Math.abs((new Date(p.date || 0).getTime()) - logTime) < 120000 &&
                            Math.abs((Number(p.amount) || 0) - logAmt) < 0.01
                        );
                        if (!alreadyExists) {
                            payments.push({
                                id: log.id || generateId("pay_hist"),
                                date: log.timestamp || new Date().toISOString(),
                                amount: logAmt,
                                accountId: log.accountId || '',
                                accountName: (log.description.match(/في حساب "([^"]+)"/)?.[1]) || 'الخزينة',
                                debtReason: log.description,
                                type: 'legacy_log',
                                note: 'حركة مسجلة في سجل السيولة'
                            });
                        }
                    }
                }
            });
        }
    }

    // ترتيب السدادات من الأحدث للأقدم
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalPaid = payments
        .filter(p => p.type !== 'cancelled' && p.type !== 'forgiven')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
        customer,
        debts: customerDebts,
        totalRemainingDebt,
        payments,
        totalPaid,
        notes: customerNotes
    };
}
window.getCustomerFullStatementData = getCustomerFullStatementData;

function openCustomerStatement(customerId) {
    const data = getCustomerFullStatementData(customerId);
    if (!data || !customerStatementContent || !customerStatementModal) return;

    const { customer, debts, totalRemainingDebt, payments, totalPaid, notes } = data;
    const repeatOrderIndex = (typeof window.buildRepeatOrderNameIndex === 'function') ? window.buildRepeatOrderNameIndex() : null;

    const renderDebtRowRepeatBadge = (d) => {
        if (!repeatOrderIndex || typeof window.findRepeatOrdersByCustomerName !== 'function') return '';
        const isOrderDebt = /^بيعة\s+باسم\s+/i.test(String(d.reason || '').trim()) || d.origin === 'credit_sale' || (d.linkedInvoice && d.linkedInvoice !== '-' && d.linkedInvoice !== 'بدون فاتورة') || !!d.saleId;
        if (!isOrderDebt) return '';
        const rawTarget = /^بيعة\s+باسم\s+/i.test(String(d.reason || '').trim()) ? d.reason : (d.customerName || d.name || d.reason || '');
        const info = window.findRepeatOrdersByCustomerName(rawTarget, {
            index: repeatOrderIndex,
            sources: ['active_debt', 'paid_debt'],
            profileId: customer.id
        });
        if (info.activeDebtCount >= 2) {
            const displayTarget = info.displayName || d.reason || '';
            return ` <button type="button" data-repeat-name="${escapeHTML(displayTarget)}" data-profile-id="${escapeHTML(customer.id)}" onclick="window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold align-middle mr-1 transition" title="اضغط لمراجعة كل الأوردرات بنفس الاسم"><i class="fas fa-bell text-amber-600"></i> متكرر بالديون (×${info.activeDebtCount})</button>`;
        } else if (info.activeDebtCount >= 1 && info.paidDebtCount >= 1) {
            const displayTarget = info.displayName || d.reason || '';
            return ` <button type="button" data-repeat-name="${escapeHTML(displayTarget)}" data-profile-id="${escapeHTML(customer.id)}" onclick="window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-bold align-middle mr-1 transition" title="اضغط لمراجعة الطلب السابق المسدّد"><i class="fas fa-history text-sky-600"></i> له سابق مسدّد (×${info.totalCount})</button>`;
        }
        return '';
    };

    const renderPaymentRepeatBadges = (p) => {
        if (!repeatOrderIndex || typeof window.detectDuplicateNamesInPaymentEntry !== 'function') return '';
        const alerts = window.detectDuplicateNamesInPaymentEntry(p, repeatOrderIndex, customer.id);
        if (!alerts.length) return '';
        const pills = alerts.map(a => `
            <button type="button" data-repeat-name="${escapeHTML(a.name)}" data-profile-id="${escapeHTML(customer.id)}" onclick="window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold transition" title="اضغط لعرض تفاصيل كل أوردرات ${escapeHTML(a.name)}">
                <i class="fas fa-bell text-amber-600"></i> ${escapeHTML(a.name)} (×${a.totalSystemCount})
            </button>
        `).join(' ');
        return `<div class="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-amber-800"><span class="font-bold">تنبيه أسماء متكررة (طلبات متعددة):</span> ${pills}</div>`;
    };

    customerStatementContent.innerHTML = `
        <div class="space-y-5" id="print-customer-statement-area" style="font-family: inherit;">
            <!-- ترويسة الكشف الرسمية -->
            <div class="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-purple-200 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900">${escapeHTML(customer.name)}</h3>
                        <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                            <span><i class="fas fa-phone text-indigo-600 ml-1"></i> ${escapeHTML(customer.phone || 'غير مسجل')}</span>
                            <span><i class="fas fa-map-marker-alt text-purple-600 ml-1"></i> ${escapeHTML(customer.address || 'غير مسجل')}</span>
                            <span><i class="far fa-clock text-slate-400 ml-1"></i> استخراج: ${new Date().toLocaleString('ar-EG')}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div class="bg-white px-3.5 py-2 rounded-xl border border-purple-200 text-center shadow-xs">
                        <span class="block text-[11px] font-bold text-purple-700">الرصيد المتبقي المستحق</span>
                        <span class="font-mono text-base sm:text-lg font-black text-purple-950">${formatCurrency(totalRemainingDebt)}</span>
                    </div>
                    <div class="bg-white px-3.5 py-2 rounded-xl border border-emerald-200 text-center shadow-xs">
                        <span class="block text-[11px] font-bold text-emerald-700">إجمالي المسدد</span>
                        <span class="font-mono text-base sm:text-lg font-black text-emerald-700">${formatCurrency(totalPaid)}</span>
                    </div>
                </div>
            </div>

            <!-- 1. جدول الديون والالتزامات الحالية النشطة -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-2xs">
                <div class="flex flex-wrap justify-between items-center gap-2 mb-3 border-b pb-2">
                    <h4 class="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                        <i class="fas fa-file-invoice text-purple-600"></i> الديون والالتزامات الحالية (غير المسددة بالكامل)
                    </h4>
                    <span class="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">${debts.length} بنود</span>
                </div>
                ${
                    debts.length
                    ? `<div class="overflow-x-auto">
                        <table class="w-full min-w-[460px] text-right border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <th class="p-2.5">البيان / سبب الدين</th>
                                    <th class="p-2.5">تاريخ الإضافة</th>
                                    <th class="p-2.5">الفاتورة / المرجع</th>
                                    <th class="p-2.5 text-left">المبلغ المتبقي</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${debts.map(d => `
                                    <tr class="hover:bg-slate-50">
                                        <td class="p-2.5 font-bold text-slate-800">${escapeHTML(d.reason || 'دين عام')}${renderDebtRowRepeatBadge(d)}</td>
                                        <td class="p-2.5 text-slate-500">${d.createdAt ? new Date(d.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                                        <td class="p-2.5 text-indigo-700 font-mono text-xs">${escapeHTML(d.linkedInvoice || '-')}</td>
                                        <td class="p-2.5 text-left font-mono font-black text-purple-700">${formatCurrency(Number(d.amount || 0))}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`
                    : `<div class="text-center py-4 text-emerald-600 font-bold text-sm bg-emerald-50 rounded-lg border border-emerald-100">
                        <i class="fas fa-check-circle ml-1"></i> لا توجد أي ديون متبقية على هذا العميل (الحساب خالص بالكامل).
                    </div>`
                }
            </div>

            <!-- 2. جدول سجل الدفعات والسدادات والتحصيلات السابقة -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-2xs">
                <div class="flex flex-wrap justify-between items-center gap-2 mb-3 border-b pb-2">
                    <h4 class="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                        <i class="fas fa-history text-emerald-600"></i> سجل الدفعات والسدادات السابقة (تتبع السدادات)
                    </h4>
                    <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">${payments.length} عمليات سداد</span>
                </div>
                ${
                    payments.length
                    ? `<div class="overflow-x-auto">
                        <table class="w-full min-w-[460px] text-right border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <th class="p-2.5">تاريخ ووقت السداد</th>
                                    <th class="p-2.5">المبلغ المسدد</th>
                                    <th class="p-2.5">الخزينة / الحساب</th>
                                    <th class="p-2.5">البيان / تفاصيل الدين</th>
                                    <th class="p-2.5">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${payments.map(p => `
                                    <tr class="hover:bg-emerald-50/40">
                                        <td class="p-2.5 text-slate-600 font-mono text-xs">${new Date(p.date).toLocaleString('ar-EG')}</td>
                                        <td class="p-2.5 font-mono font-black text-emerald-700">${formatCurrency(Number(p.amount || 0))}</td>
                                        <td class="p-2.5 text-slate-800 font-semibold"><span class="bg-slate-100 px-2 py-0.5 rounded text-xs">${escapeHTML(p.accountName || 'خزينة')}</span></td>
                                        <td class="p-2.5 text-slate-700">${escapeHTML(p.debtReason || '-')}${renderPaymentRepeatBadges(p)}</td>
                                        <td class="p-2.5 text-slate-500 text-xs">${escapeHTML(p.note || '-')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`
                    : `<div class="text-center py-4 text-slate-400 italic text-xs">
                        لا توجد دفعات أو سدادات سابقة مسجلة لهذا العميل حتى الآن.
                    </div>`
                }
            </div>

            <!-- 3. ملاحظات التحصيل والمتابعة -->
            ${
                notes.length
                ? `<div class="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                    <h4 class="text-sm font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                        <i class="fas fa-sticky-note text-amber-600"></i> ملاحظات التحصيل والتواصل:
                    </h4>
                    <div class="space-y-1.5 text-xs text-slate-700">
                        ${notes.map(n => `
                            <div class="flex flex-wrap justify-between items-center gap-1 p-2 bg-white rounded border border-amber-100">
                                <span>${escapeHTML(n.note)}</span>
                                <span class="text-slate-400 font-mono text-[11px]">${new Date(n.createdAt).toLocaleDateString('ar-EG')} ${n.nextFollowUpDate ? `(متابعة: ${escapeHTML(n.nextFollowUpDate)})` : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`
                : ''
            }
        </div>
    `;

    customerStatementModal.style.display = 'block';
}

function openCustomerProfile(customerId) {
    const data = getCustomerFullStatementData(customerId);
    if (!data || !customerProfileContent || !customerProfileModal) return;

    const { customer, debts, totalRemainingDebt, payments, totalPaid, notes } = data;
    const repeatOrderIndex = (typeof window.buildRepeatOrderNameIndex === 'function') ? window.buildRepeatOrderNameIndex() : null;

    const renderDebtRowRepeatBadge = (d) => {
        if (!repeatOrderIndex || typeof window.findRepeatOrdersByCustomerName !== 'function') return '';
        const isOrderDebt = /^بيعة\s+باسم\s+/i.test(String(d.reason || '').trim()) || d.origin === 'credit_sale' || (d.linkedInvoice && d.linkedInvoice !== '-' && d.linkedInvoice !== 'بدون فاتورة') || !!d.saleId;
        if (!isOrderDebt) return '';
        const rawTarget = /^بيعة\s+باسم\s+/i.test(String(d.reason || '').trim()) ? d.reason : (d.customerName || d.name || d.reason || '');
        const info = window.findRepeatOrdersByCustomerName(rawTarget, {
            index: repeatOrderIndex,
            sources: ['active_debt', 'paid_debt'],
            profileId: customer.id
        });
        if (info.activeDebtCount >= 2) {
            const displayTarget = info.displayName || d.reason || '';
            return ` <button type="button" data-repeat-name="${escapeHTML(displayTarget)}" data-profile-id="${escapeHTML(customer.id)}" onclick="window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold align-middle mr-1 transition" title="اضغط لمراجعة كل الأوردرات بنفس الاسم"><i class="fas fa-bell text-amber-600"></i> متكرر بالديون (×${info.activeDebtCount})</button>`;
        } else if (info.activeDebtCount >= 1 && info.paidDebtCount >= 1) {
            const displayTarget = info.displayName || d.reason || '';
            return ` <button type="button" data-repeat-name="${escapeHTML(displayTarget)}" data-profile-id="${escapeHTML(customer.id)}" onclick="window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-bold align-middle mr-1 transition" title="اضغط لمراجعة الطلب السابق المسدّد"><i class="fas fa-history text-sky-600"></i> له سابق مسدّد (×${info.totalCount})</button>`;
        }
        return '';
    };

    const renderPaymentRepeatBadges = (p) => {
        if (!repeatOrderIndex || typeof window.detectDuplicateNamesInPaymentEntry !== 'function') return '';
        const alerts = window.detectDuplicateNamesInPaymentEntry(p, repeatOrderIndex, customer.id);
        if (!alerts.length) return '';
        const pills = alerts.map(a => `
            <button type="button" data-repeat-name="${escapeHTML(a.name)}" data-profile-id="${escapeHTML(customer.id)}" onclick="window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold transition" title="اضغط لعرض تفاصيل كل أوردرات ${escapeHTML(a.name)}">
                <i class="fas fa-bell text-amber-600"></i> ${escapeHTML(a.name)} (×${a.totalSystemCount})
            </button>
        `).join(' ');
        return `<div class="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-amber-800"><span class="font-bold">تنبيه أسماء متكررة (طلبات متعددة):</span> ${pills}</div>`;
    };

    customerProfileContent.innerHTML = `
        <div class="space-y-5">
            <!-- بطاقة العميل الرئيسية وبيانات التواصل القابلة للتعديل -->
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-extrabold text-slate-900">${escapeHTML(customer.name)}</h3>
                            <span class="text-xs text-indigo-600 font-semibold">كود العميل: ${escapeHTML(customer.id)}</span>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" data-customer-id="${escapeHTML(customer.id)}" onclick="openCustomerStatement(this.dataset.customerId)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-xs transition">
                            <i class="fas fa-file-invoice-dollar"></i> كشف حساب تفصيلي
                        </button>
                        <button type="button" data-customer-id="${escapeHTML(customer.id)}" onclick="openCollectionNotesModal(this.dataset.customerId)" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-xs transition">
                            <i class="fas fa-comment-dots"></i> إضافة ملاحظة
                        </button>
                    </div>
                </div>

                <!-- تعديل الهاتف والعنوان -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف:</label>
                        <input type="text" id="edit-customer-phone" value="${escapeHTML(customer.phone || '')}" placeholder="أدخل رقم الهاتف" class="w-full text-xs p-2 border border-slate-300 rounded-lg shadow-2xs">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">العنوان:</label>
                        <input type="text" id="edit-customer-address" value="${escapeHTML(customer.address || '')}" placeholder="أدخل العنوان" class="w-full text-xs p-2 border border-slate-300 rounded-lg shadow-2xs">
                    </div>
                </div>
                <div class="mt-3 text-left">
                    <button type="button" data-customer-id="${escapeHTML(customer.id)}" onclick="saveCustomerProfileDetails(this.dataset.customerId)" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow-xs transition">
                        <i class="fas fa-save ml-1"></i> حفظ تعديلات البيانات
                    </button>
                </div>
            </div>

            <!-- بطاقات الإحصائيات المالية -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-center">
                    <span class="block text-xs font-bold text-purple-700 mb-1">الديون المتبقية</span>
                    <span class="font-mono text-lg font-black text-purple-900">${formatCurrency(totalRemainingDebt)}</span>
                </div>
                <div class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span class="block text-xs font-bold text-emerald-700 mb-1">إجمالي المسدد</span>
                    <span class="font-mono text-lg font-black text-emerald-800">${formatCurrency(totalPaid)}</span>
                </div>
                <div class="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <span class="block text-xs font-bold text-blue-700 mb-1">إجمالي العمليات</span>
                    <span class="font-mono text-lg font-black text-blue-900">${debts.length + payments.length} حركة</span>
                </div>
            </div>

            <!-- سجل السدادات السابقة السريع -->
            <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h4 class="text-sm font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                    <i class="fas fa-history text-emerald-600"></i> آخر حركات السداد المسجلة:
                </h4>
                ${
                    payments.length
                    ? `<div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                        ${payments.slice(0, 10).map(p => `
                            <div class="flex flex-wrap justify-between items-center gap-2 p-2.5 bg-slate-50 hover:bg-emerald-50/50 rounded-lg border border-slate-100 text-xs transition">
                                <div class="min-w-0">
                                    <span class="font-bold text-slate-800">${escapeHTML(p.debtReason || 'سداد')}</span>
                                    ${renderPaymentRepeatBadges(p)}
                                    <span class="text-slate-400 block text-[11px]">${new Date(p.date).toLocaleString('ar-EG')} - في (${escapeHTML(p.accountName || 'خزينة')})</span>
                                </div>
                                <span class="font-mono font-black text-emerald-700 text-sm">${formatCurrency(Number(p.amount || 0))}</span>
                            </div>
                        `).join('')}
                    </div>`
                    : `<p class="text-xs text-slate-400 py-2 text-center">لا توجد حركات سداد سابقة.</p>`
                }
            </div>
        </div>
    `;

    customerProfileModal.style.display = 'block';
}

window.saveCustomerProfileDetails = function(customerId) {
    let customer = getDebtorProfileById(customerId);
    if (!customer) {
        const debts = getCustomerDebts(customerId);
        if (debts.length > 0) {
            customer = {
                id: customerId,
                name: debts[0].name || 'عميل',
                phone: '',
                address: '',
                generalNotes: '',
                createdAt: new Date().toISOString(),
                paymentHistory: []
            };
            if (!Array.isArray(debtorProfiles)) debtorProfiles = [];
            debtorProfiles.push(customer);
        }
    }
    if (!customer) {
        showGlobalMessage("تعذر العثور على العميل.", true);
        return;
    }
    const phoneInput = document.getElementById('edit-customer-phone');
    const addressInput = document.getElementById('edit-customer-address');
    if (phoneInput) customer.phone = phoneInput.value.trim();
    if (addressInput) customer.address = addressInput.value.trim();

    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    if (typeof updateUI === 'function') updateUI();
    if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحديث بيانات العميل "${customer.name}" بنجاح.`, false);
};

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
                <p class="text-gray-600 mt-2"><strong>اسم المورد:</strong> ${window.escapeHTML(creditorName)}</p>
                <p class="text-pink-700 font-bold mt-2 text-lg"><strong>الرصيد المتبقي المستحق:</strong> ${formatCurrency(totalActiveDebt)}</p>
            </div>

            <div class="mt-6">
                <h4 class="text-lg font-bold text-gray-700 mb-3 border-b pb-2"><i class="fas fa-list-ul ml-2 text-teal-600"></i> الالتزامات الحالية (غير المسددة بالكامل)</h4>
                ${
                    creditorLiabilities.filter(l => l.status !== 'paid' && (Number(l.amount) || 0) > 0.001).length
                    ? `<div class="overflow-x-auto"><table class="w-full text-right border-collapse min-w-[420px]" style="font-size: 14px;">
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
                    </table></div>`
                    : `<p class="text-gray-500 italic">لا توجد التزامات نشطة حالياً.</p>`
                }
            </div>

            <div class="mt-8">
                <h4 class="text-lg font-bold text-gray-700 mb-3 border-b pb-2"><i class="fas fa-history ml-2 text-blue-600"></i> سجل الدفعات السابقة</h4>
                ${
                    allPayments.length
                    ? `<div class="overflow-x-auto"><table class="w-full text-right border-collapse min-w-[480px]" style="font-size: 14px;">
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
                    </table></div>`
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
