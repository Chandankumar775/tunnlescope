export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass'
export type Method = 'cleartext' | 'side-channel' | 'ml' | 'heuristic'
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type TrafficClass = 'voip' | 'video' | 'web' | 'email' | 'messaging' | 'icmp' | 'file_transfer'
export type EncAlgo = 'AES-GCM-16' | 'AES-GCM-12' | 'AES-GCM-8' | 'AES-CBC' | '3DES-CBC' | 'CHACHA20' | 'NULL'
export type IntegAlgo = 'SHA2-256-128' | 'SHA2-384-192' | 'SHA2-512-256' | 'SHA1-96' | 'MD5-96' | 'NONE'
export type PrfAlgo = 'SHA1' | 'SHA256' | 'SHA384' | 'SHA512' | 'MD5'

export interface Cfg {
  ikeVersion: 1 | 2
  exchange: 'main' | 'aggressive' | 'ikev2'
  mode: 'tunnel' | 'transport'
  ipVersion: 4 | 6
  natT: boolean
  protocol: 'ESP' | 'AH'
  enc: EncAlgo
  keyBits: number
  integ: IntegAlgo
  ikeEnc: 'AES-GCM-16' | 'AES-CBC' | '3DES-CBC'
  ikeBits: number
  prf: PrfAlgo
  dh: number
  pfs: boolean
  auth: 'psk' | 'cert'
  ikeLifetimeH: number
  childLifetimeH: number
  esn: boolean
  weakOffered: boolean
  identity?: string
  duplicates: number
  backwardJump: boolean
  throughput: 'low' | 'high'
  classifierConf: number
}

export interface PlanItem { cls: TrafficClass; start: number; dur: number }

export interface Scenario extends Cfg {
  id: string
  name: string
  description: string
  traffic: PlanItem[]
  expectedGrade: string
  durationS: number
  vendor: string
  custom?: boolean
}

export interface Finding {
  id: string
  title: string
  severity: Severity
  category: string
  description: string
  impact: string
  evidence: { text: string; packets: number[] }
  recommendation: string
  references: string[]
  config_fix: string | null
}

export interface IdentifiedField {
  key: string
  label: string
  value: string
  confidence: number
  method: Method
  evidence: number[]
  explanation: string
  ground_truth_match: boolean | null
}

export interface IkeExchange {
  index: number
  ts: number
  version: 1 | 2
  exchange: string
  direction: 'i→r' | 'r→i'
  msg_id: number
  size: number
  payloads: string[]
  encrypted: boolean
  note: string
  rekey?: boolean
}

export interface Proposal {
  number: number
  protocol: string
  transforms: { type: string; name: string; key_length?: number }[]
  selected: boolean
  strength: 'strong' | 'acceptable' | 'weak' | 'critical'
}

export interface SecurityAssociation {
  spi_hex: string
  src: string
  dst: string
  protocol: string
  packets: number
  bytes: number
  first_seen: number
  last_seen: number
  seq_min: number
  seq_max: number
  gaps: number
  duplicates: number
  out_of_order: number
  inferred_lifetime_s: number
}

export interface RibbonSegment {
  name: string
  bytes: number
  kind: 'outer_ip' | 'udp' | 'esp_hdr' | 'iv' | 'inner_ip' | 'payload' | 'trailer' | 'icv' | 'ah_hdr'
  label: string
  detail: string
}

export interface Category { name: string; weight: number; score: number }

export interface ComplianceResult {
  profile: string
  name: string
  status: 'compliant' | 'partially compliant' | 'non-compliant'
  pass_rate: number
  checks: { name: string; passed: boolean; detail: string }[]
}

export interface Threat {
  id: string
  name: string
  likelihood: number
  impact: number
  risk: number
  level: 'low' | 'medium' | 'high' | 'critical'
  mitre: string[]
  related_findings: string[]
  description: string
}

export interface TrafficWindow {
  t_start: number
  t_end: number
  sa_spi_hex: string
  label: TrafficClass
  confidence: number
  probs: Record<string, number>
  top_features: { feature: string; value: string; contribution: number }[]
}

export interface MetadataItem { item: string; exposed_value: string; sensitivity: 'low' | 'medium' | 'high'; how_observed: string }
export interface TimelineBin { t: number; ike: number; esp: number; ah: number; other: number; bytes: number }

export interface PacketRec {
  index: number
  ts: number
  src: string
  dst: string
  proto: 'IKE' | 'ESP' | 'AH' | 'Other'
  length: number
  info: string
}

export interface Analysis {
  id: string
  scenario: Scenario
  capture_name: string
  created_at: string
  duration_s: number
  packet_count: number
  size_bytes: number
  counts: { ike: number; esp: number; ah: number; other: number }
  summary: {
    score: number
    grade: Grade
    risk_level: string
    risk_score: number
    ai_confidence: number
    headline: string
    verdict: string
    counts: Record<Severity, number>
  }
  identification: IdentifiedField[]
  ike_exchanges: IkeExchange[]
  proposals_offered: Proposal[]
  security_associations: SecurityAssociation[]
  representative_packet: { segments: RibbonSegment[] }
  assessment: { categories: Category[]; findings: Finding[] }
  compliance: ComplianceResult[]
  threats: Threat[]
  traffic: {
    distribution: { label: TrafficClass; pct_time: number; pct_bytes: number }[]
    windows: TrafficWindow[]
  }
  metadata_exposure: MetadataItem[]
  timeline: TimelineBin[]
  packets: PacketRec[]
  ground_truth: Record<string, string>
  build_info: { encryption_mode: 'real' | 'length-exact' }
  narrative: string[]
}
