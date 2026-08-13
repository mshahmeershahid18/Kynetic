'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileVideo, Loader2, RotateCcw, Upload } from 'lucide-react'

import {
  createAnalyzerState,
  describeAnalysis,
  summarizeAnalysis,
  updateAnalyzer,
  visionKinds,
  visionLabel,
  visionSetupHint,
  type AnalysisSummary,
  type VisionKind,
} from '@/lib/vision/exercise-analyzers'
import { createPoseLandmarkerWithFallback, drawSkeleton } from '@/lib/vision/pose-landmarker'
import { analyzeVideoWithAI } from '@/lib/ai-client'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const MAX_FILE_BYTES = 100 * 1024 * 1024 // 100 MB
const MAX_DURATION_SECONDS = 180

type Status = 'idle' | 'analyzing' | 'done' | 'error'

type VideoFormCheckProps = {
  /** Restricts the picker when launched from a specific exercise. */
  lockedKind?: VisionKind
  onComplete?: (kind: VisionKind, summary: AnalysisSummary) => Promise<void> | void
}

/**
 * Offline form check from an uploaded video.
 *
 * For people who would rather film a set than run a live session. The file is
 * decoded and analysed entirely in the browser using the same analyzers the
 * live coach uses — the video itself is never uploaded anywhere.
 */
