import type { Analysis } from './types'
import { packetBytes } from '../data/hexgen'

/** Writes a valid libpcap file (raw IP link type) from the analysis' packet list. */
export function makePcap(a: Analysis): Blob {
  const parts: Uint8Array[] = []
  const gh = new DataView(new ArrayBuffer(24))
  gh.setUint32(0, 0xa1b2c3d4, true)
  gh.setUint16(4, 2, true)
  gh.setUint16(6, 4, true)
  gh.setUint32(16, 65535, true)
  gh.setUint32(20, 101, true) // LINKTYPE_RAW
  parts.push(new Uint8Array(gh.buffer))
  const base = Math.floor(new Date(a.created_at).getTime() / 1000)
  a.packets.forEach((p) => {
    const { bytes } = packetBytes(p, a.scenario)
    const h = new DataView(new ArrayBuffer(16))
    h.setUint32(0, base + Math.floor(p.ts), true)
    h.setUint32(4, Math.floor((p.ts % 1) * 1e6), true)
    h.setUint32(8, bytes.length, true)
    h.setUint32(12, Math.max(p.length, bytes.length), true)
    parts.push(new Uint8Array(h.buffer), Uint8Array.from(bytes))
  })
  return new Blob(parts as BlobPart[], { type: 'application/vnd.tcpdump.pcap' })
}
