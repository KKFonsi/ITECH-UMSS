import { TECHNICIANS, type WorkOrder } from "./mockData";

export function WorkOrderTable({ orders, onReassign }: {
  orders: WorkOrder[];
  onReassign?: (id: string, technician: string) => void;
}) {
  return (
    <table className="responsive-table">
      <caption className="sr-only">Maintenance work orders, locations, priorities, status and assignments</caption>
      <thead><tr><th scope="col">Work order</th><th scope="col">Location / reporter</th>
        <th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Assigned technician</th></tr></thead>
      <tbody>{orders.map(order => (
        <tr key={order.id}>
          <td data-label="Work order"><p className="font-semibold text-gray-900">{order.title}</p>
            <p className="text-xs text-gray-500">{order.id} · {order.date}</p><p className="text-xs text-gray-500">{order.category}</p></td>
          <td data-label="Location / reporter">{order.location}<p className="text-xs text-gray-500">{order.reportedBy}</p></td>
          <td data-label="Priority"><span className={order.priority === "High" ? "font-semibold text-red-700" : "text-gray-600"}>{order.priority}</span></td>
          <td data-label="Status"><span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${order.status === "Resolved" ? "bg-green-50 text-green-700" : order.status === "Pending" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-800"}`}>{order.status}</span></td>
          <td data-label="Assigned technician">{onReassign ? (
            <select aria-label={`Reassign ${order.id}`} value={order.assignedTech}
              onChange={e => onReassign(order.id, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm">
              {TECHNICIANS.map(technician => <option key={technician.id}>{technician.name}</option>)}
            </select>
          ) : order.assignedTech}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}
