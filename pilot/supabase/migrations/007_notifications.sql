create type public.notification_channel as enum ('sms', 'whatsapp');
create type public.notification_status as enum ('queued', 'sent', 'delivered', 'failed');

create table public.notification_preferences (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  sms_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  days_before_due integer not null default 3 check (days_before_due between 0 and 30),
  overdue_frequency_days integer not null default 7 check (overdue_frequency_days between 1 and 30),
  updated_at timestamptz not null default now()
);

create table public.notification_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  channel public.notification_channel not null,
  recipient text not null,
  template_key text not null,
  body text not null,
  status public.notification_status not null default 'queued',
  provider_message_id text,
  provider_status text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index notification_messages_org_created_idx
  on public.notification_messages (organization_id, created_at desc);
create index notification_messages_provider_idx
  on public.notification_messages (provider_message_id)
  where provider_message_id is not null;

alter table public.notification_preferences enable row level security;
alter table public.notification_messages enable row level security;

create policy "notification preferences isolated"
on public.notification_preferences for all
using (public.is_org_member(organization_id) or public.is_platform_admin())
with check (public.is_org_member(organization_id) or public.is_platform_admin());

create policy "notification messages isolated"
on public.notification_messages for select
using (public.is_org_member(organization_id) or public.is_platform_admin());

create policy "notification messages created by members"
on public.notification_messages for insert
with check (public.is_org_member(organization_id) or public.is_platform_admin());

create policy "notification messages updated by members"
on public.notification_messages for update
using (public.is_org_member(organization_id) or public.is_platform_admin())
with check (public.is_org_member(organization_id) or public.is_platform_admin());
