import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Wand2 } from 'lucide-react'
import clsx from 'clsx'
import { Btn, Glass, GRADE_HEX, GradeLetter, PageHead, SectionTitle, Solid } from '../components/ui'
import ScoreDial from '../components/ScoreDial'
import { useAllAnalyses } from '../lib/useAnalyses'
import { useStore } from '../lib/store'
import { applicableFixes, applyFixes, evaluate } from '../data/fixes'
import { gradeOf } from '../data/engine'
import { encName } from '../data/engine'
import type { Analysis } from '../lib/types'

const W = 860
const H = 560
const CX = W / 2
const CY = H / 2

export default function Fleet() {
  const all = useAllAnalyses()
  const nav = useNavigate()
  const setCurrent = useStore((s) => s.setCurrent)
  const reduce = useReducedMotion()
  const [hover, setHover] = useState<string | null>(null)
  const [hardened, setHardened] = useState(false)

  const nodes = useMemo(() => all.slice(0, 14).map((a, i, arr) => {
    const ang = (i / arr.length) * Math.PI * 2 - Math.PI / 2
    const rx = 330, ry = 205
    const after = evaluate(applyFixes(a.scenario, applicableFixes(a.scenario).map((f) => f.id)))
    const pps = a.packet_count / a.duration_s
    return { a, x: CX + Math.cos(ang) * rx, y: CY + Math.sin(ang) * ry, after, pps }
  }), [all])

  const weight = (n: (typeof nodes)[number]) => Math.log10(10 + n.a.size_bytes)
  const fleetScore = (pick: (n: (typeof nodes)[number]) => number) => Math.round(nodes.reduce((s, n) => s + pick(n) * weight(n), 0) / nodes.reduce((s, n) => s + weight(n), 0))
  const now = fleetScore((n) => n.a.summary.score)
  const fixed = fleetScore((n) => n.after.score)
  const shown = hardened ? fixed : now
  const maxPps = Math.max(...nodes.map((n) => n.pps))
  const worst = [...nodes].sort((x, y) => x.a.summary.score - y.a.summary.score).slice(0, 4)
  const h = nodes.find((n) => n.a.id === hover)
  const open = (a: Analysis) => { setCurrent(a.id); nav(`/analysis/${a.id}`) }

  return (
    <div>
      <PageHead title="Fleet map" sub="Every analysed IPsec tunnel on one map. Line colour is the tunnel's grade, dashed lines have no forward secrecy, and moving dots show traffic volume."
        actions={<Btn variant={hardened ? 'ink' : 'lime'} icon={Wand2} onClick={() => setHardened((v) => !v)}>{hardened ? 'Show as captured' : 'Preview all fixes applied'}</Btn>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Glass className="relative overflow-hidden p-3" data-tour="fleet">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Fleet map of ${nodes.length} IPsec tunnels. Fleet score ${shown}.`}>
            <defs>
              <radialGradient id="hub" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgb(var(--esp))" stopOpacity="0.35" /><stop offset="100%" stopColor="rgb(var(--esp))" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx={CX} cy={CY} rx={330} ry={205} fill="none" stroke="rgb(var(--rule))" strokeDasharray="2 6" />
            {nodes.map((n) => {
              const g = hardened ? n.after.grade : n.a.summary.grade
              const pfs = hardened ? true : n.a.scenario.pfs
              const id = `edge-${n.a.id}`
              const dim = hover && hover !== n.a.id
              const dur = 6 - (n.pps / maxPps) * 4.5
              return (
                <g key={n.a.id} opacity={dim ? 0.25 : 1} style={{ transition: 'opacity .2s' }}>
                  <path id={id} d={`M ${CX} ${CY} L ${n.x} ${n.y}`} stroke={GRADE_HEX[g]} strokeWidth={2 + (n.pps / maxPps) * 4} strokeDasharray={pfs ? undefined : '7 6'} fill="none" strokeLinecap="round" />
                  {!reduce && [0, 1, 2].map((k) => (
                    <circle key={k} r={3} fill={GRADE_HEX[g]}>
                      <animateMotion dur={`${dur}s`} begin={`-${((k * dur) / 3).toFixed(2)}s`} repeatCount="indefinite"><mpath href={`#${id}`} /></animateMotion>
                    </circle>
                  ))}
                </g>
              )
            })}
            <circle cx={CX} cy={CY} r={70} fill="url(#hub)" />
            <circle cx={CX} cy={CY} r={38} fill="rgb(var(--solid))" />
            <text x={CX} y={CY - 4} textAnchor="middle" fontSize="13" fontWeight="600" fill="#e7edf4">SOC</text>
            <text x={CX} y={CY + 13} textAnchor="middle" fontSize="11" fill="#93a4ba">TunnelScope</text>
            {nodes.map((n) => {
              const g = hardened ? n.after.grade : n.a.summary.grade
              return (
                <g key={n.a.id} className="cursor-pointer" onMouseEnter={() => setHover(n.a.id)} onMouseLeave={() => setHover(null)} onClick={() => open(n.a)}
                  role="button" tabIndex={0} aria-label={`${n.a.scenario.name}, grade ${g}`} onKeyDown={(e) => e.key === 'Enter' && open(n.a)} onFocus={() => setHover(n.a.id)} onBlur={() => setHover(null)}>
                  <circle cx={n.x} cy={n.y} r={hover === n.a.id ? 27 : 23} fill="rgb(var(--panel))" stroke={GRADE_HEX[g]} strokeWidth={3} style={{ transition: 'r .15s' }} />
                  <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize="18" fontWeight="700" fill={GRADE_HEX[g]}>{g}</text>
                  <text x={n.x} y={n.y + (n.y > CY ? 44 : -34)} textAnchor="middle" fontSize="12" fill="rgb(var(--paper))">{n.a.scenario.name.length > 22 ? n.a.scenario.name.slice(0, 21) + '…' : n.a.scenario.name}</text>
                </g>
              )
            })}
          </svg>
          {h && (
            <div className="pointer-events-none absolute left-4 top-4 w-[260px] rounded-2xl border border-rule/70 bg-panel/95 p-4 text-[13px] shadow-lg">
              <div className="flex items-center justify-between"><span className="font-semibold">{h.a.scenario.name}</span><GradeLetter g={hardened ? h.after.grade : h.a.summary.grade} className="text-[22px]" /></div>
              <div className="mt-1 text-muted">IKEv{h.a.scenario.ikeVersion} · {h.a.scenario.protocol === 'AH' ? 'AH only' : encName(h.a.scenario)} · DH {h.a.scenario.dh}</div>
              <div className="mt-2">Score {h.a.summary.score} <span className="text-muted">→ {h.after.score} with fixes</span></div>
              <div className="mt-1 text-muted">Select to open the full analysis</div>
            </div>
          )}
          <div className="flex flex-wrap gap-4 px-3 pb-2 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-2"><span className="h-[3px] w-6 rounded bg-pass" />Strong tunnel</span>
            <span className="inline-flex items-center gap-2"><span className="h-[3px] w-6 rounded bg-critical" />Critical tunnel</span>
            <span className="inline-flex items-center gap-2"><span className="h-0 w-6 border-t-[3px] border-dashed border-muted" />No forward secrecy</span>
            <span>Thicker line = more traffic</span>
          </div>
        </Glass>

        <div className="space-y-5">
          <Solid className="p-6">
            <div className="text-[13px] text-[#93a4ba]">{hardened ? 'Fleet score with every fix applied' : 'Fleet security score'}</div>
            <div className="mt-2 flex justify-center"><ScoreDial key={shown} score={shown} grade={gradeOf(shown)} size={220} dark /></div>
            <p className="mt-3 text-[13.5px] text-[#b6c4d8]">
              {hardened ? `Applying TunnelScope's recommendations across all ${nodes.length} tunnels lifts the fleet from ${now} to ${fixed}.` : `Traffic-weighted average across ${nodes.length} tunnels. Applying every recommendation would lift it to ${fixed}.`}
            </p>
          </Solid>
          <Glass className="p-5">
            <SectionTitle>Fix these first</SectionTitle>
            <ul className="space-y-2">
              {worst.map((n) => (
                <li key={n.a.id}>
                  <button onClick={() => open(n.a)} onMouseEnter={() => setHover(n.a.id)} onMouseLeave={() => setHover(null)}
                    className={clsx('flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-panel2/70', hover === n.a.id && 'bg-panel2/70')}>
                    <GradeLetter g={n.a.summary.grade} className="w-6 text-[24px]" />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{n.a.scenario.name}</span><span className="text-[12.5px] text-muted">{n.a.summary.score} → {n.after.score} after {applicableFixes(n.a.scenario).length} fixes</span></span>
                    <ArrowUpRight size={16} className="text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </Glass>
        </div>
      </div>
    </div>
  )
}
