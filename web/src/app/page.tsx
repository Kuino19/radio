import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Play, Mic, Radio, Volume2, ArrowRight, ShieldCheck, Zap, Users, MessageSquare, BarChart3, Wifi } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Channel, ScheduledShow } from '@/types/database'

interface HomePageProps {
  searchParams?: Promise<{
    code?: string
    next?: string
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedParams = searchParams ? await searchParams : {}
  const supabase = await createClient()

  // If redirected from email confirmation with code parameter
  if (resolvedParams.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(resolvedParams.code)
    if (!exchangeError) {
      redirect(resolvedParams.next || '/dashboard')
    }
  }

  // 1. Fetch live channels
  const { data: liveChannels } = await supabase
    .from('channels')
    .select('*')
    .eq('is_live', true)
    .eq('is_suspended', false)
    .order('current_listeners', { ascending: false })

  // 2. Fetch recent channels
  const { data: recentChannels } = await supabase
    .from('channels')
    .select('*')
    .eq('is_suspended', false)
    .order('created_at', { ascending: false })
    .limit(6)

  // 3. Fetch upcoming scheduled shows
  const { data: upcomingData } = await supabase
    .from('scheduled_shows')
    .select('*, channels(name, slug, cover_url)')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(3)

  // 4. Fetch followed channels if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let followedStations: Channel[] = []
  if (user) {
    const { data: followRows } = await supabase
      .from('follows')
      .select('channels(*)')
      .eq('user_id', user.id)
    if (followRows) {
      followedStations = followRows
        .map((f: { channels: unknown }) => f.channels as Channel)
        .filter(Boolean)
    }
  }

  const liveList: Channel[] = liveChannels || []
  const offlineList: Channel[] = recentChannels || []
  const upcomingShows = upcomingData || []
  const totalOnAir = liveList.length

  // Stations to display in discovery row
  const showcaseStations = followedStations.length > 0 ? followedStations : offlineList

  const heroChannel = liveList.length > 0 ? liveList[0] : offlineList.length > 0 ? offlineList[0] : null
  const isHeroLive = !!(heroChannel && heroChannel.is_live)

  return (
    <div className="flex flex-col gap-14 px-4 py-6 sm:px-6 sm:py-10 max-w-6xl mx-auto">
      {/* Top Section Header: Live now · X on air */}
      <section id="live-now" className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F4EFE8] tracking-tight">
              {totalOnAir > 0 ? 'Live now' : 'Featured Stations'}
            </h1>
            <span className="font-mono text-xs text-[#A39B91] bg-[#1A1816] px-2.5 py-0.5 rounded-full border border-[#2A2724]">
              {totalOnAir} on air
            </span>
          </div>

          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#F2B544] hover:underline"
          >
            <span>Explore all stations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Live / Featured Broadcast Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Hero Featured Live Broadcast or Featured Station */}
          {heroChannel ? (
            <div className="md:col-span-2 rounded-3xl bg-[#F2B544] text-[#0E0D0C] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-xl min-h-[300px]">
              {/* Background waveform bars */}
              <div className="absolute right-6 top-8 bottom-8 flex items-end gap-1.5 opacity-25 pointer-events-none">
                <span className="w-2.5 bg-[#0E0D0C] rounded-full h-12 animate-radio-bar" style={{ animationDelay: '0.1s' }} />
                <span className="w-2.5 bg-[#0E0D0C] rounded-full h-24 animate-radio-bar" style={{ animationDelay: '0.4s' }} />
                <span className="w-2.5 bg-[#0E0D0C] rounded-full h-16 animate-radio-bar" style={{ animationDelay: '0.2s' }} />
                <span className="w-2.5 bg-[#0E0D0C] rounded-full h-32 animate-radio-bar" style={{ animationDelay: '0.6s' }} />
                <span className="w-2.5 bg-[#0E0D0C] rounded-full h-20 animate-radio-bar" style={{ animationDelay: '0.3s' }} />
                <span className="w-2.5 bg-[#0E0D0C] rounded-full h-28 animate-radio-bar" style={{ animationDelay: '0.5s' }} />
              </div>

              <div className="space-y-4 max-w-md relative z-10">
                {/* Status Badge */}
                {isHeroLive ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0E0D0C] px-3 py-1 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#FF4A3D] animate-pulse" />
                    <span className="text-[11px] font-bold tracking-wider text-[#FF4A3D]">LIVE</span>
                    <span className="text-[#A39B91] text-[11px]">•</span>
                    <span className="font-mono text-[11px] font-medium text-[#F4EFE8]">
                      {heroChannel.current_listeners || 1} listening
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0E0D0C] px-3 py-1 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#A39B91]" />
                    <span className="text-[11px] font-bold tracking-wider text-[#F4EFE8]">STATION</span>
                    <span className="text-[#A39B91] text-[11px]">•</span>
                    <span className="font-mono text-[11px] font-medium text-[#A39B91]">
                      Ready to broadcast
                    </span>
                  </div>
                )}

                <div>
                  <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0E0D0C] tracking-tight leading-tight">
                    {heroChannel.name}
                  </h2>
                  <p className="text-sm sm:text-base font-medium text-[#0E0D0C]/80 mt-1">
                    /c/{heroChannel.slug}
                  </p>
                  <p className="text-xs text-[#0E0D0C]/70 mt-2 line-clamp-2">
                    {heroChannel.description || 'Live speech and audio broadcast on LISNR.'}
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="pt-6 flex items-center gap-3 relative z-10">
                <Link
                  href={`/c/${heroChannel.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0E0D0C] px-6 py-3 text-sm font-bold text-[#F4EFE8] shadow-md hover:bg-[#1A1816] active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current text-[#F2B544]" />
                  <span>{isHeroLive ? 'Listen Live' : 'View Station'}</span>
                </Link>

                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 rounded-full border border-[#0E0D0C]/30 bg-transparent px-5 py-3 text-sm font-semibold text-[#0E0D0C] hover:bg-[#0E0D0C]/10 active:scale-95 transition-all"
                >
                  <span>Explore All</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 rounded-3xl bg-[#1A1816] border border-[#2A2724] p-8 sm:p-12 flex flex-col justify-between shadow-xl min-h-[300px]">
              <div className="space-y-4 max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center text-[#F2B544]">
                  <Radio className="w-6 h-6" />
                </div>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#F4EFE8]">
                  Start Your Audio Station
                </h2>
                <p className="text-xs sm:text-sm text-[#A39B91] leading-relaxed">
                  Be the first to go live. Broadcast talk shows, podcasts, sermons, or music directly to your listeners with one tap.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-[#F2B544] px-6 py-3 text-sm font-bold text-[#0E0D0C] shadow-md hover:brightness-105 active:scale-95 transition-all"
                >
                  <Mic className="w-4 h-4" />
                  <span>Create Free Channel</span>
                </Link>
              </div>
            </div>
          )}

          {/* Secondary Column: Other Real Stations */}
          <div className="flex flex-col gap-4">
            {(liveList.length > 1 ? liveList.slice(1, 3) : offlineList.slice(1, 3)).map((item) => (
              <Link
                key={item.id}
                href={`/c/${item.slug}`}
                className="group flex-1 rounded-3xl bg-[#1A1816] border border-[#2A2724] p-5 flex flex-col justify-between hover:border-[#F2B544]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5">
                    {item.is_live ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#FF4A3D] animate-pulse" />
                        <span className="text-[10px] font-bold text-[#FF4A3D] tracking-wider">LIVE</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-mono text-[#A39B91] bg-[#0E0D0C] px-2 py-0.5 rounded-full border border-[#2A2724]">
                        STATION
                      </span>
                    )}
                  </div>
                  {item.is_live && (
                    <span className="font-mono text-xs text-[#A39B91]">
                      • {item.current_listeners || 0} listening
                    </span>
                  )}
                </div>

                <div className="my-2 flex items-center gap-3">
                  {item.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover_url}
                      alt={item.name}
                      className="w-10 h-10 rounded-xl object-cover border border-[#2A2724] shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center font-bold text-xs text-[#F2B544] shrink-0">
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-base text-[#F4EFE8] group-hover:text-[#F2B544] transition-colors truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#A39B91] font-mono">
                      /c/{item.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#A39B91] pt-2 border-t border-[#2A2724]">
                  <span>64 kbps · Voice</span>
                  <span className="text-[#F2B544] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Tune in <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}

            {/* If fewer than 2 secondary stations, show prompt to go live or browse */}
            {(liveList.length > 1 ? liveList.slice(1, 3) : offlineList.slice(1, 3)).length < 2 && (
              <div className="flex-1 rounded-3xl bg-[#1A1816]/60 border border-[#2A2724] p-5 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-semibold text-sm text-[#F4EFE8]">
                    Broadcast from any device
                  </h4>
                  <p className="text-xs text-[#A39B91] mt-1">
                    No software or stream keys needed. Just hit Go Live from your browser.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs text-[#F2B544] font-semibold hover:underline mt-3"
                >
                  <span>Open Creator Studio</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Discovery / Real Stations Row */}
      {showcaseStations.length > 0 && (
        <section id="following" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-[#F4EFE8] tracking-tight">
              {followedStations.length > 0 ? 'Following' : 'Audio Stations'}
            </h2>
            <Link
              href="/explore"
              className="text-xs font-mono text-[#F2B544] hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {showcaseStations.map((station) => (
              <Link
                key={station.id}
                href={`/c/${station.slug}`}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="relative">
                  {station.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={station.cover_url}
                      alt={station.name}
                      className="w-14 h-14 rounded-full object-cover border border-[#2A2724] group-hover:border-[#F2B544] transition-colors shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#1A1816] border border-[#2A2724] flex items-center justify-center font-mono font-bold text-sm text-[#F4EFE8] group-hover:border-[#F2B544] transition-colors shadow-md">
                      {station.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {station.is_live && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#FF4A3D] border-2 border-[#0E0D0C] animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] text-[#A39B91] group-hover:text-[#F4EFE8] transition-colors max-w-[80px] truncate text-center">
                  {station.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Marketing / Explainer Section: "Your voice, live. One tap." (PDF Pages 5-12) */}
      <section id="how-it-works" className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-8 sm:p-12 space-y-12">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F2B544]/30 bg-[#F2B544]/10 px-3 py-1 text-xs font-semibold text-[#F2B544]">
            Simple Live Radio
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#F4EFE8] tracking-tight leading-tight">
            Your voice, live. One tap.
          </h2>
          <p className="text-base text-[#A39B91] leading-relaxed">
            Start a live audio show from your browser. No gear, no setup, no stream keys. Press Go live and your people can listen.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#F2B544] px-6 py-3 text-sm font-bold text-[#0E0D0C] shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              Start your channel
            </Link>
            <Link
              href="#live-now"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#2A2724] bg-transparent px-6 py-3 text-sm font-semibold text-[#F4EFE8] hover:bg-[#2A2724] transition-all"
            >
              Listen now
            </Link>
          </div>
        </div>

        {/* Live in three steps (PDF Pages 8-9) */}
        <div className="space-y-6 pt-6 border-t border-[#2A2724]">
          <h3 className="font-display font-bold text-xl text-[#F4EFE8]">
            Live in three steps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-6 space-y-3">
              <span className="font-mono text-2xl font-bold text-[#F2B544]">1</span>
              <h4 className="font-display font-bold text-base text-[#F4EFE8]">
                Create your channel
              </h4>
              <p className="text-xs text-[#A39B91] leading-relaxed">
                Pick a name, add a cover, and you&apos;re set up in a minute.
              </p>
            </div>

            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-6 space-y-3">
              <span className="font-mono text-2xl font-bold text-[#FF4A3D]">2</span>
              <h4 className="font-display font-bold text-base text-[#F4EFE8]">
                Press Go live
              </h4>
              <p className="text-xs text-[#A39B91] leading-relaxed">
                Allow your mic and you&apos;re on air. Works directly on your phone or computer.
              </p>
            </div>

            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-6 space-y-3">
              <span className="font-mono text-2xl font-bold text-[#3DBE7A]">3</span>
              <h4 className="font-display font-bold text-base text-[#F4EFE8]">
                Your people join in
              </h4>
              <p className="text-xs text-[#A39B91] leading-relaxed">
                Share your link. Listeners hop in, say hi in the chat, and you see who&apos;s there.
              </p>
            </div>
          </div>
        </div>

        {/* Everything a host needs (PDF Pages 10-11) */}
        <div id="for-hosts" className="space-y-6 pt-6 border-t border-[#2A2724]">
          <h3 className="font-display font-bold text-xl text-[#F4EFE8]">
            Everything a host needs
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-5 space-y-2">
              <Users className="w-5 h-5 text-[#F2B544]" />
              <h4 className="font-display font-semibold text-sm text-[#F4EFE8]">See who&apos;s listening</h4>
              <p className="text-xs text-[#A39B91]">Names of the people tuned in, guests included.</p>
            </div>

            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-5 space-y-2">
              <BarChart3 className="w-5 h-5 text-[#F2B544]" />
              <h4 className="font-display font-semibold text-sm text-[#F4EFE8]">Know what works</h4>
              <p className="text-xs text-[#A39B91]">Clear numbers after every show: peak, time listened and where people drop off.</p>
            </div>

            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-5 space-y-2">
              <MessageSquare className="w-5 h-5 text-[#F2B544]" />
              <h4 className="font-display font-semibold text-sm text-[#F4EFE8]">Chat built in</h4>
              <p className="text-xs text-[#A39B91]">Talk with your listeners in real time while you&apos;re live.</p>
            </div>

            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-5 space-y-2">
              <Wifi className="w-5 h-5 text-[#3DBE7A]" />
              <h4 className="font-display font-semibold text-sm text-[#F4EFE8]">Light on data</h4>
              <p className="text-xs text-[#A39B91]">64 kbps low-data streaming, so listeners aren&apos;t afraid to tune in.</p>
            </div>
          </div>
        </div>

        {/* Listening is free card (PDF Page 11) */}
        <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h4 className="font-display font-bold text-xl text-[#F4EFE8]">
              Listening is free and takes one tap
            </h4>
            <p className="text-xs sm:text-sm text-[#A39B91] max-w-lg">
              Tap a live show and press play. Pick a name so the host can say hi. No account needed.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-full bg-[#F2B544] px-6 py-3 text-sm font-bold text-[#0E0D0C] shrink-0 hover:brightness-105 active:scale-95 transition-all"
          >
            <span>See who&apos;s live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer Banner: "Your first show is one tap away" (PDF Page 6 & 12) */}
      <section className="text-center py-10 space-y-4">
        <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-[#F4EFE8]">
          Your first show is one tap away
        </h2>
        <div>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-[#F2B544] px-8 py-3.5 text-sm font-bold text-[#0E0D0C] shadow-lg hover:brightness-105 active:scale-95 transition-all"
          >
            Start your channel
          </Link>
        </div>
      </section>
    </div>
  )
}
