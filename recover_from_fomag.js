/**
 * SCRIPT DE RECUPERACIÓN MASIVA DESDE REPORTE FOMAG
 * Lee el CSV 800112725reporteglosas(1).csv y sube los registros a Supabase
 * filtrando solo glosas relevantes (con valores > 0 y facturas válidas)
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Downloads\\800112725reporteglosas(1).csv';

// Convertir número serial de Excel a fecha legible
function excelDateToString(serial) {
    if (!serial || isNaN(serial)) return '';
    const date = new Date((serial - 25569) * 86400 * 1000);
    const d = String(date.getUTCDate()).padStart(2, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const y = date.getUTCFullYear();
    return `${d}/${m}/${y}`;
}

// Mapear estado FOMAG al estado de la app
function mapEstado(estadoFomag) {
    if (!estadoFomag) return 'Pendiente';
    const e = String(estadoFomag).toUpperCase();
    if (e.includes('LEVANTADA') || e.includes('LEVANTADO')) return 'Respondida';
    if (e.includes('RATIFICADA') || e.includes('RATIFICADO')) return 'No Aceptada';
    if (e.includes('ACEPTADA') || e.includes('ACEPTADO')) return 'Aceptada';
    if (e.includes('PENDIENTE') || e.includes('PROGRAMAR')) return 'Pendiente';
    return 'Pendiente';
}

async function recoverFromFomag() {
    console.log('🚀 INICIANDO RECUPERACIÓN DESDE REPORTE FOMAG...\n');

    // Leer el CSV
    console.log('📖 Leyendo CSV...');
    const wb = XLSX.readFile(CSV_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws); // objetos con nombres de columna
    console.log(`✅ ${rows.length} filas leídas del CSV\n`);

    // Filtrar y transformar
    const glosas = [];
    const seen = new Set();

    for (const row of rows) {
        const factura = row['PREFIJO'] && row['NRO FACTURA']
            ? `${row['PREFIJO']}${row['NRO FACTURA']}`
            : String(row['NRO FACTURA'] || '').trim();

        if (!factura || factura.trim() === '') continue;

        const valorGlosa = Number(row['VLR GLOSA']) || 0;
        if (valorGlosa <= 0) continue; // Solo glosas con valor

        const servicio = String(row['SERVICIO'] || '').trim();
        const key = `${factura}|${servicio}|${valorGlosa}`;
        if (seen.has(key)) continue; // Evitar duplicados exactos
        seen.add(key);

        const valorAceptado = Number(row['VLR ACEPTADO'] || row['VLR A PAGAR'] || 0);
        const valorNoAceptado = Number(row['VLR RATIFICADO'] || 0);
        const estadoFomag = String(row['ESTADO'] || row['ESTADO AGRUPADOR'] || '').trim();
        const fechaAuditoria = excelDateToString(row['FECHA AUDITORIA']);
        const causal = String(row['CAUSAL'] || '').trim();
        const subcausal = String(row['SUBCAUSAL'] || '').trim();
        const descripcion = causal && subcausal ? `${causal} - ${subcausal}` : (causal || subcausal || '');

        glosas.push({
            id: crypto.randomUUID(),
            factura: factura.trim(),
            servicio: servicio.substring(0, 200),
            orden_servicio: String(row['NRO RADICADO'] || '').trim(),
            valor_glosa: valorGlosa,
            valor_aceptado: valorAceptado,
            valor_no_aceptado: valorNoAceptado,
            estado: mapEstado(estadoFomag),
            tipo_glosa: 'Tarifas',
            descripcion: descripcion.substring(0, 500),
            registrada_internamente: false,
            soporte_pdf: null,
            fecha: fechaAuditoria || new Date().toLocaleDateString('es-ES'),
            seccion: 'GLOSAS',
        });
    }

    console.log(`📊 Glosas válidas a importar: ${glosas.length}`);
    console.log(`   (Descartadas: ${rows.length - glosas.length} por valor=0 o sin factura)\n`);
    console.log('Ejemplo:');
    console.log(JSON.stringify(glosas[0], null, 2));
    console.log('\n¿Deseas continuar con la importación? (El script seguirá automáticamente en 5 segundos)');

    await new Promise(r => setTimeout(r, 5000));

    // Insertar en lotes de 100
    let exitosos = 0;
    let fallidos = 0;
    const BATCH = 100;

    for (let i = 0; i < glosas.length; i += BATCH) {
        const batch = glosas.slice(i, i + BATCH);
        const { error } = await supabase.from('glosas').insert(batch);
        if (error) {
            console.error(`❌ Error en lote ${i}-${i + BATCH}: ${error.message}`);
            fallidos += batch.length;
        } else {
            exitosos += batch.length;
            process.stdout.write(`\r✅ Insertados: ${exitosos}/${glosas.length}`);
        }
    }

    console.log(`\n\n🎉 IMPORTACIÓN COMPLETADA:`);
    console.log(`   ✅ Exitosos: ${exitosos}`);
    console.log(`   ❌ Fallidos: ${fallidos}`);
    console.log('\nVerifica en la app que los datos están disponibles.');
}

recoverFromFomag().catch(console.error);
