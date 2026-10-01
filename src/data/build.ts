import type {
  Analysis, Cfg, Finding, Grade, IdentifiedField, IkeExchange, MetadataItem, Method, PacketRec, Proposal,
  RibbonSegment, Scenario, SecurityAssociation, Severity, TimelineBin, TrafficClass, TrafficWindow,
} from '../lib/types'
import { rngFor, hex } from '../lib/rng'
import { DH, TRAFFIC } from './constants'
import {
  compliance, dhName, encName, icvBytes, ikeEncName, integName, isAead, prfName, runChecks, score, threats,
} from './engine'

export const SRC_V4 = '203.0.113.10'
export const DST_V4 = '198.51.100.20'
export const SRC_V6 = '2001:db8:a::10'
export const DST_V6 = '2001:db8:b::20'
export const endpoints = (c: Cfg) => (c.ipVersion === 6 ? [SRC_V6, DST_V6] : [SRC_V4, DST_V4])

const TYPICAL_INNER: Record<TrafficClass, number> = { voip: 200, video: 1400, web: 600, email: 520, messaging: 230, icmp: 84, file_transfer: 1400 }
const CONFUSE: Record<TrafficClass, TrafficClass[]> = {
  voip: ['messaging', 'icmp'], video: ['file_transfer', 'web'], web: ['email', 'messaging'], email: ['web', 'messaging'],
  messaging: ['voip', 'email'], icmp: ['voip', 'messaging'], file_transfer: ['video', 'web'],
}

/* ---------- packet geometry ---------- */
export function geometry(c: Cfg, innerTotal: number) {
  const ipHdr = c.ipVersion === 6 ? 40 : 20
  const outer = ipHdr
  const udp = c.natT ? 8 : 0
  const gcm = isAead(c)
  const iv = c.enc === 'AES-CBC' ? 16 : c.enc === '3DES-CBC' ? 8 : gcm ? 8 : 0
  const align = c.enc === 'AES-CBC' ? 16 : c.enc === '3DES-CBC' ? 8 : 4
  const icv = icvBytes(c)
  const innerIp = c.mode === 'tunnel' ? ipHdr : 0
  const payload = Math.max(8, innerTotal - ipHdr)
  const plain = innerIp + payload
  const pad = (align - ((plain + 2) % align)) % align
  const espLen = 8 + iv + plain + pad + 2 + icv
  return { outer, udp, iv, innerIp, payload, pad, icv, espLen, ipHdr }
}

function ribbon(s: Scenario, dominant: TrafficClass): RibbonSegment[] {
  const t = TYPICAL_INNER[dominant]
  const inner = dominant === 'icmp' && s.ipVersion === 6 ? 104 : t
  const g = geometry(s, inner)
  const outer: RibbonSegment = {
    name: `Outer IPv${s.ipVersion}`, bytes: g.outer, kind: 'outer_ip', label: `outer IPv${s.ipVersion}`,
    detail: `${g.outer}-byte IPv${s.ipVersion} header, protocol ${s.protocol === 'AH' ? '51 (AH)' : s.natT ? '17 (UDP)' : '50 (ESP)'}. Visible to every observer.`,
  }
  const segs: RibbonSegment[] = [outer]
  if (s.protocol === 'AH') {
    segs.push({ name: 'AH header', bytes: 12, kind: 'ah_hdr', label: 'AH · SPI·seq', detail: 'Next header, payload length, SPI and sequence number. Authenticates the packet but encrypts nothing.' })
    segs.push({ name: 'Visible payload', bytes: Math.max(8, inner - g.ipHdr), kind: 'payload', label: 'inner payload (visible)', detail: 'AH does not encrypt, so transport-layer headers and application data are readable.' })
    segs.push({ name: 'ICV', bytes: g.icv, kind: 'icv', label: `ICV ${g.icv}`, detail: `HMAC-${s.integ} integrity check value.` })
    return segs
  }
  if (g.udp) segs.push({ name: 'UDP 4500', bytes: 8, kind: 'udp', label: 'UDP 4500', detail: 'NAT-T encapsulation (RFC 3948). ESP-in-UDP has no non-ESP marker.' })
  segs.push({ name: 'ESP header', bytes: 8, kind: 'esp_hdr', label: 'ESP · SPI·seq', detail: 'SPI (4 B) and sequence number (4 B). The only cleartext part of the ESP packet.' })
  segs.push({ name: 'IV', bytes: g.iv, kind: 'iv', label: `IV ${g.iv}`, detail: `${g.iv}-byte initialization vector, ${s.enc === 'AES-CBC' ? 'one AES block' : s.enc === '3DES-CBC' ? 'one 3DES block' : 'explicit GCM nonce'}.` })
  if (g.innerIp) segs.push({ name: 'Inner IP header', bytes: g.innerIp, kind: 'inner_ip', label: `inner IPv${s.ipVersion}`, detail: 'Encrypted original IP header. Its presence is what distinguishes tunnel mode.' })
  segs.push({ name: 'Encrypted payload', bytes: g.payload, kind: 'payload', label: 'encrypted payload', detail: `${g.payload} bytes of ciphertext. Size and timing patterns feed the traffic classifier.` })
  segs.push({ name: 'Padding + trailer', bytes: g.pad + 2, kind: 'trailer', label: `pad ${g.pad} + 2`, detail: `${g.pad} bytes of padding, pad length and next header, aligned to ${s.enc === 'AES-CBC' ? 16 : s.enc === '3DES-CBC' ? 8 : 4}-byte boundary.` })
  segs.push({ name: 'ICV', bytes: g.icv, kind: 'icv', label: `ICV ${g.icv}`, detail: `${g.icv}-byte ${isAead(s) ? 'AEAD authentication tag' : 'HMAC integrity check value'}.` })
  return segs
}

