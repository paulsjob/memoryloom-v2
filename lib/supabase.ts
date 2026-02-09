import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detailed Debugging
console.log('--- Supabase Connection Diagnostic ---');
console.log('URL provided:', !!supabaseUrl);
console.log('Key prefix correct:', supabaseAnonKey?.startsWith('sb_') || supabaseAnonKey?.startsWith('eyJ'));
console.log('Key length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  // We log but don't "throw" so the rest of the app doesn't crash
  console.error('CRITICAL: Supabase keys are missing or malformed!');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;