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
    console.log('--- BUSCANDO GLOSAS PENDIENTES ---');

    const { data: glosas } = await supabase.from('glosas').select('*').eq('estado', 'Pendiente');

    if (glosas) {
        console.log('Cantidad de glosas pendientes:', glosas.length);
        const total = glosas.reduce((acc, g) => acc + (parseFloat(g.valor_glosa) || 0), 0);
        console.log('Suma total de glosas pendientes:', total);

        console.log('\nMuestra de facturas pendientes:');
        glosas.slice(0, 10).forEach(g => {
            console.log(`${g.factura}: ${g.valor_glosa}`);
        });
    }
}

check();
