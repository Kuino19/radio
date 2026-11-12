'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BrandLogo } from '@/components/BrandLogo'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo size="lg" variant="icon" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-[#F4EFE8]">
              Welcome back to LISNR
            </h1>
            <p className="text-xs text-[#A39B91] mt-1">
              Log in to manage your broadcast channel and go live
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#FF4A3D]/30 bg-[#FF4A3D]/10 p-3.5 text-xs text-[#FF4A3D]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A39B91]">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A39B91]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#F2B544] py-3 text-xs sm:text-sm font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[#0E0D0C]" />}
            <span>Log In</span>
          </button>
        </form>

        <p className="text-center text-xs text-[#A39B91] pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-[#F2B544] hover:underline">
            Start streaming free
          </Link>
        </p>
      </div>
    </div>
  )
}
