'use client'

import { useEffect, useRef } from 'react'

interface SpectrumVisualizerProps {
  isPlaying: boolean
  barCount?: number
  height?: number
  accentColor?: string
}

export function SpectrumVisualizer({
  isPlaying,
  barCount = 24,
  height = 48,
  accentColor = '#F2B544', // Amber accent (Strict: red means live and nothing else)
}: SpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const barsRef = useRef<number[]>(Array(barCount).fill(4))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let phase = 0

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const w = canvas.width
      const h = canvas.height
      const totalSpacing = barCount * 2
      const barWidth = Math.max(2, (w - totalSpacing) / barCount)

      phase += 0.08

      // Update bar heights
      for (let i = 0; i < barCount; i++) {
        if (isPlaying) {
          // Human speech frequency profile: peak in lower-mid frequencies
          const freqProfile = Math.sin((i / barCount) * Math.PI)
          const voiceVariation =
            Math.sin(phase * 1.5 + i * 0.4) * 0.4 +
            Math.cos(phase * 2.2 - i * 0.3) * 0.3 +
            Math.sin(phase * 3.7 + i * 0.7) * 0.3

          const target = Math.max(
            0.08,
            Math.min(0.95, freqProfile * 0.65 + voiceVariation * 0.35)
          )
          barsRef.current[i] =
            barsRef.current[i] * 0.7 + target * h * 0.3 // Smooth easing
        } else {
          // Idle decay to baseline dots
          barsRef.current[i] = Math.max(3, barsRef.current[i] * 0.85)
        }

        const barH = barsRef.current[i]
        const x = i * (barWidth + 2)
        const y = h - barH

        // Draw bar gradient
        const grad = ctx.createLinearGradient(0, y, 0, h)
        if (isPlaying) {
          grad.addColorStop(0, '#FFF2D1') // Warm light amber at peak
          grad.addColorStop(1, accentColor)
        } else {
          grad.addColorStop(0, '#3A3631')
          grad.addColorStop(1, '#201D1A')
        }

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0])
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, barCount, height, accentColor])

  return (
    <div className="relative w-full overflow-hidden flex items-end justify-center" style={{ height }}>
      <canvas
        ref={canvasRef}
        width={barCount * 8}
        height={height}
        className="w-full h-full max-w-md"
      />
    </div>
  )
}
