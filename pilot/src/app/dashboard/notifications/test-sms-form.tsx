export function TestSmsForm({
  disabled,
  result,
  succeeded,
}: {
  disabled: boolean;
  result?: string;
  succeeded?: boolean;
}) {
  return (
    <form action="/api/notifications/test-sms" method="post" className="inline-form">
      <label>
        Sandbox simulator number
        <input name="recipient" type="tel" placeholder="+2547XXXXXXXX" required />
      </label>
      <button disabled={disabled}>Send test SMS</button>
      {result ? (
        <p className={`form-message ${succeeded ? "status-active" : "status-overdue"}`} role="status">
          {result}
        </p>
      ) : null}
      <small>Sandbox messages appear in the Africa&apos;s Talking phone simulator, not on a real handset.</small>
    </form>
  );
}
