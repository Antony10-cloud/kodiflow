import { createUtilityCharge } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function UtilitiesPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: charges }, { data: tenants }] = await Promise.all([
    supabase.from("utility_charges").select("*").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    supabase.from("tenants").select("id,full_name,account_reference").eq("organization_id",organizationId).eq("active",true),
  ]);
  return <><div className="page-heading"><div><p className="eyebrow">LIVE SUPABASE DATA</p><h1>Utility billing</h1><p className="muted">Record usage or fixed charges and create an invoice automatically.</p></div><span className="live-badge">Invoice-linked</span></div>
  <details className="management-panel" open={!charges?.length}><summary>Add utility charge</summary><form action={createUtilityCharge} className="inline-form form-columns"><label>Tenant<select name="tenant_id" required><option value="">Select tenant</option>{tenants?.map(t=><option key={t.id} value={t.id}>{t.full_name} — {t.account_reference}</option>)}</select></label><label>Utility<select name="utility_type"><option value="water">Water</option><option value="electricity">Electricity</option><option value="other">Other</option></select></label><label>Billing month<input name="billing_month" type="month" required /></label><label>Previous reading<input name="previous_reading" type="number" step="0.01" /></label><label>Current reading<input name="current_reading" type="number" step="0.01" /></label><label>Rate per unit<input name="rate" type="number" step="0.01" /></label><label>Or fixed amount<input name="amount" type="number" step="0.01" /></label><button>Create charge & invoice</button></form></details>
  {!charges?.length?<div className="empty-state"><strong>No utility charges yet</strong><span>Add a meter reading or fixed utility amount above.</span></div>:<div className="table-wrap"><table><thead><tr><th>Month</th><th>Tenant</th><th>Utility</th><th>Previous</th><th>Current</th><th>Rate</th><th>Charge</th></tr></thead><tbody>{charges.map(c=><tr key={c.id}><td>{c.billing_month}</td><td>{tenants?.find(t=>t.id===c.tenant_id)?.full_name}</td><td>{c.utility_type}</td><td>{c.previous_reading??"—"}</td><td>{c.current_reading??"—"}</td><td>{c.rate?money(Number(c.rate)):"—"}</td><td>{money(Number(c.amount))}</td></tr>)}</tbody></table></div>}</>;
}
