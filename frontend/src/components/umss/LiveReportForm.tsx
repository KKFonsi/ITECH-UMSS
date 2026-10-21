import { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { api } from "../../lib/api";
import { useWorkOrders, type Location, type NewOrder } from "../../lib/workOrders";

export function LiveReportForm({ onBack }: { onBack: () => void }) {
  const { create } = useWorkOrders();
  const [locations, setLocations] = useState<Location[]>([]);
  const [freeText, setFreeText] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electrical");
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [priority, setPriority] = useState<NewOrder["priority"]>("medium");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    let active = true;
    void api<{ locations: Location[]; freeText: boolean }>("/locations").then(result => {
      if (active) { setLocations(result.locations); setFreeText(result.freeText); }
    }).catch(() => { if (active) setError("Unable to load campus locations. Please try again later."); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, []);
  const field = "mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm";
  return <div className="flex min-h-[100dvh] flex-col bg-gray-50">
    <header className="bg-gradient-to-br from-[#810000] to-[#c0392b] px-5 py-8 text-white">
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm"><ArrowLeft size={16} />Back</button>
      <h1 className="text-2xl font-bold">Report a Broken Item</h1><p className="mt-1 text-sm text-white/80">Submit a maintenance request to PUP GSO.</p>
    </header>
    {submitted ? <section className="p-6" role="status"><h2 className="text-lg font-semibold text-green-800">Report submitted successfully</h2><p className="my-3 text-sm">Your request has been saved. You can follow its status on your dashboard.</p><button onClick={onBack} className="rounded-xl bg-[#810000] px-5 py-3 text-white">Back to dashboard</button></section> :
    <form className="space-y-5 p-5" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(null);
      try { await create({ title, description, category, priority, ...(location === "__custom" ? { location: customLocation } : { location_id: location }) }); setSubmitted(true); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Report could not be saved. Please try again."); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm font-semibold">Title<input required minLength={3} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} className={field} /></label>
      <label className="block text-sm font-semibold">Campus location<select required disabled={catalogLoading} value={location} onChange={event => setLocation(event.target.value)} className={field}><option value="">{catalogLoading ? "Loading locations…" : "Select a location"}</option>{locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}{freeText && <option value="__custom">Other location</option>}</select></label>
      {location === "__custom" && <label className="block text-sm font-semibold">Specific location<input required minLength={3} maxLength={240} value={customLocation} onChange={event => setCustomLocation(event.target.value)} placeholder="Building, room and floor" className={field} /></label>}
      <label className="block text-sm font-semibold">Issue category<select value={category} onChange={event => setCategory(event.target.value)} className={field}>{["Electrical", "Plumbing", "Structural / Carpentry", "Janitorial / Cleaning", "Others"].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-sm font-semibold">Priority<select value={priority} onChange={event => setPriority(event.target.value as NewOrder["priority"])} className={field}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <label className="block text-sm font-semibold">Description<textarea required minLength={10} maxLength={5000} rows={5} value={description} onChange={event => setDescription(event.target.value)} className={field} /></label>
      <p className="text-xs text-gray-500">Photo attachments are not available in this phase.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy || catalogLoading || (!freeText && !locations.length)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#810000] px-4 py-3 font-semibold text-white disabled:opacity-50"><Send size={16} />{busy ? "Saving report…" : "Submit Report"}</button>
    </form>}
  </div>;
}
