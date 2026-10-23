# قسم الخزينة والسيولة (Treasury Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بإدارة الخزينة وحركات السيولة النقدية والالتزامات الدورية، ويشمل:
1. **سجل السيولة النقدية (`liquidityLog`):** عرض وتحديث حركات الإيداع والسحب والتسوية اليدوية للسيولة (`updateLiquidityLogDisplay`, `adjustLiquidityManually`).
2. **سداد الديون والالتزامات المجمعة (Bulk Payments):** توليد قوائم الديون والالتزامات الصالحة للسداد المجمع وحساب الإجمالي المختار (`renderDebtorPaymentList`, `renderLiabilityPaymentList`, `calculateSelectedTotal`).
3. **الالتزامات الدورية والشهرية (Monthly Liabilities):** إدارة ومتابعة المصروفات والالتزامات الشهرية الثابتة وترحيلها تلقائياً (`updateMonthlyLiabilitiesDisplay`, `resetMonthlyLiabilityForm`, `addOrUpdateMonthlyLiability`, `processMonthlyLiabilities`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `treasury-core.js` | إدارة السيولة النقدية، السداد المجمع، والالتزامات الشهرية | ~253 سطر |
