'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LiveChat } from '@/components/LiveChat'
import { SocialShareModal } from '@/components/SocialShareModal'
import {
  Mic,
  MicOff,
  Radio,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Square,
  Users,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import type { Channel } from '@/types/database'

type StudioState = 'ready' | 'connecting' | 'on_air' | 'reconnecting' | 'ended'

interface StudioCockpitProps {
  channel: Channel
  onReturnToDashboard?: () => void
}

export function StudioCockpit({ channel, onReturnToDashboard }: StudioCockpitProps) {
  const supabase = createClient()

  // Studio UI states
  const [studioState, setStudioState] = useState<StudioState>('ready')
  const [showTitle, setShowTitle] = useState('')
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isChangingMic, setIsChangingMic] = useState(false)
  const [micLevel, setMicLevel] = useState<number>(0)
  const [micError, setMicError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [liveDuration, setLiveDuration] = useState<number>(0)
  const [reconnectCountdown, setReconnectCountdown] = useState<number>(30)
  const [copiedLink, setCopiedLink] = useState(false)
  const [currentListeners, setCurrentListeners] = useState(channel.current_listeners || 0)
  const [peakListeners, setPeakListeners] = useState(channel.current_listeners || 0)
  const [activeListenerList, setActiveListenerList] = useState<{ id: string; displayName: string; isGuest: boolean }[]>([])
  const [newFollowers, setNewFollowers] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)

  // Hardware and Network references
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Initialize microphone with safe error handling
  const initMicrophone = useCallback(async (deviceId?: string) => {
    setMicError(null)
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setMicError('Your browser does not support audio recording. Please use Chrome, Edge, or Safari.')
        return
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      mediaStreamRef.current = stream

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter((d) => d.kind === 'audioinput')
      setAudioDevices(audioInputs)

      const tracks = stream.getAudioTracks()
      if (tracks.length > 0) {
        const currentTrack = tracks[0]
        const currentSettings = currentTrack.getSettings()
        if (currentSettings?.deviceId) {
          setSelectedDeviceId(currentSettings.deviceId)
        } else if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId)
        }

        currentTrack.onended = () => {
          setMicError('Microphone disconnected.')
        }
      }

      // Setup level meter via Web Audio API safely
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          audioContextRef.current = ctx

          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {})
          }

          const source = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 128
          analyser.smoothingTimeConstant = 0.6
          source.connect(analyser)
          analyserRef.current = analyser

          const buffer = new Uint8Array(analyser.frequencyBinCount)
          const updateLevel = () => {
            if (!analyserRef.current) return
            analyserRef.current.getByteFrequencyData(buffer)

            let sum = 0
            for (let i = 0; i < buffer.length; i++) {
              sum += buffer[i]
            }
            const avg = sum / buffer.length
            const normalized = Math.min(100, Math.round((avg / 128) * 100))
            setMicLevel(normalized)

            animFrameRef.current = requestAnimationFrame(updateLevel)
          }
          updateLevel()
        }
      } catch (audioErr) {
        console.warn('Web Audio meter initialization notice:', audioErr)
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string }
      console.warn('Microphone permission info:', error)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicError('Microphone access was not permitted. Click "GO LIVE" when you are ready to allow microphone.')
      } else {
        setMicError('Audio device info: ' + (error.message || 'Ready'))
      }
    }
  }, [])

  useEffect(() => {
    initMicrophone()

    const handleDeviceChange = () => {
      navigator.mediaDevices?.enumerateDevices().then((devices) => {
        const audioInputs = devices.filter((d) => d.kind === 'audioinput')
        setAudioDevices(audioInputs)
      })
    }

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      cleanupBroadcast()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setIsChangingMic(false)
    initMicrophone(deviceId)
  }

  // Live timer
  useEffect(() => {
    if (studioState === 'on_air') {
      liveTimerRef.current = setInterval(() => {
        setLiveDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current)
      if (studioState === 'ready') setLiveDuration(0)
    }

    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current)
    }
  }, [studioState])

  // Poll audience stats
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const ninetySecondsAgo = new Date(Date.now() - 90000).toISOString()
        const { data: sessions } = await supabase
          .from('listen_sessions')
          .select('id, display_name, is_guest')
          .eq('channel_id', channel.id)
          .gt('last_seen_at', ninetySecondsAgo)
          .is('left_at', null)
          .order('last_seen_at', { ascending: false })
          .limit(25)

        if (sessions) {
          const list = sessions.map((s) => ({
            id: s.id,
            displayName: s.display_name || 'Anonymous Listener',
            isGuest: !!s.is_guest,
          }))
          setActiveListenerList(list)
          if (list.length > 0) {
            setCurrentListeners(list.length)
            setPeakListeners((prev) => Math.max(prev, list.length))
          }
        }

        const { data: ch } = await supabase
          .from('channels')
          .select('current_listeners')
          .eq('id', channel.id)
          .single()

        if (ch && typeof ch.current_listeners === 'number') {
          setCurrentListeners((prev) => Math.max(prev, ch.current_listeners))
          setPeakListeners((prev) => Math.max(prev, ch.current_listeners))
        }
      } catch (err) {
        console.warn('Analytics poll error:', err)
      }
    }

    fetchLiveStats()
    const pollId = setInterval(fetchLiveStats, 5000)

    return () => clearInterval(pollId)
  }, [channel.id, supabase])

  // 2. START BROADCAST (GO LIVE)
  const handleGoLive = async () => {
    setMicError(null)

    if (!mediaStreamRef.current) {
      try {
        await initMicrophone(selectedDeviceId)
      } catch {
        setMicError('Please allow microphone permissions in your browser to broadcast.')
        return
      }
    }

    if (!mediaStreamRef.current) {
      setMicError('Please enable microphone access before going live.')
      return
    }

    setStudioState('connecting')
    setStatusMessage('Connecting to streaming server...')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setStudioState('ready')
      setMicError('Session expired. Please log in again.')
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_STREAM_URL || 'wss://radio.goanitech.com/ws'
    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
      socketRef.current = ws
    } catch (wsErr) {
      setStudioState('ready')
      setMicError('Could not reach streaming endpoint. Please verify connection.')
      return
    }

    ws.onopen = () => {
      setStatusMessage('Authenticating channel...')
      ws.send(
        JSON.stringify({
          action: 'start',
          token: session.access_token,
          channelSlug: channel.slug,
          showTitle: showTitle.trim() || `${channel.name} Live`,
        })
      )
    }

    let connectTimeout: NodeJS.Timeout | null = setTimeout(() => {
      setMicError('Streaming server connection timed out. Please try again.')
      cleanupBroadcast()
      setStudioState('ready')
    }, 15000)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const isLive =
          msg.type === 'live_started' ||
          msg.type === 'ready' ||
          msg.status === 'ready' ||
          msg.status === 'live' ||
          msg.status === 'live_started'

        const isError =
          msg.type === 'error' ||
          msg.type === 'forbidden' ||
          msg.type === 'reconnect_failed' ||
          msg.status === 'error'

        if (isLive) {
          if (connectTimeout) {
            clearTimeout(connectTimeout)
            connectTimeout = null
          }
          setStudioState('on_air')
          setStatusMessage('')
          startMediaRecorder(ws)
        } else if (isError) {
          if (connectTimeout) {
            clearTimeout(connectTimeout)
            connectTimeout = null
          }
          setMicError(msg.message || 'Broadcast initialization failed.')
          cleanupBroadcast()
          setStudioState('ready')
        }
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    ws.onerror = () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      if (studioState === 'on_air') {
        attemptReconnect()
      } else {
        setMicError('Could not establish connection to streaming server.')
        setStudioState('ready')
      }
    }

    ws.onclose = () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      if (studioState === 'on_air') {
        attemptReconnect()
      }
    }
  }

  // 3. MediaRecorder chunk pump
  const startMediaRecorder = (ws: WebSocket) => {
    if (!mediaStreamRef.current) return

    let mimeType = 'audio/webm;codecs=opus'
    if (typeof MediaRecorder !== 'undefined') {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else {
          mimeType = ''
        }
      }
    }

    try {
      const recorder = new MediaRecorder(
        mediaStreamRef.current,
        mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined
      )
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          event.data.arrayBuffer().then((buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(buffer)
            }
          })
        }
      }

      recorder.start(250)
    } catch (e) {
      console.error('MediaRecorder start error:', e)
      setMicError('Failed to capture audio stream from microphone.')
    }
  }

  // 4. Automatic reconnection within 30 seconds
  const attemptReconnect = () => {
    if (studioState === 'reconnecting') return
    setStudioState('reconnecting')
    setReconnectCountdown(30)

    reconnectIntervalRef.current = setInterval(() => {
      setReconnectCountdown((prev) => {
        if (prev <= 1) {
          if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current)
          setStudioState('ended')
          setMicError('Broadcast connection lost. Recording finalized.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const tryConnect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const wsUrl = process.env.NEXT_PUBLIC_WS_STREAM_URL || 'wss://radio.goanitech.com/ws'
      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            action: 'reconnect',
            token: session.access_token,
            channelSlug: channel.slug,
          })
        )
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          const isResumed =
            msg.type === 'reconnected' ||
            msg.type === 'live_started' ||
            msg.status === 'resumed' ||
            msg.status === 'ready' ||
            msg.status === 'live'

          if (isResumed) {
            if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current)
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
            setStudioState('on_air')
            startMediaRecorder(ws)
          }
        } catch (e) {
          console.error('WS reconnect error:', e)
        }
      }
    }

    tryConnect()
  }

  // 5. Clean up broadcast
  const cleanupBroadcast = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ action: 'end' }))
        }
        socketRef.current.close()
      } catch {}
      socketRef.current = null
    }
    if (liveTimerRef.current) clearInterval(liveTimerRef.current)
    if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current)
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
  }

  // 6. END SHOW
  const handleEndShow = () => {
    cleanupBroadcast()
    setStudioState('ended')
  }

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${channel.slug}` : `https://lisnr.goanitech.com/c/${channel.slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {}
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const selectedDevice = audioDevices.find((d) => d.deviceId === selectedDeviceId)
  const currentMicName = selectedDevice?.label || (audioDevices.length > 0 ? audioDevices[0].label : 'Default Microphone')

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Cockpit Status Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#2A2724] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-xl sm:text-2xl text-[#F4EFE8]">
              {channel.name}
            </span>
            <span className="text-xs font-mono text-[#A39B91]">/c/{channel.slug}</span>
          </div>
          <p className="text-xs text-[#A39B91] mt-0.5">Live Speech Broadcasting Cockpit</p>
        </div>

        <div className="flex items-center gap-3">
          {studioState === 'on_air' ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FF4A3D]/10 border border-[#FF4A3D]/40 px-4 py-1.5 text-xs font-black text-[#FF4A3D] animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4A3D]" />
              BROADCASTING LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1A1816] border border-[#2A2724] px-3.5 py-1.5 text-xs font-semibold text-[#A39B91]">
              <span className="w-2 h-2 rounded-full bg-[#A39B91]" />
              Currently Off-Air
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2724] bg-[#1A1816] px-3.5 py-1.5 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544] hover:text-[#F2B544] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-[#F2B544]" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Error Feedback Banner */}
      {micError && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#FF4A3D]/40 bg-[#FF4A3D]/10 p-4 text-xs text-[#FF4A3D]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1 font-medium">{micError}</span>
          <button
            type="button"
            onClick={() => setMicError(null)}
            className="text-[#FF4A3D] hover:underline font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Show Ended Modal / Card */}
      {studioState === 'ended' && (
        <div className="rounded-3xl border border-[#3DBE7A]/40 bg-[#3DBE7A]/10 p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-[#3DBE7A]/20 border border-[#3DBE7A]/40 flex items-center justify-center mx-auto text-[#3DBE7A]">
            <Radio className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-xl text-[#F4EFE8]">Broadcast Finished</h3>
            <p className="text-xs text-[#A39B91] max-w-md mx-auto">
              Your audio transmission ended cleanly and has been automatically finalized and archived to Cloudflare R2 audio storage.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStudioState('ready')
                setLiveDuration(0)
              }}
              className="rounded-full bg-[#FF4A3D] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              Start New Event
            </button>
            {onReturnToDashboard && (
              <button
                type="button"
                onClick={onReturnToDashboard}
                className="rounded-full bg-[#1A1816] border border-[#2A2724] px-6 py-2.5 text-xs font-bold text-[#F4EFE8] hover:bg-[#2A2724] transition-colors"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Console Layout (Matching Mixlr) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Live Control Center */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-[#2A2724] bg-[#141210] p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Show Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                Show Title
              </label>
              {studioState === 'ready' ? (
                <input
                  type="text"
                  value={showTitle}
                  onChange={(e) => setShowTitle(e.target.value)}
                  placeholder="e.g. Sunday Morning Worship & Message"
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-3 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
                />
              ) : (
                <p className="font-display font-bold text-lg text-[#F4EFE8]">
                  {showTitle.trim() || `${channel.name} Live Broadcast`}
                </p>
              )}
            </div>

            {/* Station Share Link Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0E0D0C] border border-[#2A2724]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-mono text-[#A39B91] uppercase tracking-wider shrink-0">
                  Station Link:
                </span>
                <span className="font-mono text-xs text-[#F2B544] truncate select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/c/${channel.slug}` : `lisnr.goanitech.com/c/${channel.slug}`}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#2A2724] bg-[#1A1816] px-3.5 py-1.5 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544] transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#3DBE7A]" /> : <Copy className="w-3.5 h-3.5 text-[#F2B544]" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            {/* THE HERO: Big GO LIVE Dial / ON AIR Status */}
            <div className="flex flex-col items-center justify-center py-6">
              {studioState === 'on_air' || studioState === 'reconnecting' ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-60 h-60 sm:w-64 sm:h-64 rounded-full border border-[#FF4A3D]/20 animate-on-air-ring pointer-events-none" />
                  <div className="absolute w-52 h-52 sm:w-56 sm:h-56 rounded-full border border-[#FF4A3D]/40 pointer-events-none" />

                  <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-[#FF4A3D] text-white flex flex-col items-center justify-center shadow-[0_0_50px_rgba(255,74,61,0.45)] select-none">
                    <span className="font-display font-black text-2xl tracking-wider uppercase drop-shadow">
                      ON AIR
                    </span>
                    <span className="font-mono font-bold text-lg tracking-widest mt-1 text-white/95">
                      {formatTime(liveDuration)}
                    </span>
                  </div>
                </div>
              ) : studioState === 'connecting' ? (
                <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-[#0E0D0C] border-2 border-[#F2B544] text-[#F2B544] flex flex-col items-center justify-center space-y-2 select-none shadow-lg">
                  <RotateCcw className="w-8 h-8 animate-spin" />
                  <span className="font-display font-bold text-sm tracking-wide">
                    CONNECTING...
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoLive}
                  className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-[#FF4A3D] text-white flex flex-col items-center justify-center shadow-[0_4px_30px_rgba(255,74,61,0.4)] hover:scale-105 active:scale-95 transition-transform group select-none cursor-pointer"
                >
                  <Radio className="w-9 h-9 mb-1.5 group-hover:animate-pulse" />
                  <span className="font-display font-black text-2xl tracking-tight">
                    GO LIVE
                  </span>
                  <span className="text-[11px] text-white/80 font-medium mt-0.5">
                    Tap to broadcast
                  </span>
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-3 sm:p-4">
                <span className="text-[11px] text-[#A39B91] block">Listening now</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#F2B544] mt-0.5 block">
                  {studioState === 'on_air' ? currentListeners : 0}
                </span>
              </div>

              <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-3 sm:p-4">
                <span className="text-[11px] text-[#A39B91] block">Peak so far</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#F4EFE8] mt-0.5 block">
                  {peakListeners}
                </span>
              </div>

              <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-3 sm:p-4">
                <span className="text-[11px] text-[#A39B91] block">New followers</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#F4EFE8] mt-0.5 block">
                  {newFollowers}
                </span>
              </div>
            </div>

            {/* Mic Level Meter (Segmented LED Green Bars) */}
            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#A39B91]">
                <span className="font-medium">Microphone Level</span>
                <span className="font-mono text-[11px]">{micLevel}%</span>
              </div>

              <div className="flex items-center gap-1 h-3 w-full">
                {Array.from({ length: 24 }).map((_, i) => {
                  const threshold = (i / 24) * 100
                  const isActive = micLevel >= threshold
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-full rounded-sm transition-colors duration-75 ${
                        isActive
                          ? i > 20
                            ? 'bg-[#FF4A3D]'
                            : i > 16
                            ? 'bg-[#F2B544]'
                            : 'bg-[#3DBE7A]'
                          : 'bg-[#1A1816]'
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Audio Device Selector */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Mic className="w-4 h-4 text-[#F2B544] shrink-0" />
                <span className="text-[#F4EFE8] truncate font-medium">
                  {currentMicName}
                </span>
              </div>

              {audioDevices.length > 0 && studioState === 'ready' && (
                <div>
                  {isChangingMic ? (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleDeviceSelect(e.target.value)}
                      onBlur={() => setIsChangingMic(false)}
                      className="rounded-lg bg-[#1A1816] border border-[#2A2724] px-2 py-1 text-xs text-[#F4EFE8] focus:outline-none"
                    >
                      {audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsChangingMic(true)}
                      className="text-[#F2B544] font-semibold hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* END SHOW Button */}
            {(studioState === 'on_air' || studioState === 'reconnecting') && (
              <button
                type="button"
                onClick={handleEndShow}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#FF4A3D] py-4 px-6 text-sm sm:text-base font-bold text-white hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>End show & finalize recording</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Listeners & Real-Time Live Chat */}
        <div className="space-y-6">
          {/* Active Listeners Card */}
          <div className="rounded-3xl border border-[#2A2724] bg-[#141210] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
              <h3 className="font-display font-bold text-base text-[#F4EFE8] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F2B544]" />
                <span>Listeners</span>
              </h3>
              <span className="font-mono text-xs font-bold text-[#F2B544]">
                {studioState === 'on_air' ? currentListeners : 0}
              </span>
            </div>

            {activeListenerList.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeListenerList.map((listener) => (
                  <div
                    key={listener.id}
                    className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-[#0E0D0C] border border-[#2A2724]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#1A1816] border border-[#2A2724] flex items-center justify-center font-bold text-xs text-[#F2B544] shrink-0">
                        {listener.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-[#F4EFE8] font-medium truncate max-w-[130px]">
                        {listener.displayName}
                      </span>
                    </div>
                    {listener.isGuest && (
                      <span className="text-[9px] text-[#F2B544] border border-[#F2B544]/40 bg-[#F2B544]/10 rounded-full px-2 py-0.5">
                        guest
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#A39B91] text-center py-4">
                {studioState === 'on_air' ? 'Waiting for listeners to tune in...' : 'Go live and share your station link to start broadcasting.'}
              </p>
            )}
          </div>

          {/* Realtime Live Chat */}
          <div className="rounded-3xl border border-[#2A2724] bg-[#141210] p-4 shadow-xl">
            <LiveChat
              channelId={channel.id}
              channelSlug={channel.slug}
              channelOwnerId={channel.owner_id}
              currentUserId={channel.owner_id}
              currentUserDisplayName={channel.name}
              isOwner={true}
            />
          </div>
        </div>
      </div>

      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={channel.name}
        url={typeof window !== 'undefined' ? `${window.location.origin}/c/${channel.slug}` : `https://lisnr.goanitech.com/c/${channel.slug}`}
      />
    </div>
  )
}
