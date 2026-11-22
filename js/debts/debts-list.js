// finance-core-debts.js - Debts, Liabilities, and Liquidity
window.renameLiability = async function(liabilityId) {
    const liability = (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) ? liabilities.find(l => l.id === liabilityId) : null;
    if (!liability) return;
    window.openRenameCreditorProfileModal(liability.name, liabilityId);
};

window.openRenameCreditorProfileModal = function(sourceCreditorName, liabilityId = null) {
    const modal = document.getElementById('renameCreditorProfileModal');
    if (!modal) return;

    let creditorName = (sourceCreditorName || '').trim();
    if (liabilityId && !creditorName) {
        const liab = (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) ? liabilities.find(l => l.id === liabilityId) : null;
        if (liab) creditorName = liab.name || '';
    }

    const matchingLiabs = (typeof liabilities !== 'undefined' && Array.isArray(liabilities))
        ? liabilities.filter(l => normalizeArabicText(l.name) === normalizeArabicText(creditorName) && (Number(l.amount) || 0) > 0.001)
        : [];

    const totalAmount = matchingLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0);

    const hiddenIdEl = document.getElementById('rcpm-target-liability-id');
    const origNameEl = document.getElementById('rcpm-original-name');
    const currentNameEl = document.getElementById('rcpm-current-name');
    const countEl = document.getElementById('rcpm-liabs-count');
    const totalEl = document.getElementById('rcpm-total-amount');
    const inputEl = document.getElementById('rcpm-new-name-input');
    const scopeContainer = document.getElementById('rcpm-scope-container');
    const applyAllCb = document.getElementById('rcpm-apply-all-checkbox');
    const applyAllText = document.getElementById('rcpm-apply-all-text');

    if (hiddenIdEl) hiddenIdEl.value = liabilityId || '';
    if (origNameEl) origNameEl.value = creditorName;
    if (currentNameEl) currentNameEl.textContent = creditorName || 'غير محدد';
    if (countEl) countEl.textContent = `${matchingLiabs.length || 1} بنود`;
    if (totalEl) totalEl.textContent = (typeof formatCurrency === 'function') ? formatCurrency(totalAmount) : `${totalAmount} ج.م`;
    if (inputEl) {
        inputEl.value = creditorName;
    }

    if (scopeContainer) {
        if (liabilityId && matchingLiabs.length > 1) {
            scopeContainer.classList.remove('hidden');
            if (applyAllCb) applyAllCb.checked = true;
            if (applyAllText) applyAllText.textContent = `تعديل الاسم في كافة التزامات هذا الدائن (${matchingLiabs.length} التزامات)`;
        } else {
            scopeContainer.classList.add('hidden');
        }
    }

    modal.style.display = 'block';
    setTimeout(() => {
        if (inputEl) {
            inputEl.focus();
            inputEl.select();
        }
    }, 50);
};

