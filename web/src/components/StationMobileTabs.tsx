'use client'

import { useState } from 'react'
import { MessageSquare, Radio, Info, Calendar } from 'lucide-react'

interface StationMobileTabsProps {
  chatComponent: React.ReactNode
  recordingsComponent: React.ReactNode
  aboutComponent: React.ReactNode
  recordingsCount: number
  hasUpcoming: boolean
}

export function StationMobileTabs({
  chatComponent,
  recordingsComponent,
  aboutComponent,
  recordingsCount,
  hasUpcoming,
}: StationMobileTabsProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'replays' | 'about'>('chat')

  return (
    <div className="lg:hidden space-y-4">
      {/* Mobile Tab Pills */}
      <div className="flex items-center gap-1.5 p-1 bg-[#1A1816] rounded-2xl border border-[#2A2724]">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'chat'
              ? 'bg-[#0E0D0C] text-[#F2B544] shadow-sm border border-[#2A2724]'
              : 'text-[#A39B91] hover:text-[#F4EFE8]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Live Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('replays')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'replays'
              ? 'bg-[#0E0D0C] text-[#F2B544] shadow-sm border border-[#2A2724]'
              : 'text-[#A39B91] hover:text-[#F4EFE8]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Past Shows</span>
          {recordingsCount > 0 && (
            <span className="bg-[#2A2724] text-[#A39B91] text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {recordingsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'about'
              ? 'bg-[#0E0D0C] text-[#F2B544] shadow-sm border border-[#2A2724]'
              : 'text-[#A39B91] hover:text-[#F4EFE8]'
          }`}
        >
          {hasUpcoming ? <Calendar className="w-3.5 h-3.5 text-[#F2B544]" /> : <Info className="w-3.5 h-3.5" />}
          <span>About</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'chat' && (
          <div className="animate-in fade-in duration-150">
            {chatComponent}
          </div>
        )}
        {activeTab === 'replays' && (
          <div className="animate-in fade-in duration-150 space-y-4">
            {recordingsComponent}
          </div>
        )}
        {activeTab === 'about' && (
          <div className="animate-in fade-in duration-150 space-y-4">
            {aboutComponent}
          </div>
        )}
      </div>
    </div>
  )
}
