# KodiFlow

A responsive rental-management MVP for independent Kenyan landlords.

## Easiest way to start

Double-click **Launch KodiFlow.vbs**. It starts the server quietly and opens the
landlord dashboard automatically.

Double-click **Open Admin Dashboard.vbs** to go directly to the platform-admin
dashboard.

Direct links:

- Landlord dashboard: `http://127.0.0.1:4174/?page=dashboard`
- Admin dashboard: `http://127.0.0.1:4174/?page=admin`

If Windows blocks VBS files, double-click `start-kodiflow.cmd`, keep that window
open, and use either direct link above.

Node.js 18 or newer is required. Application data is stored in `data/kodiflow.json`.

## Current capabilities

- Properties and unit occupancy
- Tenant records and balances
- Rent invoices
- Payment records
- Landlord-specific M-Pesa Paybill/Till settings
- Encrypted M-Pesa secrets at rest
- Unique M-Pesa account references per tenant/unit
- STK Push requests and STK callback processing
- Paybill C2B callbacks and automatic invoice allocation
- Receipts and unmatched-payment reconciliation
- Utility billing, expenses, arrears, and property reports
- SMS/WhatsApp reminder queue
- Landlord and platform-admin dashboards

## Daraja sandbox configuration

Set these before starting the server:

- `DARAJA_ENV=sandbox` (use `production` only after Safaricom approval)
- `PUBLIC_BASE_URL=https://your-public-https-domain`
- `KODIFLOW_SECRET=a-long-random-secret`

The public URL is required because Safaricom sends asynchronous payment results to
KodiFlow's callback endpoints. Add each landlord's credentials under **M-Pesa setup**.

SMS and WhatsApp reminders are queued inside KodiFlow. Actual delivery requires a
messaging provider account and credentials.

This is an MVP for local testing. Production deployment still needs authentication,
PostgreSQL, HTTPS, backups, audit logs, and live Safaricom Daraja callbacks.
