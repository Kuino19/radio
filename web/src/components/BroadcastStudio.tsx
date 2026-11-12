'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LiveChat } from '@/components/LiveChat'
import { ScheduleShowModal } from '@/components/ScheduleShowModal'
import { SocialShareModal } from '@/components/SocialShareModal'
import {
  Mic,
  MicOff,
  Radio,
  Share2,
  Check,
  Copy,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Square,
  Users,
  Clock,
  Sparkles,
  Smartphone,
  ChevronDown,
  ArrowLeft,
  BarChart3,
  ExternalLink,
} from 'lucide-react'
import type { Channel } from '@/types/database'

type StudioState = 'ready' | 'connecting' | 'on_air' | 'reconnecting' | 'ended'

interface BroadcastStudioProps {
  channel: Channel
}

export function BroadcastStudio({ channel }: BroadcastStudioProps) {
  const router = useRouter()
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
  const [showScheduleModal, setShowScheduleModal] = useState(false)
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

  // 1. Enumerate and request initial microphone access
  const initMicrophone = useCallback(async (deviceId?: string) => {
    setMicError(null)
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
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

      const currentTrack = stream.getAudioTracks()[0]
      const currentSettings = currentTrack?.getSettings()
      if (currentSettings?.deviceId) {
        setSelectedDeviceId(currentSettings.deviceId)
      } else if (audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId)
      }

      // Setup level meter via Web Audio API
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.5
      source.connect(analyser)
      analyserRef.current = analyser

      // Level meter render loop
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

      currentTrack.onended = () => {
        setMicError('Microphone was unplugged or disconnected.')
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string }
      console.warn('Microphone error:', error)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicError('Microphone permission was denied. Please allow microphone access in your browser.')
      } else {
        setMicError('Could not access microphone: ' + (error.message || 'Unknown error'))
      }
    }
  }, [])

  useEffect(() => {
    initMicrophone()

    const handleDeviceChange = () => {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioInputs = devices.filter((d) => d.kind === 'audioinput')
        setAudioDevices(audioInputs)
      })
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [initMicrophone])

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setIsChangingMic(false)
    initMicrophone(deviceId)
  }

  // Live timer tick
  useEffect(() => {
    if (studioState === 'on_air') {
      liveTimerRef.current = setInterval(() => {
        setLiveDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current)
    }

    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current)
    }
  }, [studioState])

  // Realtime Supabase listener count
  useEffect(() => {
    const channelSub = supabase
      .channel(`studio_channel_${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
          filter: `id=eq.${channel.id}`,
        },
        (payload) => {
          const updated = payload.new as Channel
          if (typeof updated.current_listeners === 'number') {
            setCurrentListeners(updated.current_listeners)
            setPeakListeners((prev) => Math.max(prev, updated.current_listeners || 0))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelSub)
    }
  }, [channel.id, supabase])

  // Active listeners & analytics polling fallback while live
  useEffect(() => {
    if (studioState !== 'on_air') return

    const fetchLiveStats = async () => {
      try {
        const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString()

        // 1. Fetch real active listener sessions
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

        // 2. Sync channel row
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
    const pollId = setInterval(fetchLiveStats, 4000)

    return () => clearInterval(pollId)
  }, [studioState, channel.id, supabase])

  // Track new followers during broadcast
  useEffect(() => {
    const followSub = supabase
      .channel(`studio_follows_${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `channel_id=eq.${channel.id}`,
        },
        () => {
          setNewFollowers((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(followSub)
    }
  }, [channel.id, supabase])

  // 2. START BROADCAST (GO LIVE)
  const handleGoLive = async () => {
    setMicError(null)
    if (!mediaStreamRef.current) {
      try {
        await initMicrophone(selectedDeviceId)
      } catch (err) {
        setMicError('Please allow microphone permissions to broadcast.')
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
      setMicError('Authentication expired. Please log in again.')
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_STREAM_URL || 'wss://radio.goanitech.com/ws'
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      setStatusMessage('Authenticating broadcast channel...')
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
      setMicError('Streaming server connection timed out. Please check your network and try again.')
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

    ws.onerror = (err) => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      console.warn('WS error:', err)
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
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else {
        mimeType = ''
      }
    }

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
  }

  // 4. Automatic reconnection within 30 seconds
  const attemptReconnect = () => {
    if (studioState === 'reconnecting') return
    setStudioState('reconnecting')
    setReconnectCountdown(30)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    reconnectIntervalRef.current = setInterval(() => {
      setReconnectCountdown((prev) => {
        if (prev <= 1) {
          if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current)
          handleEndShow()
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
      mediaRecorderRef.current.stop()
    }
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'end' }))
      }
      socketRef.current.close()
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
    router.refresh()
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/c/${channel.slug}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${channel.name} is Live on LISNR`,
          text: `Tune in live to ${channel.name} on LISNR!`,
          url,
        })
      } catch {
        // Fallback to clipboard
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const selectedDevice = audioDevices.find((d) => d.deviceId === selectedDeviceId)
  const currentMicName = selectedDevice?.label || 'Microphone: Headset (USB)'

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Breadcrumb & Navigation to Creator Dashboard */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#F4EFE8] hover:text-[#F2B544] transition-colors bg-[#1A1816] border border-[#2A2724] px-4 py-2 rounded-full shadow-sm hover:border-[#F2B544]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#F2B544]" />
          <span>← Back to Creator Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/analytics/${channel.slug}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1A1816] border border-[#2A2724] text-xs font-semibold text-[#A39B91] hover:text-[#F4EFE8] hover:border-[#F2B544] transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#F2B544]" />
            <span>Show Analytics</span>
          </Link>
          <Link
            href={`/c/${channel.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1A1816] border border-[#2A2724] text-xs font-semibold text-[#A39B91] hover:text-[#F4EFE8] hover:border-[#F2B544] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#F2B544]" />
            <span>Listener View</span>
          </Link>
        </div>
      </div>

      {/* 2-Column Console Layout (Matching PDF Page 2 on Mobile, Page 4 on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Broadcast Console Dial & Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-8 space-y-8 shadow-xl">
            {/* Header: Station & Status */}
            <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
              <div>
                <h1 className="font-display font-black text-2xl text-[#F4EFE8]">
                  {channel.name}
                </h1>
                <p className="text-xs text-[#A39B91]">Your channel</p>
              </div>

              {/* Status Badge & Share Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-1 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544] hover:text-[#F2B544] transition-all shadow-sm"
                  title="Share listener link"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#F2B544]" />
                  <span>Share</span>
                </button>

                {studioState === 'on_air' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-3.5 py-1 text-xs font-black tracking-wider text-[#FF4A3D] border border-[#FF4A3D]/40 shadow-sm animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#FF4A3D]" />
                    ON AIR
                  </span>
                )}
                {studioState === 'ready' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-3 py-1 text-xs font-medium text-[#A39B91] border border-[#2A2724]">
                    <span className="w-2 h-2 rounded-full bg-[#A39B91]" />
                    Ready
                  </span>
                )}
                {studioState === 'connecting' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-3 py-1 text-xs font-bold text-[#F2B544] border border-[#F2B544]/40 animate-pulse">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </span>
                )}
                {studioState === 'reconnecting' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] px-3 py-1 text-xs font-bold text-[#F2B544] border border-[#F2B544]/40 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Reconnecting ({reconnectCountdown}s)
                  </span>
                )}
                {studioState === 'ended' && (
                  <span className="inline-flex items-center rounded-full bg-[#0E0D0C] px-3 py-1 text-xs font-medium text-[#A39B91] border border-[#2A2724]">
                    Show Ended
                  </span>
                )}
              </div>
            </div>

            {/* Error Feedback Banner */}
            {micError && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#FF4A3D]/40 bg-[#FF4A3D]/10 p-3.5 text-xs text-[#FF4A3D]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{micError}</span>
                <button
                  type="button"
                  onClick={() => setMicError(null)}
                  className="text-[#FF4A3D] hover:underline font-semibold ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Show Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#A39B91]">Show title</label>
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

            {/* Direct Station Share Link Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0E0D0C] border border-[#2A2724]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-mono text-[#A39B91] uppercase tracking-wider shrink-0">
                  Station Link:
                </span>
                <span className="font-mono text-xs text-[#F2B544] truncate select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/c/${channel.slug}` : `lisnr.goanitech.com/c/${channel.slug}`}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2724] bg-[#1A1816] px-3.5 py-1.5 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544] transition-colors"
                  title="Copy station link"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#3DBE7A]" />
                      <span className="text-[#3DBE7A]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#A39B91]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544] px-4 py-1.5 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* THE HERO: Giant Circular Broadcast Dial (Matching PDF Page 2 & 4) */}
            <div className="flex flex-col items-center justify-center py-6">
              {studioState === 'on_air' || studioState === 'reconnecting' ? (
                // ON AIR Giant Pulsing Red Dial
                <div className="relative flex items-center justify-center">
                  {/* Concentric ambient glow rings */}
                  <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-[#FF4A3D]/20 animate-on-air-ring pointer-events-none" />
                  <div className="absolute w-56 h-56 sm:w-60 sm:h-60 rounded-full border border-[#FF4A3D]/40 pointer-events-none" />

                  {/* Main Red Dial */}
                  <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-[#FF4A3D] text-white flex flex-col items-center justify-center shadow-[0_0_50px_rgba(255,74,61,0.45)] select-none">
                    <span className="font-display font-black text-2xl tracking-wider uppercase drop-shadow">
                      ON AIR
                    </span>
                    <span className="font-mono font-bold text-lg tracking-widest mt-1 text-white/95">
                      {formatTime(liveDuration)}
                    </span>
                  </div>
                </div>
              ) : studioState === 'connecting' ? (
                // Connecting Spinner Dial
                <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-[#0E0D0C] border-2 border-[#F2B544] text-[#F2B544] flex flex-col items-center justify-center space-y-2 select-none shadow-lg">
                  <RotateCcw className="w-8 h-8 animate-spin" />
                  <span className="font-display font-bold text-sm tracking-wide">
                    CONNECTING...
                  </span>
                </div>
              ) : (
                // Ready to Go Live Dial (Strict Red for GO LIVE)
                <button
                  type="button"
                  onClick={handleGoLive}
                  className="w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-[#FF4A3D] text-white flex flex-col items-center justify-center shadow-[0_4px_30px_rgba(255,74,61,0.4)] hover:scale-105 active:scale-95 transition-transform group select-none"
                >
                  <Radio className="w-10 h-10 mb-2 group-hover:animate-pulse" />
                  <span className="font-display font-black text-2xl tracking-tight">
                    GO LIVE
                  </span>
                  <span className="text-[11px] text-white/80 font-medium mt-0.5">
                    Tap to broadcast
                  </span>
                </button>
              )}
            </div>

            {/* Desktop Stats Row Below Dial (PDF Page 4) */}
            <div className="grid grid-cols-3 gap-3 text-center pt-2">
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

            {/* Mic Level Meter (Segmented LED Green Bars - PDF Page 2 & 4) */}
            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#A39B91]">
                <span className="font-medium">Mic level</span>
                <span className="font-mono text-[11px]">{micLevel}%</span>
              </div>

              {/* Segmented LED Green Bars */}
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

            {/* Microphone Selector Card: "Microphone: Headset (USB) [Change]" */}
            <div className="rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 truncate">
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
                      className="text-[#F2B544] font-semibold hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Stay-Awake Tip Banner (PDF Page 2) */}
            <div className="rounded-2xl bg-[#F2B544]/10 border border-[#F2B544]/30 p-4 text-xs text-[#F2B544] flex items-start gap-3">
              <Smartphone className="w-5 h-5 shrink-0 mt-0.5 text-[#F2B544]" />
              <p className="leading-relaxed font-medium">
                Keep this page open and your screen on while you&apos;re live.
              </p>
            </div>

            {/* END SHOW Button (Red strictly for live actions) */}
            {(studioState === 'on_air' || studioState === 'reconnecting') && (
              <div>
                <button
                  type="button"
                  onClick={handleEndShow}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#FF4A3D] py-4 px-6 text-sm sm:text-base font-bold text-white hover:brightness-110 active:scale-95 transition-all shadow-lg"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>End show</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Listeners List & Live Chat (PDF Page 4) */}
        <div className="space-y-6">
          {/* Listeners Card (Real Audience) */}
          <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
              <h3 className="font-display font-bold text-base text-[#F4EFE8] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F2B544]" />
                <span>Listeners</span>
              </h3>
              <span className="font-mono text-xs font-bold text-[#F2B544]">
                {studioState === 'on_air' ? currentListeners : 0}
              </span>
            </div>

            {/* Listener State */}
            {activeListenerList.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeListenerList.map((listener) => (
                  <div
                    key={listener.id}
                    className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-[#0E0D0C] border border-[#2A2724]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#1A1816] border border-[#2A2724] flex items-center justify-center font-bold text-xs text-[#F2B544] shrink-0">
                        {listener.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#F4EFE8] font-medium truncate block max-w-[130px]">
                            {listener.displayName}
                          </span>
                          {listener.isGuest && (
                            <span className="text-[9px] text-[#F2B544] border border-[#F2B544]/40 bg-[#F2B544]/10 rounded-full px-1.5 py-0.2 shrink-0">
                              guest
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#A39B91]">Tuned in to live broadcast</span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[#3DBE7A] border border-[#3DBE7A]/30 bg-[#3DBE7A]/10 rounded-full px-2 py-0.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3DBE7A] animate-pulse" />
                      live
                    </span>
                  </div>
                ))}
                <p className="text-[11px] font-mono text-[#A39B91] pt-1">
                  {activeListenerList.length} {activeListenerList.length === 1 ? 'person is' : 'people are'} listening right now
                </p>
              </div>
            ) : studioState === 'ended' && peakListeners > 0 ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center mx-auto text-[#F2B544]">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#F4EFE8]">
                  Broadcast Summary
                </p>
                <p className="text-sm font-bold text-[#F2B544]">
                  {peakListeners} Peak {peakListeners === 1 ? 'Listener' : 'Listeners'}
                </p>
                <p className="text-[11px] text-[#A39B91]">
                  Audio recording is processed and archived.
                </p>
              </div>
            ) : studioState === 'on_air' && currentListeners > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-[#0E0D0C] border border-[#2A2724]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1A1816] border border-[#2A2724] flex items-center justify-center font-mono font-bold text-xs text-[#F2B544]">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[#F4EFE8] font-medium block">Audience Online</span>
                      <span className="text-[10px] text-[#A39B91]">Connected to live audio</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#3DBE7A] border border-[#3DBE7A]/30 bg-[#3DBE7A]/10 rounded-full px-2 py-0.5">
                    active
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#A39B91] pt-1">
                  {currentListeners} {currentListeners === 1 ? 'person is' : 'people are'} listening right now
                </p>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center mx-auto text-[#A39B91]">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#F4EFE8]">
                  No active listeners yet
                </p>
                <p className="text-[11px] text-[#A39B91] max-w-xs mx-auto">
                  {studioState === 'on_air'
                    ? 'Listeners will appear here as they connect to your live stream.'
                    : 'Go live and share your station link to start broadcasting.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544] px-4 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Station Link</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Interactive Chat */}
          <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 shadow-xl">
            <LiveChat
              channelId={channel.id}
              channelSlug={channel.slug}
              channelOwnerId={channel.owner_id}
              isOwner={true}
              currentUserDisplayName={channel.name}
            />
          </div>
        </div>
      </div>

      {/* Social Share Modal */}
      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={showTitle.trim() || `${channel.name} Live Broadcast`}
        url={typeof window !== 'undefined' ? `${window.location.origin}/c/${channel.slug}` : `https://lisnr.goanitech.com/c/${channel.slug}`}
        subtitle={`Live audio streaming on ${channel.name}`}
      />
    </div>
  )
}
