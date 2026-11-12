'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UploadCloud,
  X,
  FileAudio,
  CheckCircle2,
  Calendar,
  Lock,
  Globe,
  Tag,
  Loader2,
  Image as ImageIcon,
  Clock,
  Sparkles,
} from 'lucide-react'
import type { Series } from '@/types/database'

interface AudioUploadModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  existingSeries?: Series[]
  onUploadSuccess?: () => void
}

export function AudioUploadModal({
  isOpen,
  onClose,
  channelId,
  existingSeries = [],
  onUploadSuccess,
}: AudioUploadModalProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  // File states
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [durationSeconds, setDurationSeconds] = useState<number>(0)
  const [isDragging, setIsDragging] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [seriesId, setSeriesId] = useState<string>('')
  const [category, setCategory] = useState('Faith & Spirituality')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [tierRequired, setTierRequired] = useState('supporter')
  const [publishMode, setPublishMode] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledDate, setScheduledDate] = useState('')

  // Uploading state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const categories = [
    'Faith & Spirituality',
    'Talk & Commentary',
    'Tech & Digital',
    'Culture & Society',
    'Education & Learning',
    'Music & Arts',
    'Business & Money',
    'News & Politics',
  ]

  // Extract duration from audio file using browser audio element
  const processAudioFile = (file: File) => {
    // Validate format
    const validExtensions = ['.mp3', '.aac', '.m4a', '.opus', '.wav', '.ogg']
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    const hasValidMime = file.type.startsWith('audio/') || file.name.endsWith('.m4a') || file.name.endsWith('.opus')

    if (!hasValidExt && !hasValidMime) {
      setError('Unsupported audio format. Please upload an MP3, AAC, M4A, or OPUS file.')
      return
    }

    setAudioFile(file)
    setError(null)
    if (!title) {
      // Auto-set title from filename without extension
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTitle(baseName)
    }

    // Measure duration
    const audioObj = new Audio()
    audioObj.src = URL.createObjectURL(file)
    audioObj.onloadedmetadata = () => {
      if (audioObj.duration && !isNaN(audioObj.duration)) {
        setDurationSeconds(Math.round(audioObj.duration))
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0])
    }
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '')
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!audioFile) {
      setError('Please select an audio file to upload.')
      return
    }
    if (!title.trim()) {
      setError('Please provide an episode title.')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      // 1. Upload audio file to Supabase storage 'episodes' bucket
      const timestamp = Date.now()
      const sanitizedName = audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const audioStoragePath = `${channelId}/${timestamp}_${sanitizedName}`

      setUploadProgress(30)
      const { error: audioUploadError } = await supabase.storage
        .from('episodes')
        .upload(audioStoragePath, audioFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (audioUploadError) {
        throw new Error(`Audio upload failed: ${audioUploadError.message}`)
      }

      setUploadProgress(60)
      const { data: audioPublicUrlData } = supabase.storage
        .from('episodes')
        .getPublicUrl(audioStoragePath)

      const finalAudioUrl = audioPublicUrlData.publicUrl

      // 2. Upload cover art if provided
      let finalCoverUrl: string | null = null
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop() || 'jpg'
        const coverPath = `${channelId}/covers/${timestamp}.${coverExt}`
        const { error: coverUploadError } = await supabase.storage
          .from('covers')
          .upload(coverPath, coverFile, {
            cacheControl: '3600',
            upsert: true,
          })

        if (!coverUploadError) {
          const { data: coverUrlData } = supabase.storage
            .from('covers')
            .getPublicUrl(coverPath)
          finalCoverUrl = coverUrlData.publicUrl
        }
      }

      setUploadProgress(85)

      // 3. Insert record into `episodes` table
      const isScheduled = publishMode === 'scheduled' && !!scheduledDate
      const { error: dbError } = await supabase.from('episodes').insert({
        channel_id: channelId,
        series_id: seriesId || null,
        title: title.trim(),
        description: description.trim(),
        audio_url: finalAudioUrl,
        duration_seconds: durationSeconds,
        file_size_bytes: audioFile.size,
        mime_type: audioFile.type || 'audio/mpeg',
        cover_url: finalCoverUrl,
        category,
        tags,
        is_premium: isPremium,
        tier_required: isPremium ? tierRequired : 'free',
        scheduled_for: isScheduled ? new Date(scheduledDate).toISOString() : null,
        is_published: !isScheduled,
        play_count: 0,
      })

      if (dbError) {
        throw new Error(`Failed to save episode details: ${dbError.message}`)
      }

      setUploadProgress(100)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        if (onUploadSuccess) onUploadSuccess()
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0D0C]/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-8 space-y-6 shadow-2xl my-8 relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0E0D0C] text-[#F2B544] border border-[#2A2724]">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-[#F4EFE8]">
                Upload Audio Episode
              </h2>
              <p className="text-xs text-[#A39B91]">
                Publish on-demand speech, sermon or podcast show
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#0E0D0C] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#3DBE7A]/20 text-[#3DBE7A] border border-[#3DBE7A]/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-2xl text-[#F4EFE8]">
              {publishMode === 'scheduled' ? 'Episode Scheduled!' : 'Episode Published!'}
            </h3>
            <p className="text-sm text-[#A39B91] max-w-sm mx-auto">
              &ldquo;{title}&rdquo; has been successfully uploaded and is ready for your listeners.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Drag & Drop Audio Upload Zone */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                Audio File (MP3, AAC, M4A, OPUS)
              </label>

              {!audioFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#F2B544] bg-[#F2B544]/5 scale-[0.99]'
                      : 'border-[#2A2724] bg-[#0E0D0C] hover:border-[#F2B544]/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/aac,audio/m4a,audio/mp4,audio/opus,audio/ogg,audio/wav"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processAudioFile(e.target.files[0])
                      }
                    }}
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#1A1816] border border-[#2A2724] flex items-center justify-center text-[#F2B544]">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-[#F4EFE8]">
                        Drag & Drop your audio file here, or <span className="text-[#F2B544]">Browse</span>
                      </p>
                      <p className="text-xs text-[#A39B91] mt-1">
                        Supports MP3, AAC, M4A, and OPUS formats up to 100MB
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#1A1816] border border-[#2A2724] flex items-center justify-center text-[#F2B544] shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#F4EFE8] truncate">
                        {audioFile.name}
                      </p>
                      <p className="font-mono text-xs text-[#A39B91]">
                        {formatBytes(audioFile.size)} • {durationSeconds > 0 ? formatDuration(durationSeconds) : 'Analyzing...'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioFile(null)
                      setDurationSeconds(0)
                    }}
                    className="text-xs font-semibold text-[#A39B91] hover:text-[#FF4A3D] transition-colors px-2 py-1"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>

            {/* 2. Metadata: Title, Description, Cover Art */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Cover Art Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                  Cover Art
                </label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="aspect-square rounded-2xl border border-dashed border-[#2A2724] bg-[#0E0D0C] flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-[#F2B544]/60 transition-colors relative overflow-hidden group"
                >
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleCoverSelect}
                  />
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverPreview}
                      alt="Cover Preview"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="space-y-1 text-[#A39B91] group-hover:text-[#F2B544] transition-colors">
                      <ImageIcon className="w-8 h-8 mx-auto" />
                      <span className="text-[11px] block font-medium">Add Cover</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="sm:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                    Episode Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Episode 12: Finding Peace in Turbulent Times"
                    className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                    Show / Series
                  </label>
                  <select
                    value={seriesId}
                    onChange={(e) => setSeriesId(e.target.value)}
                    className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none transition-colors"
                  >
                    <option value="">Standalone Episode (No Series)</option>
                    {existingSeries.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                Description / Show Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key scriptures, discussion takeaways, or chapter markers..."
                className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* 3. Category & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91]">
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Add tag and hit enter"
                    className="flex-1 rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3 py-2 text-xs font-semibold text-[#F2B544] hover:border-[#F2B544]/50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Rendered tag pills */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0E0D0C] border border-[#2A2724] px-3 py-1 text-[11px] text-[#A39B91]"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-[#FF4A3D]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 4. Scheduling & Monetization Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#2A2724]">
              {/* Release Schedule */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F2B544]" />
                  <span>Release Schedule</span>
                </label>
                <div className="flex rounded-2xl bg-[#0E0D0C] p-1 border border-[#2A2724]">
                  <button
                    type="button"
                    onClick={() => setPublishMode('immediate')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      publishMode === 'immediate'
                        ? 'bg-[#1A1816] text-[#F4EFE8] shadow-sm'
                        : 'text-[#A39B91] hover:text-[#F4EFE8]'
                    }`}
                  >
                    Publish Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishMode('scheduled')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      publishMode === 'scheduled'
                        ? 'bg-[#1A1816] text-[#F2B544] shadow-sm'
                        : 'text-[#A39B91] hover:text-[#F4EFE8]'
                    }`}
                  >
                    Schedule Later
                  </button>
                </div>

                {publishMode === 'scheduled' && (
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                  />
                )}
              </div>

              {/* Paywall / Monetization Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A39B91] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#F2B544]" />
                  <span>Access & Paywall</span>
                </label>
                <div className="flex rounded-2xl bg-[#0E0D0C] p-1 border border-[#2A2724]">
                  <button
                    type="button"
                    onClick={() => setIsPremium(false)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      !isPremium
                        ? 'bg-[#1A1816] text-[#3DBE7A] shadow-sm'
                        : 'text-[#A39B91] hover:text-[#F4EFE8]'
                    }`}
                  >
                    Free for All
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPremium(true)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isPremium
                        ? 'bg-[#1A1816] text-[#F2B544] shadow-sm'
                        : 'text-[#A39B91] hover:text-[#F4EFE8]'
                    }`}
                  >
                    Members Only
                  </button>
                </div>

                {isPremium && (
                  <p className="text-[11px] text-[#A39B91]">
                    Restricted to your paying subscribers and supporters.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-xs text-[#FF4A3D] font-medium bg-[#FF4A3D]/10 border border-[#FF4A3D]/20 p-3 rounded-2xl">
                {error}
              </p>
            )}

            {/* Submit & Progress */}
            <div className="space-y-2 pt-2">
              {uploading && (
                <div className="w-full bg-[#0E0D0C] rounded-full h-2 overflow-hidden border border-[#2A2724]">
                  <div
                    className="bg-[#F2B544] h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[#F2B544] py-3.5 text-sm font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0E0D0C]" />
                    <span>Uploading Audio ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0E0D0C]" />
                    <span>
                      {publishMode === 'scheduled' ? 'Schedule Episode' : 'Upload & Publish Now'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
