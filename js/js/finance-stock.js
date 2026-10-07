// js/finance-stock.js
// وحدة إدارة المخزون لمنع القيم السالبة وتتبع التعديلات

window.adjustStock = function(productIndex, delta, reason = "") {
    if (productIndex === -1 || typeof products === 'undefined' || !products[productIndex]) {
        console.error("adjustStock: المنتج غير موجود", productIndex);
        return false;
    }

    const product = products[productIndex];
    const currentQty = Number(product.quantity) || 0;
    const amountToAdjust = Number(delta) || 0;

    // منع نزول المخزون تحت الصفر
    if (currentQty + amountToAdjust < 0) {
        console.error(`adjustStock: لا يمكن الخصم. المخزون الحالي لـ ${product.name} هو ${currentQty} والمطلوب خصم ${Math.abs(amountToAdjust)}`);
        return false;
    }

    product.quantity = currentQty + amountToAdjust;
    
    // تسجيل عملية التعديل للرقابة والتدقيق (في Console فقط حالياً لتفادي تضخم الملف)
    console.log(`[تحديث المخزون] المنتج: ${product.name} | التغيير: ${amountToAdjust} | الرصيد الجديد: ${product.quantity} | السبب: ${reason}`);

    return true;
};
