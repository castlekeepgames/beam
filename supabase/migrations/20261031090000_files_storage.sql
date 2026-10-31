-- Beam Phase 2: private file storage.
-- Objects live at files/<user_id>/<item_id>/<name>; only the owner can touch them.

-- Thumbnail for image items (generated on the sending device).
alter table public.items add column thumb_path text;

-- 50 MB per file: the Supabase Free plan maximum.
alter table public.items drop constraint items_file_size;
alter table public.items
  add constraint items_file_size check (file_size is null or file_size between 0 and 52428800);

-- Private bucket with the same per-file limit.
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

-- The first folder of the object name must be the caller's user id.
create policy "files_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "files_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
