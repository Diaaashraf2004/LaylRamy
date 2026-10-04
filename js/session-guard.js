// session-guard.js
(function () {
  const HEARTBEAT_MS = 15000;
  const STALE_MS = 45000;
  const SESSION_KEY = "finance_app_session_id";
  const DEVICE_KEY = "finance_app_device_id";

  let heartbeatTimer = null;
  let currentSessionId = null;
  let currentUserId = null;
  let lockDocRef = null;

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

      // لو جهاز آخر استحوذ على الجلسة
      if (data.sessionId !== currentSessionId) {
        stopHeartbeat();
        showForceLogoutMessage("تم إنهاء هذه الجلسة لأن الحساب تم فتحه من جهاز آخر.");
        await window.signOut(window.auth);
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
    let promptForForceClaim = false;

    try {
      await window.db.runTransaction(async (transaction) => {
        const snap = await transaction.get(lockRef);
        const exists = snap.exists;
        const data = exists ? snap.data() : null;

        if (exists && isLockActive(data)) {
          if (data.deviceId !== localDeviceId) {
            throw new Error("LOCKED_BY_OTHER");
          }
        }

        transaction.set(lockRef, {
          sessionId: newSessionId,
          userId: user.uid,
          deviceId: localDeviceId,
          deviceName: getDeviceName(),
          startedAt: nowIso(),
          lastHeartbeat: nowIso(),
          status: "active"
        }, { merge: true });
      });

      currentUserId = user.uid;
      currentSessionId = newSessionId;
      lockDocRef = lockRef;
      await startHeartbeat();
      return true;

    } catch (e) {
      if (e.message === "LOCKED_BY_OTHER") {
         promptForForceClaim = true;
      } else {
         console.error("Session transaction error:", e);
         return false;
      }
    }

    if (promptForForceClaim) {
        const answer = confirm(
          "يوجد جلسة شغالة حاليًا لهذا الحساب على جهاز آخر.\n\n" +
          "اضغط OK لإنهاء الجلسة الحالية والمتابعة من هذا الجهاز.\n" +
          "اضغط Cancel لإلغاء الدخول."
        );

        if (!answer) {
          await window.signOut(window.auth);
          return false;
        }

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
        showForceLogoutMessage("تم إيقاف الحفظ لأن هناك جلسة أحدث على جهاز (أو تبويب) آخر.");
        stopHeartbeat();
        await window.signOut(window.auth);
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
    currentSessionId = null;
    currentUserId = null;
    lockDocRef = null;
  }

  window.SessionGuard = {
    checkBeforeEntering,
    assertCanWrite,
    stop
  };
})();