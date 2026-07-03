import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function ReceiptsPage() {
  const { supabase, organizationId } = await getWorkspace();
  const { data } = await supabase.from("receipts").select("id,receipt_number,issued_at,payments(mpesa_receipt,amount,tenant_id)").eq("organization_id",organizationId).order("issued_at",{ascending:false});
  return <><div className="page-heading"><div><p className="eyebrow">LIVE SUPABASE DATA</p><h1>Receipts</h1><p className="muted">Issued automatically when a payment is matched.</p></div><span className="live-badge">Live workspace</span></div>
  {!data?.length?<div className="empty-state"><strong>No receipts yet</strong><span>A receipt will be generated after the first matched payment.</span></div>:<div className="table-wrap"><table><thead><tr><th>Receipt</th><th>M-Pesa receipt</th><th>Amount</th><th>Issued</th></tr></thead><tbody>{data.map((r:any)=><tr key={r.id}><td><code>{r.receipt_number}</code></td><td>{r.payments?.mpesa_receipt}</td><td>{money(Number(r.payments?.amount))}</td><td>{new Date(r.issued_at).toLocaleString("en-KE")}</td></tr>)}</tbody></table></div>}</>;
}
