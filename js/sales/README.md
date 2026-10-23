# قسم المبيعات ونقاط البيع (Sales & POS Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بكافة عمليات البيع، الفواتير، البيع السريع، نقاط البيع (POS)، والبحث في المبيعات، ويشمل:
1. **البيعات المعلقة والمؤقتة والتبويبات (`sales-pending.js`):**
   - عرض وتحديث جدول البيعات المؤقتة، احتساب تكلفة البيعة المؤقتة (تصحيح ضياء المعتمد)، وبدء المرتجع (`updatePendingSalesDisplay`, `calculateSinglePendingSaleCost`, `initiateReturnFromPendingSale`).
   - التحكم في نظام تبويبات المبيعات وشارة العداد الحي وإلغاء وضع التعديل (`switchSalesTab`, `updateSalesPendingBadge`, `inv_cancelEditMode`, `updateInvoiceModeAlert`).
2. **إنشاء وحفظ الفواتير (`sales-invoice.js`):**
   - إضافة بنود الفاتورة وحساب الإجماليات المالية وحفظ الفاتورة بالمعاملات الذرية (`resetInvoiceForm`, `inv_addInvoiceItem`, `formatMoney`, `getInvoiceFormData`, `calculateInvoiceFinancials`, `handleSaveInvoice`, `restoreSaveBtn`).
3. **إجراءات البيعات والبحث برقم الفاتورة (`sales-actions.js`):**
   - معالجة إجراءات البيعات المؤقتة وفتحها في مودال الفاتورة أو للتعديل (`handlePendingSaleActions`, `openPendingSaleInInvoiceModal`, `openPendingSaleForEdit`).
   - البحث برقم الفاتورة لمعالجة المرتجعات (`searchInvoiceByNumber`, `handleInvoiceSearchForReturn`).
4. **البيع السريع والمزامنة (`sales-quick.js`):**
   - بيع منتج مباشر وتحديث البيع المؤقت وحقن المبيعات في الذاكرة ومزامنتها (`resetSellForm`, `sellProduct`, `updatePendingSale`, `injectSaleToMain`).
5. **مودال البيع الموحد ومسودات البيع السريع (`sales-usm.js`):**
   - شبكة أصناف المودال الموحد واحتساب الأرباح اللحظية والإضافة للسلة (`openUnifiedSellModal`, `closeUnifiedSellModal`, `usm_renderProductGrid`, `usm_saveToCart`, `usm_calculateLiveProfit`, `usm_applySelectionToOrigin`).
   - فتح وإغلاق مودال البيع السريع ومسودات البيع (`openQuickSellModal`, `closeQuickSellModal`, `loadInvoiceDraft`, `loadQuickSellDraft`, `saveQuickSellDraft`).
6. **البحث، الإلغاء، والتصحيح (`sales-search.js`):**
   - حذف سجلات البيع واستعادة السيريالات (`deleteSaleRecord`, `processSaleDeletion`, `restoreItemSerials`).
   - البحث بالاسم المباشر وعرض تفاصيل الفاتورة والبيعة المعلقة (`performDirectSearch`, `searchInvoiceByName`, `displaySearchResults`, `viewInvoiceDetails`, `showPendingSaleDetails`).
   - أدوات تشخيص وتصحيح الفواتير والتواريخ (`debugShowAllInvoices`, `fixInvoiceDates`, `fixMissingInvoice`).
7. **نظام نقاط البيع (`sales-pos.js`):**
   - شبكة نقاط البيع التفاعلية، أزرار التصنيفات، النوافذ المنبثقة للتأكيد، وحساب أرباح نقاط البيع (`togglePOSGrid`, `renderPOSQuickGrid`, `renderPOSInvGrid`, `changePOSQtyQuick`, `changePOSQtyInv`, `showConfirmSaleModal`, `closeConfirmSaleModal`, `showPostSaleModal`, `closePostSaleModal`, `calculateQuickSellProfit`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `sales-pending.js` | إدارة البيعات المعلقة والمؤقتة واحتساب التكلفة | ~368 سطر |
| `sales-invoice-stock.js` | التحقق وتخطيط وتنفيذ حركات المخزون والمحجوز للفواتير | ~140 سطر |
| `sales-invoice-view.js` | إدارة دورة حياة واجهة الفاتورة وتبديل الأوضاع والتصفير الشامل | ~180 سطر |
| `sales-invoice.js` | إنشاء وحفظ فواتير المبيعات وحساب القيم المالية | ~583 سطر |
| `sales-actions.js` | إجراءات البيعات المؤقتة والبحث برقم الفاتورة | ~507 سطر |
| `sales-quick.js` | البيع السريع المباشر وتحديث ومزامنة البيعات | ~561 سطر |
| `sales-usm.js` | مودال البيع الموحد وشبكة المنتجات والمسودات | ~324 سطر |
| `sales-search.js` | البحث في المبيعات، حذف السجلات، وتصحيح التواريخ | ~601 سطر |
| `sales-pos.js` | واجهة نقاط البيع (POS) وشبكة الأصناف وتأكيد البيع | ~409 سطر |
