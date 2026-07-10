// Script para intentar acceder a Supabase con autenticacion y verificar si
// Supabase tiene Point-in-Time Recovery (PITR) habilitado, y explorar
// si existe alguna forma de recuperar datos de la base de datos.

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, anonKey);

async function checkAll() {
    console.log('=== DIAGNÓSTICO COMPLETO ===\n');

    // 1. Verificar tabla glosas (podría haber datos con RLS)
    const { data: g, error: ge, count } = await supabase
        .from('glosas')
        .select('*', { count: 'exact' })
        .limit(5);
    console.log('Glosas (anon):', g ? g.length : 0, 'error:', ge?.message || 'ninguno');
    if (g && g.length > 0) {
        console.log('PRIMERA GLOSA:', JSON.stringify(g[0], null, 2));
    }

    // 2. Verificar tabla ingresos
    const { data: i, error: ie } = await supabase
        .from('ingresos')
        .select('*', { count: 'exact' })
        .limit(5);
    console.log('\nIngresos (anon):', i ? i.length : 0, 'error:', ie?.message || 'ninguno');

    // 3. Listar TODOS los archivos en Supabase Storage
    console.log('\n=== TODOS LOS ARCHIVOS EN STORAGE ===');
    const buckets = ['soportes_glosas'];
    for (const bucket of buckets) {
        const { data: files, error } = await supabase.storage
            .from(bucket)
            .list('', { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } });
        
        if (error) {
            console.log(`Bucket ${bucket}: Error - ${error.message}`);
        } else {
            console.log(`\nBucket ${bucket} (${files?.length || 0} archivos):`);
            files?.forEach(f => {
                console.log(`  - ${f.name} | ${(f.metadata?.size / 1024 || 0).toFixed(1)}KB | ${f.updated_at}`);
            });
        }
    }

    // 4. Verificar si hay versiones anteriores del Excel
    console.log('\n=== INTENTANDO DESCARGAR EL CONSOLIDADO ===');
    const { data: fileData, error: dlErr } = await supabase.storage
        .from('soportes_glosas')
        .download('Consolidado_Fijo_Sisfact.xlsx');
    
    if (dlErr) {
        console.log('Error descargando:', dlErr.message);
    } else {
        const ab = await fileData.arrayBuffer();
        console.log(`Archivo descargado: ${(ab.byteLength / 1024).toFixed(1)} KB`);
        // Si el archivo tiene mas de 30KB probablemente tiene datos
        if (ab.byteLength > 30000) {
            console.log('✅ El archivo tiene tamaño significativo - podría tener datos!');
        } else {
            console.log('⚠️ El archivo es pequeño - probablemente vacío');
        }
    }
}

checkAll().catch(console.error);
