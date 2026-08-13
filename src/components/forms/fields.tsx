'use client'

import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

/**
 * Form primitives shared by the onboarding wizard and the settings page.
 * Both screens edit the same profile, so they use the same controls.
 */

export function inputClass(error?: string) {
  return `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 ${
    error ? 'border-destructive' : 'border-border focus:border-primary'
  }`
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error ? <span className="mt-1.5 block text-xs text-destructive">{error}</span> : null}
    </label>
  )
}

export function RadioGroup({
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  name: string
  label: string
  options: Array<{ value: string; label: string; help?: string }>
  defaultValue: string
  error?: string
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium capitalize">{option.label}</span>
              {option.help ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.help}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </fieldset>
  )
}

export function CheckboxGroup({
  name,
  label,
  hint,
  options,
  selected,
}: {
  name: string
  label: string
  hint?: string
  options: readonly string[]
  selected: string[]
}) {
  const chosen = new Set(selected)
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="cursor-pointer rounded-lg border border-border bg-background px-3.5 py-2 text-sm transition hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              defaultChecked={chosen.has(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Result banner for a server action that reports back in place. */
export function FormStatus({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null

  return ok ? (
    <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-sm text-foreground">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      {ok}
    </p>
  ) : (
    <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </p>
  )
}

export function SubmitButton({
  label,
  pendingLabel,
  variant = 'primary',
  disabled = false,
}: {
  label: string
  pendingLabel?: string
  variant?: 'primary' | 'outline' | 'destructive'
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  const styles = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border border-border hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  }[variant]

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 ${styles}`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel ?? label : label}
    </button>
  )
}
