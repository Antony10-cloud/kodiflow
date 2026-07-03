import { DarajaStatus } from "./daraja-status";
import { invoices, money, payments, properties } from "@/lib/pilot-data";

export default function DashboardPage() {
  const billed = invoices.reduce((sum, item) => sum + item.amount, 0);
  const outstanding = invoices.reduce((sum, item) => sum + item.balance, 0);
  const collected = payments.filter(item => item.status === "Matched").reduce((sum, item) => sum + item.amount, 0);
  const occupied = properties.reduce((sum, item) => sum + item.occupied, 0);
  const units = properties.reduce((sum, item) => sum + item.units, 0);

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">LANDLORD WORKSPACE</p><h1>Good afternoon, Antony</h1><p className="muted">Your July rent position at a glance.</p></div>
        <span className="sample-badge">Sample pilot data</span>
      </div>
      <div className="pilot-grid">
        {[
          ["Collected this month", money(collected)],
          ["Outstanding", money(outstanding)],
          ["Occupancy", `${Math.round(occupied / units * 100)}%`],
          ["July billed", money(billed)],
        ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>Across {properties.length} properties</small></article>)}
      </div>
      <div className="pilot-ready">
        <span>✓</span><div><h2>Your pilot workspace is ready</h2><p>Explore the sample portfolio, invoices and M-Pesa reconciliation flow while live account setup continues.</p></div>
      </div>
      <DarajaStatus />
    </>
  );
}
