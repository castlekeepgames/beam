-- Beam: "Receive" QR codes. Someone without Beam scans your code and can send
-- you text or files for a short time. Guests never get access to anything.
--
-- The code carries a random secret token; only its SHA-256 hash is stored.
-- The `receive` Edge Function (service role) checks the hash and inserts the
-- guest's items into your account.

create table public.receive_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
    check (expires_at <= created_at + interval '1 hour'),
  max_items integer not null default 20 check (max_items between 1 and 100),
  used_items integer not null default 0,
  revoked_at timestamptz
);

create index receive_codes_user_id_idx on public.receive_codes (user_id);

alter table public.receive_codes enable row level security;

create policy "receive_codes_select_own" on public.receive_codes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "receive_codes_insert_own" on public.receive_codes
  for insert to authenticated
  with check ((select auth.uid()) = user_id and used_items = 0 and revoked_at is null);

create policy "receive_codes_update_own" on public.receive_codes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Owners create codes and stop them early; only the function counts uses.
revoke all on public.receive_codes from anon, authenticated;
grant select, insert on public.receive_codes to authenticated;
grant update (revoked_at) on public.receive_codes to authenticated;

-- Items sent by a guest through a Receive code.
alter table public.items add column from_guest boolean not null default false;

-- Atomically use up one send on a live code. Returns the owner, or null if the
-- code is unknown, expired, stopped, or used up.
create or replace function public.beam_claim_receive(p_token_hash text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  update public.receive_codes
  set used_items = used_items + 1
  where token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now()
    and used_items < max_items
  returning user_id
$$;

revoke all on function public.beam_claim_receive(text) from public, anon, authenticated;
grant execute on function public.beam_claim_receive(text) to service_role;

-- Hourly cleanup also forgets Receive codes a day after they expire.
select cron.schedule(
  'beam-cleanup',
  '7 * * * *',
  $job$
    delete from public.items where expires_at < now() and not kept;
    delete from public.receive_codes where expires_at < now() - interval '1 day';
    select net.http_post(
      url := 'https://jxfrkpympmhwkdtpndkq.supabase.co/functions/v1/cleanup',
      body := '{}'::jsonb
    );
  $job$
);
