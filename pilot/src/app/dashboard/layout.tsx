import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

const navigation = [
  ["Overview", "/dashboard"],
  ["Properties & units", "/dashboard/properties"],
  ["Tenants", "/dashboard/tenants"],
  ["Leases & renewals", "/dashboard/leases"],
  ["Maintenance", "/dashboard/maintenance"],
  ["Invoices", "/dashboard/invoices"],
  ["M-Pesa reconciliation", "/dashboard/payments"],
  ["SMS & WhatsApp", "/dashboard/notifications"],
  ["Receipts", "/dashboard/receipts"],
  ["Utilities", "/dashboard/utilities"],
  ["Expenses", "/dashboard/expenses"],
  ["Reports", "/dashboard/reports"],
  ["Settings", "/dashboard/settings"],
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships").select("role")
    .eq("user_id", user.id).limit(1).maybeSingle();
  if (membership?.role === "platform_admin") redirect("/admin");
  if (!membership) redirect("/login?error=Your%20landlord%20workspace%20is%20not%20assigned");

  return (
    <main className="dashboard-shell">
      <aside className="pilot-sidebar">
        <div className="logo"><span>K</span>Kodi<strong>Flow</strong></div>
        <small>PRIVATE PILOT</small>
        <nav>{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="sidebar-user"><span>{user.email}</span><form action={signOut}><button>Sign out</button></form></div>
      </aside>
      <section className="pilot-content">{children}</section>
    </main>
  );
}
