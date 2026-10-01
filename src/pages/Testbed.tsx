import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { Download, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Btn, CodeBlock, Glass, GradeLetter, PageHead, SectionTitle, Segmented, Select, Toggle } from '../components/ui'
import { BASE } from '../data/scenarios'
import { espProposalStr, ikeProposalStr, runChecks, score } from '../data/engine'
import { TRAFFIC, TRAFFIC_ORDER, DH } from '../data/constants'
import { buildAnalysis, endpoints } from '../data/build'
import { download } from '../lib/format'
import { useStore } from '../lib/store'
import type { Cfg, Scenario, TrafficClass } from '../lib/types'

type EncOpt = 'gcm128' | 'gcm256' | 'cbc128' | 'cbc256' | '3des'
interface Form {
  mode: 'tunnel' | 'transport'; ip: 4 | 6; ike: 1 | 2; exchange: 'main' | 'aggressive'; protocol: 'ESP' | 'AH'
  enc: EncOpt; integ: Cfg['integ']; dh: number; pfs: boolean; ikeH: number; childH: number; auth: 'cert' | 'psk'
  natT: boolean; legacy: boolean; traffic: TrafficClass[]
}
const DEFAULT: Form = { mode: 'tunnel', ip: 4, ike: 2, exchange: 'main', protocol: 'ESP', enc: 'gcm256', integ: 'SHA2-256-128', dh: 20, pfs: true, ikeH: 8, childH: 1, auth: 'cert', natT: false, legacy: false, traffic: ['voip', 'web'] }

function toCfg(f: Form): Cfg {
  const gcm = f.enc.startsWith('gcm')
  const bits = f.enc === '3des' ? 168 : Number(f.enc.slice(-3))
  const integ: Cfg['integ'] = gcm ? 'NONE' : f.integ
  const prf: Cfg['prf'] = gcm ? (bits === 256 ? 'SHA384' : 'SHA256') : f.enc === '3des' ? (integ === 'MD5-96' ? 'MD5' : 'SHA1') : integ === 'SHA1-96' ? 'SHA1' : integ === 'MD5-96' ? 'MD5' : integ === 'SHA2-512-256' ? 'SHA512' : integ === 'SHA2-384-192' ? 'SHA384' : 'SHA256'
  return {
    ...BASE, ikeVersion: f.ike, exchange: f.ike === 2 ? 'ikev2' : f.exchange, mode: f.mode, ipVersion: f.ip, natT: f.natT, protocol: f.protocol,
    enc: f.protocol === 'AH' ? 'NULL' : gcm ? 'AES-GCM-16' : f.enc === '3des' ? '3DES-CBC' : 'AES-CBC', keyBits: f.protocol === 'AH' ? 0 : bits,
    integ: f.protocol === 'AH' && integ === 'NONE' ? 'SHA2-256-128' : integ,
    ikeEnc: gcm ? 'AES-GCM-16' : f.enc === '3des' ? '3DES-CBC' : 'AES-CBC', ikeBits: bits, prf, dh: f.dh, pfs: f.pfs, auth: f.auth,
    ikeLifetimeH: f.ikeH, childLifetimeH: f.childH, weakOffered: f.legacy, identity: f.ike === 1 && f.exchange === 'aggressive' ? 'branch-07.example.in' : undefined,
    throughput: f.traffic.includes('file_transfer') || f.traffic.includes('video') ? 'high' : 'low',
    classifierConf: 0.9,
  }
}

function swanctl(c: Cfg, f: Form, side: 'a' | 'b') {
  const [A, B] = endpoints(c)
  const local = side === 'a' ? A : B
  const remote = side === 'a' ? B : A
  const net = (s: 'a' | 'b') => (c.ipVersion === 6 ? (s === 'a' ? '2001:db8:1::/64' : '2001:db8:2::/64') : s === 'a' ? '10.1.0.0/24' : '10.2.0.0/24')
  const host = (s: 'a' | 'b') => (s === 'a' ? A : B) + (c.ipVersion === 6 ? '/128' : '/32')
  const lts = c.mode === 'tunnel' ? net(side) : host(side)
  const rts = c.mode === 'tunnel' ? net(side === 'a' ? 'b' : 'a') : host(side === 'a' ? 'b' : 'a')
  const lines = [
    'connections {',
    `  tunnelscope-${c.mode} {`,
    `    version = ${c.ikeVersion}`,
    ...(c.ikeVersion === 1 && c.exchange === 'aggressive' ? ['    aggressive = yes'] : []),
    `    local_addrs = ${local}`,
    `    remote_addrs = ${remote}`,
    `    proposals = ${ikeProposalStr(c)}`,
    `    rekey_time = ${c.ikeLifetimeH}h`,
    ...(c.natT ? ['    encap = yes'] : []),
    '    local {',
    `      auth = ${c.auth === 'psk' ? 'psk' : 'pubkey'}`,
    ...(c.auth === 'cert' ? [`      certs = gw-${side}.pem`] : []),
    `      id = gw-${side}.example.in`,
    '    }',
    '    remote {',
    `      auth = ${c.auth === 'psk' ? 'psk' : 'pubkey'}`,
    `      id = gw-${side === 'a' ? 'b' : 'a'}.example.in`,
    '    }',
    '    children {',
    '      net {',
    `        local_ts = ${lts}`,
    `        remote_ts = ${rts}`,
    c.protocol === 'AH' ? `        ah_proposals = ${espProposalStr(c)}` : `        esp_proposals = ${espProposalStr(c)}`,
    `        mode = ${c.mode}`,
    `        rekey_time = ${c.childLifetimeH}h`,
    ...(c.esn ? ['        esn = yes'] : []),
    '        start_action = start',
    '      }',
    '    }',
    '  }',
    '}',
    ...(c.auth === 'psk' ? ['', 'secrets {', '  ike-psk {', '    secret = "change-me-in-production"', '  }', '}'] : []),
  ]
  void f
  return lines.join('\n')
}

