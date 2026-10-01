import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { Analysis } from '../lib/types'

/**
 * Canvas field of hairline bars generated from a capture's real packet list.
 * Each bar is one observed packet: its width encodes the on-the-wire length,
 * the gap before it encodes the time since the previous packet. A sine trace
 * follows packets per second from the capture timeline. Pure black and white.
 */
export interface BarFieldProps {
  analysis: Analysis
  /** capture time in seconds that the field is centred on */
  t?: number
  inverted?: boolean
  height?: number
  sine?: boolean
  drift?: boolean
  label?: string
  /** highlight the cleartext IKE handshake packets: they stand full height, everything else drops to a low band */
  markIke?: boolean
  onColumn?: (info: { index: number; length: number; residue: number; ts: number } | null) => void
}

export function useBars(a: Analysis) {
  return useMemo(() => {
    const data = a.packets.filter((p) => p.proto === 'ESP' || p.proto === 'AH' || p.proto === 'IKE')
    return data.map((p, i) => ({ index: p.index, length: p.length, ts: p.ts, ike: p.proto === 'IKE', gap: i ? Math.min(1, p.ts - data[i - 1].ts) : 0 }))
  }, [a])
}

export default function BarField({ analysis, t = 0, inverted = false, height = 320, sine = true, drift = true, label, markIke = false, onColumn }: BarFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const bars = useBars(analysis)
  const reduce = useReducedMotion()
  const [hover, setHover] = useState<number | null>(null)
  const offset = useRef(0)
  const layout = useRef<{ x: number; w: number; i: number }[]>([])

  useEffect(() => {
    const c = ref.current
    const box = wrap.current
    if (!c || !box) return
    let raf = 0
    let last = 0
    const fg = inverted ? '#000' : '#fff'
    const bg = inverted ? '#fff' : '#000'
    // smoothed packets-per-second so the trace reads as a lattice curve, not a square wave
    const raw = analysis.timeline.map((b) => b.esp + b.ah)
    // Gaussian smoothing over +-15 s so the trace reads as one lattice curve
    const kern = Array.from({ length: 31 }, (_, k) => Math.exp(-((k - 15) ** 2) / (2 * 6 ** 2)))
    const ksum = kern.reduce((x, y) => x + y, 0)
    const smooth = raw.map((_, i) => kern.reduce((acc, w, k) => acc + w * raw[(i + k - 15 + raw.length) % raw.length], 0) / ksum)
    const maxPps = Math.max(1, ...smooth)
    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = box.clientWidth
      const H = height
      if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.fillStyle = bg
      g.fillRect(0, 0, W, H)
      // start the bar walk at the packet closest to t
      let start = bars.findIndex((b) => b.ts >= t)
      if (start < 0) start = 0
      const shift = Math.floor(offset.current)
      g.fillStyle = fg
      let x = -((offset.current % 1) * 3)
      const placed: { x: number; w: number; i: number }[] = []
      for (let k = 0; x < W; k++) {
        const b = bars[(start + shift + k) % bars.length]
        const w = b.length < 160 ? 1 : b.length < 700 ? 2 : b.length < 1200 ? 3 : 4
        const gap = 1 + Math.round(b.gap * 6)
        if (hover !== null && Math.abs(x - hover) < 3) {
          g.fillRect(x - 1, 0, w + 2, H)
        } else {
          // a true barcode: full-height hairlines that encode only by width and spacing
          if (markIke) {
            if (b.ike) g.fillRect(x - 1, 0, w + 2, H)
            else g.fillRect(x, H * 0.7, w, H * 0.3)
          } else g.fillRect(x, 0, w, H)
        }
        placed.push({ x, w, i: (start + shift + k) % bars.length })
        x += w + gap
      }
      layout.current = placed
      if (sine) {
        g.strokeStyle = fg
        g.lineWidth = 2
        g.fillStyle = bg
        g.beginPath()
        const n = analysis.timeline.length
        const pts: [number, number][] = []
        for (let px = 0; px <= W + 24; px += 24) {
          const pos = ((px / W) * 40 + t + offset.current / 30) % n
          const i0 = Math.floor(pos)
          const v = (smooth[i0] * (1 - (pos - i0)) + smooth[(i0 + 1) % n] * (pos - i0)) / maxPps
          const y = H * 0.78 - v * H * 0.5 + Math.sin(px / 110 + offset.current / 60) * H * 0.12
          pts.push([px, y])
        }
        // quadratic curves through midpoints: no plateaus, no hard corners
        g.moveTo(pts[0][0], pts[0][1])
        for (let k = 1; k < pts.length - 1; k++) {
          const mx = (pts[k][0] + pts[k + 1][0]) / 2
          const my = (pts[k][1] + pts[k + 1][1]) / 2
          g.quadraticCurveTo(pts[k][0], pts[k][1], mx, my)
        }
        // knock the curve out of the bars so it reads as a line, not a texture
        g.save(); g.strokeStyle = bg; g.lineWidth = 6; g.stroke(); g.restore()
        g.stroke()
      }
      if (drift && !reduce && now - last > 1000 / 24) {
        offset.current += 0.35
        last = now
      }
      if (drift && !reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(() => { if (reduce || !drift) raf = requestAnimationFrame(draw) })
    ro.observe(box)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [analysis, bars, t, inverted, height, sine, drift, reduce, hover, markIke])

  const move = (e: React.PointerEvent) => {
    if (!onColumn) return
    const r = wrap.current!.getBoundingClientRect()
    const x = e.clientX - r.left
    setHover(x)
    const hit = layout.current.find((p) => x >= p.x - 2 && x <= p.x + p.w + 2)
    if (hit && onColumn) {
      const b = bars[hit.i]
      onColumn({ index: b.index, length: b.length, residue: b.length % 16, ts: b.ts })
    }
  }

  return (
    <div ref={wrap} className="relative w-full" style={{ height }} onPointerMove={move} onPointerLeave={() => { setHover(null); onColumn?.(null) }}>
      <canvas ref={ref} className="block h-full w-full" role={label === '' ? undefined : 'img'} aria-hidden={label === '' ? true : undefined}
        aria-label={label === '' ? undefined : label ?? `Barcode of ${bars.length} observed packets from ${analysis.scenario.name}; bar width is packet length, the line is packets per second.`} />
    </div>
  )
}

/** Icon-sized deterministic barcode glyph for end-caps and the wordmark. */
export function Bars({ seed = 7, n = 9, h = 14, className = '' }: { seed?: number; n?: number; h?: number; className?: string }) {
  const ws = Array.from({ length: n }, (_, i) => 1 + ((seed * (i + 3) * 7) % 3))
  let x = 0
  const rects = ws.map((w) => { const r = { x, w }; x += w + 1 + ((seed + w) % 2); return r })
  return (
    <svg width={x} height={h} viewBox={`0 0 ${x} ${h}`} className={className} aria-hidden>
      {rects.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={h} fill="currentColor" />)}
    </svg>
  )
}
