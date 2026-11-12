import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmbedPlayerClient } from '@/components/EmbedPlayerClient'
import type { Channel, Profile, Recording } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EmbedPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function EmbedPage({ params }: EmbedPageProps) {
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

  // 3. Fetch latest replay recording (in case station is offline)
  const { data: recordingsData } = await supabase
    .from('recordings')
    .select('*')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const latestRecording: Recording | null = recordingsData?.[0] || null

  const icecastHost = process.env.NEXT_PUBLIC_STREAM_HOST || 'https://radio.goanitech.com'
  const streamUrl = `${icecastHost}/live/${channel.slug}`

  return (
    <div className="w-full h-full min-h-[160px] flex items-center justify-center p-2 bg-[#0E0D0C]">
      <EmbedPlayerClient
        channelName={channel.name}
        channelSlug={channel.slug}
        coverUrl={channel.cover_url}
        hostName={host?.display_name}
        isLive={channel.is_live}
        currentListeners={channel.current_listeners || 0}
        streamUrl={streamUrl}
        latestRecordingUrl={latestRecording?.audio_url || null}
        latestRecordingTitle={latestRecording?.title || null}
      />
    </div>
  )
}
