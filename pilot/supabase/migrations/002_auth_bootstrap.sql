create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  platform_org_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  if lower(new.email) = 'antonymugo66@gmail.com' then
    insert into public.organizations (name, slug, owner_id)
    values ('KodiFlow Platform', 'kodiflow-platform', new.id)
    on conflict (slug) do update set owner_id = excluded.owner_id
    returning id into platform_org_id;

    insert into public.memberships (organization_id, user_id, role)
    values (platform_org_id, new.id, 'platform_admin')
    on conflict (organization_id, user_id)
    do update set role = 'platform_admin';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
