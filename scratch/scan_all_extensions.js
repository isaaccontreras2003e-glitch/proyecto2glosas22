const fs = require('fs');
const path = require('path');

const dirs = [
    'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop',
    'C:\\Users\\AUXFACTURACION8-VIVA\\Documents'
];

const extensions = ['.sql', '.zip', '.gz', '.tar', '.rar', '.7z', '.bak'];

console.log('=== BUSCANDO RESPALDOS DE BASE DE DATOS (.sql, .zip, .gz, .bak, etc.) ===\n');

for (const dir of dirs) {
    try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        const matches = files.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return extensions.includes(ext) || f.toLowerCase().includes('backup') || f.toLowerCase().includes('supabase');
        });
        
        if (matches.length > 0) {
            console.log(`Directorio: ${dir} (${matches.length} coincidencias)`);
            for (const f of matches) {
                const fullPath = path.join(dir, f);
                const stat = fs.statSync(fullPath);
                console.log(` - ${f} | size: ${(stat.size / 1024).toFixed(1)} KB | modified: ${stat.mtime.toLocaleString()}`);
            }
            console.log('');
        }
    } catch(err) {
        console.error(`Error en ${dir}:`, err.message);
    }
}
