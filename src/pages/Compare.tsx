import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { Chip, EmptyState, Glass, GradeLetter, PageHead, SectionTitle, Select, SeverityChip, Solid } from '../components/ui'
import { useAllAnalyses } from '../lib/useAnalyses'

export default function Compare() {
  const all = useAllAnalyses()
  const [aId, setA] = useState('S06')
  const [bId, setB] = useState('S01')
  const a = all.find((x) => x.id === aId)
  const b = all.find((x) => x.id === bId)
  const opts = all.map((x) => ({ id: x.id, label: x.capture_name }))
  if (!a || !b) return <EmptyState title="Pick two analyses" body="Pick two analyses to compare their configuration and score." />

  const delta = b.summary.score - a.summary.score
  const fields = a.identification.map((fa) => {
    const fb = b.identification.find((x) => x.key === fa.key)
    return { key: fa.key, label: fa.label, a: fa.value, b: fb?.value ?? '—', changed: fa.value !== fb?.value }
  })
  const bad = (x: typeof a) => new Map(x.assessment.findings.filter((f) => f.severity !== 'pass').map((f) => [f.id, f]))
  const ma = bad(a)
  const mb = bad(b)
  const onlyA = [...ma.values()].filter((f) => !mb.has(f.id))
  const onlyB = [...mb.values()].filter((f) => !ma.has(f.id))
  const changed = fields.filter((f) => f.changed).length

  return (
    <div>
      <PageHead title="Compare" sub="See what changes, and how many points it is worth, when a deployment is hardened." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select label="Analysis A" value={aId} onChange={setA} options={opts} className="min-w-[260px]" />
        <ArrowRight size={18} className="text-muted" />
        <Select label="Analysis B" value={bId} onChange={setB} options={opts} className="min-w-[260px]" />
      </div>

      <Solid className="relative mb-5 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div><div className="text-[13px] text-[#93a4ba]">{a.capture_name}</div><div className="flex items-baseline gap-3"><GradeLetter g={a.summary.grade} className="text-[64px] leading-none" /><span className="num-wide text-[32px] text-[#e7edf4]">{a.summary.score}</span></div></div>
          <div className="text-center">
            <div className={clsx('num-wide text-[56px] leading-none', delta >= 0 ? 'text-lime' : 'text-critical')}>{delta >= 0 ? '+' : ''}{delta}</div>
            <div className="mt-1 text-[14px] text-[#b6c4d8]">{delta >= 0 ? `points after hardening · ${changed} fields changed` : `points lower · ${changed} fields changed`}</div>
          </div>
          <div className="md:text-right"><div className="text-[13px] text-[#93a4ba]">{b.capture_name}</div><div className="flex items-baseline gap-3 md:justify-end"><span className="num-wide text-[32px] text-[#e7edf4]">{b.summary.score}</span><GradeLetter g={b.summary.grade} className="text-[64px] leading-none" /></div></div>
        </div>
      </Solid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Glass className="overflow-hidden p-2">
          <div className="px-4 pt-3"><SectionTitle>Configuration differences</SectionTitle></div>
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[640px] text-[14px]">
              <thead><tr><th>Field</th><th>{a.id}</th><th>{b.id}</th></tr></thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.key} className={f.changed ? 'bg-esp/8' : ''}>
                    <td className="text-muted">{f.label}</td>
                    <td className={clsx('mono text-[13px]', f.changed && 'font-semibold')}>{f.a}</td>
                    <td className={clsx('mono text-[13px]', f.changed && 'font-semibold text-esp')}>{f.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Glass>
        <div className="space-y-5">
          <Glass className="p-6">
            <SectionTitle aside={<Chip tone="critical">{onlyA.length}</Chip>}>Only in {a.id}</SectionTitle>
            {onlyA.length ? <ul className="space-y-2">{onlyA.map((f) => <li key={f.id} className="flex items-start gap-2 text-[14px]"><SeverityChip s={f.severity} className="mt-0.5" /><span>{f.title}</span></li>)}</ul> : <p className="text-muted">Nothing unique to this capture.</p>}
          </Glass>
          <Glass className="p-6">
            <SectionTitle aside={<Chip tone="medium">{onlyB.length}</Chip>}>Only in {b.id}</SectionTitle>
            {onlyB.length ? <ul className="space-y-2">{onlyB.map((f) => <li key={f.id} className="flex items-start gap-2 text-[14px]"><SeverityChip s={f.severity} className="mt-0.5" /><span>{f.title}</span></li>)}</ul> : <p className="text-muted">No findings appear only here.</p>}
          </Glass>
          <Glass className="p-6">
            <SectionTitle>Category scores</SectionTitle>
            <div className="space-y-2.5">
              {a.assessment.categories.map((c, i) => {
                const cb = b.assessment.categories[i]
                const d = cb.score - c.score
                return <div key={c.name} className="flex items-center justify-between text-[13.5px]"><span>{c.name}</span><span className="tabular-nums text-muted">{c.score} → {cb.score} <b className={clsx('ml-1', d > 0 ? 'text-pass' : d < 0 ? 'text-critical' : 'text-muted')}>{d > 0 ? '+' : ''}{d}</b></span></div>
              })}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  )
}
