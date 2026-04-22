const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// CONFIGURACIÓN DE SUPABASE
const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

// RUTA DEL ARCHIVO RECUPERADO
const EXCEL_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop\\BACKUP_RECUPERADO_1776811704431.xlsx';

async function restoreData() {
    console.log('🚀 INICIANDO RESTAURACIÓN MASIVA DE DATOS...');
    
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error('❌ Error: No se encontró el archivo Excel en ' + EXCEL_PATH);
        return;
    }

    const workbook = XLSX.readFile(EXCEL_PATH);
    
    // 1. PROCESAR GLOSAS
    console.log('\n--- 📋 PROCESANDO HOJA DE GLOSAS ---');
    const glosaSheet = workbook.Sheets['📋 Glosas'];
    if (!glosaSheet) {
        console.warn('⚠️ No se encontró la hoja "📋 Glosas"');
    } else {
        const rows = XLSX.utils.sheet_to_json(glosaSheet, { header: 1 });
        const glosasToInsert = [];
        
        // Saltamos la cabecera (fila 0) y procesamos hasta el final (evitando la fila de TOTALES)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5 || row[0] === 'TOTALES' || !row[1]) continue;

            glosasToInsert.push({
                factura: String(row[1] || '').trim(),
                servicio: String(row[2] || '').trim(),
                orden_servicio: String(row[3] || '').trim(),
                valor_glosa: Number(row[4]) || 0,
                valor_aceptado: Number(row[5]) || 0,
                valor_no_aceptado: Number(row[6]) || 0,
                estado: String(row[7] || 'Pendiente'),
                tipo_glosa: String(row[8] || 'Tarifas'),
                descripcion: String(row[9] || ''),
                registrada_internamente: String(row[10]).includes('SÍ'),
                soporte_pdf: row[11] || null,
                fecha: String(row[12] || ''),
                id: String(row[13] || '').trim()
            });
        }

        console.log(`✅ ${glosasToInsert.length} glosas preparadas para insertar.`);
        
        // Insertar en lotes de 50
        for (let i = 0; i < glosasToInsert.length; i += 50) {
            const batch = glosasToInsert.slice(i, i + 50);
            const { error } = await supabase.from('glosas').upsert(batch, { onConflict: 'id' });
            if (error) {
                console.error(`❌ Error insertando lote de glosas ${i}:`, error.message);
            } else {
                console.log(`✓ Lote ${i + batch.length}/${glosasToInsert.length} de glosas completado.`);
            }
        }
    }

    // 2. PROCESAR INGRESOS
    console.log('\n--- 💰 PROCESANDO HOJA DE INGRESOS ---');
    const ingresoSheet = workbook.Sheets['💰 Ingresos'];
    if (!ingresoSheet) {
        console.warn('⚠️ No se encontró la hoja "💰 Ingresos"');
    } else {
        const rows = XLSX.utils.sheet_to_json(ingresoSheet, { header: 1 });
        const ingresosToInsert = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 3 || row[0] === 'TOTALES' || !row[1]) continue;

            ingresosToInsert.push({
                factura: String(row[1] || '').trim(),
                valor_aceptado: Number(row[2]) || 0,
                valor_no_aceptado: Number(row[3]) || 0,
                fecha: String(row[4] || ''),
                soporte_pdf: row[5] || null,
                id: String(row[6] || '').trim()
            });
        }

        console.log(`✅ ${ingresosToInsert.length} ingresos preparados para insertar.`);

        for (let i = 0; i < ingresosToInsert.length; i += 50) {
            const batch = ingresosToInsert.slice(i, i + 50);
            const { error } = await supabase.from('ingresos').upsert(batch, { onConflict: 'id' });
            if (error) {
                console.error(`❌ Error insertando lote de ingresos ${i}:`, error.message);
            } else {
                console.log(`✓ Lote ${i + batch.length}/${ingresosToInsert.length} de ingresos completado.`);
            }
        }
    }

    console.log('\n✨¡RESTAURACIÓN FINALIZADA CON ÉXITO!✨');
    console.log('Ahora abre la aplicación y verifica tus datos.');
}

restoreData().catch(console.error);
