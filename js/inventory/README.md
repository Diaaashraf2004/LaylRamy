# قسم المخزون والمشتريات (Inventory & Purchases Department)

## 📌 المسؤوليات والوظائف
يختص هذا القسم بإدارة المنتجات، الموردين، فواتير الشراء، وضبط المخزون، ويشمل:
1. **المنتجات والموردين (`inventory-products.js`):**
   - إدارة الموردين (إضافة، تعديل، حذف، وتحديث القائمة) (`resetSupplierForm`, `updateSuppliersListDisplay`, `updateSupplierDropdown`, `addOrUpdateSupplier`, `editSupplier`, `deleteSupplier`).
   - عرض قائمة المخزون وحساب التكاليف وإتاحة الأصناف الحية (`updateProductListDisplay`, `processInventoryAndCosts`, `injectProductToMain`, `getLiveProducts`).
2. **فواتير المشتريات والتكاليف الإضافية (`inventory-purchase.js`):**
   - إضافة وحذف بنود الفاتورة والتحقق من النماذج ومسودات الشراء (`pi_addItem`, `pi_clearForm`, `pi_validateForm`, `pi_saveDraft`, `pi_loadDraft`).
   - تأكيد فاتورة الشراء بالمعاملات الذرية وحركات الخزينة وتحديث المخزون (`pi_confirmPurchaseInvoice`, `updateInventoryFromPurchase`, `handlePendingPurchaseActions`).
   - التكاليف الإضافية وتحديث الإجماليات (الوحدة U-04) (`pi_addExtraCostRow`, `pi_updateTotals`).
3. **أحداث واجهة المستخدم ومستمعات التهيئة (`inventory-ui.js`):**
   - مستمع أحداث `DOMContentLoaded` الخاص بربط أزرار ونماذج المخزون والمشتريات وتغيير طرق الدفع.
4. **ضبط ومراقبة حركة المخزون (`inventory-stock.js`):**
   - ضبط المخزون مع منع القيم السالبة وتسجيل الحركات الرقابية (`adjustStock`).

## 📁 ملفات القسم
| الملف | الوصف | عدد الأسطر |
| :--- | :--- | :--- |
| `inventory-products.js` | إدارة المنتجات والموردين وعرض المخزون | ~258 سطر |
| `inventory-purchase.js` | فواتير المشتريات، التكاليف الإضافية، والمسودات | ~919 سطر |
| `inventory-ui.js` | مستمعات أحداث DOMContentLoaded لأزرار ونماذج المخزون | ~1085 سطر |
| `inventory-stock.js` | ضبط حركة المخزون ومنع السالب (`adjustStock`) | ~27 سطر |
