const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepClean() {
    console.log('🚀 INICIANDO LIMPIEZA PROFUNDA DE DUPLICADOS...');
    
    // 1. LIMPIEZA DE GLOSAS
    const { data: glosas, error: gError } = await supabase.from('glosas').select('id, factura, valor_glosa, servicio, descripcion, fecha');
    if (gError) return console.error('Error glosas:', gError);

    const glosaMap = new Map();
    const idsToDelete = [];

    glosas.forEach(g => {
        const key = `${g.factura}|${g.valor_glosa}|${(g.servicio || '').trim().toLowerCase()}|${(g.descripcion || '').trim().toLowerCase().substring(0, 50)}`;
        if (glosaMap.has(key)) {
            // Ya existe un registro igual, marcamos este para borrar
            idsToDelete.push(g.id);
        } else {
            glosaMap.set(key, g.id);
        }
    });

    console.log(`Glosas duplicadas identificadas: ${idsToDelete.length}`);
    if (idsToDelete.length > 0) {
        // Borrar en lotes de 50 para evitar timeouts
        for (let i = 0; i < idsToDelete.length; i += 50) {
            const batch = idsToDelete.slice(i, i + 50);
            const { error } = await supabase.from('glosas').delete().in('id', batch);
            if (error) console.error(`Error borrando lote ${i}:`, error);
            else console.log(`✓ Lote ${i + batch.length} borrado.`);
        }
    }

    // 2. LIMPIEZA DE INGRESOS
    const { data: ingresos, error: iError } = await supabase.from('ingresos').select('id, factura, valor_aceptado');
    if (iError) return console.error('Error ingresos:', iError);

    const ingresoMap = new Map();
    const iIdsToDelete = [];

    ingresos.forEach(i => {
        const key = `${i.factura}|${i.valor_aceptado}`;
        if (ingresoMap.has(key)) {
            iIdsToDelete.push(i.id);
        } else {
            ingresoMap.set(key, i.id);
        }
    });

    console.log(`Ingresos duplicados identificados: ${iIdsToDelete.length}`);
    if (iIdsToDelete.length > 0) {
        for (let i = 0; i < iIdsToDelete.length; i += 50) {
            const batch = iIdsToDelete.slice(i, i + 50);
            const { error } = await supabase.from('ingresos').delete().in('id', batch);
            if (error) console.error(`Error borrando lote ingresos ${i}:`, error);
        }
    }

    console.log('✨ LIMPIEZA COMPLETADA.');
}

deepClean();
