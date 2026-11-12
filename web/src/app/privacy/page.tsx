import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export default function PrivacyPage() {
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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Privacy Policy</h1>
        <p className="text-xs text-zinc-400">
          Last updated: November 2026 • Compliant with the Nigeria Data Protection Act (NDPA / NDPR)
        </p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800 pt-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Our Core Commitment to Privacy</h2>
          <p>
            LISNR is a speech-first live audio platform. We believe in transparency and collecting only the minimal data necessary to provide a smooth, low-latency live audio streaming experience.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. What Data We Collect & How It Is Used</h2>
          <p>
            When you tune in to a broadcast as a listener:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li>
              <strong className="text-zinc-200">Display Name:</strong> When tuning in as a guest, you choose a display name so the broadcaster knows who is in the audience.
            </li>
            <li>
              <strong className="text-zinc-200">No Raw IP Addresses:</strong> We perform a server-side lookup for broad country and city metrics (e.g. Lagos, Nigeria) to show broadcasters geographic reach. We do not store or persist raw IP addresses in our database.
            </li>
            <li>
              <strong className="text-zinc-200">Device Type:</strong> We detect whether you are listening on mobile or desktop to help optimize audio delivery.
            </li>
            <li>
              <strong className="text-zinc-200">Traffic Referrer:</strong> If you clicked a link shared on WhatsApp, Instagram, or X, we capture the platform name to help streamers know where their audience joined from.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Data Retention & Hygiene</h2>
          <p>
            Heartbeat tracking records are automatically purged or aggregated into summaries after 90 days to keep our storage minimal and safeguard listener privacy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Your Rights</h2>
          <p>
            Under the Nigeria Data Protection Act, you have the right to request access to or deletion of your account and associated station records. You can contact us anytime to delete your channel or profile.
          </p>
        </section>
      </div>
    </div>
  )
}
