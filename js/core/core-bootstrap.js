// finance-core.js — Main Application Logic
// Extracted from finance.html — DO NOT EDIT finance.html JS directly
// All core functions, state, and event listeners live here.
    document.addEventListener("DOMContentLoaded", function() {

window.parseFloatSafe = function(val) {
    if (val === undefined || val === null || val === '') return 0;
    const num = Number(val);
    if (isNaN(num)) return 0;
    return parseFloat(num.toFixed(2));
};

        console.log("البرنامج بدأ بنجاح - الخطوة 1 تمت");
        // --- Global Error Handler ---
                window.addEventListener('error', function(event) {
            console.error('!!! خطأ عام غير معالج تم اكتشافه !!!');
            console.error('رسالة الخطأ:', event.message);
            console.error('الملف المصدر:', event.filename);
            console.error('رقم السطر:', event.lineno);
            console.error('رقم العمود:', event.colno);
            console.error('كائن الخطأ (Error Object):', event.error); // يحتوي عادة على تتبع المكدس (stack trace)

            // اختيارياً: يمكنك عرض رسالة للمستخدم في الواجهة أيضاً
            // if (typeof showGlobalMessage === 'function') {
            //     showGlobalMessage('حدث خطأ غير متوقع في البرنامج. يرجى مراجعة الـ console لمزيد من التفاصيل ومحاولة تحديث الصفحة.', true);
            // }
        });
        // اختيارياً: يمكنك أيضاً التقاط الأخطاء في الـ Promises التي لم يتم التعامل معها
        window.addEventListener('unhandledrejection', function(event) {
            console.error('!!! خطأ Promise غير معالج تم اكتشافه !!!');
            console.error('سبب الرفض (Rejection Reason):', event.reason);
        });
        // --- End of Global Error Handler ---
        // *** JavaScript - (أعيد ترقيمه ليبدأ هنا) الجزء 7 من 8 يبدأ هنا ***

        // --- تعريف المتغيرات والثوابت الأساسية أولاً ---

        // --- متغيرات الحالة (Main App State) ---

// دالة لجلب الوقت الفعلي (بدون تأخير شبكي أو اعتماد على خوادم خارجية)
window.getRealTimeISO = async function() {
    return new Date().toISOString();
};

var currentLogCategory = window.currentLogCategory || 'all';

// =====================================================================
// == END: DEBUGGING Professional Partial Debt Payment Code ==
// =====================================================================        

// =======================================================

// --- �� دوال اختيار الأقسام للمرتجعات ---
// --- نهاية دوال الأقسام ---

function updateUI() {
    console.log("updateUI called. Current loaded date:", currentLoadedDate);
    const { 
        totalInventoryValue, 
        totalCapital, 
        totalDebtsValue, 
        totalLiabilitiesValue, 
        calculatedPendingReturnsValue, 
        calculatedPendingPurchasesValue 
    } = calculateTotals();
    
    const totalPurchases = calculateTotalPurchasesToday();
    renderAccounts(); 
    const m = (typeof window.money === 'function' ? window.money : Number);
    const totalLiquidity = m(accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)); 
    
    // ✅ 1. حساب الربح المتوقع من المبيعات المعلقة (النظام القديم)
    const totalPotentialProfit = m(pendingSales.reduce((sum, sale) => {
        let p = Number(sale.potentialProfit) || 0;
        // تم خصم الاستقطاع المخفي مسبقاً أثناء إنشاء البيعة المؤقتة (netProfitForDisplay)
        // لذا لا حاجة لخصمه مرة أخرى هنا لتجنب الخصم المزدوج.
        return sum + p;
    }, 0));

    // ✅ 2. حساب أرباح المرتجعات قيد الاستلام (كي لا تُخصم من رأس المال المتوقع إلا عند الاستلام الفعلي)
    const pendingReturnsProfit = m(pendingReturns.reduce((sum, r) => {
        return sum + (Number(r.profitToReverse) || 0);
    }, 0));

    // ✅ 3. المعادلة النهائية لرأس المال المتوقع (تشمل السيولة + المخزن + الديون + أرباح معلقة + مبالغ الـ ERP + أرباح المرتجعات المعلقة)
    const expectedCapital = m(totalCapital + totalPotentialProfit + pendingReturnsProfit);

    // -- تحديث عناصر الواجهة --
    if (d('summary-current-liquidity')) d('summary-current-liquidity').textContent = formatCurrency(totalLiquidity);
    if (d('summary-total-inventory-value')) d('summary-total-inventory-value').textContent = formatCurrency(totalInventoryValue);
    if (d('summary-consignment-value-display')) d('summary-consignment-value-display').textContent = formatCurrency(goodsOnConsignmentValue);
    if (d('summary-total-debts-display')) d('summary-total-debts-display').textContent = formatCurrency(totalDebtsValue);
    if (d('summary-total-liabilities-display')) d('summary-total-liabilities-display').textContent = formatCurrency(totalLiabilitiesValue);
    if (d('summary-total-expenses')) d('summary-total-expenses').textContent = formatCurrency(expenses);
    if (d('summary-total-profit')) d('summary-total-profit').textContent = formatCurrency(totalProfit);
    if (d('summary-total-capital')) d('summary-total-capital').textContent = formatCurrency(totalCapital);
    
    // �� تحديث رقم رأس المال المتوقع ليشمل مبالغ الاستبدال المعلقة
    if (d('summary-expected-capital')) d('summary-expected-capital').textContent = formatCurrency(expectedCapital);
    
    if (d('summary-total-purchases')) d('summary-total-purchases').textContent = formatCurrency(totalPurchases);

    if (inventoryTotalInventoryValue) inventoryTotalInventoryValue.textContent = `إجمالي قيمة المخزون: ${formatCurrency(totalInventoryValue)}`;
    if (inventoryConsignmentValue) inventoryConsignmentValue.textContent = `قيمة مؤقتة: ${formatCurrency(goodsOnConsignmentValue)}`;
    if (inventoryTotalProfit) inventoryTotalProfit.textContent = `إجمالي الربح: ${formatCurrency(totalProfit)}`;
    
    updateProductListDisplay();
    updateSuppliersListDisplay();
    updateSupplierDropdown('product-supplier');
    updateSupplierDropdown('pi_supplier');
    updateLogDisplay();
    updateAdditionalCostsCheckboxes();
    updatePendingSalesDisplay();
    updateDebtorsListDisplay();
    updateLiquidityLogDisplay();
    updateLiabilitiesListDisplay();
    renderDebtorPaymentList();
renderLiabilityPaymentList();
    updateOffsetDatalists();
    pi_updateRecentPurchasesDisplay();
    pi_updatePendingPurchasesDisplay();
    updateReturnsUI();
    populateReturnProductSelect();
    updateMonthlyLiabilitiesDisplay();
    refreshNamesDatalists();
    
    if (totalDebtsDisplay) totalDebtsDisplay.textContent = `إجمالي الديون: ${formatCurrency(totalDebtsValue)}`;
    if (currentLiquidityDisplay) currentLiquidityDisplay.textContent = formatCurrency(totalLiquidity);
    if (totalExpensesDisplay) totalExpensesDisplay.textContent = formatCurrency(expenses);
    if (totalLiabilitiesDisplay) totalLiabilitiesDisplay.textContent = `إجمالي الالتزامات: ${formatCurrency(totalLiabilitiesValue)}`;
    if (currentDataDateDisplay) { currentDataDateDisplay.textContent = currentLoadedDate ? formatDateForDisplay(currentLoadedDate) : "بيانات جديدة (لم تحفظ بعد)"; }
    if (inv_modal && inv_modal.style.display === 'block') { inv_updateDeductibleCostsCheckboxes(); }
    if (d('financial-center-section') && !d('financial-center-section').classList.contains('hidden')) { 
        const activeTab = d('fc-main-tabs').querySelector('.fc-tab-button.active'); 
        if (activeTab) { 
            const targetId = activeTab.dataset.target; 
            if (targetId === 'fc-tab-distribution') { 
                fc_populate_month_select(); 
            } else if (targetId === 'fc-tab-debt-treatment') { 
                fc_populate_debt_treatment(); 
            } 
        } 
    }
    // �� تحديث بطاقة المرتجعات المعلقة
    if (document.getElementById('summary-pending-returns')) {
        document.getElementById('summary-pending-returns').textContent = formatCurrency(calculatedPendingReturnsValue);
    }

    // �� تحديث بطاقة المشتريات المعلقة
    if (document.getElementById('summary-pending-purchases')) {
        document.getElementById('summary-pending-purchases').textContent = formatCurrency(calculatedPendingPurchasesValue);
    }
}
// =======================================================
// START: دوال الترحيل والمصروفات والبحث
// =======================================================

        // --- المقاصة، تقرير المبيعات، تأكيد/إلغاء المؤقت، البحث ---

// �� دالة الحذف النهائي للفواتير من التقرير والسحابة
// START: دالة تحليل المصروفات والبحث المباشر
// =======================================================
// --- >>> START: انسخ هذا الكود بالكامل والصقه مكان دالة handlePendingSaleActions القديمة <<< ---
            
            window.displaySearchResults = displaySearchResults;

            // Function to handle viewing invoice details (uses print logic)
         window.viewInvoiceDetails = viewInvoiceDetails;

            // **** دالة البحث عن السيريالات للمورد (مع فلترة داخلية) ****

            // **** دالة جديدة لعرض السيريالات المفلترة ****
            window.displayFilteredSupplierSerials = displayFilteredSupplierSerials;

            // **** دالة استيراد السيريالات من ملف CSV ****
            window.importSerialCSV = importSerialCSV;

            // (سيتم استكمال JavaScript في الجزء التالي 8ج مع initializeApp)
// =======================================================
// START: Invoice Return & Pending Receipt Logic
// =======================================================

/**
 * Searches for a sales invoice by its number and displays it for return processing.
 */

/**
 * Handles the confirmation of returning items from a searched invoice.
 */

// =====================================================================
// �� [تحديث د. ضياء النهائي الموحد]: دالة تأكيد استلام المرتجع المعلق بالـ ID الفريد
// =====================================================================

/**
 * Handles the logic for manually adjusting an account's balance.
 * @returns {boolean} True on success, false on failure.
 */
window.handleBalanceAdjustment = handleBalanceAdjustment;

window.performSmartGlobalSearch = async function performSmartGlobalSearch() {
    const searchInput = document.getElementById('smart-search-input');
    const messageEl = document.getElementById('search-message');
    const resultsContainer = document.getElementById('search-results-list');

    if (!searchInput || !messageEl || !resultsContainer) return;

    const term = searchInput.value.trim().toLowerCase();
    
    if (!term) {
        showMessage(messageEl, "يرجى كتابة كلمة للبحث عنها.", true);
        return;
    }

    resultsContainer.innerHTML = '<p class="text-center text-blue-600 py-4"><i class="fas fa-spinner fa-spin"></i> جاري البحث في الأرشيف...</p>';
    showMessage(messageEl, "");

    try {
        if (!window.currentUser) {
            showMessage(messageEl, "يجب تسجيل الدخول للبحث في الأرشيف.", true);
            return;
        }

        const userId = window.currentUser.uid;
        const invoicesRef = window.collection(window.db, "users", userId, "invoices");
        
        // جلب آخر 500 فاتورة (لتحسين الأداء)
        const q = window.query(invoicesRef, window.orderBy("timestamp", "desc"), window.limit(500));
        
        const querySnapshot = await window.getDocs(q);
        const allInvoices = [];
        querySnapshot.forEach((doc) => {
            allInvoices.push(doc.data());
        });

        const matchedInvoices = allInvoices.filter(inv => {
            const customerName = (inv.customerName || '').toLowerCase();
            const invoiceNum = (inv.invoiceNumber || '').toLowerCase();
            const notes = (inv.notes || '').toLowerCase();
            const productsMatch = (inv.items || []).some(item => { if(!item) return false; return ((item.name || '').toLowerCase().includes(term) || (item.serial || '').toLowerCase().includes(term)); });
            return customerName.includes(term) || invoiceNum.includes(term) || productsMatch || notes.includes(term);
        });

        // --- التعديل الهام هنا: تخزين النتائج في المتغير العام ---
        globalSearchResults = matchedInvoices;
        // -------------------------------------------------------

        if (matchedInvoices.length === 0) {
            resultsContainer.innerHTML = '<p class="text-center text-gray-500">لم يتم العثور على نتائج مطابقة.</p>';
            showMessage(messageEl, "لا توجد نتائج.", false, true);
        } else {
            displaySearchResults(matchedInvoices);
            showMessage(messageEl, `تم العثور على ${matchedInvoices.length} فاتورة مطابقة.`, false);
        }

    } catch (error) {
        console.error("Search Error:", error);
        showMessage(messageEl, "حدث خطأ أثناء البحث. راجع الـ Console.", true);
        resultsContainer.innerHTML = '<p class="text-center text-red-500">حدث خطأ.</p>';
    }
}

// START: دالة بدء التشغيل النهائية (متصلة بالإنترنت)
// =======================================================
async function initializeApp() {
    if (window._isAppFullyInitialized) {
        console.warn("⚠️ تم تجاهل استدعاء initializeApp المكرر لمنع تكرار مستمعات الأحداث (Event Listeners).");
        if (typeof updateUI === 'function') updateUI();
        return;
    }
    window._isAppFullyInitialized = true;
    window.__appInitDone = true;
    window.appInitialized = true;
    console.log("Initializing App with Online-First Logic...");
        // (هنا تضع كل تعريفات المتغيرات التي كانت داخل الدالة القديمة)
    // مثال: mainNav = d("main-nav"); contentSections = document.querySelectorAll(...);
    // ... ضع كل تعريفات d(...) هنا ...
     // --- Assign DOM Element References ---
                 // Monthly Liabilities Elements Assignment
monthlyLiabilityNameInput = d('monthly-liability-name');
monthlyLiabilityAmountInput = d('monthly-liability-amount');
addMonthlyLiabilityButton = d('add-monthly-liability-button');
cancelEditMonthlyLiabilityButton = d('cancel-edit-monthly-liability-button');
monthlyLiabilityMessage = d('monthly-liability-message');
monthlyLiabilitiesList = d('monthly-liabilities-list');
monthlyLiabilityFormTitle = d('monthly-liability-form-title');
// --- Purchase Invoice (PI) Elements Assignment ---
piSupplierSelect = d('pi_supplier');
piInvoiceNumberInput = d('pi_invoice_number');
piDateInput = d('pi_date');
piItemsBody = d('pi_items_body');
piNoItemsMsg = d('pi_no_items_msg');
piItemNameInput = d('pi_item_name');
piItemQuantityInput = d('pi_item_quantity');
piItemCostInput = d('pi_item_cost');
piItemSerialsContainer = d('pi_item_serials_container');
piItemSerialsTextarea = d('pi_item_serials');
piAddItemBtn = d('pi_add_item_btn');
piItemAddMessage = d('pi_item_add_message');
piGrandTotalSpan = d('pi_grand_total');
piPaidAmountInput = d('pi_paid_amount');
piPaidAmountDisplaySpan = d('pi_paid_amount_display');
piRemainingBalanceSpan = d('pi_remaining_balance');
piConfirmBtn = d('pi_confirm_btn');
piSaveDraftBtn = d('pi_save_draft_btn');
piClearFormBtn = d('pi_clear_form_btn');
piFormMessage = d('pi_form_message');
piRecentPurchasesList = d('recent-purchases-list');
// --- Returns Section Elements Assignment ---
searchInvoiceInput = d('search-invoice-input');
searchInvoiceBtn = d('search-invoice-btn');
invoiceSearchResults = d('invoice-search-results');
returnProductSelect = d('return-product-select');
returnQuantityInput = d('return-quantity');
returnCustomerNameInput = d('return-customer-name');
returnAtSalePriceCheckbox = d('return-at-sale-price'); // هذا هو السطر الجديد
returnSalePriceGroup = d('return-sale-price-group');
returnSalePriceInput = d('return-sale-price');
returnCostPriceGroup = d('return-cost-price-group');
returnCostPriceDisplay = d('return-cost-price-display');
returnReceiveNowCheckbox = d('return-receive-now');
confirmManualReturnBtn = d('confirm-manual-return-btn');
returnMessage = d('return-message');
pendingReceiptList = d('pending-receipt-list');
completedReturnsList = d('completed-returns-list');
                 mainNav = d("main-nav");
                 contentSections = document.querySelectorAll(".content-section");
                 navButtons = document.querySelectorAll(".nav-button");
                 globalMessage = d("global-message");
                 currentDataDateDisplay = d("current-data-date");
                 currentTimeDisplay = d("current-time");
                 summaryLiquidity = d("summary-current-liquidity");
                 summaryInventory = d("summary-total-inventory-value");
                 summaryConsignment = d("summary-consignment-value-display");
                 summaryDebts = d("summary-total-debts-display");
                 summaryLiabilities = d("summary-total-liabilities-display");
                 summaryExpenses = d("summary-total-expenses");
                 summaryProfit = d("summary-total-profit");
                 summaryCapital = d("summary-total-capital");
                 productList = d("product-list");
                 addProductButton = d("add-product-button");
                 productNameInput = d("product-name");
                 productQuantityInput = d("product-quantity");
                 productCostPriceInput = d("product-cost-price");
                 productSupplierSelect = d("product-supplier");
                 productDeductLiquidityCheckbox = d("product-deduct-liquidity");
                 serialNumberEntryContainer = d('serial-number-entry-container');
                 productSerialNumbersTextarea = d('product-serial-numbers');
                 serialImportMessage = d('serial-import-message');
                 importSerialCsvInput = d('import-serial-csv-input');
                 productMessage = d("product-message");
                 inventoryTotalInventoryValue = d("inventory-total-inventory-value");
                 inventoryConsignmentValue = d("inventory-consignment-value-display");
                 inventoryTotalProfit = d("inventory-total-profit");
                 cancelEditProductButton = d("cancel-edit-product-button");
                 productFormTitle = d("product-form-title");
                 productNamesDatalist = d("product-names-list");
                 productCategoryInput = d('product-category');
categoryDatalist = d('category-names-list');
inventorySearchInput = d('inventory-search');
inventoryCategoryFilter = d('inventory-category-filter');
                 sellProductNameInput = d("sell-product-name");
    debtorPhoneInput = d("debtor-phone");
debtorAddressInput = d("debtor-address");

debtsSearchInput = d("debts-search-input");
debtsNotesFilter = d("debts-notes-filter");
debtsSortSelect = d("debts-sort-select");

customerProfileModal = d("customerProfileModal");
collectionNotesModal = d("collectionNotesModal");
customerStatementModal = d("customerStatementModal");

customerProfileContent = d("customer-profile-content");
customerStatementContent = d("customer-statement-content");
if (customerProfileModal) {
    customerProfileModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer').forEach(btn => {
        btn.addEventListener('click', () => {
            customerProfileModal.style.display = 'none';
        });
    });
}

if (customerStatementModal) {
    customerStatementModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer').forEach(btn => {
        btn.addEventListener('click', () => {
            customerStatementModal.style.display = 'none';
        });
    });
}

const creditorStatementModal = d("creditorStatementModal");
if (creditorStatementModal) {
    creditorStatementModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer').forEach(btn => {
        btn.addEventListener('click', () => {
            creditorStatementModal.style.display = 'none';
        });
    });
}

window.addEventListener('click', (event) => {
    if (event.target === customerProfileModal) {
        customerProfileModal.style.display = 'none';
    }
    if (event.target === customerStatementModal) {
        customerStatementModal.style.display = 'none';
    }
    if (typeof creditorStatementModal !== 'undefined' && event.target === creditorStatementModal) {
        creditorStatementModal.style.display = 'none';
    }
});

