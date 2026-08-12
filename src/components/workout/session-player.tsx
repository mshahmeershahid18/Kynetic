'use client'

import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { CheckCircle2, Play, Pause, ChevronRight, Check } from 'lucide-react'
import type { WorkoutPlanRecord } from '@/lib/workouts/types'

type PlayerState = 'WARMUP' | 'EXERCISE' | 'REST' | 'COOLDOWN' | 'SUMMARY'

export function SessionPlayer({ plan, onComplete }: { plan: WorkoutPlanRecord, onComplete: (duration: number) => void }) {
  const [state, setState] = useState<PlayerState>('WARMUP')
  const [blockIdx, setBlockIdx] = useState(0)
  const [exIdx, setExIdx] = useState(0)
  const [setNum, setSetNum] = useState(1)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [startTime] = useState(Date.now())
  
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) {
      if (isTimerActive && timeLeft <= 0) handleNext()
      return
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [isTimerActive, timeLeft])

  function animateTransition(onCompleteCb: () => void) {
    if (!containerRef.current) return onCompleteCb()
    gsap.to(containerRef.current, { 
      opacity: 0, 
      x: -20, 
      duration: 0.2, 
      onComplete: () => {
        onCompleteCb()
        gsap.fromTo(containerRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 })
      }
    })
  }

  function handleNext() {
    animateTransition(() => {
      if (state === 'WARMUP') {
        setState('EXERCISE')
      } else if (state === 'EXERCISE') {
        const currentEx = plan.plan.blocks[blockIdx].exercises[exIdx]
        if (setNum < currentEx.sets) {
          setState('REST')
          setTimeLeft(currentEx.rest_seconds)
          setIsTimerActive(true)
        } else {
          if (exIdx + 1 < plan.plan.blocks[blockIdx].exercises.length) {
            setExIdx(e => e + 1)
            setSetNum(1)
            setState('EXERCISE')
          } else if (blockIdx + 1 < plan.plan.blocks.length) {
            setBlockIdx(b => b + 1)
            setExIdx(0)
            setSetNum(1)
            setState('EXERCISE')
          } else {
            setState('COOLDOWN')
          }
        }
      } else if (state === 'REST') {
        setIsTimerActive(false)
        setSetNum(s => s + 1)
        setState('EXERCISE')
      } else if (state === 'COOLDOWN') {
        setState('SUMMARY')
      } else if (state === 'SUMMARY') {
        const durationMinutes = Math.round((Date.now() - startTime) / 60000)
        onComplete(durationMinutes)
      }
    })
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center rounded-[3rem] border border-border bg-card p-8 shadow-2xl">
      <div ref={containerRef} className="w-full max-w-2xl text-center">
        
        {state === 'WARMUP' && (
          <div className="space-y-8">
            <p className="font-black uppercase tracking-[0.2em] text-primary">Get Ready</p>
            <h2 className="text-4xl font-black">Warmup</h2>
            <ul className="mx-auto max-w-md space-y-4 text-left">
              {plan.plan.warmup.map(item => (
                <li key={item} className="flex items-center gap-3 rounded-2xl bg-background p-4 text-lg font-bold">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> {item}
                </li>
              ))}
            </ul>
            <button onClick={handleNext} className="mt-8 rounded-full bg-primary px-8 py-4 font-black text-primary-foreground hover:scale-105 transition flex mx-auto items-center gap-2">
              Start Workout <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {state === 'EXERCISE' && (
          <div className="space-y-8">
            <p className="font-black uppercase tracking-[0.2em] text-primary">
              Set {setNum} of {plan.plan.blocks[blockIdx].exercises[exIdx].sets}
            </p>
            <h2 className="text-5xl font-black">{plan.plan.blocks[blockIdx].exercises[exIdx].name}</h2>
            <p className="text-3xl font-bold text-muted-foreground">{plan.plan.blocks[blockIdx].exercises[exIdx].reps}</p>
            
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-background p-6 text-left">
              <h3 className="mb-4 font-black">Instructions</h3>
              <ul className="space-y-2 text-muted-foreground">
                {plan.plan.blocks[blockIdx].exercises[exIdx].instructions.map(item => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <button onClick={handleNext} className="mt-8 rounded-full bg-primary px-10 py-5 text-xl font-black text-primary-foreground hover:scale-105 transition flex mx-auto items-center gap-2">
              <Check className="h-6 w-6" /> Complete Set
            </button>
          </div>
        )}

        {state === 'REST' && (
          <div className="space-y-8">
            <p className="font-black uppercase tracking-[0.2em] text-primary">Rest & Recover</p>
            <h2 className="text-8xl font-black tabular-nums">{formatTime(timeLeft)}</h2>
            <p className="text-lg text-muted-foreground">
              Up next: Set {setNum + 1} of {plan.plan.blocks[blockIdx].exercises[exIdx].name}
            </p>
            <div className="flex justify-center gap-4 mt-8">
              <button 
                onClick={() => setIsTimerActive(!isTimerActive)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:scale-105 transition"
              >
                {isTimerActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              <button onClick={handleNext} className="rounded-full border border-border bg-background px-8 py-4 font-black hover:bg-muted transition">
                Skip Rest
              </button>
            </div>
          </div>
        )}

        {state === 'COOLDOWN' && (
          <div className="space-y-8">
            <p className="font-black uppercase tracking-[0.2em] text-primary">Great Job</p>
            <h2 className="text-4xl font-black">Cooldown</h2>
            <ul className="mx-auto max-w-md space-y-4 text-left">
              {plan.plan.cooldown.map(item => (
                <li key={item} className="flex items-center gap-3 rounded-2xl bg-background p-4 text-lg font-bold">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> {item}
                </li>
              ))}
            </ul>
            <button onClick={handleNext} className="mt-8 rounded-full bg-primary px-8 py-4 font-black text-primary-foreground hover:scale-105 transition flex mx-auto items-center gap-2">
              Finish Workout <Check className="h-5 w-5" />
            </button>
          </div>
        )}

        {state === 'SUMMARY' && (
          <div className="space-y-8">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-500">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-4xl font-black">Session Complete!</h2>
            <p className="text-lg text-muted-foreground">Your progress has been recorded.</p>
            <button onClick={handleNext} className="mt-8 rounded-full bg-primary px-8 py-4 font-black text-primary-foreground hover:scale-105 transition flex mx-auto items-center gap-2">
              Save & Return <Check className="h-5 w-5" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
