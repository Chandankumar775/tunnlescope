---
marp: true
size: 16:9
paginate: true
title: TunnelScope — AI-driven IPsec VPN analysis
description: Smart India Hackathon pitch deck
style: |
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,300..800&family=JetBrains+Mono:wght@400;600&display=swap');
  :root {
    --ink: #0F1B2D; --panel: #162740; --rule: #2A3F5C;
    --paper: #E7EDF4; --muted: #93A4BA;
    --esp: #4CC9F0; --ike: #F4A261; --ah: #B79CED;
    --pass: #5BD19A; --med: #F2C14E; --high: #EF7B45; --crit: #E5484D;
  }
  section {
    background: var(--ink); color: var(--paper);
    font-family: 'Archivo', system-ui, sans-serif; font-size: 26px;
    line-height: 1.45; padding: 56px 72px;
  }
  h1, h2 { font-stretch: 112%; font-weight: 650; color: var(--paper); letter-spacing: -0.01em; }
  h1 { font-size: 56px; margin-bottom: 0.2em; }
  h2 { font-size: 40px; border-bottom: 1px solid var(--rule); padding-bottom: 12px; }
  h3 { color: var(--esp); font-weight: 600; font-size: 28px; }
  strong { color: var(--esp); font-weight: 600; }
  em { color: var(--ike); font-style: normal; }
  code, pre { font-family: 'JetBrains Mono', monospace; }
  code { background: var(--panel); color: var(--esp); padding: 1px 6px; border-radius: 4px; font-size: 0.85em; }
  pre { background: var(--panel); border: 1px solid var(--rule); border-radius: 10px; padding: 18px; font-size: 18px; line-height: 1.4; }
  pre code { background: none; color: var(--paper); padding: 0; }
  table { border-collapse: collapse; font-size: 21px; width: 100%; }
  th { background: var(--panel); color: var(--muted); font-weight: 500; text-align: left; }
  th, td { border-bottom: 1px solid var(--rule); padding: 8px 12px; }
  blockquote { border-left: 4px solid var(--esp); color: var(--paper); margin: 0; padding: 4px 20px; font-size: 30px; }
  section::after { color: var(--muted); font-size: 16px; }
  footer { color: var(--muted); font-size: 16px; }
  .muted { color: var(--muted); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; }
  .box { background: var(--panel); border: 1px solid var(--rule); border-radius: 10px; padding: 18px 22px; }
  .big { font-size: 96px; font-stretch: 115%; font-weight: 700; line-height: 1; }
  .esp { color: var(--esp); } .ike { color: var(--ike); } .ah { color: var(--ah); }
  .pass { color: var(--pass); } .med { color: var(--med); } .high { color: var(--high); } .crit { color: var(--crit); }
  section.title { justify-content: center; }
  section.title h1 { font-size: 84px; }
  section.divider { background: var(--panel); justify-content: center; }
  section.divider h2 { border: none; font-size: 54px; }
---

<!--
HOW TO USE THIS DECK
- Render with Marp: VS Code "Marp for VS Code" extension, or `npx @marp-team/marp-cli SLIDES.md --pptx` (also --pdf).
- The Google Fonts import needs internet at render time; once exported to PDF/PPTX the fonts are embedded/flattened.
- Replace every [bracketed] placeholder: PS ID, team name, college, member names, accuracy numbers from the Model lab page, and screenshots.
- SIH idea-submission rounds usually require the official 6-slide PPT template. Mapping:
  Slide 1 (Title) → slide 1 · Slide 2 (Idea / solution) → slides 4–5 · Slide 3 (Technical approach) → slides 6–11, 15
  Slide 4 (Feasibility & viability) → slide 16 · Slide 5 (Impact & benefits) → slide 17 · Slide 6 (Research & references) → slide 19
  Use this deck for the finale / jury demo, and condense into the template for the idea round.
-->

<!-- _class: title -->
<!-- _paginate: false -->

# TunnelScope

### See inside IPsec without breaking it

