'use client'

import { useState } from 'react'
import { Headphones, AlertCircle, Sparkles } from 'lucide-react'
import { isCleanName, saveGuestName } from '@/lib/guest'

interface GuestNameModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (name: string) => void
}

export function GuestNameModal({ isOpen, onClose, onSuccess }: GuestNameModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError('Please enter a name between 2 and 30 characters.')
      return
    }

    if (!isCleanName(trimmed)) {
      setError('Please choose an appropriate name.')
      return
    }

    saveGuestName(trimmed)
    onSuccess(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">What should we call you?</h3>
            <p className="text-xs text-zinc-400">Enter a name before listening begins</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              autoFocus
              required
              minLength={2}
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or nickname"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>

          <div className="rounded-lg bg-zinc-800/60 p-3 text-[11px] text-zinc-400 border border-zinc-800">
            <p>
              💡 <span className="text-zinc-300 font-medium">The host can see your name while you listen</span>, along with other listeners in the room.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-500 shadow-md transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Tune In
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
