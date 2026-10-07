// js/finance-diagnostics.js
// أداة لقياس حجم المستند الذي يتم حفظه في Firestore

function getObjectSize(obj) {
    try {
        const str = JSON.stringify(obj);
        // حجم النص بالبايت يعتمد على الترميز، هذا تقريب جيد (UTF-16)
        // ولكن للتبسيط ودقة أقرب لما يرسل للشبكة، نستخدم طول السلسلة
        // Firestore يحسب الحجم بطريقة معقدة، ولكن JSON length مؤشر ممتاز
        return new Blob([str]).size;
    } catch (e) {
        console.error("Error stringifying object", e);
        return 0;
    }
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

window.measureDocumentSize = function(systemState) {
    if (!systemState) {
        console.warn("لا يوجد بيانات لقياسها.");
        return;
    }

    const FIRESTORE_LIMIT = 1048576; // 1 MiB

    console.group("📊 تحليل حجم مستند الحفظ (Firestore)");
    
    let totalSize = 0;
    const sizes = [];

    for (const key in systemState) {
        if (Object.prototype.hasOwnProperty.call(systemState, key)) {
            const size = getObjectSize(systemState[key]);
            totalSize += size;
            sizes.push({ key: key, size: size, formatted: formatBytes(size) });
        }
    }

    // ترتيب من الأكبر للأصغر
    sizes.sort((a, b) => b.size - a.size);

    console.log(`📦 الحجم الإجمالي التقديري: ${formatBytes(totalSize)} (الحد الأقصى: 1 MB)`);
    
    const percentage = ((totalSize / FIRESTORE_LIMIT) * 100).toFixed(2);
    console.log(`النسبة المستخدمة من المستند: ${percentage}%`);

    if (totalSize > FIRESTORE_LIMIT * 0.6) {
        console.warn(`⚠️ تحذير: لقد تجاوزت 60% من حد Firestore. يجب نقل القوائم الكبيرة (مثل operationLog) إلى Subcollections.`);
    }

    const diagResults = document.getElementById('diagnostics-results');
    if (diagResults) {
        diagResults.innerHTML = `
            <strong>حجم بيانات اليوم:</strong> ${formatBytes(totalSize)} 
            <br><strong>النسبة من الحد الأقصى:</strong> <span class="${totalSize > FIRESTORE_LIMIT * 0.6 ? 'text-red-600 font-bold' : 'text-green-600'}">${percentage}%</span>
            ${totalSize > FIRESTORE_LIMIT * 0.6 ? '<br><span class="text-red-600 text-xs">⚠️ اقتربت من مساحة التخزين القصوى. يجب تفعيل الهجرة.</span>' : ''}
            <br><span class="text-xs text-gray-500">أكبر البيانات: ${sizes[0]?.key} (${sizes[0]?.formatted})</span>
        `;
    }

    console.table(sizes);
    console.groupEnd();
    
    return {
        totalBytes: totalSize,
        percentage: percentage,
        details: sizes
    };
};

// سيتم استدعاء هذه الدالة من داخل saveSystemToCloud