AI-driven protocol analysis platform for IPsec VPN deployments

<br>

<span class="muted">Smart India Hackathon · Problem statement [PS ID] · Theme [Theme]
Team [Team name] · [College / Institute]</span>

<!--
Speaker: "Good morning. We are team [name]. Our problem statement asks for an AI platform that can look at IPsec VPN traffic and tell an analyst how secure the deployment is, without manual packet inspection. That's TunnelScope."
-->

---

## IPsec protects what matters most

<div class="cols">
<div>

IPsec is the default VPN technology for **government, defence, enterprise and cloud** interconnects.

Its security depends on many choices made by people:

- cipher and integrity algorithm
- key exchange group
- forward secrecy on or off
- IKE version and authentication method
- tunnel or transport mode
- key lifetimes

</div>
<div class="box">

### One weak choice is enough

A tunnel can be "up and encrypted" while still using **3DES**, **DH group 1**, **no forward secrecy** or **Aggressive Mode with a pre-shared key**.

Nothing looks broken. Traffic flows. The weakness stays invisible.

</div>
</div>

<!--
Speaker: Emphasize that misconfiguration is silent. The VPN works, so nobody checks. Auditors need evidence, not assumptions.
-->

---

## Today's tools show packets, not answers

| Tool | What it gives | What's missing |
|---|---|---|
| Wireshark / tcpdump | Every byte of every packet | Needs an expert to interpret; no verdict |
| ike-scan | Actively probes a VPN endpoint | Active, not passive; no traffic or posture analysis |
| Config audits | Reviews of config files | Configs drift; doesn't prove what was actually negotiated |

<br>

> Analysts need a system that reads the traffic itself and says **what was negotiated, how secure it is, what leaks, and what to fix**.

<!--
Speaker: Position against Wireshark politely: it's essential, but it's a microscope, not a diagnosis.
-->

---

## TunnelScope in one line

> Upload or stream IPsec traffic. TunnelScope identifies the configuration, infers what's inside the encrypted tunnel, scores the security posture and writes the reports.

<div class="cols3">
<div class="box">

### Identify
IKE version, cipher, integrity, DH group, mode, PFS, lifetimes, SA characteristics

</div>
<div class="box">

### Assess
22 security checks across 7 categories, 4 compliance profiles, threat matrix

</div>
<div class="box">

### Report
Score, grade, risk score, AI confidence, executive and technical PDFs

</div>
</div>

<!--
Speaker: Three verbs. Keep it simple. Then move to how.
-->

---

## How it works

```
  Testbed / live network / .pcap upload
                 │
                 ▼
  Packet parser ── IKEv1 · IKEv2 · ESP · AH · NAT-T · IPv4/IPv6
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
  Cleartext +          AI engine
  side-channel         traffic classifier · mode classifier
  inference
       └─────────┬──────────┘
                 ▼
  Security assessment ── rules · scoring · compliance · threats · metadata
                 ▼
  Dashboard · live monitor · executive & technical reports
```

<span class="muted">Fully offline. Runs on a single laptop or an air-gapped analyst workstation.</span>

<!--
Speaker: Walk top to bottom in 20 seconds. Stress "offline" for government networks.
-->

---

<!-- _class: divider -->

## How do you analyze traffic you can't decrypt?

---

## Three sources of evidence

<div class="cols3">
<div class="box">

### <span class="ike">Cleartext</span>
The first IKE messages are unencrypted. Proposals, selected cipher, PRF, DH group, vendor IDs and NAT detection are **read directly**.

<span class="muted">Confidence ≈ 99%</span>

</div>
<div class="box">

### <span class="esp">Side-channels</span>
ESP packet lengths reveal **block size, IV and ICV length**. Rekey message sizes reveal whether a **new key exchange** happened (PFS).

<span class="muted">Confidence 75–95%</span>

</div>
<div class="box">

### <span class="ah">Machine learning</span>
Size and timing patterns reveal **what kind of traffic** is inside the tunnel and whether it's **tunnel or transport** mode.

