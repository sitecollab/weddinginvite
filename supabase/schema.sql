-- Run once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists public.guests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  created_at timestamptz not null default now()
);
create unique index if not exists guests_email_unique on public.guests (lower(email));

alter table public.guests enable row level security;
revoke all on public.guests from anon;

-- Only the couple's login can read or write guests
drop policy if exists "couple manages guests" on public.guests;
create policy "couple manages guests" on public.guests
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'katedavid@example.com')
  with check ((auth.jwt() ->> 'email') = 'katedavid@example.com');
