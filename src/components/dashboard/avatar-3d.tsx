'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { buildFigure } from '@/lib/avatar/build-figure'
import type { AvatarMorphs } from '@/lib/profiles/avatar'

type Avatar3DProps = {
  morphs: AvatarMorphs
  className?: string
}

/**
 * Greyscale 3D avatar.
 *
 * Renders with Three.js on a WebGL canvas, auto-rotates, and can be dragged to
 * orbit. The figure is rebuilt whenever the morph parameters change, so the
 * body visibly updates when BMI or experience level moves.
 */
export function Avatar3D({ morphs, className }: Avatar3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)

  // Kept in refs so the render loop always sees current values without
  // being torn down and rebuilt on every interaction.
  const morphsRef = useRef(morphs)
  const rotationRef = useRef(0)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef(0)
  const autoRotateRef = useRef(true)

  useEffect(() => {
    morphsRef.current = morphs
  }, [morphs])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      // No WebGL available (older device, blocked context) — show the fallback.
      setFailed(true)
      return
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0.25, 4.6)
    camera.lookAt(0, 0, 0)

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.touchAction = 'pan-y'
    renderer.domElement.style.cursor = 'grab'

    // Neutral three-point lighting. Greyscale throughout: the only colour in
    // the scene comes from the light intensities, which keeps the figure
    // readable in both the light and dark app themes.
    const key = new THREE.DirectionalLight(0xffffff, 2.1)
    key.position.set(2.6, 4, 3.4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 20
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xffffff, 0.75)
    fill.position.set(-3.4, 1.4, 2)
    scene.add(fill)

    const rim = new THREE.DirectionalLight(0xffffff, 1.15)
    rim.position.set(-1.2, 2.2, -3.6)
    scene.add(rim)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 0.75))

    const pivot = new THREE.Group()
    scene.add(pivot)

    let figure = buildFigure(morphsRef.current)
    pivot.add(figure.group)
    let renderedMorphs = morphsRef.current

    // -- Interaction ---------------------------------------------------------
    const canvas = renderer.domElement

    const onPointerDown = (event: PointerEvent) => {
      draggingRef.current = true
      autoRotateRef.current = false
      lastPointerRef.current = event.clientX
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return
      rotationRef.current += (event.clientX - lastPointerRef.current) * 0.01
      lastPointerRef.current = event.clientX
    }

    const endDrag = (event: PointerEvent) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      canvas.releasePointerCapture(event.pointerId)
      canvas.style.cursor = 'grab'
      // Resume the idle spin shortly after the user lets go.
      window.setTimeout(() => {
        if (!draggingRef.current) autoRotateRef.current = true
      }, 2500)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)

    // -- Sizing --------------------------------------------------------------
    const resize = () => {
      const { clientWidth, clientHeight } = mount
      if (!clientWidth || !clientHeight) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }
    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    // -- Render loop ---------------------------------------------------------
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0

    const animate = () => {
      frame = requestAnimationFrame(animate)

      // Rebuild only when the shape parameters actually change.
      const next = morphsRef.current
      if (next.mass !== renderedMorphs.mass || next.muscle !== renderedMorphs.muscle) {
        pivot.remove(figure.group)
        figure.dispose()
        figure = buildFigure(next)
        pivot.add(figure.group)
        renderedMorphs = next
      }

      if (autoRotateRef.current && !prefersReducedMotion) {
        rotationRef.current += 0.004
      }
      pivot.rotation.y = rotationRef.current

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      figure.dispose()
      renderer.dispose()
      if (canvas.parentNode === mount) mount.removeChild(canvas)
    }
    // Built once; morph updates flow through the ref inside the loop.
  }, [])

  if (failed) {
    return (
      <div className={`grid place-items-center rounded-3xl bg-muted p-6 text-center ${className ?? ''}`}>
        <p className="text-sm text-muted-foreground">
          Your browser could not start 3D rendering, so the avatar is unavailable here.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={mountRef}
      className={className}
      role="img"
      aria-label="Three-dimensional greyscale figure reflecting your current body composition and training level. Drag to rotate."
    />
  )
}
