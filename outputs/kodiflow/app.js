const seed = {
  properties: [
    { id: 1, name: "Greenview Apartments", location: "Kilimani, Nairobi", units: 12, occupied: 11, rent: 28000 },
    { id: 2, name: "Sunrise Court", location: "Ruaka, Kiambu", units: 8, occupied: 7, rent: 22000 },
    { id: 3, name: "Maua Residences", location: "South B, Nairobi", units: 6, occupied: 5, rent: 25000 }
  ],
  tenants: [
    { id: 1, name: "Faith Wanjiku", phone: "0712 345 678", property: "Greenview Apartments", unit: "A-04", balance: 0, status: "Paid" },
    { id: 2, name: "Brian Otieno", phone: "0724 691 820", property: "Sunrise Court", unit: "B-02", balance: 8500, status: "Part paid" },
    { id: 3, name: "Mercy Njeri", phone: "0701 446 112", property: "Maua Residences", unit: "C-01", balance: 25000, status: "Overdue" },
    { id: 4, name: "Kevin Mutua", phone: "0799 020 315", property: "Greenview Apartments", unit: "A-08", balance: 0, status: "Paid" }
  ],
  payments: [
    { id: "QHG8X2K9L", tenant: "Faith Wanjiku", date: "03 Jul 2026", amount: 28000, method: "M-Pesa", status: "Matched" },
    { id: "QHF7P1M4Z", tenant: "Brian Otieno", date: "02 Jul 2026", amount: 13500, method: "M-Pesa", status: "Matched" },
    { id: "CASH-018", tenant: "Kevin Mutua", date: "01 Jul 2026", amount: 28000, method: "Cash", status: "Recorded" }
  ],
  invoices: [
    { id: "INV-0726-041", tenant: "Faith Wanjiku", due: "05 Jul 2026", amount: 28000, balance: 0, status: "Paid" },
    { id: "INV-0726-042", tenant: "Brian Otieno", due: "05 Jul 2026", amount: 22000, balance: 8500, status: "Part paid" },
    { id: "INV-0726-043", tenant: "Mercy Njeri", due: "01 Jul 2026", amount: 25000, balance: 25000, status: "Overdue" }
  ],
  units: [
    { id: 1, property: "Greenview Apartments", name: "A-04", rent: 28000, status: "Occupied" },
    { id: 2, property: "Greenview Apartments", name: "A-08", rent: 28000, status: "Occupied" },
    { id: 3, property: "Sunrise Court", name: "B-02", rent: 22000, status: "Occupied" },
    { id: 4, property: "Maua Residences", name: "C-06", rent: 25000, status: "Vacant" }
  ],
  expenses: [
    { id: 1, property: "Greenview Apartments", category: "Repairs", description: "Gate motor service", amount: 6500, date: "02 Jul 2026" }
  ],
  reminders: [],
  receipts: [],
  unmatchedPayments: [],
  stkRequests: [],
  mpesa: { type: "Paybill", shortcode: "", consumerKey: "", consumerSecret: "", passkey: "" }
};

const stored = localStorage.getItem("kodiflow-data");
let state = stored ? JSON.parse(stored) : structuredClone(seed);
let serverConnected = false;
const allowedPages = new Set(["dashboard", "properties", "units", "tenants", "invoices", "payments", "utilities", "expenses", "reminders", "reports", "mpesa", "admin"]);
const requestedPage = new URLSearchParams(location.search).get("page");
let currentPage = allowedPages.has(requestedPage) ? requestedPage : "dashboard";
let demoRole = sessionStorage.getItem("kodiflow-role") || "";
let selectedDemoRole = requestedPage === "admin" ? "admin" : "landlord";
let tourIndex = 0;

const app = document.querySelector("#app");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalForm = document.querySelector("#modalForm");
const modalTitle = document.querySelector("#modalTitle");
const modalDescription = document.querySelector("#modalDescription");
const money = value => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
const initials = name => name.split(" ").map(word => word[0]).slice(0, 2).join("");
const statusClass = status => status === "Paid" || status === "Matched" || status === "Recorded" ? "" : status === "Overdue" ? "overdue" : "pending";

async function save() {
  localStorage.setItem("kodiflow-data", JSON.stringify(state));
  try {
    const response = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Landlord-Id": "demo-landlord" },
      body: JSON.stringify(state)
    });
    if (!response.ok) throw new Error("Save failed");
    const result = await response.json();
    state = result.state;
    localStorage.setItem("kodiflow-data", JSON.stringify(state));
    serverConnected = true;
  } catch {
    serverConnected = false;
  }
}

