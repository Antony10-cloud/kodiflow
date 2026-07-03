import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships").select("role")
    .eq("user_id", user.id).eq("role", "platform_admin").maybeSingle();
  if (!membership) redirect("/dashboard");
  return { supabase, user };
}
