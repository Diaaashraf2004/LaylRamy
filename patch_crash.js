const fs = require('fs');
const file = 'D:/الشركة/الشركة/finance.html';
let content = fs.readFileSync(file, 'utf8');

const target = `    // 🔥 الخطوة 2 (الجديدة المحسنة): تنقية البيانات بناءً على الواقع المحلي (Smart Filter)
    // هذا يمنع ظهور الفواتير التي قمت بعمل (Undo) لها، حتى الفواتير القديمة (التي لها تاريخ رجعي)
    // =========================================================
    const activeDateForFilter = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) ? currentLoadedDate : (typeof getTodayDateString === 'function' ? getTodayDateString() : new Date().toISOString().split('T')[0]);
    
    if (typeof salesToday !== 'undefined' && Array.isArray(salesToday)) {
        for (const [id, cloudSale] of salesMap.entries()) {
            const sDate = cloudSale.saleDate || (cloudSale.timestamp ? cloudSale.timestamp.split('T')[0] : '');
            const tDate = cloudSale.timestamp ? cloudSale.timestamp.split('T')[0] : '';
            
            // إذا كانت الفاتورة تنتمي لليوم المفتوح حالياً (سواء بتاريخ البيع أو بتاريخ الإنشاء الفعلي)
            if (sDate === activeDateForFilter || tDate === activeDateForFilter) {
                // يجب أن تكون موجودة في الذاكرة المحلية (حتى لو كانت مخفية عن العرض اليومي)
                const existsLocally = salesToday.some(local => local.id === id);
                
                // إذا لم تكن في الذاكرة المحلية (غالباً بسبب التراجع Undo)، نحذفها من التقرير فوراً
                if (!existsLocally) {
                    salesMap.delete(id);
                }
            }
        }
    }`;

const replacement = `    // 🔥 الخطوة 2 (الجديدة المحسنة): تنقية البيانات بناءً على الواقع المحلي (Smart Filter)
    // هذا يمنع ظهور الفواتير التي قمت بعمل (Undo) لها، حتى الفواتير القديمة (التي لها تاريخ رجعي)
    // =========================================================
    const activeDateForFilter = (typeof currentLoadedDate !== 'undefined' && currentLoadedDate) ? currentLoadedDate : (typeof getTodayDateString === 'function' ? getTodayDateString() : new Date().toISOString().split('T')[0]);
    
    if (typeof salesToday !== 'undefined' && Array.isArray(salesToday)) {
        for (const [id, cloudSale] of salesMap.entries()) {
            let sDate = cloudSale.saleDate ? String(cloudSale.saleDate).split('T')[0] : "";
            let tDate = "";
            if (cloudSale.timestamp) {
                try {
                    if (typeof cloudSale.timestamp === 'object' && cloudSale.timestamp.toDate) {
                        tDate = cloudSale.timestamp.toDate().toISOString().split('T')[0];
                    } else if (typeof cloudSale.timestamp === 'number') {
                        tDate = new Date(cloudSale.timestamp).toISOString().split('T')[0];
                    } else {
                        tDate = String(cloudSale.timestamp).split('T')[0];
                    }
                } catch(e) { console.warn("Error parsing timestamp in smart filter", e); }
            }
            if (!sDate) sDate = tDate;
            
            // إذا كانت الفاتورة تنتمي لليوم المفتوح حالياً (سواء بتاريخ البيع أو بتاريخ الإنشاء الفعلي)
            if (sDate === activeDateForFilter || tDate === activeDateForFilter) {
                // يجب أن تكون موجودة في الذاكرة المحلية (حتى لو كانت مخفية عن العرض اليومي)
                const existsLocally = salesToday.some(local => local.id === id);
                
                // إذا لم تكن في الذاكرة المحلية (غالباً بسبب التراجع Undo)، نحذفها من التقرير فوراً
                if (!existsLocally) {
                    salesMap.delete(id);
                }
            }
        }
    }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched Smart Filter!");
} else {
    console.log("Target not found!");
}
