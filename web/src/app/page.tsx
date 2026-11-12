import Link from 'next/link'
import { Play, Mic, Radio, Volume2, ArrowRight, ShieldCheck, Zap, Users, MessageSquare, BarChart3, Wifi } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Channel, ScheduledShow } from '@/types/database'

export default async function HomePage() {
  const supabase = await createClient()

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

  const liveList: Channel[] = liveChannels || []
  const offlineList: Channel[] = recentChannels || []
  const upcomingShows = upcomingData || []

  // Sample stations matching the design mocks if database is fresh
  const sampleShowcases = [
    {
      slug: 'live-test',
      name: 'Morning Devotion',
      host: 'Pastor Ade',
      listeners: 248,
      accentColor: '#F2B544',
      textColor: '#0E0D0C',
      isHero: true,
      description: 'Daily morning prayers, scripture reading, and open talk with our community across the continent.',
    },
    {
      slug: 'live-test',
      name: 'Lagos Talk Night',
      host: 'Tolu and Kemi',
      listeners: 87,
      accentColor: '#6B9080',
      textColor: '#F4EFE8',
      isHero: false,
      description: 'Late night commentary on traffic, tech, music and the daily grind in the city that never sleeps.',
    },
    {
      slug: 'live-test',
      name: 'Campus Radio Hour',
      host: 'The Media Team',
      listeners: 31,
      accentColor: '#DFCE9F',
      textColor: '#0E0D0C',
      isHero: false,
      description: 'University sports, student debates, upcoming examinations, and youth entertainment.',
    },
    {
      slug: 'live-test',
      name: 'Evening Prayers',
      host: 'Sister Grace',
      listeners: 19,
      accentColor: '#A4B0BE',
      textColor: '#0E0D0C',
      isHero: false,
      description: 'Reflective evening worship, calming hymns, and community blessing.',
    },
  ]

  const totalOnAir = Math.max(liveList.length, 3)

  return (
    <div className="flex flex-col gap-14 px-4 py-6 sm:px-6 sm:py-10 max-w-6xl mx-auto">
      {/* Top Section Header: Live now · 3 on air */}
      <section id="live-now" className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F4EFE8] tracking-tight">
              Live now
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

        {/* Live Broadcast Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Hero Featured Live Broadcast (Amber Dial Style - PDF Page 1 & 3) */}
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
              {/* LIVE Badge: Strict Red ONLY */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0E0D0C] px-3 py-1 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#FF4A3D] animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider text-[#FF4A3D]">LIVE</span>
                <span className="text-[#A39B91] text-[11px]">•</span>
                <span className="font-mono text-[11px] font-medium text-[#F4EFE8]">
                  {liveList.length > 0 ? `${liveList[0].current_listeners || 1} listening` : '248 listening'}
                </span>
              </div>

              <div>
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0E0D0C] tracking-tight leading-tight">
                  {liveList.length > 0 ? liveList[0].name : 'Morning Devotion'}
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#0E0D0C]/80 mt-1">
                  with {liveList.length > 0 ? 'Station Host' : 'Pastor Ade'}
                </p>
                <p className="text-xs text-[#0E0D0C]/70 mt-2 line-clamp-2">
                  {liveList.length > 0
                    ? (liveList[0].description || 'Live speech broadcast tuned in from browser.')
                    : 'Daily morning prayers, scripture reading, and open talk with our community across the continent.'}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-6 flex items-center gap-3 relative z-10">
              <Link
                href={liveList.length > 0 ? `/c/${liveList[0].slug}` : '/explore'}
                className="inline-flex items-center gap-2 rounded-full bg-[#0E0D0C] px-6 py-3 text-sm font-bold text-[#F4EFE8] shadow-md hover:bg-[#1A1816] active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current text-[#F2B544]" />
                <span>Listen</span>
              </Link>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[#0E0D0C]/30 bg-transparent px-5 py-3 text-sm font-semibold text-[#0E0D0C] hover:bg-[#0E0D0C]/10 active:scale-95 transition-all"
              >
                <span>Follow</span>
              </button>
            </div>
          </div>

          {/* Secondary Live Stations Column */}
          <div className="flex flex-col gap-4">
            {sampleShowcases.slice(1, 3).map((item, idx) => (
              <Link
                key={idx}
                href={`/c/${item.slug}`}
                className="group flex-1 rounded-3xl bg-[#1A1816] border border-[#2A2724] p-5 flex flex-col justify-between hover:border-[#F2B544]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF4A3D] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#FF4A3D] tracking-wider">LIVE</span>
                  </div>
                  <span className="font-mono text-xs text-[#A39B91]">
                    • {item.listeners}
                  </span>
                </div>

                <div className="my-2">
                  <h3 className="font-display font-bold text-lg text-[#F4EFE8] group-hover:text-[#F2B544] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#A39B91]">
                    with {item.host}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-[#A39B91] pt-2 border-t border-[#2A2724]">
                  <span>64 kbps · Voice</span>
                  <span className="text-[#F2B544] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Tune in <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Following row (Avatars - PDF Page 1 & 3) */}
      <section id="following" className="space-y-4">
        <h2 className="font-display font-bold text-lg text-[#F4EFE8] tracking-tight">
          Following
        </h2>
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {[
            { initials: 'PA', name: 'Pastor Ade', isLive: true },
            { initials: 'TK', name: 'Tolu and Kemi', isLive: true },
            { initials: 'CR', name: 'Campus Radio', isLive: true },
            { initials: 'SG', name: 'Sister Grace', isLive: false },
            { initials: 'EM', name: 'Emeka Talk', isLive: false },
          ].map((host, idx) => (
            <Link
              key={idx}
              href="/explore"
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-[#1A1816] border border-[#2A2724] flex items-center justify-center font-mono font-bold text-sm text-[#F4EFE8] group-hover:border-[#F2B544] transition-colors">
                  {host.initials}
                </div>
                {host.isLive && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#FF4A3D] border-2 border-[#0E0D0C]" />
                )}
              </div>
              <span className="text-[11px] text-[#A39B91] group-hover:text-[#F4EFE8] transition-colors max-w-[70px] truncate text-center">
                {host.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

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
