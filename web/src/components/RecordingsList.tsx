'use client'

import React from 'react'
import { Play, Pause, Clock, Disc, Trash2 } from 'lucide-react'
import { usePlayer } from '@/context/PlayerContext'
import { createClient } from '@/lib/supabase/client'
import type { Recording } from '@/types/database'

interface RecordingsListProps {
  recordings: Recording[]
  channelName: string
  channelSlug: string
  coverUrl?: string | null
  isOwner?: boolean
}

export function RecordingsList({
  recordings,
  channelName,
  channelSlug,
  coverUrl,
  isOwner = false,
}: RecordingsListProps) {
  const { currentTrack, isPlaying, playChannel, togglePlay } = usePlayer()
  const supabase = createClient()
  const [list, setList] = React.useState<Recording[]>(recordings)

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins}m ${s}s`
  }

  const handlePlayRecording = (rec: Recording) => {
    const recordingSlug = `rec-${rec.id}`
    if (currentTrack?.channelSlug === recordingSlug) {
      togglePlay()
      return
    }

    playChannel({
      channelName: `${channelName}: ${rec.title}`,
      channelSlug: recordingSlug,
      streamUrl: rec.audio_url,
      coverUrl: coverUrl || null,
      hostName: 'Replay Archive',
      isLive: false,
    })
  }

  const handleDelete = async (recId: string) => {
    const confirmDel = confirm('Delete this archived recording?')
    if (!confirmDel) return

    const { error } = await supabase.from('recordings').delete().eq('id', recId)
    if (!error) {
      setList((prev) => prev.filter((r) => r.id !== recId))
    }
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">
        <Disc className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
        <p className="font-medium text-zinc-400">No recordings archived yet</p>
        <p className="text-[11px] mt-0.5">Past broadcasts will automatically appear here as replay podcasts.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {list.map((rec) => {
        const isCurrentRec = currentTrack?.channelSlug === `rec-${rec.id}`
        const isThisPlaying = isCurrentRec && isPlaying

        return (
          <div
            key={rec.id}
            className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
              isCurrentRec
                ? 'border-red-500/40 bg-red-950/20'
                : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => handlePlayRecording(rec)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md transition-all shrink-0 ${
                  isThisPlaying
                    ? 'bg-zinc-800 text-red-400 border border-zinc-700'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-950/50'
                }`}
                title={isThisPlaying ? 'Pause replay' : 'Play replay'}
              >
                {isThisPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {rec.title}
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(rec.duration_seconds)}
                  </span>
                  <span>•</span>
                  <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <button
                type="button"
                onClick={() => handleDelete(rec.id)}
                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                title="Delete recording"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
