const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function countAll() {
    const { count: gCount } = await supabase.from('glosas').select('*', { count: 'exact', head: true });
    const { count: iCount } = await supabase.from('ingresos').select('*', { count: 'exact', head: true });
    console.log(`Total Glosas en DB: ${gCount}`);
    console.log(`Total Ingresos en DB: ${iCount}`);
}

countAll();
