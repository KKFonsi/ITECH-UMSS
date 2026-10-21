import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const publicKey = typeof key === "string" && key.startsWith("sb_publishable_");
const parsedUrl = typeof url === "string" && URL.canParse(url) ? new URL(url) : null;
const validUrl = parsedUrl && !parsedUrl.hostname.includes("pooler.supabase.com") && !parsedUrl.username && !parsedUrl.password && !parsedUrl.search && !parsedUrl.hash
  && (parsedUrl.protocol === "https:" || (parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedUrl.hostname)));
export const authConfigurationError = !validUrl || !publicKey
  ? "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your Supabase project's public settings."
  : null;
export const supabase = authConfigurationError ? null : createClient(parsedUrl!.origin, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
