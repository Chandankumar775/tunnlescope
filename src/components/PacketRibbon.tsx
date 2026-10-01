import { useState } from 'react'
import { motion } from 'framer-motion'
import type { RibbonSegment } from '../lib/types'

const STYLE: Record<RibbonSegment['kind'], { bg: string; fg: string; cls?: string; border?: string }> = {
  outer_ip: { bg: 'rgba(147,164,186,.22)', fg: '#c5d0e0' },
  udp: { bg: 'rgba(147,164,186,.34)', fg: '#dbe4f0' },
  esp_hdr: { bg: '#4CC9F0', fg: '#08202b' },
  iv: { bg: 'rgba(76,201,240,.6)', fg: '#06222d' },
  inner_ip: { bg: 'transparent', fg: '#9fe0f5', border: '1.5px dashed rgba(76,201,240,.8)' },
  payload: { bg: 'rgba(76,201,240,.1)', fg: '#bfe9f7', cls: 'hatch' },
  trailer: { bg: 'rgba(147,164,186,.3)', fg: '#dbe4f0' },
  icv: { bg: '#4CC9F0', fg: '#08202b' },
  ah_hdr: { bg: '#B79CED', fg: '#1a1033' },
}

export default function PacketRibbon({ segments, protocol }: { segments: RibbonSegment[]; protocol: 'ESP' | 'AH' }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = segments.reduce((a, s) => a + s.bytes, 0)
  // widths proportional to bytes, with a floor so tiny segments stay legible
  const MIN = 0.07
  const raw = segments.map((s) => Math.max(MIN, s.bytes / total))
  const sum = raw.reduce((a, b) => a + b, 0)
  const widths = raw.map((w) => (w / sum) * 100)
  const active = hover !== null ? segments[hover] : null

  return (
    <div>
      <div className="flex h-[88px] gap-1 overflow-hidden rounded-2xl" role="img" aria-label={`Representative ${protocol} packet of ${total} bytes: ${segments.map((s) => `${s.name} ${s.bytes}`).join(', ')}`}>
        {segments.map((s, i) => {
          const st = STYLE[s.kind]
          const isAhPayload = protocol === 'AH' && s.kind === 'payload'
          return (
            <motion.div
              key={s.name + i}
              initial={{ opacity: 0, scaleX: 0.2 }} animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: i * 0.11, duration: 0.45, ease: 'easeOut' }}
              style={{ width: `${widths[i]}%`, background: st.bg, color: st.fg, border: st.border, transformOrigin: 'left center' }}
              className={`relative flex min-w-0 cursor-default flex-col items-center justify-center overflow-hidden rounded-lg px-1 text-center ${st.cls ?? ''} ${isAhPayload ? 'hatch-ah' : ''}`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
            >
              <span className="mono w-full truncate text-[11px] font-medium leading-tight">{s.label}</span>
              <span className="mono text-[11px] opacity-80">{s.bytes} B</span>
            </motion.div>
          )
        })}
      </div>
      <div className="mt-3 min-h-[44px] text-[13px] text-[#a9b8cd]">
        {active ? (
          <><span className="font-semibold text-[#e7edf4]">{active.name}</span> · {active.bytes} bytes. {active.detail}</>
        ) : (
          <>Total {total} bytes. Hover a segment to see what it holds. {protocol === 'ESP' ? 'Only the outer headers and the ESP header are readable; everything else is ciphertext.' : 'AH authenticates the packet but leaves the payload readable.'}</>
        )}
      </div>
    </div>
  )
}
