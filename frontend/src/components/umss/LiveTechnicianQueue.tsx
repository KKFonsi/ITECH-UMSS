import { useState } from "react";
import { Wrench, CheckCircle } from "lucide-react";
import { useWorkOrders } from "../../lib/workOrders";

export function LiveTechnicianQueue() {
  const { orders, update, busy, loading } = useWorkOrders();
  const [notes, setNotes] = useState<Record<string, string>>({});
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your assigned work orders</h2><p className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-[#810000]" aria-live="polite">{orders.filter(order => order.status !== "resolved").length} active</p></div>
    {!loading && !orders.length && <p className="py-8 text-gray-500">No work orders are currently assigned to you.</p>}
    <div className="technician-grid">{orders.map(order => <article key={order.id} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase text-[#810000]">{order.status.replaceAll("_", " ")}</span><span className="text-xs font-semibold uppercase">{order.priority} priority</span></div>
      <h3 className="text-lg font-semibold">{order.title}</h3><p className="mt-1 text-sm text-gray-600">{order.location} · {order.category}</p><p className="mt-1 break-all font-mono text-xs text-gray-400">{order.ticket_number}</p>
      <p className="mt-1 text-xs text-gray-500">Reported {new Date(order.created_at).toLocaleString()} by {order.reporter_name}</p><p className="my-4 whitespace-pre-wrap text-sm">{order.description}</p>
      {order.status === "resolved" ? <p className="flex items-center gap-2 text-green-700"><CheckCircle size={18} />Resolved</p> : <>
        <label className="block text-sm font-semibold">Materials used / notes<textarea rows={3} maxLength={4000} value={notes[order.id] ?? ""} onChange={event => setNotes(current => ({ ...current, [order.id]: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label>
        <div className="mt-4 flex flex-wrap gap-2">{order.status === "pending" && <button disabled={busy !== null} onClick={() => { void update(order.id, { status: "in_progress", notes: notes[order.id] }).catch(() => {}); }} className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm disabled:opacity-50"><Wrench size={16} />Start task</button>}
          <button disabled={busy !== null} onClick={() => { void update(order.id, { status: "resolved", notes: notes[order.id] }).catch(() => {}); }} className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle size={16} />{busy === order.id ? "Saving…" : "Mark as Fixed"}</button></div>
      </>}
    </article>)}</div>
  </>;
}