collectionNotesHistory = d("collection-notes-history");
collectionNoteText = d("collection-note-text");
collectionNoteFollowupDate = d("collection-note-followup-date");
saveCollectionNoteBtn = d("save-collection-note-btn");
collectionNotesMessage = d("collection-notes-message");
if (saveCollectionNoteBtn) {
    saveCollectionNoteBtn.onclick = saveCollectionNote;
}
if (collectionNotesModal) {
    collectionNotesModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer').forEach(btn => {
        btn.addEventListener('click', () => {
            collectionNotesModal.style.display = 'none';
        });
    });
}

window.addEventListener('click', (event) => {
    if (event.target === collectionNotesModal) {
        collectionNotesModal.style.display = 'none';
    }
});
// تعريف العناصر الجديدة
 piItemQuantityInput = d('pi_item_quantity');
piItemCostInput = d('pi_item_cost');
piItemTotalCostInput = d('pi_item_total_cost');

// 1. عند تغيير الكمية -> تحديث الإجمالي (بناءً على سعر الوحدة)
if (piItemQuantityInput) {
    piItemQuantityInput.addEventListener('input', () => {
        const qty = parseFloat(piItemQuantityInput.value) || 0;
        const cost = parseFloat(piItemCostInput.value) || 0;
        if (piItemTotalCostInput) piItemTotalCostInput.value = (qty * cost).toFixed(2);
        
        // (كود إظهار السيريال القديم)
        if (qty > 0 && d('pi_item_serials_container')) {
            d('pi_item_serials_container').classList.remove('hidden');
        } else if (d('pi_item_serials_container')) {
            d('pi_item_serials_container').classList.add('hidden');
        }
    });
}

// 2. عند تغيير سعر الوحدة -> تحديث الإجمالي
if (piItemCostInput) {
    piItemCostInput.addEventListener('input', () => {
        const qty = parseFloat(piItemQuantityInput.value) || 0;
        const cost = parseFloat(piItemCostInput.value) || 0;
        if (piItemTotalCostInput) piItemTotalCostInput.value = (qty * cost).toFixed(2);
    });
}

// 3. عند تغيير السعر الإجمالي -> حساب سعر الوحدة تلقائياً
if (piItemTotalCostInput) {
    piItemTotalCostInput.addEventListener('input', () => {
        const qty = parseFloat(piItemQuantityInput.value) || 1; // تجنب القسمة على صفر
        const total = parseFloat(piItemTotalCostInput.value) || 0;
        if (qty > 0) {
            piItemCostInput.value = (total / qty).toFixed(2); // حساب سعر الوحدة
        }
    });
}
 // =======================================================
    // منطق استلام العربون (مع التصحيح الذاتي لإنشاء النافذة)
    // =======================================================

    // 1. فتح النافذة (وإنشاؤها إذا لم تكن موجودة)

    // 1. ربط عناصر السيريال بالمتغيرات
    sellSerialContainer = d('sell-serial-container');
    sellSerialInput = d('sell-serial-input');
    sellSerialsDatalist = d('sell-serials-datalist');

    // 2. تفعيل الاستماع للكتابة في حقل اسم المنتج
    if (sellProductNameInput) {
        // حذف أي مستمعات قديمة (احتياطياً)
        sellProductNameInput.removeEventListener('input', updateQuickSaleSerialUI);
        
        // إضافة المستمع الجديد لتشغيل دالة السيريال
        sellProductNameInput.addEventListener('input', updateQuickSaleSerialUI);
        sellProductNameInput.addEventListener('change', updateQuickSaleSerialUI);
        
        // الإبقاء على المستمع القديم الخاص بالملحقات (لا تحذفه)
        sellProductNameInput.addEventListener('input', updateAdditionalCostsCheckboxes);
    }
    
    // تأكد من طباعة رسالة في الكونسول لنعرف أن الربط تم
    console.log("تم تفعيل نظام السيريال في البيع السريع:", { 
        container: sellSerialContainer, 
        input: sellSerialInput 
    });

    // ============================================================
                 sellCustomerNameInput = d("sell-customer-name");
                 sellQuantityInput = d("sell-quantity");
                 sellPriceInput = d("sell-price");
                 sellButton = d("sell-button");
                 sellMessage = d("sell-message");
                 additionalCostsContainer = d("additional-costs-container");
                 sellPendingCheckbox = d("sell-pending");
                 pendingSalesListContainer = d("pending-sales-list");
                 pendingSalesSearchInput = d('pending-sales-search-input'); // <<< جديد
                 pendingSalesTotalCostSpan = d('pending-sales-total-cost'); // <<< جديد
                 pendingSalesTotalProfitSpan = d('pending-sales-total-profit'); // <<< جديد
                 currentLiquidityDisplay = d("current-liquidity");
                 addLiquidityAmountInput = d("add-liquidity-amount");
                 addLiquiditySourceInput = d("add-liquidity-source");
                 addLiquidityButton = d("add-liquidity-button");
                 removeLiquidityAmountInput = d("remove-liquidity-amount");
                 removeLiquidityReasonInput = d("remove-liquidity-reason");
                 removeLiquidityButton = d("remove-liquidity-button");
                 liquidityMessage = d("liquidity-message");
                 liquidityLogListContainer = d("liquidity-log-list");
                 adjustLiquidityAmountInput = d('adjust-liquidity-amount'); // <<< جديد
                 adjustLiquidityReasonInput = d('adjust-liquidity-reason'); // <<< جديد
                 adjustLiquidityButton = d('adjust-liquidity-button'); // <<< جديد
                 adjustLiquidityMessage = d('adjust-liquidity-message'); // <<< جديد
                 totalExpensesDisplay = d("total-expenses");
                 addExpenseInput = d("add-expense");
                 addExpenseButton = d("add-expense-button");
                
                 removeExpenseInput = d("remove-expense");
                 removeExpenseButton = d("remove-expense-button");
                 expensesMessage = d("expenses-message");
                 totalDebtsDisplay = d("total-debts-display");
                 debtorNameInput = d("debtor-name");
                 addDebtReasonInput = d("add-debt-reason");
                 addDebtAmountInput = d("add-debt-amount");
                 debtDeductLiquidityCheckbox = d("debt-deduct-liquidity");
                 addDebtButton = d("add-debt-button");
                 paymentDebtorSelect = d("payment-debtor-select");
                 paymentAmountInput = d("payment-amount");
                 receivePaymentButton = d("receive-payment-button");
                 debtsMessage = d("debts-message");
                 debtorsListContainer = d("debtors-list");
                 collectionNotesModal = d("collectionNotesModal");
collectionNotesHistory = d("collection-notes-history");
collectionNoteText = d("collection-note-text");
collectionNoteFollowupDate = d("collection-note-followup-date");
saveCollectionNoteBtn = d("save-collection-note-btn");
collectionNotesMessage = d("collection-notes-message");
                 totalLiabilitiesDisplay = d("total-liabilities-display");
                 creditorNameInput = d("creditor-name");
                 addLiabilityAmountInput = d("add-liability-amount");
                 liabilityReceivedCashCheckbox = d("liability-received-cash");
                 addLiabilityButton = d("add-liability-button");
                 paymentCreditorSelect = d("payment-creditor-name");
                 liabilityPaymentAmountInput = d("liability-payment-amount");
                 payLiabilityButton = d("pay-liability-button");
                 liabilitiesMessage = d("liabilities-message");
                 liabilitiesListContainer = d("liabilities-list");
                 offsetDebtorNameInput = d("offset-debtor-name");
                 offsetCreditorNameInput = d("offset-creditor-name");
                 offsetAmountInput = d("offset-amount-input");
                 performTwoPartyOffsetButton = d("perform-two-party-offset-button");
                 offsetMessage = d("offset-message");
                 reportMonthYearInput = d("report-month-year");
                 generateReportButton = d("generate-report-button");
                 reportMessage = d("report-message");
                 salesReportTableBody = d("sales-report-table-body");
                 reportTotalSales = d("report-total-sales");
                 reportTotalCost = d("report-total-cost");
                 reportTotalProfit = d("report-total-profit");
                 operationLogList = d("operation-log-list");
                 clearLogButton = d("clear-log-button");
                 saveButtonAlt = d("save-button-alt");
                 loadDateInputAlt = d("load-date-alt");
                 loadDataButtonAlt = d("load-data-button-alt");
                 loadMessageAlt = d("load-message-alt");
                 loadDateDayNameDisplayAlt = d("load-date-day-name-alt");
                 printButtonAlt = d("print-button-alt");
                 resetButtonAlt = d("reset-button-alt");
                 exportDataButton = d("export-data-button");
                 importFileInput = d("import-file-input");
                 importMessage = d("import-message");
                 supplierNameInput = d("supplier-name");
                 supplierContactInput = d("supplier-contact");
                 supplierAddressInput = d("supplier-address");
                 addSupplierButton = d("add-supplier-button");
                 cancelEditSupplierButton = d("cancel-edit-supplier-button");
                 supplierMessage = d("supplier-message");
                 supplierList = d("supplier-list");
                 supplierFormTitle = d("supplier-form-title");
                 supplierNamesDatalist = d('supplier-names-list');
                 searchSupplierSerialNameInput = d('search-supplier-serial-name');
                 searchSupplierSerialsBtn = d('search-supplier-serials-btn');
                 serialSearchMessage = d('serial-search-message');
                 supplierSerialsResultsContainer = d('supplier-serials-results');
                 filterSerialsContainer = d('filter-serials-container'); // **** إسناد حاوية فلتر السيريالات ****
                 filterSerialsInput = d('filter-serials-input'); // **** إسناد حقل فلتر السيريالات ****
                 inv_modal = d('invoiceModal');
                 inv_openInvoiceModalBtn = d('openInvoiceModalBtn');
                 inv_closeBtn = inv_modal ? inv_modal.querySelector('.modal-close-btn') : null; // Use generic class
                 inv_closeBtnFooter = inv_modal ? inv_modal.querySelector('.modal-close-btn-footer') : null; // Use generic class
                 inv_invoiceForm = d('invoiceForm');
                 inv_customerNameInput = d('inv_customerName');
                 inv_customerAddressInput = d('inv_customerAddress');
                 inv_phoneNumbersContainer = d('inv_phoneNumbersContainer');
                 inv_addPhoneBtn = d('inv_addPhoneBtn');
                 inv_shippingCostInput = d('inv_shippingCost');
                 inv_totalShippingCostSpan = d('inv_totalShippingCost');
                 inv_totalGoodsPriceSpan = d('inv_totalGoodsPrice');
                 inv_grandTotalPriceSpan = d('inv_grandTotalPrice');
                 inv_validationErrorDiv = d('inv_validationError');
                 inv_itemNameInput = d('inv_itemName');
                 inv_itemQtyInput = d('inv_itemQty');
                 inv_itemPriceInput = d('inv_itemPrice');
                 inv_addItemBtn = d('inv_addItemBtn');
                 inv_itemAddErrorDiv = d('inv_itemAddError');
                 inv_invoiceItemsBody = d('inv_invoiceItemsBody');
                 inv_printInvoiceBtn = d('inv_printInvoiceBtn');
                 inv_deductibleCostsContainer = d('inv_deductibleCostsContainer');
                 inv_warrantyInput = d('inv_warranty');
                 inv_notesTextarea = d('inv_notes');
                 inv_saveInvoiceBtn = d('inv_saveInvoiceBtn');
        // ... داخل دالة initializeApp ...

    // 1. تعريف المتغيرات (مع استخدام d مباشرة للتأكد)
    inv_serialSelectContainer = d('inv_serialSelectContainer');
    
    // استخدمنا const هنا داخل النطاق لضمان عدم التداخل
    const invItemSerialInputEl = d('inv_itemSerialInput'); 
    const invSerialsDatalistEl = d('inv_serials_datalist');

 // 2. المنطق الجديد (محصن بـ try-catch لمنع أي خطأ نهائياً)
    if (inv_itemNameInput && inv_itemQtyInput) {
        
        const checkInvoiceSerialRequirement = () => {
            try {
                const itemName = inv_itemNameInput.value.trim();
                const qty = parseInt(inv_itemQtyInput.value);
                
                // تحديث عرض التكلفة وتعبئة السعر التلقائي
                const costDisplay = document.getElementById('inv-cost-display');
                if (costDisplay && typeof products !== 'undefined') {
                    const product = products.find(p => p.name === itemName);
                    if (product) {
                        costDisplay.querySelector('span').textContent = typeof formatCurrency === 'function' ? formatCurrency(product.costPrice) : product.costPrice;
                        costDisplay.classList.remove('hidden');
                        
                        // ترك سعر الوحدة فارغاً للكتابة اليدوية حسب رغبة المستخدم
                        if (inv_itemPriceInput && !inv_itemPriceInput.value) {
                            inv_itemPriceInput.placeholder = 'أدخل السعر...';
                        }
                    } else {
                        costDisplay.classList.add('hidden');
                    }
                }
                
                // البحث عن العناصر مباشرة
                const container = document.getElementById('inv_serialSelectContainer');
                const inputField = document.getElementById('inv_itemSerialInput');
                const datalist = document.getElementById('inv_serials_datalist');

                // إذا لم نجد الحاوية، نخرج بصمت
                if (!container) return;

                if (qty === 1 && itemName) {
                    container.classList.remove('hidden');
                    // ملء المقترحات
                    if (datalist && typeof serialNumbersLog !== 'undefined') {
                        const availableSerials = serialNumbersLog.filter(log => log.productName === itemName && log.status === 'in_stock');
                        datalist.innerHTML = availableSerials.map(s => `<option value="${escapeHTML(s.serial)}">`).join('');
                    }
                } else {
                    container.classList.add('hidden');
                    // محاولة مسح الحقل فقط إذا كان موجوداً
                    if (inputField) {
                        inputField.value = ''; 
                    }
                }
            } catch (e) {
                // في حال حدوث أي خطأ، لا تفعل شيئاً (تجاهل الخطأ)
                console.log("تم تجاهل خطأ في واجهة السيريال");
            }
        };

        inv_itemNameInput.addEventListener('input', checkInvoiceSerialRequirement);
        inv_itemNameInput.addEventListener('change', checkInvoiceSerialRequirement);
        inv_itemQtyInput.addEventListener('input', checkInvoiceSerialRequirement);
    }
    
           // **** إسناد عناصر نافذة إدارة السيريالات ****
                 manageSerialsModal = d('manageSerialsModal');
                 modal_productNameDisplay = d('modal_productNameDisplay');
                 modal_serialCounts = d('modal_serialCounts');
                 modal_totalQuantity = d('modal_totalQuantity');
                 modal_registeredCount = d('modal_registeredCount');
                 modal_unregisteredCount = d('modal_unregisteredCount');
                 modal_productSerialNumbers = d('modal_productSerialNumbers');
                 modal_maxSerialsToAdd = d('modal_maxSerialsToAdd');
                 modal_serialImportMessage = d('modal-serial-import-message');
                 modal_importSerialCsvInput = d('modal-import-serial-csv-input');
                 modal_registeredSerialsList = d('modal-registered-serials-list');
                 modal_saveAddedSerialsBtn = d('modal_saveAddedSerialsBtn');
                 modal_closeBtns = manageSerialsModal ? manageSerialsModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer') : [];

                 debtorNamesDatalistOffset = d('debtor-names-list-offset');
                 creditorNamesDatalistOffset = d('creditor-names-list-offset');
                  // --- تعريف عناصر البحث الذكي الجديد ---
// نحتفظ بحاويات الرسائل والنتائج لأننا ما زلنا نستخدمها
searchMessageContainer = d('search-message');
searchResultsListContainer = d('search-results-list');
// تعريف عناصر الإدخال والزر الجديد
smartSearchBtn = d('smart-search-btn');
smartSearchInput = d('smart-search-input');

                 openBackupHistoryButton = d('open-backup-history-button');

autoBackupMessage = d('auto-backup-message');

backupHistoryModal = d('backupHistoryModal');

backupHistoryList = d('backup-history-list');
                  // --- Financial Center (FC) Elements ---

fc_main_tabs = d('fc-main-tabs');

fc_tab_buttons = document.querySelectorAll('.fc-tab-button');

fc_tab_contents = document.querySelectorAll('.fc-tab-content');

fc_month_select = d('fc-distribution-month');

fc_expenses_list = d('fc-expenses-to-distribute-list');

fc_products_list = d('fc-products-to-load-list');

fc_total_expenses_display = d('fc-total-selected-expenses');

fc_preview_container = d('fc-cost-preview-container');

fc_preview_results = d('fc-cost-preview-results');

fc_manual_container = d('fc-manual-distribution-container');

fc_manual_list = d('fc-manual-percentage-list');

fc_percentage_feedback = d('fc-percentage-total-feedback');

fc_percentage_total = d('fc-percentage-total');

fc_expenses_wrapper = d('fc-expenses-selection-wrapper');

fc_manual_cost_wrapper = d('fc-manual-cost-input-wrapper');

fc_manual_cost_input = d('fc-manual-cost-input');

fc_debt_select = d('fc-debt-to-process');

fc_execute_dist_btn = d('fc-execute-distribution-btn');

fc_execute_debt_btn = d('fc-execute-debt-treatment-btn');

    // ربط مستمعات الأحداث (event listeners)

    // ... ضع كل addEventListener هنا ...

    // مثال: if (saveButtonAlt) { saveButtonAlt.addEventListener(...); }

     // --- Attach Event Listeners ---

                 // Monthly Liabilities Listeners

if (addMonthlyLiabilityButton) { addMonthlyLiabilityButton.addEventListener('click', addOrUpdateMonthlyLiability); }

if (cancelEditMonthlyLiabilityButton) { cancelEditMonthlyLiabilityButton.addEventListener('click', resetMonthlyLiabilityForm); }

