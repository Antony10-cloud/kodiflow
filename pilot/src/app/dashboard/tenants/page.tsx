import { createTenant } from "../actions";
import { getWorkspace } from "@/lib/workspace";

export default async function TenantsPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: tenants }, { data: units }, { data: properties }] = await Promise.all([
    supabase.from("tenants").select("id, full_name, phone, email, account_reference, unit_id, active").eq("organization_id", organizationId).order("created_at"),
    supabase.from("units").select("id, name, property_id, status").eq("organization_id", organizationId).order("name"),
    supabase.from("properties").select("id, name").eq("organization_id", organizationId),
  ]);
  const people = tenants ?? [];
  const availableUnits = (units ?? []).filter(unit => unit.status === "vacant");

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">LIVE SUPABASE DATA</p><h1>Tenants</h1><p className="muted">Every tenant receives a unique KodiFlow payment reference automatically.</p></div><span className="live-badge">Live workspace</span></div>
      <details className="management-panel" open={people.length === 0}><summary>Add tenant</summary><form action={createTenant} className="inline-form form-columns"><label>Full name<input name="full_name" required /></label><label>Phone<input name="phone" required placeholder="07..." /></label><label>Email<input name="email" type="email" /></label><label>Unit<select name="unit_id"><option value="">Assign later</option>{availableUnits.map(unit => { const property = properties?.find(item => item.id === unit.property_id); return <option key={unit.id} value={unit.id}>{property?.name} — {unit.name}</option>; })}</select></label><button>Add tenant</button></form></details>
      {people.length === 0 ? <div className="empty-state"><strong>No tenants yet</strong><span>Add a unit first, then create your first tenant.</span></div> :
        <div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Phone</th><th>Email</th><th>Unit</th><th>Account reference</th><th>Status</th></tr></thead><tbody>{people.map(person => { const unit = units?.find(item => item.id === person.unit_id); return <tr key={person.id}><td><strong>{person.full_name}</strong></td><td>{person.phone}</td><td>{person.email ?? "—"}</td><td>{unit?.name ?? "Unassigned"}</td><td><code>{person.account_reference}</code></td><td><span className="status status-active">{person.active ? "Active" : "Inactive"}</span></td></tr>; })}</tbody></table></div>}
    </>
  );
}
