import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/workspace";
import { sendSms } from "@/lib/notifications";

export async function POST(request: Request) {
  const { supabase, organizationId } = await getWorkspace();
  const isForm = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ||
    request.headers.get("content-type")?.includes("multipart/form-data");
  const body = isForm ? await request.formData() : await request.json();
  const recipient = String(isForm ? body.get("recipient") : body.recipient ?? "").trim();
  const respond = (ok: boolean, message: string, status = ok ? 200 : 400) => {
    if (isForm) {
      const url = new URL("/dashboard/notifications", request.url);
      url.searchParams.set("sms_ok", ok ? "1" : "0");
      url.searchParams.set("sms_result", message);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok, message }, { status });
  };
  if (!recipient) {
    return respond(false, "Enter the simulator phone number.");
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
    return respond(false, logError?.message ?? "Could not create the SMS test.", 500);
  }

  try {
    const result = await sendSms(recipient, message);
    await supabase.from("notification_messages").update({
      status: "sent",
      provider_message_id: result.providerMessageId ?? null,
      provider_status: result.providerStatus,
      sent_at: new Date().toISOString(),
    }).eq("id", log.id).eq("organization_id", organizationId);
    return respond(true, `Africa's Talking accepted the SMS: ${result.providerStatus}.`);
  } catch (error) {
    const failure = error instanceof Error ? error.message : "SMS test failed.";
    await supabase.from("notification_messages").update({
      status: "failed",
      error_message: failure,
    }).eq("id", log.id).eq("organization_id", organizationId);
    return respond(false, failure, 502);
  }
}
