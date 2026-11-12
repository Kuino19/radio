'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Radio,
} from 'lucide-react'
import type { ScheduledShow } from '@/types/database'

interface ProgramScheduleCalendarProps {
  channelId: string
  channelName: string
  channelSlug: string
  initialScheduledShows?: ScheduledShow[]
}

export function ProgramScheduleCalendar({
  channelId,
  channelName,
  channelSlug,
  initialScheduledShows = [],
}: ProgramScheduleCalendarProps) {
  const supabase = createClient()
  const [scheduledShows, setScheduledShows] = useState<ScheduledShow[]>(initialScheduledShows)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('18:00')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch updated scheduled shows
  const fetchScheduledShows = async () => {
    const { data } = await supabase
      .from('scheduled_shows')
      .select('*')
      .eq('channel_id', channelId)
      .order('scheduled_at', { ascending: true })

    if (data) setScheduledShows(data)
  }

  useEffect(() => {
    fetchScheduledShows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  // Calendar calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Open modal pre-selected to clicked date
  const handleDayClick = (day: number) => {
    const d = new Date(year, month, day)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${yyyy}-${mm}-${dd}`)
    setShowModal(true)
  }

  // Create new scheduled broadcast
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    if (!title.trim() || !selectedDate || !time) {
      setErrorMsg('Please specify program title, date, and start time.')
      setLoading(false)
      return
    }

    const scheduledIso = new Date(`${selectedDate}T${time}:00`).toISOString()

    const { error } = await supabase.from('scheduled_shows').insert({
      channel_id: channelId,
      title: title.trim(),
      scheduled_at: scheduledIso,
      description: description.trim() || null,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      setTitle('')
      setDescription('')
      setShowModal(false)
      setLoading(false)
      await fetchScheduledShows()
    }
  }

  // Delete scheduled program
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await supabase.from('scheduled_shows').delete().eq('id', id)
    setScheduledShows((prev) => prev.filter((s) => s.id !== id))
    setDeletingId(null)
  }

  // Generate Google Calendar 1-Click Link
  const getGoogleCalendarUrl = (show: ScheduledShow) => {
    const start = new Date(show.scheduled_at)
    const end = new Date(start.getTime() + 60 * 60 * 1000) // Default 1 hour
    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '')

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${show.title} — ${channelName} on LISNR`,
      dates: `${formatGDate(start)}/${formatGDate(end)}`,
      details: `${show.description || 'Live speech broadcast on LISNR.'}\n\nTune in: https://lisnr.goanitech.com/c/${channelSlug}`,
      location: `https://lisnr.goanitech.com/c/${channelSlug}`,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  // Check which days have shows
  const showsByDate = scheduledShows.reduce((acc, show) => {
    const dateStr = new Date(show.scheduled_at).toDateString()
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(show)
    return acc
  }, {} as Record<string, ScheduledShow[]>)

  const todayDateStr = new Date().toDateString()

  return (
    <div className="space-y-6">
      {/* Schedule Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2724] pb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#F2B544]" />
            Program Broadcast Schedule
          </h2>
          <p className="text-xs text-[#A39B91] mt-0.5">
            Schedule future sermons, talk shows, and podcasts on the interactive calendar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const today = new Date()
            const yyyy = today.getFullYear()
            const mm = String(today.getMonth() + 1).padStart(2, '0')
            const dd = String(today.getDate()).padStart(2, '0')
            setSelectedDate(`${yyyy}-${mm}-${dd}`)
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#F2B544] px-4 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Program</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Month Calendar */}
        <div className="lg:col-span-2 rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 sm:p-6 space-y-4 shadow-xl">
          {/* Calendar Month Navigation */}
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base sm:text-lg text-[#F4EFE8]">
              {monthNames[month]} {year}
            </h3>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#2A2724] bg-[#0E0D0C] text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-[#2A2724] bg-[#0E0D0C] text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-[#2A2724] bg-[#0E0D0C] text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono font-semibold text-[#A39B91] uppercase tracking-wider py-1 border-b border-[#2A2724]">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 rounded-2xl bg-[#0E0D0C]/40 border border-transparent" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const cellDate = new Date(year, month, day)
              const cellDateStr = cellDate.toDateString()
              const isToday = cellDateStr === todayDateStr
              const dayShows = showsByDate[cellDateStr] || []

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`h-20 sm:h-24 p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isToday
                      ? 'border-[#F2B544] bg-[#F2B544]/5 shadow-sm'
                      : dayShows.length > 0
                      ? 'border-[#2A2724] bg-[#0E0D0C] hover:border-[#F2B544]/60'
                      : 'border-[#2A2724]/60 bg-[#0E0D0C]/60 hover:border-[#2A2724] hover:bg-[#0E0D0C]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-[#F2B544] text-[#0E0D0C]'
                          : 'text-[#F4EFE8] group-hover:text-[#F2B544]'
                      }`}
                    >
                      {day}
                    </span>
                    {dayShows.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#F2B544] shrink-0" />
                    )}
                  </div>

                  {/* Scheduled Show Preview Badges */}
                  <div className="space-y-1 overflow-hidden">
                    {dayShows.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="truncate text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-[#1A1816] text-[#F2B544] border border-[#2A2724]"
                        title={`${s.title} (${new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                      >
                        {s.title}
                      </div>
                    ))}
                    {dayShows.length > 2 && (
                      <span className="text-[8px] font-mono text-[#A39B91] block text-right">
                        +{dayShows.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Upcoming Program Queue */}
        <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-[#F4EFE8] flex items-center justify-between border-b border-[#2A2724] pb-3">
              <span>Upcoming Queue</span>
              <span className="font-mono text-xs text-[#F2B544] font-bold">
                {scheduledShows.length} scheduled
              </span>
            </h3>

            {scheduledShows.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CalendarIcon className="w-8 h-8 text-[#A39B91] mx-auto opacity-40" />
                <p className="text-xs text-[#F4EFE8] font-semibold">No programs scheduled</p>
                <p className="text-[11px] text-[#A39B91]">
                  Click any date on the calendar to schedule a live program.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {scheduledShows.map((show) => {
                  const showDate = new Date(show.scheduled_at)
                  return (
                    <div
                      key={show.id}
                      className="p-3.5 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] space-y-2 hover:border-[#F2B544]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#F4EFE8] truncate">
                            {show.title}
                          </h4>
                          <p className="text-[11px] text-[#F2B544] font-medium flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {showDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at{' '}
                              {showDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(show.id)}
                          disabled={deletingId === show.id}
                          className="text-[#A39B91] hover:text-[#FF4A3D] transition-colors p-1"
                          title="Cancel/Delete scheduled program"
                        >
                          {deletingId === show.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF4A3D]" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {show.description && (
                        <p className="text-[11px] text-[#A39B91] line-clamp-2 leading-relaxed">
                          {show.description}
                        </p>
                      )}

                      <div className="pt-1 flex items-center gap-2">
                        <a
                          href={getGoogleCalendarUrl(show)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#A39B91] hover:text-[#F4EFE8] border border-[#2A2724] px-2.5 py-1 rounded-full transition-colors"
                        >
                          <span>Add to Google Calendar</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Program Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0E0D0C] text-[#F2B544] border border-[#2A2724]">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#F4EFE8]">
                  Schedule New Broadcast
                </h3>
                <p className="text-xs text-[#A39B91]">
                  Set the program title, date, and time for {channelName}.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-[#FF4A3D]/40 bg-[#FF4A3D]/10 p-3 text-xs text-[#FF4A3D]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A39B91] mb-1">
                  Program Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Morning Worship & Word"
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2.5 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A39B91] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3 py-2.5 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A39B91] mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3 py-2.5 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A39B91] mb-1">
                  Description / Topic (optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you be discussing during this broadcast?"
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full border border-[#2A2724] px-4 py-2 text-xs font-semibold text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F2B544] px-5 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Program</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
