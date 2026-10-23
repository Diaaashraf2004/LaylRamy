window._loadFailed = true; // DEFAULT STATE: Prevent saves until explicitly loaded successfully
// finance-core-state.js - Global App State
var smartSearchBtn, smartSearchInput, searchResultsListContainer;
var returnProductSelect, returnCostPriceDisplay, confirmManualReturnBtn;
var backupSlotIndex = 0; // متغير جديد لتتبع خانة النسخ الاحتياطي
var MAX_BACKUP_SLOTS = 4; // سنحتفظ بـ 5 نسخ فقط كحد أقصى
var d = id => document.getElementById(id);
var searchInvoiceInput, invoiceSearchResults, searchInvoiceBtn;
var monthlyLiabilitiesList, monthlyLiabilityNameInput, monthlyLiabilityAmountInput, monthlyLiabilityFormTitle, addMonthlyLiabilityButton, cancelEditMonthlyLiabilityButton, monthlyLiabilityMessage; // Helper function
var lsPrefix = "goodsMgmt_data_"; // Define constants FIRST
var lsLastSaveKey = "goodsMgmt_lastSaveDate";
var editingPendingSaleId = null; // To track which pending sale is being edited
var monthlyLiabilities = []; // لتخزين قائمة الالتزامات الشهرية
var editingMonthlyLiabilityId = null; // لمعرفة الالتزام الذي يتم تعديله
var lsLastProcessedMonthKey = "goodsMgmt_lastProcessedMonth"; // مفتاح لتخزين آخر شهر تمت معالجته
        var products = window.products = [];
var returnSourceData = null; // سيخزن بيانات البيع المؤقت عند تحويله لمرتجع
var globalSearchResults = []; // متغير لتخزين نتائج البحث الشامل مؤقتاً
var stateHistory = []; // لتخزين لقطات الحالات السابقة
var redoHistory = [];  // لتخزين الحالات التي تم التراجع عنها
var suppliers = [];
       var accounts = window.accounts = [];
var expenses = 0;
var recordedLosses = 0;
    var debtors = window.debtors = []; // Array of {id, customerId, name, reason, amount, createdAt}
var debtorProfiles = []; // Array of {id, name, phone, address, generalNotes, createdAt}
var debtCollectionNotes = []; // Array of {id, customerId, debtId, note, createdAt, nextFollowUpDate}
var liabilities = []; // Array of {id, name, amount}
        
        // --- Exposing variables for external modules ---
        window.getLiabilities = function() { return liabilities; };
        window.setLiabilities = function(newArr) { liabilities = newArr; };
        window.getTotalProfit = function() { return totalProfit; };
        window.setTotalProfit = function(val) { totalProfit = val; };
        window.getSalesToday = function() { return salesToday; };
        window.getOperationLog = function() { return operationLog; };
        window.setOperationLog = function(arr) { operationLog = arr; };
        // ----------------------------------------------------
var totalProfit = 0;
var operationLog = []; // Array of {timestamp, type, details}
var currentLoadedDate = null; // Stores the YYYY-MM-DD string of the loaded data
       var pendingSales = window.pendingSales = []; // Array of {id, timestamp, customerName, mainProduct{name,qty,cost,supplierId}, additionalItems[{name,qty,cost,supplierId}], totalSellPrice, potentialProfit, status}
var goodsOnConsignmentValue = 0; // Calculated from pendingSales costs
var liquidityLog = []; // Array of {id, timestamp, type['add'/'remove'/'adjust'], amount, description, currentBalance} // Added 'adjust' type
       var salesToday = window.salesToday = []; // Array to store completed sales/invoices for the current day {id, invoiceNumber?, type['quick'/'invoice'/'invoice-from-pending'/'pending-confirmed'], timestamp, customerName, items[{}], totalSellPrice/grandTotal, totalCost, profit, etc.}
