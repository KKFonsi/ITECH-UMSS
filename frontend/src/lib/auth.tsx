import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { api } from "./api";
import { authConfigurationError, supabase } from "./supabase";

export type Role = "student" | "technician" | "admin" | "superadmin";
export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  university_id: string | null;
  username: string | null;
  zone: string | null;
  status: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(authConfigurationError);
  const revision = useRef(0);
  const observedToken = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      // Keep this callback synchronous; verify the profile in the separate effect.
      if (observedToken.current === (next?.access_token ?? null)) return;
      observedToken.current = next?.access_token ?? null;
      setSession(next);
      setProfile(null);
      setLoading(Boolean(next));
      if (!next) setError(null);
    });
    const expire = () => { void supabase?.auth.signOut({ scope: "local" }); setSession(null); setProfile(null); setError("Your session expired. Please sign in again."); };
    window.addEventListener("umss:unauthorized", expire);
    return () => { subscription.unsubscribe(); window.removeEventListener("umss:unauthorized", expire); };
  }, []);

  useEffect(() => {
    const version = ++revision.current;
    if (!session) { setProfile(null); return; }
    setLoading(true);
    setError(null);
    void api<{ profile: Profile }>("/auth/me", {}, session.access_token).then(({ profile: next }) => {
      if (version === revision.current) { setProfile(next); setLoading(false); }
    }).catch(() => {
      if (version === revision.current) { setProfile(null); setLoading(false); setError("Unable to verify your account. Check your connection or contact GSO if your account is inactive."); }
    });
    return () => { revision.current++; };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error(authConfigurationError!);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Sign-in failed. Check your email and password, then try again.");
  };
  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error("Could not sign out. Please try again.");
    setSession(null); setProfile(null); setError(null);
  };
  return { session, profile, loading, error, signIn, signOut };
}
