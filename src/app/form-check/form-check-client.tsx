'use client'

import { useState } from 'react'

import { VideoFormCheck } from '@/components/workout/video-form-check'
import type { AnalysisSummary, VisionKind } from '@/lib/vision/exercise-analyzers'
import { saveFormAnalysisAction } from '@/app/form-check/actions'

export function FormCheckClient() {
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleComplete(kind: VisionKind, summary: AnalysisSummary) {
    setSaveError(null)
    setSaved(false)

    // Nothing meaningful was detected, so there is nothing worth recording.
    if (summary.rep_count === 0) return

    const result = await saveFormAnalysisAction({
      exerciseSlug: kind,
      visionKind: kind,
      repCount: summary.rep_count,
      averageDepth: summary.average_depth,
      formScore: summary.form_score,
      warnings: summary.form_warnings,
      trackingQuality: summary.tracking_quality,
    })

    if (result.ok) setSaved(true)
    else setSaveError(result.error ?? 'Could not save this form check.')
  }

  return (
    <div className="space-y-4">
      <VideoFormCheck onComplete={handleComplete} />
      {saved ? (
        <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          Saved to your form check history.
        </p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{saveError}</p>
      ) : null}
    </div>
  )
}