var serialNumbersLog = []; // **** لتخزين سجل الأرقام التسلسلية **** Array of {serial, productName, supplierId, addedTimestamp, status: 'in_stock' | 'sold' | 'returned' | 'pending_sale' | 'in_invoice_temp' }
var editingProductName = null; // Name of the product being edited
var editingSupplierId = null; // ID of the supplier being edited
var isInvoiceFromPending = false; // Flag if invoice modal is opened from a pending sale confirmation
var isEditingPendingInvoice = false; // Flag if invoice modal is opened for EDITING a pending invoice
var pendingSaleOriginData = null; // Stores the original pending sale data when confirming with invoice
        
        // --- Expose for external scripts (serials.js) ---
        window.getSerialNumbersLog = () => serialNumbersLog;
        window.getSuppliers = () => typeof suppliers !== 'undefined' ? suppliers : [];
        window.triggerSaveStateToCloud = () => {
            if (typeof saveSystemToCloud === 'function') return saveSystemToCloud(); if (typeof window.saveSystemToCloud === 'function') return window.saveSystemToCloud();
            return Promise.resolve();
        };
        // ------------------------------------------------
var inv_phoneCounter = 1; // Counter for dynamic phone fields in invoice
var currentManagingSerialsProduct = null; // **** لتخزين اسم المنتج الذي يتم إدارة سيريالاته ****
var currentSupplierSerials = []; // **** لتخزين السيريالات المعروضة حالياً للفلترة ****
        // --- Purchase Invoice (PI) Elements ---
var piSupplierSelect, piInvoiceNumberInput, piDateInput, piItemsBody,
    piNoItemsMsg, piItemNameInput, piItemQuantityInput, piItemCostInput,
    piItemSerialsContainer, piItemSerialsTextarea, piAddItemBtn, piItemAddMessage,
    piGrandTotalSpan, piPaidAmountInput, piPaidAmountDisplaySpan, piRemainingBalanceSpan,
    piConfirmBtn, piSaveDraftBtn, piClearFormBtn, piFormMessage,
    piRecentPurchasesList;
var inboxTasks = [];
var currentMonthlySalesData = []; // لتخزين بيانات التقرير التي تم جلبها
var purchaseInvoices = [];
var purchaseReturns = []; // لتخزين فواتير الشراء لليوم الحالي
var pendingPurchases = [];
var completedReturns = []; // <-- ✅ السطر الأول
var pendingReturns = [];   // <-- ✅ السطر الثاني
var pendingReturnsValue = 0; // ✅ أضف هذا السطر هنا

var isAutoSaveEnabled = false;
var autoSaveTimer = null;
var lsAutoSaveKey = "goodsMgmt_autoSaveEnabled"; // مفتاح لحفظ تفضيل المستخدم
var currentLogCategory = 'all';
window.currentLogCategory = 'all';


        // --- تعريف المراجع الأساسية (DOM Element References) ---
        // Declared here, assigned in initializeApp after DOM is ready
