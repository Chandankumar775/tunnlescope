import { Chip, Glass, PageHead, SectionTitle } from '../components/ui'
import { ANALYSES } from '../data/analyses'
import { REFS } from '../data/constants'

const Block = ({ children }: { children: string }) => (
  <pre className="solid-card mono overflow-x-auto rounded-2xl p-4 text-[13px] leading-6">{children}</pre>
)
const P = ({ children }: { children: React.ReactNode }) => <p className="max-w-[72ch] text-[15px]">{children}</p>

export default function Methodology() {
  const s06 = ANALYSES.find((a) => a.id === 'S06')!
  return (
    <div>
      <PageHead title="Methodology" sub="What is observable on the wire, what is inferred, and how confident we are. Honesty about method is part of the product." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Glass className="space-y-3 p-6 xl:col-span-2">
          <SectionTitle>Observable versus inferred</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-ike/10 p-4"><Chip tone="ike">Cleartext · ≈ 99%</Chip><P>The first IKE messages are unencrypted. Proposals, the selected cipher, PRF, DH group, vendor IDs, NAT detection, and IKEv1 authentication method and lifetimes are read directly.</P></div>
            <div className="rounded-2xl bg-esp/10 p-4"><Chip tone="esp">Side-channel · 75–95%</Chip><P>ESP packet lengths reveal block size, IV and ICV length. Rekey message sizes reveal whether a fresh key exchange (PFS) happened.</P></div>
            <div className="rounded-2xl bg-ah/10 p-4"><Chip tone="ah">ML and heuristics · model confidence</Chip><P>Size and timing patterns reveal the kind of traffic inside the tunnel and whether it runs in tunnel or transport mode.</P></div>
          </div>
        </Glass>

        <Glass className="space-y-3 p-6">
          <SectionTitle>ESP cipher family from packet length</SectionTitle>
          <P>For each ESP packet let L be the ESP length from SPI to ICV. A hypothesis is consistent when the remaining ciphertext is aligned. The tightest hypothesis that fits 100% of at least 30 packets wins.</P>
          <Block>{`AES-CBC, ICV k  : (L − 8 − 16 − k) mod 16 = 0   k ∈ {12,16,24,32}
3DES-CBC, ICV k: (L − 8 −  8 − k) mod  8 = 0
AES-GCM-16     : (L − 8 −  8 − 16) mod 4 = 0, residues mod 16 spread
NULL           : bytes after the 8-byte header parse as inner IP`}</Block>
          <P>CBC with ICV 16 and ICV 32 share residues. The IKE integrity transform breaks the tie and confidence drops to about 0.75. AES key size is not observable from ESP; it comes from the IKE SA as a prior and is marked heuristic.</P>
        </Glass>

        <Glass className="space-y-3 p-6">
          <SectionTitle>Perfect forward secrecy</SectionTitle>
          <P>CREATE_CHILD_SA is encrypted, but a KE payload adds the DH public value length plus an 8-byte payload header. If the rekey request is larger than the no-KE baseline by that amount (±16 B), PFS is likely enabled.</P>
          <Block>{`baseline ≈ SA + Nonce + TS  = 252 B
ECP-384 KE = 96 + 8         → expect ≈ 356 B
MODP-2048 KE = 256 + 8      → expect ≈ 516 B`}</Block>
          <P>If no rekey is captured, PFS is reported as undetermined. Forward secrecy can't be determined from this capture because no rekey happened; capture for longer than the child SA lifetime.</P>
        </Glass>

        <Glass className="space-y-3 p-6">
          <SectionTitle>Tunnel versus transport and traffic type</SectionTitle>
          <P>Tunnel mode adds an inner IP header (20 B for IPv4, 40 B for IPv6) inside the ciphertext. Features include the estimated plaintext length, its floor across the capture and how it compares with known minimums (ICMP echo 64 B, VoIP RTP ≈ 172 B, TCP ACK 40–60 B).</P>
          <P>A random forest (300 trees) classifies seven traffic classes from 25 flow features per 5-second window. A gradient-boosting model decides tunnel versus transport. Cipher family stays rule-based.</P>
        </Glass>

        <Glass className="space-y-3 p-6">
          <SectionTitle>Scoring</SectionTitle>
          <Block>{`category score = 100 − Σ penalties   (critical 100, high 50, medium 25, low 10)
overall        = Σ weight × category / 100
any critical   → overall = min(overall, 40)
grade: A ≥ 90 · B ≥ 80 · C ≥ 70 · D ≥ 55 · E ≥ 40 · F < 40
risk score = 100 − overall
AI confidence = weighted mean of field confidences`}</Block>
          <P>Worked example, {s06.id}: {s06.assessment.categories.map((c) => `${c.name.split(' ')[0].toLowerCase()} ${c.score}`).join(' · ')} → <b>{s06.summary.score} / 100, grade {s06.summary.grade}</b>.</P>
        </Glass>

        <Glass className="space-y-3 p-6">
          <SectionTitle>Threat model</SectionTitle>
          <P>The adversary is a passive observer who can record the link, and optionally an active attacker who can modify handshakes. We score ten threats by likelihood × impact (1–25), mapped to MITRE ATT&CK where applicable: T1040 network sniffing, T1110 brute force, T1557 adversary-in-the-middle, T1595 active scanning.</P>
        </Glass>

        <Glass className="space-y-3 p-6">
          <SectionTitle>Limitations and future work</SectionTitle>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
            <li>No decryption: everything about encrypted content is inferred and shown with a confidence.</li>
            <li>Traffic models are trained on profile-based synthetic data; real-lab validation is next.</li>
            <li>IKEv2 child-SA algorithms are inferred, not read.</li>
            <li>Roadmap: large real strongSwan dataset, sequence models, optional decryption with supplied keys, post-quantum hybrid key exchange checks (RFC 9370), fleet monitoring.</li>
          </ul>
        </Glass>

        <Glass className="space-y-2 p-6 xl:col-span-2">
          <SectionTitle>References</SectionTitle>
          <ul className="grid gap-x-8 gap-y-1 text-[14px] md:grid-cols-2">
            {Object.values(REFS).map((r) => <li key={r}>{r}</li>)}
            <li>RFC 3947 — Negotiation of NAT-Traversal in the IKE</li>
            <li>RFC 7383 — IKEv2 Message Fragmentation</li>
            <li>MITRE ATT&CK — T1040, T1110, T1557, T1595</li>
          </ul>
        </Glass>
      </div>
    </div>
  )
}
