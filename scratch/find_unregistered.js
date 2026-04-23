const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPending() {
    console.log('--- BUSCANDO TODOS LOS REGISTROS NO REGISTRADOS (SIN CHECKPOINT) ---');
    
    const { data: glosas, error } = await supabase.from('glosas').select('*').eq('registrada_internamente', false);
    
    if (error) {
        console.error('Error fetching glosas:', error);
        return;
    }

    console.log(`Registros sin checkpoint encontrados: ${glosas.length}`);
    glosas.forEach(g => {
        console.log(`[${g.fecha}] Factura: ${g.factura}, Valor: ${g.valor_glosa}, Seccion: ${g.seccion}`);
    });
}

checkPending();
