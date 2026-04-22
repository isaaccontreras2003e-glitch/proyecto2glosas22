const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function broadClean() {
    console.log('🚀 INICIANDO LIMPIEZA AMPLIA DE DUPLICADOS...');
    
    const { data: glosas, error: gError } = await supabase.from('glosas').select('*').order('created_at', { ascending: true });
    if (gError) return console.error('Error fetching glosas:', gError);

    console.log(`Leídas ${glosas.length} glosas.`);

    const seen = new Map();
    const toDelete = [];

    glosas.forEach(g => {
        // Clave muy simple: Factura + Valor + Servicio (si existe)
        const fact = (g.factura || '').trim().toUpperCase();
        const valor = Number(g.valor_glosa) || 0;
        const serv = (g.servicio || '').trim().toUpperCase();
        const key = `${fact}_${valor}_${serv}`;

        if (seen.has(key)) {
            toDelete.push(g.id);
        } else {
            seen.set(key, g.id);
        }
    });

    console.log(`Identificados para borrar: ${toDelete.length}`);
    
    if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += 50) {
            const batch = toDelete.slice(i, i + 50);
            const { error } = await supabase.from('glosas').delete().in('id', batch);
            if (error) console.error('Error delete batch:', error);
            else console.log(`Borrados ${i + batch.length}/${toDelete.length}`);
        }
    }
    console.log('✨ FIN.');
}

broadClean();
