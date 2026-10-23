window.convertPendingSaleToDebt = async function(pendingSaleId, debtMode, targetDebtId, confirmSale, accountId) {
    // 1. استحضار البيعة المؤقتة
    const pendingIndex = pendingSales.findIndex(s => String(s.id) === String(pendingSaleId));
    if (pendingIndex === -1) {
        showGlobalMessage("خطأ: لم يتم العثور على البيعة.", true);
        return;
    }
    const saleData = pendingSales[pendingIndex];
    // Force clear the lock just in case it was stuck from a previous error
    saleData.isProcessingDebt = false;
    saleData.isProcessingDebt = true;
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {

    // 2. تأكيد المبالغ
    const totalAmount = Number(saleData.grandTotal || saleData.finalTotal || saleData.totalSellPrice || 0);
    const paidAmount = Number(saleData.depositPaid || saleData.paidAmount || 0);
    const remainingAmount = Math.max(0, (typeof window.money === 'function' ? window.money(totalAmount - paidAmount) : totalAmount - paidAmount));

    if (remainingAmount <= 0) {
        saleData.isProcessingDebt = false; // تحرير القفل
        showGlobalMessage("المبلغ مدفوع بالكامل، لا يمكن تحويله لدين.", true);
        return;
    }

    if (typeof saveStateToHistory === 'function') saveStateToHistory();

    let invoiceCode = saleData.invoiceNumber;

    if (!invoiceCode || String(invoiceCode).startsWith('pending')) {
        if (saleData.id && String(saleData.id).startsWith('INV-')) {
            invoiceCode = saleData.id;
        } else {
            const saleDateStr = (
                saleData.saleDate ||
                (saleData.createdAt ? (typeof getCairoDateString === 'function' ? getCairoDateString(saleData.createdAt) : null) : null) ||
                (saleData.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(saleData.timestamp) : null) : null) ||
                (typeof currentLoadedDate !== 'undefined' && currentLoadedDate ? currentLoadedDate : null) ||
                (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }))
            ).replace(/-/g, '');
            let maxSeq = 0;
            if (typeof salesToday !== 'undefined') {
                salesToday.forEach(sale => {
                    if (sale.invoiceNumber && sale.invoiceNumber.startsWith(saleDateStr)) {
                        const seq = parseInt(sale.invoiceNumber.split('-')[1] || '0');
                        if (seq > maxSeq) maxSeq = seq;
                    }
                });
            }
            if (maxSeq > 0) {
                 invoiceCode = `${saleDateStr}-${(maxSeq + 1).toString().padStart(3, "0")}`;
            } else {
                 invoiceCode = 'INV-' + (typeof window.generateGlobalID === 'function' ? window.generateGlobalID('').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() : Math.floor(10000 + Math.random() * 90000));
            }
        }
    }

    let safeInvoiceId = '';
    if (invoiceCode.startsWith('INV-')) {
        safeInvoiceId = invoiceCode.replace('INV-', 'inv-');
    } else {
        const cleanCustomer = (saleData.customerName || 'cash').trim().replace(/\s+/g, '_').toLowerCase();
        const timePart = new Date(saleData.timestamp || saleData.saleDate || Date.now()).getTime();
        safeInvoiceId = `inv_${timePart}_${totalAmount}_${cleanCustomer}`;
    }

    // 3. تأكيد الفاتورة في المبيعات
    if (confirmSale) {
        const resolvedAccountId = accountId || saleData.depositAccountId || saleData.accountId || (accounts && accounts[0] && accounts[0].id) || 'safe_main';

        const finalProfit = Number(saleData.potentialProfit || saleData.profit || 0);
        let normalizedItems = [];
        
        if (saleData.items && saleData.items.length > 0) {
            normalizedItems = [...saleData.items];
        } 
        else if (saleData.mainProduct) {
            normalizedItems.push({ name: saleData.mainProduct.name, quantity: saleData.mainProduct.quantity, costPrice: saleData.mainProduct.costPrice, unitPrice: (saleData.totalSellPrice || totalAmount) / (saleData.mainProduct.quantity || 1), subtotal: saleData.totalSellPrice || totalAmount });
            if (saleData.additionalItems && saleData.additionalItems.length > 0) {
                saleData.additionalItems.forEach(att => {
                    normalizedItems.push({ name: att.name, quantity: att.quantity, costPrice: att.costPrice, unitPrice: 0, subtotal: 0 });
                });
            }
        }

        const confirmedInvoice = { 
            ...saleData, 
            id: safeInvoiceId,                   // المعرف الموحد الثابت للسحابة
            invoiceNumber: invoiceCode,      
            type: 'invoice-from-pending',    
            convertedFromPending: true,
            migrated: false,
            // �� استخدام التاريخ الأصلي للبيعة المؤقتة ��
            saleDate: saleData.saleDate || (saleData.createdAt ? (typeof getCairoDateString === 'function' ? getCairoDateString(saleData.createdAt) : null) : null) || (saleData.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(saleData.timestamp) : null) : null) || (typeof currentLoadedDate !== 'undefined' && currentLoadedDate ? currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }))),
            date: (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })), 
            grandTotal: totalAmount, 
            totalSellPrice: totalAmount,
            paidAmount: paidAmount, 
            remainingAmount: remainingAmount, 
            profit: finalProfit,           
            items: normalizedItems,        
            timestamp: saleData.timestamp || new Date().toISOString(), // �� تثبيت الوقت القديم إن وجد ��
            confirmedAt: new Date().toISOString(), // �� تتبع وقت التأكيد الفعلي لمنع الأشباح في التراجع ��
            accountId: resolvedAccountId,
            status: 'completed'
        };

        // ✅ تطبيق الاستقطاع المخفي إن وجد لتصحيح الربح والدين
        if (typeof applyPendingDeduction === 'function') {
            applyPendingDeduction(confirmedInvoice);
        }


        // �� التوافق مع التراجع (Undo) وتجنب تلوث واجهة اليوم الحالي ��
        if (typeof salesToday !== 'undefined' && !salesToday.some(s => s.id === safeInvoiceId)) {
            salesToday.push(confirmedInvoice);
        }
        
        if (typeof saveInvoiceToFirestore === 'function') {
            try {
                await saveInvoiceToFirestore(confirmedInvoice); 
                if (_tx && typeof _tx.addRollbackAction === 'function') {
                    _tx.addRollbackAction(async () => {
                        try {
                            if (window.db && window.currentUser && confirmedInvoice && confirmedInvoice.id) {
                                const invDocRef = window.doc(window.db, "users", window.currentUser.uid, "invoices", String(confirmedInvoice.id));
                                if (typeof window.deleteDoc === 'function') {
                                    await window.deleteDoc(invDocRef);
                                    console.log(`[Transaction Rollback] تم حذف الفاتورة ${confirmedInvoice.id} من السحابة في تحويل الدين.`);
                                }
                            }
                        } catch (delErr) {
                            console.error("فشل حذف الفاتورة من السحابة أثناء التراجع:", delErr);
                        }
                    });
                }
            } catch (e) {
                console.error("Error saving to Firestore:", e);
                throw e;
            }
        }

       
        
        if (typeof totalProfit !== 'undefined') {
            totalProfit = window.money(totalProfit + finalProfit);
        }
    }

    // 4. الفصل الفيزيائي للديون (منع التداخل)
    const newEntryNote = "بيعة باسم " + (saleData.customerName || "عميل غير محدد");
    let done = false;

    const finalInvoiceRef = (confirmSale) ? invoiceCode : "بدون فاتورة";

    if (debtMode === 'existing' && targetDebtId) {
        const existingDebt = debtors.find(d => String(d.id) === String(targetDebtId));
        if (existingDebt) {
            const targetCustomerId = existingDebt.customerId;
            const targetCustomerName = existingDebt.name || existingDebt.customerName;

            const newDebtRecord = {
                id: (typeof generateId === 'function') ? generateId("DEBT") : ("D-" + Date.now()),
                customerId: targetCustomerId, 
                name: targetCustomerName,
                customerName: targetCustomerName,
                amount: remainingAmount,
                reason: newEntryNote, 
                createdAt: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                linkedInvoice: finalInvoiceRef
            };

            debtors.push(JSON.parse(JSON.stringify(newDebtRecord)));
            showGlobalMessage(`تم إضافة بند دين مستقل لحساب: ${targetCustomerName}`);
            done = true;
        }
    }

    if (!done) {
        let debtorProfileId = null;
        if (typeof getOrCreateDebtorProfile === 'function') {
            const prof = getOrCreateDebtorProfile(saleData.customerName);
            if (prof && prof.id) debtorProfileId = prof.id;
        } else if (typeof window.getOrCreateDebtorProfile === 'function') {
            const prof = window.getOrCreateDebtorProfile(saleData.customerName);
            if (prof && prof.id) debtorProfileId = prof.id;
        }

        const newCustomerDebt = {
            id: (typeof generateId === 'function') ? generateId("DEBT") : ("D-" + Date.now()),
            customerId: debtorProfileId,
            name: saleData.customerName,
            customerName: saleData.customerName,
            amount: remainingAmount,
            reason: newEntryNote,
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            linkedInvoice: finalInvoiceRef
        };
        debtors.push(JSON.parse(JSON.stringify(newCustomerDebt)));
        showGlobalMessage(`تم تسجيل دين لعميل جديد: ${saleData.customerName}`);
    }

    if (typeof logOperation === 'function') {
        const custName = saleData.customerName || 'عميل نقدي';
        if (confirmSale) {
            logOperation("تأكيد بيع وتحويل لدين", `تأكيد بيع مؤقت (فاتورة: ${invoiceCode}) للعميل "${custName}" وتحويل المتبقي (${formatCurrency(remainingAmount)}) إلى دين.`);
        } else {
            logOperation("تحويل بيع مؤقت لدين", `تحويل بيع مؤقت للعميل "${custName}" بمبلغ (${formatCurrency(remainingAmount)}) إلى دين.`);
        }
    }

    // تأكيد انتقال حالة السيريالات إلى مباع
    if (typeof serialNumbersLog !== 'undefined' && Array.isArray(serialNumbersLog)) {
        const serialsToMark = [];
        if (saleData.items) saleData.items.forEach(it => { if (it.serial) serialsToMark.push(it.serial); });
        if (saleData.mainProduct && saleData.mainProduct.serial) serialsToMark.push(saleData.mainProduct.serial);
        serialsToMark.forEach(sn => {
            const sIdx = serialNumbersLog.findIndex(l => l.serial === sn);
            if (sIdx !== -1) serialNumbersLog[sIdx].status = 'sold';
        });
    }

    // 5. التنظيف والإغلاق وتحديث الواجهة
    pendingSales.splice(pendingIndex, 1);
    
    // �� الإصلاح الثالث: حذف البيعة المؤقتة نهائياً من Firebase ��
    if (window.db && window.currentUser && typeof window.deleteDoc === 'function' && typeof window.doc === 'function') {
        try {
            window.deleteDoc(window.doc(window.db, "users", window.currentUser.uid, "pending_sales", String(pendingSaleId)));
        } catch (error) {
            console.log("تنبيه: الكوليكشن الخاص بالمبيعات المؤقتة قد لا يكون مستقلاً، تم الحذف المحلي.");
        }
    }
    
    const m = document.getElementById('convertPendingToDebtModal');
    if (typeof saveCurrentStateByDate === 'function') { await saveCurrentStateByDate(currentLoadedDate || (typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })))); }
    if (m) m.style.display = 'none';

    updateUI();
    if (typeof window.refreshMainUI === 'function') window.refreshMainUI();
    } catch(err) {
        if (_tx) await _tx.rollback();
        console.error("❌ فشل تحويل البيعة إلى دين (تم التراجع عن التعديلات):", err);
        showGlobalMessage("حدث خطأ أثناء تحويل البيع لدين؛ تم التراجع التلقائي عن التعديلات بالكامل.", true);
    } finally {
        if (saleData) saleData.isProcessingDebt = false;
    }

    // مزامنة كافة التغييرات الأخرى (الديون والسيولة والمخزون) مع السحابة
    // �� حماية من التبخر السريع لو تم تحديث الصفحة ��
    try {
        localStorage.setItem("goodsMgmt_data_salesToday", JSON.stringify(typeof salesToday !== 'undefined' ? salesToday : []));
        localStorage.setItem("goodsMgmt_data_pendingSales", JSON.stringify(typeof pendingSales !== 'undefined' ? pendingSales : []));
    } catch(e) {
        console.warn("فشل حفظ نسخة الطوارئ في localStorage داخل convertPendingToDebt:", e);
    }
    
    if (typeof saveSystemToCloud === 'function') {
        saveSystemToCloud();
    }
};
window.openConvertPendingSaleToDebtDialog = function(pendingSaleId) {
    const sale = pendingSales.find(s => s.id === pendingSaleId);
    if (!sale) {
        showGlobalMessage("خطأ: لم يتم العثور على البيع المؤقت.", true);
        return;
    }

    const totalAmount = Number(sale.totalSellPrice || sale.grandTotal || 0);
    const paidAmount = Number(sale.depositPaid || sale.paidAmount || sale.depositAmount || 0);
    const remainingAmount = Math.max(0, (typeof window.money === 'function' ? window.money(totalAmount - paidAmount) : totalAmount - paidAmount));

    let modal = document.getElementById('convertPendingToDebtModal');
    if (!modal) return;

    document.getElementById('cpd_pending_id').value = pendingSaleId;

    const summaryEl = document.getElementById('cpd_sale_summary');
    summaryEl.innerHTML = `
        <div><strong>العميل:</strong> ${escapeHTML(sale.customerName || '-')}</div>
        <div><strong>إجمالي البيعة:</strong> ${formatCurrency(totalAmount)}</div>
        <div><strong>المدفوع / العربون:</strong> ${formatCurrency(paidAmount)}</div>
        <div><strong>المتبقي:</strong> ${formatCurrency(remainingAmount)}</div>
        <div><strong>عدد البنود:</strong> ${Array.isArray(sale.items) ? sale.items.length : 1}</div>
    `;

    document.getElementById('cpd_remaining_amount').value = formatCurrency(remainingAmount);

    const accountSelect = document.getElementById('cpd_account_id');
    accountSelect.innerHTML = '<option value="">اختر الحساب</option>';
    (accounts || []).forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = `${acc.name} - الرصيد: ${formatCurrency(Number(acc.balance || 0))}`;
        accountSelect.appendChild(option);
    });

 const existingDebtSelect = document.getElementById('cpd_existing_debt_id');
