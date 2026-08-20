const fs = require('fs');
let code = fs.readFileSync('D:\\\\الشركة\\\\بيئة اختبار\\\\js\\\\finance-core.js', 'utf8');

const targetStr = `if (typeof window.setStandaloneSerials === 'function') window.setStandaloneSerials(data.standaloneSerials || [], true);`;
const replacementStr = `    // Migration: If standaloneSerials is missing from the daily backup, try to load it from the old global document
    if (typeof window.setStandaloneSerials === 'function') {
        if (data.standaloneSerials && data.standaloneSerials.length > 0) {
            window.setStandaloneSerials(data.standaloneSerials, true);
        } else {
            // Load from old global document as fallback
            if (window.currentUser && window.db && window.doc && window.getDoc) {
                window.getDoc(window.doc(window.db, 'users', window.currentUser.uid, 'standaloneSerials', 'main')).then(snap => {
                    if (snap.exists() && snap.data().data) {
                        console.log('Migrated standalone serials from old global doc');
                        window.setStandaloneSerials(snap.data().data, true);
                        if (typeof saveSystemToCloud === 'function') saveSystemToCloud();
                    } else {
                        window.setStandaloneSerials([], true);
                    }
                }).catch(e => {
                    console.error('Error migrating serials:', e);
                    window.setStandaloneSerials([], true);
                });
            } else {
                window.setStandaloneSerials([], true);
            }
        }
    }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('D:\\\\الشركة\\\\بيئة اختبار\\\\js\\\\finance-core.js', code);
    console.log('Added migration fallback to loadState');
} else {
    console.log('Could not find target string in finance-core.js');
}
