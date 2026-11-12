'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FollowButtonProps {
  channelId: string
  initialFollowers: number
  initialIsFollowing: boolean
  userId: string | null
}

export function FollowButton({
  channelId,
  initialFollowers,
  initialIsFollowing,
  userId,
}: FollowButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowers)
  const [loading, setLoading] = useState(false)

  // Realtime follower count updates
  useEffect(() => {
    const channelSub = supabase
      .channel(`realtime_follows_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `channel_id=eq.${channelId}`,
        },
        async () => {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channelId)

          if (typeof count === 'number') {
            setFollowerCount(count)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelSub)
    }
  }, [channelId, supabase])

  const handleToggleFollow = async () => {
    if (!userId) {
      router.push('/login')
      return
    }

    setLoading(true)

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('user_id', userId)
        .eq('channel_id', channelId)

      if (!error) {
        setIsFollowing(false)
        setFollowerCount((prev) => Math.max(0, prev - 1))
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          user_id: userId,
          channel_id: channelId,
        })

      if (!error) {
        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)
      }
    }

    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
        isFollowing
          ? 'border border-[#F2B544] bg-[#F2B544]/15 text-[#F2B544] hover:bg-[#F2B544]/25'
          : 'border border-[#2A2724] bg-[#1A1816] text-[#F4EFE8] hover:border-[#F2B544]/60 hover:text-[#F2B544]'
      }`}
      title={isFollowing ? 'Unfollow channel' : 'Follow channel'}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F2B544]" />
      ) : (
        <Heart
          className={`h-3.5 w-3.5 ${
            isFollowing ? 'fill-[#F2B544] text-[#F2B544]' : 'text-[#A39B91]'
          }`}
        />
      )}
      <span>{isFollowing ? 'Following' : 'Follow'}</span>
      <span className="font-mono text-[11px] text-[#A39B91] ml-0.5">({followerCount})</span>
    </button>
  )
}