<span class="muted">Confidence = model probability</span>

</div>
</div>

<br>

Every result in TunnelScope shows **which method** produced it, **how confident** it is, and **why**.

<!--
Speaker: This is the key slide for technical judges. The honesty about method and confidence is a feature.
-->

---

## Example: identifying the ESP cipher from length alone

```
ESP packet = SPI(4) + Seq(4) + IV + ciphertext + ICV

AES-CBC + HMAC-SHA256 :  (L − 8 − 16 − 16) mod 16 = 0   for every packet
AES-GCM-16            :  (L − 8 −  8 − 16) mod  4 = 0   residues mod 16 vary
3DES-CBC + MD5-96     :  (L − 8 −  8 − 12) mod  8 = 0
```

<div class="cols">
<div>

Test each hypothesis across hundreds of packets. The one that fits **100% of packets** with the tightest constraint wins.

</div>
<div class="box">

**Forward secrecy:** a rekey message carrying a fresh DH public value is larger by exactly that value's size, e.g. **+104 bytes** for ECP-384.

</div>
</div>

<!--
Speaker: If asked about ambiguity: CBC with 16- and 32-byte ICVs share residues; we break the tie with the IKE proposal and minimum packet size, and the UI shows lower confidence.
-->

---

## AI engine: what's inside the tunnel?

<div class="cols">
<div>

**7 traffic classes**
VoIP · video streaming · web browsing · email · WhatsApp / messaging · ICMP · file transfer

**25 flow features per window**
packet size percentiles, inter-arrival timing, burstiness, direction ratio, periodicity (FFT), plaintext-length floor

**Models**
Random Forest for traffic type · Gradient Boosting for tunnel vs transport · rule engine for cipher family

</div>
<div class="box">

### Held-out test results

<span class="big esp">[94]%</span>
traffic classification accuracy

Macro F1 **[0.93]** · mode accuracy **[0.95]**
Trained on **21,000** labeled windows

<span class="muted">Fill from the Model lab page before presenting.</span>

</div>
</div>

<!--
Speaker: Read actual numbers from the Model lab. Mention we deliberately add noise and mixed-traffic windows so results are realistic, not a suspicious 100%.
-->

---

## Testbed and dataset coverage

| | S01 | S02 | S03 | S04 | S05 | S06 | S07 | S08 | S09 | S10 | S11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IKE | v2 | v2 | v2 | v2 | v1 main | v1 aggr | v2 | v2 | v2 | v2 | v2 |
| Mode | tun | tun | trn | tun | tun | tun | tun | trn | tun | trn | tun |
| IP | v4 | v6 | v4 | v4 | v4 | v4 | v6 | v4 | v4 | v4 | v4 |
| Cipher | GCM-256 | GCM-128 | CBC-256 | CBC-128 | CBC-128 | 3DES | GCM-256 | AH only | CBC-256 | CBC-256 | GCM-256 |
| DH | 20 | 19 | 14 | 14 | 2 | 1 | 5 | 14 | 21 | 14 | 31 |
| PFS | on | on | on | off | off | off | off | on | on | on | on |

<span class="muted">Real strongSwan configs + Docker lab + tcpdump scripts for each scenario, plus an instant synthetic generator. Every scenario is validated against ground truth.</span>

<!--
Speaker: This slide proves every variation in the problem statement is covered: tunnel/transport, AES-128/256, GCM/CBC+HMAC, multiple DH groups, PFS on/off, IPv4/IPv6, all traffic types, plus AH and NAT-T.
-->

---

## Security assessment

<div class="cols">
<div>

| Category | Weight |
|---|---|
| Cryptographic strength | 30 |
| Key exchange & PFS | 20 |
| Authentication | 15 |
| Protocol | 10 |
| SA lifecycle | 10 |
| Replay protection | 10 |
| Metadata exposure | 5 |

</div>
<div>

**22 checks** with stable IDs, evidence and RFC/NIST references

