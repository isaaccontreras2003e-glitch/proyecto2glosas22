/**
 * RECUPERACIÓN MASIVA - Autenticación con signInWithPassword + Inserción
 * INSTRUCCIONES: Ejecuta este script con:
 *   node recover_authenticated.js TU_EMAIL TU_CONTRASEÑA
 * Ejemplo:
 *   node recover_authenticated.js admin@foca.com miPassword123
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const crypto = require('crypto');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\800112725reporteglosas(1).csv';

// Leer email y password de los argumentos de línea de comandos
const EMAIL    = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
    console.error('❌ USO: node recover_authenticated.js TU_EMAIL TU_CONTRASEÑA');
    console.error('   Ejemplo: node recover_authenticated.js admin@foca.com miPassword123');
    process.exit(1);
}

function excelDateToString(serial) {
    if (!serial || isNaN(Number(serial))) return '';
    const date = new Date((Number(serial) - 25569) * 86400 * 1000);
    const d = String(date.getUTCDate()).padStart(2, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const y = date.getUTCFullYear();
    return `${d}/${m}/${y}`;
}

function mapEstado(e) {
    const up = String(e || '').toUpperCase();
    if (up.includes('LEVANTADA') || up.includes('LEVANTADO')) return 'Respondida';
    if (up.includes('RATIFICADA') || up.includes('RATIFICADO')) return 'No Aceptada';
    if (up.includes('ACEPTADA')   || up.includes('ACEPTADO'))   return 'Aceptada';
    return 'Pendiente';
}

async function main() {
    // 1. Autenticación
    console.log(`🔐 Autenticando como ${EMAIL}...`);
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD,
    });

    if (authErr) {
        console.error('❌ ERROR DE AUTENTICACIÓN:', authErr.message);
        process.exit(1);
    }
    console.log('✅ Autenticado correctamente. Usuario:', authData.user.email);

    // 2. Verificar rol admin
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', authData.user.id).single();
    console.log('   Rol:', perfil?.rol || '(sin perfil)');

    // 3. Leer CSV
    console.log('\n📖 Leyendo reporte FOMAG...');
    const wb = XLSX.readFile(CSV_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    console.log(`   ${rows.length} filas encontradas en el CSV`);

    // 4. Transformar datos
    const glosas = [];
    const seen = new Set();

    for (const row of rows) {
        const prefijo  = String(row['PREFIJO'] || '').trim();
        const nroFact  = String(row['NRO FACTURA'] || '').trim();
        const factura  = prefijo && nroFact ? `${prefijo}${nroFact}` : nroFact;

        if (!factura) continue;

        const valorGlosa = Number(row['VLR GLOSA']) || 0;
        if (valorGlosa <= 0) continue;

        const servicio = String(row['SERVICIO'] || '').trim();
        const key = `${factura}|${servicio}|${valorGlosa}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const valorAcept   = Number(row['VLR ACEPTADO']  || 0);
        const valorNoAcept = Number(row['VLR RATIFICADO'] || 0);
        const estado       = mapEstado(row['ESTADO AGRUPADOR'] || row['ESTADO']);
        const fecha        = excelDateToString(row['FECHA AUDITORIA']) || new Date().toLocaleDateString('es-ES');
        const causal       = String(row['CAUSAL']    || '').trim();
        const subcausal    = String(row['SUBCAUSAL'] || '').trim();
        const descripcion  = [causal, subcausal].filter(Boolean).join(' - ').substring(0, 500);
        const radicado     = String(row['NRO RADICADO'] || '').trim();

        glosas.push({
            id: crypto.randomUUID(),
            factura,
            servicio: servicio.substring(0, 200),
            orden_servicio: radicado,
            valor_glosa: valorGlosa,
            valor_aceptado: valorAcept,
            valor_no_aceptado: valorNoAcept,
            estado,
            tipo_glosa: 'Tarifas',
            descripcion,
            registrada_internamente: false,
            soporte_pdf: null,
            fecha,
            seccion: 'GLOSAS',
        });
    }

    console.log(`\n📊 Glosas válidas preparadas: ${glosas.length}`);
    if (glosas.length === 0) {
        console.log('⚠️  No hay glosas para importar.');
        return;
    }

    // Mostrar muestra
    console.log('\nEjemplo de primera glosa:');
    const g = glosas[0];
    console.log(`   Factura: ${g.factura} | Servicio: ${g.servicio.substring(0,40)}...`);
    console.log(`   ValorGlosa: $${g.valor_glosa.toLocaleString('es-ES')} | Estado: ${g.estado} | Fecha: ${g.fecha}`);

    console.log('\n⏳ Iniciando inserción en Supabase...\n');

    // 5. Insertar en lotes de 100
    const BATCH = 100;
    let ok = 0, fail = 0;

    for (let i = 0; i < glosas.length; i += BATCH) {
        const batch = glosas.slice(i, i + BATCH);
        const { error } = await supabase.from('glosas').insert(batch);
        if (error) {
            console.error(`\n❌ Error lote ${i}: ${error.message}`);
            fail += batch.length;
        } else {
            ok += batch.length;
            process.stdout.write(`\r   ✅ ${ok} / ${glosas.length} insertados...`);
        }
    }

    console.log(`\n\n🎉 ¡RECUPERACIÓN COMPLETADA!`);
    console.log(`   ✅ Insertados exitosamente: ${ok}`);
    console.log(`   ❌ Fallidos: ${fail}`);
    console.log('\n   Abre la app y verifica que los datos aparecen correctamente.');
}

main().catch(console.error);
