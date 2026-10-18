-- Staff alerts are also emailed. The app sends each alert once to the BDIM
-- inbox (BDIM_NOTIFICATION_EMAIL), not to every staff member's own address.
create or replace function public.notify_staff(p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link, email)
  select user_id, p_kind, left(p_title, 200), left(coalesce(p_body, ''), 2000), coalesce(p_link, ''), true
  from public.staff_roles;
$$;
revoke all on function public.notify_staff(text, text, text, text) from public, anon, authenticated;

-- New member joined.
create or replace function public.notify_new_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u_email text;
begin
  select email into u_email from auth.users where id = new.id;
  perform public.notify_staff('staff_new_user', 'New member: ' || coalesce(nullif(trim(new.full_name), ''), u_email, 'someone'),
    coalesce(nullif(trim(new.full_name), '') || ' (' || u_email || ')', u_email, 'A new account') || ' just created an account on the website.',
    '/admin/users/' || new.id);
  return new;
end $$;
drop trigger if exists notify_new_member on public.profiles;
create trigger notify_new_member after insert on public.profiles
  for each row execute function public.notify_new_member();

-- Buyers also get an email when their order is received.
create or replace function public.notify_library_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  i_title text;
begin
  select title into i_title from public.library_items where id = new.item_id;
  if tg_op = 'INSERT' then
    perform public.notify(new.user_id, 'order_placed', 'Order received: ' || coalesce(i_title, 'library item'),
      'Thank you! We''ll unlock it as soon as your payment is confirmed, and email you when it''s ready.', '/library', true);
    perform public.notify_staff('staff_order', 'New library order',
      public.display_name(new.user_id) || ' ordered "' || coalesce(i_title, 'an item') || '" (' || new.amount || ' ' || new.currency || ').'
        || case when new.payer_phone <> '' then ' Paid from: ' || new.payer_phone || '.' else '' end
        || case when new.payment_reference <> '' then ' Reference: ' || new.payment_reference || '.' else '' end
        || case when new.note <> '' then ' Note: ' || new.note else '' end,
      '/admin/library#orders');
  elsif new.status = 'paid' and old.status <> 'paid' then
    perform public.notify(new.user_id, 'order_paid', 'Payment confirmed: ' || coalesce(i_title, 'library item'),
      'It''s unlocked — download it from the library.', '/library', true);
  end if;
  return new;
end $$;
