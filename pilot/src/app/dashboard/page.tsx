import { DarajaStatus } from "./daraja-status";
import { money } from "@/lib/pilot-data";
import { getWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const { supabase, organizationId, user } = await getWorkspace();
  const [{data:invoices},{data:payments},{data:units},{data:properties},{data:organization}] = await Promise.all([
    supabase.from("invoices").select("amount,balance").eq("organization_id",organizationId),
    supabase.from("payments").select("amount,status").eq("organization_id",organizationId),
    supabase.from("units").select("status").eq("organization_id",organizationId),
    supabase.from("properties").select("id").eq("organization_id",organizationId),
    supabase.from("organizations").select("name").eq("id",organizationId).single(),
  ]);
  const billed=(invoices??[]).reduce((s,i)=>s+Number(i.amount),0);
  const outstanding=(invoices??[]).reduce((s,i)=>s+Number(i.balance),0);
  const collected=(payments??[]).filter(p=>p.status==="matched").reduce((s,p)=>s+Number(p.amount),0);
  const occupied=(units??[]).filter(u=>u.status==="occupied").length;
  const occupancy=units?.length?Math.round(occupied/units.length*100):0;
  const name=user.user_metadata.full_name??user.email?.split("@")[0]??"Landlord";
  return <><div className="page-heading"><div><p className="eyebrow">LANDLORD WORKSPACE</p><h1>Welcome, {name}</h1><p className="muted">{organization?.name} portfolio overview.</p></div><span className="live-badge">Live Supabase data</span></div>
  <div className="pilot-grid">{[["Collected",money(collected)],["Outstanding",money(outstanding)],["Occupancy",`${occupancy}%`],["Total billed",money(billed)]].map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong><small>{properties?.length??0} properties · {units?.length??0} units</small></article>)}</div>
  {!properties?.length&&<div className="pilot-ready"><span>1</span><div><h2>Start your landlord setup</h2><p>Create a property, add its units, then assign your first tenant. KodiFlow will generate the payment reference automatically.</p></div></div>}
  <DarajaStatus /></>;
}
