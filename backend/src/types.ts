export const roles = ["student", "technician", "admin", "superadmin"] as const;
export type Role = typeof roles[number];

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  university_id: string | null;
  username: string | null;
  zone: string | null;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      identity?: Profile;
    }
  }
}
