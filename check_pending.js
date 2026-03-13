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
    console.log('--- ANALIZANDO SALDO PENDIENTE (9.3M) ---');

    const { data: glosas } = await supabase.from('glosas').select('*');
    const { data: ingresos } = await supabase.from('ingresos').select('*');

    const facturas = new Set([
        ...glosas.map(g => g.factura.trim().toUpperCase()),
        ...ingresos.map(i => i.factura.trim().toUpperCase())
    ]);

    const pendingDetails = [];
    let totalPending = 0;

    facturas.forEach(f => {
        const fGlosas = glosas.filter(g => g.factura.trim().toUpperCase() === f);
        const fIngresos = ingresos.filter(i => i.factura.trim().toUpperCase() === f);

        const glosado = fGlosas.reduce((acc, g) => acc + (parseFloat(g.valor_glosa) || 0), 0);
        const aceptado = fIngresos.reduce((acc, i) => acc + (parseFloat(i.valor_aceptado) || 0), 0);
        const noAceptado = fIngresos.reduce((acc, i) => acc + (parseFloat(i.valor_no_aceptado) || 0), 0);

        const pendiente = glosado - aceptado - noAceptado;

        if (pendiente > 1) { // Mayor a 1 para evitar decimales
            pendingDetails.push({
                factura: f,
                glosado,
                aceptado,
                noAceptado,
                pendiente
            });
            totalPending += pendiente;
        }
    });

    console.log('\nFacturas con Saldo Pendiente:');
    pendingDetails.sort((a, b) => b.pendiente - a.pendiente).forEach(d => {
        console.log(`${d.factura}: Glosado: ${d.glosado} | Aceptado: ${d.aceptado} | NoAceptado: ${d.noAceptado} | PENDIENTE: ${d.pendiente}`);
    });

    console.log('\nSuma Total Pendiente calculada:', totalPending);
}

check();
