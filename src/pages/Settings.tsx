import { toast } from 'sonner'
import { Btn, Glass, PageHead, SectionTitle, Segmented, Select, Toggle } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { DH } from '../data/constants'
import { firebaseConfigured } from '../lib/firebase'

export default function Settings() {
  const { user, demo } = useAuth()
  const { theme, toggleTheme, org, setOrg, reopenAll, resolved } = useStore()
  return (
    <div>
      <PageHead title="Settings" sub="Your profile, the organisation policy used by the custom compliance profile, and display preferences." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Glass className="p-6">
          <SectionTitle>Profile</SectionTitle>
          <dl className="space-y-3 text-[15px]">
            <div><dt className="label">Name</dt><dd className="font-medium">{user?.name}</dd></div>
            <div><dt className="label">Email</dt><dd className="font-medium">{user?.email}</dd></div>
            <div><dt className="label">Sign-in provider</dt><dd className="font-medium">{firebaseConfigured ? 'Firebase Authentication' : 'Local demo account (this browser only)'}</dd></div>
          </dl>
          {demo && <p className="mt-4 rounded-2xl bg-medium/12 p-3 text-[13.5px]">To use real Firebase sign-in, copy <span className="mono">.env.example</span> to <span className="mono">.env</span>, paste your web app config and restart the dev server.</p>}
        </Glass>

        <Glass className="p-6">
          <SectionTitle>Organisation policy</SectionTitle>
          <p className="mb-4 text-[14px] text-muted">These thresholds drive the “Organisation custom policy” compliance profile on every Analysis page.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4"><span>Minimum DH group</span>
              <Select label="Minimum DH group" value={org.minDh} onChange={(v) => setOrg({ minDh: v })} options={[2, 5, 14, 15, 16, 19, 20, 21, 31].map((g) => ({ id: g, label: `${g} · ${DH[g].name}` }))} /></div>
            <div className="flex items-center justify-between gap-4"><span>Maximum child SA lifetime</span>
              <Select label="Maximum child SA lifetime" value={org.maxChildH} onChange={(v) => setOrg({ maxChildH: v })} options={[1, 4, 8, 12, 24].map((h) => ({ id: h, label: `${h} h` }))} /></div>
            <div className="flex items-center justify-between gap-4"><span>Require perfect forward secrecy</span><Toggle on={org.requirePfs} onChange={(v) => setOrg({ requirePfs: v })} label="Require PFS" /></div>
          </div>
        </Glass>

        <Glass className="p-6">
          <SectionTitle>Display</SectionTitle>
          <div className="flex items-center justify-between"><span>Theme</span><Segmented small value={theme} onChange={() => toggleTheme()} options={[{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} /></div>
          <p className="mt-3 text-[13.5px] text-muted">Press <kbd className="mono rounded bg-panel2 px-1.5 py-0.5 text-[12px]">Ctrl K</kbd> or <kbd className="mono rounded bg-panel2 px-1.5 py-0.5 text-[12px]">/</kbd> anywhere to jump to a page or capture. Motion is reduced automatically when your system asks for it.</p>
        </Glass>

        <Glass className="p-6">
          <SectionTitle>Alerts</SectionTitle>
          <p className="text-[14px] text-muted">{resolved.length} alert{resolved.length === 1 ? '' : 's'} resolved on this device.</p>
          <div className="mt-3"><Btn variant="glass" disabled={!resolved.length} onClick={() => { reopenAll(); toast.success('All alerts reopened') }}>Reopen all alerts</Btn></div>
        </Glass>
      </div>
    </div>
  )
}
