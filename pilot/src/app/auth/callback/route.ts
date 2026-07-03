import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: membership } = await supabase.from("memberships")
        .select("role").eq("user_id", user.id).limit(1).maybeSingle();
      if (membership?.role === "platform_admin") {
        return NextResponse.redirect(new URL("/admin", url.origin));
      }
    }
  }
  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
