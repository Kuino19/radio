'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.debug('[LISNR PWA] Service Worker registered with scope:', reg.scope)
        })
        .catch((err) => {
          console.debug('[LISNR PWA] Service Worker registration failed:', err)
        })
    }
  }, [])

  return null
}