async function loadServerState() {
  try {
    const response = await fetch("/api/state", { headers: { "X-Landlord-Id": "demo-landlord" } });
    if (!response.ok) throw new Error("Server unavailable");
    const result = await response.json();
    serverConnected = true;
    if (result.state) {
      state = result.state;
      localStorage.setItem("kodiflow-data", JSON.stringify(state));
    } else {
      await save();
    }
  } catch {
    serverConnected = false;
  }
}

function heading(title, subtitle, action = "") {
  return `<div class="page-heading">
    <div><h1>${title}</h1><p>${subtitle}</p></div>
    ${action || `<span class="date-pill">${serverConnected ? "● Saved securely" : "○ Browser demo mode"}</span>`}
  </div>`;
}

function dashboard() {
  const totalUnits = state.properties.reduce((sum, property) => sum + Number(property.units), 0);
  const occupied = state.properties.reduce((sum, property) => sum + Number(property.occupied), 0);
  const collected = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = state.tenants.reduce((sum, tenant) => sum + Number(tenant.balance), 0);
  return `${heading("Good afternoon, Antony", "Here’s what’s happening across your properties.")}
    <div class="stats-grid">
      ${stat("Total collected", money(collected), "↗", "12.4% from last month", true)}
      ${stat("Outstanding rent", money(outstanding), "!", `${state.tenants.filter(t => t.balance > 0).length} tenants have a balance`, false, true)}
      ${stat("Occupancy rate", `${Math.round(occupied / totalUnits * 100)}%`, "⌂", `${occupied} of ${totalUnits} units occupied`, false)}
      ${stat("Total properties", state.properties.length, "▦", `${totalUnits} units in your portfolio`, false)}
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-header"><h3>Rent collection</h3><button>Last 6 months⌄</button></div>
        <div class="chart">
          <div class="chart-summary"><strong>${money(collected)}</strong><span>↗ 12.4%</span></div>
          <div class="chart-area">
            <svg class="chart-svg" viewBox="0 0 600 150" preserveAspectRatio="none" aria-label="Rent collection chart">
              <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18a66a" stop-opacity=".24"/><stop offset="1" stop-color="#18a66a" stop-opacity="0"/></linearGradient></defs>
              <path d="M0,120 C50,115 70,100 110,103 S175,72 220,84 S285,48 330,66 S390,34 435,48 S525,20 600,27 L600,150 L0,150Z" fill="url(#fill)"/>
              <path d="M0,120 C50,115 70,100 110,103 S175,72 220,84 S285,48 330,66 S390,34 435,48 S525,20 600,27" fill="none" stroke="#18a66a" stroke-width="3"/>
            </svg>
          </div>
          <div class="chart-labels"><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h3>Unit occupancy</h3><button data-page-link="properties">View units</button></div>
        <div class="occupancy">
          <div class="donut"><div class="donut-label"><strong>${Math.round(occupied / totalUnits * 100)}%</strong><span>Occupied</span></div></div>
          <div class="legend"><span><i></i>${occupied} occupied</span><span><i></i>${totalUnits - occupied} vacant</span></div>
        </div>
      </section>
    </div>
    <section class="panel table-panel">
      <div class="panel-header"><h3>Recent payments</h3><button data-page-link="payments">View all payments →</button></div>
      ${paymentsTable(state.payments.slice(0, 4))}
    </section>`;
}

function stat(label, value, icon, note, positive, warning = false) {
  return `<article class="stat-card"><div class="stat-card-top"><span>${label}</span><span class="stat-icon">${icon}</span></div>
    <h2>${value}</h2><span class="trend ${warning ? "warn" : ""}">${positive ? "<strong>↗ " : warning ? "<strong>● " : ""}${note}${positive || warning ? "</strong>" : ""}</span></article>`;
}

function paymentsTable(items) {
  return `<table><thead><tr><th>Tenant</th><th>Reference</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>${items.map(p => `<tr><td><div class="person"><span class="person-avatar">${initials(p.tenant)}</span><strong>${p.tenant}</strong></div></td><td>${p.id}</td><td>${p.date}</td><td>${p.method}</td><td><strong>${money(p.amount)}</strong></td><td><span class="status ${statusClass(p.status)}">${p.status}</span></td></tr>`).join("")}</tbody></table>`;
}

function propertiesPage() {
  return `${heading("Properties", "Manage your buildings and rental units.", `<div class="page-toolbar"><button class="secondary-button">Export</button><button class="primary-button" data-add="property">＋ Add property</button></div>`)}
    <section class="panel table-panel"><div class="panel-header"><h3>${state.properties.length} properties</h3><button>Filter ⌄</button></div>
      <table><thead><tr><th>Property</th><th>Location</th><th>Units</th><th>Occupied</th><th>Typical rent</th><th>Occupancy</th></tr></thead>
      <tbody>${state.properties.map(p => `<tr><td><div class="person"><span class="person-avatar">⌂</span><strong>${p.name}</strong></div></td><td>${p.location}</td><td>${p.units}</td><td>${p.occupied}</td><td>${money(p.rent)}</td><td><span class="status">${Math.round(p.occupied / p.units * 100)}%</span></td></tr>`).join("")}</tbody></table>
    </section>`;
}

