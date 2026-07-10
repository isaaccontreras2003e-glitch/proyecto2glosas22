const XLSX = require('xlsx');
const fs = require('fs');

// El backup anterior del 21 de abril
const BACKUP_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop\\BACKUP_RECUPERADO_1776811704431.xlsx';

const wb = XLSX.readFile(BACKUP_PATH);
console.log('Hojas:', wb.SheetNames);

const glosasSheetName = wb.SheetNames.find(n => n.includes('Glosas'));
const ws = wb.Sheets[glosasSheetName];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log(`\nTotal filas (incluyendo cabecera): ${rows.length}`);
console.log('Fila 0 (cabecera):', rows[0]);
console.log('Fila 1:', rows[1]);
if (rows[2]) console.log('Fila 2:', rows[2]);
console.log('\nRango del sheet:', ws['!ref']);

// Contar filas de datos reales
const dataRows = rows.slice(1).filter(r => r && r.length > 1 && r[1] && r[1] !== 'TOTALES');
console.log(`\nGlosas reales en este backup: ${dataRows.length}`);

const ingSheetName = wb.SheetNames.find(n => n.includes('Ingresos'));
if (ingSheetName) {
    const iws = wb.Sheets[ingSheetName];
    const irows = XLSX.utils.sheet_to_json(iws, { header: 1 });
    const idataRows = irows.slice(1).filter(r => r && r.length > 1 && r[1] && r[1] !== 'TOTALES');
    console.log(`Ingresos reales en este backup: ${idataRows.length}`);
}
