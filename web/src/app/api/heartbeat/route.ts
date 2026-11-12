import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      channelId,
      showId,
      anonId,
      userId,
      displayName,
      deviceType: clientDevice,
      referrer: clientReferrer,
    } = body

    if (!channelId || !displayName) {
      return NextResponse.json({ error: 'Missing channelId or displayName' }, { status: 400 })
    }

    // 1. Detect location & device without storing raw IP (NDPR compliant)
    const country =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      'NG'
    const city =
      request.headers.get('x-vercel-ip-city') ||
      'Lagos'

    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
    const deviceType = clientDevice || (isMobile ? 'phone' : 'desktop')

    // Clean Referrer
    let referrer = clientReferrer || request.headers.get('referer') || 'Direct'
    if (referrer.includes('whatsapp')) referrer = 'WhatsApp'
    else if (referrer.includes('instagram')) referrer = 'Instagram'
    else if (referrer.includes('twitter') || referrer.includes('t.co') || referrer.includes('x.com')) referrer = 'X / Twitter'
    else if (referrer.includes('facebook') || referrer.includes('fb')) referrer = 'Facebook'
    else if (referrer.startsWith('http')) {
      try {
        const u = new URL(referrer)
        referrer = u.hostname
      } catch {}
    }

    // Try routing via the Azure audio backend (which has full admin rights to update listeners)
    const streamBase = process.env.NEXT_PUBLIC_STREAM_BASE_URL || 'https://radio.goanitech.com'
    try {
      const backendRes = await fetch(`${streamBase}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          showId,
          anonId,
          userId,
          displayName,
          deviceType,
          referrer,
        }),
      })
      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json(data)
      }
    } catch (backendErr) {
      console.warn('Backend heartbeat relay error, using local supabase fallback:', backendErr)
    }

    const supabase = await createClient()
    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString()

    // 2. Look for active session in the last 90 seconds
    let activeSession = null

    if (userId) {
      const { data } = await supabase
        .from('listen_sessions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .gt('last_seen_at', ninetySecondsAgo)
        .is('left_at', null)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      activeSession = data
    } else if (anonId) {
      const { data } = await supabase
        .from('listen_sessions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('anon_id', anonId)
        .gt('last_seen_at', ninetySecondsAgo)
        .is('left_at', null)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      activeSession = data
    }

    const nowIso = new Date().toISOString()

    if (activeSession) {
      // Refresh heartbeat
      await supabase
        .from('listen_sessions')
        .update({
          last_seen_at: nowIso,
          display_name: displayName,
        })
        .eq('id', activeSession.id)
    } else {
      // Insert new session
      await supabase.from('listen_sessions').insert({
        channel_id: channelId,
        show_id: showId || null,
        user_id: userId || null,
        anon_id: userId ? null : anonId,
        display_name: displayName,
        is_guest: !userId,
        joined_at: nowIso,
        last_seen_at: nowIso,
        country,
        city,
        device_type: deviceType,
        referrer,
      })
    }

    // 3. Calculate exact active listeners (sessions seen in last 90 seconds)
    const { count: activeListeners } = await supabase
      .from('listen_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .gt('last_seen_at', ninetySecondsAgo)
      .is('left_at', null)

    const count = activeListeners || 1

    // Update channel current listeners
    await supabase
      .from('channels')
      .update({ current_listeners: count })
      .eq('id', channelId)

    // Update show peak listeners if applicable
    if (showId) {
      const { data: show } = await supabase
        .from('shows')
        .select('peak_listeners')
        .eq('id', showId)
        .single()

      if (show && count > (show.peak_listeners || 0)) {
        await supabase
          .from('shows')
          .update({ peak_listeners: count })
          .eq('id', showId)
      }
    }

    return NextResponse.json({
      ok: true,
      activeListeners: count,
    })
  } catch (err: unknown) {
    const error = err as Error
    console.warn('Heartbeat error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
