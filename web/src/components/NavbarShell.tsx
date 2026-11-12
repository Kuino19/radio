'use client'

import { usePathname } from 'next/navigation'

interface NavbarShellProps {
  children: React.ReactNode
}

export function NavbarShell({ children }: NavbarShellProps) {
  const pathname = usePathname()

  // Suppress top navbar when embedded in iframe or third-party website
  if (pathname?.startsWith('/embed')) {
    return null
  }

  return <>{children}</>
}
