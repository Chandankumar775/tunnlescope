import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BrainCircuit, FileSearch, PlayCircle, Radio, ShieldAlert, Sparkles, UploadCloud, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Btn, ConfidenceBar, GradeLetter, Glass, PageHead, SectionTitle, SeverityChip, Solid, StatTile } from '../components/ui'
import ScoreDial from '../components/ScoreDial'
import { useAllAnalyses } from '../lib/useAnalyses'
import { commonFindings, gradeDistribution } from '../data/analyses'
import { METRICS } from '../data/models'
import { encName } from '../data/engine'
import { topFindings } from '../data/build'
import { fmtDate } from '../lib/format'
import { useStore } from '../lib/store'
import { ALERTS } from '../lib/alerts'
import { Check } from 'lucide-react'
import type { Grade, Severity } from '../lib/types'

const GRADE_BAR: Record<string, string> = { A: 'bg-pass', B: 'bg-low', C: 'bg-medium', D: 'bg-high', E: 'bg-high/80', F: 'bg-critical' }

export default function Overview() {
  const list = useAllAnalyses()
  const nav = useNavigate()
  const setCurrent = useStore((s) => s.setCurrent)
  const { resolved, resolve } = useStore()
  const openAlerts = ALERTS.filter((a) => !resolved.includes(a.id))
  const dist = useMemo(() => gradeDistribution(list), [list])
  const common = useMemo(() => commonFindings(list), [list])
  const avg = Math.round(list.reduce((a, x) => a + x.summary.score, 0) / list.length)
  const crit = list.reduce((a, x) => a + x.summary.counts.critical, 0)
  const worst = [...list].sort((a, b) => a.summary.score - b.summary.score)[0]
  const best = [...list].sort((a, b) => b.summary.score - a.summary.score)[0]
  const open = (id: string) => { setCurrent(id); nav(`/analysis/${id}`) }
  const maxDist = Math.max(...Object.values(dist), 1)

  return (
    <div>
      <PageHead
        title={`Security posture across ${list.length} captures`}
        sub="Every capture below was read straight from packets: cleartext handshakes, ESP length side-channels and a traffic classifier. Nothing was decrypted."
        actions={<>
          <Btn variant="glass" icon={UploadCloud} to="/captures">Upload capture</Btn>
          <Btn variant="glass" icon={Wand2} onClick={() => { toast.success('Sample capture generated'); nav('/captures') }}>Generate sample capture</Btn>
          <Btn variant="glass" icon={Radio} to="/live">Start live monitor</Btn>
          <Btn variant="lime" icon={PlayCircle} onClick={() => useStore.getState().setTour(0)}>Start demo tour</Btn>
        </>}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <StatTile icon={FileSearch} label="Captures analyzed" value={list.length} sub="11 built-in scenarios" />
        <StatTile icon={ShieldAlert} label="Average score" value={avg} sub="out of 100" />
        <StatTile icon={ShieldAlert} label="Critical findings" value={crit} tone="text-critical" sub="across all captures" />
        <StatTile icon={BrainCircuit} label="Model accuracy" value={`${(METRICS.accuracy * 100).toFixed(1)}%`} sub="held-out, synthetic data" />
        <StatTile icon={Sparkles} label="Avg AI confidence" value={`${Math.round((list.reduce((a, x) => a + x.summary.ai_confidence, 0) / list.length) * 100)}%`} sub="weighted over fields" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {/* hero pair */}
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <Solid className="relative overflow-hidden p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-critical/20 blur-3xl" />
              <div className="text-[13px] text-[#93a4ba]">Needs attention first</div>
              <div className="title-wide mt-1 text-[24px]">{worst.scenario.name}</div>
              <div className="mt-1 max-w-[40ch] text-[14px] text-[#b6c4d8]">{worst.summary.headline}</div>
              <div className="mt-2 flex items-center gap-6">
                <ScoreDial score={worst.summary.score} grade={worst.summary.grade} size={210} dark />
                <div className="hidden space-y-2 text-[13px] text-[#b6c4d8] sm:block">
                  <div><span className="num-wide text-[22px] text-critical">{worst.summary.counts.critical}</span> critical</div>
                  <div><span className="num-wide text-[22px] text-high">{worst.summary.counts.high}</span> high</div>
                  <div><span className="num-wide text-[22px] text-[#e7edf4]">{worst.summary.risk_score}</span> risk score</div>
                </div>
              </div>
              <div className="mt-4"><Btn variant="lime" icon={ArrowUpRight} onClick={() => open(worst.id)}>Open full analysis</Btn></div>
            </Solid>

            <div className="relative overflow-hidden rounded-[28px] bg-lime p-6 text-[#0F1B2D] shadow-[0_30px_60px_-30px_rgba(120,170,20,.7)]">
              <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full border-[28px] border-black/10" />
              <div className="text-[13px] font-medium opacity-70">Before and after hardening</div>
              <div className="num-wide mt-1 text-[64px] leading-none">+{best.summary.score - worst.summary.score}</div>
              <div className="mt-1 text-[15px] font-medium">points from {worst.id} to {best.id}</div>
              <p className="mt-3 max-w-[34ch] text-[14px] opacity-80">Switch to IKEv2 with certificates, AES-256-GCM, ECP-384 and forward secrecy, and the misconfigured branch office becomes a grade A tunnel.</p>
              <div className="mt-4"><Btn to="/compare" variant="ink" icon={ArrowUpRight}>Compare side by side</Btn></div>
            </div>
          </div>

          {/* posture ledger */}
          <Glass className="overflow-hidden p-2" data-tour="ledger">
            <div className="px-4 pb-1 pt-3"><SectionTitle aside={<span className="label">Select a row to open its analysis</span>}>Posture ledger</SectionTitle></div>
            <div className="overflow-x-auto">
              <table className="tbl w-full min-w-[860px] text-[14px]">
                <thead>
                  <tr><th>Grade</th><th>Capture</th><th className="w-[170px]">Score</th><th>IKE</th><th>ESP cipher</th><th>Mode</th><th>PFS</th><th>Top finding</th><th>Analyzed</th></tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const top = topFindings(a.assessment.findings, 1)[0]
                    return (
                      <tr key={a.id} className="row-hover cursor-pointer" tabIndex={0} onClick={() => open(a.id)} onKeyDown={(e) => e.key === 'Enter' && open(a.id)}>
                        <td><GradeLetter g={a.summary.grade} className="text-[30px] leading-none" /></td>
                        <td><div className="font-medium">{a.scenario.name}</div><div className="mono text-[12px] text-muted">{a.id}</div></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule/60"><div className={`h-full rounded-full ${GRADE_BAR[a.summary.grade]}`} style={{ width: `${a.summary.score}%` }} /></div>
                            <span className="w-7 text-right tabular-nums">{a.summary.score}</span>
                          </div>
                        </td>
                        <td>v{a.scenario.ikeVersion}</td>
                        <td className="whitespace-nowrap">{a.scenario.protocol === 'AH' ? 'None (AH)' : encName(a.scenario).replace('AES-', 'AES ')}</td>
                        <td className="capitalize">{a.scenario.mode}</td>
                        <td>{a.scenario.pfs ? <span className="text-pass">On</span> : <span className="text-high">Off</span>}</td>
                        <td className="max-w-[240px]">{top ? <div className="flex items-center gap-2"><SeverityChip s={top.severity as Severity} /><span className="truncate text-[13px]">{top.title}</span></div> : <span className="text-muted">None</span>}</td>
                        <td className="whitespace-nowrap text-muted">{fmtDate(a.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Glass>
        </div>

        <div className="space-y-5">
          <Glass className="p-5">
            <SectionTitle>Grade distribution</SectionTitle>
            <div className="space-y-2.5" role="img" aria-label={`Grade distribution: ${Object.entries(dist).map(([g, n]) => `${g} ${n}`).join(', ')}`}>
              {(Object.keys(dist) as Grade[]).map((g) => (
                <div key={g} className="flex items-center gap-3">
                  <GradeLetter g={g} className="w-5 text-[20px]" />
                  <div className="h-7 flex-1 overflow-hidden rounded-lg bg-rule/40">
                    <div className={`flex h-full items-center rounded-lg px-2.5 text-[12px] font-semibold text-white ${GRADE_BAR[g]}`} style={{ width: `${Math.max(dist[g] ? 12 : 0, (dist[g] / maxDist) * 100)}%` }}>{dist[g] || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </Glass>

          <Glass className="p-5">
            <SectionTitle aside={<span className="label">{openAlerts.length} open</span>}>Recent alerts</SectionTitle>
            {openAlerts.length === 0 ? <p className="text-muted">All alerts resolved.</p> : (
              <ul className="space-y-2.5">
                {openAlerts.slice(0, 3).map((a) => (
                  <li key={a.id} className="rounded-2xl bg-panel2/60 p-3">
                    <div className="flex items-center gap-2"><SeverityChip s={a.severity} /><span className="truncate text-[14px] font-medium">{a.title}</span></div>
                    <div className="mt-0.5 truncate text-[12.5px] text-muted">{a.capture}</div>
                    <div className="mt-2 flex gap-2">
                      <Btn size="sm" variant="glass" onClick={() => open(a.analysisId)}>Investigate</Btn>
                      <Btn size="sm" variant="ghost" icon={Check} onClick={() => { resolve(a.id); toast.success('Alert resolved') }}>Resolve</Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Glass>

          <Glass className="p-5">
            <SectionTitle>Most frequent findings</SectionTitle>
            <ul className="space-y-3">
              {common.map((f) => (
                <li key={f.id} className="flex items-center gap-3">
                  <span className="mono w-[68px] shrink-0 text-[12px] text-muted">{f.id}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px]">{f.title}</span>
                  <span className="rounded-full bg-panel2 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">{f.n}</span>
                </li>
              ))}
            </ul>
          </Glass>

          <Solid className="p-5">
            <div className="flex items-center justify-between">
              <div className="title-wide text-[18px]">AI engine</div>
              <BrainCircuit size={18} className="text-lime" />
            </div>
            <div className="num-wide mt-2 text-[44px] leading-none text-lime">{(METRICS.accuracy * 100).toFixed(1)}%</div>
            <div className="mt-1 text-[13px] text-[#93a4ba]">traffic classification accuracy · macro F1 {METRICS.macro_f1.toFixed(2)}</div>
            <ConfidenceBar className="mt-3" value={METRICS.accuracy} />
            <div className="mt-3"><Btn to="/models" variant="glass" size="sm" className="!bg-white/10 !text-[#e7edf4] !border-white/10">Open model lab</Btn></div>
          </Solid>

          <Glass className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-panel2"><Radio size={20} /></span>
            <div className="flex-1">
              <div className="font-medium">Live monitor</div>
              <div className="text-[13px] text-muted">Idle · replay any scenario at up to 10×</div>
            </div>
            <Btn to="/live" size="sm" variant="ink">Start</Btn>
          </Glass>
        </div>
      </div>
    </div>
  )
}
