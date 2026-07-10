const XLSX = require('xlsx');
const fs = require('fs');

// ARCHIVO MÁS PROMETEDOR: 63.305 filas de glosas
const CSV_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\800112725reporteglosas(1).csv';
const XLSX_PATH1 = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\800112725(1).xlsx';
const XLSX_PATH2 = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\800112725(2).xlsx';
const XLSX_PATH3 = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\800112725.xlsx';

// Revisar CSV de glosas
console.log('=== 800112725reporteglosas(1).csv ===');
const wb1 = XLSX.readFile(CSV_PATH);
const ws1 = wb1.Sheets[wb1.SheetNames[0]];
const rows1 = XLSX.utils.sheet_to_json(ws1, { header: 1 });
console.log(`Total filas: ${rows1.length}`);
console.log('Cabecera completa:', rows1[0]);
console.log('Fila 1:', rows1[1]);
console.log('Fila 2:', rows1[2]);
console.log('');

// Revisar primer xlsx
console.log('=== 800112725(1).xlsx ===');
const wb2 = XLSX.readFile(XLSX_PATH1);
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
console.log(`Total filas: ${rows2.length}`);
console.log('Cabecera completa:', rows2[0]);
console.log('Fila 1:', rows2[1]);
