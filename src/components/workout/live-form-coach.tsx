'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, CameraOff, Loader2, ShieldCheck, Video } from 'lucide-react'

import {
  createAnalyzerState,
  summarizeAnalysis,
  updateAnalyzer,
  visionLabel,
  visionSetupHint,
  type AnalysisSummary,
  type AnalyzerSnapshot,
  type VisionKind,
} from '@/lib/vision/exercise-analyzers'
import {
  createPoseLandmarkerWithFallback,
  drawSkeleton,
  type PoseLandmarkerLike,
} from '@/lib/vision/pose-landmarker'
import { analyzeVideoWithAI } from '@/lib/ai-client'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export type LiveFormMetrics = AnalysisSummary & {
  tracking: boolean
  current_cue: string
}

type LiveFormCoachProps = {
  /** Null for exercises without live support — the component explains why. */
  visionKind: VisionKind | null
  exerciseName: string
  active: boolean
  onMetricsChange: (metrics: LiveFormMetrics) => void
}

/**
 * Live camera coaching for a single exercise.
 *
 * Deliberately limited to simple bodyweight patterns. For anything else the
 * component renders an explanation instead of a camera, because a single
 * webcam cannot judge a loaded or complex lift safely enough to coach it.
 */
export function LiveFormCoach({ visionKind, exerciseName, active, onMetricsChange }: LiveFormCoachProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<PoseLandmarkerLike | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number>()
  const stateRef = useRef(createAnalyzerState(visionKind ?? 'squat'))
  const lastTimeRef = useRef(-1)
  const runningRef = useRef(false)
  const onMetricsRef = useRef(onMetricsChange)

  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<AnalyzerSnapshot | null>(null)
  const [flash, setFlash] = useState(false)

  // AI Fallback states
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [aiFallbackAvailable, setAiFallbackAvailable] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [aiSummary, setAiSummary] = useState<AnalysisSummary | null>(null)

  useEffect(() => {
    onMetricsRef.current = onMetricsChange
  }, [onMetricsChange])

  useEffect(() => {
    runningRef.current = enabled
  }, [enabled])

  const emit = useCallback((tracking: boolean, cue: string) => {
    onMetricsRef.current({
      ...summarizeAnalysis(stateRef.current),
      tracking,
      current_cue: cue,
    })
  }, [])

  // Reset the counter whenever the coached exercise changes.
  useEffect(() => {
    if (!visionKind) return
    stateRef.current = createAnalyzerState(visionKind)
    setSnapshot(null)
    setAiFallbackAvailable(false)
    setAiSummary(null)
    emit(false, visionSetupHint(visionKind))
  }, [visionKind, exerciseName, emit])

  useEffect(() => {
    if (!enabled || !active || !visionKind) return

    let cancelled = false

    const loop = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (!video || !canvas || !landmarker || !runningRef.current) return

      if (video.currentTime !== lastTimeRef.current && video.videoWidth > 0) {
        lastTimeRef.current = video.currentTime
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const now = performance.now()
        const result = landmarker.detectForVideo(video, now)
        const landmarks = result.landmarks?.[0]

        const next = updateAnalyzer(stateRef.current, {
          landmarks,
          worldLandmarks: result.worldLandmarks?.[0],
          aspect: video.videoWidth / video.videoHeight,
          timestampMs: now,
        })
        stateRef.current = next
        setSnapshot(next)
        drawSkeleton(canvas, landmarks, { good: next.formScore >= 75 })

        if (next.repCompleted) {
          setFlash(true)
          window.setTimeout(() => setFlash(false), 320)
        }
        emit(next.tracking, next.cue)
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    const start = async () => {
      setLoading(true)
      setError(null)
      try {
        const landmarker = await createPoseLandmarkerWithFallback()
        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          landmarker.close()
          return
        }
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        
        chunksRef.current = []
        const mimeType = 'video/webm'
        if (MediaRecorder.isTypeSupported(mimeType)) {
          const recorder = new MediaRecorder(stream, { mimeType })
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunksRef.current.push(e.data)
              // Keep about 15 seconds of video (assuming 1s chunks)
              if (chunksRef.current.length > 15) {
                chunksRef.current.shift()
              }
            }
          }
          recorder.start(1000)
          mediaRecorderRef.current = recorder
        }

        loop()
      } catch (caught) {
        const message =
          caught instanceof DOMException && caught.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access to use live guidance.'
            : caught instanceof Error
              ? caught.message
              : 'Unable to start the camera.'
        setError(message)
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      runningRef.current = false
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current = null
      }
      
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      lastTimeRef.current = -1
    }
  }, [active, enabled, visionKind, emit])

  // ---------------------------------------------------------------------
  // Exercises without live support
  // ---------------------------------------------------------------------
  if (!visionKind) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5">
        <div className="flex items-center gap-2 font-semibold">
          <Video className="h-4 w-4 text-muted-foreground" />
          Live guidance not available
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Live camera coaching is limited to simple bodyweight movements like squats,
          push-ups, lunges, and glute bridges, where a single camera can judge the
          movement reliably. <span className="font-medium text-foreground">{exerciseName}</span> is
          tracked manually — follow the demonstration and log your sets as you go.
        </p>
      </div>
    )
  }

  const summary = summarizeAnalysis(stateRef.current)
  const formGood = (snapshot?.formScore ?? 0) >= 75

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Live guidance
          </p>
          <h3 className="truncate text-sm font-semibold">{visionLabel(visionKind)} coaching</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            if (enabled) {
              // Stopping: if no reps were detected locally, prepare the fallback
              if (stateRef.current.reps === 0 && chunksRef.current.length > 0) {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' })
                setRecordedBlob(blob)
                setAiFallbackAvailable(true)
              }
            } else {
              // Starting: reset AI states
              setAiFallbackAvailable(false)
              setAiSummary(null)
            }
            setEnabled((value) => !value)
          }}
          disabled={loading || aiAnalyzing}
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {loading || aiAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : enabled ? (
            <CameraOff className="h-4 w-4" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {enabled ? 'Stop' : 'Start camera'}
        </button>
      </header>

      <div className="relative aspect-video bg-black">
        <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />

        {flash ? <div className="pointer-events-none absolute inset-0 bg-emerald-400/25" /> : null}

        {enabled ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-black/65 px-4 py-2 backdrop-blur">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Reps</p>
            <p className="text-3xl font-semibold leading-none text-white tabular-nums">
              {snapshot?.reps ?? 0}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-black/75 px-6 text-center">
            <div className="max-w-xs">
              <ShieldCheck className="mx-auto mb-3 h-6 w-6 text-emerald-400" />
              <p className="text-sm font-medium text-white">
                Video never leaves your device
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                {visionSetupHint(visionKind)} Only the rep and form summary is saved.
              </p>
            </div>
          </div>
        )}

        {enabled && snapshot ? (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 space-y-2 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full transition-all duration-100 ${formGood ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${snapshot.depthPercent}%` }}
              />
            </div>
            <p className="text-sm font-medium text-white">{snapshot.cue}</p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="flex items-start gap-2 border-t border-border bg-destructive/10 px-5 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
        <Metric label="Reps" value={aiSummary ? String(aiSummary.rep_count) : String(summary.rep_count)} />
        <Metric label="Depth" value={`${aiSummary ? aiSummary.average_depth : (snapshot?.depthPercent ?? 0)}%`} />
        <Metric label="Form" value={aiSummary ? String(aiSummary.form_score) : (summary.form_score ? String(summary.form_score) : '—')} />
        <Metric label="Tracking" value={`${aiSummary ? aiSummary.tracking_quality : summary.tracking_quality}%`} />
      </div>

      {aiFallbackAvailable && !aiAnalyzing && !aiSummary ? (
        <div className="border-t border-border bg-primary/5 px-5 py-4">
          <p className="text-sm font-medium text-foreground">Local tracking didn&apos;t detect your reps.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We recorded a snippet of your session. Our AI coach can analyze it in the cloud.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (!recordedBlob) return
              setAiAnalyzing(true)
              setError(null)
              try {
                const supabase = createBrowserSupabaseClient()
                const sessionResponse = await supabase?.auth.getSession()
                const token = sessionResponse?.data.session?.access_token || null
                
                const result = await analyzeVideoWithAI(recordedBlob, visionKind, token)
                if (result?.summary) {
                  setAiSummary(result.summary)
                  setAiFallbackAvailable(false)
                  onMetricsRef.current({
                    ...result.summary,
                    tracking: true,
                    current_cue: "AI Analysis Complete"
                  })
                } else {
                  setError('AI analysis failed. Please try again.')
                }
              } catch (e) {
                setError('An error occurred during AI analysis.')
              } finally {
                setAiAnalyzing(false)
              }
            }}
            className="mt-3 focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Analyze with AI Coach
          </button>
        </div>
      ) : null}

      {(aiSummary?.form_warnings.length || summary.form_warnings.length) ? (
        <ul className="space-y-1.5 border-t border-border px-5 py-4">
          {(aiSummary ? aiSummary.form_warnings : summary.form_warnings).map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
