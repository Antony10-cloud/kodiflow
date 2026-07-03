import { createExpense } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function ExpensesPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: records }, { data: properties }] = await Promise.all([
    supabase.from("expenses").select("*").eq("organization_id", organizationId).order("expense_date", { ascending: false }),
    supabase.from("properties").select("id,name").eq("organization_id", organizationId),
  ]);
  return <><div className="page-heading"><div><p className="eyebrow">LIVE SUPABASE DATA</p><h1>Expenses</h1><p className="muted">Track operating costs by property.</p></div><span className="live-badge">Live workspace</span></div>
    <details className="management-panel"><summary>Add expense</summary><form action={createExpense} className="inline-form form-columns"><label>Property<select name="property_id"><option value="">General</option>{properties?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Category<input name="category" required /></label><label>Description<input name="description" required /></label><label>Amount<input name="amount" type="number" min="1" required /></label><label>Date<input name="expense_date" type="date" required /></label><button>Save expense</button></form></details>
    {!records?.length?<div className="empty-state"><strong>No expenses recorded</strong><span>Add the first operating cost above.</span></div>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Property</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td>{r.expense_date}</td><td>{properties?.find(p=>p.id===r.property_id)?.name??"General"}</td><td>{r.category}</td><td>{r.description}</td><td>{money(Number(r.amount))}</td></tr>)}</tbody></table></div>}</>;
}
