
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '6b7f814a-1355-43c1-b623-b5bd8b893120';

async function grantAdmin() {
    console.log(`Otorgando permisos admin al ID: ${userId}...`);

    // Upsert en la tabla perfiles para asignar el rol
    const { data, error } = await supabase
        .from('perfiles')
        .upsert({
            id: userId,
            rol: 'admin',
            seccion_asignada: 'GLOSAS'
        });

    if (error) {
        console.error('Error al otorgar permisos:', error);
    } else {
        console.log('✅ Éxito: El usuario ahora tiene permisos de ADMINISTRADOR.');
    }
}

grantAdmin();
