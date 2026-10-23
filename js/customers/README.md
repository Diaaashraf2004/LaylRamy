# قسم العملاء والمتابعة (Customers Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بإدارة بيانات العملاء، كشوف الحسابات، ومتابعة التحصيل، ويشمل:
1. **كشوف حسابات العملاء والدائنين:** فتح وعرض كشف حساب تفصيلي للعميل أو الدائن (`openCustomerStatement`, `openCreditorStatement`, `openCustomerProfile`).
2. **سجل ملاحظات التحصيل (Collection Notes):** فتح نافذة ملاحظات التحصيل، استعراض السجل الزمني، وحفظ الملاحظات التتبعية للعميل (`openCollectionNotesModal`, `renderCollectionNotesHistory`, `saveCollectionNote`).
3. **التحصيل السريع المباشر (Inline Payment):** إظهار نموذج الدفع السريع المباشر وتأكيد سداد جزء من الدين (`toggleInlinePaymentForm`, `handleConfirmInlineDebtPayment`).
4. **خيارات التكاليف الإضافية:** تحديث مربعات اختيار التكاليف الإضافية (`updateAdditionalCostsCheckboxes`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `customers-core.js` | إدارة كشوف حسابات العملاء، سجل ملاحظات التحصيل، والسداد السريع | ~469 سطر |
