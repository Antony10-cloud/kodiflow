create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
  org_slug text;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  if lower(new.email) = 'antonymugo66@gmail.com' then
    org_name := 'KodiFlow Platform';
    org_slug := 'kodiflow-platform';
    insert into public.organizations (name, slug, owner_id)
    values (org_name, org_slug, new.id)
    on conflict (slug) do update set owner_id = excluded.owner_id
    returning id into new_org_id;
    insert into public.memberships (organization_id, user_id, role)
    values (new_org_id, new.id, 'platform_admin')
    on conflict (organization_id, user_id) do update set role = 'platform_admin';
  elsif coalesce(new.raw_user_meta_data ->> 'organization_name', '') <> '' then
    org_name := new.raw_user_meta_data ->> 'organization_name';
    org_slug := 'landlord-' || replace(new.id::text, '-', '');
    insert into public.organizations (name, slug, owner_id)
    values (org_name, org_slug, new.id)
    returning id into new_org_id;
    insert into public.memberships (organization_id, user_id, role)
    values (new_org_id, new.id, 'landlord');
  end if;
  return new;
end;
$$;
