'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import {
  computeBodyAxis,
  deformBody,
  statureScale,
  type BodyAxis,
  type BodyParams,
} from '@/lib/avatar/deform'
import { loadBaseMesh } from '@/lib/avatar/load-mesh'

type Avatar3DProps = {
  params: BodyParams
  className?: string
}

type Status = 'loading' | 'ready' | 'error'

/**
 * Renders the greyscale human avatar.
 *
 * A single base mesh is loaded once and reshaped on the CPU whenever the body
 * parameters change. Deformation runs on a parameter change only — never per
 * frame — so the render loop stays cheap.
 */
export function Avatar3D({ params, className }: Avatar3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string | null>(null)

  // Live values the render loop reads without needing to be rebuilt.
  const paramsRef = useRef(params)
  const rotationRef = useRef(0.35)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef(0)
  const autoRotateRef = useRef(true)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setStatus('error')
      setMessage('Your browser could not start 3D rendering.')
      return
    }

    let disposed = false
    let frame = 0
    let observer: ResizeObserver | null = null

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50)
    camera.position.set(0, 0, 2)
    camera.lookAt(0, 0, 0)

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    const canvas = renderer.domElement
    // Sized in explicit pixels by resize() below — a percentage height here
    // collapses whenever the ancestor chain has no resolvable height, which
    // leaves the canvas shorter than the card and clips the figure.
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.display = 'block'
    canvas.style.touchAction = 'pan-y'
    canvas.style.cursor = 'grab'
    mount.appendChild(canvas)

    // --- Lighting: neutral greys only, so the figure reads the same in both
    // app themes and never picks up a colour cast.
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(1.4, 2.2, 2.0)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 8
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xffffff, 0.85)
    fill.position.set(-2.2, 0.7, 1.4)
    scene.add(fill)

    const rim = new THREE.DirectionalLight(0xffffff, 1.5)
    rim.position.set(-0.8, 1.6, -2.4)
    scene.add(rim)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.55))

    const pivot = new THREE.Group()
    scene.add(pivot)

    // --- Interaction --------------------------------------------------------
    const onPointerDown = (event: PointerEvent) => {
      draggingRef.current = true
      autoRotateRef.current = false
      lastPointerRef.current = event.clientX
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return
      rotationRef.current += (event.clientX - lastPointerRef.current) * 0.011
      lastPointerRef.current = event.clientX
    }
    const endDrag = (event: PointerEvent) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      canvas.style.cursor = 'grab'
      window.setTimeout(() => {
        if (!draggingRef.current) autoRotateRef.current = true
      }, 3000)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)

    // --- Framing ------------------------------------------------------------
    // The figure is centred on the origin and the camera pulls back just far
    // enough to hold it, so it fills whatever height the card happens to have
    // and never clips as it spins.
    const MARGIN = 1.06
    let fitHeight = 1
    let fitRadius = 0.3
    let viewWidth = 0
    let viewHeight = 0

    const frameCamera = () => {
      if (!viewWidth || !viewHeight) return

      camera.aspect = viewWidth / viewHeight
      const vFov = (camera.fov * Math.PI) / 180
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)

      const distanceForHeight = fitHeight / 2 / Math.tan(vFov / 2)
      const distanceForWidth = fitRadius / Math.tan(hFov / 2)

      // The extra radius clears the half of the figure nearest the camera.
      camera.position.set(0, 0, Math.max(distanceForHeight, distanceForWidth) + fitRadius)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
    }

    // Measured rather than read from clientWidth/clientHeight so the canvas
    // always matches the box the card actually gives us.
    const resize = () => {
      const rect = mount.getBoundingClientRect()
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)
      if (!width || !height) return
      if (width === viewWidth && height === viewHeight) return

      viewWidth = width
      viewHeight = height
      renderer.setSize(width, height, true)
      frameCamera()
    }

    // --- Build once the mesh arrives ---------------------------------------
    let geometry: THREE.BufferGeometry | null = null
    let material: THREE.MeshStandardMaterial | null = null

    loadBaseMesh()
      .then((mesh) => {
        if (disposed) return

        const base = mesh.positions
        const working = new Float32Array(base.length)
        const axis: BodyAxis = computeBodyAxis(base)

        geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(working, 3))
        geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1))

        material = new THREE.MeshStandardMaterial({
          color: 0xb9b9b9,
          roughness: 0.68,
          metalness: 0.04,
        })

        // Self-shadowing only: the figure floats against the card background
        // with no contact shadow beneath it.
        const body = new THREE.Mesh(geometry, material)
        body.castShadow = true
        body.receiveShadow = true
        pivot.add(body)

        let applied: BodyParams | null = null

        const applyParams = (next: BodyParams) => {
          deformBody(base, working, axis, next)
          geometry!.attributes.position.needsUpdate = true
          geometry!.computeVertexNormals()
          geometry!.computeBoundingSphere()
          geometry!.computeBoundingBox()
          const stature = statureScale(next.sex)
          body.scale.set(1, stature, 1)

          // Re-centre and re-frame from the deformed bounds — the mesh's own
          // size and origin are whatever the source model happened to use.
          const box = geometry!.boundingBox!
          const height = (box.max.y - box.min.y) * stature
          const radius = Math.max(
            Math.abs(box.min.x),
            Math.abs(box.max.x),
            Math.abs(box.min.z),
            Math.abs(box.max.z)
          )

          body.position.y = -((box.min.y + box.max.y) / 2) * stature

          fitHeight = height * MARGIN
          fitRadius = radius * MARGIN
          frameCamera()

          applied = next
        }

        applyParams(paramsRef.current)
        resize()
        observer = new ResizeObserver(resize)
        observer.observe(mount)
        setStatus('ready')

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        let sizeTick = 0

        const animate = () => {
          frame = requestAnimationFrame(animate)

          // ResizeObserver covers container changes; this catches the layout
          // settling after fonts, images, or the dashboard grid land.
          sizeTick += 1
          if (sizeTick % 30 === 0) resize()

          const next = paramsRef.current
          if (
            !applied ||
            applied.mass !== next.mass ||
            applied.muscle !== next.muscle ||
            applied.sex !== next.sex
          ) {
            applyParams(next)
          }

          if (autoRotateRef.current && !reduceMotion) {
            rotationRef.current += 0.0035
          }
          pivot.rotation.y = rotationRef.current

          renderer.render(scene, camera)
        }
        animate()
      })
      .catch((error: unknown) => {
        if (disposed) return
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Could not load the avatar.')
      })

    return () => {
      disposed = true
      if (frame) cancelAnimationFrame(frame)
      observer?.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      geometry?.dispose()
      material?.dispose()
      renderer.dispose()
      if (canvas.parentNode === mount) mount.removeChild(canvas)
    }
    // Built once; parameter changes flow through paramsRef inside the loop.
  }, [])

  return (
    <div className={className || 'relative'}>
      <div
        ref={mountRef}
        className="absolute inset-0"
        role="img"
        aria-label="Three-dimensional figure reflecting your body composition and training level. Drag to rotate."
      />

      {status === 'loading' ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-32 w-10 animate-pulse rounded-full bg-muted-foreground/15" />
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      ) : null}
    </div>
  )
}
