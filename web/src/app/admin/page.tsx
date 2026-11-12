import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ShieldAlert,
  Radio,
  Users,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Star,
  Sparkles,
} from 'lucide-react'
import type { Channel, Profile } from '@/types/database'

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin')
  }

  // 2. Check admin status: profile.is_admin = true OR email matches ADMIN_EMAILS
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase())
  const userEmail = (user.email || '').toLowerCase()
  const isEnvAdmin = adminEmails.length > 0 && adminEmails.includes(userEmail)

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = isEnvAdmin || profile?.is_admin === true

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500 border border-zinc-700">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="text-xs text-zinc-400">
          This portal is reserved for LISNR system administrators.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  // 3. Fetch system metrics & channels
  const { data: channelsData } = await supabase
    .from('channels')
    .select('*')
    .order('created_at', { ascending: false })

  const channels: Channel[] = channelsData || []

  const totalChannels = channels.length
  const liveCount = channels.filter((c) => c.is_live).length
  const suspendedCount = channels.filter((c) => c.is_suspended).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-0.5 text-xs font-bold text-red-400 border border-red-500/30 mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            Super Admin Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            System Moderation & Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage channels, suspend abusive stations, and feature community broadcasts
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total Channels
          </span>
          <div className="text-2xl font-extrabold text-white mt-1">{totalChannels}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </span>
          <div className="text-2xl font-extrabold text-white mt-1">{liveCount}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Suspended Stations
          </span>
          <div className="text-2xl font-extrabold text-white mt-1">{suspendedCount}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Admin User
          </span>
          <div className="text-xs font-mono text-zinc-300 mt-2 truncate">{user.email}</div>
        </div>
      </div>

      {/* Channels Moderation Table */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Radio className="h-4 w-4 text-red-500" />
          All Registered Channels
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              <tr>
                <th className="pb-3">Station</th>
                <th className="pb-3">Slug / Mount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Listeners</th>
                <th className="pb-3">Created</th>
                <th className="pb-3 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {channels.map((ch) => (
                <tr key={ch.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    {ch.name}
                    {ch.is_featured && (
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    )}
                  </td>
                  <td className="py-3 text-zinc-400 font-mono">/c/{ch.slug}</td>
                  <td className="py-3">
                    {ch.is_suspended ? (
                      <span className="rounded bg-red-600/20 text-red-400 px-2 py-0.5 text-[10px] font-bold">
                        Suspended
                      </span>
                    ) : ch.is_live ? (
                      <span className="rounded bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                        LIVE
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-zinc-300 font-bold">{ch.current_listeners}</td>
                  <td className="py-3 text-zinc-500">
                    {new Date(ch.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <form action={`/api/admin/channels/${ch.id}/toggle-suspend`} method="POST" className="inline">
                      <button
                        type="submit"
                        className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          ch.is_suspended
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-zinc-800 hover:bg-red-600/30 text-zinc-300 hover:text-red-400'
                        }`}
                      >
                        {ch.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </form>

                    <form action={`/api/admin/channels/${ch.id}/toggle-feature`} method="POST" className="inline">
                      <button
                        type="submit"
                        className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          ch.is_featured
                            ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {ch.is_featured ? 'Featured' : 'Feature'}
                      </button>
                    </form>

                    <Link
                      href={`/c/${ch.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
