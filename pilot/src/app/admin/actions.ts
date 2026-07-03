"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export async function inviteLandlord(formData: FormData) {
  await requirePlatformAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  if (!email || !fullName || !organizationName) redirect("/admin?error=Complete%20all%20fields");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    data: { full_name: fullName, organization_name: organizationName },
  });
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin?invited=${encodeURIComponent(email)}`);
}
