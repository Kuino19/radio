'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlayer } from '@/context/PlayerContext'
import { SpectrumVisualizer } from '@/components/SpectrumVisualizer'
import { SocialShareModal } from '@/components/SocialShareModal'
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
  userLoggedIn: boolean
  userDisplayName?: string | null
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
  userLoggedIn,
  userDisplayName,
}: AudioPlayerProps) {
  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    isLoading: globalIsLoading,
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
  } = usePlayer()

  const [currentLive, setCurrentLive] = useState(isLive)
  const [currentShowId, setCurrentShowId] = useState(showId)
  const [showShareModal, setShowShareModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setCurrentLive(isLive)
  }, [isLive])

  useEffect(() => {
    setCurrentShowId(showId)
  }, [showId])

  // Live status monitoring: listen to Supabase realtime and poll every 4s
  useEffect(() => {
    if (!channelId) return

    const checkStatus = async () => {
      try {
        const { data } = await supabase
          .from('channels')
          .select('is_live')
          .eq('id', channelId)
          .single()

        if (data && typeof data.is_live === 'boolean') {
          if (data.is_live !== currentLive) {
            setCurrentLive(data.is_live)
            if (data.is_live) {
              const { data: latestShow } = await supabase
                .from('shows')
                .select('id')
                .eq('channel_id', channelId)
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              if (latestShow) setCurrentShowId(latestShow.id)
            }
          }
        }
      } catch {}
    }

    const interval = setInterval(checkStatus, 4000)

    const sub = supabase
      .channel(`player-channel-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` },
        (payload) => {
          const updated = payload.new as { is_live?: boolean }
          if (typeof updated.is_live === 'boolean') {
            setCurrentLive(updated.is_live)
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(sub)
    }
  }, [channelId, currentLive, supabase])

  const isCurrentActiveChannel = currentTrack?.channelSlug === channelSlug
  const isPlaying = isCurrentActiveChannel && globalIsPlaying
  const isLoading = isCurrentActiveChannel && globalIsLoading

  const handlePlayClick = () => {
    playChannel({
      channelId,
      showId: currentShowId || null,
      channelName,
      channelSlug,
      streamUrl,
      coverUrl: coverUrl || null,
      hostName: hostName || null,
      isLive: currentLive,
    })
  }

  // Automatically attempt playback when stream is live
  useEffect(() => {
    if (currentLive && !isPlaying && !isLoading) {
      handlePlayClick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLive, channelSlug])

  return (
    <>
      <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Top Bar: Broadcast Station details & Live status */}
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0E0D0C] text-[#F2B544] border border-[#2A2724]">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A39B91]">
                  Live Transmission
                </span>
                <button
                  type="button"
                  onClick={toggleHiFi}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono transition-colors ${
                    isHiFi
                      ? 'bg-[#F2B544] text-[#0E0D0C] font-bold'
                      : 'bg-[#0E0D0C] text-[#A39B91] border border-[#2A2724] hover:text-[#F4EFE8]'
                  }`}
                  title="Toggle High-Fidelity Audio Mode"
                >
                  {isHiFi ? '128k Hi-Fi' : '64k Voice'}
                </button>
              </div>
              <p className="text-sm sm:text-base font-bold text-[#F4EFE8] truncate max-w-[200px] sm:max-w-md">
                {channelName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-3 py-1 text-xs font-bold text-[#FF4A3D] border border-[#FF4A3D]/30 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#FF4A3D] animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#0E0D0C] px-3 py-1 text-xs font-medium text-[#A39B91] border border-[#2A2724]">
                OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* Real-time Spectrum Visualizer */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[#0E0D0C] p-5 border border-[#2A2724] relative overflow-hidden">
          <SpectrumVisualizer isPlaying={isPlaying} barCount={26} height={56} accentColor="#F2B544" />
          {!isPlaying && (
            <p className="text-xs text-[#A39B91] mt-3 font-medium flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-[#F2B544]" />
              {currentLive ? 'Tap play to tune in to live audio' : 'Station is currently offline'}
            </p>
          )}
        </div>

        {/* Playback Error / Status Notice */}
        {playbackError && isCurrentActiveChannel && (
          <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 text-xs text-[#F4EFE8] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#F2B544]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{currentLive ? 'Connecting to live broadcast...' : 'Broadcast is currently offline'}</span>
            </div>
            <p className="text-[11px] text-[#A39B91] leading-relaxed">
              {currentLive
                ? 'Audio stream is initializing. If sound does not begin playing immediately, please tap the Play button below.'
                : 'The station host is not broadcasting at this moment. You will be automatically connected when they go live.'}
            </p>
          </div>
        )}

        {/* Stream Controls */}
        <div className="flex items-center justify-between gap-4 pt-2">
          {/* Big Play / Pause Button & Status */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={isPlaying ? togglePlay : handlePlayClick}
              className={`flex h-14 w-14 items-center justify-center rounded-full text-[#0E0D0C] shadow-lg transition-transform ${
                isPlaying
                  ? 'bg-[#F4EFE8] hover:bg-[#FAF6F0]'
                  : 'bg-[#F2B544] hover:brightness-110 active:scale-95 shadow-[#F2B544]/20'
              }`}
              title={isPlaying ? 'Pause' : 'Play Live'}
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
                {channelName}
              </p>
              <p className="text-xs text-[#A39B91] mt-0.5">
                {currentLive ? (
                  <span className="text-[#3DBE7A] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3DBE7A] animate-pulse" />
                    Live Audio Stream
                  </span>
                ) : (
                  <span>Broadcast is offline</span>
                )}
              </p>
            </div>
          </div>

          {/* Right Tools: Clean Volume & Share Only */}
          <div className="flex items-center gap-2.5">
            {/* Volume Control */}
            <div className="flex items-center gap-2 bg-[#0E0D0C] px-3.5 py-2 rounded-full border border-[#2A2724]">
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

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] border border-[#2A2724] px-4 py-2 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544]/60 transition-colors"
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
        url={typeof window !== 'undefined' ? `${window.location.origin}/c/${channelSlug}` : `https://radio.goanitech.com/c/${channelSlug}`}
        subtitle={hostName ? `Live broadcast hosted by ${hostName}` : undefined}
      />
    </>
  )
}
