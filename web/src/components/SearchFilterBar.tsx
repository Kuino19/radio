'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Tag, X, Filter } from 'lucide-react'

export function SearchFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentQuery = searchParams.get('q') || ''
  const currentCategory = searchParams.get('category') || 'All'
  const currentType = searchParams.get('type') || 'all'

  const [searchVal, setSearchVal] = useState(currentQuery)

  const categories = [
    'All',
    'Faith & Spirituality',
    'Talk & Commentary',
    'Tech & Digital',
    'Culture & Society',
    'Education & Learning',
    'Music & Arts',
  ]

  const updateFilters = (params: { q?: string; category?: string; type?: string }) => {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (params.q !== undefined) {
      if (params.q) nextParams.set('q', params.q)
      else nextParams.delete('q')
    }

    if (params.category !== undefined) {
      if (params.category && params.category !== 'All') nextParams.set('category', params.category)
      else nextParams.delete('category')
    }

    if (params.type !== undefined) {
      if (params.type && params.type !== 'all') nextParams.set('type', params.type)
      else nextParams.delete('type')
    }

    startTransition(() => {
      router.push(`/explore?${nextParams.toString()}`)
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ q: searchVal.trim() })
  }

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39B91]" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search by keyword, topic, show title, pastor, speaker or tag..."
          className="w-full rounded-2xl border border-[#2A2724] bg-[#1A1816] pl-11 pr-24 py-3.5 text-sm text-[#F4EFE8] placeholder-[#A39B91]/60 focus:border-[#F2B544] focus:outline-none transition-colors shadow-inner"
        />
        {searchVal && (
          <button
            type="button"
            onClick={() => {
              setSearchVal('')
              updateFilters({ q: '' })
            }}
            className="absolute right-14 top-1/2 -translate-y-1/2 text-[#A39B91] hover:text-[#F4EFE8]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#F2B544] px-3.5 py-1.5 text-xs font-bold text-[#0E0D0C] hover:brightness-105 transition-all shadow-sm"
        >
          Search
        </button>
      </form>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = currentCategory === cat || (cat === 'All' && !searchParams.get('category'))
          return (
            <button
              key={cat}
              type="button"
              onClick={() => updateFilters({ category: cat })}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#F2B544] text-[#0E0D0C] shadow-md shadow-[#F2B544]/20'
                  : 'bg-[#1A1816] text-[#A39B91] border border-[#2A2724] hover:text-[#F4EFE8] hover:border-[#F2B544]/40'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Content Type Filter: All / Live Broadcasts / Series / Episodes */}
      <div className="flex items-center gap-2 text-xs text-[#A39B91] pt-1 border-t border-[#2A2724]">
        <span className="flex items-center gap-1 font-medium">
          <Filter className="w-3.5 h-3.5 text-[#F2B544]" /> Filter by:
        </span>
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All Content' },
            { id: 'live', label: 'Live Radio' },
            { id: 'series', label: 'Series' },
            { id: 'episodes', label: 'Episodes' },
          ].map((t) => {
            const isSelected = (currentType === t.id) || (t.id === 'all' && !searchParams.get('type'))
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateFilters({ type: t.id })}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  isSelected
                    ? 'bg-[#0E0D0C] text-[#F4EFE8] font-bold border border-[#2A2724]'
                    : 'text-[#A39B91] hover:text-[#F4EFE8]'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
