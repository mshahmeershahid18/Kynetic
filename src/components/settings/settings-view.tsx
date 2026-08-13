'use client'

import { useState } from 'react'
import { Dumbbell, ShieldAlert, Ruler, User, Lock } from 'lucide-react'

import { AccountPanel } from '@/components/settings/account-panel'
import { BodyPanel } from '@/components/settings/body-panel'
import { DangerPanel } from '@/components/settings/danger-panel'
import { ProfilePanel } from '@/components/settings/profile-panel'
import { TrainingPanel } from '@/components/settings/training-panel'
import type { FitnessProfile } from '@/lib/profiles/types'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'body', label: 'Body metrics', icon: Ruler },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'account', label: 'Account & security', icon: Lock },
  { id: 'danger', label: 'Danger zone', icon: ShieldAlert },
] as const

type TabId = (typeof TABS)[number]['id']

type Props = {
  profile: FitnessProfile | null
  email: string | null
  hasPassword: boolean
  providers: string[]
}

export function SettingsView({ profile, email, hasPassword, providers }: Props) {
  const [tab, setTab] = useState<TabId>('profile')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
      {/* Section nav: a sidebar on desktop, a scrollable row on small screens. */}
      <nav
        aria-label="Settings sections"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:h-fit lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          const danger = id === 'danger'

          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`focus-ring inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition lg:w-full ${
                active
                  ? danger
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary'
                  : `text-muted-foreground hover:bg-muted hover:text-foreground ${
                      danger ? 'hover:text-destructive' : ''
                    }`
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="min-w-0">
        {tab === 'profile' ? <ProfilePanel profile={profile} /> : null}
        {tab === 'body' ? <BodyPanel profile={profile} /> : null}
        {tab === 'training' ? <TrainingPanel profile={profile} /> : null}
        {tab === 'account' ? (
          <AccountPanel email={email} hasPassword={hasPassword} providers={providers} />
        ) : null}
        {tab === 'danger' ? <DangerPanel /> : null}
      </div>
    </div>
  )
}
