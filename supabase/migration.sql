-- ============================================================================
-- Framely — Supabase şema + RLS + seed
-- Supabase Dashboard → SQL Editor'da bir kez çalıştırın.
-- ============================================================================

-- ── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── PRODUCTS ────────────────────────────────────────────────────────────────
-- not: "desc" SQL'de reserved word → kolon adı "descr". Kodda desc<->descr map'lenir.
create table if not exists public.products (
  id         text primary key,
  name       text not null,
  descr      text,
  cols       int  not null default 5,
  rows       int  not null default 7,
  gap        int  not null default 4,
  pad        int  not null default 12,
  orient     text not null default 'portrait',
  icon       text,
  price      numeric not null default 149,
  width      int,
  height     int,
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── ORDERS ──────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  user_name       text,
  user_email      text,
  preset_id       text references public.products(id) on delete set null,
  preset_name     text,
  preset_desc     text,
  icon            text,
  quantity        int not null default 1,
  price           numeric not null default 0,
  total           numeric not null default 0,
  address         jsonb,
  card_last4      text,
  status          text not null default 'Hazırlanıyor',
  design_pdf_path text,
  created_at      timestamptz not null default now()
);

create index if not exists orders_user_id_idx    on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ── ADMIN KONTROL FONKSİYONU (security definer — RLS recursion'ı önler) ──────
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── YENİ KULLANICI → PROFİL TRIGGER ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders   enable row level security;

-- profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

-- products
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (true);

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- orders
drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert with check (user_id = auth.uid());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete on public.orders
  for delete using (public.is_admin());

-- ── STORAGE BUCKET (order-designs, private) ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('order-designs', 'order-designs', false)
on conflict (id) do nothing;

drop policy if exists design_insert_own on storage.objects;
create policy design_insert_own on storage.objects
  for insert with check (
    bucket_id = 'order-designs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists design_read_own_or_admin on storage.objects;
create policy design_read_own_or_admin on storage.objects
  for select using (
    bucket_id = 'order-designs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ── ÜRÜN SEED (presets.js / DEFAULT_PRESETS karşılığı) ───────────────────────
insert into public.products (id, name, descr, cols, rows, gap, pad, orient, icon, price, width, height, active, sort_order) values
  ('classic50',  'Klasik 50', '30x45 cm Poster', 5,  10, 4, 12, 'portrait', '🖼️', 179, null, null, true, 1),
  ('medium96',   'Orta Grid', '40x60 cm Poster', 8,  12, 4, 14, 'portrait', '📏', 229, null, null, true, 2),
  ('giant140',   'Dev Mozaik','50x70 cm Poster', 10, 14, 3, 16, 'portrait', '🏔️', 269, null, null, true, 3),
  ('a3grid49',   'A3 7x7',    'A3 Poster',       7,  7,  4, 18, 'portrait', 'A3', 189, 520, 735, true, 4),
  ('mini35',     'Mini Kolaj','30x40 cm Poster', 5,  7,  4, 12, 'portrait', '📋', 149, null, null, true, 5),
  ('square36',   'Kare Kolaj','50x50 cm Poster', 6,  6,  5, 14, 'portrait', '⬜', 199, null, null, true, 6),
  ('memories49', 'Anı Duvarı','40x40 cm Poster', 7,  7,  4, 14, 'portrait', '📸', 199, null, null, true, 7)
on conflict (id) do nothing;

-- ── ADMIN HESABI İŞARETLEME (kayıt olduktan sonra çalıştırın) ────────────────
-- update public.profiles set is_admin = true where email = 'demirhasan0108@gmail.com';
