/**
 * Form field parsing shared by the onboarding wizard and the settings page.
 *
 * The bounds mirror the CHECK constraints in supabase/schema.sql. Catching them
 * here turns a raw Postgres constraint violation into a readable message on the
 * right field.
 */

export type FieldErrors = Record<string, string>

export const NUMERIC_BOUNDS = {
  age: { min: 13, max: 100, label: 'Age' },
  height_cm: { min: 90, max: 250, label: 'Height' },
  weight_kg: { min: 25, max: 350, label: 'Weight' },
  available_days_per_week: { min: 1, max: 7, label: 'Training days' },
  preferred_session_minutes: { min: 10, max: 180, label: 'Session length' },
} as const

export type NumericField = keyof typeof NUMERIC_BOUNDS

export function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export function multi(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

export function boundedNumber(
  formData: FormData,
  key: NumericField,
  errors: FieldErrors
): number | null {
  const { min, max, label } = NUMERIC_BOUNDS[key]
  const raw = text(formData, key)

  if (!raw) {
    errors[key] = `${label} is required.`
    return null
  }

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    errors[key] = `${label} must be a number.`
    return null
  }
  if (value < min || value > max) {
    errors[key] = `${label} must be between ${min} and ${max}.`
    return null
  }
  return value
}

export function oneOf<T extends readonly string[]>(
  formData: FormData,
  key: string,
  allowed: T,
  label: string,
  errors: FieldErrors
): T[number] | null {
  const value = text(formData, key)
  if (!value) {
    errors[key] = `${label} is required.`
    return null
  }
  if (!(allowed as readonly string[]).includes(value)) {
    errors[key] = `Choose a valid ${label.toLowerCase()}.`
    return null
  }
  return value as T[number]
}