export function VideoFormCheck({ lockedKind, onComplete }: VideoFormCheckProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [kind, setKind] = useState<VisionKind>(lockedKind ?? 'squat')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [aiFallbackAvailable, setAiFallbackAvailable] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  const reset = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setStatus('idle')
    setProgress(0)
    setError(null)
    setSummary(null)
    setFileName(null)
    setAiFallbackAvailable(false)
    setAiAnalyzing(false)
    setOriginalFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const analyze = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        setError('That video is larger than 100 MB. Trim it to a single set and try again.')
        setStatus('error')
        return
      }

      setStatus('analyzing')
      setError(null)
      setSummary(null)
      setProgress(0)
      setFileName(file.name)
      setOriginalFile(file)
      setAiFallbackAvailable(false)
      setAiAnalyzing(false)

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      video.src = url

      let landmarker: Awaited<ReturnType<typeof createPoseLandmarkerWithFallback>> | null = null

      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve()
          video.onerror = () => reject(new Error('That file could not be decoded as a video.'))
        })

        if (!Number.isFinite(video.duration) || video.duration <= 0) {
          throw new Error('That video has no readable duration.')
        }
        if (video.duration > MAX_DURATION_SECONDS) {
          throw new Error('Please upload a clip of 3 minutes or less showing one set.')
        }

        landmarker = await createPoseLandmarkerWithFallback()
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        let state = createAnalyzerState(kind)

        // Sample at a fixed 12fps. That is plenty to resolve rep phases and
        // keeps a long clip from taking minutes to process.
        const step = 1 / 12
        const total = video.duration

        for (let time = 0; time < total; time += step) {
          // Seeking frame by frame is the only reliable way to decode an
          // arbitrary file across browsers.
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              resolve()
            }
            video.addEventListener('seeked', onSeeked)
            video.currentTime = Math.min(time, total - 0.01)
          })

          const result = landmarker.detectForVideo(video, Math.round(time * 1000))
          const landmarks = result.landmarks?.[0]
          state = updateAnalyzer(state, {
            landmarks,
            worldLandmarks: result.worldLandmarks?.[0],
            aspect: video.videoWidth / video.videoHeight,
            // Media time, so the minimum-rep-interval check measures the
            // movement in the clip rather than how long decoding took.
            timestampMs: Math.round(time * 1000),
          })
          drawSkeleton(canvas, landmarks, { good: true })
          setProgress(Math.min(99, Math.round((time / total) * 100)))
        }

        const result = summarizeAnalysis(state)
        
        if (result.rep_count === 0) {
          // Auto-trigger AI fallback
          setAiAnalyzing(true)
          try {
            const supabase = createBrowserSupabaseClient()
            const sessionResponse = await supabase?.auth.getSession()
            const token = sessionResponse?.data.session?.access_token || null
            
            const aiResult = await analyzeVideoWithAI(file, kind, token)
            
            if (aiResult?.summary) {
              setSummary(aiResult.summary)
              setProgress(100)
              setStatus('done')
              
              if (onComplete) {
                setSaving(true)
                try {
                  await onComplete(kind, aiResult.summary)
                } finally {
                  setSaving(false)
                }
              }
            } else {
              // AI failed, fallback to local zero reps
              setSummary(result)
              setProgress(100)
              setStatus('done')
              setAiFallbackAvailable(true)
              setError('AI analysis failed. Please try again or record a better video.')
            }
          } catch (caught) {
            setSummary(result)
            setProgress(100)
            setStatus('done')
            setAiFallbackAvailable(true)
            setError('An error occurred during AI analysis.')
          } finally {
            setAiAnalyzing(false)
          }
        } else {
          setSummary(result)
          setProgress(100)
          setStatus('done')

          if (onComplete) {
            setSaving(true)
            try {
              await onComplete(kind, result)
            } finally {
              setSaving(false)
            }
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'The video could not be analysed.')
        setStatus('error')
      } finally {
        landmarker?.close()
      }
    },
    [kind, onComplete]
  )

  const analyzeWithAI = useCallback(async () => {
    if (!originalFile) return
    setAiAnalyzing(true)
    setError(null)
    
    try {
      const supabase = createBrowserSupabaseClient()
      const sessionResponse = await supabase?.auth.getSession()
      const token = sessionResponse?.data.session?.access_token || null
      
      const result = await analyzeVideoWithAI(originalFile, kind, token)
      
      if (result?.summary) {
        setSummary(result.summary)
        setAiFallbackAvailable(false)
        
        if (onComplete) {
          setSaving(true)
          try {
            await onComplete(kind, result.summary)
          } finally {
            setSaving(false)
          }
        }
      } else {
        setError('AI analysis failed. Please try again or record a better video.')
      }
    } catch (caught) {
      setError('An error occurred during AI analysis.')
    } finally {
      setAiAnalyzing(false)
    }
  }, [originalFile, kind, onComplete])

  const busy = status === 'analyzing' || aiAnalyzing

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Check your form from a video</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Prefer not to run a live session? Upload a clip of one set and get the same rep
          count and form analysis. The video is processed on your device and never uploaded.
        </p>
      </header>

      {!lockedKind ? (
        <div className="border-b border-border px-5 py-4">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Exercise in the video
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {visionKinds.map((option) => (
              <button
                key={option}
                type="button"
                disabled={busy}
                onClick={() => setKind(option)}
                className={`focus-ring rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                  kind === option
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                {visionLabel(option)}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            {visionSetupHint(kind)}
          </p>
        </div>
      ) : null}

      <div className="px-5 py-5">
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void analyze(file)
          }}
        />

        {status === 'idle' || status === 'error' ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="focus-ring flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition hover:border-primary/50 hover:bg-muted/40"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Choose a video</span>
            <span className="text-xs text-muted-foreground">MP4, MOV or WebM · up to 100 MB · one set</span>
          </button>
        ) : null}

        {busy ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {aiAnalyzing ? `AI Coach is analyzing ${fileName}...` : `Analysing ${fileName}`}
            </div>
            {!aiAnalyzing && (
              <>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{progress}% · this runs entirely in your browser</p>
              </>
            )}
          </div>
        ) : null}

        {/* Preview canvas doubles as the skeleton overlay during analysis. */}
        <div className={status === 'idle' ? 'hidden' : 'mt-4'}>
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="w-full" playsInline muted preload="metadata" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          </div>
        </div>

        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}

        {status === 'done' && summary ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm leading-relaxed">{describeAnalysis(kind, summary)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Result label="Reps" value={String(summary.rep_count)} />
              <Result label="Avg depth" value={`${summary.average_depth}%`} />
              <Result label="Form score" value={summary.form_score ? String(summary.form_score) : '—'} />
              <Result label="Tracking" value={`${summary.tracking_quality}%`} />
            </div>

            {summary.tracking_quality < 60 ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                Your body was only fully visible in {summary.tracking_quality}% of frames, so these
                numbers are rough. {visionSetupHint(kind)}
              </p>
            ) : null}

            {summary.form_warnings.length ? (
              <ul className="space-y-1.5">
                {summary.form_warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}

            {aiFallbackAvailable && !aiAnalyzing ? (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">Local tracking couldn&apos;t detect your reps.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our advanced AI coach can analyze this video in the cloud for a deeper form check.
                </p>
                <button
                  type="button"
                  onClick={analyzeWithAI}
                  className="mt-3 focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Analyze with AI Coach
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" />
                Check another video
              </button>
              {saving ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {status === 'idle' ? (
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <FileVideo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Film from the side, keep your whole body in frame, and include a few clean reps.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