existingDebtSelect.innerHTML = '<option value="">اختر اسم صاحب الدين</option>';

const groupedDebts = {};

(debtors || []).forEach(debt => {
    const key = debt.customerId || normalizeArabicText(debt.name || debt.customerName || '');

    if (!groupedDebts[key]) {
        groupedDebts[key] = {
            id: debt.id,
            name: debt.name || debt.customerName || 'عميل غير محدد',
            total: 0
        };
    }

    groupedDebts[key].total += Number(debt.amount || 0);
});

const debtOptions = Object.values(groupedDebts);

debtOptions.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} - ${formatCurrency(item.total)}`;
    existingDebtSelect.appendChild(option);
});

const existingDebtRadio = document.querySelector('input[name="cpd_debt_mode"][value="existing"]');
if (debtOptions.length === 0) {
    existingDebtRadio.disabled = true;
    existingDebtRadio.parentElement.style.opacity = '0.5';
} else {
    existingDebtRadio.disabled = false;
    existingDebtRadio.parentElement.style.opacity = '1';
}

    document.querySelector('input[name="cpd_confirm_sale"][value="yes"]').checked = true;
    document.querySelector('input[name="cpd_debt_mode"][value="new"]').checked = true;
    toggleConvertPendingDebtOptions();
    toggleConvertPendingDebtModes();

    modal.style.display = 'block';
};

window.toggleConvertPendingDebtOptions = function() {
    // إخفاء قسم الخزنة لأن كامل المبلغ المتبقي يتحول لدين ولا يوجد كاش مستلم
    const accountSection = document.getElementById('cpd_account_section');
    if (accountSection) accountSection.style.display = 'none';
};

window.toggleConvertPendingDebtModes = function() {
    const mode = document.querySelector('input[name="cpd_debt_mode"]:checked')?.value;
    const section = document.getElementById('cpd_existing_debt_section');
    if (section) {
        section.style.display = mode === 'existing' ? 'block' : 'none';
    }
};

window.confirmConvertPendingSaleToDebt = function() {
    const pendingSaleId = document.getElementById('cpd_pending_id')?.value;
    const confirmSale = document.querySelector('input[name="cpd_confirm_sale"]:checked')?.value === 'yes';
    const debtMode = document.querySelector('input[name="cpd_debt_mode"]:checked')?.value || 'new';
    const targetDebtId = document.getElementById('cpd_existing_debt_id')?.value || null;
    const accountId = document.getElementById('cpd_account_id')?.value || null;

    const sale = pendingSales.find(s => s.id === pendingSaleId);
    if (!sale) {
        showGlobalMessage("لم يتم العثور على البيعة المؤقتة.", true);
        return;
    }

    const totalAmount = Number(sale.totalSellPrice || sale.grandTotal || 0);
    const paidAmount = Number(sale.depositPaid || sale.paidAmount || sale.depositAmount || 0);
    const remainingAmount = Math.max(0, (typeof window.money === 'function' ? window.money(totalAmount - paidAmount) : totalAmount - paidAmount));

    if (remainingAmount <= 0) {
        showGlobalMessage("لا يوجد مبلغ متبقٍ لتحويله إلى دين.", true);
        return;
    }

    if (debtMode === 'existing' && !targetDebtId) {
        showGlobalMessage("يجب اختيار الدين القديم أولاً.", true);
        return;
    }

    convertPendingSaleToDebt(pendingSaleId, debtMode, targetDebtId, confirmSale, accountId);
    const m = document.getElementById('convertPendingToDebtModal'); if (m) m.style.display = 'none';
};

// =====================================================================
// 🌟 نظام تحويل كامل بروفايل العميل أو الدائن (Profile Transfer & Merge)
// =====================================================================

window.openTransferProfileModal = function(sourceCustomerId) {
    const profile = getDebtorProfileById(sourceCustomerId);
    if (!profile) return;
    const sourceDebts = debtors.filter(d => d.customerId === sourceCustomerId && Number(d.amount) > 0.001);
    if (!sourceDebts.length) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage("لا توجد ديون نشطة في هذا البروفايل للتحويل.", true);
        else alert("لا توجد ديون نشطة في هذا البروفايل للتحويل.");
        return;
    }
    const totalAmount = sourceDebts.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const modal = document.getElementById('transferProfileModal');
    if (!modal) return;

    document.getElementById('tpm-source-name').textContent = profile.name;
    document.getElementById('tpm-debts-count').textContent = `${sourceDebts.length} بنود`;
    document.getElementById('tpm-total-amount').textContent = formatCurrency(totalAmount);
    
    const selectEl = document.getElementById('tpm-target-select');
    selectEl.innerHTML = '<option value="">-- اختر من العملاء الحاليين --</option>' + 
        (debtorProfiles || []).filter(p => p.id !== sourceCustomerId).map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>`).join('');
    
    document.getElementById('tpm-target-name-input').value = '';
    document.getElementById('confirmTransferProfileBtn').onclick = () => window.confirmTransferProfile(sourceCustomerId);
    modal.style.display = 'block';
};

