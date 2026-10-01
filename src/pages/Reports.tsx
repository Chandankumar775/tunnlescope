import { useMemo, useState } from 'react'
import { FileJson, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Btn, Glass, GradeLetter, PageHead, SectionTitle, Segmented } from '../components/ui'
import { useAllAnalyses } from '../lib/useAnalyses'
import { executiveHtml, openPrint, technicalHtml } from '../lib/report'
import { download } from '../lib/format'

export default function Reports() {
  const all = useAllAnalyses()
  const [id, setId] = useState('S06')
  const [kind, setKind] = useState<'executive' | 'technical'>('technical')
  const a = all.find((x) => x.id === id) ?? all[0]
  const html = useMemo(() => (kind === 'executive' ? executiveHtml(a) : technicalHtml(a)), [a, kind])

  const pdf = (k: 'executive' | 'technical', x = a) => {
    const ok = openPrint(k === 'executive' ? executiveHtml(x) : technicalHtml(x))
    ok ? toast.success('Report ready — choose Save as PDF') : toast.error('Allow pop-ups to open the report')
  }

  return (
    <div>
      <PageHead title="Reports" sub="Every analysis produces two reports: a two-page executive summary for decision makers and a technical report an engineer can use to reproduce and fix each issue." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
        <Glass className="overflow-hidden p-2" data-tour="reports">
          <div className="px-4 pt-3"><SectionTitle>Analyses</SectionTitle></div>
          <div className="divide-y divide-rule/40">
            {all.map((x) => (
              <div key={x.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${x.id === a.id ? 'bg-esp/10' : ''}`}>
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setId(x.id)}>
                  <GradeLetter g={x.summary.grade} className="w-7 text-[26px]" />
                  <span className="min-w-0"><span className="block truncate font-medium">{x.scenario.name}</span><span className="mono text-[12px] text-muted">{x.id} · score {x.summary.score}</span></span>
                </button>
                <div className="flex gap-1.5">
                  <Btn size="sm" variant="glass" icon={FileText} onClick={() => pdf('executive', x)} title="Executive report (PDF)">Executive</Btn>
                  <Btn size="sm" variant="glass" icon={Printer} onClick={() => pdf('technical', x)} title="Technical report (PDF)">Technical</Btn>
                  <Btn size="sm" variant="ghost" icon={FileJson} onClick={() => { download(`${x.id}-analysis.json`, JSON.stringify(x, null, 2), 'application/json'); toast.success('Report downloaded') }} title="Export JSON" />
                </div>
              </div>
            ))}
          </div>
        </Glass>
        <Glass className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
            <SectionTitle>Preview · {a.scenario.name}</SectionTitle>
            <div className="flex items-center gap-2">
              <Segmented small value={kind} onChange={setKind} options={[{ id: 'executive', label: 'Executive' }, { id: 'technical', label: 'Technical' }]} />
              <Btn size="sm" variant="ink" onClick={() => { download(`${a.id}-${kind}-report.html`, html, 'text/html'); toast.success('Report downloaded') }}>Download HTML</Btn>
            </div>
          </div>
          <iframe title="Report preview" srcDoc={html} className="h-[760px] w-full rounded-2xl border border-rule/60 bg-white" />
        </Glass>
      </div>
    </div>
  )
}
