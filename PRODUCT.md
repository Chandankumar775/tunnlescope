# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Smart India Hackathon judges** watching a live demo on a projector or laptop. They need to grasp the idea in seconds and judge whether it is real.
- **Network security analysts and auditors** (government, defence, PSU, bank and telecom IPsec teams) who must assess VPN deployments without manual packet inspection.

Both audiences matter equally (confirmed by the user).

## Product Purpose

TunnelScope reads IPsec VPN traffic (uploaded pcap, live replay, or a built-in scenario) and reports what was negotiated, how secure it is, what a passive observer still learns, and exactly how to fix it. Success: a capture becomes a scored, referenced report in seconds instead of hours of Wireshark work.

## Positioning

It never decrypts. Every conclusion comes from cleartext IKE fields, ESP length side-channels or a traffic classifier, and each identified field carries its method (cleartext, side-channel, ML, heuristic), a confidence and a plain explanation. Wireshark shows packets; ike-scan probes actively; TunnelScope gives a passive verdict with evidence.

## Operating Context

- Analysis runs fully offline on one laptop or an air-gapped analyst desk; no cloud calls or API keys.
- Inputs: `.pcap` / `.pcapng` upload, 11 built-in scenarios (S01 to S11), live replay at 1x/4x/10x, and a testbed that generates strongSwan `swanctl.conf` bundles.
- Outputs: security score and grade (A to F), risk score, AI confidence, threat matrix, compliance (NIST SP 800-77 Rev. 1, RFC 8221/8247, CNSA, custom policy), metadata exposure, executive and technical reports.

## Capabilities and Constraints

- Current build is a hardcoded, fully working React front end; data for the 11 scenarios is generated deterministically in the browser.
- 22 security checks across 7 weighted categories; any critical finding caps the score at 40.
- Traffic classifier: 7 classes, 25 flow features, held-out accuracy 93.4% on synthetic data.
- Sign-in uses Firebase Auth when keys are configured, otherwise a local demo account.

## Brand Commitments

- Name: TunnelScope. Logo mark: shield outline with a crossing line and a dot (`src/components/Layout.tsx`).
- Protocol color meanings are fixed inside the product: IKE amber, ESP cyan, AH violet. Risk colors only ever mean risk.

## Evidence on Hand

- Real computed results for 11 scenarios (for example S06 "Misconfigured branch office" scores 22/F, S01 "Hardened gateway" scores 99/A).
- User-supplied renders in `images/` (blue data-cube chamber, wireframe city, red portal). The folder render carries an Adobe Stock watermark and must not ship.
- No customers, testimonials, deployments or benchmarks exist; never invent them.

## Product Principles

1. Prove, never claim: show the analysis working on real scenario data.
2. Honesty is the differentiator: method and confidence travel with every result.
3. One glance to the verdict, one click to the evidence.
4. Built for disconnected, high-trust environments.