window.confirmTransferProfile = async function(sourceCustomerId) {
    const sourceProfile = getDebtorProfileById(sourceCustomerId);
    if (!sourceProfile) return;
    const selectEl = document.getElementById('tpm-target-select');
    const inputEl = document.getElementById('tpm-target-name-input');
    const newName = inputEl ? inputEl.value.trim() : '';
    const targetProfile = newName ? getOrCreateDebtorProfile(newName) : (selectEl && selectEl.value ? getDebtorProfileById(selectEl.value) : null);

    if (!targetProfile || targetProfile.id === sourceCustomerId) {
        alert("يرجى اختيار العميل المنقول إليه");
        return;
    }
    const sourceDebts = debtors.filter(d => d.customerId === sourceCustomerId && Number(d.amount) > 0.001);
    if (!sourceDebts.length) return alert("لا توجد ديون نشطة في هذا البروفايل للتحويل.");
    if (!confirm(`هل أنت متأكد من تحويل كامل بروفايل "${sourceProfile.name}" (${sourceDebts.length} ديون) إلى "${targetProfile.name}"؟`)) return;

    saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
        let totalTransferred = 0;
        sourceDebts.forEach(d => {
            totalTransferred += (Number(d.amount) || 0);
            d.originalCustomerId = d.originalCustomerId || sourceProfile.id;
            d.originalCustomerName = d.originalCustomerName || sourceProfile.name;
            d.customerId = targetProfile.id;
            d.name = targetProfile.name;
            d.customerName = targetProfile.name;
            d.transferredAt = new Date().toISOString();
        });
        logOperation("تحويل كامل بروفايل دين", `تم نقل كامل بروفايل "${sourceProfile.name}" بإجمالي ${formatCurrency(totalTransferred)} إلى "${targetProfile.name}".`);
        if (_tx) _tx.commit();
        const m = document.getElementById('transferProfileModal');
        if (m) m.style.display = 'none';
        updateUI();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحويل كامل بروفايل "${sourceProfile.name}" إلى "${targetProfile.name}" بنجاح.`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch(err) {
        if (_tx) await _tx.rollback();
        console.error(err);
        alert("حدث خطأ أثناء تحويل البروفايل.");
    }
};

window.unlinkTransferredDebts = async function(customerId, origName) {
    if (!confirm(`هل ترغب في فصل ديون "${origName}" وإعادتها كبروفايل مستقل؟`)) return;
    saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
        const origProfile = getOrCreateDebtorProfile(origName);
        let count = 0;
        debtors.forEach(d => {
            if (d.customerId === customerId && d.originalCustomerName === origName) {
                d.customerId = origProfile.id;
                d.name = origProfile.name;
                d.customerName = origProfile.name;
                delete d.originalCustomerName;
                delete d.originalCustomerId;
                delete d.transferredAt;
                count++;
            }
        });
        logOperation("فصل بروفايل ديون", `تم فصل ديون "${origName}" (${count} ديون) كبروفايل مستقل.`);
        if (_tx) _tx.commit();
        updateUI();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم فصل بروفايل "${origName}" بنجاح.`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch(e) {
        if (_tx) await _tx.rollback();
        console.error(e);
    }
};

