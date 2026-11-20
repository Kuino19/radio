'use client'

import { usePathname } from 'next/navigation'
import { GlobalBottomPlayer } from '@/components/GlobalBottomPlayer'
import { NavbarShell } from '@/components/NavbarShell'

interface AppShellProps {
  children: React.ReactNode
  navbar: React.ReactNode
  footer: React.ReactNode
}

export function AppShell({ children, navbar, footer }: AppShellProps) {
  const pathname = usePathname()
  const isDedicatedShowPage = pathname?.startsWith('/live/') ?? false

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${isDedicatedShowPage ? '' : 'md:pb-16'}`}>
      {!isDedicatedShowPage && <NavbarShell>{navbar}</NavbarShell>}
      <main className="flex-1">{children}</main>
      {!isDedicatedShowPage && footer}
      <GlobalBottomPlayer />
    </div>
  )
}