function tenantsPage() {
  return `${heading("Tenants", "Keep tenant contacts, leases, and balances in one place.", `<button class="primary-button" data-add="tenant">＋ Add tenant</button>`)}
    <section class="panel table-panel"><div class="panel-header"><h3>${state.tenants.length} active tenants</h3><button>Filter ⌄</button></div>
      <table><thead><tr><th>Tenant</th><th>Property</th><th>Unit</th><th>Phone</th><th>Balance</th><th>Status</th></tr></thead>
      <tbody>${state.tenants.map(t => `<tr><td><div class="person"><span class="person-avatar">${initials(t.name)}</span><strong>${t.name}</strong></div></td><td>${t.property}</td><td>${t.unit}</td><td>${t.phone}</td><td><strong>${money(t.balance)}</strong></td><td><span class="status ${statusClass(t.status)}">${t.status}</span></td></tr>`).join("")}</tbody></table>
    </section>`;
}

function invoicesPage() {
  return `${heading("Invoices", "Create rent invoices and follow up outstanding balances.", `<button class="primary-button" data-add="invoice">＋ New invoice</button>`)}
    <div class="stats-grid">${stat("Invoiced this month", money(state.invoices.reduce((s, i) => s + i.amount, 0)), "▤", "July 2026", false)}${stat("Outstanding", money(state.invoices.reduce((s, i) => s + i.balance, 0)), "!", "Needs attention", false, true)}</div>
    <section class="panel table-panel"><div class="panel-header"><h3>July invoices</h3><button>Download report</button></div>
      <table><thead><tr><th>Invoice</th><th>Tenant</th><th>Due date</th><th>Amount</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${state.invoices.map(i => `<tr><td><strong>${i.id}</strong></td><td>${i.tenant}</td><td>${i.due}</td><td>${money(i.amount)}</td><td>${money(i.balance)}</td><td><span class="status ${statusClass(i.status)}">${i.status}</span></td><td>${Number(i.balance) > 0 ? `<button class="text-button" data-demo-payment="${i.id}">▶ Demo payment</button> <button class="text-button" data-stk="${i.id}">Live STK</button>` : "—"}</td></tr>`).join("")}</tbody></table>
    </section>`;
}

