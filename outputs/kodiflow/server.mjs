import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const root = dirname(fileURLToPath(import.meta.url));
const dataDir = join(root, "data");
const dataFile = join(dataDir, "kodiflow.json");
const port = Number(process.env.PORT || 4174);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};
const secret = createHash("sha256")
  .update(process.env.KODIFLOW_SECRET || "kodiflow-local-development-key")
  .digest();

function encrypt(value = "") {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

function decrypt(value = "") {
  if (!value) return "";
  try {
    const [iv, tag, encrypted] = value.split(".").map(part => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", secret, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

async function readDatabase() {
  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    return { landlords: {} };
  }
}

async function writeDatabase(database) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(database, null, 2));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": contentTypes[".json"], "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function publicState(record) {
  if (!record) return null;
  const copy = structuredClone(record);
  if (copy.mpesa) {
    copy.mpesa.consumerKey = decrypt(copy.mpesa.consumerKey) ? "••••••••••••" : "";
    copy.mpesa.consumerSecret = decrypt(copy.mpesa.consumerSecret) ? "••••••••••••" : "";
    copy.mpesa.passkey = decrypt(copy.mpesa.passkey) ? "••••••••••••" : "";
  }
  return copy;
}

function normalizeReference(value = "") {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function accountReference(landlordId, tenant, index) {
  const prefix = createHash("sha1").update(landlordId).digest("hex").slice(0, 3).toUpperCase();
  const unit = normalizeReference(tenant.unit).slice(0, 6) || String(index + 1).padStart(3, "0");
  return `KF${prefix}${unit}`;
}

function prepareState(record, landlordId) {
  record.receipts ||= [];
  record.unmatchedPayments ||= [];
  record.stkRequests ||= [];
  record.units ||= [];
  record.expenses ||= [];
  record.reminders ||= [];
  record.tenants.forEach((tenant, index) => {
    tenant.accountRef ||= accountReference(landlordId, tenant, index);
  });
  return record;
}

function applyPayment(record, payment) {
  const reference = normalizeReference(payment.accountReference);
  const tenant = record.tenants.find(item => normalizeReference(item.accountRef) === reference);
  if (!tenant) {
    payment.status = "Unmatched";
    record.unmatchedPayments.unshift(payment);
    return { matched: false, payment };
  }

  payment.tenant = tenant.name;
  payment.tenantId = tenant.id;
  payment.status = "Matched";
  let remaining = Number(payment.amount);
  const allocations = [];
  const invoices = record.invoices
    .filter(invoice => invoice.tenant === tenant.name && Number(invoice.balance) > 0)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)));
  for (const invoice of invoices) {
    if (remaining <= 0) break;
    const allocated = Math.min(remaining, Number(invoice.balance));
    invoice.balance = Number(invoice.balance) - allocated;
    invoice.status = invoice.balance === 0 ? "Paid" : "Part paid";
    allocations.push({ invoiceId: invoice.id, amount: allocated });
    remaining -= allocated;
  }
  tenant.balance = record.invoices
    .filter(invoice => invoice.tenant === tenant.name)
    .reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  tenant.status = tenant.balance === 0 ? "Paid" : "Part paid";
  payment.allocations = allocations;
  payment.credit = remaining;
  record.payments.unshift(payment);
  const receipt = {
    id: `RCT-${Date.now().toString(36).toUpperCase()}`,
    paymentId: payment.id,
    tenant: tenant.name,
    accountReference: tenant.accountRef,
    amount: payment.amount,
    allocations,
    issuedAt: new Date().toISOString()
  };
  record.receipts.unshift(receipt);
  return { matched: true, payment, receipt };
}

async function darajaToken(mpesa) {
  const key = decrypt(mpesa.consumerKey);
  const secretValue = decrypt(mpesa.consumerSecret);
  if (!key || !secretValue) throw new Error("Daraja credentials are incomplete");
  const base = process.env.DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
  const response = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secretValue}`).toString("base64")}` }
  });
  if (!response.ok) throw new Error("Daraja authentication failed");
  return { base, token: (await response.json()).access_token };
}

