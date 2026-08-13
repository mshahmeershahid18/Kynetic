'use client'

import { useRef, useState } from 'react'
import { Loader2, Trash2, Upload } from 'lucide-react'

import { removeProfilePhoto, saveProfilePhoto, type SettingsState } from '@/app/settings/actions'
import { FormStatus } from '@/components/forms/fields'
import { ProfileAvatar } from '@/components/profile/profile-avatar'
import { SectionCard } from '@/components/settings/section-card'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

type Props = {
  userId: string
  photoUrl: string | null
  /** True when the current photo comes from Google rather than an upload. */
  fromProvider: boolean
  name: string | null
  email: string | null
}

export function PhotoPanel({ userId, photoUrl, fromProvider, name, email }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(photoUrl)
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<SettingsState>({})

  const upload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setState({ error: 'Choose a JPEG, PNG, WebP, or GIF image.' })
      return
    }
    if (file.size > MAX_BYTES) {
      setState({ error: 'That image is larger than 5 MB.' })
      return
    }

    const supabase = createBrowserSupabaseClient()
    if (!supabase) {
      setState({ error: 'Supabase is not configured.' })
      return
    }

    setBusy(true)
    setState({})

    // Uploaded straight from the browser, so the image bytes never travel
    // through the Next server. Storage RLS restricts writes to this folder.
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/avatar-${Date.now()}.${extension}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })

    if (error) {
      setBusy(false)
      setState({
        error:
          error.message.toLowerCase().includes('bucket')
            ? 'The avatars storage bucket is missing. Run supabase/migrations/2026-08-13-profile-photos.sql.'
            : error.message,
      })
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(path)

    const result = await saveProfilePhoto(publicUrl)
    if (!result.error) setPreview(publicUrl)
    setState(result)
    setBusy(false)
  }

  const remove = async () => {
    setBusy(true)
    const result = await removeProfilePhoto()
    if (!result.error) setPreview(null)
    setState(result)
    setBusy(false)
  }

  return (
    <SectionCard
      title="Profile photo"
      description="Shown on your account menu. JPEG, PNG, WebP, or GIF, up to 5 MB."
    >
      <div className="space-y-5">
        <div className="flex items-center gap-5">
          <ProfileAvatar src={preview} name={name} email={email} size="lg" />

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {preview ? 'Change photo' : 'Upload photo'}
              </button>

              {preview ? (
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              ) : null}
            </div>

            {fromProvider && preview ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                This is your Google account picture. Uploading one here replaces it.
              </p>
            ) : null}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Reset so picking the same file twice still fires a change event.
            event.target.value = ''
            if (file) void upload(file)
          }}
        />

        <FormStatus ok={state.ok} error={state.error} />
      </div>
    </SectionCard>
  )
}
