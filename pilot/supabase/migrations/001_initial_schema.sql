create extension if not exists pgcrypto;

create type public.app_role as enum ('platform_admin', 'landlord', 'manager', 'accountant');
create type public.unit_status as enum ('vacant', 'occupied', 'maintenance');
create type public.invoice_status as enum ('draft', 'pending', 'part_paid', 'paid', 'overdue', 'void');
create type public.payment_status as enum ('pending', 'matched', 'unmatched', 'failed', 'reversed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.memberships (
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role public.app_role not null default 'landlord',
  primary key (organization_id, user_id)
);
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, location text not null,
  created_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null, monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  status public.unit_status not null default 'vacant',
  unique(property_id, name)
);
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  unit_id uuid references public.units(id),
  full_name text not null, phone text not null, email text,
  account_reference text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id),
  invoice_number text not null, kind text not null default 'rent',
  description text, amount numeric(12,2) not null check (amount >= 0),
  balance numeric(12,2) not null check (balance >= 0),
  due_date date not null, status public.invoice_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(organization_id, invoice_number)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid references public.tenants(id),
  mpesa_receipt text unique, account_reference text,
  amount numeric(12,2) not null check (amount > 0),
  phone text, method text not null, status public.payment_status not null,
  raw_callback jsonb, received_at timestamptz not null default now()
);
create table public.payment_allocations (
  payment_id uuid references public.payments(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  primary key(payment_id, invoice_id)
);
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id),
  receipt_number text not null unique,
  issued_at timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id),
  category text not null, description text not null,
  amount numeric(12,2) not null check (amount > 0), expense_date date not null
);
create table public.mpesa_connections (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  account_type text not null check (account_type in ('paybill','till')),
  shortcode text not null,
  encrypted_credentials text not null,
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  updated_at timestamptz not null default now()
);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from memberships where organization_id = org_id and user_id = auth.uid()) $$;
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from memberships where user_id = auth.uid() and role = 'platform_admin') $$;

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table payment_allocations enable row level security;
alter table receipts enable row level security;
alter table expenses enable row level security;
alter table mpesa_connections enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "member organizations" on organizations for select using (is_org_member(id) or is_platform_admin());
create policy "memberships visible to members" on memberships for select using (is_org_member(organization_id) or is_platform_admin());
create policy "properties isolated by organization" on properties for all using (is_org_member(organization_id) or is_platform_admin()) with check (is_org_member(organization_id) or is_platform_admin());
create policy "units isolated by organization" on units for all using (is_org_member(organization_id) or is_platform_admin()) with check (is_org_member(organization_id) or is_platform_admin());
create policy "tenants isolated by organization" on tenants for all using (is_org_member(organization_id) or is_platform_admin()) with check (is_org_member(organization_id) or is_platform_admin());
create policy "invoices isolated by organization" on invoices for all using (is_org_member(organization_id) or is_platform_admin()) with check (is_org_member(organization_id) or is_platform_admin());
create policy "payments isolated by organization" on payments for select using (is_org_member(organization_id) or is_platform_admin());
create policy "receipts isolated by organization" on receipts for select using (is_org_member(organization_id) or is_platform_admin());
create policy "expenses isolated by organization" on expenses for all using (is_org_member(organization_id) or is_platform_admin()) with check (is_org_member(organization_id) or is_platform_admin());
create policy "mpesa connections isolated" on mpesa_connections for select using (is_org_member(organization_id) or is_platform_admin());