if (monthlyLiabilitiesList) {

    monthlyLiabilitiesList.addEventListener('click', (e) => {

        const target = e.target.closest('button');

        if (!target) return;

        const liabilityId = target.dataset.id;

        if (!liabilityId) return;

        if (target.classList.contains('edit-monthly-liability-btn')) {

            const liability = monthlyLiabilities.find(l => l.id === liabilityId);

            if (liability) {

                editingMonthlyLiabilityId = liability.id;

                monthlyLiabilityNameInput.value = liability.name;

                monthlyLiabilityAmountInput.value = liability.amount;

                monthlyLiabilityFormTitle.textContent = `تعديل: ${liability.name}`;

                addMonthlyLiabilityButton.textContent = "تحديث";

                cancelEditMonthlyLiabilityButton.classList.remove('hidden');

                d('add-update-monthly-liability-form').scrollIntoView({ behavior: 'smooth' });

            }

        } else if (target.classList.contains('delete-monthly-liability-btn')) {

            const liabilityIndex = monthlyLiabilities.findIndex(l => l.id === liabilityId);

            if (liabilityIndex > -1) {

                 const liabilityName = monthlyLiabilities[liabilityIndex].name;

                 if (confirm(`هل أنت متأكد من حذف الالتزام الشهري "${liabilityName}"؟`)) {

                     monthlyLiabilities.splice(liabilityIndex, 1);

                     logOperation("حذف التزام شهري", `تم حذف الالتزام الشهري الدائم "${liabilityName}".`);

                     showMessage(monthlyLiabilityMessage, `تم حذف "${liabilityName}".`);

                     updateUI();

                 }

            }

        }

    });

}

                 if (mainNav) { mainNav.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON' && e.target.classList.contains('nav-button')) { const targetId = e.target.dataset.target; contentSections.forEach(section => { section.classList.add('hidden'); }); const targetSection = d(targetId); if (targetSection) { targetSection.classList.remove('hidden'); } navButtons.forEach(button => { button.classList.remove('active'); }); e.target.classList.add('active'); } }); }

                 // --- Financial Center Tabs Listener ---

if (fc_main_tabs) {

    fc_main_tabs.addEventListener('click', (e) => {

        const button = e.target.closest('.fc-tab-button');

        if (!button) return; // إذا لم يتم الضغط على زر، لا تفعل شيئاً

        // 1. أزل علامة "نشط" من كل الأزرار

        fc_tab_buttons.forEach(btn => btn.classList.remove('active'));

        // 2. أضف علامة "نشط" للزر الذي تم الضغط عليه

        button.classList.add('active');

        // 3. أخفِ جميع أقسام المحتوى

        fc_tab_contents.forEach(content => content.classList.add('hidden'));

        // 4. أظهر القسم المرتبط بالزر الذي تم الضغط عليه

        const targetId = button.dataset.target;

        const targetContent = d(targetId);

        if (targetContent) {

            targetContent.classList.remove('hidden');

        }

        // 5. قم بتعبئة بيانات القسم الذي تم إظهاره (مهم جداً)

        if (targetId === 'fc-tab-distribution') {

            fc_populate_month_select(); // تعبئة قائمة الشهور

        } else if (targetId === 'fc-tab-debt-treatment') {

            fc_populate_debt_treatment(); // تعبئة قائمة الديون

        }

    });

}

                 // ... داخل دالة initializeApp() مع باقي الـ event listeners

if (d('undo-button')) { d('undo-button').addEventListener('click', undo); }

if (d('redo-button')) { d('redo-button').addEventListener('click', redo); }

window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) { if (typeof redo === 'function') redo(); }
        else { if (typeof undo === 'function') undo(); }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        if (typeof redo === 'function') redo();
    }
});

               if (saveButtonAlt) {

    saveButtonAlt.addEventListener("click", async () => {

        // تحديد التاريخ المستهدف

        const todayString = getTodayDateString();

        const targetDate = currentLoadedDate || todayString;

        // رسالة التأكيد

        let confirmMsg = `هل تريد حفظ التغييرات لتاريخ ${formatDateForDisplay(targetDate)}؟`;

        // التحقق من وجود بيانات سابقة محلياً (اختياري للتحذير)

        if (typeof lsPrefix !== 'undefined') {

            const storageKey = lsPrefix + targetDate;

            if (localStorage.getItem(storageKey)) {

                if (currentLoadedDate === targetDate) {

                    confirmMsg += `\n(سيتم تحديث البيانات الحالية)`;

                } else {

                    confirmMsg = `أنت تعرض بيانات يوم ${formatDateForDisplay(currentLoadedDate)}. هل تريد الحفظ فوق بيانات يوم ${formatDateForDisplay(targetDate)}؟`;

                }

            }
        }

        if (confirm(confirmMsg)) {
            const originalHTML = saveButtonAlt.innerHTML;
            try {
                saveButtonAlt.innerHTML = "جاري الحفظ...";
                saveButtonAlt.disabled = true;
                await saveCurrentStateByDate(targetDate, true);
            } finally {
                saveButtonAlt.innerHTML = originalHTML;
                saveButtonAlt.disabled = false;
            }
        }
    });
}
  if (loadDataButtonAlt) { loadDataButtonAlt.addEventListener("click", async () => { const dateToLoad = loadDateInputAlt ? loadDateInputAlt.value : null; const loadResult = loadDataForDate(dateToLoad); if(loadResult) updateUI(); }); } // Update UI only if loadDataForDate indicates a change happened

                 if (loadDateInputAlt) { loadDateInputAlt.addEventListener('change', (e) => { const dateValue = e.target.value; updateLoadDateDayName(dateValue, loadDateDayNameDisplayAlt); }); }

                 if (clearLogButton) { clearLogButton.addEventListener("click", () => { if (confirm("هل أنت متأكد من رغبتك في مسح سجل عمليات اليوم الحالي المعروض؟ لن يتم حفظ هذا التغيير إلا بالضغط على زر الحفظ.")) { operationLog = []; updateLogDisplay(); showGlobalMessage("تم مسح سجل اليوم الحالي من العرض. اضغط 'حفظ' لتثبيت التغيير.", false, true); } }); }

                // ������ الكود المعدل للزر الأحمر ������

if (resetButtonAlt) { 

    resetButtonAlt.addEventListener("click", () => { 

        // رسالة تأكيد جديدة وأكثر وضوحًا
        const userInput = prompt('تحذير: سيتم مسح جميع بيانات التطبيق بالكامل (المبيعات، الديون، المصروفات، المرتجعات، المعلقات).\nهل أنت متأكد؟\nاكتب كلمة "مسح" لتأكيد الحذف:');
        if (userInput !== 'مسح') {
            showGlobalMessage("تم إلغاء عملية المسح. الكلمة غير متطابقة.", true);
            return;
        }
        if (typeof autoSaveTimer !== 'undefined') {
            clearInterval(autoSaveTimer);
        }
        resetAllData(); 
    }); 
}
                 if (printButtonAlt) { printButtonAlt.addEventListener("click", () => { document.body.classList.add('print-report'); // Add class for print styling
                      const reportHTML = generateReportHTML(); const printWindow = window.open('', '_blank', 'height=600,width=800'); if (printWindow) { printWindow.document.open(); printWindow.document.write(reportHTML); printWindow.document.close(); setTimeout(() => { try { printWindow.focus(); printWindow.print(); // printWindow.close(); // Optional: close after printing
                      } catch (e) { console.error("Print error:", e); showGlobalMessage("حدث خطأ أثناء محاولة الطباعة.", true); } finally { document.body.classList.remove('print-report'); // Remove class after printing attempt
                      } }, 500); } else { showGlobalMessage('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', true); document.body.classList.remove('print-report'); } }); }
                 if (exportDataButton) { exportDataButton.addEventListener("click", exportData); }
                 if (importFileInput) { importFileInput.addEventListener("change", importData); }
                 // **** جديد: مستمع حدث لزر استيراد CSV للسيريالات (في قسم إضافة البضاعة) ****
                 if (importSerialCsvInput) {
                     importSerialCsvInput.addEventListener("change", (event) => importSerialCSV(event, productSerialNumbersTextarea, serialImportMessage));
                 }
                  // **** جديد: مستمع حدث لزر استيراد CSV للسيريالات (في نافذة الإدارة) ****
                 if (modal_importSerialCsvInput) {
                     modal_importSerialCsvInput.addEventListener("change", (event) => importSerialCSV(event, modal_productSerialNumbers, d('modal-serial-import-message')));
                 }

               // استبدل هذا الكود بالكامل داخل دالة initializeApp
const btnResetExpenses = document.getElementById("reset-expenses-button");

if (btnResetExpenses) {
    btnResetExpenses.addEventListener("click", () => {
        
        if (confirm(`تحذير: سيتم تصفير عداد المصروفات ومسح جميع سجلات المصروفات لهذا اليوم من الذاكرة المؤقتة.\n\nهل أنت متأكد؟`)) {
            
            // 1. حفظ نسخة للتراجع
            saveStateToHistory(); 
            
            const oldExpenses = expenses;
            
            // 2. تصفير المتغير الأساسي (الذاكرة)
            expenses = 0;
            
            // 3. تنظيف سجل العمليات (ذاكرة السجل النصي)
            // نستخدم دالة includes لحذف أي نوع يحتوي على كلمة "مصروف" أو "سحب" لضمان الشمولية
            if (typeof operationLog !== 'undefined') {
                operationLog = operationLog.filter(log => {
                    const type = (log.type || "").toString();
                    return !type.includes("مصروف") && !type.includes("سحب");
                });
            }
            
            // 4. تنظيف سجل السيولة (ذاكرة السجل المالي)
            if (typeof liquidityLog !== 'undefined') {
                 liquidityLog = liquidityLog.filter(log => {
                     const desc = (log.description || "").toString();
                     return !desc.includes("صرف مصروف") && !desc.includes("تسجيل مصروف") && !desc.includes("سحب");
                 });
            }

            // 5. تسجيل عملية التصفير (للتوثيق فقط)
            logOperation("تصفير شامل", `تم تصفير العداد يدوياً (كان ${formatCurrency(oldExpenses)}).`);
            
            // 6. === الخطوة الحاسمة: إجبار الواجهة على التحديث فوراً ===
            // نحدث النص مباشرة دون انتظار updateUI
            if (typeof totalExpensesDisplay !== 'undefined' && totalExpensesDisplay) {
                totalExpensesDisplay.textContent = formatCurrency(0);
            }
            
            // إذا كان جدول تقرير المصروفات مفتوحاً، نقوم بمسحه فوراً ليعكس التصفير
            const reportTableBody = document.getElementById('expenses-report-table-body');
            const reportSummary = document.getElementById('exp-report-summary-total');
            if (reportTableBody) {
                reportTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-4">تم تصفير العداد. اضغط "عرض التقرير" مجدداً بعد الحفظ.</td></tr>';
            }
            if (reportSummary) {
                reportSummary.textContent = formatCurrency(0);
            }

            // 7. تحديث باقي الواجهة
            updateUI(); 
            
            // رسالة تأكيد
            const reportMsg = document.getElementById('exp-report-message');
            if (reportMsg) {
                showMessage(reportMsg, "تم التصفير فوراً. اضغط 'حفظ التغييرات' لتثبيت الحذف في قاعدة البيانات.", false);
            } else {
                alert("تم التصفير فوراً.\nتنبيه: اضغط 'حفظ التغييرات' لتثبيت هذا التغيير في قاعدة البيانات.");
            }
        }
    });
}
// أضف هذا الكود أيضًا لإظهار وإخفاء قائمة الحسابات
if (productDeductLiquidityCheckbox) {
    productDeductLiquidityCheckbox.addEventListener('change', (e) => {
        const container = d('product-purchase-account-container');
        if (e.target.checked) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    });
}
                 // **** مستمع حدث حقل الكمية لإظهار/إخفاء حقل السيريال ****
                 if (productQuantityInput && serialNumberEntryContainer) {
                     productQuantityInput.addEventListener('input', () => {
                         const quantity = parseInputNumber(productQuantityInput);
                         // أظهر حقل السيريال فقط عند إضافة كمية جديدة (ليس في وضع التعديل وليس كمية صفر)
                         if (!editingProductName && !isNaN(quantity) && quantity > 0) {
                             serialNumberEntryContainer.classList.remove('hidden');
                         } else {
                             serialNumberEntryContainer.classList.add('hidden');
                             if(productSerialNumbersTextarea) productSerialNumbersTextarea.value = ''; // أفرغ الحقل عند إخفائه
                             if(serialImportMessage) showMessage(serialImportMessage, ''); // امسح رسالة الاستيراد
                         }
                     });
                     // قم بإخفائه أيضاً عند إلغاء التعديل
                     if(cancelEditProductButton) {
                         cancelEditProductButton.addEventListener('click', () => {
                              serialNumberEntryContainer.classList.add('hidden');
                              if(productSerialNumbersTextarea) productSerialNumbersTextarea.value = '';
                              if(serialImportMessage) showMessage(serialImportMessage, '');
                         });
                     }
                 }

                 if (cancelEditProductButton) { cancelEditProductButton.addEventListener('click', resetProductForm); }
                 // =====================================================================
// �� [تنفيذ فكرة د. ضياء الشاملة] - تشغيل وإدارة عمليات مودال تسوية تقليل الكمية
// =====================================================================

const confirmDecreaseBtn = document.getElementById("confirmDecreaseBtn");
const cancelDecreaseModalBtn = document.getElementById("cancelDecreaseModalBtn");
const closeDecreaseModalBtn = document.getElementById("closeDecreaseModalBtn");
const productDecreaseModal = document.getElementById("productDecreaseModal");

const closeDecreaseModal = () => {
    if (productDecreaseModal) productDecreaseModal.style.display = "none";
    window.pendingProductEdit = null;
};

if (closeDecreaseModalBtn) closeDecreaseModalBtn.addEventListener("click", closeDecreaseModal);
if (cancelDecreaseModalBtn) cancelDecreaseModalBtn.addEventListener("click", closeDecreaseModal);

// ربط إظهار وإخفاء الخزن بناءً على خيار الراديو المختار
document.querySelectorAll('input[name="decreaseAction"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const container = document.getElementById("decreaseAccountContainer");
        if (container) {
            if (e.target.value === 'deposit') {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    });
});

// زر تأكيد التسوية المحاسبية النهائية داخل المودال
if (confirmDecreaseBtn) {
    confirmDecreaseBtn.addEventListener("click", () => {
        if (!window.pendingProductEdit) return;
        
        const { productIndex, name, category, quantity, costPrice, supplierId, reducedQty, totalRefundValue } = window.pendingProductEdit;
        const actionType = document.querySelector('input[name="decreaseAction"]:checked').value;
        
        if (actionType === 'deposit') {
            // الخيار الأول: زيادة السيولة النقدية وإيداع المبلغ في الخزنة المحددة
            const selectedAccountId = document.getElementById("decreaseAccountSelect").value;
            const account = accounts.find(acc => acc.id === selectedAccountId);
            if (!account) {
                alert("يرجى اختيار حساب مالي صحيح لإيداع الفارق.");
                return;
            }
            account.balance = window.money(account.balance + totalRefundValue);
            logOperation("تسوية مخزن (إيداع)", `إضافة ${formatCurrency(totalRefundValue)} لحساب "${account.name}" مقابل مرتجع/تقليص كمية منتج "${name}" بمقدار ${reducedQty} قطعة.`);
              liquidityLog.push({
                  id: 'liq-adj-dep-' + Date.now(),
                  timestamp: new Date().toISOString(),
                  type: "add",
                  amount: totalRefundValue,
                  description: `تسوية مخزن (إيداع): تقليص ${reducedQty}x ${name}`,
                  currentBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
                  accountId: account.id
              });
        } else {
            // الخيار الثاني: الخصم المباشر من رأس المال (تسجيل خسارة / هالك بضاعة) دون كاش
            logOperation("تسوية مخزن (هالك/خسارة)", `تقليص كمية منتج "${name}" بمقدار ${reducedQty} قطعة واعتبارها هالك/خسارة قيمتها ${formatCurrency(totalRefundValue)} دون إدخال سيولة.`);
        }

        // تحديث بيانات البضاعة في مصفوفة البرنامج بعد التسوية الحسابية بنجاح
        products[productIndex].name = name;
        products[productIndex].category = category;
        products[productIndex].quantity = quantity;
        products[productIndex].costPrice = costPrice; // اعتماد السعر الجديد لتحديثاتك اللاحقة
        products[productIndex].supplierId = supplierId;

        showMessage(productMessage, `تم تسوية الفارق الحسابي وتحديث المنتج "${name}" بنجاح.`);
        closeDecreaseModal();
        if (typeof resetProductForm === 'function') resetProductForm();
        if (typeof updateUI === 'function') updateUI();
    });
}
// =====================================================================
// �� إدارة خيارات مودال اعتراض تكرار الأسماء (المخزون + المشتريات) - تطوير د. ضياء
// =====================================================================
const confirmDuplicateBtn = document.getElementById("confirmDuplicateBtn");
const cancelDuplicateModalBtn = document.getElementById("cancelDuplicateModalBtn");
const closeDuplicateModalBtn = document.getElementById("closeDuplicateModalBtn");
const productDuplicateNameModal = document.getElementById("productDuplicateNameModal");

const closeDuplicateModal = () => {
    if (productDuplicateNameModal) productDuplicateNameModal.style.display = "none";
    window.pendingDuplicateProduct = null;
};

if (closeDuplicateModalBtn) closeDuplicateModalBtn.addEventListener("click", closeDuplicateModal);
if (cancelDuplicateModalBtn) cancelDuplicateModalBtn.addEventListener("click", closeDuplicateModal);

// التحكم في إظهار حقل كتابة الاسم الجديد عند اختيار "إعادة التسمية"
document.querySelectorAll('input[name="duplicateAction"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const container = document.getElementById("renameInputContainer");
        if (container) {
            if (e.target.value === 'rename') {
                container.classList.remove('hidden');
                document.getElementById("newProductNameInput").focus();
            } else {
                container.classList.add('hidden');
            }
        }
    });
});

if (confirmDuplicateBtn) {
    confirmDuplicateBtn.addEventListener("click", () => {
        const selectedAction = document.querySelector('input[name="duplicateAction"]:checked').value;

        // [الحالة الأولى]: المخزون والإضافة يدوياً
        if (window.pendingDuplicateProduct) {
            const data = window.pendingDuplicateProduct;

            if (selectedAction === 'merge') {
                window.bypassDuplicateCheck = true;
                closeDuplicateModal();
                if (addProductButton) addProductButton.click();
                
            } else if (selectedAction === 'rename') {
                const newName = document.getElementById("newProductNameInput").value.trim();
                if (!newName) { alert("يرجى كتابة اسم جديد للمنتج."); return; }
                if (products.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
                    alert("الاسم الجديد مكرر أيضاً! اختر اسماً آخر."); return;
                }
                productNameInput.value = newName;
                window.bypassDuplicateCheck = true;
                closeDuplicateModal();
                if (addProductButton) addProductButton.click();

            } else if (selectedAction === 'separate') {
                window.bypassDuplicateCheck = true;
                closeDuplicateModal();

                const account = accounts.find(acc => acc.id === data.selectedAccountId);
                if (data.deductLiquidity && data.quantity > 0 && account) {
                    const costToDeduct = data.quantity * data.costPrice;
                    if (costToDeduct <= account.balance) {
                        account.balance = window.money(account.balance - costToDeduct);
                        logOperation("شراء بضاعة (منفصلة الاسم)", `خصم ${formatCurrency(costToDeduct)} من حساب "${account.name}" لشراء منتج مستقل يحمل اسم مكرر "${data.name}".`);
                    liquidityLog.push({
                        id: 'liq-buy-sep-' + Date.now(),
                        timestamp: new Date().toISOString(),
                        type: "remove",
                        amount: costToDeduct,
                        description: `شراء بضاعة (منفصلة): ${data.quantity}x ${data.name}`,
                        currentBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
                        accountId: account.id
                    });
                    }
                }

                const uniqueProductCode = generateId('code');
                products.push({
                    id: uniqueProductCode,
                    name: data.name,
                    quantity: data.quantity,
                    costPrice: data.costPrice,
                    supplierId: data.supplierId || "",
                    category: data.category
                });
                showMessage(productMessage, `تم تسجيل "${data.name}" كمنتج مستقل بكود جديد بنجاح.`);
                resetProductForm();
                updateUI();
            }
        }
        
        // [الحالة الثانية]: بند داخل فاتورة المشتريات
        else if (window.pendingPurchaseInvoiceItem) {
            const { item, resumeCallback } = window.pendingPurchaseInvoiceItem;

            // تحديد صف الجدول الحقيقي بالـ DOM المطابق لهذا الصنف المكرر بالفاتورة
            const rows = Array.from(document.querySelectorAll('#pi_items_body tr'));
            const matchingRow = rows.find(r => r.dataset.name === item.name);

            if (selectedAction === 'merge') {
                // حفر القرار مباشرة في صف الجدول ليصمد أثناء تكرار الفحص والدالة
                if (matchingRow) matchingRow.dataset.duplicateResolution = 'merge';
                closeDuplicateModal();
                if (typeof resumeCallback === 'function') resumeCallback();

            } else if (selectedAction === 'rename') {
                const newName = document.getElementById("newProductNameInput").value.trim();
                if (!newName) { alert("يرجى كتابة اسم جديد للبند."); return; }
                if (products.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
                    alert("الاسم المقترح مكرر في المخزن أيضاً! اختر اسماً آخر."); return;
                }
                
                if (matchingRow) {
                    matchingRow.dataset.name = newName; // تحديث داتا الاسم بالجدول
                    matchingRow.dataset.duplicateResolution = 'rename'; // حفر قرار التسمية
                    // تحديث النص المرئي للاسم في أول خلية بالصف فوراً للعميل
                    const firstCell = matchingRow.querySelector('td');
                    if (firstCell) firstCell.textContent = newName;
                }
                closeDuplicateModal();
                if (typeof resumeCallback === 'function') resumeCallback();

            } else if (selectedAction === 'separate') {
                if (matchingRow) matchingRow.dataset.duplicateResolution = 'separate';
                closeDuplicateModal();
                if (typeof resumeCallback === 'function') resumeCallback();
            }
        }
    });
}
// =======================================================
// START: Debt Actions Event Listener (FIXED)
// =======================================================
if (debtorsListContainer) {
    debtorsListContainer.addEventListener('click', (e) => {
        const payButton = e.target.closest('.pay-partial-debt-btn');
        if (payButton) {
            const debtId = payButton.dataset.debtId;
            if (debtId) {
                openPartialDebtPaymentModal(debtId);
            }
        }
    });
}

