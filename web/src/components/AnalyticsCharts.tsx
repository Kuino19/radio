'use client'

import React from 'react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  Users,
  Clock,
  TrendingUp,
  Smartphone,
  Globe,
  Share2,
  Radio,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import type { Channel, Show, ListenSession } from '@/types/database'

interface AnalyticsChartsProps {
  channel: Channel
  shows: Show[]
  sessions: ListenSession[]
  followerCount: number
  chatCount: number
}

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']

export function AnalyticsCharts({
  channel,
  shows,
  sessions,
  followerCount,
  chatCount,
}: AnalyticsChartsProps) {
  // 1. Calculate Aggregate Metrics
  const totalShows = shows.length
  const uniqueListeners = new Set(
    sessions.map((s) => s.user_id || s.anon_id || s.display_name)
  ).size

  let overallPeak = 0
  shows.forEach((sh) => {
    if (sh.peak_listeners > overallPeak) overallPeak = sh.peak_listeners
  })
  if (channel.current_listeners > overallPeak) overallPeak = channel.current_listeners

  // Average listening time calculation
  let totalMinutes = 0
  let validSessionsCount = 0
  sessions.forEach((s) => {
    const joined = new Date(s.joined_at).getTime()
    const lastSeen = new Date(s.last_seen_at).getTime()
    const diffMins = Math.max(1, Math.round((lastSeen - joined) / (1000 * 60)))
    if (diffMins < 360) {
      // Filter out anomaly sessions > 6 hours
      totalMinutes += diffMins
      validSessionsCount++
    }
  })
  const avgListeningMinutes = validSessionsCount > 0 ? Math.round(totalMinutes / validSessionsCount) : 0

  // 2. Device Breakdown
  const deviceCounts: { [key: string]: number } = { phone: 0, desktop: 0 }
  sessions.forEach((s) => {
    const dev = (s.device_type || 'phone').toLowerCase()
    if (dev.includes('desk') || dev.includes('mac') || dev.includes('win')) {
      deviceCounts.desktop++
    } else {
      deviceCounts.phone++
    }
  })
  const deviceData = [
    { name: 'Phone / Mobile', value: deviceCounts.phone || 1 },
    { name: 'Desktop', value: deviceCounts.desktop || 0 },
  ]

  // 3. Referrer Breakdown
  const referrerMap: { [key: string]: number } = {}
  sessions.forEach((s) => {
    const ref = s.referrer || 'Direct'
    referrerMap[ref] = (referrerMap[ref] || 0) + 1
  })
  const referrerData = Object.entries(referrerMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (referrerData.length === 0) {
    referrerData.push({ name: 'Direct', count: 1 })
  }

  // 4. Top Cities / Locations
  const locationMap: { [key: string]: number } = {}
  sessions.forEach((s) => {
    const loc = s.city && s.country ? `${s.city}, ${s.country}` : s.country || 'Lagos, NG'
    locationMap[loc] = (locationMap[loc] || 0) + 1
  })
  const topLocations = Object.entries(locationMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 5. Shows Timeline Data for Chart
  const timelineData = [...shows]
    .reverse()
    .map((s, idx) => ({
      name: s.title.length > 15 ? s.title.slice(0, 15) + '…' : s.title,
      peak: s.peak_listeners || 0,
      showNumber: `Show ${idx + 1}`,
      date: new Date(s.started_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    }))

  if (timelineData.length === 0) {
    timelineData.push({
      name: 'No shows yet',
      peak: 0,
      showNumber: 'Start',
      date: 'Today',
    })
  }

  // 6. Recent Active Listeners
  const recentListeners = sessions
    .slice(0, 12)
    .map((s) => ({
      id: s.id,
      name: s.display_name,
      isGuest: s.is_guest,
      joinedAt: new Date(s.joined_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      location: s.city ? `${s.city}, ${s.country}` : s.country || 'Nigeria',
    }))

  return (
    <div className="space-y-8">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peak Listeners */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Peak Listeners</span>
            <Users className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{overallPeak}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Across all live broadcasts</p>
        </div>

        {/* Unique Listeners */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Listeners</span>
            <Globe className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{uniqueListeners}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Total distinct listeners</p>
        </div>

        {/* Avg Listening Time */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Session</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {avgListeningMinutes} <span className="text-sm font-normal text-zinc-400">mins</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Average retention per listener</p>
        </div>

        {/* Followers & Shows */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Followers</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{followerCount}</div>
          <p className="text-[11px] text-zinc-500 mt-1">{totalShows} shows broadcast</p>
        </div>
      </div>

      {/* Main Chart: Show Peak Listeners Timeline */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-500" />
              Listener Growth Over Time
            </h3>
            <p className="text-xs text-zinc-400">Peak listeners reached across recent shows</p>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Area
                type="monotone"
                dataKey="peak"
                stroke="#ef4444"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPeak)"
                name="Peak Listeners"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Grids: Devices & Traffic Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Smartphone className="h-4 w-4 text-red-500" />
            <span>Device Split</span>
          </div>

          <div className="flex items-center justify-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-zinc-300">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              Mobile ({deviceCounts.phone})
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-500" />
              Desktop ({deviceCounts.desktop})
            </span>
          </div>
        </div>

        {/* Traffic Referrers */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Share2 className="h-4 w-4 text-emerald-400" />
            <span>Top Traffic Sources</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referrerData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Named Listeners List */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-red-500" />
            Audience Listeners
          </h3>
          <span className="text-xs text-zinc-500">
            {sessions.length} tracked sessions
          </span>
        </div>

        {recentListeners.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">
            No listeners have tuned in yet. Share your channel link to get listeners!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentListeners.map((listener) => (
              <div
                key={listener.id}
                className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 shrink-0">
                    {listener.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate max-w-[120px]">
                      {listener.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">{listener.location}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {listener.isGuest ? (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 font-mono">
                      guest
                    </span>
                  ) : (
                    <span className="rounded bg-red-600/20 text-red-400 px-1.5 py-0.5 text-[9px] font-bold">
                      member
                    </span>
                  )}
                  <span className="block text-[9px] text-zinc-500 mt-0.5">
                    {listener.joinedAt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shows History Table */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-400" />
          Broadcast History
        </h3>

        {shows.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">No shows recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2A2724] text-[11px] uppercase tracking-wider text-[#A39B91] font-semibold">
                <tr>
                  <th className="pb-3">Show Title</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Peak Listeners</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2724]/60">
                {shows.map((show) => (
                  <tr key={show.id} className="hover:bg-[#1A1816] transition-colors group">
                    <td className="py-3 font-semibold text-[#F4EFE8]">
                      <Link
                        href={`/dashboard/analytics/${channel.slug}/show/${show.id}`}
                        className="hover:text-[#F2B544] transition-colors"
                      >
                        {show.title}
                      </Link>
                    </td>
                    <td className="py-3 text-[#A39B91]">
                      {new Date(show.started_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-mono font-bold text-[#F2B544]">{show.peak_listeners}</td>
                    <td className="py-3">
                      {show.ended_at ? (
                        <span className="rounded-full bg-[#0E0D0C] border border-[#2A2724] px-2.5 py-0.5 text-[10px] text-[#A39B91]">
                          Completed
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#FF4A3D]/20 text-[#FF4A3D] border border-[#FF4A3D]/40 px-2.5 py-0.5 text-[10px] font-bold animate-pulse">
                          Live Now
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/dashboard/analytics/${channel.slug}/show/${show.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-[#F2B544] hover:underline font-semibold"
                      >
                        <span>View Analytics</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
