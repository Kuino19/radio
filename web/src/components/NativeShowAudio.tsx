'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Radio } from 'lucide-react'
import { getOrCreateAnonId, getSavedGuestName } from '@/lib/guest'

interface NativeShowAudioProps {
  channelId: string
  showId: string
  isLive: boolean
  streamUrl: string
  recordingUrl?: string | null
}

export function NativeShowAudio({ channelId, showId, isLive, streamUrl, recordingUrl }: NativeShowAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const source = isLive ? streamUrl : recordingUrl

  useEffect(() => {
    if (!isPlaying) return

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            showId,
            anonId: getOrCreateAnonId(),
            displayName: getSavedGuestName() || 'Guest Listener',
            deviceType: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'phone' : 'desktop',
            referrer: document.referrer || 'Direct',
          }),
        })
      } catch {
        // Playback continues if listener-count tracking is unavailable.
      }
    }

    void sendHeartbeat()
    const interval = window.setInterval(sendHeartbeat, 15000)
    return () => window.clearInterval(interval)
  }, [channelId, isPlaying, showId])

  if (!source) {
    return (
      <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 text-sm text-[#A39B91]">
        This show has ended. Its replay is not available yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#F4EFE8]">
        <Radio className="h-4 w-4 text-[#F2B544]" />
        {isLive ? 'Listen live' : 'Listen to replay'}
      </div>
      <audio
        ref={audioRef}
        controls
        playsInline
        preload="none"
        src={source}
        aria-label={isLive ? 'Live show audio player' : 'Show replay audio player'}
        className="block h-12 w-full"
        onPlay={() => setError(null)}
        onPlaying={() => {
          setError(null)
          setIsPlaying(true)
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false)
          const code = audioRef.current?.error?.code
          setError(code === 4
            ? 'The audio source is unavailable or not supported on this device.'
            : 'The audio stream could not be reached. Please try again shortly.')
        }}
      />
      {error && (
        <p role="status" className="flex items-start gap-2 text-xs text-[#FF6B60]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-[#A39B91]">
        Use your phone&apos;s audio controls to start or pause listening.
      </p>
    </div>
  )
}
