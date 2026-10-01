import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown, Download, FileJson, FileText, Lock, ShieldCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import type { Analysis, Category } from '../lib/types'
import { useAnalysis } from '../lib/useAnalyses'
import { Btn, Chip, CodeBlock, ConfidenceBar, EmptyState, Glass, MethodBadge, SEV, SectionTitle, SeverityChip, Solid, Tabs } from '../components/ui'
import ScoreDial from '../components/ScoreDial'
import PacketRibbon from '../components/PacketRibbon'
import { IkeLadder } from '../components/Visuals'
import { download, fmtDur, fmtInt } from '../lib/format'
import { executiveHtml, openPrint, technicalHtml } from '../lib/report'
import { topFindings } from '../data/build'
import { compliance as runCompliance } from '../data/engine'
import { useStore } from '../lib/store'
import { AssessmentTab, MetadataTab, PacketsTab, ThreatsTab, TrafficTab } from './AnalysisTabs'
import FixSimulator from './FixSimulator'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'identification', label: 'Protocol identification' },
  { id: 'assessment', label: 'Security assessment' },
  { id: 'simulate', label: 'Fix simulator' },
  { id: 'traffic', label: 'Traffic inside the tunnel' },
  { id: 'threats', label: 'Threat matrix' },
  { id: 'metadata', label: 'Metadata exposure' },
  { id: 'packets', label: 'SAs and packets' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function AnalysisPage() {
  const { id, tab } = useParams()
  const nav = useNavigate()
  const a = useAnalysis(id)
  const t = (TABS.find((x) => x.id === tab)?.id ?? 'summary') as TabId
  if (!a) {
    return <EmptyState title="Analysis not found" body="That capture isn't in the library. Pick one from the Overview or generate a sample." action={<Btn to="/">Go to Overview</Btn>} />
  }
  const s = a.summary
  const exec = () => { toast.success(openPrint(executiveHtml(a)) ? 'Report ready — choose Save as PDF' : 'Allow pop-ups to open the report'); }
  const tech = () => { toast.success(openPrint(technicalHtml(a)) ? 'Report ready — choose Save as PDF' : 'Allow pop-ups to open the report') }

  return (
    <div>
      {/* hero */}
      <Solid className="relative mb-5 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-esp/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-ah/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1" style={{ minWidth: 280 }}>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#93a4ba]">
              <span className="mono rounded-md bg-white/10 px-2 py-0.5">{a.id}</span>
              <span>{fmtInt(a.packet_count)} packets</span><span>·</span>
              <span>{a.counts.ike} IKE</span><span>·</span>
              <span>{fmtInt(a.scenario.protocol === 'AH' ? a.counts.ah : a.counts.esp)} {a.scenario.protocol}</span><span>·</span>
              <span>{fmtDur(a.duration_s)}</span>
            </div>
            <h1 className="title-wide mt-2 text-[34px] leading-tight text-[#e7edf4]">{a.scenario.name}</h1>
            <p className="mt-1 max-w-[56ch] text-[15px] text-[#b6c4d8]">{a.scenario.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn variant="lime" icon={FileText} onClick={exec}>Download executive report</Btn>
              <Btn variant="glass" icon={Download} onClick={tech} className="!border-white/15 !bg-white/10 !text-[#e7edf4]">Download technical report</Btn>
              <Btn variant="glass" icon={FileJson} className="!border-white/15 !bg-white/10 !text-[#e7edf4]" onClick={() => { download(`${a.id}-analysis.json`, JSON.stringify(a, null, 2), 'application/json'); toast.success('Report downloaded') }}>Export JSON</Btn>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <ScoreDial score={s.score} grade={s.grade} size={230} dark />
            <div className="space-y-3">
              <Metric label="Risk score" value={String(s.risk_score)} sub={`${s.risk_level} risk`} />
              <Metric label="AI confidence" value={`${Math.round(s.ai_confidence * 100)}%`} sub="weighted mean" />
              <Metric label="Verdict" value={s.verdict} small />
            </div>
          </div>
        </div>
        <div className="relative mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10" data-tour="ribbon">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[14px] font-medium text-[#e7edf4]">Packet dissection ribbon</div>
            <div className="text-[12px] text-[#93a4ba]">Representative {a.scenario.protocol} packet · derived from the identified cipher and ICV</div>
          </div>
          <PacketRibbon key={a.id} segments={a.representative_packet.segments} protocol={a.scenario.protocol} />
        </div>
      </Solid>

      <div className="mb-5"><Tabs tabs={TABS.map((x) => ({ id: x.id, label: x.label }))} value={t} onChange={(v) => nav(`/analysis/${a.id}/${v}`)} /></div>

      {t === 'summary' && <SummaryTab a={a} />}
      {t === 'identification' && <IdentificationTab a={a} />}
      {t === 'assessment' && <AssessmentTab a={a} />}
      {t === 'simulate' && <FixSimulator a={a} />}
      {t === 'traffic' && <TrafficTab a={a} />}
      {t === 'threats' && <ThreatsTab a={a} />}
      {t === 'metadata' && <MetadataTab a={a} />}
      {t === 'packets' && <PacketsTab a={a} />}
    </div>
  )
}

function Metric({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[12px] text-[#93a4ba]">{label}</div>
      <div className={clsx('num-wide leading-none text-[#e7edf4]', small ? 'text-[16px]' : 'text-[30px]')}>{value}</div>
      {sub && <div className="text-[12px] text-[#93a4ba]">{sub}</div>}
    </div>
  )
}

/* ---------- Summary ---------- */
function CategoryBars({ cats }: { cats: Category[] }) {
  return (
    <div className="space-y-3">
      {cats.map((c) => (
        <div key={c.name}>
          <div className="mb-1 flex justify-between text-[13.5px]"><span>{c.name}</span><span className="text-muted tabular-nums">{c.score}/100 · weight {c.weight}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-rule/50">
            <motion.div className={clsx('h-full rounded-full', c.score >= 90 ? 'bg-pass' : c.score >= 70 ? 'bg-low' : c.score >= 50 ? 'bg-medium' : c.score >= 25 ? 'bg-high' : 'bg-critical')}
              initial={{ width: 0 }} animate={{ width: `${Math.max(2, c.score)}%` }} transition={{ duration: 0.7 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SummaryTab({ a }: { a: Analysis }) {
  const org = useStore((s) => s.org)
  const [profile, setProfile] = useState('nist')
  const comp = runCompliance(a.scenario, org)
  const cur = comp.find((c) => c.profile === profile) ?? comp[0]
  const top = topFindings(a.assessment.findings, 5)
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Glass className="p-6">
          <div className="flex items-start gap-3">
            <span className={clsx('mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl', a.summary.score >= 80 ? 'bg-pass/15 text-pass' : 'bg-critical/12 text-critical')}>
              {a.summary.score >= 80 ? <ShieldCheck size={19} /> : <TriangleAlert size={19} />}
            </span>
            <div>
              <div className="title-wide text-[22px] leading-snug">{a.summary.headline}</div>
              <p className="mt-2 max-w-[72ch] text-[15px]">{a.narrative[0]}</p>
              <p className="mt-2 max-w-[72ch] text-muted">{a.narrative[1]}</p>
            </div>
          </div>
        </Glass>
        <Glass className="p-6">
          <SectionTitle aside={<span className="label">{a.summary.counts.critical} critical · {a.summary.counts.high} high · {a.summary.counts.medium} medium · {a.summary.counts.low} low</span>}>Top findings</SectionTitle>
          {top.length === 0 ? <p className="text-muted">No findings above informational level.</p> : (
            <ul className="divide-y divide-rule/50">
              {top.map((f) => (
                <li key={f.id} className="flex gap-3 py-3">
                  <span className={clsx('mt-1 w-1 shrink-0 rounded-full', SEV[f.severity].bar)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{f.title}</span><SeverityChip s={f.severity} /></div>
                    <p className="mt-0.5 text-[14px] text-muted">{f.impact}</p>
                  </div>
                  <span className="mono text-[12px] text-muted">{f.id}</span>
                </li>
              ))}
            </ul>
          )}
        </Glass>
      </div>
      <div className="space-y-5">
        <Glass className="p-6"><SectionTitle>Category scores</SectionTitle><CategoryBars cats={a.assessment.categories} /></Glass>
        <Glass className="p-6">
          <SectionTitle>Compliance</SectionTitle>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {comp.map((c) => (
              <button key={c.profile} onClick={() => setProfile(c.profile)} className={clsx('rounded-full px-3 py-1.5 text-[13px] font-medium', profile === c.profile ? 'bg-solid text-[#e7edf4]' : 'bg-panel2/70 text-muted hover:text-paper')}>
                {c.profile === 'nist' ? 'NIST 800-77' : c.profile === 'rfc8221' ? 'RFC 8221/8247' : c.profile === 'cnsa' ? 'CNSA' : 'Org policy'}
              </button>
            ))}
          </div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[14px] font-medium">{cur.name}</div>
            <Chip tone={cur.status === 'compliant' ? 'pass' : cur.status === 'partially compliant' ? 'medium' : 'critical'}>{cur.status}</Chip>
          </div>
          <ul className="space-y-1.5">
            {cur.checks.map((c) => (
              <li key={c.name} className="flex items-start gap-2 text-[13.5px]">
                <span className={clsx('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white', c.passed ? 'bg-pass' : 'bg-critical')}>{c.passed ? '✓' : '✕'}</span>
                <span className="flex-1">{c.name}</span><span className="text-muted">{c.detail}</span>
              </li>
            ))}
          </ul>
        </Glass>
      </div>
    </div>
  )
}

/* ---------- Identification ---------- */
function IdentificationTab({ a }: { a: Analysis }) {
  const [open, setOpen] = useState<string | null>('esp_cipher_family')
  const MONO = new Set(['dh_group', 'ike_encryption', 'ike_prf', 'ike_integrity', 'esp_cipher_family', 'esp_integrity', 'esp_key_length'])
  return (
    <div className="space-y-5">
      <Glass className="overflow-hidden p-2" data-tour="identification">
        <div className="px-4 pt-3"><SectionTitle aside={<span className="label">Every result shows its method, confidence and reasoning</span>}>Identified configuration</SectionTitle></div>
        <div className="divide-y divide-rule/40">
          {a.identification.map((f) => (
            <div key={f.key}>
              <button className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left hover:bg-panel2/50 md:grid-cols-[210px_minmax(0,1.3fr)_minmax(150px,1fr)_130px_24px]"
                aria-expanded={open === f.key} onClick={() => setOpen(open === f.key ? null : f.key)}>
                <span className="text-[14px] text-muted">{f.label}</span>
                <span className={clsx('min-w-0 font-medium', MONO.has(f.key) && 'mono text-[13.5px]')}>{f.value}</span>
                <ConfidenceBar value={f.confidence} animate={false} className="col-span-2 md:col-span-1" />
                <span className="hidden md:block"><MethodBadge m={f.method} /></span>
                <ChevronDown size={16} className={clsx('hidden text-muted transition-transform md:block', open === f.key && 'rotate-180')} />
              </button>
              {open === f.key && (
                <div className="bg-panel2/40 px-4 pb-4 pt-1 md:pl-[226px]">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-[13px] font-semibold">How we know</span><MethodBadge m={f.method} />
                    {f.ground_truth_match !== null && <Chip tone={f.ground_truth_match ? 'pass' : 'medium'}>{f.ground_truth_match ? 'Matches testbed ground truth' : 'Differs from ground truth'}</Chip>}</div>
                  <p className="max-w-[78ch] text-[14px]">{f.explanation}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">Evidence packets
                    {f.evidence.slice(0, 20).map((p) => <span key={p} className="mono rounded-md bg-panel px-1.5 py-0.5">#{p}</span>)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Glass>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Glass className="p-6">
          <SectionTitle aside={<span className="inline-flex items-center gap-1.5 text-[12px] text-muted"><Lock size={12} />encrypted</span>}>IKE ladder</SectionTitle>
          <IkeLadder exchanges={a.ike_exchanges} />
        </Glass>
        <Glass className="p-6">
          <SectionTitle>Proposals offered and selected</SectionTitle>
          <div className="space-y-3">
            {a.proposals_offered.map((p) => (
              <div key={p.number} className={clsx('rounded-2xl border p-4', p.selected ? 'border-esp/50 bg-esp/5' : 'border-rule/60 bg-panel2/40')}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium">Proposal {p.number}</span><Chip tone="muted">{p.protocol}</Chip>
                  {p.selected ? <Chip tone="esp">Selected</Chip> : <Chip tone="muted">Offered only</Chip>}
                  <span className="ml-auto"><Chip tone={p.strength === 'strong' ? 'pass' : p.strength === 'acceptable' ? 'medium' : p.strength === 'weak' ? 'high' : 'critical'}>{p.strength}</Chip></span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.transforms.map((tr, i) => <span key={i} className="mono rounded-lg bg-panel px-2 py-1 text-[12px]"><span className="text-muted">{tr.type}</span> {tr.name}{tr.key_length ? `-${tr.key_length}` : ''}</span>)}
                </div>
                {!p.selected && p.strength !== 'strong' && <p className="mt-2 text-[13px] text-high">Still offered: an active attacker could try to force this weaker option.</p>}
              </div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  )
}

export { CodeBlock }
