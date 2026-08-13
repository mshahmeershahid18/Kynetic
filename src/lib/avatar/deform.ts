/**
 * Anatomical deformation of the human base mesh.
 *
 * There is exactly one source mesh (`public/models/human-base.bin`, built from
 * FinalBaseMesh.obj). Every body Kynetic renders — male or female, at any BMI
 * and any training level — is that same mesh reshaped by this module. An OBJ
 * carries no blend shapes, so the reshaping is done here by moving vertices
 * according to which part of the body they belong to.
 *
 * The landmarks below were measured off the actual source mesh by slicing it
 * horizontally and clustering each slice, so they describe this specific model
 * rather than a generic human. Heights are normalised: the build script scales
 * the mesh to exactly 1.0 units tall with the feet at y = 0, so `u = y` is the
 * fraction of body height.
 *
 *   u 0.00  soles          u 0.65  waist (narrowest torso)
 *   u 0.44  crotch         u 0.75  chest
 *   u 0.50  hip / pelvis   u 0.80  shoulders
 *   u 0.79  shoulder joint u 0.85  neck
 *   u 0.47  hands          u 0.87+ head
 *
 * The model stands in an A-pose: arms angle down and outward from
 * (±0.125, 0.79) to roughly (±0.27, 0.47).
 */

export type Sex = 'male' | 'female'

export type BodyParams = {
  /** 0 = very lean, 1 = high body mass. Derived from BMI. */
  mass: number
  /** 0 = untrained, 1 = well developed. Derived from experience level. */
  muscle: number
  sex: Sex
}

/**
 * What the source mesh already depicts.
 *
 * FinalBaseMesh.obj is a lean, athletic adult male — roughly BMI 23 with a few
 * years of training behind him. Every profile is expressed as a *signed* offset
 * from that reference, not as an addition to it. Without this, `muscle = 0`
 * simply left the base mesh untouched, so an untrained beginner rendered with
 * the same shoulders, arms and chest as the model.
 *
 * BASE_MASS is `(23 - 16) / 22` on the same BMI mapping avatarMorphs() uses.
 */
const BASE_MASS = 0.32
const BASE_MUSCLE = 0.6

/**
 * Adding is more forgiving than subtracting: a body can gain half again its
 * girth and still read as human, while the same proportional reduction reads as
 * skeletal. Growth therefore gets the full gain and shrinkage a damped one.
 */
const MASS_GROW = 1.9
const MASS_SHRINK = 1.5
const MUSCLE_GROW = 1.9
const MUSCLE_SHRINK = 0.85

function signedGain(delta: number, grow: number, shrink: number) {
  return delta >= 0 ? delta * grow : delta * shrink
}

/**
 * A limb or torso can only be taken so far from the source proportions before
 * it stops reading as a body. The floor matters most: mass and muscle both
 * shrink the same regions, and at the extreme (BMI 16, never trained) their
 * sum would otherwise halve the legs.
 */
function clampGain(gain: number) {
  return gain < 0.74 ? 0.74 : gain > 1.9 ? 1.9 : gain
}

// --- Measured landmarks (normalised units) ----------------------------------
const CROTCH = 0.44
const WAIST = 0.65
const CHEST = 0.75
const SHOULDER = 0.80
const NECK = 0.85

const LEG_CENTRE_X = 0.087
const LEG_HIP_Y = 0.45
const LEG_ANKLE_Y = 0.02

/**
 * How far in front of the centre line the abdominal projection reaches full
 * strength. The torso is about 0.09 deep at the waist, so half of that gives a
 * gradient wide enough to be invisible on the shaded surface.
 */
const FRONT_FADE = 0.045

const ARM_SHOULDER = { x: 0.125, y: 0.79 }
const ARM_HAND = { x: 0.27, y: 0.465 }

/**
 * Half-width of the torso silhouette at a given height, measured from the
 * source mesh. Used to tell torso vertices from arm vertices without a
 * hard seam.
 */
