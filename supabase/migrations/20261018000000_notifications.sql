-- In-site notifications (with optional email) and last-visit tracking.
--
-- Notifications are created by triggers on the tables where activity happens, so
-- they appear whether the change came from the browser, a Server Action or the
-- SQL editor. Rows with email = true are picked up by the app's email dispatcher
-- (claim_notification_emails), which marks them sent.

-- ───────── Last visit (for the 7-day "we miss you" email) ─────────
-- Existing accounts start their 7-day clock now (no burst of reminders on release day).
alter table public.profiles
  add column if not exists last_seen_at timestamptz default now(),
  add column if not exists inactivity_emailed_at timestamptz;

-- Called by the signed-in browser; writes at most every 10 minutes.
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now()
  where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
$$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- ───────── Notifications ─────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  email boolean not null default false,   -- also send by email
  emailed_at timestamptz,                 -- set when the dispatcher claims it
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_email_queue_idx on public.notifications (created_at) where email and emailed_at is null;

alter table public.notifications enable row level security;
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications" on public.notifications for delete using (user_id = auth.uid());
-- No insert/update policies: rows come from the triggers below; reading state changes go through mark_notifications_read().

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_email boolean)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link, email)
  values (p_user, p_kind, left(p_title, 200), left(coalesce(p_body, ''), 2000), coalesce(p_link, ''), p_email);
$$;

-- Every admin and instructor (staff alerts are in-site only: the BDIM inbox already gets an email).
create or replace function public.notify_staff(p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link, email)
  select user_id, p_kind, left(p_title, 200), left(coalesce(p_body, ''), 2000), coalesce(p_link, ''), false
  from public.staff_roles;
$$;
revoke all on function public.notify(uuid, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.notify_staff(text, text, text, text) from public, anon, authenticated;

create or replace function public.display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(p.full_name), ''), u.email, 'A learner')
  from auth.users u left join public.profiles p on p.id = u.id where u.id = p_user;
$$;
revoke all on function public.display_name(uuid) from public, anon, authenticated;

-- ───────── Triggers ─────────

-- Enrollments: requested, approved, cancelled.
create or replace function public.notify_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  select title, slug into c from public.courses where id = new.course_id;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'active' then
      perform public.notify(new.user_id, 'enrollment_active', 'You''re enrolled in ' || c.title,
        'Your course is open. Start with the first lesson whenever you''re ready.', '/courses/' || c.slug, true);
    elsif new.status = 'requested' then
      perform public.notify(new.user_id, 'enrollment_requested', 'Enrollment request sent: ' || c.title,
        'We''ll let you know as soon as it''s approved.', '/courses/' || c.slug, false);
      perform public.notify_staff('staff_enrollment_request', 'New enrollment request',
        public.display_name(new.user_id) || ' asked to join ' || c.title || '.', '/admin/learners');
    elsif new.status = 'cancelled' and tg_op = 'UPDATE' then
      perform public.notify(new.user_id, 'enrollment_cancelled', 'Enrollment cancelled: ' || c.title,
        'Your enrollment was cancelled. Contact us if you think this is a mistake.', '/contact', true);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists notify_enrollment on public.enrollments;
create trigger notify_enrollment after insert or update of status on public.enrollments
  for each row execute function public.notify_enrollment();

-- Assignment submissions: received (learner + staff) and graded/reviewed (learner, emailed).
create or replace function public.notify_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
  a_title text;
begin
  select title, slug into c from public.courses where id = new.course_id;
  select m.assignment ->> 'title' into a_title from public.course_modules m
    where m.course_id = new.course_id and m.assignment ->> 'id' = new.assignment_id limit 1;
  a_title := coalesce(a_title, 'your assignment');
  if tg_op = 'INSERT' then
    perform public.notify(new.user_id, 'assignment_submitted', 'Submission received: ' || a_title,
      'Your work for ' || c.title || ' was uploaded. You''ll be notified when it''s marked.', '/dashboard?tab=grades', false);
    perform public.notify_staff('staff_submission', 'New submission to mark',
      public.display_name(new.user_id) || ' submitted "' || a_title || '" (' || c.title || ').', '/admin/assignments');
  elsif (new.graded_at is not null and new.graded_at is distinct from old.graded_at)
     or (new.status = 'reviewed' and old.status <> 'reviewed') then
    perform public.notify(new.user_id, 'assignment_graded', 'Your assignment has been marked: ' || a_title,
      case when new.score is not null then 'Score: ' || trim_scale(new.score) || ' / ' || coalesce(trim_scale(new.max_score)::text, '?') || '. ' else '' end
        || case when new.feedback <> '' then 'Feedback: ' || new.feedback else 'Open your grades to see the details.' end,
      '/dashboard?tab=grades', true);
  end if;
  return new;
end $$;
drop trigger if exists notify_assignment on public.assignment_submissions;
create trigger notify_assignment after insert or update on public.assignment_submissions
  for each row execute function public.notify_assignment();

-- Quiz results (in-site only; quizzes can be retaken often).
create or replace function public.notify_quiz()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  q_title text;
  c_slug text;
