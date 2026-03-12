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
    console.log('--- BUSCANDO GLOSAS MARCADAS ---');
    const { data, error } = await supabase.from('glosas').select('*').eq('registrada_internamente', true).limit(10);
    if (error) {
        console.error('Error:', error);
        // Intentar sin el filtro por si la columna no existe o es diferente
        const { data: allData } = await supabase.from('glosas').select('*').limit(1);
        console.log('Columnas disponibles:', Object.keys(allData[0] || {}));
    } else {
        console.log('Glosas marcadas encontradas:', data.length);
        console.log(JSON.stringify(data.map(g => ({ id: g.id, factura: g.factura, registrada: g.registrada_internamente })), null, 2));
    }
}

check();