const TORSO_EDGE: Array<[number, number]> = [
  [0.44, 0.104],
  [0.50, 0.097],
  [0.55, 0.088],
  [0.60, 0.084],
  [0.65, 0.082],
  [0.70, 0.095],
  [0.75, 0.115],
  [0.80, 0.128],
  [0.85, 0.085],
]

// --- Small math helpers ------------------------------------------------------

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Bell curve peaking at `centre`, reaching ~0 at `centre ± width`. */
function bump(u: number, centre: number, width: number) {
  const d = (u - centre) / width
  return Math.exp(-d * d * 2.5)
}

function lerpTable(table: Array<[number, number]>, u: number) {
  if (u <= table[0][0]) return table[0][1]
  const last = table[table.length - 1]
  if (u >= last[0]) return last[1]
  for (let i = 1; i < table.length; i += 1) {
    if (u <= table[i][0]) {
      const [x0, y0] = table[i - 1]
      const [x1, y1] = table[i]
      const t = (u - x0) / (x1 - x0)
      return y0 + (y1 - y0) * t
    }
  }
  return last[1]
}

/** Distance from point (px,py) to segment (ax,ay)-(bx,by), plus where it fell. */
function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq ? clamp01(((px - ax) * dx + (py - ay) * dy) / lengthSq) : 0
  const cx = ax + dx * t
  const cy = ay + dy * t
  return { distance: Math.hypot(px - cx, py - cy), t, cx, cy }
}

// --- Body axis ---------------------------------------------------------------

/**
 * The body is not a cylinder around z = 0: the buttocks sit behind the spine
 * and the chest in front of it. Scaling around z = 0 would therefore drag the
 * whole torso backward as it widens. We measure the mesh's true centre line
 * once and scale around that instead.
 */
export type BodyAxis = { bins: number; centreZ: Float32Array }

export function computeBodyAxis(positions: Float32Array, bins = 72): BodyAxis {
  const sum = new Float32Array(bins)
  const count = new Uint32Array(bins)

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const u = positions[i + 1]
    // Torso only: arms and legs would skew the centre line.
    if (u < CROTCH || u > NECK) continue
    if (Math.abs(x) > lerpTable(TORSO_EDGE, u)) continue

    const bin = Math.min(bins - 1, Math.max(0, Math.floor(u * bins)))
    sum[bin] += positions[i + 2]
    count[bin] += 1
  }

  const centreZ = new Float32Array(bins)
  let lastKnown = 0
  for (let b = 0; b < bins; b += 1) {
    if (count[b] > 0) {
      centreZ[b] = sum[b] / count[b]
      lastKnown = centreZ[b]
    } else {
      centreZ[b] = lastKnown
    }
  }

  // Light smoothing so the axis has no steps that would kink the surface.
  const smoothed = new Float32Array(bins)
  for (let b = 0; b < bins; b += 1) {
    const a = centreZ[Math.max(0, b - 1)]
    const c = centreZ[Math.min(bins - 1, b + 1)]
    smoothed[b] = (a + centreZ[b] * 2 + c) / 4
  }

  return { bins, centreZ: smoothed }
}

function axisZ(axis: BodyAxis, u: number) {
  const f = clamp01(u) * (axis.bins - 1)
  const i = Math.floor(f)
  const j = Math.min(axis.bins - 1, i + 1)
  const t = f - i
  return axis.centreZ[i] * (1 - t) + axis.centreZ[j] * t
}

// --- Shape profiles ----------------------------------------------------------

/**
 * Where body mass accumulates. Weight is gained mostly around the abdomen,
 * meaningfully at the hips and chest, and least on the head and extremities —
 * which is why a heavier figure reads as heavier rather than simply scaled up.
 */
function massWidthProfile(u: number) {
  return (
    0.42 * bump(u, 0.60, 0.16) + // abdomen — the dominant term
    0.20 * bump(u, 0.50, 0.10) + // hips
    0.16 * bump(u, 0.75, 0.10) + // chest
    0.08 * bump(u, 0.84, 0.06)   // neck
  )
}

