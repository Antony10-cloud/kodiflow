import { NextResponse } from "next/server";
import { initiateStkPush } from "@/lib/daraja";
import { getWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const { supabase, organizationId } = await getWorkspace();
  const body = await request.json();
  const phone = String(body.phone ?? "").replace(/\D/g, "").replace(/^0/, "254");
  const amount = Number(body.amount);
  const accountReference = String(body.accountReference ?? "").trim().toUpperCase();
  if (!/^254[17]\d{8}$/.test(phone) || !Number.isInteger(amount) || amount < 1 || !accountReference) {
    return NextResponse.json({ ok: false, message: "Enter a valid phone, whole amount and account reference." }, { status: 400 });
  }
  try {
    const result = await initiateStkPush({ phone, amount, accountReference });
    await supabase.from("stk_requests").insert({
      organization_id: organizationId,
      merchant_request_id: result.MerchantRequestID,
      checkout_request_id: result.CheckoutRequestID,
      account_reference: accountReference,
      phone,
      amount,
      status: "pending",
    });
    return NextResponse.json({ ok: true, message: result.CustomerMessage, checkoutRequestId: result.CheckoutRequestID });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "STK Push failed." }, { status: 502 });
  }
}
