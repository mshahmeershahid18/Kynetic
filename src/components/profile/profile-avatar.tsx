import { initialsFor } from '@/lib/profiles/photo'

const SIZES = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-20 w-20 text-lg',
} as const

/**
 * Profile photo with an initials fallback.
 *
 * A plain <img> rather than next/image: photos come from Supabase storage and
 * from arbitrary OAuth provider CDNs, so the host is not known ahead of time
 * and cannot be listed in next.config's image domains.
 */
export function ProfileAvatar({
  src,
  name,
  email,
  size = 'md',
  className = '',
}: {
  src?: string | null
  name?: string | null
  email?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const base = `${SIZES[size]} shrink-0 overflow-hidden rounded-full ${className}`

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${base} border border-border object-cover`}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${base} grid place-items-center bg-primary/15 font-semibold uppercase text-primary`}
    >
      {initialsFor(name, email)}
    </span>
  )
}
