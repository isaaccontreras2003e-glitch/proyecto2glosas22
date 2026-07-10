const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Revisar TODOS los reportes en Downloads para encontrar datos de glosas
const downloadsPath = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads';

const allFiles = fs.readdirSync(downloadsPath)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'))
    .map(f => path.join(downloadsPath, f));

console.log(`Encontrados ${allFiles.length} archivos en Downloads\n`);

for (const file of allFiles) {
    try {
        const stat = fs.statSync(file);
        const wb = XLSX.readFile(file);
        
        for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const header = rows[0] || [];
            const headerStr = header.join('|').toLowerCase();
            
            // Buscar hojas que tengan columnas de glosas
            if (headerStr.includes('glosa') || headerStr.includes('factura') || 
                headerStr.includes('valor_glosa') || headerStr.includes('estado') ||
                headerStr.includes('servicio')) {
                console.log(`\n✅ POSIBLE GLOSAS: ${path.basename(file)} (${stat.mtime.toLocaleDateString('es-ES')})`);
                console.log(`   Hoja: "${sheetName}" | ${rows.length} filas`);
                console.log(`   Cabecera: ${header.slice(0,8).join(' | ')}`);
                if (rows[1]) console.log(`   Fila 1: ${String(rows[1]).substring(0, 150)}`);
            }
        }
    } catch(e) {
        // silencioso
    }
}

console.log('\n=== FIN BÚSQUEDA ===');
