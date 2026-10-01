import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Analysis, Severity } from '../lib/types'
import { Chip, CodeBlock, ConfidenceBar, Glass, ProtocolChip, SEV, SectionTitle, SeverityChip } from '../components/ui'
import { HexView, ThreatHeatmap, TrafficTimeline } from '../components/Visuals'
import { TRAFFIC } from '../data/constants'
import { fmtBytes, fmtInt } from '../lib/format'

const ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

/* ---------- Security assessment ---------- */
export function AssessmentTab({ a }: { a: Analysis }) {
  const [open, setOpen] = useState<string | null>(() => a.assessment.findings.find((f) => f.severity !== 'pass')?.id ?? null)
  const [showPass, setShowPass] = useState(false)
  const groups = ORDER.map((sev) => ({ sev, items: a.assessment.findings.filter((f) => f.severity === sev) })).filter((g) => g.items.length)
  const pass = a.assessment.findings.filter((f) => f.severity === 'pass')
  const radar = a.assessment.categories.map((c) => ({ name: c.name.replace(' & PFS', '').replace('Cryptographic strength', 'Crypto'), score: c.score }))
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        {groups.map((g) => (
          <Glass key={g.sev} className="overflow-hidden p-2">
            <div className="flex items-center gap-2 px-4 pb-1 pt-3"><SeverityChip s={g.sev} /><span className="label">{g.items.length} finding{g.items.length > 1 ? 's' : ''}</span></div>
            <div className="divide-y divide-rule/40">
              {g.items.map((f) => <FindingRow key={f.id} f={f} open={open === f.id} toggle={() => setOpen(open === f.id ? null : f.id)} />)}
            </div>
          </Glass>
        ))}
        <Glass className="overflow-hidden p-2">
          <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setShowPass(!showPass)} aria-expanded={showPass}>
            <span className="title-wide text-[16px]">What's configured well <span className="label ml-2">{pass.length} checks passed</span></span>
            <ChevronDown size={18} className={clsx('transition-transform', showPass && 'rotate-180')} />
          </button>
          {showPass && <div className="divide-y divide-rule/40">{pass.map((f) => <FindingRow key={f.id} f={f} open={open === f.id} toggle={() => setOpen(open === f.id ? null : f.id)} />)}</div>}
        </Glass>
      </div>
      <div className="space-y-5">
        <Glass className="p-6">
          <SectionTitle>Category breakdown</SectionTitle>
          <div className="h-[260px]" role="img" aria-label={`Radar chart of category scores: ${a.assessment.categories.map((c) => `${c.name} ${c.score}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="rgb(var(--rule))" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} />
                <Radar dataKey="score" stroke="rgb(var(--esp))" fill="rgb(var(--esp))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <table className="tbl mt-2 w-full text-[13.5px]"><tbody>
            {a.assessment.categories.map((c) => <tr key={c.name}><td>{c.name}</td><td className="text-right tabular-nums text-muted">weight {c.weight}</td><td className="w-14 text-right font-semibold tabular-nums">{c.score}</td></tr>)}
          </tbody></table>
        </Glass>
        <Glass className="p-6">
          <SectionTitle>How the score is computed</SectionTitle>
          <p className="text-[14px] text-muted">Each category starts at 100 and loses 100 / 50 / 25 / 10 points per critical / high / medium / low finding. The overall score is the weighted sum. Any critical finding caps it at 40.</p>
          <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[12px]">
            {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((s) => (
              <div key={s} className={clsx('rounded-xl py-2', SEV[s].bg)}><div className={clsx('num-wide text-[20px]', SEV[s].text)}>{a.summary.counts[s]}</div>{SEV[s].label}</div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  )
}

function FindingRow({ f, open, toggle }: { f: Analysis['assessment']['findings'][number]; open: boolean; toggle: () => void }) {
  return (
    <div className="relative">
      <button className="flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left hover:bg-panel2/40" onClick={toggle} aria-expanded={open}>
        <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', SEV[f.severity].bar)} />
        <span className="mono w-[68px] shrink-0 text-[12px] text-muted">{f.id}</span>
        <span className="min-w-0 flex-1"><span className="font-medium">{f.title}</span><span className="ml-2 text-[13px] text-muted">{f.category}</span></span>
        <SeverityChip s={f.severity} className="hidden sm:inline-flex" />
        <ChevronDown size={16} className={clsx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 bg-panel2/30 py-4 pl-10 pr-5 text-[14px]">
          <p className="max-w-[78ch]">{f.description}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div><div className="label mb-0.5">Impact</div>{f.impact}</div>
            <div><div className="label mb-0.5">Evidence</div>{f.evidence.text}<div className="mt-1 flex flex-wrap gap-1">{f.evidence.packets.map((p) => <span key={p} className="mono rounded-md bg-panel px-1.5 py-0.5 text-[12px]">#{p}</span>)}</div></div>
          </div>
          <div><div className="label mb-0.5">Recommendation</div>{f.recommendation}</div>
          <div className="flex flex-wrap gap-1.5">{f.references.map((r) => <Chip key={r} tone="muted">{r.split(' — ')[0]}</Chip>)}</div>
          {f.config_fix && <CodeBlock code={f.config_fix} />}
        </div>
      )}
    </div>
  )
}

/* ---------- Traffic ---------- */
export function TrafficTab({ a }: { a: Analysis }) {
  const [sel, setSel] = useState(0)
  const w = a.traffic.windows[sel]
  const dom = a.traffic.distribution[0]
  const fmt = (n: number) => `${(n * 100).toFixed(0)}%`
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Glass className="p-6">
          <SectionTitle aside={<span className="label">Predicted class probability per 5 s window</span>}>Traffic inside the tunnel</SectionTitle>
          <TrafficTimeline windows={a.traffic.windows} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {a.traffic.distribution.map((d) => <span key={d.label} className="inline-flex items-center gap-1.5 text-[13px]"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: TRAFFIC[d.label].color }} />{TRAFFIC[d.label].label}</span>)}
          </div>
        </Glass>
        <Glass className="p-6">
          <SectionTitle>Distribution</SectionTitle>
          <p className="mb-3 text-[14px] text-muted">An observer can tell this tunnel mostly carries <b className="text-paper">{TRAFFIC[dom.label].label}</b> with {Math.round(a.scenario.classifierConf * 100)}% model confidence, without decrypting anything.</p>
          <div className="space-y-3">
            {a.traffic.distribution.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex justify-between text-[13.5px]"><span>{TRAFFIC[d.label].label}</span><span className="text-muted tabular-nums">{fmt(d.pct_time)} time · {fmt(d.pct_bytes)} bytes</span></div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-rule/40">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: fmt(d.pct_time), background: TRAFFIC[d.label].color }} />
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-rule/40"><div className="h-full rounded-full opacity-60" style={{ width: fmt(d.pct_bytes), background: TRAFFIC[d.label].color }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">Thick bar: share of time · thin bar: share of bytes</p>
        </Glass>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Glass className="overflow-hidden p-2">
          <div className="px-4 pt-3"><SectionTitle>Window predictions</SectionTitle></div>
          <div className="max-h-[420px] overflow-auto">
            <table className="tbl w-full text-[13.5px]">
              <thead className="sticky top-0 bg-panel/90 backdrop-blur"><tr><th>Window</th><th>SA</th><th>Prediction</th><th className="w-[170px]">Confidence</th></tr></thead>
              <tbody>
                {a.traffic.windows.map((x, i) => (
                  <tr key={i} className={clsx('row-hover cursor-pointer', sel === i && 'bg-esp/10')} onClick={() => setSel(i)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(i)}>
                    <td className="tabular-nums">{x.t_start}–{x.t_end} s</td>
                    <td className="mono text-[12px] text-muted">{x.sa_spi_hex}</td>
                    <td><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: TRAFFIC[x.label].color }} />{TRAFFIC[x.label].label}</span></td>
                    <td><ConfidenceBar value={x.confidence} animate={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Glass>
        <Glass className="p-6">
          <SectionTitle>Why the model thinks this</SectionTitle>
          <div className="mb-2 text-[14px]">Window {w.t_start}–{w.t_end} s → <b>{TRAFFIC[w.label].label}</b> <span className="text-muted">({Math.round(w.confidence * 100)}%)</span></div>
          <div className="mb-3 text-[13px] text-muted">{TRAFFIC[w.label].note}</div>
          <div className="space-y-2.5">
            {w.top_features.map((f) => (
              <div key={f.feature}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="mono">{f.feature}</span><span className="tabular-nums text-muted">{f.value}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-rule/40"><div className="h-full rounded-full bg-ah" style={{ width: `${f.contribution * 400}%`, maxWidth: '100%' }} /></div>
              </div>
            ))}
          </div>
          <div className="label mb-1 mt-4">Class probabilities</div>
          <div className="space-y-1.5">
            {Object.entries(w.probs).sort((x, y) => y[1] - x[1]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-[13px]"><span className="w-[130px] truncate">{TRAFFIC[k as keyof typeof TRAFFIC]?.label}</span><ConfidenceBar value={v} animate={false} className="flex-1" /></div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  )
}

/* ---------- Threats ---------- */
export function ThreatsTab({ a }: { a: Analysis }) {
  const [sel, setSel] = useState<string | undefined>(a.threats.slice().sort((x, y) => y.risk - x.risk)[0]?.id)
  const LV = { low: 'pass', medium: 'medium', high: 'high', critical: 'critical' } as const
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
      <Glass className="p-6" data-tour="threats">
        <SectionTitle>Likelihood × impact</SectionTitle>
        <ThreatHeatmap threats={a.threats} selected={sel} onSelect={setSel} />
        <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-pass/30" />Low 1–4</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-medium/40" />Medium 5–9</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-high/40" />High 10–16</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-critical/45" />Critical 17–25</span>
        </div>
      </Glass>
      <Glass className="overflow-hidden p-2">
        <div className="px-4 pt-3"><SectionTitle>Threat list</SectionTitle></div>
        <div className="divide-y divide-rule/40">
          {[...a.threats].sort((x, y) => y.risk - x.risk).map((t) => (
            <button key={t.id} onClick={() => setSel(t.id)} className={clsx('block w-full px-4 py-3 text-left hover:bg-panel2/50', sel === t.id && 'bg-esp/10')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono rounded-md bg-solid px-1.5 py-0.5 text-[11px] font-semibold text-[#e7edf4]">{t.id}</span>
                <span className="font-medium">{t.name}</span>
                {t.mitre.map((m) => <Chip key={m} tone="ah">{m}</Chip>)}
                <span className="ml-auto flex items-center gap-2"><span className="num-wide text-[18px]">{t.risk}</span><Chip tone={LV[t.level]}>{t.level}</Chip></span>
              </div>
              {sel === t.id && (
                <div className="mt-2 text-[14px] text-muted">
                  {t.description} <span className="text-paper">Likelihood {t.likelihood} × impact {t.impact}.</span>
                  {t.related_findings.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">Linked findings {t.related_findings.map((f) => <span key={f} className="mono rounded-md bg-panel px-1.5 py-0.5 text-[12px] text-paper">{f}</span>)}</div>}
                </div>
              )}
            </button>
          ))}
        </div>
      </Glass>
    </div>
  )
}

/* ---------- Metadata ---------- */
export function MetadataTab({ a }: { a: Analysis }) {
  const SENS = { low: 'pass', medium: 'medium', high: 'high' } as const
  return (
    <div className="space-y-5">
      <Glass className="p-6">
        <div className="title-wide text-[22px]">A passive observer can learn {a.metadata_exposure.length} facts about this deployment without decrypting anything.</div>
        <p className="mt-1 max-w-[72ch] text-muted">Encryption hides content, not behavior. These are the things visible on the wire to anyone who can see the link.</p>
      </Glass>
      <Glass className="overflow-hidden p-2">
        <table className="tbl w-full text-[14px]">
          <thead><tr><th>What leaks</th><th>Exposed value</th><th>Sensitivity</th><th>How it is observed</th></tr></thead>
          <tbody>
            {a.metadata_exposure.map((m) => (
              <tr key={m.item}><td className="font-medium">{m.item}</td><td className="mono max-w-[360px] text-[13px]">{m.exposed_value}</td><td><Chip tone={SENS[m.sensitivity]}>{m.sensitivity}</Chip></td><td className="text-muted">{m.how_observed}</td></tr>
            ))}
          </tbody>
        </table>
      </Glass>
    </div>
  )
}

/* ---------- SAs and packets ---------- */
export function PacketsTab({ a }: { a: Analysis }) {
  const [filter, setFilter] = useState<'all' | 'IKE' | 'ESP' | 'AH' | 'Other'>('all')
  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [limit, setLimit] = useState(60)
  const list = useMemo(() => a.packets.filter((p) => filter === 'all' || p.proto === filter), [a, filter])
  const sel = a.packets.find((p) => p.index === selIdx) ?? null
  return (
    <div className="space-y-5">
      <Glass className="overflow-hidden p-2">
        <div className="px-4 pt-3"><SectionTitle>Security associations</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="tbl w-full min-w-[900px] text-[13.5px]">
            <thead><tr><th>SPI</th><th>Endpoints</th><th>Proto</th><th>Packets</th><th>Bytes</th><th>Seq range</th><th>Gaps</th><th>Duplicates</th><th>Lifetime</th></tr></thead>
            <tbody>
              {a.security_associations.map((s) => (
                <tr key={s.spi_hex} className="row-hover">
                  <td className="mono text-esp">{s.spi_hex}</td><td className="mono text-[12px]">{s.src} → {s.dst}</td><td><ProtocolChip p={s.protocol as 'ESP' | 'AH'} /></td>
                  <td className="tabular-nums">{fmtInt(s.packets)}</td><td>{fmtBytes(s.bytes)}</td><td className="mono text-[12px]">{s.seq_min}–{fmtInt(s.seq_max)}</td>
                  <td>{s.gaps}</td><td className={s.duplicates ? 'font-semibold text-high' : ''}>{s.duplicates}</td><td>{Math.round(s.inferred_lifetime_s / 3600)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Glass>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Glass className="overflow-hidden p-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
            <SectionTitle>Packets</SectionTitle>
            <div className="mb-3 flex gap-1.5">
              {(['all', 'IKE', 'ESP', 'AH', 'Other'] as const).map((f) => (
                <button key={f} onClick={() => { setFilter(f); setLimit(60) }} aria-pressed={filter === f}
                  className={clsx('rounded-full px-3 py-1 text-[12.5px] font-medium', filter === f ? 'bg-solid text-[#e7edf4]' : 'bg-panel2/70 text-muted hover:text-paper')}>{f === 'all' ? 'All' : f}</button>
              ))}
            </div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="tbl w-full text-[13px]">
              <thead className="sticky top-0 bg-panel/90 backdrop-blur"><tr><th>#</th><th>Time</th><th>Source → Destination</th><th>Proto</th><th>Len</th><th>Info</th></tr></thead>
              <tbody>
                {list.slice(0, limit).map((p) => (
                  <tr key={p.index} className={clsx('row-hover cursor-pointer', selIdx === p.index && 'bg-esp/10')} onClick={() => setSelIdx(p.index)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelIdx(p.index)}>
                    <td className="mono text-muted">{p.index}</td><td className="tabular-nums">{p.ts.toFixed(3)}</td>
                    <td className="mono whitespace-nowrap text-[12px]">{p.src} → {p.dst}</td><td><ProtocolChip p={p.proto} /></td><td className="tabular-nums">{p.length}</td>
                    <td className="max-w-[260px] truncate text-muted">{p.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {limit < list.length && <div className="p-3 text-center"><button className="rounded-full bg-panel2/70 px-4 py-1.5 text-[13px] font-medium hover:bg-panel2" onClick={() => setLimit(limit + 100)}>Show more ({list.length - limit} left)</button></div>}
          </div>
          <div className="px-4 py-2 text-[12px] text-muted">Showing a {a.packets.length}-packet sample of {fmtInt(a.packet_count)} total packets.</div>
        </Glass>
        <Glass className="p-6">
          <SectionTitle>Packet bytes</SectionTitle>
          {sel ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[13.5px]"><ProtocolChip p={sel.proto} /><span className="mono">#{sel.index}</span><span className="text-muted">{sel.info}</span></div>
              <HexView packet={sel} scenario={a.scenario} />
            </>
          ) : <p className="text-muted">Select a packet to see its bytes. Header fields are highlighted in protocol colors: IKE amber, ESP cyan, AH violet.</p>}
        </Glass>
      </div>
    </div>
  )
}

export { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis }
