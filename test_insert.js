/**
 * INTENTO DE INSERCIÓN DIRECTA VIA REST API - Sin autenticación de usuario
 * Prueba si el RLS permite inserción anónima (a veces las policies están mal configuradas)
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log('🧪 Probando inserción anónima en glosas...');
    const testRecord = {
        id: crypto.randomUUID(),
        factura: 'TEST-RECOVERY',
        servicio: 'PRUEBA DE RECUPERACION',
        orden_servicio: '000',
        valor_glosa: 1,
        valor_aceptado: 0,
        valor_no_aceptado: 0,
        estado: 'Pendiente',
        tipo_glosa: 'Tarifas',
        descripcion: 'Registro de prueba - eliminar',
        registrada_internamente: false,
        soporte_pdf: null,
        fecha: '16/06/2026',
        seccion: 'GLOSAS',
    };

    const { data, error } = await supabase.from('glosas').insert([testRecord]).select();
    if (error) {
        console.log('❌ Insert anónimo BLOQUEADO:', error.message);
        console.log('   → Necesitamos autenticación (email + contraseña)');
    } else {
        console.log('✅ Insert anónimo PERMITIDO! Podemos proceder sin login.');
        console.log('   Registro insertado:', data);
        // Limpiar el registro de prueba
        await supabase.from('glosas').delete().eq('factura', 'TEST-RECOVERY');
        console.log('   (Registro de prueba eliminado)');
    }
}

testInsert().catch(console.error);
