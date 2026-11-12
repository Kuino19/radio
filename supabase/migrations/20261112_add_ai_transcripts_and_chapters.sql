-- Phase 4: Add AI Show Notes, Transcripts & Chapters to recordings
alter table public.recordings 
  add column if not exists summary text,
  add column if not exists transcript text,
  add column if not exists chapters jsonb default '[]'::jsonb,
  add column if not exists highlights jsonb default '[]'::jsonb,
  add column if not exists ai_processed boolean default false;

-- Allow channel owners and admins to update AI show notes on recordings
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'recordings' and policyname = 'Channel owners can update recordings'
  ) then
    create policy "Channel owners can update recordings"
      on public.recordings for update
      to authenticated
      using (
        channel_id in (select id from public.channels where owner_id = auth.uid()) or
        exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
      )
      with check (
        channel_id in (select id from public.channels where owner_id = auth.uid()) or
        exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
      );
  end if;
end $$;
