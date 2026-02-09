import { createClient } from '@supabase/supabase-js';

// Use optional chaining so the app doesn't crash if these are undefined
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Log the status to your F12 console (SAFE - doesn't show the full key)
console.log('🔌 Supabase Handshake:', {
  urlDetected: !!supabaseUrl,
  keyDetected: !!supabaseAnonKey,
  keyValidFormat: supabaseAnonKey.startsWith('sb_')
});

// Initialize ONLY if keys exist, otherwise return null
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;