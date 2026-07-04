import { createLease, renewLease } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

const daysUntil = (date: string) => Math.ceil((new Date(`${date}T12:00:00`).getTime() - Date.now()) / 86_400_000);

export default async function LeasesPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: leases }, { data: tenants }, { data: units }, { data: properties }] = await Promise.all([
    supabase.from("leases").select("id,tenant_id,unit_id,start_date,end_date,monthly_rent,deposit_amount,status,renewal_notice_days,notes")
      .eq("organization_id", organizationId).order("end_date"),
    supabase.from("tenants").select("id,full_name,unit_id").eq("organization_id", organizationId).eq("active", true),
    supabase.from("units").select("id,name,property_id,monthly_rent,status").eq("organization_id", organizationId).order("name"),
    supabase.from("properties").select("id,name").eq("organization_id", organizationId),
  ]);
  const allLeases = leases ?? [];
  const expiring = allLeases.filter(lease => {
    const days = daysUntil(lease.end_date);
    return days >= 0 && days <= lease.renewal_notice_days;
  }).length;

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">LEASE LIFECYCLE</p><h1>Leases & renewals</h1><p className="muted">Track agreements, deposits, expiry dates and renewal decisions.</p></div><span className="live-badge">{expiring} renewal{expiring === 1 ? "" : "s"} due</span></div>
      <details className="management-panel" open={allLeases.length === 0}><summary>Create lease</summary>
        <form action={createLease} className="inline-form form-columns">
          <label>Tenant<select name="tenant_id" required><option value="">Select tenant</option>{(tenants ?? []).map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>)}</select></label>
          <label>Unit<select name="unit_id" required><option value="">Select unit</option>{(units ?? []).map(unit => <option key={unit.id} value={unit.id}>{properties?.find(property => property.id === unit.property_id)?.name} — {unit.name}</option>)}</select></label>
          <label>Start date<input name="start_date" type="date" required /></label>
          <label>End date<input name="end_date" type="date" required /></label>
          <label>Monthly rent<input name="monthly_rent" type="number" min="0" required /></label>
          <label>Deposit<input name="deposit_amount" type="number" min="0" defaultValue="0" /></label>
          <label>Renewal notice (days)<input name="renewal_notice_days" type="number" min="1" max="180" defaultValue="30" /></label>
          <label>Notes<input name="notes" /></label>
          <button>Create lease</button>
        </form>
      </details>
      {allLeases.length === 0 ? <div className="empty-state"><strong>No leases yet</strong><span>Create a lease to start tracking renewals and deposits.</span></div> :
        <div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Unit</th><th>Term</th><th>Rent</th><th>Deposit</th><th>Renewal</th><th>Status</th></tr></thead><tbody>
          {allLeases.map(lease => {
            const tenant = tenants?.find(item => item.id === lease.tenant_id);
            const unit = units?.find(item => item.id === lease.unit_id);
            const days = daysUntil(lease.end_date);
            return <tr key={lease.id}><td><strong>{tenant?.full_name ?? "Tenant"}</strong></td><td>{unit?.name ?? "Unit"}</td><td>{lease.start_date} – {lease.end_date}</td><td>{money(Number(lease.monthly_rent))}</td><td>{money(Number(lease.deposit_amount))}</td><td>{days < 0 ? "Expired" : `${days} days`}</td><td>{days >= 0 && days <= lease.renewal_notice_days ?
              <details><summary>Renew</summary><form action={renewLease} className="inline-form"><input type="hidden" name="lease_id" value={lease.id} /><label>New end date<input name="end_date" type="date" required /></label><label>Monthly rent<input name="monthly_rent" type="number" min="0" defaultValue={Number(lease.monthly_rent)} required /></label><button>Save renewal</button></form></details> :
              <span className={`status status-${lease.status === "active" ? "active" : "pending"}`}>{lease.status}</span>}</td></tr>;
          })}
        </tbody></table></div>}
    </>
  );
}
