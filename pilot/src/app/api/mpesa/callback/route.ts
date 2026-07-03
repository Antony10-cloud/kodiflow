import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type MetadataItem = { Name: string; Value?: string | number };
type StkPayload = {
  Body?: { stkCallback?: {
    CheckoutRequestID?: string;
    ResultCode?: number;
    ResultDesc?: string;
    CallbackMetadata?: { Item?: MetadataItem[] };
  }};
};

export async function POST(request: Request) {
  let payload: StkPayload;
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
    const { data: event } = await admin.from("mpesa_callback_events").insert({
      event_type: "stk_callback",
      payload,
    }).select("id").single();
    const callback = payload.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) throw new Error("Missing CheckoutRequestID.");

    const { data: stk } = await admin.from("stk_requests")
      .select("*").eq("checkout_request_id", callback.CheckoutRequestID).maybeSingle();
    if (!stk) throw new Error("No matching STK request.");

    await admin.from("stk_requests").update({
      status: callback.ResultCode === 0 ? "completed" : "failed",
      result_code: callback.ResultCode,
      result_description: callback.ResultDesc,
      completed_at: new Date().toISOString(),
    }).eq("id", stk.id);

    if (callback.ResultCode === 0) {
      const metadata = Object.fromEntries(
        (callback.CallbackMetadata?.Item ?? []).map(item => [item.Name, item.Value]),
      );
      const receipt = String(metadata.MpesaReceiptNumber ?? "");
      const amount = Number(metadata.Amount ?? stk.amount);
      const phone = String(metadata.PhoneNumber ?? stk.phone);
      const { data: tenant } = await admin.from("tenants").select("id")
        .eq("organization_id", stk.organization_id)
        .eq("account_reference", stk.account_reference).maybeSingle();

      const { data: payment } = await admin.from("payments").upsert({
        organization_id: stk.organization_id,
        tenant_id: tenant?.id ?? null,
        mpesa_receipt: receipt || null,
        account_reference: stk.account_reference,
        amount,
        phone,
        method: "mpesa_stk",
        status: tenant ? "matched" : "unmatched",
        raw_callback: payload,
      }, { onConflict: "mpesa_receipt" }).select("id").single();

      if (tenant && payment) {
        let remaining = amount;
        const { data: invoices } = await admin.from("invoices").select("id,balance,amount")
          .eq("organization_id", stk.organization_id).eq("tenant_id", tenant.id)
          .gt("balance", 0).order("due_date");
        for (const invoice of invoices ?? []) {
          if (remaining <= 0) break;
          const allocation = Math.min(remaining, Number(invoice.balance));
          const balance = Number(invoice.balance) - allocation;
          await admin.from("payment_allocations").upsert({
            payment_id: payment.id, invoice_id: invoice.id, amount: allocation,
          });
          await admin.from("invoices").update({
            balance,
            status: balance === 0 ? "paid" : "part_paid",
          }).eq("id", invoice.id);
          remaining -= allocation;
        }
        await admin.from("receipts").upsert({
          organization_id: stk.organization_id,
          payment_id: payment.id,
          receipt_number: `KDF-${receipt || payment.id.slice(0, 8).toUpperCase()}`,
        }, { onConflict: "payment_id" });
      }
    }
    if (event) await admin.from("mpesa_callback_events")
      .update({ processed_at: new Date().toISOString() }).eq("id", event.id);
  } catch (error) {
    // Safaricom must always receive an acknowledgement. Until the callback
    // event migration is applied, Vercel logs retain diagnostic visibility.
    console.error("Could not process M-Pesa callback", error);
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
