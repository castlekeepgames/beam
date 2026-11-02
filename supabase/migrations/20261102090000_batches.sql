-- Beam Phase 10: files sent together share a batch id, so every device shows
-- them as one card (with Download all) and push notifications collapse into one.
-- Purely a grouping label: it grants nothing, and RLS on items is unchanged.

alter table public.items add column batch_id uuid;

create index items_batch_idx on public.items (batch_id) where batch_id is not null;