window.confirmRenameCreditorProfile = async function() {
    const origNameEl = document.getElementById('rcpm-original-name');
    const hiddenIdEl = document.getElementById('rcpm-target-liability-id');
    const inputEl = document.getElementById('rcpm-new-name-input');
    const applyAllCb = document.getElementById('rcpm-apply-all-checkbox');

    const oldName = origNameEl ? origNameEl.value.trim() : '';
    const newName = inputEl ? inputEl.value.trim() : '';
    const liabilityId = hiddenIdEl ? hiddenIdEl.value.trim() : '';
    const applyToAll = !liabilityId || (applyAllCb && applyAllCb.checked);

    if (!newName) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage('يرجى إدخال اسم الالتزام الجديد.', true);
        else alert('يرجى إدخال اسم الالتزام الجديد.');
        if (inputEl) inputEl.focus();
        return;
    }

    if (oldName === newName) {
        const modal = document.getElementById('renameCreditorProfileModal');
        if (modal) modal.style.display = 'none';
        return;
    }

    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        let updatedCount = 0;
        if (applyToAll) {
            // Update all liabilities matching oldName
            if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                liabilities.forEach(l => {
                    if (normalizeArabicText(l.name) === normalizeArabicText(oldName)) {
                        l.name = newName;
                        updatedCount++;
                    }
                    if (l.originalCreditorName && normalizeArabicText(l.originalCreditorName) === normalizeArabicText(oldName)) {
                        l.originalCreditorName = newName;
                    }
                });
            }

            // Also update suppliers if matching
            if (typeof suppliers !== 'undefined' && Array.isArray(suppliers)) {
                suppliers.forEach(s => {
                    if (normalizeArabicText(s.name) === normalizeArabicText(oldName)) {
                        s.name = newName;
                    }
                });
            }

            // Also update standalone serials if matching
            if (typeof standaloneSerials !== 'undefined' && Array.isArray(standaloneSerials)) {
                standaloneSerials.forEach(s => {
                    if (s.supplierName && normalizeArabicText(s.supplierName) === normalizeArabicText(oldName)) {
                        s.supplierName = newName;
                    }
                });
            }

            // Also update purchase invoices extra costs if matching
            if (typeof purchaseInvoices !== 'undefined' && Array.isArray(purchaseInvoices)) {
                purchaseInvoices.forEach(inv => {
                    if (Array.isArray(inv.extraCosts)) {
                        inv.extraCosts.forEach(ec => {
                            if (ec.creditorName && normalizeArabicText(ec.creditorName) === normalizeArabicText(oldName)) {
                                ec.creditorName = newName;
                            }
                        });
                    }
                });
            }

            if (typeof logOperation === 'function') {
                logOperation("تعديل اسم الالتزام / الدائن", `تم تعديل اسم الدائن من "${oldName}" إلى "${newName}" لعدد (${updatedCount}) التزامات.`);
            }
        } else {
            // Update single liability
            if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
                const liab = liabilities.find(l => l.id === liabilityId);
                if (liab) {
                    liab.name = newName;
                    updatedCount = 1;
                    if (typeof logOperation === 'function') {
                        logOperation("تعديل اسم التزام", `تم تعديل اسم الالتزام من "${oldName}" إلى "${newName}".`);
                    }
                }
            }
        }

        if (_tx) _tx.commit();

        const modal = document.getElementById('renameCreditorProfileModal');
        if (modal) modal.style.display = 'none';

        if (typeof updateUI === 'function') updateUI();
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(`تم تغيير اسم الالتزام إلى "${newName}" بنجاح.`, false);
        }
        if (typeof saveSystemToCloud === 'function') {
            saveSystemToCloud().catch(e => console.error(e));
        }
    } catch(err) {
        if (_tx) await _tx.rollback();
        console.error("Error renaming creditor:", err);
        if (typeof showGlobalMessage === 'function') showGlobalMessage('حدث خطأ أثناء تعديل الاسم.', true);
        else alert('حدث خطأ أثناء تعديل الاسم.');
    }
};
function createDebtListItemElement(item, customerId, isSubGroup, repeatOrderIndex) {
    const liElement = document.createElement('li');
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('ar-EG') : '';

    let repeatAlarmBadge = '';
    let isRepeatHighlighted = false;
    const isOrderDebt = /^بيعة\s+باسم\s+/i.test(String(item.reason || '').trim()) || item.origin === 'credit_sale' || (item.linkedInvoice && item.linkedInvoice !== '-' && item.linkedInvoice !== 'بدون فاتورة') || !!item.saleId;
    if (isOrderDebt && typeof window.findRepeatOrdersByCustomerName === 'function') {
        const rawTarget = /^بيعة\s+باسم\s+/i.test(String(item.reason || '').trim()) ? item.reason : (item.customerName || item.name || item.reason || '');
        const repInfo = window.findRepeatOrdersByCustomerName(rawTarget, {
            index: repeatOrderIndex,
            sources: ['active_debt', 'paid_debt'],
            profileId: customerId
        });
        if (repInfo.activeDebtCount >= 2) {
            isRepeatHighlighted = true;
            const displayTarget = repInfo.displayName || item.reason || '';
            repeatAlarmBadge = `<button type="button" data-repeat-name="${escapeHTML(displayTarget)}" data-profile-id="${escapeHTML(customerId)}" onclick="event.stopPropagation(); window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold transition shadow-2xs" title="اضغط لعرض كل الأوردرات المسجلة بنفس الاسم داخل هذا الحساب"><i class="fas fa-bell text-amber-600"></i> طلب متكرر بنفس الاسم (×${repInfo.activeDebtCount})</button>`;
        } else if (repInfo.activeDebtCount >= 1 && repInfo.paidDebtCount >= 1) {
            const displayTarget = repInfo.displayName || item.reason || '';
            repeatAlarmBadge = `<button type="button" data-repeat-name="${escapeHTML(displayTarget)}" data-profile-id="${escapeHTML(customerId)}" onclick="event.stopPropagation(); window.showRepeatOrderAlertDetails(this.dataset.repeatName, { sources: ['active_debt', 'paid_debt'], profileId: this.dataset.profileId })" class="inline-flex items-center gap-1 text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-bold transition shadow-2xs" title="اضغط لعرض الطلب السابق المسدّد بنفس الاسم داخل هذا الحساب"><i class="fas fa-history text-sky-600"></i> له طلب سابق مسدّد (×${repInfo.totalCount})</button>`;
        }
    }

    liElement.className = `text-sm text-gray-600 py-2 border-b border-gray-100 flex justify-between items-center flex-wrap gap-2 hover:bg-gray-50 px-2 rounded transition-colors ${isRepeatHighlighted ? 'bg-amber-50/40 border-r-4 border-r-amber-400' : (isSubGroup ? 'bg-purple-50/20' : '')}`;

    liElement.innerHTML = `
        <div class="flex items-center gap-2 flex-grow min-w-0">
            <input type="checkbox" class="debt-item-cb rounded border-purple-300 text-purple-600" data-debt-id="${escapeHTML(item.id)}" data-amount="${item.amount}" data-customer-id="${escapeHTML(customerId)}" onchange="updateDebtSelectionTotal(this.dataset.customerId)">
            <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <strong class="text-gray-900">${escapeHTML(item.reason || 'سبب غير محدد')}</strong>
                    ${repeatAlarmBadge}
                    ${item.originalCustomerName && isSubGroup ? `<span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">الأصل: ${escapeHTML(item.originalCustomerName)}</span>` : ''}
                    <span class="text-[10px] text-gray-400 font-normal">${dateStr}</span>
                </div>
                <div class="font-bold text-purple-700">${formatCurrency(Number(item.amount || 0))}</div>
            </div>
        </div>
        <div class="actions flex flex-wrap gap-1.5">
            <button class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-[11px] flex items-center gap-1" 
                    data-debt-id="${escapeHTML(item.id)}" onclick="openTransferDebtModal(this.dataset.debtId)">
                <i class="fas fa-exchange-alt"></i> تحويل
            </button>
            <button class="pay-partial-debt-btn bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-[11px] flex items-center gap-1" 
                    data-debt-id="${item.id}">
                <i class="fas fa-hand-holding-usd"></i> سداد جزئي
            </button>
            <button class="text-red-400 hover:text-red-600 p-1 transition-colors" 
                    data-debt-id="${escapeHTML(item.id)}" onclick="deleteDebtItem(this.dataset.debtId)" title="حذف وإعادة المبلغ للخزنة">
                <i class="fas fa-trash-alt text-sm"></i>
            </button>
        </div>
    `;
    return liElement;
}
function updateDebtorsListDisplay() {
    if (!debtorsListContainer) return;

    const searchValue = normalizeArabicText(debtsSearchInput ? debtsSearchInput.value : "");
    const notesFilterValue = debtsNotesFilter ? debtsNotesFilter.value : "all";
    const sortValue = debtsSortSelect ? debtsSortSelect.value : "amount_desc";

    debtorsListContainer.innerHTML = "";

    const grouped = {};

    debtors.forEach(debt => {
        const amount = Number(debt.amount) || 0;
        if (amount <= 0.001) return;

        let customerId = debt.customerId;

      if (!customerId) {
    const rawName = debt.name || debt.customerName || "";
    const normalizedName = normalizeArabicText(rawName);

    const existingProfile = debtorProfiles.find(p =>
        normalizeArabicText(p.name || "") === normalizedName
    );

    if (existingProfile) {
        customerId = existingProfile.id;
        debt.customerId = existingProfile.id;
    } else {
        const profile = getOrCreateDebtorProfile(rawName || "عميل بدون اسم");
        customerId = profile.id;
        debt.customerId = profile.id;
    }
}
        const profile = getDebtorProfileById(customerId);

        if (!grouped[customerId]) {
            grouped[customerId] = {
                customerId,
                profile,
                debts: [],
                total: 0
            };
        }

        grouped[customerId].debts.push(debt);
        grouped[customerId].total += amount;
    });

    let customers = Object.values(grouped);

    customers = customers.filter(group => {
        const profile = group.profile || {};
        const latestNote = getLatestCustomerNote(group.customerId);

        const searchName = profile.name || (group.debts[0] && group.debts[0].name) || "";
        const searchPhone = profile.phone || "";
        const searchAddress = profile.address || "";

        const searchableText = normalizeArabicText(`
            ${searchName}
            ${searchPhone}
            ${searchAddress}
            ${group.debts.map(d => d.reason || "").join(" ")}
            ${latestNote ? latestNote.note : ""}
        `);

        const matchesSearch = !searchValue || searchableText.includes(searchValue);

        let matchesNotes = true;
        if (notesFilterValue === "with_notes") {
            matchesNotes = !!latestNote;
        } else if (notesFilterValue === "without_notes") {
            matchesNotes = !latestNote;
        } else if (notesFilterValue === "with_followup") {
            matchesNotes = !!(latestNote && latestNote.nextFollowUpDate);
        }

        return matchesSearch && matchesNotes;
    });

    if (sortValue === "amount_desc") customers.sort((a, b) => b.total - a.total);
    if (sortValue === "amount_asc") customers.sort((a, b) => a.total - b.total);
    if (sortValue === "name_asc") {
        customers.sort((a, b) => {
            const nameA = a.profile?.name || (a.debts[0] && a.debts[0].name) || "";
            const nameB = b.profile?.name || (b.debts[0] && b.debts[0].name) || "";
            return nameA.localeCompare(nameB, 'ar');
        });
    }

    if (!customers.length) {
        debtorsListContainer.innerHTML = '<p class="text-center text-gray-500 py-4">لا توجد ديون مسجلة حاليًا بمبالغ ظاهرة.</p>';
        return;
    }

    const repeatOrderIndex = (typeof window.buildRepeatOrderNameIndex === 'function') ? window.buildRepeatOrderNameIndex() : null;

    customers.forEach(group => {
        const profile = group.profile || {};
        const latestNote = getLatestCustomerNote(group.customerId);

        const displayName = profile.name || (group.debts[0] && group.debts[0].name) || 'عميل';
        const displayPhone = profile.phone || 'بدون هاتف';

        let repeatGroupCount = 0;
        if (repeatOrderIndex && typeof window.findRepeatOrdersByCustomerName === 'function') {
            const seenRepeatNames = new Set();
            group.debts.forEach(d => {
                const isOrderDebt = /^بيعة\s+باسم\s+/i.test(String(d.reason || '').trim()) || d.origin === 'credit_sale' || (d.linkedInvoice && d.linkedInvoice !== '-' && d.linkedInvoice !== 'بدون فاتورة') || !!d.saleId;
                if (!isOrderDebt) return;
                const rawTarget = /^بيعة\s+باسم\s+/i.test(String(d.reason || '').trim()) ? d.reason : (d.customerName || d.name || d.reason || '');
                const info = window.findRepeatOrdersByCustomerName(rawTarget, {
                    index: repeatOrderIndex,
                    sources: ['active_debt', 'paid_debt'],
                    profileId: group.customerId
                });
                if (info.normalizedName && info.activeDebtCount >= 2) {
                    seenRepeatNames.add(info.normalizedName);
                }
            });
            repeatGroupCount = seenRepeatNames.size;
        }
        const repeatGroupBadge = repeatGroupCount > 0
            ? `<span class="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold" title="يوجد أوردرات بأسماء مكررة داخل هذا الحساب"><i class="fas fa-bell text-amber-600 text-[10px]"></i> أسماء متكررة (${repeatGroupCount})</span>`
            : '';

        const detailsElement = document.createElement('details');
        detailsElement.className = 'mb-2 border border-gray-200 rounded-xl overflow-hidden shadow-sm';
        detailsElement.dataset.customerId = group.customerId;

        const summaryElement = document.createElement('summary');
        summaryElement.className = 'p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer flex flex-wrap justify-between items-center gap-2 font-medium text-gray-800';
        summaryElement.innerHTML = `
            <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                    <i class="fas fa-user-circle text-purple-400"></i>
                    <strong>${window.escapeHTML(displayName)}</strong>
                    <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">${group.debts.length} بند</span>
                    ${repeatGroupBadge}
                </div>
                <div class="text-sm text-gray-500">${window.escapeHTML(displayPhone)}</div>
            </div>
            <span class="text-purple-700 font-semibold">${formatCurrency(group.total)}</span>
        `;

        const ulElement = document.createElement('ul');
        ulElement.className = 'p-3 pt-2 border-t border-gray-200 bg-white';

        // --- أزرار البروفايل والملاحظات وتحويل البروفايل ---
        const topInfoLi = document.createElement('li');
        topInfoLi.style.listStyle = 'none';
        topInfoLi.style.marginBottom = '10px';
        topInfoLi.innerHTML = `
            <div class="actions flex flex-wrap gap-2 mb-3">
                <button data-customer-id="${escapeHTML(group.customerId)}" onclick="openCustomerProfile(this.dataset.customerId)" class="bg-blue-500 text-white text-xs font-medium py-1 px-2.5 rounded">ملف العميل</button>
                <button data-customer-id="${escapeHTML(group.customerId)}" onclick="openCustomerStatement(this.dataset.customerId)" class="bg-indigo-500 text-white text-xs font-medium py-1 px-2.5 rounded">كشف حساب</button>
                <button data-customer-id="${escapeHTML(group.customerId)}" onclick="openCollectionNotesModal(this.dataset.customerId)" class="bg-yellow-500 text-white text-xs font-medium py-1 px-2.5 rounded">إضافة ملاحظة</button>
                <button data-customer-id="${escapeHTML(group.customerId)}" onclick="window.openTransferProfileModal(this.dataset.customerId)" class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1 px-2.5 rounded flex items-center gap-1 transition-colors shadow-2xs" title="تحويل كامل بروفايل هذا العميل إلى عميل آخر">
                    <i class="fas fa-exchange-alt"></i> تحويل كامل البروفايل
                </button>
            </div>
            ${
                latestNote
                ? `<div class="text-sm p-2 rounded bg-yellow-50 border border-yellow-200"><strong>آخر ملاحظة:</strong> ${escapeHTML(latestNote.note)}<br><strong>متابعة:</strong> ${escapeHTML(latestNote.nextFollowUpDate || 'لا يوجد')}</div>`
                : `<div class="text-sm text-gray-500">لا توجد ملاحظات تحصيل.</div>`
            }
        `;
        ulElement.appendChild(topInfoLi);

        // --- شريط تحديد الكل وسداد المحدد ---
        const selectBarLi = document.createElement('li');
        selectBarLi.style.listStyle = 'none';
        selectBarLi.className = 'mb-2 p-2 bg-purple-50 rounded-lg border border-purple-200';
        selectBarLi.innerHTML = `
            <div class="flex justify-between items-center flex-wrap gap-2">
                <label class="flex items-center gap-2 cursor-pointer text-sm font-bold text-purple-700">
                    <input type="checkbox" class="debt-select-all-cb rounded border-purple-300 text-purple-600" data-customer-id="${escapeHTML(group.customerId)}" onchange="toggleSelectAllDebts(this.dataset.customerId)">
                    <i class="fas fa-check-double"></i> تحديد الكل
                </label>
                <span class="text-xs text-purple-600 font-bold debt-selected-total" data-customer-id="${escapeHTML(group.customerId)}" style="display:none;">المحدد: 0.00 ج.م</span>
            </div>
            <div class="debt-pay-selected-bar mt-2" data-customer-id="${escapeHTML(group.customerId)}" style="display:none;">
                <div class="flex gap-2 items-center flex-wrap">
                    <select class="debt-pay-account-select text-xs py-1 px-2 border rounded flex-grow" data-customer-id="${escapeHTML(group.customerId)}" style="min-width:120px;">
                        ${accounts.map(acc => `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})</option>`).join('')}
                    </select>
                    <button data-customer-id="${escapeHTML(group.customerId)}" onclick="paySelectedDebtsForCustomer(this.dataset.customerId)" class="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors">
                        <i class="fas fa-hand-holding-usd"></i> سداد المحدد
                    </button>
                </div>
            </div>
        `;
        ulElement.appendChild(selectBarLi);

        // --- فصل الديون المباشرة عن الديون المنقولة من بروفايلات أخرى ---
        const directDebts = [];
        const transferredMap = {};

        group.debts.forEach(d => {
            const orig = (d.originalCustomerName && d.originalCustomerName !== displayName) ? d.originalCustomerName : null;
            if (orig) {
                if (!transferredMap[orig]) transferredMap[orig] = [];
                transferredMap[orig].push(d);
            } else {
                directDebts.push(d);
            }
        });

        // 1. عرض الديون المباشرة للعميل
        directDebts.sort((a, b) => (a.reason || "").localeCompare((b.reason || ""), 'ar')).forEach(item => {
            ulElement.appendChild(createDebtListItemElement(item, group.customerId, false, repeatOrderIndex));
        });

        // 2. عرض الديون المنقولة من بروفايلات قديمة في حافظة فرعية باسمها القديم
        Object.entries(transferredMap).forEach(([origName, subDebts]) => {
            const origTotal = subDebts.reduce((s, it) => s + (Number(it.amount) || 0), 0);
            const subDetails = document.createElement('details');
            subDetails.className = 'my-2 border border-purple-200/90 rounded-xl overflow-hidden bg-purple-50/40 shadow-xs';
            subDetails.innerHTML = `
                <summary class="p-2.5 px-3 bg-purple-100/70 hover:bg-purple-100 cursor-pointer flex flex-wrap justify-between items-center gap-2 text-xs font-bold text-purple-900 transition select-none">
                    <div class="flex flex-wrap items-center gap-2 min-w-0">
                        <i class="fas fa-folder-open text-purple-600 text-sm"></i>
                        <span>بروفايل منقول: <strong class="text-sm font-extrabold text-purple-950">${escapeHTML(origName)}</strong></span>
                        <span class="bg-purple-200/80 text-purple-800 text-[11px] px-2 py-0.5 rounded-full font-bold">${subDebts.length} ديون</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono text-purple-900 font-extrabold">${formatCurrency(origTotal)}</span>
                        <button type="button" class="text-[10px] bg-white hover:bg-rose-50 text-rose-700 border border-purple-200 px-2 py-0.5 rounded-md font-semibold transition" data-customer-id="${escapeHTML(group.customerId)}" data-orig-name="${escapeHTML(origName)}" onclick="event.stopPropagation(); window.unlinkTransferredDebts(this.dataset.customerId, this.dataset.origName)" title="فصل هذا البروفايل وإعادته مستقلاً">
                            <i class="fas fa-undo"></i> فصل
                        </button>
                    </div>
                </summary>
            `;
            const subUl = document.createElement('ul');
            subUl.className = 'p-2 pt-1 border-t border-purple-100 bg-white divide-y divide-gray-100';
            subDebts.sort((a, b) => (a.reason || "").localeCompare((b.reason || ""), 'ar')).forEach(item => {
                subUl.appendChild(createDebtListItemElement(item, group.customerId, true, repeatOrderIndex));
            });
            subDetails.appendChild(subUl);
            ulElement.appendChild(subDetails);
        });

        detailsElement.appendChild(summaryElement);
        detailsElement.appendChild(ulElement);
        debtorsListContainer.appendChild(detailsElement);
    });
}
function createLiabilityListItemElement(liability) {
    const li = document.createElement('li');
    li.className = 'py-3 flex flex-wrap justify-between items-center gap-2 hover:bg-rose-50/40 transition-colors rounded-lg px-2.5';
    
    const hasInvoice = !!liability.purchaseInvoiceId;
    let nameHTML = `<span class="font-medium text-slate-800">${escapeHTML(liability.name)}</span>`;
    
    if (hasInvoice) {
        nameHTML = `
            <div class="view-purchase-invoice-btn inline-block cursor-pointer" data-purchase-invoice-id="${liability.purchaseInvoiceId}">
                <span class="font-bold text-blue-700 hover:underline">
                    <i class="fas fa-file-invoice text-xs"></i> فاتورة مشتريات
                </span>
                <span class="block text-[10px] text-slate-400 mt-0.5">اضغط لعرض الفاتورة</span>
            </div>
        `;
    } else if (liability.isAmortizedDebt) {
        nameHTML = `<span class="font-bold text-rose-700"><i class="fas fa-sync-alt text-xs"></i> ${escapeHTML(liability.name)}</span>`;
    } else {
        nameHTML = `<span class="font-semibold text-slate-700">${escapeHTML(liability.category || 'التزام عام')}</span>`;
    }
    
    li.innerHTML = `
        <div class="flex-grow min-w-0">
            ${nameHTML}
            ${liability.originalCreditorName ? `<span class="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold mr-1.5 border border-rose-200">الأصل: ${escapeHTML(liability.originalCreditorName)}</span>` : ''}
            <div class="text-[10px] text-slate-400 mt-1"><i class="far fa-clock"></i> ${formatDateForDisplay(liability.date)}</div>
        </div>
        <div class="actions flex flex-wrap items-center gap-2 justify-end">
            <span class="text-rose-700 font-bold font-mono whitespace-nowrap bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 text-sm shadow-sm">${formatCurrency(liability.amount)}</span>
            <div class="flex flex-wrap items-center gap-1.5 mt-1 sm:mt-0">
                <button data-liability-id="${escapeHTML(liability.id)}" onclick="window.openTransferLiabilityModal(this.dataset.liabilityId)" class="text-[11px] bg-slate-700 hover:bg-slate-800 text-white font-bold py-1 px-2.5 rounded-lg transition-colors shadow-sm" title="تحويل الالتزام">
                    <i class="fas fa-exchange-alt"></i> تحويل
                </button>
                <button data-liability-id="${escapeHTML(liability.id)}" onclick="window.renameLiability(this.dataset.liabilityId)" style="background-color: #f59e0b; color: white;" class="text-[11px] hover:opacity-80 font-bold py-1 px-2 rounded-lg transition-colors shadow-sm" title="تعديل اسم الالتزام">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-liability-id="${escapeHTML(liability.id)}" onclick="openCreditorStatement(this.dataset.liabilityId)" class="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2.5 rounded-lg transition-colors shadow-sm" title="كشف حساب الدائن">
                    <i class="fas fa-file-invoice-dollar"></i> كشف
                </button>
                <button data-liability-id="${liability.id}" class="pay-liability-btn text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded-lg transition-colors shadow-sm">
                    <i class="fas fa-hand-holding-usd"></i> تسديد
                </button>
            </div>
        </div>
    `;
    return li;
}
     function updateLiabilitiesListDisplay() {
    if (!liabilitiesListContainer) return;
    
    // مسح المحتوى السابق
    liabilitiesListContainer.innerHTML = '';
    
    // نعرض فقط الالتزامات النشطة (أكبر من 0 ولم يتم سدادها)
    const visibleLiabilities = liabilities.filter(l => (Number(l.amount) || 0) > 0.001);

    if (visibleLiabilities.length === 0) {
        liabilitiesListContainer.innerHTML = '<li class="text-center text-gray-500 py-4">لا توجد التزامات مسجلة حاليًا.</li>';
        return;
    }

    // تجميع الالتزامات حسب اسم الدائن (Creditor Profile)
    const grouped = {};
    visibleLiabilities.forEach(l => {
        const rawName = l.name || "دائن بدون اسم";
        const normalizedName = normalizeArabicText(rawName);
        if (!grouped[normalizedName]) {
            grouped[normalizedName] = { name: rawName, liabilities: [], total: 0 };
        }
        grouped[normalizedName].liabilities.push(l);
        grouped[normalizedName].total += (Number(l.amount) || 0);
    });

    const creditors = Object.values(grouped).sort((a, b) => b.total - a.total); // ترتيب حسب المبلغ الإجمالي تنازلياً

    creditors.forEach(creditor => {
        const detailsElement = document.createElement('details');
        detailsElement.className = 'group mb-3.5 bg-white border border-slate-200 hover:border-rose-300 rounded-xl shadow-xs overflow-hidden transition-all';
        
        const summaryElement = document.createElement('summary');
        summaryElement.className = 'flex flex-wrap justify-between items-center gap-2.5 p-3 sm:p-3.5 cursor-pointer bg-slate-50/80 hover:bg-rose-50/30 transition-colors select-none';
        summaryElement.style.listStyle = 'none'; // لإخفاء السهم الافتراضي
        
        summaryElement.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold shadow-2xs flex-shrink-0">
                    <i class="fas fa-user-tie"></i>
                </div>
                <div class="min-w-0">
                    <div class="font-extrabold text-slate-900 text-base flex flex-wrap items-center gap-2">
                        <span>${escapeHTML(creditor.name)}</span>
                        <button type="button" data-creditor-name="${escapeHTML(creditor.name)}" onclick="event.preventDefault(); event.stopPropagation(); window.openRenameCreditorProfileModal(this.dataset.creditorName)" class="text-slate-400 hover:text-amber-600 text-xs p-1 transition" title="تعديل اسم الالتزام / الدائن">
                            <i class="fas fa-pen text-[11px]"></i>
                        </button>
                        <span class="text-[11px] bg-rose-100/90 text-rose-800 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">${creditor.liabilities.length} التزامات</span>
                    </div>
                    <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <i class="fas fa-chevron-down text-[10px] text-slate-400 group-open:rotate-180 transition-transform"></i> اضغط لعرض وتفصيل الالتزامات
                    </div>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <span class="font-mono font-black text-sm sm:text-base text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200 shadow-2xs">${formatCurrency(creditor.total)}</span>
                <span class="text-slate-300 hidden sm:inline">|</span>
                <div class="flex flex-wrap items-center gap-1.5" onclick="event.preventDefault(); event.stopPropagation()">
                    <button type="button" data-creditor-name="${escapeHTML(creditor.name)}" onclick="window.openRenameCreditorProfileModal(this.dataset.creditorName)" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-1.5 px-2.5 rounded-lg shadow-xs flex items-center gap-1 transition" title="تعديل اسم الالتزام / الدائن">
                        <i class="fas fa-edit text-xs"></i> تعديل الاسم
                    </button>
                    <button type="button" data-creditor-name="${escapeHTML(creditor.name)}" onclick="window.openPayFullCreditorProfileModal(this.dataset.creditorName)" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1 transition" title="سداد كامل التزامات هذا الدائن">
                        <i class="fas fa-hand-holding-usd text-xs"></i> سداد كامل البروفايل
                    </button>
                    <button type="button" data-creditor-name="${escapeHTML(creditor.name)}" onclick="window.openTransferCreditorProfileModal(this.dataset.creditorName)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-2.5 rounded-lg shadow-xs flex items-center gap-1 transition" title="تحويل كامل التزامات هذا الدائن إلى دائن آخر">
                        <i class="fas fa-exchange-alt text-xs"></i> تحويل البروفايل
                    </button>
                </div>
            </div>
        `;
        
        const ulElement = document.createElement('ul');
        ulElement.className = 'divide-y divide-gray-100 px-4 py-2';
        
        const directLiabs = [];
        const transLiabMap = {};
        creditor.liabilities.forEach(l => {
            const orig = (l.originalCreditorName && l.originalCreditorName !== creditor.name) ? l.originalCreditorName : null;
            if (orig) {
                if (!transLiabMap[orig]) transLiabMap[orig] = [];
                transLiabMap[orig].push(l);
            } else {
                directLiabs.push(l);
            }
        });

        directLiabs.sort((a, b) => b.amount - a.amount).forEach(liability => {
            ulElement.appendChild(createLiabilityListItemElement(liability));
        });

        Object.entries(transLiabMap).forEach(([origName, subLiabs]) => {
            const origTotal = subLiabs.reduce((s, it) => s + (Number(it.amount) || 0), 0);
            const subDetails = document.createElement('details');
            subDetails.className = 'my-2 border border-rose-200/90 rounded-lg overflow-hidden bg-rose-50/40';
            subDetails.innerHTML = `
                <summary class="p-2 cursor-pointer font-bold text-xs text-rose-950 bg-rose-100/70 hover:bg-rose-100 flex flex-wrap justify-between items-center gap-2 select-none">
                    <div class="flex flex-wrap items-center gap-2 min-w-0">
                        <i class="fas fa-folder-open text-rose-600"></i>
                        <span>التزامات محولة من: <strong class="text-rose-950">${escapeHTML(origName)}</strong> (${subLiabs.length} بنود)</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono text-rose-900 font-extrabold">${formatCurrency(origTotal)}</span>
                        <button type="button" class="text-[10px] bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-semibold transition" data-creditor-name="${escapeHTML(creditor.name)}" data-orig-name="${escapeHTML(origName)}" onclick="event.stopPropagation(); window.unlinkTransferredLiabilities(this.dataset.creditorName, this.dataset.origName)">
                            <i class="fas fa-undo"></i> فصل
                        </button>
                    </div>
                </summary>
            `;
            const subUl = document.createElement('ul');
            subUl.className = 'divide-y divide-gray-100 px-3 py-1 bg-white';
            subLiabs.sort((a, b) => b.amount - a.amount).forEach(liability => {
                subUl.appendChild(createLiabilityListItemElement(liability));
            });
            subDetails.appendChild(subUl);
            ulElement.appendChild(subDetails);
        });
        
        detailsElement.appendChild(summaryElement);
        detailsElement.appendChild(ulElement);
        liabilitiesListContainer.appendChild(detailsElement);
    });
}
window.openTransferLiabilityModal = function(liabilityId) {
    const liability = liabilities.find(l => l.id === liabilityId);
    if (!liability) return;

    const modal = document.getElementById('transferLiabilityModal');
    if (!modal) return;
    
    document.getElementById('trans-lia-source-name').textContent = liability.name;
    document.getElementById('trans-lia-available').textContent = formatCurrency(liability.amount);
    document.getElementById('trans-lia-amount').value = liability.amount;
    
    // تحديث قائمة الدائنين المقترحة
    const datalist = document.getElementById('liability-names-list');
    if (datalist) {
        const uniqueNames = [...new Set(liabilities.map(l => l.name))];
        datalist.innerHTML = uniqueNames.map(n => `<option value="${window.escapeHTML(n)}">`).join('');
    }
    
    // ربط التأكيد
    document.getElementById('confirmLiabilityTransferBtn').onclick = () => window.processLiabilityTransfer(liabilityId);
    
    // تصفير المدخلات
    document.getElementById('trans-lia-target-name').value = '';
    document.getElementById('trans-lia-new-category').value = '';
    document.getElementById('trans-lia-new-category').classList.add('hidden');
    const keepOpt = document.querySelector('input[name="lia-category-opt"][value="keep"]');
    if(keepOpt) keepOpt.checked = true;
    
    modal.style.display = 'block';
};

