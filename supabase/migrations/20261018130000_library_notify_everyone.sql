-- Reverts 20261018120000: every newly published library item notifies every
-- member (bell + email), whatever its course or visibility.
create or replace function public.notify_library_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c_title text;
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    select title into c_title from public.courses where id = new.course_id;
    insert into public.notifications (user_id, kind, title, body, link, email)
    select p.id, 'library_new', 'New in the library: ' || left(new.title, 160),
      coalesce(nullif(left(new.description, 300), ''), 'A new ' || new.kind || ' has been added' || coalesce(' for ' || c_title, '') || '.'), '/library', true
    from public.profiles p;
  end if;
  return new;
end $$;

drop trigger if exists notify_library_item on public.library_items;
create trigger notify_library_item after insert or update of published on public.library_items
  for each row execute function public.notify_library_item();
