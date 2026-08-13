/**
 * Choice lists shared by onboarding and the settings page, so the two screens
 * can never drift apart on what a valid selection is.
 */

export const EQUIPMENT_OPTIONS = [
  'Dumbbells',
  'Barbell',
  'Kettlebells',
  'Resistance bands',
  'Pull-up bar',
  'Bench',
  'Machines',
  'Cardio machine',
] as const

export const PREFERENCE_OPTIONS = [
  'Strength',
  'Hypertrophy',
  'HIIT',
  'Low impact',
  'Mobility',
  'Home workouts',
  'Gym workouts',
] as const

export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const

export const ACTIVITY_HELP: Record<string, string> = {
  sedentary: 'Mostly sitting, little deliberate movement',
  light: 'Light activity or walking most days',
  moderate: 'Regular exercise a few times a week',
  high: 'Training hard most days of the week',
  athlete: 'Structured training, competing or close to it',
}

export const EXPERIENCE_HELP: Record<string, string> = {
  none: 'Never trained with weights',
  beginner: 'Under a year of consistent training',
  intermediate: 'One to three years of training',
  experienced: 'Three or more years of consistent training',
}