/** Mass adds more depth than width: bellies project forward. */
function massDepthProfile(u: number) {
  return (
    0.58 * bump(u, 0.585, 0.15) +
    0.22 * bump(u, 0.50, 0.10) +
    0.18 * bump(u, 0.75, 0.10)
  )
}

/**
 * Training broadens the shoulders and upper back and slightly narrows the
 * waist. That contrast — not raw size — is what reads as "trained".
 */
function muscleWidthProfile(u: number) {
  return (
    0.30 * bump(u, 0.79, 0.09) +  // deltoids / upper back
    0.14 * bump(u, 0.73, 0.08) -  // chest
    0.07 * bump(u, 0.63, 0.07)    // waist taper
  )
}

function muscleDepthProfile(u: number) {
  return 0.20 * bump(u, 0.75, 0.10) + 0.10 * bump(u, 0.79, 0.08)
}

// --- Sex-specific shaping ----------------------------------------------------

/**
 * Female shaping is applied on top of the same base mesh: narrower shoulders
 * and ribcage, wider hips, a more defined waist, and a bust. Overall stature is
 * handled by the caller as a uniform scale.
 */
function femaleWidthProfile(u: number) {
  return (
    0.17 * bump(u, 0.49, 0.09) -  // wider hips
    0.10 * bump(u, 0.80, 0.08) -  // narrower shoulders
    0.09 * bump(u, 0.65, 0.07) -  // narrower waist
    0.05 * bump(u, 0.75, 0.08)    // narrower ribcage
  )
}

function femaleDepthProfile(u: number) {
  return 0.12 * bump(u, 0.49, 0.09) - 0.06 * bump(u, 0.65, 0.07)
}

// --- Main deformation --------------------------------------------------------

/**
 * Writes the deformed body into `target`, leaving `base` untouched.
 * Both arrays are flat xyz triples in the mesh's normalised space.
 */