begin
  select q.title, c.slug into q_title, c_slug from public.quizzes q join public.courses c on c.id = q.course_id where q.id = new.quiz_id;
  perform public.notify(new.user_id, case when new.passed then 'quiz_passed' else 'quiz_failed' end,
    case when new.passed then 'Quiz passed: ' else 'Quiz result: ' end || coalesce(q_title, 'quiz'),
    'You scored ' || new.score || '%.' || case when new.passed then ' Well done!' else ' Review the lessons and try again.' end,
    '/courses/' || coalesce(c_slug, ''), false);
  return new;
end $$;
drop trigger if exists notify_quiz on public.quiz_submissions;
create trigger notify_quiz after insert on public.quiz_submissions
  for each row execute function public.notify_quiz();

-- Course completed: certificate issued.
create or replace function public.notify_certificate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.user_id, 'course_completed', 'Congratulations! You completed ' || new.course_title,
    'Your certificate ' || new.certificate_number || ' is ready to view, download and share.',
    '/dashboard/certificates/' || new.id, true);
  return new;
end $$;
drop trigger if exists notify_certificate on public.certificates;
create trigger notify_certificate after insert on public.certificates
  for each row execute function public.notify_certificate();

-- New library document published: everyone who can open it.
create or replace function public.notify_library_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    insert into public.notifications (user_id, kind, title, body, link, email)
    select p.id, 'library_new', 'New in the library: ' || left(new.title, 160),
      coalesce(nullif(left(new.description, 300), ''), 'A new ' || new.kind || ' has been added.'), '/library', true
    from public.profiles p
    where new.visibility in ('public', 'members')
       or exists (select 1 from public.enrollments e where e.user_id = p.id and e.course_id = new.course_id and e.status in ('active', 'completed'))
       or exists (select 1 from public.staff_roles s where s.user_id = p.id);
  end if;
  return new;
end $$;
drop trigger if exists notify_library_item on public.library_items;
create trigger notify_library_item after insert or update of published on public.library_items
  for each row execute function public.notify_library_item();

-- Library orders: placed (staff) and payment confirmed (learner, emailed).
create or replace function public.notify_library_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  i_title text;
begin
  select title into i_title from public.library_items where id = new.item_id;
  if tg_op = 'INSERT' then
    perform public.notify(new.user_id, 'order_placed', 'Order received: ' || coalesce(i_title, 'library item'),
      'We''ll unlock it as soon as your payment is confirmed.', '/library', false);
    perform public.notify_staff('staff_order', 'New library order',
      public.display_name(new.user_id) || ' ordered "' || coalesce(i_title, 'an item') || '" (' || new.amount || ' ' || new.currency || ').', '/admin/library#orders');
  elsif new.status = 'paid' and old.status <> 'paid' then
    perform public.notify(new.user_id, 'order_paid', 'Payment confirmed: ' || coalesce(i_title, 'library item'),
      'It''s unlocked — download it from the library.', '/library', true);
  end if;
  return new;
end $$;
drop trigger if exists notify_library_order on public.library_orders;
create trigger notify_library_order after insert or update of status on public.library_orders
  for each row execute function public.notify_library_order();

-- ───────── Email queue (service role only) ─────────
-- Atomically claims unsent email notifications so two dispatchers never send the same one.
create or replace function public.claim_notification_emails(p_limit integer default 50)
returns table (id uuid, kind text, title text, body text, link text, email text, full_name text, opted_out boolean)
language sql security definer set search_path = public as $$
  with picked as (
    select n.id from public.notifications n
    where n.email and n.emailed_at is null and n.created_at > now() - interval '3 days'
    order by n.created_at
    limit p_limit
    for update skip locked
  ), claimed as (
    update public.notifications n set emailed_at = now() from picked where n.id = picked.id
    returning n.id, n.kind, n.title, n.body, n.link, n.user_id
  )
  select c.id, c.kind, c.title, c.body, c.link, u.email::text, coalesce(p.full_name, ''),
    coalesce((p.preferences ->> 'emailNotifications')::boolean = false, false)
  from claimed c join auth.users u on u.id = c.user_id left join public.profiles p on p.id = c.user_id;
$$;
revoke all on function public.claim_notification_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_emails(integer) to service_role;

-- Learners away for p_days or more who haven't been emailed since their last visit.
create or replace function public.claim_inactive_learners(p_days integer default 7, p_limit integer default 100)
returns table (id uuid, email text, full_name text, last_seen_at timestamptz)
language sql security definer set search_path = public as $$
  with picked as (
    select p.id from public.profiles p
    where p.last_seen_at < now() - make_interval(days => p_days)
      and (p.inactivity_emailed_at is null or p.inactivity_emailed_at < p.last_seen_at)
      and coalesce((p.preferences ->> 'emailNotifications')::boolean, true)
      and not exists (select 1 from public.staff_roles s where s.user_id = p.id)
    order by p.last_seen_at
    limit p_limit
    for update skip locked
  ), claimed as (
    update public.profiles p set inactivity_emailed_at = now() from picked where p.id = picked.id
    returning p.id, p.full_name, p.last_seen_at
  )
  select c.id, u.email::text, c.full_name, c.last_seen_at
  from claimed c join auth.users u on u.id = c.id
  where u.email is not null;
$$;
revoke all on function public.claim_inactive_learners(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_inactive_learners(integer, integer) to service_role;
