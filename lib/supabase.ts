import { createClient } from '@supabase/supabase-js';

// Use optional chaining and fallbacks to prevent the "Uncaught Error" crash
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// If keys are missing, we log a warning but DON'T kill the app
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase keys are missing from the build environment.');
}

// Only initialize if we have both values
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;