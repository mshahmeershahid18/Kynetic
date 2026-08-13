/**
 * Where a user's profile photo comes from, in priority order.
 *
 * 1. A photo they uploaded, stored in the `avatars` bucket.
 * 2. The picture their OAuth provider supplied (Google puts it in user
 *    metadata under `avatar_url` or `picture`, depending on the provider).
 * 3. Their initials.
 */

type MetadataSource = {
  user_metadata?: Record<string, unknown> | null
} | null

export function providerPhotoUrl(user: MetadataSource): string | null {
  const metadata = user?.user_metadata
  if (!metadata) return null

  for (const key of ['avatar_url', 'picture']) {
    const value = metadata[key]
    if (typeof value === 'string' && value.startsWith('http')) return value
  }
  return null
}

export function resolveProfilePhoto(
  avatarUrl: string | null | undefined,
  user: MetadataSource
): string | null {
  if (avatarUrl && avatarUrl.trim()) return avatarUrl
  return providerPhotoUrl(user)
}

/** Name supplied by the OAuth provider, used to prefill a new profile. */
export function providerFullName(user: MetadataSource): string | null {
  const metadata = user?.user_metadata
  if (!metadata) return null

  for (const key of ['full_name', 'name']) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function initialsFor(name: string | null | undefined, email?: string | null): string {
  const source = (name ?? '').trim() || (email ?? '').split('@')[0] || ''
  if (!source) return '?'

  const words = source.split(/[\s._-]+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}
