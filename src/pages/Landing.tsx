import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import '@fontsource/doto/900.css'
import { useAuth } from '../lib/auth'
import { ANALYSES } from '../data/analyses'
import { encName } from '../data/engine'
import BarField, { Bars } from '../components/BarField'
import DecryptedText from '../components/DecryptedText'

/* The TunnelScope mark (shield, crossing line, dot) drawn as a 1px-weight monochrome stroke for this world. */
function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">
      <path d="M32 6 10 16v15c0 14 9.5 22.5 22 27 12.5-4.5 22-13 22-27V16z" />
      <path d="M19 32h26" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

const S06 = ANALYSES.find((x) => x.id === 'S06')!
const S01 = ANALYSES.find((x) => x.id === 'S01')!
const ikeLabel = (x: typeof S06) => (x.scenario.ikeVersion === 1 ? `IKEv1 ${x.scenario.exchange} mode` : 'IKEv2')
const METHOD_WORD: Record<string, string> = { cleartext: 'handshake', 'side-channel': 'packet sizes', ml: 'classifier', heuristic: 'estimate' }

/* Hairline or filled button with barcode end-caps. */
function Cta({ children, to, onClick, filled, inverted, pressed }: { children: ReactNode; to?: string; onClick?: () => void; filled?: boolean; inverted?: boolean; pressed?: boolean }) {
  const cls = clsx(
    'inline-flex h-12 items-center gap-4 border px-5 text-[13px] font-medium tracking-[0.08em] transition-colors',
    inverted
      ? filled ? 'border-black bg-black text-white hover:bg-white hover:text-black' : 'border-black text-black hover:bg-black hover:text-white'
      : filled ? 'border-white bg-white text-black hover:bg-black hover:text-white' : 'border-white text-white hover:bg-white hover:text-black',
  )
  const inner = (<><Bars seed={3} n={5} h={14} /><span className="whitespace-nowrap">{children}</span><Bars seed={5} n={5} h={14} /></>)
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} aria-pressed={pressed} className={cls}>{inner}</button>
}

function Header() {
  const { user } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b border-white bg-black">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
        <Link to="/welcome" className="flex items-center gap-3 text-white" aria-label="TunnelScope home">
          <Mark />
          <span className="text-[17px] font-medium tracking-[0.12em]">TUNNELSCOPE</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px] tracking-[0.08em] text-white" aria-label="Sections">
          <a href="#how" className="hidden px-3 py-2 hover:bg-white hover:text-black sm:block">How it works</a>
          <a href="#proof" className="hidden px-3 py-2 hover:bg-white hover:text-black sm:block">Proof</a>
          <Link to={user ? '/' : '/login'} className="ml-2 border border-white px-4 py-2 hover:bg-white hover:text-black">{user ? 'Open dashboard' : 'Sign in'}</Link>
        </nav>
      </div>
    </header>
  )
}

/* First viewport: the offer on the left, the encrypted capture and its verdict on the right. */
function Hero() {
  const [verdict, setVerdict] = useState(false)
  const reduce = useReducedMotion()
  const a = S06
  const field = (k: string) => a.identification.find((f) => f.key === k)
  const rows: [string, string, string][] = [
    ['IKE version', ikeLabel(a), field('ike_version')?.method ?? 'cleartext'],
    ['Encryption', encName(a.scenario), field('esp_cipher_family')?.method ?? 'side-channel'],
    ['Key exchange', `DH group ${a.scenario.dh}`, field('dh_group')?.method ?? 'cleartext'],
    ['Forward secrecy', a.scenario.pfs ? 'On' : 'Off', field('pfs')?.method ?? 'side-channel'],
  ]
  return (
    <section className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 px-5 pb-20 pt-12 md:px-8 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-2 lg:gap-16">
      <div className="min-w-0">
        <h1 className="f-dot text-[clamp(44px,5.6vw,80px)] font-black uppercase leading-[0.95] text-white">Read the tunnel without opening it</h1>
        <p className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-white">
          TunnelScope checks how safe an IPsec VPN is just by watching its encrypted traffic. No keys, no decryption.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Cta to="/login" filled>Analyze a capture</Cta>
          <Cta onClick={() => setVerdict((v) => !v)} pressed={verdict} filled={verdict}>{verdict ? 'Show the traffic' : 'See the verdict'}</Cta>
        </div>
      </div>

      <figure className="min-w-0">
        <div className={clsx('border border-white transition-colors duration-500', verdict ? 'bg-white text-black' : 'bg-black text-white')}>
          <div className={clsx('flex items-center justify-between border-b px-4 py-3 text-[13px]', verdict ? 'border-black' : 'border-white')}>
            <span>{a.scenario.name}</span>
            <span className="font-medium">{verdict ? 'TunnelScope verdict' : 'Encrypted traffic'}</span>
          </div>
          {!verdict ? (
            <BarField analysis={a} height={300} label={`Barcode of ${a.counts.esp} encrypted packets from ${a.scenario.name}. Bar width is packet size.`} />
          ) : (
            <div className="flex min-h-[300px] flex-col justify-center gap-5 pb-6" aria-live="polite">
              <BarField analysis={a} height={48} sine={false} inverted label="The same encrypted packets, now read" />
              <div className="flex flex-col gap-5 px-6">
              <div className="flex items-end gap-4">
                <span className="f-dot text-[88px] font-black leading-[0.8]">{a.summary.grade}</span>
                <span className="pb-1 text-[17px]">{a.summary.score} / 100<br />{a.summary.verdict}</span>
              </div>
              <dl className="grid gap-2 text-[17px]">
                {rows.map(([k, v, m], i) => (
                  <div key={k} className="grid grid-cols-[120px_1fr_auto] gap-3 border-b border-black pb-2 sm:grid-cols-[150px_1fr_auto]">
                    <dt>{k}</dt>
                    <dd className="font-semibold">{reduce ? v : <DecryptedText text={v} animateOn="view" sequential speed={30 + i * 6} characters="0123456789ABCDEF" />}</dd>
                    <dd className="text-right text-[13px]">from {METHOD_WORD[m]}</dd>
                  </div>
                ))}
              </dl>
              </div>
            </div>
          )}
        </div>
        <figcaption className="mt-3 text-[13px] leading-relaxed text-white">
          {verdict ? 'Built-in demo scenario S06. Every field is inferred from what an observer can see.' : `Built-in demo scenario S06: ${a.counts.esp.toLocaleString('en-US')} encrypted packets, as an eavesdropper sees them. Bar width is packet size.`}
        </figcaption>
      </figure>
    </section>
  )
}

