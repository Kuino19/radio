'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, MessageSquare, Send, Users, X } from 'lucide-react'
import { LiveChat } from '@/components/LiveChat'
import { NativeShowAudio } from '@/components/NativeShowAudio'
import { usePlayer } from '@/context/PlayerContext'
import { getSavedGuestName, isCleanName, saveGuestName } from '@/lib/guest'

interface LiveShowExperienceProps {
  channelId: string
  channelSlug: string
  channelOwnerId: string
  showId: string
  initialListeners: number
  isLive: boolean
  streamUrl: string
  recordingUrl?: string | null
  currentUserId?: string | null
  currentUserDisplayName?: string | null
  isOwner?: boolean
}

export function LiveShowExperience({
  channelId,
  channelSlug,
  channelOwnerId,
  showId,
  initialListeners,
  isLive,
  streamUrl,
  recordingUrl,
  currentUserId,
  currentUserDisplayName,
  isOwner = false,
}: LiveShowExperienceProps) {
  const { setListenerName } = usePlayer()
  const [identityReady, setIdentityReady] = useState(false)
  const [guestName, setGuestName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [listenerCount, setListenerCount] = useState(initialListeners)
  const [chatOpen, setChatOpen] = useState(false)
  const closeChatRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (currentUserId) {
      const name = currentUserDisplayName || 'Listener'
      setGuestName(name)
      setListenerName(name)
      setIdentityReady(true)
      return
    }

    const savedName = getSavedGuestName()
    setGuestName(savedName)
    setNameInput(savedName || '')
    if (savedName) setListenerName(savedName)
    setIdentityReady(true)
  }, [currentUserId, currentUserDisplayName])

  const displayName = currentUserId ? currentUserDisplayName || guestName : guestName

  useEffect(() => {
    if (!chatOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeChatRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setChatOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [chatOpen])

  const handleNameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNameError(null)
    const cleanedName = nameInput.trim()

    if (cleanedName.length < 2 || cleanedName.length > 30) {
      setNameError('Enter a name between 2 and 30 characters.')
      return
    }
    if (!isCleanName(cleanedName)) {
      setNameError('Please choose a different name.')
      return
    }

    try {
      saveGuestName(cleanedName)
      setGuestName(cleanedName)
      setListenerName(cleanedName)
    } catch {
      setNameError('Your browser could not save that name. Please try again.')
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="lg:hidden">
        <NativeShowAudio
          channelId={channelId}
          showId={showId}
          isLive={isLive}
          streamUrl={streamUrl}
          recordingUrl={recordingUrl}
          displayName={displayName || null}
          userId={currentUserId || null}
          onActiveListeners={setListenerCount}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#2A2724] bg-[#100F0D] px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm text-[#C7BFB4]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2B544]/10 text-[#F2B544]">
            <Users className="h-4 w-4" />
          </span>
          <span><strong className="font-bold text-[#F4EFE8]">{listenerCount}</strong> listening now</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#746E66]">Live audience</span>
      </div>

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="flex min-h-[68px] w-full items-center justify-between gap-3 rounded-2xl border border-[#342D23] bg-[linear-gradient(145deg,#1D1A16,#141210)] px-4 py-3 text-left shadow-[0_10px_32px_rgba(0,0,0,0.18)] transition hover:border-[#F2B544]/40 active:scale-[0.99] sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2B544]/10 text-[#F2B544]"><MessageSquare className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block font-semibold text-[#F4EFE8]">Live chat</span>
            <span className="mt-0.5 block truncate text-xs text-[#A39B91]">{displayName ? `Join the conversation as ${displayName}` : 'Tap to comment and join the audience'}</span>
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-[#3A3020] px-3 py-1.5 text-xs font-semibold text-[#F2B544]">Open</span>
      </button>

      {chatOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setChatOpen(false) }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="live-chat-dialog-title" className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#39332A] bg-[#151311] p-3 shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl sm:p-4">
            <header className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2B544]/10 text-[#F2B544]"><MessageSquare className="h-4 w-4" /></span>
                <div>
                  <h2 id="live-chat-dialog-title" className="font-display font-bold text-[#F4EFE8]">Live chat</h2>
                  <p className="text-[11px] text-[#A39B91]">Talk with the host and listeners</p>
                </div>
              </div>
              <button ref={closeChatRef} type="button" onClick={() => setChatOpen(false)} aria-label="Close live chat" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#39332A] text-[#C7BFB4] transition hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
            </header>

            {!identityReady ? (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#2A2724] bg-[#1A1816] text-sm text-[#A39B91]">Preparing live chat…</div>
            ) : displayName ? (
              <LiveChat
                channelId={channelId}
                channelSlug={channelSlug}
                showId={showId}
                channelOwnerId={channelOwnerId}
                currentUserId={currentUserId}
                currentUserDisplayName={displayName}
                isOwner={isOwner}
                hideHeader
              />
            ) : (
              <section className="rounded-2xl border border-[#342D23] bg-[linear-gradient(145deg,#1D1A16,#141210)] p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E0D0C] text-[#F2B544]"><MessageSquare className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#F4EFE8]">Join the conversation</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#A39B91]">Pick a name to comment and be counted in the live audience.</p>
                  </div>
                </div>
                <form onSubmit={handleNameSubmit} className="flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="listener-display-name" className="sr-only">Your display name</label>
                  <input id="listener-display-name" autoComplete="nickname" maxLength={30} minLength={2} required value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Your name or nickname" className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#39332A] bg-[#0E0D0C] px-4 text-base text-[#F4EFE8] placeholder:text-[#746E66] transition focus:border-[#F2B544] focus:outline-none focus:ring-2 focus:ring-[#F2B544]/15" />
                  <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F2B544] px-5 text-sm font-bold text-[#0E0D0C] shadow-[0_8px_24px_rgba(242,181,68,0.14)] transition hover:brightness-105 active:scale-[0.98]"><Send className="h-4 w-4" />Join chat</button>
                </form>
                {nameError && <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-[#FF6B60]"><AlertCircle className="h-4 w-4 shrink-0" />{nameError}</p>}
              </section>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