// =======================================================
// END: Debt Actions Event Listener
// =======================================================

                 // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// 1. الدالة الرئيسية الجديدة للإضافة أو التحديث
if (sellButton) {
    // إزالة أي مستمعات أحداث قديمة لتجنب التكرار (اختياري لكن مفضل)
    const newSellButton = sellButton.cloneNode(true);
    sellButton.parentNode.replaceChild(newSellButton, sellButton);
    // تحديث المرجع للمتغير
    sellButton = newSellButton;

    sellButton.addEventListener("click", () => {
        saveStateToHistory(); // 1. حفظ نسخة احتياطية

        if (editingPendingSaleId) {
            // 2. إذا كان هناك ID، فهذا "تعديل" -> استدعِ دالة التحديث الجديدة
            console.log("Saving changes to pending sale...");
            updatePendingSale(editingPendingSaleId);
        } else {
            // 3. إذا لم يكن هناك ID، فهذا "بيع جديد" -> استدعِ دالة البيع العادية
            console.log("Processing new sale...");
            sellProduct();
        }
    });
}

// تفعيل زر إلغاء التعديل
if (d('cancel-edit-pending-button')) {
    d('cancel-edit-pending-button').addEventListener('click', resetSellForm);
}

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// ★★★ نهاية الكود الجديد الذي ستلصقه ★★★
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                 // دالة حساب الربح المتوقع للبيع السريع وعرضه مباشرة
                 
                 window.calculateQuickSellProfit = calculateQuickSellProfit;

                 if(sellProductNameInput) { // Update checkboxes when main product changes
                     sellProductNameInput.addEventListener('input', updateAdditionalCostsCheckboxes); 
                     sellProductNameInput.addEventListener('change', updateAdditionalCostsCheckboxes); 
                     sellProductNameInput.addEventListener('input', calculateQuickSellProfit);
                     sellProductNameInput.addEventListener('change', calculateQuickSellProfit);
                 }
                 if(sellQuantityInput) {
                     sellQuantityInput.addEventListener('input', calculateQuickSellProfit);
                 }
                 if(sellPriceInput) {
                     sellPriceInput.addEventListener('input', calculateQuickSellProfit);
                 }
                 if(additionalCostsContainer) {
                     additionalCostsContainer.addEventListener('change', calculateQuickSellProfit);
                     additionalCostsContainer.addEventListener('input', calculateQuickSellProfit);
                 }
                 // <<< جديد: مستمع حدث لبحث المبيعات المؤقتة >>>
                 if(pendingSalesSearchInput) {
                    pendingSalesSearchInput.addEventListener('input', updatePendingSalesDisplay);
                 }
                 if(pendingSalesListContainer) { // Use event delegation for pending sale buttons
                     pendingSalesListContainer.addEventListener('click', handlePendingSaleActions); }
                 if (addLiquidityButton) { addLiquidityButton.addEventListener("click", () => {saveStateToHistory();
                     const amount = parseInputNumber(addLiquidityAmountInput); const source = addLiquiditySourceInput.value.trim(); if (isNaN(amount) || amount <= 0) { showMessage(liquidityMessage, "يرجى إدخال مبلغ صحيح (> 0) للإضافة.", true); return; } if (!source) { showMessage(liquidityMessage, "يرجى إدخال مصدر السيولة.", true); return; } 
                     const targetAcc = accounts[0];
                     targetAcc.balance = window.money(targetAcc.balance + amount); const totalLiq = accounts.reduce((sum, a) => sum + a.balance, 0); const logEntry = { id: generateId("liq"), timestamp: new Date().toISOString(), type: "add", amount: amount, description: source, currentBalance: totalLiq }; liquidityLog.push(logEntry); logOperation("إضافة سيولة", `إضافة ${formatCurrency(amount)} من "${source}". الرصيد الحالي: ${formatCurrency(totalLiq)}`); updateUI(); addLiquidityAmountInput.value = "0"; addLiquiditySourceInput.value = ""; addLiquiditySourceInput.focus(); // Focus source for next entry
                     showMessage(liquidityMessage, `تمت إضافة ${formatCurrency(amount)} من "${source}".`); }); }
                 if (removeLiquidityButton) { removeLiquidityButton.addEventListener("click", () => {
                    saveStateToHistory();
                     const amount = parseInputNumber(removeLiquidityAmountInput); const reason = removeLiquidityReasonInput.value.trim(); if (isNaN(amount) || amount <= 0) { showMessage(liquidityMessage, "يرجى إدخال مبلغ صحيح (> 0) للسحب.", true); return; } if (!reason) { showMessage(liquidityMessage, "يرجى إدخال سبب السحب.", true); return; } 
                     const targetAcc = accounts[0];
                     if (amount > targetAcc.balance) { showMessage(liquidityMessage, `المبلغ المطلوب (${formatCurrency(amount)}) أكبر من السيولة المتاحة في الخزنة الرئيسية (${formatCurrency(targetAcc.balance)}).`, true); return; } 
                     targetAcc.balance = window.money(targetAcc.balance - amount); const totalLiq = accounts.reduce((sum, a) => sum + a.balance, 0); const logEntry = { id: generateId("liq"), timestamp: new Date().toISOString(), type: "remove", amount: amount, description: reason, currentBalance: totalLiq }; liquidityLog.push(logEntry); logOperation("سحب سيولة", `سحب ${formatCurrency(amount)} بسبب "${reason}". الرصيد الحالي: ${formatCurrency(totalLiq)}`); updateUI(); removeLiquidityAmountInput.value = "0"; removeLiquidityReasonInput.value = ""; removeLiquidityReasonInput.focus(); showMessage(liquidityMessage, `تم سحب ${formatCurrency(amount)} بسبب "${reason}".`); }); }
                 // <<< جديد: مستمع حدث لزر تعديل السيولة >>>
                if (adjustLiquidityButton) {
    adjustLiquidityButton.addEventListener('click', () => {
        saveStateToHistory(); // <-- أضف هذا السطر
        adjustLiquidityManually();
    });
}
               // استبدل هذا الكود بالكامل داخل دالة initializeApp
