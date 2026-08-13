'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type Props = {
  children: React.ReactNode
  className?: string
  /** Which descendants to animate. */
  selector?: string
  /** Gap between staggered items already on screen, in seconds. */
  stagger?: number
}

/**
 * Entrance animation for a screen.
 *
 * Elements already on screen at mount stagger in together; anything below the
 * fold waits for a ScrollTrigger and plays once when it is scrolled to. The
 * initial hidden state is applied from JavaScript rather than CSS on purpose —
 * if the script never runs, the content is simply visible rather than
 * permanently invisible.
 */
export function Reveal({ children, className, selector = '[data-animate]', stagger = 0.07 }: Props) {
  const scopeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const scope = scopeRef.current
    if (!scope) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const context = gsap.context(() => {
      // Annotated elements when there are any, otherwise the direct children —
      // so a page can opt in simply by wrapping its content.
      let targets = gsap.utils.toArray<HTMLElement>(selector)
      if (!targets.length) {
        targets = Array.from(scope.children) as HTMLElement[]
      }
      if (!targets.length) return

      let onScreen = 0

      targets.forEach((element) => {
        const isVisible = element.getBoundingClientRect().top < window.innerHeight * 0.95

        gsap.set(element, { autoAlpha: 0, y: 20 })
        gsap.to(element, {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          delay: isVisible ? onScreen++ * stagger : 0,
          // Below the fold: hold until it is actually scrolled into view.
          scrollTrigger: isVisible
            ? undefined
            : { trigger: element, start: 'top 88%', once: true },
        })
      })
    }, scope)

    return () => context.revert()
  }, [selector, stagger])

  return (
    <div ref={scopeRef} className={className}>
      {children}
    </div>
  )
}
