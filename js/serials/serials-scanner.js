/**
 * js/serials/serials-scanner.js
 * الجسر اللحظي لقارئ السيريال بين الموبايل والكمبيوتر عبر Firebase Firestore
 * ومُدير تثبيت التطبيق (PWA) والوضع المرافق الخفيف للموبايل بدون تعارض مع SessionGuard.
 */

const SERIAL_SCANNER_BRIDGE_COL = 'settings';
const SERIAL_SCANNER_BRIDGE_DOC = 'live_scan_bridge';
const SERIAL_SCANNER_DEVICE_KEY = 'erp_scanner_device_id';
const SERIAL_SCANNER_DEFAULT_MODE_KEY = 'erp_mobile_scanner_default';
const SERIAL_SCANNER_BYPASS_ONCE_KEY = 'erp_scanner_bypass_once';
const SERIAL_SCANNER_LAST_SEEN_KEY = 'erp_scanner_last_seen_id';
const SERIAL_SCANNER_HISTORY_KEY = 'erp_scanner_recent_history';

function serialScanner_normalizeCode(raw) {
    if (raw === null || raw === undefined) return '';
    const arabicDigitsMap = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    return String(raw)
        .replace(/[٠-٩۰-۹]/g, ch => arabicDigitsMap[ch] || ch)
        .replace(/[\u0000-\u001F\u007F\u200B-\u200F\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function serialScanner_findExistingRecord(serialCode, listOverride) {
    const normalized = serialScanner_normalizeCode(serialCode).toUpperCase();
    if (!normalized) return null;
    const list = Array.isArray(listOverride)
        ? listOverride
        : (typeof window !== 'undefined' && typeof window.getStandaloneSerials === 'function'
            ? window.getStandaloneSerials()
            : []);
    if (!Array.isArray(list)) return null;
    return list.find(item => item && serialScanner_normalizeCode(item.serial).toUpperCase() === normalized) || null;
}

function serialScanner_getOrCreateDeviceId() {
    if (typeof localStorage === 'undefined') return 'dev_server';
    try {
        let id = localStorage.getItem(SERIAL_SCANNER_DEVICE_KEY);
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
            localStorage.setItem(SERIAL_SCANNER_DEVICE_KEY, id);
        }
        return id;
    } catch (_) {
        return 'dev_' + Date.now().toString(36);
    }
}

function serialScanner_detectDeviceLabel() {
    if (typeof navigator === 'undefined') return 'جهاز غير محدد';
    const ua = navigator.userAgent || '';
    if (/iPhone/i.test(ua)) return 'آيفون';
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'آيباد';
    if (/Android/i.test(ua)) return 'موبايل أندرويد';
    if (/Windows/i.test(ua)) return 'كمبيوتر ويندوز';
    if (/Mac/i.test(ua)) return 'جهاز ماك';
    return 'متصفح';
}

function serialScanner_isUrlScannerMode(searchStr, hashStr) {
    const search = typeof searchStr === 'string'
        ? searchStr
        : (typeof window !== 'undefined' && window.location ? window.location.search : '');
    const hash = typeof hashStr === 'string'
        ? hashStr
        : (typeof window !== 'undefined' && window.location ? window.location.hash : '');
    try {
        const params = new URLSearchParams(search);
        if (params.get('mode') === 'scanner' || params.get('scanner') === '1') return true;
    } catch (_) {}
    return hash === '#scanner' || hash === '#mode=scanner';
}

function serialScanner_buildShareUrl(locationObj) {
    const loc = locationObj || (typeof window !== 'undefined' ? window.location : null);
    if (!loc || !loc.href || loc.protocol === 'file:') return '';
    return (loc.origin || '') + (loc.pathname || '') + '?mode=scanner';
}

function serialScanner_shouldProcessIncoming(data, ctx) {
    if (!data || !data.scanId || !data.serial) return false;
    if (data.status && data.status !== 'pending') return false;
    if (ctx.isScannerModeActive) return false;
    if (ctx.hasPendingWrites && !data.allowSelfReceive) return false;
    if (ctx.lastHandledScanId && data.scanId === ctx.lastHandledScanId) return false;
    if (!data.allowSelfReceive && data.sourceDeviceId && data.sourceDeviceId === ctx.myDeviceId) return false;
    return true;
}

const SerialScannerBridge = {
    _unsubscribe: null,
    _activeUid: null,
    _activeEmail: '',
    _isInitialSnapshot: true,
    _lastHandledScanId: '',
    _latestDocScanId: '',
    _scannerModeActive: false,
    _isCompanionOnlySession: false,
    _deferredInstallPrompt: null,
    _statusListeners: [],
    _connectionState: 'disconnected',
    _audioCtx: null,
    _incomingQueue: [],
    _readinessTimer: null,

    init() {
        if (typeof window === 'undefined') return;
        try {
            this._lastHandledScanId = sessionStorage.getItem(SERIAL_SCANNER_LAST_SEEN_KEY) || '';
        } catch (_) {}

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this._deferredInstallPrompt = e;
            this._notifyStatusChange();
        });

        window.addEventListener('appinstalled', () => {
            this._deferredInstallPrompt = null;
            this._notifyStatusChange();
        });

        window.addEventListener('pointerdown', () => this._unlockAudio(), { once: true, passive: true });
        this._attachAuthWatcher();
    },

    _unlockAudio() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!this._audioCtx) this._audioCtx = new AudioCtx();
            if (this._audioCtx.state === 'suspended') this._audioCtx.resume().catch(() => {});
        } catch (_) {}
    },

    playBeep(kind) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!this._audioCtx || this._audioCtx.state === 'closed') this._audioCtx = new AudioCtx();
            const ctx = this._audioCtx;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            const isScan = kind === 'scan';
            osc.type = isScan ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(isScan ? 1180 : 740, now);
            osc.frequency.setValueAtTime(isScan ? 1560 : 988, now + (isScan ? 0.06 : 0.09));
            if (!isScan) osc.frequency.setValueAtTime(1318, now + 0.18);
            gain.gain.setValueAtTime(isScan ? 0.16 : 0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (isScan ? 0.16 : 0.34));
            osc.start(now); osc.stop(now + (isScan ? 0.17 : 0.35));
        } catch (_) {}
    },

    _attachAuthWatcher() {
        if (this._tryHookAuth()) return;
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            if (this._tryHookAuth() || tries > 30) clearInterval(timer);
        }, 300);
    },

    _tryHookAuth() {
        if (!window.auth || typeof window.auth.onAuthStateChanged !== 'function') return false;
        window.auth.onAuthStateChanged((user) => {
            if (user && user.uid) this.startListening(user.uid, user.email || '');
            else this.stopListening();
        });
        return true;
    },

    shouldRunCompanionScannerOnly() {
        try {
            if (sessionStorage.getItem(SERIAL_SCANNER_BYPASS_ONCE_KEY) === '1') {
                sessionStorage.removeItem(SERIAL_SCANNER_BYPASS_ONCE_KEY);
                return false;
            }
        } catch (_) {}
        return serialScanner_isUrlScannerMode() || this.isDefaultScannerDevice();
    },

    activateCompanionMode(user) {
        this._isCompanionOnlySession = true;
        this._scannerModeActive = true;
        if (user && user.uid) this.startListening(user.uid, user.email || '');
        if (window.SerialScannerCamera && typeof window.SerialScannerCamera.openMobileScanner === 'function') {
            window.SerialScannerCamera.openMobileScanner();
        } else {
            setTimeout(() => { if (window.SerialScannerCamera) window.SerialScannerCamera.openMobileScanner(); }, 250);
        }
    },

    isCompanionOnlySession() { return Boolean(this._isCompanionOnlySession); },
    markBypassScannerOnce() { try { sessionStorage.setItem(SERIAL_SCANNER_BYPASS_ONCE_KEY, '1'); } catch (_) {} },
    getDeviceId() { return serialScanner_getOrCreateDeviceId(); },
    isScannerModeActive() { return Boolean(this._scannerModeActive); },
    setScannerModeActive(active) { this._scannerModeActive = Boolean(active); this._notifyStatusChange(); },
    isDefaultScannerDevice() { try { return localStorage.getItem(SERIAL_SCANNER_DEFAULT_MODE_KEY) === '1'; } catch (_) { return false; } },
    canPromptInstall() { return Boolean(this._deferredInstallPrompt); },
    getShareUrl() { return serialScanner_buildShareUrl(); },

    isLaptopReadyToReceive() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return true;
        if (this._scannerModeActive || this._isCompanionOnlySession || window.appInitialized !== true || window._isLoadingDate) return false;
        if (document.getElementById('session-frozen-overlay') || document.querySelector('body > div[style*="2147483647"]')) return false;
        const mc = document.getElementById('main-content');
        return !(mc && mc.classList.contains('hidden'));
    },

    setDefaultScannerDevice(enabled) {
        try {
            if (enabled) localStorage.setItem(SERIAL_SCANNER_DEFAULT_MODE_KEY, '1');
            else localStorage.removeItem(SERIAL_SCANNER_DEFAULT_MODE_KEY);
        } catch (_) {}
        this._notifyStatusChange();
    },

    isRunningStandalone() {
        if (typeof window === 'undefined') return false;
        return Boolean(
            (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
            (window.navigator && window.navigator.standalone === true)
        );
    },

    isIOSDevice() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent || '';
        return (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    },

    async promptInstall() {
        if (!this._deferredInstallPrompt) return { outcome: 'unavailable' };
        try {
            const promptEvt = this._deferredInstallPrompt;
            promptEvt.prompt();
            const choice = await promptEvt.userChoice;
            if (choice && choice.outcome === 'accepted') this._deferredInstallPrompt = null;
            this._notifyStatusChange();
            return choice || { outcome: 'dismissed' };
        } catch (err) {
            return { outcome: 'error', error: err && err.message };
        }
    },

    getConnectionInfo() {
        return {
            state: this._connectionState,
            uid: this._activeUid,
            email: this._activeEmail,
            deviceId: this.getDeviceId(),
            canInstall: this.canPromptInstall(),
            isStandalone: this.isRunningStandalone(),
            isIOS: this.isIOSDevice()
        };
    },

    onStatusChange(fn) {
        if (typeof fn === 'function') this._statusListeners.push(fn);
    },

    _notifyStatusChange(bridgeSnapshot) {
        const info = this.getConnectionInfo();
        this._statusListeners.forEach(fn => {
            try { fn(info, bridgeSnapshot || null); } catch (_) {}
        });
    },

    getBridgeDocRef(uid) {
        const targetUid = uid || this._activeUid || (window.currentUser && window.currentUser.uid);
        if (!targetUid || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'users', targetUid, SERIAL_SCANNER_BRIDGE_COL, SERIAL_SCANNER_BRIDGE_DOC);
    },

    startListening(uid, email) {
        if (!uid) return;
        if (this._activeUid === uid && this._unsubscribe) return;
        this.stopListening();

        this._activeUid = uid;
        this._activeEmail = email || '';
        this._isInitialSnapshot = true;

        const docRef = this.getBridgeDocRef(uid);
        if (!docRef || typeof docRef.onSnapshot !== 'function') {
            this._connectionState = 'unavailable';
            this._notifyStatusChange();
            return;
        }

        this._connectionState = 'connecting';
        this._notifyStatusChange();

        this._unsubscribe = docRef.onSnapshot((snap) => {
            const meta = snap && snap.metadata ? snap.metadata : {};
            const data = snap && snap.exists ? snap.data() : null;
            this._connectionState = meta.fromCache ? 'offline_cache' : 'connected';
            if (data && data.scanId) this._latestDocScanId = data.scanId;

            if (this._isInitialSnapshot) {
                this._isInitialSnapshot = false;
                if (data && data.scanId) this._rememberHandled(data.scanId);
                this._notifyStatusChange(data);
                return;
            }

            this._notifyStatusChange(data);

            if (!data) return;
            if (data.status && data.status !== 'pending') {
                this._incomingQueue = this._incomingQueue.filter(item => item.scanId !== data.scanId);
                if (window.SerialScannerUI && typeof window.SerialScannerUI.closeIncomingModalIfMatches === 'function') {
                    window.SerialScannerUI.closeIncomingModalIfMatches(data.scanId);
                }
                return;
            }

            const shouldShow = serialScanner_shouldProcessIncoming(data, {
                isScannerModeActive: this._scannerModeActive,
                hasPendingWrites: Boolean(meta.hasPendingWrites),
                lastHandledScanId: this._lastHandledScanId,
                myDeviceId: this.getDeviceId()
            });

            if (shouldShow) {
                this._rememberHandled(data.scanId);
                this.enqueueIncomingScan(data);
            }
        }, (err) => {
            console.warn('SerialScannerBridge listener error:', err && err.message ? err.message : err);
            this._connectionState = 'error';
            this._notifyStatusChange();
        });
    },

    stopListening() {
        if (typeof this._unsubscribe === 'function') {
            try { this._unsubscribe(); } catch (_) {}
        }
        if (this._readinessTimer) { clearTimeout(this._readinessTimer); this._readinessTimer = null; }
        this._unsubscribe = null;
        this._activeUid = null;
        this._activeEmail = '';
        this._connectionState = 'disconnected';
        this._incomingQueue = [];
        if (typeof document !== 'undefined' && this._scannerModeActive && (!window.auth || !window.auth.currentUser)) {
            const ov = document.getElementById('serials-mobile-scanner-app');
            if (ov) ov.classList.add('hidden');
            if (window.SerialScannerCamera && typeof window.SerialScannerCamera.stopCamera === 'function') {
                window.SerialScannerCamera.stopCamera();
            }
            this._scannerModeActive = false;
        }
        this._notifyStatusChange();
    },

    enqueueIncomingScan(scanPayload) {
        if (!scanPayload || !scanPayload.scanId) return;
        if (this._incomingQueue.some(item => item.scanId === scanPayload.scanId)) return;
        this._incomingQueue.push(scanPayload);
        this.processNextQueuedScan();
    },

    processNextQueuedScan() {
        if (!this._incomingQueue.length) return;
        if (!this.isLaptopReadyToReceive()) {
            if (!this._readinessTimer) {
                this._readinessTimer = setTimeout(() => {
                    this._readinessTimer = null;
                    this.processNextQueuedScan();
                }, 1000);
            }
            return;
        }
        if (window.SerialScannerUI && typeof window.SerialScannerUI.isIncomingModalOpen === 'function' && window.SerialScannerUI.isIncomingModalOpen()) {
            return;
        }
        const nextScan = this._incomingQueue.shift();
        if (!nextScan) return;
        this.playBeep('incoming');
        const existing = serialScanner_findExistingRecord(nextScan.serial);
        if (window.SerialScannerUI && typeof window.SerialScannerUI.showIncomingSerialPrompt === 'function') {
            window.SerialScannerUI.showIncomingSerialPrompt(nextScan, existing);
        }
    },

    _rememberHandled(scanId) {
        if (!scanId) return;
        this._lastHandledScanId = scanId;
        try { sessionStorage.setItem(SERIAL_SCANNER_LAST_SEEN_KEY, scanId); } catch (_) {}
    },

    async sendScannedSerial(rawSerial, options) {
        const opts = options || {};
        const cleaned = serialScanner_normalizeCode(rawSerial);
        if (!cleaned) return { ok: false, error: 'رقم السيريال فارغ أو غير صالح.' };
        const docRef = this.getBridgeDocRef();
        if (!docRef || typeof window.setDoc !== 'function') {
            return { ok: false, error: 'يجب تسجيل الدخول بحساب البرنامج أولاً لتفعيل الربط.' };
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return { ok: false, error: 'لا يوجد اتصال بالإنترنت حالياً. أعد المحاولة عند عودة الشبكة.' };
        }

        const scanId = 'scan_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        const payload = {
            scanId: scanId,
            serial: cleaned,
            scannedAt: Date.now(),
            sourceDeviceId: this.getDeviceId(),
            sourceLabel: opts.sourceLabel || serialScanner_detectDeviceLabel(),
            format: opts.format || 'BARCODE',
            status: 'pending',
            handledAt: null,
            handledByDeviceId: null,
            allowSelfReceive: Boolean(opts.allowSelfReceive)
        };

        try {
            await Promise.race([
                window.setDoc(docRef, payload, { merge: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
            ]);
            this._latestDocScanId = scanId;
            this._pushHistory({ serial: cleaned, scanId: scanId, scannedAt: payload.scannedAt, format: payload.format });
            return { ok: true, payload: payload };
        } catch (err) {
            const isTimeout = err && err.message === 'TIMEOUT';
            return { ok: false, error: isTimeout ? 'انتهت مهلة الإرسال — تحقق من اتصال الإنترنت.' : 'تعذر إرسال السيريال للسحابة.' };
        }
    },

    async updateScanStatus(scanId, status) {
        if (!scanId) return;
        if (this._latestDocScanId && this._latestDocScanId !== scanId) return;
        const docRef = this.getBridgeDocRef();
        if (!docRef || typeof window.setDoc !== 'function') return;
        try {
            await window.setDoc(docRef, {
                scanId: scanId,
                status: status,
                handledAt: Date.now(),
                handledByDeviceId: this.getDeviceId()
            }, { merge: true });
        } catch (err) {
            console.warn('Could not update scan status:', err && err.message ? err.message : err);
        }
    },

    _isViewingArchiveDay() {
        if (window._isArchiveBrowsingMode) return true;
        const warn = typeof document !== 'undefined' ? document.getElementById('historical-date-warning') : null;
        return Boolean(warn && !warn.classList.contains('hidden'));
    },

    async acceptSerialIntoTracker(rawSerial, scanId) {
        const cleaned = serialScanner_normalizeCode(rawSerial);
        if (!cleaned) return false;

        if (this._isViewingArchiveDay() && typeof window.returnToCurrentDay === 'function') {
            const goToday = typeof confirm === 'function'
                ? confirm('أنت تتصفح حالياً يوم أرشيف سابق. هل تريد العودة لليوم الحالي أولاً قبل إدخال السيريال الجديد؟')
                : true;
            if (!goToday) return false;
            await window.returnToCurrentDay();
            if (this._isViewingArchiveDay()) return false;
        }

        this._openSerialsSection();
        if (typeof window.cancelSerialEditMode === 'function') window.cancelSerialEditMode();

        const snInput = document.getElementById('serials-add-sn');
        const productInput = document.getElementById('serials-add-product');
        if (snInput) {
            snInput.value = cleaned;
            snInput.dispatchEvent(new Event('input', { bubbles: true }));
            const formCard = snInput.closest('.bg-white') || snInput.parentElement;
            if (formCard) {
                formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                formCard.style.outline = '3px solid #2563eb';
                formCard.style.outlineOffset = '2px';
                setTimeout(() => { formCard.style.outline = ''; formCard.style.outlineOffset = ''; }, 2400);
            }
        }
        if (productInput) setTimeout(() => productInput.focus(), 180);
        if (scanId) this.updateScanStatus(scanId, 'accepted');
        if (typeof window.showGlobalMessage === 'function') {
            window.showGlobalMessage(`تم إدخال السيريال (${cleaned}) في قسم السيريالات — أكمل بيانات الجهاز واضغط إضافة للسجل.`);
        }
        return true;
    },

    focusExistingSerialInTracker(rawSerial, scanId, existingRecord) {
        const cleaned = serialScanner_normalizeCode(rawSerial);
        if (!cleaned) return false;

        this._openSerialsSection();

        const resetIds = ['serials-check-filter', 'serials-ship-filter', 'serials-followup-filter', 'serials-supplier-filter', 'serials-battery-filter', 'serials-notes-filter'];
        resetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'all';
        });

        const record = existingRecord || serialScanner_findExistingRecord(cleaned);
        const saleFilter = document.getElementById('serials-sale-filter');
        if (saleFilter) {
            saleFilter.value = (record && record.saleStatus === 'sold') ? 'sold' : 'all';
            saleFilter.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const searchInput = document.getElementById('serials-search-input');
        if (searchInput) {
            searchInput.value = (record && record.serial) ? record.serial : cleaned;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            searchInput.focus();
        }
        if (scanId) this.updateScanStatus(scanId, 'duplicate_viewed');
        return true;
    },

    _openSerialsSection() {
        const navBtn = document.querySelector('button[data-target="serials-tracker-section"]');
        if (navBtn) {
            navBtn.click();
        } else {
            document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
            const sec = document.getElementById('serials-tracker-section');
            if (sec) sec.classList.remove('hidden');
        }
        if (typeof window.triggerSerialsRefresh === 'function') window.triggerSerialsRefresh();
    },

    getRecentHistory() {
        try {
            const raw = localStorage.getItem(SERIAL_SCANNER_HISTORY_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    },

    _pushHistory(entry) {
        try {
            const list = this.getRecentHistory().filter(item => item && item.serial !== entry.serial);
            list.unshift(entry);
            localStorage.setItem(SERIAL_SCANNER_HISTORY_KEY, JSON.stringify(list.slice(0, 12)));
        } catch (_) {}
    },

    normalizeCode: serialScanner_normalizeCode,
    findExistingRecord: serialScanner_findExistingRecord,
    isUrlScannerMode: serialScanner_isUrlScannerMode,
    shouldProcessIncoming: serialScanner_shouldProcessIncoming
};

if (typeof window !== 'undefined') {
    window.SerialScannerBridge = SerialScannerBridge;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => SerialScannerBridge.init());
    else SerialScannerBridge.init();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SerialScannerBridge,
        serialScanner_normalizeCode,
        serialScanner_findExistingRecord,
        serialScanner_isUrlScannerMode,
        serialScanner_buildShareUrl,
        serialScanner_shouldProcessIncoming
    };
}
