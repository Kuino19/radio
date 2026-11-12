require('dotenv').config()
const http = require('http')
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const { WebSocketServer } = require('ws')
const { createClient } = require('@supabase/supabase-js')

const PORT = parseInt(process.env.PORT, 10) || 3001
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
const ICECAST_HOST = process.env.ICECAST_HOST || '127.0.0.1'
const ICECAST_PORT = process.env.ICECAST_PORT || '8000'
const ICECAST_SOURCE_PASSWORD = process.env.ICECAST_SOURCE_PASSWORD || 'hackme'

// Ensure recordings folder exists
const RECORDINGS_DIR = path.join(__dirname, 'recordings')
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true })
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Initialize Express
const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

// Serve recordings statically
app.use('/recordings', express.static(RECORDINGS_DIR))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'lisnr-backend',
    version: '1.1.0',
    activeBroadcasts: activeBroadcasts.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong')
})

const server = http.createServer(app)
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 10 * 1024 * 1024,
})

// Map<string, BroadcastSession>
const activeBroadcasts = new Map()

// Helper: End a broadcast session cleanly and archive recording
async function endBroadcast(channelSlug, reason = 'manual') {
  const session = activeBroadcasts.get(channelSlug)
  if (!session) return

  console.log(`[STREAM] Ending broadcast for ${channelSlug} (Reason: ${reason})`)

  if (session.disconnectTimer) clearTimeout(session.disconnectTimer)
  if (session.noAudioTimer) clearInterval(session.noAudioTimer)

  // Kill ffmpeg process
  if (session.ffmpeg) {
    try {
      session.ffmpeg.stdin.end()
      session.ffmpeg.kill('SIGTERM')
    } catch (err) {
      console.warn(`[FFMPEG] Error closing process: ${err.message}`)
    }
    session.ffmpeg = null
  }

  // Notify socket
  if (session.ws && session.ws.readyState === 1) {
    try {
      session.ws.send(JSON.stringify({ type: 'live_ended', reason }))
      session.ws.close(1000, `Broadcast ended: ${reason}`)
    } catch {}
  }

  const durationSecs = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000))

  // Update Supabase DB: set show ended_at & channel is_live = false
  try {
    if (session.showId) {
      await supabase
        .from('shows')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', session.showId)
    }

    await supabase
      .from('channels')
      .update({ is_live: false, current_listeners: 0 })
      .eq('id', session.channelId)

    console.log(`[DB] Channel ${channelSlug} marked OFFLINE. Show ${session.showId} closed.`)

    // Archive recording if recorded file exists
    if (session.recordingFilePath && fs.existsSync(session.recordingFilePath)) {
      const stats = fs.statSync(session.recordingFilePath)
      if (stats.size > 10000) {
        // Upload to Supabase Storage recordings bucket
        const storagePath = `${session.channelSlug}/${session.showId}.mp3`
        const fileBuffer = fs.readFileSync(session.recordingFilePath)

        const { error: uploadErr } = await supabase.storage
          .from('recordings')
          .upload(storagePath, fileBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          })

        let audioUrl = `https://radio.goanitech.com/recordings/${path.basename(session.recordingFilePath)}`
        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('recordings')
            .getPublicUrl(storagePath)
          audioUrl = publicUrlData.publicUrl
        }

        // Insert into public.recordings table
        await supabase.from('recordings').insert({
          show_id: session.showId,
          channel_id: session.channelId,
          title: session.showTitle,
          audio_url: audioUrl,
          duration_seconds: durationSecs,
          file_size_bytes: stats.size,
        })

        console.log(`[RECORDING] Show archived successfully: ${audioUrl} (${stats.size} bytes)`)
      }
    }
  } catch (dbErr) {
    console.error(`[DB] Error updating offline/recording status for ${channelSlug}:`, dbErr.message)
  }

  activeBroadcasts.delete(channelSlug)
}

