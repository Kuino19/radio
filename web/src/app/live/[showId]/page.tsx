import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Radio, Users } from 'lucide-react'
import { AudioPlayer } from '@/components/AudioPlayer'
import { createClient } from '@/lib/supabase/server'
import type { Channel, Profile, Recording, Show } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface LiveShowPageProps {
  params: Promise<{ showId: string }>
}

export default async function LiveShowPage({ params }: LiveShowPageProps) {
  const { showId } = await params
  const supabase = await createClient()
  const { data: showData } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .maybeSingle()

  if (!showData) notFound()
  const show = showData as Show

  const [{ data: channelData }, { data: recordingData }] = await Promise.all([
    supabase.from('channels').select('*').eq('id', show.channel_id).maybeSingle(),
    supabase.from('recordings').select('*').eq('show_id', show.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!channelData) notFound()
  const channel = channelData as Channel
  const recording = recordingData as Recording | null
  const [{ data: hostData }, { data: { user } }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', channel.owner_id).maybeSingle(),
    supabase.auth.getUser(),
  ])
  const host = hostData as Profile | null
  const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL || 'https://radio.goanitech.com'
  const isLive = channel.is_live && !show.ended_at

  return (
    <main className="mx-auto max-w-3xl px-3 py-5 sm:px-6 sm:py-10 space-y-5 sm:space-y-7">
      <Link
        href={`/c/${channel.slug}`}
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm text-[#A39B91] transition-colors hover:bg-[#1A1816] hover:text-[#F4EFE8]"
      >
        <ArrowLeft className="h-4 w-4" />
        {channel.name}
      </Link>

      <section className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          {channel.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.cover_url} alt="" className="h-14 w-14 rounded-2xl border border-[#2A2724] object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2A2724] bg-[#0E0D0C] text-[#F2B544]">
              <Radio className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className={isLive ? 'text-[#FF4A3D]' : 'text-[#A39B91]'}>{isLive ? 'Live show' : recording ? 'Show replay' : 'Show ended'}</span>
              {isLive && <span className="flex items-center gap-1.5 rounded-full border border-[#FF4A3D]/30 bg-[#0E0D0C] px-2.5 py-1 text-[#FF4A3D]"><span className="h-1.5 w-1.5 rounded-full bg-[#FF4A3D]" />ON AIR</span>}
            </div>
            <h1 className="mt-1 truncate font-display text-xl font-bold text-[#F4EFE8] sm:text-2xl">{show.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#A39B91]">
              {host?.display_name || 'LISNR'} · {channel.name}
              {isLive && <><span>·</span><Users className="h-3 w-3" />{channel.current_listeners} listening</>}
            </p>
          </div>
        </div>

        <AudioPlayer
          channelId={channel.id}
          showId={show.id}
          streamUrl={`${streamBaseUrl}/${channel.slug}`}
          isLive={isLive}
          channelName={show.title}
          channelSlug={`live-${show.id}`}
          coverUrl={channel.cover_url}
          hostName={host?.display_name}
          userLoggedIn={!!user}
          userDisplayName={user?.email?.split('@')[0] || null}
          latestRecording={recording}
          showSpecific
        />
      </section>
    </main>
  )
}
