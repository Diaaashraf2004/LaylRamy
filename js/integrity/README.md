# قسم سلامة رأس المال والسيولة (`js/integrity/`)

قسم مستقل لمراقبة اتزان رأس المال والسيولة ومنع التضخم أو النقص الوهمي في الدفاتر المحاسبية.

## الملفات
- `integrity-engine.js`: محرك اللقطات المالية (`captureFinancialIntegritySnapshot`)، فحص الفساد الرقمي (`NaN`/`Infinity`)، التتبع التراكمي للفروق الصغيرة (`≤ 1 ج.م`)، المراقب السلبي (`checkPassiveDrift`)، وواجهة `window.FinancialIntegrityGuard`.
- `integrity-checks.js`: فحوصات التدقيق المحاسبي الـ17 (حالة صريحة `passed` / `failed` / `skipped` للبيانات الفارغة، فصل الفحوصات المعلوماتية عن كسر العدّاد).
- `integrity-ui.js`: شريط الحالة المباشر أعلى التطبيق، تنبيه الانحراف الفوري، ونافذة تقرير التدقيق الشامل.

## قواعد العمل
- يلتزم حرفياً بمعادلة رأس المال في `docs/FINANCIAL_FORMULAS_MAP.md` (§2.1) دون تعديلها.
- لا يمسّ أي ملفات في `js/core/` عدا الاستدعاء الاختياري عبر `window.FinancialIntegrityGuard`.
