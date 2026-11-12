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

// Ensure recordings folder exists on startup
const RECORDINGS_DIR = path.join(__dirname, 'recordings')
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true })
  console.log(`[INIT] Created recordings directory at: ${RECORDINGS_DIR}`)
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
    version: '1.2.0',
    activeBroadcasts: activeBroadcasts.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong')
})

// Heartbeat endpoint (admin rights via SUPABASE_SERVICE_ROLE_KEY to update channels & sessions)
app.post('/api/heartbeat', async (req, res) => {
  try {
    const { channelId, showId, anonId, userId, displayName, deviceType, referrer } = req.body
    if (!channelId || !displayName) {
      return res.status(400).json({ error: 'Missing channelId or displayName' })
    }

    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString()
    const nowIso = new Date().toISOString()

    // 1. Upsert listen session
    let existing = null
    if (userId) {
      const { data } = await supabase
        .from('listen_sessions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .gt('last_seen_at', ninetySecondsAgo)
        .is('left_at', null)
        .maybeSingle()
      existing = data
    } else if (anonId) {
      const { data } = await supabase
        .from('listen_sessions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('anon_id', anonId)
        .gt('last_seen_at', ninetySecondsAgo)
        .is('left_at', null)
        .maybeSingle()
      existing = data
    }

    if (existing) {
      await supabase
        .from('listen_sessions')
        .update({ last_seen_at: nowIso, display_name: displayName })
        .eq('id', existing.id)
    } else {
      await supabase.from('listen_sessions').insert({
        channel_id: channelId,
        show_id: showId || null,
        user_id: userId || null,
        anon_id: userId ? null : anonId,
        display_name: displayName,
        is_guest: !userId,
        joined_at: nowIso,
        last_seen_at: nowIso,
        device_type: deviceType || 'desktop',
        referrer: referrer || 'Direct',
      })
    }

    // 2. Count active sessions
    const { count: activeCount } = await supabase
      .from('listen_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .gt('last_seen_at', ninetySecondsAgo)
      .is('left_at', null)

    const finalCount = activeCount || 1

    // 3. Update channel listener count
    await supabase.from('channels').update({ current_listeners: finalCount }).eq('id', channelId)

    // 4. Update show peak
    if (showId) {
      const { data: show } = await supabase.from('shows').select('peak_listeners').eq('id', showId).single()
      if (show && finalCount > (show.peak_listeners || 0)) {
        await supabase.from('shows').update({ peak_listeners: finalCount }).eq('id', showId)
      }
    }

    res.json({ ok: true, activeListeners: finalCount })
  } catch (err) {
    console.warn('[HEARTBEAT] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

const server = http.createServer(app)
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 10 * 1024 * 1024,
})

// Map<string, BroadcastSession>
const activeBroadcasts = new Map()

// Reset any dangling live channels on server boot
async function resetDanglingChannels() {
  try {
    await supabase.from('channels').update({ is_live: false, current_listeners: 0 }).eq('is_live', true)
    console.log('[INIT] Checked and cleaned up stale live channels')
  } catch (err) {
    console.warn('[INIT] Channel cleanup warning:', err.message)
  }
}
resetDanglingChannels()

// Timeout helper to prevent hanging promises
function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ])
}

// Decode Supabase JWT claims safely
function extractUserFromToken(token) {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { error: 'Session token has expired' }
    }
    if (!payload.sub) {
      return { error: 'Invalid user token payload' }
    }
    return { user: { id: payload.sub, email: payload.email } }
  } catch (err) {
    return { error: err.message }
  }
}

// Helper: Gracefully finish ffmpeg process by closing stdin and awaiting clean exit (flushing .webm container)
function gracefulCloseFfmpeg(proc, name, timeoutMs = 4000) {
  if (!proc) return Promise.resolve()

  return new Promise((resolve) => {
    let resolved = false
    const finish = () => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }

    proc.once('close', (code) => {
      console.log(`[${name}] Exited cleanly with code ${code}`)
      finish()
    })

    proc.once('error', (err) => {
      console.warn(`[${name}] Process error during close: ${err.message}`)
      finish()
    })

    // End stdin pipe to signal EOF to FFmpeg so it writes the file trailer cleanly
    try {
      if (proc.stdin && !proc.stdin.destroyed) {
        proc.stdin.end()
      }
    } catch (err) {
      console.warn(`[${name}] stdin.end error: ${err.message}`)
    }

    // Safety fallback: if FFmpeg doesn't exit within timeoutMs, SIGTERM it
    setTimeout(() => {
      if (!resolved) {
        console.warn(`[${name}] Did not exit within ${timeoutMs}ms, terminating process...`)
        try {
          proc.kill('SIGTERM')
        } catch {}
        finish()
      }
    }, timeoutMs)
  })
}

