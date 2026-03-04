import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — credentials loaded from environment variables.
 *
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in:
 *   - Local: .env.local
 *   - Production: Vercel Dashboard → Settings → Environment Variables
 *
 * The anonKey is safe to be public (it's restricted by Row Level Security),
 * but keeping it in env vars prevents it from appearing in public git diffs.
 */
/**
 * Supabase client — Hardcoded for production to bypass Vercel env var typos.
 * URL: https://pcnxektqlxplrwanazuw.supabase.co (Corrected 'l' instead of 'i')
 */
const supabaseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnhla3RxbHhwbHJ3YW5henV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjEwMDksImV4cCI6MjA4NzQzNzAwOX0.rcRxfkQb3k6lVmGHSCWYebgjGi5UYd1LABOZ_0-bk7g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