export function deformBody(
  base: Float32Array,
  target: Float32Array,
  axis: BodyAxis,
  params: BodyParams
): void {
  // Signed offsets from what the base mesh already is, so a lean untrained
  // profile actually removes size rather than leaving the model as-is.
  const mass = signedGain(clamp01(params.mass) - BASE_MASS, MASS_GROW, MASS_SHRINK)
  const muscle = signedGain(clamp01(params.muscle) - BASE_MUSCLE, MUSCLE_GROW, MUSCLE_SHRINK)
  const female = params.sex === 'female' ? 1 : 0

  // Training shows less as raw width on a female frame.
  const muscleWidthGain = female ? 0.72 : 1
  const bustAmount = female * (0.055 + mass * 0.03)

  for (let i = 0; i < base.length; i += 3) {
    const x = base[i]
    const u = base[i + 1]
    const z = base[i + 2]

    // --- Region weights (smooth, so there are no seams) -------------------
    const headWeight = smoothstep(NECK - 0.02, NECK + 0.035, u)
    const legWeight = (1 - smoothstep(CROTCH - 0.03, CROTCH + 0.05, u)) * (1 - headWeight)

    const torsoEdge = lerpTable(TORSO_EDGE, u)
    // Arms only exist between the hands and the shoulders.
    const armBand = smoothstep(ARM_HAND.y - 0.06, ARM_HAND.y + 0.02, u) * (1 - smoothstep(SHOULDER + 0.01, SHOULDER + 0.05, u))
    const armWeight = armBand * smoothstep(torsoEdge * 0.9, torsoEdge * 1.35, Math.abs(x)) * (1 - headWeight) * (1 - legWeight)

    const torsoWeight = Math.max(0, 1 - headWeight - legWeight - armWeight)

    let nx = x
    let ny = u
    let nz = z

    // --- Torso ------------------------------------------------------------
    if (torsoWeight > 0.001) {
      const cz = axisZ(axis, u)
      const widthGain = clampGain(
        1 +
          mass * massWidthProfile(u) +
          muscle * muscleWidthProfile(u) * muscleWidthGain +
          female * femaleWidthProfile(u)
      )
      const depthGain = clampGain(
        1 +
          mass * massDepthProfile(u) +
          muscle * muscleDepthProfile(u) +
          female * femaleDepthProfile(u)
      )

      const tx = x * widthGain
      let tz = cz + (z - cz) * depthGain

      /**
       * Abdominal projection: forward only, so the back stays flat.
       *
       * The weight has to fade in with distance from the centre line rather
       * than switching on at `z > cz`. A hard switch displaces the vertex just
       * in front of the axis by the full amount and its neighbour behind by
       * nothing, which shows up as a ridge encircling the belly — subtle when
       * the term pushed outward, obvious now that a lean profile pulls inward.
       */
      const front = smoothstep(0, FRONT_FADE, z - cz)
      tz += mass * 0.055 * bump(u, 0.575, 0.13) * front
      tz += bustAmount * bump(u, 0.745, 0.045) * smoothstep(0.16, 0.02, Math.abs(x)) * front

      nx += (tx - x) * torsoWeight
      nz += (tz - z) * torsoWeight
    }

    // --- Legs -------------------------------------------------------------
    if (legWeight > 0.001) {
      const side = x >= 0 ? 1 : -1
      const centreX = side * LEG_CENTRE_X
      const cz = axisZ(axis, CROTCH)

      // Thighs thicken far more than calves and ankles.
      const along = smoothstep(LEG_ANKLE_Y, LEG_HIP_Y, u)
      const gain = clampGain(
        1 +
          mass * (0.16 + 0.34 * along) +
          muscle * (0.10 + 0.30 * along) +
          female * (0.06 * along)
      )

      const tx = centreX + (x - centreX) * gain
      const tz = cz + (z - cz) * gain

      nx += (tx - x) * legWeight
      nz += (tz - z) * legWeight
    }

    // --- Arms -------------------------------------------------------------
    if (armWeight > 0.001) {
      const side = x >= 0 ? 1 : -1
      const { t, cx, cy } = distanceToSegment(
        Math.abs(x), u,
        ARM_SHOULDER.x, ARM_SHOULDER.y,
        ARM_HAND.x, ARM_HAND.y
      )

      // t = 0 at the shoulder, 1 at the hand. Upper arms carry the size.
      const toShoulder = 1 - t
      const gain = clampGain(
        1 +
          mass * (0.10 + 0.22 * toShoulder) +
          muscle * (0.08 + 0.42 * toShoulder) * muscleWidthGain
      )

      const cz = axisZ(axis, u)
      const tx = side * (cx + (Math.abs(x) - cx) * gain)
      const ty = cy + (u - cy) * gain
      const tz = cz + (z - cz) * gain

      nx += (tx - x) * armWeight
      ny += (ty - u) * armWeight
      nz += (tz - z) * armWeight
    }

    // --- Head and neck ----------------------------------------------------
    if (headWeight > 0.001) {
      const cz = axisZ(axis, NECK)
      // The skull does not change size; the face and neck fill out a little.
      const gain = clampGain(
        1 + mass * 0.11 * (1 - smoothstep(NECK, 0.95, u)) + muscle * 0.05 * (1 - smoothstep(NECK, 0.90, u))
      )
      const shrink = female ? 0.97 : 1

      const tx = x * gain * shrink
      const tz = cz + (z - cz) * gain

      nx += (tx - x) * headWeight
      nz += (tz - z) * headWeight
    }

    target[i] = nx
    target[i + 1] = ny
    target[i + 2] = nz
  }
}

/** Female figures are rendered slightly shorter overall. */
export function statureScale(sex: Sex) {
  return sex === 'female' ? 0.935 : 1
}
