/**
 * js/serials/serials-views.js
 * منظومة العرض الاحترافي المتقدم لقسم السيريالات:
 * - التبديل اللحظي بين 3 طرق عرض (جدول تفصيلي، كروت ذكية، تجميع حسب المورد)
 * - تسجيل وربط الأجهزة بالمورد مع فلترة مخصصة
 * - متابعة وتعديل نسبة البطارية اللحظي بمؤشرات ملونة
 * - إدارة الملاحظات بنافذة أنيقة بديلة للـ prompt
 * - نسخ السيريال بنقرة واحدة
 */

(function() {
    let currentViewMode = localStorage.getItem('serials_preferred_view') || 'table';

    // 1. التبديل بين طرق العرض
    function setSerialsViewMode(mode) {
        currentViewMode = mode;
        localStorage.setItem('serials_preferred_view', mode);

        const tableContainer = document.getElementById('serials-table-container');
        const cardsContainer = document.getElementById('serials-cards-container');
        const suppliersContainer = document.getElementById('serials-suppliers-container');

        const viewBtns = document.querySelectorAll('.serials-view-btn');
        viewBtns.forEach(btn => {
            const isMatch = btn.dataset.view === mode;
            if (isMatch) {
                btn.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
                btn.classList.remove('text-slate-600');
            } else {
                btn.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
                btn.classList.add('text-slate-600');
            }
        });

        if (tableContainer) tableContainer.classList.toggle('hidden', mode !== 'table');
        if (cardsContainer) cardsContainer.classList.toggle('hidden', mode !== 'cards');
        if (suppliersContainer) suppliersContainer.classList.toggle('hidden', mode !== 'suppliers');

        if (typeof window.triggerSerialsRefresh === 'function') {
            window.triggerSerialsRefresh();
        }
    }
    window.setSerialsViewMode = setSerialsViewMode;

    // 2. تحديث قائمة الموردين في الفلتر
    function refreshSupplierFilterDropdown(serialsList) {
        const filterSelect = document.getElementById('serials-supplier-filter');
        if (!filterSelect) return;

        const currentVal = filterSelect.value;
        const allSuppliers = [...new Set(serialsList.map(s => (s.supplierName || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="all">كل الموردين (' + allSuppliers.length + ')</option>';
        allSuppliers.forEach(sup => {
            html += `<option value="${window.escapeHTML(sup)}">${window.escapeHTML(sup)}</option>`;
        });
        filterSelect.innerHTML = html;

        if (allSuppliers.includes(currentVal)) {
            filterSelect.value = currentVal;
        } else {
            filterSelect.value = 'all';
        }
    }

    // 3. فلترة متقدمة للبطارية والمورد والملاحظات
    window.applyAdvancedSerialsFilters = function(logs) {
        const supFilter = document.getElementById('serials-supplier-filter');
        const batteryFilter = document.getElementById('serials-battery-filter');
        const notesFilter = document.getElementById('serials-notes-filter');

        const selectedSup = supFilter ? supFilter.value : 'all';
        const selectedBattery = batteryFilter ? batteryFilter.value : 'all';
        const selectedNotes = notesFilter ? notesFilter.value : 'all';

        return logs.filter(log => {
            // فلتر المورد
            if (selectedSup !== 'all') {
                if ((log.supplierName || '').trim() !== selectedSup) return false;
            }

            // فلتر البطارية
            const battery = Number(log.shippingPercentage || 0) || 0;
            if (selectedBattery === 'critical' && battery >= 20) return false;
            if (selectedBattery === 'medium' && (battery < 20 || battery >= 80)) return false;
            if (selectedBattery === 'full' && battery < 80) return false;

            // فلتر الملاحظات
            const hasNote = log.notes && log.notes.trim().length > 0;
            if (selectedNotes === 'has_notes' && !hasNote) return false;
            if (selectedNotes === 'no_notes' && hasNote) return false;

            return true;
        });
    };

    // 4. نسخ السيريال للحافظة بنقرة واحدة
    window.copySerialToClipboard = function(serial, btn) {
        if (!navigator.clipboard) {
            const tempInput = document.createElement('input');
            tempInput.value = serial;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
        } else {
            navigator.clipboard.writeText(serial).catch(() => {});
        }

        if (btn) {
            const oldHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-emerald-600"></i>';
            setTimeout(() => { btn.innerHTML = oldHTML; }, 1200);
        }
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(`تم نسخ السيريال: ${serial} بنجاح.`);
        }
    };

    // 5. تعديل نسبة البطارية السريع
    window.quickSetBattery = function(serial, newPercent) {
        const serials = typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : [];
        const item = serials.find(s => s.serial === serial);
        if (!item) return;

        if (typeof window.saveStateToHistory === 'function') window.saveStateToHistory();
        item.shippingPercentage = Math.min(100, Math.max(0, parseInt(newPercent) || 0));
        
        if (typeof window.setStandaloneSerials === 'function') {
            window.setStandaloneSerials(serials);
        }
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(`تم تحديث بطارية الجهاز ${serial} إلى ${item.shippingPercentage}%.`);
        }
    };

    // 6. نافذة الملاحظات المتقدمة
    let currentEditingNoteSerial = null;

    window.openNoteModal = function(serial) {
        const serials = typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : [];
        const item = serials.find(s => s.serial === serial);
        if (!item) return;

        currentEditingNoteSerial = serial;
        const modal = document.getElementById('serials-note-modal');
        const snDisplay = document.getElementById('serials-note-modal-sn');
        const prodDisplay = document.getElementById('serials-note-modal-product');
        const textarea = document.getElementById('serials-note-modal-text');

        if (snDisplay) snDisplay.textContent = item.serial;
        if (prodDisplay) prodDisplay.textContent = `${item.productName || 'جهاز'} (${item.supplierName || 'بدون مورد'})`;
        if (textarea) {
            textarea.value = item.notes || '';
            setTimeout(() => textarea.focus(), 50);
        }

        if (modal) modal.classList.remove('hidden');
    };

    window.closeNoteModal = function() {
        const modal = document.getElementById('serials-note-modal');
        if (modal) modal.classList.add('hidden');
        currentEditingNoteSerial = null;
    };

    window.saveNoteModal = function() {
        if (!currentEditingNoteSerial) return;
        const textarea = document.getElementById('serials-note-modal-text');
        const newNotes = textarea ? textarea.value.trim() : '';

        const serials = typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : [];
        const item = serials.find(s => s.serial === currentEditingNoteSerial);
        if (item) {
            if (typeof window.saveStateToHistory === 'function') window.saveStateToHistory();
            item.notes = newNotes;
            if (typeof window.setStandaloneSerials === 'function') {
                window.setStandaloneSerials(serials);
            }
            if (typeof showGlobalMessage === 'function') {
                showGlobalMessage(`تم حفظ ملاحظات السيريال ${currentEditingNoteSerial} بنجاح.`);
            }
        }
        closeNoteModal();
    };

    // 7. رندر طريقة عرض الكروت الذكية (Cards View)
    function renderSerialsCards(logs) {
        const container = document.getElementById('serials-cards-container');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200"><i class="fas fa-folder-open text-4xl mb-3"></i><p>لا توجد أجهزة مطابقة للبحث أو التصفية.</p></div>';
            return;
        }

        const serials = typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : [];

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">';
        logs.forEach(log => {
            const serialIndex = serials.indexOf(log);
            const battery = Math.min(100, Math.max(0, Number(log.shippingPercentage || 0) || 0));
            
            let batteryColor = 'text-rose-600 bg-rose-50 border-rose-200';
            let batteryBar = 'bg-rose-500';
            let batteryIcon = 'fa-battery-quarter';
            if (battery >= 80) {
                batteryColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                batteryBar = 'bg-emerald-500';
                batteryIcon = 'fa-battery-full';
            } else if (battery >= 20) {
                batteryColor = 'text-amber-700 bg-amber-50 border-amber-200';
                batteryBar = 'bg-amber-500';
                batteryIcon = 'fa-battery-half';
            }

            const isSold = log.saleStatus === 'sold';
            const isPending = log.saleStatus === 'pending';
            const statusBadge = isSold ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">📦 مباع</span>' :
                                (isPending ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">⏳ معلق</span>' :
                                '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">✅ متاح</span>');

            const hasNotes = log.notes && log.notes.trim().length > 0;
            const noteSnippet = hasNotes ? window.escapeHTML(log.notes) : 'لا توجد ملاحظات';

            html += `
            <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                    <!-- رأس الكارت -->
                    <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <div class="flex items-center gap-1.5">
                            <span class="font-mono font-bold text-sm text-slate-800 tracking-wider">${window.escapeHTML(log.serial)}</span>
                            <button onclick="window.copySerialToClipboard('${window.escapeHTML(log.serial)}', this)" class="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="نسخ السيريال">
                                <i class="fas fa-copy text-xs"></i>
                            </button>
                        </div>
                        ${statusBadge}
                    </div>

                    <!-- تفاصيل الجهاز والمورد -->
                    <h4 class="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                        <i class="fas fa-mobile-alt text-blue-500"></i>
                        <span>${window.escapeHTML(log.productName || 'جهاز غير محدد')}</span>
                    </h4>
                    <p class="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                        <i class="fas fa-truck-loading text-slate-400"></i>
                        <span>المورد: <strong class="text-slate-700">${window.escapeHTML(log.supplierName || 'غير محدد')}</strong></span>
                    </p>

                    <!-- نسبة البطارية التفاعلية -->
                    <div class="p-2.5 rounded-xl border mb-3 ${batteryColor}">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-bold flex items-center gap-1">
                                <i class="fas ${batteryIcon}"></i> البطارية: ${battery}%
                            </span>
                            <div class="flex gap-1">
                                <button onclick="window.quickSetBattery('${window.escapeHTML(log.serial)}', 100)" class="text-[10px] bg-white px-1.5 py-0.5 rounded font-bold border hover:bg-slate-50" title="تعيين 100%">100%</button>
                                <button onclick="window.quickSetBattery('${window.escapeHTML(log.serial)}', 80)" class="text-[10px] bg-white px-1.5 py-0.5 rounded font-bold border hover:bg-slate-50" title="تعيين 80%">80%</button>
                                <button onclick="window.quickSetBattery('${window.escapeHTML(log.serial)}', 50)" class="text-[10px] bg-white px-1.5 py-0.5 rounded font-bold border hover:bg-slate-50" title="تعيين 50%">50%</button>
                            </div>
                        </div>
                        <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div class="h-full ${batteryBar}" style="width: ${battery}%"></div>
                        </div>
                    </div>

                    <!-- صندوق الملاحظات -->
                    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 cursor-pointer hover:bg-amber-50/60 transition-colors" onclick="window.openNoteModal('${window.escapeHTML(log.serial)}')" title="انقر لتعديل الملاحظات">
                        <div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-bold">
                            <span><i class="fas fa-comment-dots text-blue-500 mr-1"></i> ملاحظات:</span>
                            <span class="text-blue-600 text-[11px] hover:underline">تعديل</span>
                        </div>
                        <p class="text-xs ${hasNotes ? 'text-slate-700 font-medium' : 'text-slate-400 italic'} truncate m-0">${noteSnippet}</p>
                    </div>
                </div>

                <!-- أزرار الإجراءات السريعة -->
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <div class="flex gap-1.5">
                        <button onclick="window.toggleStandaloneFlagByIndex(${serialIndex}, 'isChecked')" class="text-xs px-2.5 py-1 rounded-lg border font-bold ${log.isChecked ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}" title="فحص">
                            <i class="fas ${log.isChecked ? 'fa-check-circle' : 'fa-circle'}"></i> فحص
                        </button>
                        <button onclick="window.toggleStandaloneFlagByIndex(${serialIndex}, 'isShipped')" class="text-xs px-2.5 py-1 rounded-lg border font-bold ${log.isShipped ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500'}" title="شحن">
                            <i class="fas ${log.isShipped ? 'fa-battery-full' : 'fa-battery-empty'}"></i> مشحون
                        </button>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="window.editStandaloneRecordByIndex(${serialIndex})" class="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="تعديل">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="window.deleteStandaloneSerialByIndex(${serialIndex})" class="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" title="حذف">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // 8. رندر طريقة عرض التجميع بالمورد (Group by Supplier View)
    function renderSerialsBySupplier(logs) {
        const container = document.getElementById('serials-suppliers-container');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200"><i class="fas fa-truck-loading text-4xl mb-3"></i><p>لا توجد أجهزة مطابقة.</p></div>';
            return;
        }

        // تجميع الأجهزة حسب المورد
        const grouped = {};
        logs.forEach(log => {
            const supName = (log.supplierName || '').trim() || 'موردين غير محددين';
            if (!grouped[supName]) grouped[supName] = [];
            grouped[supName].push(log);
        });

        const sortedSuppliers = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<div class="space-y-6">';
        sortedSuppliers.forEach(sup => {
            const items = grouped[sup];
            const checkedCount = items.filter(i => i.isChecked).length;
            const avgBattery = Math.round(items.reduce((sum, i) => sum + (Number(i.shippingPercentage) || 0), 0) / items.length);

            html += `
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <!-- رأس كارت المورد -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 mb-4 border-b border-slate-100 gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold">
                            <i class="fas fa-truck-loading"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-base m-0">${window.escapeHTML(sup)}</h3>
                            <p class="text-xs text-slate-500 m-0">${items.length} جهاز مسجل</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 text-xs">
                        <span class="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">مفحوص: ${checkedCount} / ${items.length}</span>
                        <span class="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">متوسط البطارية: ${avgBattery}%</span>
                    </div>
                </div>

                <!-- شبكة أجهزة هذا المورد -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            `;

            items.forEach(log => {
                const battery = Math.min(100, Math.max(0, Number(log.shippingPercentage || 0) || 0));
                let batClass = battery >= 80 ? 'text-emerald-700 bg-emerald-50' : (battery >= 20 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50');

                html += `
                    <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="font-mono font-bold text-xs text-slate-800">${window.escapeHTML(log.serial)}</span>
                                <button onclick="window.copySerialToClipboard('${window.escapeHTML(log.serial)}', this)" class="text-slate-400 hover:text-blue-600 p-0.5" title="نسخ">
                                    <i class="fas fa-copy text-xs"></i>
                                </button>
                            </div>
                            <p class="text-xs font-bold text-slate-700 mb-2 truncate">${window.escapeHTML(log.productName || 'جهاز')}</p>
                            <div class="flex items-center justify-between text-xs mb-2">
                                <span class="px-2 py-0.5 rounded font-bold ${batClass}">🔋 ${battery}%</span>
                                <span class="text-[11px] ${log.isChecked ? 'text-emerald-600 font-bold' : 'text-slate-400'}">${log.isChecked ? '✓ مفحوص' : 'غير مفحوص'}</span>
                            </div>
                        </div>
                        <button onclick="window.openNoteModal('${window.escapeHTML(log.serial)}')" class="text-[11px] text-right truncate text-slate-500 hover:text-blue-600 pt-1.5 border-t border-slate-200/60">
                            📝 ${log.notes ? window.escapeHTML(log.notes) : 'أضف ملاحظة...'}
                        </button>
                    </div>
                `;
            });

            html += `
                </div>
            </div>`;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // 9. الاستجابة عند انتهاء الرندر الأساسي
    window.onSerialsTableRendered = function(filteredLogs) {
        const serials = typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : [];
        refreshSupplierFilterDropdown(serials);

        const advancedFiltered = window.applyAdvancedSerialsFilters(filteredLogs || serials);

        renderSerialsCards(advancedFiltered);
        renderSerialsBySupplier(advancedFiltered);

        const tableContainer = document.getElementById('serials-table-container');
        const cardsContainer = document.getElementById('serials-cards-container');
        const suppliersContainer = document.getElementById('serials-suppliers-container');

        if (tableContainer) tableContainer.classList.toggle('hidden', currentViewMode !== 'table');
        if (cardsContainer) cardsContainer.classList.toggle('hidden', currentViewMode !== 'cards');
        if (suppliersContainer) suppliersContainer.classList.toggle('hidden', currentViewMode !== 'suppliers');
    };

    // 10. ربط أحداث الإدخال السريع للبطارية وأزرار التبديل والفلاتر
    document.addEventListener('DOMContentLoaded', () => {
        // أزرار نسبة البطارية السريعة في نموذج الإضافة
        document.querySelectorAll('.battery-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = e.target.dataset.val;
                const shippingInput = document.getElementById('serials-add-shipping');
                if (shippingInput && val) {
                    shippingInput.value = val;
                    shippingInput.focus();
                }
            });
        });

        // أزرار تبديل طرق العرض
        document.querySelectorAll('.serials-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.view;
                if (mode) setSerialsViewMode(mode);
            });
        });

        // تحديث شارة الفلاتر النشطة وزر إعادة الضبط
        function updateActiveFiltersBadge() {
            const badge = document.getElementById('serials-active-filters-badge');
            const resetBtn = document.getElementById('serials-reset-filters-btn');
            const batFilter = document.getElementById('serials-battery-filter');
            const noteFilter = document.getElementById('serials-notes-filter');
            const chkFilter = document.getElementById('serials-check-filter');
            const shpFilter = document.getElementById('serials-ship-filter');
            const flwFilter = document.getElementById('serials-followup-filter');
            const supFilter = document.getElementById('serials-supplier-filter');
            const saleFilter = document.getElementById('serials-sale-filter');
            const searchInp = document.getElementById('serials-search-input');

            let activeAdvanced = 0;
            if (batFilter && batFilter.value !== 'all') activeAdvanced++;
            if (noteFilter && noteFilter.value !== 'all') activeAdvanced++;
            if (chkFilter && chkFilter.value !== 'all') activeAdvanced++;
            if (shpFilter && shpFilter.value !== 'all') activeAdvanced++;
            if (flwFilter && flwFilter.value !== 'all') activeAdvanced++;

            if (badge) {
                if (activeAdvanced > 0) {
                    badge.textContent = activeAdvanced;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            const hasAny = activeAdvanced > 0 ||
                (supFilter && supFilter.value !== 'all') ||
                (saleFilter && saleFilter.value !== 'all') ||
                (searchInp && searchInp.value.trim().length > 0);

            if (resetBtn) resetBtn.classList.toggle('hidden', !hasAny);
        }

        // زر إظهار/إخفاء الفلاتر الإضافية
        const toggleBtn = document.getElementById('serials-toggle-advanced-filters');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const panel = document.getElementById('serials-advanced-filters-panel');
                const icon = document.getElementById('serials-advanced-filters-icon');
                if (!panel) return;
                const isHidden = panel.classList.contains('hidden');
                panel.classList.toggle('hidden', !isHidden);
                if (icon) {
                    icon.classList.toggle('rotate-180', isHidden);
                }
            });
        }

        // زر إعادة ضبط كل الفلاتر
        const resetBtn = document.getElementById('serials-reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const ids = [
                    'serials-search-input',
                    'serials-supplier-filter',
                    'serials-sale-filter',
                    'serials-battery-filter',
                    'serials-notes-filter',
                    'serials-check-filter',
                    'serials-ship-filter',
                    'serials-followup-filter'
                ];
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (el.tagName === 'INPUT') el.value = '';
                    else el.value = 'all';
                });
                updateActiveFiltersBadge();
                const searchInp = document.getElementById('serials-search-input');
                if (searchInp) searchInp.dispatchEvent(new Event('input'));
            });
        }

        // ربط فلاتر التصفية
        const triggerFilter = () => {
            updateActiveFiltersBadge();
            const searchInp = document.getElementById('serials-search-input');
            if (searchInp) {
                searchInp.dispatchEvent(new Event('input'));
            }
        };

        [
            'serials-supplier-filter',
            'serials-sale-filter',
            'serials-battery-filter',
            'serials-notes-filter',
            'serials-check-filter',
            'serials-ship-filter',
            'serials-followup-filter'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', triggerFilter);
        });

        const searchInput = document.getElementById('serials-search-input');
        if (searchInput) searchInput.addEventListener('input', updateActiveFiltersBadge);

        // تطبيق الوضع المفضل فوراً
        setSerialsViewMode(currentViewMode);
        updateActiveFiltersBadge();
    });
})();