// Helper: End a broadcast session cleanly and archive recording
async function endBroadcast(channelSlug, reason = 'manual') {
  const session = activeBroadcasts.get(channelSlug)
  if (!session) return

  console.log(`[STREAM] Ending broadcast for ${channelSlug} (Reason: ${reason})`)

  if (session.disconnectTimer) clearTimeout(session.disconnectTimer)
  if (session.noAudioTimer) clearInterval(session.noAudioTimer)

  // Cleanly close both live and recording ffmpeg processes (letting .webm container trailer finalize)
  await Promise.all([
    gracefulCloseFfmpeg(session.ffmpeg, `FFMPEG LIVE ${channelSlug}`),
    gracefulCloseFfmpeg(session.recProc, `FFMPEG REC ${channelSlug}`),
  ])
  session.ffmpeg = null
  session.recProc = null

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
      if (stats.size > 1000) {
        const ext = path.extname(session.recordingFilePath)
        const mimeType = ext === '.webm' ? 'audio/webm' : 'audio/mpeg'
        const storagePath = `${session.channelSlug}/${session.showId || Date.now()}${ext}`
        const fileBuffer = fs.readFileSync(session.recordingFilePath)

        const { error: uploadErr } = await supabase.storage
          .from('recordings')
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
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

// Helper: Spawn live ffmpeg transcoder to Icecast (MP3 64 kbps mono)
function spawnLiveFfmpeg(channelSlug) {
  const icecastUrl = `icecast://source:${encodeURIComponent(
    ICECAST_SOURCE_PASSWORD
  )}@${ICECAST_HOST}:${ICECAST_PORT}/${channelSlug}`

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
    '-legacy_icecast',
    '1',
    '-f',
    'mp3',
    icecastUrl,
  ]

  const maskedIcecastUrl = `icecast://source:***@${ICECAST_HOST}:${ICECAST_PORT}/${channelSlug}`
  const maskedArgs = ffmpegArgs.map((arg) => (arg === icecastUrl ? maskedIcecastUrl : arg))
  console.log(`[FFMPEG LIVE] Command: ffmpeg ${maskedArgs.join(' ')}`)

  const ffmpeg = spawn('ffmpeg', ffmpegArgs)

  ffmpeg.stderr.on('data', (data) => {
    console.warn(`[FFMPEG LIVE ${channelSlug}] ${data.toString().trim()}`)
  })

  ffmpeg.on('error', (err) => {
    console.error(`[FFMPEG LIVE ${channelSlug}] Process error:`, err.message)
  })

  ffmpeg.on('close', (code) => {
    console.log(`[FFMPEG LIVE ${channelSlug}] Process exited with code ${code}`)
  })

  ffmpeg.stdin.on('error', (err) => {
    console.warn(`[FFMPEG LIVE ${channelSlug}] stdin pipe error: ${err.message}`)
  })

  return ffmpeg
}

// Helper: Spawn separate recording process to save original Opus audio as .webm with -c copy
function spawnRecordingFfmpeg(showId, channelSlug) {
  try {
    const filename = `${showId || channelSlug || 'recording'}.webm`
    const recordingFilePath = path.join(RECORDINGS_DIR, filename)

    const recArgs = [
      '-loglevel',
      'warning',
      '-f',
      'webm',
      '-i',
      'pipe:0',
      '-c',
      'copy',
      '-f',
      'webm',
      recordingFilePath,
    ]

    console.log(`[FFMPEG RECORDING] Command: ffmpeg ${recArgs.join(' ')}`)

    const recProc = spawn('ffmpeg', recArgs)

    recProc.stderr.on('data', (data) => {
      console.warn(`[FFMPEG REC ${channelSlug}] ${data.toString().trim()}`)
    })

    recProc.on('error', (err) => {
      console.warn(`[FFMPEG REC ${channelSlug}] Process error (recording ignored, live unaffected):`, err.message)
    })

    recProc.on('close', (code) => {
      console.log(`[FFMPEG REC ${channelSlug}] Recording process exited with code ${code}`)
    })

    recProc.stdin.on('error', (err) => {
      console.warn(`[FFMPEG REC ${channelSlug}] stdin pipe error:`, err.message)
    })

    return { recProc, recordingFilePath }
  } catch (err) {
    console.warn(`[FFMPEG REC] Spawn failed (live stream continues unaffected):`, err.message)
    return { recProc: null, recordingFilePath: null }
  }
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
      if (!ws.session) return
      ws.session.lastAudioTime = Date.now()

      // Primary: Live stream to Icecast
      if (ws.session.ffmpeg && ws.session.ffmpeg.stdin && ws.session.ffmpeg.stdin.writable) {
        try {
          ws.session.ffmpeg.stdin.write(data)
        } catch (err) {
          console.warn(`[STREAM] Error writing live audio chunk: ${err.message}`)
        }
      }

      // Secondary: Recording process (isolated, failure does not affect live stream)
      if (ws.session.recProc && ws.session.recProc.stdin && ws.session.recProc.stdin.writable) {
        try {
          ws.session.recProc.stdin.write(data)
        } catch (err) {
          console.warn(`[RECORDING] Error writing recording chunk: ${err.message}`)
        }
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

        console.log(`[STREAM] Received start broadcast request for station: "${channelSlug}"`)

        // 1. Verify Supabase Token (via Auth API with timeout, fallback to JWT claims)
        let userId = null
        try {
          const { data: userData, error: userError } = await withTimeout(
            supabase.auth.getUser(token),
            3000,
            'Supabase auth'
          )
          if (!userError && userData?.user?.id) {
            userId = userData.user.id
          }
        } catch (authErr) {
          console.warn('[AUTH] Supabase Auth API verification timed out or failed:', authErr.message)
        }

        if (!userId) {
          const parsed = extractUserFromToken(token)
          if (parsed?.error) {
            console.warn(`[AUTH] Token extraction failed: ${parsed.error}`)
            ws.send(JSON.stringify({ type: 'error', message: `Authentication failed: ${parsed.error}` }))
            return ws.close(4001, 'Invalid token')
          }
          if (parsed?.user?.id) {
            userId = parsed.user.id
            console.log(`[AUTH] Broadcaster verified via token signature for user: ${userId}`)
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired auth session' }))
            return ws.close(4001, 'Invalid token')
          }
        }

        // 2. Verify Channel Ownership
        let channel = null
        try {
          const { data: chData, error: channelError } = await withTimeout(
            supabase
              .from('channels')
              .select('id, name, slug, owner_id')
              .eq('slug', channelSlug.toLowerCase())
              .single(),
            4000,
            'Channel query'
          )

          if (channelError) {
            throw channelError
          }
          channel = chData
        } catch (dbErr) {
          console.error(`[DB] Channel lookup error for ${channelSlug}:`, dbErr.message)
          ws.send(JSON.stringify({ type: 'error', message: `Station verification failed: ${dbErr.message}` }))
          return ws.close(4002, 'Database error')
        }

        if (!channel || channel.owner_id !== userId) {
          console.warn(`[AUTH] Forbidden: User ${userId} is not owner of station ${channelSlug}`)
          ws.send(JSON.stringify({ type: 'error', message: 'Forbidden: You do not own this channel' }))
          return ws.close(4003, 'Forbidden')
        }

        if (channel.is_suspended === true) {
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
        let show = null
        try {
          const { data: newShow, error: showErr } = await supabase
            .from('shows')
            .insert({
              channel_id: channel.id,
              title,
              started_at: new Date().toISOString(),
            })
            .select()
            .single()
          if (!showErr) show = newShow
        } catch (sErr) {
          console.warn('[DB] Show insert warning:', sErr.message)
        }

        // Mark channel as live
        try {
          await supabase
            .from('channels')
            .update({ is_live: true })
            .eq('id', channel.id)
        } catch (liveErr) {
          console.warn('[DB] Channel live update warning:', liveErr.message)
        }

        // 1. Spawn primary live Icecast transcoder
        const ffmpeg = spawnLiveFfmpeg(channel.slug)

        // 2. Spawn separate, isolated recording process (lossless Opus to .webm)
        const { recProc, recordingFilePath } = spawnRecordingFfmpeg(show?.id, channel.slug)

        const session = {
          channelId: channel.id,
          channelSlug: channel.slug,
          channelName: channel.name,
          userId,
          showId: show ? show.id : null,
          showTitle: title,
          startedAt: Date.now(),
          ffmpeg,
          recProc,
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
      console.error('[WS] Error processing message:', err.message)
      try {
        ws.send(JSON.stringify({ type: 'error', message: err.message || 'Server error processing request' }))
      } catch {}
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
