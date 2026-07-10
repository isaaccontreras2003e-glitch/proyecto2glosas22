const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createUser() {
  const email = 'prueba@sisfact.com';
  const password = 'pruebamasiva123';
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user?.email);
  }
}

createUser();
