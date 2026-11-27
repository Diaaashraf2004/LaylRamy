/**
 * js/serials/serials-scanner-camera.js
 * تطبيق قارئ السيريال بكاميرا الموبايل (أندرويد و آيفون) مع استعادة الكاميرا بعد قفل الشاشة وفحص الفلاش الحقيقي.
 */

const SERIAL_SCANNER_CAM_LIBS = [
    'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

let serialScannerCam_libPromise = null;

function serialScannerCam_loadLib() {
    if (typeof window !== 'undefined' && typeof window.Html5Qrcode === 'function') return Promise.resolve(true);
    if (serialScannerCam_libPromise) return serialScannerCam_libPromise;

    serialScannerCam_libPromise = new Promise((resolve, reject) => {
        let idx = 0;
        const loadNext = () => {
            if (idx >= SERIAL_SCANNER_CAM_LIBS.length) {
                serialScannerCam_libPromise = null;
                reject(new Error('تعذر تحميل مكتبة الكاميرا. تأكد من الاتصال بالإنترنت.'));
                return;
            }
            const script = document.createElement('script');
            script.src = SERIAL_SCANNER_CAM_LIBS[idx++];
            script.async = true;
            script.onload = () => (typeof window.Html5Qrcode === 'function' ? resolve(true) : loadNext());
            script.onerror = () => loadNext();
            document.head.appendChild(script);
        };
        loadNext();
    });
    return serialScannerCam_libPromise;
}

function serialScannerCam_computeQrBox(vw, vh) {
    const safeW = Math.max(50, vw - 20);
    const safeH = Math.max(50, vh - 20);
    return {
        width: Math.min(safeW, Math.max(50, Math.min(320, Math.floor(vw * 0.85)))),
        height: Math.min(safeH, Math.max(50, Math.min(180, Math.floor(vh * 0.45))))
    };
}

function serialScannerCam_extractError(err) {
    if (typeof err === 'string' && err.trim()) return err.trim();
    if (err && typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    return 'تحقق من إذن الكاميرا في إعدادات المتصفح';
}

const SerialScannerCamera = {
    _qrInstance: null,
    _cameraRunning: false,
    _torchOn: false,
    _torchSupported: false,
    _lastCode: '',
    _lastCodeAt: 0,
    _autoSend: true,
    _activeScanId: '',
    _startSeq: 0,
    _lifecycleBound: false,
    _pausedByVisibility: false,

    _escape(str) {
        return typeof serialScannerUI_escapeHtml === 'function'
            ? serialScannerUI_escapeHtml(str)
            : String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _alert(msg) {
        if (typeof serialScannerUI_alert === 'function') serialScannerUI_alert(msg);
        else if (typeof alert === 'function') alert(msg);
    },

    _bindLifecycle() {
        if (this._lifecycleBound || typeof document === 'undefined') return;
        this._lifecycleBound = true;
        document.addEventListener('visibilitychange', () => {
            const bridge = window.SerialScannerBridge;
            if (!bridge || !bridge.isScannerModeActive()) return;
            if (document.hidden) {
                if (this._cameraRunning) {
                    this._pausedByVisibility = true;
                    this.stopCamera();
                }
            } else if (this._pausedByVisibility) {
                this._pausedByVisibility = false;
                this.startCamera();
            }
        });
        window.addEventListener('pagehide', () => {
            if (this._cameraRunning) this.stopCamera();
        });
    },

    openMobileScanner() {
        this._bindLifecycle();
        const bridge = window.SerialScannerBridge;
        if (bridge) bridge.setScannerModeActive(true);

        let overlay = document.getElementById('serials-mobile-scanner-app');
        if (overlay) {
            overlay.classList.remove('hidden');
            const defChk = document.getElementById('serials-default-device-chk');
            if (defChk && bridge) defChk.checked = bridge.isDefaultScannerDevice();
            if (bridge) this.syncStatus(bridge.getConnectionInfo(), null);
            this._renderMobileHistory();
            this.startCamera();
            return;
        }

        const isDefault = bridge ? bridge.isDefaultScannerDevice() : false;
        overlay = document.createElement('div');
        overlay.id = 'serials-mobile-scanner-app';
        overlay.className = 'fixed inset-0 bg-slate-950 text-white flex flex-col overflow-y-auto';
        overlay.style.zIndex = '9980';
        overlay.setAttribute('dir', 'rtl');

        overlay.innerHTML = `
            <header class="px-4 py-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 sticky top-0 z-10">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl scanner-sky-btn flex items-center justify-center text-white shadow"><i class="fas fa-barcode"></i></div>
                    <div>
                        <div class="font-black text-sm leading-tight">قارئ السيريال المباشر</div>
                        <div id="serials-mobile-conn-pill" class="text-[11px] text-emerald-300 flex items-center gap-1.5 mt-0.5"></div>
                    </div>
                </div>
                <button type="button" id="serials-mobile-exit-btn" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"><i class="fas fa-arrow-right-from-bracket"></i> البرنامج الكامل</button>
            </header>

            <main class="flex-1 w-full max-w-lg mx-auto p-4 space-y-4">
                <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div class="relative bg-black min-h-[240px]">
                        <div id="serials-qr-reader" class="w-full"></div>
                        <div id="serials-cam-status-overlay" class="p-6 text-center text-slate-300 text-xs font-bold">جاري تجهيز الكاميرا...</div>
                    </div>
                    <div class="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex gap-2">
                            <button type="button" id="serials-cam-toggle-btn" class="px-3.5 py-2 rounded-xl scanner-sky-btn text-white text-xs font-bold border-0 cursor-pointer"><i class="fas fa-camera"></i> تشغيل الكاميرا</button>
                            <button type="button" id="serials-cam-torch-btn" class="hidden px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"><i class="fas fa-bolt"></i> فلاش</button>
                        </div>
                        <label class="inline-flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer select-none">
                            <input type="checkbox" id="serials-auto-send-chk" checked class="accent-emerald-500">
                            <span>إرسال تلقائي</span>
                        </label>
                    </div>
                </div>

                <div id="serials-mobile-delivery-banner" class="hidden rounded-2xl p-3.5 text-sm font-bold"></div>

                <div class="bg-slate-900 rounded-2xl border border-slate-800 p-3.5 space-y-2.5">
                    <label class="block text-xs font-bold text-slate-300">السيريال المقروء (أو اكتب/الصق يدوياً):</label>
                    <div class="flex gap-2 items-stretch">
                        <input type="text" id="serials-mobile-manual-input" dir="ltr" placeholder="امسح الباركود أو اكتب السيريال..." class="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none">
                        <button type="button" id="serials-mobile-send-btn" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm border-0 cursor-pointer shrink-0"><i class="fas fa-paper-plane"></i> إرسال</button>
                    </div>
                </div>

                <div class="bg-slate-900 rounded-2xl border border-slate-800 p-3.5 space-y-3">
                    <label class="flex items-center justify-between gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                        <span>فتح هذا الموبايل دائماً على «قارئ السيريال»</span>
                        <input type="checkbox" id="serials-default-device-chk" ${isDefault ? 'checked' : ''} class="accent-sky-500">
                    </label>
                    <button type="button" id="serials-mobile-install-btn" class="w-full py-2.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-200 border border-sky-500/40 text-xs font-bold cursor-pointer"><i class="fas fa-mobile-screen"></i> تثبيت «قارئ السيريال» كتطبيق على شاشة الموبايل</button>
                </div>

                <div class="bg-slate-900 rounded-2xl border border-slate-800 p-3.5 space-y-2">
                    <div class="text-xs font-bold text-slate-400">آخر السيريالات المرسلة (اضغط لإعادة الإرسال):</div>
                    <div id="serials-mobile-history-list" class="space-y-1.5 text-xs"></div>
                </div>
            </main>`;

        document.body.appendChild(overlay);
        if (bridge) this.syncStatus(bridge.getConnectionInfo(), null);
        this._renderMobileHistory();

        overlay.querySelector('#serials-mobile-exit-btn').addEventListener('click', () => this.closeMobileScanner());
        overlay.querySelector('#serials-cam-toggle-btn').addEventListener('click', () => (this._cameraRunning ? this.stopCamera() : this.startCamera()));
        overlay.querySelector('#serials-cam-torch-btn').addEventListener('click', () => this.toggleTorch());
        overlay.querySelector('#serials-auto-send-chk').addEventListener('change', (e) => { this._autoSend = Boolean(e.target.checked); });
        overlay.querySelector('#serials-default-device-chk').addEventListener('change', (e) => {
            if (bridge) bridge.setDefaultScannerDevice(Boolean(e.target.checked));
        });
        overlay.querySelector('#serials-mobile-send-btn').addEventListener('click', () => {
            const inp = document.getElementById('serials-mobile-manual-input');
            if (inp && inp.value.trim()) this._dispatchMobileSerial(inp.value.trim(), 'MANUAL');
        });
        overlay.querySelector('#serials-mobile-manual-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                e.preventDefault();
                this._dispatchMobileSerial(e.target.value.trim(), 'MANUAL');
            }
        });
        overlay.querySelector('#serials-mobile-install-btn').addEventListener('click', async () => {
            if (!bridge) return;
            if (bridge.canPromptInstall()) await bridge.promptInstall();
            else if (bridge.isIOSDevice()) this._alert('على الآيفون: اضغط زر المشاركة بالأسفل في Safari ثم اختر "إضافة إلى الشاشة الرئيسية".');
            else this._alert('من قائمة متصفح Chrome (⋮) بالأعلى اختر "تثبيت التطبيق / Add to Home Screen".');
        });

        this.startCamera();
    },

    async closeMobileScanner() {
        this._startSeq++;
        this._pausedByVisibility = false;
        await this.stopCamera();

        const overlay = document.getElementById('serials-mobile-scanner-app');
        if (overlay) overlay.classList.add('hidden');

        const bridge = window.SerialScannerBridge;
        if (bridge) bridge.setScannerModeActive(false);

        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            url.searchParams.delete('scanner');
            if (url.hash === '#scanner' || url.hash === '#mode=scanner') url.hash = '';
            window.history.replaceState({}, '', url.toString());
        } catch (_) {}

        if (bridge && bridge.isCompanionOnlySession() && !window.appInitialized) {
            bridge.markBypassScannerOnce();
            window.location.reload();
        }
    },

    syncStatus(info, snap) {
        const state = info ? info.state : 'disconnected';
        const mStatus = document.getElementById('serials-mobile-conn-pill');
        if (mStatus) {
            if (state === 'connected') mStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>متصل بالكمبيوتر</span>';
            else if (state === 'offline_cache') mStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400"></span><span>بدون إنترنت</span>';
            else mStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>جاري الاتصال...</span>';
        }
        const mInstall = document.getElementById('serials-mobile-install-btn');
        if (mInstall && info) {
            if (info.isStandalone) mInstall.classList.add('hidden');
            else mInstall.classList.remove('hidden');
        }
        const banner = document.getElementById('serials-mobile-delivery-banner');
        if (!banner || !snap || !this._activeScanId || snap.scanId !== this._activeScanId) return;
        const safeSn = this._escape(snap.serial || '');
        if (snap.status === 'accepted') {
            banner.className = 'rounded-2xl p-3.5 text-sm font-bold bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2.5';
            banner.innerHTML = `<i class="fas fa-circle-check text-emerald-400 text-lg"></i><span>تم قبول السيريال <b class="font-mono">${safeSn}</b> وإدخاله لقسم السيريالات على الكمبيوتر!</span>`;
        } else if (snap.status === 'duplicate_viewed') {
            banner.className = 'rounded-2xl p-3.5 text-sm font-bold bg-amber-500/20 border border-amber-400/40 text-amber-200 flex items-center gap-2.5';
            banner.innerHTML = `<i class="fas fa-magnifying-glass text-amber-300 text-lg"></i><span>السيريال <b class="font-mono">${safeSn}</b> مسجل مسبقاً — تم عرضه على الكمبيوتر.</span>`;
        } else if (snap.status === 'dismissed') {
            banner.className = 'rounded-2xl p-3.5 text-sm font-bold bg-slate-700/70 border border-slate-600 text-slate-200 flex items-center gap-2.5';
            banner.innerHTML = `<i class="fas fa-circle-xmark text-slate-400 text-lg"></i><span>تم تجاهل السيريال <b class="font-mono">${safeSn}</b> على الكمبيوتر.</span>`;
        }
    },

    _setCamStatusOverlay(html) {
        const el = document.getElementById('serials-cam-status-overlay');
        if (!el) return;
        if (!html) { el.classList.add('hidden'); el.innerHTML = ''; }
        else { el.classList.remove('hidden'); el.innerHTML = html; }
    },

    async startCamera() {
        const mySeq = ++this._startSeq;
        const readerEl = document.getElementById('serials-qr-reader');
        const toggleBtn = document.getElementById('serials-cam-toggle-btn');
        if (!readerEl) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this._setCamStatusOverlay('<div class="text-amber-300">المتصفح يتطلب فتح الرابط عبر <b>HTTPS</b> لتشغيل الكاميرا. يمكنك الإرسال يدوياً بالأسفل.</div>');
            return;
        }

        try {
            this._setCamStatusOverlay('جاري تشغيل الكاميرا الخلفية...');
            await serialScannerCam_loadLib();
            if (mySeq !== this._startSeq) return;

            await this.stopCamera();
            if (mySeq !== this._startSeq) return;

            const F = window.Html5QrcodeSupportedFormats;
            const bridge = window.SerialScannerBridge;
            const isIOS = bridge ? bridge.isIOSDevice() : false;
            const formats = F ? [
                F.CODE_128, F.CODE_39, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E,
                F.ITF, F.QR_CODE, F.DATA_MATRIX, F.PDF_417
            ] : undefined;

            const instance = new window.Html5Qrcode('serials-qr-reader', {
                formatsToSupport: formats,
                experimentalFeatures: { useBarCodeDetectorIfSupported: !isIOS },
                verbose: false
            });
            this._qrInstance = instance;

            await instance.start(
                { facingMode: 'environment' },
                { fps: 12, qrbox: serialScannerCam_computeQrBox },
                (decodedText, decodedResult) => this._handleDecodedBarcode(decodedText, decodedResult),
                () => {}
            );

            if (mySeq !== this._startSeq) {
                try { await instance.stop(); } catch (_) {}
                try { instance.clear(); } catch (_) {}
                if (this._qrInstance === instance) this._qrInstance = null;
                return;
            }

            this._cameraRunning = true;
            this._torchOn = false;
            this._setCamStatusOverlay('');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-pause"></i> إيقاف الكاميرا';
            this._detectTorchCapability();
        } catch (err) {
            if (mySeq !== this._startSeq) return;
            this._cameraRunning = false;
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-camera"></i> تشغيل الكاميرا';
            this._setCamStatusOverlay(`<div class="text-rose-300 space-y-1"><div>تعذر فتح الكاميرا: ${this._escape(serialScannerCam_extractError(err))}</div><div class="text-slate-400">تأكد من السماح للكاميرا أو استخدم الإدخال اليدوي بالأسفل.</div></div>`);
        }
    },

    _detectTorchCapability() {
        const torchBtn = document.getElementById('serials-cam-torch-btn');
        this._torchSupported = false;
        try {
            if (this._qrInstance && typeof this._qrInstance.getRunningTrackCameraCapabilities === 'function') {
                const caps = this._qrInstance.getRunningTrackCameraCapabilities();
                if (caps && typeof caps.torchFeature === 'function' && caps.torchFeature().isSupported()) {
                    this._torchSupported = true;
                }
            }
        } catch (_) {}
        if (torchBtn) {
            torchBtn.classList.toggle('hidden', !this._torchSupported);
            this._applyTorchBtnStyle(false);
        }
    },

    _applyTorchBtnStyle(on) {
        const btn = document.getElementById('serials-cam-torch-btn');
        if (!btn) return;
        const isHidden = !this._torchSupported || !this._cameraRunning;
        btn.className = (on
            ? 'px-3 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black border border-amber-300 cursor-pointer'
            : 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer')
            + (isHidden ? ' hidden' : '');
    },

    async stopCamera() {
        const toggleBtn = document.getElementById('serials-cam-toggle-btn');
        const torchBtn = document.getElementById('serials-cam-torch-btn');
        const inst = this._qrInstance;
        this._qrInstance = null;
        if (inst && this._cameraRunning) {
            try { await inst.stop(); } catch (_) {}
            try { inst.clear(); } catch (_) {}
        }
        this._cameraRunning = false;
        this._torchOn = false;
        this._torchSupported = false;
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-camera"></i> تشغيل الكاميرا';
        if (torchBtn) { torchBtn.classList.add('hidden'); this._applyTorchBtnStyle(false); }
    },

    async toggleTorch() {
        if (!this._qrInstance || !this._cameraRunning || !this._torchSupported) return;
        try {
            const nextState = !this._torchOn;
            const caps = this._qrInstance.getRunningTrackCameraCapabilities();
            await caps.torchFeature().apply(nextState);
            this._torchOn = nextState;
            this._applyTorchBtnStyle(nextState);
        } catch (_) {
            this._alert('تعذر تشغيل الفلاش على هذه الكاميرا.');
        }
    },

    _handleDecodedBarcode(decodedText, decodedResult) {
        const bridge = window.SerialScannerBridge;
        const cleaned = bridge ? bridge.normalizeCode(decodedText) : String(decodedText || '').trim();
        if (!cleaned) return false;

        const now = Date.now();
        if (cleaned === this._lastCode && (now - this._lastCodeAt) < 2600) return false;
        this._lastCode = cleaned;
        this._lastCodeAt = now;

        if (bridge) bridge.playBeep('scan');
        if (typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(80); } catch (_) {} }

        const inp = typeof document !== 'undefined' ? document.getElementById('serials-mobile-manual-input') : null;
        if (inp) inp.value = cleaned;

        const formatName = decodedResult && decodedResult.result && decodedResult.result.format
            ? decodedResult.result.format.formatName
            : 'BARCODE';

        if (this._autoSend) {
            this._dispatchMobileSerial(cleaned, formatName);
        } else {
            this._setDeliveryBanner('info', `تمت قراءة السيريال <b class="font-mono">${this._escape(cleaned)}</b> — اضغط «إرسال» لإرساله للكمبيوتر.`);
        }
        return true;
    },

    async _dispatchMobileSerial(rawSerial, formatName) {
        const bridge = window.SerialScannerBridge;
        if (!bridge) return;
        this._setDeliveryBanner('sending', 'جاري إرسال السيريال للكمبيوتر...');
        const res = await bridge.sendScannedSerial(rawSerial, { format: formatName });
        if (res.ok && res.payload) {
            this._activeScanId = res.payload.scanId;
            this._setDeliveryBanner('sent', `تم إرسال <b class="font-mono">${this._escape(res.payload.serial)}</b> — بانتظار موافقتك على الكمبيوتر...`);
            this._renderMobileHistory();
        } else {
            this._setDeliveryBanner('error', this._escape(res.error || 'فشل الإرسال.'));
        }
    },

    _setDeliveryBanner(type, htmlMessage) {
        const banner = typeof document !== 'undefined' ? document.getElementById('serials-mobile-delivery-banner') : null;
        if (!banner) return;
        const styles = {
            sending: 'bg-sky-500/20 border-sky-400/40 text-sky-200',
            sent: 'bg-sky-500/20 border-sky-400/40 text-sky-200',
            info: 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200',
            error: 'bg-rose-500/20 border-rose-400/40 text-rose-200'
        };
        banner.className = `rounded-2xl p-3.5 text-sm font-bold border flex items-center gap-2.5 ${styles[type] || styles.info}`;
        banner.innerHTML = `<i class="fas ${type === 'error' ? 'fa-circle-exclamation' : 'fa-satellite-dish'}"></i><span>${htmlMessage}</span>`;
    },

    _renderMobileHistory() {
        const box = typeof document !== 'undefined' ? document.getElementById('serials-mobile-history-list') : null;
        const bridge = window.SerialScannerBridge;
        if (!box || !bridge) return;
        const list = bridge.getRecentHistory();
        if (!list.length) {
            box.innerHTML = '<div class="text-slate-500 text-center py-2">لم يتم مسح أي سيريال بعد.</div>';
            return;
        }
        box.innerHTML = list.map(item => `
            <button type="button" data-resend-sn="${this._escape(item.serial)}" class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-right cursor-pointer">
                <span class="font-mono font-bold text-emerald-300" dir="ltr">${this._escape(item.serial)}</span>
                <span class="text-[11px] text-slate-400"><i class="fas fa-rotate-right"></i> إعادة إرسال</span>
            </button>
        `).join('');
        box.querySelectorAll('[data-resend-sn]').forEach(btn => {
            btn.addEventListener('click', () => this._dispatchMobileSerial(btn.getAttribute('data-resend-sn'), 'HISTORY'));
        });
    }
};

if (typeof window !== 'undefined') {
    window.SerialScannerCamera = SerialScannerCamera;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SerialScannerCamera, serialScannerCam_computeQrBox, serialScannerCam_extractError };
}
