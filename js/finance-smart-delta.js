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
        const oldDebtor = oldState.debtors.find(d => d.id === newDebtor.id) || {};
        const newAmt = newDebtor.amount !== undefined ? Number(newDebtor.amount) : (newDebtor.total_debt !== undefined ? Number(newDebtor.total_debt) : 0);
        const oldAmt = oldDebtor.amount !== undefined ? Number(oldDebtor.amount) : (oldDebtor.total_debt !== undefined ? Number(oldDebtor.total_debt) : 0);
        const diff = newAmt - oldAmt;
        if (diff !== 0) { debtorsDelta[newDebtor.id] = diff; deltaApplied = true; }
    });

    if (!deltaApplied) return;

    try {
        const db = window.db;
        const docRef = window.doc(db, 'users', userId, 'summaries', 'latestBalances');
        const docSnap = await window.getDoc(docRef);
        if (!docSnap.exists()) return;
        
        let latestData = docSnap.data();
        
        let updatedAccounts = [...(latestData.accounts || [])];
        (newState.accounts || []).forEach(newAcc => {
            let existing = updatedAccounts.find(a => a.id === newAcc.id);
            if (existing) { if (accountsDelta[newAcc.id]) existing.balance += accountsDelta[newAcc.id]; }
            else { updatedAccounts.push({ ...newAcc }); }
        });
        
        let updatedProducts = [...(latestData.products || [])];
        (newState.products || []).forEach(newProd => {
            let existing = updatedProducts.find(p => p.id === newProd.id);
            if (existing) { if (productsDelta[newProd.id]) existing.quantity += productsDelta[newProd.id]; }
            else { updatedProducts.push({ ...newProd }); }
        });
        
        let updatedDebtors = [...(latestData.debtors || [])];
        (newState.debtors || []).forEach(newDebtor => {
            let existing = updatedDebtors.find(d => d.id === newDebtor.id);
            if (existing) {
                if (debtorsDelta[newDebtor.id]) {
                    if (existing.amount !== undefined) existing.amount = Number(existing.amount) + debtorsDelta[newDebtor.id];
                    else existing.total_debt = Number(existing.total_debt || 0) + debtorsDelta[newDebtor.id];
                }
            } else { updatedDebtors.push({ ...newDebtor }); }
        });
        
        // Sync deletions: items that existed in the historical baseline but are missing now were deleted locally
        const deletedAccountIds = (oldState.accounts || []).filter(a => !(newState.accounts || []).find(na => na.id === a.id)).map(a => a.id);
        updatedAccounts = updatedAccounts.filter(a => !deletedAccountIds.includes(a.id));
        
        const deletedProductIds = (oldState.products || []).filter(p => !(newState.products || []).find(np => np.id === p.id)).map(p => p.id);
        updatedProducts = updatedProducts.filter(p => !deletedProductIds.includes(p.id));
        
        const deletedDebtorIds = (oldState.debtors || []).filter(d => !(newState.debtors || []).find(nd => nd.id === d.id)).map(d => d.id);
        updatedDebtors = updatedDebtors.filter(d => !deletedDebtorIds.includes(d.id));

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