/* ---------- IKE ---------- */
function ikeExchanges(s: Scenario): IkeExchange[] {
  const out: IkeExchange[] = []
  const dh = DH[s.dh]
  const nProps = s.weakOffered || s.id === 'S11' ? 2 : 1
  const sa = 4 + nProps * 52
  const ke = 8 + dh.ke
  const dur = s.durationS
  const rk = [dur * 0.33, dur * 0.67]
  let i = 0
  const add = (e: Omit<IkeExchange, 'index' | 'version'>) => out.push({ ...e, index: i++, version: s.ikeVersion })
  if (s.ikeVersion === 2) {
    add({ ts: 0, exchange: 'IKE_SA_INIT', direction: 'i→r', msg_id: 0, size: 28 + sa + ke + 36 + 56 + 60, payloads: ['SA', 'KE', 'Ni', 'N(NAT_DETECTION)', 'V'], encrypted: false, note: `${nProps} proposal${nProps > 1 ? 's' : ''} offered` })
    add({ ts: 0.012, exchange: 'IKE_SA_INIT', direction: 'r→i', msg_id: 0, size: 28 + 56 + ke + 36 + 56 + (s.auth === 'cert' ? 25 : 0) + 40, payloads: ['SA', 'KE', 'Nr', 'N(NAT_DETECTION)', ...(s.auth === 'cert' ? ['CERTREQ'] : []), 'V'], encrypted: false, note: `Selected ${ikeEncName(s)} · ${dhName(s.dh)}` })
    const cert = s.auth === 'cert'
    add({ ts: 0.041, exchange: 'IKE_AUTH', direction: 'i→r', msg_id: 1, size: cert ? 1496 : 304, payloads: ['SK{IDi', ...(cert ? ['CERT', 'CERTREQ'] : []), 'AUTH', 'SA', 'TSi', 'TSr}'], encrypted: true, note: cert ? 'Fragmented (RFC 7383) — large size implies certificates' : 'Small message — likely pre-shared key' })
    add({ ts: 0.063, exchange: 'IKE_AUTH', direction: 'r→i', msg_id: 1, size: cert ? 1368 : 236, payloads: ['SK{IDr', ...(cert ? ['CERT'] : []), 'AUTH', 'SA', 'TSi', 'TSr}'], encrypted: true, note: 'Child SA established' })
    add({ ts: dur * 0.2, exchange: 'INFORMATIONAL', direction: 'i→r', msg_id: 2, size: 76, payloads: ['SK{}'], encrypted: true, note: 'Dead peer detection' })
    add({ ts: dur * 0.2 + 0.004, exchange: 'INFORMATIONAL', direction: 'r→i', msg_id: 2, size: 76, payloads: ['SK{}'], encrypted: true, note: 'DPD reply' })
    rk.forEach((t, k) => {
      const base = 252
      add({ ts: t, exchange: 'CREATE_CHILD_SA', direction: 'i→r', msg_id: 3 + k * 2, size: base + (s.pfs ? ke : 0), payloads: ['SK{SA', 'Ni', ...(s.pfs ? ['KE'] : []), 'TSi', 'TSr}'], encrypted: true, note: s.pfs ? `Rekey · KE adds +${ke} B` : 'Rekey · no KE payload', rekey: true })
      add({ ts: t + 0.006, exchange: 'CREATE_CHILD_SA', direction: 'r→i', msg_id: 3 + k * 2, size: base - 16 + (s.pfs ? ke : 0), payloads: ['SK{SA', 'Nr', ...(s.pfs ? ['KE'] : []), 'TSi', 'TSr}'], encrypted: true, note: 'New ESP SPIs follow', rekey: true })
    })
    add({ ts: dur - 0.6, exchange: 'INFORMATIONAL', direction: 'i→r', msg_id: 7, size: 84, payloads: ['SK{D}'], encrypted: true, note: 'Delete IKE SA' })
    add({ ts: dur - 0.59, exchange: 'INFORMATIONAL', direction: 'r→i', msg_id: 7, size: 76, payloads: ['SK{}'], encrypted: true, note: 'Delete acknowledged' })
  } else if (s.exchange === 'main') {
    const mm: [string, 'i→r' | 'r→i', number, string[], boolean, string][] = [
      ['Main Mode 1', 'i→r', 148, ['SA', 'V', 'V', 'V'], false, 'Proposal in cleartext'],
      ['Main Mode 2', 'r→i', 108, ['SA', 'V'], false, `Selected ${ikeEncName(s)} · ${prfName(s.prf)}`],
      ['Main Mode 3', 'i→r', 28 + 4 + dh.ke + 24 + 20, ['KE', 'Ni', 'NAT-D'], false, `${dhName(s.dh)} public value`],
      ['Main Mode 4', 'r→i', 28 + 4 + dh.ke + 24 + 20, ['KE', 'Nr', 'NAT-D'], false, 'Responder public value'],
      ['Main Mode 5', 'i→r', 92, ['ID', 'HASH'], true, 'Identity protected'],
      ['Main Mode 6', 'r→i', 92, ['ID', 'HASH'], true, 'Phase 1 complete'],
    ]
    mm.forEach(([ex, d, size, pl, enc, note], k) => add({ ts: k * 0.012, exchange: ex, direction: d, msg_id: 0, size, payloads: pl, encrypted: enc, note }))
  } else {
    const idLen = (s.identity ?? 'branch').length
    add({ ts: 0, exchange: 'Aggressive Mode 1', direction: 'i→r', msg_id: 0, size: 28 + 56 + 4 + dh.ke + 24 + 8 + idLen + 60, payloads: ['SA', 'KE', 'Ni', 'ID', 'V', 'V', 'V'], encrypted: false, note: `Identity "${s.identity}" in cleartext` })
    add({ ts: 0.011, exchange: 'Aggressive Mode 2', direction: 'r→i', msg_id: 0, size: 28 + 56 + 4 + dh.ke + 24 + 8 + 16 + 24 + 40, payloads: ['SA', 'KE', 'Nr', 'ID', 'HASH', 'V', 'V'], encrypted: false, note: 'PSK-derived HASH in cleartext — crackable offline' })
    add({ ts: 0.022, exchange: 'Aggressive Mode 3', direction: 'i→r', msg_id: 0, size: 28 + 24 + 8, payloads: ['HASH'], encrypted: false, note: 'Authentication confirmation' })
  }
  if (s.ikeVersion === 1) {
    const qm = (t: number, id: number, rekey: boolean) => {
      const kePart = s.pfs ? dh.ke + 4 : 0
      add({ ts: t, exchange: 'Quick Mode 1', direction: 'i→r', msg_id: id, size: 188 + kePart, payloads: ['HASH', 'SA', 'Ni', ...(s.pfs ? ['KE'] : []), 'ID', 'ID'], encrypted: true, note: rekey ? (s.pfs ? `Rekey · KE adds +${kePart} B` : 'Rekey · no KE payload') : 'Child SA proposal', rekey })
      add({ ts: t + 0.006, exchange: 'Quick Mode 2', direction: 'r→i', msg_id: id, size: 172 + kePart, payloads: ['HASH', 'SA', 'Nr', ...(s.pfs ? ['KE'] : []), 'ID', 'ID'], encrypted: true, note: 'Child SA accepted', rekey })
      add({ ts: t + 0.012, exchange: 'Quick Mode 3', direction: 'i→r', msg_id: id, size: 60, payloads: ['HASH'], encrypted: true, note: 'Confirmation', rekey })
    }
    qm(s.exchange === 'main' ? 0.1 : 0.08, 0x1a2b, false)
    qm(dur * 0.33, 0x3c4d, true)
    qm(dur * 0.67, 0x5e6f, true)
  }
  return out.sort((a, b) => a.ts - b.ts).map((e, k) => ({ ...e, index: k }))
}

