'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Radio,
  Mic,
  Calendar,
  Disc,
  Settings,
  BarChart3,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Clock,
  Globe,
  ChevronDown,
  UploadCloud,
  Layers,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Play,
  Volume2,
} from 'lucide-react'
import { ProgramScheduleCalendar } from '@/components/ProgramScheduleCalendar'
import { ScheduleShowModal } from '@/components/ScheduleShowModal'
import { EditChannelModal } from '@/components/EditChannelModal'
import { AudioUploadModal } from '@/components/AudioUploadModal'
import { SeriesManager } from '@/components/SeriesManager'
import type { Channel, Series, Episode, MonetizationSettings, Tip, Show, Recording, ScheduledShow } from '@/types/database'

interface CreatorDashboardHubProps {
  channels: Channel[]
  series: Series[]
  episodes: Episode[]
  monetization: MonetizationSettings | null
  tips: Tip[]
  recentShows?: Show[]
  recordings?: Recording[]
  upcomingShows?: ScheduledShow[]
  totalListens?: number
  totalFollowers?: number
}

export function CreatorDashboardHub({
  channels: initialChannels,
  series: initialSeries,
  episodes: initialEpisodes,
  monetization,
  tips,
  recentShows = [],
  recordings = [],
  upcomingShows = [],
  totalListens = 0,
  totalFollowers = 0,
}: CreatorDashboardHubProps) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id || '')
  const [activeNav, setActiveNav] = useState<'dashboard' | 'live_events' | 'recordings' | 'channel' | 'analytics' | 'series'>('dashboard')
  const [dashboardSubTab, setDashboardSubTab] = useState<'live_events' | 'recordings'>('live_events')
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [seriesList, setSeriesList] = useState<Series[]>(initialSeries)
  const [currentDateTime, setCurrentDateTime] = useState<string>('')

  const currentChannel = channels.find((c) => c.id === selectedChannelId) || channels[0]

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentDateTime(
        now.toLocaleDateString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [])

  const copyUrl = () => {
    if (!currentChannel) return
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/c/${currentChannel.slug}`
      : `https://lisnr.goanitech.com/c/${currentChannel.slug}`
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const hasGoneLive = (currentChannel?.current_listeners ?? 0) > 0 || recentShows.length > 0
  const hasScheduled = upcomingShows.length > 0

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] -mx-4 -my-8 sm:-mx-6 bg-[#0E0D0C] text-[#F4EFE8]">
      {/* 1. Mixlr-style Left Sidebar Navigation */}
      <aside className="w-full md:w-60 border-r border-[#2A2724] bg-[#141210] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand & Studio Sub-Label */}
          <div className="p-5 border-b border-[#2A2724] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FF4A3D] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-[#FF4A3D]/20">
                <Radio className="w-4 h-4" />
              </div>
              <span className="font-display font-black text-sm tracking-wide text-[#F4EFE8]">
                LISNR <span className="font-normal text-xs text-[#A39B91]">For Creators</span>
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                activeNav === 'dashboard'
                  ? 'bg-[#1A1816] text-[#F2B544] border border-[#2A2724]'
                  : 'text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#1A1816]/50'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav('live_events')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                activeNav === 'live_events'
                  ? 'bg-[#1A1816] text-[#F2B544] border border-[#2A2724]'
                  : 'text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#1A1816]/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Live Events</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav('recordings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                activeNav === 'recordings'
                  ? 'bg-[#1A1816] text-[#F2B544] border border-[#2A2724]'
                  : 'text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#1A1816]/50'
              }`}
            >
              <Disc className="w-4 h-4" />
              <span>Recordings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav('series')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                activeNav === 'series'
                  ? 'bg-[#1A1816] text-[#F2B544] border border-[#2A2724]'
                  : 'text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#1A1816]/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Series & Episodes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentChannel) {
                  setEditingChannel(currentChannel)
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#1A1816]/50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Channel Settings</span>
            </button>

            {currentChannel && (
              <Link
                href={`/dashboard/analytics/${currentChannel.slug}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#1A1816]/50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Bottom Left: Mixlr-style Onboarding Progress Box */}
        <div className="p-4 border-t border-[#2A2724] space-y-3">
          <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-3.5 space-y-2 text-[11px]">
            <span className="font-bold text-[#F4EFE8] block">Onboarding progress</span>
            <div className="space-y-1.5 text-[#A39B91]">
              <div className="flex items-center gap-2">
                <span className="text-[#3DBE7A]">1. ✓</span>
                <span className="line-through text-[#666]">Create channel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasGoneLive ? 'text-[#3DBE7A]' : 'text-[#F2B544]'}>
                  {hasGoneLive ? '2. ✓' : '2. ○'}
                </span>
                <span className={hasGoneLive ? 'line-through text-[#666]' : 'text-[#F4EFE8]'}>
                  Go Live Studio
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasScheduled ? 'text-[#3DBE7A]' : 'text-[#F2B544]'}>
                  {hasScheduled ? '3. ✓' : '3. ○'}
                </span>
                <span className={hasScheduled ? 'line-through text-[#666]' : 'text-[#F4EFE8]'}>
                  Schedule show
                </span>
              </div>
            </div>
            <Link
              href="/#for-hosts"
              className="text-[10px] text-[#F2B544] hover:underline block pt-1"
            >
              View setup guide →
            </Link>
          </div>
        </div>
      </aside>

      {/* 2. Main Creator Studio Pane */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Channel Bar & Broadcast Status */}
        <div className="border-b border-[#2A2724] bg-[#141210] px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {currentChannel?.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentChannel.cover_url}
                alt={currentChannel.name}
                className="w-9 h-9 rounded-xl object-cover border border-[#2A2724]"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center font-bold text-xs text-[#F2B544]">
                {currentChannel?.name.slice(0, 2).toUpperCase() || 'ST'}
              </div>
            )}

            <div className="min-w-0">
              <span className="font-display font-bold text-sm text-[#F4EFE8] truncate block">
                {currentChannel?.name || 'My Station'}
              </span>
              <span className="font-mono text-[11px] text-[#A39B91]">
                /c/{currentChannel?.slug || ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentChannel && (
              <Link
                href={`/studio/${currentChannel.slug}`}
                className="w-8 h-8 rounded-full bg-[#FF4A3D] flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#FF4A3D]/20"
                title="Open Broadcast Studio"
              >
                <Mic className="w-4 h-4" />
              </Link>
            )}

            {currentChannel && (
              <button
                type="button"
                onClick={() => setEditingChannel(currentChannel)}
                className="w-8 h-8 rounded-full bg-[#1A1816] border border-[#2A2724] flex items-center justify-center text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
                title="Station Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <Link
              href="/#for-hosts"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1816] border border-[#2A2724] text-xs font-semibold text-[#A39B91] hover:text-[#F4EFE8]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Help</span>
            </Link>
          </div>
        </div>

        {/* Top Broadcast Green Banner (Mixlr Style) */}
        <div className="bg-[#1E7E4E] px-4 py-2.5 text-xs text-white font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2 mx-auto">
            <Mic className="w-4 h-4" />
            <span className="uppercase tracking-wider">
              Speech-First Live Audio Transcoder • Icecast 64k Mono Online
            </span>
          </div>
        </div>

        {/* 3. Center Stage Content based on Active Nav */}
        {activeNav === 'dashboard' && (
          <div className="flex-1 p-6 md:p-10 flex flex-col justify-between max-w-4xl mx-auto w-full space-y-10">
            <div className="space-y-6">
              {/* Off-Air / On-Air status pill */}
              <div className="flex justify-center">
                {currentChannel?.is_live ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4A3D]/10 border border-[#FF4A3D]/40 px-3 py-1 text-xs font-bold text-[#FF4A3D] animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#FF4A3D]" />
                    Currently ON AIR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544]/10 border border-[#F2B544]/30 px-3 py-1 text-xs font-semibold text-[#F2B544]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F2B544]" />
                    Currently Off-Air
                  </span>
                )}
              </div>

              {/* Mixlr Toggle Pill: [ Live Events ] | [ Recordings ] */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 rounded-full bg-[#141210] border border-[#2A2724]">
                  <button
                    type="button"
                    onClick={() => setDashboardSubTab('live_events')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                      dashboardSubTab === 'live_events'
                        ? 'bg-white text-[#0E0D0C] shadow-sm'
                        : 'text-[#A39B91] hover:text-white'
                    }`}
                  >
                    Live Events
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardSubTab('recordings')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                      dashboardSubTab === 'recordings'
                        ? 'bg-white text-[#0E0D0C] shadow-sm'
                        : 'text-[#A39B91] hover:text-white'
                    }`}
                  >
                    Recordings
                  </button>
                </div>
              </div>

              {/* Date & Time Timestamp */}
              <div className="text-center">
                <span className="text-xs font-mono text-[#A39B91] tracking-wide">
                  {currentDateTime || 'Live Broadcast Center'}
                </span>
              </div>

              {/* Center Two-Column Broadcast Box (Mixlr Exact Match) */}
              {dashboardSubTab === 'live_events' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
                  {/* Left Column: Action Buttons */}
                  <div className="space-y-4 max-w-xs mx-auto w-full">
                    {currentChannel ? (
                      <Link
                        href={`/studio/${currentChannel.slug}`}
                        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#FF4A3D] py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-[#FF4A3D]/25 hover:brightness-110 active:scale-95 transition-all text-center"
                      >
                        <Radio className="w-4 h-4" />
                        <span>Instant event</span>
                      </Link>
                    ) : (
                      <Link
                        href="/channels/new"
                        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#FF4A3D] py-3.5 px-6 text-sm font-bold text-white shadow-lg"
                      >
                        <span>Create Channel</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-white text-[#0E0D0C] hover:bg-[#F4EFE8] py-3.5 px-6 text-sm font-bold shadow-md active:scale-95 transition-all text-center"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Schedule event</span>
                    </button>
                  </div>

                  {/* Right Column: Events State Card */}
                  <div className="rounded-3xl border border-[#2A2724] bg-[#141210] p-8 text-center space-y-4 shadow-xl">
                    {upcomingShows.length === 0 ? (
                      <>
                        <div className="w-16 h-16 rounded-2xl border-2 border-[#FF4A3D] flex items-center justify-center mx-auto text-[#FF4A3D]">
                          <Calendar className="w-8 h-8" />
                        </div>

                        <div className="space-y-1">
                          <p className="font-semibold text-sm text-[#F4EFE8]">
                            You have no events scheduled.
                          </p>
                          <p className="text-xs text-[#A39B91]">
                            <button
                              type="button"
                              onClick={() => setShowScheduleModal(true)}
                              className="text-[#FF4A3D] hover:underline font-semibold"
                            >
                              Schedule an event
                            </button>
                            {' or... '}
                            <Link
                              href={`/studio/${currentChannel?.slug || ''}`}
                              className="text-[#FF4A3D] hover:underline font-semibold"
                            >
                              Start an instant event
                            </Link>
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3 text-left">
                        <div className="flex items-center justify-between border-b border-[#2A2724] pb-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-[#F2B544] flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Upcoming Scheduled Event
                          </span>
                          <span className="text-[10px] font-mono text-[#A39B91]">
                            {upcomingShows.length} queued
                          </span>
                        </div>

                        {upcomingShows.slice(0, 2).map((s) => (
                          <div key={s.id} className="p-3 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] space-y-1">
                            <h4 className="font-bold text-xs text-[#F4EFE8] truncate">{s.title}</h4>
                            <p className="text-[11px] font-mono text-[#F2B544]">
                              {new Date(s.scheduled_at).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setActiveNav('live_events')}
                          className="w-full text-center text-xs text-[#F2B544] hover:underline pt-1 font-semibold block"
                        >
                          View Full Calendar →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Recordings View */
                <div className="rounded-3xl border border-[#2A2724] bg-[#141210] p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
                    <span className="font-bold text-sm text-[#F4EFE8]">Recent Broadcast Recordings</span>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="text-xs font-semibold text-[#F2B544] hover:underline"
                    >
                      + Upload Episode
                    </button>
                  </div>

                  {recordings.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Disc className="w-10 h-10 text-[#A39B91] mx-auto opacity-30" />
                      <p className="text-sm font-semibold text-[#F4EFE8]">No recordings yet</p>
                      <p className="text-xs text-[#A39B91] max-w-sm mx-auto">
                        Broadcasts from your Studio are automatically recorded into high-quality Opus audio and archived here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recordings.slice(0, 4).map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#F4EFE8] truncate">{r.title}</p>
                            <span className="text-[10px] font-mono text-[#A39B91]">
                              {new Date(r.created_at).toLocaleDateString()} • {Math.floor((r.duration_seconds || 0) / 60)} mins
                            </span>
                          </div>
                          <audio src={r.audio_url} controls className="h-7 max-w-[160px]" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Dock Bar (Mixlr Exact Match: Your Channel URL) */}
            <div className="flex justify-center pb-6">
              <div className="rounded-full bg-[#141210] border border-[#2A2724] px-6 py-2.5 flex items-center gap-3 shadow-lg">
                <span className="text-xs text-[#A39B91] font-medium hidden sm:inline">
                  Your channel URL
                </span>
                <Link
                  href={`/c/${currentChannel?.slug || ''}`}
                  target="_blank"
                  className="text-xs font-mono text-[#FF4A3D] hover:underline truncate max-w-[220px] sm:max-w-xs"
                >
                  https://lisnr.goanitech.com/c/{currentChannel?.slug || ''}
                </Link>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="p-1 rounded-lg text-[#A39B91] hover:text-white transition-colors"
                  title="Copy Channel Link"
                >
                  {copiedUrl ? (
                    <Check className="w-4 h-4 text-[#3DBE7A]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Live Events (Full Calendar) */}
        {activeNav === 'live_events' && currentChannel && (
          <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
            <ProgramScheduleCalendar
              channelId={currentChannel.id}
              channelSlug={currentChannel.slug}
              channelName={currentChannel.name}
            />
          </div>
        )}

        {/* Tab: Recordings */}
        {activeNav === 'recordings' && (
          <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
              <div>
                <h2 className="font-display font-bold text-xl text-[#F4EFE8]">
                  Archived Recordings & Cloudflare R2
                </h2>
                <p className="text-xs text-[#A39B91] mt-0.5">
                  Lossless Opus audio archives stored with $0 egress bandwidth.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544] px-4 py-2 text-xs font-bold text-[#0E0D0C]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Episode</span>
              </button>
            </div>

            {recordings.length === 0 ? (
              <div className="py-16 text-center space-y-3 rounded-3xl border border-dashed border-[#2A2724] bg-[#141210]">
                <Disc className="w-10 h-10 text-[#A39B91] mx-auto opacity-30" />
                <p className="text-sm font-semibold text-[#F4EFE8]">No recordings archived yet</p>
                <p className="text-xs text-[#A39B91] max-w-sm mx-auto">
                  When you broadcast live from the Studio, your audio is recorded and archived here as replay podcasts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recordings.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-3xl bg-[#141210] border border-[#2A2724] space-y-3 flex flex-col justify-between shadow-lg"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[#3DBE7A] bg-[#3DBE7A]/10 border border-[#3DBE7A]/30 px-2 py-0.5 rounded-full uppercase">
                        Recorded Broadcast
                      </span>
                      <h4 className="font-bold text-sm text-[#F4EFE8] pt-1">{r.title}</h4>
                      <p className="text-[11px] font-mono text-[#A39B91]">
                        {new Date(r.created_at).toLocaleDateString()} • {Math.round((r.file_size_bytes || 0) / 1024 / 1024 * 10) / 10} MB
                      </p>
                    </div>
                    <audio src={r.audio_url} controls className="h-8 w-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Series & Episodes */}
        {activeNav === 'series' && currentChannel && (
          <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
            <SeriesManager
              channelId={currentChannel.id}
              seriesList={seriesList}
              onSeriesCreated={(newS) => setSeriesList([newS, ...seriesList])}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {currentChannel && (
        <ScheduleShowModal
          channelId={currentChannel.id}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false)
            window.location.reload()
          }}
        />
      )}

      {currentChannel && (
        <AudioUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          channelId={currentChannel.id}
          existingSeries={seriesList}
          onUploadSuccess={() => {
            setShowUploadModal(false)
            window.location.reload()
          }}
        />
      )}

      {editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          isOpen={!!editingChannel}
          onClose={() => setEditingChannel(null)}
          onUpdated={(updated) => {
            setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
          }}
        />
      )}
    </div>
  )
}
