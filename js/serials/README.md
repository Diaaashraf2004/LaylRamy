# قسم السيريالات وتتبع الأرقام التسلسلية (Serials Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بإدارة وتتبع الأرقام التسلسلية (Serial Numbers) للأجهزة والمنتجات، ويشمل:
1. **متتبع السيريالات المستقل (`serials-tracker.js`):**
   - بيئة معزولة (IIFE) لإدارة جدول السيريالات والبحث والفلترة وحالات البيع والشحن.
   - تعديل بيانات وسجلات السيريالات، إضافة الملاحظات والمتابعة، حذف واستعادة السيريالات (`renderSerialsTable`, `editStandaloneRecord`, `toggleSaleStatus`, `markSoldFinally`, `restoreSoldSerial`).
   - حفظ ومزامنة السيريالات المستقلة مع Firebase و localStorage.
2. **سيريالات الموردين والاستيراد (`serials-supplier.js`):**
   - البحث عن سيريالات مورد محدد وعرض النتائج المفلترة (`searchSerialsBySupplier`, `displayFilteredSupplierSerials`).
   - استيراد وتوليد السيريالات من ملفات CSV وربطها بالمورد والمنتج (`importSerialCSV`).
3. **طرق العرض الاحترافية والبطارية والملاحظات (`serials-views.js`):**
   - التبديل اللحظي بين 3 طرق عرض (جدول تفصيلي، كروت ذكية، وتجميع حسب المورد).
   - فلترة مخصصة للمورد ومستويات شحن البطارية ووجود الملاحظات.
   - نافذة مودال عصرية لكتابة وتعديل الملاحظات بديلة للـ prompt.
   - تعديل فوري لنسبة البطارية ومؤشرات مرئية ملونة مع نسخ السيريال بنقرة واحدة.
4. **قارئ السيريال للموبايل والجسر اللحظي (`serials-scanner.js` و `serials-scanner-ui.js` و `serials-scanner-camera.js`):**
   - ربط لحظي بين الموبايل والكمبيوتر عبر مستند `users/{uid}/settings/live_scan_bridge` في Firestore (بعيداً عن مجموعة `serials` لتفادي التداخل مع `loadAllSerials`).
   - وضع مرافق خفيف للموبايل (`?mode=scanner`) يعمل بالتوازي مع اللابتوب دون تفعيل قفل الجلسة الواحدة `SessionGuard`.
   - طابور استقبال لحظي (`_incomingQueue`) مع منع تسرّب أحداث `keydown` وإلغاء وضع التعديل `cancelSerialEditMode` وفحص وضع الأرشيف وإظهار السيريالات المباعة تلقائياً عند التكرار.
   - تطبيق كاميرا موبايل (`serials-scanner-camera.js`) مع استعادة تلقائية بعد قفل الشاشة (`visibilitychange`) وفحص حقيقي للفلاش (`torchFeature`) وأيقونات PWA PNG حقيقية في `css/`.
   - **الدوال والكائنات العامة:** `SerialScannerBridge`, `SerialScannerUI`, `SerialScannerCamera`, `cancelSerialEditMode`, `serialScanner_normalizeCode`, `serialScanner_findExistingRecord`, `serialScanner_isUrlScannerMode`, `serialScanner_buildShareUrl`, `serialScanner_shouldProcessIncoming`.
   - **المتغيرات العامة المقروءة/المكتوبة:** `window.db`, `window.auth`, `window.currentUser`, `window.appInitialized`, `window._isArchiveBrowsingMode`, `window.getStandaloneSerials`, `window.returnToCurrentDay`, `window.triggerSerialsRefresh`.

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `serials-tracker.js` | متتبع السيريالات المستقل وجدول العرض وتحديث الحالات | ~686 سطر |
| `serials-supplier.js` | البحث عن سيريالات الموردين واستيراد ملفات CSV | ~135 سطر |
| `serials-views.js` | منظومة العرض الاحترافي المتقدم (جدول/كروت/موردين) ومودال الملاحظات | ~534 سطر |
| `serials-scanner.js` | الجسر اللحظي عبر Firebase ومُدير تثبيت التطبيق والوضع المرافق وطابور الاستقبال | ~578 سطر |
| `serials-scanner-ui.js` | واجهة سطح المكتب (زر السيريالات، نافذة QR/التثبيت، نافذة تأكيد الاستلام، CSS المعزول) | ~338 سطر |
| `serials-scanner-camera.js` | تطبيق قارئ كاميرا الموبايل (أندرويد/آيفون، الفلاش، استعادة الكاميرا بعد القفل) | ~465 سطر |

