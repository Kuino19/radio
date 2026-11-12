'use client'

import { useState, useEffect } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { SpectrumVisualizer } from '@/components/SpectrumVisualizer'
import { TipHostModal } from '@/components/TipHostModal'
import { SocialShareModal } from '@/components/SocialShareModal'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Loader2,
  RotateCcw,
  Wifi,
  Sparkles,
  AlertCircle,
  Share2,
  DollarSign,
  Bookmark,
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
    playbackRate,
    isHiFi,
    currentDisplayName,
    playbackError,
    playChannel,
    togglePlay,
    syncToLive,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleHiFi,
    openGuestModal,
  } = usePlayer()

  const [showTipModal, setShowTipModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const isCurrentActiveChannel = currentTrack?.channelSlug === channelSlug
  const isPlaying = isCurrentActiveChannel && globalIsPlaying
  const isLoading = isCurrentActiveChannel && globalIsLoading

  const handlePlayClick = () => {
    playChannel({
      channelId,
      showId: showId || null,
      channelName,
      channelSlug,
      streamUrl,
      coverUrl: coverUrl || null,
      hostName: hostName || null,
      isLive,
    })
  }

  // Automatically attempt playback when listener visits an active live stream
  useEffect(() => {
    if (isLive && !isPlaying && !isLoading) {
      handlePlayClick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, channelSlug])

  const effectiveDisplayName = userDisplayName || currentDisplayName
  const playbackRates = [0.75, 1, 1.25, 1.5, 2]

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
            {isLive ? (
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
              {isLive ? 'Tap play to tune in to live audio' : 'Station is currently offline'}
            </p>
          )}
        </div>

        {/* Playback Error / Status Notice */}
        {playbackError && isCurrentActiveChannel && (
          <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 text-xs text-[#F4EFE8] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#F2B544]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{isLive ? 'Connecting to live broadcast...' : 'Broadcast is currently offline'}</span>
            </div>
            <p className="text-[11px] text-[#A39B91] leading-relaxed">
              {isLive
                ? 'Audio stream is initializing. If sound does not begin playing immediately, please tap the Play button below.'
                : 'The station host is not broadcasting at this moment. You will be automatically connected when they go live.'}
            </p>
          </div>
        )}

        {/* Stream Controls & Listener Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Play Button & Display Name */}
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
              <span className="text-[11px] text-[#A39B91] block">Listening as</span>
              <span className="text-xs font-semibold text-[#F4EFE8] flex items-center gap-1.5">
                {effectiveDisplayName ? (
                  <>
                    <span>{effectiveDisplayName}</span>
                    {!userLoggedIn && (
                      <span className="text-[10px] text-[#F2B544] font-medium border border-[#F2B544]/40 bg-[#F2B544]/10 rounded-full px-2 py-0.2">
                        guest
                      </span>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openGuestModal}
                    className="text-[#F2B544] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="h-3 w-3" /> Set your name
                  </button>
                )}
              </span>
            </div>
          </div>

          {/* Right tools: Speed, Tipping, Sharing & Volume */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Speed Control (0.75x, 1x, 1.25x, 1.5x, 2x) */}
            <div className="flex items-center bg-[#0E0D0C] rounded-full border border-[#2A2724] p-0.5">
              {playbackRates.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-2 py-1 rounded-full text-[10px] font-mono transition-colors ${
                    playbackRate === rate
                      ? 'bg-[#F2B544] text-[#0E0D0C] font-bold'
                      : 'text-[#A39B91] hover:text-[#F4EFE8]'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Tipping Button */}
            {channelId && (
              <button
                type="button"
                onClick={() => setShowTipModal(true)}
                className="inline-flex items-center gap-1 rounded-full bg-[#F2B544]/15 border border-[#F2B544]/40 px-3 py-1.5 text-xs font-bold text-[#F2B544] hover:bg-[#F2B544]/25 transition-all shadow-sm"
                title="Send a tip to the host"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Tip</span>
              </button>
            )}

            {/* Social Share Button (Twitter/LinkedIn) */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1 rounded-full bg-[#0E0D0C] border border-[#2A2724] px-3 py-1.5 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544]/60 transition-colors"
              title="Share broadcast on social media"
            >
              <Share2 className="w-3.5 h-3.5 text-[#F2B544]" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Bookmark / Favorite */}
            <button
              type="button"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-full border transition-colors ${
                isBookmarked
                  ? 'border-[#F2B544] bg-[#F2B544]/10 text-[#F2B544]'
                  : 'border-[#2A2724] bg-[#0E0D0C] text-[#A39B91] hover:text-[#F4EFE8]'
              }`}
              title={isBookmarked ? 'Saved to Favorites' : 'Save to Favorites'}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            {/* Live Sync Action */}
            {isPlaying && (
              <button
                type="button"
                onClick={syncToLive}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[#A39B91] hover:text-[#F4EFE8] px-2.5 py-1.5 rounded-full border border-[#2A2724] bg-[#0E0D0C] transition-colors"
                title="Resync to live stream edge"
              >
                <RotateCcw className="h-3 w-3 text-[#F2B544]" />
                <span>Sync</span>
              </button>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2 bg-[#0E0D0C] px-3 py-1.5 rounded-full border border-[#2A2724]">
              <button
                type="button"
                onClick={toggleMute}
                className="text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
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
                className="h-1.5 w-14 accent-[#F2B544] bg-[#2A2724] rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center justify-end gap-2 font-mono text-[11px] text-[#A39B91] pt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3DBE7A]" />
            <span className="capitalize">{bufferHealth}</span>
          </div>
        )}
      </div>

      {/* Tip Host Modal */}
      {channelId && (
        <TipHostModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          channelId={channelId}
          channelName={channelName}
          hostName={hostName}
          currentUserDisplayName={effectiveDisplayName}
        />
      )}

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
