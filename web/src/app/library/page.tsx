import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Heart, ListMusic, Bookmark, Plus, Radio, Play, Users, ArrowRight } from 'lucide-react'
import type { Favorite, Playlist, Follow, Channel } from '@/types/database'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/library')
  }

  // 1. Fetch user's followed channels
  const { data: followsData } = await supabase
    .from('follows')
    .select('*, channels(*)')
    .eq('user_id', user.id)

  const follows = followsData || []

  // 2. Fetch user's playlists
  const { data: playlistsData } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const playlists: Playlist[] = playlistsData || []

  // 3. Fetch user's favorites
  const { data: favoritesData } = await supabase
    .from('favorites')
    .select('*, channels(*), episodes(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const favorites: Favorite[] = (favoritesData as unknown as Favorite[]) || []

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 space-y-10">
      {/* Page Header */}
      <div className="space-y-1 border-b border-[#2A2724] pb-6">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F4EFE8] tracking-tight">
          Your Library
        </h1>
        <p className="text-sm text-[#A39B91]">
          Bookmarked stations, favorite episodes, and personal playlists.
        </p>
      </div>

      {/* 1. Following Channels */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
          <h2 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#F2B544]" />
            <span>Following ({follows.length})</span>
          </h2>
          <Link
            href="/explore"
            className="text-xs font-mono text-[#F2B544] hover:underline"
          >
            Discover more
          </Link>
        </div>

        {follows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2A2724] bg-[#1A1816] p-8 text-center space-y-3">
            <Radio className="w-8 h-8 text-[#A39B91] mx-auto opacity-40" />
            <p className="font-display font-bold text-sm text-[#F4EFE8]">
              You aren&apos;t following any channels yet
            </p>
            <p className="text-xs text-[#A39B91] max-w-xs mx-auto">
              Follow your favorite pastors, talk hosts, and community stations to get notified when they go live.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544] px-4 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 transition-all"
            >
              <span>Explore Stations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {follows.map((f, idx) => {
              const ch = f.channels as unknown as Channel
              if (!ch) return null
              return (
                <Link
                  key={idx}
                  href={`/c/${ch.slug}`}
                  className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 flex items-center justify-between hover:border-[#F2B544]/50 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center font-bold text-sm text-[#F2B544] shrink-0">
                      {ch.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-sm text-[#F4EFE8] truncate group-hover:text-[#F2B544] transition-colors">
                        {ch.name}
                      </h3>
                      <p className="text-[11px] text-[#A39B91] truncate">
                        {ch.is_live ? '• Live On Air' : 'Offline'}
                      </p>
                    </div>
                  </div>

                  {ch.is_live && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF4A3D] animate-pulse shrink-0" />
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 2. Playlists Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
          <h2 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-[#F2B544]" />
            <span>Playlists ({playlists.length})</span>
          </h2>
        </div>

        {playlists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2A2724] bg-[#1A1816] p-8 text-center space-y-3">
            <ListMusic className="w-8 h-8 text-[#A39B91] mx-auto opacity-40" />
            <p className="font-display font-bold text-sm text-[#F4EFE8]">
              No playlists created
            </p>
            <p className="text-xs text-[#A39B91] max-w-xs mx-auto">
              Save episodes into personal playlists like &ldquo;Morning Inspiration&rdquo; or &ldquo;Favorite Sermons&rdquo;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#F2B544] uppercase tracking-wider">
                    {pl.is_public ? 'Public Playlist' : 'Private'}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#F4EFE8]">
                    {pl.title}
                  </h3>
                  {pl.description && (
                    <p className="text-xs text-[#A39B91] line-clamp-2 mt-1">
                      {pl.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Favorites & Bookmarks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
          <h2 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#F2B544]" />
            <span>Saved Favorites ({favorites.length})</span>
          </h2>
        </div>

        {favorites.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2A2724] bg-[#1A1816] p-8 text-center space-y-3">
            <Bookmark className="w-8 h-8 text-[#A39B91] mx-auto opacity-40" />
            <p className="font-display font-bold text-sm text-[#F4EFE8]">
              No saved favorites yet
            </p>
            <p className="text-xs text-[#A39B91] max-w-xs mx-auto">
              Tap the bookmark or heart icon on any channel or episode to save it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-2"
              >
                <span className="text-[10px] font-mono text-[#F2B544]">
                  {fav.episode_id ? 'Episode' : 'Channel'}
                </span>
                <h3 className="font-display font-bold text-sm text-[#F4EFE8]">
                  {fav.episodes?.title || fav.channels?.name || 'Saved Item'}
                </h3>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
