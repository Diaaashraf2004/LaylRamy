/**
 * js/invoices/invoices-viewer.js
 * موديول عرض الفواتير التفصيلي والتحليل المالي للإدارة وطباعة العميل الاحترافية
 * 
 * المسؤوليات:
 *   1. فتح نافذة عرض الفاتورة (viewInvoiceModal) بالتبويبين المعتمدين.
 *   2. توليد عرض فاتورة العميل الأنيق والاحترافي (بدون تكاليف أو أرباح).
 *   3. توليد التحليل المالي للإدارة شاملاً تشريح التكاليف، التكاليف الإضافية، وصافي الأرباح.
 *   4. الربط المباشر مع محرك الطباعة inv_printInvoice.
 */

let currentViewingInvoice = null;

    // دالة مساعدة لتعقيم النصوص وتفادي ثغرات XSS
    function _esc(str) {
        if (typeof escapeHTML === 'function') return escapeHTML(str);
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // دالة مساعدة لتنسيق العملة
    function _curr(val) {
        if (typeof formatCurrency === 'function') return formatCurrency(val);
        const num = parseFloat(val) || 0;
        return num.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
    }

    // دالة مساعدة لتنسيق التاريخ والوقت
    function _formatDate(ts) {
        if (!ts) return 'غير محدد';
        try {
            const d = new Date(ts);
            if (isNaN(d.getTime())) return String(ts);
            return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) + 
                   ' (' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) + ')';
        } catch (e) {
            return String(ts);
        }
    }

    /**
     * فتح مودال تفاصيل الفاتورة
     * @param {Object} invoice - كائن الفاتورة المراد عرضها
     * @param {string} initialTab - التبويب المبدئي ('customer' أو 'admin')
     */
    function openInvoiceViewModal(invoice, initialTab = 'customer') {
        if (!invoice) return;
        currentViewingInvoice = invoice;
        window.currentViewingInvoice = invoice;

        const modal = document.getElementById('viewInvoiceModal');
        if (!modal) {
            console.error('[InvoiceViewer] لم يتم العثور على عنصر #viewInvoiceModal في الواجهة.');
            return;
        }

        const titleEl = document.getElementById('vi_invoiceTitle');
        if (titleEl) {
            const invNum = invoice.invoiceNumber || invoice.id || 'N/A';
            titleEl.textContent = `(#${invNum})`;
        }

        // تهيئة مستمعات التبويبات وزر الطباعة مرة واحدة
        initViewerListeners();

        // تعبئة بيانات التبويبين
        renderInvoiceCustomerView(invoice);
        renderInvoiceAdminView(invoice);

        // فتح التبويب المطلوب
        switchInvoiceViewTab(initialTab);

        modal.style.display = 'flex';
    }

    /**
     * إغلاق مودال تفاصيل الفاتورة
     */
    function closeInvoiceViewModal() {
        const modal = document.getElementById('viewInvoiceModal');
        if (modal) modal.style.display = 'none';
        currentViewingInvoice = null;
        window.currentViewingInvoice = null;
    }

    /**
     * التبديل بين تبويب العميل والتحليل المالي للإدارة
     */
    function switchInvoiceViewTab(tabName) {
        const tabCustomer = document.getElementById('vi_tabCustomer');
        const tabAdmin = document.getElementById('vi_tabAdmin');
        const contentCustomer = document.getElementById('vi_contentCustomer');
        const contentAdmin = document.getElementById('vi_contentAdmin');

        if (!tabCustomer || !tabAdmin || !contentCustomer || !contentAdmin) return;

        if (tabName === 'customer') {
            tabCustomer.className = "flex-1 py-3.5 text-center font-bold text-base sm:text-lg border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50/50 transition-all cursor-pointer";
            tabAdmin.className = "flex-1 py-3.5 text-center font-bold text-base sm:text-lg border-b-4 border-transparent text-slate-500 hover:bg-slate-50 transition-all cursor-pointer";
            contentCustomer.classList.remove('hidden');
            contentAdmin.classList.add('hidden');
        } else {
            tabAdmin.className = "flex-1 py-3.5 text-center font-bold text-base sm:text-lg border-b-4 border-emerald-600 text-emerald-700 bg-emerald-50/50 transition-all cursor-pointer";
            tabCustomer.className = "flex-1 py-3.5 text-center font-bold text-base sm:text-lg border-b-4 border-transparent text-slate-500 hover:bg-slate-50 transition-all cursor-pointer";
            contentAdmin.classList.remove('hidden');
            contentCustomer.classList.add('hidden');
        }
    }

    /**
     * توليد وعرض فاتورة العميل الاحترافية (بدون تكاليف أو أرباح نهائياً)
     */
    function renderInvoiceCustomerView(invoice) {
        const container = document.getElementById('vi_customerPreview');
        if (!container) return;

        const customerName = invoice.customerName || 'عميل نقدي';
        const customerAddress = invoice.customerAddress || '';
        const phones = Array.isArray(invoice.phones) ? invoice.phones : (invoice.phone ? [invoice.phone] : []);
        const items = Array.isArray(invoice.items) ? invoice.items : [];
        const invoiceNumber = invoice.invoiceNumber || `INV-${(invoice.id || '').slice(-6)}`;
        const dateStr = _formatDate(invoice.timestamp || invoice.createdAt || invoice.date);
        
        const totalGoods = Number(invoice.totalGoodsPrice) || items.reduce((s, i) => s + (Number(i.subtotal) || (Number(i.unitPrice || i.price || 0) * (Number(i.quantity || i.qty || 1)))), 0);
        const shipping = Number(invoice.shippingCost) || 0;
        const grandTotal = Number(invoice.grandTotal || invoice.totalSellPrice || (totalGoods + shipping)) || 0;
        const depositPaid = Number(invoice.depositPaid) || 0;
        const isPending = invoice.status === 'pending';
        const remaining = isPending ? Math.max(0, grandTotal - depositPaid) : (Number(invoice.remainingBalance) || 0);

        let html = `
        <div class="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden text-slate-800">
            <!-- Header Banner -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg"><i class="fas fa-file-invoice text-xl"></i></span>
                        <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white m-0">فاتورة مبيعات رسمية</h2>
                    </div>
                    <p class="text-xs text-slate-400 m-0">نظام إدارة موارد المؤسسة والمبيعات المعتمد</p>
                </div>
                <div class="text-left bg-white/10 px-4 py-2.5 rounded-xl border border-white/10">
                    <div class="text-xs text-slate-300">رقم الفاتورة:</div>
                    <div class="text-lg font-black font-mono tracking-wider text-emerald-400">${_esc(invoiceNumber)}</div>
                </div>
            </div>

            <!-- Meta & Customer Details Grid -->
            <div class="p-6 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs space-y-2">
                    <div class="font-bold text-slate-900 border-b pb-1.5 flex items-center gap-1.5 text-xs text-indigo-700">
                        <i class="fas fa-user-circle"></i> بيانات العميل
                    </div>
                    <div class="flex justify-between items-center"><span class="text-slate-500">الاسم:</span> <strong class="text-slate-900">${_esc(customerName)}</strong></div>
                    ${phones.length > 0 ? `<div class="flex justify-between items-center"><span class="text-slate-500">الهاتف:</span> <span class="font-mono font-bold text-indigo-600">${phones.map(_esc).join(' / ')}</span></div>` : ''}
                    ${customerAddress ? `<div class="flex justify-between items-center"><span class="text-slate-500">العنوان:</span> <span>${_esc(customerAddress)}</span></div>` : ''}
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs space-y-2">
                    <div class="font-bold text-slate-900 border-b pb-1.5 flex items-center gap-1.5 text-xs text-indigo-700">
                        <i class="fas fa-info-circle"></i> بيانات الإصدار
                    </div>
                    <div class="flex justify-between items-center"><span class="text-slate-500">تاريخ الإصدار:</span> <span class="text-xs font-semibold">${dateStr}</span></div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500">حالة الفاتورة:</span> 
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}">
                            ${isPending ? '⏳ بيع مؤقت (معلقة)' : '✅ مؤكدة ومسددة'}
                        </span>
                    </div>
                    ${invoice.warranty ? `<div class="flex justify-between items-center"><span class="text-slate-500">مدة الضمان:</span> <span class="font-bold text-slate-800">${_esc(invoice.warranty)}</span></div>` : ''}
                </div>
            </div>

            <!-- Items Table -->
            <div class="p-6">
                <div class="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table class="w-full text-right border-collapse text-sm">
                        <thead class="bg-slate-800 text-white text-xs">
                            <tr>
                                <th class="p-3 w-10 text-center">#</th>
                                <th class="p-3">بيان الصنف</th>
                                <th class="p-3 text-center">الكمية</th>
                                <th class="p-3 text-center">سعر الوحدة</th>
                                <th class="p-3 text-left">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
        `;

        if (items.length === 0) {
            html += `<tr><td colspan="5" class="p-4 text-center text-slate-400">لا توجد أصناف مسجلة في الفاتورة.</td></tr>`;
        } else {
            items.forEach((item, index) => {
                const qty = Number(item.quantity || item.qty || 1);
                const price = Number(item.unitPrice || item.price || 0);
                const subtotal = Number(item.subtotal) || (qty * price);
                const serial = item.serial || (Array.isArray(item.serials) ? item.serials.join(', ') : '');

                html += `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-3 text-center text-xs font-mono text-slate-400">${index + 1}</td>
                        <td class="p-3">
                            <strong class="text-slate-900 block font-semibold">${_esc(item.name || 'صنف بدون اسم')}</strong>
                            ${serial ? `<span class="inline-block mt-1 font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">S/N: ${_esc(serial)}</span>` : ''}
                        </td>
                        <td class="p-3 text-center font-bold text-slate-700">${qty}</td>
                        <td class="p-3 text-center font-mono text-slate-700">${_curr(price)}</td>
                        <td class="p-3 text-left font-mono font-bold text-slate-900">${_curr(subtotal)}</td>
                    </tr>
                `;
            });
        }

        html += `
                        </tbody>
                    </table>
                </div>

                <!-- Totals & Payment Summary -->
                <div class="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-slate-200">
                    <div class="text-xs text-slate-500 max-w-sm space-y-1">
                        ${invoice.notes ? `<div class="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900"><strong>ملاحظات:</strong> ${_esc(invoice.notes)}</div>` : ''}
                        <div class="text-[11px] text-slate-400 leading-relaxed">
                            * البضاعة المباعة تخضع لشروط الضمان المعتمدة لدينا. يرجى الاحتفاظ بالفاتورة والسيريال للرجوع إليه عند الحاجة.
                        </div>
                    </div>
                    
                    <div class="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                        <div class="flex justify-between items-center text-sm text-slate-600">
                            <span>إجمالي البضاعة:</span>
                            <span class="font-mono font-bold">${_curr(totalGoods)}</span>
                        </div>
                        ${shipping > 0 ? `
                        <div class="flex justify-between items-center text-sm text-slate-600">
                            <span>قيمة الشحن:</span>
                            <span class="font-mono font-bold">${_curr(shipping)}</span>
                        </div>` : ''}
                        <div class="flex justify-between items-center text-base font-black text-slate-900 border-t border-slate-200 pt-2">
                            <span>الإجمالي الكلي المطلوب:</span>
                            <span class="font-mono text-lg text-indigo-700">${_curr(grandTotal)}</span>
                        </div>
                        ${depositPaid > 0 ? `
                        <div class="flex justify-between items-center text-sm text-emerald-700 font-bold border-t border-dashed border-slate-200 pt-1.5">
                            <span>المبلغ المدفوع (عربون/كاش):</span>
                            <span class="font-mono">${_curr(depositPaid)}</span>
                        </div>` : ''}
                        ${remaining > 0 ? `
                        <div class="flex justify-between items-center text-sm text-rose-700 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                            <span>المتبقي (آجل / دين):</span>
                            <span class="font-mono text-base">${_curr(remaining)}</span>
                        </div>` : ''}
                    </div>
                </div>

                <div class="mt-8 text-center text-xs text-slate-400 border-t border-dashed pt-4 font-medium">
                    ✨ شكراً لتعاملكم معنا ونسعد بخدمتكم دائماً ✨
                </div>
            </div>
        </div>
        `;

        container.innerHTML = html;
    }

    /**
     * توليد وعرض التحليل المالي والتشريحي للإدارة (التكاليف، الأرباح، والتكاليف الإضافية)
     */
    function renderInvoiceAdminView(invoice) {
        const totalSalesEl = document.getElementById('vi_adminTotalSales');
        const totalCostEl = document.getElementById('vi_adminTotalCost');
        const netProfitEl = document.getElementById('vi_adminNetProfit');
        const marginEl = document.getElementById('vi_adminMargin');
        const productsTableBody = document.getElementById('vi_adminProductsTable');
        const extraInfoEl = document.getElementById('vi_adminExtraInfo');

        const items = Array.isArray(invoice.items) ? invoice.items : [];
        const grandTotal = Number(invoice.grandTotal || invoice.totalSellPrice) || 0;
        const totalCost = Number(invoice.totalCost) || items.reduce((s, i) => s + ((Number(i.costPrice || i.cost || 0)) * (Number(i.quantity || i.qty || 1))), 0);
        
        // استخراج التكاليف الإضافية والاستقطاعات
        const deductedItems = Array.isArray(invoice.deductedItems) ? invoice.deductedItems : [];
        const deductionAmount = Number(invoice.deductionAmount) || 0;
        const deductionLiabilityName = invoice.deductionLiabilityName || '';
        
        let totalDeductionsCost = deductionAmount;
        deductedItems.forEach(d => {
            totalDeductionsCost += (Number(d.costPrice || d.cost || 0) * (Number(d.quantity || 1)));
        });

        // صافي الربح الفعلي
        const netProfit = (typeof invoice.profit !== 'undefined') 
            ? Number(invoice.profit) 
            : (typeof invoice.potentialProfit !== 'undefined' ? Number(invoice.potentialProfit) : (grandTotal - totalCost - totalDeductionsCost));

        const marginPercent = grandTotal > 0 ? ((netProfit / grandTotal) * 100).toFixed(1) : '0.0';

        // 1. تحديث بطاقات المؤشرات المالية
        if (totalSalesEl) totalSalesEl.textContent = _curr(grandTotal);
        if (totalCostEl) totalCostEl.textContent = _curr(totalCost);
        if (netProfitEl) {
            netProfitEl.textContent = _curr(netProfit);
            netProfitEl.className = `text-2xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
        }
        if (marginEl) {
            marginEl.textContent = `هامش الربح: ${marginPercent}% ${netProfit >= 0 ? '📈' : '📉'}`;
            marginEl.className = `text-xs font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
        }

        // 2. تحديث جدول تشريح المنتجات
        if (productsTableBody) {
            if (items.length === 0) {
                productsTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">لا توجد بنود أصناف مسجلة.</td></tr>`;
            } else {
                productsTableBody.innerHTML = items.map((item, index) => {
                    const qty = Number(item.quantity || item.qty || 1);
                    const unitCost = Number(item.costPrice || item.cost || 0);
                    const unitPrice = Number(item.unitPrice || item.price || 0);
                    const itemProfitPerUnit = unitPrice - unitCost;
                    const itemTotalProfit = itemProfitPerUnit * qty;
                    const serial = item.serial || (Array.isArray(item.serials) ? item.serials.join(', ') : '');

                    return `
                        <tr class="border-b hover:bg-slate-50 transition-colors">
                            <td class="p-3">
                                <strong class="text-slate-800 block">${_esc(item.name || 'صنف')}</strong>
                                ${serial ? `<span class="inline-block mt-0.5 font-mono text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border">S/N: ${_esc(serial)}</span>` : ''}
                            </td>
                            <td class="p-3 text-center font-bold text-slate-700">${qty}</td>
                            <td class="p-3 text-center font-mono font-bold text-rose-600 bg-rose-50/40">${_curr(unitCost)}</td>
                            <td class="p-3 text-center font-mono font-bold text-blue-600 bg-blue-50/40">${_curr(unitPrice)}</td>
                            <td class="p-3 text-center font-mono font-bold ${itemProfitPerUnit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                                ${_curr(itemProfitPerUnit)}
                            </td>
                            <td class="p-3 text-center font-mono font-black ${itemTotalProfit >= 0 ? 'text-emerald-700 bg-emerald-50/40' : 'text-rose-700 bg-rose-50/40'}">
                                ${_curr(itemTotalProfit)}
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // 3. قسم التكاليف الإضافية والاستقطاعات
        let deductionsContainer = document.getElementById('vi_adminDeductionsSection');
        if (!deductionsContainer) {
            deductionsContainer = document.createElement('div');
            deductionsContainer.id = 'vi_adminDeductionsSection';
            deductionsContainer.className = "mt-5 bg-white rounded-lg shadow-sm border border-slate-200 p-4";
            if (extraInfoEl && extraInfoEl.parentElement) {
                extraInfoEl.parentElement.parentElement.insertBefore(deductionsContainer, extraInfoEl.parentElement);
            }
        }

        let dedHTML = `
            <h4 class="font-bold text-slate-800 text-sm mb-3 flex items-center justify-between border-b pb-2">
                <span><i class="fas fa-tags text-amber-500 mr-1.5"></i> التكاليف الإضافية والاستقطاعات المخصومة من أرباح الفاتورة</span>
                <span class="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold border border-amber-200">
                    إجمالي التكاليف الإضافية: ${_curr(totalDeductionsCost)}
                </span>
            </h4>
        `;

        if (deductedItems.length === 0 && deductionAmount <= 0) {
            dedHTML += `<p class="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border text-center">لا توجد تكاليف إضافية أو ملحقات مستقطعة مسجلة على هذه الفاتورة.</p>`;
        } else {
            dedHTML += `<div class="space-y-3">`;
            
            // جدول الملحقات المستقطعة
            if (deductedItems.length > 0) {
                dedHTML += `
                    <div class="overflow-x-auto border border-amber-200 rounded-lg">
                        <table class="w-full text-right text-xs">
                            <thead class="bg-amber-50 text-amber-900">
                                <tr>
                                    <th class="p-2.5">ملحق / صنف مستقطع</th>
                                    <th class="p-2.5 text-center">الكمية</th>
                                    <th class="p-2.5 text-center">تكلفة القطعة</th>
                                    <th class="p-2.5 text-left">التكلفة المستقطعة</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-amber-100">
                `;
                deductedItems.forEach(d => {
                    const dQty = Number(d.quantity || 1);
                    const dCost = Number(d.costPrice || d.cost || 0);
                    const dTotal = dQty * dCost;
                    const dSerial = d.serial || (Array.isArray(d.serials) ? d.serials.join(', ') : '');

                    dedHTML += `
                        <tr class="hover:bg-amber-50/50">
                            <td class="p-2.5">
                                <strong>${_esc(d.name || 'ملحق')}</strong>
                                ${dSerial ? `<span class="block text-[10px] text-amber-700 font-mono">S/N: ${_esc(dSerial)}</span>` : ''}
                            </td>
                            <td class="p-2.5 text-center font-bold">${dQty}</td>
                            <td class="p-2.5 text-center font-mono text-rose-600">${_curr(dCost)}</td>
                            <td class="p-2.5 text-left font-mono font-bold text-amber-900">${_curr(dTotal)}</td>
                        </tr>
                    `;
                });
                dedHTML += `</tbody></table></div>`;
            }

            // بند الاستقطاع المالي
            if (deductionAmount > 0) {
                dedHTML += `
                    <div class="flex justify-between items-center p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
                        <div>
                            <strong class="text-amber-900 block font-semibold"><i class="fas fa-minus-circle text-rose-500 mr-1"></i> استقطاع نقدي لحساب التزام:</strong>
                            <span class="text-amber-700">${_esc(deductionLiabilityName || 'التزام غير محدد')}</span>
                        </div>
                        <span class="font-mono font-black text-rose-700 text-sm">-${_curr(deductionAmount)}</span>
                    </div>
                `;
            }

            dedHTML += `</div>`;
        }

        deductionsContainer.innerHTML = dedHTML;

        // 4. تحديث معلومات التشغيل والسداد
        if (extraInfoEl) {
            const safeAccount = (window.accounts && Array.isArray(window.accounts)) 
                ? (window.accounts.find(a => String(a.id) === String(invoice.accountId))?.name || invoice.accountId || 'الخزينة الرئيسية')
                : (invoice.accountId || 'الخزينة الرئيسية');

            extraInfoEl.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div class="bg-white p-2.5 rounded border border-orange-200/60">
                        <span class="text-gray-500 block">خزنة الإيداع / الحساب:</span>
                        <strong class="text-slate-900 font-semibold">${_esc(safeAccount)}</strong>
                    </div>
                    <div class="bg-white p-2.5 rounded border border-orange-200/60">
                        <span class="text-gray-500 block">طريقة السداد:</span>
                        <strong class="text-slate-900 font-semibold">${invoice.remainingBalance > 0 ? 'آجل جزئي / دين' : 'مسددة نقداً بالكامل'}</strong>
                    </div>
                    <div class="bg-white p-2.5 rounded border border-orange-200/60">
                        <span class="text-gray-500 block">المبلغ المحصل كاش:</span>
                        <strong class="text-emerald-700 font-bold font-mono">${_curr(invoice.depositPaid || (grandTotal - (invoice.remainingBalance || 0)))}</strong>
                    </div>
                    <div class="bg-white p-2.5 rounded border border-orange-200/60">
                        <span class="text-gray-500 block">المبلغ المتبقي كدين:</span>
                        <strong class="text-rose-700 font-bold font-mono">${_curr(invoice.remainingBalance || 0)}</strong>
                    </div>
                </div>
            `;
        }
    }

    /**
     * ربط مستمعات الأحداث الخاصة بالمودال
     */
    function initViewerListeners() {
        const tabCustomer = document.getElementById('vi_tabCustomer');
        const tabAdmin = document.getElementById('vi_tabAdmin');
        const printBtn = document.getElementById('vi_printBtn');

        if (tabCustomer && !tabCustomer.dataset.listenerAttached) {
            tabCustomer.dataset.listenerAttached = '1';
            tabCustomer.addEventListener('click', () => switchInvoiceViewTab('customer'));
        }

        if (tabAdmin && !tabAdmin.dataset.listenerAttached) {
            tabAdmin.dataset.listenerAttached = '1';
            tabAdmin.addEventListener('click', () => switchInvoiceViewTab('admin'));
        }

        if (printBtn && !printBtn.dataset.listenerAttached) {
            printBtn.dataset.listenerAttached = '1';
            printBtn.addEventListener('click', () => {
                if (currentViewingInvoice && typeof window.inv_printInvoice === 'function') {
                    window.inv_printInvoice(currentViewingInvoice);
                } else {
                    alert('تعذر فتح أمر الطباعة، بيانات الفاتورة غير متوفرة.');
                }
            });
        }
    }

    // تصدير الدوال للنطاق العام
    window.openInvoiceViewModal = openInvoiceViewModal;
    window.closeInvoiceViewModal = closeInvoiceViewModal;
    window.switchInvoiceViewTab = switchInvoiceViewTab;
    window.renderInvoiceCustomerView = renderInvoiceCustomerView;
    window.renderInvoiceAdminView = renderInvoiceAdminView;
