const XLSX = require('xlsx');
const fs = require('fs');

const BACKUP_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop\\BACKUP_RECUPERADO_1781626325727.xlsx';

const wb = XLSX.readFile(BACKUP_PATH);
console.log('Hojas:', wb.SheetNames);

// Mostrar el contenido RAW de la hoja Glosas
const glosasSheetName = wb.SheetNames.find(n => n.includes('Glosas'));
const ws = wb.Sheets[glosasSheetName];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log(`\nTotal filas (incluyendo cabecera): ${rows.length}`);
console.log('Fila 0 (cabecera):', rows[0]);
console.log('Fila 1:', rows[1]);
console.log('Fila 2:', rows[2]);

// Ver el rango del sheet
console.log('\nRango del sheet:', ws['!ref']);
