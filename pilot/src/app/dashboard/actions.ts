"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "@/lib/workspace";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function createProperty(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const name = text(formData, "name");
  const location = text(formData, "location");
  if (!name || !location) return;
  const { error } = await supabase.from("properties").insert({ organization_id: organizationId, name, location });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/properties");
}

export async function createUnit(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const propertyId = text(formData, "property_id");
  const name = text(formData, "name");
  const monthlyRent = Number(formData.get("monthly_rent"));
  if (!propertyId || !name || monthlyRent < 0) return;
  const { error } = await supabase.from("units").insert({
    organization_id: organizationId,
    property_id: propertyId,
    name,
    monthly_rent: monthlyRent,
    status: "vacant",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/properties");
}

export async function createTenant(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const fullName = text(formData, "full_name");
  const phone = text(formData, "phone");
  const unitId = text(formData, "unit_id") || null;
  const reference = `KDF-${crypto.randomUUID().replaceAll("-", "").slice(0, 7).toUpperCase()}`;
  if (!fullName || !phone) return;
  const { error } = await supabase.from("tenants").insert({
    organization_id: organizationId,
    unit_id: unitId,
    full_name: fullName,
    phone,
    email: text(formData, "email") || null,
    account_reference: reference,
  });
  if (error) throw new Error(error.message);
  if (unitId) await supabase.from("units").update({ status: "occupied" }).eq("id", unitId);
  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/properties");
}

export async function createInvoice(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const amount = Number(formData.get("amount"));
  const tenantId = text(formData, "tenant_id");
  if (!tenantId || amount <= 0) return;
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const { error } = await supabase.from("invoices").insert({
    organization_id: organizationId,
    tenant_id: tenantId,
    invoice_number: invoiceNumber,
    kind: text(formData, "kind") || "rent",
    description: text(formData, "description") || null,
    amount,
    balance: amount,
    due_date: text(formData, "due_date"),
    status: "pending",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/invoices");
}

export async function createExpense(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const amount = Number(formData.get("amount"));
  if (amount <= 0) return;
  const { error } = await supabase.from("expenses").insert({
    organization_id: organizationId,
    property_id: text(formData, "property_id") || null,
    category: text(formData, "category"),
    description: text(formData, "description"),
    amount,
    expense_date: text(formData, "expense_date"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/reports");
}

export async function generateMonthlyRent(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const month = text(formData, "month");
  const dueDay = Math.min(28, Math.max(1, Number(formData.get("due_day")) || 5));
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const { data: tenants } = await supabase.from("tenants")
    .select("id,account_reference,unit_id,units(monthly_rent)")
    .eq("organization_id", organizationId).eq("active", true).not("unit_id", "is", null);
  for (const tenant of tenants ?? []) {
    const unit = Array.isArray(tenant.units) ? tenant.units[0] : tenant.units;
    const amount = Number(unit?.monthly_rent ?? 0);
    if (!amount) continue;
    const invoiceNumber = `RENT-${month.replace("-", "")}-${tenant.account_reference}`;
    await supabase.from("invoices").upsert({
      organization_id: organizationId,
      tenant_id: tenant.id,
      invoice_number: invoiceNumber,
      kind: "rent",
      description: `Monthly rent for ${month}`,
      amount,
      balance: amount,
      due_date: `${month}-${String(dueDay).padStart(2, "0")}`,
      status: "pending",
    }, { onConflict: "organization_id,invoice_number", ignoreDuplicates: true });
  }
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/reports");
}

export async function createUtilityCharge(formData: FormData) {
  const { supabase, organizationId } = await getWorkspace();
  const tenantId = text(formData, "tenant_id");
  const type = text(formData, "utility_type");
  const previous = Number(formData.get("previous_reading"));
  const current = Number(formData.get("current_reading"));
  const rate = Number(formData.get("rate"));
  const fixedAmount = Number(formData.get("amount"));
  const amount = fixedAmount > 0 ? fixedAmount : (current - previous) * rate;
  const month = text(formData, "billing_month");
  if (!tenantId || amount <= 0 || !month) return;
  const { data: tenant } = await supabase.from("tenants").select("unit_id,account_reference")
    .eq("id", tenantId).eq("organization_id", organizationId).single();
  const invoiceNumber = `UTIL-${month.replace("-", "")}-${tenant?.account_reference}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
  const { data: invoice, error } = await supabase.from("invoices").insert({
    organization_id: organizationId, tenant_id: tenantId, invoice_number: invoiceNumber,
    kind: type, description: `${type} charge for ${month}`, amount, balance: amount,
    due_date: `${month}-10`, status: "pending",
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("utility_charges").insert({
    organization_id: organizationId, tenant_id: tenantId, unit_id: tenant?.unit_id,
    invoice_id: invoice.id, utility_type: type, previous_reading: previous || null,
    current_reading: current || null, rate: rate || null, amount, billing_month: `${month}-01`,
  });
  revalidatePath("/dashboard/utilities");
  revalidatePath("/dashboard/invoices");
}