window.openTransferCreditorProfileModal = function(sourceCreditorName) {
    const sourceLiabs = liabilities.filter(l => normalizeArabicText(l.name) === normalizeArabicText(sourceCreditorName) && Number(l.amount) > 0.001);
    if (!sourceLiabs.length) {
        if (typeof showGlobalMessage === 'function') showGlobalMessage("لا توجد التزامات نشطة لهذا الدائن للتحويل.", true);
        else alert("لا توجد التزامات نشطة لهذا الدائن للتحويل.");
        return;
    }
    const totalAmount = sourceLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const modal = document.getElementById('transferCreditorProfileModal');
    if (!modal) return;

    document.getElementById('tcpm-source-name').textContent = sourceCreditorName;
    document.getElementById('tcpm-liabs-count').textContent = `${sourceLiabs.length} بنود`;
    document.getElementById('tcpm-total-amount').textContent = formatCurrency(totalAmount);

    const otherNames = [...new Set(liabilities.filter(l => Number(l.amount) > 0.001 && normalizeArabicText(l.name) !== normalizeArabicText(sourceCreditorName)).map(l => l.name))];
    const selectEl = document.getElementById('tcpm-target-select');
    selectEl.innerHTML = '<option value="">-- اختر من الدائنين الحاليين --</option>' + otherNames.map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');

    document.getElementById('tcpm-target-name-input').value = '';
    document.getElementById('confirmTransferCreditorProfileBtn').onclick = () => window.confirmTransferCreditorProfile(sourceCreditorName);
    modal.style.display = 'block';
};

