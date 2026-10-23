/**
 * js/sales/sales-invoice-view.js
 * إدارة دورة حياة واجهة الفاتورة، تبديل الأوضاع (جديد/تعديل/تأكيد)، والتصفير الشامل
 */
(function(global) {
    'use strict';

    let currentInvoiceMode = 'new'; // 'new' | 'edit' | 'confirm'

    function inv_getInvoiceMode() {
        return currentInvoiceMode || 'new';
    }

    function inv_setInvoiceMode(mode, data) {
        currentInvoiceMode = mode || 'new';

        // مزامنة المتغيرات العامة القديمة للتوافق الكامل
        if (mode === 'confirm') {
            global.isInvoiceFromPending = true;
            global.isEditingPendingInvoice = false;
            global.pendingSaleOriginData = data || null;
        } else if (mode === 'edit') {
            global.isInvoiceFromPending = false;
            global.isEditingPendingInvoice = true;
            global.pendingSaleOriginData = data || null;
        } else {
            global.isInvoiceFromPending = false;
            global.isEditingPendingInvoice = false;
            global.pendingSaleOriginData = null;
        }

        const modal = document.getElementById('invoiceModal');
        if (!modal) return;

        // 1. تحديث الترويسة والأزرار
        const titleEl = (typeof modal.querySelector === 'function')
            ? (modal.querySelector('.invoice-modal-header h2') || modal.querySelector('.invoice-card-header h2') || modal.querySelector('h2'))
            : null;
        const saveBtn = document.getElementById('inv_saveInvoiceBtn');
        const itemControls = (typeof modal.querySelector === 'function') ? modal.querySelector('.inv-item-controls') : null;
        const addItemDivider = document.getElementById('inv_addItemDivider');
        const unifiedBtn = document.getElementById('inv_unifiedSellModalBtn');
        const deductibleFieldset = document.getElementById('inv_deductibleCostsFieldset');

        if (titleEl) {
            let icon = '<i class="fas fa-file-invoice text-indigo-600"></i>';
            let titleText = 'إنشاء فاتورة جديدة';
            let draftBtn = '<button type="button" onclick="loadInvoiceDraft()" class="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition shadow-sm font-semibold inline-flex items-center gap-1 mr-2" title="استعادة المسودة السابقة"><i class="fas fa-folder-open text-amber-600"></i> مسودة</button>';

            if (mode === 'confirm') {
                icon = '<i class="fas fa-check-circle text-blue-600"></i>';
                titleText = 'تأكيد بيعة مؤقتة' + (data && data.id ? ` رقم ${data.id}` : '');
                draftBtn = '';
            } else if (mode === 'edit') {
                icon = '<i class="fas fa-edit text-amber-600"></i>';
                titleText = 'تعديل فاتورة مؤقتة' + (data && data.id ? ` رقم ${data.id}` : '');
                draftBtn = '';
            }
            titleEl.innerHTML = `${icon}<span>${titleText}</span>${draftBtn}`;
        }

        if (saveBtn) {
            if (mode === 'confirm') {
                saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الفاتورة وتسجيلها';
            } else if (mode === 'edit') {
                saveBtn.innerHTML = '<i class="fas fa-edit"></i> حفظ التعديلات كبيعة مؤقتة';
            } else {
                saveBtn.innerHTML = '<i class="fas fa-save ml-1"></i> حفظ الفاتورة';
            }
        }

        // 2. إدارة ظهور الأشرطة بدون كسر الـ CSS (استخدام classList.toggle('hidden'))
        const isConfirm = (mode === 'confirm');

        if (itemControls && itemControls.classList) {
            itemControls.classList.toggle('hidden', isConfirm);
        }
        if (addItemDivider && addItemDivider.classList) {
            addItemDivider.classList.toggle('hidden', isConfirm);
        }
        if (unifiedBtn && unifiedBtn.classList) {
            unifiedBtn.classList.toggle('hidden', isConfirm);
        }

        // الملحقات والتكاليف الإضافية تظل ظاهرة دائماً في التأكيد والجديد
        if (deductibleFieldset && deductibleFieldset.classList) {
            deductibleFieldset.classList.remove('hidden');
        }

        // تنظيف أي style.display تم فرضه سابقاً لضمان سلامة تنسيقات CSS / Flex
        [unifiedBtn, deductibleFieldset, addItemDivider].forEach(el => {
            if (el && el.style && el.style.display) el.style.display = '';
        });

        // تحديث شريط التنبيه إن وجد
        if (typeof global.updateInvoiceModeAlert === 'function') {
            global.updateInvoiceModeAlert();
        }
    }

    function inv_resetInvoiceView() {
        // تصفير الوضع إلى جديد
        inv_setInvoiceMode('new', null);

        // إرجاع حالة السيريالات المحجوزة مؤقتاً
        if (Array.isArray(global.serialNumbersLog)) {
            global.serialNumbersLog.forEach(log => {
                if (log && log.status === 'in_invoice_temp') {
                    log.status = 'in_stock';
                }
            });
        }

        // تفريغ الحقول الأساسية
        const form = document.getElementById('invoiceForm');
        if (form && typeof form.reset === 'function') {
            form.reset();
        }

        const customerName = document.getElementById('inv_customerName');
        if (customerName) customerName.value = '';
        const customerAddress = document.getElementById('inv_customerAddress');
        if (customerAddress) customerAddress.value = '';
        const shippingCost = document.getElementById('inv_shippingCostInput') || document.getElementById('inv_shippingCost');
        if (shippingCost) shippingCost.value = '';
        const notes = document.getElementById('inv_notesInput') || document.getElementById('inv_notes');
        if (notes) notes.value = '';

        // تصفير حاوية الهواتف
        const phoneContainer = document.getElementById('inv_phoneNumbersContainer');
        if (phoneContainer) {
            phoneContainer.innerHTML = '<div class="form-row inv-phone-entry"><div class="form-group"><label for="inv_phone1">رقم الهاتف:</label><input type="tel" id="inv_phone1" name="phone[]" placeholder="رقم الهاتف..."></div></div>';
        }
        if (typeof global.inv_phoneCounter !== 'undefined') global.inv_phoneCounter = 1;

        // تفريغ جدول البنود
        const itemsTable = document.getElementById('invoiceItemsTable');
        const itemsBody = itemsTable && typeof itemsTable.querySelector === 'function'
            ? itemsTable.querySelector('tbody')
            : (document.getElementById('inv_invoiceItemsBody') || (typeof global.inv_invoiceItemsBody !== 'undefined' ? global.inv_invoiceItemsBody : null));
        if (itemsBody) itemsBody.innerHTML = '';

        // إغلاق أكورديون التفاصيل الإضافية وتصفير الملحقات
        const accordion = document.getElementById('inv_extra_details_accordion');
        if (accordion) accordion.open = false;

        const deductibleContainer = document.getElementById('inv_deductibleCostsContainer');
        if (deductibleContainer && typeof deductibleContainer.querySelectorAll === 'function') {
            const checkboxes = deductibleContainer.querySelectorAll('input[type="checkbox"]');
            if (checkboxes && checkboxes.length) {
                checkboxes.forEach(chk => { chk.checked = false; });
            }
        }

        // تصفير التكاليف الإضافية والخصومات المدمجة
        const invDedToggle = document.getElementById('inv-deduction-toggle');
        const invDedAmount = document.getElementById('inv-deduction-amount');
        const invDedList = document.getElementById('inv-deduction-liability-name');
        if (invDedToggle) { invDedToggle.checked = false; }
        if (invDedAmount) { invDedAmount.value = ''; }
        if (invDedList) { invDedList.value = ''; }

        // استدعاء دوال الحساب والتحديث إن وجدت
        if (typeof global.inv_updateDeductibleCostsCheckboxes === 'function') {
            global.inv_updateDeductibleCostsCheckboxes(true);
        }
        if (typeof global.inv_calculateTotals === 'function') {
            global.inv_calculateTotals();
        }
        if (typeof global.restoreSaveBtn === 'function') {
            global.restoreSaveBtn();
        }

        // تصفير أزرار وأشرطة POS
        if (typeof global.resetInvoiceForm === 'function' && global.resetInvoiceForm !== inv_resetInvoiceView) {
            global.resetInvoiceForm();
        }
    }

    // تصدير الدوال على window
    global.inv_getInvoiceMode = inv_getInvoiceMode;
    global.inv_setInvoiceMode = inv_setInvoiceMode;
    global.inv_resetInvoiceView = inv_resetInvoiceView;

    // دعم Node.js في الاختبارات
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            inv_getInvoiceMode,
            inv_setInvoiceMode,
            inv_resetInvoiceView
        };
    }
})(typeof window !== 'undefined' ? window : global);
