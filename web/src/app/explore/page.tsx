import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { Play, Radio, Users, Sparkles, Clock, Lock, ArrowRight, Layers } from 'lucide-react'
import type { Channel, Series, Episode } from '@/types/database'

interface ExplorePageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    type?: string
  }>
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q = '', category = '', type = 'all' } = await searchParams
  const supabase = await createClient()

  const queryTerm = q.trim().toLowerCase()

  // 1. Fetch channels matching search or category
  let channelsQuery = supabase
    .from('channels')
    .select('*')
    .eq('is_suspended', false)

  if (queryTerm) {
    channelsQuery = channelsQuery.or(`name.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
  }

  const { data: channelData } = await channelsQuery.limit(12)
  const channels: Channel[] = channelData || []

  // 2. Fetch series matching search or category
  let seriesQuery = supabase.from('series').select('*')
  if (queryTerm) {
    seriesQuery = seriesQuery.or(`title.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
  }
  if (category && category !== 'All') {
    seriesQuery = seriesQuery.eq('category', category)
  }
  const { data: seriesData } = await seriesQuery.limit(10)
  const series: Series[] = seriesData || []

  // 3. Fetch episodes matching search or category
  let episodesQuery = supabase
    .from('episodes')
    .select('*, channels(name, slug, cover_url)')
    .eq('is_published', true)

  if (queryTerm) {
    episodesQuery = episodesQuery.or(`title.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
  }
  if (category && category !== 'All') {
    episodesQuery = episodesQuery.eq('category', category)
  }
  const { data: episodesData } = await episodesQuery.limit(12)
  const episodes: Episode[] = (episodesData as unknown as Episode[]) || []

  const showLive = type === 'all' || type === 'live'
  const showSeries = type === 'all' || type === 'series'
  const showEpisodes = type === 'all' || type === 'episodes'

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F4EFE8] tracking-tight">
          Search & Discover
        </h1>
        <p className="text-sm text-[#A39B91]">
          Explore live sermons, community broadcasts, podcast series, and on-demand audio.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <SearchFilterBar />

      {/* 1. Live Broadcasts Section */}
      {showLive && channels.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
            <h2 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#FF4A3D]" />
              <span>Channels & Live Stations</span>
            </h2>
            <span className="font-mono text-xs text-[#A39B91]">
              {channels.length} found
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => (
              <Link
                key={ch.id}
                href={`/c/${ch.slug}`}
                className="group rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 flex flex-col justify-between hover:border-[#F2B544]/60 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {ch.is_live ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-2.5 py-0.5 text-[10px] font-bold text-[#FF4A3D] border border-[#FF4A3D]/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4A3D] animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#A39B91] bg-[#0E0D0C] px-2 py-0.5 rounded-full border border-[#2A2724]">
                        STATION
                      </span>
                    )}

                    <span className="font-mono text-xs text-[#A39B91] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#F2B544]" />
                      {ch.current_listeners || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {ch.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ch.cover_url}
                        alt={ch.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#2A2724] shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center font-bold text-xs text-[#F2B544] shrink-0 shadow-sm">
                        {ch.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-base text-[#F4EFE8] group-hover:text-[#F2B544] transition-colors truncate">
                        {ch.name}
                      </h3>
                      <p className="text-xs text-[#A39B91] line-clamp-1 mt-0.5">
                        {ch.description || 'Live speech and community audio broadcast.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2A2724] mt-3 flex items-center justify-between text-xs text-[#A39B91]">
                  <span>/c/{ch.slug}</span>
                  <span className="text-[#F2B544] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Tune In <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 2. Series / Shows Section */}
      {showSeries && series.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
            <h2 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#F2B544]" />
              <span>Audio Series & Shows</span>
            </h2>
            <span className="font-mono text-xs text-[#A39B91]">
              {series.length} shows
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.map((s) => (
              <div
                key={s.id}
                className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#F2B544] uppercase tracking-wider">
                    {s.category}
                  </span>
                  <span className="text-[11px] text-[#A39B91]">Series</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#F4EFE8]">
                    {s.title}
                  </h3>
                  <p className="text-xs text-[#A39B91] line-clamp-2 mt-1">
                    {s.description || 'Curated series of episodes and messages.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. On-Demand Audio Episodes Section */}
      {showEpisodes && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
            <h2 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
              <Play className="w-4 h-4 text-[#F2B544] fill-current" />
              <span>Episodes & On-Demand Audio</span>
            </h2>
            <span className="font-mono text-xs text-[#A39B91]">
              {episodes.length} episodes
            </span>
          </div>

          {episodes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#2A2724] bg-[#1A1816] p-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-[#A39B91] mx-auto opacity-50" />
              <p className="font-display font-bold text-base text-[#F4EFE8]">
                No episodes found for this filter
              </p>
              <p className="text-xs text-[#A39B91] max-w-sm mx-auto">
                Try searching for different keywords or explore other categories above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 flex flex-col justify-between hover:border-[#F2B544]/50 transition-all space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#A39B91]">
                      <span className="font-mono text-[10px] text-[#F2B544] uppercase tracking-wider">
                        {ep.category}
                      </span>
                      {ep.is_premium ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#F2B544] bg-[#F2B544]/10 border border-[#F2B544]/30 px-2 py-0.5 rounded-full font-semibold">
                          <Lock className="w-3 h-3" /> Members
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3" />
                          {formatDuration(ep.duration_seconds)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-base text-[#F4EFE8] line-clamp-2">
                      {ep.title}
                    </h3>

                    {ep.description && (
                      <p className="text-xs text-[#A39B91] line-clamp-2">
                        {ep.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#2A2724] flex items-center justify-between">
                    <span className="text-xs text-[#A39B91] truncate max-w-[150px]">
                      {ep.channels?.name || 'LISNR Host'}
                    </span>

                    <Link
                      href={ep.channels ? `/c/${ep.channels.slug}` : '/c/live-test'}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] border border-[#2A2724] px-3.5 py-1.5 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544] hover:text-[#F2B544] transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-[#F2B544]" />
                      <span>Play</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