/* ---------- proposals ---------- */
function proposals(s: Scenario): Proposal[] {
  const dh = DH[s.dh]
  const aead = s.ikeEnc === 'AES-GCM-16'
  const strength = (): Proposal['strength'] => {
    if (dh.rating === 'critical') return 'critical'
    if (s.ikeEnc === '3DES-CBC' || s.prf === 'MD5' || dh.rating === 'weak') return 'weak'
    if (s.prf === 'SHA1' || dh.rating === 'acceptable') return 'acceptable'
    return 'strong'
  }
  const tr = (enc: string, bits: number | undefined, prf: string, integ: string | null, grp: number) => [
    { type: 'ENCR', name: enc, key_length: bits },
    { type: 'PRF', name: prf },
    ...(integ ? [{ type: 'INTEG', name: integ }] : []),
    { type: 'DH', name: `Group ${grp} · ${DH[grp].name}` },
  ]
  const list: Proposal[] = [{
    number: 1, protocol: s.ikeVersion === 1 ? 'IKEv1 Phase 1' : 'IKE', selected: true, strength: strength(),
    transforms: tr(s.ikeEnc === '3DES-CBC' ? '3DES-CBC' : aead ? 'AES-GCM-16' : 'AES-CBC', s.ikeEnc === '3DES-CBC' ? undefined : s.ikeBits, prfName(s.prf), aead ? null : `HMAC-${s.prf === 'SHA1' ? 'SHA1-96' : s.prf === 'MD5' ? 'MD5-96' : 'SHA2-' + s.prf.slice(3) + '-' + ({ SHA256: 128, SHA384: 192, SHA512: 256 } as Record<string, number>)[s.prf]}`, s.dh),
  }]
  if (s.weakOffered) {
    list.push({ number: 2, protocol: s.ikeVersion === 1 ? 'IKEv1 Phase 1' : 'IKE', selected: false, strength: 'critical', transforms: tr('3DES-CBC', undefined, 'PRF-HMAC-SHA1', 'HMAC-SHA1-96', 2) })
  }
  if (s.id === 'S11') {
    list.push({ number: 2, protocol: 'IKE', selected: false, strength: 'strong', transforms: tr('AES-GCM-16', 128, 'PRF-HMAC-SHA2-256', null, 19) })
  }
  const esp: Proposal['transforms'] = s.protocol === 'AH'
    ? [{ type: 'AH', name: integName(s.integ) }, { type: 'ESN', name: 'No' }]
    : [
        { type: 'ENCR', name: encName(s) },
        ...(s.integ !== 'NONE' ? [{ type: 'INTEG', name: integName(s.integ) }] : []),
        ...(s.pfs ? [{ type: 'DH', name: `Group ${s.dh} · ${dh.name}` }] : []),
        { type: 'ESN', name: s.esn ? 'Yes' : 'No' },
      ]
  list.push({
    number: list.length + 1, protocol: s.protocol + ' (inferred)', selected: true, transforms: esp,
    strength: s.enc === '3DES-CBC' || s.enc === 'NULL' || s.protocol === 'AH' ? 'critical' : s.integ === 'MD5-96' ? 'weak' : s.integ === 'SHA1-96' ? 'acceptable' : 'strong',
  })
  return list
}

/* ---------- traffic & timeline ---------- */
function classAt(s: Scenario, t: number): TrafficClass {
  const p = s.traffic.find((x) => t >= x.start && t < x.start + x.dur)
  return (p ?? s.traffic[s.traffic.length - 1]).cls
}

function buildTimeline(s: Scenario, ike: IkeExchange[]) {
  const r = rngFor(s.id + 'tl')
  const bins: TimelineBin[] = []
  for (let t = 0; t < s.durationS; t++) {
    const cls = classAt(s, t)
    const tc = TRAFFIC[cls]
    let k = 0.85 + 0.3 * r()
    if (cls === 'video') k = t % 3 === 0 ? 1.8 : 0.45
    if (cls === 'web') k = r() < 0.35 ? 2.2 : 0.25
    if (cls === 'email') k = r() < 0.2 ? 3 : 0.5
    if (cls === 'messaging') k = r() < 0.1 ? 8 : 0.7
    const data = Math.max(0, Math.round(tc.pps * k))
    const ikeN = ike.filter((e) => Math.floor(e.ts) === t).length
    const other = 1 + Math.floor(r() * 4)
    const avg = tc.avg * (0.92 + 0.16 * r())
    bins.push({
      t, ike: ikeN, esp: s.protocol === 'ESP' ? data : 0, ah: s.protocol === 'AH' ? data : 0, other,
      bytes: Math.round(data * avg + ikeN * 300 + other * 90),
    })
  }
  return bins
}

