// finance-firebase.js — Firebase Auth + Firestore (COMPAT VERSION FOR file://)
// extracted from finance.html

const firebaseConfig = {
    apiKey: "AIzaSyCgJeOT_wh9d6h3MTkj-XsEoWW9wo-97ZE",
    authDomain: "financial-app-96527.firebaseapp.com",
    projectId: "financial-app-96527",
    storageBucket: "financial-app-96527.firebasestorage.app",
    messagingSenderId: "409763079254",
    appId: "1:409763079254:web:ae95c7da0aaea083a207f7",
    measurementId: "G-Q5ZLBCBG3J"
};

// Initialize Firebase using the global firebase object (compat mode)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- تهيئة الخدمات وجعلها متاحة للملفات الخارجية ---
window.db = db;
window.auth = auth;

// Compatibility aliases to match the v9 modular syntax used in finance-core.js
window.doc = function(dbInstance, ...paths) { return dbInstance.doc(paths.join('/')); };
window.setDoc = function(docRef, data, options) { return docRef.set(data, options); };
window.getDoc = async function(docRef) { 
    const snap = await docRef.get(); 
    return {
        exists: () => snap.exists,
        data: () => snap.data(),
        id: snap.id,
        ref: snap.ref
    }; 
};
window.deleteDoc = function(docRef) { return docRef.delete(); };
window.updateDoc = function(docRef, data) { return docRef.update(data); };
window.addDoc = function(collRef, data) { return collRef.add(data); };
window.serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;
window.collection = function(dbInstance, ...paths) { return dbInstance.collection(paths.join('/')); };

window.query = function(collRef, ...queryConstraints) {
    let q = collRef;
    queryConstraints.forEach(c => {
        if (c.type === 'where') q = q.where(c.field, c.op, c.value);
        else if (c.type === 'orderBy') q = q.orderBy(c.field, c.direction);
        else if (c.type === 'limit') q = q.limit(c.value);
    });
    return q;
};
window.where = function(field, op, value) { return { type: 'where', field, op, value }; };
window.orderBy = function(field, direction) { return { type: 'orderBy', field, direction }; };
window.limit = function(value) { return { type: 'limit', value }; };

// --- الدالة المحدثة ---
window.getDocs = async function(queryRef) {
    const snap = await queryRef.get();

    const docs = snap.docs.map(d => ({
        exists: () => d.exists,
        data: () => d.data(),
        id: d.id,
        ref: d.ref
    }));

    return {
        empty: snap.empty,
        size: snap.size,
        docs,
        forEach: (callback, thisArg) => docs.forEach(callback, thisArg)
    };
};

// إعدادات المصادقة
window.createUserWithEmailAndPassword = function(authInstance, email, password) { return authInstance.createUserWithEmailAndPassword(email, password); };
window.signInWithEmailAndPassword = function(authInstance, email, password) { return authInstance.signInWithEmailAndPassword(email, password); };
window.signOut = function(authInstance) { return authInstance.signOut(); };
window.onAuthStateChanged = function(authInstance, callback) { return authInstance.onAuthStateChanged(callback); };

// مراقبة حالة تسجيل الدخول
window.onAuthStateChanged(auth, (user) => {
    window.currentUser = user;
    
    // إذا كان هناك كود معلق ينتظر، قم بتنفيذه الآن
    if (typeof window._pendingAuthCallback === 'function') {
        console.log("🔄 تنفيذ الطلب المعلق للهوية...");
        window._pendingAuthCallback(user);
        window._pendingAuthCallback = null; 
    }

    if (user) {
        console.log("✅ متصل الآن بحساب: " + user.email);
    } else {
        console.log("❌ غير متصل بالسحابة");
    }
});
console.log("🚀 نظام السحابة (Firebase Compat) جاهز ومؤمن للعمل بدون سيرفر (file://)");