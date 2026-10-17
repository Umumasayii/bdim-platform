-- BDIM learning platform — initial schema
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- Row-level security is enabled on every table. Administrator rights are only
-- granted by inserting into public.staff_roles as the database owner (see README);
-- public sign-up never grants staff access.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ───────────────────────── Profiles & roles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('instructor', 'admin')),
  granted_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_roles where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_roles where user_id = auth.uid() and role = 'admin');
$$;

-- ───────────────────────── Course content ─────────────────────────
create table public.courses (
  id text primary key,
  slug text not null unique,
  title text not null,
  category text not null,
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  summary text not null default '',
  description text not null default '',
  prerequisites text[] not null default '{}',
  skills text[] not null default '{}',
  objectives text[] not null default '{}',
  tools text[] not null default '{}',
  formats text[] not null default '{}',
  duration text not null default '',
  pricing jsonb not null default '{"mode":"quote"}'::jsonb,
  enrollment_mode text not null default 'approval' check (enrollment_mode in ('open', 'approval')),
  certificate jsonb not null default '{"enabled":true,"requireAllLessons":true,"minQuizScore":70}'::jsonb,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_modules (
  id text primary key,
  course_id text not null references public.courses on delete cascade,
  position integer not null default 0,
  title text not null,
  summary text not null default '',
  assignment jsonb
);
create index on public.course_modules (course_id);

create table public.lessons (
  id text primary key,
  module_id text not null references public.course_modules on delete cascade,
  course_id text not null references public.courses on delete cascade,
  position integer not null default 0,
  title text not null,
  summary text not null default '',
  duration_minutes integer not null default 0,
  is_sample boolean not null default false,
  exercise_id text,
  resources jsonb not null default '[]'::jsonb
);
create index on public.lessons (course_id);

-- Lesson bodies are separate so outlines can be public while content is gated.
create table public.lesson_contents (
  lesson_id text primary key references public.lessons on delete cascade,
  body text not null default ''
);

-- Quizzes include answer keys and are readable by staff only.
-- Learners use get_quiz() / submit_quiz().
create table public.quizzes (
  id text primary key,
  module_id text not null references public.course_modules on delete cascade,
  course_id text not null references public.courses on delete cascade,
  title text not null,
  pass_mark integer not null default 70,
  questions jsonb not null default '[]'::jsonb
);

create view public.quiz_outlines as
  select q.id, q.module_id, q.course_id, q.title, q.pass_mark, jsonb_array_length(q.questions) as question_count
  from public.quizzes q join public.courses c on c.id = q.course_id
  where c.published;

create table public.learning_paths (
  id text primary key,
  slug text not null unique,
  title text not null,
  level text not null,
  summary text not null default '',
  audience text not null default '',
  prerequisites text[] not null default '{}',
  objectives text[] not null default '{}',
  course_slugs text[] not null default '{}',
  assignments text[] not null default '{}',
  estimated_duration text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0
);

create table public.questions (
  id text primary key,
  slug text not null unique,
  title text not null,
  prompt text not null,
  topic text not null,
  difficulty text not null,
  type text not null,
  language text,
  options jsonb,
  answer jsonb,
  tolerance numeric,
  formula_grid jsonb,
  hints jsonb not null default '[]'::jsonb,
  solution text not null default '',
  explanation text not null default '',
  related_course_slugs text[] not null default '{}',
  lab_exercise_id text,
  tags text[] not null default '{}',
  is_sample boolean not null default true,
  published boolean not null default false,
  free boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.instructors (
  id text primary key,
  user_id uuid references auth.users on delete set null,
  name text not null,
  title text not null default '',
  bio text not null default '',
  photo_url text not null default '',
  expertise text[] not null default '{}',
  teaching_interests text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  verified boolean not null default false,
  published boolean not null default false
);

create table public.testimonials (
  id text primary key,
  name text not null,
  role text not null default '',
  organization text not null default '',
  quote text not null,
  verified boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint publish_requires_verification check (not published or verified)
);

-- ───────────────────────── Bookings & inquiries ─────────────────────────
create table public.bookable_services (
  id text primary key,
  title text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  instructor_id text not null references public.instructors,
  pricing_note text not null default 'Pricing on request',
  active boolean not null default true,
  mode text not null default 'Online'
);

create table public.booking_settings (
  id integer primary key default 1 check (id = 1),
  settings jsonb not null
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  service_id text not null references public.bookable_services,
  instructor_id text not null references public.instructors,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  name text not null,
  email text not null,
  phone text not null default '',
  organization text not null default '',
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  manage_token text not null unique,
  user_id uuid references auth.users on delete set null,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- No two active bookings for the same instructor may overlap.
  constraint no_overlapping_bookings exclude using gist (
    instructor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'))
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('consulting', 'training', 'course', 'contact')),
  service_category text not null default '',
  course_slug text not null default '',
  name text not null,
  email text not null,
  phone text not null default '',
  organization text not null default '',
  description text not null,
  deadline text not null default '',
  participants text not null default '',
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new', 'in_progress', 'responded', 'closed')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Busy intervals without personal data, for public slot availability.
create or replace function public.booked_intervals(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz, instructor_id text)
language sql stable security definer set search_path = public as $$
  select b.starts_at, b.ends_at, b.instructor_id
  from public.bookings b
  where b.status in ('pending', 'confirmed')
    and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_from, p_to);
$$;

-- ───────────────────────── Learner data ─────────────────────────
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id text not null references public.courses on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create or replace function public.has_course_access(p_course_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id = p_course_id and e.status in ('active', 'completed')
  );
$$;

create table public.lesson_progress (
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null references public.lessons on delete cascade,
  course_id text not null references public.courses on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.lesson_notes (
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null references public.lessons on delete cascade,
  course_id text not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.lesson_bookmarks (
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null references public.lessons on delete cascade,
  course_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  quiz_id text not null references public.quizzes on delete cascade,
  course_id text not null,
  answers jsonb not null,
  score integer not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id text not null,
  assignment_id text not null,
  body text not null default '',
  link text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  question_id text not null references public.questions on delete cascade,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index on public.practice_attempts (user_id, created_at desc);

create table public.saved_questions (
  user_id uuid not null references auth.users on delete cascade,
  question_id text not null references public.questions on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.question_completions (
  user_id uuid not null references auth.users on delete cascade,
  question_id text not null references public.questions on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.question_comments (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.questions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null,
  body text not null check (char_length(body) between 1 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text not null default '',
  url text not null default '',
  course_id text,
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id text not null references public.courses on delete cascade,
  certificate_number text not null unique,
  learner_name text not null,
  course_title text not null,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ───────────────────────── Quiz & certificate functions ─────────────────────────
create or replace function public.get_quiz(p_quiz_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q public.quizzes;
begin
  select * into q from public.quizzes where id = p_quiz_id;
  if not found then return null; end if;
  if not public.has_course_access(q.course_id) then
    raise exception 'not_enrolled' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'id', q.id, 'title', q.title, 'passMark', q.pass_mark,
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object('id', x ->> 'id', 'prompt', x ->> 'prompt', 'options', x -> 'options')), '[]'::jsonb)
      from jsonb_array_elements(q.questions) x
    )
  );
end $$;

create or replace function public.submit_quiz(p_quiz_id text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q public.quizzes;
  total integer;
  correct integer := 0;
  results jsonb := '[]'::jsonb;
  item jsonb;
  given integer;
  pct integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into q from public.quizzes where id = p_quiz_id;
  if not found then raise exception 'quiz_not_found'; end if;
  if not public.has_course_access(q.course_id) then raise exception 'not_enrolled' using errcode = '42501'; end if;

  total := jsonb_array_length(q.questions);
  for item in select * from jsonb_array_elements(q.questions) loop
    given := nullif(p_answers ->> (item ->> 'id'), '')::integer;
    if given is not null and given = (item ->> 'answerIndex')::integer then correct := correct + 1; end if;
    results := results || jsonb_build_object(
      'id', item ->> 'id',
      'correct', given is not null and given = (item ->> 'answerIndex')::integer,
      'answerIndex', (item ->> 'answerIndex')::integer,
      'explanation', coalesce(item ->> 'explanation', '')
    );
  end loop;

  pct := case when total = 0 then 0 else round(100.0 * correct / total) end;
  insert into public.quiz_submissions (user_id, quiz_id, course_id, answers, score, passed)
  values (auth.uid(), q.id, q.course_id, p_answers, pct, pct >= q.pass_mark);

  return jsonb_build_object('score', pct, 'passed', pct >= q.pass_mark, 'passMark', q.pass_mark, 'results', results);
end $$;

create or replace function public.issue_certificate(p_course_id text)
returns public.certificates language plpgsql security definer set search_path = public as $$
declare
  c public.courses;
  rules jsonb;
  existing public.certificates;
  lesson_total integer;
  lesson_done integer;
  failing integer;
  learner text;
  result public.certificates;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into existing from public.certificates where user_id = auth.uid() and course_id = p_course_id;
  if found then return existing; end if;

  select * into c from public.courses where id = p_course_id and published;
  if not found then raise exception 'course_not_found'; end if;
  rules := c.certificate;
  if not coalesce((rules ->> 'enabled')::boolean, false) then raise exception 'certificates_disabled'; end if;
  if not exists (select 1 from public.enrollments where user_id = auth.uid() and course_id = p_course_id and status in ('active', 'completed')) then
    raise exception 'not_enrolled' using errcode = '42501';
  end if;

  if coalesce((rules ->> 'requireAllLessons')::boolean, true) then
    select count(*) into lesson_total from public.lessons where course_id = p_course_id;
    select count(*) into lesson_done from public.lesson_progress where user_id = auth.uid() and course_id = p_course_id;
    if lesson_done < lesson_total then raise exception 'requirements_not_met: lessons'; end if;
  end if;

  select count(*) into failing from public.quizzes qz
  where qz.course_id = p_course_id and coalesce((
    select max(s.score) from public.quiz_submissions s where s.user_id = auth.uid() and s.quiz_id = qz.id
  ), -1) < coalesce((rules ->> 'minQuizScore')::integer, qz.pass_mark);
  if failing > 0 then raise exception 'requirements_not_met: quizzes'; end if;

  select nullif(full_name, '') into learner from public.profiles where id = auth.uid();
  insert into public.certificates (user_id, course_id, certificate_number, learner_name, course_title)
  values (auth.uid(), p_course_id, 'BDIM-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)), coalesce(learner, 'Learner'), c.title)
  returning * into result;

  update public.enrollments set status = 'completed', updated_at = now() where user_id = auth.uid() and course_id = p_course_id;
  return result;
end $$;

create or replace function public.verify_certificate(p_number text)
returns table (learner_name text, course_title text, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select learner_name, course_title, issued_at from public.certificates where certificate_number = p_number;
$$;

-- ───────────────────────── Row-level security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.quizzes enable row level security;
alter table public.learning_paths enable row level security;
alter table public.questions enable row level security;
alter table public.instructors enable row level security;
alter table public.testimonials enable row level security;
alter table public.bookable_services enable row level security;
alter table public.booking_settings enable row level security;
alter table public.bookings enable row level security;
alter table public.inquiries enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.lesson_bookmarks enable row level security;
alter table public.quiz_submissions enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.saved_questions enable row level security;
alter table public.question_completions enable row level security;
alter table public.question_comments enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.certificates enable row level security;

-- Profiles & roles
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own role read" on public.staff_roles for select using (user_id = auth.uid() or public.is_admin());
create policy "admins manage roles" on public.staff_roles for all using (public.is_admin()) with check (public.is_admin());

-- Content: public read of published rows, staff write
create policy "read published courses" on public.courses for select using (published or public.is_staff());
create policy "staff write courses" on public.courses for all using (public.is_staff()) with check (public.is_staff());
create policy "read modules" on public.course_modules for select
  using (public.is_staff() or exists (select 1 from public.courses c where c.id = course_id and c.published));
create policy "staff write modules" on public.course_modules for all using (public.is_staff()) with check (public.is_staff());
create policy "read lessons" on public.lessons for select
  using (public.is_staff() or exists (select 1 from public.courses c where c.id = course_id and c.published));
create policy "staff write lessons" on public.lessons for all using (public.is_staff()) with check (public.is_staff());
create policy "read lesson content" on public.lesson_contents for select using (
  exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.published and (l.is_sample or public.has_course_access(l.course_id))
  ) or public.is_staff()
);
create policy "staff write lesson content" on public.lesson_contents for all using (public.is_staff()) with check (public.is_staff());
create policy "staff read quizzes" on public.quizzes for select using (public.is_staff());
create policy "staff write quizzes" on public.quizzes for all using (public.is_staff()) with check (public.is_staff());

create policy "read published paths" on public.learning_paths for select using (published or public.is_staff());
create policy "staff write paths" on public.learning_paths for all using (public.is_staff()) with check (public.is_staff());
create policy "read published questions" on public.questions for select using (published or public.is_staff());
create policy "staff write questions" on public.questions for all using (public.is_staff()) with check (public.is_staff());
create policy "read published instructors" on public.instructors for select using (published or public.is_staff());
create policy "admin write instructors" on public.instructors for all using (public.is_admin()) with check (public.is_admin());
create policy "read verified testimonials" on public.testimonials for select using ((published and verified) or public.is_admin());
create policy "admin write testimonials" on public.testimonials for all using (public.is_admin()) with check (public.is_admin());

-- Booking configuration
create policy "read active services" on public.bookable_services for select using (active or public.is_admin());
create policy "admin write services" on public.bookable_services for all using (public.is_admin()) with check (public.is_admin());
create policy "read booking settings" on public.booking_settings for select using (true);
create policy "admin write booking settings" on public.booking_settings for all using (public.is_admin()) with check (public.is_admin());

-- Bookings & inquiries: created server-side with the service role; admins manage.
create policy "admin read bookings" on public.bookings for select using (public.is_admin());
create policy "admin update bookings" on public.bookings for update using (public.is_admin()) with check (public.is_admin());
create policy "admin read inquiries" on public.inquiries for select using (public.is_admin());
create policy "admin update inquiries" on public.inquiries for update using (public.is_admin()) with check (public.is_admin());

-- Enrollments
create policy "read own enrollments" on public.enrollments for select using (user_id = auth.uid() or public.is_staff());
create policy "request or self-enroll" on public.enrollments for insert with check (
  user_id = auth.uid() and (
    status = 'requested' or (
      status = 'active' and exists (
        select 1 from public.courses c where c.id = course_id and c.published and c.enrollment_mode = 'open'
      )
    )
  )
);
create policy "staff manage enrollments" on public.enrollments for update using (public.is_staff()) with check (public.is_staff());

-- Learner-owned records
create policy "own progress" on public.lesson_progress for select using (user_id = auth.uid() or public.is_staff());
create policy "record own progress" on public.lesson_progress for insert with check (
  user_id = auth.uid() and (
    public.has_course_access(course_id)
    or exists (select 1 from public.lessons l where l.id = lesson_id and l.is_sample)
  )
);
create policy "remove own progress" on public.lesson_progress for delete using (user_id = auth.uid());

create policy "own notes" on public.lesson_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own bookmarks" on public.lesson_bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own quiz submissions" on public.quiz_submissions for select using (user_id = auth.uid() or public.is_staff());
create policy "own assignment submissions" on public.assignment_submissions for select using (user_id = auth.uid() or public.is_staff());
create policy "submit own assignments" on public.assignment_submissions for insert
  with check (user_id = auth.uid() and status = 'submitted' and feedback = '');
create policy "staff review assignments" on public.assignment_submissions for update using (public.is_staff()) with check (public.is_staff());

create policy "own attempts" on public.practice_attempts for select using (user_id = auth.uid() or public.is_staff());
create policy "record own attempts" on public.practice_attempts for insert with check (user_id = auth.uid());
create policy "own saved questions" on public.saved_questions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own completions" on public.question_completions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own portfolio" on public.portfolio_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read portfolios" on public.portfolio_items for select using (public.is_staff());
create policy "own certificates" on public.certificates for select using (user_id = auth.uid() or public.is_staff());

-- Discussions
create policy "read visible comments" on public.question_comments for select using (not hidden or public.is_staff());
create policy "post own comments" on public.question_comments for insert with check (user_id = auth.uid() and not hidden);
create policy "delete own comments" on public.question_comments for delete using (user_id = auth.uid() or public.is_staff());
create policy "staff moderate comments" on public.question_comments for update using (public.is_staff()) with check (public.is_staff());

-- Grants for API roles (RLS still applies)
grant select on public.quiz_outlines to anon, authenticated;
grant execute on function public.booked_intervals(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.get_quiz(text) to authenticated;
grant execute on function public.submit_quiz(text, jsonb) to authenticated;
grant execute on function public.issue_certificate(text) to authenticated;

-- ───────────────────────── Storage ─────────────────────────
-- Private bucket for downloadable course materials. Objects are stored as
-- <course_id>/<file>. Downloads are served through short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

create policy "enrolled learners read materials" on storage.objects for select using (
  bucket_id = 'course-materials' and public.has_course_access(split_part(name, '/', 1))
);
create policy "staff manage materials" on storage.objects for all
  using (bucket_id = 'course-materials' and public.is_staff())
  with check (bucket_id = 'course-materials' and public.is_staff());
