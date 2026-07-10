const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const desktopPath = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop';

try {
    const files = fs.readdirSync(desktopPath);
    console.log(`Scanning Desktop: found ${files.length} total files/folders.`);
    const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
    console.log(`Found ${excelFiles.length} Excel/CSV files on Desktop:`);
    for (const f of excelFiles) {
        const fullPath = path.join(desktopPath, f);
        const stat = fs.statSync(fullPath);
        console.log(`- ${f} | size: ${(stat.size / 1024).toFixed(1)} KB | modified: ${stat.mtime.toLocaleString()}`);
        try {
            const wb = XLSX.readFile(fullPath);
            for (const name of wb.SheetNames) {
                const sheet = wb.Sheets[name];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                console.log(`   * Sheet "${name}": ${rows.length} rows`);
            }
        } catch(err) {
            console.log(`   * Error reading: ${err.message}`);
        }
    }
} catch(err) {
    console.error('Error scanning desktop:', err.message);
}
