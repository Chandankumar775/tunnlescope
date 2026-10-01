import type { TrafficClass } from '../lib/types'

export const DH: Record<number, { name: string; ke: number; rating: 'critical' | 'weak' | 'acceptable' | 'strong'; sw: string }> = {
  1: { name: 'MODP-768', ke: 96, rating: 'critical', sw: 'modp768' },
  2: { name: 'MODP-1024', ke: 128, rating: 'critical', sw: 'modp1024' },
  5: { name: 'MODP-1536', ke: 192, rating: 'weak', sw: 'modp1536' },
  14: { name: 'MODP-2048', ke: 256, rating: 'acceptable', sw: 'modp2048' },
  15: { name: 'MODP-3072', ke: 384, rating: 'strong', sw: 'modp3072' },
  16: { name: 'MODP-4096', ke: 512, rating: 'strong', sw: 'modp4096' },
  19: { name: 'ECP-256', ke: 64, rating: 'strong', sw: 'ecp256' },
  20: { name: 'ECP-384', ke: 96, rating: 'strong', sw: 'ecp384' },
  21: { name: 'ECP-521', ke: 132, rating: 'strong', sw: 'ecp521' },
  31: { name: 'Curve25519', ke: 32, rating: 'strong', sw: 'curve25519' },
}

export const TRAFFIC: Record<TrafficClass, { label: string; color: string; pps: number; avg: number; note: string }> = {
  voip: { label: 'VoIP call', color: '#4F6BED', pps: 100, avg: 214, note: 'Symmetric 20 ms cadence, ~160 B payloads' },
  video: { label: 'Video streaming', color: '#C25BB0', pps: 190, avg: 1210, note: 'Downstream bursts of MTU-sized packets every 2–4 s' },
  web: { label: 'Web browsing', color: '#2E9C8F', pps: 58, avg: 640, note: 'Short requests, mixed-size responses, think-time gaps' },
  email: { label: 'Email', color: '#B08A4A', pps: 14, avg: 520, note: 'Sparse TLS/SMTP bursts, upstream-heavy on send' },
  messaging: { label: 'WhatsApp / messaging', color: '#D2687B', pps: 7, avg: 230, note: 'Small packets, 25–60 s keepalives, occasional media burst' },
  icmp: { label: 'ICMP / ping', color: '#7C8CA3', pps: 2, avg: 104, note: 'Fixed-size echo request/reply every second' },
  file_transfer: { label: 'File transfer', color: '#3C4A66', pps: 420, avg: 1380, note: 'Sustained MTU-sized downstream, ACK every 2 packets' },
}

export const TRAFFIC_ORDER: TrafficClass[] = ['voip', 'video', 'web', 'email', 'messaging', 'icmp', 'file_transfer']

export const REFS = {
  rfc7296: 'RFC 7296 — Internet Key Exchange Protocol Version 2 (IKEv2)',
  rfc4303: 'RFC 4303 — IP Encapsulating Security Payload (ESP)',
  rfc4302: 'RFC 4302 — IP Authentication Header (AH)',
  rfc3948: 'RFC 3948 — UDP Encapsulation of IPsec ESP Packets',
  rfc8221: 'RFC 8221 — Cryptographic Algorithm Implementation Requirements for ESP and AH',
  rfc8247: 'RFC 8247 — Algorithm Implementation Requirements for IKEv2',
  rfc9370: 'RFC 9370 — Multiple Key Exchanges in IKEv2',
  nist800: 'NIST SP 800-77 Rev. 1 — Guide to IPsec VPNs',
}

export const VENDOR_VIDS: { name: string; vid: string }[] = [
  { name: 'strongSwan 5.9', vid: '882fe56d6fd20dbc2251613b2ebe5beb' },
  { name: 'RFC 3706 DPD', vid: 'afcad71368a1f1c96b8696fc77570100' },
  { name: 'RFC 3947 NAT-T', vid: '4a131c81070358455c5728f20e95452f' },
  { name: 'Cisco Unity', vid: '12f5f28c457168a9702d9fe274cc0100' },
  { name: 'MS NLBS / Windows', vid: '1e2b516905991c7d7c96fcbfb587e461' },
  { name: 'Libreswan', vid: '4f45486d5d7e6c5c3a2a5a51a1ec9a5d' },
]

export const MODEL_FEATURES = [
  'pkt_count', 'bytes_total', 'dur', 'pps', 'bps', 'size_mean', 'size_std', 'size_min', 'size_p10', 'size_p50',
  'size_p90', 'size_max', 'iat_mean', 'iat_std', 'iat_p50', 'iat_cv', 'up_ratio_pkts', 'up_ratio_bytes', 'frac_small',
  'frac_large', 'burst_count', 'mean_burst_len', 'periodicity_score', 'est_plaintext_floor', 'size_mod16_entropy',
]
