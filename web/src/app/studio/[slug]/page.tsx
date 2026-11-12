import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BroadcastStudio } from '@/components/BroadcastStudio'
import type { Channel } from '@/types/database'

interface StudioPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/studio/${slug}`)
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

  // 3. Confirm user owns this channel
  if (channel.owner_id !== user.id) {
    redirect('/dashboard')
  }

  return <BroadcastStudio channel={channel as Channel} />
}
