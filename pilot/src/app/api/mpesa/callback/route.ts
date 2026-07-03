import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    await admin.from("mpesa_callback_events").insert({
      event_type: "stk_callback",
      payload,
    });
  } catch (error) {
    // Safaricom must always receive an acknowledgement. Until the callback
    // event migration is applied, Vercel logs retain diagnostic visibility.
    console.error("Could not persist M-Pesa callback", error);
  }

  return NextResponse.json({
    ResultCode: 0,
    ResultDesc: "Callback accepted by KodiFlow",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "KodiFlow M-Pesa callback",
  });
}
