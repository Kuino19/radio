import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify admin
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase())
  const isEnvAdmin = adminEmails.includes((user.email || '').toLowerCase())

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!isEnvAdmin && profile?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get current status
  const { data: channel } = await supabase
    .from('channels')
    .select('is_suspended')
    .eq('id', id)
    .single()

  if (channel) {
    await supabase
      .from('channels')
      .update({ is_suspended: !channel.is_suspended })
      .eq('id', id)
  }

  return NextResponse.redirect(new URL('/admin', request.url), { status: 303 })
}
