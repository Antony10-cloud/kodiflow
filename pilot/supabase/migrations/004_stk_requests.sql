create table if not exists public.stk_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  merchant_request_id text not null,
  checkout_request_id text not null unique,
  account_reference text not null,
  phone text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending',
  result_code integer,
  result_description text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.stk_requests enable row level security;

create policy "stk requests isolated"
on public.stk_requests for all
using (public.is_org_member(organization_id) or public.is_platform_admin())
with check (public.is_org_member(organization_id) or public.is_platform_admin());
