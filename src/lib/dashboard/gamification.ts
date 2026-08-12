import type { AiFeedbackRecord, WorkoutPlanRecord, WorkoutSessionRecord } from '@/lib/workouts/types'

export type DashboardAchievement = {
  id: string
  title: string
  description: string
  unlocked: boolean
  progress: number
  target: number
}

export type WeeklyProgressPoint = {
  label: string
  dateKey: string
  minutes: number
  sessions: number
  averageFormScore: number | null
}

export type DashboardGamification = {
  completedSessions: number
  totalMinutes: number
  totalReps: number
  averageFormScore: number | null
  currentStreak: number
  longestStreak: number
  xp: number
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  levelProgress: number
  weeklyProgress: WeeklyProgressPoint[]
  achievements: DashboardAchievement[]
  insights: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function buildDashboardGamification({
  sessions,
  plans,
  feedbackRecords,
}: {
  sessions: WorkoutSessionRecord[]
  plans: WorkoutPlanRecord[]
  feedbackRecords: AiFeedbackRecord[]
}): DashboardGamification {
  const completed = sessions.filter((session) => session.status === 'completed' && session.completed_at)
  const totalMinutes = completed.reduce((total, session) => total + (session.duration_minutes ?? 0), 0)
  const totalReps = completed.reduce((total, session) => total + (session.session_data?.rep_count ?? 0), 0)
  const formScores = completed
    .map((session) => session.session_data?.form_score)
    .filter((score): score is number => typeof score === 'number')
  const averageFormScore = formScores.length ? Math.round(formScores.reduce((sum, score) => sum + score, 0) / formScores.length) : null
  const streaks = calculateStreaks(completed)
  const xp = completed.length * 100 + totalMinutes * 5 + totalReps * 2 + (averageFormScore ?? 0) * 3 + feedbackRecords.length * 25
  const levelState = calculateLevel(xp)
  const weeklyProgress = buildWeeklyProgress(completed)
  const achievements = buildAchievements({
    completedSessions: completed.length,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    totalReps,
    totalMinutes,
    averageFormScore,
    generatedPlans: plans.length,
    feedbackCount: feedbackRecords.length,
  })

  return {
    completedSessions: completed.length,
    totalMinutes,
    totalReps,
    averageFormScore,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    xp,
    ...levelState,
    weeklyProgress,
    achievements,
    insights: buildInsights({ completed, weeklyProgress, averageFormScore, streaks, feedbackRecords }),
  }
}

function calculateLevel(xp: number) {
  let level = 1
  let remaining = xp
  let nextLevelCost = getLevelCost(level)

  while (remaining >= nextLevelCost) {
    remaining -= nextLevelCost
    level += 1
    nextLevelCost = getLevelCost(level)
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: nextLevelCost,
    levelProgress: Math.min(100, Math.round((remaining / nextLevelCost) * 100)),
  }
}

function getLevelCost(level: number) {
  return 500 + (level - 1) * 250
}

function calculateStreaks(sessions: WorkoutSessionRecord[]) {
  const dateKeys = Array.from(
    new Set(
      sessions
        .map((session) => toDateKey(session.completed_at))
        .filter((key): key is string => Boolean(key))
    )
  ).sort()
  if (!dateKeys.length) return { currentStreak: 0, longestStreak: 0 }

  let longestStreak = 1
  let run = 1
  for (let index = 1; index < dateKeys.length; index += 1) {
    const previous = fromDateKey(dateKeys[index - 1])
    const current = fromDateKey(dateKeys[index])
    if (daysBetween(previous, current) === 1) {
      run += 1
      longestStreak = Math.max(longestStreak, run)
    } else {
      run = 1
    }
  }

  const today = startOfDay(new Date())
  const lastWorkoutDay = fromDateKey(dateKeys[dateKeys.length - 1])
  let currentStreak = 0
  if (daysBetween(lastWorkoutDay, today) <= 1) {
    currentStreak = 1
    for (let index = dateKeys.length - 2; index >= 0; index -= 1) {
      const next = fromDateKey(dateKeys[index + 1])
      const current = fromDateKey(dateKeys[index])
      if (daysBetween(current, next) === 1) currentStreak += 1
      else break
    }
  }

  return { currentStreak, longestStreak }
}

function buildWeeklyProgress(sessions: WorkoutSessionRecord[]): WeeklyProgressPoint[] {
  const today = startOfDay(new Date())

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today.getTime() - (6 - offset) * DAY_MS)
    const dateKey = toDateKey(date.toISOString()) ?? ''
    const sessionsForDay = sessions.filter((session) => toDateKey(session.completed_at) === dateKey)
    const formScores = sessionsForDay
      .map((session) => session.session_data?.form_score)
      .filter((score): score is number => typeof score === 'number')

    return {
      label: date.toLocaleDateString('en', { weekday: 'short' }),
      dateKey,
      minutes: sessionsForDay.reduce((total, session) => total + (session.duration_minutes ?? 0), 0),
      sessions: sessionsForDay.length,
      averageFormScore: formScores.length ? Math.round(formScores.reduce((sum, score) => sum + score, 0) / formScores.length) : null,
    }
  })
}

