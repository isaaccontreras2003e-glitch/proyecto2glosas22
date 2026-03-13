const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').filter(Boolean).forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- BUSCANDO TABLAS Y DATOS ---');

    // Listar todas las tablas disponibles (truco: intentar seleccionar de una tabla inexistente para ver el error si no tenemos metadatos)
    // O mejor, consultar las tablas más probables
    const tables = ['glosas', 'ingresos', 'users', 'auth_users', 'config'];

    for (const table of tables) {
        const { data, count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Tabla [${table}]: No accesible o no existe (${error.message})`);
        } else {
            console.log(`Tabla [${table}]: Existe, Filas: ${count}`);
        }
    }
}

check();
