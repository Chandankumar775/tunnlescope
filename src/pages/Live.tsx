import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Btn, ConfidenceBar, Glass, MethodBadge, PageHead, SectionTitle, Segmented, Select, Solid } from '../components/ui'
import { IkeLadder } from '../components/Visuals'
import ScoreDial from '../components/ScoreDial'
import { ANALYSES } from '../data/analyses'
import { TRAFFIC } from '../data/constants'
import { gradeOf } from '../data/engine'
import { useStore } from '../lib/store'
import type { Analysis, Method } from '../lib/types'

interface Ev { ts: number; kind: 'ike' | 'esp' | 'ai' | 'score'; text: string }

function buildEvents(a: Analysis): Ev[] {
  const ev: Ev[] = []
  a.ike_exchanges.forEach((e) => ev.push({ ts: e.ts, kind: 'ike', text: `${e.exchange} ${e.direction} · ${e.size} B${e.rekey ? ' · rekey' : ''}` }))
  const sa = a.security_associations[0]
  ev.push({ ts: 0.4, kind: 'esp', text: `${a.scenario.protocol} flow detected · SPI ${sa.spi_hex} · ${sa.src} → ${sa.dst}` })
  const f = (k: string) => a.identification.find((x) => x.key === k)?.value ?? ''
  ev.push({ ts: 0.1, kind: 'ai', text: `Cleartext read: IKEv${a.scenario.ikeVersion}, ${f('ike_encryption')}, ${f('dh_group')}` })
  ev.push({ ts: Math.max(6, a.duration_s * 0.1), kind: 'ai', text: `Side-channel: ESP cipher family looks like ${f('esp_cipher_family')}` })
  ev.push({ ts: Math.max(12, a.duration_s * 0.2), kind: 'ai', text: `ML: tunnel mode = ${f('mode')}` })
  ev.push({ ts: a.duration_s * 0.36, kind: 'ai', text: `Rekey seen · PFS ${f('pfs').toLowerCase()}` })
  ev.push({ ts: a.duration_s * 0.55, kind: 'score', text: `Score settles at ${a.summary.score} (grade ${a.summary.grade})` })
  return ev.sort((x, y) => x.ts - y.ts)
}

const REVEAL: Record<Method, number> = { cleartext: 0.1, 'side-channel': 0.1, ml: 0.2, heuristic: 0.36 }

