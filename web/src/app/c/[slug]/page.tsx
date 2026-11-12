import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AudioPlayer } from '@/components/AudioPlayer'
import { ShareButton } from '@/components/ShareButton'
import { FollowButton } from '@/components/FollowButton'
import { LiveChat } from '@/components/LiveChat'
import { RecordingsList } from '@/components/RecordingsList'
import { Users, Calendar, Radio, Clock, ShieldAlert, Sparkles, Bell } from 'lucide-react'
import type { Channel, Profile, Show, ScheduledShow, Recording } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ChannelPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch channel
  const { data: channelData, error: channelError } = await supabase
    .from('channels')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .single()

  if (channelError || !channelData) {
    notFound()
  }

  const channel: Channel = channelData

  // 2. Fetch host profile
  const { data: hostData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', channel.owner_id)
    .single()

  const host: Profile | null = hostData

  // 3. Fetch latest / last show
  const { data: showData } = await supabase
    .from('shows')
    .select('*')
    .eq('channel_id', channel.id)
    .order('started_at', { ascending: false })
    .limit(1)

  const lastShow: Show | null = showData?.[0] || null

  // 4. Fetch scheduled upcoming shows
  const { data: scheduledData } = await supabase
    .from('scheduled_shows')
    .select('*')
    .eq('channel_id', channel.id)
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(3)

  const scheduledShows: ScheduledShow[] = scheduledData || []

  // 5. Fetch archived recordings
  const { data: recordingsData } = await supabase
    .from('recordings')
    .select('*')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const recordings: Recording[] = recordingsData || []

  // 6. Fetch follower count
  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channel.id)

  // 7. Check if current user is logged in & following
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isFollowing = false
  let userProfile: Profile | null = null

  if (user) {
    const { data: followRecord } = await supabase
      .from('follows')
      .select('channel_id')
      .eq('channel_id', channel.id)
      .eq('user_id', user.id)
      .maybeSingle()

    isFollowing = !!followRecord

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    userProfile = profile
  }

  const streamBaseUrl =
    process.env.NEXT_PUBLIC_STREAM_BASE_URL || 'https://radio.goanitech.com'
  const streamUrl = `${streamBaseUrl}/${channel.slug}`
  const isOwner = user?.id === channel.owner_id

  if (channel.is_suspended) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-white">Station Suspended</h1>
        <p className="text-xs text-zinc-400">
          This station has been suspended by an administrator for violating community guidelines.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:text-white"
        >
          Return to Explore
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Station Info & Audio Player */}
        <div className="lg:col-span-2 space-y-6">
          {/* Station Banner / Card */}
          <div className="flex flex-col sm:flex-row items-start gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-md">
            {channel.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.cover_url}
                alt={channel.name}
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover border border-zinc-700 shadow-md shrink-0"
              />
            ) : (
              <div className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-300 font-extrabold text-3xl border border-zinc-700 shadow-md shrink-0">
                {channel.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {channel.is_live ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-400 border border-red-500/40">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 border border-zinc-700">
                    OFFLINE
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Users className="h-3.5 w-3.5" />
                  {channel.current_listeners} listening
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {channel.name}
              </h1>

              <p className="text-xs sm:text-sm text-zinc-400">
                Hosted by{' '}
                <span className="font-semibold text-zinc-200">
                  {host?.display_name || 'Radio Host'}
                </span>
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <FollowButton
                  channelId={channel.id}
                  initialFollowers={followerCount || 0}
                  initialIsFollowing={isFollowing}
                  userId={user?.id || null}
                />
                <ShareButton channelName={channel.name} channelSlug={channel.slug} />
              </div>
            </div>
          </div>

          {/* Interactive Audio Player */}
          <AudioPlayer
            channelId={channel.id}
            showId={lastShow?.id || null}
            streamUrl={streamUrl}
            isLive={channel.is_live}
            channelName={channel.name}
            channelSlug={channel.slug}
            coverUrl={channel.cover_url}
            hostName={host?.display_name}
            userLoggedIn={!!user}
            userDisplayName={userProfile?.display_name || user?.email?.split('@')[0]}
          />

          {/* Scheduled Upcoming Shows */}
          {scheduledShows.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Broadcasts
                </h3>
                <span className="text-xs text-zinc-500">Scheduled</span>
              </div>

              <div className="divide-y divide-zinc-800">
                {scheduledShows.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      {s.description && (
                        <p className="text-xs text-zinc-400 mt-0.5">{s.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-xs font-mono font-medium text-amber-300">
                        <Clock className="h-3 w-3" />
                        {new Date(s.scheduled_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(s.scheduled_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Replays & Archived Recordings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-500" />
              Past Shows & Replays
            </h3>
            <RecordingsList
              recordings={recordings}
              channelName={channel.name}
              channelSlug={channel.slug}
              coverUrl={channel.cover_url}
              isOwner={isOwner}
            />
          </div>

          {/* Station Description */}
          {channel.description && (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                About this Station
              </h3>
              <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                {channel.description}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: Live Room / Chat */}
        <div className="space-y-6">
          <LiveChat
            channelId={channel.id}
            channelSlug={channel.slug}
            channelOwnerId={channel.owner_id}
            currentUserId={user?.id || null}
            currentUserDisplayName={userProfile?.display_name || user?.email?.split('@')[0]}
            isOwner={isOwner}
          />

          {isOwner && (
            <div className="rounded-2xl border border-red-500/30 bg-red-600/10 p-4 text-center space-y-2">
              <p className="text-xs text-red-300 font-medium">You are the host of this station</p>
              <Link
                href={`/studio/${channel.slug}`}
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors"
              >
                <Radio className="h-3.5 w-3.5" />
                Open Live Studio
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
