'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Loader2, Video } from 'lucide-react'

import { createRepCounterState, summarizeRepCounter, updateSquatCounter, type Landmark2D, type RepCounterSnapshot } from '@/lib/vision/rep-counter'

export type RepCounterMetrics = ReturnType<typeof summarizeRepCounter> & {
  tracking: boolean
  current_cue: string
}

type VisionModule = typeof import('@mediapipe/tasks-vision')

type PoseRepCounterProps = {
  active: boolean
  exerciseName: string
  onMetricsChange: (metrics: RepCounterMetrics) => void
}

const SQUATISH_EXERCISES = ['squat', 'lunge', 'step', 'split squat']
const CONNECTORS: Array<[number, number]> = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [11, 13], [13, 15], [12, 14], [14, 16],
]

function supportsRepCounting(exerciseName: string) {
  const normalized = exerciseName.toLowerCase()
  return SQUATISH_EXERCISES.some((name) => normalized.includes(name))
}

export function PoseRepCounter({ active, exerciseName, onMetricsChange }: PoseRepCounterProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<{ detectForVideo: (video: HTMLVideoElement, now: number) => { landmarks?: Landmark2D[][] }; close: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number>()
  const counterStateRef = useRef(createRepCounterState())
  const lastVideoTimeRef = useRef(-1)
  const [enabled, setEnabled] = useState(false)
  const enabledRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<RepCounterSnapshot | null>(null)

  const countable = supportsRepCounting(exerciseName)
  const metricsRef = useRef(onMetricsChange)

  useEffect(() => {
    metricsRef.current = onMetricsChange
  }, [onMetricsChange])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    counterStateRef.current = createRepCounterState()
    setSnapshot(null)
    onMetricsChange({ ...summarizeRepCounter(counterStateRef.current), tracking: false, current_cue: 'Counter reset for the next movement.' })
  }, [exerciseName, onMetricsChange])

  useEffect(() => {
    if (!enabled || !active || !countable) return
    let cancelled = false

    async function startCamera() {
      setLoading(true)
      setError(null)
      try {
        const visionModule: VisionModule = await import('@mediapipe/tasks-vision')
        const vision = await visionModule.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm')
        const landmarker = await visionModule.PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
        if (cancelled) {
          landmarker.close()
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 960, height: 720 }, audio: false })
        streamRef.current = stream
        landmarkerRef.current = landmarker as { detectForVideo: (video: HTMLVideoElement, now: number) => { landmarks?: Landmark2D[][] }; close: () => void }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        loop()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to start webcam pose tracking.')
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    function loop() {
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (!video || !canvas || !landmarker || !enabledRef.current) return

      if (video.currentTime !== lastVideoTimeRef.current && video.videoWidth > 0) {
        lastVideoTimeRef.current = video.currentTime
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const result = landmarker.detectForVideo(video, performance.now())
        const landmarks = result.landmarks?.[0]
        drawOverlay(canvas, landmarks)
        if (landmarks) {
          const next = updateSquatCounter(counterStateRef.current, landmarks)
          counterStateRef.current = next
          setSnapshot(next)
          onMetricsChange({ ...summarizeRepCounter(next), tracking: true, current_cue: next.cue })
        }
      }

      animationRef.current = requestAnimationFrame(loop)
    }

    startCamera()

    return () => {
      cancelled = true
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [active, countable, enabled, onMetricsChange])

  if (!countable) {
    return (
      <div className="rounded-[2rem] border border-dashed border-border bg-muted/40 p-5">
        <div className="flex items-center gap-3 font-black"><Video className="h-5 w-5 text-primary" /> Form tracker standby</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Live rep counting is enabled for squat/lunge-style bodyweight moves. Finish sets manually for this exercise.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[2rem] border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Browser pose tracking</p>
          <h3 className="text-lg font-black">Live rep counter</h3>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          disabled={loading}
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {enabled ? 'Stop' : 'Start camera'}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-[1.5rem] bg-black">
        <video ref={videoRef} className="aspect-video w-full -scale-x-100 object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />
        {!enabled ? <div className="absolute inset-0 grid place-items-center bg-black/70 text-center text-white"><p className="max-w-xs text-sm font-bold">Camera stays local in your browser. Start tracking when you are ready.</p></div> : null}
      </div>

      {error ? <p className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p> : null}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Metric label="Reps" value={String(snapshot?.reps ?? 0)} />
        <Metric label="Depth" value={`${snapshot?.depthPercent ?? 0}%`} />
        <Metric label="Form" value={`${snapshot?.formScore ?? 0}`} />
      </div>
      <p className="mt-3 rounded-2xl bg-muted p-3 text-sm font-bold text-muted-foreground">{snapshot?.cue ?? 'Start camera to count reps with MediaPipe Pose.'}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-muted p-3"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>
}

function drawOverlay(canvas: HTMLCanvasElement, landmarks?: Landmark2D[]) {
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (!landmarks) return
  context.lineWidth = 4
  context.strokeStyle = 'rgba(52, 211, 153, 0.9)'
  context.fillStyle = 'rgba(96, 165, 250, 0.95)'
  CONNECTORS.forEach(([start, end]) => {
    const a = landmarks[start]
    const b = landmarks[end]
    if (!a || !b || (a.visibility ?? 1) < 0.4 || (b.visibility ?? 1) < 0.4) return
    context.beginPath()
    context.moveTo(a.x * canvas.width, a.y * canvas.height)
    context.lineTo(b.x * canvas.width, b.y * canvas.height)
    context.stroke()
  })
  landmarks.forEach((point) => {
    if ((point.visibility ?? 1) < 0.4) return
    context.beginPath()
    context.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2)
    context.fill()
  })
}
