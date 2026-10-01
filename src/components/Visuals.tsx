import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Lock } from 'lucide-react'
import clsx from 'clsx'
import type { IkeExchange, PacketRec, Scenario, Threat, TrafficWindow } from '../lib/types'
import { TRAFFIC, TRAFFIC_ORDER } from '../data/constants'
import { packetBytes, type RegionKind } from '../data/hexgen'

/* ---------- IKE ladder ---------- */
export function IkeLadder({ exchanges, limit }: { exchanges: IkeExchange[]; limit?: number }) {
  const list = limit !== undefined ? exchanges.slice(0, limit) : exchanges
  const ROW = 64
  const H = list.length * ROW + 70
  const L = 130
  const R = 570
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 700 ${H}`} className="min-w-[640px] w-full" role="img" aria-label={`IKE message ladder with ${list.length} messages`}>
        <defs>
          <marker id="arr-r" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="rgb(var(--ike))" /></marker>
        </defs>
        {[['Initiator', L], ['Responder', R]].map(([n, x]) => (
          <g key={n as string}>
            <rect x={(x as number) - 52} y={4} width={104} height={30} rx={15} fill="rgb(var(--solid))" />
            <text x={x as number} y={24} textAnchor="middle" fontSize="13" fontWeight="600" fill="#e7edf4">{n}</text>
            <line x1={x as number} x2={x as number} y1={34} y2={H - 8} stroke="rgb(var(--rule))" strokeWidth="1.5" strokeDasharray="4 5" />
          </g>
        ))}
        {list.map((e, i) => {
          const y = 66 + i * ROW
          const right = e.direction === 'i→r'
          const [x1, x2] = right ? [L, R - 2] : [R, L + 2]
          const midX = (L + R) / 2
          return (
            <g key={e.index}>
              {e.rekey && (i === 0 || !list[i - 1].rekey) && (
                <text x={12} y={y - 30} fontSize="11" fill="rgb(var(--muted))">Rekey</text>
              )}
              <line x1={x1} x2={x2} y1={y} y2={y} stroke="rgb(var(--ike))" strokeWidth="2.2" markerEnd="url(#arr-r)" />
              <text x={midX + (e.encrypted ? 8 : 0)} y={y - 16} textAnchor="middle" fontSize="13" fontWeight="600" fill="rgb(var(--paper))">
                {e.exchange} · {e.size} B
              </text>
              {e.encrypted && (
                <g transform={`translate(${midX - (e.exchange.length + String(e.size).length) * 3.6 - 14} ${y - 27})`} stroke="rgb(var(--muted))" strokeWidth="1.6" fill="none" strokeLinecap="round">
                  <rect x="1" y="6" width="10" height="8" rx="2" fill="rgb(var(--muted))" stroke="none" /><path d="M3 6V4a3 3 0 0 1 6 0v2" />
                </g>
              )}
              <text x={midX} y={y + 17} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))" fontFamily="JetBrains Mono, monospace">{e.payloads.join(' ').slice(0, 58)}</text>
              <text x={right ? 14 : 686} y={y + 4} textAnchor={right ? 'start' : 'end'} fontSize="11" fill="rgb(var(--muted))" fontFamily="JetBrains Mono, monospace">{e.ts.toFixed(2)} s</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ---------- Threat heatmap ---------- */
export function ThreatHeatmap({ threats, selected, onSelect }: { threats: Threat[]; selected?: string; onSelect?: (id: string) => void }) {
  const cell = (l: number, i: number) => {
    const r = l * i
    return r >= 17 ? 'var(--c-crit)' : r >= 10 ? 'var(--c-high)' : r >= 5 ? 'var(--c-med)' : 'var(--c-low)'
  }
  return (
    <div className="flex gap-3" style={{ ['--c-crit' as string]: 'rgb(var(--critical) / .32)', ['--c-high' as string]: 'rgb(var(--high) / .28)', ['--c-med' as string]: 'rgb(var(--medium) / .26)', ['--c-low' as string]: 'rgb(var(--pass) / .16)' }}>
      <div className="flex w-5 items-center justify-center"><span className="label -rotate-90 whitespace-nowrap">Impact</span></div>
      <div className="flex-1">
        <div className="grid grid-cols-[22px_repeat(5,1fr)] gap-1.5">
          {[5, 4, 3, 2, 1].map((imp) => (
            <div key={imp} className="contents">
              <div className="grid place-items-center text-[12px] text-muted">{imp}</div>
              {[1, 2, 3, 4, 5].map((lik) => {
                const here = threats.filter((t) => t.likelihood === lik && t.impact === imp)
                return (
                  <div key={lik} className="flex min-h-[64px] flex-wrap content-center items-center justify-center gap-1 rounded-xl p-1.5" style={{ background: cell(lik, imp) }}>
                    {here.map((t) => (
                      <button key={t.id} onClick={() => onSelect?.(t.id)} aria-label={`${t.id} ${t.name}`}
                        className={clsx('mono rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-transform hover:scale-110', selected === t.id ? 'bg-solid text-[#C6F560] ring-2 ring-lime' : 'bg-solid/85 text-[#e7edf4]')}>{t.id}</button>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
          <div />
          {[1, 2, 3, 4, 5].map((l) => <div key={l} className="text-center text-[12px] text-muted">{l}</div>)}
        </div>
        <div className="label mt-1 text-center">Likelihood</div>
      </div>
    </div>
  )
}

/* ---------- Traffic timeline ---------- */
export function TrafficTimeline({ windows }: { windows: TrafficWindow[] }) {
  const data = useMemo(() => windows.map((w) => ({ t: w.t_start, ...Object.fromEntries(TRAFFIC_ORDER.map((c) => [c, Math.round((w.probs[c] ?? 0) * 100)])) })), [windows])
  return (
    <div className="h-[260px]" role="img" aria-label="Stacked area chart of predicted traffic class probability over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -14, right: 6, top: 6 }}>
          <CartesianGrid stroke="rgb(var(--rule))" strokeOpacity={0.5} vertical={false} />
          <XAxis dataKey="t" tickFormatter={(v) => `${v}s`} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid rgb(var(--rule))', background: 'rgb(var(--panel))', color: 'rgb(var(--paper))', fontSize: 13 }}
            formatter={(v: number, k: string) => [`${v}%`, TRAFFIC[k as keyof typeof TRAFFIC]?.label ?? k]} labelFormatter={(l) => `Window at ${l} s`} />
          {TRAFFIC_ORDER.map((c) => (
            <Area key={c} type="monotone" dataKey={c} stackId="1" stroke={TRAFFIC[c].color} fill={TRAFFIC[c].color} fillOpacity={0.85} strokeWidth={0} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Hex view ---------- */
const REGION_STYLE: Record<RegionKind, string> = {
  ip: 'bg-muted/20',
  udp: 'bg-muted/32',
  ike_hdr: 'bg-ike/35',
  ike_body: 'bg-ike/15',
  esp_hdr: 'bg-esp/45',
  iv: 'bg-esp/28',
  cipher: 'bg-esp/10',
  icv: 'bg-esp/45',
  ah_hdr: 'bg-ah/40',
  plain: 'bg-ah/18',
}
export function HexView({ packet, scenario }: { packet: PacketRec; scenario: Scenario }) {
  const { bytes, regions, total } = useMemo(() => packetBytes(packet, scenario), [packet, scenario])
  const [hov, setHov] = useState<number | null>(null)
  const regionOf = (i: number) => regions.findIndex((r) => i >= r.start && i < r.end)
  const rows = Math.ceil(bytes.length / 16)
  return (
    <div>
      <div className="mono overflow-x-auto rounded-2xl bg-panel2/60 p-3 text-[12.5px] leading-[1.9]">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-4 whitespace-nowrap">
            <span className="w-10 text-muted">{(r * 16).toString(16).padStart(4, '0')}</span>
            <span className="flex">
              {bytes.slice(r * 16, r * 16 + 16).map((b, c) => {
                const idx = r * 16 + c
                const ri = regionOf(idx)
                return (
                  <span key={c} onMouseEnter={() => setHov(ri)} onMouseLeave={() => setHov(null)}
                    className={clsx('inline-block w-[22px] rounded-[4px] text-center', ri >= 0 && REGION_STYLE[regions[ri].kind], hov === ri && ri >= 0 && 'ring-1 ring-paper/40')}>
                    {b.toString(16).padStart(2, '0')}
                  </span>
                )
              })}
            </span>
            <span className="text-muted">{bytes.slice(r * 16, r * 16 + 16).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('')}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        {regions.map((r, i) => (
          <span key={i} className="inline-flex items-center gap-1.5"><span className={clsx('h-2.5 w-2.5 rounded-sm', REGION_STYLE[r.kind])} />{r.label}</span>
        ))}
        {total > bytes.length && <span>· showing first {bytes.length} of {total} bytes</span>}
      </div>
    </div>
  )
}

/* ---------- Confusion matrix ---------- */
export function ConfusionMatrix({ labels, matrix, short = true }: { labels: string[]; matrix: number[][]; short?: boolean }) {
  const nm = (l: string) => (TRAFFIC[l as keyof typeof TRAFFIC]?.label ?? l)
  const abbr = (l: string) => (short ? nm(l).split(' ')[0].replace('/', '') : nm(l))
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-center text-[12.5px]" aria-label="Confusion matrix">
        <thead>
          <tr><th className="text-left font-normal text-muted">Actual ↓ / Predicted →</th>{labels.map((l) => <th key={l} className="px-1 pb-1 font-medium text-muted">{abbr(l)}</th>)}</tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const sum = row.reduce((a, b) => a + b, 0)
            return (
              <tr key={i}>
                <th className="pr-2 text-left font-medium text-muted">{abbr(labels[i])}</th>
                {row.map((v, j) => {
                  const p = v / sum
                  return (
                    <td key={j} className="rounded-lg py-2.5 tabular-nums" title={`${v} windows (${(p * 100).toFixed(1)}% of ${nm(labels[i])})`}
                      style={{ background: i === j ? `rgb(var(--esp) / ${0.15 + p * 0.65})` : v ? `rgb(var(--high) / ${Math.min(0.6, 0.1 + p * 4)})` : 'rgb(var(--rule) / .25)', color: i === j && p > 0.7 ? '#06222d' : undefined, fontWeight: i === j ? 600 : 400 }}>
                      {v}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { Lock }
