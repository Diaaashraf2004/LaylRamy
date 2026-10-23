# قسم النواة والبنية الأساسية (Core Infrastructure Department)

## 📁 هيكل المجلد
يحتوي مجلد `js/core/` على النواة المركزية للنظام والبنية الأساسية لقاعدة البيانات والاتصال السحابي وإدارة الحالة والحماية:

1. **`core-firebase.js`** (~141 سطر):
   - تهيئة وإعداد بيئة Firebase وFirestore السحابية.
   - دوال تنظيف وفلترة الحقول من قيم `undefined` غير المقبولة في Firestore (`removeUndefinedFromFirestoreData`) وتطبيقها على `setDoc` و`updateDoc`.

2. **`core-session-guard.js`** (~534 سطر):
   - نظام حماية الجلسة وتأمين الصلاحيات ورمز PIN (`SessionGuard`).
   - قفل الشاشة، التحقق من كلمات المرور، وقطع الاتصال التلقائي عند انتهاء الجلسة.

3. **`core-save-guard.js`** (~98 سطر):
   - حارس الحفظ السحابي وحماية البيانات من الانكماش المفاجئ أو التفريغ الخاطئ (`SaveGuard`).
   - التحقق من تماسك المصفوفات وتوفير ميزة السماح بالانكماش لمرة واحدة بتأكيد المستخدم (`allowShrinkOnce`).

4. **`core-shared.js`** (~523 سطر):
   - الدوال العامة المساعدة المشتركة عبر النظام: تنسيق العملات (`formatCurrency`)، تنظيف النصوص العربية (`normalizeArabicText`)، وتنسيق التواريخ بتوقيت القاهرة (`getCairoDateString`, `formatDateForDisplay`, `formatDateTime`).
   - التعقيم الصارم ضد هجمات حقن النصوص (`escapeHTML`)، وإدارة معاملات الحالة العامة (`createStateTransaction`).

5. **`core-sync.js`** (~150 سطر):
   - محرك المزامنة السحابية الذكي وحل التضارب الزمني (`FinanceSync`).
   - إدارة طوابير الرفع وقفل التعديل أثناء المزامنة.

6. **`core-state.js`** (~156 سطر):
   - تعريف وتهيئة كافة المتغيرات العامة الأساسية للنظام (`products`, `salesToday`, `operationLog`, `liquidityLog`, `customers`, `suppliers`, إلخ).

7. **`core-db.js`** (~674 سطر):
   - طبقة قاعدة البيانات المحلية والسحابية المزدوجة (`FinanceDB`).
   - إدارة المعاملات المعزولة، استعلامات التخزين، المزامنة الثنائية (`syncDualWriteToDB`)، وإصلاح البيانات.

8. **`core-smart-delta.js`** (~153 سطر):
   - خوارزمية حساب الفروق الذكية (Delta Diffing) لرفع التغييرات الطارئة فقط وتقليل استهلاك الحصص السحابية.

9. **`core-diagnostics.js`** (~80 سطر):
   - أدوات فحص وتشخيص تماسك النظام وسلامة الحسابات ومؤشرات الأداء.

10. **`core-helpers.js`** (~497 سطر):
    - أدوات مساعدة عامة لإدارة اليوميات (`clearAndSecureOldData`, `resetAllData`, `addAmountToDefaultAccount`).
    - مولد المعرفات الموحد المشفر (`generateId`).
    - دوال مساعدة لملفات العملاء والديون والرسائل (`showMessage`, `showGlobalMessage`, `updateLoadDateDayName`).

11. **`core-history.js`** (~562 سطر):
    - محرك التراجع والإعادة وسجل الحالات (`createStateSnapshot`, `loadStateFromSnapshot`, `saveStateToHistory`, `undo`, `redo`).
    - تحميل الحالة وإعادة ضبطها وحساب الإجماليات المالية الكبرى (`loadState`, `resetState`, `calculateTotals`).

12. **`core-finance-tx.js`** (~160 سطر):
    - محرك المعاملات المحاسبية الموثوقة والتحقق من سلامة القيود المزدوجة (`FinanceTx`, `verifyAccountingIntegrity`).
    - القراءة الآمنة لمدخلات الـ DOM وعناصر الواجهة (`safeVal`, `safeNum`, `safeOn`, `safeText`).

13. **`core-fc.js`** (~403 سطر):
    - محرك التسويات المالية، توزيع التكاليف الإضافية على البنود، ومعالجة تسويات الديون.

## 🛡️ معايير الجودة والأمان
- كافة ملفات النواة مفككة ومستقلة، ومطابقة 100% لمعايير برومبت المايسترو وهاشات الـ Baseline.
