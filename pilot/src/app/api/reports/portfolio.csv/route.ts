import { getWorkspace } from "@/lib/workspace";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"','""')}"`;

export async function GET() {
  const { supabase, organizationId } = await getWorkspace();
  const { data } = await supabase.from("invoices")
    .select("invoice_number,kind,amount,balance,due_date,status,tenants(full_name,account_reference)")
    .eq("organization_id",organizationId).order("due_date");
  const rows=["Invoice,Tenant,Account Reference,Type,Amount,Balance,Due Date,Status"];
  for(const item of data??[]){
    const tenant=Array.isArray(item.tenants)?item.tenants[0]:item.tenants;
    rows.push([item.invoice_number,tenant?.full_name,tenant?.account_reference,item.kind,item.amount,item.balance,item.due_date,item.status].map(csv).join(","));
  }
  return new Response(rows.join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="kodiflow-portfolio-${new Date().toISOString().slice(0,10)}.csv"`}});
}
