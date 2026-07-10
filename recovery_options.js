/**
 * SCRIPT DE RECUPERACIÓN VÍA SUPABASE REST API CON AUTENTICACIÓN
 * 
 * Supabase en plan FREE guarda backups diarios automáticos de hasta 7 días.
 * Sin embargo, NO se pueden restaurar a un momento específico (eso es PITR del plan Pro).
 * 
 * PERO: Supabase también expone endpoints de Management API que pueden dar
 * acceso a los backups si eres el owner del proyecto.
 * 
 * Este script verifica el estado actual via REST y muestra las opciones.
 */

const https = require('https');

const PROJECT_REF = 'pcnxektqlxplrwanazuw';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

function fetchSupabase(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            path: path,
            method: 'GET',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function checkSupabase() {
    console.log('=== VERIFICACIÓN SUPABASE ===');
    console.log(`Proyecto: ${PROJECT_REF}`);
    console.log('');
    
    // 1. Verificar estado de glosas
    const glosas = await fetchSupabase('/rest/v1/glosas?select=count');
    console.log(`Estado glosas (anon): ${JSON.stringify(glosas.data)}`);
    
    // 2. Intentar con prefer=count=exact
    const count = await fetchSupabase('/rest/v1/glosas?select=id&limit=1');
    console.log(`Muestra glosas: Status ${count.status}, Data: ${JSON.stringify(count.data)}`);

    console.log('\n=== DIAGNÓSTICO DEL PROBLEMA ===');
    console.log('');
    console.log('El botón "Borrar TODO" ejecutó:');
    console.log('  supabase.from("glosas").delete().neq("id", "00000000-0000-0000-0000-000000000000")');
    console.log('  supabase.from("ingresos").delete().neq("id", "00000000-0000-0000-0000-000000000000")');
    console.log('');
    console.log('Luego llamó a loadData(true) que actualizó el backup en la nube con 0 registros.');
    console.log('');
    console.log('=== OPCIONES DE RECUPERACIÓN ===');
    console.log('');
    console.log('1. 🔴 URGENTE: Ir a https://supabase.com/dashboard/project/pcnxektqlxplrwanazuw/database/backups');
    console.log('   - En el plan FREE: backups diarios disponibles por 7 días');
    console.log('   - El backup de AYER debería tener las 985 glosas');
    console.log('   - Solo el owner del proyecto puede acceder a esto');
    console.log('');
    console.log('2. Si el plan es Pro: Point-in-Time Recovery (PITR) disponible');
    console.log('   https://supabase.com/dashboard/project/pcnxektqlxplrwanazuw/database/backups');
    console.log('');
    console.log('3. Verificar en Vercel si hay logs de la función /api/backup antes del borrado');
    console.log('   https://vercel.com/dashboard → proyecto → Functions → /api/backup → Logs');
}

checkSupabase().catch(console.error);
