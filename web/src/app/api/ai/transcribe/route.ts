import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq, { toFile } from 'groq-sdk'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { recordingId, customApiKey } = body

    if (!recordingId) {
      return NextResponse.json({ error: 'Missing recordingId' }, { status: 400 })
    }

    // 1. Fetch recording from Supabase
    const { data: recording, error: recError } = await supabase
      .from('recordings')
      .select('*, channels(owner_id, name, slug)')
      .eq('id', recordingId)
      .single()

    if (recError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    const apiKey = (customApiKey || process.env.GROQ_API_KEY || '').trim()

    // If no Groq API key is provided, return helpful response
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        missingApiKey: true,
        message: 'No Groq API key found. Enter your Groq API key (starts with gsk_...) or add GROQ_API_KEY to your environment variables.',
      })
    }

    // 2. Fetch audio file from Cloudflare R2 / storage URL
    const audioRes = await fetch(recording.audio_url)
    if (!audioRes.ok) {
      return NextResponse.json({ error: 'Could not fetch audio file from storage URL' }, { status: 502 })
    }

    const arrayBuffer = await audioRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const mimeType = recording.audio_url.endsWith('.webm')
      ? 'audio/webm'
      : recording.audio_url.endsWith('.mp3')
      ? 'audio/mp3'
      : 'audio/webm'

    const groq = new Groq({ apiKey })

    // 3. Step 1: Transcribe with Groq Whisper Large v3 (Fastest audio-to-text in the world)
    const file = await toFile(buffer, 'broadcast.webm', { type: mimeType })
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
      language: 'en',
    })

    const fullTranscript = transcription.text || ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segments = ((transcription as any).segments || []) as { start: number; end: number; text: string }[]

    // 4. Step 2: Generate Summary, Highlights & Chapters using Groq Llama 3.3 70B
    // Format timestamp samples from Whisper segments
    const timestampGuide = segments
      .filter((_, idx) => idx % Math.max(1, Math.floor(segments.length / 15)) === 0)
      .slice(0, 20)
      .map((s) => {
        const mins = Math.floor(s.start / 60).toString().padStart(2, '0')
        const secs = Math.floor(s.start % 60).toString().padStart(2, '0')
        return `[${mins}:${secs}] ${s.text.trim()}`
      })
      .join('\n')

    const prompt = `You are an expert audio editor, broadcast producer, and sermon archivist.
Analyze the following speech transcript from the broadcast titled "${recording.title}".

Audio Transcript:
${fullTranscript.slice(0, 25000)}

Sample Segment Timeline:
${timestampGuide}

Return a valid JSON object matching this schema:
{
  "summary": "A rich 2-3 paragraph executive summary of the speech/sermon/discussion, highlighting core themes and main message.",
  "highlights": ["3 to 5 memorable quotes or key takeaways from the broadcast"],
  "chapters": [
    {
      "timestamp_seconds": 0,
      "timestamp_label": "00:00",
      "title": "Introduction & Welcome",
      "summary": "Opening remarks and context setting"
    }
  ]
}

Ensure chapter timestamps are ordered and reflect the timeline.`

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an expert broadcast archivist. You only respond in valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    })

    const content = chatCompletion.choices[0]?.message?.content || '{}'
    const aiResult = JSON.parse(content)

    // 5. Update Supabase public.recordings
    const { data: updatedRecord, error: updateError } = await supabase
      .from('recordings')
      .update({
        summary: aiResult.summary || null,
        transcript: fullTranscript,
        chapters: aiResult.chapters || [],
        highlights: aiResult.highlights || [],
        ai_processed: true,
      })
      .eq('id', recordingId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      recording: updatedRecord,
    })
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('Groq AI transcribe error:', error)
    return NextResponse.json({ error: error.message || 'Groq AI processing failed' }, { status: 500 })
  }
}