**Compliance profiles**
NIST SP 800-77 Rev. 1 · RFC 8221 / 8247 · CNSA suite · custom organisation policy

**Every finding comes with the exact strongSwan config line to fix it**

```
proposals = aes256gcm16-prfsha384-ecp384
```

</div>
</div>

<!--
Speaker: Any critical finding caps the overall score at 40, so a single fatal flaw can't be averaged away.
-->

---

## Threat matrix and metadata exposure

<div class="cols">
<div class="box">

### Threats scored by likelihood × impact

<span class="crit">Offline PSK cracking</span> · T1110
<span class="crit">Passive decryption via weak DH</span> · T1040
<span class="high">Harvest now, decrypt later</span>
<span class="high">Downgrade via weak proposals</span> · T1557
<span class="med">Replay of captured packets</span>
<span class="med">Traffic analysis</span> · T1040

<span class="muted">10 threats, mapped to MITRE ATT&CK where applicable</span>

</div>
<div>

### What a passive observer still learns

- Who talks to whom, and when
- VPN vendor fingerprint
- Identities, if Aggressive Mode is used
- **That a tunnel carries VoIP or email**, with model confidence, without decrypting a single byte

</div>
</div>

<!--
Speaker: Metadata exposure is often ignored in audits. Encryption hides content, not behavior.
-->

---

## Demo: one misconfigured branch office

<div class="cols">
<div>

**Scenario S06**
IKEv1 Aggressive Mode · PSK · 3DES · MD5 · DH group 1 · 48 h lifetime

<br>

<span class="big crit">F</span>
<span class="muted">Score [22] / 100 · Risk score [78] · AI confidence [86]%</span>

</div>
<div class="box">

[Screenshot: Analysis page with packet ribbon, score dial and findings]

</div>
</div>

<!--
Speaker: Switch to the live demo here. Run the Live monitor on S06 at 10x, then open the full analysis. Show "How we know" on the ESP cipher field, the threat matrix, and the metadata exposure tab.
-->

---

## Before and after hardening

<div class="cols">
<div class="box">

### <span class="crit">Before · S06 · grade F</span>
IKEv1 Aggressive · PSK
3DES + MD5
DH group 1
No forward secrecy
48 h child SA lifetime

</div>
<div class="box">

### <span class="pass">After · S01 · grade A</span>
IKEv2 · certificates
AES-256-GCM
ECP-384
Forward secrecy on
1 h child SA lifetime

</div>
</div>

<br>

Compare view shows every changed field and **[+74]** points after applying TunnelScope's recommendations.

<!--
Speaker: This is the "so what" — TunnelScope doesn't just grade, it tells you how to get to an A.
-->

---

## Reports for two audiences

<div class="cols">
<div class="box">

### Executive report · 2 pages
Is this VPN safe? How bad is it? What first? Are we compliant? How sure is the analysis?

[Thumbnail: executive PDF]

</div>
<div class="box">

### Technical report · 6–15 pages
Identified configuration with confidence, IKE exchange table, SA table, every finding with packet evidence, references and config fixes, threat matrix, traffic inference, model card

[Thumbnail: technical PDF]

</div>
</div>

<span class="muted">Also exported as HTML and JSON for integration with other tools.</span>

---

## Technology

<div class="cols">
<div>

### Backend
Python · FastAPI · Scapy · scikit-learn · NumPy / pandas · ReportLab · SQLite · WebSockets

### Lab
strongSwan · Docker Compose · tcpdump · iperf3

</div>
<div>

### Frontend
React · TypeScript · Tailwind · Recharts · TanStack Query

### Deployment
Single machine, no cloud, no API keys, no internet required. Suitable for air-gapped environments.

</div>
</div>

---

## Feasibility and viability

| Risk | How we handle it |
|---|---|
| Encrypted IKE_AUTH and child-SA proposals | Side-channels with explicit confidence; never presented as certainty |
| Synthetic training data | Real strongSwan lab + capture scripts to grow a real dataset; ground-truth validation per scenario |
| Large captures | Streaming parser, capped analysis, per-SA windowing |
| Vendor diversity | Vendor ID fingerprint table; RFC-standard parsing |
| Deployment on secure networks | Offline, single-binary-style setup, no data leaves the machine |

