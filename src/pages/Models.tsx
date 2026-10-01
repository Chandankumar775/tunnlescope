import { useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Btn, Chip, Glass, PageHead, SectionTitle, Solid } from '../components/ui'
import { ConfusionMatrix } from '../components/Visuals'
import { DATASET_STATS, METRICS, datasetCsv, retrained, type Metrics } from '../data/models'
import { TRAFFIC } from '../data/constants'
import { download, fmtInt } from '../lib/format'

const STEPS = ['Generating windows', 'Extracting 25 features', 'Training random forest', 'Training gradient boosting', 'Evaluating on held-out split']

export default function Models() {
  const [m, setM] = useState<Metrics>(METRICS)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const timer = useRef<number | null>(null)

  const retrain = () => {
    if (busy) return
    setBusy(true); setStep(0)
    let s = 0
    timer.current = window.setInterval(() => {
      s++
      if (s >= STEPS.length) {
        if (timer.current) window.clearInterval(timer.current)
        const next = retrained()
        setM(next); setBusy(false)
        toast.success(`Model retrained — accuracy ${(next.accuracy * 100).toFixed(1)}%`)
      } else setStep(s)
    }, 700)
  }

  return (
    <div>
      <PageHead title="Model lab" sub="The traffic and mode classifiers behind the AI engine. Training data is profile-based synthetic traffic; accuracy is reported on a held-out split."
        actions={<>
          <Btn variant="glass" icon={Download} onClick={() => { download('esp_flow_windows.csv', datasetCsv(), 'text/csv'); toast.success('Dataset downloaded (1,200-row sample)') }}>Download dataset (CSV)</Btn>
          <Btn variant="lime" icon={busy ? Loader2 : RefreshCw} disabled={busy} onClick={retrain}>{busy ? 'Retraining…' : 'Retrain model'}</Btn>
        </>} />

      {busy && (
        <Glass className="mb-5 p-5">
          <div className="mb-2 text-[14px] font-medium">{STEPS[step]}…</div>
          <div className="h-2 overflow-hidden rounded-full bg-rule/50"><div className="h-full rounded-full bg-esp transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        </Glass>
      )}

      <div className="mb-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Solid className="p-6"><div className="text-[13px] text-[#93a4ba]">Traffic accuracy</div><div className="num-wide text-[48px] leading-none text-lime">{(m.accuracy * 100).toFixed(1)}%</div><div className="mt-1 text-[13px] text-[#93a4ba]">{fmtInt(m.test_size)} held-out windows</div></Solid>
        <Glass className="p-6"><div className="label">Macro F1</div><div className="num-wide text-[48px] leading-none">{m.macro_f1.toFixed(3)}</div><div className="mt-1 text-[13px] text-muted">7 classes, unweighted</div></Glass>
        <Glass className="p-6"><div className="label">Tunnel vs transport</div><div className="num-wide text-[48px] leading-none">{(m.mode.accuracy * 100).toFixed(1)}%</div><div className="mt-1 text-[13px] text-muted">gradient boosting</div></Glass>
        <Glass className="p-6"><div className="label">Training</div><div className="num-wide text-[48px] leading-none">{m.training_time_s.toFixed(0)} s</div><div className="mt-1 text-[13px] text-muted">{m.dataset_hash}</div></Glass>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Glass className="p-6"><SectionTitle>Confusion matrix</SectionTitle><ConfusionMatrix labels={m.labels} matrix={m.matrix} /><p className="mt-3 text-[13px] text-muted">Diagonal cells are correct predictions. Most errors sit between look-alike classes such as web and email, or video and file transfer.</p></Glass>
        <Glass className="p-6">
          <SectionTitle>Top 15 feature importances</SectionTitle>
          <div className="h-[400px]" role="img" aria-label="Bar chart of the 15 most important features">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.importances} layout="vertical" margin={{ left: 40, right: 10 }}>
                <CartesianGrid stroke="rgb(var(--rule))" strokeOpacity={0.4} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="feature" width={130} tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgb(var(--rule) / .3)' }} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} contentStyle={{ borderRadius: 12, background: 'rgb(var(--panel))', border: '1px solid rgb(var(--rule))' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>{m.importances.map((_, i) => <Cell key={i} fill={i < 3 ? 'rgb(var(--esp))' : 'rgb(var(--esp) / .5)'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Glass>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Glass className="overflow-hidden p-2">
          <div className="px-4 pt-3"><SectionTitle>Per-class results</SectionTitle></div>
          <table className="tbl w-full text-[14px]">
            <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
            <tbody>
              {m.per_class.map((p) => (
                <tr key={p.label}><td><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: TRAFFIC[p.label].color }} />{TRAFFIC[p.label].label}</span></td>
                  <td className="tabular-nums">{p.precision.toFixed(3)}</td><td className="tabular-nums">{p.recall.toFixed(3)}</td><td className="font-semibold tabular-nums">{p.f1.toFixed(3)}</td><td className="tabular-nums text-muted">{p.support}</td></tr>
              ))}
            </tbody>
          </table>
        </Glass>
        <div className="space-y-5">
          <Glass className="p-6">
            <SectionTitle>Dataset</SectionTitle>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-panel2/60 p-3"><div className="num-wide text-[24px]">{fmtInt(DATASET_STATS.rows)}</div><div className="label">windows</div></div>
              <div className="rounded-2xl bg-panel2/60 p-3"><div className="num-wide text-[24px]">{fmtInt(m.train_size)}</div><div className="label">train</div></div>
              <div className="rounded-2xl bg-panel2/60 p-3"><div className="num-wide text-[24px]">{fmtInt(m.test_size)}</div><div className="label">test</div></div>
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label="Balanced classes, 3000 windows each">
              {m.labels.map((l) => <div key={l} className="flex-1" style={{ background: TRAFFIC[l].color }} title={`${TRAFFIC[l].label}: 3,000`} />)}
            </div>
            <p className="mt-2 text-[13px] text-muted">Balanced: 3,000 windows per class. Window = {DATASET_STATS.window}. {DATASET_STATS.noise}.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{DATASET_STATS.features.map((f) => <span key={f} className="mono rounded-md bg-panel2/70 px-1.5 py-0.5 text-[11px] text-muted">{f}</span>)}</div>
          </Glass>
          <Glass className="p-6">
            <SectionTitle aside={<Chip tone="medium">Synthetic data</Chip>}>Model card</SectionTitle>
            <dl className="space-y-2 text-[14px]">
              <div><dt className="label">Intended use</dt><dd>Estimating what kind of traffic an IPsec tunnel carries, and whether it runs in tunnel or transport mode, from packet sizes and timing alone.</dd></div>
              <div><dt className="label">Training data</dt><dd>Generated from our own traffic profiles with jitter, 0–3% packet loss and 5% label noise. Not captured from production networks.</dd></div>
              <div><dt className="label">Limitations</dt><dd>Accuracy on real networks will be lower. Heavily shaped or padded traffic can defeat it. Cipher family is rule-based, not learned.</dd></div>
            </dl>
          </Glass>
        </div>
      </div>
    </div>
  )
}
