'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BrandLogo } from '@/components/BrandLogo'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (displayName.trim().length < 2) {
      setErrorMsg('Display name must be at least 2 characters')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else if (data.session) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setSuccessMsg('Account created! Please check your email to confirm your registration.')
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setErrorMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
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
              Start Your Channel on LISNR
            </h1>
            <p className="text-xs text-[#A39B91] mt-1">
              Live audio streaming in one tap. No stream keys or complex setup.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#FF4A3D]/30 bg-[#FF4A3D]/10 p-3.5 text-xs text-[#FF4A3D]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#3DBE7A]/30 bg-[#3DBE7A]/10 p-3.5 text-xs text-[#3DBE7A]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A39B91]">
              Your Name or Station Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Pastor David or Lagos Community Radio"
              className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-4 py-2.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#F2B544] py-3 text-xs sm:text-sm font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[#0E0D0C]" />}
            <span>Create Free Channel</span>
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="w-full border-t border-[#2A2724]" />
          <span className="bg-[#1A1816] px-3 text-[11px] uppercase tracking-wider text-[#A39B91] absolute">
            Or
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 rounded-full border border-[#2A2724] bg-[#0E0D0C] py-2.5 px-4 text-xs sm:text-sm font-semibold text-[#F4EFE8] hover:border-[#F2B544]/60 transition-colors disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Sign up with Google</span>
        </button>

        <p className="text-center text-xs text-[#A39B91]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#F2B544] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
