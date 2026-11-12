// Guest identity and name validation

const BLOCKED_WORDS = [
  'nigger', 'nigga', 'faggot', 'cunt', 'bitch', 'asshole', 'whore', 'slut', 'fuck', 'shit'
]

export function isCleanName(name: string): boolean {
  const lower = name.toLowerCase()
  return !BLOCKED_WORDS.some((word) => lower.includes(word))
}

export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('lisnr_anon_id')
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
    localStorage.setItem('lisnr_anon_id', id)
  }
  return id
}

export function getSavedGuestName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('lisnr_guest_name')
}

export function saveGuestName(name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('lisnr_guest_name', name.trim())
  getOrCreateAnonId() // ensure anon id is created
}