window.confirmTransferCreditorProfile = async function(sourceCreditorName) {
    const selectEl = document.getElementById('tcpm-target-select');
    const inputEl = document.getElementById('tcpm-target-name-input');
    const targetName = (inputEl && inputEl.value.trim()) || (selectEl && selectEl.value.trim());

    if (!targetName || normalizeArabicText(targetName) === normalizeArabicText(sourceCreditorName)) {
        alert("يرجى اختيار أو إدخال دائن جديد ومختلف");
        return;
    }
    const sourceLiabs = liabilities.filter(l => normalizeArabicText(l.name) === normalizeArabicText(sourceCreditorName) && Number(l.amount) > 0.001);
    if (!sourceLiabs.length) return alert("لا توجد التزامات نشطة لهذا الدائن.");
    if (!confirm(`هل أنت متأكد من تحويل كامل التزامات "${sourceCreditorName}" إلى "${targetName}"؟`)) return;

    saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
        let total = 0;
        sourceLiabs.forEach(l => {
            total += (Number(l.amount) || 0);
            l.originalCreditorName = l.originalCreditorName || l.name;
            l.name = targetName;
        });
        logOperation("تحويل كامل التزامات دائن", `تم نقل كامل التزامات "${sourceCreditorName}" بإجمالي ${formatCurrency(total)} إلى "${targetName}".`);
        if (_tx) _tx.commit();
        const m = document.getElementById('transferCreditorProfileModal');
        if (m) m.style.display = 'none';
        updateUI();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحويل التزامات "${sourceCreditorName}" إلى "${targetName}" بنجاح.`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch(e) {
        if (_tx) await _tx.rollback();
        console.error(e);
    }
};

window.unlinkTransferredLiabilities = async function(currentCreditorName, origName) {
    if (!confirm(`هل ترغب في فصل التزامات "${origName}" وإعادتها مستقلة؟`)) return;
    saveStateToHistory();
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
    try {
        let count = 0;
        liabilities.forEach(l => {
            if (normalizeArabicText(l.name) === normalizeArabicText(currentCreditorName) && l.originalCreditorName === origName) {
                l.name = origName;
                delete l.originalCreditorName;
                count++;
            }
        });
        logOperation("فصل التزامات دائن", `تم فصل التزامات "${origName}" (${count} بنود) مستقلة.`);
        if (_tx) _tx.commit();
        updateUI();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم فصل التزامات "${origName}" بنجاح.`, false);
        if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error(e));
    } catch(e) {
        if (_tx) await _tx.rollback();
        console.error(e);
    }
};