function buildWindows(s: Scenario, spi: string): TrafficWindow[] {
  const r = rngFor(s.id + 'win')
  const out: TrafficWindow[] = []
  const all = Object.keys(TRAFFIC) as TrafficClass[]
  for (let t = 0; t < s.durationS; t += 5) {
    const end = Math.min(s.durationS, t + 5)
    const truth = classAt(s, (t + end) / 2)
    const noisy = r() < 0.06
    const label = noisy ? (CONFUSE[truth][r() < 0.5 ? 0 : 1] as TrafficClass) : truth
    const conf = noisy ? 0.5 + r() * 0.18 : Math.min(0.99, s.classifierConf + (r() - 0.5) * 0.12)
    const rest = CONFUSE[label].concat(all.filter((a) => a !== label && !CONFUSE[label].includes(a)))
    const probs: Record<string, number> = { [label]: conf }
    let left = 1 - conf
    rest.slice(0, 3).forEach((c, k) => {
      const share = k === 0 ? 0.55 : k === 1 ? 0.3 : 0.15
      probs[c] = left * share
    })
    Object.keys(probs).forEach((k) => (probs[k] = Math.round(probs[k] * 1000) / 1000))
    out.push({ t_start: t, t_end: end, sa_spi_hex: spi, label, confidence: Math.round(conf * 1000) / 1000, probs, top_features: features(label, r) })
  }
  return out
}

function features(label: TrafficClass, r: () => number) {
  const j = (a: number, b: number) => a + (b - a) * r()
  const t: Record<TrafficClass, [string, string, number][]> = {
    voip: [['periodicity_score', j(0.86, 0.96).toFixed(2), 0.24], ['size_std', `${j(6, 14).toFixed(1)} B`, 0.19], ['iat_cv', j(0.04, 0.1).toFixed(2), 0.16], ['up_ratio_pkts', j(0.47, 0.53).toFixed(2), 0.12], ['size_p50', `${Math.round(j(168, 184))} B`, 0.09]],
    video: [['frac_large', j(0.78, 0.92).toFixed(2), 0.22], ['burst_count', `${Math.round(j(2, 5))}`, 0.17], ['up_ratio_bytes', j(0.02, 0.07).toFixed(2), 0.16], ['size_p90', `${Math.round(j(1380, 1440))} B`, 0.13], ['mean_burst_len', `${Math.round(j(60, 140))} pkts`, 0.1]],
    web: [['iat_cv', j(1.6, 2.6).toFixed(2), 0.2], ['size_std', `${Math.round(j(420, 560))} B`, 0.17], ['burst_count', `${Math.round(j(3, 7))}`, 0.14], ['up_ratio_pkts', j(0.28, 0.4).toFixed(2), 0.12], ['frac_small', j(0.3, 0.5).toFixed(2), 0.1]],
    email: [['pkt_count', `${Math.round(j(20, 80))}`, 0.2], ['up_ratio_bytes', j(0.55, 0.8).toFixed(2), 0.19], ['iat_p50', `${Math.round(j(300, 900))} ms`, 0.15], ['frac_small', j(0.55, 0.7).toFixed(2), 0.11], ['bps', `${Math.round(j(8, 30))} kbit/s`, 0.09]],
    messaging: [['pps', j(2, 9).toFixed(1), 0.23], ['size_mean', `${Math.round(j(150, 280))} B`, 0.18], ['iat_p50', `${Math.round(j(900, 4000))} ms`, 0.15], ['frac_small', j(0.8, 0.95).toFixed(2), 0.12], ['periodicity_score', j(0.2, 0.45).toFixed(2), 0.08]],
    icmp: [['size_std', `${j(0, 0.8).toFixed(1)} B`, 0.28], ['iat_mean', `${Math.round(j(960, 1040))} ms`, 0.22], ['size_min', '84 B', 0.15], ['up_ratio_pkts', j(0.49, 0.51).toFixed(2), 0.1], ['pps', j(1.8, 2.1).toFixed(1), 0.08]],
    file_transfer: [['pps', `${Math.round(j(380, 460))}`, 0.25], ['frac_large', j(0.9, 0.97).toFixed(2), 0.2], ['bps', `${Math.round(j(4.6, 5.4) * 1000)} kbit/s`, 0.15], ['up_ratio_pkts', j(0.3, 0.36).toFixed(2), 0.12], ['size_p10', `${Math.round(j(60, 80))} B`, 0.08]],
  }
  return t[label].map(([feature, value, contribution]) => ({ feature, value, contribution }))
}

/* ---------- SAs ---------- */
function buildSAs(s: Scenario, timeline: TimelineBin[], r: () => number): SecurityAssociation[] {
  const [a, b] = endpoints(s)
  const dur = s.durationS
  const bounds = [0.3, dur * 0.33, dur * 0.67, dur]
  const proto = s.protocol
  const total = timeline.reduce((acc, x) => acc + (proto === 'ESP' ? x.esp : x.ah), 0)
  const out: SecurityAssociation[] = []
  for (let k = 0; k < 3; k++) {
    const t0 = bounds[k]
    const t1 = bounds[k + 1]
    const share = timeline.filter((x) => x.t >= t0 && x.t < t1).reduce((acc, x) => acc + (proto === 'ESP' ? x.esp : x.ah), 0)
    ;(['out', 'in'] as const).forEach((dir) => {
      const dirShare = Math.round(share * (dir === 'out' ? 0.52 : 0.48))
      const avg = total ? timeline.reduce((acc, x) => acc + x.bytes, 0) / (timeline.reduce((acc, x) => acc + x.esp + x.ah + x.ike + x.other, 0) || 1) : 400
      const dup = s.duplicates > 0 && k === 1 && dir === 'out' ? s.duplicates : 0
      out.push({
        spi_hex: '0x' + hex(Math.floor(r() * 0xffffffff) | 0x10000000),
        src: dir === 'out' ? a : b, dst: dir === 'out' ? b : a, protocol: proto,
        packets: dirShare + dup, bytes: Math.round(dirShare * avg * 1.05),
        first_seen: +(t0 + r() * 0.2).toFixed(2), last_seen: +(t1 - r() * 0.2).toFixed(2),
        seq_min: 1, seq_max: dirShare,
        gaps: Math.floor(r() * 3), duplicates: dup,
        out_of_order: dup > 0 && s.backwardJump ? 1 : Math.floor(r() * 2),
        inferred_lifetime_s: Math.round(s.childLifetimeH * 3600 * (0.98 + r() * 0.03)),
      })
    })
  }
  return out
}

