'use client'

import { useState } from 'react'
import {
  X,
  Sparkles,
  BookOpen,
  Clock,
  List,
  FileText,
  Copy,
  Check,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react'
import { usePlayer } from '@/context/PlayerContext'
import type { Recording, Chapter } from '@/types/database'

interface ShowNotesModalProps {
  recording: Recording
  isOpen: boolean
  onClose: () => void
  onRecordingUpdated?: (updated: Recording) => void
  canEdit?: boolean
}

export function ShowNotesModal({
  recording: initialRec,
  isOpen,
  onClose,
  onRecordingUpdated,
  canEdit = false,
}: ShowNotesModalProps) {
  const { currentTrack, isPlaying, playChannel, togglePlay, seek } = usePlayer()
  const [recording, setRecording] = useState<Recording>(initialRec)
  const [activeTab, setActiveTab] = useState<'summary' | 'chapters' | 'transcript'>('summary')
  const [transcriptSearch, setTranscriptSearch] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [customKey, setCustomKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [copiedTranscript, setCopiedTranscript] = useState(false)

  if (!isOpen) return null

  const isCurrentRec = currentTrack?.channelSlug === `rec-${recording.id}`
  const isThisPlaying = isCurrentRec && isPlaying

  const handlePlayRecording = () => {
    const recordingSlug = `rec-${recording.id}`
    if (isCurrentRec) {
      togglePlay()
    } else {
      playChannel({
        channelName: recording.title,
        channelSlug: recordingSlug,
        streamUrl: recording.audio_url,
        hostName: 'Archived Recording',
        isLive: false,
      })
    }
  }

  const handleChapterClick = (chapter: Chapter) => {
    if (!isCurrentRec) {
      playChannel({
        channelName: recording.title,
        channelSlug: `rec-${recording.id}`,
        streamUrl: recording.audio_url,
        hostName: 'Archived Recording',
        isLive: false,
      })
      setTimeout(() => {
        seek(chapter.timestamp_seconds)
      }, 500)
    } else {
      seek(chapter.timestamp_seconds)
    }
  }

  const handleGenerateAI = async () => {
    setIsProcessing(true)
    setProcessError(null)

    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId: recording.id,
          customApiKey: customKey.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process audio with Gemini AI.')
      }

      if (data.missingApiKey) {
        setShowKeyInput(true)
        setProcessError(data.message)
        setIsProcessing(false)
        return
      }

      if (data.recording) {
        setRecording(data.recording)
        if (onRecordingUpdated) onRecordingUpdated(data.recording)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      setProcessError(error.message || 'AI transcription failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const chapters: Chapter[] = (recording.chapters as Chapter[]) || []
  const highlights: string[] = (recording.highlights as string[]) || []

  const filteredTranscript = transcriptSearch
    ? (recording.transcript || '')
        .split('\n')
        .filter((para) => para.toLowerCase().includes(transcriptSearch.toLowerCase()))
        .join('\n\n')
    : recording.transcript || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0D0C]/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl border border-[#2A2724] bg-[#141210] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#2A2724] flex items-center justify-between gap-4 shrink-0 bg-[#1A1816]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F2B544]/15 border border-[#F2B544]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#F2B544]">
                <Sparkles className="w-3 h-3" />
                GROQ WHISPER & LLAMA 3.3
              </span>
              <span className="text-[11px] font-mono text-[#A39B91]">
                {Math.floor((recording.duration_seconds || 0) / 60)} mins
              </span>
            </div>
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#F4EFE8] truncate">
              {recording.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#A39B91] hover:text-[#F4EFE8] hover:bg-[#0E0D0C] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Quick-Bar */}
        <div className="px-5 sm:px-6 py-3 bg-[#0E0D0C] border-b border-[#2A2724] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayRecording}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-[#0E0D0C] transition-transform ${
                isThisPlaying
                  ? 'bg-[#F4EFE8]'
                  : 'bg-[#F2B544] hover:brightness-110 active:scale-95'
              }`}
            >
              {isThisPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <span className="text-xs font-semibold text-[#F4EFE8]">
              {isThisPlaying ? 'Playing Replay Audio' : 'Listen to Audio'}
            </span>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="inline-flex p-1 rounded-full bg-[#141210] border border-[#2A2724] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeTab === 'summary'
                  ? 'bg-white text-[#0E0D0C]'
                  : 'text-[#A39B91] hover:text-[#F4EFE8]'
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chapters')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeTab === 'chapters'
                  ? 'bg-white text-[#0E0D0C]'
                  : 'text-[#A39B91] hover:text-[#F4EFE8]'
              }`}
            >
              Chapters ({chapters.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transcript')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeTab === 'transcript'
                  ? 'bg-white text-[#0E0D0C]'
                  : 'text-[#A39B91] hover:text-[#F4EFE8]'
              }`}
            >
              Transcript
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Error Message */}
          {processError && (
            <div className="rounded-2xl border border-[#FF4A3D]/40 bg-[#FF4A3D]/10 p-3.5 text-xs text-[#FF4A3D] space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-semibold flex-1">{processError}</p>
              </div>
              {showKeyInput && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A39B91]">Groq API Key:</span>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F2B544] hover:underline font-semibold"
                    >
                      Get free key at console.groq.com →
                    </a>
                  </div>
                  <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Enter Groq API key (starts with gsk_...)"
                    className="w-full rounded-xl bg-[#0E0D0C] border border-[#2A2724] px-3.5 py-2 text-xs text-[#F4EFE8] focus:outline-none focus:border-[#F2B544]"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isProcessing}
                    className="rounded-full bg-[#F2B544] px-4 py-1.5 text-xs font-bold text-[#0E0D0C] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    {isProcessing ? 'Transcribing with Groq...' : 'Transcribe with Groq Key'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* If Not Transcribed Yet */}
          {!recording.ai_processed && (
            <div className="rounded-3xl border border-[#F2B544]/30 bg-[#F2B544]/5 p-6 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-[#F2B544] mx-auto animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-display font-bold text-base text-[#F4EFE8]">
                  AI Show Notes & Chapters
                </h3>
                <p className="text-xs text-[#A39B91] max-w-md mx-auto">
                  Powered by <strong className="text-[#F4EFE8]">Groq Whisper Large v3</strong> for near-instant transcription and <strong className="text-[#F4EFE8]">Llama 3.3 70B</strong> for executive summaries and chapter markers.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F2B544] px-6 py-2.5 text-xs font-bold text-[#0E0D0C] shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transcribing at 200x speed with Groq Whisper...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Transcribe & Chapter with Groq AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: SUMMARY & HIGHLIGHTS */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {recording.summary ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A39B91] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#F2B544]" />
                      Executive Summary
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(recording.summary || '')
                        setCopiedSummary(true)
                        setTimeout(() => setCopiedSummary(false), 2000)
                      }}
                      className="text-[11px] font-semibold text-[#F2B544] hover:underline flex items-center gap-1"
                    >
                      {copiedSummary ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
                    </button>
                  </div>
                  <div className="text-sm text-[#F4EFE8] leading-relaxed whitespace-pre-line bg-[#0E0D0C] p-4 rounded-2xl border border-[#2A2724]">
                    {recording.summary}
                  </div>
                </div>
              ) : null}

              {/* Highlights */}
              {highlights.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A39B91] flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5 text-[#F2B544]" />
                    Key Takeaways & Quotes
                  </h3>
                  <div className="space-y-2">
                    {highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0E0D0C] border border-[#2A2724] text-xs text-[#F4EFE8]"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#1A1816] text-[#F2B544] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#2A2724]">
                          {i + 1}
                        </span>
                        <p className="leading-relaxed">{h}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE CHAPTERS */}
          {activeTab === 'chapters' && (
            <div className="space-y-3">
              <p className="text-xs text-[#A39B91]">
                Tap any chapter to instantly jump to that timestamp in the broadcast.
              </p>
              {chapters.length > 0 ? (
                <div className="divide-y divide-[#2A2724] rounded-2xl border border-[#2A2724] bg-[#0E0D0C] overflow-hidden">
                  {chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChapterClick(ch)}
                      className="w-full text-left p-3.5 hover:bg-[#1A1816] transition-colors flex items-start gap-3 group cursor-pointer"
                    >
                      <span className="font-mono text-xs font-bold text-[#F2B544] bg-[#1A1816] border border-[#2A2724] px-2 py-0.5 rounded-lg shrink-0 group-hover:border-[#F2B544]">
                        {ch.timestamp_label || '00:00'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-[#F4EFE8] group-hover:text-[#F2B544] transition-colors">
                          {ch.title}
                        </h4>
                        {ch.summary && (
                          <p className="text-[11px] text-[#A39B91] mt-0.5 line-clamp-2">
                            {ch.summary}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#A39B91]">
                  No chapters detected yet. Click &quot;Generate AI Notes&quot; above to create chapters.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FULL TRANSCRIPT */}
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#A39B91] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search in transcript..."
                    className="w-full rounded-xl bg-[#0E0D0C] border border-[#2A2724] pl-9 pr-3 py-1.5 text-xs text-[#F4EFE8] focus:outline-none focus:border-[#F2B544]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recording.transcript || '')
                    setCopiedTranscript(true)
                    setTimeout(() => setCopiedTranscript(false), 2000)
                  }}
                  className="text-xs font-semibold text-[#F2B544] hover:underline flex items-center gap-1 shrink-0"
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTranscript ? 'Copied' : 'Copy Transcript'}</span>
                </button>
              </div>

              {filteredTranscript ? (
                <div className="p-4 rounded-2xl bg-[#0E0D0C] border border-[#2A2724] text-xs text-[#F4EFE8] leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                  {filteredTranscript}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#A39B91]">
                  {transcriptSearch ? 'No matches found.' : 'No transcript generated yet.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
