const XLSX = require('xlsx');
const fs = require('fs');

// El archivo que acabamos de descargar
const BACKUP_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop\\BACKUP_RECUPERADO_1781626325727.xlsx';

if (!fs.existsSync(BACKUP_PATH)) {
    console.error('❌ No se encontró el archivo:', BACKUP_PATH);
    process.exit(1);
}

const wb = XLSX.readFile(BACKUP_PATH);
console.log('📋 Hojas encontradas en el backup:', wb.SheetNames.join(', '));
console.log('');

// Hoja de Glosas
const glosasSheet = wb.Sheets[wb.SheetNames.find(n => n.includes('Glosas'))];
if (glosasSheet) {
    const rows = XLSX.utils.sheet_to_json(glosasSheet, { header: 1 });
    const dataRows = rows.slice(1).filter(r => r && r.length > 1 && r[1] && r[1] !== 'TOTALES');
    console.log(`✅ GLOSAS encontradas en backup: ${dataRows.length}`);
    if (dataRows.length > 0) {
        console.log(`   Ejemplo fila 1: Factura=${dataRows[0][1]}, Servicio=${dataRows[0][2]}, Valor=${dataRows[0][4]}`);
        console.log(`   Última fila: Factura=${dataRows[dataRows.length-1][1]}`);
    }
}

// Hoja de Ingresos
const ingresosSheetName = wb.SheetNames.find(n => n.includes('Ingresos'));
if (ingresosSheetName) {
    const ingSheet = wb.Sheets[ingresosSheetName];
    const rows = XLSX.utils.sheet_to_json(ingSheet, { header: 1 });
    const dataRows = rows.slice(1).filter(r => r && r.length > 1 && r[1] && r[1] !== 'TOTALES');
    console.log(`✅ INGRESOS encontrados en backup: ${dataRows.length}`);
}

console.log('\n🔑 El backup está listo. Ejecuta MASTER_RESTORE_FIXED.js para restaurar.');
