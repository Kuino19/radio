'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Radio, ExternalLink, Users, Disc } from 'lucide-react'
import { SpectrumVisualizer } from '@/components/SpectrumVisualizer'

interface EmbedPlayerClientProps {
  channelName: string
  channelSlug: string
  coverUrl?: string | null
  hostName?: string | null
  isLive: boolean
  currentListeners: number
  streamUrl: string
  latestRecordingUrl?: string | null
  latestRecordingTitle?: string | null
}

export function EmbedPlayerClient({
  channelName,
  channelSlug,
  coverUrl,
  hostName,
  isLive: initialIsLive,
  currentListeners: initialListeners,
  streamUrl,
  latestRecordingUrl,
  latestRecordingTitle,
}: EmbedPlayerClientProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLive, setIsLive] = useState(initialIsLive)
  const [listeners, setListeners] = useState(initialListeners)
  const [volume, setVolume] = useState(0.9)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Use live stream if on air, otherwise fallback to latest replay recording
  const activeAudioSource = isLive
    ? `${streamUrl}${streamUrl.includes('?') ? '&' : '?'}embed=1&t=${Date.now()}`
    : latestRecordingUrl || streamUrl

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      setIsLoading(true)
      audioRef.current.src = activeAudioSource
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          setIsLoading(false)
        })
        .catch((err) => {
          console.warn('Embed playback error:', err)
          setIsLoading(false)
          setIsPlaying(false)
        })
    }
  }

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol)
    if (audioRef.current) {
      audioRef.current.volume = newVol
      if (newVol > 0 && isMuted) {
        setIsMuted(false)
        audioRef.current.muted = false
      }
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    audioRef.current.muted = nextMuted
  }

  return (
    <div className="w-full h-full min-h-[140px] bg-[#141210] text-[#F4EFE8] border border-[#2A2724] rounded-2xl p-4 sm:p-5 flex flex-col justify-between select-none shadow-xl relative overflow-hidden">
      <audio
        ref={audioRef}
        preload="none"
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false)
          setIsPlaying(true)
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false)
          setIsPlaying(false)
        }}
      />

      {/* Top Header: Station info & Live indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={channelName}
              className="w-10 h-10 rounded-xl object-cover border border-[#2A2724] shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center font-bold text-xs text-[#F2B544] shrink-0">
              <Radio className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-sm sm:text-base text-[#F4EFE8] truncate">
              {channelName}
            </h1>
            <p className="text-[11px] text-[#A39B91] truncate">
              {hostName ? `Hosted by ${hostName}` : 'Speech-First Live Radio'}
            </p>
          </div>
        </div>

        {/* Live / Offline pill & LISNR branding link */}
        <div className="flex items-center gap-2 shrink-0">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4A3D]/10 border border-[#FF4A3D]/40 px-2.5 py-0.5 text-[10px] font-black text-[#FF4A3D] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4A3D]" />
              LIVE
            </span>
          ) : latestRecordingUrl ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0E0D0C] border border-[#2A2724] px-2.5 py-0.5 text-[10px] font-semibold text-[#A39B91]">
              <Disc className="w-3 h-3 text-[#F2B544]" />
              REPLAY
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#0E0D0C] border border-[#2A2724] px-2.5 py-0.5 text-[10px] font-semibold text-[#A39B91]">
              OFFLINE
            </span>
          )}

          <a
            href={`https://lisnr.goanitech.com/c/${channelSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0E0D0C] border border-[#2A2724] text-[10px] font-semibold text-[#A39B91] hover:text-[#F4EFE8] hover:border-[#F2B544] transition-colors"
            title="Open on LISNR with Live Chat"
          >
            <span>LISNR</span>
            <ExternalLink className="w-3 h-3 text-[#F2B544]" />
          </a>
        </div>
      </div>

      {/* Middle: Live Waveform Visualizer */}
      <div className="my-2 py-1.5 flex items-center justify-center bg-[#0E0D0C] rounded-xl border border-[#2A2724]/60 px-4">
        <SpectrumVisualizer isPlaying={isPlaying} barCount={18} height={28} accentColor="#F2B544" />
      </div>

      {/* Bottom Controls: Play/Pause, Replay Title, and Volume */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!isLive && !latestRecordingUrl}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-[#0E0D0C] shadow-md transition-transform cursor-pointer ${
              isPlaying
                ? 'bg-[#F4EFE8] hover:bg-[#FAF6F0]'
                : 'bg-[#F2B544] hover:brightness-110 active:scale-95 shadow-[#F2B544]/20'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? 'Pause' : 'Play Broadcast'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-[#0E0D0C]" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5 text-[#0E0D0C]" />
            )}
          </button>

          <div className="min-w-0">
            <span className="text-xs font-bold text-[#F4EFE8] block truncate max-w-[140px] sm:max-w-xs">
              {isLive
                ? 'Live Broadcast'
                : latestRecordingTitle || 'Station Offline'}
            </span>
            {isLive && listeners > 0 && (
              <span className="text-[10px] text-[#A39B91] flex items-center gap-1">
                <Users className="w-3 h-3 text-[#F2B544]" />
                {listeners} listening
              </span>
            )}
          </div>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2 bg-[#0E0D0C] px-3 py-1.5 rounded-full border border-[#2A2724]">
          <button
            type="button"
            onClick={toggleMute}
            className="text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-[#FF4A3D]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-14 sm:w-18 h-1 accent-[#F2B544] cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
