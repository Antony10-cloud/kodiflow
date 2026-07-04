import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function ReportsPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{data:invoices},{data:payments},{data:expenses},{data:units},{data:leases},{data:maintenance}] = await Promise.all([
    supabase.from("invoices").select("amount,balance,status,due_date").eq("organization_id",organizationId),
    supabase.from("payments").select("amount,status,received_at").eq("organization_id",organizationId),
    supabase.from("expenses").select("amount,expense_date").eq("organization_id",organizationId),
    supabase.from("units").select("status,monthly_rent").eq("organization_id",organizationId),
    supabase.from("leases").select("status,end_date").eq("organization_id",organizationId),
    supabase.from("maintenance_requests").select("status,actual_cost,estimated_cost").eq("organization_id",organizationId),
  ]);
  const billed=(invoices??[]).reduce((sum,item)=>sum+Number(item.amount),0);
  const outstanding=(invoices??[]).reduce((sum,item)=>sum+Number(item.balance),0);
  const collected=(payments??[]).filter(item=>item.status==="matched").reduce((sum,item)=>sum+Number(item.amount),0);
  const costs=(expenses??[]).reduce((sum,item)=>sum+Number(item.amount),0);
  const occupied=(units??[]).filter(item=>item.status==="occupied").length;
  const potentialRent=(units??[]).reduce((sum,item)=>sum+Number(item.monthly_rent),0);
  const collectionRate=billed?Math.round((billed-outstanding)/billed*100):0;
  const occupancy=units?.length?Math.round(occupied/units.length*100):0;
  const performance=potentialRent?Math.round((collected-costs)/(potentialRent*12)*1000)/10:0;
  const expiring=(leases??[]).filter(lease=>{const days=(new Date(`${lease.end_date}T12:00:00`).getTime()-Date.now())/86400000;return days>=0&&days<=30}).length;
  const openMaintenance=(maintenance??[]).filter(item=>!["resolved","cancelled"].includes(item.status)).length;
  const maintenanceCost=(maintenance??[]).reduce((sum,item)=>sum+Number(item.actual_cost??item.estimated_cost??0),0);

  return <><div className="page-heading"><div><p className="eyebrow">LIVE PORTFOLIO DATA</p><h1>Reports</h1><p className="muted">Collections, arrears, occupancy, profitability and operational risk.</p></div><a className="export-button" href="/api/reports/portfolio.csv">Export CSV</a></div>
    <div className="report-grid">
      <article><span>Collection rate</span><strong>{collectionRate}%</strong><div className="progress"><i style={{width:`${collectionRate}%`}} /></div></article>
      <article><span>Occupancy</span><strong>{occupancy}%</strong><small>{occupied} of {units?.length??0} units occupied</small></article>
      <article><span>Total collected</span><strong>{money(collected)}</strong><small>Matched payments</small></article>
      <article><span>Outstanding balances</span><strong>{money(outstanding)}</strong><small>Across all unpaid invoices</small></article>
      <article><span>Operating expenses</span><strong>{money(costs)}</strong><small>{money(maintenanceCost)} maintenance exposure tracked separately</small></article>
      <article><span>Net cash position</span><strong>{money(collected-costs)}</strong><small>Collections less recorded expenses</small></article>
      <article><span>Income vs annual potential</span><strong>{performance}%</strong><small>Net cash against annualized scheduled rent</small></article>
      <article><span>Operational attention</span><strong>{expiring+openMaintenance}</strong><small>{expiring} renewals · {openMaintenance} maintenance issues</small></article>
    </div>
    <div className="table-wrap spaced"><table><thead><tr><th>Arrears band</th><th>Invoices</th><th>Balance</th></tr></thead><tbody>{["overdue","part_paid","pending"].map(status=><tr key={status}><td>{status.replace("_"," ")}</td><td>{invoices?.filter(item=>item.status===status).length??0}</td><td>{money((invoices??[]).filter(item=>item.status===status).reduce((sum,item)=>sum+Number(item.balance),0))}</td></tr>)}</tbody></table></div>
  </>;
}
