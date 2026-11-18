'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlayer } from '@/context/PlayerContext'
import { SpectrumVisualizer } from '@/components/SpectrumVisualizer'
import { SocialShareModal } from '@/components/SocialShareModal'
import type { Recording } from '@/types/database'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Loader2,
  Wifi,
  AlertCircle,
  Share2,
  RotateCcw,
  RotateCw,
  Clock,
} from 'lucide-react'

interface AudioPlayerProps {
  channelId?: string
  showId?: string | null
  streamUrl: string
  isLive: boolean
  channelName: string
  channelSlug: string
  coverUrl?: string | null
  hostName?: string | null
  latestRecording?: Recording | null
  showSpecific?: boolean
}

export function AudioPlayer({
  channelId,
  showId,
  streamUrl,
  isLive,
  channelName,
  channelSlug,
  coverUrl,
  hostName,
  latestRecording,
  showSpecific = false,
}: AudioPlayerProps) {
  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    isLoading: globalIsLoading,
    currentTime,
    duration: playerDuration,
    volume,
    isMuted,
    bufferHealth,
    isHiFi,
    playbackError,
    playChannel,
    togglePlay,
    setVolume,
    toggleMute,
    toggleHiFi,
    seek,
    seekRelative,
  } = usePlayer()

  const [currentLive, setCurrentLive] = useState(isLive)
  const [currentShowId, setCurrentShowId] = useState(showId)
  const [showShareModal, setShowShareModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentLive(isLive), 0)
    return () => window.clearTimeout(timer)
  }, [isLive])

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentShowId(showId), 0)
    return () => window.clearTimeout(timer)
  }, [showId])

  // Live status monitoring: listen to Supabase realtime and poll every 4s
  useEffect(() => {
    if (!channelId) return

    const checkStatus = async () => {
      try {
        try {
          const stream = new URL(streamUrl)
          const channelPath = stream.pathname.split('/').filter(Boolean).at(-1)
          if (channelPath) {
            const response = await fetch(`${stream.origin}/api/live-status/${encodeURIComponent(channelPath)}`, { cache: 'no-store' })
            if (response.ok) {
              const status = await response.json() as { isLive?: boolean; showId?: string | null }
              setCurrentShowId(status.showId || null)
              setCurrentLive(Boolean(status.isLive && (!showSpecific || status.showId === showId)))
              return
            }
          }
        } catch {
          // Fall back to Supabase while the stream status endpoint is unavailable.
        }

        const { data } = await supabase
          .from('channels')
          .select('is_live')
          .eq('id', channelId)
          .single()

        if (data && typeof data.is_live === 'boolean') {
          let isThisShowLive = data.is_live
          if (data.is_live) {
            const { data: latestShow } = await supabase
              .from('shows')
              .select('id')
              .eq('channel_id', channelId)
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (latestShow) setCurrentShowId(latestShow.id)
            if (showSpecific) isThisShowLive = latestShow?.id === showId
          }
          setCurrentLive(isThisShowLive)
        }
      } catch {}
    }

    void checkStatus()
    const interval = setInterval(checkStatus, 5000)

    const sub = supabase
      .channel(`player-channel-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` },
        (payload) => {
          const updated = payload.new as { is_live?: boolean }
          if (typeof updated.is_live === 'boolean') void checkStatus()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(sub)
    }
  }, [channelId, showId, showSpecific, streamUrl, supabase])

  const recordingSlug = latestRecording ? `rec-${latestRecording.id}` : null
  const isPlayingLive = currentTrack?.channelSlug === channelSlug && globalIsPlaying && currentTrack?.isLive
  const isPlayingReplay = !!recordingSlug && currentTrack?.channelSlug === recordingSlug && globalIsPlaying
  const isPlaying = isPlayingLive || isPlayingReplay

  const isLoadingLive = currentTrack?.channelSlug === channelSlug && globalIsLoading
  const isLoadingReplay = !!recordingSlug && currentTrack?.channelSlug === recordingSlug && globalIsLoading
  const isLoading = isLoadingLive || isLoadingReplay

  const isCurrentActiveChannel = currentTrack?.channelSlug === channelSlug || currentTrack?.channelSlug === recordingSlug
  const currentPlaybackError = isCurrentActiveChannel ? playbackError : null

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00'
    const mins = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${mins}:${s.toString().padStart(2, '0')}`
  }

  const handlePlayClick = () => {
    if (currentLive) {
      playChannel({
        channelId,
        showId: currentShowId || null,
        channelName,
        channelSlug,
        streamUrl,
        coverUrl: coverUrl || null,
        hostName: hostName || null,
        isLive: true,
      })
    } else if (latestRecording) {
      playChannel({
        channelName: `${channelName}: ${latestRecording.title}`,
        channelSlug: `rec-${latestRecording.id}`,
        streamUrl: latestRecording.audio_url,
        coverUrl: coverUrl || null,
        hostName: hostName || 'Archive Replay',
        isLive: false,
        duration: latestRecording.duration_seconds,
      })
    }
  }

  // Automatically attempt playback when stream is live (desktop only — mobile requires user gesture)
  useEffect(() => {
    if (currentLive && !isPlaying && !isLoading) {
      const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      if (!isMobile) {
        handlePlayClick()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLive, channelSlug])

  return (
    <>
      <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-xl">
        {/* Top Bar: Broadcast Station details & Live status */}
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-3 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-[#0E0D0C] text-[#F2B544] border border-[#2A2724]">
              <Radio className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#A39B91]">
                  {currentLive ? 'Live Transmission' : latestRecording ? 'Past Show Replay' : 'Station Status'}
                </span>
                {currentLive && (
                  <button
                    type="button"
                    onClick={toggleHiFi}
                    className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono transition-colors ${
                      isHiFi
                        ? 'bg-[#F2B544] text-[#0E0D0C] font-bold'
                        : 'bg-[#0E0D0C] text-[#A39B91] border border-[#2A2724] hover:text-[#F4EFE8]'
                    }`}
                    title="Toggle High-Fidelity Audio Mode"
                  >
                    {isHiFi ? '128k Hi-Fi' : '64k Voice'}
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-base font-bold text-[#F4EFE8] truncate max-w-[180px] sm:max-w-md">
                {currentLive ? channelName : latestRecording ? latestRecording.title : channelName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold text-[#FF4A3D] border border-[#FF4A3D]/30 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#FF4A3D] animate-pulse" />
                LIVE
              </span>
            ) : latestRecording ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-medium text-[#F2B544] border border-[#F2B544]/30">
                <Clock className="w-3 h-3 text-[#F2B544]" />
                REPLAY AVAILABLE
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#0E0D0C] px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-medium text-[#A39B91] border border-[#2A2724]">
                OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* Real-time Spectrum Visualizer */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[#0E0D0C] p-4 sm:p-5 border border-[#2A2724] relative overflow-hidden">
          <SpectrumVisualizer isPlaying={isPlaying} barCount={26} height={56} accentColor="#F2B544" />
          {!isPlaying && (
            <p className="text-[11px] sm:text-xs text-[#A39B91] mt-3 font-medium flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-[#F2B544]" />
              {currentLive
                ? 'Tap play to tune in to live audio'
                : latestRecording
                ? 'Station offline. Tap play to listen to the latest show.'
                : 'Station is currently offline'}
            </p>
          )}
        </div>

        {/* Replay Scrubber for Archived Broadcast */}
        {isPlayingReplay && latestRecording && (
          <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#A39B91]">
              <span>{formatTime(currentTime)}</span>
              <span className="text-[#F4EFE8] font-semibold truncate max-w-[200px] text-center">
                {latestRecording.title}
              </span>
              <span>{formatTime(playerDuration || latestRecording.duration_seconds)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={playerDuration || latestRecording.duration_seconds || 100}
              step="1"
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#2A2724] rounded-lg accent-[#F2B544] cursor-pointer"
            />
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => seekRelative(-15)}
                className="inline-flex items-center gap-1 text-[11px] text-[#A39B91] hover:text-[#F4EFE8] active:scale-95 transition-all touch-manipulation px-2 py-1 rounded-lg hover:bg-[#1A1816]"
                title="Rewind 15 seconds"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#F2B544]" />
                <span>15s</span>
              </button>
              <button
                type="button"
                onClick={() => seekRelative(15)}
                className="inline-flex items-center gap-1 text-[11px] text-[#A39B91] hover:text-[#F4EFE8] active:scale-95 transition-all touch-manipulation px-2 py-1 rounded-lg hover:bg-[#1A1816]"
                title="Fast forward 15 seconds"
              >
                <span>15s</span>
                <RotateCw className="w-3.5 h-3.5 text-[#F2B544]" />
              </button>
            </div>
          </div>
        )}

        {/* Playback Error / Status Notice */}
        {currentPlaybackError && (
          <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-3 sm:p-4 text-xs text-[#F4EFE8] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#F2B544]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{currentLive ? 'Connecting to live broadcast...' : 'Broadcast Notice'}</span>
            </div>
            <p className="text-[11px] text-[#A39B91] leading-relaxed">
              {currentPlaybackError}
            </p>
          </div>
        )}

        {/* Stream Controls — mobile-optimized with big tap targets */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
          {/* Big Play / Pause Button & Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              disabled={!currentLive && !latestRecording}
              onClick={isPlaying ? togglePlay : handlePlayClick}
              className={`flex h-14 w-14 sm:h-14 sm:w-14 items-center justify-center rounded-full text-[#0E0D0C] shadow-lg transition-transform active:scale-95 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                isPlaying
                  ? 'bg-[#F4EFE8] hover:bg-[#FAF6F0]'
                  : 'bg-[#F2B544] hover:brightness-110 shadow-[#F2B544]/20'
              }`}
              title={isPlaying ? 'Pause' : currentLive ? 'Play Live' : latestRecording ? 'Play Replay' : 'Offline'}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#0E0D0C]" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6 fill-current text-[#0E0D0C]" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-1 text-[#0E0D0C]" />
              )}
            </button>

            <div>
              <p className="text-sm sm:text-base font-bold text-[#F4EFE8] leading-tight">
                {currentLive ? channelName : latestRecording ? latestRecording.title : channelName}
              </p>
              <p className="text-[11px] sm:text-xs text-[#A39B91] mt-0.5">
                {currentLive ? (
                  <span className="text-[#3DBE7A] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3DBE7A] animate-pulse" />
                    Live Audio Stream
                  </span>
                ) : latestRecording ? (
                  <span className="text-[#F2B544] font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#F2B544]" />
                    Replay ({formatTime(latestRecording.duration_seconds)})
                  </span>
                ) : (
                  <span>Broadcast is offline</span>
                )}
              </p>
            </div>
          </div>

          {/* Right Tools: Volume (desktop) & Share */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Volume Control — hidden on mobile, shown on desktop */}
            <div className="hidden sm:flex items-center gap-2 bg-[#0E0D0C] px-3.5 py-2 rounded-full border border-[#2A2724]">
              <button
                type="button"
                onClick={toggleMute}
                className="text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-[#FF4A3D]" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1 w-16 sm:w-20 accent-[#F2B544] cursor-pointer"
              />
            </div>

            {/* Mobile mute toggle — visible only on mobile */}
            <button
              type="button"
              onClick={toggleMute}
              className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full bg-[#0E0D0C] border border-[#2A2724] text-[#A39B91] active:bg-[#2A2724] touch-manipulation"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-[#FF4A3D]" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] border border-[#2A2724] px-3 sm:px-4 py-2 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544]/60 active:bg-[#2A2724] transition-colors touch-manipulation"
              title="Share broadcast"
            >
              <Share2 className="w-3.5 h-3.5 text-[#F2B544]" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center justify-end gap-2 font-mono text-[11px] text-[#A39B91] pt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3DBE7A]" />
            <span className="capitalize">{bufferHealth}</span>
          </div>
        )}
      </div>

      {/* Social Share Modal */}
      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={channelName}
        url={typeof window !== 'undefined'
          ? `${window.location.origin}${showSpecific && showId ? `/live/${showId}` : `/c/${channelSlug}`}`
          : `https://radio.goanitech.com${showSpecific && showId ? `/live/${showId}` : `/c/${channelSlug}`}`}
        subtitle={hostName ? `Live broadcast hosted by ${hostName}` : undefined}
      />
    </>
  )
}
