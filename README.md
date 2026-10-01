# TunnelScope

AI-driven IPsec VPN protocol analysis, built for Smart India Hackathon. TunnelScope reads encrypted IPsec traffic and reports what was negotiated, how secure it is, what a passive observer still learns, and exactly how to fix it, without decrypting anything.

This repository is a fully working front-end MVP. All 11 demo scenarios, the scoring engine, compliance checks, threat matrix and reports run in the browser with no backend.

## Features

- **Landing page** (`/welcome`): a barcode of a real capture that inverts into TunnelScope's verdict.
- **Overview**: a posture ledger of 11 IPsec deployments graded A to F.
- **Analysis**: packet dissection ribbon, protocol identification with method and confidence, security assessment, threat matrix, metadata exposure, SAs and packets with a hex view.
- **Fix simulator**: toggle recommended fixes, watch the score and grade recompute live, and copy the strongSwan config diff.
- **Fleet map**: every tunnel on one network map, with a fleet-wide "all fixes applied" preview.
- **Ask TunnelScope**: offline Q&A about the current capture, assembled from the analysis data (no AI service is called).
- **Demo tour**: an 8-step guided walkthrough for judges (top bar, or Ctrl K → "Start demo tour").
- **Live monitor, Testbed** (strongSwan config generator and zip bundle), **Model lab, Compare, Reports** (executive and technical, print to PDF), **Findings explorer, Settings**.

## Problem statement coverage

| Requirement | Where it lives |
|---|---|
| VPN testbed (tunnel/transport, AES-128/256, GCM, CBC+HMAC, DH groups, PFS, IPv4/IPv6) | Testbed page, 11 scenarios in `src/data/scenarios.ts` |
| Traffic capture (IKE, ESP, AH, normal traffic) | Captures page, `.pcap` export per scenario, Live monitor |
| AI protocol identification | Analysis → Protocol identification, Model lab |
| Security assessment (crypto, compliance, SA params, lifetimes, replay, PFS, metadata) | `src/data/engine.ts`, Analysis → Security assessment |
| Score, executive and technical reports, risk score, threat matrix, AI confidence | Analysis page, Reports page |

## Run locally

Requires Node 18.18 or newer.

```bash
npm install
npm run dev
```

The app opens at http://localhost:5173. Signed-out visitors land on `/welcome`. Use **Sign in → Create an account** or **Continue with Google**. Without Firebase keys these create a local demo account stored in your browser.

## Deploy to Vercel

The repo is ready to deploy as-is; `vercel.json` sets the Vite framework, the build command and the SPA rewrites.

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected settings (Framework: Vite, Build: `npm run build`, Output: `dist`) and press **Deploy**.

No environment variables are required. To switch from demo sign-in to real Firebase Authentication, add these four variables in Vercel → Settings → Environment Variables, then redeploy:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

Also add your Vercel domain under Firebase → Authentication → Settings → Authorized domains.

## Tech stack

React 18, TypeScript (strict), Vite 5, Tailwind CSS 3.4, Recharts, Framer Motion, Zustand, React Router 6, Firebase Auth (optional), React Bits components via the shadcn registry. Fonts are bundled locally, so the app works offline.

## Project layout

```
src/
  pages/        route screens (Landing, Overview, Analysis, FixSimulator, Fleet, ...)
  components/   shared UI, PacketRibbon, BarField, ScoreDial, Tour, AskPanel
  data/         scenarios, scoring engine, fixes, models, analysis builder
  lib/          types, store, auth, reports, pcap export, offline Q&A
requirements/   original build specification and pitch deck source
PRODUCT.md      product truth; DESIGN.md: landing page design system
```

## Honest limits

Analysis data is generated deterministically from the 11 scenario definitions. Uploaded pcaps are mapped to a scenario rather than parsed byte by byte, and the live monitor replays scenarios. The traffic classifier metrics come from a synthetic dataset.
