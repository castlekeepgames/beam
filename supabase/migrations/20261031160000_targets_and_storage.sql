-- Beam Phase 9: send to one device, and a storage meter.

-- An item can be meant for one device only (null = all devices).
alter table public.items
  add column target_device_id uuid references public.devices (id) on delete set null;

create index items_target_device_idx on public.items (target_device_id);

-- The insert policy now also checks that the target is one of your own devices.
drop policy "items_insert_own" on public.items;

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
    and (
      target_device_id is null
      or exists (
        select 1 from public.devices d
        where d.id = target_device_id and d.user_id = (select auth.uid())
      )
    )
  );

-- How much of the file bucket the caller is using (including files the
-- hourly cleanup hasn't removed yet), straight from Storage's own records.
create or replace function public.beam_storage_used()
returns table (bytes bigint, files integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint,
    count(*)::integer
  from storage.objects o
  where o.bucket_id = 'files'
    and (storage.foldername(o.name))[1] = (select auth.uid())::text
$$;

revoke all on function public.beam_storage_used() from public, anon;
grant execute on function public.beam_storage_used() to authenticated;
