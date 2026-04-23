const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecent() {
    console.log('--- BUSCANDO REGISTROS DE AYER Y HOY ---');
    
    const { data: glosas, error } = await supabase.from('glosas').select('*');
    
    if (error) {
        console.error('Error fetching glosas:', error);
        return;
    }

    console.log(`Total glosas en DB: ${glosas.length}`);

    const recent = glosas.filter(g => {
        const fecha = g.fecha || '';
        // Buscar 21, 22, 23 de Abril 2026
        return fecha.includes('21/04/2026') || fecha.includes('22/04/2026') || fecha.includes('23/04/2026');
    });

    console.log(`Registros recientes encontrados: ${recent.length}`);
    recent.forEach(g => {
        console.log(`[${g.fecha}] Factura: ${g.factura}, Valor: ${g.valor_glosa}, Registrada Internamente: ${g.registrada_internamente}`);
    });

    const { data: ingresos } = await supabase.from('ingresos').select('*');
    if (ingresos) {
        const recentI = ingresos.filter(i => {
             const fecha = i.fecha || '';
             return fecha.includes('21/04/2026') || fecha.includes('22/04/2026') || fecha.includes('23/04/2026');
        });
        console.log(`\nIngresos recientes encontrados: ${recentI.length}`);
        recentI.forEach(i => {
            console.log(`[${i.fecha}] Factura: ${i.factura}, Valor Aceptado: ${i.valor_aceptado}`);
        });
    }
}

checkRecent();
