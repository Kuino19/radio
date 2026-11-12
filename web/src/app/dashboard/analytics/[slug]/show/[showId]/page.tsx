import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Smartphone,
  Globe,
  Radio,
  Play,
  Share2,
} from 'lucide-react'
import type { Channel, Show, ListenSession, ChatMessage, Recording } from '@/types/database'

interface ShowAnalyticsPageProps {
  params: Promise<{
    slug: string
    showId: string
  }>
}

export default async function ShowAnalyticsPage({ params }: ShowAnalyticsPageProps) {
  const { slug, showId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/dashboard/analytics/${slug}/show/${showId}`)
  }

  // 1. Fetch channel
  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .single()

  if (!channel || channel.owner_id !== user.id) {
    notFound()
  }

  // 2. Fetch specific show
  const { data: showData, error: showErr } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .eq('channel_id', channel.id)
    .single()

  if (showErr || !showData) {
    notFound()
  }

  const show: Show = showData

  // 3. Fetch listen sessions for this show
  const startTime = show.started_at
  const endTime = show.ended_at || new Date().toISOString()

  const { data: sessionsData } = await supabase
    .from('listen_sessions')
    .select('*')
    .eq('channel_id', channel.id)
    .or(`show_id.eq.${show.id},and(joined_at.gte.${startTime},joined_at.lte.${endTime})`)
    .order('joined_at', { ascending: false })

  const sessions: ListenSession[] = sessionsData || []

  // 4. Fetch chat messages sent during this show
  const { data: chatData } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channel.id)
    .gte('created_at', startTime)
    .lte('created_at', endTime)
    .order('created_at', { ascending: true })

  const messages: ChatMessage[] = chatData || []

  // 5. Fetch archived recording if exists
  const { data: recordingData } = await supabase
    .from('recordings')
    .select('*')
    .eq('show_id', show.id)
    .maybeSingle()

  const recording: Recording | null = recordingData

  // Calculations
  const uniqueAudience = new Set(
    sessions.map((s) => s.user_id || s.anon_id || s.display_name)
  ).size

  const durationMins = show.ended_at
    ? Math.max(1, Math.round((new Date(show.ended_at).getTime() - new Date(show.started_at).getTime()) / 60000))
    : Math.max(1, Math.round((Date.now() - new Date(show.started_at).getTime()) / 60000))

  let totalListeningMins = 0
  sessions.forEach((s) => {
    const j = new Date(s.joined_at).getTime()
    const l = new Date(s.last_seen_at).getTime()
    const diff = Math.max(1, Math.round((l - j) / 60000))
    if (diff < 360) totalListeningMins += diff
  })
  const avgTuneInMins = sessions.length > 0 ? Math.round(totalListeningMins / sessions.length) : 0

  // Device stats
  let mobileCount = 0
  let desktopCount = 0
  sessions.forEach((s) => {
    const dev = (s.device_type || '').toLowerCase()
    if (dev.includes('desk') || dev.includes('mac') || dev.includes('win')) desktopCount++
    else mobileCount++
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2724] pb-6">
        <div>
          <Link
            href={`/dashboard/analytics/${channel.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#A39B91] hover:text-[#F4EFE8] transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to {channel.name} Analytics
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#F4EFE8] tracking-tight">
              {show.title}
            </h1>
            {!show.ended_at && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4A3D]/20 px-2.5 py-0.5 text-xs font-bold text-[#FF4A3D] border border-[#FF4A3D]/40 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-[#FF4A3D]" />
                LIVE STREAM
              </span>
            )}
          </div>
          <p className="text-xs text-[#A39B91] mt-1 flex items-center gap-2">
            <span>{new Date(show.started_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span>•</span>
            <span>{new Date(show.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>•</span>
            <span className="font-mono text-[#F2B544]">{durationMins} minutes duration</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/studio/${channel.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#F2B544] px-4 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 transition-all shadow-md"
          >
            <Radio className="h-3.5 w-3.5" />
            Open Studio
          </Link>
        </div>
      </div>

      {/* Program Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-1">
          <span className="text-[11px] text-[#A39B91] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#F2B544]" />
            Peak Listeners
          </span>
          <span className="font-mono text-2xl font-bold text-[#F2B544] block">
            {show.peak_listeners || 0}
          </span>
          <span className="text-[10px] text-[#A39B91]">Highest simultaneous listeners</span>
        </div>

        <div className="rounded-2xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-1">
          <span className="text-[11px] text-[#A39B91] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#3DBE7A]" />
            Unique Listeners
          </span>
          <span className="font-mono text-2xl font-bold text-[#F4EFE8] block">
            {uniqueAudience}
          </span>
          <span className="text-[10px] text-[#A39B91]">Individual people tuned in</span>
        </div>

        <div className="rounded-2xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-1">
          <span className="text-[11px] text-[#A39B91] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#F2B544]" />
            Avg. Tune-in Time
          </span>
          <span className="font-mono text-2xl font-bold text-[#F4EFE8] block">
            {avgTuneInMins}m
          </span>
          <span className="text-[10px] text-[#A39B91]">Average listener retention</span>
        </div>

        <div className="rounded-2xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-1">
          <span className="text-[11px] text-[#A39B91] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#3DBE7A]" />
            Chat Messages
          </span>
          <span className="font-mono text-2xl font-bold text-[#F4EFE8] block">
            {messages.length}
          </span>
          <span className="text-[10px] text-[#A39B91]">Audience interactions</span>
        </div>
      </div>

      {/* Recording Player (if archived) */}
      {recording?.audio_url && (
        <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F4EFE8] flex items-center gap-2">
              <Play className="w-4 h-4 text-[#F2B544]" />
              Archived Program Recording
            </h3>
            <span className="text-[11px] font-mono text-[#A39B91]">
              {(recording.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
          <audio controls src={recording.audio_url} className="w-full h-11 rounded-xl" />
        </div>
      )}

      {/* Two Columns: Audience Roster & Live Chat Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listeners Breakdown */}
        <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
            <h3 className="font-display font-bold text-sm text-[#F4EFE8] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#F2B544]" />
              Listeners Who Tuned In ({sessions.length})
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#A39B91]">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-[#F2B544]" /> {mobileCount}
              </span>
              <span>•</span>
              <span>Desktop: {desktopCount}</span>
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="text-xs text-[#A39B91] py-8 text-center">
              No individual session logs recorded for this broadcast.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-[#2A2724]/40">
              {sessions.map((s) => (
                <div key={s.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center font-bold text-[10px] text-[#F2B544] shrink-0">
                      {s.display_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#F4EFE8] font-medium truncate block max-w-[130px]">
                          {s.display_name}
                        </span>
                        {s.is_guest && (
                          <span className="text-[9px] text-[#A39B91] bg-[#0E0D0C] px-1.5 py-0.2 rounded border border-[#2A2724]">
                            guest
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#A39B91]">
                        {s.city ? `${s.city}, ${s.country}` : s.country || 'Nigeria'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-[#F4EFE8]">
                      {new Date(s.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="block text-[9px] text-[#A39B91]">
                      {s.device_type || 'Mobile'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Chat Log */}
        <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
            <h3 className="font-display font-bold text-sm text-[#F4EFE8] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#3DBE7A]" />
              Live Chat Log ({messages.length})
            </h3>
          </div>

          {messages.length === 0 ? (
            <p className="text-xs text-[#A39B91] py-8 text-center">
              No chat messages were sent during this broadcast.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div key={m.id} className="p-3 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F2B544] flex items-center gap-1.5">
                      {m.display_name}
                      {!m.user_id && (
                        <span className="text-[9px] text-[#A39B91] font-normal border border-[#2A2724] px-1 rounded">
                          guest
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-[#A39B91]">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#F4EFE8] leading-relaxed break-words">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
