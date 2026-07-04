import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/workspace";
import { sendSms } from "@/lib/notifications";

export async function POST(request: Request) {
  const { supabase, organizationId } = await getWorkspace();
  const body = await request.json();
  const recipient = String(body.recipient ?? "").trim();
  if (!recipient) {
    return NextResponse.json({ ok: false, message: "Enter the simulator phone number." }, { status: 400 });
  }

  const message = "KodiFlow SMS test successful. Tenant rent reminders are ready for this landlord workspace.";
  const { data: log, error: logError } = await supabase.from("notification_messages").insert({
    organization_id: organizationId,
    channel: "sms",
    recipient,
    template_key: "provider_test",
    body: message,
    status: "queued",
  }).select("id").single();
  if (logError || !log) {
    return NextResponse.json({
      ok: false,
      message: logError?.message ?? "Could not create the SMS test.",
    }, { status: 500 });
  }

  try {
    const result = await sendSms(recipient, message);
    await supabase.from("notification_messages").update({
      status: "sent",
      provider_message_id: result.providerMessageId ?? null,
      provider_status: result.providerStatus,
      sent_at: new Date().toISOString(),
    }).eq("id", log.id).eq("organization_id", organizationId);
    return NextResponse.json({
      ok: true,
      message: `Africa's Talking accepted the SMS: ${result.providerStatus}.`,
    });
  } catch (error) {
    const failure = error instanceof Error ? error.message : "SMS test failed.";
    await supabase.from("notification_messages").update({
      status: "failed",
      error_message: failure,
    }).eq("id", log.id).eq("organization_id", organizationId);
    return NextResponse.json({ ok: false, message: failure }, { status: 502 });
  }
}
