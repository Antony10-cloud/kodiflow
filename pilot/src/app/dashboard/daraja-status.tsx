"use client";

import { useState } from "react";

type Result = {
  ok: boolean;
  message?: string;
  environment?: string;
  stkConfigured?: boolean;
};

export function DarajaStatus() {
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);

  async function testConnection() {
    setChecking(true);
    setResult(null);
    try {
      const response = await fetch("/api/daraja/health", { cache: "no-store" });
      setResult((await response.json()) as Result);
    } catch {
      setResult({ ok: false, message: "Could not reach the KodiFlow server." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="daraja-card">
      <div>
        <p className="eyebrow">M-PESA DARAJA</p>
        <h2>Sandbox connection</h2>
        <p className="muted">Test the server connection without revealing your credentials.</p>
      </div>
      <button onClick={testConnection} disabled={checking}>
        {checking ? "Connecting…" : "Test Daraja connection"}
      </button>
      {result && (
        <div className={result.ok ? "connection-ok" : "connection-error"}>
          <strong>{result.ok ? "Connected to Safaricom" : "Connection failed"}</strong>
          <span>
            {result.ok
              ? `${result.environment} access token received. ${
                  result.stkConfigured
                    ? "STK Push is configured."
                    : "Add the sandbox shortcode and passkey next."
                }`
              : result.message}
          </span>
        </div>
      )}
    </section>
  );
}
