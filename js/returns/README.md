# قسم المرتجعات والإلغاءات (Returns Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بإدارة دورة حياة المرتجعات (مبيعات ومشتريات)، إلغاء العمليات، واسترداد العربون، ويشمل:
1. **مرتجعات المبيعات (`returns-sales.js`):**
   - إدارة واجهة تصنيفات المرتجعات والمنتجات (`renderReturnCategoriesUI`, `handleReturnCategoryChange`, `populateReturnProductSelect`, `updateReturnsUI`).
   - معالجة المرتجع اليدوي ومرتجع الفاتورة المعتمدة وتأكيد الاستلام (`handleManualReturn`, `handleInvoiceReturnConfirmation`, `handleConfirmReceipt`, ودوال `restoreSerial` التابعة لها).
2. **إلغاء العمليات واسترداد العربون (`returns-cancellation.js`):**
   - تأكيد وتنفيذ إلغاء الفاتورة واسترداد العربون وإعادة السيريالات للمخزون (`confirmRefundAndCancel`, `executeCancellation`, `restoreCancellationSerials`).
   - أداة تصحيح المرتجعات القديمة وترحيلها لبيعات مؤقتة (`fixMyOldReturns`).
3. **مرتجعات المشتريات والبحث عن فواتير المرتجع (`returns-purchase.js`):**
   - مودال مرتجع المشتريات للموردين وتحديث الإجماليات وخيارات الخزينة (`openPurchaseReturnModal`, `updatePurchaseReturnTotals`, `checkCashOptions`).
   - البحث عن فواتير العميل وتحديد الفاتورة بالمعرف لتسجيل مرتجع مبيعات (`lookupCustomerInvoices`, `selectInvoiceByIdForReturn`, `selectInvoiceForReturn`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `returns-sales.js` | إدارة مرتجعات المبيعات اليدوية وتأكيد استلام المرتجع | ~689 سطر |
| `returns-views.js` | واجهات وبطاقات تفاصيل المرتجع، التكلفة الأصلية وتصفير النموذج | ~596 سطر |
| `returns-cancellation.js` | إلغاء الفواتير ورد العربون واستعادة السيريالات | ~241 سطر |
| `returns-purchase.js` | مرتجعات المشتريات والبحث عن فواتير العملاء للمرتجع | ~261 سطر |
