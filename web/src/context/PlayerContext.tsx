'use client'

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { getSavedGuestName, getOrCreateAnonId } from '@/lib/guest'
import { GuestNameModal } from '@/components/GuestNameModal'

export interface ChannelTrack {
  channelId?: string
  showId?: string | null
  episodeId?: string | null
  channelName: string
  channelSlug: string
  streamUrl: string
  coverUrl?: string | null
  hostName?: string | null
  isLive: boolean
  duration?: number
}

interface PlayerContextType {
  currentTrack: ChannelTrack | null
  isPlaying: boolean
  isLoading: boolean
  isMuted: boolean
  volume: number
  isExpanded: boolean
  bufferHealth: 'live' | 'buffering' | 'offline'
  audioQuality: string
  currentDisplayName: string | null
  playbackError: string | null
  playbackRate: number
  currentTime: number
  duration: number
  isHiFi: boolean
  playChannel: (track: ChannelTrack) => void
  togglePlay: () => void
  pause: () => void
  syncToLive: () => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  seek: (seconds: number) => void
  seekRelative: (seconds: number) => void
  toggleHiFi: () => void
  setIsExpanded: (exp: boolean) => void
  openGuestModal: () => void
  clearError: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrack, setCurrentTrack] = useState<ChannelTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.85)
  const [isExpanded, setIsExpanded] = useState(false)
  const [bufferHealth, setBufferHealth] = useState<'live' | 'buffering' | 'offline'>('offline')
  const [currentDisplayName, setCurrentDisplayName] = useState<string | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRateState] = useState<number>(1)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [isHiFi, setIsHiFi] = useState<boolean>(false)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const pendingTrackRef = useRef<ChannelTrack | null>(null)

  // Initialize saved guest name
  useEffect(() => {
    const saved = getSavedGuestName()
    if (saved) setCurrentDisplayName(saved)
  }, [])

  // 15-second listener tracking heartbeat loop
  useEffect(() => {
    if (!isPlaying || !currentTrack?.channelId) return

    const sendHeartbeat = async () => {
      try {
        const name = currentDisplayName || getSavedGuestName() || 'Guest Listener'
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: currentTrack.channelId,
            showId: currentTrack.showId || null,
            anonId: getOrCreateAnonId(),
            displayName: name,
            deviceType: isMobile ? 'phone' : 'desktop',
            referrer: typeof document !== 'undefined' ? document.referrer || 'Direct' : 'Direct',
          }),
        })
      } catch (err) {
        console.warn('Heartbeat error:', err)
      }
    }

    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 15000)

    return () => clearInterval(interval)
  }, [isPlaying, currentTrack?.channelId, currentTrack?.showId, currentDisplayName])

  // Setup Web MediaSession API for Background Play and OS Lock Screen controls
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.channelName,
        artist: currentTrack.hostName ? `${currentTrack.hostName} · LISNR` : 'LISNR Live Audio',
        album: currentTrack.isLive ? 'Live Speech Transmission' : 'Archived Broadcast Replay',
        artwork: currentTrack.coverUrl
          ? [
              { src: currentTrack.coverUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: currentTrack.coverUrl, sizes: '192x192', type: 'image/jpeg' },
              { src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [
              { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
              { src: '/logo.svg', sizes: '512x512', type: 'image/svg+xml' },
            ],
      })

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.warn)
          setIsPlaying(true)
        }
      })

      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause()
          setIsPlaying(false)
        }
      })

      navigator.mediaSession.setActionHandler('stop', () => {
        if (audioRef.current) {
          audioRef.current.pause()
          setIsPlaying(false)
        }
      })

      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (audioRef.current && !currentTrack.isLive) {
          audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 15)
        }
      })

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (audioRef.current && !currentTrack.isLive) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15)
        }
      })
    } catch (e) {
      console.warn('MediaSession error:', e)
    }
  }, [currentTrack, isPlaying])

  // Audio start helper
  const startAudio = useCallback((track: ChannelTrack) => {
    if (!audioRef.current) return

    setPlaybackError(null)
    setIsLoading(true)
    setBufferHealth('buffering')
    setCurrentTrack(track)

    // Append timestamp for live streaming mounts to break browser cache
    const cacheBusterUrl = track.isLive && track.streamUrl.startsWith('http')
      ? `${track.streamUrl}${track.streamUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
      : track.streamUrl

    audioRef.current.src = cacheBusterUrl
    audioRef.current.playbackRate = playbackRate
    audioRef.current.volume = isMuted ? 0 : volume

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true)
        setIsLoading(false)
        setBufferHealth('live')
        setPlaybackError(null)
      })
      .catch((err) => {
        console.warn('Playback error:', err.name, err.message)
        setIsPlaying(false)
        setIsLoading(false)
        if (err.name === 'NotAllowedError') {
          // Browser autoplay policy blocked unmuted playback without prior user interaction.
          // Keep buffer state ready and do not show an offline error.
          setBufferHealth('buffering')
          setPlaybackError(null)
          return
        }
        if (err.name === 'AbortError') {
          return
        }
        setBufferHealth('offline')
        setPlaybackError(
          track.isLive
            ? 'Broadcast mount is currently connecting. Tap play to retry.'
            : 'Could not play audio file.'
        )
      })
  }, [isMuted, volume, playbackRate])

  // Play channel request
  const playChannel = useCallback((track: ChannelTrack) => {
    // If guest name not yet loaded, auto-assign default without interrupting playback
    if (!currentDisplayName) {
      const saved = getSavedGuestName()
      if (saved) {
        setCurrentDisplayName(saved)
      } else {
        const fallback = `Guest-${Math.floor(1000 + Math.random() * 9000)}`
        setCurrentDisplayName(fallback)
      }
    }

    if (currentTrack?.channelSlug === track.channelSlug && isPlaying) {
      if (audioRef.current) audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    startAudio(track)
  }, [currentDisplayName, currentTrack?.channelSlug, isPlaying, startAudio])

  const togglePlay = useCallback(() => {
    if (!currentTrack) return

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
        if (currentTrack.isLive) {
          audioRef.current.src = ''
        }
      }
      setIsPlaying(false)
      setIsLoading(false)
      setBufferHealth('offline')
    } else {
      startAudio(currentTrack)
    }
  }, [currentTrack, isPlaying, startAudio])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      if (currentTrack?.isLive) {
        audioRef.current.src = ''
      }
    }
    setIsPlaying(false)
    setIsLoading(false)
    setBufferHealth('offline')
  }, [currentTrack?.isLive])

  // Jump to live edge
  const syncToLive = useCallback(() => {
    if (!currentTrack) return
    startAudio(currentTrack)
  }, [currentTrack, startAudio])

  const setVolume = useCallback((val: number) => {
    setVolumeState(val)
    if (audioRef.current) {
      audioRef.current.volume = val
    }
    if (val === 0) setIsMuted(true)
    else setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return
    if (isMuted) {
      audioRef.current.volume = volume || 0.8
      setIsMuted(false)
    } else {
      audioRef.current.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume])

  // Speed Control (0.75x, 1x, 1.25x, 1.5x, 2x)
  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }, [])

  // Seeking
  const seek = useCallback((seconds: number) => {
    if (audioRef.current && !currentTrack?.isLive) {
      audioRef.current.currentTime = seconds
      setCurrentTime(seconds)
    }
  }, [currentTrack?.isLive])

  const seekRelative = useCallback((seconds: number) => {
    if (audioRef.current && !currentTrack?.isLive) {
      const newTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds))
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [currentTrack?.isLive])

  // High-fidelity audio toggle
  const toggleHiFi = useCallback(() => {
    setIsHiFi((prev) => !prev)
  }, [])

  const handleGuestSuccess = (name: string) => {
    setCurrentDisplayName(name)
    setShowGuestModal(false)
    if (pendingTrackRef.current) {
      startAudio(pendingTrackRef.current)
      pendingTrackRef.current = null
    }
  }

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        isMuted,
        volume,
        isExpanded,
        bufferHealth,
        audioQuality: isHiFi ? '128 kbps Stereo Hi-Fi' : '64 kbps Voice Mono',
        currentDisplayName,
        playbackError,
        playbackRate,
        currentTime,
        duration,
        isHiFi,
        playChannel,
        togglePlay,
        pause,
        syncToLive,
        setVolume,
        toggleMute,
        setPlaybackRate,
        seek,
        seekRelative,
        toggleHiFi,
        setIsExpanded,
        openGuestModal: () => setShowGuestModal(true),
        clearError: () => setPlaybackError(null),
      }}
    >
      {/* Hidden Global Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        }}
        onDurationChange={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0)
          }
        }}
        onWaiting={() => {
          setIsLoading(true)
          setBufferHealth('buffering')
        }}
        onPlaying={() => {
          setIsLoading(false)
          setIsPlaying(true)
          setBufferHealth('live')
          setPlaybackError(null)
        }}
        onError={() => {
          setIsLoading(false)
          setIsPlaying(false)
          setBufferHealth('offline')
          setPlaybackError('Stream disconnected or audio file could not be loaded.')
        }}
      />

      {children}

      <GuestNameModal
        isOpen={showGuestModal}
        onClose={() => {
          setShowGuestModal(false)
          pendingTrackRef.current = null
        }}
        onSuccess={handleGuestSuccess}
      />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
