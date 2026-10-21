import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Auth verification requires only the publishable key. No service-role key is used.
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
});