/* ---------- packet list ---------- */
function buildPackets(s: Scenario, ike: IkeExchange[], sas: SecurityAssociation[], r: () => number): PacketRec[] {
  const [a, b] = endpoints(s)
  const list: PacketRec[] = []
  ike.forEach((e) => {
    const [src, dst] = e.direction === 'i→r' ? [a, b] : [b, a]
    list.push({ index: 0, ts: e.ts, src, dst, proto: 'IKE', length: e.size + (s.natT && e.ts > 0.02 ? 4 : 0) + 28 + (s.ipVersion === 6 ? 20 : 0), info: `${s.ikeVersion === 1 ? 'ISAKMP' : 'IKEv2'} ${e.exchange} ${e.direction === 'i→r' ? 'Request' : 'Response'} (id=${e.msg_id})` })
  })
  const N = 360
  const dom = s.traffic[0].cls
  for (let k = 0; k < N; k++) {
    const t = 0.1 + (k / N) * (s.durationS - 0.4) + r() * 0.2
    const cls = classAt(s, t)
    const sa = sas.filter((x) => x.first_seen <= t && x.last_seen >= t)
    const dirOut = r() < 0.52
    const pick = sa.find((x) => (x.src === a) === dirOut) ?? sas[0]
    const inner = Math.max(60, Math.round(TYPICAL_INNER[cls] * (0.35 + r() * 0.75)))
    const g = geometry(s, Math.min(1500, inner))
    const seq = Math.max(1, Math.round((pick.seq_max * (t - pick.first_seen)) / Math.max(1, pick.last_seen - pick.first_seen)))
    const len = s.protocol === 'AH' ? g.outer + 12 + g.icv + Math.max(8, inner - g.ipHdr) : g.outer + g.udp + g.espLen
    list.push({
      index: 0, ts: +t.toFixed(4), src: pick.src, dst: pick.dst, proto: s.protocol === 'AH' ? 'AH' : 'ESP', length: len,
      info: s.protocol === 'AH' ? `AH (SPI=${pick.spi_hex}, Seq=${seq})` : `ESP (SPI=${pick.spi_hex}, Seq=${seq})${s.natT ? ' · UDP 4500' : ''}`,
    })
    if (k % 18 === 0) list.push({ index: 0, ts: +(t + 0.003).toFixed(4), src: a, dst: b, proto: 'Other', length: 74 + (s.ipVersion === 6 ? 20 : 0), info: 'UDP 53 Standard query A time.example.in' })
  }
  void dom
  return list.sort((x, y) => x.ts - y.ts).map((p, i) => ({ ...p, index: i }))
}