if (addExpenseButton) {
    addExpenseButton.addEventListener("click", () => {
        const amount = parseInputNumber(addExpenseInput);
        const selectedAccountId = d('expense-payment-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);

        if (isNaN(amount) || amount <= 0) {
            showMessage(expensesMessage, "يرجى إدخال مبلغ مصروف صحيح (> 0).", true);
            return;
        }

        if (!account) {
            showMessage(expensesMessage, "يرجى اختيار حساب لخصم المصروف منه.", true);
            return;
        }

        if (amount > account.balance) {
            showMessage(expensesMessage, `مبلغ المصروف (${formatCurrency(amount)}) أكبر من رصيد حساب "${account.name}" (${formatCurrency(account.balance)}).`, true);
            return;
        }
        
        saveStateToHistory();

        // تنفيذ العمليات
        expenses = window.money(expenses + amount);
        account.balance = window.money(account.balance - amount);
        
        const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        liquidityLog.push({ 
            id: generateId("liq"), 
            timestamp: new Date().toISOString(), 
            type: "remove", 
            amount: amount, 
            description: `تسجيل مصروف من حساب "${account.name}"`, 
            currentBalance: newTotalLiquidity,
            accountId: selectedAccountId,
            isExpense: true
        });
        
        logOperation("تسجيل مصروف", `تسجيل مصروف بقيمة ${formatCurrency(amount)}. تم خصمه من حساب "${account.name}".`);
        
        updateUI();
        addExpenseInput.value = "0";
        showMessage(expensesMessage, `تم تسجيل مصروف ${formatCurrency(amount)} بنجاح.`);
    });
}
               // استبدل هذا الكود بالكامل داخل دالة initializeApp
if (removeExpenseButton) {
    removeExpenseButton.addEventListener("click", () => {
        const amount = parseInputNumber(removeExpenseInput);
        const selectedAccountId = d('expense-refund-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);
        
        if (isNaN(amount) || amount <= 0) {
            showMessage(expensesMessage, "أدخل مبلغ صحيح (> 0) للتقليل.", true);
            return;
        }

        if (!account) {
            showMessage(expensesMessage, "يرجى اختيار حساب لإرجاع المبلغ إليه.", true);
            return;
        }

        if (amount > expenses) {
            showMessage(expensesMessage, `المبلغ (${formatCurrency(amount)}) أكبر من إجمالي المصروفات (${formatCurrency(expenses)}).`, true);
            return;
        }

        saveStateToHistory();

        // تنفيذ العمليات (عكس الإضافة)
        expenses -= amount;
        account.balance = window.money(account.balance + amount);

        const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        liquidityLog.push({ 
            id: generateId("liq"), 
            timestamp: new Date().toISOString(), 
            type: "add", 
            amount: amount, 
            description: `إلغاء/تقليل مصروف (استرداد) إلى حساب "${account.name}"`, 
            currentBalance: newTotalLiquidity,
            accountId: selectedAccountId
        });

        logOperation("تقليل مصروف", `تقليل المصروفات بقيمة ${formatCurrency(amount)}. تم إرجاعه لحساب "${account.name}".`);

        updateUI();
        removeExpenseInput.value = "0";
        showMessage(expensesMessage, `تم تقليل المصروفات بمقدار ${formatCurrency(amount)}.`);
    });
}

if (addDebtButton) {
    addDebtButton.addEventListener("click", async () => {
        
        const name = debtorNameInput.value.trim();
        const reason = addDebtReasonInput.value.trim() || 'دين عام';
        const amount = parseInputNumber(addDebtAmountInput);
        const deductLiquidity = debtDeductLiquidityCheckbox.checked;

        // --- ✅ كود جديد: قراءة الحساب المحدد للسلفة ---
        const selectedAccountId = d('debt-advance-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);

        if (!name || isNaN(amount) || amount <= 0) {
            showMessage(debtsMessage, "يرجى ملء اسم المدين ومبلغ صحيح (> 0).", true);
            return;
        }

        // --- ✅ كود جديد: التحقق من الرصيد والحساب ---
        if (deductLiquidity) {
            if (!account) {
                showMessage(debtsMessage, "يرجى اختيار الحساب الذي سيتم الخصم منه.", true);
                return;
            }
            if (amount > account.balance) {
                showMessage(debtsMessage, `مبلغ السلفة (${formatCurrency(amount)}) أكبر من رصيد حساب "${account.name}" (${formatCurrency(account.balance)}).`, true);
                return;
            }
        }
        
        // تعطيل الزر مؤقتا وإظهار حالة التحميل لجلب الوقت من الإنترنت
        const originalBtnText = addDebtButton.innerHTML;
        let realTime;
        try {
            addDebtButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
            addDebtButton.disabled = true;
            realTime = await getRealTimeISO();
        } catch(e) {
            realTime = new Date().toISOString();
        } finally {
            addDebtButton.innerHTML = originalBtnText;
            addDebtButton.disabled = false;
        }
        
        saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;
        try {
            const debtorPhone = debtorPhoneInput ? debtorPhoneInput.value.trim() : "";
            const debtorAddress = debtorAddressInput ? debtorAddressInput.value.trim() : "";
            const customerProfile = getOrCreateDebtorProfile(name, debtorPhone, debtorAddress);
            const normalizedCustomerName = normalizeArabicText(customerProfile.name || '');
            const searchReason = normalizeArabicText(reason || '');
            const debtAmountVal = window.money(amount);

            const existingDebtIndex = debtors.findIndex(d => {
                const debtName = normalizeArabicText(d.name || d.customerName || '');
                return (d.customerId === customerProfile.id || debtName === normalizedCustomerName) && normalizeArabicText(d.reason || '') === searchReason;
            });

            let logMsg = "";
            if (existingDebtIndex !== -1) {
                debtors[existingDebtIndex].customerId = customerProfile.id;
                debtors[existingDebtIndex].name = customerProfile.name;
                debtors[existingDebtIndex].amount = window.money((Number(debtors[existingDebtIndex].amount) || 0) + debtAmountVal);
                debtors[existingDebtIndex].createdAt = realTime;
                logMsg = `زيادة دين قائم على "${customerProfile.name}" بمبلغ ${formatCurrency(debtAmountVal)}.`;
                showMessage(debtsMessage, `تمت زيادة الدين لـ "${customerProfile.name}".`);
            } else {
                debtors.push({ id: generateId('debt'), customerId: customerProfile.id, name: customerProfile.name, customerName: customerProfile.name, reason, amount: debtAmountVal, createdAt: realTime });
                logMsg = `تسجيل دين جديد على "${customerProfile.name}" بمبلغ ${formatCurrency(debtAmountVal)}.`;
                showMessage(debtsMessage, `تم تسجيل دين جديد لـ "${customerProfile.name}".`);
            }

            if (deductLiquidity) {
                account.balance = window.money(account.balance - debtAmountVal);
                const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
                liquidityLog.push({ id: generateId("liq"), timestamp: new Date().toISOString(), type: "remove", amount: debtAmountVal, description: `سلفة لـ ${name} من حساب "${account.name}"`, currentBalance: newTotalLiquidity, accountId: account.id });
                logMsg += ` وتم خصمه كسلفة من حساب "${account.name}".`;
            }

            logOperation("تسجيل/زيادة دين", logMsg);
            if (_tx) _tx.commit();
            updateUI();
            debtorNameInput.value = "";
            if (debtorPhoneInput) debtorPhoneInput.value = "";
            if (debtorAddressInput) debtorAddressInput.value = "";
            addDebtReasonInput.value = "";
            addDebtAmountInput.value = "0";
            debtDeductLiquidityCheckbox.checked = false;
            d('debt-advance-account-container').classList.add('hidden');
            debtorNameInput.focus();
            if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error("Cloud save error:", e));
        } catch (err) {
            if (_tx) await _tx.rollback();
            console.error("فشل تسجيل الدين:", err);
            showMessage(debtsMessage, "فشل تسجيل الدين؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
        }
    });

    // مستمع لإظهار وإخفاء قائمة الحسابات
    if (debtDeductLiquidityCheckbox) {
        debtDeductLiquidityCheckbox.addEventListener('change', (e) => {
            const c = d('debt-advance-account-container');
            if (c) c.classList.toggle('hidden', !e.target.checked);
        });
    }
}

if (debtsSearchInput) {
    debtsSearchInput.addEventListener("input", updateDebtorsListDisplay);
}

if (debtsNotesFilter) {
    debtsNotesFilter.addEventListener("change", updateDebtorsListDisplay);
}

if (debtsSortSelect) {
    debtsSortSelect.addEventListener("change", updateDebtorsListDisplay);
}

if (receivePaymentButton) {
    receivePaymentButton.addEventListener("click", async () => {
        receivePaymentButton.disabled = true;
        setTimeout(() => { receivePaymentButton.disabled = false; }, 1000);
        
        const checkedDebts = d('payment-debtor-list-container').querySelectorAll('.debt-payment-checkbox:checked');
        const selectedAccountId = d('debt-payment-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);

        if (checkedDebts.length === 0) {
            showMessage(debtsMessage, "يرجى تحديد دين واحد على الأقل لتحصيله.", true);
            return;
        }
        if (!account) {
            showMessage(debtsMessage, "يرجى اختيار الحساب الذي سيتم إيداع المبلغ فيه.", true);
            return;
        }

        let totalPayment = 0;
        let paidDebtIds = [];
        let paidDebtorsSummary = new Map();

        checkedDebts.forEach(checkbox => {
            const amount = parseFloat(checkbox.dataset.amount);
            totalPayment = window.money(totalPayment + amount);
            paidDebtIds.push(checkbox.dataset.debtId);
            const debt = debtors.find(d => d.id === checkbox.dataset.debtId);
            if (debt) {
                paidDebtorsSummary.set(debt.name, (paidDebtorsSummary.get(debt.name) || 0) + amount);
            }
        });

        saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

        try {
            account.balance = window.money(account.balance + totalPayment);
            debtors = debtors.filter(d => !paidDebtIds.includes(d.id));

            const summaryText = Array.from(paidDebtorsSummary.entries()).map(([name, amount]) => `${name} (${formatCurrency(amount)})`).join('، ');
            const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
            liquidityLog.push({ id: generateId("liq"), timestamp: new Date().toISOString(), type: "add", amount: totalPayment, description: `سداد مجمع من: ${summaryText}`, currentBalance: newTotalLiquidity, accountId: account.id });
            logOperation("استلام سداد مجمع", `استلام ${formatCurrency(totalPayment)} في حساب "${account.name}" من: ${summaryText}.`);

            if (_tx) _tx.commit();
            updateUI();
            showMessage(debtsMessage, `تم استلام دفعة مجمعة بقيمة ${formatCurrency(totalPayment)} بنجاح.`);
            d('debt-payment-summary').classList.add('hidden');
            if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error("Cloud save error:", e));
        } catch (err) {
            if (_tx) await _tx.rollback();
            console.error("فشل استلام السداد المجمع:", err);
            showMessage(debtsMessage, "فشل استلام السداد المجمع؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
        }
    });
}
              // --- ضع هذا الكود داخل دالة initializeApp بدلاً من الكود القديم الخاص بالالتزامات ---

// 1. تفعيل إظهار/إخفاء قائمة الحسابات
if (liabilityReceivedCashCheckbox) {
    liabilityReceivedCashCheckbox.addEventListener('change', (e) => {
        const container = d('liability-cash-account-container');
        if (container) {
            if (e.target.checked) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    });
}

// 2. تحديث منطق زر إضافة الالتزام
if (addLiabilityButton) {
    addLiabilityButton.addEventListener("click", async () => {
        
        const name = creditorNameInput.value.trim();
        const amount = parseInputNumber(addLiabilityAmountInput);
        const receivedCash = liabilityReceivedCashCheckbox.checked;
        
        // قراءة الحساب المختار
        const selectedAccountId = d('liability-cash-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);

        if (!name) {
            showMessage(liabilitiesMessage, "يرجى إدخال اسم الدائن.", true);
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showMessage(liabilitiesMessage, "يجب أن يكون مبلغ الالتزام أكبر من صفر.", true);
            return;
        }

        // التحقق من اختيار الحساب إذا تم تحديد استلام السيولة
        if (receivedCash && !account) {
            showMessage(liabilitiesMessage, "يرجى اختيار الحساب الذي تم استلام السيولة فيه.", true);
            return;
        }
        
        // تعطيل الزر مؤقتا وإظهار حالة التحميل لجلب الوقت من الإنترنت
        const originalBtnText = addLiabilityButton.innerHTML;
        addLiabilityButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        addLiabilityButton.disabled = true;
        const realTime = await getRealTimeISO();
        
        saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

        try {
            const liabilityAmountVal = window.money(amount);
            const existingIndex = liabilities.findIndex(l => l.name === name);
            let logMsg = "";

            if (existingIndex !== -1) {
                liabilities[existingIndex].amount = window.money((Number(liabilities[existingIndex].amount) || 0) + liabilityAmountVal);
                liabilities[existingIndex].lastUpdated = realTime;
                if (!liabilities[existingIndex].history) liabilities[existingIndex].history = [];
                liabilities[existingIndex].history.push({
                    date: realTime,
                    addedAmount: liabilityAmountVal,
                    saleId: 'MANUAL_ADD',
                    note: 'زيادة يدوية من شاشة الالتزامات'
                });
                logMsg = `زيادة التزام قائم لـ "${name}" بمبلغ ${formatCurrency(liabilityAmountVal)}. الإجمالي: ${formatCurrency(liabilities[existingIndex].amount)}`;
                showMessage(liabilitiesMessage, `تمت زيادة الالتزام لـ "${name}".`);
            } else {
                const newLiabilityId = generateId('liab') || generateId("LIA");
                const newLiability = {
                    id: newLiabilityId,
                    name: name,
                    amount: liabilityAmountVal,
                    category: d('add-liability-category') ? d('add-liability-category').value : 'أخرى',
                    paymentHistory: [],
                    status: 'active',
                    createdAt: realTime
                };
                liabilities.push(newLiability);
                logMsg = `تسجيل التزام جديد على الشركة لـ "${name}" بمبلغ ${formatCurrency(liabilityAmountVal)}.`;
                showMessage(liabilitiesMessage, `تم تسجيل التزام جديد لـ "${name}".`);
            }
            
            addLiabilityButton.innerHTML = originalBtnText;
            addLiabilityButton.disabled = false;

            if (receivedCash) {
                account.balance = window.money(account.balance + liabilityAmountVal);
                const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
                const liqLogEntry = {
                    id: generateId("liq") || generateId("LIQ"),
                    timestamp: new Date().toISOString(),
                    type: "add",
                    amount: liabilityAmountVal,
                    description: `استلام سيولة مقابل التزام لـ ${name} في حساب "${account.name}"`,
                    currentBalance: newTotalLiquidity,
                    accountId: selectedAccountId,
                    isLiabilityReceipt: true
                };
                liquidityLog.push(liqLogEntry);
                logMsg += ` وتم استلام سيولة مقابله في "${account.name}".`;
            }

            logOperation("تسجيل/زيادة التزام", logMsg);
            if (_tx) _tx.commit();
            updateUI();
            creditorNameInput.value = "";
            addLiabilityAmountInput.value = "0";
            liabilityReceivedCashCheckbox.checked = false;
            d('liability-cash-account-container').classList.add('hidden');
            if (d('liability-cash-account')) d('liability-cash-account').value = "";
            creditorNameInput.focus();
            if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error("Cloud save error:", e));
        } catch (err) {
            addLiabilityButton.innerHTML = originalBtnText;
            addLiabilityButton.disabled = false;
            if (_tx) await _tx.rollback();
            console.error("فشل تسجيل الالتزام:", err);
            showMessage(liabilitiesMessage, "فشل تسجيل الالتزام؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
        }
    });
}
if (payLiabilityButton) {
const debtPaymentContainer = d('payment-debtor-list-container');
const liabilityPaymentContainer = d('payment-creditor-list-container');

if(debtPaymentContainer){
    debtPaymentContainer.addEventListener('change', () => {
        calculateSelectedTotal('payment-debtor-list-container', '.debt-payment-checkbox', d('debt-payment-summary'), d('debt-payment-total'));

        // Update "Select All" checkbox state
        const allDebts = debtPaymentContainer.querySelectorAll('.debt-payment-checkbox');
        const checkedDebts = debtPaymentContainer.querySelectorAll('.debt-payment-checkbox:checked');
        d('toggle-all-debts').checked = allDebts.length > 0 && allDebts.length === checkedDebts.length;
    });
}

if(liabilityPaymentContainer){
    liabilityPaymentContainer.addEventListener('change', () => {
        calculateSelectedTotal('payment-creditor-list-container', '.liability-payment-checkbox', d('liability-payment-summary'), d('liability-payment-total'));

        // Update "Select All" checkbox state
        const allLiabilities = liabilityPaymentContainer.querySelectorAll('.liability-payment-checkbox');
        const checkedLiabilities = liabilityPaymentContainer.querySelectorAll('.liability-payment-checkbox:checked');
        d('toggle-all-liabilities').checked = allLiabilities.length > 0 && allLiabilities.length === checkedLiabilities.length;
    });
}
// =======================================================
// START: NEW LOGIC FOR "SELECT ALL" CHECKBOXES
// =======================================================
const toggleAllDebtsCheckbox = d('toggle-all-debts');
const toggleAllLiabilitiesCheckbox = d('toggle-all-liabilities');

if (toggleAllDebtsCheckbox) {
    toggleAllDebtsCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const debtCheckboxes = d('payment-debtor-list-container').querySelectorAll('.debt-payment-checkbox');
        debtCheckboxes.forEach(checkbox => checkbox.checked = isChecked);
        // Trigger calculation after changing
        calculateSelectedTotal('payment-debtor-list-container', '.debt-payment-checkbox', d('debt-payment-summary'), d('debt-payment-total'));
    });
}

if (toggleAllLiabilitiesCheckbox) {
    toggleAllLiabilitiesCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const liabilityCheckboxes = d('payment-creditor-list-container').querySelectorAll('.liability-payment-checkbox');
        liabilityCheckboxes.forEach(checkbox => checkbox.checked = isChecked);
        // Trigger calculation after changing
        calculateSelectedTotal('payment-creditor-list-container', '.liability-payment-checkbox', d('liability-payment-summary'), d('liability-payment-total'));
    });
}
// =======================================================
// END: NEW LOGIC FOR "SELECT ALL" CHECKBOXES
// =======================================================

    payLiabilityButton.addEventListener("click", async () => {
        payLiabilityButton.disabled = true;
        setTimeout(() => { payLiabilityButton.disabled = false; }, 1000);
        
        const checkedLiabilities = d('payment-creditor-list-container').querySelectorAll('.liability-payment-checkbox:checked');
        const selectedAccountId = d('liability-payment-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);

        if (checkedLiabilities.length === 0) {
            showMessage(liabilitiesMessage, "يرجى تحديد التزام واحد على الأقل لتسديده.", true);
            return;
        }
        if (!account) {
            showMessage(liabilitiesMessage, "يرجى اختيار الحساب الذي سيتم الدفع منه.", true);
            return;
        }

        let totalPayment = 0;
        let paidLiabilityIds = [];
        let paidCreditorsSummary = new Map();

        checkedLiabilities.forEach(checkbox => {
            const amount = parseFloat(checkbox.dataset.amount);
            totalPayment = window.money(totalPayment + amount);
            paidLiabilityIds.push(checkbox.dataset.liabilityId);
            const liability = liabilities.find(l => l.id === checkbox.dataset.liabilityId);
            if (liability) paidCreditorsSummary.set(liability.name, (paidCreditorsSummary.get(liability.name) || 0) + amount);
        });

        if (totalPayment > account.balance) {
            showMessage(liabilitiesMessage, `رصيد حساب "${account.name}" (${formatCurrency(account.balance)}) غير كافٍ لتسديد المبلغ المطلوب (${formatCurrency(totalPayment)}).`, true);
            return;
        }

        saveStateToHistory();
        const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

        try {
            account.balance = window.money(account.balance - totalPayment);
            paidLiabilityIds.forEach(id => {
                const liability = liabilities.find(l => l.id === id);
                if (liability) {
                    const amountPaid = Number(liability.amount) || 0;
                    if (!liability.paymentHistory) liability.paymentHistory = [];
                    liability.paymentHistory.push({ id: generateId('pay'), amount: amountPaid, date: new Date().toISOString(), accountId: account.id, accountName: account.name, note: 'سداد مجمع' });
                    const invId = liability.purchaseInvoiceId || (typeof pendingPurchases !== 'undefined' && (pendingPurchases.find(p => (p.extraCosts || []).some(c => c.isLiability && c.linkedLiabilityId === liability.id)) || {}).id);
                    if (invId) {
                        const pnd = (typeof pendingPurchases !== 'undefined' && Array.isArray(pendingPurchases)) ? pendingPurchases.find(p => p.id === invId) : null;
                        if (pnd) {
                            pnd.paidAmount = window.money((pnd.paidAmount || 0) + amountPaid);
                            pnd.remainingBalance = window.money(Math.max(0, (pnd.remainingBalance || 0) - amountPaid));
                        }
                        const pinv = (typeof purchaseInvoices !== 'undefined' && Array.isArray(purchaseInvoices)) ? purchaseInvoices.find(p => p.id === invId) : null;
                        if (pinv) {
                            pinv.paidAmount = window.money((pinv.paidAmount || 0) + amountPaid);
                            pinv.remainingBalance = window.money(Math.max(0, (pinv.remainingBalance || 0) - amountPaid));
                        }
                    }
                    liability.amount = 0;
                    liability.status = 'paid';
                }
            });

            const isExpense = d('batch-liability-is-expense') ? d('batch-liability-is-expense').checked : false;
            const summaryText = Array.from(paidCreditorsSummary.entries()).map(([name, amount]) => `${name} (${formatCurrency(amount)})`).join('، ');
            const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);

            liquidityLog.push({ id: generateId("liq"), timestamp: new Date().toISOString(), type: "remove", amount: totalPayment, description: `تسديد التزام مجمع لـ: ${summaryText}`, currentBalance: newTotalLiquidity, accountId: account.id, isExpense: isExpense, isLiabilityPayment: true });
            logOperation("تسديد التزام مجمع", `تسديد ${formatCurrency(totalPayment)} من حساب "${account.name}" إلى: ${summaryText}.`);

            if (isExpense) {
                expenses = window.money(expenses + totalPayment);
                logOperation("تسجيل مصروف", `تسديد التزام مجمع (${summaryText}) بقيمة ${formatCurrency(totalPayment)} من حساب "${account.name}".`);
                d('batch-liability-is-expense').checked = false;
            }

            if (_tx) _tx.commit();
            updateUI();
            showMessage(liabilitiesMessage, `تم تسديد دفعة مجمعة بقيمة ${formatCurrency(totalPayment)} بنجاح.`);
            d('liability-payment-summary').classList.add('hidden');
            if (typeof saveSystemToCloud === 'function') saveSystemToCloud().catch(e => console.error("Cloud save error:", e));
        } catch (err) {
            if (_tx) await _tx.rollback();
            console.error("فشل تسديد الالتزام المجمع:", err);
            showMessage(liabilitiesMessage, "فشل تسديد الالتزام المجمع؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
        }
    });
}
if (performTwoPartyOffsetButton) { 
    performTwoPartyOffsetButton.addEventListener("click", async () => {
        saveStateToHistory();
        await performTwoPartyOffset();
    }); 
}
// --- Financial Center Buttons Listener ---
if (fc_execute_debt_btn) {
    fc_execute_debt_btn.addEventListener('click', async () => {
        await fc_execute_debt_treatment();
    });
}

if (fc_execute_dist_btn) {
    fc_execute_dist_btn.addEventListener('click', () => {
        saveStateToHistory(); // لحفظ الحالة قبل التنفيذ
        fc_execute_cost_distribution();
    });
}
// === ✅ استبدل هذا الجزء بالكامل داخل دالة initializeApp ===
const ppConfirmBtn = d('pp-confirm-payment-btn');
const ppCancelBtn = d('pp-cancel-payment-btn');
if (ppConfirmBtn) {
    ppConfirmBtn.addEventListener('click', async () => {
        const pendingId = ppConfirmBtn.dataset.pendingId;
        const purchaseIndex = pendingPurchases.findIndex(p => p.id === pendingId);
        
        if (purchaseIndex === -1) {
            showMessage(d('pp-payment-message'), "خطأ: لم يتم العثور على الفاتورة.", true);
            return;
        }

        const purchase = pendingPurchases[purchaseIndex];
        const selectedAccountId = d('pending-purchase-payment-account').value;
        const account = accounts.find(acc => acc.id === selectedAccountId);
        
        if (!account) {
            showMessage(d('pp-payment-message'), "يرجى اختيار حساب للدفع.", true);
            return;
        }

        // التحقق من الرصيد الفعلي بعد فحص أي سداد سابق من قسم الالتزامات
        const allInvoiceLiabs = (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) ? liabilities.filter(l => l.purchaseInvoiceId === purchase.id || (purchase.extraCosts || []).some(c => c.isLiability && c.linkedLiabilityId === l.id)) : [];
        const debtToPay = allInvoiceLiabs.length > 0 ? allInvoiceLiabs.reduce((s, l) => s + (Number(l.amount) || 0), 0) : Math.min(Number(purchase.remainingBalance) || 0, Math.max(0, (Number(purchase.grandTotal) || 0) - (Number(purchase.paidAmount) || 0)));
        if (debtToPay > account.balance) {
            showMessage(d('pp-payment-message'), `رصيد حساب "${account.name}" غير كافٍ.`, true);
            return;
        }

        saveStateToHistory();

        // --- 1. حساب توزيع التكاليف الإضافية نسبياً ---
        // جمع كل التكاليف الإضافية المسجلة في الفاتورة (شحن، عتالة، إلخ)
        const totalExtraCosts = (purchase.extraCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        // حساب إجمالي قيمة البضاعة الأساسية لعمل توزيع عادل
        const totalBaseGoodsValue = purchase.items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

        // --- 2. تحديث المخزون (بالتصنيفات والتكاليف الشاملة) ---
        purchase.items.forEach(item => {
            // حساب نصيب القطعة الواحدة من المصاريف الإضافية
            let extraCostPerUnit = 0;
            if (totalBaseGoodsValue > 0 && totalExtraCosts > 0) {
                const itemTotalBaseCost = item.quantity * item.cost;
                const itemShareOfExtra = (itemTotalBaseCost / totalBaseGoodsValue) * totalExtraCosts;
                extraCostPerUnit = itemShareOfExtra / item.quantity;
            }
            
            // التكلفة النهائية = التكلفة الأساسية + نصيب المصاريف
            const finalCostWithOverhead = item.cost + extraCostPerUnit;

            const productIndex = products.findIndex(p => p.name.toLowerCase() === item.name.toLowerCase());
            
            if (productIndex !== -1) {
                // تحديث منتج موجود مسبقاً
                const existing = products[productIndex];
                const oldQty = Number(existing.quantity) || 0;
                const oldCost = Number(existing.costPrice) || 0;
                const totalQty = oldQty + item.quantity;
                
                existing.quantity = totalQty;
                // تحديث متوسط التكلفة بناءً على السعر الشامل الجديد
                existing.costPrice = totalQty > 0 ? ((oldQty * oldCost) + (item.quantity * finalCostWithOverhead)) / totalQty : finalCostWithOverhead;
                
                // ✅ تحديث التصنيف (Category) لضمان انتقاله للمخزون
                if (item.category) existing.category = item.category;
            } else {
                // ✅ إضافة منتج جديد بالتصنيف والتكلفة الشاملة
              // �� [تعديل د. ضياء]: تأمين البضاعة الجديدة الناتجة عن توزيع المصاريف بكود فريد
const uniqueProductCodeOverhead = generateId('code');
products.push({ 
    id: uniqueProductCodeOverhead, // �� إضافة الـ ID لمنع الكراش والتداخل مستقبلاً
    name: item.name, 
    quantity: item.quantity, 
    costPrice: finalCostWithOverhead, 
    supplierId: purchase.supplierId,
    category: item.category || "" 
});
            }

            // تسجيل السيريالات إن وجدت
            if (item.serials && item.serials.length > 0) {
                item.serials.forEach(serial => {
                    if (!serialNumbersLog.some(s => s.serial === serial)) {
                        serialNumbersLog.push({
                id: generateId("SER"),
                serial, 
                            productName: item.name, 
                            supplierId: purchase.supplierId, 
                            addedTimestamp: purchase.timestamp, 
                            status: "in_stock" 
                        });
                    }
                });
            }
        });

        // --- 3. المعالجة المالية (الخصم من الخزنة) ---
        account.balance = window.money(account.balance - debtToPay);
        const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        liquidityLog.push({ 
            id: generateId("liq"), 
            timestamp: new Date().toISOString(),
            type: "remove", 
            amount: debtToPay, 
            description: `تسديد متبقي مشتريات شاملة المصاريف من حساب "${account.name}"`, 
            currentBalance: newTotalLiquidity,
            accountId: account.id
        });

        // --- 4. تحديث بيانات الفاتورة وتصفية الالتزامات ---
        purchase.paidAmount = purchase.grandTotal;
        purchase.remainingBalance = 0;
        purchase.status = 'Confirmed';
        
        // إزالة أو تصفير الالتزام المرتبط بهذه الفاتورة لتجنب تكرار المبالغ
        if (typeof liabilities !== 'undefined' && Array.isArray(liabilities)) {
            allInvoiceLiabs.forEach(l => {
                if (l.purchaseInvoiceId === purchase.id) {
                    l.amount = 0;
                    l.status = 'paid';
                } else {
                    const costMatch = (purchase.extraCosts || []).find(c => c.isLiability && c.linkedLiabilityId === l.id);
                    if (costMatch) {
                        l.amount = window.money(Math.max(0, (Number(l.amount) || 0) - (Number(costMatch.amount) || 0)));
                        if (l.amount <= 0.001) l.status = 'paid';
                    }
                }
            });
            liabilities = liabilities.filter(l => l.purchaseInvoiceId !== purchase.id || (Number(l.amount) || 0) > 0.001);
        }
        
        purchaseInvoices.push(purchase);
        pendingPurchases.splice(purchaseIndex, 1);
        
        logOperation("استلام وتسديد شامل", `تم استلام بضاعة وتسديد المتبقي شامل المصاريف من حساب "${account.name}".`);
        showGlobalMessage("تم الاستلام النهائي وتحديث المخزون بالتصنيفات والتكاليف الشاملة بنجاح.", false);
        
        d('pending-purchase-payment-form').classList.add('hidden');
        updateUI();

        // مزامنة سحابية (اختياري)
        if (typeof saveSystemToCloud === 'function') {
            await saveSystemToCloud();
        }
    });
}

if (ppCancelBtn) {
    ppCancelBtn.addEventListener('click', () => {
        d('pending-purchase-payment-form').classList.add('hidden');
        showMessage(d('pp-payment-message'), "");
    });
}
// =======================================================
// START: Returns Section Event Listeners
// =======================================================
if (returnProductSelect) {
    returnProductSelect.addEventListener('change', () => {
        const selectedOption = returnProductSelect.options[returnProductSelect.selectedIndex];
        const cost = selectedOption ? parseFloat(selectedOption.dataset.cost) : 0;
        if (d('return-sale-price-display')) d('return-sale-price-display').textContent = formatCurrency(cost);
        if (d('return-cost-price-display')) d('return-cost-price-display').textContent = formatCurrency(cost);
        if (typeof window.handleReturnProductSelection === 'function') window.handleReturnProductSelection();
    });
}

if (confirmManualReturnBtn) {
    confirmManualReturnBtn.addEventListener('click', handleManualReturn);
}
// أضف هذا الكود داخل دالة initializeApp
if (d('return-type-selector')) {
    d('return-type-selector').addEventListener('change', updateReturnFormVisibility);
}

if (searchInvoiceBtn) {
    searchInvoiceBtn.addEventListener('click', handleInvoiceSearchForReturn);
}

if (invoiceSearchResults) {
    invoiceSearchResults.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-invoice-return-btn') {
            handleInvoiceReturnConfirmation(e.target.dataset.invoiceId, e.target.dataset.invoiceNumber);
        }
    });
}

if (pendingReceiptList) {
    pendingReceiptList.addEventListener('click', (e) => {
        const button = e.target.closest('.confirm-receipt-btn');
        if (button && !button.disabled) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin ml-1"></i> جاري الاستلام...';
            button.classList.add('opacity-75', 'cursor-not-allowed');
            handleConfirmReceipt(button.dataset.pendingReturnId);
        }
    });
}
// =======================================================
// END: Returns Section Event Listeners
// =======================================================
                 if (generateReportButton) { generateReportButton.addEventListener("click", generateMonthlySalesReport); }
                 if (d('generate-exp-report-button')) { d('generate-exp-report-button').addEventListener('click', generateExpensesReport); }

