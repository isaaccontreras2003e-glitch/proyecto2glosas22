const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalClean() {
    console.log('🚀 INICIANDO LIMPIEZA FINAL DE DUPLICADOS...');
    
    const { data: glosas, error: gError } = await supabase.from('glosas').select('*');
    if (gError) return console.error('Error fetching glosas:', gError);

    console.log(`Analizando ${glosas.length} glosas.`);

    const seen = new Map();
    const toDelete = [];

    // Ordenar localmente por ID para consistencia (IDs más "viejos" primero si es posible)
    glosas.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    glosas.forEach(g => {
        const fact = (g.factura || '').trim().toUpperCase();
        const valor = Number(g.valor_glosa) || 0;
        const serv = (g.servicio || '').trim().toUpperCase();
        // Clave de contenido puro
        const key = `${fact}_${valor}_${serv}`;

        if (seen.has(key)) {
            toDelete.push(g.id);
        } else {
            seen.set(key, g.id);
        }
    });

    console.log(`Duplicados encontrados: ${toDelete.length}`);
    
    if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += 50) {
            const batch = toDelete.slice(i, i + 50);
            const { error } = await supabase.from('glosas').delete().in('id', batch);
            if (error) console.error('Error delete batch:', error);
            else console.log(`✓ Borrados ${i + batch.length}/${toDelete.length}`);
        }
    }
    
    // Lo mismo para ingresos
    const { data: ingresos } = await supabase.from('ingresos').select('*');
    if (ingresos) {
        const seenI = new Map();
        const toDeleteI = [];
        ingresos.forEach(i => {
           const key = `${(i.factura || '').trim().toUpperCase()}_${Number(i.valor_aceptado) || 0}`;
           if (seenI.has(key)) toDeleteI.push(i.id);
           else seenI.set(key, i.id);
        });
        if (toDeleteI.length > 0) {
            await supabase.from('ingresos').delete().in('id', toDeleteI);
            console.log(`✓ Borrados ${toDeleteI.length} ingresos duplicados.`);
        }
    }

    console.log('✨ LIMPIEZA FINALIZADA.');
}

finalClean();