function paymentsPage() {
  return `${heading("Payments", "Reconcile M-Pesa and manually recorded rent payments.", `<button class="primary-button" data-add="payment">＋ Record payment</button>`)}
    ${state.unmatchedPayments?.length ? `<section class="panel table-panel"><div class="panel-header"><h3>Needs reconciliation</h3><span class="status overdue">${state.unmatchedPayments.length} unmatched</span></div>
      <table><thead><tr><th>Reference</th><th>Account used</th><th>Phone</th><th>Amount</th><th>Action</th></tr></thead><tbody>${state.unmatchedPayments.map(p => `<tr><td>${p.id}</td><td>${p.accountReference}</td><td>${p.phone || "—"}</td><td>${money(p.amount)}</td><td><button class="text-button" data-reconcile="${p.id}">Match payment</button></td></tr>`).join("")}</tbody></table></section>` : ""}
    <section class="panel table-panel"><div class="panel-header"><h3>Payment history</h3><button>Export CSV</button></div>${paymentsTable(state.payments)}</section>
    <section class="panel table-panel"><div class="panel-header"><h3>Receipts issued</h3><span>${state.receipts?.length || 0}</span></div>
      ${state.receipts?.length ? `<table><thead><tr><th>Receipt</th><th>Tenant</th><th>Account</th><th>Amount</th><th>Issued</th></tr></thead><tbody>${state.receipts.map(r => `<tr><td><strong>${r.id}</strong></td><td>${r.tenant}</td><td>${r.accountReference}</td><td>${money(r.amount)}</td><td>${new Date(r.issuedAt).toLocaleString()}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-state"><strong>No receipts yet</strong>Receipts are generated automatically after matched payments.</div>`}
    </section>`;
}

function unitsPage() {
  return `${heading("Units", "Manage occupancy, rent, and tenant account references.", `<button class="primary-button" data-add="unit">＋ Add unit</button>`)}
    <section class="panel table-panel"><div class="panel-header"><h3>${state.units?.length || 0} units</h3><button>Filter ⌄</button></div>
    <table><thead><tr><th>Unit</th><th>Property</th><th>Monthly rent</th><th>Status</th><th>Account reference</th></tr></thead><tbody>${(state.units || []).map(u => {
      const tenant = state.tenants.find(t => t.property === u.property && t.unit === u.name);
      return `<tr><td><strong>${u.name}</strong></td><td>${u.property}</td><td>${money(u.rent)}</td><td><span class="status ${u.status === "Vacant" ? "pending" : ""}">${u.status}</span></td><td>${tenant?.accountRef || "Assigned when occupied"}</td></tr>`;
    }).join("")}</tbody></table></section>`;
}

function utilitiesPage() {
  const utilityInvoices = state.invoices.filter(i => i.type === "Utility");
  return `${heading("Utility billing", "Bill water, electricity, garbage, and shared services.", `<button class="primary-button" data-add="utility">＋ Add utility bill</button>`)}
    <section class="panel table-panel"><div class="panel-header"><h3>Utility invoices</h3><span>${utilityInvoices.length} bills</span></div>
    ${utilityInvoices.length ? `<table><thead><tr><th>Invoice</th><th>Tenant</th><th>Utility</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead><tbody>${utilityInvoices.map(i => `<tr><td>${i.id}</td><td>${i.tenant}</td><td>${i.description}</td><td>${money(i.amount)}</td><td>${money(i.balance)}</td><td><span class="status ${statusClass(i.status)}">${i.status}</span></td></tr>`).join("")}</tbody></table>` : `<div class="empty-state"><strong>No utility bills yet</strong>Add the first meter reading or service charge.</div>`}</section>`;
}

function expensesPage() {
  const total = (state.expenses || []).reduce((sum, item) => sum + Number(item.amount), 0);
  return `${heading("Expenses", "Track maintenance and operating costs by property.", `<button class="primary-button" data-add="expense">＋ Record expense</button>`)}
    <div class="stats-grid">${stat("Expenses this month", money(total), "−", "July 2026", false)}</div>
    <section class="panel table-panel"><div class="panel-header"><h3>Expense register</h3><button>Export</button></div><table><thead><tr><th>Date</th><th>Property</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${(state.expenses || []).map(e => `<tr><td>${e.date}</td><td>${e.property}</td><td>${e.category}</td><td>${e.description}</td><td><strong>${money(e.amount)}</strong></td></tr>`).join("")}</tbody></table></section>`;
}

function remindersPage() {
  const arrears = state.tenants.filter(t => Number(t.balance) > 0);
  return `${heading("SMS & WhatsApp reminders", "Prepare and track rent reminders for tenants in arrears.", `<button class="primary-button" data-queue-reminders>Queue arrears reminders</button>`)}
    <div class="stats-grid">${stat("Tenants in arrears", arrears.length, "!", money(arrears.reduce((s,t) => s + Number(t.balance), 0)), false, true)}${stat("Messages queued", state.reminders?.filter(r => r.status === "Queued").length || 0, "✉", "Awaiting provider connection", false)}</div>
    <section class="panel table-panel"><div class="panel-header"><h3>Reminder queue</h3><span class="status pending">Provider setup required</span></div>
    ${(state.reminders || []).length ? `<table><thead><tr><th>Tenant</th><th>Channel</th><th>Phone</th><th>Message</th><th>Status</th></tr></thead><tbody>${state.reminders.map(r => `<tr><td>${r.tenant}</td><td>${r.channel}</td><td>${r.phone}</td><td>${r.message}</td><td><span class="status pending">${r.status}</span></td></tr>`).join("")}</tbody></table>` : `<div class="empty-state"><strong>No reminders queued</strong>Queue reminders for tenants with outstanding balances.</div>`}</section>`;
}

function reportsPage() {
  const income = state.payments.reduce((s, p) => s + Number(p.amount), 0);
  const expenses = (state.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const arrears = state.tenants.reduce((s, t) => s + Number(t.balance), 0);
  return `${heading("Reports", "A clear view of collections, arrears, and property performance.", `<button class="secondary-button" onclick="window.print()">Print report</button>`)}
    <div class="stats-grid">${stat("Gross collections", money(income), "↗", "Recorded payments", true)}${stat("Operating expenses", money(expenses), "−", "Recorded costs", false)}${stat("Net cash flow", money(income - expenses), "◆", "Collections less expenses", false)}${stat("Total arrears", money(arrears), "!", "Outstanding balances", false, true)}</div>
    <section class="panel table-panel"><div class="panel-header"><h3>Property performance</h3><button>July 2026⌄</button></div><table><thead><tr><th>Property</th><th>Units</th><th>Occupancy</th><th>Potential rent</th></tr></thead><tbody>${state.properties.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.units}</td><td>${Math.round(p.occupied/p.units*100)}%</td><td>${money(p.units*p.rent)}</td></tr>`).join("")}</tbody></table></section>`;
}

function adminPage() {
  return `${heading("Platform administration", "Manage independent landlord accounts and platform health.")}
    <div class="stats-grid">${stat("Active landlords", 1, "♙", "Demo workspace", false)}${stat("Properties managed", state.properties.length, "▦", "Across all landlords", false)}${stat("Units managed", state.units?.length || 0, "□", "Current platform data", false)}${stat("Payment volume", money(state.payments.reduce((s,p) => s + Number(p.amount), 0)), "↔", "Processed records", false)}</div>
    <section class="panel table-panel"><div class="panel-header"><h3>Landlord accounts</h3><div class="page-toolbar"><button class="secondary-button" data-reset-demo>Reset demo data</button><button class="primary-button">Invite landlord</button></div></div><table><thead><tr><th>Landlord</th><th>Plan</th><th>Properties</th><th>Payment setup</th><th>Status</th></tr></thead><tbody><tr><td><div class="person"><span class="person-avatar">AM</span><strong>Antony Mugo</strong></div></td><td>30-day trial</td><td>${state.properties.length}</td><td>${state.mpesa.shortcode ? "Connected" : "Sandbox ready"}</td><td><span class="status">Active</span></td></tr><tr><td><div class="person"><span class="person-avatar">WN</span><strong>Wanjiku Njoroge</strong></div></td><td>Growth</td><td>5</td><td>Connected</td><td><span class="status">Active</span></td></tr><tr><td><div class="person"><span class="person-avatar">JO</span><strong>James Ouma</strong></div></td><td>Starter</td><td>2</td><td>Connected</td><td><span class="status">Active</span></td></tr></tbody></table></section>`;
}

function mpesaPage() {
  const m = state.mpesa;
  return `${heading("M-Pesa setup", "Connect your own Paybill or Till. Rent is paid directly into your account.")}
    <div class="mpesa-layout">
      <section class="panel setup-card"><h2>Daraja API credentials</h2><p class="trend">Use the credentials from your Safaricom Daraja portal. Fields are masked after saving.</p>
        <form id="mpesaForm" class="form-grid">
          <div class="field"><label>Account type</label><select name="type"><option ${m.type === "Paybill" ? "selected" : ""}>Paybill</option><option ${m.type === "Till" ? "selected" : ""}>Till</option></select></div>
          <div class="field"><label>Business shortcode</label><input name="shortcode" value="${m.shortcode}" placeholder="e.g. 123456"></div>
          <div class="field full"><label>Consumer key</label><input name="consumerKey" value="${m.consumerKey}" placeholder="Enter consumer key"></div>
          <div class="field full"><label>Consumer secret</label><input type="password" name="consumerSecret" value="${m.consumerSecret}" placeholder="Enter consumer secret"></div>
          <div class="field full"><label>Online passkey</label><input type="password" name="passkey" value="${m.passkey}" placeholder="Enter passkey"></div>
          <div class="field full"><button class="primary-button" type="submit">Save and test connection</button></div>
        </form>
      </section>
      <aside class="panel setup-card security-card"><div class="shield">✓</div><h3>Your payments stay yours</h3><p>KodiFlow never holds tenants’ rent. Payments go directly to the landlord’s connected M-Pesa account.</p><p>In production, credentials will be encrypted at rest and never displayed after setup.</p></aside>
    </div>`;
}

function render(page = currentPage) {
  if (page === "admin" && demoRole !== "admin") page = "dashboard";
  if (!allowedPages.has(page)) page = "dashboard";
  currentPage = page;
  const url = new URL(location.href);
  url.searchParams.set("page", page);
  history.replaceState({}, "", url);
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  const pages = { dashboard, properties: propertiesPage, units: unitsPage, tenants: tenantsPage, invoices: invoicesPage, payments: paymentsPage, utilities: utilitiesPage, expenses: expensesPage, reminders: remindersPage, reports: reportsPage, mpesa: mpesaPage, admin: adminPage };
  app.innerHTML = (pages[page] || dashboard)();
  document.querySelectorAll(".admin-only").forEach(item => item.style.display = demoRole === "admin" ? "" : "none");
  document.querySelector(".sidebar").classList.remove("open");
}

const tourSteps = [
  { page: "dashboard", title: "One clear portfolio view", text: "Start with collections, arrears, occupancy, and recent payments across every property." },
  { page: "tenants", title: "Every tenant has a payment identity", text: "KodiFlow assigns each tenant and unit a unique account reference for automatic M-Pesa matching." },
  { page: "invoices", title: "Rent collection in one click", text: "Choose an outstanding invoice and click “Demo payment” to simulate the complete M-Pesa journey." },
  { page: "payments", title: "Automatic reconciliation and receipts", text: "Payments are allocated to invoices, balances update instantly, and a receipt is issued without manual work." },
  { page: "reminders", title: "Follow-up without spreadsheets", text: "Queue targeted SMS and WhatsApp reminders for tenants with outstanding balances." },
  { page: demoRole === "admin" ? "admin" : "reports", title: demoRole === "admin" ? "Run the whole platform" : "Decisions backed by live numbers", text: demoRole === "admin" ? "The platform dashboard brings landlord accounts, plans, portfolio size, and payment readiness together." : "Landlords can review income, expenses, arrears, and property performance from one report." }
];

function showTourStep() {
  const step = tourSteps[tourIndex];
  render(step.page);
  document.querySelector("#tourCard").hidden = false;
  document.querySelector("#tourStepLabel").textContent = `STEP ${tourIndex + 1} OF ${tourSteps.length}`;
  document.querySelector("#tourTitle").textContent = step.title;
  document.querySelector("#tourText").textContent = step.text;
  document.querySelector("#tourProgress").style.width = `${(tourIndex + 1) / tourSteps.length * 100}%`;
  document.querySelector("#tourNext").textContent = tourIndex === tourSteps.length - 1 ? "Finish ✓" : "Next →";
}

async function simulatePayment(invoiceId) {
  const invoice = state.invoices.find(item => item.id === invoiceId);
  const tenant = state.tenants.find(item => item.name === invoice?.tenant);
  if (!invoice || !tenant) return toast("Invoice could not be found");
  const amount = Number(invoice.balance);
  toast("M-Pesa STK prompt sent to tenant…");
  await new Promise(resolve => setTimeout(resolve, 900));
  toast("Tenant entered M-Pesa PIN…");
  await new Promise(resolve => setTimeout(resolve, 900));
  const receiptNumber = `S${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  invoice.balance = 0;
  invoice.status = "Paid";
  tenant.balance = state.invoices.filter(item => item.tenant === tenant.name).reduce((sum, item) => sum + Number(item.balance || 0), 0);
  tenant.status = tenant.balance ? "Part paid" : "Paid";
  const payment = { id: receiptNumber, tenant: tenant.name, tenantId: tenant.id, accountReference: tenant.accountRef, date: new Date().toLocaleDateString("en-GB"), amount, method: "M-Pesa STK (Demo)", status: "Matched", allocations: [{ invoiceId, amount }] };
  state.payments.unshift(payment);
  state.receipts ||= [];
  state.receipts.unshift({ id: `RCT-${Date.now().toString(36).toUpperCase()}`, paymentId: receiptNumber, tenant: tenant.name, accountReference: tenant.accountRef, amount, allocations: payment.allocations, issuedAt: new Date().toISOString() });
  await save();
  render("payments");
  toast(`Payment matched and receipt issued — ${receiptNumber}`);
}

const formConfigs = {
  property: {
    title: "Add property", description: "Create a property and its first group of units.",
    fields: `<div class="field"><label>Property name</label><input name="name" required placeholder="e.g. Acacia Court"></div><div class="field"><label>Location</label><input name="location" required placeholder="Town, county"></div><div class="form-grid"><div class="field"><label>Number of units</label><input name="units" type="number" min="1" required></div><div class="field"><label>Typical monthly rent</label><input name="rent" type="number" min="0" required></div></div>`,
    submit(data) { state.properties.push({ id: Date.now(), name: data.name, location: data.location, units: +data.units, occupied: 0, rent: +data.rent }); }
  },
  tenant: {
    title: "Add tenant", description: "Add a tenant and assign their rental unit.",
    fields: `<div class="field"><label>Full name</label><input name="name" required></div><div class="field"><label>Phone number</label><input name="phone" required placeholder="07…"></div><div class="field"><label>Property</label><select name="property">${state.properties.map(p => `<option>${p.name}</option>`).join("")}</select></div><div class="field"><label>Unit</label><input name="unit" required placeholder="e.g. A-01"></div>`,
    submit(data) { state.tenants.push({ id: Date.now(), ...data, balance: 0, status: "Paid" }); }
  },
  payment: {
    title: "Record payment", description: "Record a cash, bank, or unmatched M-Pesa payment.",
    fields: `<div class="field"><label>Tenant</label><select name="tenant">${state.tenants.map(t => `<option>${t.name}</option>`).join("")}</select></div><div class="field"><label>Amount (KES)</label><input name="amount" type="number" min="1" required></div><div class="field"><label>Payment method</label><select name="method"><option>M-Pesa</option><option>Bank transfer</option><option>Cash</option></select></div><div class="field"><label>Reference</label><input name="reference" required></div>`,
    submit(data) { state.payments.unshift({ id: data.reference, tenant: data.tenant, date: "03 Jul 2026", amount: +data.amount, method: data.method, status: "Recorded" }); }
  },
  invoice: {
    title: "Create invoice", description: "Issue a new rent or utility invoice.",
    fields: `<div class="field"><label>Tenant</label><select name="tenant">${state.tenants.map(t => `<option>${t.name}</option>`).join("")}</select></div><div class="field"><label>Amount (KES)</label><input name="amount" type="number" min="1" required></div><div class="field"><label>Due date</label><input name="due" type="date" required></div>`,
    submit(data) { state.invoices.unshift({ id: `INV-${Date.now().toString().slice(-6)}`, tenant: data.tenant, due: data.due, amount: +data.amount, balance: +data.amount, status: "Pending" }); }
  }
  ,
  unit: {
    title: "Add unit", description: "Add a rental unit to an existing property.",
    fields: `<div class="field"><label>Property</label><select name="property">${state.properties.map(p => `<option>${p.name}</option>`).join("")}</select></div><div class="field"><label>Unit name/number</label><input name="name" required placeholder="e.g. A-01"></div><div class="field"><label>Monthly rent</label><input name="rent" type="number" min="0" required></div>`,
    submit(data) { state.units ||= []; state.units.push({ id: Date.now(), ...data, rent: +data.rent, status: "Vacant" }); }
  },
  utility: {
    title: "Add utility bill", description: "Create a utility invoice for a tenant.",
    fields: `<div class="field"><label>Tenant</label><select name="tenant">${state.tenants.map(t => `<option>${t.name}</option>`).join("")}</select></div><div class="field"><label>Utility</label><select name="description"><option>Water</option><option>Electricity</option><option>Garbage</option><option>Service charge</option></select></div><div class="field"><label>Amount</label><input name="amount" type="number" min="1" required></div><div class="field"><label>Due date</label><input name="due" type="date" required></div>`,
    submit(data) { state.invoices.unshift({ id: `UTL-${Date.now().toString().slice(-6)}`, tenant: data.tenant, description: data.description, type: "Utility", due: data.due, amount: +data.amount, balance: +data.amount, status: "Pending" }); }
  },
  expense: {
    title: "Record expense", description: "Track a property operating or maintenance cost.",
    fields: `<div class="field"><label>Property</label><select name="property">${state.properties.map(p => `<option>${p.name}</option>`).join("")}</select></div><div class="field"><label>Category</label><select name="category"><option>Repairs</option><option>Utilities</option><option>Security</option><option>Cleaning</option><option>Other</option></select></div><div class="field"><label>Description</label><input name="description" required></div><div class="field"><label>Amount</label><input name="amount" type="number" min="1" required></div>`,
    submit(data) { state.expenses ||= []; state.expenses.unshift({ id: Date.now(), ...data, amount: +data.amount, date: new Date().toLocaleDateString("en-GB") }); }
  }
};

function openModal(type) {
  const config = formConfigs[type] || formConfigs.property;
  modalTitle.textContent = config.title;
  modalDescription.textContent = config.description;
  modalForm.dataset.type = type;
  modalForm.innerHTML = `${config.fields}<div class="modal-actions"><button class="secondary-button" type="button" data-close>Cancel</button><button class="primary-button" type="submit">Save</button></div>`;
  modalBackdrop.hidden = false;
  modalForm.querySelector("input")?.focus();
}

function openReconcileModal(paymentId) {
  modalTitle.textContent = "Match payment";
  modalDescription.textContent = "Choose the tenant who made this payment. KodiFlow will allocate it to their oldest invoices first.";
  modalForm.dataset.type = "reconcile";
  modalForm.dataset.paymentId = paymentId;
  modalForm.innerHTML = `<div class="field"><label>Tenant</label><select name="tenantId">${state.tenants.map(t => `<option value="${t.id}">${t.name} — ${t.accountRef || t.unit}</option>`).join("")}</select></div><div class="modal-actions"><button class="secondary-button" type="button" data-close>Cancel</button><button class="primary-button" type="submit">Match and issue receipt</button></div>`;
  modalBackdrop.hidden = false;
}

function closeModal() { modalBackdrop.hidden = true; }
function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2600);
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");
  const link = event.target.closest("[data-page-link]");
  const add = event.target.closest("[data-add]");
  const queue = event.target.closest("[data-queue-reminders]");
  const reconcile = event.target.closest("[data-reconcile]");
  const stk = event.target.closest("[data-stk]");
  const demoPayment = event.target.closest("[data-demo-payment]");
  const resetDemo = event.target.closest("[data-reset-demo]");
  if (nav) render(nav.dataset.page);
  if (link && link.dataset.pageLink !== "subscription") render(link.dataset.pageLink);
  if (add) openModal(add.dataset.add);
  if (queue) {
    state.reminders = state.tenants.filter(t => Number(t.balance) > 0).map(t => ({ id: Date.now() + Number(t.id), tenant: t.name, phone: t.phone, channel: "SMS + WhatsApp", message: `KodiFlow reminder: Your outstanding rent balance is ${money(t.balance)}.`, status: "Queued" }));
    save().then(() => { render("reminders"); toast("Arrears reminders queued"); });
  }
  if (reconcile) openReconcileModal(reconcile.dataset.reconcile);
  if (stk) {
    toast("Sending M-Pesa prompt…");
    fetch("/api/mpesa/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Landlord-Id": "demo-landlord" },
      body: JSON.stringify({ invoiceId: stk.dataset.stk })
    }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast(result.message || "M-Pesa prompt sent");
    }).catch(error => toast(error.message || "Could not send STK prompt"));
  }
  if (demoPayment) simulatePayment(demoPayment.dataset.demoPayment);
  if (resetDemo) {
    state = structuredClone(seed);
    save().then(() => { render("admin"); toast("Demo data restored"); });
  }
  if (event.target.closest("[data-close]") || event.target === modalBackdrop || event.target.closest("#modalClose")) closeModal();
});

document.querySelector("#quickAddButton").addEventListener("click", () => openModal(currentPage === "tenants" ? "tenant" : currentPage === "payments" ? "payment" : currentPage === "invoices" ? "invoice" : "property"));
document.querySelector("#menuButton").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
document.querySelectorAll("[data-demo-role]").forEach(button => button.addEventListener("click", () => {
  selectedDemoRole = button.dataset.demoRole;
  document.querySelectorAll("[data-demo-role]").forEach(item => {
    item.classList.toggle("selected", item === button);
    item.querySelector("i").textContent = item === button ? "✓" : "";
  });
}));
document.querySelector("#enterDemo").addEventListener("click", () => {
  demoRole = selectedDemoRole;
  if (demoRole === "admin") tourSteps[5] = { page: "admin", title: "Run the whole platform", text: "The platform dashboard brings landlord accounts, plans, portfolio size, and payment readiness together." };
  sessionStorage.setItem("kodiflow-role", demoRole);
  document.querySelector("#loginScreen").hidden = true;
  render(demoRole === "admin" ? "admin" : "dashboard");
  toast(`Welcome to the ${demoRole === "admin" ? "platform admin" : "landlord"} demo`);
});
document.querySelector("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("kodiflow-role");
  demoRole = "";
  document.querySelector("#loginScreen").hidden = false;
});
document.querySelector("#tourButton").addEventListener("click", () => { tourIndex = 0; showTourStep(); });
document.querySelector("#tourClose").addEventListener("click", () => document.querySelector("#tourCard").hidden = true);
document.querySelector("#tourNext").addEventListener("click", () => {
  if (tourIndex === tourSteps.length - 1) {
    document.querySelector("#tourCard").hidden = true;
    toast("Tour complete — KodiFlow is ready to pitch");
  } else {
    tourIndex += 1;
    showTourStep();
  }
});
modalForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (modalForm.dataset.type === "reconcile") {
    try {
      const paymentId = modalForm.dataset.paymentId;
      const input = Object.fromEntries(new FormData(modalForm));
      const response = await fetch(`/api/payments/reconcile/${encodeURIComponent(paymentId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Landlord-Id": "demo-landlord" },
        body: JSON.stringify(input)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      state = result.state;
      localStorage.setItem("kodiflow-data", JSON.stringify(state));
      closeModal(); render("payments"); toast(`Matched — receipt ${result.receipt.id} issued`);
    } catch (error) {
      toast(error.message || "Could not reconcile payment");
    }
    return;
  }
  const config = formConfigs[modalForm.dataset.type];
  config.submit(Object.fromEntries(new FormData(modalForm)));
  await save(); closeModal(); render(currentPage); toast(serverConnected ? "Saved to KodiFlow" : "Saved in this browser");
});
app.addEventListener("submit", async event => {
  if (event.target.id !== "mpesaForm") return;
  event.preventDefault();
  state.mpesa = Object.fromEntries(new FormData(event.target));
  await save();
  render("mpesa");
  toast(serverConnected ? "M-Pesa settings encrypted and saved" : "Saved in browser demo mode");
});
document.querySelector("#searchInput").addEventListener("input", event => {
  const query = event.target.value.toLowerCase().trim();
  if (!query) return;
  const tenant = state.tenants.find(t => `${t.name} ${t.property} ${t.unit}`.toLowerCase().includes(query));
  const property = state.properties.find(p => `${p.name} ${p.location}`.toLowerCase().includes(query));
  if (tenant) { render("tenants"); toast(`Found ${tenant.name}`); }
  else if (property) { render("properties"); toast(`Found ${property.name}`); }
});

await loadServerState();
if (!demoRole) {
  document.querySelector("#loginScreen").hidden = false;
  if (selectedDemoRole === "admin") document.querySelector('[data-demo-role="admin"]').click();
}
render(currentPage);
