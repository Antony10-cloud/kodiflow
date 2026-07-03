import { createInvoice } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function InvoicesPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: invoices }, { data: tenants }] = await Promise.all([
    supabase.from("invoices").select("id, invoice_number, tenant_id, kind, amount, balance, due_date, status").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("tenants").select("id, full_name, account_reference").eq("organization_id", organizationId).eq("active", true),
  ]);
  const records = invoices ?? [];
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">LIVE SUPABASE DATA</p><h1>Rent invoices</h1><p className="muted">Issue charges and track each tenant’s remaining balance.</p></div><span className="live-badge">Live workspace</span></div>
      <details className="management-panel" open={records.length === 0}><summary>Create invoice</summary><form action={createInvoice} className="inline-form form-columns"><label>Tenant<select name="tenant_id" required><option value="">Select tenant</option>{tenants?.map(item => <option key={item.id} value={item.id}>{item.full_name} — {item.account_reference}</option>)}</select></label><label>Type<select name="kind"><option value="rent">Rent</option><option value="water">Water</option><option value="electricity">Electricity</option><option value="other">Other</option></select></label><label>Amount<input name="amount" type="number" min="1" required /></label><label>Due date<input name="due_date" type="date" required /></label><label>Description<input name="description" /></label><button>Create invoice</button></form></details>
      {records.length === 0 ? <div className="empty-state"><strong>No invoices yet</strong><span>Add a tenant, then issue the first rent invoice.</span></div> :
        <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Tenant</th><th>Type</th><th>Due</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead><tbody>{records.map(invoice => <tr key={invoice.id}><td><code>{invoice.invoice_number}</code></td><td>{tenants?.find(item => item.id === invoice.tenant_id)?.full_name}</td><td>{invoice.kind}</td><td>{invoice.due_date}</td><td>{money(Number(invoice.amount))}</td><td>{money(Number(invoice.balance))}</td><td><span className={`status status-${invoice.status}`}>{invoice.status}</span></td></tr>)}</tbody></table></div>}
    </>
  );
}
