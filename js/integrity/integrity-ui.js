// js/integrity/integrity-ui.js
// واجهة شريط ولوحة فحص حارس سلامة رأس المال والسيولة (Financial Integrity Guard UI)

function _figEsc(s) {
    if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(s);
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _figShowLiveDriftAlertBanner(entry) {
    if (typeof document === 'undefined' || !document.body || !entry) return;
    let toast = document.getElementById('integrity-guard-drift-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'integrity-guard-drift-toast';
        toast.style.cssText = 'position:fixed; bottom:76px; left:18px; z-index:100080; max-width:440px; width:calc(100% - 36px); background:#fff1f2; border:2px solid #e11d48; border-radius:14px; padding:14px 16px; box-shadow:0 20px 50px rgba(225,29,72,0.28); color:#881337; direction:rtl;';
        document.body.appendChild(toast);
    }
    const dirText = entry.drift > 0 ? `تضخم غير مفسّر (+${_figFmt(entry.drift)})` : `نقصان غير مفسّر (${_figFmt(entry.drift)})`;
    const canUndo = typeof window !== 'undefined' && typeof window.undo === 'function';
    toast.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div style="font-weight:800; font-size:13.5px; color:#9f1239;">
                <i class="fas fa-shield-alt" style="margin-left:6px;"></i>
                تنبيه حارس رأس المال: ${_figEsc(dirText)}
            </div>
            <button type="button" onclick="document.getElementById('integrity-guard-drift-toast').style.display='none'" style="background:transparent; border:none; font-size:18px; color:#9f1239; cursor:pointer; line-height:1;">&times;</button>
        </div>
        <div style="font-size:12px; margin-top:6px; line-height:1.6;">
            العملية: <strong>${_figEsc(entry.label)}</strong><br>
            تغيّر رأس المال الفعلي: <strong style="font-family:monospace;">${entry.deltaCapital >= 0 ? '+' : ''}${_figFmt(entry.deltaCapital)}</strong> | المتوقع محاسبياً: <strong style="font-family:monospace;">${entry.expectedDeltaCapital >= 0 ? '+' : ''}${_figFmt(entry.expectedDeltaCapital)}</strong><br>
            تغيّر السيولة: <strong style="font-family:monospace;">${entry.deltaLiquidity >= 0 ? '+' : ''}${_figFmt(entry.deltaLiquidity)}</strong>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" onclick="window.FinancialIntegrityGuard.openAuditModal()" style="background:#be123c; color:#fff; border:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">فتح تقرير الفحص</button>
            ${canUndo ? `<button type="button" onclick="if(confirm('هل تريد التراجع عن آخر عملية الآن؟')){ undo(); document.getElementById('integrity-guard-drift-toast').style.display='none'; }" style="background:#fff; color:#9f1239; border:1px solid #fda4af; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">تراجع فوري (Undo)</button>` : ''}
        </div>
    `;
    toast.style.display = 'block';
}
window._figShowLiveDriftAlertBanner = _figShowLiveDriftAlertBanner;

function _figRenderGuardBar() {
    if (typeof document === 'undefined' || !window.FinancialIntegrityGuard) return;
    if (typeof window.FinancialIntegrityGuard.checkPassiveDrift === 'function') {
        window.FinancialIntegrityGuard.checkPassiveDrift();
    }
    const report = window.FinancialIntegrityGuard.runFullAudit();

    // إزالة الشريط العريض القديم إن وُجد
    const legacyBar = document.getElementById('financial-integrity-guard-bar');
    if (legacyBar) legacyBar.remove();

    const totalIssues = report.criticalCount + report.warningCount + report.driftAlertCount;
    let btn = document.getElementById('financial-integrity-guard-icon');

    // إخفاء الأيقونة تماماً طالما لا توجد أي مشكلة
    if (totalIssues === 0) {
        if (btn) btn.remove();
        return;
    }

    if (!btn) {
        if (!document.body) return;
        btn = document.createElement('button');
        btn.id = 'financial-integrity-guard-icon';
        btn.type = 'button';
        document.body.appendChild(btn);
    }

    const isCrit = report.criticalCount > 0 || report.driftAlertCount > 0;
    btn.style.cssText = 'position:fixed; bottom:18px; left:18px; z-index:100050; direction:rtl;';
    btn.className = `flex items-center gap-2 px-3.5 py-2.5 rounded-full ${isCrit ? 'bg-rose-600 hover:bg-rose-700 border-rose-200' : 'bg-amber-500 hover:bg-amber-600 border-amber-200'} text-white text-xs sm:text-sm font-extrabold shadow-xl hover:shadow-2xl transition-all cursor-pointer border-2 animate-pulse`;
    btn.title = `حارس سلامة رأس المال والسيولة: تم رصد (${totalIssues}) تنبيه — اضغط لعرض التفاصيل الآن`;
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = `
        <i class="fas fa-shield-alt text-base"></i>
        <span>تنبيه سلامة رأس المال</span>
        <span class="min-w-[22px] h-5 px-1.5 rounded-full ${isCrit ? 'bg-rose-800' : 'bg-amber-700'} text-white text-[11px] font-black flex items-center justify-center border border-white/60 leading-none">${totalIssues}</span>
    `;
    btn.onclick = () => _figOpenAuditModal();
}
window._figRenderGuardBar = _figRenderGuardBar;

// فحص دوري تلقائي كل دقيقة (60 ثانية) في المتصفح فقط أثناء فتح البرنامج
function _figStartPeriodicAudit() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof setInterval !== 'function') return;
    if (window._figPeriodicAuditTimer) return;
    window._figPeriodicAuditTimer = setInterval(function () {
        const mc = document.getElementById('main-content');
        if (!mc || mc.classList.contains('hidden')) return;
        if (window._isArchiveBrowsingMode || window._isLoadingDate || window._loadFailed || window._serialsLoadFailed) return;
        if (window.FinancialIntegrityGuard && typeof window.FinancialIntegrityGuard.isTransactionActive === 'function' && window.FinancialIntegrityGuard.isTransactionActive()) return;
        if (typeof window.FinancialIntegrityGuard !== 'undefined' && typeof window.FinancialIntegrityGuard.renderGuardBar === 'function') {
            window.FinancialIntegrityGuard.renderGuardBar();
        }
    }, 60000);
}
_figStartPeriodicAudit();

function _figOpenAuditModal() {
    if (typeof document === 'undefined' || !document.body || !window.FinancialIntegrityGuard) return;
    const report = window.FinancialIntegrityGuard.runFullAudit();
    const snap = report.snapshot;
    const history = window.FinancialIntegrityGuard.getAuditHistory();

    let modal = document.getElementById('financialIntegrityAuditModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'financialIntegrityAuditModal';
        modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:100060; background:rgba(15,23,42,0.65); backdrop-filter:blur(3px); align-items:center; justify-content:center; padding:14px;';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        document.body.appendChild(modal);
    }

    const headerGrad = report.isHealthy
        ? 'linear-gradient(to left, #059669, #10b981)'
        : (report.criticalCount > 0 || report.driftAlertCount > 0
            ? 'linear-gradient(to left, #be123c, #e11d48)'
            : 'linear-gradient(to left, #b45309, #f59e0b)');

    const checksHTML = report.checks.map(c => {
        let badge = '';
        let borderCls = 'border-slate-200 bg-white';
        if (c.status === 'skipped') {
            badge = '<span class="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">⬜ غير مفحوص</span>';
            borderCls = 'border-slate-200 bg-slate-50/70';
        } else if (c.status === 'passed') {
            badge = '<span class="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ سليم</span>';
        } else if (c.severity === 'critical') {
            badge = '<span class="text-[11px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">🚨 حرج</span>';
            borderCls = 'border-rose-300 bg-rose-50/60';
        } else if (c.severity === 'warning') {
            badge = '<span class="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">⚠️ تنبيه</span>';
            borderCls = 'border-amber-300 bg-amber-50/60';
        } else {
            badge = '<span class="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">ℹ️ معلومة</span>';
            borderCls = 'border-blue-200 bg-blue-50/40';
        }
        const detailsList = c.details.length > 0
            ? `<ul class="mt-2 pr-4 list-disc text-[11px] text-slate-700 space-y-0.5">${c.details.slice(0, 8).map(d => `<li>${_figEsc(d)}</li>`).join('')}${c.details.length > 8 ? `<li>... وعدد (${c.details.length - 8}) عناصر أخرى</li>` : ''}</ul>`
            : '';
        return `
            <div class="p-2.5 rounded-xl border ${borderCls}">
                <div class="flex flex-wrap justify-between items-center gap-2">
                    <strong class="text-xs text-slate-800">${_figEsc(c.title)}</strong>
                    ${badge}
                </div>
                <div class="text-[11px] text-slate-600 mt-1">${_figEsc(c.summary)}</div>
                ${detailsList}
            </div>
        `;
    }).join('');

    const historyHTML = history.length === 0
        ? '<div class="text-center text-xs text-slate-400 py-4 bg-white rounded-xl border border-slate-200">لم تُنفّذ عمليات جديدة في هذه الجلسة بعد — أي عملية ستظهر هنا فوراً مع قياس أثرها على رأس المال والسيولة.</div>'
        : `<div class="overflow-x-auto bg-white rounded-xl border border-slate-200">
            <table class="w-full min-w-[560px] text-right text-xs border-collapse">
                <thead>
                    <tr class="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <th class="p-2">العملية</th>
                        <th class="p-2">Δ السيولة</th>
                        <th class="p-2">Δ رأس المال</th>
                        <th class="p-2">المتوقع</th>
                        <th class="p-2">الفرق (Drift)</th>
                        <th class="p-2">الحالة</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${history.slice(0, 20).map(h => {
                        const stBadge = h.status === 'ok'
                            ? '<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">✅ متزن</span>'
                            : (h.status === 'manual'
                                ? '<span class="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold text-[10px]">ℹ️ تعديل يدوي</span>'
                                : '<span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[10px]">🚨 فرق غير مفسّر</span>');
                        const rowBg = h.status === 'alert' ? 'bg-rose-50/70' : (h.status === 'manual' ? 'bg-indigo-50/40' : '');
                        return `
                            <tr class="${rowBg}">
                                <td class="p-2 font-bold text-slate-800">${_figEsc(h.label)}<div class="text-[10px] font-normal text-slate-400 font-mono">${new Date(h.timestamp).toLocaleTimeString('ar-EG')}</div></td>
                                <td class="p-2 font-mono">${h.deltaLiquidity >= 0 ? '+' : ''}${_figFmt(h.deltaLiquidity)}</td>
                                <td class="p-2 font-mono font-bold">${h.deltaCapital >= 0 ? '+' : ''}${_figFmt(h.deltaCapital)}</td>
                                <td class="p-2 font-mono text-slate-500">${h.expectedDeltaCapital >= 0 ? '+' : ''}${_figFmt(h.expectedDeltaCapital)}</td>
                                <td class="p-2 font-mono font-black ${Math.abs(h.drift) > 1 ? (h.status === 'alert' ? 'text-rose-700' : 'text-indigo-700') : 'text-emerald-700'}">${h.drift >= 0 ? '+' : ''}${_figFmt(h.drift)}</td>
                                <td class="p-2">${stBadge}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>`;

    modal.innerHTML = `
        <div style="background:#f8fafc; width:100%; max-width:860px; max-height:90vh; border-radius:18px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,0.32);" dir="rtl">
            <div style="background:${headerGrad}; color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <div class="flex items-center gap-3">
                    <span class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl"><i class="fas fa-shield-alt"></i></span>
                    <div>
                        <div style="font-size:1.1rem; font-weight:800;">حارس سلامة رأس المال والسيولة</div>
                        <div style="font-size:.82rem; opacity:.95;">فحص اتّساق داخلي ومراقبة لحظية وتراكمية لكل الأقسام (مبيعات، مرتجعات، مشتريات، استبدال، ديون، خزنة، سيريالات)</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('financialIntegrityAuditModal').style.display='none'" style="background:transparent; color:#fff; border:none; font-size:1.8rem; cursor:pointer; line-height:1;">&times;</button>
            </div>

            <div style="padding:16px; overflow-y:auto; flex:1 1 auto;" class="space-y-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div class="flex flex-wrap justify-between items-center gap-2 mb-3 border-b pb-2">
                        <h4 class="text-sm font-extrabold text-slate-800"><i class="fas fa-balance-scale text-teal-600 ml-1"></i> ميزانية رأس المال التفصيلية (لحظياً)</h4>
                        <span class="font-mono font-black text-base text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">رأس المال: ${_figFmt(snap.totalCapital)}</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div class="p-2 rounded-lg bg-blue-50 border border-blue-100"><span class="text-blue-700 block">السيولة المتاحة (+)</span><strong class="font-mono text-blue-900">${_figFmt(snap.liquidity)}</strong></div>
                        <div class="p-2 rounded-lg bg-indigo-50 border border-indigo-100"><span class="text-indigo-700 block">المخزون بالتكلفة (+)</span><strong class="font-mono text-indigo-900">${_figFmt(snap.inventory)}</strong></div>
                        <div class="p-2 rounded-lg bg-purple-50 border border-purple-100"><span class="text-purple-700 block">الديون المستحقة لك (+)</span><strong class="font-mono text-purple-900">${_figFmt(snap.debts)}</strong></div>
                        <div class="p-2 rounded-lg bg-sky-50 border border-sky-100"><span class="text-sky-700 block">بضاعة مؤقتة بالتكلفة (+)</span><strong class="font-mono text-sky-900">${_figFmt(snap.consignment)}</strong></div>
                        <div class="p-2 rounded-lg bg-cyan-50 border border-cyan-100"><span class="text-cyan-700 block">مرتجعات + مشتريات معلقة (+)</span><strong class="font-mono text-cyan-900">${_figFmt(_figMoney(snap.pendingReturns + snap.pendingPurchases))}</strong></div>
                        <div class="p-2 rounded-lg bg-slate-50 border border-slate-200"><span class="text-slate-600 block">صافي استبدالات معلقة (±)</span><strong class="font-mono text-slate-900">${_figFmt(snap.pendingOrders)}</strong></div>
                        <div class="p-2 rounded-lg bg-rose-50 border border-rose-200"><span class="text-rose-700 block">الالتزامات عليك (−)</span><strong class="font-mono text-rose-900">− ${_figFmt(snap.liabilities)}</strong></div>
                        <div class="p-2 rounded-lg bg-amber-50 border border-amber-200"><span class="text-amber-800 block">عربونات عملاء مؤقتة (−)</span><strong class="font-mono text-amber-900">− ${_figFmt(snap.pendingDeposits)}</strong></div>
                        <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200"><span class="text-emerald-800 block">فروق يدوية مراقَبة بالجلسة</span><strong class="font-mono text-emerald-900">${report.manualDriftCount} (${report.manualDriftSum >= 0 ? '+' : ''}${_figFmt(report.manualDriftSum)})</strong></div>
                    </div>
                </div>

                <div class="space-y-2">
                    <div class="flex flex-wrap justify-between items-center gap-2">
                        <h4 class="text-sm font-extrabold text-slate-800"><i class="fas fa-clipboard-check text-indigo-600 ml-1"></i> نتائج فحص الأقسام (${report.passedCoreCount}/${report.evaluatedCoreCount} مفحوص | ${report.skippedCount} غير مفحوص)</h4>
                        <span class="text-[11px] text-slate-500">مجموع فروق التقريب التراكمي: ${_figFmt(report.cumulativeIgnoredDrift)} (مطلق: ${_figFmt(report.cumulativeAbsIgnoredDrift)})</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${checksHTML}</div>
                </div>

                <div class="space-y-2">
                    <div class="flex flex-wrap justify-between items-center gap-2">
                        <h4 class="text-sm font-extrabold text-slate-800"><i class="fas fa-wave-square text-purple-600 ml-1"></i> سجل مراقبة تغيّر رأس المال والسيولة للعمليات الأخيرة</h4>
                        <span class="text-[11px] text-slate-500">المعادلة: Δرأس المال المتوقع = Δالربح − Δالمصاريف − Δالخسائر</span>
                    </div>
                    ${historyHTML}
                </div>
            </div>

            <div style="padding:12px 18px; background:#fff; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; flex-shrink:0;">
                <button type="button" onclick="window.FinancialIntegrityGuard.openAuditModal()" class="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"><i class="fas fa-sync-alt ml-1"></i> إعادة الفحص الآن</button>
                <button type="button" onclick="document.getElementById('financialIntegrityAuditModal').style.display='none'" class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition">إغلاق</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}
window._figOpenAuditModal = _figOpenAuditModal;