export default function Live() {
  const nav = useNavigate()
  const setCurrent = useStore((s) => s.setCurrent)
  const [id, setId] = useState('S11')
  const [speed, setSpeed] = useState(10)
  const [running, setRunning] = useState(false)
  const [t, setT] = useState(0)
  const [done, setDone] = useState(false)
  const a = ANALYSES.find((x) => x.id === id)!
  const events = useMemo(() => buildEvents(a), [a])
  const timer = useRef<number | null>(null)

  const stop = () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; setRunning(false) }
  useEffect(() => stop, [])
  useEffect(() => { stop(); setT(0); setDone(false) }, [id])

  const start = () => {
    stop(); setT(0); setDone(false); setRunning(true)
    timer.current = window.setInterval(() => {
      setT((prev) => {
        const next = prev + 0.5 * speed
        if (next >= a.duration_s) {
          if (timer.current) window.clearInterval(timer.current)
          timer.current = null
          setRunning(false); setDone(true)
          toast.success('Analysis complete')
          return a.duration_s
        }
        return next
      })
    }, 500)
  }

  const frac = Math.min(1, t / a.duration_s)
  const sec = Math.min(a.timeline.length - 1, Math.floor(t))
  const chart = a.timeline.slice(Math.max(0, sec - 59), sec + 1).map((b) => ({ s: b.t, ike: b.ike, esp: b.esp, ah: b.ah, other: b.other }))
  const shownEx = a.ike_exchanges.filter((e) => e.ts <= t)
  const win = a.traffic.windows[Math.min(a.traffic.windows.length - 1, Math.floor(t / 5))]
  const log = events.filter((e) => e.ts <= t).reverse()
  const score = Math.round(100 - (100 - a.summary.score) * Math.min(1, frac / 0.55))
  const started = running || t > 0 || done

  return (
    <div>
      <PageHead title="Live monitor" sub="Replays a scenario in scaled real time and shows what TunnelScope learns as evidence arrives. Real interface sniffing is optional and off by default."
        actions={<>
          <Select label="Scenario" value={id} onChange={setId} options={ANALYSES.map((x) => ({ id: x.id, label: `${x.id} · ${x.scenario.name}` }))} className="min-w-[250px]" />
          <Segmented value={speed} onChange={setSpeed} options={[{ id: 1, label: '1×' }, { id: 4, label: '4×' }, { id: 10, label: '10×' }]} />
          {running ? <Btn variant="ink" icon={Square} onClick={stop}>Stop live monitor</Btn> : <Btn variant="lime" icon={Play} onClick={start}>Start live monitor</Btn>}
        </>} />

      <div className="mb-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule/50"><div className="h-full rounded-full bg-esp transition-all duration-500" style={{ width: `${frac * 100}%` }} /></div>
        <span className="mono w-[120px] text-right text-[13px] text-muted">{t.toFixed(0)} s / {a.duration_s} s</span>
        {running && <span className="inline-flex items-center gap-2 text-[13px] font-medium text-pass"><span className="live-dot h-2 w-2 rounded-full bg-pass" />Live</span>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" data-tour="live">
        <div className="space-y-5">
          <Glass className="p-6">
            <SectionTitle aside={<span className="label">Packets per second · rolling 60 s</span>}>Traffic by protocol</SectionTitle>
            <div className="h-[230px]" role="img" aria-label="Rolling packets per second by protocol">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: -16, right: 4, top: 4 }}>
                  <CartesianGrid stroke="rgb(var(--rule))" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="s" tickFormatter={(v) => `${v}s`} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Area isAnimationActive={false} type="monotone" dataKey="esp" stackId="1" stroke="rgb(var(--esp))" fill="rgb(var(--esp))" fillOpacity={0.55} />
                  <Area isAnimationActive={false} type="monotone" dataKey="ah" stackId="1" stroke="rgb(var(--ah))" fill="rgb(var(--ah))" fillOpacity={0.55} />
                  <Area isAnimationActive={false} type="monotone" dataKey="ike" stackId="1" stroke="rgb(var(--ike))" fill="rgb(var(--ike))" fillOpacity={0.9} />
                  <Area isAnimationActive={false} type="monotone" dataKey="other" stackId="1" stroke="rgb(var(--muted))" fill="rgb(var(--muted))" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-[13px]">
              {[['IKE', 'bg-ike'], ['ESP', 'bg-esp'], ['AH', 'bg-ah'], ['Other', 'bg-muted']].map(([n, c]) => <span key={n} className="inline-flex items-center gap-1.5"><span className={clsx('h-2.5 w-2.5 rounded-sm', c)} />{n}</span>)}
            </div>
          </Glass>

          <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
            <Glass className="p-6">
              <SectionTitle>Now inside the tunnel</SectionTitle>
              {started && t > 3 ? (
                <>
                  <div className="num-wide text-[26px] leading-tight">{TRAFFIC[win.label].label}</div>
                  <div className="mb-3 text-[13px] text-muted">{Math.round(win.confidence * 100)}% confidence · window {win.t_start}–{win.t_end} s</div>
                  <div className="space-y-1.5">
                    {Object.entries(win.probs).sort((x, y) => y[1] - x[1]).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-[13px]"><span className="w-[120px] truncate">{TRAFFIC[k as keyof typeof TRAFFIC]?.label}</span><ConfidenceBar value={v} animate={false} className="flex-1" /></div>
                    ))}
                  </div>
                </>
              ) : <p className="text-muted">Waiting for enough ESP packets to fill a window.</p>}
            </Glass>
            <Solid className="p-6">
              <div className="mb-1 text-[13px] text-[#93a4ba]">Running score</div>
              <div className="flex justify-center"><ScoreDial score={started ? score : 100} grade={gradeOf(started ? score : 100)} size={200} dark /></div>
              {done && <div className="mt-3 flex justify-center"><Btn variant="lime" icon={ArrowUpRight} onClick={() => { setCurrent(a.id); nav(`/analysis/${a.id}`) }}>Open full analysis</Btn></div>}
            </Solid>
          </div>

          <Glass className="p-6">
            <SectionTitle>Event log</SectionTitle>
            <div className="max-h-[240px] space-y-1.5 overflow-auto pr-1">
              {log.length === 0 && <p className="text-muted">Press Start live monitor to begin.</p>}
              {log.map((e, i) => (
                <div key={i} className="flex items-start gap-3 text-[13.5px]">
                  <span className="mono w-[58px] shrink-0 text-muted">{e.ts.toFixed(1)} s</span>
                  <span className={clsx('mt-1 h-2 w-2 shrink-0 rounded-full', e.kind === 'ike' ? 'bg-ike' : e.kind === 'esp' ? 'bg-esp' : e.kind === 'ai' ? 'bg-ah' : 'bg-pass')} />
                  <span>{e.text}</span>
                </div>
              ))}
            </div>
          </Glass>
        </div>

        <div className="space-y-5">
          <Glass className="p-6">
            <SectionTitle aside={<span className="label">{shownEx.length} of {a.ike_exchanges.length} messages</span>}>IKE ladder</SectionTitle>
            {shownEx.length ? <div className="max-h-[360px] overflow-auto"><IkeLadder exchanges={shownEx} /></div> : <p className="text-muted">No IKE messages yet.</p>}
          </Glass>
          <Glass className="overflow-hidden p-2">
            <div className="px-4 pt-3"><SectionTitle>Fields discovered</SectionTitle></div>
            <div className="max-h-[520px] divide-y divide-rule/40 overflow-auto">
              {a.identification.map((f) => {
                const known = started && frac >= REVEAL[f.method] * (f.method === 'cleartext' ? 0.05 : 1) * 0.6
                const conf = known ? Math.min(f.confidence, f.confidence * (0.45 + frac * 1.2)) : 0
                return (
                  <div key={f.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5">
                    <div className="min-w-0"><div className="text-[12.5px] text-muted">{f.label}</div><div className={clsx('truncate text-[14px] font-medium', !known && 'text-muted/70')}>{known ? f.value : 'Waiting for evidence…'}</div></div>
                    {known ? <MethodBadge m={f.method} /> : <span />}
                    <ConfidenceBar value={conf} className="col-span-2" animate={false} />
                  </div>
                )
              })}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  )
}
