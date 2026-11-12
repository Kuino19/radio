'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSavedGuestName, getOrCreateAnonId } from '@/lib/guest'
import { GuestNameModal } from '@/components/GuestNameModal'
import {
  Send,
  Trash2,
  Ban,
  ShieldAlert,
  Loader2,
  Sparkles,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import type { ChatMessage } from '@/types/database'

interface LiveChatProps {
  channelId: string
  channelSlug: string
  channelOwnerId: string
  currentUserId?: string | null
  currentUserDisplayName?: string | null
  isOwner?: boolean
}

export function LiveChat({
  channelId,
  channelSlug,
  channelOwnerId,
  currentUserId,
  currentUserDisplayName,
  isOwner = false,
}: LiveChatProps) {
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [guestName, setGuestName] = useState<string | null>(null)
  const [anonId, setAnonId] = useState<string>('')

  // Check guest name & anonId
  useEffect(() => {
    if (!currentUserId) {
      const saved = getSavedGuestName()
      if (saved) setGuestName(saved)
      const aid = getOrCreateAnonId()
      setAnonId(aid)
    }
  }, [currentUserId])

  const effectiveDisplayName = currentUserDisplayName || guestName

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  // 1. Fetch initial messages & check block status
  useEffect(() => {
    let isMounted = true

    async function loadChat() {
      setLoading(true)

      // Fetch last 50 messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .eq('deleted', false)
        .order('created_at', { ascending: true })
        .limit(50)

      if (!error && data && isMounted) {
        setMessages(data as ChatMessage[])
        setTimeout(() => scrollToBottom(false), 100)
      }

      // Check if current user / anon_id is blocked
      const userBlockedQuery = currentUserId
        ? supabase.from('blocks').select('id').eq('channel_id', channelId).eq('user_id', currentUserId).maybeSingle()
        : null
      const anonBlockedQuery = anonId
        ? supabase.from('blocks').select('id').eq('channel_id', channelId).eq('anon_id', anonId).maybeSingle()
        : null

      const [userRes, anonRes] = await Promise.all([userBlockedQuery, anonBlockedQuery])
      if (isMounted && ((userRes && userRes.data) || (anonRes && anonRes.data))) {
        setIsBlocked(true)
      }

      if (isMounted) setLoading(false)
    }

    loadChat()

    return () => {
      isMounted = false
    }
  }, [channelId, currentUserId, anonId, supabase, scrollToBottom])

  // 2. Realtime Subscription
  useEffect(() => {
    const channelSub = supabase
      .channel(`realtime_chat_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          if (!newMsg.deleted) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            setTimeout(() => scrollToBottom(true), 50)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as ChatMessage
          if (updatedMsg.deleted) {
            // Remove deleted messages from active view
            setMessages((prev) => prev.filter((m) => m.id !== updatedMsg.id))
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelSub)
    }
  }, [channelId, supabase, scrollToBottom])

  // Cooldown countdown timer (rate limit 2 seconds)
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // 3. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (isBlocked) {
      setErrorMsg('You have been blocked from sending messages in this station.')
      return
    }

    if (!effectiveDisplayName) {
      setShowGuestModal(true)
      return
    }

    const trimmed = inputText.trim()
    if (!trimmed) return
    if (trimmed.length > 500) {
      setErrorMsg('Message exceeds 500 characters.')
      return
    }

    if (cooldown > 0) {
      setErrorMsg(`Please wait ${cooldown}s before sending another message.`)
      return
    }

    setSending(true)

    const payload: Partial<ChatMessage> = {
      channel_id: channelId,
      display_name: effectiveDisplayName,
      body: trimmed,
      user_id: currentUserId || null,
      anon_id: currentUserId ? null : anonId || getOrCreateAnonId(),
    }

    const { error } = await supabase.from('chat_messages').insert(payload)

    if (error) {
      console.warn('Chat send error:', error)
      setErrorMsg(error.message || 'Failed to send message.')
    } else {
      setInputText('')
      setCooldown(2) // 2-second anti-spam cooldown
    }

    setSending(false)
  }

  // 4. Host Moderation: Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!isOwner) return
    await supabase
      .from('chat_messages')
      .update({ deleted: true })
      .eq('id', messageId)
      .eq('channel_id', channelId)
  }

  // 5. Host Moderation: Block user/guest
  const handleBlockUser = async (msg: ChatMessage) => {
    if (!isOwner) return
    if (msg.user_id === channelOwnerId) return // Cannot block self

    const confirmBlock = confirm(`Block ${msg.display_name} from this station?`)
    if (!confirmBlock) return

    await supabase.from('blocks').insert({
      channel_id: channelId,
      user_id: msg.user_id || null,
      anon_id: msg.user_id ? null : msg.anon_id || null,
    })

    // Also delete their message
    await handleDeleteMessage(msg.id)
  }

  return (
    <div className="flex flex-col h-[520px] rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-red-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Live Chat
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Realtime
        </span>
      </div>

      {/* Messages List */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            <span>Connecting to chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">No messages yet</p>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Say hello or leave a reaction for the host!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMsgOwner = msg.user_id === channelOwnerId
            const isMsgGuest = !msg.user_id

            return (
              <div
                key={msg.id}
                className="group relative flex flex-col rounded-xl p-2 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs font-bold ${
                        isMsgOwner ? 'text-red-400' : 'text-zinc-200'
                      }`}
                    >
                      {msg.display_name}
                    </span>

                    {/* Host badge */}
                    {isMsgOwner && (
                      <span className="rounded bg-red-600/20 border border-red-500/40 px-1 py-0.2 text-[9px] font-black uppercase tracking-wider text-red-400">
                        Host
                      </span>
                    )}

                    {/* Guest badge */}
                    {isMsgGuest && (
                      <span className="rounded bg-zinc-800 border border-zinc-700 px-1 py-0.2 text-[9px] font-medium text-zinc-400">
                        guest
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-zinc-500">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 mt-1 leading-relaxed break-words">
                  {msg.body}
                </p>

                {/* Host Moderation Controls (Hover) */}
                {isOwner && (
                  <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg p-0.5 shadow-md">
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 text-zinc-400 hover:text-red-400 rounded transition-colors"
                      title="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {!isMsgOwner && (
                      <button
                        type="button"
                        onClick={() => handleBlockUser(msg)}
                        className="p-1 text-zinc-400 hover:text-amber-400 rounded transition-colors"
                        title="Block this person"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Blocked or Error Banner */}
      {isBlocked && (
        <div className="flex items-center gap-2 bg-red-950/60 border-t border-red-500/30 p-2.5 text-xs text-red-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>You have been blocked from sending messages in this station.</span>
        </div>
      )}

      {errorMsg && !isBlocked && (
        <div className="flex items-center gap-2 bg-zinc-950 border-t border-red-500/30 p-2 text-[11px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="border-t border-zinc-800 p-3 bg-zinc-950/90">
        {!effectiveDisplayName ? (
          <div className="flex items-center justify-between gap-2 p-1 text-xs">
            <span className="text-zinc-400">Want to join the conversation?</span>
            <button
              type="button"
              onClick={() => setShowGuestModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-500 transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Set Name to Chat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={isBlocked || sending}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={500}
                placeholder={
                  isBlocked
                    ? 'Chat disabled (blocked)'
                    : `Message as ${effectiveDisplayName}...`
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 transition-colors"
              />
              <button
                type="submit"
                disabled={isBlocked || sending || !inputText.trim() || cooldown > 0}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-red-950/40"
                title={cooldown > 0 ? `Wait ${cooldown}s` : 'Send message'}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
              <span>
                Chatting as <strong className="text-zinc-300">{effectiveDisplayName}</strong>
              </span>
              <span>{inputText.length}/500</span>
            </div>
          </form>
        )}
      </div>

      <GuestNameModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onSuccess={(name) => {
          setGuestName(name)
          setShowGuestModal(false)
        }}
      />
    </div>
  )
}
