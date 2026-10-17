-- Fix: gen_random_bytes() lives in Supabase's "extensions" schema and is not
-- visible with search_path = public. Use the built-in gen_random_uuid() instead.
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
  values (auth.uid(), p_course_id, 'BDIM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), coalesce(learner, 'Learner'), c.title)
  returning * into result;

  update public.enrollments set status = 'completed', updated_at = now() where user_id = auth.uid() and course_id = p_course_id;
  return result;
end $$;