async function handleApi(request, response, url) {
  const landlordId = request.headers["x-landlord-id"] || "demo-landlord";
  const database = await readDatabase();
  const current = database.landlords[landlordId];

  if (url.pathname === "/api/health" && request.method === "GET") {
    return sendJson(response, 200, { ok: true, service: "KodiFlow", time: new Date().toISOString() });
  }
  if (url.pathname === "/api/state" && request.method === "GET") {
    return sendJson(response, 200, { state: publicState(current) });
  }
  if (url.pathname === "/api/state" && request.method === "PUT") {
    const incoming = await body(request);
    for (const field of ["properties", "tenants", "payments", "invoices"]) {
      if (!Array.isArray(incoming[field])) return sendJson(response, 400, { error: `Invalid ${field}` });
    }
    prepareState(incoming, landlordId);
    const previousMpesa = current?.mpesa || {};
    const incomingMpesa = incoming.mpesa || {};
    incoming.mpesa = {
      type: incomingMpesa.type === "Till" ? "Till" : "Paybill",
      shortcode: String(incomingMpesa.shortcode || "").replace(/\D/g, "").slice(0, 12),
      consumerKey: incomingMpesa.consumerKey?.startsWith("••")
        ? previousMpesa.consumerKey || ""
        : encrypt(String(incomingMpesa.consumerKey || "").slice(0, 200)),
      consumerSecret: incomingMpesa.consumerSecret?.startsWith("••")
        ? previousMpesa.consumerSecret || ""
        : encrypt(String(incomingMpesa.consumerSecret || "")),
      passkey: incomingMpesa.passkey?.startsWith("••")
        ? previousMpesa.passkey || ""
        : encrypt(String(incomingMpesa.passkey || ""))
    };
    database.landlords[landlordId] = incoming;
    await writeDatabase(database);
    return sendJson(response, 200, { ok: true, state: publicState(incoming) });
  }
  if (url.pathname === "/api/mpesa/stk-push" && request.method === "POST") {
    if (!current) return sendJson(response, 404, { error: "Landlord account not found" });
    const input = await body(request);
    const invoice = current.invoices.find(item => item.id === input.invoiceId);
    const tenant = current.tenants.find(item => item.name === invoice?.tenant);
    if (!invoice || !tenant) return sendJson(response, 404, { error: "Invoice or tenant not found" });
    const phone = String(input.phone || tenant.phone).replace(/\D/g, "").replace(/^0/, "254");
    if (!/^254[17]\d{8}$/.test(phone)) return sendJson(response, 400, { error: "Use a valid Kenyan M-Pesa number" });
    const { base, token } = await darajaToken(current.mpesa);
    const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const shortcode = current.mpesa.shortcode;
    const password = Buffer.from(`${shortcode}${decrypt(current.mpesa.passkey)}${timestamp}`).toString("base64");
    const callbackBase = process.env.PUBLIC_BASE_URL;
    if (!callbackBase) return sendJson(response, 400, { error: "PUBLIC_BASE_URL is required for M-Pesa callbacks" });
    const stkResponse = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: current.mpesa.type === "Till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
        Amount: Math.ceil(Number(input.amount || invoice.balance)),
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: `${callbackBase}/api/mpesa/stk-callback/${encodeURIComponent(landlordId)}`,
        AccountReference: tenant.accountRef,
        TransactionDesc: `Rent ${invoice.id}`
      })
    });
    const result = await stkResponse.json();
    if (!stkResponse.ok || result.ResponseCode !== "0") return sendJson(response, 502, { error: result.errorMessage || result.ResponseDescription || "STK request failed" });
    current.stkRequests ||= [];
    current.stkRequests.unshift({
      id: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      invoiceId: invoice.id,
      tenantId: tenant.id,
      accountReference: tenant.accountRef,
      amount: Math.ceil(Number(input.amount || invoice.balance)),
      phone,
      status: "Pending",
      createdAt: new Date().toISOString()
    });
    await writeDatabase(database);
    return sendJson(response, 200, { ok: true, checkoutRequestId: result.CheckoutRequestID, message: result.CustomerMessage });
  }
  const stkMatch = url.pathname.match(/^\/api\/mpesa\/stk-callback\/([^/]+)$/);
  if (stkMatch && request.method === "POST") {
    const callbackLandlordId = decodeURIComponent(stkMatch[1]);
    const callbackRecord = database.landlords[callbackLandlordId];
    if (!callbackRecord) return sendJson(response, 404, { error: "Landlord not found" });
    const payload = await body(request);
    const callback = payload?.Body?.stkCallback || {};
    const requestRecord = callbackRecord.stkRequests?.find(item => item.id === callback.CheckoutRequestID);
    if (!requestRecord) return sendJson(response, 200, { ResultCode: 0, ResultDesc: "Accepted" });
    requestRecord.status = Number(callback.ResultCode) === 0 ? "Completed" : "Failed";
    requestRecord.resultDescription = callback.ResultDesc;
    if (Number(callback.ResultCode) === 0) {
      const items = Object.fromEntries((callback.CallbackMetadata?.Item || []).map(item => [item.Name, item.Value]));
      applyPayment(callbackRecord, {
        id: items.MpesaReceiptNumber,
        accountReference: requestRecord.accountReference,
        amount: Number(items.Amount || requestRecord.amount),
        phone: String(items.PhoneNumber || requestRecord.phone),
        method: "M-Pesa STK",
        date: new Date().toLocaleDateString("en-GB"),
        receivedAt: new Date().toISOString()
      });
    }
    await writeDatabase(database);
    return sendJson(response, 200, { ResultCode: 0, ResultDesc: "Accepted" });
  }
  const c2bMatch = url.pathname.match(/^\/api\/mpesa\/c2b-callback\/([^/]+)$/);
  if (c2bMatch && request.method === "POST") {
    const callbackLandlordId = decodeURIComponent(c2bMatch[1]);
    const callbackRecord = database.landlords[callbackLandlordId];
    if (!callbackRecord) return sendJson(response, 404, { error: "Landlord not found" });
    const payload = await body(request);
    const outcome = applyPayment(callbackRecord, {
      id: payload.TransID,
      accountReference: payload.BillRefNumber,
      amount: Number(payload.TransAmount),
      phone: payload.MSISDN,
      name: [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(" "),
      method: "M-Pesa Paybill",
      date: payload.TransTime,
      receivedAt: new Date().toISOString()
    });
    await writeDatabase(database);
    return sendJson(response, 200, { ResultCode: 0, ResultDesc: outcome.matched ? "Accepted and matched" : "Accepted for reconciliation" });
  }
  const reconcileMatch = url.pathname.match(/^\/api\/payments\/reconcile\/([^/]+)$/);
  if (reconcileMatch && request.method === "POST") {
    if (!current) return sendJson(response, 404, { error: "Landlord not found" });
    const input = await body(request);
    const index = current.unmatchedPayments?.findIndex(item => item.id === decodeURIComponent(reconcileMatch[1])) ?? -1;
    const tenant = current.tenants.find(item => String(item.id) === String(input.tenantId));
    if (index < 0 || !tenant) return sendJson(response, 404, { error: "Payment or tenant not found" });
    const [payment] = current.unmatchedPayments.splice(index, 1);
    payment.accountReference = tenant.accountRef;
    const outcome = applyPayment(current, payment);
    await writeDatabase(database);
    return sendJson(response, 200, { ok: true, receipt: outcome.receipt, state: publicState(current) });
  }
  return sendJson(response, 404, { error: "API route not found" });
}

async function handleStatic(request, response, url) {
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const file = normalize(join(root, requested));
  if (!file.startsWith(root) || file.includes(`${join(root, "data")}`)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, { "Content-Type": contentTypes[extname(file)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else await handleStatic(request, response, url);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Unexpected server error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`KodiFlow is running at http://127.0.0.1:${port}`);
});
