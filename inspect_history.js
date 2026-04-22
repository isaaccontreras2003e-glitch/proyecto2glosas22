const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILE = path.join('..', 'BACKUP_RECUPERADO_1776811704431.xlsx');

async function inspect() {
    if (!fs.existsSync(FILE)) {
        console.error('File not found:', FILE);
        return;
    }
    const wb = XLSX.readFile(FILE);
    const sheet = wb.Sheets['🕒 Historial'];
    if (!sheet) {
        console.error('Historial sheet not found');
        return;
    }
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log('Total history rows:', rows.length);
    console.log('First 5 entries:', JSON.stringify(rows.slice(0, 5), null, 2));
    
    // Contar cuántos son INSERT de Glosas
    const glosaInserts = rows.filter(r => r.Acción === 'INSERT' && (r.Tabla === 'Glosas' || r.Tabla === 'glosas'));
    console.log('Total Glosa Inserts in history:', glosaInserts.length);
}

inspect();
