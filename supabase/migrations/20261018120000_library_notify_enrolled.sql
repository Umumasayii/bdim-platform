-- New library content notifies only learners enrolled in the item's course
-- (active or completed). Items not linked to a course notify nobody.
create or replace function public.notify_library_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c_title text;
begin
  if new.published and new.course_id is not null and (tg_op = 'INSERT' or not old.published or old.course_id is distinct from new.course_id) then
    select title into c_title from public.courses where id = new.course_id;
    insert into public.notifications (user_id, kind, title, body, link, email)
    select e.user_id, 'library_new', 'New for ' || coalesce(c_title, 'your course') || ': ' || left(new.title, 140),
      coalesce(nullif(left(new.description, 300), ''), 'A new ' || new.kind || ' has been added for your course.'), '/library', true
    from public.enrollments e
    where e.course_id = new.course_id and e.status in ('active', 'completed');
  end if;
  return new;
end $$;

drop trigger if exists notify_library_item on public.library_items;
create trigger notify_library_item after insert or update of published, course_id on public.library_items
  for each row execute function public.notify_library_item();
