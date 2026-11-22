/**
 * js/sales/sales-invoice-stock.js
 * تخطيط وتنفيذ حركات المخزون لفواتير المبيعات واحتساب الكميات المحجوزة
 * -------------------------------------------------------------
 * مصمم طبقاً لدستور مشروع ERP (CONSTITUTION.md):
 * - تخطيط كامل مسبق قبل أي تعديل لمنع النزول تحت الصفر
 * - تنفيذ عبر adjustStock مع رمي Error عند أي فشل لتشغيل الـ rollback
 * - احتساب دقيق للكميات المحجوزة في البيع المؤقت الأصلي
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        const exports = factory();
        root.inv_getOriginReservedQty = exports.inv_getOriginReservedQty;
        root.planInvoiceStockChanges = exports.planInvoiceStockChanges;
        root.executeInvoiceStockChanges = exports.executeInvoiceStockChanges;
    }
}(typeof self !== 'undefined' ? self : this, function () {

    /**
     * استخراج اسم نظيف وموحد للصنف بدون السيريال للمطابقة
     */
    function cleanProductName(name) {
        if (!name) return '';
        return String(name).split(' (S/N:')[0].trim().toLowerCase();
    }

    /**
     * إرجاع الكمية المحجوزة لنفس المنتج في البيعة الأصلية (pendingSaleOriginData)
     * تبحث بالـ ID أولاً ثم بالاسم النظيف
     */
    function inv_getOriginReservedQty(productKey, originData) {
        const sale = (originData !== undefined) ? originData : (typeof window !== 'undefined' ? window.pendingSaleOriginData : null);
        if (!sale) return 0;

        const targetKey = String(productKey || '').trim().toLowerCase();
        if (!targetKey) return 0;

        let totalReserved = 0;

        // دالة مساعدة لمطابقة بند ما
        function matchItem(item) {
            if (!item) return false;
            const itemId = item.id ? String(item.id).trim().toLowerCase() : '';
            const itemName = cleanProductName(item.name);
            return (itemId && itemId === targetKey) || (itemName && itemName === targetKey);
        }

        // 1. فحص بنود الفاتورة التفصيلية
        const items = (sale.items && Array.isArray(sale.items) && sale.items.length > 0)
            ? sale.items
            : ((sale.invoiceData && Array.isArray(sale.invoiceData.items)) ? sale.invoiceData.items : []);
        items.forEach(it => {
            if (matchItem(it)) totalReserved += (it.quantity !== '' && it.quantity != null && !isNaN(it.quantity)) ? Number(it.quantity) : 1;
        });

        // 2. فحص الصنف الرئيسي للبيع السريع
        if (sale.mainProduct && matchItem(sale.mainProduct)) {
            const mpq = sale.mainProduct.quantity;
            totalReserved += (mpq !== '' && mpq != null && !isNaN(mpq)) ? Number(mpq) : 1;
        }

        // 3. فحص التكاليف الإضافية والملحقات المستقطعة
        const deducted = (sale.invoiceData && Array.isArray(sale.invoiceData.deductedItems))
            ? sale.invoiceData.deductedItems
            : (Array.isArray(sale.deductedItems) ? sale.deductedItems : []);
        deducted.forEach(it => {
            if (matchItem(it)) totalReserved += (it.quantity !== '' && it.quantity != null && !isNaN(it.quantity)) ? Number(it.quantity) : 1;
        });

        // 4. فحص الملحقات الإضافية للبيع السريع
        if (Array.isArray(sale.additionalItems) && (!sale.deductedItems || JSON.stringify(sale.deductedItems) !== JSON.stringify(sale.additionalItems))) {
            sale.additionalItems.forEach(it => {
                if (matchItem(it)) totalReserved += (it.quantity !== '' && it.quantity != null && !isNaN(it.quantity)) ? Number(it.quantity) : 1;
            });
        }

        return totalReserved;
    }

    /**
     * التخطيط المسبق لحركات المخزون قبل أي تعديل في الذاكرة
     * يتأكد من أن: (المخزون الحالي + المرتجع من البيعة القديمة) يكفي الخصم المطلوب
     */
    function planInvoiceStockChanges(productList, itemsToDeduct, originData) {
        const products = Array.isArray(productList) ? productList : [];
        const deductions = Array.isArray(itemsToDeduct) ? itemsToDeduct : [];
        const sale = (originData !== undefined) ? originData : (typeof window !== 'undefined' ? window.pendingSaleOriginData : null);

        // دالة مساعدة لتحليل أي بند إلى فهرسه القانوني في مصفوفة products (بالـ ID أولاً ثم بالاسم النظيف)
        function resolveProductIndex(item) {
            if (!item) return -1;
            const idKey = item.id ? String(item.id).trim().toLowerCase() : '';
            const nameKey = cleanProductName(item.name);
            let idx = -1;
            if (idKey) {
                idx = products.findIndex(p => p.id && String(p.id).trim().toLowerCase() === idKey);
            }
            if (idx === -1 && nameKey) {
                idx = products.findIndex(p => cleanProductName(p.name) === nameKey);
            }
            if (idx === -1 && idKey) {
                // fallback لو تم تمرير الاسم في حقل id بالخطأ
                idx = products.findIndex(p => cleanProductName(p.name) === idKey);
            }
            return idx;
        }

        // تجميع الكميات المرتجعة من البيعة القديمة لكل منتج بفهرسه القانوني
        const returnsByIndex = new Map(); // prodIndex -> qty
        if (sale) {
            const oldItems = [];
            if (Array.isArray(sale.items) && sale.items.length > 0) oldItems.push(...sale.items);
            else if (sale.invoiceData && Array.isArray(sale.invoiceData.items)) oldItems.push(...sale.invoiceData.items);
            if (sale.mainProduct) oldItems.push({ ...sale.mainProduct });

            const oldDeducted = (sale.invoiceData && Array.isArray(sale.invoiceData.deductedItems))
                ? sale.invoiceData.deductedItems
                : (Array.isArray(sale.deductedItems) ? sale.deductedItems : []);
            oldItems.push(...oldDeducted);

            if (Array.isArray(sale.additionalItems) && (!sale.deductedItems || JSON.stringify(sale.deductedItems) !== JSON.stringify(sale.additionalItems))) {
                oldItems.push(...sale.additionalItems);
            }

            oldItems.filter(Boolean).forEach(it => {
                const prodIndex = resolveProductIndex(it);
                if (prodIndex !== -1) {
                    const q = (it.quantity !== '' && it.quantity != null && !isNaN(it.quantity)) ? Number(it.quantity) : 1;
                    if (q > 0) {
                        returnsByIndex.set(prodIndex, (returnsByIndex.get(prodIndex) || 0) + q);
                    }
                }
            });
        }

        // تجميع الكميات المطلوب خصمها ورفض أي كميات <= 0
        const deductionsByIndex = new Map(); // prodIndex -> qty
        const invalidItems = [];
        deductions.forEach(it => {
            if (!it) return;
            const q = (it.quantity !== '' && it.quantity != null && !isNaN(it.quantity)) ? Number(it.quantity) : 0;
            if (!Number.isFinite(q) || q <= 0) {
                invalidItems.push(it.name || it.id || 'بند غير معروف');
                return;
            }
            const prodIndex = resolveProductIndex(it);
            if (prodIndex !== -1) {
                deductionsByIndex.set(prodIndex, (deductionsByIndex.get(prodIndex) || 0) + q);
            }
        });

        if (invalidItems.length > 0) {
            return {
                valid: false,
                insufficientItems: [],
                changes: [],
                error: `كمية غير صالحة (يجب أن تكون أكبر من صفر) للأصناف: ${invalidItems.join('، ')}`
            };
        }

        // التحقق من كفاية المخزون لكل المنتجات وتجهيز الحركات
        const changes = [];
        const insufficientItems = [];

        const allIndices = new Set([...returnsByIndex.keys(), ...deductionsByIndex.keys()]);

        allIndices.forEach(prodIndex => {
            const prod = products[prodIndex];
            if (!prod) return;
            const currentStock = Number(prod.quantity) || 0;
            const returnQty = returnsByIndex.get(prodIndex) || 0;
            const deductQty = deductionsByIndex.get(prodIndex) || 0;
            const maxAvailable = currentStock + returnQty;

            if (deductQty > maxAvailable) {
                insufficientItems.push({
                    id: prod.id,
                    name: prod.name,
                    available: maxAvailable,
                    required: deductQty,
                    shortage: deductQty - maxAvailable
                });
            } else {
                const netDelta = returnQty - deductQty;
                changes.push({
                    index: prodIndex,
                    product: prod,
                    name: prod.name,
                    returnQty: returnQty,
                    deductQty: deductQty,
                    delta: netDelta
                });
            }
        });

        if (insufficientItems.length > 0) {
            const errorMsg = insufficientItems.map(it => `الصنف "${it.name}" غير متوفر بالكمية المطلوبة (المتاح: ${it.available}، المطلوب: ${it.required})`).join('، ');
            return {
                valid: false,
                insufficientItems: insufficientItems,
                changes: [],
                error: errorMsg
            };
        }

        return {
            valid: true,
            insufficientItems: [],
            changes: changes,
            error: null
        };
    }

    /**
     * تنفيذ حركات المخزون عبر adjustStock مع رمي Error عند أي فشل لتشغيل الـ rollback
     */
    function executeInvoiceStockChanges(productList, changes, adjustStockFn) {
        const products = Array.isArray(productList) ? productList : [];
        const planChanges = Array.isArray(changes) ? changes : [];
        const adjustFn = typeof adjustStockFn === 'function' ? adjustStockFn : (typeof window !== 'undefined' ? window.adjustStock : null);

        planChanges.forEach(ch => {
            if (ch.delta === 0) return; // لا تغيير في المخزون

            if (typeof adjustFn === 'function') {
                const success = adjustFn(ch.index, ch.delta, "بيع / تسوية فاتورة");
                if (!success) {
                    throw new Error(`فشل تعديل مخزون الصنف "${ch.name}" بمقدار (${ch.delta})`);
                }
            } else if (products[ch.index]) {
                products[ch.index].quantity += ch.delta;
            }
        });

        return true;
    }

    return {
        inv_getOriginReservedQty: inv_getOriginReservedQty,
        planInvoiceStockChanges: planInvoiceStockChanges,
        executeInvoiceStockChanges: executeInvoiceStockChanges
    };
}));
