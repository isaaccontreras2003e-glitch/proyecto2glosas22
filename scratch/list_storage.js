const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBackups() {
    console.log('--- BUSCANDO BACKUPS EN STORAGE ---');
    
    const { data, error } = await supabase.storage.from('soportes_glosas').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' }
    });

    if (error) {
        console.error('Error listing storage:', error);
        return;
    }

    const backups = data.filter(f => f.name.endsWith('.xlsx') || f.name.includes('BACKUP'));
    console.log(`Archivos encontrados: ${backups.length}`);
    backups.forEach(f => {
        console.log(`- ${f.name} (Creado: ${f.created_at}, Tamaño: ${f.metadata.size})`);
    });
}

listBackups();
