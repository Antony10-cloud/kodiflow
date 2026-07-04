alter table public.properties
  add column if not exists property_type text,
  add column if not exists description text,
  add column if not exists amenities text[] not null default '{}';

alter table public.units
  add column if not exists bedrooms integer,
  add column if not exists bathrooms numeric(4,1),
  add column if not exists size_sqft integer,
  add column if not exists amenities text[] not null default '{}';

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  status text not null default 'active' check (status in ('draft','active','expiring','ended','terminated')),
  renewal_notice_days integer not null default 30 check (renewal_notice_days between 1 and 180),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','assigned','in_progress','resolved','cancelled')),
  estimated_cost numeric(12,2) check (estimated_cost >= 0),
  actual_cost numeric(12,2) check (actual_cost >= 0),
  reported_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists leases_org_end_date_idx
  on public.leases(organization_id, end_date);
create index if not exists maintenance_org_status_idx
  on public.maintenance_requests(organization_id, status);

alter table public.leases enable row level security;
alter table public.maintenance_requests enable row level security;

drop policy if exists "leases isolated by organization" on public.leases;
create policy "leases isolated by organization" on public.leases for all
  using (is_org_member(organization_id) or is_platform_admin())
  with check (is_org_member(organization_id) or is_platform_admin());

drop policy if exists "maintenance isolated by organization" on public.maintenance_requests;
create policy "maintenance isolated by organization" on public.maintenance_requests for all
  using (is_org_member(organization_id) or is_platform_admin())
  with check (is_org_member(organization_id) or is_platform_admin());
