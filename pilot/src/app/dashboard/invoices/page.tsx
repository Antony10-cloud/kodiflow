import { createInvoice, generateMonthlyRent } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function InvoicesPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: invoices }, { data: tenants }] = await Promise.all([
    supabase.from("invoices").select("id,invoice_number,tenant_id,kind,amount,balance,due_date,status").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    supabase.from("tenants").select("id,full_name,account_reference").eq("organization_id",organizationId).eq("active",true),
  ]);
  const records=invoices??[];
  return <><div className="page-heading"><div><p className="eyebrow">LIVE SUPABASE DATA</p><h1>Rent invoices</h1><p className="muted">Issue charges and track every outstanding balance.</p></div><span className="live-badge">Live workspace</span></div>
  <div className="management-grid"><details open={!records.length}><summary>Create individual invoice</summary><form action={createInvoice} className="inline-form"><label>Tenant<select name="tenant_id" required><option value="">Select tenant</option>{tenants?.map(t=><option key={t.id} value={t.id}>{t.full_name} — {t.account_reference}</option>)}</select></label><label>Type<select name="kind"><option value="rent">Rent</option><option value="water">Water</option><option value="electricity">Electricity</option><option value="other">Other</option></select></label><label>Amount<input name="amount" type="number" min="1" required /></label><label>Due date<input name="due_date" type="date" required /></label><label>Description<input name="description" /></label><button>Create invoice</button></form></details>
  <details><summary>Generate monthly rent</summary><form action={generateMonthlyRent} className="inline-form"><label>Billing month<input name="month" type="month" required /></label><label>Due day<input name="due_day" type="number" min="1" max="28" defaultValue="5" required /></label><button>Generate for all tenants</button><small>Existing rent invoices for this month will not be duplicated.</small></form></details></div>
  {!records.length?<div className="empty-state"><strong>No invoices yet</strong><span>Create one invoice or run monthly rent generation.</span></div>:<div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Tenant</th><th>Type</th><th>Due</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead><tbody>{records.map(i=><tr key={i.id}><td><code>{i.invoice_number}</code></td><td>{tenants?.find(t=>t.id===i.tenant_id)?.full_name}</td><td>{i.kind}</td><td>{i.due_date}</td><td>{money(Number(i.amount))}</td><td>{money(Number(i.balance))}</td><td><span className={`status status-${i.status}`}>{i.status}</span></td></tr>)}</tbody></table></div>}</>;
}
