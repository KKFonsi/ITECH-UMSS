export type Role = "student" | "admin" | "superadmin" | "technician";

export interface Student {
  id: string;
  name: string;
  studentId: string;
  status: "Active" | "Inactive";
  submissions: number;
  lastActivity: string;
}

export interface Technician {
  id: string;
  name: string;
  techId: string;
  zone: string;
  status: "Active" | "Off-duty";
  activeTasks: number;
}

export interface Admin {
  id: string;
  name: string;
  username: string;
  zoneManaged: string;
  usersUnder: number;
  status: "Active" | "Inactive";
}

export interface SuperAdmin {
  id: string;
  name: string;
  username: string;
  title: string;
}

export type WorkOrderStatus = "Pending" | "In Progress" | "Resolved";
export type WorkOrderPriority = "High" | "Medium" | "Low";

export interface WorkOrder {
  id: string;
  title: string;
  location: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assignedTech: string;
  reportedBy: string;
  date: string;
  category: string;
}

export interface AuditEntry {
  id: string;
  type: "reassigned" | "submitted" | "resolved" | "deactivated" | "activated" | "closed";
  label: string;
  relTime: string;
}

export const STUDENTS: Student[] = [
  { id: "s1", name: "Ezren Dela Golpijon", studentId: "2021-08471", status: "Active", submissions: 3, lastActivity: "2h ago" },
  { id: "s2", name: "Maria Santos", studentId: "2022-03345", status: "Active", submissions: 1, lastActivity: "Yesterday" },
  { id: "s3", name: "Juan Dela Cruz", studentId: "2020-11234", status: "Active", submissions: 4, lastActivity: "Jun 14" },
  { id: "s4", name: "Anna Reyes", studentId: "2023-00876", status: "Active", submissions: 2, lastActivity: "Jun 12" },
  { id: "s5", name: "Mark Villaroel", studentId: "2021-05522", status: "Inactive", submissions: 0, lastActivity: "Mar 3" },
];

export const TECHNICIANS: Technician[] = [
  { id: "t1", name: "R. Dela Cruz", techId: "GSO-014", zone: "Science Building / Restrooms", status: "Active", activeTasks: 4 },
  { id: "t2", name: "L. Bautista", techId: "GSO-009", zone: "Main Library", status: "Active", activeTasks: 2 },
  { id: "t3", name: "M. Santiago", techId: "GSO-021", zone: "Gymnasium / Athletics", status: "Off-duty", activeTasks: 0 },
  { id: "t4", name: "J. Ramirez", techId: "GSO-007", zone: "Admin Building", status: "Active", activeTasks: 1 },
];

export const ADMINS: Admin[] = [
  { id: "a1", name: "J. Fernandez", username: "admin.jfernandez", zoneManaged: "North Campus Buildings", usersUnder: 3, status: "Active" },
  { id: "a2", name: "K. Villanueva", username: "admin.kvillanueva", zoneManaged: "South Campus / Athletics", usersUnder: 2, status: "Active" },
];

export const SUPER_ADMIN: SuperAdmin = {
  id: "sa1",
  name: "Dr. R. Mendoza",
  username: "superadmin.rmendoza",
  title: "System Administrator, GSO",
};

export const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-2024-0031", title: "Leaking Pipe", location: "2nd Floor Men's Restroom", status: "Pending", priority: "High", assignedTech: "R. Dela Cruz", reportedBy: "Ezren Dela Golpijon", date: "Jun 15", category: "Plumbing" },
  { id: "WO-2024-0032", title: "Broken Chairs Flagged", location: "Room 305 — Science Building", status: "In Progress", priority: "Medium", assignedTech: "R. Dela Cruz", reportedBy: "QR Scan Review", date: "Jun 14", category: "Structural / Carpentry" },
  { id: "WO-2024-0033", title: "Cracked Pavement", location: "Gymnasium Entrance", status: "In Progress", priority: "Medium", assignedTech: "M. Santiago", reportedBy: "Ezren Dela Golpijon", date: "Jun 13", category: "Structural / Carpentry" },
  { id: "WO-2024-0030", title: "AC Unit Replacement", location: "Faculty Lounge — Admin Bldg", status: "Resolved", priority: "High", assignedTech: "J. Ramirez", reportedBy: "Juan Dela Cruz", date: "Jun 12", category: "Electrical" },
  { id: "WO-2024-0034", title: "Broken Faucet", location: "Main Library, 1F", status: "Pending", priority: "Medium", assignedTech: "L. Bautista", reportedBy: "Maria Santos", date: "Jun 15", category: "Plumbing" },
  { id: "WO-2024-0035", title: "Restroom Lock Broken", location: "Science Bldg, 2F", status: "Resolved", priority: "Low", assignedTech: "R. Dela Cruz", reportedBy: "Anna Reyes", date: "Jun 12", category: "Structural / Carpentry" },
  { id: "WO-2024-0036", title: "Flickering Ceiling Lights", location: "Room 201 — Main Library", status: "Pending", priority: "Low", assignedTech: "L. Bautista", reportedBy: "Juan Dela Cruz", date: "Jun 16", category: "Electrical" },
];

export const AUDIT_LOG: AuditEntry[] = [
  { id: "al1", type: "reassigned", label: "Reassigned WO-0031", relTime: "2h ago" },
  { id: "al2", type: "submitted",  label: "New report submitted", relTime: "3h ago" },
  { id: "al3", type: "resolved",   label: "Marked WO-0030 resolved", relTime: "Yesterday" },
  { id: "al4", type: "deactivated",label: "Admin deactivated (test)", relTime: "Yesterday" },
  { id: "al5", type: "reassigned", label: "Reassigned WO-0033", relTime: "2 days ago" },
  { id: "al6", type: "closed",     label: "WO-0035 closed", relTime: "2 days ago" },
];

export const STUDENT_SUBMISSIONS = [
  { id: "r1", title: "Broken faucet", location: "Main Library, 1F", status: "Pending" as WorkOrderStatus, time: "2h ago" },
  { id: "r2", title: "Cracked floor tiles", location: "Gymnasium Entrance", status: "In Progress" as WorkOrderStatus, time: "Yesterday" },
  { id: "r3", title: "Restroom lock broken", location: "Science Bldg, 2F", status: "Resolved" as WorkOrderStatus, time: "Jun 12" },
];

export const TECH_QUEUE_INIT = [
  {
    id: "WO-2024-0031", title: "Leaking Pipe", location: "2nd Floor Men's Restroom",
    reported: "8:14 AM · Priority: High", statusLabel: "URGENT / ASSIGNED" as const,
    statusColor: "red" as const,
    flagged: [] as string[],
  },
  {
    id: "WO-2024-0032", title: "Broken Chairs Flagged", location: "Room 305 — Science Building",
    reported: "Source: Student QR Review · Low Rating (2/5)", statusLabel: "IN PROGRESS" as const,
    statusColor: "yellow" as const,
    flagged: ["Broken Chairs / Desks", "Flickering Ceiling Lights"],
  },
  {
    id: "WO-2024-0033", title: "Cracked Pavement", location: "Gymnasium Entrance",
    reported: "Reported Yesterday · Priority: Medium", statusLabel: "IN PROGRESS" as const,
    statusColor: "yellow" as const,
    flagged: [] as string[],
  },
];
