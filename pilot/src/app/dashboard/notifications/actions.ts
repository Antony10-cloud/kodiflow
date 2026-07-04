"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "@/lib/workspace";
import {
  rentReminderMessage,
  sendSms,
  sendWhatsAppTemplate,
} from "@/lib/notifications";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function saveNotificationPreferences(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const { error } = await supabase.from("notification_preferences").upsert({
    organization_id: organizationId,
    sms_enabled: formData.get("sms_enabled") === "on",
    whatsapp_enabled: formData.get("whatsapp_enabled") === "on",
    days_before_due: Math.min(30, Math.max(0, Number(formData.get("days_before_due")) || 3)),
    overdue_frequency_days: Math.min(30, Math.max(1, Number(formData.get("overdue_frequency_days")) || 7)),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/notifications");
}

export async function sendRentReminder(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const invoiceId = text(formData, "invoice_id");
  const channel = text(formData, "channel");
  if (!invoiceId || !["sms", "whatsapp"].includes(channel)) return;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id,tenant_id,balance,due_date,invoice_number,tenants(full_name,phone,account_reference,units(name))")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .single();
  if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? "Invoice not found.");

  const tenant = Array.isArray(invoice.tenants) ? invoice.tenants[0] : invoice.tenants;
  if (!tenant?.phone) throw new Error("The tenant does not have a phone number.");
  const unit = Array.isArray(tenant.units) ? tenant.units[0] : tenant.units;
  const { data: mpesa } = await supabase.from("mpesa_connections")
    .select("account_type,shortcode")
    .eq("organization_id", organizationId)
    .maybeSingle();
  const reminder = rentReminderMessage({
    tenantName: tenant.full_name,
    amount: Number(invoice.balance),
    dueDate: invoice.due_date,
    accountReference: tenant.account_reference,
    unitName: unit?.name,
    paymentType: mpesa?.account_type,
    shortcode: mpesa?.shortcode,
  });

  const { data: log, error: logError } = await supabase.from("notification_messages").insert({
    organization_id: organizationId,
    tenant_id: invoice.tenant_id,
    invoice_id: invoice.id,
    channel,
    recipient: tenant.phone,
    template_key: "rent_reminder",
    body: reminder.body,
    status: "queued",
  }).select("id").single();
  if (logError || !log) throw new Error(logError?.message ?? "Could not log reminder.");

  try {
    const result = channel === "sms"
      ? await sendSms(tenant.phone, reminder.body)
      : await sendWhatsAppTemplate({
          recipient: tenant.phone,
          tenantName: tenant.full_name,
          unitName: unit?.name ?? "your unit",
          amount: reminder.amount,
          dueDate: reminder.dueDate,
          paymentInstructions: mpesa?.shortcode
            ? `${mpesa.account_type === "till" ? "Till" : "Paybill"} ${mpesa.shortcode}`
            : "your usual M-Pesa method",
          accountReference: tenant.account_reference,
        });
    await supabase.from("notification_messages").update({
      status: "sent",
      provider_message_id: result.providerMessageId ?? null,
      provider_status: result.providerStatus,
      sent_at: new Date().toISOString(),
    }).eq("id", log.id).eq("organization_id", organizationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Message delivery failed.";
    await supabase.from("notification_messages").update({
      status: "failed",
      error_message: message,
    }).eq("id", log.id).eq("organization_id", organizationId);
  }
  revalidatePath("/dashboard/notifications");
}

export async function sendTestSms(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const recipient = text(formData, "recipient");
  if (!recipient) return;
  const body = "KodiFlow SMS test successful. Tenant rent reminders are ready for this landlord workspace.";
  const { data: log, error: logError } = await supabase.from("notification_messages").insert({
    organization_id: organizationId,
    channel: "sms",
    recipient,
    template_key: "provider_test",
    body,
    status: "queued",
  }).select("id").single();
  if (logError || !log) throw new Error(logError?.message ?? "Could not create the SMS test.");

  try {
    const result = await sendSms(recipient, body);
    await supabase.from("notification_messages").update({
      status: "sent",
      provider_message_id: result.providerMessageId ?? null,
      provider_status: result.providerStatus,
      sent_at: new Date().toISOString(),
    }).eq("id", log.id).eq("organization_id", organizationId);
  } catch (error) {
    await supabase.from("notification_messages").update({
      status: "failed",
      error_message: error instanceof Error ? error.message : "SMS test failed.",
    }).eq("id", log.id).eq("organization_id", organizationId);
  }
  revalidatePath("/dashboard/notifications");
}
