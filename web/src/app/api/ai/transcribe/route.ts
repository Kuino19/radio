import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI, Type } from '@google/genai'

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

    // 1. Fetch recording
    const { data: recording, error: recError } = await supabase
      .from('recordings')
      .select('*, channels(owner_id, name, slug)')
      .eq('id', recordingId)
      .single()

    if (recError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY

    // If no API key is provided, return informative response
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        missingApiKey: true,
        message: 'No GEMINI_API_KEY configured. Please set GEMINI_API_KEY in your environment or provide an API key.',
      })
    }

    // 2. Fetch audio buffer from Cloudflare R2 / public URL
    const audioRes = await fetch(recording.audio_url)
    if (!audioRes.ok) {
      return NextResponse.json({ error: 'Could not fetch audio file from storage URL' }, { status: 502 })
    }

    const arrayBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = recording.audio_url.endsWith('.webm')
      ? 'audio/webm'
      : recording.audio_url.endsWith('.mp3')
      ? 'audio/mp3'
      : 'audio/webm'

    // 3. Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `You are an expert broadcast editor, audio archivist, and sermon transcriber for a live audio platform.
Analyze the attached audio recording titled "${recording.title}".

Provide the following in strict JSON format:
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
  ],
  "transcript": "A full, clean speech-to-text transcript organized into readable paragraphs with natural punctuation."
}

Ensure all chapter timestamps match the actual audio progression.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    })

    const responseText = response.text || '{}'
    const aiResult = JSON.parse(responseText)

    // 4. Update Supabase public.recordings
    const { data: updatedRecord, error: updateError } = await supabase
      .from('recordings')
      .update({
        summary: aiResult.summary || null,
        transcript: aiResult.transcript || null,
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
    console.error('AI transcribe error:', error)
    return NextResponse.json({ error: error.message || 'Internal AI processing error' }, { status: 500 })
  }
}
