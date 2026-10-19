-- 1. Profile details collected at sign-up (and editable in the profile).
-- 2. People are told (bell + email) when their role changes.

-- ───────── Profile details ─────────
alter table public.profiles
  add column if not exists gender text not null default '',
  add column if not exists country text not null default '',
  add column if not exists city text not null default '',          -- district for Rwanda, otherwise city/town
  add column if not exists organization text not null default '',
  add column if not exists occupation text not null default '',
  add column if not exists interests text[] not null default '{}',
  add column if not exists phone text not null default '';

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender in ('', 'female', 'male', 'prefer_not_to_say'));

-- Copies the sign-up form's details into the profile. Every value is
-- trimmed and size-limited; anything unexpected becomes empty, so a
-- malformed request can never block an account from being created.
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
  insert into public.profiles (id, full_name, gender, country, city, organization, occupation, interests, phone)
  values (
    new.id,
    left(trim(coalesce(meta ->> 'full_name', '')), 120),
    case when g in ('female', 'male', 'prefer_not_to_say') then g else '' end,
    left(trim(coalesce(meta ->> 'country', '')), 80),
    left(trim(coalesce(meta ->> 'city', '')), 80),
    left(trim(coalesce(meta ->> 'organization', '')), 160),
    left(trim(coalesce(meta ->> 'occupation', '')), 80),
    topics,
    left(trim(coalesce(meta ->> 'phone', '')), 30)
  );
  return new;
end $$;

-- ───────── Role change alerts ─────────
create or replace function public.notify_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := coalesce(new.user_id, old.user_id);
  new_role text := case when tg_op = 'DELETE' then 'learner' else new.role end;
  old_role text := case when tg_op = 'INSERT' then 'learner' else old.role end;
begin
  if new_role = old_role then
    return null;
  end if;
  -- The account itself is being deleted (Remove member): nobody to notify.
  if not exists (select 1 from auth.users where id = uid) then
    return null;
  end if;
  if new_role = 'admin' then
    perform public.notify(uid, 'role_changed', 'You are now an Admin',
      'You have full access to the admin area: users and roles, courses, library, payments, bookings and settings. Open it from the Admin button at the top of the website.',
      '/admin', true);
  elsif new_role = 'instructor' then
    perform public.notify(uid, 'role_changed', 'You are now an Instructor',
      'You can now edit courses, questions, learning paths and the library, approve enrollments and mark assignments. Open the Instructor panel from the button at the top of the website.',
      '/admin', true);
  else
    perform public.notify(uid, 'role_changed', 'Your staff access has ended',
      'Your account is now a learner account. Your courses, progress and certificates are unchanged.',
      '/dashboard', true);
  end if;
  return null;
end $$;

drop trigger if exists notify_role_change on public.staff_roles;
create trigger notify_role_change after insert or update of role or delete on public.staff_roles
  for each row execute function public.notify_role_change();
