import type { RequestHandler } from "express";
import { supabase } from "../lib/supabase.js";
import { pool } from "../lib/db.js";
import { roles, type Profile, type Role } from "../types.js";
import { HttpError } from "../lib/errors.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const match = req.get("authorization")?.match(/^Bearer ([^\s,]+)$/i);
  if (!match) throw new HttpError(401, "A valid Bearer session is required");
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user || data.user.is_anonymous) throw new HttpError(401, "Session is invalid or expired");
  const result = await pool.query<Profile>(
    "SELECT id, full_name, role, university_id, username, zone, status FROM public.profiles WHERE id = $1",
    [data.user.id],
  );
  const profile = result.rows[0];
  if (!profile || !roles.includes(profile.role) || profile.status.toLowerCase() !== "active") {
    throw new HttpError(403, "Account is unavailable or inactive");
  }
  req.identity = profile;
  next();
};

export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.identity) throw new HttpError(401, "Authentication required");
    if (!allowed.includes(req.identity.role)) throw new HttpError(403, "Insufficient permissions");
    next();
  };
}
