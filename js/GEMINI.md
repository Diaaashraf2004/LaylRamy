# Windows PowerShell Encoding (Arabic Support)
- **CRITICAL**: This project contains files with Arabic characters. When using PowerShell commands (like `Get-Content`, `Select-String`, `Set-Content`, `Add-Content`) on this Windows machine, you MUST explicitly use the `-Encoding UTF8` flag.
- Default Windows PowerShell encodings will corrupt the files with Mojibake (e.g., turning Arabic into `?` or `ￂ`).
- Whenever possible, prefer using built-in agent tools like `replace_file_content`, `write_to_file`, and `view_file` instead of shell commands for text manipulation to avoid encoding risks entirely.

# State Management Architecture (finance-core.js)
- **CRITICAL**: The application manages global state primarily in `finance-core.js`.
- If you introduce a new global state variable (e.g., arrays or objects like `standaloneSerials`, `pendingOrders`), you MUST register it in two places:
  1. `saveSystemToCloud`: Add it to the `systemState` payload so it is saved to Firebase.
  2. `loadState`: Restore the variable from the passed `data` object upon load.
- Missing either of these steps will result in data loss upon reloading the page or starting a new day.
- **Global Scope Caution**: The vast majority of `finance-core.js` is wrapped inside a `DOMContentLoaded` event listener. Any variables declared with `let` or `const` inside this block are NOT global. If you append scripts at the end of the file (outside the block) that need to access these variables, you must expose them (e.g., via a getter `window.getMyVar = () => myVar;`) rather than trying to access them directly.

# Finance App Domain Rules & Architecture

When working on this finance application, ALWAYS adhere to these business logic and state management rules:

## 1. Capital & Balances Architecture
- **Capital Formula**: `Total Capital = (Liquidity + Inventory + Consignment + Debts) - Liabilities`.
- **Liabilities**: The `amount` property of a liability is the ultimate source of truth. Changes to `amount` mathematically impact the Expected Capital. 
- **Deduction History**: The `history` array inside a liability is ONLY an audit trail for the deductions module. Do not assume `amount` equals the sum of `history`, as manual additions, payments, and offsets modify `amount` without altering `history`.

## 2. Pending Sales & State Transitions
- **Status Flag**: When converting or confirming a pending sale (e.g., in `convertPendingSaleToDebt`), you MUST explicitly set `status: 'completed'`. If you spread the original pending sale data (`...saleData`), it will inherit `status: 'pending'`, which will cause validation guards (like `applyDeduction`) to fail or ignore the confirmed sale.
- **Deduction Guards**: `applyDeduction` ignores sales with `status: 'pending'` to prevent premature liability inflation.

## 3. Data Integrity & Timestamps
- When updating an existing record (especially liabilities or debts), update `lastUpdated` (or `timestamp`) and NEVER overwrite `createdAt` with the current time.

# Modular Development Policy
- في أي تطوير أو إضافات قادمة، لا تقم بإضافة الكود إلى الملفات الكبيرة (مثل finance-core.js). بدلاً من ذلك، قم دائماً بإنشاء ملفات جديدة وتقسيم الكود برمجياً لتسهيل الصيانة (Modular Architecture).
