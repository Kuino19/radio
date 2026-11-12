'use client'

import { useState } from 'react'
import { X, Check, Copy, Share2, Code2 } from 'lucide-react'

interface SocialShareModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  url: string
  subtitle?: string
}

export function SocialShareModal({
  isOpen,
  onClose,
  title,
  url,
  subtitle = 'Live speech & audio broadcast on LISNR',
}: SocialShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  if (!isOpen) return null

  // Extract channel slug from url (e.g. https://.../c/fgc-isheri -> fgc-isheri)
  const slugMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/)
  const channelSlug = slugMatch ? slugMatch[1] : ''
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lisnr.goanitech.com'
  const embedUrl = channelSlug ? `${baseUrl}/embed/${channelSlug}` : `${url}`
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="160" frameborder="0" allow="autoplay"></iframe>`

  const encodedUrl = encodeURIComponent(url)
  const shareText = `Listening to "${title}" on LISNR. Tune in live:`
  const encodedText = encodeURIComponent(shareText)

  // Social share URLs
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=LISNR,LiveRadio,Podcast`
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  const whatsAppUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${url}`)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopiedEmbed(true)
      setTimeout(() => setCopiedEmbed(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: subtitle,
          url,
        })
        onClose()
      } catch {
        // User cancelled
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0D0C]/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-7 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E0D0C] text-[#F2B544] border border-[#2A2724]">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#F4EFE8]">
                Share Broadcast
              </h3>
              <p className="text-xs text-[#A39B91] truncate max-w-[240px]">
                {title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#0E0D0C] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Social Buttons Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Twitter / X */}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-4 text-[#F4EFE8] hover:border-[#F2B544]/60 hover:text-[#F2B544] transition-all group"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-xs font-semibold">Twitter / X</span>
          </a>

          {/* LinkedIn */}
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-4 text-[#F4EFE8] hover:border-[#F2B544]/60 hover:text-[#F2B544] transition-all group"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            <span className="text-xs font-semibold">LinkedIn</span>
          </a>

          {/* WhatsApp */}
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-4 text-[#F4EFE8] hover:border-[#3DBE7A]/60 hover:text-[#3DBE7A] transition-all group"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.37.06-.56.28-.19.21-.73.72-.73 1.75s.75 2.03.85 2.17c.1.14 1.44 2.29 3.55 3.16.54.22.96.35 1.29.45.54.17 1.03.15 1.42.09.43-.06 1.33-.54 1.52-1.07.19-.52.19-.97.13-1.07-.06-.1-.23-.16-.49-.29-.26-.13-1.52-.75-1.76-.83-.23-.09-.4-.13-.57.13-.17.26-.66.83-.81 1-.15.17-.3.19-.56.06-.26-.13-1.1-.41-2.1-1.3-.78-.7-1.31-1.56-1.46-1.82-.15-.26-.02-.4.11-.53.12-.11.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.87-.2-.49-.41-.42-.56-.43z" />
            </svg>
            <span className="text-xs font-semibold">WhatsApp</span>
          </a>
        </div>

        {/* Copy Link Row */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#A39B91]">Share link</label>
          <div className="flex items-center gap-2 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-1.5 pl-3">
            <span className="text-xs font-mono text-[#F4EFE8] truncate flex-1 select-all">
              {url}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F2B544] px-3.5 py-2 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Embed Player Widget Generator */}
        {channelSlug && (
          <div className="space-y-2 pt-2 border-t border-[#2A2724]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#A39B91]">Embed Player on Website</label>
              <span className="text-[10px] text-[#F2B544] font-mono">HTML iframe</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] p-1.5 pl-3">
              <span className="text-[11px] font-mono text-[#A39B91] truncate flex-1 select-all">
                {embedCode}
              </span>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1816] border border-[#2A2724] px-3 py-2 text-xs font-bold text-[#F4EFE8] hover:border-[#F2B544] active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                {copiedEmbed ? <Check className="h-3.5 w-3.5 text-[#3DBE7A]" /> : <Code2 className="h-3.5 w-3.5 text-[#F2B544]" />}
                <span>{copiedEmbed ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Native mobile share if supported */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-[#2A2724] bg-[#0E0D0C] py-2.5 text-xs font-semibold text-[#F4EFE8] hover:border-[#F2B544]/50 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-[#F2B544]" />
            <span>More sharing options</span>
          </button>
        )}
      </div>
    </div>
  )
}