/* ---------- identification ---------- */
function identification(s: Scenario, ike: IkeExchange[], counts: { esp: number; ah: number }, windows: TrafficWindow[]): IdentifiedField[] {
  const out: IdentifiedField[] = []
  const dh = DH[s.dh]
  const n = counts.esp + counts.ah
  const add = (key: string, label: string, value: string, confidence: number, method: Method, evidence: number[], explanation: string) =>
    out.push({ key, label, value, confidence, method, evidence, explanation, ground_truth_match: true })
  const ah = s.protocol === 'AH'
  const tally = windows.reduce<Record<string, number>>((m, w) => ((m[w.label] = (m[w.label] ?? 0) + 1), m), {})
  const dom = TRAFFIC[Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0] as TrafficClass]
  const trafficList = s.traffic.map((p) => TRAFFIC[p.cls].label).filter((v, i, a) => a.indexOf(v) === i)
  const rk = ike.filter((e) => e.rekey && e.direction === 'i→r')
  const rekeyDelta = (s.ikeVersion === 2 ? 252 : 188) + (s.pfs ? dh.ke + (s.ikeVersion === 2 ? 8 : 4) : 0)

  add('ipsec_present', 'IPsec present', 'Yes', 0.99, 'cleartext', [0, 1], `IKE on UDP ${s.natT ? '500 and 4500' : '500'} and ${n.toLocaleString('en-US')} ${s.protocol} packets were found.`)
  add('protocols', 'Protocols observed', s.protocol === 'AH' ? 'IKE + AH' : s.natT ? 'IKE + ESP-in-UDP (NAT-T)' : 'IKE + ESP', 0.99, 'cleartext', [0, 1, 4], `IP protocol ${s.protocol === 'AH' ? '51 (AH)' : s.natT ? '17 (UDP) with SPI-prefixed payloads on port 4500' : '50 (ESP)'} identified from outer headers.`)
  add('ip_version', 'IP version', `IPv${s.ipVersion}`, 0.99, 'cleartext', [0], `Outer header version nibble is ${s.ipVersion}.`)
  add('ike_version', 'IKE version', `IKEv${s.ikeVersion}`, 0.99, 'cleartext', [0, 1, 2], `The IKE header version byte is 0x${s.ikeVersion === 1 ? '10' : '20'} in every handshake message.`)
  add('ike_exchange_mode', 'IKE exchange mode', s.exchange === 'ikev2' ? 'IKE_SA_INIT + IKE_AUTH' : s.exchange === 'main' ? 'Main Mode (Identity Protection)' : 'Aggressive Mode', 0.99, 'cleartext', [0, 1], `Exchange type ${s.exchange === 'ikev2' ? '34 then 35' : s.exchange === 'main' ? '2' : '4'} in the ISAKMP header.`)
  add('auth_method', 'Authentication method', s.auth === 'psk' ? 'Pre-shared key' : 'Certificates', s.ikeVersion === 1 ? 0.99 : s.auth === 'psk' ? 0.78 : 0.84, s.ikeVersion === 1 ? 'cleartext' : 'side-channel', [2, 3],
    s.ikeVersion === 1 ? 'The authentication method attribute (3 = 1, PSK) is readable in the Phase 1 proposal.' : s.auth === 'psk' ? 'IKE_AUTH is only ~300 bytes with no fragmentation, which fits a PSK exchange without certificate payloads.' : 'IKE_AUTH is ~1.5 KB and fragmented (RFC 7383), which only certificate payloads explain.')
  add('ike_encryption', 'IKE SA encryption', ikeEncName(s), 0.99, 'cleartext', [0, 1], 'Selected ENCR transform read from the SA payload in the first handshake responses.')
  add('ike_key_length', 'IKE SA key length', s.ikeEnc === '3DES-CBC' ? '168-bit (3 × 56)' : `${s.ikeBits}-bit`, 0.99, 'cleartext', [0, 1], 'Key Length attribute (type 14) in the selected transform.')
  add('ike_prf', 'IKE PRF', prfName(s.prf), 0.99, 'cleartext', [0, 1], 'PRF transform ID in the selected proposal.')
  add('ike_integrity', 'IKE integrity', s.ikeEnc === 'AES-GCM-16' ? 'None (AEAD)' : `HMAC-${s.prf === 'SHA1' ? 'SHA1-96' : s.prf === 'MD5' ? 'MD5-96' : 'SHA2-' + s.prf.slice(3)}`, 0.99, 'cleartext', [0, 1], s.ikeEnc === 'AES-GCM-16' ? 'AEAD ciphers provide integrity; no INTEG transform is present.' : 'INTEG transform in the selected proposal.')
  add('dh_group', 'Diffie-Hellman group', dhName(s.dh), 0.99, 'cleartext', [0, 1], `KE payload carries group ${s.dh} and a ${dh.ke}-byte public value.`)
  add('proposals_offered_count', 'Proposals offered', `${s.weakOffered || s.id === 'S11' ? 2 : 1}`, 0.99, 'cleartext', [0], `The initiator SA payload contains ${s.weakOffered || s.id === 'S11' ? 2 : 1} proposal${s.weakOffered || s.id === 'S11' ? 's' : ''}.`)

  if (ah) {
    add('esp_cipher_family', 'ESP encryption', 'None: AH carries the payload in the clear', 0.99, 'cleartext', [8, 9], 'IP protocol 51 (AH) was observed; no ESP SPIs exist. Inner TCP/UDP headers parse directly after the AH header.')
    add('esp_integrity', 'Integrity (AH ICV)', `${integName(s.integ)} · ${icvBytes(s)}-byte ICV`, 0.95, 'cleartext', [8, 9], 'AH payload-length field reveals a 16-byte ICV, matching HMAC-SHA2-256-128 from the IKE proposal.')
    add('esp_key_length', 'Encryption key length', 'n/a (no encryption)', 0.99, 'cleartext', [8], 'No cipher is applied to the payload.')
  } else {
    const icv = icvBytes(s)
    let expl = ''
    let conf = 0.9
    if (s.enc === 'AES-GCM-16') {
      expl = `All ${n.toLocaleString('en-US')} ESP packets satisfy (L − 16) mod 4 = 0 while residues mod 16 spread across {0, 4, 8, 12}, so no block alignment holds. This fits AES-GCM-16 or ChaCha20-Poly1305; the IKE SA selected AES-GCM-16.`
      conf = 0.93
    } else if (s.enc === 'AES-CBC') {
      expl = `All ${n.toLocaleString('en-US')} ESP packets satisfy (L − 8 − 16 − ${icv}) mod 16 = 0. The AES-GCM hypothesis fails on 71% of packets, so a 16-byte block cipher with an explicit IV fits.${icv === 16 ? ' A 32-byte ICV leaves the same residue, so the IKE integrity transform breaks the tie.' : ''}`
      conf = icv === 16 ? 0.86 : 0.9
    } else if (s.enc === '3DES-CBC') {
      expl = `All ${n.toLocaleString('en-US')} ESP packets fit 8-byte block alignment with an 8-byte IV and 12-byte ICV, which matches 3DES-CBC with HMAC-MD5-96. AES-CBC alignment failed on 48% of packets.`
      conf = 0.88
    } else {
      expl = 'Residue analysis matched the selected hypothesis.'
    }
    add('esp_cipher_family', 'ESP encryption', s.enc === 'AES-GCM-16' ? 'AES-GCM-16 (family)' : s.enc === 'AES-CBC' ? 'AES-CBC' : encName(s), conf, 'side-channel', [41, 42, 43], expl)
    add('esp_integrity', 'ESP integrity / ICV', s.integ === 'NONE' ? `AEAD tag · ${icv} bytes` : `${integName(s.integ)} · ${icv}-byte ICV`, s.integ === 'MD5-96' ? 0.72 : icv === 16 && s.enc === 'AES-CBC' ? 0.76 : 0.9, 'side-channel', [41, 42],
      s.integ === 'MD5-96' ? 'A 12-byte ICV matches both HMAC-SHA1-96 and HMAC-MD5-96. The IKE SA prior (MD5) breaks the tie, so confidence is lower.' : icv === 16 && s.enc === 'AES-CBC' ? 'ICV 16 and ICV 32 produce the same residue. The minimum observed length and the IKE integrity transform select HMAC-SHA2-256-128.' : `Minimum observed ESP length leaves exactly ${icv} bytes for the trailer ICV under the winning cipher hypothesis.`)
    add('esp_key_length', 'Encryption key length', s.enc === '3DES-CBC' ? '168-bit (3 × 56)' : `${s.keyBits}-bit`, s.enc === '3DES-CBC' ? 0.88 : 0.7, s.enc === '3DES-CBC' ? 'side-channel' : 'heuristic', [0, 1], s.enc === '3DES-CBC' ? 'Key size is fixed by the 3DES family.' : 'AES key size is not observable from ESP lengths. Taken from the IKE SA key length as a prior; treat as a lead, not proof.')
  }
  const tun = s.mode === 'tunnel'
  add('mode', 'Tunnel or transport mode', tun ? 'Tunnel' : 'Transport', ah ? 0.88 : s.id === 'S03' ? 0.78 : tun ? 0.94 : 0.86, 'ml', [41, 42, 43],
    tun ? `Estimated plaintext floor is ${s.traffic[0].cls === 'voip' ? 188 : 96} B, 20 B higher than the bare transport-layer minimum for ${TRAFFIC[s.traffic[0].cls].label}. The gradient-boosting classifier gives P(tunnel) = 0.94.` :
      `Estimated plaintext floor is ${s.traffic.some((p) => p.cls === 'icmp') ? 64 : 76} B, which matches a bare transport payload without an extra inner IP header. P(transport) = ${ah ? 0.88 : 0.86}.`)
  add('nat_traversal', 'NAT traversal', s.natT ? 'Detected (UDP 4500)' : 'Not detected', 0.99, 'cleartext', [0, 1], s.natT ? 'NAT_DETECTION_SOURCE_IP / DESTINATION_IP notifies differ from the packet addresses and traffic moved to UDP 4500.' : 'All traffic stays on UDP 500 and IP protocol ' + (ah ? '51' : '50') + '.')
  add('pfs', 'Perfect forward secrecy', s.pfs ? 'Enabled' : 'Not observed', s.pfs ? 0.87 : 0.84, 'side-channel', rk.map((e) => e.index).slice(0, 4),
    s.pfs ? `Rekey request grew to ${rekeyDelta} B from a ${s.ikeVersion === 2 ? 252 : 188} B no-KE baseline (+${dh.ke + (s.ikeVersion === 2 ? 8 : 4)} B), matching a ${dh.name} KE payload within 16 B.` : `Both rekey requests measured ${s.ikeVersion === 2 ? 252 : 188} B, within 4 B of the no-KE baseline. A ${dh.name} KE payload would add ${dh.ke + 8} B.`)
  add('ike_sa_lifetime', 'IKE SA lifetime', `≈ ${s.ikeLifetimeH} h`, s.ikeVersion === 1 ? 0.99 : 0.6, s.ikeVersion === 1 ? 'cleartext' : 'heuristic', [0],
    s.ikeVersion === 1 ? 'Life duration attribute read from the Phase 1 proposal.' : 'No IKE SA rekey occurred in the capture; estimated from child SA cadence with the synthetic ×360 time scale. Low confidence.')
  add('child_sa_lifetime', 'Child SA lifetime', `≈ ${s.childLifetimeH} h`, s.ikeVersion === 1 ? 0.9 : 0.78, s.ikeVersion === 1 ? 'cleartext' : 'side-channel', rk.map((e) => e.index).slice(0, 4),
    `ESP SPI rollover every ${(s.durationS * 0.33).toFixed(0)} s of capture time, which scales to about ${s.childLifetimeH} h.`)
  add('esn', 'Extended sequence numbers', s.esn ? 'On' : 'Off', 0.6, 'heuristic', [41], 'ESN is negotiated inside encrypted IKE_AUTH. Estimated from sequence-number behaviour and per-SA packet rate; low confidence.')
  add('replay_protection', 'Replay protection', s.duplicates > 0 ? `Anomaly: ${s.duplicates} duplicates, ${s.backwardJump ? '1 backward jump' : 'no jump'}` : 'Sequence numbers strictly increase', 0.95, 'side-channel', s.duplicates > 0 ? [1204, 1205, 1243] : [41, 42],
    s.duplicates > 0 ? `${s.duplicates} ESP packets repeated an earlier sequence number on one SA and one packet jumped backwards by 5,000.` : 'Per-SA sequence numbers increased monotonically with no duplicates.')
  add('implementation', 'VPN implementation', `${s.vendor} (Vendor ID match)`, 0.9, 'cleartext', [0, 1], 'Vendor ID payloads in the first handshake messages matched a known fingerprint.')
  add('traffic_type', 'Traffic inside the tunnel', trafficList.join(' + '), Math.round(s.classifierConf * 100) / 100, 'ml', [41, 42, 43], `Random-forest predictions over ${windows.length} five-second windows; dominant class: ${dom.label}.`)
  return out
}

