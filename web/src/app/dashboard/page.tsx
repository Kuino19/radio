import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreatorDashboardHub } from '@/components/CreatorDashboardHub'
import type { Channel, Series, Episode, MonetizationSettings, Tip, Show, Recording, ScheduledShow } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard')
  }

  // 1. Fetch user channels
  const { data: channelsData } = await supabase
    .from('channels')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const channels: Channel[] = channelsData || []
  const primaryChannelId = channels[0]?.id
  const channelIds = channels.map((c) => c.id)

  let series: Series[] = []
  let episodes: Episode[] = []
  let monetization: MonetizationSettings | null = null
  let tips: Tip[] = []
  let recentShows: Show[] = []
  let recordings: Recording[] = []
  let upcomingShows: ScheduledShow[] = []
  let totalListens = 0
  let totalFollowers = 0

  if (channelIds.length > 0) {
    // 2. Fetch past shows across channels
    const { data: showsData } = await supabase
      .from('shows')
      .select('*')
      .in('channel_id', channelIds)
      .order('started_at', { ascending: false })
      .limit(10)
    recentShows = showsData || []

    // 3. Fetch recordings
    const { data: recData } = await supabase
      .from('recordings')
      .select('*')
      .in('channel_id', channelIds)
      .order('created_at', { ascending: false })
      .limit(15)
    recordings = recData || []

    // 4. Fetch upcoming scheduled shows
    const { data: schedData } = await supabase
      .from('scheduled_shows')
      .select('*')
      .in('channel_id', channelIds)
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5)
    upcomingShows = schedData || []

    // 5. Total unique listen sessions count
    const { count: sessionCount } = await supabase
      .from('listen_sessions')
      .select('id', { count: 'exact', head: true })
      .in('channel_id', channelIds)
    totalListens = sessionCount || 0

    // 6. Total followers count
    const { count: followerCount } = await supabase
      .from('follows')
      .select('user_id', { count: 'exact', head: true })
      .in('channel_id', channelIds)
    totalFollowers = followerCount || 0
  }

  if (primaryChannelId) {
    // 7. Fetch series
    const { data: seriesData } = await supabase
      .from('series')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .order('created_at', { ascending: false })
    series = seriesData || []

    // 8. Fetch episodes
    const { data: episodesData } = await supabase
      .from('episodes')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .order('created_at', { ascending: false })
    episodes = (episodesData as unknown as Episode[]) || []

    // 9. Fetch monetization settings
    const { data: monData } = await supabase
      .from('monetization_settings')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .maybeSingle()
    monetization = monData

    // 10. Fetch tips
    const { data: tipsData } = await supabase
      .from('tips')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .order('created_at', { ascending: false })
    tips = tipsData || []
  }

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#0E0D0C]">
      <CreatorDashboardHub
        channels={channels}
        series={series}
        episodes={episodes}
        monetization={monetization}
        tips={tips}
        recentShows={recentShows}
        recordings={recordings}
        upcomingShows={upcomingShows}
        totalListens={totalListens}
        totalFollowers={totalFollowers}
      />
    </div>
  )
}
