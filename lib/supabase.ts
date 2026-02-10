
import { createClient } from "@supabase/supabase-js";

// Using process.env instead of import.meta.env to avoid 'undefined' property access errors
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase keys are missing from process.env.");
}

// Only initialize the client if we have the required strings
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
