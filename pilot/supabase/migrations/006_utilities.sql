create table if not exists public.utility_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  utility_type text not null check (utility_type in ('water','electricity','other')),
  previous_reading numeric(12,2),
  current_reading numeric(12,2),
  rate numeric(12,2),
  amount numeric(12,2) not null check (amount > 0),
  billing_month date not null,
  created_at timestamptz not null default now()
);

alter table public.utility_charges enable row level security;
create policy "utility charges isolated"
on public.utility_charges for all
using (public.is_org_member(organization_id) or public.is_platform_admin())
with check (public.is_org_member(organization_id) or public.is_platform_admin());