function Topology({ c }: { c: Cfg }) {
  const tunnel = c.mode === 'tunnel'
  const Node = ({ x, label, dark }: { x: number; label: string; dark?: boolean }) => (
    <g>
      <rect x={x - 46} y={32} width={92} height={44} rx={14} fill={dark ? 'rgb(var(--solid))' : 'rgb(var(--panel2))'} stroke="rgb(var(--rule))" />
      <text x={x} y={59} textAnchor="middle" fontSize="13" fontWeight="600" fill={dark ? '#e7edf4' : 'rgb(var(--paper))'}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 640 110" className="w-full" role="img" aria-label={tunnel ? 'Topology: client A, gateway A, tunnel, gateway B, client B' : 'Topology: host A to host B with transport mode'}>
      {tunnel ? (
        <>
          <line x1="96" x2="210" y1="54" y2="54" stroke="rgb(var(--muted))" strokeWidth="2" />
          <line x1="430" x2="544" y1="54" y2="54" stroke="rgb(var(--muted))" strokeWidth="2" />
          <rect x="220" y="44" width="200" height="20" rx="10" fill="rgb(var(--esp) / .25)" stroke="rgb(var(--esp))" />
          <text x="320" y="58" textAnchor="middle" fontSize="12" fontWeight="600" fill="rgb(var(--esp))">ESP tunnel</text>
          <Node x={50} label="Client A" /><Node x={210} label="Gateway A" dark /><Node x={430} label="Gateway B" dark /><Node x={590} label="Client B" />
        </>
      ) : (
        <>
          <rect x="120" y="44" width="400" height="20" rx="10" fill="rgb(var(--esp) / .25)" stroke="rgb(var(--esp))" />
          <text x="320" y="58" textAnchor="middle" fontSize="12" fontWeight="600" fill="rgb(var(--esp))">{c.protocol} transport · host to host</text>
          <Node x={90} label="Host A" dark /><Node x={550} label="Host B" dark />
        </>
      )}
      <text x="320" y="100" textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">{c.ipVersion === 6 ? 'IPv6' : 'IPv4'} · {c.natT ? 'NAT-T on UDP 4500' : 'UDP 500'}</text>
    </svg>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid items-center gap-2 py-2.5 sm:grid-cols-[130px_1fr]"><div className="label">{label}</div><div>{children}</div></div>
)

export default function Testbed() {
  const nav = useNavigate()
  const { addCustom, setCurrent } = useStore()
  const [f, setF] = useState<Form>(DEFAULT)
  const [peer, setPeer] = useState<'a' | 'b'>('a')
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const cfg = useMemo(() => toCfg(f), [f])
  const res = useMemo(() => { const fin = runChecks(cfg); const s = score(fin); return { ...s, issues: fin.filter((x) => x.severity !== 'pass' && x.severity !== 'info').length } }, [cfg])
  const gcm = f.enc.startsWith('gcm')

  const bundle = async () => {
    const z = new JSZip()
    z.file('gw-a/swanctl.conf', swanctl(cfg, f, 'a'))
    z.file('gw-b/swanctl.conf', swanctl(cfg, f, 'b'))
    z.file('docker-compose.yml', `services:\n  gw-a:\n    build: ./images/strongswan\n    cap_add: [NET_ADMIN]\n    volumes: ['./gw-a:/etc/swanctl']\n    networks: [lan-a, wan]\n  gw-b:\n    build: ./images/strongswan\n    cap_add: [NET_ADMIN]\n    volumes: ['./gw-b:/etc/swanctl']\n    networks: [wan, lan-b]\n  client-a:\n    image: debian:bookworm-slim\n    command: sleep infinity\n    networks: [lan-a]\n  client-b:\n    image: debian:bookworm-slim\n    command: sleep infinity\n    networks: [lan-b]\nnetworks:\n  lan-a: { enable_ipv6: ${cfg.ipVersion === 6} }\n  wan: { enable_ipv6: ${cfg.ipVersion === 6} }\n  lan-b: { enable_ipv6: ${cfg.ipVersion === 6} }\n`)
    z.file('scripts/capture.sh', `#!/bin/sh\ntcpdump -i any -w capture.pcap 'udp port 500 or udp port 4500 or esp or ah'\n`)
    z.file('scripts/gen_traffic.sh', `#!/bin/sh\n${f.traffic.map((t) => ({ voip: '# VoIP-like\niperf3 -c 10.2.0.10 -u -b 80k -l 160 -t 60', video: '# video-like\niperf3 -c 10.2.0.10 -t 60 -R', web: '# web\nfor i in $(seq 1 20); do curl -s http://10.2.0.10/ >/dev/null; sleep 3; done', email: '# email\nprintf "HELO test\\r\\nQUIT\\r\\n" | nc 10.2.0.10 25', messaging: '# messaging keepalives\nfor i in $(seq 1 10); do echo ping | nc -w1 10.2.0.10 5222; sleep 30; done', icmp: '# ICMP\nping -c 60 10.2.0.10', file_transfer: '# file transfer\niperf3 -c 10.2.0.10 -t 60' })[t]).join('\n\n')}\n`)
    z.file('README.md', `# TunnelScope testbed bundle\n\nPredicted score: ${res.score} (${res.grade})\n\n1. docker compose up -d\n2. sh scripts/capture.sh &\n3. sh scripts/gen_traffic.sh\n4. Upload capture.pcap to TunnelScope.\n\nRequires Docker with NET_ADMIN.\n`)
    download('tunnelscope-testbed.zip', await z.generateAsync({ type: 'blob' }))
    toast.success('Testbed bundle downloaded')
  }

  const simulate = () => {
    if (!f.traffic.length) { toast.error('Pick at least one traffic type'); return }
    const dur = 120
    const each = Math.floor(dur / f.traffic.length)
    const n = useStore.getState().custom.filter((x) => x.id.startsWith('C')).length + 1
    const sc: Scenario = {
      ...cfg, id: `C${n}`, name: `Custom configuration ${n}`, description: 'Synthesized from the Testbed form.', durationS: dur, vendor: 'strongSwan', expectedGrade: res.grade, custom: true,
      traffic: f.traffic.map((cls, i) => ({ cls, start: i * each, dur: each })),
    }
    const a = buildAnalysis(sc, new Date().toISOString())
    addCustom(a); setCurrent(a.id)
    toast.success('Sample capture generated')
    setTimeout(() => toast.success('Analysis complete'), 300)
    nav(`/analysis/${a.id}`)
  }

  const ENC: { id: EncOpt; label: string }[] = [
    { id: 'gcm256', label: 'AES-256-GCM' }, { id: 'gcm128', label: 'AES-128-GCM' }, { id: 'cbc256', label: 'AES-256-CBC' },
    { id: 'cbc128', label: 'AES-128-CBC' }, { id: '3des', label: '3DES (legacy)' },
  ]

  return (
    <div>
      <PageHead title="Testbed" sub="Design any IPsec configuration from the problem statement, see real strongSwan config files and the score TunnelScope would give it, then simulate a capture." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <Glass className="p-6">
          <SectionTitle>Configuration</SectionTitle>
          <div className="divide-y divide-rule/40">
            <Row label="Protocol"><Segmented small value={f.protocol} onChange={(v) => set('protocol', v)} options={[{ id: 'ESP', label: 'ESP' }, { id: 'AH', label: 'AH (integrity only)' }]} /></Row>
            <Row label="Mode"><Segmented small value={f.mode} onChange={(v) => set('mode', v)} options={[{ id: 'tunnel', label: 'Tunnel' }, { id: 'transport', label: 'Transport' }]} /></Row>
            <Row label="IP version"><Segmented small value={f.ip} onChange={(v) => set('ip', v)} options={[{ id: 4, label: 'IPv4' }, { id: 6, label: 'IPv6' }]} /></Row>
            <Row label="IKE version"><div className="flex flex-wrap gap-2"><Segmented small value={f.ike} onChange={(v) => set('ike', v)} options={[{ id: 2, label: 'IKEv2' }, { id: 1, label: 'IKEv1' }]} />
              {f.ike === 1 && <Segmented small value={f.exchange} onChange={(v) => set('exchange', v)} options={[{ id: 'main', label: 'Main' }, { id: 'aggressive', label: 'Aggressive' }]} />}</div></Row>
            <Row label="Encryption"><Select value={f.enc} onChange={(v) => set('enc', v)} options={ENC} className="w-full" label="Encryption" /></Row>
            <Row label="Integrity">{gcm ? <span className="text-muted">None — AEAD cipher</span> : <Select value={f.integ} onChange={(v) => set('integ', v)} className="w-full" label="Integrity"
              options={[{ id: 'SHA2-256-128', label: 'HMAC-SHA2-256-128' }, { id: 'SHA2-384-192', label: 'HMAC-SHA2-384-192' }, { id: 'SHA2-512-256', label: 'HMAC-SHA2-512-256' }, { id: 'SHA1-96', label: 'HMAC-SHA1-96 (legacy)' }, { id: 'MD5-96', label: 'HMAC-MD5-96 (broken)' }]} />}</Row>
            <Row label="DH group"><Select value={f.dh} onChange={(v) => set('dh', v)} className="w-full" label="DH group" options={Object.entries(DH).map(([g, d]) => ({ id: Number(g), label: `${g} · ${d.name}` }))} /></Row>
            <Row label="PFS"><div className="flex items-center gap-3"><Toggle on={f.pfs} onChange={(v) => set('pfs', v)} label="Perfect forward secrecy" /><span className="text-[13px] text-muted">{f.pfs ? 'Fresh DH on every rekey' : 'Child keys derive from the IKE SA only'}</span></div></Row>
            <Row label="Lifetimes"><div className="flex flex-wrap items-center gap-3 text-[13px]">IKE
              <Select value={f.ikeH} onChange={(v) => set('ikeH', v)} label="IKE lifetime" options={[1, 4, 8, 24, 48].map((h) => ({ id: h, label: `${h} h` }))} className="!h-9" /> Child
              <Select value={f.childH} onChange={(v) => set('childH', v)} label="Child lifetime" options={[1, 4, 8, 12, 24, 48].map((h) => ({ id: h, label: `${h} h` }))} className="!h-9" /></div></Row>
            <Row label="Authentication"><Segmented small value={f.auth} onChange={(v) => set('auth', v)} options={[{ id: 'cert', label: 'Certificates' }, { id: 'psk', label: 'Pre-shared key' }]} /></Row>
            <Row label="Options"><div className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
              <label className="inline-flex items-center gap-2"><Toggle on={f.natT} onChange={(v) => set('natT', v)} label="NAT traversal" />NAT-T</label>
              <label className="inline-flex items-center gap-2"><Toggle on={f.legacy} onChange={(v) => set('legacy', v)} label="Offer legacy proposal" />Offer legacy proposal</label></div></Row>
            <Row label="Traffic"><div className="flex flex-wrap gap-1.5">
              {TRAFFIC_ORDER.map((t) => {
                const on = f.traffic.includes(t)
                return <button key={t} aria-pressed={on} onClick={() => set('traffic', on ? f.traffic.filter((x) => x !== t) : [...f.traffic, t])}
                  className={clsx('rounded-full px-3 py-1.5 text-[13px] font-medium', on ? 'bg-solid text-[#e7edf4]' : 'bg-panel2/70 text-muted hover:text-paper')}>{TRAFFIC[t].label}</button>
              })}</div></Row>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Btn variant="ink" icon={Download} onClick={bundle}>Download testbed bundle</Btn>
            <Btn variant="lime" icon={Wand2} onClick={simulate}>Simulate capture</Btn>
          </div>
        </Glass>

        <div className="space-y-5">
          <Glass className="flex items-center gap-5 p-6">
            <GradeLetter g={res.grade} className="text-[72px] leading-none" />
            <div>
              <div className="title-wide text-[20px]">This configuration would score about {res.score} ({res.grade})</div>
              <div className="text-muted">{res.issues} issue{res.issues === 1 ? '' : 's'} at low severity or above · {res.counts.critical} critical, {res.counts.high} high. Toggle PFS or the DH group and watch it move.</div>
            </div>
          </Glass>
          <Glass className="p-6"><SectionTitle>Topology</SectionTitle><Topology c={cfg} /></Glass>
          <Glass className="p-6">
            <SectionTitle aside={<Segmented small value={peer} onChange={setPeer} options={[{ id: 'a', label: 'gw-a/swanctl.conf' }, { id: 'b', label: 'gw-b/swanctl.conf' }]} />}>Generated strongSwan config</SectionTitle>
            <CodeBlock code={swanctl(cfg, f, peer)} copyLabel="Copy config" />
          </Glass>
        </div>
      </div>
    </div>
  )
}
