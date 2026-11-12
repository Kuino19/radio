import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { NavbarShell } from '@/components/NavbarShell'
import { MobileNav } from '@/components/MobileNav'
import { PlayerProvider } from '@/context/PlayerContext'
import { GlobalBottomPlayer } from '@/components/GlobalBottomPlayer'
import { Footer } from '@/components/Footer'
import { PwaRegister } from '@/components/PwaRegister'
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lisnr.goanitech.com'),
  title: 'LISNR — Live Audio Broadcasts',
  description: 'Speech-first live audio platform for sermons, talk shows, community radio, and interviews.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LISNR',
  },
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
  themeColor: '#0E0D0C',
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
        <PwaRegister />
        <PlayerProvider>
          <NavbarShell>
            <Navbar />
          </NavbarShell>
          <main className="flex-1">{children}</main>
          <Footer />
          <GlobalBottomPlayer />
          <MobileNav />
        </PlayerProvider>
      </body>
    </html>
  )
}
