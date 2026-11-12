export interface Profile {
  id: string
  display_name: string
  avatar_url?: string | null
  is_admin: boolean
  is_suspended: boolean
  created_at: string
}

export interface Channel {
  id: string
  owner_id: string
  name: string
  slug: string
  description?: string | null
  cover_url?: string | null
  is_live: boolean
  current_listeners: number
  is_featured: boolean
  is_suspended: boolean
  created_at: string
}

export interface Show {
  id: string
  channel_id: string
  title: string
  started_at: string
  ended_at?: string | null
  peak_listeners: number
}

export interface Series {
  id: string
  channel_id: string
  title: string
  description?: string | null
  cover_url?: string | null
  category: string
  tags: string[]
  created_at: string
}

export interface Episode {
  id: string
  channel_id: string
  series_id?: string | null
  title: string
  description?: string | null
  audio_url: string
  duration_seconds: number
  file_size_bytes: number
  mime_type: string
  cover_url?: string | null
  category: string
  tags: string[]
  is_premium: boolean
  tier_required: string
  scheduled_for?: string | null
  is_published: boolean
  play_count: number
  created_at: string
  channels?: {
    name: string
    slug: string
    cover_url?: string | null
  }
  series?: {
    title: string
  }
}

export interface MonetizationSettings {
  id: string
  channel_id: string
  tipping_enabled: boolean
  custom_tipping_url?: string | null
  suggested_tips: number[] // amounts in cents
  membership_enabled: boolean
  monthly_price_cents: number
  annual_price_cents: number
  tier_name: string
  tier_perks: string[]
  created_at: string
  updated_at: string
}

export interface Tip {
  id: string
  channel_id: string
  from_user_id?: string | null
  from_name: string
  amount_cents: number
  currency: string
  message?: string | null
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  channel_id?: string | null
  episode_id?: string | null
  created_at: string
  channels?: Channel
  episodes?: Episode
}

export interface Playlist {
  id: string
  user_id: string
  title: string
  description?: string | null
  is_public: boolean
  created_at: string
  items_count?: number
}

export interface PlaylistItem {
  id: string
  playlist_id: string
  episode_id?: string | null
  recording_id?: string | null
  position: number
  added_at: string
  episodes?: Episode
  recordings?: Recording
}

export interface ScheduledShow {
  id: string
  channel_id: string
  title: string
  description?: string | null
  scheduled_at: string
  created_at: string
}

export interface Recording {
  id: string
  show_id?: string | null
  channel_id: string
  title: string
  audio_url: string
  duration_seconds: number
  file_size_bytes: number
  created_at: string
}

export interface ListenSession {
  id: string
  show_id?: string | null
  channel_id: string
  user_id?: string | null
  anon_id?: string | null
  display_name: string
  is_guest: boolean
  joined_at: string
  last_seen_at: string
  left_at?: string | null
  country?: string | null
  city?: string | null
  device_type?: string | null
  referrer?: string | null
}

export interface ChatMessage {
  id: string
  channel_id: string
  show_id?: string | null
  user_id?: string | null
  anon_id?: string | null
  display_name: string
  body: string
  created_at: string
  deleted: boolean
}

export interface Follow {
  user_id: string
  channel_id: string
  created_at: string
}

export interface Block {
  id: string
  channel_id: string
  user_id?: string | null
  anon_id?: string | null
  created_at: string
}
