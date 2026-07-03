import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { signOut } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformAdmin();
  return <main className="dashboard-shell"><aside className="pilot-sidebar admin-sidebar"><div className="logo"><span>K</span>Kodi<strong>Flow</strong></div><small>PLATFORM ADMIN</small><nav><Link href="/admin">Organizations</Link><Link href="/admin">Landlord access</Link><Link href="/admin">System health</Link></nav><div className="sidebar-user"><span>{user.email}</span><form action={signOut}><button>Sign out</button></form></div></aside><section className="pilot-content">{children}</section></main>;
}
