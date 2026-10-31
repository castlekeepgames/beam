-- Beam Phase 3: web push on every new item.
--
-- After each insert, pg_net calls the `send-push` Edge Function with just the
-- item id. The function reads everything else from the database and claims the
-- item via `pushed_at`, so calling it again (or by anyone else) can't resend.

alter table public.items add column pushed_at timestamptz;

create or replace function public.beam_send_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://jxfrkpympmhwkdtpndkq.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('item_id', new.id)
  );
  return null;
end;
$$;

revoke all on function public.beam_send_push() from public, anon, authenticated;

create trigger items_send_push
  after insert on public.items
  for each row execute function public.beam_send_push();
