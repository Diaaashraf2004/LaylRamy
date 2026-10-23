# قسم سجلات العمليات والنسخ الاحتياطي (Logs & History Department)

## 📁 هيكل المجلد
يحتوي مجلد `js/logs/` على الوحدات البرمجية المسؤولة عن تسجيل عمليات النظام وحركاته، سجلات الأقسام المختلفة، وإدارة النسخ الاحتياطي واستعادة الحالة اليومية وحالات الطوارئ:

1. **`logs-operation.js`** (~226 سطر):
   - تنسيق الوقت والشارات للعمليات (`formatLogTime`, `getLogBadge`).
   - تصفية وعرض إحصائيات السجل العام (`setLogCategory`, `updateLogStats`, `updateLogDisplay`).
   - نوافذ تفاصيل العمليات ومسح السجل (`openDetailModal`, `closeDetailModal`, `openClearLogModal`, `closeClearLogModal`, `clearLogConfirm`).
   - تصدير سجل العمليات بصيغة CSV (`exportCSVLog`).

2. **`logs-backup.js`** (~328 سطر):
   - حفظ حالة اليوم المحددة مع استدعاء حارس الأمان (`saveCurrentStateByDate`).
   - إدارة نافذة سجل النسخ الاحتياطية وتاريخ الحفظ (`openBackupHistoryModal`, `closeBackupHistoryModal`).
   - معالجة أحداث الاستعادة الفورية للنسخ السابقة عبر Event Delegation.

3. **`logs-daily-state.js`** (~349 سطر):
   - تبديل وتفعيل وضع الحفظ التلقائي (`toggleAutoSave`).
   - محرك تحميل واسترجاع بيانات الأيام السابقة سحابياً ومحلياً (`loadDataForDate`).
   - فحص وجود النسخ الاحتياطية الاحتياطية وظلال البيانات وقت الطوارئ (`checkEmergencyBackupAvailability`).
   - استعادة البيانات تلقائياً عند انهيار النظام وفقدان الجلسة (`restoreFromEmergencyBackup`).

4. **`logs-department.js`** (~151 سطر):
   - إدارة وتصفية السجلات التاريخية الخاصة بالأقسام الفردية (`currentDeptLogCategory`).
   - فتح وإغلاق الخط الزمني لسجلات الأقسام (`openDeptLogModal`, `closeDeptLogModal`).
   - رندر الخط الزمني التفاعلي لحركات القسم المختار (`renderDeptLogTimeline`).

## 🛡️ معايير الجودة والأمان
- كافة ملفات القسم أقل من 350 سطراً (أقل بكثير من سقف الـ 600 سطر).
- تعقيم كامل لكافة مدخلات السجلات ضد هجمات XSS (`escapeHTML`).
- مطابقة تامة 100% للهاشات المعتمدة مع الـ Baseline.
