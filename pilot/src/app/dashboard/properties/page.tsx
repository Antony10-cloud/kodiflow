import { createProperty, createUnit } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function PropertiesPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: properties }, { data: units }] = await Promise.all([
    supabase.from("properties").select("id, name, location").eq("organization_id", organizationId).order("created_at"),
    supabase.from("units").select("id, property_id, name, monthly_rent, status").eq("organization_id", organizationId).order("name"),
  ]);
  const live = properties ?? [];
  const allUnits = units ?? [];

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">LIVE SUPABASE DATA</p><h1>Properties & units</h1><p className="muted">Create the buildings and rentable units in your portfolio.</p></div><span className="live-badge">Live workspace</span></div>
      <div className="management-grid">
        <details open={live.length === 0}><summary>Add property</summary><form action={createProperty} className="inline-form"><label>Property name<input name="name" required placeholder="e.g. Greenview Apartments" /></label><label>Location<input name="location" required placeholder="e.g. Kilimani, Nairobi" /></label><button>Create property</button></form></details>
        <details><summary>Add unit</summary><form action={createUnit} className="inline-form"><label>Property<select name="property_id" required><option value="">Select property</option>{live.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Unit name<input name="name" required placeholder="e.g. A4" /></label><label>Monthly rent<input name="monthly_rent" type="number" min="0" required /></label><button>Create unit</button></form></details>
      </div>
      {live.length === 0 ? <div className="empty-state"><strong>No properties yet</strong><span>Create your first property above. Your data will be stored securely in Supabase.</span></div> :
        <div className="property-cards">{live.map(property => { const propertyUnits = allUnits.filter(unit => unit.property_id === property.id); const occupied = propertyUnits.filter(unit => unit.status === "occupied").length; return <article key={property.id}><div><h3>{property.name}</h3><p>{property.location}</p></div><strong>{occupied}/{propertyUnits.length}</strong><span>units occupied</span><footer>{money(propertyUnits.reduce((sum, unit) => sum + Number(unit.monthly_rent), 0))} potential monthly rent</footer></article>; })}</div>}
      {allUnits.length > 0 && <div className="table-wrap spaced"><table><thead><tr><th>Unit</th><th>Property</th><th>Monthly rent</th><th>Status</th></tr></thead><tbody>{allUnits.map(unit => <tr key={unit.id}><td><strong>{unit.name}</strong></td><td>{live.find(item => item.id === unit.property_id)?.name}</td><td>{money(Number(unit.monthly_rent))}</td><td><span className={`status status-${unit.status}`}>{unit.status}</span></td></tr>)}</tbody></table></div>}
    </>
  );
}
