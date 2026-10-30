-- Beam Phase 1: devices and items, with RLS and realtime.
-- Every table gets RLS in the same migration that creates it.

-- ---------------------------------------------------------------------------
-- devices: one row per browser/installed app that has signed in.
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  push_subscription jsonb,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index devices_user_id_idx on public.devices (user_id);

alter table public.devices enable row level security;

create policy "devices_select_own" on public.devices
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "devices_insert_own" on public.devices
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "devices_update_own" on public.devices
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "devices_delete_own" on public.devices
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- items: text, links and (Phase 2) files sent between devices.
-- ---------------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('text', 'link', 'file')),
  content text,
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  source_device_id uuid references public.devices (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',

  constraint items_payload check (
    (
      kind in ('text', 'link')
      and content is not null
      and char_length(content) between 1 and 100000
      and file_path is null
    )
    or (
      kind = 'file'
      and file_path is not null
      and file_name is not null
      and file_size is not null
    )
  ),
  constraint items_file_size check (file_size is null or file_size between 0 and 104857600)
);

create index items_user_created_idx on public.items (user_id, created_at desc);
create index items_expires_at_idx on public.items (expires_at);
create index items_source_device_idx on public.items (source_device_id);

alter table public.items enable row level security;

create policy "items_select_own" on public.items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "items_insert_own" on public.items
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      source_device_id is null
      or exists (
        select 1 from public.devices d
        where d.id = source_device_id and d.user_id = (select auth.uid())
      )
    )
  );

create policy "items_delete_own" on public.items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users only (RLS still applies on top).
-- ---------------------------------------------------------------------------
revoke all on public.devices from anon, authenticated;
revoke all on public.items from anon, authenticated;
grant select, insert, update, delete on public.devices to authenticated;
grant select, insert, delete on public.items to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast item inserts/deletes (RLS decides who receives them).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.items;
