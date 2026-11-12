import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsCharts } from '@/components/AnalyticsCharts'
import { ArrowLeft, Radio, Mic, ExternalLink } from 'lucide-react'
import type { Channel, Show, ListenSession } from '@/types/database'

interface AnalyticsPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/dashboard/analytics/${slug}`)
  }

  // 2. Fetch channel
  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .single()

  if (error || !channel) {
    notFound()
  }

  if (channel.owner_id !== user.id) {
    redirect('/dashboard')
  }

  // 3. Fetch shows
  const { data: showsData } = await supabase
    .from('shows')
    .select('*')
    .eq('channel_id', channel.id)
    .order('started_at', { ascending: false })

  const shows: Show[] = showsData || []

  // 4. Fetch listen sessions
  const { data: sessionsData } = await supabase
    .from('listen_sessions')
    .select('*')
    .eq('channel_id', channel.id)
    .order('last_seen_at', { ascending: false })
    .limit(300)

  const sessions: ListenSession[] = sessionsData || []

  // 5. Follower count
  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channel.id)

  // 6. Chat messages count
  const { count: chatCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channel.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {channel.name} Analytics
            </h1>
            {channel.is_live && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-0.5 text-xs font-bold text-red-400 border border-red-500/40 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                ON AIR NOW
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Exact listener metrics, retention curves, and broadcast performance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/studio/${channel.slug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors shadow-sm"
          >
            <Mic className="h-3.5 w-3.5" />
            Open Studio
          </Link>

          <Link
            href={`/c/${channel.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <span>Public Page</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Analytics Charts & Details */}
      <AnalyticsCharts
        channel={channel as Channel}
        shows={shows}
        sessions={sessions}
        followerCount={followerCount || 0}
        chatCount={chatCount || 0}
      />
    </div>
  )
}
