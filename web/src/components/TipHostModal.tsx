'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Heart, Sparkles, CheckCircle2, Loader2, DollarSign } from 'lucide-react'

interface TipHostModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  channelName: string
  hostName?: string | null
  currentUserId?: string | null
  currentUserDisplayName?: string | null
}

export function TipHostModal({
  isOpen,
  onClose,
  channelId,
  channelName,
  hostName,
  currentUserId,
  currentUserDisplayName,
}: TipHostModalProps) {
  const supabase = createClient()
  const [amountCents, setAmountCents] = useState<number>(500) // Default $5
  const [customAmount, setCustomAmount] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [senderName, setSenderName] = useState<string>(currentUserDisplayName || '')
  const [loading, setLoading] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const presetAmounts = [
    { label: '$2', cents: 200 },
    { label: '$5', cents: 500 },
    { label: '$10', cents: 1000 },
    { label: '$25', cents: 2500 },
  ]

  const handlePresetClick = (cents: number) => {
    setAmountCents(cents)
    setCustomAmount('')
  }

  const handleCustomChange = (val: string) => {
    setCustomAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      setAmountCents(Math.round(num * 100))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amountCents <= 0) {
      setError('Please select or enter a valid tip amount.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: insertError } = await supabase.from('tips').insert({
        channel_id: channelId,
        from_user_id: currentUserId || null,
        from_name: senderName.trim() || 'Generous Listener',
        amount_cents: amountCents,
        currency: 'USD',
        message: message.trim(),
      })

      if (insertError) {
        throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2200)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not process tip'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0D0C]/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-7 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E0D0C] text-[#F2B544] border border-[#2A2724]">
              <Heart className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#F4EFE8]">
                Tip the Host
              </h3>
              <p className="text-xs text-[#A39B91]">
                Support {hostName || channelName}
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

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#3DBE7A]/20 text-[#3DBE7A] border border-[#3DBE7A]/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-display font-bold text-lg text-[#F4EFE8]">
              Tip Sent! Thank you.
            </h4>
            <p className="text-xs text-[#A39B91]">
              ${(amountCents / 100).toFixed(2)} sent to {channelName}. Your support keeps the broadcast on air.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A39B91]">
                Select amount
              </label>
              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map((p) => {
                  const isSelected = amountCents === p.cents && !customAmount
                  return (
                    <button
                      key={p.cents}
                      type="button"
                      onClick={() => handlePresetClick(p.cents)}
                      className={`py-2.5 rounded-2xl font-mono text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-[#F2B544] text-[#0E0D0C] shadow-md shadow-[#F2B544]/20'
                          : 'bg-[#0E0D0C] text-[#F4EFE8] border border-[#2A2724] hover:border-[#F2B544]/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>

              {/* Custom amount field */}
              <div className="relative mt-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#A39B91]">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] pl-8 pr-4 py-2.5 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none"
                />
              </div>
            </div>

            {/* Sender Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#A39B91]">
                Your Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Samuel or Anonymous"
                className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2.5 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none"
              />
            </div>

            {/* Note / Message */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#A39B91]">
                Encouraging note (Optional)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Loving the show, keep going!"
                className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none resize-none"
              />
            </div>

            {error && (
              <p className="text-[11px] text-[#FF4A3D] font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#F2B544] py-3 text-xs sm:text-sm font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0E0D0C]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#0E0D0C]" />
              )}
              <span>Send ${(amountCents / 100).toFixed(2)} Tip</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
