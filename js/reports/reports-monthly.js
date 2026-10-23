async function generateMonthlySalesReport() {
    const monthInput = document.getElementById('report-month-year');
    const msgEl = document.getElementById('report-message');
    
    if (!monthInput || !msgEl) return;
    if (!window.currentUser) { showMessage(msgEl, "يجب تسجيل الدخول أولاً.", true); return; }
    
    const yearMonth = monthInput.value;
    if (!yearMonth) { showMessage(msgEl, "يرجى اختيار الشهر والسنة.", true); return; }

    showMessage(msgEl, "جاري جلب البيانات...", false, true);
    if(typeof displaySalesReport === 'function') displaySalesReport([]); 

    const userId = window.currentUser.uid;
    const [year, month] = yearMonth.split('-');
    const startDate = `${yearMonth}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

    // =============================================
    // المرحلة 1: جلب سريع (استعلام واحد فقط)
    // =============================================
    const salesById = new Map(); // المفتاح = id الفريد

    try {
        const invoicesColRef = window.collection(window.db, "users", userId, "invoices");
        const q = window.query(invoicesColRef, 
            window.where("saleDate", ">=", startDate), 
            window.where("saleDate", "<=", endDate)
        );
        const querySnapshot = await window.getDocs(q);
        querySnapshot.forEach((doc) => {
            salesById.set(doc.id, doc.data());
        });
        console.log(`[تقرير] جلب ${querySnapshot.size} فاتورة من السحابة.`);
    } catch (e) {
        console.warn("[تقرير] فشل السحابة:", e);
        showMessage(msgEl, "فشل الاتصال بالسحابة.", true);
    }

    // دمج المبيعات المحلية (اليوم الحالي)
    if (typeof salesToday !== 'undefined' && Array.isArray(salesToday)) {
        salesToday.forEach(s => {
            const sDate = s.saleDate || (s.timestamp ? (typeof getCairoDateString === 'function' ? getCairoDateString(s.timestamp) : new Date(s.timestamp).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })) : '');
            if (sDate >= startDate && sDate <= endDate && s.id) {
                salesById.set(s.id, s); // نفس الـ ID = يحل محل النسخة السحابية
            }
        });
    }

    // =============================================
    // المرحلة 2: إزالة التكرار بالمعرف الفريد (ID)
    // الـ Map بطبيعته يمنع تكرار نفس الـ ID
    // لكن المشكلة إن بعض الفواتير القديمة ليها IDs مختلفة لنفس العملية
    // لذلك نستخدم بصمة المحتوى كطبقة حماية ثانية
    // =============================================
    const contentFingerprints = new Map(); // بصمة المحتوى -> أول ID
    const duplicateDocIds = []; // IDs المكررة لحذفها من السحابة

    const normName = (n) => {
        if (!n) return 'cash';
        return n.trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,'');
    };

    const getMinute = (sale) => {
        const ts = sale.createdAt || sale.timestamp || sale.saleDate || '';
        try {
            const d = new Date(ts);
            return isNaN(d.getTime()) ? String(ts).substring(0,16) : d.toISOString().substring(0,16);
        } catch(e) { return String(ts).substring(0,16); }
    };

    const finalList = [];
    for (const [docId, sale] of salesById.entries()) {
        const invoiceNum = (sale.invoiceNumber || sale.invoiceNo || '').trim();
        let fp;
        if (invoiceNum) {
            // إذا توفر رقم فاتورة صريح، يكون التكرار برقم الفاتورة فقط
            fp = `inv_${invoiceNum}`;
        } else {
            // إذا لم يتوفر رقم فاتورة، يتم فحص البصمة الشاملة: الدقيقة، العميل، المبلغ، وقائمة المنتجات بدقة
            const minute = getMinute(sale);
            const customer = normName(sale.customerName);
            const amount = Math.round(Number(sale.grandTotal || sale.finalTotal || sale.totalSellPrice || 0));
            const itemsSig = (sale.items || []).map(i => `${(i.name || i.id || '').trim()}:${i.quantity || 1}:${Math.round(Number(i.price || i.sellPrice || 0))}`).sort().join('|');
            const serialSig = (sale.items || []).map(i => i.serial || '').filter(Boolean).sort().join(',');
            fp = `legacy_${minute}_${customer}_${amount}_${itemsSig}_${serialSig}`;
        }

        if (contentFingerprints.has(fp)) {
            // مكرر بمحتوى متطابق - نضيفه للمكررات
            duplicateDocIds.push(docId);
        } else {
            contentFingerprints.set(fp, docId);
            finalList.push(sale);
        }
    }

    // =============================================
    // المرحلة 3: العرض
    // =============================================
    finalList.sort((a, b) => {
        const dA = new Date(a.createdAt || a.timestamp || a.saleDate || 0).getTime();
        const dB = new Date(b.createdAt || b.timestamp || b.saleDate || 0).getTime();
        return dB - dA;
    });
    
    currentMonthlySalesData = finalList;
    if(typeof displaySalesReport === 'function') displaySalesReport(finalList);

    if (finalList.length === 0) {
        showMessage(msgEl, `لا توجد مبيعات لشهر ${yearMonth}.`, false, true);
    } else {
        const dupMsg = duplicateDocIds.length > 0 ? ` (حُذف ${duplicateDocIds.length} مكرر)` : '';
        showMessage(msgEl, `${finalList.length} عملية بيع${dupMsg}`, false);
    }

    // =============================================
    // تنظيف المكررات من السحابة (صامت في الخلفية)
    // =============================================
    if (duplicateDocIds.length > 0) {
        console.log(`[تنظيف] حذف ${duplicateDocIds.length} فاتورة مكررة من السحابة...`);
        setTimeout(async () => {
            for (const dupId of duplicateDocIds) {
                try {
                    const ref = window.doc(window.db, "users", userId, "invoices", dupId);
                    // window.deleteDoc(ref); // تم التعطيل - لا يجوز حذف البيانات صامتاً بناء على تقرير الأخطاء
                    console.warn("فاتورة مكررة تحتاج للمراجعة يدوياً:", dupId);
                } catch(e) { console.warn("خطأ أثناء فحص فاتورة مكررة:", e); }
            }
            console.log('[تنظيف] ✅ تم فحص المكررات (تم تعطيل الحذف التلقائي).');
        }, 500);
    }
}