// البحث عن تفاصيل فاتورة الشراء من الالتزامات
if (d('liabilities-list-container')) {
    d('liabilities-list-container').addEventListener('click', async (e) => {
        const target = e.target.closest('.view-purchase-invoice-btn');
        if (target) {
            const invoiceId = target.dataset.purchaseInvoiceId;
            console.log("�� جاري محاولة جلب الفاتورة رقم:", invoiceId);

            if (!invoiceId) {
                alert("تنبيه: هذه الفاتورة قديمة ولا تملك معرّفاً سحابياً.");
                return;
            }

            let invoice = purchaseInvoices.find(inv => inv.id === invoiceId);

            if (!invoice && window.currentUser) {
                const statusEl = document.getElementById('global-message');
                if(statusEl) showMessage(statusEl, "جاري البحث في الأرشيف السحابي...", false, true);
                
                try {
                    const docRef = window.doc(window.db, "users", window.currentUser.uid, "purchase_archives", invoiceId);
                    const docSnap = await window.getDoc(docRef);
                    if (docSnap.exists()) {
                        invoice = docSnap.data();
                        console.log("✅ تم العثور على الفاتورة في السحابة.");
                    }
                } catch (err) {
                    console.error("❌ خطأ في الاتصال بالسحابة:", err);
                }
                if(statusEl) showMessage(statusEl, "");
            }

            if (invoice) {
                // عرض التفاصيل (نفس منطق Alert السابق)
                let details = `�� تفاصيل الفاتورة من الأرشيف:\n----------------------------\n`;
                details += `رقمها: ${invoice.invoiceNumber || 'N/A'}\nإجمالي: ${formatCurrency(invoice.grandTotal)}\n`;
                details += `المتبقي: ${formatCurrency(invoice.remainingBalance)}\n\nالبنود:\n`;
                invoice.items.forEach(item => details += `- ${item.quantity}x ${item.name} (${formatCurrency(item.cost)})\n`);
                alert(details);
            } else {
                alert('عذراً، لم يتم العثور على تفاصيل هذه الفاتورة في الأرشيف السحابي.');
            }
        }
    });
}
    // لا داعي للبحث عن آخر يوم محفوظ، سنقوم بالتحميل مباشرة
    const todayString = (typeof getTodayDateString === 'function') 
        ? getTodayDateString() 
        : (typeof window.getTodayDateString === 'function' ? window.getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })));
    await loadDataForDate(todayString);

    // -- PHASE 3 DB READ -- (DISABLED TEMPORARILY AS REQUESTED IN REPORT BUG 4)
    /*
    if (window.FinanceDB) {
        try {
            const dbProducts = await window.FinanceDB.loadAllProducts();
            if (dbProducts && dbProducts.length > 0) {
                console.log('Phase 3: Overriding local products with Cloud Isolated Collections');
                window.products = dbProducts;
            }
        } catch(e) {
            console.error('Failed to load products from FinanceDB on startup', e);
        }
    }
    */
    // -----------------------

    // بعد التأكد من تحميل البيانات، نقوم بتحديث الواجهة بالكامل
    updateUI();

    // تعيين القيم الافتراضية لحقول التاريخ
    if (loadDateInputAlt) {
        loadDateInputAlt.value = currentLoadedDate;
        updateLoadDateDayName(currentLoadedDate, loadDateDayNameDisplayAlt);
    }
    if (reportMonthYearInput && currentLoadedDate) {
        reportMonthYearInput.value = currentLoadedDate.substring(0, 7);
    }

    // تشغيل الساعة
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);

    console.log("Initialization complete. Final loaded date:", currentLoadedDate);

    if (d('return-sale-price-group')) {
    const returnTypeRadios = document.querySelectorAll('input[name="return-type"]');
    returnTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedType = document.querySelector('input[name="return-type"]:checked').value;
            if (d('return-sale-price-group') && d('return-cost-price-group')) {
                d('return-sale-price-group').classList.toggle('hidden', selectedType === 'cost');
                d('return-cost-price-group').classList.toggle('hidden', selectedType === 'sale');
            }
        });
    });
}
}
// 1. تعريف متغيرات واجهة المصادقة وتعيينها مرة واحدة فقط
    const authContainer = d('auth-container');
    const mainContent = d('main-content');
    const logoutBtn = d('logout-btn');
    const loginBtn = d('login-btn');
    const forgotPasswordLink = d('forgot-password-link');
    const authError = d('auth-error');

    // 2. ربط أزرار المصادقة بوظائفها
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if(!authError) return;
            const email = d('auth-email').value;
            const password = d('auth-password').value;
            loginBtn.disabled = true;
            const origHTML = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> جاري الدخول الآمن...';
            window.signInWithEmailAndPassword(window.auth, email, password)
                .catch(error => { 
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = origHTML;
                    showMessage(authError, "فشل تسجيل الدخول: " + error.message, true); 
                });
        });
    }
    const registerBtn = d('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            if(!authError) return;
            const email = (d('auth-email') ? d('auth-email').value : '').trim();
            const password = d('auth-password') ? d('auth-password').value : '';
            if (!email || !password) {
                showMessage(authError, "يرجى إدخال البريد الإلكتروني وكلمة المرور.", true);
                return;
            }
            if (password.length < 6) {
                showMessage(authError, "كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.", true);
                return;
            }
            registerBtn.disabled = true;
            const origHTML = registerBtn.innerHTML;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> جاري إنشاء الحساب...';
            try {
                await window.createUserWithEmailAndPassword(window.auth, email, password);
                showMessage(authError, "تم إنشاء الحساب بنجاح! جاري الدخول...", false);
            } catch (error) {
                registerBtn.disabled = false;
                registerBtn.innerHTML = origHTML;
                let msg = error.message;
                if (error.code === 'auth/email-already-in-use') msg = "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.";
                else if (error.code === 'auth/weak-password') msg = "كلمة المرور ضعيفة. استخدم 6 خانات على الأقل.";
                else if (error.code === 'auth/invalid-email') msg = "صيغة البريد الإلكتروني غير صحيحة.";
                showMessage(authError, "فشل إنشاء الحساب: " + msg, true);
            }
        });
    }
    const togglePassBtn = d('toggle-password-btn');
    if (togglePassBtn) {
        togglePassBtn.addEventListener('click', () => {
            const passInput = d('auth-password'), icon = d('toggle-password-icon');
            if (passInput) {
                const isPass = passInput.type === 'password';
                passInput.type = isPass ? 'text' : 'password';
                if (icon) { icon.classList.toggle('fa-eye', !isPass); icon.classList.toggle('fa-eye-slash', isPass); }
            }
        });
    }
    const authPassInput = d('auth-password');
    if (authPassInput && loginBtn) {
        authPassInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });
    }
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = d('auth-email').value;
            if(!email) {
                showMessage(authError, "الرجاء إدخال البريد الإلكتروني أولاً", true);
                return;
            }
            window.auth.sendPasswordResetEmail(email)
                .then(() => showMessage(authError, "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني", false))
                .catch(error => showMessage(authError, "حدث خطأ: " + error.message, true));
        });
    }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await window.SessionGuard.stop();
        await window.signOut(window.auth);
    });
}  

if (window.onAuthStateChanged) {
    window.onAuthStateChanged(window.auth, async (user) => {
    const splashEl = d('app-splash-loader');
    if (user) {
        const allowed = await window.SessionGuard.checkBeforeEntering(user);
        if (!allowed) {
            if (splashEl) splashEl.style.display = 'none';
            return;
        }

        if(authContainer) authContainer.classList.add('hidden');
        if(mainContent) mainContent.classList.remove('hidden');
        if(logoutBtn) logoutBtn.classList.remove('hidden');
        if (splashEl) splashEl.style.display = 'none';

        if (window.currentUser && window.currentUser.uid !== user.uid) {
            window._lastSavedSerialsHash = null;
        }
        window.currentUser = user;

        if (!window.__appInitDone) { window.__appInitDone = true; initializeApp(); window.appInitialized = true; } else { window.appInitialized = true; }
    } else {
        if (splashEl) splashEl.style.display = 'none';
        if (authContainer) authContainer.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');

        window.currentUser = null;
        window._lastSavedSerialsHash = null;
        window.appInitialized = false;
        // لو البرنامج كان شغال ثم حصل خروج: إعادة تحميل لبدء نظيف (يمنع تكرار الأزرار والحفظ ببيانات قديمة)
        if (window.__appInitDone) { location.reload(); return; }
    }
});
}
    // --- START: PARTIAL LIABILITY PAYMENT LOGIC ---

partialLiabilityPaymentModal = d('partialLiabilityPaymentModal');
 partialLiabilityPaymentMessage = d('partial-liability-payment-message');

// Function to open the partial liability payment modal

// Function to close the modal

// Event listener for the new "Pay" button (using event delegation on the body)
document.body.addEventListener('click', (e) => {
    const payButton = e.target.closest('#liabilities-list .pay-liability-btn');
    if (payButton) {
        const liabilityId = payButton.dataset.liabilityId;
        if (liabilityId) {
            openPartialLiabilityPaymentModal(liabilityId);
        }
    }
});

// Event listener for the modal's confirm button
const confirmPartialLiabBtn = d('confirm-partial-liability-payment-btn');
if (confirmPartialLiabBtn) {
    confirmPartialLiabBtn.addEventListener('click', async () => {
        const liabilityId = confirmPartialLiabBtn.dataset.liabilityId;
    const liabilityIndex = liabilities.findIndex(l => l.id === liabilityId);
    if (liabilityIndex === -1) {
        showMessage(partialLiabilityPaymentMessage, "خطأ: لم يتم العثور على الالتزام.", true);
        return;
    }

    const amountToPay = parseInputNumber(d('partial-liability-payment-amount'));
    
    const accountId = d('partial-liability-payment-account').value;
    const isExpense = d('partial-liability-is-expense') ? d('partial-liability-is-expense').checked : false;
    const account = accounts.find(acc => acc.id === accountId);
    const liability = liabilities[liabilityIndex];
    const paymentNoteInput = d('partial-liability-payment-note');
    const paymentNote = paymentNoteInput ? paymentNoteInput.value.trim() : '';

    // Validation
    if (isNaN(amountToPay) || amountToPay <= 0) {
        showMessage(partialLiabilityPaymentMessage, "الرجاء إدخال مبلغ صحيح أكبر من صفر.", true);
        return;
    }
    if (amountToPay > liability.amount + 0.001) {
        showMessage(partialLiabilityPaymentMessage, "المبلغ المدفوع أكبر من قيمة الالتزام.", true);
        return;
    }
    if (!account) {
        showMessage(partialLiabilityPaymentMessage, "الرجاء اختيار حساب للدفع منه.", true);
        return;
    }
    if (amountToPay > account.balance) {
        showMessage(partialLiabilityPaymentMessage, `رصيد حساب "${account.name}" غير كافٍ.`, true);
        return;
    }
    
    saveStateToHistory("تسديد جزء من التزام");
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        // Process payment
        liability.amount = window.money(liability.amount - amountToPay);
        account.balance = window.money(account.balance - amountToPay);
        const invId = liability.purchaseInvoiceId || (typeof pendingPurchases !== 'undefined' && (pendingPurchases.find(p => (p.extraCosts || []).some(c => c.isLiability && c.linkedLiabilityId === liability.id)) || {}).id);
        if (invId) {
            const pnd = (typeof pendingPurchases !== 'undefined' && Array.isArray(pendingPurchases)) ? pendingPurchases.find(p => p.id === invId) : null;
            if (pnd) {
                pnd.paidAmount = window.money((pnd.paidAmount || 0) + amountToPay);
                pnd.remainingBalance = window.money(Math.max(0, (pnd.remainingBalance || 0) - amountToPay));
            }
            const pinv = (typeof purchaseInvoices !== 'undefined' && Array.isArray(purchaseInvoices)) ? purchaseInvoices.find(p => p.id === invId) : null;
            if (pinv) {
                pinv.paidAmount = window.money((pinv.paidAmount || 0) + amountToPay);
                pinv.remainingBalance = window.money(Math.max(0, (pinv.remainingBalance || 0) - amountToPay));
            }
        }
        
        // Add to liquidityLog so it's captured in the Expenses Report if isExpense is true
        let liquidityLogMsg = `تسديد ${formatCurrency(amountToPay)} من التزام "${liability.name}" من حساب "${account.name}".`;
        if (paymentNote) liquidityLogMsg += ` ملاحظات: ${paymentNote}`;
        
        const isExpenseVal = typeof isExpense !== 'undefined' ? isExpense : false;
        
        if (typeof liquidityLog !== 'undefined') {
            liquidityLog.push({
                id: generateId('log'),
                timestamp: new Date().toISOString(),
                type: 'remove',
                amount: amountToPay,
                description: liquidityLogMsg,
                currentBalance: account.balance,
                accountId: account.id,
                isExpense: isExpenseVal
            });
        }

        // تسجيل تاريخ السداد
        if (!liability.paymentHistory) liability.paymentHistory = [];
        liability.paymentHistory.push({
            id: generateId('pay'),
            amount: amountToPay,
            date: new Date().toISOString(),
            accountId: account.id,
            accountName: account.name,
            note: paymentNote
        });

        let logText = `تسديد ${formatCurrency(amountToPay)} من التزام "${liability.name}" من حساب "${account.name}".`;
        if (paymentNote) logText += ` ملاحظات: ${paymentNote}`;
        logOperation("تسديد جزء من التزام", logText);

        if (isExpense) {
            expenses = window.money(expenses + amountToPay);
            logOperation("تسجيل مصروف", `تسديد التزام (${liability.name}) بقيمة ${formatCurrency(amountToPay)} من حساب "${account.name}".`);
            d('partial-liability-is-expense').checked = false;
        }
        
        // لا تحذف الالتزام بالكامل، فقط غير حالته
        if (liability.amount < 0.01) {
            liability.status = 'paid';
        }
        
        if (_tx) _tx.commit();
        updateUI();
        closePartialLiabilityPaymentModal();
        showGlobalMessage(`تم تسديد مبلغ ${formatCurrency(amountToPay)} بنجاح.`, false);
        if (typeof saveSystemToCloud === 'function') {
            saveSystemToCloud().catch(e => console.error("Cloud save error:", e));
        }
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("فشل تسديد الالتزام:", err);
        showMessage(partialLiabilityPaymentMessage, "فشل تسديد الالتزام؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
    }
});
}

// Event listeners for closing the modal
if (partialLiabilityPaymentModal) {
    partialLiabilityPaymentModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer').forEach(btn => {
        btn.addEventListener('click', closePartialLiabilityPaymentModal);
    });
}
window.addEventListener('click', (event) => {
    if (event.target == partialLiabilityPaymentModal) {
        closePartialLiabilityPaymentModal();
    }
});

// --- END: PARTIAL LIABILITY PAYMENT LOGIC ---
// --- START: PARTIAL DEBT PAYMENT LOGIC ---

 partialDebtPaymentModal = d('partialDebtPaymentModal');
 partialDebtPaymentMessage = d('partial-debt-payment-message');

// Function to open the partial debt payment modal

// Function to close the modal

// ✅✅✅ الكود الجديد والصحيح لجميع النقرات في قائمة الديون ✅✅✅
if (debtorsListContainer) {
    debtorsListContainer.addEventListener('click', (e) => {
        const payPartialButton = e.target.closest('.pay-partial-debt-btn');
        const receiveAllButton = e.target.closest('.receive-all-debt-btn');

        if (payPartialButton) {
            console.log("Pay Partial Button Clicked!"); // للتأكد من أن الزر يعمل
            const debtId = payPartialButton.dataset.debtId;
            if (debtId) {
                openPartialDebtPaymentModal(debtId);
            }
            return; // أوقف التنفيذ هنا لمنع التعارض
        }

        if (receiveAllButton) {
            console.log("Receive All Button Clicked!"); // للتأكد من أن الزر يعمل
            const debtorName = receiveAllButton.dataset.debtorName;
            if (debtorName) {
                toggleInlinePaymentForm(debtorName);
            }
            return; // أوقف التنفيذ هنا
        }
    });
}

if (collectionNotesModal) {
    collectionNotesModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer').forEach(btn => {
        btn.addEventListener('click', () => {
            collectionNotesModal.style.display = 'none';
        });
    });
}

window.addEventListener('click', (event) => {
    if (event.target === collectionNotesModal) {
        collectionNotesModal.style.display = 'none';
    }
});

// Event listener for the modal's confirm button
const confirmPartialDebtBtn = d('confirm-partial-debt-payment-btn');
if (confirmPartialDebtBtn) {
    confirmPartialDebtBtn.addEventListener('click', async () => {
        const debtId = confirmPartialDebtBtn.dataset.debtId;
    const debtIndex = debtors.findIndex(d => d.id === debtId);
    if (debtIndex === -1) {
        showMessage(partialDebtPaymentMessage, "خطأ: لم يتم العثور على الدين.", true);
        return;
    }

    const amountToPay = parseInputNumber(d('partial-debt-payment-amount'));
    const accountId = d('partial-debt-payment-account').value;
    const account = accounts.find(acc => acc.id === accountId);
    const debt = debtors[debtIndex];

    // Validation
    if (isNaN(amountToPay) || amountToPay <= 0) {
        showMessage(partialDebtPaymentMessage, "الرجاء إدخال مبلغ صحيح أكبر من صفر.", true);
        return;
    }
    if (amountToPay > debt.amount + 0.001) { // Add tolerance for floating point issues
        showMessage(partialDebtPaymentMessage, "المبلغ المدفوع أكبر من قيمة الدين.", true);
        return;
    }
    if (!account) {
        showMessage(partialDebtPaymentMessage, "الرجاء اختيار الحساب الذي سيتم إيداع المبلغ فيه.", true);
        return;
    }
    
    saveStateToHistory(); // For Undo functionality
    const _tx = (typeof window.createStateTransaction === 'function') ? window.createStateTransaction() : null;

    try {
        // Process payment
        debt.amount = window.money(debt.amount - amountToPay);
        account.balance = window.money(account.balance + amountToPay);

        const summaryText = `سداد جزئي من ${debt.name} (${debt.reason})`;
        logOperation("استلام سداد جزئي", `استلام ${formatCurrency(amountToPay)} في حساب "${account.name}" من دين "${debt.name}".`);
        
        const newTotalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        liquidityLog.push({ id: generateId("liq"), timestamp: new Date().toISOString(), type: "add", amount: amountToPay, description: summaryText, currentBalance: newTotalLiquidity, accountId: account.id });

        // Remove debt if it's fully paid
        if (debt.amount < 0.01) {
            debtors.splice(debtIndex, 1);
        }
        
        if (_tx) _tx.commit();
        updateUI();
        closePartialDebtPaymentModal();
        showGlobalMessage(`تم استلام مبلغ ${formatCurrency(amountToPay)} بنجاح.`, false);
        if (typeof saveSystemToCloud === 'function') {
            saveSystemToCloud().catch(e => console.error("Cloud save error:", e));
        }
    } catch (err) {
        if (_tx) await _tx.rollback();
        console.error("فشل استلام السداد الجزئي:", err);
        showMessage(partialDebtPaymentMessage, "فشل استلام السداد الجزئي؛ تم التراجع عن التعديلات: " + (err.message || ''), true);
    }
});
}