// Helper: Spawn ffmpeg with dual output (Icecast + Local MP3 Archive)
function spawnFfmpeg(channelSlug, showId) {
  const icecastUrl = `icecast://source:${encodeURIComponent(
    ICECAST_SOURCE_PASSWORD
  )}@${ICECAST_HOST}:${ICECAST_PORT}/${channelSlug}`

  const recordingFilePath = path.join(RECORDINGS_DIR, `${showId || channelSlug}-${Date.now()}.mp3`)

  console.log(`[FFMPEG] Spawning transcoder for /${channelSlug} (Icecast + Recording)`)

  const ffmpegArgs = [
    '-loglevel',
    'warning',
    '-f',
    'webm',
    '-i',
    'pipe:0',
    '-c:a',
    'libmp3lame',
    '-b:a',
    '64k',
    '-ac',
    '1',
    '-ar',
    '44100',
    '-content_type',
    'audio/mpeg',
    '-f',
    'mp3',
    icecastUrl,
    '-c:a',
    'copy',
    '-f',
    'mp3',
    recordingFilePath,
  ]

  const ffmpeg = spawn('ffmpeg', ffmpegArgs)

  ffmpeg.stderr.on('data', (data) => {
    console.warn(`[FFMPEG ${channelSlug}] ${data.toString().trim()}`)
  })

  ffmpeg.on('error', (err) => {
    console.error(`[FFMPEG ${channelSlug}] Process error:`, err.message)
  })

  ffmpeg.on('close', (code) => {
    console.log(`[FFMPEG ${channelSlug}] Process exited with code ${code}`)
  })

  ffmpeg.stdin.on('error', (err) => {
    console.warn(`[FFMPEG ${channelSlug}] stdin pipe error: ${err.message}`)
  })

  return { ffmpeg, recordingFilePath }
}

