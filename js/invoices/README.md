# قسم الفواتير ومودال البيع (Invoices Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بإدارة إنشاء وتعديل الفواتير ومودالات البيع وإدارة السيريالات المصاحبة، ويشمل:
1. **مودال الفاتورة والتفاعل معها:** فتح وإغلاق مودال الفاتورة، التحقق من صحة المدخلات، وتصفير نموذج المنتجات (`inv_openModal`, `inv_closeModal`, `inv_validateForm`, `resetProductForm`).
2. **حساب إجماليات الفاتورة:** احتساب إجمالي الأصناف، الخصومات، التكاليف القابلة للخصم، وصافي الفاتورة (`inv_calculateTotals`, `inv_updateDeductibleCostsCheckboxes`, `updateGlobalState`).
3. **توزيع وإدارة السيريالات في الفاتورة:** ملء قائمة السيريالات المتاحة، وفتح/إغلاق مودال إدارة وحفظ السيريالات الإضافية (`populateAvailableSerials`, `openManageSerialsModal`, `closeManageSerialsModal`, `saveAddedSerialsFromModal`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `invoices-core.js` | إدارة مودال الفاتورة، حساب الإجماليات، والتحقق من السيريالات | ~647 سطر |
