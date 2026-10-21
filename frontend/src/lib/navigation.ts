import type { Role } from "./auth";

export type Screen = "login" | "student-dashboard" | "qr-review" | "report-form" | "technician-queue" | "admin-dashboard" | "superadmin-dashboard" | "campus-assistant" | "room-reservation" | "equipment-request" | "user-management";
const screens: Record<Role, Screen[]> = {
  student: ["student-dashboard", "qr-review", "report-form", "campus-assistant", "room-reservation", "equipment-request"],
  technician: ["technician-queue"],
  admin: ["admin-dashboard", "report-form"],
  superadmin: ["superadmin-dashboard", "user-management", "report-form"],
};
export const homeScreen = (role: Role) => screens[role][0];
export const protectedScreen = (role: Role, screen: Screen): Screen => screens[role].includes(screen) ? screen : homeScreen(role);