// WebSocket handler
wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  console.log(`[WS] Connection from ${clientIp}`)

  ws.isAlive = true
  ws.session = null

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', async (data, isBinary) => {
    // 1. Audio stream chunks
    if (isBinary) {
      if (!ws.session || !ws.session.ffmpeg || !ws.session.ffmpeg.stdin.writable) {
        return
      }
      ws.session.lastAudioTime = Date.now()
      try {
        ws.session.ffmpeg.stdin.write(data)
      } catch (err) {
        console.warn(`[STREAM] Error writing audio chunk: ${err.message}`)
      }
      return
    }

    // 2. Control Messages (JSON)
    try {
      const msg = JSON.parse(data.toString())

      // ACTION: START BROADCAST
      if (msg.action === 'start') {
        const { token, channelSlug, showTitle } = msg
        if (!token || !channelSlug) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing token or channelSlug' }))
          return ws.close(4001, 'Missing credentials')
        }

        // Verify Supabase Token
        const { data: userData, error: userError } = await supabase.auth.getUser(token)
        if (userError || !userData?.user) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired auth session' }))
          return ws.close(4001, 'Invalid token')
        }
        const userId = userData.user.id

        // Verify Channel Ownership & Check Suspended status
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .select('id, name, slug, owner_id, is_suspended')
          .eq('slug', channelSlug.toLowerCase())
          .single()

        if (channelError || !channel || channel.owner_id !== userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Forbidden: You do not own this channel' }))
          return ws.close(4003, 'Forbidden')
        }

        if (channel.is_suspended) {
          ws.send(JSON.stringify({ type: 'error', message: 'This channel has been suspended by an administrator.' }))
          return ws.close(4003, 'Channel suspended')
        }

        // Clean up any existing session
        if (activeBroadcasts.has(channel.slug)) {
          console.log(`[STREAM] Cleaning up existing session for ${channel.slug}`)
          await endBroadcast(channel.slug, 'replaced_by_new_session')
        }

        // Create new show row
        const title = (showTitle && showTitle.trim()) || 'Live Audio Broadcast'
        const { data: show } = await supabase
          .from('shows')
          .insert({
            channel_id: channel.id,
            title,
            started_at: new Date().toISOString(),
          })
          .select()
          .single()

        // Mark channel as live
        await supabase
          .from('channels')
          .update({ is_live: true })
          .eq('id', channel.id)

        // Spawn ffmpeg with dual output
        const { ffmpeg, recordingFilePath } = spawnFfmpeg(channel.slug, show?.id)

        const session = {
          channelId: channel.id,
          channelSlug: channel.slug,
          channelName: channel.name,
          userId,
          showId: show ? show.id : null,
          showTitle: title,
          startedAt: Date.now(),
          ffmpeg,
          recordingFilePath,
          ws,
          lastAudioTime: Date.now(),
          disconnectTimer: null,
          noAudioTimer: null,
        }

        // Silence watchdog
        session.noAudioTimer = setInterval(() => {
          if (Date.now() - session.lastAudioTime > 30000) {
            console.warn(`[WATCHDOG] No audio for 30s on ${session.channelSlug}. Ending show.`)
            endBroadcast(session.channelSlug, 'no_audio_timeout')
          }
        }, 10000)

        activeBroadcasts.set(channel.slug, session)
        ws.session = session

        console.log(`[STREAM] Broadcast started for ${channel.name} (/c/${channel.slug}) - Show: ${show?.id}`)

        ws.send(
          JSON.stringify({
            type: 'live_started',
            showId: show?.id,
            channelSlug: channel.slug,
            channelName: channel.name,
            streamUrl: `https://radio.goanitech.com/${channel.slug}`,
          })
        )
      }

      // ACTION: RECONNECT
      else if (msg.action === 'reconnect') {
        const { token, channelSlug } = msg
        const existingSession = activeBroadcasts.get(channelSlug?.toLowerCase())

        if (!existingSession) {
          ws.send(JSON.stringify({ type: 'reconnect_failed', message: 'No active session to reconnect' }))
          return ws.close(4004, 'No session')
        }

        const { data: userData, error: userError } = await supabase.auth.getUser(token)
        if (userError || !userData?.user || userData.user.id !== existingSession.userId) {
          ws.send(JSON.stringify({ type: 'reconnect_failed', message: 'Auth mismatch' }))
          return ws.close(4003, 'Forbidden')
        }

        if (existingSession.disconnectTimer) {
          clearTimeout(existingSession.disconnectTimer)
          existingSession.disconnectTimer = null
          console.log(`[STREAM] Broadcaster reconnected for ${channelSlug}!`)
        }

        if (existingSession.ffmpeg) {
          try {
            existingSession.ffmpeg.kill('SIGTERM')
          } catch {}
        }

        const { ffmpeg, recordingFilePath } = spawnFfmpeg(channelSlug, existingSession.showId)
        existingSession.ffmpeg = ffmpeg
        if (!existingSession.recordingFilePath) {
          existingSession.recordingFilePath = recordingFilePath
        }
        existingSession.ws = ws
        existingSession.lastAudioTime = Date.now()
        ws.session = existingSession

        ws.send(
          JSON.stringify({
            type: 'reconnected',
            showId: existingSession.showId,
            channelSlug,
          })
        )
      }

      // ACTION: STOP BROADCAST
      else if (msg.action === 'stop') {
        if (ws.session) {
          await endBroadcast(ws.session.channelSlug, 'host_ended')
        }
      }

      // ACTION: PING
      else if (msg.action === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      }
    } catch (err) {
      console.warn('[WS] Error processing message:', err.message)
    }
  })

  ws.on('close', (code, reason) => {
    const session = ws.session
    if (session && activeBroadcasts.has(session.channelSlug)) {
      console.log(`[STREAM] Disconnected from ${session.channelSlug}. Starting 30s grace period...`)
      session.disconnectTimer = setTimeout(() => {
        console.log(`[STREAM] Grace period expired for ${session.channelSlug}. Finalizing show.`)
        endBroadcast(session.channelSlug, 'disconnect_timeout')
      }, 30000)
    }
  })

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err.message)
  })
})

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate()
    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => {
  clearInterval(pingInterval)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LISNR Audio Backend listening on http://0.0.0.0:${PORT}`)
})
