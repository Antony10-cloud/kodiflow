import { NextResponse } from "next/server";
import { getDarajaAccessToken } from "@/lib/daraja";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }

  try {
    const token = await getDarajaAccessToken();
    return NextResponse.json({
      ok: true,
      environment: process.env.DARAJA_ENVIRONMENT ?? "sandbox",
      expiresIn: token.expiresIn,
      stkConfigured: Boolean(process.env.DARAJA_SHORTCODE && process.env.DARAJA_PASSKEY),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daraja connection failed.";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
