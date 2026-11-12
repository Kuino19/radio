-- LISNR Complete Database Schema (Phases 1 - 7)
-- Execute this entire file in your Supabase SQL Editor

-- 1. PROFILES TABLE (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  is_admin boolean default false not null,
  is_suspended boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  raw_name text;
begin
  raw_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Streamer'
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    raw_name,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. CHANNELS TABLE
create table if not exists public.channels (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  slug text unique not null check (slug ~ '^[a-z0-9-]+$' and length(slug) >= 3 and length(slug) <= 50),
  description text default '',
  cover_url text,
  is_live boolean default false not null,
  current_listeners integer default 0 not null,
  is_featured boolean default false not null,
  is_suspended boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_channels_slug on public.channels(slug);
create index if not exists idx_channels_owner_id on public.channels(owner_id);
create index if not exists idx_channels_is_live on public.channels(is_live);
create index if not exists idx_channels_featured on public.channels(is_featured);

alter table public.channels enable row level security;

create policy "Channels are viewable by everyone"
  on public.channels for select
  using (true);

create policy "Authenticated users can create channels"
  on public.channels for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Channel owners can update their channels"
  on public.channels for update
  to authenticated
  using (auth.uid() = owner_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Channel owners can delete their channels"
  on public.channels for delete
  to authenticated
  using (auth.uid() = owner_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));


-- 3. SHOWS TABLE
create table if not exists public.shows (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade not null,
  title text not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  peak_listeners integer default 0 not null
);

create index if not exists idx_shows_channel_id on public.shows(channel_id);
create index if not exists idx_shows_started_at on public.shows(started_at desc);

alter table public.shows enable row level security;

create policy "Shows are viewable by everyone"
  on public.shows for select
  using (true);

create policy "Channel owners can insert shows"
  on public.shows for insert
  to authenticated
  with check (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

create policy "Channel owners can update shows"
  on public.shows for update
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );


-- 4. BLOCKS TABLE
create table if not exists public.blocks (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade not null,
  user_id uuid references auth.users on delete cascade,
  anon_id text,
  created_at timestamptz default now() not null,
  constraint block_target_check check (user_id is not null or anon_id is not null)
);

create index if not exists idx_blocks_channel on public.blocks(channel_id);

alter table public.blocks enable row level security;

create policy "Channel owners can view blocks"
  on public.blocks for select
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

create policy "Channel owners can create blocks"
  on public.blocks for insert
  to authenticated
  with check (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

create policy "Channel owners can delete blocks"
  on public.blocks for delete
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );


-- 5. CHAT MESSAGES TABLE (Realtime enabled)
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade not null,
  show_id uuid references public.shows on delete cascade,
  user_id uuid references auth.users on delete set null,
  anon_id text,
  display_name text not null,
  body text not null check (length(trim(body)) > 0 and length(body) <= 500),
  created_at timestamptz default now() not null,
  deleted boolean default false not null
);

create index if not exists idx_chat_channel on public.chat_messages(channel_id, created_at desc);

alter table public.chat_messages enable row level security;

create policy "Chat messages viewable by everyone"
  on public.chat_messages for select
  using (
    deleted = false or
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );

create policy "Anyone with display name can post chat"
  on public.chat_messages for insert
  with check (
    length(trim(display_name)) >= 2 and
    not exists (
      select 1 from public.blocks b
      where b.channel_id = chat_messages.channel_id
        and (
          (b.user_id is not null and b.user_id = auth.uid()) or
          (b.anon_id is not null and b.anon_id = chat_messages.anon_id)
        )
    )
  );

create policy "Channel owner can moderate chat"
  on public.chat_messages for update
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );


-- 6. LISTEN SESSIONS TABLE (Heartbeat tracking)
create table if not exists public.listen_sessions (
  id uuid default gen_random_uuid() primary key,
  show_id uuid references public.shows on delete cascade,
  channel_id uuid references public.channels on delete cascade not null,
  user_id uuid references auth.users on delete set null,
  anon_id text,
  display_name text not null,
  is_guest boolean default true not null,
  joined_at timestamptz default now() not null,
  last_seen_at timestamptz default now() not null,
  left_at timestamptz,
  country text,
  city text,
  device_type text,
  referrer text
);

create index if not exists idx_sessions_show_id on public.listen_sessions(show_id);
create index if not exists idx_sessions_channel_id on public.listen_sessions(channel_id);
create index if not exists idx_sessions_last_seen on public.listen_sessions(last_seen_at);

alter table public.listen_sessions enable row level security;

create policy "Channel owners can view listen sessions"
  on public.listen_sessions for select
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Listeners can insert their own session"
  on public.listen_sessions for insert
  with check (true);

create policy "Listeners can update their own session"
  on public.listen_sessions for update
  using (true);


-- 7. FOLLOWS TABLE
create table if not exists public.follows (
  user_id uuid references auth.users on delete cascade not null,
  channel_id uuid references public.channels on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (user_id, channel_id)
);

create index if not exists idx_follows_channel_id on public.follows(channel_id);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

create policy "Authenticated users can follow"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can unfollow"
  on public.follows for delete
  to authenticated
  using (auth.uid() = user_id);


-- 8. SCHEDULED SHOWS TABLE (Phase 7)
create table if not exists public.scheduled_shows (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels on delete cascade not null,
  title text not null,
  description text default '',
  scheduled_at timestamptz not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_scheduled_channel on public.scheduled_shows(channel_id);
create index if not exists idx_scheduled_time on public.scheduled_shows(scheduled_at asc);

alter table public.scheduled_shows enable row level security;

create policy "Scheduled shows are viewable by everyone"
  on public.scheduled_shows for select
  using (true);

create policy "Channel owners can manage scheduled shows"
  on public.scheduled_shows for all
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  )
  with check (
    channel_id in (select id from public.channels where owner_id = auth.uid())
  );


-- 9. RECORDINGS & REPLAYS TABLE (Phase 7)
create table if not exists public.recordings (
  id uuid default gen_random_uuid() primary key,
  show_id uuid references public.shows on delete cascade,
  channel_id uuid references public.channels on delete cascade not null,
  title text not null,
  audio_url text not null,
  duration_seconds integer default 0 not null,
  file_size_bytes bigint default 0 not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_recordings_channel on public.recordings(channel_id, created_at desc);

alter table public.recordings enable row level security;

create policy "Recordings are viewable by everyone"
  on public.recordings for select
  using (true);

create policy "Channel owners can delete recordings"
  on public.recordings for delete
  to authenticated
  using (
    channel_id in (select id from public.channels where owner_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );


-- 10. STORAGE BUCKETS SETUP
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', true)
on conflict (id) do nothing;

create policy "Cover images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "Authenticated users can upload cover images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'covers');

create policy "Users can update their uploaded cover images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Recordings are publicly playable"
  on storage.objects for select
  using (bucket_id = 'recordings');

create policy "Recordings can be inserted by authenticated or service role"
  on storage.objects for insert
  with check (bucket_id = 'recordings');


-- 11. REALTIME PUBLICATION SETUP
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.shows;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.follows;
alter publication supabase_realtime add table public.scheduled_shows;
