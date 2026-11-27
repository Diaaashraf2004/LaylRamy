/**
 * js/serials/serials-scanner-ui.js
 * واجهة سطح المكتب والربط: زر قسم السيريالات + نافذة QR والتثبيت (PWA) + نافذة تأكيد استلام السيريال اللحظية.
 */

function serialScannerUI_escapeHtml(str) {
    if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') {
        return window.escapeHTML(str == null ? '' : String(str));
    }
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function serialScannerUI_saleStatusLabel(status) {
    if (status === 'sold') return 'مباع (أرشيف)';
    if (status === 'pending') return 'معلق / محجوز';
    return 'متاح للبيع';
}

function serialScannerUI_alert(msg) {
    if (typeof window !== 'undefined' && typeof window.safeAlert === 'function') window.safeAlert(msg);
    else if (typeof alert === 'function') alert(msg);
}

const SerialScannerUI = {
    _activeIncomingCleanup: null,
    _activeIncomingScanId: '',

    init() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        this._injectScopedStyles();
        this._injectSerialsHeaderButton();
        if (window.SerialScannerBridge) {
            window.SerialScannerBridge.onStatusChange((info, snap) => {
                this._syncLiveBadges(info);
                if (window.SerialScannerCamera && typeof window.SerialScannerCamera.syncStatus === 'function') {
                    window.SerialScannerCamera.syncStatus(info, snap);
                }
            });
            this._syncLiveBadges(window.SerialScannerBridge.getConnectionInfo());
        }
    },

    _injectScopedStyles() {
        if (document.getElementById('serials-scanner-scoped-css')) return;
        const style = document.createElement('style');
        style.id = 'serials-scanner-scoped-css';
        style.textContent = `
            #serials-mobile-scanner-app { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
            #serials-mobile-scanner-app input[type="text"] {
                background-color: #020617 !important; color: #f8fafc !important;
                border: 1px solid #334155 !important; min-width: 0 !important; width: auto;
            }
            #serials-mobile-scanner-app input[type="text"]:focus {
                background-color: #0f172a !important; color: #ffffff !important;
                border-color: #38bdf8 !important; box-shadow: 0 0 0 2px rgba(56,189,248,0.35) !important;
            }
            #serials-mobile-scanner-app input[type="checkbox"] { width: 18px !important; height: 18px !important; margin: 0 !important; }
            #serials-mobile-scanner-app .scanner-sky-btn { background-color: #0284c7 !important; color: #ffffff !important; }
            #serials-mobile-scanner-app .scanner-sky-btn:hover { background-color: #0369a1 !important; }
            #serials-incoming-close-x, #serials-pairing-close-btn { min-height: 32px !important; padding: 0 !important; }
            #serials-qr-reader video { width: 100% !important; border-radius: 0.75rem; display: block; }
        `;
        document.head.appendChild(style);
    },

    _injectSerialsHeaderButton() {
        const exportBtn = document.getElementById('export-serials-btn');
        if (!exportBtn || document.getElementById('serials-open-pairing-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'serials-open-pairing-btn';
        btn.type = 'button';
        btn.className = 'bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-sm flex items-center gap-2';
        btn.innerHTML = '<span id="serials-bridge-live-dot" class="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span><i class="fas fa-mobile-screen-button"></i> <span>قارئ الموبايل والربط</span>';
        btn.addEventListener('click', () => this.openPairingModal());
        exportBtn.parentElement.classList.add('flex-wrap');
        exportBtn.parentElement.insertBefore(btn, exportBtn);
    },

    _syncLiveBadges(info) {
        const state = info ? info.state : 'disconnected';
        const connected = state === 'connected';
        const dot = document.getElementById('serials-bridge-live-dot');
        if (dot) {
            dot.className = connected
                ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block'
                : (state === 'offline_cache' ? 'w-2.5 h-2.5 rounded-full bg-rose-400 inline-block' : 'w-2.5 h-2.5 rounded-full bg-amber-300 inline-block');
        }
        const pStatus = document.getElementById('serials-pairing-conn-box');
        if (pStatus) {
            if (connected) {
                pStatus.innerHTML = `<span class="inline-flex items-center gap-2 text-emerald-700 font-bold"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> متصل وجاهز لاستقبال السيريالات لحظياً (${serialScannerUI_escapeHtml(info.email)})</span>`;
            } else if (state === 'offline_cache') {
                pStatus.innerHTML = '<span class="inline-flex items-center gap-2 text-rose-700 font-bold"><i class="fas fa-wifi"></i> غير متصل بالإنترنت — سيعود الاستقبال تلقائياً فور عودة الشبكة</span>';
            } else {
                pStatus.innerHTML = '<span class="inline-flex items-center gap-2 text-amber-700 font-bold"><i class="fas fa-circle-exclamation"></i> يرجى تسجيل الدخول بحساب البرنامج أولاً لتفعيل الربط</span>';
            }
        }
        const installBtn = document.getElementById('serials-pwa-install-btn');
        if (installBtn && info) {
            if (info.isStandalone) {
                installBtn.disabled = true;
                installBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>التطبيق مثبّت بالفعل على هذا الجهاز</span>';
                installBtn.className = 'w-full py-2.5 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm flex items-center justify-center gap-2';
            } else if (info.canInstall) {
                installBtn.disabled = false;
                installBtn.innerHTML = '<i class="fas fa-download"></i> <span>تثبيت كبرنامج على هذا الجهاز الآن</span>';
                installBtn.className = 'w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer';
            }
        }
    },

    isIncomingModalOpen() {
        return Boolean(document.getElementById('serials-incoming-scan-modal'));
    },

    closeIncomingModalIfMatches(scanId) {
        if (scanId && this._activeIncomingScanId === scanId && typeof this._activeIncomingCleanup === 'function') {
            this._activeIncomingCleanup(false);
        }
    },

    showIncomingSerialPrompt(scanPayload, existingRecord) {
        if (typeof this._activeIncomingCleanup === 'function') {
            this._activeIncomingCleanup(false);
        }

        const serial = serialScannerUI_escapeHtml(scanPayload.serial || '');
        const source = serialScannerUI_escapeHtml(scanPayload.sourceLabel || 'الموبايل');
        const scanId = scanPayload.scanId || '';
        const isDup = Boolean(existingRecord);

        const overlay = document.createElement('div');
        overlay.id = 'serials-incoming-scan-modal';
        overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4';
        overlay.style.zIndex = '9999';

        const dupInfoHtml = isDup ? `
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1 text-right">
                <div class="font-bold text-amber-800 flex items-center gap-1.5"><i class="fas fa-triangle-exclamation"></i> هذا السيريال مسجل مسبقاً في قسم السيريالات:</div>
                <div><b>الجهاز:</b> ${serialScannerUI_escapeHtml(existingRecord.productName || '-')}</div>
                <div><b>المورد:</b> ${serialScannerUI_escapeHtml(existingRecord.supplierName || '-')} | <b>البطارية:</b> ${serialScannerUI_escapeHtml(existingRecord.shippingPercentage ?? 0)}%</div>
                <div><b>الحالة:</b> ${serialScannerUI_escapeHtml(serialScannerUI_saleStatusLabel(existingRecord.saleStatus))}</div>
            </div>
        ` : `
            <p class="text-slate-700 font-bold text-base text-center m-0">هل تود إدخاله على قسم السيريالات؟</p>
            <p class="text-slate-500 text-xs text-center m-0">عند الموافقة سيتم نقلك فوراً لقسم السيريالات وكتابة السيريال تلقائياً لتكملة بيانات الجهاز.</p>
        `;

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden" dir="rtl">
                <div class="${isDup ? 'bg-amber-500' : 'bg-sky-600'} text-white px-5 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg"><i class="fas ${isDup ? 'fa-triangle-exclamation' : 'fa-barcode'}"></i></div>
                        <div><h3 class="font-black text-base m-0">${isDup ? 'تنبيه: سيريال مسجل مسبقاً' : 'تم استلام سيريال جديد'}</h3><div class="text-xs text-white/85">وارد من: ${source}</div></div>
                    </div>
                    <button type="button" id="serials-incoming-close-x" class="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border-0 cursor-pointer"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-5 space-y-4">
                    <div class="bg-slate-900 text-emerald-300 rounded-xl p-3.5 flex items-center justify-between gap-2">
                        <span class="font-mono font-black text-lg tracking-wider select-all break-all" dir="ltr">${serial}</span>
                        <button type="button" id="serials-incoming-copy-btn" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer shrink-0"><i class="fas fa-copy"></i> نسخ</button>
                    </div>
                    ${dupInfoHtml}
                    <div class="flex flex-col sm:flex-row gap-2.5 pt-1">
                        <button type="button" id="serials-incoming-accept-btn" class="flex-1 py-3 px-4 rounded-xl ${isDup ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-black text-sm shadow-sm border-0 cursor-pointer flex items-center justify-center gap-2"><i class="fas ${isDup ? 'fa-magnifying-glass' : 'fa-check-circle'}"></i><span>${isDup ? 'عرضه في قسم السيريالات' : 'موافق — إدخال لقسم السيريالات'}</span></button>
                        <button type="button" id="serials-incoming-dismiss-btn" class="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200 cursor-pointer">${isDup ? 'إغلاق' : 'تجاهل'}</button>
                    </div>
                </div>
            </div>`;

        document.body.appendChild(overlay);
        this._activeIncomingScanId = scanId;

        const keyHandler = (e) => {
            if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !overlay.contains(e.target)) return;
            if (e.key === 'Escape') this._finishIncomingModal(true);
            else if (e.key === 'Enter') { e.preventDefault(); this._acceptCurrentIncoming(scanPayload, existingRecord); }
        };

        this._activeIncomingCleanup = (notifyDismiss) => {
            document.removeEventListener('keydown', keyHandler);
            overlay.remove();
            this._activeIncomingCleanup = null;
            this._activeIncomingScanId = '';
            if (notifyDismiss && scanId && window.SerialScannerBridge) {
                window.SerialScannerBridge.updateScanStatus(scanId, 'dismissed');
            }
            if (window.SerialScannerBridge && typeof window.SerialScannerBridge.processNextQueuedScan === 'function') {
                setTimeout(() => window.SerialScannerBridge.processNextQueuedScan(), 150);
            }
        };

        document.addEventListener('keydown', keyHandler);
        overlay.querySelector('#serials-incoming-accept-btn').addEventListener('click', () => this._acceptCurrentIncoming(scanPayload, existingRecord));
        overlay.querySelector('#serials-incoming-dismiss-btn').addEventListener('click', () => this._finishIncomingModal(true));
        overlay.querySelector('#serials-incoming-close-x').addEventListener('click', () => this._finishIncomingModal(true));
        overlay.querySelector('#serials-incoming-copy-btn').addEventListener('click', () => {
            if (navigator.clipboard) navigator.clipboard.writeText(scanPayload.serial || '').catch(() => {});
            if (typeof window.showGlobalMessage === 'function') window.showGlobalMessage('تم نسخ السيريال.');
        });
    },

    _finishIncomingModal(notifyDismiss) {
        if (typeof this._activeIncomingCleanup === 'function') this._activeIncomingCleanup(notifyDismiss);
    },

    _acceptCurrentIncoming(scanPayload, existingRecord) {
        this._finishIncomingModal(false);
        if (!window.SerialScannerBridge) return;
        if (existingRecord) window.SerialScannerBridge.focusExistingSerialInTracker(scanPayload.serial, scanPayload.scanId, existingRecord);
        else window.SerialScannerBridge.acceptSerialIntoTracker(scanPayload.serial, scanPayload.scanId);
    },

    openPairingModal() {
        const old = document.getElementById('serials-pairing-modal');
        if (old) old.remove();

        const bridge = window.SerialScannerBridge;
        const info = bridge ? bridge.getConnectionInfo() : {};
        const shareUrl = bridge ? bridge.getShareUrl() : '';
        const qrImgUrl = shareUrl
            ? 'https://api.qrserver.com/v1/create-qr-code/?size=210x210&margin=6&data=' + encodeURIComponent(shareUrl)
            : '';

        const modal = document.createElement('div');
        modal.id = 'serials-pairing-modal';
        modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto';
        modal.style.zIndex = '9950';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto" dir="rtl">
                <div class="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300 flex items-center justify-center text-lg"><i class="fas fa-qrcode"></i></div>
                        <div>
                            <h3 class="font-black text-base m-0">ربط قارئ السيريال (الموبايل ⇄ اللابتوب)</h3>
                            <div class="text-xs text-slate-300">امسح الباركود بكاميرا الموبايل ليصلك فوراً في البرنامج</div>
                        </div>
                    </div>
                    <button type="button" id="serials-pairing-close-btn" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer"><i class="fas fa-times"></i></button>
                </div>

                <div class="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
                    <div id="serials-pairing-conn-box" class="rounded-xl p-3 bg-slate-50 border border-slate-200 text-xs"></div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-sky-50/70 border border-sky-100 rounded-2xl p-4">
                        <div class="flex flex-col items-center justify-center">
                            ${qrImgUrl
                                ? `<div id="serials-qr-box" class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"><img id="serials-qr-img" src="${qrImgUrl}" alt="QR قارئ السيريال" class="w-44 h-44 block rounded-lg"></div><span class="text-[11px] text-slate-500 mt-2 font-bold">صوّر الكود بكاميرا الموبايل لفتح القارئ فوراً</span>`
                                : '<div class="p-4 text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl font-bold">افتح البرنامج من رابط GitHub Pages (HTTPS) ليظهر كود الربط للموبايل وتعمل الكاميرا.</div>'}
                        </div>
                        <div class="space-y-2.5">
                            <div class="text-sm font-black text-slate-800">خطوات التثبيت والتشغيل:</div>
                            <ol class="text-xs text-slate-600 space-y-1.5 pr-4 m-0 list-decimal leading-relaxed">
                                <li>افتح الرابط على الموبايل وسجّل دخول بنفس حساب البرنامج (يعمل مع اللابتوب بدون تجميد الجلسة).</li>
                                <li>اضغط <b>تثبيت التطبيق</b> (أو في آيفون: مشاركة ⬅ إضافة للشاشة الرئيسية).</li>
                                <li>امسح باركود أي جهاز ← ستظهر لك رسالة تأكيد فورية هنا على اللابتوب.</li>
                            </ol>
                            ${shareUrl ? `<input type="text" readonly dir="ltr" value="${serialScannerUI_escapeHtml(shareUrl)}" class="w-full text-[11px] font-mono bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600">` : ''}
                            <div class="flex flex-wrap gap-2 pt-1">
                                <button type="button" id="serials-copy-scanner-url" class="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs cursor-pointer"><i class="fas fa-link"></i> نسخ الرابط</button>
                                <button type="button" id="serials-launch-scanner-here" class="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white border-0 font-bold text-xs cursor-pointer"><i class="fas fa-camera"></i> فتح القارئ هنا</button>
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                        <div class="text-xs font-black text-slate-700 flex items-center gap-1.5"><i class="fas fa-laptop-code text-sky-600"></i> تثبيت البرنامج على هذا الجهاز (اللابتوب أو الموبايل):</div>
                        <button type="button" id="serials-pwa-install-btn" class="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 border-0 cursor-pointer">
                            <i class="fas fa-download"></i> <span>تثبيت كتطبيق مستقل (PWA)</span>
                        </button>
                        <div class="text-[11px] text-slate-500 leading-relaxed">
                            <b>على اللابتوب (Chrome / Edge):</b> اضغط أيقونة التثبيت في شريط العنوان بالأعلى لينزل كبرنامج على سطح المكتب.<br>
                            <b>على الآيفون (Safari):</b> اضغط زر المشاركة <i class="fas fa-arrow-up-from-bracket"></i> ثم «إضافة إلى الشاشة الرئيسية».
                        </div>
                    </div>

                    <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <button type="button" id="serials-test-incoming-btn" class="py-2 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs cursor-pointer"><i class="fas fa-vial"></i> تجربة رسالة الاستلام الآن</button>
                        <button type="button" id="serials-pairing-done-btn" class="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer">إغلاق</button>
                    </div>
                </div>
            </div>`;

        document.body.appendChild(modal);
        this._syncLiveBadges(info);

        const qrImg = modal.querySelector('#serials-qr-img');
        if (qrImg) {
            qrImg.addEventListener('error', () => {
                const box = modal.querySelector('#serials-qr-box');
                if (box) box.innerHTML = '<div class="w-44 h-32 flex items-center justify-center text-center text-xs text-slate-500 p-2 font-bold">تعذر تحميل صورة الـ QR — انسخ الرابط وأرسله للموبايل مباشرة.</div>';
            });
        }

        modal.querySelector('#serials-pairing-close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('#serials-pairing-done-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('#serials-copy-scanner-url').addEventListener('click', () => {
            if (!shareUrl) return serialScannerUI_alert('افتح البرنامج من رابط HTTPS (GitHub Pages) أولاً لنسخ رابط الموبايل.');
            if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
            if (typeof window.showGlobalMessage === 'function') window.showGlobalMessage('تم نسخ رابط قارئ السيريال للموبايل.');
        });

        modal.querySelector('#serials-launch-scanner-here').addEventListener('click', () => {
            modal.remove();
            if (window.SerialScannerCamera) window.SerialScannerCamera.openMobileScanner();
        });

        modal.querySelector('#serials-pwa-install-btn').addEventListener('click', async () => {
            if (!bridge) return;
            if (bridge.canPromptInstall()) await bridge.promptInstall();
            else if (bridge.isIOSDevice()) serialScannerUI_alert('لتثبيت التطبيق على الآيفون:\n1) افتح الرابط في Safari.\n2) اضغط زر المشاركة بالأسفل.\n3) اختر "إضافة إلى الشاشة الرئيسية".');
            else serialScannerUI_alert('لتثبيت البرنامج على اللابتوب أو أندرويد:\nاضغط على قائمة المتصفح (⋮) أو أيقونة التثبيت في شريط العنوان ثم اختر "تثبيت التطبيق / Install App".');
        });

        modal.querySelector('#serials-test-incoming-btn').addEventListener('click', async () => {
            if (!bridge) return;
            modal.remove();
            const sampleSn = 'TEST-' + Math.floor(100000 + Math.random() * 900000);
            const res = await bridge.sendScannedSerial(sampleSn, { sourceLabel: 'اختبار محلي', allowSelfReceive: true });
            if (!res.ok) serialScannerUI_alert(res.error || 'تعذر إجراء الاختبار.');
        });
    }
};

if (typeof window !== 'undefined') {
    window.SerialScannerUI = SerialScannerUI;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => SerialScannerUI.init());
    else SerialScannerUI.init();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SerialScannerUI, serialScannerUI_escapeHtml, serialScannerUI_saleStatusLabel };
}