/* ---------- metadata ---------- */
function metadata(s: Scenario, ike: IkeExchange[], bytesPerHourMB: number): MetadataItem[] {
  const [a, b] = endpoints(s)
  const out: MetadataItem[] = [
    { item: 'Outer IP endpoints', exposed_value: `${a} ↔ ${b}`, sensitivity: s.mode === 'transport' ? 'high' : 'medium', how_observed: s.mode === 'transport' ? 'IP header (these are the real hosts)' : 'IP header (gateway addresses)' },
    { item: 'UDP ports', exposed_value: s.protocol === 'AH' ? 'IP protocol 51 (AH)' : s.natT ? '500 and 4500' : '500; ESP protocol 50', sensitivity: 'low', how_observed: 'Transport headers' },
    { item: 'IKE SPIs', exposed_value: `0x${hex(Math.floor(rngFor(s.id + 'ispi')() * 0xffffffff))}…`, sensitivity: 'low', how_observed: 'ISAKMP header' },
    { item: 'Negotiated cipher suite', exposed_value: `${ikeEncName(s)} · ${prfName(s.prf)} · ${DH[s.dh].name}`, sensitivity: 'medium', how_observed: 'Cleartext SA payload' },
    { item: 'VPN vendor', exposed_value: s.vendor, sensitivity: 'medium', how_observed: 'Vendor ID payloads' },
    { item: 'Traffic types and timing', exposed_value: s.traffic.map((p) => `${TRAFFIC[p.cls].label} (${p.start}–${p.start + p.dur} s)`).join(', '), sensitivity: 'high', how_observed: 'ML on packet size and timing windows' },
    { item: 'Session duration and rekeys', exposed_value: `${s.durationS} s, ${ike.filter((e) => e.rekey && e.direction === 'i→r').length} rekeys`, sensitivity: 'low', how_observed: 'IKE message cadence' },
    { item: 'Data volume', exposed_value: `≈ ${bytesPerHourMB.toFixed(0)} MB per hour`, sensitivity: 'medium', how_observed: 'Byte counters per SA' },
  ]
  if (s.natT) out.push({ item: 'NAT presence', exposed_value: 'Peer is behind a NAT device', sensitivity: 'low', how_observed: 'NAT_DETECTION notifies, UDP 4500' })
  if (s.exchange === 'aggressive') out.push({ item: 'Initiator identity', exposed_value: s.identity ?? 'FQDN', sensitivity: 'high', how_observed: 'Cleartext ID payload (Aggressive Mode)' })
  if (s.protocol === 'AH') out.push({ item: 'Full payload and inner protocol', exposed_value: 'HTTP/ICMP content readable', sensitivity: 'high', how_observed: 'AH does not encrypt' })
  return out
}

