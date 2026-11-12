'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function Footer() {
  const pathname = usePathname()

  // Suppress footer in creator dashboard & studio so it stays a clean full-height app
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/studio')) {
    return null
  }

  return (
    <footer className="border-t border-[#2A2724] py-8 text-center text-xs text-[#A39B91] space-y-3 bg-[#0E0D0C]">
      <p className="font-display font-bold text-sm tracking-wide text-[#F4EFE8]/70">LISNR.</p>
      <p>© 2026 LISNR. Built for speech-first live audio streaming.</p>
      <div className="flex items-center justify-center gap-4 text-[12px] text-[#A39B91]">
        <Link href="/privacy" className="hover:text-[#F2B544] transition-colors">Privacy Policy</Link>
        <span>•</span>
        <Link href="/terms" className="hover:text-[#F2B544] transition-colors">Terms of Service</Link>
        <span>•</span>
        <Link href="/explore" className="hover:text-[#F2B544] transition-colors">Explore Stations</Link>
      </div>
    </footer>
  )
}
