import { createTenant } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function TenantsPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: tenants }, { data: units }, { data: properties }, { data: invoices }, { data: payments }, { data: maintenance }] = await Promise.all([
    supabase.from("tenants").select("id,full_name,phone,email,account_reference,unit_id,active").eq("organization_id", organizationId).order("created_at"),
    supabase.from("units").select("id,name,property_id,status").eq("organization_id", organizationId).order("name"),
    supabase.from("properties").select("id,name").eq("organization_id", organizationId),
    supabase.from("invoices").select("tenant_id,balance").eq("organization_id", organizationId),
    supabase.from("payments").select("tenant_id,amount,status").eq("organization_id", organizationId),
    supabase.from("maintenance_requests").select("tenant_id,status").eq("organization_id", organizationId),
  ]);
  const people = tenants ?? [];
  const availableUnits = (units ?? []).filter(unit => unit.status === "vacant");

  return <>
    <div className="page-heading"><div><p className="eyebrow">TENANT INSIGHTS</p><h1>Tenants</h1><p className="muted">See contacts, payment history, balances and maintenance activity in one view.</p></div><span className="live-badge">Live workspace</span></div>
    <details className="management-panel" open={people.length === 0}><summary>Add tenant</summary><form action={createTenant} className="inline-form form-columns"><label>Full name<input name="full_name" required /></label><label>Phone<input name="phone" required placeholder="07..." /></label><label>Email<input name="email" type="email" /></label><label>Unit<select name="unit_id"><option value="">Assign later</option>{availableUnits.map(unit => <option key={unit.id} value={unit.id}>{properties?.find(item => item.id === unit.property_id)?.name} — {unit.name}</option>)}</select></label><button>Add tenant</button></form></details>
    {people.length === 0 ? <div className="empty-state"><strong>No tenants yet</strong><span>Add a tenant to begin tracking their history.</span></div> :
      <div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Phone</th><th>Unit</th><th>Reference</th><th>Paid</th><th>Balance</th><th>Open issues</th><th>Status</th></tr></thead><tbody>{people.map(person => {
        const unit = units?.find(item => item.id === person.unit_id);
        const paid = (payments ?? []).filter(item => item.tenant_id === person.id && item.status === "matched").reduce((sum, item) => sum + Number(item.amount), 0);
        const balance = (invoices ?? []).filter(item => item.tenant_id === person.id).reduce((sum, item) => sum + Number(item.balance), 0);
        const issues = (maintenance ?? []).filter(item => item.tenant_id === person.id && !["resolved", "cancelled"].includes(item.status)).length;
        return <tr key={person.id}><td><strong>{person.full_name}</strong><br /><small>{person.email ?? "No email"}</small></td><td>{person.phone}</td><td>{unit?.name ?? "Unassigned"}</td><td><code>{person.account_reference}</code></td><td>{money(paid)}</td><td><span className={`status status-${balance > 0 ? "overdue" : "active"}`}>{money(balance)}</span></td><td>{issues}</td><td><span className="status status-active">{person.active ? "Active" : "Inactive"}</span></td></tr>;
      })}</tbody></table></div>}
  </>;
}
