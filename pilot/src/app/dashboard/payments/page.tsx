import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";
import { StkForm } from "./stk-form";

export default async function PaymentsPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: records }, { data: tenants }] = await Promise.all([
    supabase.from("payments").select("*").eq("organization_id", organizationId).order("received_at", { ascending: false }),
    supabase.from("tenants").select("id,full_name,account_reference").eq("organization_id", organizationId),
  ]);
  const unmatched=records?.filter(r=>r.status==="unmatched").length??0;
  return <><div className="page-heading"><div><p className="eyebrow">LIVE PAYMENT LEDGER</p><h1>M-Pesa reconciliation</h1><p className="muted">Callbacks will appear here and match using tenant account references.</p></div><span className="live-badge">Sandbox ready</span></div>
  <StkForm references={tenants?.map(tenant=>tenant.account_reference).filter(Boolean)??[]} />
  {unmatched>0&&<div className="notice warning">{unmatched} payment(s) require manual reconciliation.</div>}
  {!records?.length?<div className="empty-state"><strong>No M-Pesa callbacks yet</strong><span>Sandbox transactions will appear here after STK Push is configured.</span></div>:<div className="table-wrap"><table><thead><tr><th>Receipt</th><th>Tenant</th><th>Reference</th><th>Phone</th><th>Amount</th><th>Status</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td><code>{r.mpesa_receipt??"Pending"}</code></td><td>{tenants?.find(t=>t.id===r.tenant_id)?.full_name??"Unmatched"}</td><td>{r.account_reference??"—"}</td><td>{r.phone??"—"}</td><td>{money(Number(r.amount))}</td><td><span className={`status status-${r.status}`}>{r.status}</span></td></tr>)}</tbody></table></div>}</>;
}
