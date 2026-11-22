// js/sales/sales-repeat-alarm.js
// نظام تنبيه تكرار الأوردر بنفس اسم العميل (Repeat Customer Order Alarm System)

const _SRA_IGNORED_GENERIC_NAMES = new Set([
    '', 'عميل', 'عميل نقدي', 'عميل كاش', 'عميل غير محدد', 'عميل بدون اسم',
    'نقدي', 'كاش', 'بدون اسم', 'غير محدد', 'مجهول'
]);

function _sraNormalizeNameCore(text) {
    if (typeof window !== 'undefined' && typeof window.normalizeArabicText === 'function') {
        return window.normalizeArabicText(text).toLowerCase();
    }
    return String(text || '')
        .trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function _sraCleanOrderCustomerDisplayName(rawText) {
    if (!rawText) return '';
    let s = String(rawText).trim();
    s = s.replace(/^بيعة\s+باسم\s+/i, '');
    s = s.replace(/\s*\(\s*[\d,.]+\s*(?:ج\.?م\.?|جنيه|EGP)?\s*\)\s*$/i, '');
    s = s.replace(/\s*\(\s*طلب\s+متكرر\s*#?\d+\s*\)\s*$/i, '');
    s = s.replace(/\s*\(\s*[\d,.]+\s*(?:ج\.?م\.?|جنيه|EGP)?\s*\)\s*$/i, '');
    return s.trim();
}

function extractOrderCustomerName(rawText) {
    const displayName = _sraCleanOrderCustomerDisplayName(rawText);
    const normalized = _sraNormalizeNameCore(displayName);
    if (!normalized || normalized.length < 2 || _SRA_IGNORED_GENERIC_NAMES.has(normalized)) {
        return '';
    }
    return normalized;
}
window.extractOrderCustomerName = extractOrderCustomerName;

function getOrderCustomerDisplayName(rawText) {
    return _sraCleanOrderCustomerDisplayName(rawText);
}
window.getOrderCustomerDisplayName = getOrderCustomerDisplayName;

function _sraIsOrderLikeDebt(debt) {
    if (!debt) return false;
    const reason = String(debt.reason || '').trim();
    if (/^بيعة\s+باسم\s+/i.test(reason)) return true;
    if (debt.origin === 'credit_sale') return true;
    if (debt.linkedInvoice && debt.linkedInvoice !== '-' && debt.linkedInvoice !== 'بدون فاتورة') return true;
    if (debt.saleId) return true;
    return false;
}

function _sraParseAmountFromReasonItem(itemStr) {
    const m = String(itemStr || '').match(/\(\s*([\d,.]+)\s*(?:ج\.?م\.?|جنيه|EGP)?\s*\)\s*$/i);
    if (!m) return null;
    const num = parseFloat(m[1].replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
}

function _sraPushToIndex(index, normName, record) {
    if (!normName) return;
    if (!index.has(normName)) index.set(normName, []);
    index.get(normName).push(record);
}

function buildRepeatOrderNameIndex() {
    const index = new Map();
    const seenDebtIds = new Set();
    const seenSaleRefs = new Set();

    // 1. المبيعات المؤقتة (pendingSales)
    const pSales = (typeof pendingSales !== 'undefined' && Array.isArray(pendingSales)) ? pendingSales : [];
    pSales.forEach(sale => {
        if (!sale) return;
        const norm = extractOrderCustomerName(sale.customerName);
        if (!norm) return;
        _sraPushToIndex(index, norm, {
            source: 'pending',
            sourceLabel: 'بيع مؤقت',
            id: String(sale.id || ''),
            ref: String(sale.invoiceNumber || sale.id || ''),
            customerName: _sraCleanOrderCustomerDisplayName(sale.customerName),
            profileId: '',
            profileName: '',
            amount: Number(sale.grandTotal || sale.totalSellPrice || 0),
            date: sale.createdAt || sale.timestamp || sale.saleDate || '',
            reason: sale.customerName || ''
        });
    });

    // 2. الديون النشطة المرتبطة ببيعات (debtors)
    const liveDebtors = (typeof debtors !== 'undefined' && Array.isArray(debtors)) ? debtors : [];
    liveDebtors.forEach(debt => {
        if (!debt || (Number(debt.amount) || 0) <= 0.001) return;
        if (!_sraIsOrderLikeDebt(debt)) return;
        const rawTarget = /^بيعة\s+باسم\s+/i.test(String(debt.reason || '').trim())
            ? debt.reason
            : (debt.customerName || debt.name || debt.reason || '');
        const norm = extractOrderCustomerName(rawTarget);
        if (!norm) return;

        const dId = String(debt.id || '');
        if (dId) seenDebtIds.add(dId);
        if (debt.saleId) seenSaleRefs.add(String(debt.saleId).toLowerCase());
        if (debt.linkedInvoice && debt.linkedInvoice !== 'بدون فاتورة') {
            seenSaleRefs.add(String(debt.linkedInvoice).toLowerCase());
        }

        _sraPushToIndex(index, norm, {
            source: 'active_debt',
            sourceLabel: 'دين نشط',
            id: dId,
            ref: String(debt.linkedInvoice || debt.saleId || dId),
            customerName: _sraCleanOrderCustomerDisplayName(rawTarget),
            profileId: String(debt.customerId || ''),
            profileName: debt.customerName || debt.name || '',
            amount: Number(debt.amount) || 0,
            date: debt.createdAt || debt.timestamp || '',
            reason: debt.reason || ''
        });
    });

    // 3. مبيعات اليوم المؤكدة (salesToday) مع منع الازدواج مع الديون المسجلة لنفس الفاتورة
    const tSales = (typeof salesToday !== 'undefined' && Array.isArray(salesToday)) ? salesToday : [];
    tSales.forEach(sale => {
        if (!sale) return;
        const saleIdKey = sale.id ? String(sale.id).toLowerCase() : '';
        const invKey = sale.invoiceNumber ? String(sale.invoiceNumber).toLowerCase() : '';
        if ((saleIdKey && seenSaleRefs.has(saleIdKey)) || (invKey && seenSaleRefs.has(invKey))) {
            return;
        }
        const norm = extractOrderCustomerName(sale.customerName);
        if (!norm) return;
        if (saleIdKey) seenSaleRefs.add(saleIdKey);
        if (invKey) seenSaleRefs.add(invKey);

        _sraPushToIndex(index, norm, {
            source: 'sale_today',
            sourceLabel: 'مبيعات اليوم',
            id: String(sale.id || ''),
            ref: String(sale.invoiceNumber || sale.id || ''),
            customerName: _sraCleanOrderCustomerDisplayName(sale.customerName),
            profileId: '',
            profileName: '',
            amount: Number(sale.grandTotal || sale.totalSellPrice || 0),
            date: sale.createdAt || sale.timestamp || sale.saleDate || '',
            reason: sale.customerName || ''
        });
    });

    // 4. سجل السدادات السابقة في بروفايلات العملاء (paymentHistory)
    const profiles = (typeof debtorProfiles !== 'undefined' && Array.isArray(debtorProfiles)) ? debtorProfiles : [];
    profiles.forEach(prof => {
        if (!prof || !Array.isArray(prof.paymentHistory)) return;
        const profileId = String(prof.id || '');
        const profileName = prof.name || '';
        prof.paymentHistory.forEach(p => {
            if (!p) return;
            const pType = String(p.type || '').toLowerCase();
            if (pType === 'cancelled' || pType === 'refund' || pType === 'forgiven' || pType === 'reversal' || pType === 'writeoff' || p.isCancelled || p.isForgiven) return;
            if (p.type === 'selected_debts' && p.debtReason) {
                const parts = String(p.debtReason).split('،').map(s => s.trim()).filter(Boolean);
                const ids = Array.isArray(p.debtIds) ? p.debtIds : [];
                parts.forEach((part, idx) => {
                    if (!/^بيعة\s+باسم\s+/i.test(part)) return;
                    const dId = ids[idx] ? String(ids[idx]) : '';
                    if (dId && seenDebtIds.has(dId)) return;
                    if (dId) seenDebtIds.add(dId);

                    const norm = extractOrderCustomerName(part);
                    if (!norm) return;

                    const parsedAmt = _sraParseAmountFromReasonItem(part);
                    _sraPushToIndex(index, norm, {
                        source: 'paid_debt',
                        sourceLabel: 'تم سداده سابقاً',
                        id: dId || `${p.id || 'pay'}_${idx}`,
                        ref: String(dId || p.id || ''),
                        customerName: _sraCleanOrderCustomerDisplayName(part),
                        profileId,
                        profileName,
                        amount: parsedAmt !== null ? parsedAmt : (Number(p.amount) || 0),
                        date: p.date || '',
                        reason: part
                    });
                });
            } else {
                const reasonStr = String(p.debtReason || '').trim();
                if (!/^بيعة\s+باسم\s+/i.test(reasonStr)) return;
                const dId = p.debtId ? String(p.debtId) : '';
                if (dId && seenDebtIds.has(dId)) return;
                if (dId) seenDebtIds.add(dId);

                const norm = extractOrderCustomerName(reasonStr);
                if (!norm) return;

                _sraPushToIndex(index, norm, {
                    source: 'paid_debt',
                    sourceLabel: 'تم سداده سابقاً',
                    id: dId || String(p.id || ''),
                    ref: String(dId || p.id || ''),
                    customerName: _sraCleanOrderCustomerDisplayName(reasonStr),
                    profileId,
                    profileName,
                    amount: Number(p.amount) || 0,
                    date: p.date || '',
                    reason: reasonStr
                });
            }
        });
    });

    return index;
}
window.buildRepeatOrderNameIndex = buildRepeatOrderNameIndex;

function findRepeatOrdersByCustomerName(rawName, options = {}) {
    const displayName = _sraCleanOrderCustomerDisplayName(rawName);
    const norm = extractOrderCustomerName(rawName);
    if (!norm) {
        return { normalizedName: '', displayName, matches: [], totalCount: 0, activeDebtCount: 0, paidDebtCount: 0 };
    }
    const index = (options && options.index instanceof Map) ? options.index : buildRepeatOrderNameIndex();
    const rawEntries = index.get(norm) || [];

    const allowedSources = Array.isArray(options.sources) && options.sources.length > 0 ? new Set(options.sources) : null;
    const targetProfileId = options.profileId ? String(options.profileId) : '';
    const targetProfileName = options.profileName ? _sraNormalizeNameCore(options.profileName) : '';

    const scopedEntries = rawEntries.filter(rec => {
        if (allowedSources && !allowedSources.has(rec.source)) return false;
        if (targetProfileId) {
            if (!rec.profileId || String(rec.profileId) !== targetProfileId) return false;
        }
        if (targetProfileName) {
            if (!rec.profileName || _sraNormalizeNameCore(rec.profileName) !== targetProfileName) return false;
        }
        return true;
    });

    const excludePendingId = options.excludePendingId ? String(options.excludePendingId) : '';
    const excludeDebtId = options.excludeDebtId ? String(options.excludeDebtId) : '';
    const excludeSaleId = options.excludeSaleId ? String(options.excludeSaleId) : '';

    const matches = scopedEntries.filter(rec => {
        if (excludePendingId && rec.source === 'pending' && rec.id === excludePendingId) return false;
        if (excludeDebtId && rec.source === 'active_debt' && rec.id === excludeDebtId) return false;
        if (excludeSaleId && rec.source === 'sale_today' && rec.id === excludeSaleId) return false;
        return true;
    });

    const activeDebtCount = scopedEntries.filter(r => r.source === 'active_debt').length;
    const paidDebtCount = scopedEntries.filter(r => r.source === 'paid_debt').length;

    return {
        normalizedName: norm,
        displayName: displayName || (matches[0] ? matches[0].customerName : (scopedEntries[0] ? scopedEntries[0].customerName : '')),
        matches,
        totalCount: scopedEntries.length,
        activeDebtCount,
        paidDebtCount
    };
}
window.findRepeatOrdersByCustomerName = findRepeatOrdersByCustomerName;

function detectDuplicateNamesInPaymentEntry(payment, prebuiltIndex, profileId) {
    if (!payment || !payment.debtReason) return [];
    const index = (prebuiltIndex instanceof Map) ? prebuiltIndex : buildRepeatOrderNameIndex();
    const parts = payment.type === 'selected_debts'
        ? String(payment.debtReason).split('،').map(s => s.trim()).filter(Boolean)
        : [String(payment.debtReason).trim()];

    const countsInPayment = new Map();
    const displayMap = new Map();

    parts.forEach(part => {
        if (!/^بيعة\s+باسم\s+/i.test(part)) return;
        const norm = extractOrderCustomerName(part);
        if (!norm) return;
        countsInPayment.set(norm, (countsInPayment.get(norm) || 0) + 1);
        if (!displayMap.has(norm)) displayMap.set(norm, _sraCleanOrderCustomerDisplayName(part));
    });

    const alerts = [];
    countsInPayment.forEach((countInPayment, norm) => {
        const debtScopeEntries = (index.get(norm) || []).filter(r => {
            if (r.source !== 'active_debt' && r.source !== 'paid_debt') return false;
            if (profileId && (!r.profileId || String(r.profileId) !== String(profileId))) return false;
            return true;
        });
        const totalDebtCount = debtScopeEntries.length;
        if (countInPayment >= 2 || totalDebtCount >= 2) {
            alerts.push({
                normalizedName: norm,
                name: displayMap.get(norm) || norm,
                countInPayment,
                totalSystemCount: Math.max(countInPayment, totalDebtCount)
            });
        }
    });
    return alerts;
}
window.detectDuplicateNamesInPaymentEntry = detectDuplicateNamesInPaymentEntry;

function _sraFormatShortOrderDate(dateStr) {
    if (!dateStr) return 'غير محدد';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    try {
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

function _sraGetSourceBadgeStyle(source) {
    switch (source) {
        case 'pending': return 'bg-sky-100 text-sky-800 border-sky-200';
        case 'sale_today': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'active_debt': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'paid_debt': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
}

function _sraEscHtml(v) {
    if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(v);
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showRepeatOrderAlertDetails(rawCustomerName, options = {}) {
    const info = findRepeatOrdersByCustomerName(rawCustomerName, options || {});
    if (!info.normalizedName || typeof document === 'undefined' || !document.body) return;

    let modal = document.getElementById('repeatOrderAlertDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'repeatOrderAlertDetailsModal';
        modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:100050; background:rgba(15,23,42,0.6); backdrop-filter:blur(3px); align-items:center; justify-content:center; padding:16px;';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        document.body.appendChild(modal);
    }

    const esc = _sraEscHtml;
    const fmt = (typeof window.formatCurrency === 'function') ? window.formatCurrency : (v => `${v} ج.م`);

    const sorted = [...info.matches].sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return (tb || 0) - (ta || 0);
    });

    const rowsHTML = sorted.map((rec, idx) => `
        <div class="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap justify-between items-center gap-2 hover:border-amber-300 transition">
            <div class="space-y-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[11px] font-black text-slate-500">#${idx + 1}</span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${_sraGetSourceBadgeStyle(rec.source)}">${esc(rec.sourceLabel)}</span>
                    ${rec.profileName ? `<span class="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">حساب: ${esc(rec.profileName)}</span>` : ''}
                    <span class="text-[11px] text-slate-400 font-mono">${esc(_sraFormatShortOrderDate(rec.date))}</span>
                </div>
                <div class="text-xs text-slate-600 truncate">${esc(rec.reason || rec.customerName)}</div>
                ${rec.ref ? `<div class="text-[10px] text-slate-400 font-mono">مرجع: ${esc(rec.ref)}</div>` : ''}
            </div>
            <div class="font-mono font-black text-sm text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                ${fmt(Number(rec.amount) || 0)}
            </div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div style="background:#fff; width:100%; max-width:560px; max-height:85vh; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,0.28);">
            <div style="background:linear-gradient(to left,#d97706,#f59e0b); color:#fff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
                <div class="flex items-center gap-2.5">
                    <span class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg"><i class="fas fa-bell"></i></span>
                    <div>
                        <div style="font-size:1.05rem; font-weight:800;">تنبيه: أوردرات متكررة بنفس الاسم</div>
                        <div style="font-size:.82rem; opacity:.95;">العميل: <strong>${esc(info.displayName)}</strong> — إجمالي (${sorted.length}) أوردرات</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('repeatOrderAlertDetailsModal').style.display='none'" style="background:transparent; color:#fff; border:none; font-size:1.6rem; cursor:pointer; line-height:1;">&times;</button>
            </div>
            <div style="padding:16px; overflow-y:auto; flex:1 1 auto; background:#f8fafc;" class="space-y-3">
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <i class="fas fa-info-circle ml-1 text-amber-600"></i>
                    <strong>لماذا ظهر هذا التنبيه؟</strong> يوجد أكثر من أوردر مسجل بنفس الاسم (<strong>${esc(info.displayName)}</strong>). راجع التواريخ والمبالغ أدناه للتأكد أنها طلبات منفصلة وليست تكراراً غير مقصود.
                </div>
                <div class="space-y-2">
                    ${rowsHTML || '<div class="text-center text-slate-400 text-xs py-4">لا توجد تفاصيل إضافية.</div>'}
                </div>
            </div>
            <div style="padding:12px 16px; background:#fff; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end;">
                <button type="button" onclick="document.getElementById('repeatOrderAlertDetailsModal').style.display='none'" class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition">إغلاق</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}
window.showRepeatOrderAlertDetails = showRepeatOrderAlertDetails;

function confirmRepeatOrderIfDuplicate(rawCustomerName, options = {}) {
    const info = findRepeatOrdersByCustomerName(rawCustomerName, options);
    if (!info.normalizedName || info.matches.length === 0) {
        return { proceed: true, isRepeat: false, orderNumber: 1, matches: [] };
    }

    const fmt = (typeof window.formatCurrency === 'function') ? window.formatCurrency : (v => `${v} ج.م`);
    const previewLines = info.matches.slice(0, 5).map((m, idx) => {
        const profPart = m.profileName ? ` [${m.profileName}]` : '';
        return `${idx + 1}) ${m.sourceLabel}${profPart} — ${fmt(m.amount)} — ${_sraFormatShortOrderDate(m.date)}`;
    }).join('\n');
    const extraLine = info.matches.length > 5 ? `\n... وعدد (${info.matches.length - 5}) أوردرات أخرى.` : '';

    const msg =
        `🔔 تنبيه: يوجد (${info.matches.length}) أوردر سابق بنفس الاسم "${info.displayName}"!\n\n` +
        `${previewLines}${extraLine}\n\n` +
        `هل هذا أوردر جديد منفصل لنفس العميل (طلب رقم #${info.matches.length + 1}) وتريد المتابعة؟`;

    const proceed = confirm(msg);
    return { proceed, isRepeat: true, orderNumber: info.matches.length + 1, matches: info.matches };
}
window.confirmRepeatOrderIfDuplicate = confirmRepeatOrderIfDuplicate;

function updateCustomerRepeatBanner(inputEl, options = {}) {
    if (!inputEl || !inputEl.parentElement) return;
    const bannerId = `${inputEl.id || 'cust'}_repeat_alarm_banner`;
    let banner = document.getElementById(bannerId);

    const rawVal = (inputEl.value || '').trim();
    const info = findRepeatOrdersByCustomerName(rawVal, options);

    if (!info.normalizedName || info.matches.length === 0) {
        if (banner) banner.style.display = 'none';
        return;
    }

    if (!banner) {
        banner = document.createElement('div');
        banner.id = bannerId;
        banner.style.cssText = 'margin-top:6px; padding:7px 10px; border-radius:10px; background:#fffbeb; border:1px solid #f59e0b; color:#92400e; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; cursor:pointer; box-shadow:0 2px 6px rgba(245,158,11,0.15);';
        inputEl.insertAdjacentElement('afterend', banner);
    }

    const esc = _sraEscHtml;
    const latest = info.matches[0];
    const fmt = (typeof window.formatCurrency === 'function') ? window.formatCurrency : (v => `${v} ج.م`);

    banner.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:6px;">
            <i class="fas fa-bell" style="color:#d97706;"></i>
            <span>تنبيه: الاسم <strong>"${esc(info.displayName)}"</strong> له <strong>(${info.matches.length})</strong> أوردر سابق (${esc(latest.sourceLabel)} — ${fmt(latest.amount)})</span>
        </span>
        <span style="background:#fef3c7; border:1px solid #fcd34d; color:#78350f; padding:2px 8px; border-radius:999px; font-size:11px;">عرض التفاصيل</span>
    `;
    banner.onclick = () => showRepeatOrderAlertDetails(info.displayName);
    banner.style.display = 'flex';
}
window.updateCustomerRepeatBanner = updateCustomerRepeatBanner;

function initRepeatOrderAlarmWatchers() {
    if (typeof document === 'undefined') return;
    const watchedIds = ['inv_customerName', 'sell-customer-name', 'usm_customer_name'];
    watchedIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.repeatAlarmBound === '1') return;
        el.dataset.repeatAlarmBound = '1';
        const handler = () => {
            const opts = {};
            if (id === 'inv_customerName' && typeof window.pendingSaleOriginData !== 'undefined' && window.pendingSaleOriginData && window.pendingSaleOriginData.id) {
                opts.excludePendingId = window.pendingSaleOriginData.id;
            }
            updateCustomerRepeatBanner(el, opts);
        };
        el.addEventListener('input', handler);
        el.addEventListener('focus', handler);
    });
}
window.initRepeatOrderAlarmWatchers = initRepeatOrderAlarmWatchers;

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initRepeatOrderAlarmWatchers());
    } else if (typeof setTimeout === 'function') {
        setTimeout(() => initRepeatOrderAlarmWatchers(), 0);
    } else {
        initRepeatOrderAlarmWatchers();
    }
}