/* ---------- narrative ---------- */
const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']
export function topFindings(findings: Finding[], n = 5) {
  return [...findings].filter((f) => SEV_ORDER.includes(f.severity)).sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)).slice(0, n)
}
function narrative(scoreN: number, grade: Grade, counts: Record<Severity, number>, findings: Finding[]) {
  const top = topFindings(findings, 1)[0]
  const nc = counts.critical
  const nh = counts.high
  const variants = [
    `This IPsec deployment scored ${scoreN}/100 (grade ${grade}). ${nc} critical and ${nh} high-risk issues were found. The most urgent is ${top?.title ?? 'none'}: ${top?.impact ?? ''}`,
    `TunnelScope rates this VPN ${grade} (${scoreN}/100). There ${nc + nh === 1 ? 'is' : 'are'} ${nc + nh} issue${nc + nh === 1 ? '' : 's'} at high or critical level. Fix ${top?.title ?? 'nothing'} first: ${top?.impact ?? ''}`,
    `Overall posture is ${grade} with a score of ${scoreN}/100. ${nc ? `${nc} critical finding${nc > 1 ? 's' : ''} cap the score.` : 'No critical finding caps the score.'} Start with ${top?.title ?? 'routine hygiene'}. ${top?.impact ?? ''}`,
  ]
  const idx = (scoreN + nc + nh) % variants.length
  const band = scoreN >= 90
    ? 'The configuration follows current IETF and NIST guidance. Remaining items are hardening and metadata notes rather than flaws.'
    : scoreN >= 70
      ? 'The tunnel is usable but carries avoidable risk. A few configuration changes would move it into the top grade.'
      : 'The tunnel looks healthy to users but is exposed to practical attacks. Treat the top recommendations as urgent.'
  return [variants[idx], band]
}

/* ---------- assembly ---------- */
export function buildAnalysis(s: Scenario, createdAt = '2026-10-01T09:00:00Z'): Analysis {
  const r = rngFor(s.id + 'sa')
  const ike = ikeExchanges(s)
  const timeline = buildTimeline(s, ike)
  const counts = timeline.reduce((m, x) => ({ ike: m.ike + x.ike, esp: m.esp + x.esp, ah: m.ah + x.ah, other: m.other + x.other }), { ike: 0, esp: 0, ah: 0, other: 0 })
  const sas = buildSAs(s, timeline, r)
  const windows = buildWindows(s, sas[0]?.spi_hex ?? '0x00')
  const findings = runChecks(s)
  const sc = score(findings)
  const tot = counts.ike + counts.esp + counts.ah + counts.other
  const bytes = timeline.reduce((a, x) => a + x.bytes, 0)

  const distCounts = windows.reduce<Record<string, number>>((m, w) => ((m[w.label] = (m[w.label] ?? 0) + 1), m), {})
  const byteW = Object.entries(distCounts).map(([k, v]) => [k, v * TRAFFIC[k as TrafficClass].pps * TRAFFIC[k as TrafficClass].avg] as const)
  const byteSum = byteW.reduce((a, [, v]) => a + v, 0)
  const distribution = Object.entries(distCounts).map(([k, v]) => ({
    label: k as TrafficClass, pct_time: v / windows.length, pct_bytes: byteW.find(([x]) => x === k)![1] / byteSum,
  })).sort((a, b) => b.pct_time - a.pct_time)

  const ident = identification(s, ike, counts, windows)
  const W: Record<string, number> = { mode: 2, esp_cipher_family: 2, pfs: 1.5, traffic_type: 2 }
  const ai = ident.reduce((a, f) => a + f.confidence * (W[f.key] ?? 1), 0) / ident.reduce((a, f) => a + (W[f.key] ?? 1), 0)
  const top = topFindings(findings, 1)[0]
  const dom = distribution[0].label
  const analysis: Analysis = {
    id: s.id, scenario: s, capture_name: `${s.id} · ${s.name}`, created_at: createdAt, duration_s: s.durationS, packet_count: tot,
    size_bytes: bytes, counts,
    summary: {
      score: sc.score, grade: sc.grade, risk_level: sc.risk_level, risk_score: sc.risk_score, ai_confidence: Math.round(ai * 100) / 100,
      headline: top ? `${top.severity === 'critical' ? 'Critical' : top.severity === 'high' ? 'High risk' : 'Attention'}: ${top.title}.` : 'No significant weaknesses found.',
      verdict: sc.score >= 90 ? 'Safe to rely on' : sc.score >= 70 ? 'Usable with fixes' : sc.score >= 55 ? 'Needs prompt attention' : 'Not safe as configured',
      counts: sc.counts,
    },
    identification: ident, ike_exchanges: ike, proposals_offered: proposals(s), security_associations: sas,
    representative_packet: { segments: ribbon(s, dom) },
    assessment: { categories: sc.categories, findings },
    compliance: compliance(s), threats: threats(s, findings),
    traffic: { distribution, windows },
    metadata_exposure: metadata(s, ike, ((bytes / s.durationS) * 3600) / 1e6),
    timeline, packets: buildPackets(s, ike, sas, r),
    ground_truth: {
      ike_version: `IKEv${s.ikeVersion}`, mode: s.mode, encryption: encName(s), dh_group: String(s.dh), pfs: String(s.pfs), ip_version: `IPv${s.ipVersion}`,
      nat_t: String(s.natT), traffic: s.traffic.map((p) => p.cls).join(','),
    },
    build_info: { encryption_mode: s.enc === '3DES-CBC' || s.id === 'S09' ? 'length-exact' : 'real' },
    narrative: narrative(sc.score, sc.grade, sc.counts, findings),
  }
  return analysis
}
