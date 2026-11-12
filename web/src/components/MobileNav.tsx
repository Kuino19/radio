'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Radio, User, Bookmark } from 'lucide-react'

export function MobileNav() {
  const pathname = usePathname()

  // Don't show mobile nav inside the broadcast studio, dashboard or embed to keep screen focused
  if (
    pathname.startsWith('/studio/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/embed')
  ) {
    return null
  }

  const isHome = pathname === '/'
  const isExplore = pathname === '/explore'
  const isLibrary = pathname === '/library'
  const isProfile = pathname.startsWith('/dashboard') || pathname === '/login'

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E0D0C]/95 backdrop-blur-md border-t border-[#2A2724] px-4 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            isHome ? 'text-[#F2B544]' : 'text-[#A39B91] hover:text-[#F4EFE8]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        {/* Explore / Search */}
        <Link
          href="/explore"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            isExplore ? 'text-[#F2B544]' : 'text-[#A39B91] hover:text-[#F4EFE8]'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span>Explore</span>
        </Link>

        {/* Center Go Live Action Button */}
        <div className="relative -top-4 flex flex-col items-center">
          <Link
            href="/dashboard"
            aria-label="Go live"
            className="w-13 h-13 rounded-full bg-[#FF4A3D] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(255,74,61,0.45)] hover:scale-105 active:scale-95 transition-transform"
          >
            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#FF4A3D]" />
            </div>
          </Link>
          <span className="text-[10px] font-semibold text-[#FF4A3D] mt-1 tracking-tight">Go live</span>
        </div>

        {/* Library / Saved */}
        <Link
          href="/library"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            isLibrary ? 'text-[#F2B544]' : 'text-[#A39B91] hover:text-[#F4EFE8]'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span>Library</span>
        </Link>

        {/* Profile */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            isProfile ? 'text-[#F2B544]' : 'text-[#A39B91] hover:text-[#F4EFE8]'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  )
}
