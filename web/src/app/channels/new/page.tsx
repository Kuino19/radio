'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Radio, Sparkles, AlertCircle, Loader2, Upload } from 'lucide-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewChannelPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (!isSlugManual) {
      setSlug(slugify(val))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManual(true)
    setSlug(slugify(e.target.value))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    // Validate slug
    const cleanSlug = slug.trim().toLowerCase()
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(cleanSlug) || cleanSlug.length < 3 || cleanSlug.length > 50) {
      setErrorMsg('Slug must be between 3 and 50 characters, using only lowercase letters, numbers, and hyphens.')
      setLoading(false)
      return
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setErrorMsg('Please log in first to create a channel.')
      setLoading(false)
      return
    }

    let coverUrl: string | null = null

    // Upload cover image if provided
    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop()
      const filePath = `${user.id}/${cleanSlug}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, coverFile, { upsert: true })

      if (uploadError) {
        // Continue even if upload fails, but inform or keep url null
        console.warn('Cover upload warning:', uploadError.message)
      } else {
        const { data: urlData } = supabase.storage
          .from('covers')
          .getPublicUrl(filePath)
        coverUrl = urlData.publicUrl
      }
    }

    // Insert channel
    const { data, error } = await supabase
      .from('channels')
      .insert({
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim() || null,
        cover_url: coverUrl,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        setErrorMsg(`The handle "${cleanSlug}" is already taken. Please choose another.`)
      } else {
        setErrorMsg(error.message)
      }
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Create your Channel
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Set up your audio station. You can start broadcasting right away.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Channel Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Grace Fellowship Sunday Service"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>

          {/* Channel Slug / Handle */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Channel URL Handle (Slug) *
            </label>
            <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
              <span className="text-xs text-zinc-500 select-none">lisnr.app/c/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="grace-fellowship"
                className="w-full bg-transparent px-1 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              Your listeners will visit this link to tune in. Letters, numbers, and hyphens only.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell listeners what your station is about..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Cover Artwork (Optional)
            </label>
            <div className="flex items-center gap-4">
              {coverPreview ? (
                <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/40 text-zinc-500 shrink-0">
                  <Upload className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  id="cover-upload"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="cover-upload"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {coverPreview ? 'Change image' : 'Choose cover image'}
                </label>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  JPG, PNG or WebP. Square aspect ratio recommended.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name || !slug}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 py-3 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-950/50 transition-all"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Channel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