function How() {
  const steps = [
    ['Upload a capture', 'Drop in a .pcap file, or pick one of 11 ready-made scenarios.'],
    ['TunnelScope reads it', 'It reads the unencrypted handshake, measures packet sizes and timing, and classifies the traffic.'],
    ['Get the verdict', 'A grade from A to F, the risks in plain language, and the exact config change to fix each one.'],
  ]
  return (
    <section id="how" className="scroll-mt-16 border-t border-white">
      <div className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
        <h2 className="f-dot text-[clamp(34px,4vw,56px)] font-black uppercase leading-none text-white">How it works</h2>
        <ol className="mt-14 grid border-t border-white md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <motion.li key={t} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay: i * 0.12 }}
              className={clsx('py-8 text-white md:px-8', i > 0 && 'border-t border-white md:border-l md:border-t-0', i === 0 && 'md:pl-0')}>
              <div className="flex h-[64px] items-stretch border border-white" aria-hidden>
                {i === 0 && <BarField analysis={S06} height={62} sine={false} drift={false} label="" />}
                {i === 1 && <BarField analysis={S06} t={38} height={62} sine={false} drift={false} markIke label="" />}
                {i === 2 && <div className="flex w-full items-center justify-between bg-white px-4 text-black"><span className="text-[13px]">{S06.summary.score} / 100</span><span className="f-dot text-[56px] font-black leading-none">{S06.summary.grade}</span></div>}
              </div>
              <h3 className="mt-6 text-[20px] font-semibold"><span className="mr-2">{i + 1}.</span>{t}</h3>
              <p className="mt-2 max-w-[34ch] text-[17px] leading-relaxed text-white">{d}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* The one full-frame inversion on the page: before and after hardening. */
function Proof() {
  const rows: [string, string, string][] = [
    ['IKE version', ikeLabel(S06), ikeLabel(S01)],
    ['Encryption', encName(S06.scenario), encName(S01.scenario)],
    ['Key exchange', `DH group ${S06.scenario.dh}`, `DH group ${S01.scenario.dh}`],
    ['Forward secrecy', S06.scenario.pfs ? 'On' : 'Off', S01.scenario.pfs ? 'On' : 'Off'],
  ]
  return (
    <section id="proof" className="scroll-mt-16 bg-white text-black">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 px-5 py-24 md:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 aria-label={`Score ${S06.summary.score} to ${S01.summary.score}`} className="f-dot flex items-baseline gap-5 text-[clamp(84px,10vw,160px)] font-black leading-[0.85]">
            <span>{S06.summary.score}</span><span className="text-[0.38em]">TO</span><span>{S01.summary.score}</span>
          </h2>
          <p className="mt-6 max-w-[40ch] text-[17px] leading-relaxed">
            A misconfigured branch office scores {S06.summary.grade}. A hardened gateway running the settings TunnelScope recommends scores {S01.summary.grade}. Both are built-in demo scenarios.
          </p>
          <div className="mt-8"><Cta to="/login" filled inverted>Analyze a capture</Cta></div>
        </div>
        <table className="w-full text-left text-[17px]">
          <thead>
            <tr className="grid grid-cols-2 gap-4 border-b border-black text-[13px] sm:table-row"><th className="hidden py-3 font-normal sm:table-cell" scope="col"><span className="sr-only">Setting</span></th><th className="py-3 font-normal sm:pr-4" scope="col">Branch office (S06)</th><th className="py-3 font-normal" scope="col">Hardened (S01)</th></tr>
          </thead>
          <tbody>
            {rows.map(([k, x, y]) => (
              <tr key={k} className="grid grid-cols-2 gap-x-4 border-b border-black sm:table-row">
                <th scope="row" className="col-span-2 pt-4 text-[13px] font-normal sm:table-cell sm:py-4 sm:pr-4 sm:text-[17px]">{k}</th>
                <td className="pb-4 pt-1 line-through decoration-1 sm:py-4 sm:pr-4">{x}</td>
                <td className="whitespace-nowrap pb-4 pt-1 font-semibold sm:py-4">{y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white bg-black text-white">
      <BarField analysis={ANALYSES.find((x) => x.id === 'S11')!} height={64} sine={false} label="Packet barcode of a mixed enterprise capture" />
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[13px] md:px-8">
        <span className="flex items-center gap-3"><Mark size={22} />TUNNELSCOPE</span>
        <span className="text-white">Runs offline. No traffic is ever decrypted.</span>
      </div>
    </footer>
  )
}

export default function Landing() {
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = prev }
  }, [])
  return (
    <div className="landing-field min-h-screen bg-black font-mono text-white">
      <Header />
      <main>
        <Hero />
        <How />
        <Proof />
      </main>
      <Footer />
    </div>
  )
}
