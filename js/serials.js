/* 
    serials.js - Logic for the Standalone Serials Management Section 
*/

(function() {
    const trackerSection = document.getElementById('serials-tracker-section');
    if (!trackerSection) return;

    const searchInput = document.getElementById('serials-search-input');
    const checkFilter = document.getElementById('serials-check-filter');
    const shipFilter = document.getElementById('serials-ship-filter');
    const followupFilter = document.getElementById('serials-followup-filter');
    const saleFilter = document.getElementById('serials-sale-filter');
    const tableBody = document.getElementById('serials-table-body');
    
    // Add Form Elements
    const addSn = document.getElementById('serials-add-sn');
    const addProduct = document.getElementById('serials-add-product');
    const addSupplier = document.getElementById('serials-add-supplier');
    const addShipping = document.getElementById('serials-add-shipping');
    const addFollowup = document.getElementById('serials-add-followup');
    const addNotes = document.getElementById('serials-add-notes');
    const addBtn = document.getElementById('serials-add-btn');

    // Bulk Action Elements
    const selectAllCheckbox = document.getElementById('serials-select-all');
    const bulkCheckBtn = document.getElementById('serials-bulk-check');
    const bulkShipBtn = document.getElementById('serials-bulk-ship');
    const bulkDeleteBtn = document.getElementById('serials-bulk-delete');

    // Stats
    const statTotal = document.getElementById('serials-stat-total');
    const statChecked = document.getElementById('serials-stat-checked');
    const statShipped = document.getElementById('serials-stat-shipped');

    // Independent Data Array
    let standaloneSerials = [];
    let isDataLoaded = false;
    let lastLoadedLength = -1;

    // Undo/Redo Integration
    window.getStandaloneSerials = () => standaloneSerials;
    window.setStandaloneSerials = (data, skipSave = false) => {
        standaloneSerials = data || [];
        renderSerialsTable();
        if (!skipSave) saveDataToFirebase();
    };

    function takeSnapshot() {
        if (typeof window.saveStateToHistory === 'function') {
            window.saveStateToHistory();
        }
    }

    function cloneSerials() {
        return JSON.parse(JSON.stringify(standaloneSerials));
    }

    async function persistSerialChange(before, successMessage) {
        renderSerialsTable();
        try {
            await saveDataToFirebase();
            if (successMessage && typeof showGlobalMessage === 'function') showGlobalMessage(successMessage);
            return true;
        } catch (error) {
            standaloneSerials = before;
            renderSerialsTable();
            console.error('Standalone serials change rolled back after cloud failure:', error);
            if (typeof showGlobalMessage === 'function') showGlobalMessage('فشلت المزامنة؛ تمت استعادة البيانات المحلية كما كانت.', true);
            return false;
        }
    }

    // Load from Firebase
    async function loadDataFromFirebase() {
        // No-op: Data is now loaded dynamically per day by finance-core.js via setStandaloneSerials
        isDataLoaded = true;
        renderSerialsTable(); // Remove the spinner and render data
    }

    // Save to Firebase
    async function saveDataToFirebase() {
        if (typeof window.saveSystemToCloud === 'function') {
            console.log('Routing serials save to daily cloud backup...');
            window.saveSystemToCloud();
        }
    }

    // Export Serials
    const exportBtn = document.getElementById('export-serials-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!standaloneSerials || standaloneSerials.length === 0) {
                if (typeof showGlobalMessage === 'function') showGlobalMessage('لا يوجد سيريالات للتصدير.', true);
                return;
            }
            const dataStr = JSON.stringify(standaloneSerials, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `serials_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (typeof showGlobalMessage === 'function') showGlobalMessage('تم تصدير السيريالات بنجاح.');
        });
    }

    // Import Serials
    const importInput = document.getElementById('import-serials-file');
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (Array.isArray(importedData)) {
                        takeSnapshot(); // For undo
                        const shouldReplace = confirm("هل تريد مسح السيريالات الحالية واستبدالها بالملف الجديد؟\n\n[OK] = مسح واستبدال\n[Cancel] = إضافة فوق السيريالات الموجودة");
                        
                        let newData = [];
                        if (shouldReplace) {
                            newData = importedData;
                        } else {
                            newData = [...standaloneSerials, ...importedData];
                        }
                        
                        // Deduplicate by ID just in case
                        const uniqueMap = new Map();
                        newData.forEach(item => {
                            if (!item.id) item.id = 'sn-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
                            uniqueMap.set(item.id, item);
                        });
                        
                        const finalData = Array.from(uniqueMap.values());
                        
                        if (typeof window.setStandaloneSerials === 'function') {
                            // Update system and force save to cloud
                            window.setStandaloneSerials(finalData, true); // true to skip the internal save
                            if (typeof window.saveSystemToCloud === 'function') {
                                window.saveSystemToCloud();
                            }
                        }
                        
                        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم استيراد ${importedData.length} سيريال بنجاح.`);
                    } else {
                        if (typeof showGlobalMessage === 'function') showGlobalMessage('ملف الاستيراد غير صالح.', true);
                    }
                } catch (error) {
                    console.error('Error importing JSON:', error);
                    if (typeof showGlobalMessage === 'function') showGlobalMessage('حدث خطأ أثناء قراءة الملف.', true);
                }
                importInput.value = ''; // Reset
            };
            reader.readAsText(file);
        });
    }

    // Listen for clicks on the nav button to load data if not loaded
    const navBtn = document.querySelector('button[data-target="serials-tracker-section"]');
    if (navBtn) {
        navBtn.addEventListener('click', () => {
            if (!isDataLoaded) {
                tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-10"><i class="fas fa-spinner fa-spin fa-2x text-blue-500"></i><br><span class="text-slate-500 mt-2 block">جاري تحميل البيانات...</span></td></tr>';
                loadDataFromFirebase();
            } else {
                renderSerialsTable();
            }
        });
    }

    searchInput.addEventListener('input', renderSerialsTable);
    checkFilter.addEventListener('change', renderSerialsTable);
    shipFilter.addEventListener('change', renderSerialsTable);
    if (followupFilter) followupFilter.addEventListener('change', renderSerialsTable);
    if (saleFilter) saleFilter.addEventListener('change', renderSerialsTable);
    
    // Select All
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = tableBody.querySelectorAll('.serial-row-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });
    }

    function getSelectedSerials() {
        const checkboxes = tableBody.querySelectorAll('.serial-row-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Bulk Actions
    if (bulkCheckBtn) bulkCheckBtn.addEventListener('click', () => {
        const selected = getSelectedSerials();
        if (selected.length === 0) return alert('الرجاء تحديد سيريالات أولاً.');
        
        let allChecked = true;
        selected.forEach(serial => {
            const item = standaloneSerials.find(s => s.serial === serial);
            if (item && !item.isChecked) allChecked = false;
        });

        selected.forEach(serial => {
            const item = standaloneSerials.find(s => s.serial === serial);
            if (item) item.isChecked = !allChecked;
        });

        renderSerialsTable();
        saveDataToFirebase();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحديث حالة الفحص لـ ${selected.length} سيريال.`);
    });

    if (bulkShipBtn) bulkShipBtn.addEventListener('click', () => {
        const selected = getSelectedSerials();
        if (selected.length === 0) return alert('الرجاء تحديد سيريالات أولاً.');
        
        let allShipped = true;
        selected.forEach(serial => {
            const item = standaloneSerials.find(s => s.serial === serial);
            if (item && !item.isShipped) allShipped = false;
        });

        selected.forEach(serial => {
            const item = standaloneSerials.find(s => s.serial === serial);
            if (item) item.isShipped = !allShipped;
        });

        renderSerialsTable();
        saveDataToFirebase();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحديث حالة البطارية لـ ${selected.length} سيريال.`);
    });

    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', async () => {
        const selected = getSelectedSerials();
        if (selected.length === 0) return alert('الرجاء تحديد سيريالات أولاً.');
        
        if (!confirm(`هل أنت متأكد من حذف ${selected.length} سيريال؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

        const before = cloneSerials();
        standaloneSerials = standaloneSerials.filter(s => !selected.includes(s.serial));
        if (await persistSerialChange(before, `تم حذف ${selected.length} سيريال بنجاح.`) && selectAllCheckbox) selectAllCheckbox.checked = false;
    });

    let editingSerial = null;

    // Add / Edit New Serial
    if (addBtn) addBtn.addEventListener('click', () => {
        const serialVal = addSn.value.trim();
        const productVal = addProduct.value.trim() || 'جهاز غير محدد';
        const supplierVal = addSupplier.value.trim() || 'مورد غير محدد';
        const shippingVal = parseFloat(addShipping.value) || 0;
        const followupVal = addFollowup ? addFollowup.value : '';
        const notesVal = addNotes ? addNotes.value.trim() : '';

        if (!serialVal) {
            alert('الرجاء إدخال رقم السيريال على الأقل.');
            return;
        }

        if (editingSerial) {
            // Edit Mode
            if (serialVal !== editingSerial && standaloneSerials.some(s => s.serial === serialVal)) {
                alert('هذا السيريال مسجل مسبقاً لجهاز آخر!');
                return;
            }

            const itemIndex = standaloneSerials.findIndex(s => s.serial === editingSerial);
            if (itemIndex > -1) {
                standaloneSerials[itemIndex].serial = serialVal;
                standaloneSerials[itemIndex].productName = productVal;
                standaloneSerials[itemIndex].supplierName = supplierVal;
                standaloneSerials[itemIndex].shippingPercentage = shippingVal;
                standaloneSerials[itemIndex].followUpDate = followupVal;
                standaloneSerials[itemIndex].notes = notesVal;
            }

            editingSerial = null;
            addBtn.innerHTML = '<i class="fas fa-plus"></i> <span>إضافة للسجل</span>';
            addBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
            addBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تعديل السيريال: ${serialVal} بنجاح.`);

        } else {
            // Add Mode
            if (standaloneSerials.some(s => s.serial === serialVal)) {
                alert('هذا السيريال مسجل مسبقاً!');
                return;
            }

            const now = new Date();
            const dateString = now.toLocaleDateString('ar-EG');

            standaloneSerials.unshift({
                serial: serialVal,
                productName: productVal,
                supplierName: supplierVal,
                shippingPercentage: shippingVal,
                followUpDate: followupVal,
                notes: notesVal,
                addedTimestamp: now.getTime(),
                dateAdded: dateString,
                isChecked: false,
                isShipped: false,
                saleStatus: 'available'
            });
            if (typeof showGlobalMessage === 'function') showGlobalMessage(`تمت إضافة السيريال: ${serialVal} بنجاح.`);
        }

        addSn.value = '';
        addProduct.value = '';
        addSupplier.value = '';
        addShipping.value = '';
        if (addFollowup) addFollowup.value = '';
        if (addNotes) addNotes.value = '';
        addSn.focus();

        renderSerialsTable();
        saveDataToFirebase();
    });

    window.editStandaloneRecord = function(serial) {
        const item = standaloneSerials.find(s => s.serial === serial);
        if (!item) return;

        addSn.value = item.serial || '';
        addProduct.value = item.productName || '';
        addSupplier.value = item.supplierName || '';
        addShipping.value = item.shippingPercentage || 0;
        if (addFollowup) addFollowup.value = item.followUpDate || '';
        if (addNotes) addNotes.value = item.notes || '';

        editingSerial = item.serial;
        addBtn.innerHTML = '<i class="fas fa-save"></i> <span>حفظ التعديلات</span>';
        addBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        addBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');

        document.querySelector('.serials-controls').scrollIntoView({ behavior: 'smooth' });
    };

    window.toggleStandaloneFlag = function(serial, flagName) {
        takeSnapshot();
        let updated = false;
        standaloneSerials.forEach(log => {
            if (log.serial === serial) {
                log[flagName] = !log[flagName];
                updated = true;
            }
        });

        if (updated) {
            renderSerialsTable();
            saveDataToFirebase();
        }
    };

    window.deleteStandaloneSerial = async function(serial) {
        if (!confirm(`هل أنت متأكد من حذف السيريال ${serial}؟`)) return;
        const before = cloneSerials();
        standaloneSerials = standaloneSerials.filter(s => s.serial !== serial);
        await persistSerialChange(before, `تم حذف السيريال ${serial} بنجاح.`);
    };

    window.editStandaloneNotes = function(serial) {
        const item = standaloneSerials.find(s => s.serial === serial);
        if (!item) return;
        const newNote = prompt('أضف/عدل الملاحظة لهذا الجهاز:', item.notes || '');
        if (newNote !== null) {
            takeSnapshot();
            item.notes = newNote.trim();
            renderSerialsTable();
            saveDataToFirebase();
        }
    };

    window.updateStandaloneFollowup = function(serial, dateVal) {
        const item = standaloneSerials.find(s => s.serial === serial);
        if (item) {
            takeSnapshot();
            item.followUpDate = dateVal;
            renderSerialsTable();
            saveDataToFirebase();
        }
    };

    window.toggleSaleStatus = function(serial) {
        const item = standaloneSerials.find(s => s.serial === serial);
        if (item) {
            takeSnapshot();
            item.saleStatus = item.saleStatus === 'pending' ? 'available' : 'pending';
            renderSerialsTable();
            saveDataToFirebase();
            if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تغيير حالة البيع للسيريال ${serial}`);
        }
    };

    window.markSoldFinally = function(serial) {
        if (!confirm(`هل تم بيع الجهاز نهائياً؟ سيتم أرشفته كمباع.`)) return;
        const item = standaloneSerials.find(s => s.serial === serial);
        if (item) {
            takeSnapshot();
            item.saleStatus = 'sold';
            item.soldDate = new Date().toISOString().split('T')[0];
            renderSerialsTable();
            saveDataToFirebase();
            if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم أرشفة السيريال ${serial} كمباع بنجاح.`);
        }
    };

    window.restoreSoldSerial = function(serial) {
        if (!confirm(`هل أنت متأكد من إرجاع هذا السيريال ليكون متاحاً للبيع مرة أخرى؟`)) return;
        const item = standaloneSerials.find(s => s.serial === serial);
        if (item) {
            takeSnapshot();
            item.saleStatus = 'available';
            item.soldDate = null;
            renderSerialsTable();
            saveDataToFirebase();
            if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم إرجاع السيريال ${serial} للمتاح بنجاح.`);
        }
    };

    // تمرير أرقام الفهارس فقط إلى معالجات HTML يمنع إدخال بيانات المستخدم في onclick.
    function serialAt(index) {
        const item = standaloneSerials[Number(index)];
        return item ? item.serial : null;
    }
    window.toggleStandaloneFlagByIndex = (index, flag) => {
        const serial = serialAt(index); if (serial !== null) window.toggleStandaloneFlag(serial, flag);
    };
    window.updateStandaloneFollowupByIndex = (index, date) => {
        const serial = serialAt(index); if (serial !== null) window.updateStandaloneFollowup(serial, date);
    };
    window.editStandaloneNotesByIndex = (index) => {
        const serial = serialAt(index); if (serial !== null) window.editStandaloneNotes(serial);
    };
    window.restoreSoldSerialByIndex = (index) => {
        const serial = serialAt(index); if (serial !== null) window.restoreSoldSerial(serial);
    };
    window.deleteStandaloneSerialByIndex = (index) => {
        const serial = serialAt(index); if (serial !== null) window.deleteStandaloneSerial(serial);
    };
    window.toggleSaleStatusByIndex = (index) => {
        const serial = serialAt(index); if (serial !== null) window.toggleSaleStatus(serial);
    };
    window.markSoldFinallyByIndex = (index) => {
        const serial = serialAt(index); if (serial !== null) window.markSoldFinally(serial);
    };
    window.editStandaloneRecordByIndex = (index) => {
        const serial = serialAt(index); if (serial !== null) window.editStandaloneRecord(serial);
    };

    function renderSerialsTable() {
        if (!Array.isArray(standaloneSerials) || standaloneSerials.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-12 text-slate-400"><i class="fas fa-folder-open text-4xl mb-3"></i><p>لا يوجد سيريالات مسجلة حالياً.</p></td></tr>';
            statTotal.textContent = 0;
            statChecked.textContent = 0;
            statShipped.textContent = 0;
            return;
        }

        const searchTerm = searchInput.value.toLowerCase().trim();
        const checkVal = checkFilter.value;
        const shipVal = shipFilter.value;
        const followVal = followupFilter ? followupFilter.value : 'all';
        const saleVal = saleFilter ? saleFilter.value : 'all';

        const todayObj = new Date();
        todayObj.setHours(0,0,0,0);
        const todayMs = todayObj.getTime();

        let filteredLogs = standaloneSerials.filter(log => {
            let matchSearch = true;
            if (searchTerm) {
                matchSearch = (log.serial && log.serial.toLowerCase().includes(searchTerm)) ||
                              (log.productName && log.productName.toLowerCase().includes(searchTerm)) ||
                              (log.supplierName && log.supplierName.toLowerCase().includes(searchTerm)) ||
                              (log.notes && log.notes.toLowerCase().includes(searchTerm));
            }

            let matchCheck = true;
            if (checkVal === 'checked') matchCheck = log.isChecked === true;
            if (checkVal === 'unchecked') matchCheck = !log.isChecked;

            let matchShip = true;
            if (shipVal === 'shipped') matchShip = log.isShipped === true;
            if (shipVal === 'unshipped') matchShip = !log.isShipped;

            let matchFollowup = true;
            if (followVal !== 'all') {
                if (!log.followUpDate) {
                    matchFollowup = false;
                } else {
                    const fDate = new Date(log.followUpDate);
                    fDate.setHours(0,0,0,0);
                    const fMs = fDate.getTime();
                    
                    if (followVal === 'due_today') matchFollowup = (fMs === todayMs);
                    if (followVal === 'overdue') matchFollowup = (fMs < todayMs);
                    if (followVal === 'upcoming') matchFollowup = (fMs > todayMs);
                }
            }

            let matchSale = true;
            const currentSaleStatus = log.saleStatus || 'available';
            if (saleVal === 'sold') {
                matchSale = (currentSaleStatus === 'sold');
            } else {
                if (currentSaleStatus === 'sold') {
                    matchSale = false;
                } else {
                    if (saleVal === 'available') matchSale = currentSaleStatus === 'available';
                    if (saleVal === 'pending') matchSale = currentSaleStatus === 'pending';
                }
            }

            return matchSearch && matchCheck && matchShip && matchFollowup && matchSale;
        });

        filteredLogs.sort((a, b) => (b.addedTimestamp || 0) - (a.addedTimestamp || 0));

        let html = '';
        let checkedCount = 0;
        let shippedCount = 0;

        filteredLogs.forEach(log => {
            const serialIndex = standaloneSerials.indexOf(log);
            if (log.isChecked) checkedCount++;
            if (log.isShipped) shippedCount++;

            const isChecked = log.isChecked;
            const checkBtnClass = isChecked ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-transparent';
            const checkIcon = isChecked ? 'fa-check-circle' : 'fa-circle';

            const isShipped = log.isShipped;
            const shipBtnClass = isShipped ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-transparent';
            const shipIcon = isShipped ? 'fa-battery-full' : 'fa-battery-empty';

            const isSold = (log.saleStatus === 'sold');
            const isPending = (log.saleStatus === 'pending');
            const saleBadgeClass = isSold ? 'bg-slate-100 text-slate-600 border-slate-200' : (isPending ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100');
            const saleBadgeIcon = isSold ? 'fa-box-archive' : (isPending ? 'fa-clock' : 'fa-check');
            const saleBadgeText = isSold ? 'مباع 📦' : (isPending ? 'معلق' : 'متاح');

            // Highlighting
            let rowClass = "hover:bg-slate-50 transition-colors ";
            if (isSold) rowClass += "bg-slate-50/70 opacity-80 ";
            else if (isPending) rowClass += "bg-amber-50/50 ";
            else if (isChecked && isShipped) rowClass += "bg-emerald-50/30 ";

            // Follow-up status color
            let followUpStyle = "border border-slate-200 text-slate-600 bg-slate-50 focus:ring-blue-500";
            let followUpIndicator = "";
            if (log.followUpDate) {
                const fDate = new Date(log.followUpDate);
                fDate.setHours(0,0,0,0);
                const fMs = fDate.getTime();
                if (fMs < todayMs) {
                    followUpStyle = "border-rose-300 text-rose-700 bg-rose-50 font-bold focus:ring-rose-500";
                    followUpIndicator = "<div class='absolute -left-1.5 -top-1.5 w-3 h-3 bg-rose-500 rounded-full animate-ping opacity-75'></div><div class='absolute -left-1.5 -top-1.5 w-3 h-3 bg-rose-500 border-2 border-white rounded-full'></div>";
                } else if (fMs === todayMs) {
                    followUpStyle = "border-amber-400 text-amber-700 bg-amber-50 font-bold focus:ring-amber-500";
                    followUpIndicator = "<div class='absolute -left-1.5 -top-1.5 w-3 h-3 bg-amber-400 border-2 border-white rounded-full'></div>";
                }
            }

            // Notes icon styling
            const hasNote = log.notes && log.notes.trim().length > 0;
            const noteIcon = hasNote ? 'fa-comment-dots text-blue-500' : 'fa-comment-medical text-slate-300 hover:text-blue-400';
            const noteTitle = hasNote ? escapeHTML(log.notes) : 'أضف ملاحظة';

            // Shipping Progress
            const shipPercent = Math.min(100, Math.max(0, Number(log.shippingPercentage || 0) || 0));
            let shipColor = 'bg-rose-500';
            if (shipPercent > 20) shipColor = 'bg-amber-500';
            if (shipPercent > 60) shipColor = 'bg-emerald-500';

            html += `
                <tr class="${rowClass} border-b border-slate-100 last:border-none group">
                    <td class="px-4 py-3 text-center">
                        <input type="checkbox" class="serial-row-checkbox w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" value="${escapeHTML(log.serial)}">
                    </td>
                    <td class="px-4 py-3">
                        <div class="font-bold text-slate-800 font-mono">${escapeHTML(log.serial)}</div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="font-bold text-slate-700 text-sm">${escapeHTML(log.productName || '-')}</div>
                        <div class="text-xs text-slate-400 mt-0.5"><i class="fas fa-truck-loading mr-1"></i> ${escapeHTML(log.supplierName || '-')}</div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-xs font-bold ${shipPercent < 20 ? 'text-rose-600' : 'text-slate-600'}">${shipPercent}%</span>
                            <div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div class="h-full ${shipColor}" style="width: ${shipPercent}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${saleBadgeClass}">
                            <i class="fas ${saleBadgeIcon}"></i> ${saleBadgeText}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="window.toggleStandaloneFlagByIndex(${serialIndex}, 'isChecked')" class="w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${checkBtnClass}" title="فحص">
                                <i class="fas ${checkIcon}"></i>
                            </button>
                            <button onclick="window.toggleStandaloneFlagByIndex(${serialIndex}, 'isShipped')" class="w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${shipBtnClass}" title="بطارية مشحونة">
                                <i class="fas ${shipIcon}"></i>
                            </button>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center relative">
                        ${followUpIndicator}
                        <input type="date" value="${escapeHTML(log.followUpDate || '')}" class="rounded-lg text-xs px-2 py-1.5 outline-none transition-colors w-[115px] ${followUpStyle}" onchange="window.updateStandaloneFollowupByIndex(${serialIndex}, this.value)">
                    </td>
                    <td class="px-4 py-3 text-center">
                        <button onclick="window.editStandaloneNotesByIndex(${serialIndex})" title="${noteTitle}" class="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                            <i class="fas ${noteIcon} text-lg"></i>
                        </button>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <!-- Actions Dropdown or Buttons -->
                        <div class="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            ${isSold ? `
                                <button onclick="window.restoreSoldSerialByIndex(${serialIndex})" class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 flex items-center justify-center transition-colors" title="إرجاع للمتاح 🔄">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button onclick="window.deleteStandaloneSerialByIndex(${serialIndex})" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors" title="حذف نهائي">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : `
                                <button onclick="window.toggleSaleStatusByIndex(${serialIndex})" class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center transition-colors" title="تعليق البيع / إتاحة">
                                    <i class="fas fa-hand-holding-usd"></i>
                                </button>
                                <button onclick="window.markSoldFinallyByIndex(${serialIndex})" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors" title="أرشفة كمباع 📦">
                                    <i class="fas fa-box-archive"></i>
                                </button>
                                <button onclick="window.editStandaloneRecordByIndex(${serialIndex})" class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 flex items-center justify-center transition-colors" title="تعديل">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="window.deleteStandaloneSerialByIndex(${serialIndex})" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        });

        if (filteredLogs.length === 0) {
            html = '<tr><td colspan="9" class="text-center py-12 text-slate-400"><i class="fas fa-folder-open text-4xl mb-3"></i><p>لا توجد بيانات مطابقة.</p></td></tr>';
        }

        tableBody.innerHTML = html;

        statTotal.textContent = filteredLogs.length;
        statChecked.textContent = checkedCount;
        statShipped.textContent = shippedCount;
    }
})();


