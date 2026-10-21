import { supabase } from "./supabase";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
// API URLs in existing deployments may already end in /api.
const apiBase = base.endsWith("/api") ? base : `${base}/api`;

export async function api<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!supabase) throw new ApiError(503, "Authentication is not configured");
  const { data, error } = accessToken ? { data: { session: null }, error: null } : await supabase.auth.getSession();
  let token = accessToken ?? data.session?.access_token;
  if (error || !token) {
    window.dispatchEvent(new Event("umss:unauthorized"));
    throw new ApiError(401, "Please sign in again");
  }
  const send = () => {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${apiBase}${path}`, { ...init, headers });
  };
  let response = await send();
  if (response.status === 401 && !accessToken) {
    const refreshed = await supabase.auth.refreshSession();
    if (!refreshed.error && refreshed.data.session) {
      token = refreshed.data.session.access_token;
      response = await send();
    }
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("umss:unauthorized"));
    throw new ApiError(response.status, body?.error ?? "The server could not complete the request");
  }
  return body as T;
}
