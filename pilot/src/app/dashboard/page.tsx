import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "../login/actions";
import { DarajaStatus } from "./daraja-status";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <main className="dashboard-shell">
      <aside className="pilot-sidebar">
        <div className="logo"><span>K</span>Kodi<strong>Flow</strong></div>
        <nav>{["Overview", "Properties", "Units", "Tenants", "Invoices", "Payments", "Reports"].map(item => <a key={item}>{item}</a>)}</nav>
        <form action={signOut}><button>Sign out</button></form>
      </aside>
      <section className="pilot-content">
        <p className="eyebrow">SECURE PRIVATE PILOT</p>
        <h1>Good afternoon, Antony</h1>
        <p className="muted">{membership ? "Your organization workspace is connected." : "Your account is ready. Organization access is awaiting assignment."}</p>
        <div className="pilot-grid">
          {[
            ["Collected this month", "KES 69,500"],
            ["Outstanding rent", "KES 33,500"],
            ["Occupancy", "88%"],
            ["Properties", "3"],
          ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>Sample pilot data</small></article>)}
        </div>
        <div className="pilot-ready">
          <span>✓</span><div><h2>Production foundation connected</h2><p>Authenticated server rendering, PostgreSQL-ready data access, and protected dashboard routing are now in place.</p></div>
        </div>
        <DarajaStatus />
      </section>
    </main>
  );
}
