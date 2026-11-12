'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Radio,
  Mic,
  UploadCloud,
  Layers,
  DollarSign,
  BarChart3,
  Calendar,
  Users,
  Lock,
  Globe,
  Plus,
  Play,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { AudioUploadModal } from '@/components/AudioUploadModal'
import { SeriesManager } from '@/components/SeriesManager'
import { CreatorMonetization } from '@/components/CreatorMonetization'
import type { Channel, Series, Episode, MonetizationSettings, Tip } from '@/types/database'

interface CreatorDashboardHubProps {
  channels: Channel[]
  series: Series[]
  episodes: Episode[]
  monetization: MonetizationSettings | null
  tips: Tip[]
}

export function CreatorDashboardHub({
  channels,
  series: initialSeries,
  episodes: initialEpisodes,
  monetization,
  tips,
}: CreatorDashboardHubProps) {
  const [activeTab, setActiveTab] = useState<'channels' | 'episodes' | 'series' | 'monetization'>('channels')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [seriesList, setSeriesList] = useState<Series[]>(initialSeries)
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id || '')

  const currentChannel = channels.find((c) => c.id === selectedChannelId) || channels[0]

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Creator Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2724] pb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F4EFE8] tracking-tight">
            Creator Studio & Dashboard
          </h1>
          <p className="text-sm text-[#A39B91] mt-1">
            Manage your audio series, upload episodes, monitor retention, and configure monetization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Audio Upload Button (Drag & drop interface) */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#1A1816] border border-[#2A2724] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#F4EFE8] hover:border-[#F2B544] hover:text-[#F2B544] transition-all shadow-sm"
          >
            <UploadCloud className="w-4 h-4 text-[#F2B544]" />
            <span>Upload Audio</span>
          </button>

          {/* New Channel Button */}
          <Link
            href="/channels/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New Channel</span>
          </Link>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#2A2724]">
        {[
          { id: 'channels', label: 'Broadcast Channels', icon: Radio },
          { id: 'episodes', label: `Episodes (${initialEpisodes.length})`, icon: Play },
          { id: 'series', label: `Shows & Series (${seriesList.length})`, icon: Layers },
          { id: 'monetization', label: 'Monetization & Tips', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon
          const isSelected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-[#F2B544] text-[#0E0D0C] shadow-md shadow-[#F2B544]/20'
                  : 'text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#1A1816]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Broadcast Channels (Go Live & Analytics) */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          {channels.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#2A2724] bg-[#1A1816] p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center mx-auto text-[#F2B544]">
                <Radio className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#F4EFE8]">
                  No broadcast channels yet
                </h3>
                <p className="text-xs text-[#A39B91] max-w-sm mx-auto mt-1">
                  Create your first station to broadcast live sermons, podcasts, and talk shows directly from your browser.
                </p>
              </div>
              <Link
                href="/channels/new"
                className="inline-flex items-center gap-2 rounded-full bg-[#F2B544] px-6 py-3 text-xs sm:text-sm font-bold text-[#0E0D0C] hover:brightness-105 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your Channel</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-[#2A2724] transition-all shadow-xl"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center font-bold text-sm text-[#F2B544] shrink-0">
                          {ch.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-base text-[#F4EFE8]">
                            {ch.name}
                          </h3>
                          <span className="font-mono text-xs text-[#A39B91]">
                            /c/{ch.slug}
                          </span>
                        </div>
                      </div>

                      {ch.is_live ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-3 py-1 text-xs font-bold text-[#FF4A3D] border border-[#FF4A3D]/40 shadow-sm animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-[#FF4A3D]" />
                          LIVE ON AIR
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#0E0D0C] px-2.5 py-1 text-[11px] font-mono text-[#A39B91] border border-[#2A2724]">
                          OFFLINE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#A39B91] line-clamp-2">
                      {ch.description || 'Live speech broadcast tuned in from browser.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-[#A39B91] font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#F2B544]" />
                        {ch.current_listeners || 0} listening
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#A39B91]" />
                        {new Date(ch.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-[#2A2724]">
                    {/* Strict Red ONLY for Go Live Studio */}
                    <Link
                      href={`/studio/${ch.slug}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#FF4A3D] py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-[#FF4A3D]/25 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Go Live Studio</span>
                    </Link>

                    <Link
                      href={`/dashboard/analytics/${ch.slug}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#2A2724] bg-[#0E0D0C] py-2.5 px-3.5 text-xs font-medium text-[#F4EFE8] hover:border-[#F2B544]/60 hover:text-[#F2B544] transition-colors"
                      title="View retention and demographics"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#F2B544]" />
                      <span className="hidden sm:inline">Analytics</span>
                    </Link>

                    <Link
                      href={`/c/${ch.slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#2A2724] bg-[#0E0D0C] py-2.5 px-3.5 text-xs font-medium text-[#F4EFE8] hover:border-[#F2B544]/60 hover:text-[#F2B544] transition-colors"
                      title="View listener page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Audio Episodes (Uploads, Scheduling & Paywall) */}
      {activeTab === 'episodes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-[#F4EFE8]">
                Uploaded Episodes & On-Demand Shows
              </h3>
              <p className="text-xs text-[#A39B91]">
                Schedule, organize, or paywall your recorded audio content
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544] px-4 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Episode</span>
            </button>
          </div>

          {initialEpisodes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#2A2724] bg-[#1A1816] p-10 text-center space-y-3">
              <UploadCloud className="w-8 h-8 text-[#A39B91] mx-auto opacity-40" />
              <p className="font-display font-bold text-sm text-[#F4EFE8]">
                No episodes uploaded yet
              </p>
              <p className="text-xs text-[#A39B91] max-w-sm mx-auto">
                Drag-and-drop your audio files (MP3, AAC, M4A, OPUS) to publish on-demand episodes or schedule future releases.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-[#F2B544] uppercase tracking-wider">
                        {ep.category}
                      </span>
                      <div className="flex items-center gap-2">
                        {ep.is_premium && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#F2B544] bg-[#F2B544]/10 border border-[#F2B544]/30 px-2 py-0.5 rounded-full font-semibold">
                            <Lock className="w-3 h-3" /> Paywall
                          </span>
                        )}
                        {ep.scheduled_for && new Date(ep.scheduled_for) > new Date() ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#F2B544] bg-[#0E0D0C] border border-[#2A2724] px-2 py-0.5 rounded-full font-mono">
                            <Clock className="w-3 h-3" /> Scheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#3DBE7A] bg-[#0E0D0C] border border-[#2A2724] px-2 py-0.5 rounded-full font-mono">
                            <Globe className="w-3 h-3" /> Published
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-display font-bold text-base text-[#F4EFE8]">
                      {ep.title}
                    </h4>

                    {ep.description && (
                      <p className="text-xs text-[#A39B91] line-clamp-2">
                        {ep.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#2A2724] flex items-center justify-between text-xs text-[#A39B91] font-mono">
                    <span>{formatDuration(ep.duration_seconds)}</span>
                    <audio src={ep.audio_url} controls className="h-7 max-w-[170px]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Shows & Series */}
      {activeTab === 'series' && currentChannel && (
        <SeriesManager
          channelId={currentChannel.id}
          seriesList={seriesList}
          onSeriesCreated={(newS) => setSeriesList([newS, ...seriesList])}
        />
      )}

      {/* Tab 4: Monetization & Tips */}
      {activeTab === 'monetization' && currentChannel && (
        <CreatorMonetization
          channelId={currentChannel.id}
          settings={monetization}
          tips={tips}
        />
      )}

      {/* Audio Upload Modal */}
      {currentChannel && (
        <AudioUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          channelId={currentChannel.id}
          existingSeries={seriesList}
          onUploadSuccess={() => {
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
