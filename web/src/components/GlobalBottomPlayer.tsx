'use client'

import { usePlayer } from '@/context/PlayerContext'
import { SpectrumVisualizer } from '@/components/SpectrumVisualizer'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Wifi,
  Sparkles,
} from 'lucide-react'

export function GlobalBottomPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    isMuted,
    volume,
    isExpanded,
    bufferHealth,
    audioQuality,
    currentDisplayName,
    togglePlay,
    syncToLive,
    setVolume,
    toggleMute,
    setIsExpanded,
    openGuestModal,
  } = usePlayer()

  if (!currentTrack) return null

  return (
    <>
      {/* 1. Global Persistent Sticky Bottom Bar */}
      <aside className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 border-t border-[#2A2724] bg-[#1A1816]/95 backdrop-blur-xl px-4 py-2 sm:py-2.5 transition-all duration-300 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:gap-6">
          {/* Station Artwork & Title */}
          <div
            className="flex items-center gap-3 min-w-0 cursor-pointer group"
            onClick={() => setIsExpanded(true)}
          >
            {currentTrack.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.channelName}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border border-[#2A2724] shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#0E0D0C] text-[#F2B544] font-bold border border-[#2A2724] shrink-0 group-hover:scale-105 transition-transform">
                <Radio className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4A3D] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF4A3D]">
                  LIVE
                </span>
                <span className="text-[#A39B91] text-[10px]">•</span>
                <span className="text-[10px] text-[#A39B91] font-mono">
                  {audioQuality}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-[#F4EFE8] truncate max-w-[140px] sm:max-w-xs group-hover:text-[#F2B544] transition-colors">
                {currentTrack.channelName}
              </h4>
              <p className="text-[11px] text-[#A39B91] truncate hidden sm:block">
                {currentTrack.hostName ? `${currentTrack.hostName} · live` : 'LISNR Station · live'}
              </p>
            </div>
          </div>

          {/* Center: Live Waveform Visualizer & Play Controls */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-md justify-center">
            {/* Play / Pause Toggle: Amber button */}
            <button
              type="button"
              onClick={togglePlay}
              className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-[#0E0D0C] shadow-md transition-all ${
                isPlaying
                  ? 'bg-[#F4EFE8] hover:bg-[#FAF6F0]'
                  : 'bg-[#F2B544] hover:brightness-110 active:scale-95 shadow-[#F2B544]/20'
              }`}
              title={isPlaying ? 'Pause' : 'Play Live'}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#0E0D0C]" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 fill-current text-[#0E0D0C]" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5 text-[#0E0D0C]" />
              )}
            </button>

            {/* Compact Mini Spectrum Visualizer (Hidden on tiny screens) */}
            <div className="hidden sm:block flex-1 max-w-[140px]">
              <SpectrumVisualizer isPlaying={isPlaying} barCount={14} height={28} accentColor="#F2B544" />
            </div>

            {/* Live Sync Action */}
            {isPlaying && (
              <button
                type="button"
                onClick={syncToLive}
                className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-[#A39B91] hover:text-[#F2B544] px-2 py-1 rounded-full border border-[#2A2724] bg-[#0E0D0C] transition-colors"
                title="Catch up to real-time live edge"
              >
                <RotateCcw className="h-3 w-3 text-[#F2B544]" />
                <span>Sync</span>
              </button>
            )}
          </div>

          {/* Right: Volume & Expand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Volume Control */}
            <div className="hidden lg:flex items-center gap-2 bg-[#0E0D0C] px-3 py-1.5 rounded-full border border-[#2A2724]">
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
                className="h-1.5 w-16 accent-[#F2B544] bg-[#2A2724] rounded-lg cursor-pointer"
              />
            </div>

            {/* Fullscreen Modal Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#0E0D0C] transition-colors border border-transparent hover:border-[#2A2724]"
              title="Open Fullscreen Player"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Fullscreen Sheet Player View */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0E0D0C]/98 p-6 sm:p-10 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between max-w-lg mx-auto w-full">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1816] px-3 py-1 text-xs font-bold text-[#FF4A3D] border border-[#FF4A3D]/30">
              <span className="h-2 w-2 rounded-full bg-[#FF4A3D] animate-pulse" />
              LIVE BROADCAST
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="rounded-full bg-[#1A1816] p-2 text-[#A39B91] hover:text-[#F4EFE8] border border-[#2A2724] transition-colors"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>

          {/* Middle: Big Album Art & Details */}
          <div className="flex flex-col items-center text-center space-y-6 max-w-sm mx-auto my-auto w-full">
            <div className="relative">
              {currentTrack.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.channelName}
                  className="h-56 w-56 sm:h-64 sm:w-64 rounded-3xl object-cover shadow-2xl border border-[#2A2724]"
                />
              ) : (
                <div className="flex h-56 w-56 sm:h-64 sm:w-64 items-center justify-center rounded-3xl bg-[#1A1816] text-[#F2B544] font-bold text-5xl border border-[#2A2724] shadow-2xl">
                  <Radio className="h-20 w-20" />
                </div>
              )}
              {isPlaying && (
                <div className="absolute -bottom-2 -right-2 bg-[#0E0D0C] border border-[#2A2724] rounded-full p-2">
                  <div className="h-3 w-3 rounded-full bg-[#FF4A3D] animate-ping" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F4EFE8] leading-tight">
                {currentTrack.channelName}
              </h2>
              <p className="text-sm text-[#A39B91]">
                {currentTrack.hostName ? `with ${currentTrack.hostName}` : 'Live speech transmission'}
              </p>
            </div>

            {/* Spectrum Visualizer in Expanded Mode */}
            <div className="w-full bg-[#1A1816] p-4 rounded-2xl border border-[#2A2724]">
              <SpectrumVisualizer isPlaying={isPlaying} barCount={24} height={44} accentColor="#F2B544" />
            </div>

            {/* Name badge */}
            <div className="text-xs text-[#A39B91]">
              Listening as:{' '}
              {currentDisplayName ? (
                <strong className="text-[#F4EFE8]">{currentDisplayName}</strong>
              ) : (
                <button
                  type="button"
                  onClick={openGuestModal}
                  className="text-[#F2B544] hover:underline font-bold inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> Set your name
                </button>
              )}
            </div>
          </div>

          {/* Bottom Playback Controls */}
          <div className="flex flex-col items-center gap-6 max-w-sm mx-auto w-full pb-6">
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={syncToLive}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1816] text-[#A39B91] hover:text-[#F4EFE8] border border-[#2A2724] transition-colors"
                title="Live Sync"
              >
                <RotateCcw className="h-5 w-5 text-[#F2B544]" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F2B544] text-[#0E0D0C] shadow-2xl shadow-[#F2B544]/25 hover:brightness-110 active:scale-95 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-8 w-8 fill-current" />
                ) : (
                  <Play className="h-8 w-8 fill-current ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1816] text-[#A39B91] hover:text-[#F4EFE8] border border-[#2A2724] transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-mono text-[#A39B91]">Vol</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-2 w-full accent-[#F2B544] bg-[#2A2724] rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
