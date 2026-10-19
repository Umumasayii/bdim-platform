-- Location is now country → province (county / region / state) → district or city.
alter table public.profiles add column if not exists province text not null default '';

-- Same as before, plus province. Every value is trimmed and size-limited;
-- anything unexpected becomes empty, so sign-up can never fail here.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  g text := lower(trim(coalesce(meta ->> 'gender', '')));
  topics text[];
begin
  begin
    select coalesce(array_agg(left(trim(t), 60)), '{}') into topics
    from (
      select jsonb_array_elements_text(case when jsonb_typeof(meta -> 'interests') = 'array' then meta -> 'interests' else '[]'::jsonb end) as t
      limit 12
    ) x
    where trim(t) <> '';
  exception when others then
    topics := '{}';
  end;
  insert into public.profiles (id, full_name, gender, country, province, city, organization, occupation, interests, phone)
  values (
    new.id,
    left(trim(coalesce(meta ->> 'full_name', '')), 120),
    case when g in ('female', 'male', 'prefer_not_to_say') then g else '' end,
    left(trim(coalesce(meta ->> 'country', '')), 80),
    left(trim(coalesce(meta ->> 'province', '')), 80),
    left(trim(coalesce(meta ->> 'city', '')), 80),
    left(trim(coalesce(meta ->> 'organization', '')), 160),
    left(trim(coalesce(meta ->> 'occupation', '')), 80),
    topics,
    left(trim(coalesce(meta ->> 'phone', '')), 30)
  );
  return new;
end $$;
