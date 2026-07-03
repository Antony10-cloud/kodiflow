import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getWorkspace() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return { supabase, user, organizationId: existing.organization_id, role: existing.role };

  const admin = createAdminClient();
  await admin.from("profiles").upsert({
    id: user.id,
    full_name: user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "KodiFlow User",
  });
  const slug = user.email?.toLowerCase() === "antonymugo66@gmail.com"
    ? "kodiflow-platform"
    : `landlord-${user.id.slice(0, 8)}`;
  const { data: organization, error } = await admin
    .from("organizations")
    .upsert({
      name: user.email?.toLowerCase() === "antonymugo66@gmail.com" ? "KodiFlow Platform" : "My Rental Portfolio",
      slug,
      owner_id: user.id,
    }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error || !organization) throw new Error(error?.message ?? "Could not create workspace.");
  const role = user.email?.toLowerCase() === "antonymugo66@gmail.com" ? "platform_admin" : "landlord";
  await admin.from("memberships").upsert({ organization_id: organization.id, user_id: user.id, role });
  return { supabase, user, organizationId: organization.id, role };
}
