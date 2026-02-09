import { createClient } from '@supabase/supabase-js';

// Fallback to empty strings so createClient doesn't crash the entire site
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// If they are missing, we log a warning but don't "throw" an error
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase keys are missing from the build. Check Vercel settings.');
}

// Only initialize the client if we have the required strings
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;