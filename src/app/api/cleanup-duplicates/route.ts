import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// API segura para eliminar duplicados directamente de Supabase
// Identifica duplicados por: factura + servicio + valor_glosa + descripcion
// Mantiene el registro más antiguo (created_at más bajo o id menor)
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Traer TODOS los registros de glosas
    const { data: allGlosas, error: fetchError } = await supabase
      .from('glosas')
      .select('*')
      .order('id', { ascending: true }); // ordenar por id para mantener el primero

    if (fetchError) throw fetchError;
    if (!allGlosas || allGlosas.length === 0) {
      return NextResponse.json({ message: 'No hay registros', deletedCount: 0 });
    }

    // 2. Identificar duplicados: clave = factura|servicio|valor_glosa|descripcion
    const seen = new Map<string, string>(); // key -> id del primero (que se conserva)
    const toDelete: string[] = [];

    for (const glosa of allGlosas) {
      const factura = (glosa.factura || '').trim().toUpperCase();
      const servicio = (glosa.servicio || '').trim().toLowerCase();
      const valor = String(glosa.valor_glosa || '0');
      const descripcion = (glosa.descripcion || '').trim().toLowerCase().substring(0, 50);

      const key = `${factura}|${servicio}|${valor}|${descripcion}`;

      if (seen.has(key)) {
        // Este es un duplicado — marcar para eliminar
        toDelete.push(glosa.id);
      } else {
        seen.set(key, glosa.id);
      }
    }

    console.log(`[cleanup] Total glosas: ${allGlosas.length}, Duplicados a eliminar: ${toDelete.length}`);

    if (toDelete.length === 0) {
      return NextResponse.json({
        message: 'No se encontraron duplicados exactos',
        totalGlosas: allGlosas.length,
        deletedCount: 0
      });
    }

    // 3. Eliminar en lotes de 50 para evitar límites de API
    const BATCH_SIZE = 50;
    let totalDeleted = 0;

    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from('glosas')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`[cleanup] Error en lote ${i / BATCH_SIZE + 1}:`, deleteError);
      } else {
        totalDeleted += batch.length;
      }
    }

    return NextResponse.json({
      message: `✅ Limpieza completada: ${totalDeleted} duplicados eliminados de Supabase`,
      totalGlosas: allGlosas.length,
      deletedCount: totalDeleted,
      uniqueRemaining: allGlosas.length - totalDeleted
    });

  } catch (err: any) {
    console.error('[cleanup] Error fatal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
