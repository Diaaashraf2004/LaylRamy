// finance-deductions.js
// نظام الاستقطاع المخفي (Hidden Margin / Deduction System)
// يتيح للمستخدم تسجيل فاتورة بالسعر الكامل (مثلاً 1100) مع استقطاع مبلغ جانبي (مثلاً 100)
// بحيث يتم حساب الأرباح ورأس المال على أساس السعر الفعلي فقط (1000)
// والمبلغ المستقطع يُسجل كالتزام باسم يختاره المستخدم

(function() {
    'use strict';

    // ========================================================
    // 1. حقن حقول الاستقطاع في واجهة البيع السريع
    // ========================================================
    function injectDeductionFieldsToQuickSell() {
        const sellAccountSelect = document.getElementById('sell-account-select');
        if (!sellAccountSelect) return;
        const parentDiv = sellAccountSelect.closest('.form-group') || sellAccountSelect.closest('.mb-4');
        if (!parentDiv) return;
        if (document.getElementById('sell-deduction-amount')) return; // موجودة بالفعل

        const deductionHTML = `
            <div class="col-span-full mt-3 p-3 bg-purple-50/60 rounded-lg border border-purple-200" id="deduction-quick-sell-container">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label class="inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="sell-deduction-toggle" class="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50 ml-2">
                        <span class="text-sm font-bold text-purple-800"><i class="fas fa-cut ml-1"></i>استقطاع مخفي</span>
                    </label>
                    <span id="sell-deduction-profit-hint" class="text-xs text-purple-500 hidden">الربح الفعلي: <strong id="sell-deduction-real-profit">0</strong> ج.م</span>
                </div>
                <div id="sell-deduction-fields" class="hidden space-y-2">
                    <div class="flex flex-col sm:flex-row gap-2">
                        <div class="flex-1">
                            <label class="block text-gray-600 text-xs mb-1">مبلغ الاستقطاع:</label>
                            <input type="number" id="sell-deduction-amount" value="0" min="0" step="0.01" 
                                   placeholder="مثال: 100" 
                                   class="shadow-sm w-full p-2 border rounded text-purple-700 font-bold text-sm">
                        </div>
                        <div class="flex-1">
                            <label class="block text-gray-600 text-xs mb-1">تسجيل كالتزام باسم:</label>
                            <input type="text" id="sell-deduction-liability-name" list="existing-liabilities-list"
                                   placeholder="اكتب اسم جديد أو اختر قديم"
                                   class="shadow-sm w-full p-2 border rounded text-sm">
                            <datalist id="existing-liabilities-list"></datalist>
                        </div>
                    </div>
                    <p class="text-xs text-purple-400 m-0"><i class="fas fa-info-circle ml-1"></i>الفاتورة ستظهر بالسعر الكامل، والاستقطاع سيُسجل كالتزام منفصل عند إتمام البيع.</p>
                </div>
            </div>
        `;
        parentDiv.insertAdjacentHTML('afterend', deductionHTML);

        // Toggle visibility
        const toggle = document.getElementById('sell-deduction-toggle');
        const fields = document.getElementById('sell-deduction-fields');
        const amt = document.getElementById('sell-deduction-amount');
        if (amt) {
            amt.addEventListener('input', () => {
                if (typeof calculateQuickSellProfit === 'function') calculateQuickSellProfit();
            });
        }
        if (toggle) {
            toggle.addEventListener('change', () => {
                if (typeof calculateQuickSellProfit === 'function') setTimeout(calculateQuickSellProfit, 50);
            });
        }

        const profitHint = document.getElementById('sell-deduction-profit-hint');

        toggle.addEventListener('change', () => {
            fields.classList.toggle('hidden', !toggle.checked);
            profitHint.classList.toggle('hidden', !toggle.checked);
            if (!toggle.checked) {
                document.getElementById('sell-deduction-amount').value = 0;
                if (typeof calculateQuickSellProfit === 'function') calculateQuickSellProfit();
                document.getElementById('sell-deduction-liability-name').value = '';
            }
            updateDeductionProfitHint();
        });

        // Live profit hint update
        document.getElementById('sell-deduction-amount').addEventListener('input', updateDeductionProfitHint);
        const sellPriceInput = document.getElementById('sell-price');
        if (sellPriceInput) sellPriceInput.addEventListener('input', updateDeductionProfitHint);
    }

    // ========================================================
    // 2. حقن حقول الاستقطاع في الفاتورة المفصلة (Invoice Modal)
    // ========================================================
    function injectDeductionFieldsToInvoice() {
        const invoiceModal = document.getElementById('invoiceModal');
        if (!invoiceModal) return;
        if (document.getElementById('inv-deduction-amount')) return;

        // البحث عن مكان مناسب (قبل زر التأكيد أو بعد حقل الشحن)
        const shippingInput = document.getElementById('inv_shippingCost');
        const targetParent = shippingInput ? shippingInput.closest('fieldset') || shippingInput.closest('div') : null;
        
        const deductionHTML = `
            <div class="mt-3 p-3 bg-purple-50/60 rounded-lg border border-purple-200" id="deduction-invoice-container">
                <div class="flex items-center justify-between mb-2">
                    <label class="inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="inv-deduction-toggle" class="rounded border-gray-300 text-purple-600 shadow-sm ml-2">
                        <span class="text-sm font-bold text-purple-800"><i class="fas fa-cut ml-1"></i>استقطاع مخفي</span>
                    </label>
                </div>
                <div id="inv-deduction-fields" class="hidden space-y-2">
                    <div class="flex flex-col gap-2">
                        <div class="flex-1">
                            <label class="block text-gray-600 text-xs mb-1">مبلغ الاستقطاع:</label>
                            <input type="number" id="inv-deduction-amount" value="0" min="0" step="0.01" 
                                   placeholder="مثال: 100" 
                                   class="shadow-sm w-full p-2 border rounded text-purple-700 font-bold text-sm">
                        </div>
                        <div class="flex-1">
                            <label class="block text-gray-600 text-xs mb-1">تسجيل كالتزام باسم:</label>
                            <input type="text" id="inv-deduction-liability-name" list="existing-liabilities-list-inv"
                                   placeholder="اكتب اسم جديد أو اختر قديم"
                                   class="shadow-sm w-full p-2 border rounded text-sm">
                            <datalist id="existing-liabilities-list-inv"></datalist>
                        </div>
                    </div>
                    <p class="text-xs text-purple-400 m-0"><i class="fas fa-info-circle ml-1"></i>الفاتورة ستظهر بالسعر الكامل، والاستقطاع سيُسجل كالتزام منفصل عند إتمام البيع.</p>
                </div>
            </div>
        `;

        if (targetParent) {
            targetParent.insertAdjacentHTML('afterend', deductionHTML);
        } else {
            // Fallback: ابحث عن أي مكان مناسب داخل الـ modal
            const modalBody = invoiceModal.querySelector('.modal-body, .p-6, form');
            if (modalBody) modalBody.insertAdjacentHTML('beforeend', deductionHTML);
        }

        const toggle = document.getElementById('inv-deduction-toggle');
        const fields = document.getElementById('inv-deduction-fields');
        const amtInv = document.getElementById('inv-deduction-amount');
        if (amtInv) {
            amtInv.addEventListener('input', () => {
                if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
            });
        }
        if (toggle) {
            toggle.addEventListener('change', () => {
                if (typeof inv_calculateTotals === 'function') setTimeout(inv_calculateTotals, 50);
            });
        }

        if (toggle && fields) {
            toggle.addEventListener('change', () => {
                fields.classList.toggle('hidden', !toggle.checked);
                if (!toggle.checked) {
                    document.getElementById('inv-deduction-amount').value = 0;
                if (typeof inv_calculateTotals === 'function') inv_calculateTotals();
                    document.getElementById('inv-deduction-liability-name').value = '';
                }
            });
        }
    }

    // ========================================================
    // 3. حقن حقول الاستقطاع في شاشة البيع الموحدة (USM)
    // ========================================================
    function injectDeductionFieldsToUSM() {
        const usmModal = document.getElementById('unifiedSellProductModal') || document.getElementById('unified-sell-modal');
        if (!usmModal) return;
        if (document.getElementById('usm-deduction-amount')) return;

        const saleTypeSelect = document.getElementById('usm_sale_type');
        const targetParent = saleTypeSelect ? saleTypeSelect.closest('div') : null;

        const deductionHTML = `
            <div class="col-span-full mt-3 p-3 bg-purple-50/60 rounded-lg border border-purple-200" id="deduction-usm-container">
                <div class="flex items-center justify-between mb-2">
                    <label class="inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="usm-deduction-toggle" class="rounded border-gray-300 text-purple-600 shadow-sm ml-2">
                        <span class="text-sm font-bold text-purple-800"><i class="fas fa-cut ml-1"></i>استقطاع مخفي</span>
                    </label>
                </div>
                <div id="usm-deduction-fields" class="hidden space-y-2">
                    <div class="flex flex-col sm:flex-row gap-2">
                        <div class="flex-1">
                            <label class="block text-gray-600 text-xs mb-1">مبلغ الاستقطاع:</label>
                            <input type="number" id="usm-deduction-amount" value="0" min="0" step="0.01"
                                   placeholder="مثال: 100"
                                   class="shadow-sm w-full p-2 border rounded text-purple-700 font-bold text-sm">
                        </div>
                        <div class="flex-1">
                            <label class="block text-gray-600 text-xs mb-1">تسجيل كالتزام باسم:</label>
                            <input type="text" id="usm-deduction-liability-name" list="existing-liabilities-list-usm"
                                   placeholder="اكتب اسم جديد أو اختر قديم"
                                   class="shadow-sm w-full p-2 border rounded text-sm">
                            <datalist id="existing-liabilities-list-usm"></datalist>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (targetParent) {
            targetParent.insertAdjacentHTML('afterend', deductionHTML);
        }

        const toggle = document.getElementById('usm-deduction-toggle');
        const fields = document.getElementById('usm-deduction-fields');
        const amtUsm = document.getElementById('usm-deduction-amount');
        if (amtUsm) {
            amtUsm.addEventListener('input', () => {
                if (typeof usm_calculateLiveProfit === 'function') usm_calculateLiveProfit();
            });
        }
        if (toggle) {
            toggle.addEventListener('change', () => {
                if (typeof usm_calculateLiveProfit === 'function') setTimeout(usm_calculateLiveProfit, 50);
            });
        }

        if (toggle && fields) {
            toggle.addEventListener('change', () => {
                fields.classList.toggle('hidden', !toggle.checked);
                if (!toggle.checked) {
                    document.getElementById('usm-deduction-amount').value = 0;
                if (typeof usm_calculateLiveProfit === 'function') usm_calculateLiveProfit();
                    document.getElementById('usm-deduction-liability-name').value = '';
                }
            });
        }
    }

    // ========================================================
    // 4. تحديث عرض الربح الفعلي اللحظي (Quick Sell)
    // ========================================================
    function updateDeductionProfitHint() {
        if (typeof calculateQuickSellProfit === 'function') calculateQuickSellProfit();
    }

    // ========================================================
    // 5. ملء قائمة الالتزامات الموجودة (Datalist) للاختيار منها
    // ========================================================
    function populateLiabilityDatalist() {
        const appLiabilities = (typeof window.getLiabilities === 'function') ? window.getLiabilities() : [];
        const names = [...new Set(appLiabilities.map(l => l.name || l.description || '').filter(n => n))];

        ['existing-liabilities-list', 'existing-liabilities-list-inv', 'existing-liabilities-list-usm'].forEach(dlId => {
            const dl = document.getElementById(dlId);
            if (dl) {
                dl.innerHTML = names.map(n => `<option value="${n}">`).join('');
            }
        });
    }

    // ========================================================
    // 6. قراءة بيانات الاستقطاع من أي شاشة
    // ========================================================
    window.getDeductionData = function(source) {
        let prefix = '';
        if (source === 'quick') prefix = 'sell';
        else if (source === 'invoice') prefix = 'inv';
        else if (source === 'usm') prefix = 'usm';

        const toggle = document.getElementById(`${prefix}-deduction-toggle`);
        if (!toggle || !toggle.checked) return null;

        const amount = parseFloat(document.getElementById(`${prefix}-deduction-amount`)?.value) || 0;
        const liabilityName = (document.getElementById(`${prefix}-deduction-liability-name`)?.value || '').trim();

        if (amount <= 0) return null;
        if (!liabilityName) {
            if (typeof showGlobalMessage === 'function') {
                showGlobalMessage('يرجى كتابة اسم الالتزام للاستقطاع المخفي.', true);
            }
            return { error: true };
        }

        return { amount, liabilityName };
    };

    // ========================================================
    // 7. تطبيق الاستقطاع: تسجيل الالتزام وتعديل الربح
    // ========================================================
    window.applyDeduction = function(deductionData, saleRecord, options = {}) {
        if (!deductionData || deductionData.error) return;

        // ============================================================
        // 🛡️ الحارس 1: لا تطبق الاستقطاع على البيعات المعلقة (pending)
        // يُطبَّق فقط عند التأكيد عبر applyPendingDeduction
        // ============================================================
        if (saleRecord && saleRecord.status === 'pending') {
            console.warn(`⛔ [Deduction Guard] تجاهل الاستقطاع: البيعة "${saleRecord.id}" معلقة. سيُطبَّق عند التأكيد فقط.`);
            return;
        }

        const amount = typeof window.money === 'function' ? window.money(Number(deductionData.amount) || 0) : (Number(deductionData.amount) || 0);
        if (amount <= 0) return;
        const liabilityName = String(deductionData.liabilityName || '').trim();
        if (!liabilityName) return;
        const appLiabilities = (typeof window.getLiabilities === 'function') ? window.getLiabilities() : [];

        // ============================================================
        // 🛡️ الحارس 2: منع التكرار — إذا الفاتورة دي اتسجلت قبل كده
        // ============================================================
        if (saleRecord?.id) {
            const liabForCheck = appLiabilities.find(l =>
                (l.name || l.description || '').trim().toLowerCase() === liabilityName.trim().toLowerCase()
            );
            const alreadyRecorded = (liabForCheck?.history || []).find(h => h.saleId === saleRecord.id && !h.isReversal);
            if (alreadyRecorded) {
                console.warn(`⛔ [Deduction Guard] تجاهل التكرار: الفاتورة "${saleRecord.id}" مسجلة بالفعل في history.`);
                return;
            }
        }

        // البحث عن التزام موجود بنفس الاسم
        const existingLiability = appLiabilities.find(l =>
            (l.name || l.description || '').trim().toLowerCase() === liabilityName.trim().toLowerCase()
        );

        if (existingLiability) {
            // إضافة على الالتزام القديم (تراكمي) وإعادة تفعيله إن كان مدفوعاً
            existingLiability.amount = typeof window.money === 'function'
                ? window.money((Number(existingLiability.amount) || 0) + amount)
                : ((Number(existingLiability.amount) || 0) + amount);
            existingLiability.status = 'active';
            existingLiability.lastUpdated = new Date().toISOString();
            // إضافة سجل التعديل
            if (!existingLiability.history) existingLiability.history = [];
            existingLiability.history.push({
                date: new Date().toISOString(),
                addedAmount: amount,
                saleId: saleRecord?.id || 'N/A',
                note: `استقطاع من فاتورة ${saleRecord?.invoiceNumber || saleRecord?.id || ''}`
            });
            console.log(`✅ تمت إضافة ${amount} ج.م على التزام "${liabilityName}" (الجديد: ${existingLiability.amount})`);
        } else {
            // إنشاء التزام جديد بالاسم الذي اختاره المستخدم
            const newLiability = {
                id: `lia-deduct-${Date.now()}`,
                name: liabilityName,
                description: liabilityName,
                amount: amount,
                originalAmount: amount,
                status: 'active',
                type: 'استقطاع مخفي',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                source: 'deduction',
                history: [{
                    date: new Date().toISOString(),
                    addedAmount: amount,
                    saleId: saleRecord?.id || 'N/A',
                    note: `إنشاء من فاتورة ${saleRecord?.invoiceNumber || saleRecord?.id || ''}`
                }]
            };
            appLiabilities.push(newLiability);
            console.log(`✅ تم إنشاء التزام جديد "${liabilityName}" بمبلغ ${amount} ج.م`);
            
            // إضافة ID الالتزام إلى الفاتورة إذا تم طلب ذلك
            if (saleRecord) saleRecord.deductionLiabilityId = newLiability.id;
        }
        
        if (saleRecord && existingLiability) {
            saleRecord.deductionLiabilityId = existingLiability.id;
        }

        // تسجيل في سجل العمليات
        if (typeof logOperation === 'function') {
            logOperation('استقطاع مخفي', `استقطاع ${amount} ج.م → التزام "${liabilityName}" (فاتورة ${saleRecord?.invoiceNumber || saleRecord?.id || ''})`);
        }

        // تحديث القوائم
        populateLiabilityDatalist();

        // لا نحفظ سحابياً منتصف معاملة إلا لو طُلب صراحة (المستدعي يحفظ مرة واحدة بعد اكتمال المعاملة)
        if (options && options.immediateSave && typeof window.saveSystemToCloud === 'function') {
            window.saveSystemToCloud().catch(e => console.error("Failed to save deduction:", e));
        }
    };

    // ========================================================
    // 7.5 عكس الاستقطاع المخفي عند حذف أو إرجاع فاتورة/بيعة
    // ========================================================
    window.reverseDeduction = function(saleRecord, ratio = 1) {
        if (!saleRecord) return 0;
        // البيعات المعلقة لا يُطبَّق عليها الاستقطاع أصلاً، لذا يُمنع عكسه عنها حتى لا يُخصم من التزامات مبيعات أخرى
        if (saleRecord.status === 'pending') return 0;
        const originalDeduction = Number(saleRecord.deductionAmount || 0);
        if (originalDeduction <= 0) return 0;
        const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
        if (safeRatio <= 0) return 0;

        const alreadyReversed = Number(saleRecord._deductionReversed || 0);
        const remainingToReverse = Math.max(0, originalDeduction - alreadyReversed);
        const reverseAmt = typeof window.money === 'function'
            ? window.money(Math.min(remainingToReverse, originalDeduction * safeRatio))
            : Math.min(remainingToReverse, originalDeduction * safeRatio);
        if (reverseAmt <= 0.001) return 0;

        const appLiabilities = (typeof window.getLiabilities === 'function') ? window.getLiabilities() : [];
        let targetLiab = null;
        if (saleRecord.deductionLiabilityId) {
            targetLiab = appLiabilities.find(l => l.id === saleRecord.deductionLiabilityId);
        }
        if (!targetLiab && saleRecord.id) {
            targetLiab = appLiabilities.find(l => Array.isArray(l.history) && l.history.some(h => h.saleId === saleRecord.id && !h.isReversal));
        }
        if (!targetLiab && saleRecord.deductionLiabilityName) {
            const norm = String(saleRecord.deductionLiabilityName).trim().toLowerCase();
            targetLiab = appLiabilities.find(l => {
                if ((l.name || l.description || '').trim().toLowerCase() !== norm) return false;
                // إذا كان الالتزام يحتفظ بسجل history و saleRecord له id، نتحقق من أن هذه الفاتورة ساهمت فيه فعلاً
                if (saleRecord.id && Array.isArray(l.history) && l.history.length > 0) {
                    return l.history.some(h => h.saleId === saleRecord.id && !h.isReversal);
                }
                return true;
            });
        }

        if (!targetLiab) return 0;

        const currentAmt = Number(targetLiab.amount) || 0;
        const actualDeducted = typeof window.money === 'function'
            ? window.money(Math.min(currentAmt, reverseAmt))
            : Math.min(currentAmt, reverseAmt);

        if (actualDeducted > 0) {
            targetLiab.amount = typeof window.money === 'function'
                ? window.money(Math.max(0, currentAmt - actualDeducted))
                : Math.max(0, currentAmt - actualDeducted);
            targetLiab.lastUpdated = new Date().toISOString();
            if (!Array.isArray(targetLiab.history)) targetLiab.history = [];
            targetLiab.history.push({
                date: new Date().toISOString(),
                addedAmount: -actualDeducted,
                saleId: saleRecord.id || 'N/A',
                isReversal: true,
                note: `عكس استقطاع بسبب حذف/مرتجع فاتورة ${saleRecord.invoiceNumber || saleRecord.id || ''}`
            });
            if (targetLiab.amount <= 0.001) {
                targetLiab.amount = 0;
                targetLiab.status = 'paid';
            }
            saleRecord._deductionReversed = typeof window.money === 'function'
                ? window.money(alreadyReversed + actualDeducted)
                : (alreadyReversed + actualDeducted);

            if (typeof logOperation === 'function') {
                logOperation('عكس استقطاع مخفي', `تم عكس استقطاع بقيمة ${actualDeducted} ج.م من التزام "${targetLiab.name}" بسبب حذف/مرتجع فاتورة ${saleRecord.invoiceNumber || saleRecord.id || ''}.`);
            }
            populateLiabilityDatalist();
        }
        return actualDeducted;
    };

    // ========================================================
    // 8. تطبيق الاستقطاع عند تأكيد بيع مؤقت (Pending → Confirmed)
    // ========================================================
    window.applyPendingDeduction = function(pendingSaleData) {
        if (!pendingSaleData || !pendingSaleData.deductionAmount || pendingSaleData.deductionAmount <= 0) return;

        const deductionData = {
            amount: pendingSaleData.deductionAmount,
            liabilityName: pendingSaleData.deductionLiabilityName || 'استقطاع بدون اسم'
        };

        window.applyDeduction(deductionData, pendingSaleData);
    };

    // ========================================================
    // 9. تصفير حقول الاستقطاع (عند إعادة تعيين النموذج)
    // ========================================================
    window.resetDeductionFields = function(source) {
        let prefix = '';
        if (source === 'quick') prefix = 'sell';
        else if (source === 'invoice') prefix = 'inv';
        else if (source === 'usm') prefix = 'usm';

        const toggle = document.getElementById(`${prefix}-deduction-toggle`);
        const amount = document.getElementById(`${prefix}-deduction-amount`);
        const name = document.getElementById(`${prefix}-deduction-liability-name`);
        const fields = document.getElementById(`${prefix}-deduction-fields`) || document.getElementById(`${prefix.replace('sell','sell')}-deduction-fields`);

        if (toggle) toggle.checked = false;
        if (amount) amount.value = 0;
        if (name) name.value = '';
        if (fields) fields.classList.add('hidden');

        const profitHint = document.getElementById('sell-deduction-profit-hint');
        if (profitHint) profitHint.classList.add('hidden');
    };

    // ========================================================
    // 10. التهيئة: حقن الحقول عند تحميل الصفحة
    // ========================================================
    function initDeductionSystem() {
        injectDeductionFieldsToQuickSell();
        injectDeductionFieldsToInvoice();
        injectDeductionFieldsToUSM();
        populateLiabilityDatalist();
        console.log('✅ نظام الاستقطاع المخفي (Hidden Margin) جاهز.');
    }

    // الانتظار حتى تكتمل الصفحة ثم تهيئة النظام
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initDeductionSystem, 500));
    } else {
        setTimeout(initDeductionSystem, 500);
    }

    // إعادة ملء القوائم عند تحديث البيانات
    // setInterval(populateLiabilityDatalist, 5000); // Removed to prevent UI lag

})();
