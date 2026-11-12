'use client'

import React, { useState } from 'react'
import { Play, Pause, Clock, Disc, Trash2, Sparkles } from 'lucide-react'
import { usePlayer } from '@/context/PlayerContext'
import { createClient } from '@/lib/supabase/client'
import { ShowNotesModal } from '@/components/ShowNotesModal'
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
  const [list, setList] = useState<Recording[]>(recordings)
  const [selectedRecForNotes, setSelectedRecForNotes] = useState<Recording | null>(null)

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

            {/* Right Actions: AI Show Notes & Owner Delete */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRecForNotes(rec)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  rec.ai_processed
                    ? 'bg-[#F2B544]/15 text-[#F2B544] border border-[#F2B544]/30 hover:bg-[#F2B544]/25'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:text-white'
                }`}
                title="View AI Show Notes, Chapters & Transcript"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#F2B544]" />
                <span className="hidden sm:inline">{rec.ai_processed ? 'Show Notes' : 'AI Notes'}</span>
              </button>

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
          </div>
        )
      })}

      {selectedRecForNotes && (
        <ShowNotesModal
          recording={selectedRecForNotes}
          isOpen={!!selectedRecForNotes}
          onClose={() => setSelectedRecForNotes(null)}
          canEdit={isOwner}
          onRecordingUpdated={(updated) => {
            setList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            setSelectedRecForNotes(updated)
          }}
        />
      )}
    </div>
  )
}
