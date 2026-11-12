-- LISNR Creator & Listener Features Migration
-- Run this in your Supabase SQL Editor

-- 1. SERIES / SHOWS TABLE (Organizing audio episodes into series)
create table if not exists public.series (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade not null,
  title text not null,
  description text default '',
  cover_url text,
  category text default 'General',
  tags text[] default array[]::text[],
  created_at timestamptz default now() not null
);

create index if not exists idx_series_channel_id on public.series(channel_id);

alter table public.series enable row level security;

create policy "Series are viewable by everyone"
  on public.series for select
  using (true);

create policy "Channel owners can manage their series"
  on public.series for all
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  )
  with check (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

-- 2. EPISODES TABLE (Audio uploads: MP3, AAC, M4A, OPUS, scheduling, paywall)
create table if not exists public.episodes (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade not null,
  series_id uuid references public.series on delete set null,
  title text not null,
  description text default '',
  audio_url text not null,
  duration_seconds integer default 0 not null,
  file_size_bytes bigint default 0 not null,
  mime_type text default 'audio/mpeg' not null,
  cover_url text,
  category text default 'General',
  tags text[] default array[]::text[],
  is_premium boolean default false not null,
  tier_required text default 'free',
  scheduled_for timestamptz,
  is_published boolean default true not null,
  play_count integer default 0 not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_episodes_channel on public.episodes(channel_id);
create index if not exists idx_episodes_series on public.episodes(series_id);
create index if not exists idx_episodes_scheduled on public.episodes(scheduled_for);
create index if not exists idx_episodes_published on public.episodes(is_published);

alter table public.episodes enable row level security;

create policy "Published episodes viewable by everyone"
  on public.episodes for select
  using (
    is_published = true or
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

create policy "Channel owners can manage episodes"
  on public.episodes for all
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  )
  with check (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

-- 3. MONETIZATION SETTINGS TABLE
create table if not exists public.monetization_settings (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade unique not null,
  tipping_enabled boolean default true not null,
  custom_tipping_url text,
  suggested_tips integer[] default array[200, 500, 1000, 2500]::integer[], -- in cents: $2, $5, $10, $25
  membership_enabled boolean default false not null,
  monthly_price_cents integer default 500 not null, -- $5/mo
  annual_price_cents integer default 5000 not null,  -- $50/yr
  tier_name text default 'Supporter' not null,
  tier_perks text[] default array['Ad-free listening', 'Exclusive subscriber episodes', 'Host badges in chat']::text[],
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.monetization_settings enable row level security;

create policy "Monetization settings viewable by everyone"
  on public.monetization_settings for select
  using (true);

create policy "Channel owners manage monetization"
  on public.monetization_settings for all
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  )
  with check (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

-- 4. TIPS / TIPPING TRANSACTIONS TABLE
create table if not exists public.tips (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade not null,
  from_user_id uuid references auth.users on delete set null,
  from_name text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text default 'USD' not null,
  message text default '',
  created_at timestamptz default now() not null
);

create index if not exists idx_tips_channel on public.tips(channel_id, created_at desc);

alter table public.tips enable row level security;

create policy "Tips viewable by channel owner"
  on public.tips for select
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid()) or
    from_user_id = auth.uid()
  );

create policy "Anyone can send a tip"
  on public.tips for insert
  with check (true);

-- 5. FAVORITES TABLE (Listeners bookmarking channels & episodes)
create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  channel_id uuid references public.channels on delete cascade,
  episode_id uuid references public.episodes on delete cascade,
  created_at timestamptz default now() not null,
  constraint fav_target_check check (channel_id is not null or episode_id is not null)
);

create index if not exists idx_favorites_user on public.favorites(user_id);

alter table public.favorites enable row level security;

create policy "Users view own favorites"
  on public.favorites for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can add favorites"
  on public.favorites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can remove favorites"
  on public.favorites for delete
  to authenticated
  using (user_id = auth.uid());

-- 6. PLAYLISTS & PLAYLIST ITEMS TABLES
create table if not exists public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text default '',
  is_public boolean default true not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_playlists_user on public.playlists(user_id);

alter table public.playlists enable row level security;

create policy "Public playlists viewable by all, private by owner"
  on public.playlists for select
  using (is_public = true or user_id = auth.uid());

create policy "Users manage own playlists"
  on public.playlists for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.playlist_items (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references public.playlists on delete cascade not null,
  episode_id uuid references public.episodes on delete cascade,
  recording_id uuid references public.recordings on delete cascade,
  position integer default 0 not null,
  added_at timestamptz default now() not null
);

create index if not exists idx_playlist_items on public.playlist_items(playlist_id, position asc);

alter table public.playlist_items enable row level security;

create policy "Playlist items viewable if playlist viewable"
  on public.playlist_items for select
  using (
    playlist_id in (select id from public.playlists where is_public = true or user_id = auth.uid())
  );

create policy "Owners manage playlist items"
  on public.playlist_items for all
  to authenticated
  using (
    playlist_id in (select id from public.playlists where user_id = auth.uid())
  )
  with check (
    playlist_id in (select id from public.playlists where user_id = auth.uid())
  );

-- 7. EPISODES STORAGE BUCKET
insert into storage.buckets (id, name, public)
values ('episodes', 'episodes', true)
on conflict (id) do nothing;

create policy "Episodes audio publicly streamable"
  on storage.objects for select
  using (bucket_id = 'episodes');

create policy "Authenticated users can upload audio episodes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'episodes');

-- Add realtime publications
alter publication supabase_realtime add table public.series;
alter publication supabase_realtime add table public.episodes;
alter publication supabase_realtime add table public.monetization_settings;
alter publication supabase_realtime add table public.tips;
alter publication supabase_realtime add table public.favorites;
alter publication supabase_realtime add table public.playlists;