function buildAchievements(input: {
  completedSessions: number
  currentStreak: number
  longestStreak: number
  totalReps: number
  totalMinutes: number
  averageFormScore: number | null
  generatedPlans: number
  feedbackCount: number
}): DashboardAchievement[] {
  return [
    achievement('first-session', 'First session', 'Complete your first workout.', input.completedSessions, 1),
    achievement('plan-builder', 'Plan builder', 'Generate three personalized plans.', input.generatedPlans, 3),
    achievement('three-day-fire', '3-day fire', 'Build a three-day training streak.', input.currentStreak, 3),
    achievement('week-warrior', 'Week warrior', 'Complete seven total workouts.', input.completedSessions, 7),
    achievement('rep-century', 'Rep century', 'Log 100 tracked reps.', input.totalReps, 100),
    achievement('form-focus', 'Form focus', 'Reach an 80 average form score.', input.averageFormScore ?? 0, 80),
    achievement('time-under-tension', 'Time under tension', 'Train for 300 total minutes.', input.totalMinutes, 300),
    achievement('coach-loop', 'Coach loop', 'Unlock three AI coaching feedback cards.', input.feedbackCount, 3),
  ]
}

function achievement(id: string, title: string, description: string, progress: number, target: number): DashboardAchievement {
  return {
    id,
    title,
    description,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
  }
}

function buildInsights({
  completed,
  weeklyProgress,
  averageFormScore,
  streaks,
  feedbackRecords,
}: {
  completed: WorkoutSessionRecord[]
  weeklyProgress: WeeklyProgressPoint[]
  averageFormScore: number | null
  streaks: { currentStreak: number; longestStreak: number }
  feedbackRecords: AiFeedbackRecord[]
}) {
  const weeklyMinutes = weeklyProgress.reduce((total, point) => total + point.minutes, 0)
  const insights: string[] = []

  if (!completed.length) {
    insights.push('Generate a plan and finish one guided session to start building XP, streaks, and personalized coaching trends.')
  } else {
    insights.push(`You trained ${weeklyMinutes} minutes over the last 7 days. ${weeklyMinutes >= 90 ? 'That is enough volume to keep momentum high.' : 'Aim for 90+ weekly minutes to build a stronger consistency base.'}`)
  }

  if (streaks.currentStreak > 0) {
    insights.push(`Your current streak is ${streaks.currentStreak} day${streaks.currentStreak === 1 ? '' : 's'}. Protect it with a short recovery or mobility session if you are low on time.`)
  } else if (completed.length) {
    insights.push(`Your longest streak is ${streaks.longestStreak} day${streaks.longestStreak === 1 ? '' : 's'}. Complete a session today to start a new run.`)
  }

  if (averageFormScore !== null) {
    insights.push(averageFormScore >= 80 ? 'Your average form score is strong. Progress by adding reps, load, or tempo gradually.' : 'Your form score has room to climb. Keep the next workout controlled and prioritize depth, posture, and clean reps.')
  }

  const latestFeedback = feedbackRecords[0]?.feedback
  if (latestFeedback?.next_time_focus) {
    insights.push(`AI coach focus: ${latestFeedback.next_time_focus}`)
  }

  return insights.slice(0, 4)
}

function toDateKey(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return startOfDay(date).toISOString().slice(0, 10)
}

function fromDateKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`)
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function daysBetween(start: Date, end: Date) {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS)
}
