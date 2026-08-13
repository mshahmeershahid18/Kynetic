'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'

import { signOut } from '@/app/auth/actions'
import { ProfileAvatar } from '@/components/profile/profile-avatar'

type Props = {
  name: string | null
  email: string | null
  photoUrl: string | null
}

/**
 * Account menu triggered by the profile photo.
 *
 * Closes on outside click, on Escape, and on navigation — a menu that survives
 * a route change is the classic way these end up stuck open on top of the next
 * page.
 */
export function UserMenu({ name, email, photoUrl }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring flex items-center rounded-full ring-offset-2 ring-offset-background transition hover:opacity-85"
      >
        <span className="sr-only">Account menu</span>
        <ProfileAvatar src={photoUrl} name={name} email={email} size="md" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <ProfileAvatar src={photoUrl} name={name} email={email} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name ?? 'Your account'}</p>
              {email ? (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              ) : null}
            </div>
          </div>

          <div className="p-1.5">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-muted"
            >
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
