const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    console.log('--- ANALIZANDO DUPLICADOS EN SUPABASE ---');
    
    const { data: glosas, error: gError } = await supabase.from('glosas').select('id, factura, valor_glosa, servicio, descripcion');
    if (gError) {
        console.error('Error fetching glosas:', gError);
        return;
    }
    
    const { data: ingresos, error: iError } = await supabase.from('ingresos').select('id, factura, valor_aceptado');
    if (iError) {
        console.error('Error fetching ingresos:', iError);
        return;
    }

    console.log(`Total Glosas: ${glosas.length}`);
    console.log(`Total Ingresos: ${ingresos.length}`);

    // Detectar duplicados lógicos (mismo contenido, distinto ID)
    const glosaMap = new Map();
    const glosaDuplicates = [];

    glosas.forEach(g => {
        const key = `${g.factura}|${g.valor_glosa}|${(g.servicio || '').trim().toLowerCase()}|${(g.descripcion || '').trim().toLowerCase().substring(0, 50)}`;
        if (glosaMap.has(key)) {
            glosaDuplicates.push({ original: glosaMap.get(key), duplicate: g });
        } else {
            glosaMap.set(key, g);
        }
    });

    console.log(`\nDuplicados lógicos encontrados (Glosas): ${glosaDuplicates.length}`);
    if (glosaDuplicates.length > 0) {
        console.log('Ejemplo de duplicado:');
        console.log(glosaDuplicates[0]);
    }

    // Detectar duplicados de ID (Imposible en Supabase por PK, pero por si acaso hay algo raro)
    const idSet = new Set();
    const idDuplicates = [];
    glosas.forEach(g => {
        if (idSet.has(g.id)) idDuplicates.push(g.id);
        else idSet.add(g.id);
    });
    console.log(`Duplicados de ID encontrados: ${idDuplicates.length}`);
}

checkDuplicates();
