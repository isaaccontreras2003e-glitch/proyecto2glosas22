// Script para limpiar duplicados de Supabase directamente
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicates() {
  console.log('🔍 Conectando a Supabase...');

  // Traer TODOS los registros ordenados por id (para conservar el primero)
  const { data: allGlosas, error: fetchError } = await supabase
    .from('glosas')
    .select('*')
    .order('id', { ascending: true });

  if (fetchError) {
    console.error('❌ Error al traer glosas:', fetchError.message);
    process.exit(1);
  }

  console.log(`📊 Total de registros en Supabase: ${allGlosas.length}`);

  // Identificar duplicados: clave = factura + servicio + valor_glosa + descripcion(50 chars)
  const seen = new Map();
  const toDelete = [];

  for (const glosa of allGlosas) {
    const factura = (glosa.factura || '').trim().toUpperCase();
    const servicio = (glosa.servicio || '').trim().toLowerCase();
    const valor = String(glosa.valor_glosa || '0');
    const descripcion = (glosa.descripcion || '').trim().toLowerCase().substring(0, 50);
    const key = `${factura}|${servicio}|${valor}|${descripcion}`;

    if (seen.has(key)) {
      toDelete.push(glosa.id);
    } else {
      seen.set(key, glosa.id);
    }
  }

  console.log(`🧹 Duplicados encontrados para eliminar: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('✅ No hay duplicados. La base de datos está limpia.');
    return;
  }

  // Mostrar algunos duplicados para referencia
  console.log('📋 IDs a eliminar (primeros 10):', toDelete.slice(0, 10));

  // Eliminar en lotes de 50
  const BATCH_SIZE = 50;
  let totalDeleted = 0;

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = toDelete.slice(i, i + BATCH_SIZE);
    const { error: deleteError } = await supabase
      .from('glosas')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, deleteError.message);
    } else {
      totalDeleted += batch.length;
      console.log(`✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} eliminados (total: ${totalDeleted})`);
    }
  }

  console.log(`\n✅ LIMPIEZA COMPLETADA:`);
  console.log(`   - Registros originales: ${allGlosas.length}`);
  console.log(`   - Duplicados eliminados: ${totalDeleted}`);
  console.log(`   - Registros únicos restantes: ${allGlosas.length - totalDeleted}`);
}

cleanupDuplicates().catch(console.error);
