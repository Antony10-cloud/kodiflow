import { createProperty, createUnit } from "../actions";
import { getWorkspace } from "@/lib/workspace";
import { money } from "@/lib/pilot-data";

export default async function PropertiesPage() {
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: properties }, { data: units }] = await Promise.all([
    supabase.from("properties").select("id,name,location,property_type,description,amenities").eq("organization_id", organizationId).order("created_at"),
    supabase.from("units").select("id,property_id,name,monthly_rent,status,bedrooms,bathrooms,size_sqft,amenities").eq("organization_id", organizationId).order("name"),
  ]);
  const live = properties ?? [];
  const allUnits = units ?? [];

  return <>
    <div className="page-heading"><div><p className="eyebrow">CENTRAL PROPERTY DATABASE</p><h1>Properties & units</h1><p className="muted">Keep portfolio details, layouts, amenities, occupancy and rent potential together.</p></div><span className="live-badge">Live workspace</span></div>
    <div className="management-grid">
      <details open={live.length === 0}><summary>Add property</summary><form action={createProperty} className="inline-form">
        <label>Property name<input name="name" required placeholder="e.g. Greenview Apartments" /></label>
        <label>Location<input name="location" required placeholder="e.g. Kilimani, Nairobi" /></label>
        <label>Property type<select name="property_type"><option value="">Select type</option><option>Apartment</option><option>Commercial</option><option>Mixed use</option><option>Single family</option><option>Student housing</option></select></label>
        <label>Amenities<input name="amenities" placeholder="Parking, security, borehole" /></label>
        <label>Description<input name="description" /></label><button>Create property</button>
      </form></details>
      <details><summary>Add unit</summary><form action={createUnit} className="inline-form">
        <label>Property<select name="property_id" required><option value="">Select property</option>{live.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Unit name<input name="name" required placeholder="e.g. A4" /></label>
        <label>Monthly rent<input name="monthly_rent" type="number" min="0" required /></label>
        <label>Bedrooms<input name="bedrooms" type="number" min="0" /></label><label>Bathrooms<input name="bathrooms" type="number" min="0" step="0.5" /></label>
        <label>Size (sq ft)<input name="size_sqft" type="number" min="0" /></label><label>Amenities<input name="amenities" placeholder="Balcony, ensuite" /></label><button>Create unit</button>
      </form></details>
    </div>
    {live.length === 0 ? <div className="empty-state"><strong>No properties yet</strong><span>Create your first property above.</span></div> :
      <div className="property-cards">{live.map(property => { const propertyUnits = allUnits.filter(unit => unit.property_id === property.id); const occupied = propertyUnits.filter(unit => unit.status === "occupied").length; return <article key={property.id}><div><h3>{property.name}</h3><p>{property.location} · {property.property_type ?? "Property"}</p></div><strong>{occupied}/{propertyUnits.length}</strong><span>units occupied</span><small>{property.amenities?.join(" · ") || "Amenities not recorded"}</small><footer>{money(propertyUnits.reduce((sum, unit) => sum + Number(unit.monthly_rent), 0))} potential monthly rent</footer></article>; })}</div>}
    {allUnits.length > 0 && <div className="table-wrap spaced"><table><thead><tr><th>Unit</th><th>Property</th><th>Layout</th><th>Size</th><th>Monthly rent</th><th>Status</th></tr></thead><tbody>{allUnits.map(unit => <tr key={unit.id}><td><strong>{unit.name}</strong></td><td>{live.find(item => item.id === unit.property_id)?.name}</td><td>{unit.bedrooms ?? "—"} bed · {unit.bathrooms ?? "—"} bath</td><td>{unit.size_sqft ? `${unit.size_sqft} sq ft` : "—"}</td><td>{money(Number(unit.monthly_rent))}</td><td><span className={`status status-${unit.status}`}>{unit.status}</span></td></tr>)}</tbody></table></div>}
  </>;
}
