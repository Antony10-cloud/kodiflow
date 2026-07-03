import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { inviteLandlord } from "./actions";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ invited?: string; error?: string }> }) {
  await requirePlatformAdmin();
  const query = await searchParams;
  const admin = createAdminClient();
  const [{ data: organizations }, { data: memberships }] = await Promise.all([
    admin.from("organizations").select("id,name,slug,created_at,properties(count),units(count)").order("created_at"),
    admin.from("memberships").select("organization_id,role,profiles(full_name)").neq("role","platform_admin"),
  ]);
  return <><div className="page-heading"><div><p className="eyebrow">KODIFLOW CONTROL CENTRE</p><h1>Platform administration</h1><p className="muted">Manage independent landlord organizations without accessing their credentials.</p></div><span className="live-badge">Platform admin</span></div>
  {query.invited&&<div className="success">Invitation sent to {query.invited}.</div>}{query.error&&<div className="alert">{query.error}</div>}
  <div className="settings-grid"><article><h2>Invite pilot landlord</h2><p>The landlord receives a secure Supabase invitation and an isolated workspace.</p><form action={inviteLandlord} className="settings-form"><label>Landlord name<input name="full_name" required /></label><label>Email address<input name="email" type="email" required /></label><label>Portfolio / organization name<input name="organization_name" required /></label><button>Send invitation</button></form></article><article><h2>Pilot summary</h2><dl><div><dt>Organizations</dt><dd>{organizations?.length ?? 0}</dd></div><div><dt>Landlord users</dt><dd>{memberships?.length ?? 0}</dd></div><div><dt>Environment</dt><dd>Private pilot</dd></div><div><dt>Database</dt><dd>Connected</dd></div></dl></article></div>
  <div className="table-wrap spaced"><table><thead><tr><th>Organization</th><th>Owner</th><th>Properties</th><th>Units</th><th>Created</th></tr></thead><tbody>{organizations?.map(org=>{const member=memberships?.find(item=>item.organization_id===org.id);const profile=Array.isArray(member?.profiles)?member.profiles[0]:member?.profiles;return <tr key={org.id}><td><strong>{org.name}</strong><br/><small>{org.slug}</small></td><td>{profile?.full_name ?? "Platform"}</td><td>{org.properties?.[0]?.count ?? 0}</td><td>{org.units?.[0]?.count ?? 0}</td><td>{new Date(org.created_at).toLocaleDateString("en-KE")}</td></tr>})}</tbody></table></div></>;
}
