// finance-smart-delta.js
// This file contains the Smart Delta logic and the loadLatestBalances function.

window.captureHistoricalBaseline = function(dateStr) {
    const todayStr = typeof getTodayDateString === 'function' ? getTodayDateString() : new Date().toISOString().split('T')[0];
    if (dateStr !== todayStr) {
        console.log('[Smart Delta] Capturing baseline for historical day:', dateStr);
        window.historicalBaseline = {
            accounts: JSON.parse(JSON.stringify(typeof accounts !== 'undefined' ? accounts : (window.accounts || []))),
            products: JSON.parse(JSON.stringify(typeof products !== 'undefined' ? products : (window.products || []))),
            debtors: JSON.parse(JSON.stringify(typeof debtors !== 'undefined' ? debtors : (window.debtors || [])))
        };
    } else {
        window.historicalBaseline = null;
    }
};

window.processSmartDeltaRollover = async function(newState, dateStr) {
    if (!window.historicalBaseline) return;
    const oldState = window.historicalBaseline;
    const userId = window.currentUser ? window.currentUser.uid : null;
    if (!userId) return;

    let deltaApplied = false;
    let accountsDelta = {};
    (newState.accounts || []).forEach(newAcc => {
        const oldAcc = oldState.accounts.find(a => a.id === newAcc.id) || { balance: 0 };
        const diff = (newAcc.balance || 0) - (oldAcc.balance || 0);
        if (diff !== 0) { accountsDelta[newAcc.id] = diff; deltaApplied = true; }
    });

    let productsDelta = {};
    (newState.products || []).forEach(newProd => {
        const oldProd = oldState.products.find(p => p.id === newProd.id) || { quantity: 0 };
        const diff = (newProd.quantity || 0) - (oldProd.quantity || 0);
        if (diff !== 0) { productsDelta[newProd.id] = diff; deltaApplied = true; }
    });

    let debtorsDelta = {};
    (newState.debtors || []).forEach(newDebtor => {
        const oldDebtor = oldState.debtors.find(d => d.id === newDebtor.id) || { total_debt: 0 };
        const diff = (newDebtor.total_debt || 0) - (oldDebtor.total_debt || 0);
        if (diff !== 0) { debtorsDelta[newDebtor.id] = diff; deltaApplied = true; }
    });

    if (!deltaApplied) return;

    try {
        const db = window.db;
        const docRef = window.doc(db, 'users', userId, 'summaries', 'latestBalances');
        const docSnap = await window.getDoc(docRef);
        if (!docSnap.exists()) return;
        
        let latestData = docSnap.data();
        let updatedAccounts = (latestData.accounts || []).map(acc => {
            if (accountsDelta[acc.id]) acc.balance += accountsDelta[acc.id];
            return acc;
        });
        let updatedProducts = (latestData.products || []).map(prod => {
            if (productsDelta[prod.id]) prod.quantity += productsDelta[prod.id];
            return prod;
        });
        let updatedDebtors = (latestData.debtors || []).map(debtor => {
            if (debtorsDelta[debtor.id]) debtor.total_debt += debtorsDelta[debtor.id];
            return debtor;
        });

        await window.setDoc(docRef, { accounts: updatedAccounts, products: updatedProducts, debtors: updatedDebtors }, { merge: true });
        console.log('[Smart Delta] Successfully rolled over deltas to latestBalances');
        window.historicalBaseline = {
            accounts: JSON.parse(JSON.stringify(newState.accounts || [])),
            products: JSON.parse(JSON.stringify(newState.products || [])),
            debtors: JSON.parse(JSON.stringify(newState.debtors || []))
        };
    } catch (err) {
        console.error('Smart Delta error:', err);
    }
};

window.loadLatestBalances = function(callback) {
    console.log("Loading latestBalances...");
    if (!window.currentUser) {
        if (typeof callback === 'function') callback();
        return;
    }
    const docRef = window.doc(window.db, "users", window.currentUser.uid, "summaries", "latestBalances");
    window.getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.accounts) window.accounts = data.accounts;
            if (data.products) window.products = data.products;
            if (data.debtors) window.debtors = data.debtors;
            if (data.suppliers) window.suppliers = data.suppliers;
            if (data.liabilities) window.liabilities = data.liabilities;
            if (data.monthlyLiabilities) window.monthlyLiabilities = data.monthlyLiabilities;
            if (data.serialNumbersLog) window.serialNumbersLog = data.serialNumbersLog;
            if (data.debtorProfiles) window.debtorProfiles = data.debtorProfiles;
            if (data.debtCollectionNotes) window.debtCollectionNotes = data.debtCollectionNotes;
            if (data.pendingOrders) window.pendingOrders = data.pendingOrders;
            
            // Handle standaloneSerials correctly through the setter if available
            if (data.standaloneSerials) {
                if (typeof window.setStandaloneSerials === 'function') {
                    window.setStandaloneSerials(data.standaloneSerials);
                } else {
                    window.standaloneSerials = data.standaloneSerials;
                }
            }
            
            console.log("Loaded all arrays from latest balances.");
        } else {
            console.log("No latest balances found.");
        }
        if (typeof callback === 'function') callback();
    }).catch(err => {
        console.error("Error loading latest balances:", err);
        if (typeof callback === 'function') callback();
    });
};

// Expose globally for finance-core.js to use without "window." prefix
window.addEventListener('DOMContentLoaded', () => {
    // If not already in global scope, declare it
    if (typeof loadLatestBalances === 'undefined') {
        window.loadLatestBalances = window.loadLatestBalances; // Ensures it's available
    }
});
