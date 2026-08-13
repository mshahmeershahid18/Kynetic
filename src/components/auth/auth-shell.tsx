import Link from 'next/link'
import type { ReactNode } from 'react'
import { Activity, Camera, Sparkles } from 'lucide-react'

import { Wordmark } from '@/components/brand/wordmark'
import { Reveal } from '@/components/motion/reveal'

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: 'Workouts built for you',
    body: 'Gemini programs each session from your goal, equipment, limitations, and how your last workouts actually went.',
  },
  {
    icon: Camera,
    title: 'Real-time form coaching',
    body: 'Your camera counts reps and calls out technique for squats, push-ups, lunges, and bridges — all on your device.',
  },
  {
    icon: Activity,
    title: 'Progress you can see',
    body: 'A 3D avatar that reshapes as your body composition and training level change.',
  },
]

/**
 * Shared two-column frame for the auth screens: the form on the left, and a
 * consistent product summary on the right that collapses away on mobile.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Form ------------------------------------------------------------- */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <Reveal className="w-full max-w-sm">
          <div data-animate>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="mt-7 space-y-5" data-animate>
            {children}
          </div>

          {footer ? (
            <div className="mt-6 text-sm text-muted-foreground" data-animate>
              {footer}
            </div>
          ) : null}
        </Reveal>
      </div>

      <aside className="relative hidden lg:flex lg:items-center lg:justify-center lg:px-12 border-l border-border overflow-hidden">
        <img 
          src="/low-angle-view-unrecognizable-muscular-build-man-preparing-lifting-barbell-health-club.jpg"
          alt="Muscular build man preparing lifting barbell"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
        
        <div className="relative z-10 max-w-md text-white">
          <Link href="/" className="focus-ring inline-flex rounded-md text-white">
            <Wordmark size="md" className="text-white" />
          </Link>
          <p className="mt-6 font-display text-xl font-semibold leading-snug tracking-tight">
            An AI coach that actually watches you train.
          </p>

          <ul className="mt-8 space-y-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-black/40">
                  <item.icon className="h-4 w-4 text-white/80" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/60">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}

/** Shared field styling so all three auth forms stay identical. */
export function AuthField({
  label,
  name,
  type = 'text',
  autoComplete,
  minLength,
  placeholder,
  action,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  minLength?: number
  placeholder?: string
  action?: ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {action}
      </span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  )
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
