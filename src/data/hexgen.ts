import type { PacketRec, Scenario } from '../lib/types'
import { rngFor, hashStr } from '../lib/rng'

export type RegionKind = 'ip' | 'udp' | 'ike_hdr' | 'ike_body' | 'esp_hdr' | 'iv' | 'cipher' | 'icv' | 'ah_hdr' | 'plain'
export interface Region { start: number; end: number; kind: RegionKind; label: string }

function ipv4(ip: string) { return ip.split('.').map(Number) }
function ipv6(ip: string) {
  const [head, tail = ''] = ip.split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const groups = [...h, ...Array(8 - h.length - t.length).fill('0'), ...t]
  return groups.flatMap((g) => { const v = parseInt(g || '0', 16); return [v >> 8, v & 255] })
}

export function packetBytes(p: PacketRec, s: Scenario): { bytes: number[]; regions: Region[]; total: number } {
  const r = rngFor(`pkt${p.index}${s.id}`)
  const rnd = () => Math.floor(r() * 256)
  const bytes: number[] = []
  const regions: Region[] = []
  const push = (arr: number[], kind: RegionKind, label: string) => {
    regions.push({ start: bytes.length, end: bytes.length + arr.length, kind, label })
    bytes.push(...arr)
  }
  const v6 = s.ipVersion === 6
  const proto = p.proto === 'ESP' ? (s.natT ? 17 : 50) : p.proto === 'AH' ? 51 : 17
  const payloadLen = Math.max(0, p.length - (v6 ? 40 : 20))
  if (v6) {
    push([0x60, 0, 0, 0, payloadLen >> 8, payloadLen & 255, proto, 64, ...ipv6(p.src), ...ipv6(p.dst)], 'ip', 'IPv6 header')
  } else {
    push([0x45, 0, p.length >> 8, p.length & 255, rnd(), rnd(), 0x40, 0, 64, proto, rnd(), rnd(), ...ipv4(p.src), ...ipv4(p.dst)], 'ip', 'IPv4 header')
  }
  const udp = (sp: number, dp: number, len: number) => [sp >> 8, sp & 255, dp >> 8, dp & 255, len >> 8, len & 255, rnd(), rnd()]
  if (p.proto === 'IKE') {
    const port = s.natT && p.ts > 0.02 ? 4500 : 500
    push(udp(port, port, payloadLen), 'udp', `UDP ${port}`)
    if (port === 4500) push([0, 0, 0, 0], 'udp', 'Non-ESP marker')
    const ispi = Array.from({ length: 8 }, (_, i) => (hashStr(s.id) >> (i * 3)) & 255)
    const rspi = p.ts < 0.01 ? Array(8).fill(0) : Array.from({ length: 8 }, (_, i) => (hashStr(s.id + 'r') >> (i * 3)) & 255)
    const ex = s.ikeVersion === 2 ? (p.info.includes('SA_INIT') ? 34 : p.info.includes('AUTH') ? 35 : p.info.includes('CREATE') ? 36 : 37) : p.info.includes('Aggressive') ? 4 : p.info.includes('Quick') ? 32 : 2
    const first = s.ikeVersion === 2 ? (ex === 34 ? 33 : 46) : 1
    push([...ispi, ...rspi, first, s.ikeVersion === 2 ? 0x20 : 0x10, ex, p.info.includes('Response') ? 0x20 : 0x08, 0, 0, 0, 0, 0, 0, p.length >> 8, p.length & 255], 'ike_hdr', 'ISAKMP header')
    const body = Math.min(160, Math.max(0, payloadLen - 8 - 28))
    push(Array.from({ length: body }, rnd), 'ike_body', 'IKE payloads')
  } else if (p.proto === 'ESP') {
    if (s.natT) push(udp(4500, 4500, payloadLen), 'udp', 'UDP 4500')
    const spi = parseInt(p.info.match(/SPI=0x([0-9a-f]+)/)?.[1] ?? '10000001', 16)
    const seq = Number(p.info.match(/Seq=(\d+)/)?.[1] ?? 1)
    push([(spi >>> 24) & 255, (spi >>> 16) & 255, (spi >>> 8) & 255, spi & 255, (seq >>> 24) & 255, (seq >>> 16) & 255, (seq >>> 8) & 255, seq & 255], 'esp_hdr', 'ESP SPI · seq')
    const iv = s.enc === 'AES-CBC' ? 16 : 8
    push(Array.from({ length: iv }, rnd), 'iv', `IV ${iv}`)
    const icv = s.enc.startsWith('AES-GCM') ? 16 : s.integ === 'SHA2-512-256' ? 32 : s.integ === 'SHA2-256-128' ? 16 : 12
    const cipherLen = Math.max(16, p.length - (v6 ? 40 : 20) - (s.natT ? 8 : 0) - 8 - iv - icv)
    push(Array.from({ length: Math.min(cipherLen, 160) }, rnd), 'cipher', `Ciphertext (${cipherLen} B)`)
    if (cipherLen < 160) push(Array.from({ length: icv }, rnd), 'icv', `ICV ${icv}`)
  } else if (p.proto === 'AH') {
    const spi = parseInt(p.info.match(/SPI=0x([0-9a-f]+)/)?.[1] ?? '10000001', 16)
    const seq = Number(p.info.match(/Seq=(\d+)/)?.[1] ?? 1)
    push([6, 4, 0, 0, (spi >>> 24) & 255, (spi >>> 16) & 255, (spi >>> 8) & 255, spi & 255, 0, 0, (seq >> 8) & 255, seq & 255, ...Array.from({ length: 16 }, rnd)], 'ah_hdr', 'AH header + ICV')
    const text = 'GET /index.html HTTP/1.1\r\nHost: portal.example.in\r\nUser-Agent: curl/8.4\r\nAccept: */*\r\n\r\n'
    push([...text].map((c) => c.charCodeAt(0)).slice(0, 96), 'plain', 'Visible payload')
  } else {
    push(udp(51000 + rnd(), 53, payloadLen), 'udp', 'UDP 53')
    push([...'\u0001\u0000\u0000\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0004time\u0007example\u0002in\u0000\u0000\u0001\u0000\u0001'].map((c) => c.charCodeAt(0)), 'plain', 'DNS query')
  }
  return { bytes: bytes.slice(0, 192), regions, total: p.length }
}
