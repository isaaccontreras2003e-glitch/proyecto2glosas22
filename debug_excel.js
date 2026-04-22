const XLSX = require('xlsx');
const EXCEL_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop\\BACKUP_RECUPERADO_1776811704431.xlsx';

function debugExcel() {
    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log('Sheets found:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\nSheet: ${name}`);
        console.log(`Total rows: ${rows.length}`);
        console.log('First 3 rows:', JSON.stringify(rows.slice(0, 3), null, 2));
    });
}

debugExcel();
