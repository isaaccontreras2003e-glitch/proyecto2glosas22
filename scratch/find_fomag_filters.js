const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const downloadsPath = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads';

try {
    const files = fs.readdirSync(downloadsPath);
    const filteredFiles = files.filter(f => f.toLowerCase().includes('listado_glosas_filtrado'));
    console.log(`Found ${filteredFiles.length} LISTADO_GLOSAS_FILTRADO files in Downloads:`);
    
    const fileInfos = filteredFiles.map(f => {
        const fullPath = path.join(downloadsPath, f);
        const stat = fs.statSync(fullPath);
        return { name: f, path: fullPath, mtime: stat.mtime, size: stat.size };
    });
    
    // Sort by mtime descending
    fileInfos.sort((a, b) => b.mtime - a.mtime);
    
    for (const info of fileInfos) {
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
