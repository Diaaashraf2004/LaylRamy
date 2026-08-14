/**
 * finance-sync.js — طبقة المزامنة الموحدة
 * الغرض: بوابة واحدة لجميع عمليات الكتابة في Firebase.
 * يضمن:
 *   1. التحقق من المستخدم وقفل الجلسة قبل أي كتابة.
 *   2. تسجيل كل خطأ وعرض رسالة مفهومة.
 *   3. استخدام {merge: true} افتراضياً لحماية البيانات.
 */

window.FinanceSync = (function () {

    // ── التحقق من القدرة على الكتابة ───────────────────────────────────
    async function assertCanWrite(label) {
        if (!window.currentUser) {
            const msg = 'يجب تسجيل الدخول أولاً لحفظ البيانات.';
            console.error('[FinanceSync]', label, '→', msg);
            _showError(msg);
            return false;
        }
        if (!window.db) {
            const msg = 'لم يتم الاتصال بقاعدة البيانات بعد.';
            console.error('[FinanceSync]', label, '→', msg);
            _showError(msg);
            return false;
        }
        // قفل الجلسة: إذا كان SessionGuard موجوداً نتحقق منه
        if (typeof window.SessionGuard !== 'undefined' && typeof window.SessionGuard.assertCanWrite === 'function') {
            const ok = await window.SessionGuard.assertCanWrite();
            if (!ok) {
                console.warn('[FinanceSync]', label, '→ SESSION GUARD BLOCKED WRITE');
                return false;
            }
        }
        return true;
    }

    function _showError(msg) {
        if (typeof showGlobalMessage === 'function') {
            showGlobalMessage(msg, true);
        } else if (typeof showMessage === 'function') {
            const el = document.getElementById('global-message') || document.body;
            showMessage(el, msg, true);
        } else {
            alert(msg);
        }
    }

    function _uid() {
        return window.currentUser.uid;
    }

    // ── دالة مرجعية مساعدة ─────────────────────────────────────────────
    function userDoc(...pathSegments) {
        return window.doc(window.db, 'users', _uid(), ...pathSegments);
    }

    // ── setDoc آمنة (merge:true افتراضي) ────────────────────────────────
    async function safeSet(docRef, data, options = { merge: true }, label = 'setDoc') {
        if (!(await assertCanWrite(label))) throw new Error('write-blocked');
        try {
            await window.setDoc(docRef, data, options);
        } catch (err) {
            console.error('[FinanceSync] safeSet error:', label, err);
            _showError('فشل الحفظ في السحابة: ' + err.message);
            throw err;
        }
    }

    // ── updateDoc آمنة ──────────────────────────────────────────────────
    async function safeUpdate(docRef, data, label = 'updateDoc') {
        if (!(await assertCanWrite(label))) throw new Error('write-blocked');
        try {
            await window.updateDoc(docRef, data);
        } catch (err) {
            console.error('[FinanceSync] safeUpdate error:', label, err);
            _showError('فشل التحديث في السحابة: ' + err.message);
            throw err;
        }
    }

    // ── deleteDoc آمنة ──────────────────────────────────────────────────
    async function safeDelete(docRef, label = 'deleteDoc') {
        if (!(await assertCanWrite(label))) throw new Error('write-blocked');
        try {
            await window.deleteDoc(docRef);
        } catch (err) {
            console.error('[FinanceSync] safeDelete error:', label, err);
            _showError('فشل الحذف من السحابة: ' + err.message);
            throw err;
        }
    }

    // ── batch آمن ───────────────────────────────────────────────────────
    /**
     * runBatch: ينفذ مجموعة عمليات كتابة دفعة واحدة.
     * @param {function(batch): void} buildFn - دالة تأخذ كائن batch وتضيف العمليات عليه
     * @param {string} label - وصف قصير للعملية للـ logging
     */
    async function runBatch(buildFn, label = 'batch') {
        if (!(await assertCanWrite(label))) throw new Error('write-blocked');

        // Firebase Compat batch
        const batch = window.db.batch();

        // نعطي buildFn بدائل آمنة بدلاً من batch.set مباشرة
        const batchProxy = {
            set: (ref, data, opts = { merge: true }) => batch.set(ref, data, opts),
            update: (ref, data) => batch.update(ref, data),
            delete: (ref) => batch.delete(ref),
        };

        try {
            await buildFn(batchProxy);
            await batch.commit();
            console.log('[FinanceSync] Batch committed:', label);
        } catch (err) {
            console.error('[FinanceSync] Batch failed:', label, err);
            _showError('فشل تنفيذ العملية المجمعة: ' + err.message + '\nلم يتم تغيير أي بيانات.');
            throw err;
        }
    }

    // ── transaction آمن ─────────────────────────────────────────────────
    async function runTransaction(updateFn, label = 'transaction') {
        if (!(await assertCanWrite(label))) throw new Error('write-blocked');
        try {
            const result = await window.db.runTransaction(updateFn);
            console.log('[FinanceSync] Transaction committed:', label);
            return result;
        } catch (err) {
            console.error('[FinanceSync] Transaction failed:', label, err);
            _showError('فشل تنفيذ العملية الذرية: ' + err.message + '\nتم التراجع عن جميع التغييرات.');
            throw err;
        }
    }

    // ── واجهة عامة ──────────────────────────────────────────────────────
    return {
        assertCanWrite,
        userDoc,
        safeSet,
        safeUpdate,
        safeDelete,
        runBatch,
        runTransaction,
    };
})();

console.log('✅ FinanceSync Layer جاهز — طبقة المزامنة الموحدة تعمل.');
