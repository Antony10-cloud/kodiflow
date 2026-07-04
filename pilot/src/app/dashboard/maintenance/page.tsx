import { createMaintenanceRequest, updateMaintenanceStatus } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function MaintenancePage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: requests }, { data: properties }, { data: units }, { data: tenants }] = await Promise.all([
    supabase.from("maintenance_requests").select("*").eq("organization_id", organizationId).order("reported_at", { ascending: false }),
    supabase.from("properties").select("id,name").eq("organization_id", organizationId),
    supabase.from("units").select("id,name,property_id").eq("organization_id", organizationId),
    supabase.from("tenants").select("id,full_name,unit_id").eq("organization_id", organizationId).eq("active", true),
  ]);
  const items = requests ?? [];
  const openCount = items.filter(item => !["resolved", "cancelled"].includes(item.status)).length;

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">PROPERTY OPERATIONS</p><h1>Maintenance</h1><p className="muted">Record issues, priorities, progress and the true cost of repairs.</p></div><span className="live-badge">{openCount} open</span></div>
      <details className="management-panel" open={items.length === 0}><summary>Log maintenance request</summary>
        <form action={createMaintenanceRequest} className="inline-form form-columns">
          <label>Property<select name="property_id" required><option value="">Select property</option>{(properties ?? []).map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
          <label>Unit<select name="unit_id"><option value="">Common area / unassigned</option>{(units ?? []).map(unit => <option key={unit.id} value={unit.id}>{properties?.find(property => property.id === unit.property_id)?.name} — {unit.name}</option>)}</select></label>
          <label>Tenant<select name="tenant_id"><option value="">No tenant</option>{(tenants ?? []).map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>)}</select></label>
          <label>Priority<select name="priority"><option>low</option><option selected>medium</option><option>high</option><option>urgent</option></select></label>
          <label>Issue title<input name="title" required /></label>
          <label>Estimated cost<input name="estimated_cost" type="number" min="0" /></label>
          <label>Description<input name="description" /></label>
          <button>Log request</button>
        </form>
      </details>
      {items.length === 0 ? <div className="empty-state"><strong>No maintenance requests</strong><span>New issues and their repair costs will appear here.</span></div> :
        <div className="table-wrap"><table><thead><tr><th>Issue</th><th>Property / unit</th><th>Priority</th><th>Estimated</th><th>Actual</th><th>Status</th><th>Update</th></tr></thead><tbody>
          {items.map(item => <tr key={item.id}><td><strong>{item.title}</strong><br /><small>{item.description}</small></td><td>{properties?.find(property => property.id === item.property_id)?.name} / {units?.find(unit => unit.id === item.unit_id)?.name ?? "Common"}</td><td><span className={`status status-${item.priority === "urgent" || item.priority === "high" ? "overdue" : "pending"}`}>{item.priority}</span></td><td>{item.estimated_cost ? money(Number(item.estimated_cost)) : "—"}</td><td>{item.actual_cost ? money(Number(item.actual_cost)) : "—"}</td><td>{item.status}</td><td><details><summary>Update</summary><form action={updateMaintenanceStatus} className="inline-form"><input type="hidden" name="request_id" value={item.id} /><label>Status<select name="status" defaultValue={item.status}><option>open</option><option>assigned</option><option>in_progress</option><option>resolved</option><option>cancelled</option></select></label><label>Actual cost<input name="actual_cost" type="number" min="0" defaultValue={item.actual_cost ?? ""} /></label><button>Save</button></form></details></td></tr>)}
        </tbody></table></div>}
    </>
  );
}
