// session-guard.js
(function () {
  const HEARTBEAT_MS = 15000;
  const STALE_MS = 45000;
  const SESSION_KEY = "finance_app_session_id";

  let heartbeatTimer = null;
  let currentSessionId = null;
  let currentUserId = null;
  let lockDocRef = null;

  function nowIso() {
    return new Date().toISOString();
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
    if (!data || !data.sessionId || !data.lastHeartbeat) return false;
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

      if (data.sessionId !== currentSessionId) {
        const localSessionId = makeSessionId();

        if (data.sessionId === localSessionId) {
          currentSessionId = localSessionId;
        } else {
          stopHeartbeat();
          showForceLogoutMessage("تم إنهاء هذه الجلسة لأن الحساب تم فتحه من جهاز آخر.");
          await window.signOut(window.auth);
          return;
        }
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

  async function claimSession(user) {
    currentUserId = user.uid;
    currentSessionId = makeSessionId();

    const result = await readLock(user.uid);
    lockDocRef = result.ref;

    await writeLock(lockDocRef, {
      sessionId: currentSessionId,
      userId: user.uid,
      deviceName: getDeviceName(),
      startedAt: nowIso(),
      lastHeartbeat: nowIso(),
      status: "active"
    });

    await startHeartbeat();
    return true;
  }

  async function checkBeforeEntering(user) {
    const result = await readLock(user.uid);
    lockDocRef = result.ref;

    if (!result.exists || !isLockActive(result.data)) {
      return await claimSession(user);
    }

    const existing = result.data;
    const localSessionId = makeSessionId();

    if (existing.sessionId === localSessionId) {
      currentUserId = user.uid;
      currentSessionId = localSessionId;
      lockDocRef = result.ref;
      await startHeartbeat();
      return true;
    }

    const answer = confirm(
      "يوجد جلسة شغالة حاليًا لهذا الحساب على جهاز آخر.\n\n" +
      "اضغط OK لإنهاء الجلسة الحالية والمتابعة من هذا الجهاز.\n" +
      "اضغط Cancel لإلغاء الدخول."
    );

    if (!answer) {
      await window.signOut(window.auth);
      return false;
    }

    return await claimSession(user);
  }

  async function assertCanWrite() {
    if (!lockDocRef || !currentSessionId) return false;

    try {
      const snap = await window.getDoc(lockDocRef);
      if (!snap.exists()) return false;

      const data = snap.data();

      if (data.sessionId !== currentSessionId) {
        const localSessionId = makeSessionId();

        if (data.sessionId === localSessionId) {
          currentSessionId = localSessionId;
          return true;
        }

        showForceLogoutMessage("تم إيقاف الحفظ لأن هناك جلسة أحدث على جهاز آخر.");
        stopHeartbeat();
        await window.signOut(window.auth);
        return false;
      }

      return true;
    } catch (e) {
      console.error("assertCanWrite error:", e);
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