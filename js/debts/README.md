# قسم الديون والالتزامات (Debts Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بإدارة ديون العملاء والتزامات الموردين وتحويل البيعات المؤقتة لديون وسداد الديون، ويشمل:
1. **قوائم الديون والالتزامات (`debts-list.js`):**
   - عرض وتحديث قوائم المدينين والدائنين (`updateDebtorsListDisplay`, `updateLiabilitiesListDisplay`, `renameLiability`).
   - تحويل الالتزامات بين الدائنين وتحديث القوائم المنسدلة للمقاصة (`openTransferLiabilityModal`, `closeTransferLiabilityModal`, `processLiabilityTransfer`, `updateOffsetDatalists`).
2. **تحويل البيع المؤقت إلى دين (`debts-conversion.js`):**
   - منطق تحويل فاتورة بيع مؤقتة إلى دين عميل مع دعم الربط بدين قائم أو جديد، وخيارات الخزينة والدفع الجزئي (`convertPendingSaleToDebt`, `openConvertPendingSaleToDebtDialog`, `toggleConvertPendingDebtOptions`, `toggleConvertPendingDebtModes`, `confirmConvertPendingSaleToDebt`).
3. **التحصيل والسداد والمقاصة (`debts-collection.js`):**
   - تحويل الديون بين العملاء (`openTransferDebtModal`, `closeTransferDebtModal`, `processTransfer`).
   - تحديد ديون العميل وسدادها دفعة واحدة (`toggleSelectAllDebts`, `updateDebtSelectionTotal`, `paySelectedDebtsForCustomer`).
   - السداد المجمع للديون والنافذة المنبثقة (`openBulkDebtModal`, `closeBulkDebtModal`, `renderBulkDebtList`, `toggleBulkSelectAll`, `confirmBulkDebtPayment`).
   - حذف الديون، المقاصة بين طرفين، ونوافذ السداد الجزئي (`deleteDebtItem`, `closeDeleteDebtRefundModal`, `performTwoPartyOffset`, `openPartialLiabilityPaymentModal`, `closePartialLiabilityPaymentModal`, `openPartialDebtPaymentModal`, `closePartialDebtPaymentModal`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `debts-list.js` | قوائم المدينين والدائنين وتحويل الالتزامات | ~449 سطر |
| `debts-conversion.js` | تحويل البيعات المؤقتة إلى ديون مسجلة | ~471 سطر |
| `debts-collection.js` | تحصيل الديون، السداد المجمع، المقاصة، والسداد الجزئي | ~608 سطر |
