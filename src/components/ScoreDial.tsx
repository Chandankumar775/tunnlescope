import { motion } from 'framer-motion'
import type { Grade } from '../lib/types'
import { GRADE_HEX } from './ui'

/** 180° gauge. `dark` renders for use on the solid ink card. */
export default function ScoreDial({ score, grade, size = 220, dark = false, label = 'Security score' }: { score: number; grade: Grade; size?: number; dark?: boolean; label?: string }) {
  const r = size / 2 - 16
  const cx = size / 2
  const cy = size / 2 + 6
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${x1} ${y1}`
  }
  const col = GRADE_HEX[grade]
  const v = Math.max(0.001, Math.min(1, score / 100))
  const tx = cx + r * Math.cos(Math.PI * (1 - v))
  const ty = cy - r * Math.sin(Math.PI * (1 - v))
  return (
    <div className="relative" style={{ width: size, height: size * 0.62 }} role="img" aria-label={`${label}: ${score} out of 100, grade ${grade}`}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} className="overflow-visible">
        <path d={arc(0, 1)} fill="none" stroke={dark ? 'rgba(255,255,255,.12)' : 'rgb(var(--rule))'} strokeWidth={14} strokeLinecap="round" />
        <motion.path d={arc(0, 1)} fill="none" stroke={col} strokeWidth={14} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: v }} transition={{ duration: 1.1, ease: 'easeOut' }} />
        <motion.circle cx={tx} cy={ty} r={7} fill={dark ? '#0F1B2D' : '#fff'} stroke={col} strokeWidth={3}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <div className={dark ? 'num-wide text-[#e7edf4]' : 'num-wide'} style={{ fontSize: size * 0.24, lineHeight: 1 }}>{score}</div>
        <div className="mt-1 flex items-center gap-2 text-[13px]" style={{ color: dark ? '#93a4ba' : undefined }}>
          <span className={dark ? '' : 'text-muted'}>of 100</span>
          <span className="rounded-md px-2 py-0.5 text-[13px] font-bold text-white" style={{ background: col }}>Grade {grade}</span>
        </div>
      </div>
    </div>
  )
}
