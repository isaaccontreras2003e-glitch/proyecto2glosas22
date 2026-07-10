const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Archivos a revisar en Downloads
const files = [
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\Audit_History_2026-05-23.xlsx',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\reporte (80).xlsx',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\reporte (79).xlsx',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\reporte (78).xlsx',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\reporte (77).xlsx',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\reporte (76).xlsx',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\reporte (75).xlsx',
];

console.log('=== INSPECCIONANDO ARCHIVOS EN DOWNLOADS ===\n');

for (const file of files) {
    if (!fs.existsSync(file)) {
        console.log(`❌ No existe: ${path.basename(file)}`);
        continue;
    }
    
    try {
        const wb = XLSX.readFile(file);
        const stat = fs.statSync(file);
        console.log(`\n📄 ${path.basename(file)} (${(stat.size/1024).toFixed(1)}KB - ${stat.mtime.toLocaleDateString('es-ES')})`);
        console.log(`   Hojas: ${wb.SheetNames.join(', ')}`);
        
        // Buscar hoja que pueda tener glosas
        for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (rows.length > 2) {
                console.log(`   → Hoja "${sheetName}": ${rows.length} filas`);
                if (rows[0]) console.log(`     Cabecera: ${rows[0].slice(0,5).join(' | ')}`);
                if (rows[1]) console.log(`     Fila 1: ${String(rows[1]).substring(0,100)}`);
            }
        }
    } catch(e) {
        console.log(`❌ Error leyendo ${path.basename(file)}: ${e.message}`);
    }
}