window.closeTransferLiabilityModal = function() {
    const modal = document.getElementById('transferLiabilityModal');
    if (modal) modal.style.display = 'none';
};

window.processLiabilityTransfer = async function(sourceLiabilityId) {
    const sourceIndex = liabilities.findIndex(l => l.id === sourceLiabilityId);
    if (sourceIndex === -1) return;

    const sourceLiability = liabilities[sourceIndex];
    const targetName = document.getElementById('trans-lia-target-name').value.trim();
    const transferAmount = parseFloat(document.getElementById('trans-lia-amount').value);
    
    const catOpt = document.querySelector('input[name="lia-category-opt"]:checked');
    const useNewCategory = catOpt ? catOpt.value === 'change' : false;
    const newCategory = document.getElementById('trans-lia-new-category').value.trim();
    const finalCategory = (useNewCategory && newCategory) ? newCategory : (sourceLiability.category || 'أخرى');

    const cleanTransferAmount = (typeof window.money === 'function' ? window.money : Number)(transferAmount);
    if (!targetName || isNaN(transferAmount) || cleanTransferAmount <= 0 || cleanTransferAmount > (Number(sourceLiability.amount) || 0) + 0.001) {
        if(typeof showGlobalMessage === 'function') showGlobalMessage("يرجى التأكد من اسم المستلم والمبلغ المحول.", true);
        else alert("يرجى التأكد من اسم المستلم والمبلغ المحول");
        return;
    }
    
    if (normalizeArabicText(targetName) === normalizeArabicText(sourceLiability.name)) {
        if(typeof showGlobalMessage === 'function') showGlobalMessage("لا يمكن التحويل لنفس الشخص.", true);
        return;
    }

    if(typeof saveStateToHistory === 'function') saveStateToHistory(); // للحفظ قبل التغيير
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        // خصم من المصدر مع حفظ purchaseInvoiceId الأصلي قبل حذفه من الالتزام المصفّر
        const oldSourceName = sourceLiability.name;
        const origPurchaseInvoiceId = sourceLiability.purchaseInvoiceId || null;
        const isPurchaseLinked = Boolean(origPurchaseInvoiceId);
        sourceLiability.amount = window.money(Math.max(0, (Number(sourceLiability.amount) || 0) - cleanTransferAmount));
        
        if (sourceLiability.amount < 0.01) {
            sourceLiability.amount = 0;
            sourceLiability.status = 'paid';
            // إزالة purchaseInvoiceId عن الالتزام المصفّر (وحفظه للعرض المرجعي فقط) حتى لا يلتقطه مرتجع المشتريات بدلاً من الالتزام المحوَّل
            if (isPurchaseLinked) {
                sourceLiability.transferredPurchaseInvoiceId = origPurchaseInvoiceId;
                delete sourceLiability.purchaseInvoiceId;
            }
        }

        // إضافة للمستلم الجديد: يمنع الدمج في التزام مرتبط بفاتورة مشتريات (أو عند تحويل التزام مشتريات) للحفاظ على ربط الفواتير
        const existingTargetLiability = isPurchaseLinked ? null : liabilities.find(l => 
            normalizeArabicText(l.name) === normalizeArabicText(targetName) && 
            l.status !== 'paid' && 
            !l.purchaseInvoiceId &&
            normalizeArabicText(l.category || 'أخرى') === normalizeArabicText(finalCategory)
        );

        if (existingTargetLiability) {
            existingTargetLiability.amount = window.money((Number(existingTargetLiability.amount) || 0) + cleanTransferAmount);
        } else {
            const newLiab = {
                id: generateId("LIA"),
                name: targetName,
                amount: cleanTransferAmount,
                status: 'active',
                date: new Date().toISOString(),
                category: finalCategory,
                note: `محول من ${oldSourceName}`
            };
            // الحفاظ على ربط فاتورة الشراء عند تحويل التزام مشتريات لطرف آخر
            if (isPurchaseLinked) {
                newLiab.purchaseInvoiceId = origPurchaseInvoiceId;
                if (sourceLiability.source) newLiab.source = sourceLiability.source;
                if (sourceLiability.invoiceNumber) newLiab.invoiceNumber = sourceLiability.invoiceNumber;
                if (sourceLiability.supplierId) newLiab.supplierId = sourceLiability.supplierId;
            }
            liabilities.push(newLiab);
        }

        if(typeof logOperation === 'function') logOperation("تحويل التزام", `تم تحويل التزام بقيمة ${formatCurrency(cleanTransferAmount)} من "${oldSourceName}" إلى "${targetName}".`);

        if (_tx) _tx.commit();
        window.closeTransferLiabilityModal();
        if(typeof updateUI === 'function') updateUI();
        if(typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحويل الالتزام بنجاح إلى ${targetName}.`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("فشل تحويل الالتزام:", err);
        if(typeof showGlobalMessage === 'function') showGlobalMessage("فشل تحويل الالتزام؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
    }
};
 function updateOffsetDatalists() { if (!debtorNamesDatalistOffset || !creditorNamesDatalistOffset) return; // Populate Debtor Datalist
    const debtorNames = [...new Set(debtors.filter(d => (Number(d.amount) || 0) > 0.001).map(d => d.name))].sort((a, b) => a.localeCompare(b, 'ar'));
    debtorNamesDatalistOffset.innerHTML = debtorNames.map(name => `<option value="${escapeHTML(name)}"></option>`).join('');

    // Populate Creditor Datalist
    const creditorNames = [...new Set(liabilities.filter(l => (Number(l.amount) || 0) > 0.001).map(l => l.name))].sort((a, b) => a.localeCompare(b, 'ar'));
    creditorNamesDatalistOffset.innerHTML = creditorNames.map(name => `<option value="${escapeHTML(name)}"></option>`).join('');
}

window.openAddDebtModal = function() {
    const modal = document.getElementById('addDebtModal');
    if (!modal) return;

    const accSelect = document.getElementById('debt-advance-account');
    if (accSelect && typeof accounts !== 'undefined' && Array.isArray(accounts)) {
        accSelect.innerHTML = accounts.map(acc => `<option value="${escapeHTML(acc.id)}">${escapeHTML(acc.name)} (${formatCurrency(acc.balance)})</option>`).join('');
    }

    const nameInput = document.getElementById('debtor-name');
    const phoneInput = document.getElementById('debtor-phone');
    const addressInput = document.getElementById('debtor-address');
    const reasonInput = document.getElementById('add-debt-reason');
    const amountInput = document.getElementById('add-debt-amount');
    const deductCb = document.getElementById('debt-deduct-liquidity');
    const accContainer = document.getElementById('debt-advance-account-container');
    const modalMsg = document.getElementById('debts-modal-message');

    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
    if (reasonInput) reasonInput.value = '';
    if (amountInput) amountInput.value = '0';
    if (deductCb) deductCb.checked = false;
    if (accContainer) accContainer.classList.add('hidden');
    if (modalMsg) modalMsg.innerHTML = '';

    modal.style.display = 'block';
    setTimeout(() => { if (nameInput) nameInput.focus(); }, 50);
};

window.closeAddDebtModal = function() {
    const modal = document.getElementById('addDebtModal');
    if (modal) modal.style.display = 'none';
    const nameInput = document.getElementById('debtor-name');
    const phoneInput = document.getElementById('debtor-phone');
    const addressInput = document.getElementById('debtor-address');
    const reasonInput = document.getElementById('add-debt-reason');
    const amountInput = document.getElementById('add-debt-amount');
    const deductCb = document.getElementById('debt-deduct-liquidity');
    const accContainer = document.getElementById('debt-advance-account-container');
    const modalMsg = document.getElementById('debts-modal-message');

    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
    if (reasonInput) reasonInput.value = '';
    if (amountInput) amountInput.value = '0';
    if (deductCb) deductCb.checked = false;
    if (accContainer) accContainer.classList.add('hidden');
    if (modalMsg) modalMsg.innerHTML = '';
};
