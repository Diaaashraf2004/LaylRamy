# قسم الاستبدال والطلبات المعلقة (Exchanges & Pending Orders Department)

## 📌 المسؤوليات والوظائف
يختص قسم `js/exchanges/` بإدارة دورة حياة استبدال الأجهزة والبضائع للعملاء، تسوية فروق الأسعار، ومتابعة الطلبات المعلقة متعددة المراحل:
1. **واجهة وتهيئة الاستبدال (`exchanges-ui.js`):**
   - زر ولوحة الاستبدال في شريط التنقل (`initExchangeSystem`, `openExchangePanel`, `renderExchangeUI`, `closeExModals`).
   - جداول ملحقات وإضافات الاستبدال والتعبئة التلقائية للأصناف (`addAccRow`, `autoFillAccRow`, `autoFill`, `updateUIState`).
   - مستمع أحداث التراجع والإعادة والتحديث الفوري (`setupUndoRedoWatcher`, `loadInitialData`).
2. **الحسابات والتنفيذ المالي المباشر (`exchanges-calc.js`):**
   - حساب فرق السعر بين المنتج المرتجع والجديد، رسوم الشحن/المصاريف، وصافي الفرق (`runCalc`, `getSafeV`).
   - تنفيذ حركة الاستبدال الفورية وخصم البضاعة وإضافة المرتجع وتسجيل حركة الخزينة (`executeTransaction`, `triggerUndoSave`, `finalizeSave`).
3. **الطلبات المعلقة والمراحل المتعددة (`exchanges-orders.js`):**
   - عرض وإدارة الطلبات المعلقة والتعديل عليها وإلغاؤها مع رد المخزون وتنظيف الفواتير الشبحية وإلغاء الديون (`renderLocalPendingOrders`, `openExModalEdit`, `openExModalCancel`, `executeEditOrder`, `executeCancelOrder`, `cleanupExchangeInvoice`).
   - تأكيد تسليم واستلام الطلب بالكامل (`confirmPendingOrder`).
   - إدارة المراحل الثلاث المستقلة: خروج البضاعة الجديدة، تحصيل الفلوس، واستلام المرتجع مع توحيد أسماء المدينين (`openStagesModal`, `confirmStage`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر التقريبي |
| :--- | :--- | :--- |
| `exchanges-ui.js` | واجهة المستخدم، تهيئة اللوحة، وجداول البنود | 348 سطر |
| `exchanges-calc.js` | الحسابات المالية، فروق التكلفة، وتنفيذ المعاملات | 330 سطر |
| `exchanges-orders.js` | الطلبات المعلقة، الإلغاء، وتتبع المراحل وتنظيف الفواتير | 578 سطر |

## 🔗 المتغيرات العامة التي يقرأها ويكتبها القسم
- **يقرأ:** `window.products`, `window.accounts`, `window.debtors`, `window.salesToday`, `window.invoices`.
- **يكتب / يعدل:** `window.pendingOrders`, `window.operationLog`, `window.liquidityLog`, `window.targetOrderId`.

## 🛡️ معايير الجودة والأمان
- جميع الملفات أقل من 500 سطر (أقل بكثير من سقف الـ 600 سطر المحدد في المادة 10).
- دوال الـ closures المتداخلة (`processReturn`, `processOut`, `addBack`, `takeOut`, `revertInventoryEffect`) مدمجة داخل دوالها الأم لضمان تماسك النطاق وعدم حدوث أي ReferenceError.
- مطابقة تامة لهاشات الدوال بنسبة 100% مع الـ Baseline.
