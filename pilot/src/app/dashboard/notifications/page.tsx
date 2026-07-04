import { getWorkspace } from "@/lib/workspace";
import { notificationConfiguration } from "@/lib/notifications";
import { saveNotificationPreferences, sendRentReminder } from "./actions";
import { TestSmsForm } from "./test-sms-form";

const money = (value: number) => new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
}).format(value);

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sms_result?: string; sms_ok?: string }>;
}) {
  const params = await searchParams;
  const { supabase, organizationId } = await getWorkspace();
  const [{ data: preferences }, { data: invoices }, { data: messages }] = await Promise.all([
    supabase.from("notification_preferences").select("*").eq("organization_id", organizationId).maybeSingle(),
    supabase.from("invoices")
      .select("id,invoice_number,balance,due_date,status,tenants(full_name,phone,account_reference)")
      .eq("organization_id", organizationId)
      .gt("balance", 0)
      .order("due_date"),
    supabase.from("notification_messages")
      .select("id,channel,recipient,status,provider_status,error_message,created_at,tenants(full_name)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const configured = notificationConfiguration();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TENANT COMMUNICATIONS</p>
          <h1>SMS & WhatsApp</h1>
          <p className="muted">Send rent reminders and keep a delivery audit trail for every tenant.</p>
        </div>
        <span className="live-badge">Pilot messaging</span>
      </div>

      <div className="settings-grid">
        <article>
          <h2>Channel readiness</h2>
          <dl>
            <div><dt>Africa&apos;s Talking SMS</dt><dd>{configured.sms ? "Ready" : "Credentials needed"}</dd></div>
            <div><dt>WhatsApp Cloud API</dt><dd>{configured.whatsapp ? "Ready" : "Credentials needed"}</dd></div>
            <div><dt>Tenant phone format</dt><dd>Kenya +254 normalized</dd></div>
          </dl>
        </article>
        <article>
          <h2>Reminder policy</h2>
          <form action={saveNotificationPreferences} className="settings-form">
            <label><input name="sms_enabled" type="checkbox" defaultChecked={preferences?.sms_enabled ?? true} /> Enable SMS</label>
            <label><input name="whatsapp_enabled" type="checkbox" defaultChecked={preferences?.whatsapp_enabled ?? false} /> Enable WhatsApp</label>
            <label>Days before due<input name="days_before_due" type="number" min="0" max="30" defaultValue={preferences?.days_before_due ?? 3} /></label>
            <label>Repeat overdue after days<input name="overdue_frequency_days" type="number" min="1" max="30" defaultValue={preferences?.overdue_frequency_days ?? 7} /></label>
            <button>Save reminder policy</button>
          </form>
        </article>
      </div>

      <div className="management-grid">
        <details>
          <summary>Test Africa&apos;s Talking SMS</summary>
          <TestSmsForm
            disabled={!configured.sms}
            result={params.sms_result}
            succeeded={params.sms_ok === "1"}
          />
        </details>
      </div>

      <div className="page-heading spaced">
        <div><h2>Outstanding invoices</h2><p className="muted">Manual sending is enabled first; scheduled automation follows after provider activation.</p></div>
      </div>
      {!invoices?.length ? <div className="empty-state"><strong>No outstanding invoices</strong><span>Reminders will appear when an invoice has a balance.</span></div> :
        <div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Invoice</th><th>Balance</th><th>Due</th><th>Send reminder</th></tr></thead><tbody>
          {invoices.map((invoice: any) => {
            const tenant = Array.isArray(invoice.tenants) ? invoice.tenants[0] : invoice.tenants;
            return <tr key={invoice.id}>
              <td><strong>{tenant?.full_name ?? "Unassigned"}</strong><br /><small>{tenant?.phone ?? "No phone"}</small></td>
              <td><code>{invoice.invoice_number}</code></td>
              <td>{money(Number(invoice.balance))}</td>
              <td>{new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString("en-KE")}</td>
              <td><form action={sendRentReminder} className="row-actions"><input type="hidden" name="invoice_id" value={invoice.id} /><button name="channel" value="sms" disabled={!configured.sms || !tenant?.phone}>SMS</button><button name="channel" value="whatsapp" disabled={!configured.whatsapp || !tenant?.phone}>WhatsApp</button></form></td>
            </tr>;
          })}
        </tbody></table></div>}

      <div className="page-heading spaced"><div><h2>Delivery log</h2><p className="muted">Provider IDs and failures are retained for reconciliation and support.</p></div></div>
      {!messages?.length ? <div className="empty-state"><strong>No messages sent yet</strong><span>Your first SMS or WhatsApp reminder will be recorded here.</span></div> :
        <div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Time</th></tr></thead><tbody>
          {messages.map((message: any) => {
            const tenant = Array.isArray(message.tenants) ? message.tenants[0] : message.tenants;
            return <tr key={message.id}><td>{tenant?.full_name ?? "Tenant"}</td><td>{message.channel.toUpperCase()}</td><td>{message.recipient}</td><td><span className={`status status-${message.status === "failed" ? "overdue" : "active"}`}>{message.error_message ?? message.provider_status ?? message.status}</span></td><td>{new Date(message.created_at).toLocaleString("en-KE")}</td></tr>;
          })}
        </tbody></table></div>}
    </>
  );
}
