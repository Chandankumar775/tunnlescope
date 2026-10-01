import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCcw, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import type { Analysis } from '../lib/types'
import { Btn, Chip, CodeBlock, Glass, SectionTitle, SeverityChip, Solid, Toggle } from '../components/ui'
import ScoreDial from '../components/ScoreDial'
import { applicableFixes, applyFixes, configDiff, evaluate, fixGain, openIds } from '../data/fixes'
import { buildAnalysis } from '../data/build'
import { useStore } from '../lib/store'

export default function FixSimulator({ a }: { a: Analysis }) {
  const nav = useNavigate()
  const { addCustom, setCurrent } = useStore()
  const fixes = useMemo(() => applicableFixes(a.scenario), [a])
  const [on, setOn] = useState<string[]>([])
  const before = useMemo(() => evaluate(a.scenario), [a])
  const cfg = useMemo(() => applyFixes(a.scenario, on), [a, on])
  const after = useMemo(() => evaluate(cfg), [cfg])
  const gains = useMemo(() => Object.fromEntries(fixes.map((f) => [f.id, fixGain(a.scenario, on, f.id)])), [a, fixes, on])
  const was = openIds(before.findings)
  const now = openIds(after.findings)
  const resolved = before.findings.filter((f) => was.has(f.id) && !now.has(f.id))
  const still = after.findings.filter((f) => now.has(f.id))
  const delta = after.score - before.score
  const replay = a.scenario.duplicates > 0 || a.scenario.backwardJump

  const simulate = () => {
    const sc = { ...a.scenario, ...cfg, id: `${a.scenario.id}-H`, name: `${a.scenario.name} (hardened)`, description: `${a.scenario.name} after applying ${on.length} TunnelScope fixes.`, custom: true }
    const res = buildAnalysis(sc, new Date().toISOString())
    addCustom(res); setCurrent(res.id)
    toast.success('Analysis complete')
    nav(`/analysis/${res.id}`)
  }

  if (fixes.length === 0) {
    return (
      <Glass className="p-8 text-center">
        <Sparkles className="mx-auto text-pass" />
        <div className="title-wide mt-2 text-[20px]">Nothing left to fix</div>
        <p className="mx-auto mt-1 max-w-[52ch] text-muted">This configuration already follows every recommendation TunnelScope makes. Remaining notes are informational.</p>
      </Glass>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" data-tour="simulator">
      <Glass className="p-6">
        <SectionTitle aside={<div className="flex gap-2">
          <Btn size="sm" variant="glass" icon={RotateCcw} onClick={() => setOn([])} disabled={!on.length}>Reset</Btn>
          <Btn size="sm" variant="ink" icon={Wand2} onClick={() => setOn(fixes.map((f) => f.id))} disabled={on.length === fixes.length}>Apply all</Btn>
        </div>}>Recommended fixes</SectionTitle>
        <p className="-mt-1 mb-4 text-[14px] text-muted">Toggle a fix to rescore this capture with the same 22 checks. Each line shows what it adds on top of the fixes already on.</p>
        <ul className="divide-y divide-rule/50">
          {fixes.map((f) => {
            const active = on.includes(f.id)
            return (
              <li key={f.id} className="flex items-center gap-4 py-3">
                <Toggle on={active} onChange={(v) => setOn((cur) => (v ? [...cur, f.id] : cur.filter((x) => x !== f.id)))} label={f.label} />
                <div className="min-w-0 flex-1">
                  <div className={clsx('font-medium', active && 'text-pass')}>{f.label}</div>
                  <div className="text-[13px] text-muted">{f.why}</div>
                </div>
                <span className="w-24 shrink-0 text-right text-[13px] leading-tight tabular-nums">
                  {gains[f.id].points > 0
                    ? <span className="text-[14px] font-semibold text-pass">+{gains[f.id].points} pts</span>
                    : <span className="text-muted">{gains[f.id].closes ? `closes ${gains[f.id].closes} issue${gains[f.id].closes > 1 ? 's' : ''}` : 'no change'}</span>}
                  {gains[f.id].points > 0 && gains[f.id].closes > 0 && <span className="block text-[12px] text-muted">closes {gains[f.id].closes}</span>}
                </span>
              </li>
            )
          })}
        </ul>
        {replay && (
          <p className="mt-4 rounded-2xl bg-high/12 p-3 text-[13.5px]">
            <b>Not a configuration problem:</b> duplicated ESP sequence numbers point to replayed or retransmitted packets. Investigate the sender; no setting change clears RPL-001.
          </p>
        )}
      </Glass>

      <div className="space-y-5">
        <Solid className="p-6">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-col items-center">
              <div className="mb-1 text-[13px] text-[#93a4ba]">As captured</div>
              <ScoreDial score={before.score} grade={before.grade} size={190} dark />
            </div>
            <div className="text-center">
              <ArrowRight className="mx-auto text-[#93a4ba]" />
              <div className={clsx('num-wide mt-1 text-[34px]', delta > 0 ? 'text-lime' : 'text-[#93a4ba]')}>{delta > 0 ? `+${delta}` : '0'}</div>
              <div className="text-[12px] text-[#93a4ba]">points</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-1 text-[13px] text-[#93a4ba]">With {on.length} fix{on.length === 1 ? '' : 'es'}</div>
              <ScoreDial key={after.score} score={after.score} grade={after.grade} size={190} dark />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-[13px] text-[#93a4ba]">Risk score {before.risk_score} → {after.risk_score} · {after.risk_level} risk</span>
            <Btn variant="lime" icon={Wand2} onClick={simulate} disabled={!on.length}>Simulate hardened capture</Btn>
          </div>
        </Solid>

        <Glass className="p-6">
          <SectionTitle aside={<Chip tone="pass">{resolved.length} resolved</Chip>}>What changes</SectionTitle>
          {resolved.length === 0 ? <p className="text-[14px] text-muted">Turn on a fix to see which findings it closes.</p> : (
            <div className="flex flex-wrap gap-1.5">{resolved.map((f) => <Chip key={f.id} tone="pass"><span className="mono">{f.id}</span> {f.title.replace(/ \(.*\)$/, '')}</Chip>)}</div>
          )}
          {still.length > 0 && (
            <>
              <div className="label mb-2 mt-5">Still open</div>
              <ul className="space-y-1.5">{still.map((f) => <li key={f.id} className="flex items-center gap-2 text-[14px]"><SeverityChip s={f.severity} /><span className="mono text-[12px] text-muted">{f.id}</span>{f.title}</li>)}</ul>
            </>
          )}
        </Glass>

        <Glass className="p-6">
          <SectionTitle>strongSwan change</SectionTitle>
          <CodeBlock code={configDiff(a.scenario, cfg)} copyLabel="Copy config" />
          <p className="mt-2 text-[12.5px] text-muted">Lines starting with # are the current values; the line below each is the replacement.</p>
        </Glass>
      </div>
    </div>
  )
}
