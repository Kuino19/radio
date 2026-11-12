'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Layers, Plus, X, Loader2, Sparkles, FolderPlus, Radio, BookOpen } from 'lucide-react'
import type { Series } from '@/types/database'

interface SeriesManagerProps {
  channelId: string
  seriesList: Series[]
  onSeriesCreated?: (newSeries: Series) => void
}

export function SeriesManager({
  channelId,
  seriesList,
  onSeriesCreated,
}: SeriesManagerProps) {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Faith & Spirituality')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('series')
        .insert({
          channel_id: channelId,
          title: title.trim(),
          description: description.trim(),
          category,
          tags: [],
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      setTitle('')
      setDescription('')
      setIsOpen(false)
      if (onSeriesCreated && data) {
        onSeriesCreated(data as Series)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create series'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-[#F4EFE8] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#F2B544]" />
            <span>Audio Shows & Series</span>
          </h3>
          <p className="text-xs text-[#A39B91]">
            Group episodes into organized recurring series
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1816] border border-[#2A2724] px-3.5 py-1.5 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544]/60 hover:text-[#F2B544] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Series</span>
        </button>
      </div>

      {/* Series Grid */}
      {seriesList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2A2724] bg-[#0E0D0C] p-6 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-[#A39B91] mx-auto opacity-40" />
          <p className="text-xs font-semibold text-[#F4EFE8]">
            No series created yet
          </p>
          <p className="text-[11px] text-[#A39B91] max-w-xs mx-auto">
            Organize sermons, interviews, or season-based podcasts into series.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {seriesList.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 flex flex-col justify-between hover:border-[#F2B544]/40 transition-colors"
            >
              <div>
                <span className="text-[10px] font-mono text-[#F2B544] uppercase tracking-wider">
                  {s.category}
                </span>
                <h4 className="font-display font-bold text-sm text-[#F4EFE8] mt-1">
                  {s.title}
                </h4>
                {s.description && (
                  <p className="text-xs text-[#A39B91] line-clamp-2 mt-1">
                    {s.description}
                  </p>
                )}
              </div>
              <div className="pt-3 border-t border-[#2A2724] mt-3 flex items-center justify-between text-[11px] text-[#A39B91]">
                <span>Series Show</span>
                <span className="font-mono text-[#F4EFE8]">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Series Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0D0C]/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
              <h4 className="font-display font-bold text-base text-[#F4EFE8] flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#F2B544]" />
                <span>Create New Series</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#A39B91] hover:text-[#F4EFE8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A39B91]">
                  Series Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Walking in Faith Season 2"
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A39B91]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                >
                  <option value="Faith & Spirituality">Faith & Spirituality</option>
                  <option value="Talk & Commentary">Talk & Commentary</option>
                  <option value="Tech & Digital">Tech & Digital</option>
                  <option value="Culture & Society">Culture & Society</option>
                  <option value="Education & Learning">Education & Learning</option>
                  <option value="Music & Arts">Music & Arts</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A39B91]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this series about?"
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-[#FF4A3D] font-medium">{error}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full px-4 py-2 text-xs text-[#A39B91] hover:text-[#F4EFE8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-[#F2B544] px-5 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
