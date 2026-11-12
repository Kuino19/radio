import Link from 'next/link'
import { Radio, Mic, User as UserIcon, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BrandWordmark } from '@/components/BrandWordmark'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let isAdmin = false

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, is_admin')
      .eq('id', user.id)
      .single()
    profile = data

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase())
    isAdmin = profile?.is_admin === true || adminEmails.includes((user.email || '').toLowerCase())
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2A2724] bg-[#0E0D0C]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand signature */}
        <div className="flex items-center gap-6">
          <BrandWordmark size="md" />

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/explore"
              className="text-[#F4EFE8] font-medium hover:text-[#F2B544] transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/library"
              className="text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
            >
              Library
            </Link>
            <Link
              href="/#for-hosts"
              className="text-[#A39B91] hover:text-[#F4EFE8] transition-colors"
            >
              For hosts
            </Link>
          </nav>
        </div>

        {/* Action items */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 rounded-full bg-[#1A1816] px-3 py-1 text-xs font-semibold text-[#A39B91] border border-[#2A2724] hover:text-[#F4EFE8] transition-colors"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-[#FF4A3D]" />
                  <span>Admin</span>
                </Link>
              )}

              {/* The GO LIVE button: Red strictly for Go Live / Studio */}
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-full bg-[#FF4A3D] px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#FF4A3D]/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Go live</span>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-[#2A2724]">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm text-[#F4EFE8] hover:text-[#F2B544] transition-colors"
                  title={profile?.display_name || user.email || 'Profile'}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1816] text-[#F2B544] border border-[#2A2724] font-semibold text-xs">
                    {(profile?.display_name || user.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                </Link>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-xs text-[#A39B91] hover:text-[#F4EFE8] px-2 py-1 rounded transition-colors"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-[#A39B91] hover:text-[#F4EFE8] transition-colors px-3 py-1.5"
              >
                Log In
              </Link>
              {/* Amber for sign up/start channel */}
              <Link
                href="/signup"
                className="rounded-full bg-[#F2B544] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#0E0D0C] shadow-sm hover:brightness-105 active:scale-95 transition-all"
              >
                Start streaming
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
