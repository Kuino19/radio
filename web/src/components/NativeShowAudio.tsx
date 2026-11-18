'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Pause, Play, Radio, Volume2 } from 'lucide-react'
import { getOrCreateAnonId, getSavedGuestName } from '@/lib/guest'

interface NativeShowAudioProps {
  channelId: string
  showId: string
  isLive: boolean
  streamUrl: string
  recordingUrl?: string | null
  displayName?: string | null
  userId?: string | null
  onActiveListeners?: (count: number) => void
}

export function NativeShowAudio({ channelId, showId, isLive, streamUrl, recordingUrl, displayName, userId, onActiveListeners }: NativeShowAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attendanceRegistered, setAttendanceRegistered] = useState(false)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)
  const source = isLive ? streamUrl : recordingUrl

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await audio.play()
    } catch {
      setIsLoading(false)
      setError('Could not start audio. Tap play to try again.')
    }
  }

  useEffect(() => {
    if (!isPlaying || !displayName) return

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            showId,
            anonId: getOrCreateAnonId(),
            displayName: displayName || getSavedGuestName() || 'Guest Listener',
            userId: userId || null,
            deviceType: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'phone' : 'desktop',
            referrer: document.referrer || 'Direct',
          }),
        })
        const result = await response.json()
        if (!response.ok || result.error) {
          throw new Error(result.error || 'Attendance could not be registered.')
        }
        setAttendanceRegistered(true)
        setAttendanceError(null)
        if (typeof result.activeListeners === 'number') onActiveListeners?.(result.activeListeners)
      } catch {
        setAttendanceError('Listening, but attendance could not be synced yet. Retrying…')
      }
    }

    void sendHeartbeat()
    const interval = window.setInterval(sendHeartbeat, 15000)
    return () => window.clearInterval(interval)
  }, [channelId, displayName, isPlaying, onActiveListeners, showId, userId])

  if (!source) {
    return (
      <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 text-sm text-[#A39B91]">
        This show has ended. Its replay is not available yet.
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[#3A3020] bg-[radial-gradient(ellipse_at_top,_rgba(242,181,68,0.14),_transparent_58%),linear-gradient(145deg,#1D1A16,#100F0D_70%)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F4EFE8]">
          <Radio className="h-4 w-4 text-[#F2B544]" />
          {isLive ? 'Listen live' : 'Listen to replay'}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isLive ? 'border-[#FF4A3D]/30 bg-[#FF4A3D]/10 text-[#FF756C]' : 'border-[#3A3020] bg-[#0E0D0C]/60 text-[#A39B91]'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'animate-pulse bg-[#FF4A3D]' : 'bg-[#F2B544]'}`} />
          {isLive ? 'On air' : 'Replay'}
        </span>
      </div>

      <div className="flex flex-col items-center py-7 text-center sm:py-9">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={isLoading ? 'Cancel audio playback' : isPlaying ? 'Pause audio' : 'Play audio'}
          className="group relative flex h-24 w-24 items-center justify-center rounded-full bg-[#F2B544] text-[#17120A] shadow-[0_0_0_10px_rgba(242,181,68,0.08),0_12px_38px_rgba(242,181,68,0.24)] transition duration-200 hover:scale-105 hover:bg-[#FFD06A] active:scale-95 sm:h-28 sm:w-28"
        >
          {isPlaying && <span className="absolute inset-[-9px] animate-on-air-ring rounded-full border border-[#F2B544]/45" />}
          {isLoading ? <Loader2 className="h-10 w-10 animate-spin sm:h-12 sm:w-12" /> : isPlaying ? <Pause className="h-10 w-10 fill-current sm:h-12 sm:w-12" /> : <Play className="ml-1 h-10 w-10 fill-current sm:h-12 sm:w-12" />}
        </button>
        <p className="mt-5 text-base font-bold text-[#F4EFE8]">
          {isLoading ? 'Connecting to audio…' : isPlaying ? isLive ? 'You’re listening live' : 'You’re listening to the replay' : 'Tap to listen'}
        </p>
        <p className="mt-1 text-xs text-[#A39B91]">Use your phone’s volume buttons to adjust sound</p>
        <div className="mt-4 flex h-7 items-center gap-1" aria-hidden="true">
          {Array.from({ length: 19 }, (_, index) => (
            <span key={index} className={`w-1 rounded-full bg-[#F2B544] transition-opacity ${isPlaying ? 'animate-radio-bar opacity-80' : 'opacity-30'}`} style={{ height: `${8 + ((index * 7) % 17)}px`, animationDelay: `${(index % 7) * 90}ms` }} />
          ))}
        </div>
      </div>

      <audio
        ref={audioRef}
        playsInline
        preload="none"
        src={source}
        aria-label={isLive ? 'Live show audio player' : 'Show replay audio player'}
        className="sr-only"
        onPlay={() => setError(null)}
        onPlaying={() => {
          setError(null)
          setIsLoading(false)
          setIsPlaying(true)
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPause={() => { setIsPlaying(false); setIsLoading(false) }}
        onEnded={() => { setIsPlaying(false); setIsLoading(false) }}
        onError={() => {
          setIsPlaying(false)
          setIsLoading(false)
          const code = audioRef.current?.error?.code
          setError(code === 4
            ? 'The audio source is unavailable or not supported on this device.'
            : 'The audio stream could not be reached. Please try again shortly.')
        }}
      />
      {error && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-[#FF4A3D]/20 bg-[#FF4A3D]/[0.06] p-3 text-xs text-[#FF8A80]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      <p className="flex items-center justify-center gap-1.5 border-t border-white/[0.06] pt-3 text-center text-[11px] leading-relaxed text-[#A39B91]">
        {attendanceRegistered && <Volume2 className="h-3.5 w-3.5 text-[#3DBE7A]" />}
        {attendanceRegistered && displayName
          ? `Attendance registered as ${displayName}.`
          : attendanceError || 'Tap the large button to start or pause listening.'}
      </p>
    </div>
  )
}
