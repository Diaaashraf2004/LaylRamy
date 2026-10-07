// session-guard.js
(function () {
  const HEARTBEAT_MS = 15000;
  const STALE_MS = 45000;
  const SESSION_KEY = "finance_app_session_id";
  const DEVICE_KEY = "finance_app_device_id";

  // --- قفل PIN السريع ---
  const VERIFY_KEY = "finance_needs_verify";          // وقت فقدان الجلسة على هذا الجهاز (localStorage، يبقى بعد Refresh)
  const TAKEOVER_KEY = "finance_force_takeover";      // sessionStorage: المستخدم اختار الاستعادة قبل إعادة التحميل
  const PIN_KEY_PREFIX = "finance_quick_pin_";        // + uid  => hash الرمز
  const PIN_OFFERED_PREFIX = "finance_pin_offered_";  // + uid  => تم عرض إنشاء الرمز
  const MAX_FROZEN_MS = 12 * 60 * 60 * 1000;          // بعد 12 ساعة: لازم تسجيل دخول كامل
  const AUTO_SIGNOUT_FROZEN_MS = 30 * 60 * 1000;      // شاشة مجمدة مفتوحة 30 دقيقة => خروج تلقائي

  let heartbeatTimer = null;
  let currentSessionId = null;
  let currentUserId = null;
  let lockDocRef = null;
  let frozenSignoutTimer = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function getOrCreateDeviceId() {
    let existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;

    const id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  }

  function makeSessionId() {
    let existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const id = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  }

  function getDeviceName() {
    const ua = navigator.userAgent || "Unknown Device";
    return ua.substring(0, 120);
  }

  function isLockActive(data) {
    if (!data || !data.sessionId || !data.lastHeartbeat || data.status !== 'active') return false;
    const last = new Date(data.lastHeartbeat).getTime();
    if (isNaN(last)) return false;
    return (Date.now() - last) < STALE_MS;
  }

  function showForceLogoutMessage(message) {
    alert(message || "تم إنهاء هذه الجلسة لأن الحساب فُتح من جهاز آخر.");
  }

  // =====================================================
  // أدوات قفل PIN
  // =====================================================
  function markNeedsVerify() {
    if (!localStorage.getItem(VERIFY_KEY)) localStorage.setItem(VERIFY_KEY, String(Date.now()));
  }

  function clearNeedsVerify() {
    localStorage.removeItem(VERIFY_KEY);
  }

  async function hashPin(uid, pin) {
    const text = "fin-pin|" + uid + "|" + pin;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    // بديل في حالة عدم توفر crypto.subtle
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return "w" + h;
  }

  // نافذة تأكيد عربية (بديل confirm لأن نافذة المتصفح بتلخبط اتجاه النص)
  // ترجع true / false
  function askConfirm(opts) {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:2147483647;display:flex;align-items:center;justify-content:center;direction:rtl;font-family:inherit;";
      overlay.innerHTML = `
        <div dir="rtl" style="background:#fff;border-radius:12px;padding:22px;width:min(400px,92vw);box-shadow:0 20px 50px rgba(0,0,0,.35);text-align:right;">
          <div data-role="icon" style="font-size:34px;text-align:center;margin-bottom:6px;"></div>
          <h3 style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#1e293b;"></h3>
          <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.8;white-space:pre-line;"></p>
          <div style="display:flex;gap:8px;">
            <button data-act="ok" style="flex:1;background:#0d9488;color:#fff;border:0;border-radius:8px;padding:10px;font-weight:bold;cursor:pointer;"></button>
            <button data-act="cancel" style="flex:1;background:#e2e8f0;color:#334155;border:0;border-radius:8px;padding:10px;font-weight:bold;cursor:pointer;"></button>
          </div>
        </div>`;
      overlay.querySelector('[data-role="icon"]').textContent = opts.icon || "";
      overlay.querySelector("h3").textContent = opts.title || "";
      overlay.querySelector("p").textContent = opts.message || "";
      overlay.querySelector('[data-act="ok"]').textContent = opts.okText || "موافق";
      overlay.querySelector('[data-act="cancel"]').textContent = opts.cancelText || "إلغاء";
      const done = (v) => { overlay.remove(); resolve(v); };
      overlay.querySelector('[data-act="ok"]').onclick = () => done(true);
      overlay.querySelector('[data-act="cancel"]').onclick = () => done(false);
      document.body.appendChild(overlay);
    });
  }

  // نافذة إدخال سرية (بديل prompt لأن prompt بيظهر الباسورد مكشوف)
  // ترجع: {value} أو {alt:true} أو null عند الإلغاء
  function askSecret(opts) {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:2147483647;display:flex;align-items:center;justify-content:center;direction:rtl;font-family:inherit;";
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:22px;width:min(360px,92vw);box-shadow:0 20px 50px rgba(0,0,0,.35);text-align:right;">
          <h3 style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#1e293b;"></h3>
          <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;white-space:pre-line;"></p>
          <input type="password" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:18px;text-align:center;letter-spacing:4px;">
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button data-act="ok" style="flex:1;background:#0d9488;color:#fff;border:0;border-radius:8px;padding:10px;font-weight:bold;cursor:pointer;">تأكيد</button>
            <button data-act="cancel" style="flex:1;background:#e2e8f0;color:#334155;border:0;border-radius:8px;padding:10px;font-weight:bold;cursor:pointer;">إلغاء</button>
          </div>
          <a data-act="alt" href="#" style="display:none;margin-top:12px;font-size:13px;color:#2563eb;text-align:center;"></a>
        </div>`;
      overlay.querySelector("h3").textContent = opts.title || "";
      overlay.querySelector("p").textContent = opts.message || "";
      const input = overlay.querySelector("input");
      input.placeholder = opts.placeholder || "";
      if (opts.inputMode) input.inputMode = opts.inputMode;
      const alt = overlay.querySelector('[data-act="alt"]');
      if (opts.altLabel) { alt.textContent = opts.altLabel; alt.style.display = "block"; }

      const done = (result) => { overlay.remove(); resolve(result); };
      overlay.querySelector('[data-act="ok"]').onclick = () => {
        if (!input.value) { input.focus(); return; }
        done({ value: input.value });
      };
      overlay.querySelector('[data-act="cancel"]').onclick = () => done(null);
      alt.onclick = (e) => { e.preventDefault(); done({ alt: true }); };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") overlay.querySelector('[data-act="ok"]').click();
        if (e.key === "Escape") done(null);
      });

      document.body.appendChild(overlay);
      setTimeout(() => input.focus(), 50);
    });
  }

  // التحقق بكلمة المرور (بدون الإيميل - الإيميل معروف)
  // يرجع: 'ok' | 'cancel' | 'fail'
  async function verifyPassword(user) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await askSecret({
        title: "🔒 تأكيد الهوية بكلمة المرور",
        message: (attempt === 1 ? "" : `كلمة المرور غير صحيحة. محاولة ${attempt} من 3.\n`) + `الحساب: ${user.email}`,
        placeholder: "كلمة المرور"
      });
      if (!res || res.alt) return "cancel";
      try {
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, res.value);
        await user.reauthenticateWithCredential(cred);
        return "ok";
      } catch (e) {
        console.warn("Password verify failed:", e && e.code);
        if (e && e.code === "auth/network-request-failed") {
          alert("لا يوجد إنترنت للتحقق من كلمة المرور. حاول مرة أخرى بعد عودة الاتصال.");
          return "cancel";
        }
        if (e && e.code === "auth/too-many-requests") {
          alert("محاولات كثيرة جداً. تم إيقاف التحقق مؤقتاً.");
          return "fail";
        }
      }
    }
    return "fail";
  }

  // التحقق السريع: PIN أولاً، وكلمة المرور كبديل
  // يرجع: 'ok' | 'cancel' | 'fail'
  async function verifyIdentity(user) {
    const pinKey = PIN_KEY_PREFIX + user.uid;
    const savedHash = localStorage.getItem(pinKey);

    if (savedHash) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await askSecret({
          title: "🔒 تأكيد الهوية",
          message: attempt === 1
            ? "ادخل رمز PIN لاستعادة الجلسة على هذا الجهاز."
            : `رمز خاطئ. محاولة ${attempt} من 3.`,
          placeholder: "رمز PIN",
          inputMode: "numeric",
          altLabel: "نسيت الرمز؟ استخدم كلمة المرور"
        });
        if (!res) return "cancel";
        if (res.alt) break;
        if (await hashPin(user.uid, res.value) === savedHash) return "ok";
        if (attempt === 3) {
          // 3 محاولات خاطئة: نلغي الرمز ونطلب كلمة المرور
          localStorage.removeItem(pinKey);
          alert("تم إدخال رمز خاطئ 3 مرات. تم إلغاء الرمز، ولازم تأكيد بكلمة المرور.");
        }
      }
    }

    const r = await verifyPassword(user);
    if (r === "ok" && !localStorage.getItem(pinKey)) {
      // عرض إنشاء رمز جديد بعد نجاح التحقق بكلمة المرور
      localStorage.removeItem(PIN_OFFERED_PREFIX + user.uid);
    }
    return r;
  }

  // عرض إنشاء رمز PIN (مرة واحدة لكل جهاز/حساب)
  async function setupPin(user, force) {
    user = user || (window.auth && window.auth.currentUser);
    if (!user) return false;
    const pinKey = PIN_KEY_PREFIX + user.uid;
    const offeredKey = PIN_OFFERED_PREFIX + user.uid;

    if (!force) {
      if (localStorage.getItem(pinKey) || localStorage.getItem(offeredKey)) return false;
      localStorage.setItem(offeredKey, "1");
      const want = await askConfirm({
        icon: "💡",
        title: "رمز دخول سريع",
        message: "تحب تعمل رمز PIN سريع لهذا الجهاز؟\n\nلو الجلسة اتوقفت هنا لأنك فتحت من جهاز تاني، هتكتب الرمز بس بدل الإيميل والباسورد.\n(تقدر تعمله بعدين من الكونسول: SessionGuard.setupPin())",
        okText: "نعم، إنشاء رمز",
        cancelText: "لا شكراً"
      });
      if (!want) return false;
    }

    const a = await askSecret({ title: "إنشاء رمز PIN", message: "اكتب رمز من 4 لـ 8 أرقام.", placeholder: "الرمز", inputMode: "numeric" });
    if (!a || a.alt) return false;
    if (!/^\d{4,8}$/.test(a.value)) { alert("الرمز لازم يكون أرقام فقط، من 4 لـ 8 أرقام."); return false; }
    const b = await askSecret({ title: "تأكيد رمز PIN", message: "اكتب الرمز مرة تانية.", placeholder: "الرمز", inputMode: "numeric" });
    if (!b || b.value !== a.value) { alert("الرمزين مش متطابقين. لم يتم الحفظ."); return false; }

    localStorage.setItem(pinKey, await hashPin(user.uid, a.value));
    alert("تم حفظ رمز PIN على هذا الجهاز ✓");
    return true;
  }

  // شاشة تجميد بدل الطرد: استعادة (بـ PIN) أو خروج
  function showFrozenScreen(message) {
    stopHeartbeat();
    const mc = document.getElementById('main-content');
    if (mc) mc.classList.add('hidden');
    const ac = document.getElementById('auth-container');
    if (ac) ac.classList.add('hidden');
    if (document.getElementById('session-frozen-overlay')) return;

    const overlay = document.createElement("div");
    overlay.id = "session-frozen-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:#0f172a;z-index:2147483646;display:flex;align-items:center;justify-content:center;direction:rtl;";
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:26px;width:min(420px,92vw);text-align:center;">
        <div style="font-size:42px;">🔒</div>
        <h2 style="margin:8px 0;font-size:20px;font-weight:bold;color:#1e293b;">الجلسة متوقفة على هذا الجهاز</h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;white-space:pre-line;margin:0 0 18px;"></p>
        <button data-act="resume" style="width:100%;background:#0d9488;color:#fff;border:0;border-radius:8px;padding:12px;font-weight:bold;cursor:pointer;margin-bottom:8px;">استعادة الجلسة هنا</button>
        <button data-act="logout" style="width:100%;background:#e2e8f0;color:#b91c1c;border:0;border-radius:8px;padding:12px;font-weight:bold;cursor:pointer;">تسجيل الخروج من هذا الجهاز</button>
        <p style="color:#94a3b8;font-size:12px;margin:14px 0 0;">سيتم تسجيل الخروج تلقائياً بعد 30 دقيقة.</p>
      </div>`;
    overlay.querySelector("p").textContent = message || "الحساب مفتوح حالياً من مكان آخر.";
    overlay.querySelector('[data-act="resume"]').onclick = () => {
      sessionStorage.setItem(TAKEOVER_KEY, "1");
      location.reload(); // التحقق بالـ PIN يتم بعد التحميل + جلب أحدث بيانات
    };
    overlay.querySelector('[data-act="logout"]').onclick = () => fullSignOut();
    document.body.appendChild(overlay);

    if (frozenSignoutTimer) clearTimeout(frozenSignoutTimer);
    frozenSignoutTimer = setTimeout(() => fullSignOut(), AUTO_SIGNOUT_FROZEN_MS);
  }

  async function fullSignOut() {
    clearNeedsVerify();
    sessionStorage.removeItem(TAKEOVER_KEY);
    stopHeartbeat();
    try { await window.signOut(window.auth); } catch (e) { console.error(e); }
    location.reload();
  }

  // =====================================================

  async function getLockDoc(userId) {
    return window.doc(window.db, "users", userId, "meta", "sessionLock");
  }

  async function readLock(userId) {
    const ref = await getLockDoc(userId);
    const snap = await window.getDoc(ref);
    return {
      ref,
      exists: snap.exists(),
      data: snap.exists() ? snap.data() : null
    };
  }

  async function writeLock(ref, payload) {
    await window.setDoc(ref, payload, { merge: true });
  }

  async function clearOwnLock() {
    if (!lockDocRef || !currentSessionId) return;

    try {
      const snap = await window.getDoc(lockDocRef);
      if (!snap.exists()) return;

      const data = snap.data();
      if (data.sessionId === currentSessionId) {
        await window.setDoc(lockDocRef, {
          status: "ended",
          endedAt: nowIso(),
          endedBy: "self"
        }, { merge: true });
      }
    } catch (e) {
      console.error("Failed to clear own lock:", e);
    }
  }

  async function heartbeat() {
    if (!lockDocRef || !currentSessionId) return;

    try {
      const snap = await window.getDoc(lockDocRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const localDeviceId = getOrCreateDeviceId();

      // لو نفس الجهاز، حدث بيانات الجلسة بصمت
      if (data.deviceId === localDeviceId) {
        currentSessionId = makeSessionId();
        await window.setDoc(lockDocRef, {
          sessionId: currentSessionId,
          deviceId: localDeviceId,
          deviceName: getDeviceName(),
          lastHeartbeat: nowIso(),
          status: "active"
        }, { merge: true });
        return;
      }

      // لو جهاز آخر استحوذ على الجلسة: تجميد + طلب PIN عند الاستعادة
      if (data.sessionId !== currentSessionId) {
        markNeedsVerify();
        showFrozenScreen("تم إيقاف هذه الجلسة لأن الحساب اتفتح من مكان آخر.\nلاستعادتها هنا هتحتاج رمز PIN (أو كلمة المرور).");
        return;
      }

      await window.setDoc(lockDocRef, {
        lastHeartbeat: nowIso(),
        status: "active"
      }, { merge: true });
    } catch (e) {
      console.error("Heartbeat error:", e);
    }
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  async function startHeartbeat() {
    stopHeartbeat();
    await heartbeat();
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  }

  async function checkBeforeEntering(user) {
    const localDeviceId = getOrCreateDeviceId();
    const newSessionId = makeSessionId();
    const lockRef = await getLockDoc(user.uid);

    try {
      // 1. قراءة حالة الجلسة (تعمل أوفلاين وسريعة جداً)
      const snap = await window.getDoc(lockRef);
      const data = snap.exists() ? snap.data() : null;

      const forceTakeover = sessionStorage.getItem(TAKEOVER_KEY) === "1";
      sessionStorage.removeItem(TAKEOVER_KEY);

      const otherDeviceActive = snap.exists() && isLockActive(data) && data.deviceId !== localDeviceId;

      if (otherDeviceActive && !forceTakeover) {
        const answer = await askConfirm({
          icon: "⚠️",
          title: "تنبيه بدء جلسة",
          message: "يوجد جلسة شغالة حاليًا لهذا الحساب على جهاز آخر.\n\nهل تود إنهاء الجلسة الحالية والمتابعة من هذا الجهاز؟",
          okText: "نعم، إنهاء والمتابعة",
          cancelText: "إلغاء الدخول"
        });
        if (!answer) {
          showFrozenScreen("الحساب شغال حالياً على جهاز آخر.\nتقدر تستعيد الجلسة هنا في أي وقت.");
          return false;
        }
      }

      // 2. التحقق بالـ PIN لو الجلسة كانت متوقفة هنا، أو لو هنسحبها من جهاز تاني
      const lostAt = Number(localStorage.getItem(VERIFY_KEY) || 0);
      if (lostAt && (Date.now() - lostAt) > MAX_FROZEN_MS) {
        alert("الجلسة المتوقفة على هذا الجهاز انتهت صلاحيتها (أكثر من 12 ساعة). سجّل الدخول من جديد.");
        await fullSignOut();
        return false;
      }
      if (lostAt || otherDeviceActive) {
        const result = await verifyIdentity(user);
        if (result === "cancel") {
          markNeedsVerify();
          showFrozenScreen("لم يتم تأكيد الهوية.\nاضغط استعادة الجلسة للمحاولة مرة أخرى.");
          return false;
        }
        if (result === "fail") {
          alert("فشل التحقق من الهوية. تم تسجيل الخروج من هذا الجهاز.");
          await fullSignOut();
          return false;
        }
        clearNeedsVerify();
      }

      // 3. تحديث الجلسة (يعمل أوفلاين ويصطف في الطابور)
      await writeLock(lockRef, {
        sessionId: newSessionId,
        userId: user.uid,
        deviceId: localDeviceId,
        deviceName: getDeviceName(),
        startedAt: nowIso(),
        lastHeartbeat: nowIso(),
        status: "active"
      });

      currentUserId = user.uid;
      currentSessionId = newSessionId;
      lockDocRef = lockRef;
      await startHeartbeat();

      // عرض إنشاء رمز PIN مرة واحدة (بعد ما البرنامج يفتح)
      setTimeout(() => { setupPin(user, false).catch(e => console.warn(e)); }, 4000);
      return true;

    } catch (e) {
      console.error("Session check error:", e);
      alert("حدث خطأ أثناء فحص الجلسة. قد تكون الشبكة ضعيفة. سيتم الدخول في وضع الأوفلاين.");
      
      // الدخول الإجباري حتى لو فشل القفل (للسماح بالعمل دون اتصال)
      currentUserId = user.uid;
      currentSessionId = newSessionId;
      lockDocRef = lockRef;
      await startHeartbeat();
      return true;
    }
  }

  async function assertCanWrite() {
    if (!lockDocRef || !currentSessionId) {
        alert("فشل الحفظ: الجلسة غير مهيأة (قد يكون الإنترنت مفصولاً أو تم تسجيل خروجك).");
        return false;
    }

    try {
      const snap = await window.getDoc(lockDocRef);
      if (!snap.exists() || snap._unreachable) {
          if (typeof window.showGlobalMessage === 'function') {
              window.showGlobalMessage("فشل الحفظ: لا يمكن التأكد من الجلسة (قد يكون الإنترنت مقطوعاً). حاول مرة أخرى.", true, true);
          } else {
              alert("فشل الحفظ: لا يمكن التأكد من الجلسة (قد يكون الإنترنت مقطوعاً). حاول مرة أخرى.");
          }
          return false;
      }
      const data = snap.data();

      if (data.sessionId !== currentSessionId) {
        if (data.deviceId !== getOrCreateDeviceId()) markNeedsVerify();
        showFrozenScreen("تم إيقاف الحفظ لأن هناك جلسة أحدث على جهاز (أو تبويب) آخر.\nلاستعادتها هنا هتحتاج رمز PIN (أو كلمة المرور).");
        return false;
      }

      return true;
    } catch (e) {
      console.error("assertCanWrite error:", e);
      if (e.code === "permission-denied" || (e.message && e.message.includes("permission"))) {
        showForceLogoutMessage("انتهت جلسة تسجيل الدخول أو فقدت الصلاحية. يرجى تحديث الصفحة وإعادة تسجيل الدخول.");
        stopHeartbeat();
      } else {
        alert("خطأ في الاتصال بالسحابة أو الجلسة غير صالحة. تأكد من الإنترنت! (" + e.message + ")");
      }
      return false;
    }
  }

  async function stop() {
    stopHeartbeat();
    await clearOwnLock();
    sessionStorage.removeItem(SESSION_KEY);
    clearNeedsVerify();
    currentSessionId = null;
    currentUserId = null;
    lockDocRef = null;
  }

  window.SessionGuard = {
    checkBeforeEntering,
    assertCanWrite,
    stop,
    setupPin: (force) => setupPin(null, force !== false),
    removePin: () => {
      const u = window.auth && window.auth.currentUser;
      if (u) { localStorage.removeItem(PIN_KEY_PREFIX + u.uid); alert("تم حذف رمز PIN من هذا الجهاز."); }
    }
  };
})();
