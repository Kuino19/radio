'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign,
  Heart,
  ShieldCheck,
  Check,
  Sparkles,
  Link as LinkIcon,
  Users,
  Coins,
  Loader2,
} from 'lucide-react'
import type { MonetizationSettings, Tip } from '@/types/database'

interface CreatorMonetizationProps {
  channelId: string
  settings?: MonetizationSettings | null
  tips?: Tip[]
  onUpdate?: () => void
}

export function CreatorMonetization({
  channelId,
  settings,
  tips = [],
  onUpdate,
}: CreatorMonetizationProps) {
  const supabase = createClient()
  const [tippingEnabled, setTippingEnabled] = useState(settings?.tipping_enabled ?? true)
  const [customTippingUrl, setCustomTippingUrl] = useState(settings?.custom_tipping_url || '')
  const [membershipEnabled, setMembershipEnabled] = useState(settings?.membership_enabled ?? false)
  const [monthlyPrice, setMonthlyPrice] = useState<number>((settings?.monthly_price_cents || 500) / 100)
  const [annualPrice, setAnnualPrice] = useState<number>((settings?.annual_price_cents || 5000) / 100)
  const [tierName, setTierName] = useState(settings?.tier_name || 'Supporter')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultPerks = [
    'Ad-free uninterrupted audio streams',
    'Exclusive subscriber-only episodes & sermons',
    'Direct access to host Q&A sessions',
    'Special supporter badge in live chat',
  ]

  const totalTipVolume = tips.reduce((sum, t) => sum + t.amount_cents, 0) / 100

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = {
        channel_id: channelId,
        tipping_enabled: tippingEnabled,
        custom_tipping_url: customTippingUrl.trim() || null,
        membership_enabled: membershipEnabled,
        monthly_price_cents: Math.round(monthlyPrice * 100),
        annual_price_cents: Math.round(annualPrice * 100),
        tier_name: tierName.trim() || 'Supporter',
        tier_perks: defaultPerks,
        updated_at: new Date().toISOString(),
      }

      const { error: upsertError } = await supabase
        .from('monetization_settings')
        .upsert(payload, { onConflict: 'channel_id' })

      if (upsertError) throw upsertError

      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
      if (onUpdate) onUpdate()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save monetization settings'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Monetization Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 space-y-1">
          <span className="text-[11px] font-semibold text-[#A39B91] flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#F2B544]" />
            <span>Total Tips Earned</span>
          </span>
          <p className="font-mono text-2xl font-bold text-[#F2B544]">
            ${totalTipVolume.toFixed(2)}
          </p>
          <span className="text-[10px] text-[#A39B91]">{tips.length} tip transactions</span>
        </div>

        <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 space-y-1">
          <span className="text-[11px] font-semibold text-[#A39B91] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#3DBE7A]" />
            <span>Membership Status</span>
          </span>
          <p className="font-mono text-2xl font-bold text-[#F4EFE8]">
            {membershipEnabled ? 'Active' : 'Disabled'}
          </p>
          <span className="text-[10px] text-[#A39B91]">
            ${monthlyPrice}/mo tier
          </span>
        </div>

        <div className="rounded-2xl border border-[#2A2724] bg-[#0E0D0C] p-4 space-y-1">
          <span className="text-[11px] font-semibold text-[#A39B91] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F2B544]" />
            <span>Paywall Access</span>
          </span>
          <p className="font-mono text-2xl font-bold text-[#F4EFE8]">
            Enabled
          </p>
          <span className="text-[10px] text-[#A39B91]">Per-episode paywall toggles</span>
        </div>
      </div>

      {/* Monetization Settings Form */}
      <form onSubmit={handleSave} className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2A2724] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E0D0C] text-[#F2B544] border border-[#2A2724] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#F4EFE8]">
                Creator Monetization Settings
              </h3>
              <p className="text-xs text-[#A39B91]">
                Configure listener tipping, subscription tiers, and paywall rules
              </p>
            </div>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#3DBE7A] font-semibold">
              <Check className="w-4 h-4" />
              Saved!
            </span>
          )}
        </div>

        {/* 1. Tipping Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-display font-bold text-sm text-[#F4EFE8] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#F2B544] fill-current" />
                <span>Listener Tipping</span>
              </h4>
              <p className="text-xs text-[#A39B91]">
                Allow listeners to tip you directly while listening to your shows
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTippingEnabled(!tippingEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                tippingEnabled ? 'bg-[#F2B544]' : 'bg-[#2A2724]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#0E0D0C] transition-transform ${
                  tippingEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {tippingEnabled && (
            <div className="space-y-1.5 pl-6 border-l-2 border-[#2A2724]">
              <label className="text-xs font-semibold text-[#A39B91] flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#F2B544]" />
                <span>Custom Direct Payment URL (Optional)</span>
              </label>
              <input
                type="url"
                value={customTippingUrl}
                onChange={(e) => setCustomTippingUrl(e.target.value)}
                placeholder="https://buymeacoffee.com/yourname or Paystack/Stripe link"
                className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] placeholder-[#A39B91]/50 focus:border-[#F2B544] focus:outline-none"
              />
              <p className="text-[11px] text-[#A39B91]">
                If left empty, tips will be collected directly via LISNR in-app tipping.
              </p>
            </div>
          )}
        </div>

        {/* 2. Membership Tiers & Subscriptions */}
        <div className="space-y-4 pt-4 border-t border-[#2A2724]">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-display font-bold text-sm text-[#F4EFE8] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F2B544]" />
                <span>Subscriber Membership Tiers</span>
              </h4>
              <p className="text-xs text-[#A39B91]">
                Offer recurring monthly subscriptions to unlock paywalled episodes
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMembershipEnabled(!membershipEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                membershipEnabled ? 'bg-[#F2B544]' : 'bg-[#2A2724]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#0E0D0C] transition-transform ${
                  membershipEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {membershipEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-6 border-l-2 border-[#2A2724]">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A39B91]">
                  Tier Name
                </label>
                <input
                  type="text"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="e.g. Supporter, Patron"
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A39B91]">
                  Monthly Price ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A39B91]">
                  Annual Price ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-[#2A2724] bg-[#0E0D0C] px-3.5 py-2 text-xs text-[#F4EFE8] focus:border-[#F2B544] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-[#FF4A3D] font-medium">{error}</p>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#F2B544] px-6 py-2.5 text-xs sm:text-sm font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-[#0E0D0C]" /> : <Sparkles className="w-4 h-4 text-[#0E0D0C]" />}
            <span>Save Monetization Settings</span>
          </button>
        </div>
      </form>

      {/* Recent Tips Feed */}
      {tips.length > 0 && (
        <div className="rounded-3xl border border-[#2A2724] bg-[#1A1816] p-6 space-y-4">
          <h4 className="font-display font-bold text-base text-[#F4EFE8]">
            Recent Listener Tips ({tips.length})
          </h4>
          <div className="divide-y divide-[#2A2724]">
            {tips.slice(0, 5).map((tip) => (
              <div key={tip.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-[#F4EFE8]">{tip.from_name}</p>
                  {tip.message && (
                    <p className="text-xs text-[#A39B91] italic mt-0.5">
                      &ldquo;{tip.message}&rdquo;
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#F2B544]">
                    +${(tip.amount_cents / 100).toFixed(2)}
                  </span>
                  <p className="text-[10px] text-[#A39B91]">
                    {new Date(tip.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
