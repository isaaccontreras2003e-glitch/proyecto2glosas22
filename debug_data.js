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
    console.log('--- MUESTRA DE GLOSAS (Top 5) ---');
    const { data: glosas } = await supabase.from('glosas').select('*').limit(5);
    console.log(JSON.stringify(glosas, null, 2));

    console.log('--- MUESTRA DE INGRESOS (Top 5) ---');
    const { data: ingresos } = await supabase.from('ingresos').select('*').limit(5);
    console.log(JSON.stringify(ingresos, null, 2));
}

check();
