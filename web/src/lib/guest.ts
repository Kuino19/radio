// Guest identity and name validation

const BLOCKED_WORDS = [
  'nigger', 'nigga', 'faggot', 'cunt', 'bitch', 'asshole', 'whore', 'slut', 'fuck', 'shit'
]

let inMemoryAnonId: string | null = null
let inMemoryGuestName: string | null = null

export function isCleanName(name: string): boolean {
  const lower = name.toLowerCase()
  return !BLOCKED_WORDS.some((word) => lower.includes(word))
}

export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem('lisnr_anon_id')
    if (!id) {
      id = inMemoryAnonId || 'anon_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
      localStorage.setItem('lisnr_anon_id', id)
    }
    inMemoryAnonId = id
    return id
  } catch {
    inMemoryAnonId ||= 'anon_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
    return inMemoryAnonId
  }
}

export function getSavedGuestName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('lisnr_guest_name') || inMemoryGuestName
  } catch {
    return inMemoryGuestName
  }
}

export function saveGuestName(name: string): void {
  if (typeof window === 'undefined') return
  inMemoryGuestName = name.trim()
  try {
    localStorage.setItem('lisnr_guest_name', name.trim())
  } catch {
    // Keep the name in memory for this page session if storage is unavailable.
  }
  getOrCreateAnonId() // ensure anon id is created
}
