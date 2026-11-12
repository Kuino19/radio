import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { MobileNav } from '@/components/MobileNav'
import { PlayerProvider } from '@/context/PlayerContext'
import { GlobalBottomPlayer } from '@/components/GlobalBottomPlayer'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_STREAM_BASE_URL || 'https://radio.goanitech.com'),
  title: 'LISNR — Live Audio Broadcasts',
  description: 'Speech-first live audio platform for sermons, talk shows, community radio, and interviews.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'LISNR — Live Audio Broadcasts',
    description: 'Speech-first live audio platform for sermons, talk shows, and podcasts.',
    siteName: 'LISNR',
    images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'LISNR Logo' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0E0D0C] text-[#F4EFE8] font-sans selection:bg-[#FF4A3D]/30 selection:text-white pb-24 md:pb-16">
        <PlayerProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[#2A2724] py-8 text-center text-xs text-[#A39B91] space-y-3">
            <p className="font-display font-bold text-sm tracking-wide text-[#F4EFE8]/70">LISNR.</p>
            <p>© 2026 LISNR. Built for speech-first live audio streaming.</p>
            <div className="flex items-center justify-center gap-4 text-[12px] text-[#A39B91]">
              <a href="/privacy" className="hover:text-[#F2B544] transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-[#F2B544] transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="/explore" className="hover:text-[#F2B544] transition-colors">Explore Stations</a>
            </div>
          </footer>
          <GlobalBottomPlayer />
          <MobileNav />
        </PlayerProvider>
      </body>
    </html>
  )
}
