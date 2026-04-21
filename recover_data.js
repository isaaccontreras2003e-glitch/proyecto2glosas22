// Script de RECUPERACIÓN DE DATOS desde Supabase Storage (Excel backup)
// Descarga el Excel de respaldo guardado en la nube y muestra los datos
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseKey);
const DESKTOP = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop';

async function recoverData() {
  console.log('🔍 Intentando recuperar datos desde Supabase...\n');

  // 1. Ver cuántos registros quedan en Supabase (con anon key)
  const { data: glosas, error: gErr } = await supabase.from('glosas').select('*');
  const { data: ingresos, error: iErr } = await supabase.from('ingresos').select('*');

  console.log('📊 Estado actual de Supabase:');
  console.log(`   Glosas: ${glosas ? glosas.length : 'ERROR: ' + gErr?.message}`);
  console.log(`   Ingresos: ${ingresos ? ingresos.length : 'ERROR: ' + iErr?.message}`);
  console.log('');

  if (glosas && glosas.length > 0) {
    console.log('✅ Glosas encontradas en Supabase. Mostrando primeras 5:');
    glosas.slice(0, 5).forEach((g, i) => {
      console.log(`   ${i+1}. Factura: ${g.factura} | Servicio: ${g.servicio} | Valor: ${g.valor_glosa}`);
    });
  }

  if (ingresos && ingresos.length > 0) {
    console.log('\n✅ Ingresos encontrados en Supabase:');
    ingresos.forEach((ing, i) => {
      console.log(`   ${i+1}. Factura: ${ing.factura} | Aceptado: ${ing.valor_aceptado} | No Aceptado: ${ing.valor_no_aceptado} | Fecha: ${ing.fecha}`);
    });
  }

  // 2. Intentar descargar el Excel de respaldo desde Supabase Storage
  console.log('\n📥 Descargando Excel de respaldo desde Supabase Storage...');
  try {
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('soportes_glosas')
      .download('Consolidado_Fijo_Sisfact.xlsx');

    if (dlErr) {
      console.log('⚠️ No se encontró el archivo Excel en Storage:', dlErr.message);
    } else if (fileData) {
      // Convertir a Buffer y guardar
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const savePath = path.join(DESKTOP, 'BACKUP_RECUPERADO_' + Date.now() + '.xlsx');
      fs.writeFileSync(savePath, buffer);
      console.log(`✅ Excel recuperado y guardado en: ${savePath}`);
      console.log('   Abre este archivo para ver todos los datos históricos.');
    }
  } catch (err) {
    console.log('❌ Error descargando Excel:', err.message);
  }

  // 3. También listar archivos disponibles en Storage por si acaso
  console.log('\n📁 Archivos disponibles en Supabase Storage (soportes_glosas):');
  try {
    const { data: files, error: listErr } = await supabase.storage
      .from('soportes_glosas')
      .list('', { limit: 20 });

    if (listErr) {
      console.log('   Error listando:', listErr.message);
    } else if (files && files.length > 0) {
      files.forEach(f => {
        console.log(`   - ${f.name} (${(f.metadata?.size / 1024 || 0).toFixed(1)} KB) — ${f.updated_at}`);
      });
    } else {
      console.log('   No se encontraron archivos.');
    }
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // 4. Revisar si hay datos en localStorage (esto no aplica en Node, pero revisamos el caché del proyecto)
  const cacheFile = path.join(__dirname, '.next', 'cache');
  if (fs.existsSync(cacheFile)) {
    console.log('\n📦 Caché local Next.js encontrada.');
  }

  console.log('\n---');
  console.log('💡 Si los datos no están en Supabase (0 registros), es porque el RLS bloquea el acceso anónimo.');
  console.log('   En ese caso, los datos ESTÁN en Supabase pero requieren autenticación para verlos.');
  console.log('   Intenta abrir la app en el navegador — si eres el único usuário, los datos deben aparecer al iniciar sesión.');
}

recoverData().catch(console.error);
