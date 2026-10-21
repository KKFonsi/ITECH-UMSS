import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Profile } from "./auth";
import type { WorkOrder } from "../components/umss/mockData";

export interface LiveOrder {
  id: string; ticket_number: string; title: string; description: string; category: string;
  status: "pending" | "in_progress" | "resolved"; priority: "low" | "medium" | "high";
  location: string; location_id: string | null; reported_by: string; reporter_name: string;
  assigned_to: string | null; technician_name: string | null; created_at: string; updated_at: string;
}
export interface Location { id: string; name: string; campus: string | null }
export interface Technician { id: string; full_name: string; zone: string | null }
export type WorkOrderView = WorkOrder & { assignedTo: string | null; description: string; ticketNumber: string };
export interface NewOrder {
  title: string; description: string; category: string; location_id?: string; location?: string;
  priority: LiveOrder["priority"];
}
export type OrderPatch = Partial<Pick<LiveOrder, "title" | "description" | "category" | "status" | "priority" | "assigned_to">> & { notes?: string };

interface OrdersContext {
  orders: LiveOrder[]; displayOrders: WorkOrderView[]; technicians: Technician[];
  loading: boolean; error: string | null; busy: string | null;
  reload: () => Promise<void>; create: (order: NewOrder) => Promise<void>;
  update: (id: string, patch: OrderPatch) => Promise<void>;
}
const Context = createContext<OrdersContext | null>(null);

export function WorkOrdersProvider({ user, children }: { user: Profile; children: ReactNode }) {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const reload = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError(null);
    try {
      const rows: LiveOrder[] = [];
      for (let offset = 0; ; offset += 100) {
        const result = await api<{ workOrders: LiveOrder[] }>(`/work-orders?limit=100&offset=${offset}`);
        rows.push(...result.workOrders);
        if (result.workOrders.length < 100) break;
      }
      const staff = ["admin", "superadmin"].includes(user.role)
        ? (await api<{ technicians: Technician[] }>("/technicians")).technicians : [];
      if (current === version.current) { setOrders(rows); setTechnicians(staff); }
    } catch (cause) {
      if (current === version.current) { setOrders([]); setError(cause instanceof Error ? cause.message : "Unable to load work orders"); }
    } finally { if (current === version.current) setLoading(false); }
  }, [user.id, user.role]);
  useEffect(() => { void reload(); return () => { version.current++; }; }, [reload]);

  const create = async (input: NewOrder) => {
    const result = await api<{ workOrder: LiveOrder }>("/work-orders", { method: "POST", body: JSON.stringify(input) });
    setOrders(current => [result.workOrder, ...current.filter(order => order.id !== result.workOrder.id)]);
  };
  const update = async (id: string, patch: OrderPatch) => {
    setBusy(id); setError(null);
    try {
      const result = await api<{ workOrder: LiveOrder }>(`/work-orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
      setOrders(current => current.map(order => order.id === id ? result.workOrder : order));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update work order");
      throw cause;
    } finally { setBusy(null); }
  };
  const displayOrders: WorkOrderView[] = orders.map(order => ({
    id: order.id, ticketNumber: order.ticket_number, title: order.title, description: order.description, location: order.location,
    category: order.category, status: order.status === "in_progress" ? "In Progress" : order.status === "resolved" ? "Resolved" : "Pending",
    priority: order.priority === "high" ? "High" : order.priority === "low" ? "Low" : "Medium",
    assignedTo: order.assigned_to, assignedTech: order.technician_name ?? "Unassigned",
    reportedBy: order.reporter_name, date: new Date(order.created_at).toLocaleDateString(),
  }));
  return <Context.Provider value={{ orders, displayOrders, technicians, loading, error, busy, reload, create, update }}>{children}</Context.Provider>;
}
export function useWorkOrders() {
  const context = useContext(Context);
  if (!context) throw new Error("Work-order context is missing");
  return context;
}
export function WorkOrderFeedback() {
  const { error, loading, reload } = useWorkOrders();
  return <div className="border-b border-gray-200 bg-white px-4 py-2 text-center text-sm" aria-live="polite">
    {loading ? "Loading work orders…" : error ? <span role="alert" className="text-red-700">{error} </span> : "Work orders connected"}
    <button disabled={loading} onClick={() => { void reload(); }} className="ml-3 rounded border border-gray-300 px-3 py-1 disabled:opacity-50">Refresh</button>
  </div>;
}
