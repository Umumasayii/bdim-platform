-- Library, lesson videos and uploads, graded file submissions.

-- ───────── Lessons: optional video (YouTube/Vimeo link or uploaded file) ─────────
alter table public.lessons add column if not exists video_url text not null default '';

-- Course materials bucket (created in the initial migration): files are stored at
-- <course_id>/<lesson_id>/<file>. Also allow free-sample lessons' files to be
-- viewed by anyone, so sample videos and handouts work for visitors.
update storage.buckets set file_size_limit = 52428800 where id = 'course-materials';

drop policy if exists "sample lesson materials are readable" on storage.objects;
create policy "sample lesson materials are readable" on storage.objects for select using (
  bucket_id = 'course-materials' and exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = split_part(name, '/', 2) and l.course_id = split_part(name, '/', 1) and l.is_sample and c.published
  )
);

-- ───────── Library: books, notes, videos, datasets ─────────
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  kind text not null default 'notes' check (kind in ('book', 'notes', 'video', 'dataset', 'slides', 'other')),
  file_path text not null default '',      -- object path in the "library" bucket
  file_name text not null default '',
  file_size bigint not null default 0,
  external_url text not null default '',   -- or a link (YouTube, Google Drive…)
  course_id text references public.courses on delete set null,
  visibility text not null default 'members' check (visibility in ('public', 'members', 'enrolled')),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (file_path <> '' or external_url <> '')
);
alter table public.library_items enable row level security;

drop policy if exists "read published library items" on public.library_items;
create policy "read published library items" on public.library_items for select using (published or public.is_staff());
drop policy if exists "staff manage library" on public.library_items;
create policy "staff manage library" on public.library_items for all using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit)
values ('library', 'library', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "library files follow item visibility" on storage.objects;
create policy "library files follow item visibility" on storage.objects for select using (
  bucket_id = 'library' and (
    public.is_staff() or exists (
      select 1 from public.library_items li
      where li.file_path = name and li.published and (
        li.visibility = 'public'
        or (li.visibility = 'members' and auth.uid() is not null)
        or (li.visibility = 'enrolled' and li.course_id is not null and public.has_course_access(li.course_id))
      )
    )
  )
);
drop policy if exists "staff manage library files" on storage.objects;
create policy "staff manage library files" on storage.objects for all
  using (bucket_id = 'library' and public.is_staff())
  with check (bucket_id = 'library' and public.is_staff());

-- ───────── Assignment submissions: files and grades ─────────
alter table public.assignment_submissions
  add column if not exists file_path text not null default '',
  add column if not exists file_name text not null default '',
  add column if not exists score numeric,
  add column if not exists max_score numeric,
  add column if not exists graded_at timestamptz,
  add column if not exists graded_by uuid references auth.users on delete set null;

-- Learners can only create ungraded submissions.
drop policy if exists "submit own assignments" on public.assignment_submissions;
create policy "submit own assignments" on public.assignment_submissions for insert with check (
  user_id = auth.uid() and status = 'submitted' and feedback = '' and score is null and graded_at is null and graded_by is null
);

-- Private bucket for learners' files: <user_id>/<course_id>/<assignment_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit)
values ('submissions', 'submissions', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "learners upload own submission files" on storage.objects;
create policy "learners upload own submission files" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "learners read own submission files" on storage.objects;
create policy "learners read own submission files" on storage.objects for select
  using (bucket_id = 'submissions' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
