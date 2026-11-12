'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Channel } from '@/types/database'
import { X, Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react'

interface EditChannelModalProps {
  channel: Channel
  isOpen: boolean
  onClose: () => void
  onUpdated: (updated: Channel) => void
}

export function EditChannelModal({
  channel,
  isOpen,
  onClose,
  onUpdated,
}: EditChannelModalProps) {
  const supabase = createClient()

  const [name, setName] = useState(channel.name)
  const [description, setDescription] = useState(channel.description || '')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(channel.cover_url || null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
      setErrorMsg(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      let finalCoverUrl = channel.cover_url

      // If user selected a new cover image, upload it
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop() || 'png'
        const filePath = `${channel.owner_id}/${channel.slug}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(filePath, coverFile, {
            cacheControl: '3600',
            upsert: true,
          })

        if (uploadError) {
          // If the storage bucket is missing or RLS blocked
          if (uploadError.message.toLowerCase().includes('bucket not found')) {
            throw new Error(
              "Supabase Storage bucket 'covers' not found. Please create a public bucket named 'covers' in your Supabase Dashboard under Storage."
            )
          }
          throw new Error(`Cover upload error: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('covers')
          .getPublicUrl(filePath)

        finalCoverUrl = urlData.publicUrl
      }

      // Update channel in Supabase
      const { data, error: updateError } = await supabase
        .from('channels')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          cover_url: finalCoverUrl,
        })
        .eq('id', channel.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccessMsg('Station details updated successfully!')
      onUpdated(data as Channel)

      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update channel'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0E0D0C] border border-[#2A2724] flex items-center justify-center text-[#F2B544]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[#F4EFE8]">
                Edit Station & Cover Art
              </h2>
              <p className="font-mono text-xs text-[#A39B91]">
                /c/{channel.slug}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#2A2724] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-[#FF4A3D]/40 bg-[#FF4A3D]/10 p-3.5 text-xs text-[#FF4A3D]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#3DBE7A]/40 bg-[#3DBE7A]/10 p-3.5 text-xs text-[#3DBE7A]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Cover Art Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A39B91] uppercase tracking-wider">
              Station Logo / Cover Artwork
            </label>
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-[#2A2724] bg-[#0E0D0C]">
              {coverPreview ? (
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-[#2A2724] shrink-0 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreview}
                    alt="Station cover preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-[#2A2724] bg-[#1A1816] text-[#F2B544] font-bold text-lg shrink-0">
                  {name.slice(0, 2).toUpperCase() || 'ST'}
                </div>
              )}

              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  id="station-cover-file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="station-cover-file"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#2A2724] bg-[#1A1816] px-4 py-2 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544]/60 hover:text-[#F2B544] transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{coverPreview ? 'Change Image' : 'Upload Image'}</span>
                </label>
                <p className="text-[11px] text-[#A39B91]">
                  PNG, JPG, WebP, or SVG. Square icon recommended.
                </p>
              </div>
            </div>
          </div>

          {/* Station Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A39B91] uppercase tracking-wider">
              Station Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FGC Isheri Radio"
              className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A39B91] uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell listeners what your station is about..."
              className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-[#2A2724] bg-[#0E0D0C] px-5 py-2.5 text-xs font-semibold text-[#A39B91] hover:text-[#F4EFE8] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[#F2B544] px-6 py-2.5 text-xs sm:text-sm font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[#0E0D0C]" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
