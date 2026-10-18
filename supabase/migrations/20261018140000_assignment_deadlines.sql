-- Assignment deadlines. A module's assignment may carry "dueAt" (ISO time) in
-- course_modules.assignment; once it has passed, learners can no longer submit
-- or upload files for it. Staff are not affected.

create or replace function public.assignment_open(p_course_id text, p_assignment_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.course_modules m
    where m.course_id = p_course_id
      and m.assignment ->> 'id' = p_assignment_id
      and coalesce(m.assignment ->> 'dueAt', '') <> ''
      and (m.assignment ->> 'dueAt')::timestamptz <= now()
  );
$$;
grant execute on function public.assignment_open(text, text) to authenticated;

drop policy if exists "submit own assignments" on public.assignment_submissions;
create policy "submit own assignments" on public.assignment_submissions for insert with check (
  user_id = auth.uid() and status = 'submitted' and feedback = '' and score is null and graded_at is null and graded_by is null
  and public.assignment_open(course_id, assignment_id)
);

-- Files live at <user_id>/<course_id>/<assignment_id>/<file>.
drop policy if exists "learners upload own submission files" on storage.objects;
create policy "learners upload own submission files" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.assignment_open((storage.foldername(name))[2], (storage.foldername(name))[3])
  );
