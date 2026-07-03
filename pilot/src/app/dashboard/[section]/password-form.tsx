"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (password.length < 8 || password !== confirmation) {
      setMessage(password.length < 8 ? "Use at least 8 characters." : "The passwords do not match.");
      setSaving(false);
      return;
    }
    const { error } = await createClient().auth.updateUser({ password });
    setMessage(error ? error.message : "Password saved. You can now use email and password.");
    setSaving(false);
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <label>New password<input name="password" type="password" minLength={8} required /></label>
      <label>Confirm password<input name="confirmation" type="password" minLength={8} required /></label>
      <button disabled={saving}>{saving ? "Saving…" : "Set password"}</button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
}
