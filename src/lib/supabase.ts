import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

console.log('🔌 Conectando a Supabase:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
