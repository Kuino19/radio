import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreatorDashboardHub } from '@/components/CreatorDashboardHub'
import type { Channel, Series, Episode, MonetizationSettings, Tip } from '@/types/database'

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

  let series: Series[] = []
  let episodes: Episode[] = []
  let monetization: MonetizationSettings | null = null
  let tips: Tip[] = []

  if (primaryChannelId) {
    // 2. Fetch series
    const { data: seriesData } = await supabase
      .from('series')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .order('created_at', { ascending: false })
    series = seriesData || []

    // 3. Fetch episodes
    const { data: episodesData } = await supabase
      .from('episodes')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .order('created_at', { ascending: false })
    episodes = (episodesData as unknown as Episode[]) || []

    // 4. Fetch monetization settings
    const { data: monData } = await supabase
      .from('monetization_settings')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .maybeSingle()
    monetization = monData

    // 5. Fetch tips
    const { data: tipsData } = await supabase
      .from('tips')
      .select('*')
      .eq('channel_id', primaryChannelId)
      .order('created_at', { ascending: false })
    tips = tipsData || []
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <CreatorDashboardHub
        channels={channels}
        series={series}
        episodes={episodes}
        monetization={monetization}
        tips={tips}
      />
    </div>
  )
}
