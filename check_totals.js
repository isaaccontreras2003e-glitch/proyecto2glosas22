const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function check() {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                env[key] = value;
            }
        });

        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        console.log('--- BUSCANDO TODOS LOS INGRESOS ---');
        const { data: ingresos, error: iErr } = await supabase.from('ingresos').select('*');
        if (iErr) throw iErr;

        console.log('INGRESOS ENCONTRADOS:', ingresos.length);
        ingresos.forEach(i => {
            console.log(`Factura: ${i.factura} | Aceptado: ${i.valor_aceptado} | Sección: ${i.seccion || 'GLOSAS'}`);
        });

        const totalAceptadoGlobal = ingresos.reduce((acc, i) => acc + (i.valor_aceptado || 0), 0);
        console.log('\nTOTAL ACEPTADO GLOBAL (Todas las secciones):', totalAceptadoGlobal);

        const totalGlosas = ingresos.filter(i => (i.seccion || 'GLOSAS').toUpperCase() === 'GLOSAS').reduce((acc, i) => acc + (i.valor_aceptado || 0), 0);
        console.log('TOTAL ACEPTADO SECCIÓN GLOSAS:', totalGlosas);

        const totalMedicamentos = ingresos.filter(i => (i.seccion || '').toUpperCase() === 'MEDICAMENTOS').reduce((acc, i) => acc + (i.valor_aceptado || 0), 0);
        console.log('TOTAL ACEPTADO SECCIÓN MEDICAMENTOS:', totalMedicamentos);

    } catch (err) {
        console.error('Error:', err);
    }
}

check();
