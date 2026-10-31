-- Beam Phase 2b: hourly cleanup of expired items and their files.
--
-- Every hour pg_cron deletes expired rows (Realtime tells open devices), then
-- calls the `cleanup` Edge Function, which deletes stored files that no longer
-- have a row. Files can't be deleted with SQL; they must go through the Storage API.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Files in the bucket whose item row is gone (expired, deleted, or an upload
-- that never finished). `min_age` protects uploads that are still in progress.
create or replace function public.beam_orphaned_files(
  min_age interval default interval '1 hour',
  max_rows integer default 1000
)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'files'
    and o.created_at < now() - min_age
    and not exists (
      select 1 from public.items i
      where i.file_path = o.name or i.thumb_path = o.name
    )
  order by o.created_at
  limit max_rows
$$;

-- Only the cleanup function (service role) may list orphans.
revoke all on function public.beam_orphaned_files(interval, integer) from public, anon, authenticated;
grant execute on function public.beam_orphaned_files(interval, integer) to service_role;

-- At 7 minutes past every hour.
select cron.schedule(
  'beam-cleanup',
  '7 * * * *',
  $job$
    delete from public.items where expires_at < now();
    select net.http_post(
      url := 'https://jxfrkpympmhwkdtpndkq.supabase.co/functions/v1/cleanup',
      body := '{}'::jsonb
    );
  $job$
);