// Event listeners for closing the modal
if (typeof partialDebtPaymentModal !== 'undefined' && partialDebtPaymentModal) {
    partialDebtPaymentModal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer').forEach(btn => {
        btn.addEventListener('click', closePartialDebtPaymentModal);
    });
    window.addEventListener('click', (event) => {
        if (event.target == partialDebtPaymentModal) {
            closePartialDebtPaymentModal();
        }
    });
}

// ==========================================
// دالة عرض تفاصيل الربحية (النسخة الذكية - تنشئ النافذة ذاتياً)
// ==========================================

// ==========================================
// دالة المزامنة اليدوية (لإصلاح الفواتير غير المرفوعة)
// ==========================================

// ==========================================
// دالة المزامنة اليدوية (لإصلاح الفواتير غير المرفوعة)
// ==========================================
window.syncLocalSalesToCloud = async function() {
    // 1. التحقق من تسجيل الدخول
    if (!window.currentUser) {
        alert("يجب تسجيل الدخول أولاً.");
        return;
    }
    
    // 2. التحقق من وجود فواتير محلية
    if (typeof salesToday === 'undefined' || !salesToday || salesToday.length === 0) {
        alert("لا توجد فواتير مسجلة محلياً لليوم الحالي للمزامنة.");
        return;
    }

    const userId = window.currentUser.uid;
    let successCount = 0;
    let failCount = 0;

    // إظهار مؤشر تحميل على الزر (تجميد الزر لمنع التكرار)
    const btn = document.querySelector('button[onclick="syncLocalSalesToCloud()"]');
    const originalText = btn ? btn.innerHTML : "";
    if(btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المزامنة...'; 
    }

    // 3. بدء عملية الرفع
    console.log("Starting manual sync...");
    
    for (const sale of salesToday) {
        // ضمان وجود تاريخ صالح
        if (!sale.saleDate) {
            const _rawDt = sale.createdAt || sale.timestamp || (typeof currentLoadedDate !== 'undefined' ? currentLoadedDate : null); sale.saleDate = _rawDt ? (typeof getCairoDateString === 'function' ? getCairoDateString(_rawDt) : new Date(_rawDt).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
        }
        
        try {
            // نستخدم setDoc مع merge لضمان عدم مسح بيانات إضافية إن وجدت
            const docRef = window.doc(window.db, "users", userId, "invoices", sale.id);
            await window.setDoc(docRef, sale, { merge: true });
            successCount++;
        } catch (e) {
            console.error("فشل رفع الفاتورة:", sale.id, e);
            failCount++;
        }
    }

    // 4. إعادة الزر لحالته
    if(btn) { 
        btn.disabled = false; 
        btn.innerHTML = originalText; 
    }
    
    // 5. رسالة النتيجة
    alert(`تمت عملية المزامنة:\n✅ تم رفع/تحديث: ${successCount} فاتورة.\n❌ فشل: ${failCount} فاتورة.`);
};
// ==========================================
// أداة البحث عن الفواتير المفقودة
// ==========================================

// ==========================================
// أداة إصلاح تواريخ الفواتير (لحل مشكلة الاختفاء من التقرير)
// ==========================================

// ==========================================
// ==========================================
// 1. دالة الحفظ الشامل للسحابة (القلب النابض) - نسخة متزامنة حقيقية مع حماية ضد الفقدان وإشعار صريح
// ==========================================
window._pendingCloudSave = null;
window._pendingSaveResolvers = [];
window.isSavingDataLock = false;
window.hasUnsavedChanges = false;
window._saveRetryCount = 0;
window._saveRetryTimer = null;

function updateCloudSaveStatus(status, message) {
    const statusEl = document.getElementById('cloud-save-status') || document.getElementById('global-message');
    if (!statusEl) return;
    if (status === 'saving') {
        statusEl.textContent = message || "جاري المزامنة مع السحابة...";
        statusEl.className = 'section-message';
        statusEl.style.display = 'block';
        statusEl.style.color = '#1d4ed8';
        statusEl.style.backgroundColor = '#eff6ff';
        statusEl.style.borderColor = '#93c5fd';
    } else if (status === 'success') {
        statusEl.textContent = message || "تم الحفظ السحابي بنجاح ✓";
        statusEl.className = 'section-message success-message';
        statusEl.style.display = 'block';
        statusEl.style.color = '#15803d';
        statusEl.style.backgroundColor = '#f0fdf4';
        statusEl.style.borderColor = '#86efac';
        clearTimeout(window._saveStatusClearTimer);
        window._saveStatusClearTimer = setTimeout(() => {
            if (statusEl.textContent.includes('✓')) {
                if (statusEl.style) statusEl.style.display = 'none';
                statusEl.textContent = '';
                if (statusEl.classList && typeof statusEl.classList.remove === 'function') statusEl.classList.remove('visible');
                if (statusEl.style && typeof statusEl.style.removeProperty === 'function') {
                    statusEl.style.removeProperty('color');
                    statusEl.style.removeProperty('background-color');
                    statusEl.style.removeProperty('border-color');
                } else if (statusEl.style) {
                    statusEl.style.color = '';
                    statusEl.style.backgroundColor = '';
                    statusEl.style.borderColor = '';
                }
            }
        }, 2500);
    } else if (status === 'error') {
        statusEl.textContent = message || "⚠️ تعذر الحفظ السحابي: تأكد من الاتصال بالإنترنت (سيتم المحاولة تلقائياً)";
        statusEl.className = 'section-message error-message';
        statusEl.style.display = 'block';
        statusEl.style.color = '#b91c1c';
        statusEl.style.backgroundColor = '#fef2f2';
        statusEl.style.borderColor = '#fca5a5';
    }
}

async function _executeCloudSave() {
    if (window.isSavingDataLock) {
        window._saveQueuedDuringWrite = true;
        return;
    }

    window.isSavingDataLock = true;
    updateCloudSaveStatus('saving');
    const currentResolvers = [...window._pendingSaveResolvers];
    window._pendingSaveResolvers = [];

    try {
        const saveResult = await _internalSaveSystemToCloud();
        if (saveResult !== true) {
            const err = new Error('لم يتم الحفظ الفعلي في السحابة.');
            err.code = 'SAVE_REJECTED';
            throw err;
        }
        window.hasUnsavedChanges = false;
        window._saveRetryCount = 0;
        clearTimeout(window._saveRetryTimer);
        window._saveRetryTimer = null;
        updateCloudSaveStatus('success');
        currentResolvers.forEach(r => {
            try { r.resolve(true); } catch(e) {}
        });
    } catch (err) {
        window.hasUnsavedChanges = true;
        console.error("❌ فشل الحفظ في السحابة:", err);
        const errMsg = err?.message || 'خطأ في الاتصال';
        const isNonRetryable = Boolean(
            err?.noRetry || 
            err?.code === 'SESSION_LOCKED' || 
            err?.code === 'NOT_LOGGED_IN' || 
            err?.code === 'LOAD_FAILED' ||
            err?.code === 'SERIALS_LOAD_FAILED'
        );

        const statusMsg = isNonRetryable
            ? `⚠️ لم يُحفظ في السحابة (${errMsg})`
            : `⚠️ تعذر الحفظ السحابي (${errMsg}). البيانات محفوظة محلياً وجاري إعادة المحاولة تلقائياً.`;

        updateCloudSaveStatus('error', statusMsg);
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(`تنبيه: ${errMsg}`, true);
        }

        // تنظيف مؤشر المزامنة المؤقت إن وُجد
        const syncMsgEl = document.getElementById('global-message');
        if (syncMsgEl && syncMsgEl.textContent === "جاري المزامنة...") {
            syncMsgEl.textContent = "";
            syncMsgEl.classList.remove('visible');
        }

        // جدولة إعادة المحاولة فقط في حالة أخطاء الشبكة، وليس عند رفض الجلسة أو عدم تسجيل الدخول أو فشل التحميل
        if (!isNonRetryable) {
            window._saveRetryCount = (window._saveRetryCount || 0) + 1;
            const retryDelay = Math.min(20000, 3000 * Math.pow(1.5, window._saveRetryCount - 1));
            clearTimeout(window._saveRetryTimer);
            window._saveRetryTimer = setTimeout(() => {
                if (window.hasUnsavedChanges && !window.isSavingDataLock) {
                    console.log(`[Cloud Retry] إعادة محاولة الحفظ السحابي تلقائياً (محاولة #${window._saveRetryCount})...`);
                    saveSystemToCloud({ immediate: true }).catch(() => {});
                }
            }, retryDelay);
        } else {
            clearTimeout(window._saveRetryTimer);
            window._saveRetryTimer = null;
        }

        currentResolvers.forEach(r => {
            try { r.reject(err); } catch(e) {}
        });
    } finally {
        window.isSavingDataLock = false;
        window._pendingCloudSave = null;
        if (window._saveQueuedDuringWrite) {
            window._saveQueuedDuringWrite = false;
            saveSystemToCloud({ immediate: true }).catch(() => {});
        }
    }
}

function saveSystemToCloud(options = {}) {
    window.hasUnsavedChanges = true;

    return new Promise((resolve, reject) => {
        window._pendingSaveResolvers.push({ resolve, reject });

        if (options && options.immediate) {
            if (window._pendingCloudSave) {
                clearTimeout(window._pendingCloudSave);
                window._pendingCloudSave = null;
            }
            _executeCloudSave();
        } else {
            if (!window._pendingCloudSave) {
                window._pendingCloudSave = setTimeout(() => {
                    _executeCloudSave();
                }, 600);
            }
        }
    });
}
window.saveSystemToCloud = saveSystemToCloud;

// إعادة المحاولة فوراً عند عودة اتصال الإنترنت
window.addEventListener('online', () => {
    console.log("🌐 تم استعادة اتصال الإنترنت. جاري مزامنة التغييرات المعلقة...");
    if (window.hasUnsavedChanges || window._pendingCloudSave) {
        saveSystemToCloud({ immediate: true }).catch(e => console.error("Online sync error:", e));
    }
});

async function _internalSaveSystemToCloud() {
    if (window._loadFailed || window._serialsLoadFailed) {
        console.warn('الحفظ متوقف: فشل تحميل البيانات السابقة أو السيريالات');
        const err = new Error('فشل تحميل البيانات السابقة، تم إيقاف الحفظ لمنع مسح أو تلف البيانات.');
        err.code = window._serialsLoadFailed ? 'SERIALS_LOAD_FAILED' : 'LOAD_FAILED';
        err.noRetry = true;
        throw err;
    }
    if (window.lastSyncedProductsState === null && typeof window.initDualWriteState === 'function') {
        window.initDualWriteState();
    }
    if (typeof window.syncDualWriteToDB === "function") await window.syncDualWriteToDB();
    // التحقق من وجود مستخدم
    if (!window.currentUser) {
        console.warn('الحفظ متوقف: لم يتم تسجيل الدخول');
        const err = new Error('لم يتم تسجيل الدخول، لا يمكن الحفظ في السحابة.');
        err.code = 'NOT_LOGGED_IN';
        err.noRetry = true;
        throw err;
    }

    const canWrite = (window.SessionGuard && typeof window.SessionGuard.assertCanWrite === 'function')
        ? await window.SessionGuard.assertCanWrite()
        : true;
    if (!canWrite) {
        const err = new Error('تم فتح جلسة نشطة من جهاز آخر أو انتهت صلاحية الجلسة. الحفظ متوقف لمنع تضارب البيانات.');
        err.code = 'SESSION_LOCKED';
        err.noRetry = true;
        throw err;
    }
    const userId = window.currentUser.uid;
    
    // تحديد تاريخ اليوم للعمليات
    const dateStr = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) ? currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
    
    // إظهار مؤشر حفظ صغير (اختياري)
    const statusEl = document.getElementById('global-message');
    if(statusEl && !statusEl.textContent) {
        statusEl.textContent = "جاري المزامنة...";
        statusEl.style.color = "blue";
        statusEl.classList.add('visible');
    }

    // تجهيز كائن البيانات الكامل (Snapshot)
    const systemState = {
        month: dateStr.substring(0, 7),
        products: products || [],
        suppliers: suppliers || [],
        accounts: accounts || [],
        expenses: expenses || 0,
        recordedLosses: recordedLosses || 0,
        debtors: debtors || [],
        debtorProfiles: debtorProfiles || [],
        debtCollectionNotes: debtCollectionNotes || [],
        liabilities: liabilities || [],
        monthlyLiabilities: monthlyLiabilities || [],
        pendingSales: pendingSales || [], // يشمل العربونات
        salesToday: salesToday || [],
        purchaseInvoices: purchaseInvoices || [],
        purchaseReturns: purchaseReturns || [],
        pendingPurchases: pendingPurchases || [],
        completedReturns: completedReturns || [],
        pendingReturns: pendingReturns || [],
        pendingReturnsValue: (typeof pendingReturnsValue !== 'undefined') ? pendingReturnsValue : 0,
        liquidityLog: liquidityLog || [],
        serialNumbersLog: serialNumbersLog || [],
        inboxTasks: inboxTasks || [],
        pendingOrders: window.pendingOrders || [],
        profit: totalProfit || 0,
        log: operationLog || [], // سجل العمليات
        
        savedAt: new Date().toISOString(),
        savedForDate: dateStr
    };

    // 🛡️ حارس حماية الحفظ السحابي من انكماش أو تفريغ البيانات الحرجة
    if (window.SaveGuard && typeof window.SaveGuard.canSaveState === 'function') {
        if (!window.SaveGuard.canSaveState(systemState)) {
            console.error('[Cloud Guard] تم إلغاء عملية الحفظ لمنع تفريغ أو انكماش البيانات الحرجة.');
            const err = new Error('تم منع الحفظ السحابي لأن إحدى مجموعات البيانات الأساسية أصبحت فارغة أو تعرضت لانكماش حرج.');
            err.code = 'SAVE_GUARD_BLOCKED';
            err.noRetry = true;
            throw err;
        }
    }

    // 🛡️ [مشكلة 3]: نقل وتفريغ السيريالات إلى وحدة التخزين المنفصلة FinanceDB لتخفيض حجم المستند إلى أقل من 200KB
    const rawSerials = serialNumbersLog || [];
    const rawStandalone = typeof window.getStandaloneSerials === 'function' ? window.getStandaloneSerials() : (window._tempStandaloneSerials || []);
    if (window.FinanceDB && typeof window.FinanceDB.saveSerialsData === 'function') {
        try {
            await window.FinanceDB.saveSerialsData(rawSerials, rawStandalone);
            systemState.serialNumbersLog = [];
            systemState.standaloneSerials = [];
            systemState._serialsOffloaded = true;
            systemState._serialsCount = rawSerials.length;
            console.log(`[Cloud Guard] تم فصل السيريالات (${rawSerials.length}) وتفريغها من المستند لتقليص الحجم.`);
        } catch(serErr) {
            console.error("❌ [Cloud Guard] فشل حفظ السيريالات المنفصلة:", serErr);
            const err = new Error(`فشل حفظ بيانات السيريالات: ${serErr.message || serErr}`);
            err.code = 'SERIALS_SAVE_FAILED';
            throw err;
        }
    }

    // تنظيف البيانات (إزالة القيم غير المعرفة وحساب حجم المستند بدقة)
    let stateString = JSON.stringify(systemState);
    let docSizeBytes = (typeof Blob !== 'undefined') ? new Blob([stateString]).size : (typeof Buffer !== 'undefined' ? Buffer.byteLength(stateString, 'utf8') : stateString.length);
    const MAX_SAFE_DOC_SIZE = 920000; // ~900 KB (حد أمان صلب يمنع رفض Firestore وفشل الحفظ عند 1MB)
    const WARN_DOC_SIZE = 700000;     // ~685 KB (حد التحذير المبكر)

    // تقليم ذكي احترازي للسجلات التاريخية اللحظية إذا اقترب المستند من حد الأمان مع أرشفة سحابية مسبقة
    if (docSizeBytes > WARN_DOC_SIZE) {
        console.warn(`[Cloud Guard] حجم المستند كبير (${(docSizeBytes / 1024).toFixed(1)} KB). جاري فحص الأرشفة الآمنة للسجلات التاريخية...`);
        let wasPruned = false;
        
        // 1. أرشفة وتقليم سجل العمليات اللحظية (الاحتفاظ بأحدث 150 عملية ونقل الأقدم للأرشيف)
        if (Array.isArray(systemState.log) && systemState.log.length > 150) {
            const oldLogs = systemState.log.slice(0, systemState.log.length - 150);
            try {
                if (window.FinanceDB && typeof window.FinanceDB.archiveLogEntries === 'function') {
                    await window.FinanceDB.archiveLogEntries(oldLogs);
                    systemState.log = systemState.log.slice(-150);
                    wasPruned = true;
                    console.log(`[Cloud Guard] تم أرشفة ${oldLogs.length} سجل عمليات إلى archive_log بنجاح.`);
                } else {
                    console.warn('[Cloud Guard] تعذر تقليم سجل العمليات: دالة الأرشفة غير متاحة.');
                }
            } catch (archiveErr) {
                console.error('❌ [Cloud Guard] فشلت أرشفة سجل العمليات. تم إلغاء التقليم لحماية البيانات:', archiveErr);
            }
        }
        
        // 2. أرشفة وتقليم سجل السيولة اللحظية (الاحتفاظ بأحدث 150 حركة ونقل الأقدم للأرشيف المالي)
        // 🛡️ قاعدة أمان صارمة: عدم تقليم liquidityLog إطلاقاً إلا بعد نجاح الأرشفة السحابية
        if (Array.isArray(systemState.liquidityLog) && systemState.liquidityLog.length > 150) {
            const oldLiquidity = systemState.liquidityLog.slice(0, systemState.liquidityLog.length - 150);
            try {
                if (window.FinanceDB && typeof window.FinanceDB.archiveLiquidityEntries === 'function') {
                    await window.FinanceDB.archiveLiquidityEntries(oldLiquidity);
                    systemState.liquidityLog = systemState.liquidityLog.slice(-150);
                    wasPruned = true;
                    console.log(`[Cloud Guard] تم أرشفة ${oldLiquidity.length} حركة سيولة إلى archive_liquidity بنجاح.`);
                } else {
                    console.warn('[Cloud Guard] تعذر تقليم سجل السيولة: دالة الأرشفة غير متاحة.');
                }
            } catch (archiveErr) {
                console.error('❌ [Cloud Guard] فشلت أرشفة سجل السيولة. تم إلغاء التقليم منعاً لضياع التاريخ المالي:', archiveErr);
            }
        }

        if (wasPruned) {
            stateString = JSON.stringify(systemState);
            docSizeBytes = (typeof Blob !== 'undefined') ? new Blob([stateString]).size : (typeof Buffer !== 'undefined' ? Buffer.byteLength(stateString, 'utf8') : stateString.length);
            console.log(`[Cloud Guard] تم تقليم وأرشفة السجلات بأمان؛ الحجم بعد التقليم: ${(docSizeBytes / 1024).toFixed(1)} KB`);
            if (typeof showGlobalMessage === 'function') {
                showGlobalMessage('تمت أرشفة السجلات التاريخية الزائدة بالسحابة بأمان لتوفير المساحة.', false);
            }
        }
    }

    // فحص حد الأمان الصلب (Circuit Breaker)
    if (docSizeBytes > MAX_SAFE_DOC_SIZE) {
        const sizeKB = (docSizeBytes / 1024).toFixed(1);
        const errMsg = `⚠️ تم إيقاف الحفظ: حجم المستند (${sizeKB} KB) تجاوز حد الأمان الأقصى لـ Firestore (900 KB). تم إيقاف العملية لمنع رفض السحابة وتلف البيانات. يرجى أرشفة السيريالات القديمة أو تصدير نسخة احتياطية.`;
        if (typeof showMessage === 'function') {
            showMessage(errMsg, 'error');
        } else if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(errMsg, true);
        }
        console.error(`❌ [Cloud Guard] ${errMsg}`);
        throw new Error(errMsg);
    } else if (docSizeBytes > WARN_DOC_SIZE) {
        const sizeKB = (docSizeBytes / 1024).toFixed(1);
        if (typeof showMessage === 'function') {
            showMessage(`حجم مستند اليوم يقترب من الحد الأقصى (${sizeKB} KB / 900 KB). يرجى تقليص السجلات قريباً أو تصدير البيانات.`, 'warning');
        }
    }

    const sanitizedState = JSON.parse(stateString);

    if (typeof window.measureDocumentSize === 'function') { window.measureDocumentSize(sanitizedState); }

    try {
        // 1. حفظ بيانات اليوم في مجموعة الأيام
        await window.setDoc(window.doc(window.db, "users", userId, "days", dateStr), sanitizedState, { merge: true });
        
        // 2. بناء كائن الملخص الخفيف (latestBalances) بدون السجلات اليومية الزائلة لتوفير المساحة ومنع التضخم المزدوج
        const latestBalancesData = {
            ...sanitizedState,
            salesToday: [],
            purchaseInvoices: [],
            completedReturns: [],
            expenses: 0,
            profit: 0,
            log: Array.isArray(sanitizedState.log) && sanitizedState.log.length > 0 ? [sanitizedState.log[sanitizedState.log.length - 1]] : [],
            liquidityLog: Array.isArray(sanitizedState.liquidityLog) && sanitizedState.liquidityLog.length > 0 ? [sanitizedState.liquidityLog[sanitizedState.liquidityLog.length - 1]] : [],
            lastUpdated: new Date().toISOString()
        };

        const todayStr = typeof getTodayDateString === 'function' ? getTodayDateString() : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
        if (dateStr === todayStr) {
            if (isStateMeaningful(latestBalancesData)) {
                await window.setDoc(
                    window.doc(window.db, "users", userId, "summaries", "latestBalances"),
                    latestBalancesData,
                    { merge: true }
                );
            } else {
                console.log("تم تجاهل تحديث latestBalances لأن البيانات الحالية فارغة أو مصفرة.");
            }
        } else {
            console.log("تم منع التحديث الكامل، سيتم حساب وتطبيق الفروقات."); 
            await processSmartDeltaRollover(sanitizedState, dateStr);
        }

        console.log("✅ تمت المزامنة السحابية بنجاح.");
        if (window.SaveGuard && typeof window.SaveGuard.recordLoadedState === 'function') {
            window.SaveGuard.recordLoadedState(sanitizedState);
        }
        
        // إخفاء مؤشر الحفظ
        if(statusEl && statusEl.textContent === "جاري المزامنة...") {
            statusEl.textContent = "تم الحفظ ✓";
            statusEl.style.color = "green";
            setTimeout(() => { 
                statusEl.textContent = ""; 
                statusEl.classList.remove('visible'); 
            }, 1500);
        }

        return true;

    } catch (error) {
        console.error("❌ فشل المزامنة التلقائية داخل _internalSaveSystemToCloud:", error);
        throw error;
    }
}
// ==========================================
// أداة تنظيف ملف اليوم من بيانات الأيام السابقة (Fix Carry Over Error)
// ==========================================
window.cleanCurrentDayData = async function() {
    if (!window.currentUser) {
        alert("يجب تسجيل الدخول أولاً.");
        return;
    }

    if (window.SessionGuard && typeof window.SessionGuard.assertCanWrite === 'function') {
        const canWrite = await window.SessionGuard.assertCanWrite();
        if (!canWrite) return;
    }

    // 1. تحديد تاريخ اليوم الحالي المفتوح في البرنامج
    const targetDate = currentLoadedDate || (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));
    
    // رسالة تأكيد حاسمة
    if (!confirm(`أنت الآن بصدد تنظيف ملف يوم (${targetDate}).\n\nسيقوم البرنامج بحذف أي مبيعات أو مصروفات مسجلة بتواريخ "سابقة" لهذا التاريخ (مثل 31-12) والتي انتقلت بالخطأ.\n\nهل أنت متأكد؟`)) return;

    const msgBox = document.getElementById('global-message');
    if(msgBox) showMessage(msgBox, "جاري تنظيف البيانات...", false, true);

    let removedSales = 0;
    let removedPurchases = 0;
    let removedLogs = 0;

    // 2. تنظيف المبيعات (salesToday)
    // نحتفظ فقط بالفواتير التي تحمل نفس تاريخ اليوم، أو التي لا تحمل تاريخاً (نعتبرها جديدة)
    if (salesToday && Array.isArray(salesToday)) {
        const initialCount = salesToday.length;
        salesToday = salesToday.filter(sale => {
            // استخراج التاريخ الصافي (YYYY-MM-DD)
            const sDate = sale.saleDate || (sale.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(sale.timestamp) : new Date(sale.timestamp).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : '');
            return sDate === targetDate;
        });
        removedSales = initialCount - salesToday.length;
    }

    // 3. تنظيف المشتريات (purchaseInvoices)
    if (purchaseInvoices && Array.isArray(purchaseInvoices)) {
        const initialCount = purchaseInvoices.length;
        purchaseInvoices = purchaseInvoices.filter(inv => {
            const pDate = inv.date || (inv.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(inv.timestamp) : new Date(inv.timestamp).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : '');
            return pDate === targetDate;
        });
        removedPurchases = initialCount - purchaseInvoices.length;
    }

    // 4. تنظيف سجل العمليات والمصروفات (operationLog)
    // نحذف السجلات القديمة، لكن نترك سجل "بداية يوم جديد" أو "الترحيل"
    if (operationLog && Array.isArray(operationLog)) {
        const initialCount = operationLog.length;
        operationLog = operationLog.filter(log => {
            const logDate = log.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(log.timestamp) : new Date(log.timestamp).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : '';
            const isSystemLog = log.type && (log.type.includes("ترحيل") || log.type.includes("بداية يوم"));
            return logDate === targetDate || isSystemLog;
        });
        removedLogs = initialCount - operationLog.length;
    }
    
    // ملاحظة: لا نلمس الأرصدة (المخزون، الديون، الخزنة) لأنها تراكمية ويجب أن تبقى.

    // 5. حفظ التغييرات فوراً في السحابة (Update Cloud)
    await saveSystemToCloud();

    // 6. تحديث الواجهة
    updateUI();

    // تقرير النتيجة
    let report = `✅ تمت عملية التنظيف لملف ${targetDate} بنجاح.\n\n`;
    report += `��️ تم حذف ${removedSales} فاتورة بيع قديمة.\n`;
    report += `��️ تم حذف ${removedPurchases} فاتورة شراء قديمة.\n`;
    report += `��️ تم حذف ${removedLogs} سجل قديم.\n\n`;
    report += `الآن تقارير هذا اليوم ستكون نظيفة ودقيقة.`;

    alert(report);
    if(msgBox) showMessage(msgBox, "تم تنظيف اليوم بنجاح.", false);
};

