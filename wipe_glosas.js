const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeGlosas() {
    console.log('🔴 INICIANDO BORRADO TOTAL DE GLOSAS (PRESERVANDO PAGOS)...');
    
    // Obtenemos los IDs primero para confirmar
    const { data, error: fetchError } = await supabase.from('glosas').select('id');
    if (fetchError) {
        console.error('Error al obtener glosas:', fetchError);
        return;
    }

    console.log(`Borrando ${data.length} registros de la tabla 'glosas'...`);
    
    // Borrado por lotes de 200
    const ids = data.map(g => g.id);
    for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const { error: deleteError } = await supabase.from('glosas').delete().in('id', batch);
        if (deleteError) {
            console.error(`Error borrando lote ${i}:`, deleteError);
        } else {
            console.log(`✓ Lote ${i + batch.length} borrado.`);
        }
    }

    console.log('✨ TABLA DE GLOSAS VACIADA CORRECTAMENTE.');
}

wipeGlosas();
