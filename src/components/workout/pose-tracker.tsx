'use client'

import { useEffect, useRef, useState } from 'react'
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export type PoseTrackerProps = {
  exerciseName: string
  targetReps: number
  onRepCompleted: (repsCompleted: number, avgDepth: number) => void
  onFormFeedback: (message: string | null) => void
}

function calculateAngle(a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180.0) / Math.PI)
  if (angle > 180.0) {
    angle = 360 - angle
  }
  return angle
}

export function PoseTracker({ exerciseName, targetReps, onRepCompleted, onFormFeedback }: PoseTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  
  // State refs for the game loop
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const isSquattingRef = useRef(false)
  const repCountRef = useRef(0)
  
  // Initialize MediaPipe
  useEffect(() => {
    let active = true
    
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        )
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        })
        
        if (!active) return
        landmarkerRef.current = poseLandmarker
        setIsModelLoaded(true)
      } catch (err) {
        console.error("Failed to load MediaPipe:", err)
      }
    }
    
    init()
    
    return () => {
      active = false
      if (landmarkerRef.current) {
        landmarkerRef.current.close()
      }
    }
  }, [])
  
  // Initialize Webcam
  useEffect(() => {
    let stream: MediaStream | null = null
    
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setCameraActive(true)
          }
        }
      } catch (err) {
        console.error("Failed to access webcam:", err)
      }
    }
    
    startCamera()
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])
  
  const onRepCompletedRef = useRef(onRepCompleted)
  const onFormFeedbackRef = useRef(onFormFeedback)

  useEffect(() => {
    onRepCompletedRef.current = onRepCompleted
    onFormFeedbackRef.current = onFormFeedback
  }, [onRepCompleted, onFormFeedback])
  
  // Run Pose Detection Loop
  useEffect(() => {
    if (!isModelLoaded || !cameraActive) return
    
    let animationFrameId: number
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current
    
    if (!video || !canvas || !landmarker) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const drawingUtils = new DrawingUtils(ctx)
    let lastVideoTime = -1
    
    function predictWebcam() {
      if (!video || !canvas || !landmarker || !ctx) return
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameId = window.requestAnimationFrame(predictWebcam)
        return
      }
      
      const startTimeMs = performance.now()
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime
        
        // Setting canvas width/height implicitly clears the canvas, so only do it when we intend to redraw!
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
        
        const results = landmarker.detectForVideo(video, startTimeMs)
        
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Draw the video frame directly onto the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        if (results.landmarks && results.landmarks.length > 0) {
          for (const landmark of results.landmarks) {
            // Draw skeleton
            drawingUtils.drawLandmarks(landmark, { radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1), color: '#ffffff' })
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, { color: '#00ff00', lineWidth: 4 })
            
            // Rep Counting Logic (Squats)
            if (exerciseName.toLowerCase().includes('squat')) {
              const hip = landmark[24] || landmark[23] // right or left hip
              const knee = landmark[26] || landmark[25] // right or left knee
              const ankle = landmark[28] || landmark[27] // right or left ankle
              
              if (hip && knee && ankle && hip.visibility > 0.5 && knee.visibility > 0.5 && ankle.visibility > 0.5) {
                const angle = calculateAngle(hip, knee, ankle)
                
                // Draw angle on screen for debug
                ctx.fillStyle = '#00ff00'
                ctx.font = '24px Arial'
                ctx.fillText(`Knee: ${Math.round(angle)}°`, 20, 40)
                
                if (angle < 90) { // Down phase
                  if (!isSquattingRef.current) {
                    isSquattingRef.current = true
                    onFormFeedbackRef.current("Good depth! Now push up.")
                  }
                } else if (angle > 160) { // Up phase
                  if (isSquattingRef.current) {
                    isSquattingRef.current = false
                    repCountRef.current += 1
                    onRepCompletedRef.current(repCountRef.current, 90) // Hardcoded avg depth for now
                    onFormFeedbackRef.current(null) // clear feedback
                  }
                }
              } else {
                onFormFeedbackRef.current("Step back so your full body is in frame.")
              }
            }
          }
        } else {
          onFormFeedbackRef.current("No person detected.")
        }
        ctx.restore()
      }
      
      animationFrameId = window.requestAnimationFrame(predictWebcam)
    }
    
    predictWebcam()
    
    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isModelLoaded, cameraActive, exerciseName])
  
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-black aspect-video flex items-center justify-center">
      {!isModelLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="font-bold">Loading AI Vision Model...</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="hidden" // We hide the raw video and only show the canvas
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover transform -scale-x-100" // Mirror the canvas for a natural feel
      />
    </div>
  )
}
