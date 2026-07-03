import { notFound } from "next/navigation";
import { expenses, invoices, money, payments, properties, tenants } from "@/lib/pilot-data";
import { PasswordForm } from "./password-form";

const titles: Record<string, [string, string]> = {
  properties: ["Properties & units", "Manage buildings, occupancy and monthly rent."],
  tenants: ["Tenants", "Tenant contacts, units, references and balances."],
  invoices: ["Rent invoices", "Track charges, due dates and outstanding balances."],
  payments: ["M-Pesa reconciliation", "Match incoming transactions to tenants and invoices."],
  receipts: ["Receipts", "Receipts issued automatically from matched payments."],
  utilities: ["Utility billing", "Water and electricity charges awaiting the monthly invoice run."],
  expenses: ["Expenses", "Operating costs across the property portfolio."],
  reports: ["Reports", "Portfolio performance and collection insights."],
  admin: ["Platform administration", "Pilot landlords, access and system health."],
  settings: ["Account settings", "Security and M-Pesa configuration."],
};

function Status({ children }: { children: React.ReactNode }) {
  return <span className={`status status-${String(children).toLowerCase().replace(" ", "-")}`}>{children}</span>;
}

function Table({ headings, rows }: { headings: string[]; rows: React.ReactNode[][] }) {
  return <div className="table-wrap"><table><thead><tr>{headings.map(item => <th key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!titles[section]) notFound();
  const [title, description] = titles[section];

  let content: React.ReactNode;
  if (section === "properties") content = <div className="property-cards">{properties.map(item => <article key={item.name}><div><h3>{item.name}</h3><p>{item.location}</p></div><strong>{item.occupied}/{item.units}</strong><span>units occupied</span><footer>{money(item.rent)} potential monthly rent</footer></article>)}</div>;
  else if (section === "tenants") content = <Table headings={["Tenant", "Unit", "Phone", "Account reference", "Balance"]} rows={tenants.map(item => [<strong key="n">{item.name}</strong>, item.unit, item.phone, <code key="r">{item.reference}</code>, money(item.balance)])} />;
  else if (section === "invoices") content = <Table headings={["Invoice", "Tenant", "Type", "Due", "Amount", "Balance", "Status"]} rows={invoices.map(item => [<code key="n">{item.number}</code>, item.tenant, item.kind, item.due, money(item.amount), money(item.balance), <Status key="s">{item.status}</Status>])} />;
  else if (section === "payments") content = <><div className="notice warning">1 payment needs manual reconciliation. Select it to assign the correct tenant and invoice.</div><Table headings={["M-Pesa receipt", "Tenant", "Reference", "Amount", "Received", "Status"]} rows={payments.map(item => [<code key="r">{item.receipt}</code>, item.tenant, item.reference, money(item.amount), item.time, <Status key="s">{item.status}</Status>])} /></>;
  else if (section === "receipts") content = <Table headings={["Receipt", "M-Pesa receipt", "Tenant", "Amount", "Issued"]} rows={payments.filter(item => item.status === "Matched").map((item, index) => [`KDF-RCP-${1041 + index}`, item.receipt, item.tenant, money(item.amount), item.time])} />;
  else if (section === "utilities") content = <Table headings={["Unit", "Tenant", "Utility", "Previous", "Current", "Charge", "Status"]} rows={[["Greenview A4", "Grace Wanjiku", "Water", "21 m³", "25 m³", money(800), <Status key="s">Pending</Status>], ["Mugo Court 3", "Faith Njeri", "Water", "14 m³", "19 m³", money(1000), <Status key="s">Pending</Status>], ["Coastline S5", "Ali Hassan", "Electricity", "Sub-meter", "Sub-meter", money(1200), <Status key="s">Invoiced</Status>]]} />;
  else if (section === "expenses") content = <Table headings={["Date", "Property", "Category", "Description", "Amount"]} rows={expenses.map(item => [item.date, item.property, item.category, item.description, money(item.amount)])} />;
  else if (section === "reports") content = <div className="report-grid"><article><span>Collection rate</span><strong>72%</strong><div className="progress"><i style={{ width: "72%" }} /></div></article><article><span>Gross monthly potential</span><strong>{money(properties.reduce((sum, item) => sum + item.rent, 0))}</strong><small>26 total units</small></article><article><span>Operating expenses</span><strong>{money(expenses.reduce((sum, item) => sum + item.amount, 0))}</strong><small>Current sample period</small></article><article><span>Unmatched M-Pesa</span><strong>{money(8000)}</strong><small>1 transaction</small></article></div>;
  else if (section === "admin") content = <><div className="admin-stats"><article><strong>1</strong><span>Pilot landlord</span></article><article><strong>1</strong><span>Active user</span></article><article><strong>26</strong><span>Units managed</span></article><article><strong>Healthy</strong><span>Database status</span></article></div><Table headings={["Organization", "Owner", "Plan", "Units", "Status"]} rows={[["KodiFlow Sample Portfolio", "Antony Mugo", "Private pilot", "26", <Status key="s">Active</Status>]]} /></>;
  else content = <div className="settings-grid"><article><h2>Set your password</h2><p>After signing in by magic link, create a password for faster future access.</p><PasswordForm /></article><article><h2>Daraja configuration</h2><p>Consumer credentials are stored securely in Vercel and never sent to the browser.</p><dl><div><dt>Environment</dt><dd>Sandbox</dd></div><div><dt>Consumer credentials</dt><dd>Configured</dd></div><div><dt>Shortcode & passkey</dt><dd>Required for STK Push</dd></div></dl></article></div>;

  return <><div className="page-heading"><div><p className="eyebrow">KODIFLOW OPERATIONS</p><h1>{title}</h1><p className="muted">{description}</p></div><div className="heading-actions"><span className="sample-badge">Sample pilot data</span><button>+ Add new</button></div></div>{content}</>;
}
