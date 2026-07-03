import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function ReportsPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{data:invoices},{data:payments},{data:expenses},{data:units}] = await Promise.all([
    supabase.from("invoices").select("amount,balance,status,due_date").eq("organization_id",organizationId),
    supabase.from("payments").select("amount,status,received_at").eq("organization_id",organizationId),
    supabase.from("expenses").select("amount,expense_date").eq("organization_id",organizationId),
    supabase.from("units").select("status,monthly_rent").eq("organization_id",organizationId),
  ]);
  const billed=(invoices??[]).reduce((s,i)=>s+Number(i.amount),0);
  const outstanding=(invoices??[]).reduce((s,i)=>s+Number(i.balance),0);
  const collected=(payments??[]).filter(p=>p.status==="matched").reduce((s,p)=>s+Number(p.amount),0);
  const costs=(expenses??[]).reduce((s,e)=>s+Number(e.amount),0);
  const occupied=(units??[]).filter(u=>u.status==="occupied").length;
  const collectionRate=billed?Math.round((billed-outstanding)/billed*100):0;
  const occupancy=units?.length?Math.round(occupied/units.length*100):0;
  return <><div className="page-heading"><div><p className="eyebrow">LIVE PORTFOLIO DATA</p><h1>Reports</h1><p className="muted">A current view of collections, arrears, occupancy and operating costs.</p></div><a className="export-button" href="/api/reports/portfolio.csv">Export CSV</a></div>
  <div className="report-grid"><article><span>Collection rate</span><strong>{collectionRate}%</strong><div className="progress"><i style={{width:`${collectionRate}%`}} /></div></article><article><span>Occupancy</span><strong>{occupancy}%</strong><small>{occupied} of {units?.length??0} units occupied</small></article><article><span>Total collected</span><strong>{money(collected)}</strong><small>Matched payments</small></article><article><span>Outstanding balances</span><strong>{money(outstanding)}</strong><small>Across all unpaid invoices</small></article><article><span>Operating expenses</span><strong>{money(costs)}</strong><small>Recorded property costs</small></article><article><span>Net cash position</span><strong>{money(collected-costs)}</strong><small>Collections less expenses</small></article></div>
  <div className="table-wrap spaced"><table><thead><tr><th>Arrears band</th><th>Invoices</th><th>Balance</th></tr></thead><tbody><tr><td>Overdue</td><td>{invoices?.filter(i=>i.status==="overdue").length??0}</td><td>{money((invoices??[]).filter(i=>i.status==="overdue").reduce((s,i)=>s+Number(i.balance),0))}</td></tr><tr><td>Part paid</td><td>{invoices?.filter(i=>i.status==="part_paid").length??0}</td><td>{money((invoices??[]).filter(i=>i.status==="part_paid").reduce((s,i)=>s+Number(i.balance),0))}</td></tr><tr><td>Pending</td><td>{invoices?.filter(i=>i.status==="pending").length??0}</td><td>{money((invoices??[]).filter(i=>i.status==="pending").reduce((s,i)=>s+Number(i.balance),0))}</td></tr></tbody></table></div></>;
}
