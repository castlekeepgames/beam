-- Beam Phase 5: "Keep" exempts an item from the 24-hour expiry.

alter table public.items add column kept boolean not null default false;

-- Owners may toggle `kept` and push back `expires_at` (when un-keeping), nothing else.
grant update (kept, expires_at) on public.items to authenticated;

create policy "items_update_own" on public.items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Cleanup now skips kept items (same job name replaces the Phase 2b schedule).
select cron.schedule(
  'beam-cleanup',
  '7 * * * *',
  $job$
    delete from public.items where expires_at < now() and not kept;
    select net.http_post(
      url := 'https://jxfrkpympmhwkdtpndkq.supabase.co/functions/v1/cleanup',
      body := '{}'::jsonb
    );
  $job$
);
