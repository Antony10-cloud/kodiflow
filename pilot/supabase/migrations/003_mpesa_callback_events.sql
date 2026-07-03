create table if not exists public.mpesa_callback_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

alter table public.mpesa_callback_events enable row level security;

create policy "callback events platform admin only"
on public.mpesa_callback_events
for select
using (public.is_platform_admin());