var mainNav, contentSections, navButtons, globalMessage, currentDataDateDisplay, currentTimeDisplay,
            summaryLiquidity, summaryInventory, summaryConsignment, summaryDebts,
            summaryLiabilities, summaryExpenses, summaryProfit, summaryCapital,summaryExpectedCapital,
            productList, addProductButton, productNameInput, productQuantityInput,
            productCostPriceInput, productSupplierSelect, productMessage,
            inventoryTotalInventoryValue, inventoryConsignmentValue, inventoryTotalProfit,
            cancelEditProductButton, productFormTitle, productNamesDatalist,
            productDeductLiquidityCheckbox,
            serialNumberEntryContainer, productSerialNumbersTextarea, serialImportMessage, importSerialCsvInput,
            sellProductNameInput, sellCustomerNameInput, sellQuantityInput, sellPriceInput,
            sellButton, sellMessage, additionalCostsContainer, sellPendingCheckbox,
            pendingSalesListContainer, pendingSalesSearchInput, pendingSalesTotalCostSpan, pendingSalesTotalProfitSpan, // <<< جديد: عناصر تحكم المبيعات المؤقتة
            currentLiquidityDisplay, addLiquidityAmountInput,
            addLiquiditySourceInput, addLiquidityButton, removeLiquidityAmountInput,
            removeLiquidityReasonInput, removeLiquidityButton, liquidityMessage,
            liquidityLogListContainer,
            adjustLiquidityAmountInput, adjustLiquidityReasonInput, adjustLiquidityButton, adjustLiquidityMessage, // <<< جديد: عناصر تعديل السيولة
            totalExpensesDisplay, addExpenseInput,
            addExpenseButton, removeExpenseInput, removeExpenseButton, expensesMessage,
            totalDebtsDisplay, debtorNameInput, addDebtReasonInput, addDebtAmountInput,
            debtDeductLiquidityCheckbox, addDebtButton, paymentDebtorSelect, paymentAmountInput,
            receivePaymentButton, debtsMessage, debtorsListContainer, totalLiabilitiesDisplay,
            creditorNameInput, addLiabilityAmountInput, liabilityReceivedCashCheckbox,
            addLiabilityButton, paymentCreditorSelect, liabilityPaymentAmountInput,
            payLiabilityButton, liabilitiesMessage, liabilitiesListContainer,
            offsetDebtorNameInput, offsetCreditorNameInput, offsetAmountInput,
            performTwoPartyOffsetButton, offsetMessage, reportMonthYearInput,
            generateReportButton, reportMessage, salesReportTableBody, reportTotalSales,
            reportTotalCost, reportTotalProfit, operationLogList, clearLogButton,
            saveButtonAlt, loadDateInputAlt, loadDataButtonAlt, loadMessageAlt,
            loadDateDayNameDisplayAlt, printButtonAlt, resetButtonAlt, exportDataButton,
            importFileInput, importMessage, supplierNameInput, supplierContactInput,
            supplierAddressInput, addSupplierButton, cancelEditSupplierButton,
            supplierMessage, supplierList, supplierFormTitle, supplierNamesDatalist,
            searchSupplierSerialNameInput, searchSupplierSerialsBtn, serialSearchMessage, supplierSerialsResultsContainer, filterSerialsContainer, filterSerialsInput,
            inv_modal, inv_openInvoiceModalBtn, inv_closeBtn, inv_closeBtnFooter, inv_invoiceForm,
            inv_customerNameInput, inv_customerAddressInput, inv_phoneNumbersContainer,
            inv_addPhoneBtn, inv_shippingCostInput, inv_totalShippingCostSpan,
            inv_totalGoodsPriceSpan, inv_grandTotalPriceSpan, inv_validationErrorDiv,
            inv_itemNameInput, inv_itemQtyInput, inv_itemPriceInput, inv_addItemBtn,
            inv_itemAddErrorDiv, inv_invoiceItemsBody, inv_printInvoiceBtn,
            inv_deductibleCostsContainer, inv_warrantyInput, inv_notesTextarea,
            inv_saveInvoiceBtn, inv_serialSelectContainer, inv_itemSerialSelect, inv_serialSearchInput,
            manageSerialsModal, modal_productNameDisplay, modal_serialCounts, modal_totalQuantity, modal_registeredCount, modal_unregisteredCount,
            modal_productSerialNumbers, modal_maxSerialsToAdd, modal_serialImportMessage, modal_importSerialCsvInput,
            modal_registeredSerialsList, modal_saveAddedSerialsBtn, modal_closeBtns,
            debtorNamesDatalistOffset, creditorNamesDatalistOffset,
            // Invoice Search Elements
            searchInvoiceNumberInput, searchByNumberBtn, searchCustomerNameInput,
            searchByNameBtn, searchMessageContainer, searchResultsListContainer, partialLiabilityPaymentModal, partialLiabilityPaymentMessage, partialDebtPaymentModal;
            // --- Financial Center (FC) Elements ---
var fc_main_tabs, fc_tab_buttons, fc_tab_contents, fc_month_select, fc_expenses_list,
    fc_products_list, fc_total_expenses_display, fc_preview_container, fc_preview_results,
    fc_manual_container, fc_manual_list, fc_percentage_feedback, fc_percentage_total,
    fc_expenses_wrapper, fc_manual_cost_wrapper, fc_manual_cost_input,
    fc_debt_select, fc_execute_dist_btn, fc_execute_debt_btn, reportSearchInput,
    reportClearSearchBtn,
    salesReportSearchContainer, reportDirectSearchBtn; 
var openBackupHistoryButton, autoBackupMessage, backupHistoryModal, backupHistoryList;
var productCategoryInput, categoryDatalist, inventorySearchInput, inventoryCategoryFilter;
var sellSerialContainer, sellSerialInput, sellSerialsDatalist;
var debtorPhoneInput, debtorAddressInput;
var debtsSearchInput, debtsNotesFilter, debtsSortSelect;
var customerProfileModal, collectionNotesModal, customerStatementModal;
var customerProfileContent, customerStatementContent, collectionNotesHistory;
var collectionNoteText, collectionNoteFollowupDate, saveCollectionNoteBtn, collectionNotesMessage;
var activeCustomerForNotes = null;
