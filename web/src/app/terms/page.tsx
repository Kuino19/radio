import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to LISNR
      </Link>

      <div className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-300 border border-zinc-700">
          <FileText className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Terms of Service</h1>
        <p className="text-xs text-zinc-400">Last updated: November 2026</p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800 pt-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Use of LISNR</h2>
          <p>
            LISNR is an audio-only, speech-first live broadcasting service intended for sermons, community radio, interviews, and talk shows. By creating an account or broadcasting, you agree to comply with these terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Broadcaster Responsibilities</h2>
          <p>
            You are solely responsible for the audio content transmitted over your channel. Broadcasters must not transmit hate speech, harassment, illegal material, or unauthorized copyrighted audio recordings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Platform Moderation & Suspensions</h2>
          <p>
            LISNR administrators reserve the right to suspend or terminate any channel or user account that violates community standards, engages in abusive chat behavior, or disrupts platform infrastructure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Availability & Data Speeds</h2>
          <p>
            We strive for maximum uptime and optimize audio streams at 64 kbps MP3 mono for lightweight data consumption on mobile networks. However, broadcasts are provided on an &ldquo;as is&rdquo; basis without warranties of uninterrupted service.
          </p>
        </section>
      </div>
    </div>
  )
}
