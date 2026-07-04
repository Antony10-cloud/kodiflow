"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TestSmsForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/notifications/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: form.get("recipient") }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      setMessage(result.message ?? (response.ok ? "SMS accepted." : "SMS failed."));
      router.refresh();
    } catch {
      setMessage("Could not reach the SMS test service. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="inline-form">
      <label>
        Sandbox simulator number
        <input name="recipient" type="tel" placeholder="+2547XXXXXXXX" required />
      </label>
      <button disabled={disabled || sending}>
        {sending ? "Sending…" : "Send test SMS"}
      </button>
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <small>Sandbox messages appear in the Africa&apos;s Talking phone simulator, not on a real handset.</small>
    </form>
  );
}
