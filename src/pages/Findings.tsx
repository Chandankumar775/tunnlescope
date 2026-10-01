import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import clsx from 'clsx'
import { Chip, EmptyState, Glass, PageHead, SEV, SeverityChip } from '../components/ui'
import { useAllAnalyses } from '../lib/useAnalyses'
import { useStore } from '../lib/store'
import type { Severity } from '../lib/types'

const SEVS: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'info']

export default function Findings() {
  const all = useAllAnalyses()
  const nav = useNavigate()
  const setCurrent = useStore((s) => s.setCurrent)
  const [sev, setSev] = useState<Severity | 'all'>('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  const rows = useMemo(() => {
    const m = new Map<string, { id: string; title: string; severity: Severity; category: string; recommendation: string; captures: { id: string; name: string }[] }>()
    all.forEach((a) => a.assessment.findings.forEach((f) => {
      if (f.severity === 'pass') return
      const key = f.id + f.severity
      const cur = m.get(key)
      if (cur) cur.captures.push({ id: a.id, name: a.scenario.name })
      else m.set(key, { id: f.id, title: f.title.replace(/ \(.*\)$/, '').replace(/\d+ h$/, '').trim(), severity: f.severity, category: f.category, recommendation: f.recommendation, captures: [{ id: a.id, name: a.scenario.name }] })
    }))
    const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
    return [...m.values()].sort((x, y) => order.indexOf(x.severity) - order.indexOf(y.severity) || y.captures.length - x.captures.length)
  }, [all])

  const cats = ['all', ...new Set(rows.map((r) => r.category))]
  const shown = rows.filter((r) => (sev === 'all' || r.severity === sev) && (cat === 'all' || r.category === cat) && (r.title + r.id + r.recommendation).toLowerCase().includes(q.toLowerCase()))
  const count = (s: Severity | 'all') => rows.filter((r) => s === 'all' || r.severity === s).length

  return (
    <div>
      <PageHead title="Findings explorer" sub="Every issue found across all captures, grouped by check. Open a capture to see the packets and the config fix behind it." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 md:max-w-[360px]">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title, id or advice" aria-label="Filter findings" className="h-11 w-full rounded-full border border-rule/70 bg-panel/70 pl-10 pr-4 text-[14px] outline-none focus:border-esp" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SEVS.map((s) => (
            <button key={s} onClick={() => setSev(s)} aria-pressed={sev === s} className={clsx('rounded-full px-3.5 py-2 text-[13px] font-medium', sev === s ? 'bg-solid text-[#e7edf4]' : 'bg-panel/70 text-muted hover:text-paper')}>
              {s === 'all' ? 'All' : SEV[s].label} <span className="ml-1 tabular-nums opacity-70">{count(s)}</span>
            </button>
          ))}
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="h-11 rounded-full border border-rule/70 bg-panel/70 px-4 text-[14px] outline-none">
          {cats.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
        </select>
      </div>

      {shown.length === 0 ? <EmptyState title="No findings match" body="Clear a filter or change the search text to see more." /> : (
        <Glass className="divide-y divide-rule/40 overflow-hidden p-2">
          {shown.map((r) => (
            <div key={r.id + r.severity} className="grid gap-3 px-4 py-4 md:grid-cols-[84px_minmax(0,1fr)_minmax(0,280px)]">
              <div className="flex items-start gap-2 md:flex-col"><span className="mono text-[12px] text-muted">{r.id}</span><SeverityChip s={r.severity} /></div>
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-[13px] text-muted">{r.category}</div>
                <p className="mt-1 max-w-[64ch] text-[14px]">{r.recommendation}</p>
              </div>
              <div>
                <div className="label mb-1">{r.captures.length} capture{r.captures.length > 1 ? 's' : ''}</div>
                <div className="flex flex-wrap gap-1.5">
                  {r.captures.slice(0, 6).map((c) => <button key={c.id} onClick={() => { setCurrent(c.id); nav(`/analysis/${c.id}/assessment`) }} className="rounded-full"><Chip tone="esp" className="hover:brightness-110">{c.id}</Chip></button>)}
                </div>
              </div>
            </div>
          ))}
        </Glass>
      )}
    </div>
  )
}
