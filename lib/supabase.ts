import { createClient } from '@supabase/supabase-js';

// These use VITE_ because your project is built with Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase Environment Variables! Check your Vercel settings.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