function refreshNamesDatalists() {
    // تحديث قائمة المدينين
    const debtorDatalist = document.getElementById('debtor-names-datalist');
    if (debtorDatalist) {
        const uniqueNames = [...new Set(debtorProfiles.map(p => p.name))];
        debtorDatalist.innerHTML = uniqueNames.map(name => `<option value="${window.escapeHTML(name)}">`).join('');
    }
    // تحديث قائمة الدائنين
    const creditorDatalist = document.getElementById('creditor-names-datalist');
    if (creditorDatalist) {
        const uniqueCreditors = [...new Set(liabilities.map(l => l.name))];
        creditorDatalist.innerHTML = uniqueCreditors.map(name => `<option value="${window.escapeHTML(name)}">`).join('');
    }
}

// 1. دالة تأكيد الإلغاء
// 2. دالة تنفيذ الإلغاء
// 1. دالة تنفيذ الإلغاء

    window.injectLogToMain = function(logObj) { 
        if (typeof operationLog !== 'undefined') if (!logObj.id) logObj.id = generateId("LOG");
    operationLog.push(logObj); 
    };

    // دوال قراءة البيانات الحية

    window.pendingOrders = (typeof pendingOrders !== 'undefined') ? pendingOrders : (window.pendingOrders || []);

    window.currentLoadedDate = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) 
        ? currentLoadedDate : (typeof getCairoDateString === 'function' ? getCairoDateString() : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }));

    window.saveCurrentStateByDate = (typeof saveCurrentStateByDate !== 'undefined') ? saveCurrentStateByDate : null;
    window.updateUI = (typeof updateUI === 'function') ? updateUI : null;
    window.saveState = (typeof saveStateToHistory === 'function') ? saveStateToHistory : null; 
    window.updateUndoRedoButtons = (typeof updateUndoRedoButtons === 'function') ? updateUndoRedoButtons : null;
    window.calculateTotalCapital = (typeof calculateTotals === 'function') ? calculateTotals : ((typeof window.calculateTotals === 'function') ? window.calculateTotals : null);

    // ���� الإضافة الحاسمة هنا: ربط دالة الحفظ السحابي لكي يقرأها محرك البحث الشامل ����
    window.saveInvoiceToFirestore = (typeof saveInvoiceToFirestore === 'function') ? saveInvoiceToFirestore : null;

    window.refreshMainUI = () => {
        try {
            if (typeof window.updateUI === 'function') window.updateUI();
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderAccounts === 'function') renderAccounts();
            if (typeof renderOperationLog === 'function') renderOperationLog();
            if (typeof window.calculateTotalCapital === 'function') window.calculateTotalCapital();
            if (typeof window.updateUndoRedoButtons === 'function') window.updateUndoRedoButtons();
            
            // تحديث جميع شاشات المبيعات
            if (typeof renderSalesTable === 'function') renderSalesTable();
            if (typeof renderSalesToday === 'function') renderSalesToday();
            if (typeof updateSalesUI === 'function') updateSalesUI();
        } catch (e) { console.error("Error in refreshMainUI:", e); }
    };

    console.log("✅ تم تفعيل جسر ERP V10.5 بنجاح - توافق تام مع البصمة البصرية والأرشيف السحابي");

// --- 1. دوال تحويل الدين ---
    
// ============================================================
// START: Unified Sell Product Modal Logic (Instant Execution Engine)
// ============================================================

// فكرة ذكية لحماية زر تعديل المعلقات القديم: 
// إذا قام المستخدم بالضغط على تعديل معاملة معلقة من الجدول، يفتح المودل تلقائياً ليعدل منه
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('edit-pending-btn')) {
        setTimeout(() => { window.openQuickSellModal(); }, 50);
    }
});

}); // End DOMContentLoaded

// --- showPendingEditHistory (moved from inline HTML) ---

// ==========================================
// حماية إغلاق ومغادرة الصفحة ومزامنة الطوارئ (Session & Unload Guard)
// ==========================================
function emergencyStateFlush() {
    // 1. أخذ لقطة طوارئ فورية في الذاكرة المحلية (localStorage)
    try {
        if (typeof createStateSnapshot === 'function') {
            const snap = createStateSnapshot();
            localStorage.setItem('emergency_backup_' + (typeof getTodayDateString === 'function' ? getTodayDateString() : 'latest'), JSON.stringify(snap));
        }
    } catch(err) {
        console.warn("Emergency localStorage snapshot warning:", err);
    }

    // 2. إذا كان هناك حفظ سحابي مجدول أو معلق، قم بتنفيذه فوراً
    if (window._pendingCloudSave || window.hasUnsavedChanges) {
        if (window._pendingCloudSave) {
            clearTimeout(window._pendingCloudSave);
            window._pendingCloudSave = null;
        }
        if (typeof _executeCloudSave === 'function') {
            _executeCloudSave().catch(e => console.warn("Emergency cloud save failed:", e));
        }
    }

    // 3. مسار حفظ التاريخ المجدول إن وجد (من finance-core-logs.js)
    if (window._saveTimeout && typeof window._pendingSaveFunction === 'function') {
        clearTimeout(window._saveTimeout);
        window._saveTimeout = null;
        window._pendingSaveFunction().catch(e => console.warn("Emergency pending save failed:", e));
    }
}

window.addEventListener('beforeunload', (e) => {
    if (window.isSavingDataLock || window._pendingCloudSave || window.hasUnsavedChanges || window._saveTimeout) {
        emergencyStateFlush();
        e.preventDefault();
        e.returnValue = 'توجد تغييرات قيد الحفظ في السحابة. إغلاق الصفحة الآن قد يؤدي إلى فقدان أحدث البيانات. هل أنت متأكد من الإغلاق؟';
        return e.returnValue;
    }
});

// حماية المتصفحات على الهواتف والأجهزة الذكية عند إخفاء التبويب أو قفل الشاشة
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        emergencyStateFlush();
    }
});

window.addEventListener('pagehide', () => {
    emergencyStateFlush();
});

// ==========================================
// Purchase Returns Logic
// ==========================================
let currentPurchaseReturnInvoice = null;

const prRefundMethod = document.getElementById('pr-refund-method');
if (prRefundMethod) {
    prRefundMethod.addEventListener('change', checkCashOptions);
}

const closePrBtn = document.getElementById('closePurchaseReturnModal');
const cancelPrBtn = document.getElementById('cancelPurchaseReturnBtn');
if (closePrBtn) closePrBtn.addEventListener('click', () => document.getElementById('purchaseReturnModal').classList.add('hidden'));
if (cancelPrBtn) cancelPrBtn.addEventListener('click', () => document.getElementById('purchaseReturnModal').classList.add('hidden'));

const confirmPrBtn = document.getElementById('confirmPurchaseReturnBtn');
if (confirmPrBtn) confirmPrBtn.addEventListener('click', async () => {
    if (!currentPurchaseReturnInvoice) return;
    const invoice = currentPurchaseReturnInvoice;
    
    let totalReturnVal = 0;
    let itemsReturned = [];
    
    document.querySelectorAll('.pr-return-qty-input').forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            const index = parseInt(input.getAttribute('data-index'));
            const price = parseFloatSafe(input.getAttribute('data-price'));
            totalReturnVal += (qty * price);
            
            const item = invoice.items[index];
            itemsReturned.push({
                ...item,
                returnedQty: qty,
                returnValue: qty * price,
                itemIndex: index
            });
        }
    });
    
    if (totalReturnVal <= 0) {
        showGlobalMessage("يجب تحديد منتج واحد على الأقل للإرجاع.", true);
        return;
    }
    
    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    
    const remainingBalance = parseFloatSafe(invoice.remainingBalance);
    let cashToRefund = 0;
    let appliedToDebt = 0;
    
    if (remainingBalance > 0) {
        if (totalReturnVal <= remainingBalance) {
            appliedToDebt = totalReturnVal;
            invoice.remainingBalance = remainingBalance - appliedToDebt;
        } else {
            appliedToDebt = remainingBalance;
            invoice.remainingBalance = 0;
            cashToRefund = totalReturnVal - remainingBalance;
        }
    } else {
        cashToRefund = totalReturnVal;
    }
    
    // Update supplier debt if applied
    if (appliedToDebt > 0) {
        if (typeof liabilities !== 'undefined') {
            const invLiability = liabilities.find(l => l.purchaseInvoiceId === invoice.id);
            if (invLiability) {
                invLiability.amount = Math.max(0, (Number(invLiability.amount) || 0) - appliedToDebt);
                if (invLiability.amount <= 0.001) liabilities = liabilities.filter(l => l.id !== invLiability.id);
            }
        }
        if (invoice.supplierId) {
            const supplier = suppliers.find(s => s.id === invoice.supplierId);
            if (supplier && supplier.balance !== undefined) {
                supplier.balance = Math.max(0, parseFloatSafe(supplier.balance) - appliedToDebt);
            }
        }
    }
    
    if (cashToRefund > 0) {
        const method = document.getElementById('pr-refund-method').value;
        if (method === 'safe') {
            const accId = document.getElementById('pr-refund-account').value;
            const account = accounts.find(a => a.id === accId);
            if (account) {
                account.balance = parseFloatSafe(account.balance) + cashToRefund;
                const newTotalLiquidity = accounts.reduce((sum, a) => sum + parseFloatSafe(a.balance), 0);
                liquidityLog.push({
                    id: generateId("liq-pr"),
                    timestamp: new Date().toISOString(),
                    type: "add",
                    amount: cashToRefund,
                    description: `استرداد نقدي من مرتجع مشتريات - فاتورة ${invoice.invoiceNumber || invoice.id}`,
                    accountId: account.id,
                    currentBalance: newTotalLiquidity
                });
            }
        } else if (method === 'debt') {
            // Debt ON supplier (owed TO us)
            const supplier = suppliers.find(s => s.id === invoice.supplierId);
            const debtorName = supplier ? supplier.name : "مورد غير محدد";
            
            const newDebt = {
                id: 'debt-' + Date.now(),
                name: debtorName,
                amount: cashToRefund,
                date: typeof getTodayDateString === 'function' ? getTodayDateString() : new Date().toISOString(),
                type: 'debt',
                note: `متبقي مرتجع فاتورة مشتريات رقم ${invoice.invoiceNumber || invoice.id}`
            };
            if (typeof debtors !== 'undefined') {
                debtors.push(newDebt);
                
                // Add profile
                let profile = typeof debtorProfiles !== 'undefined' ? debtorProfiles.find(p => String(p.name).trim() === String(debtorName).trim()) : null;
                if (!profile && typeof debtorProfiles !== 'undefined') {
                    profile = { id: 'dp-' + Date.now(), name: debtorName, phone: '', address: '', notes: '' };
                    debtorProfiles.push(profile);
                }
            }
        }
    }
    
    // Deduct inventory
    itemsReturned.forEach(ret => {
        const productIndex = products.findIndex(p => (ret.id && p.id === ret.id) || (p.name && p.name.toLowerCase() === (ret.name || '').toLowerCase()));
        if (productIndex !== -1) {
            products[productIndex].quantity = Math.max(0, Number(products[productIndex].quantity || 0) - Number(ret.returnedQty));
        }
        
        // Mark inside invoice
        invoice.items[ret.itemIndex].returnedQuantity = (invoice.items[ret.itemIndex].returnedQuantity || 0) + ret.returnedQty;
    });
    
    // Add to purchaseReturns log
    purchaseReturns.push({
        id: 'pr-' + Date.now(),
        invoiceId: invoice.id,
        supplierId: invoice.supplierId,
        date: new Date().toISOString(),
        totalValue: totalReturnVal,
        appliedToDebt: appliedToDebt,
        cashRefunded: cashToRefund,
        items: itemsReturned.map(i => ({ id: i.id, name: i.name, qty: i.returnedQty, price: (i.cost !== undefined ? i.cost : i.costPrice) }))
    });
    
    if (typeof saveStateToHistory === 'function') saveStateToHistory();
    if (typeof saveSystemToCloud === 'function') await saveSystemToCloud();
    if (typeof updateUI === 'function') updateUI();
    
    document.getElementById('purchaseReturnModal').classList.add('hidden');
    if (typeof showGlobalMessage === 'function') showGlobalMessage("تم إرجاع المنتجات وتحديث الأرصدة بنجاح.");
});

