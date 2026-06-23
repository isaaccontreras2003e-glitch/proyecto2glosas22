const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const downloadsPath = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads';

try {
    const files = fs.readdirSync(downloadsPath);
    const recentFiles = [];
    const minDate = new Date('2026-06-01');

    for (const f of files) {
        const fullPath = path.join(downloadsPath, f);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.mtime >= minDate && (f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'))) {
                recentFiles.push({ name: f, path: fullPath, mtime: stat.mtime, size: stat.size });
            }
        } catch(e) {}
    }
    
    recentFiles.sort((a, b) => b.mtime - a.mtime);
    
    console.log(`=== RECENT FILES IN DOWNLOADS (after June 1, 2026) ===`);
    for (const info of recentFiles) {
        console.log(`- ${info.name} | size: ${(info.size / 1024).toFixed(1)} KB | modified: ${info.mtime.toLocaleString()}`);
        try {
            const wb = XLSX.readFile(info.path);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`   * Rows: ${rows.length}`);
            if (rows.length > 0) {
                console.log(`   * Header: ${rows[0].slice(0, 8).join(' | ')}`);
            }
            if (rows.length > 1) {
                console.log(`   * Sample Row 1: ${rows[1].slice(0, 8).join(' | ')}`);
            }
        } catch(err) {
            console.log(`   * Error: ${err.message}`);
        }
    }
} catch(err) {
    console.error('Error scanning downloads:', err.message);
}
