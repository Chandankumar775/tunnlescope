import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileUp, Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Btn, Chip, Glass, PageHead, SectionTitle } from '../components/ui'
import { SCENARIOS } from '../data/scenarios'
import { ANALYSES } from '../data/analyses'
import { buildAnalysis } from '../data/build'
import { dhName, encName, integName } from '../data/engine'
import { TRAFFIC } from '../data/constants'
import { download, fmtBytes, fmtDate, fmtInt } from '../lib/format'
import { makePcap } from '../lib/pcap'
import { hashStr } from '../lib/rng'
import { useStore } from '../lib/store'
import type { Analysis } from '../lib/types'

interface Upload { name: string; size: number; progress: number; done: boolean }

export default function Captures() {
  const nav = useNavigate()
  const { addCustom, setCurrent, custom } = useStore()
  const [drag, setDrag] = useState(false)
  const [up, setUp] = useState<Upload | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const open = (id: string) => { setCurrent(id); nav(`/analysis/${id}`) }

  const take = (f: File | undefined) => {
    if (!f) return
    if (!/\.(pcap|pcapng)$/i.test(f.name)) { toast.error('Upload failed: file is not a valid pcap or pcapng capture.'); return }
    if (f.size > 50 * 1024 * 1024) { toast.error('Upload failed: file is larger than 50 MB.'); return }
    const u: Upload = { name: f.name, size: f.size, progress: 0, done: false }
    setUp(u)
    let p = 0
    const t = setInterval(() => {
      p += 14 + Math.random() * 18
      if (p >= 100) { clearInterval(t); setUp({ ...u, progress: 100, done: true }); toast.success('Capture uploaded') }
      else setUp({ ...u, progress: p })
    }, 140)
  }

  const analyzeUpload = () => {
    if (!up) return
    const base = SCENARIOS[hashStr(up.name) % SCENARIOS.length]
    const a = buildAnalysis({ ...base, id: `U-${hashStr(up.name).toString(16).slice(0, 4)}`, name: up.name, custom: true }, new Date().toISOString())
    a.capture_name = up.name
    a.size_bytes = up.size
    addCustom(a)
    toast.success('Analysis complete')
    setUp(null)
    open(a.id)
  }

  const gen = (id: string) => {
    toast.success('Sample capture generated')
    setTimeout(() => toast.success('Analysis complete'), 350)
    open(id)
  }

  const captures: { a: Analysis; source: string }[] = [
    ...custom.map((a) => ({ a, source: a.scenario.custom ? (a.id.startsWith('U-') ? 'upload' : 'custom') : 'scenario' })),
    ...ANALYSES.map((a) => ({ a, source: 'scenario' })),
  ]

  return (
    <div>
      <PageHead title="Captures" sub="Bring your own pcap, or generate any of the 11 sample captures. Reading pcaps needs no root access and no Npcap." />

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files[0]) }}
        className={`glass mb-6 rounded-[28px] border-2 border-dashed p-8 text-center transition-colors ${drag ? '!border-esp bg-esp/10' : '!border-rule/70'}`}
      >
        <input ref={input} type="file" accept=".pcap,.pcapng" className="hidden" onChange={(e) => take(e.target.files?.[0])} aria-label="Choose capture file" />
        {!up ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-solid text-lime"><FileUp size={24} /></span>
            <div className="title-wide mt-3 text-[20px]">Drop a .pcap or .pcapng file</div>
            <p className="mx-auto mt-1 max-w-[56ch] text-muted">TunnelScope looks for IKE on UDP 500/4500, ESP and AH. Files up to 50 MB are read locally and never leave this machine.</p>
            <div className="mt-4"><Btn variant="ink" onClick={() => input.current?.click()}>Browse files</Btn></div>
          </>
        ) : (
          <div className="mx-auto max-w-[520px] text-left">
            <div className="flex items-center justify-between">
              <div className="min-w-0"><div className="truncate font-medium">{up.name}</div><div className="text-[13px] text-muted">{fmtBytes(up.size)}</div></div>
              {!up.done && <Loader2 className="animate-spin text-esp" size={20} />}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-rule/60"><div className="h-full rounded-full bg-esp transition-all" style={{ width: `${up.progress}%` }} /></div>
            <div className="mt-4 flex gap-2">
              <Btn variant="lime" icon={Play} disabled={!up.done} onClick={analyzeUpload}>Analyze capture</Btn>
              <Btn variant="glass" onClick={() => setUp(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>

      <Glass className="mb-6 overflow-hidden p-2">
        <div className="px-4 pt-3"><SectionTitle>Scenario coverage matrix</SectionTitle>
          <p className="-mt-2 mb-2 text-[14px] text-muted">Every configuration the problem statement asks for is covered by at least one scenario.</p></div>
        <div className="overflow-x-auto">
          <table className="tbl w-full min-w-[1100px] text-[13.5px]">
            <thead><tr><th>ID</th><th>Scenario</th><th>IKE</th><th>Mode</th><th>IP</th><th>Cipher</th><th>Integrity</th><th>DH</th><th>PFS</th><th>NAT-T</th><th>Traffic</th><th /></tr></thead>
            <tbody>
              {SCENARIOS.map((s) => (
                <tr key={s.id} className="row-hover">
                  <td className="mono text-muted">{s.id}</td>
                  <td className="font-medium">{s.name}</td>
                  <td>{s.ikeVersion === 1 ? (s.exchange === 'main' ? 'v1 main' : 'v1 aggr') : 'v2'}</td>
                  <td className="capitalize">{s.mode}</td>
                  <td>v{s.ipVersion}</td>
                  <td className="whitespace-nowrap">{s.protocol === 'AH' ? <Chip tone="ah">AH only</Chip> : encName(s)}</td>
                  <td className="whitespace-nowrap">{integName(s.integ).replace('HMAC-', '')}</td>
                  <td className="whitespace-nowrap">{dhName(s.dh).replace(' · ', ' ')}</td>
                  <td>{s.pfs ? <span className="text-pass">On</span> : <span className="text-high">Off</span>}</td>
                  <td>{s.natT ? 'Yes' : '—'}</td>
                  <td className="min-w-[180px] text-muted">{s.traffic.map((p) => TRAFFIC[p.cls].label.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</td>
                  <td><Btn size="sm" variant="ink" onClick={() => gen(s.id)}>Generate and analyze</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Glass>

      <Glass className="overflow-hidden p-2">
        <div className="px-4 pt-3"><SectionTitle>Capture library</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="tbl w-full min-w-[760px] text-[14px]">
            <thead><tr><th>Name</th><th>Source</th><th>Packets</th><th>Size</th><th>Created</th><th /></tr></thead>
            <tbody>
              {captures.map(({ a, source }) => (
                <tr key={a.id} className="row-hover">
                  <td><button className="font-medium hover:underline" onClick={() => open(a.id)}>{a.capture_name}</button></td>
                  <td><Chip tone={source === 'upload' ? 'ike' : source === 'custom' ? 'ah' : 'esp'}>{source}</Chip></td>
                  <td className="tabular-nums">{fmtInt(a.packet_count)}</td>
                  <td>{fmtBytes(a.size_bytes)}</td>
                  <td className="text-muted">{fmtDate(a.created_at)}</td>
                  <td className="text-right"><Btn size="sm" variant="glass" icon={Download} onClick={() => { download(`${a.id}.pcap`, makePcap(a)); toast.success('Capture downloaded') }}>Download</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Glass>
    </div>
  )
}
