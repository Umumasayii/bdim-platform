-- Paid library items (books, notes…): learners order, pay by Mobile Money or bank,
-- and staff confirm the payment, which unlocks the download.

-- ───────── Price on library items (0 = free) ─────────
alter table public.library_items
  add column if not exists price numeric not null default 0 check (price >= 0),
  add column if not exists currency text not null default 'RWF';

-- A paid item must be an uploaded file: a plain link would be readable by anyone.
alter table public.library_items drop constraint if exists library_items_paid_needs_file;
alter table public.library_items add constraint library_items_paid_needs_file check (price = 0 or (file_path <> '' and external_url = ''));

-- ───────── Orders ─────────
create table if not exists public.library_orders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount numeric not null check (amount >= 0),
  currency text not null default 'RWF',
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  payer_phone text not null default '',
  payment_reference text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  confirmed_by uuid references auth.users on delete set null
);
create index if not exists library_orders_user_idx on public.library_orders (user_id);
create unique index if not exists library_orders_one_open on public.library_orders (item_id, user_id) where status <> 'cancelled';

alter table public.library_orders enable row level security;
drop policy if exists "own library orders" on public.library_orders;
create policy "own library orders" on public.library_orders for select using (user_id = auth.uid() or public.is_staff());
-- Learners create pending orders at the item's current price; only staff confirm.
drop policy if exists "place library orders" on public.library_orders;
create policy "place library orders" on public.library_orders for insert to authenticated with check (
  user_id = auth.uid() and status = 'pending' and paid_at is null and confirmed_by is null
  and exists (
    select 1 from public.library_items li
    where li.id = item_id and li.published and li.price > 0 and li.price = amount and li.currency = library_orders.currency
  )
);
drop policy if exists "staff manage library orders" on public.library_orders;
create policy "staff manage library orders" on public.library_orders for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.has_library_purchase(p_item uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.library_orders where item_id = p_item and user_id = auth.uid() and status = 'paid');
$$;

-- Files: free items follow their visibility; paid items need a confirmed purchase.
drop policy if exists "library files follow item visibility" on storage.objects;
create policy "library files follow item visibility" on storage.objects for select using (
  bucket_id = 'library' and (
    public.is_staff() or exists (
      select 1 from public.library_items li
      where li.file_path = name and li.published and (
        (li.price > 0 and public.has_library_purchase(li.id))
        or (li.price = 0 and (
          li.visibility = 'public'
          or (li.visibility = 'members' and auth.uid() is not null)
          or (li.visibility = 'enrolled' and li.course_id is not null and public.has_course_access(li.course_id))
        ))
      )
    )
  )
);

-- ───────── Payment details shown to buyers (edited in the admin) ─────────
create table if not exists public.payment_settings (
  id integer primary key default 1 check (id = 1),
  momo_number text not null default '',
  momo_name text not null default '',
  bank_details text not null default '',
  instructions text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.payment_settings (id) values (1) on conflict (id) do nothing;
alter table public.payment_settings enable row level security;
drop policy if exists "read payment settings" on public.payment_settings;
create policy "read payment settings" on public.payment_settings for select using (true);
drop policy if exists "staff edit payment settings" on public.payment_settings;
create policy "staff edit payment settings" on public.payment_settings for update using (public.is_admin()) with check (public.is_admin());
