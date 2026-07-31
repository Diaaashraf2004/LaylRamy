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
    let serialsOperationLog = [];
    let isDataLoaded = false;

    // Undo/Redo Integration
    window.getStandaloneSerials = () => standaloneSerials;
    window.setStandaloneSerials = (data) => {
        standaloneSerials = data || [];
        renderSerialsTable();
        saveDataToFirebase();
    };
    window.getSerialsOperationLog = () => serialsOperationLog;
    window.setSerialsOperationLog = (logData) => {
        serialsOperationLog = logData || [];
        renderSerialsLogTable();
        saveDataToFirebase();
    };

    function takeSnapshot() {
        if (typeof window.saveStateToHistory === 'function') {
            window.saveStateToHistory();
            if (typeof showGlobalMessage === 'function') showGlobalMessage('تم أخذ لقطة للتراجع', false);
        } else {
            console.error("Undo system not found!");
        }
    }

    // Load from Firebase
    async function loadDataFromFirebase() {
        if (!window.currentUser || !window.db || !window.doc || !window.getDoc) {
            console.error('Firebase not fully initialized yet.');
            return;
        }
        try {
            const docRef = window.doc(window.db, 'users', window.currentUser.uid, 'standaloneSerials', 'main');
            const snap = await window.getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                standaloneSerials = data.data || [];
                serialsOperationLog = data.log || [];
            } else {
                standaloneSerials = [];
                serialsOperationLog = [];
            }
            isDataLoaded = true;
            renderSerialsTable();
            renderSerialsLogTable();
        } catch (error) {
            console.error('Error loading standalone serials:', error);
            if (typeof showGlobalMessage === 'function') {
                showGlobalMessage('حدث خطأ أثناء تحميل السيريالات.', true);
            }
        }
    }

    // Save to Firebase
    async function saveDataToFirebase() {
        if (!window.currentUser || !window.db || !window.doc || !window.setDoc) return;
        try {
            const docRef = window.doc(window.db, 'users', window.currentUser.uid, 'standaloneSerials', 'main');
            await window.setDoc(docRef, { data: standaloneSerials, log: serialsOperationLog });
            console.log('Standalone serials saved to Firebase.');
        } catch (error) {
            console.error('Error saving standalone serials:', error);
            if (typeof showGlobalMessage === 'function') {
                showGlobalMessage('حدث خطأ أثناء حفظ السيريالات.', true);
            }
        }
    }

    // Log Action Helper
    function logSerialAction(actionName, serialNumber, details) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-EG');
        const dateString = now.toLocaleDateString('ar-EG');
        
        serialsOperationLog.unshift({
            id: Date.now() + Math.random(),
            timestamp: now.getTime(),
            date: dateString,
            time: timeString,
            action: actionName,
            serial: serialNumber || '-',
            details: details || ''
        });
        
        if (serialsOperationLog.length > 500) {
            serialsOperationLog.pop();
        }
        renderSerialsLogTable();
    }

    // Render Log Table
    function renderSerialsLogTable() {
        const logBody = document.getElementById('serials-log-table-body');
        if (!logBody) return;
        
        if (!serialsOperationLog || serialsOperationLog.length === 0) {
            logBody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-slate-400">لا توجد عمليات مسجلة حالياً.</td></tr>';
            return;
        }

        logBody.innerHTML = serialsOperationLog.map(log => `
            <tr class="hover:bg-indigo-50/30 transition-colors">
                <td class="px-4 py-2 text-xs">
                    <div class="font-bold text-slate-700">${log.date}</div>
                    <div class="text-slate-400">${log.time}</div>
                </td>
                <td class="px-4 py-2 font-mono text-sm font-bold text-slate-700">${log.serial}</td>
                <td class="px-4 py-2">
                    <span class="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold border border-indigo-100">${log.action}</span>
                </td>
                <td class="px-4 py-2 text-xs text-slate-600 whitespace-normal min-w-[200px]">${log.details}</td>
            </tr>
        `).join('');
    }

    // UI Toggle for Log
    const logToggleBtn = document.getElementById('serials-log-toggle');
    const logContainer = document.getElementById('serials-log-container');
    const logCloseBtn = document.getElementById('serials-log-close');

    if (logToggleBtn && logContainer) {
        logToggleBtn.addEventListener('click', () => {
            logContainer.classList.toggle('hidden');
        });
    }
    if (logCloseBtn && logContainer) {
        logCloseBtn.addEventListener('click', () => {
            logContainer.classList.add('hidden');
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
        takeSnapshot();
        
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
        logSerialAction("فحص جماعي", selected.join(", "), `تحديث حالة الفحص لـ ${selected.length} سيريال`);
        saveDataToFirebase();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحديث حالة الفحص لـ ${selected.length} سيريال.`);
    });

    if (bulkShipBtn) bulkShipBtn.addEventListener('click', () => {
        const selected = getSelectedSerials();
        if (selected.length === 0) return alert('الرجاء تحديد سيريالات أولاً.');
        takeSnapshot();
        
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
        logSerialAction("حالة البطارية (جماعي)", selected.join(", "), `تحديث حالة البطارية لـ ${selected.length} سيريال`);
        saveDataToFirebase();
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم تحديث حالة البطارية لـ ${selected.length} سيريال.`);
    });

    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', () => {
        const selected = getSelectedSerials();
        if (selected.length === 0) return alert('الرجاء تحديد سيريالات أولاً.');
        
        if (!confirm(`هل أنت متأكد من حذف ${selected.length} سيريال؟`)) return;
        takeSnapshot();

        standaloneSerials = standaloneSerials.filter(s => !selected.includes(s.serial));
        renderSerialsTable();
        logSerialAction("حذف جماعي", selected.join(", "), `تم حذف ${selected.length} سيريال`);
        saveDataToFirebase();
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم حذف ${selected.length} سيريال بنجاح.`);
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
            takeSnapshot();

            const oldSerial = editingSerial;
            const itemIndex = standaloneSerials.findIndex(s => s.serial === editingSerial);
            if (itemIndex > -1) {
                const oldProduct = standaloneSerials[itemIndex].productName;
                standaloneSerials[itemIndex].serial = serialVal;
                standaloneSerials[itemIndex].productName = productVal;
                standaloneSerials[itemIndex].supplierName = supplierVal;
                standaloneSerials[itemIndex].shippingPercentage = shippingVal;
                standaloneSerials[itemIndex].followUpDate = followupVal;
                standaloneSerials[itemIndex].notes = notesVal;
                logSerialAction("تعديل بيانات", serialVal, `تعديل: ${oldSerial !== serialVal ? 'السيريال تغيّر، ' : ''}المنتج: ${productVal}`);
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
            takeSnapshot();

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
            logSerialAction("إضافة سيريال جديد", serialVal, `المنتج: ${productVal} | المورد: ${supplierVal}`);
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
            const item = standaloneSerials.find(s => s.serial === serial);
            const statusStr = flagName === 'isChecked' ? (item.isChecked ? 'تم الفحص' : 'بانتظار الفحص') : (item.isShipped ? 'تم الشحن' : 'بانتظار الشحن');
            logSerialAction(flagName === 'isChecked' ? "تحديث الفحص" : "تحديث البطارية", serial, `الحالة الجديدة: ${statusStr}`);
            saveDataToFirebase();
        }
    };

    window.deleteStandaloneSerial = function(serial) {
        if (!confirm(`هل أنت متأكد من حذف السيريال ${serial}؟`)) return;
        takeSnapshot();
        const item = standaloneSerials.find(s => s.serial === serial);
        const details = item ? `المنتج: ${item.productName} | المورد: ${item.supplierName}` : "بدون بيانات إضافية";
        standaloneSerials = standaloneSerials.filter(s => s.serial !== serial);
        renderSerialsTable();
        logSerialAction("حذف سيريال", serial, `تم الحذف نهائياً. (${details})`);
        saveDataToFirebase();
    };

    window.editStandaloneNotes = function(serial) {
        const item = standaloneSerials.find(s => s.serial === serial);
        if (!item) return;
        const newNote = prompt('أضف/عدل الملاحظة لهذا الجهاز:', item.notes || '');
        if (newNote !== null) {
            takeSnapshot();
            const oldNote = item.notes;
            item.notes = newNote.trim();
            renderSerialsTable();
            logSerialAction("تعديل ملاحظة", serial, `من: (${oldNote || 'بدون'}) إلى: (${item.notes || 'بدون'})`);
            saveDataToFirebase();
        }
    };

    window.updateStandaloneFollowup = function(serial, dateVal) {
        const item = standaloneSerials.find(s => s.serial === serial);
        if (item) {
            takeSnapshot();
            const oldDate = item.followUpDate;
            item.followUpDate = dateVal;
            renderSerialsTable();
            logSerialAction("تحديث المتابعة", serial, `من: (${oldDate || 'غير محدد'}) إلى: (${dateVal || 'غير محدد'})`);
            saveDataToFirebase();
        }
    };

    window.toggleSaleStatus = function(serial) {
        const item = standaloneSerials.find(s => s.serial === serial);
        if (item) {
            takeSnapshot();
            item.saleStatus = item.saleStatus === 'pending' ? 'available' : 'pending';
            const statusAr = item.saleStatus === 'pending' ? 'معلق (قيد البيع)' : 'متاح';
            renderSerialsTable();
            logSerialAction("تغيير حالة البيع", serial, `الحالة الجديدة: ${statusAr}`);
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
            logSerialAction("أرشفة كمباع", serial, `تمت الأرشفة في ${item.soldDate}`);
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
            logSerialAction("استعادة من المباع", serial, "تم الإرجاع للمتاح");
            saveDataToFirebase();
            if (typeof showGlobalMessage === 'function') showGlobalMessage(`تم إرجاع السيريال ${serial} للمتاح بنجاح.`);
        }
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
            const noteTitle = hasNote ? log.notes : 'أضف ملاحظة';

            // Shipping Progress
            const shipPercent = Number(log.shippingPercentage || 0);
            let shipColor = 'bg-rose-500';
            if (shipPercent > 20) shipColor = 'bg-amber-500';
            if (shipPercent > 60) shipColor = 'bg-emerald-500';

            html += `
                <tr class="${rowClass} border-b border-slate-100 last:border-none group">
                    <td class="px-4 py-3 text-center">
                        <input type="checkbox" class="serial-row-checkbox w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" value="${log.serial}">
                    </td>
                    <td class="px-4 py-3">
                        <div class="font-bold text-slate-800 font-mono">${log.serial}</div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="font-bold text-slate-700 text-sm">${log.productName || '-'}</div>
                        <div class="text-xs text-slate-400 mt-0.5"><i class="fas fa-truck-loading mr-1"></i> ${log.supplierName || '-'}</div>
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
                            <button onclick="window.toggleStandaloneFlag('${log.serial}', 'isChecked')" class="w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${checkBtnClass}" title="فحص">
                                <i class="fas ${checkIcon}"></i>
                            </button>
                            <button onclick="window.toggleStandaloneFlag('${log.serial}', 'isShipped')" class="w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${shipBtnClass}" title="بطارية مشحونة">
                                <i class="fas ${shipIcon}"></i>
                            </button>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center relative">
                        ${followUpIndicator}
                        <input type="date" value="${log.followUpDate || ''}" class="rounded-lg text-xs px-2 py-1.5 outline-none transition-colors w-[115px] ${followUpStyle}" onchange="window.updateStandaloneFollowup('${log.serial}', this.value)">
                    </td>
                    <td class="px-4 py-3 text-center">
                        <button onclick="window.editStandaloneNotes('${log.serial}')" title="${noteTitle}" class="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                            <i class="fas ${noteIcon} text-lg"></i>
                        </button>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <!-- Actions Dropdown or Buttons -->
                        <div class="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            ${isSold ? `
                                <button onclick="window.restoreSoldSerial('${log.serial}')" class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 flex items-center justify-center transition-colors" title="إرجاع للمتاح 🔄">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button onclick="window.deleteStandaloneSerial('${log.serial}')" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors" title="حذف نهائي">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : `
                                <button onclick="window.toggleSaleStatus('${log.serial}')" class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center transition-colors" title="تعليق البيع / إتاحة">
                                    <i class="fas fa-hand-holding-usd"></i>
                                </button>
                                <button onclick="window.markSoldFinally('${log.serial}')" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors" title="أرشفة كمباع 📦">
                                    <i class="fas fa-box-archive"></i>
                                </button>
                                <button onclick="window.editStandaloneRecord('${log.serial}')" class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 flex items-center justify-center transition-colors" title="تعديل">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="window.deleteStandaloneSerial('${log.serial}')" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors" title="حذف">
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