<span class="muted">Built and running today: parser, inference, AI engine, assessment, dashboard, live monitor, reports, testbed generator.</span>

---

## Impact

<div class="cols3">
<div class="box">

### Faster audits
A capture becomes a scored, referenced report in seconds instead of hours of manual inspection.

</div>
<div class="box">

### Fewer silent weaknesses
Weak ciphers, missing PFS, Aggressive Mode and downgrade exposure are flagged automatically.

</div>
<div class="box">

### Accessible expertise
Junior analysts get expert-level explanations; managers get a clear risk verdict.

</div>
</div>

<br>

**Who benefits:** government and defence network teams, CERT-style incident responders, PSUs, banks, telecom operators, cloud and enterprise security teams.

---

## Honest limits and roadmap

<div class="cols">
<div>

### Today
- No decryption; inference only, with confidence
- Traffic models trained on profile-based data
- Child-SA algorithms inferred, not read, in IKEv2

</div>
<div>

### Next
- Large real-world dataset from the strongSwan lab and partner networks
- Sequence models over packet series
- Optional decryption with supplied keys for validation
- Post-quantum readiness checks (hybrid key exchange, RFC 9370)
- Fleet monitoring across many gateways

</div>
</div>

<!--
Speaker: Judges respect honesty. Saying clearly what is inferred vs proven builds trust.
-->

---

## References

- RFC 7296 — Internet Key Exchange Protocol Version 2 (IKEv2)
- RFC 4301 / 4302 / 4303 — IPsec architecture, AH, ESP
- RFC 3947 / 3948 — NAT traversal negotiation and UDP encapsulation
- RFC 7383 — IKEv2 message fragmentation
- RFC 8221 — ESP and AH cryptographic algorithm requirements
- RFC 8247 — IKEv2 algorithm implementation requirements
- RFC 9370 — Multiple key exchanges in IKEv2
- NIST SP 800-77 Rev. 1 — Guide to IPsec VPNs
- MITRE ATT&CK — T1040, T1110, T1557, T1595

---

<!-- _class: title -->
<!-- _paginate: false -->

# Thank you

### TunnelScope · see inside IPsec without breaking it

<br>

<span class="muted">Team [Team name]
[Member 1] · [Member 2] · [Member 3] · [Member 4] · [Member 5] · [Member 6]
Mentor: [Name]</span>

---

<!-- _class: divider -->

## Backup slides for questions

---

## Q&A: likely questions

| Question | Short answer |
|---|---|
| How can you know the cipher if it's encrypted? | IKE_SA_INIT is cleartext; ESP lengths reveal block size, IV and ICV |
| Isn't IKE_AUTH encrypted? | Yes. We use its size and fragmentation as a side-channel and show lower confidence |
| Is your data real? | Training data is profile-based synthetic; the strongSwan lab produces real captures with the same pipeline |
| Why not deep learning? | Tree models are fast, explainable and accurate enough on flow features; sequence models are on the roadmap |
| How is it different from Wireshark? | Wireshark shows packets. TunnelScope gives conclusions, confidence, scores, compliance and reports |
| Can it run inside a government network? | Yes. Fully offline, single machine, no cloud calls |

---

## Scoring formula

```
category score = 100 − Σ penalties     (critical 100, high 50, medium 25, low 10)
overall        = Σ weight × category / 100
if any critical finding: overall = min(overall, 40)

grade:  A ≥ 90 · B ≥ 80 · C ≥ 70 · D ≥ 55 · E ≥ 40 · F < 40
risk score = 100 − overall
AI confidence = weighted mean of field confidences
```

**S06 worked example:** crypto 0 · key exchange 0 · auth 0 · protocol 50 · lifecycle 50 · replay 100 · metadata 40 → **22 / 100, grade F**