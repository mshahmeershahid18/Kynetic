/**
 * Pose analysis for simple bodyweight exercises.
 *
 * Everything here is pure: it takes MediaPipe landmarks in and returns a new
 * state out. That lets the exact same logic drive the live webcam counter and
 * the uploaded-video form check, so both paths always agree.
 *
 * Only movements a single camera can judge honestly are supported. Loaded or
 * complex lifts are deliberately excluded — see `supportsVision`.
 */

export type Landmark2D = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export const visionKinds = ["squat", "pushup", "lunge", "glute_bridge"] as const;
export type VisionKind = (typeof visionKinds)[number];

// MediaPipe Pose Landmarker indices.
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;

const VISIBILITY_FLOOR = 0.45;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Angle ABC in degrees.
 *
 * Uses the z component when the landmarks carry one. MediaPipe's world
 * landmarks are metric 3D, so a knee that bends partly toward the camera is
 * still measured correctly; with flat 2D input the same movement reads as a
 * straighter leg than it is. Callers pass world landmarks whenever the model
 * provides them — see `resolveFrame`.
 */
export function angleBetween(a: Landmark2D, b: Landmark2D, c: Landmark2D): number {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) };
  const abLength = Math.hypot(ab.x, ab.y, ab.z);
  const cbLength = Math.hypot(cb.x, cb.y, cb.z);
  if (!abLength || !cbLength) return 180;
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const cosine = Math.min(1, Math.max(-1, dot / (abLength * cbLength)));
  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

function midpoint(a: Landmark2D, b: Landmark2D): Landmark2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

function visible(...points: Array<Landmark2D | undefined>): boolean {
  return points.every((point) => point !== undefined && (point.visibility ?? 1) >= VISIBILITY_FLOOR);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Picks whichever side of the body the camera can see more clearly. */
function bestSide(landmarks: Landmark2D[], left: number[], right: number[]) {
  const score = (indices: number[]) =>
    indices.reduce((total, index) => total + (landmarks[index]?.visibility ?? 0), 0);
  return score(left) >= score(right) ? left : right;
}

/**
 * How far a segment tilts away from vertical, as tan(angle): 0 is upright,
 * 1.0 is 45 degrees. Computed in three dimensions, so it does not depend on
 * the camera standing at any particular angle to the movement.
 */
function tiltFromVertical(top: Landmark2D, bottom: Landmark2D) {
  const dx = top.x - bottom.x;
  const dy = Math.abs(top.y - bottom.y);
  const dz = (top.z ?? 0) - (bottom.z ?? 0);
  return Math.hypot(dx, dz) / Math.max(dy, 1e-4);
}

/**
 * Chooses the coordinate space the analyzers measure in.
 *
 * World landmarks are metric and camera-independent, so they are used whenever
 * MediaPipe supplies them. They carry no reliable visibility, so that field is
 * taken from the normalised set. Falling back to normalised coordinates means
 * correcting x by the frame's aspect ratio: x and y are fractions of *width*
 * and *height*, so on a 16:9 frame an uncorrected x is compressed by 1.78 and
 * every joint angle comes out wrong.
 */
export function resolveFrame(
  landmarks: Landmark2D[] | undefined,
  worldLandmarks?: Landmark2D[],
  aspect = 1
): Landmark2D[] | undefined {
  if (worldLandmarks?.length) {
    return worldLandmarks.map((point, index) => ({
      x: point.x,
      y: point.y,
      z: point.z ?? 0,
      visibility: landmarks?.[index]?.visibility ?? point.visibility ?? 1,
    }));
  }

  if (!landmarks?.length) return undefined;

  return landmarks.map((point) => ({
    x: point.x * aspect,
    y: point.y,
    // Normalised z is in the same units as x, so it needs the same correction.
    z: (point.z ?? 0) * aspect,
    visibility: point.visibility,
  }));
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type AnalyzerPhase = "ready" | "contracted" | "extended";

export type AnalyzerState = {
  kind: VisionKind;
  phase: AnalyzerPhase;
  reps: number;
  /** Extreme angle reached during the current repetition. */
  peakAngle: number;
  /** Per-rep range-of-motion percentages, used for average depth. */
  depthSamples: number[];
  /** Per-rep form scores. */
  formSamples: number[];
  warnings: string[];
  framesTracked: number;
  framesVisible: number;
  lastCue: string;
  /** Recent raw angles, newest last. Median-filtered to reject single-frame spikes. */
  angleHistory: number[];
  /** Smoothed angle carried between frames. */
  smoothedAngle: number | null;
  /** Phase the reading is trying to move into, and for how many frames. */
  pendingPhase: AnalyzerPhase | null;
  pendingFrames: number;
  /**
   * Timestamp of the last banked rep, used to reject impossibly fast ones.
   * Null until the first rep: video analysis starts at t = 0, so a numeric
   * sentinel here would make the first rep of every clip look instantaneous.
   */
  lastRepAt: number | null;
};

export type AnalyzerFrame = {
  /** The joint angle that drives rep detection, in degrees. */
  primaryAngle: number | null;
  /** Secondary angle used for form checks. */
  supportAngle: number | null;
  /** 0-100 progress through the movement's range. */
  depthPercent: number;
  /** 0-100 live form quality for this frame. */
  formScore: number;
  cue: string;
  /** True when enough landmarks are visible to trust the reading. */
  tracking: boolean;
  /** Set on the frame where a rep completes, for UI feedback. */
  repCompleted: boolean;
};

export type AnalyzerSnapshot = AnalyzerState & AnalyzerFrame;

export type AnalysisSummary = {
  rep_count: number;
  average_depth: number;
  form_score: number;
  form_warnings: string[];
  tracking_quality: number;
};

// ---------------------------------------------------------------------------
// Per-exercise configuration
// ---------------------------------------------------------------------------

type ExerciseConfig = {
  label: string;
  /** Angle at or below which the muscle is considered contracted. */
  contractedBelow: number;
  /** Angle at or above which the joint is considered extended. */
  extendedAbove: number;
  /**
   * Where in the cycle a rep is banked.
   * "return-to-extended" suits squats and push-ups, which start standing/locked
   * out. "reach-extended" suits glute bridges, which start with the hip flexed.
   */
  countAt: "return-to-extended" | "reach-extended";
  /** Angle range mapped onto the 0-100 depth readout. */
  depthFrom: number;
  depthTo: number;
  setupHint: string;
  /**
   * Minimum range of motion, as a depth percentage, before a rep is banked.
   * Without it a shallow bob that clips the contracted threshold by one degree
   * counts the same as a full rep.
   */
  minDepthPercent: number;
};

const CONFIG: Record<VisionKind, ExerciseConfig> = {
  squat: {
    label: "Squat",
    contractedBelow: 105,
    extendedAbove: 158,
    countAt: "return-to-extended",
    depthFrom: 170,
    depthTo: 90,
    minDepthPercent: 55,
    setupHint: "Stand side-on to the camera so your hip, knee, and ankle are all visible.",
  },
  pushup: {
    label: "Push-up",
    contractedBelow: 100,
    extendedAbove: 155,
    countAt: "return-to-extended",
    depthFrom: 165,
    depthTo: 85,
    minDepthPercent: 55,
    setupHint: "Place the camera side-on at floor height so your whole body is in frame.",
  },
  lunge: {
    label: "Lunge",
    contractedBelow: 110,
    extendedAbove: 160,
    countAt: "return-to-extended",
    depthFrom: 172,
    depthTo: 95,
    minDepthPercent: 50,
    setupHint: "Stand side-on with room to step backward inside the frame.",
  },
  glute_bridge: {
    label: "Glute bridge",
    contractedBelow: 130,
    extendedAbove: 162,
    countAt: "reach-extended",
    depthFrom: 110,
    depthTo: 175,
    minDepthPercent: 55,
    setupHint: "Lie side-on to the camera so your shoulder, hip, and knee are visible.",
  },
};

export function supportsVision(value: string | null | undefined): value is VisionKind {
  return typeof value === "string" && (visionKinds as readonly string[]).includes(value);
}

export function visionLabel(kind: VisionKind) {
  return CONFIG[kind].label;
}

export function visionSetupHint(kind: VisionKind) {
  return CONFIG[kind].setupHint;
}

export function createAnalyzerState(kind: VisionKind): AnalyzerState {
  const config = CONFIG[kind];
  return {
    kind,
    phase: "ready",
    reps: 0,
    peakAngle: config.countAt === "reach-extended" ? 0 : 180,
    depthSamples: [],
    formSamples: [],
    warnings: [],
    framesTracked: 0,
    framesVisible: 0,
    lastCue: config.setupHint,
    angleHistory: [],
    smoothedAngle: null,
    pendingPhase: null,
    pendingFrames: 0,
    lastRepAt: null,
  };
}

// ---------------------------------------------------------------------------
// Signal conditioning
// ---------------------------------------------------------------------------

/** Frames a phase change must hold for before it is believed. */
const PHASE_CONFIRM_FRAMES = 2;
/** Shortest credible time between two reps, in milliseconds. */
const MIN_REP_INTERVAL_MS = 600;
/** Weight of the newest sample in the exponential average. */
const SMOOTHING_ALPHA = 0.45;
const HISTORY_SIZE = 3;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * The lite pose model jitters by several degrees frame to frame. Raw angles
 * cross a threshold repeatedly during that jitter, which is the main source of
 * phantom reps. A short median filter kills single-frame spikes and the
 * exponential average smooths what is left, at the cost of ~2 frames of lag.
 */
function smoothAngle(state: AnalyzerState, raw: number) {
  const history = [...state.angleHistory, raw].slice(-HISTORY_SIZE);
  const filtered = history.length === HISTORY_SIZE ? median(history) : raw;
  const smoothed =
    state.smoothedAngle === null
      ? filtered
      : state.smoothedAngle + (filtered - state.smoothedAngle) * SMOOTHING_ALPHA;
  return { history, smoothed };
}

// ---------------------------------------------------------------------------
// Frame measurement
// ---------------------------------------------------------------------------

type Measurement = {
  primaryAngle: number;
  supportAngle: number;
  formScore: number;
  warning: string | null;
  liveCue: string | null;
};

function measure(kind: VisionKind, landmarks: Landmark2D[]): Measurement | null {
  switch (kind) {
    case "squat":
      return measureSquat(landmarks);
    case "lunge":
      return measureLunge(landmarks);
    case "pushup":
      return measurePushup(landmarks);
    case "glute_bridge":
      return measureGluteBridge(landmarks);
  }
}

function measureSquat(landmarks: Landmark2D[]): Measurement | null {
  const side = bestSide(landmarks, [L_HIP, L_KNEE, L_ANKLE], [R_HIP, R_KNEE, R_ANKLE]);
  const [hipIndex, kneeIndex, ankleIndex] = side;
  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];
  const shoulderL = landmarks[L_SHOULDER];
  const shoulderR = landmarks[R_SHOULDER];
  if (!visible(hip, knee, ankle) || !visible(shoulderL, shoulderR)) return null;

  const shoulder = midpoint(shoulderL, shoulderR);
  const kneeAngle = angleBetween(hip, knee, ankle);
  const hipAngle = angleBetween(shoulder, hip, knee);

  // Trunk angle away from vertical. Measured in 3D so it means the same thing
  // whether the camera is square-on, side-on, or somewhere in between.
  const lean = tiltFromVertical(shoulder, hip);

  let formScore = 100;
  let warning: string | null = null;
  let liveCue: string | null = null;

  // tan(42°) — past this the squat has become a good morning.
  if (lean > 0.9) {
    formScore -= 22;
    warning = "Chest dropping forward at the bottom of the squat.";
    liveCue = "Lift your chest — you are leaning too far forward.";
  }
  if (hipAngle < 55 && kneeAngle > 120) {
    formScore -= 12;
    warning = warning ?? "Hips folding before the knees bend.";
  }

  return { primaryAngle: kneeAngle, supportAngle: hipAngle, formScore: clamp(formScore, 40, 100), warning, liveCue };
}

function measureLunge(landmarks: Landmark2D[]): Measurement | null {
  const leftOk = visible(landmarks[L_HIP], landmarks[L_KNEE], landmarks[L_ANKLE]);
  const rightOk = visible(landmarks[R_HIP], landmarks[R_KNEE], landmarks[R_ANKLE]);
  if (!leftOk && !rightOk) return null;

  const angles: number[] = [];
  if (leftOk) angles.push(angleBetween(landmarks[L_HIP], landmarks[L_KNEE], landmarks[L_ANKLE]));
  if (rightOk) angles.push(angleBetween(landmarks[R_HIP], landmarks[R_KNEE], landmarks[R_ANKLE]));

  // The front (working) leg is the more bent one.
  const kneeAngle = Math.min(...angles);

  const shoulderL = landmarks[L_SHOULDER];
  const shoulderR = landmarks[R_SHOULDER];
  const hip = leftOk ? landmarks[L_HIP] : landmarks[R_HIP];
  if (!visible(shoulderL, shoulderR)) return null;
  const shoulder = midpoint(shoulderL, shoulderR);

  const lean = tiltFromVertical(shoulder, hip);

  let formScore = 100;
  let warning: string | null = null;
  let liveCue: string | null = null;
  // tan(25°) — a lunge should stay far more upright than a squat.
  if (lean > 0.47) {
    formScore -= 25;
    warning = "Torso tipping forward during the lunge.";
    liveCue = "Stay tall — keep your torso upright.";
  }

  return {
    primaryAngle: kneeAngle,
    supportAngle: angleBetween(shoulder, hip, leftOk ? landmarks[L_KNEE] : landmarks[R_KNEE]),
    formScore: clamp(formScore, 40, 100),
    warning,
    liveCue,
  };
}

function measurePushup(landmarks: Landmark2D[]): Measurement | null {
  const side = bestSide(landmarks, [L_SHOULDER, L_ELBOW, L_WRIST], [R_SHOULDER, R_ELBOW, R_WRIST]);
  const [shoulderIndex, elbowIndex, wristIndex] = side;
  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];
  if (!visible(shoulder, elbow, wrist)) return null;

  const elbowAngle = angleBetween(shoulder, elbow, wrist);

  // Body line: shoulder -> hip -> knee should be close to straight.
  const hip = shoulderIndex === L_SHOULDER ? landmarks[L_HIP] : landmarks[R_HIP];
  const knee = shoulderIndex === L_SHOULDER ? landmarks[L_KNEE] : landmarks[R_KNEE];
  let bodyLine = 180;
  if (visible(hip, knee)) {
    bodyLine = angleBetween(shoulder, hip, knee);
  }

  let formScore = 100;
  let warning: string | null = null;
  let liveCue: string | null = null;

  if (bodyLine < 155) {
    formScore -= 25;
    warning = "Hips sagging or piking out of line with the shoulders.";
    liveCue = "Squeeze your glutes — keep your body in one straight line.";
  } else if (bodyLine < 168) {
    formScore -= 10;
  }

  return { primaryAngle: elbowAngle, supportAngle: bodyLine, formScore: clamp(formScore, 40, 100), warning, liveCue };
}

function measureGluteBridge(landmarks: Landmark2D[]): Measurement | null {
  const side = bestSide(landmarks, [L_SHOULDER, L_HIP, L_KNEE], [R_SHOULDER, R_HIP, R_KNEE]);
  const [shoulderIndex, hipIndex, kneeIndex] = side;
  const shoulder = landmarks[shoulderIndex];
  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];
  if (!visible(shoulder, hip, knee)) return null;

  const hipAngle = angleBetween(shoulder, hip, knee);
  const ankle = shoulderIndex === L_SHOULDER ? landmarks[L_ANKLE] : landmarks[R_ANKLE];
  const kneeAngle = visible(ankle) ? angleBetween(hip, knee, ankle) : 90;

  let formScore = 100;
  let warning: string | null = null;
  let liveCue: string | null = null;

  // Feet too far from the hips turns the bridge into a hamstring pull.
  if (kneeAngle > 120) {
    formScore -= 18;
    warning = "Feet set too far from the hips.";
    liveCue = "Walk your heels closer to your hips.";
  }

  return { primaryAngle: hipAngle, supportAngle: kneeAngle, formScore: clamp(formScore, 40, 100), warning, liveCue };
}

// ---------------------------------------------------------------------------
// Rep state machine
// ---------------------------------------------------------------------------

function depthPercent(config: ExerciseConfig, angle: number) {
  const span = config.depthTo - config.depthFrom;
  if (!span) return 0;
  return Math.round(clamp(((angle - config.depthFrom) / span) * 100, 0, 100));
}

export type AnalyzerInput = {
  /** Normalised landmarks, used for visibility and for the drawn overlay. */
  landmarks?: Landmark2D[];
  /** Metric 3D landmarks. Preferred for every angle when present. */
  worldLandmarks?: Landmark2D[];
  /** Frame width / height, needed only when world landmarks are unavailable. */
  aspect?: number;
  /** Media or wall-clock time in ms, used to reject impossibly fast reps. */
  timestampMs?: number;
};

export function updateAnalyzer(previous: AnalyzerState, input: AnalyzerInput): AnalyzerSnapshot {
  const config = CONFIG[previous.kind];
  const framesTracked = previous.framesTracked + 1;
  const now = input.timestampMs ?? Date.now();

  const frame = resolveFrame(input.landmarks, input.worldLandmarks, input.aspect ?? 1);
  const reading = frame ? measure(previous.kind, frame) : null;
  if (!reading) {
    return {
      ...previous,
      framesTracked,
      // A dropped frame is not evidence about the phase, so the confirmation
      // counter resets rather than carrying a stale intent across the gap.
      pendingPhase: null,
      pendingFrames: 0,
      primaryAngle: null,
      supportAngle: null,
      depthPercent: 0,
      formScore: 0,
      cue: config.setupHint,
      tracking: false,
      repCompleted: false,
    };
  }

  const { history, smoothed } = smoothAngle(previous, reading.primaryAngle);
  const angle = Math.round(smoothed);

  const state: AnalyzerState = {
    ...previous,
    framesTracked,
    framesVisible: previous.framesVisible + 1,
    depthSamples: [...previous.depthSamples],
    formSamples: [...previous.formSamples],
    warnings: [...previous.warnings],
    angleHistory: history,
    smoothedAngle: smoothed,
  };

  let repCompleted = false;
  let cue = reading.liveCue ?? previous.lastCue;

  /**
   * A threshold crossing only counts once it has held for a couple of frames.
   * One noisy frame dipping past the line used to be enough to open — and then
   * bank — a rep the lifter never performed.
   */
  const confirm = (target: AnalyzerPhase, condition: boolean) => {
    if (!condition) {
      if (state.pendingPhase === target) {
        state.pendingPhase = null;
        state.pendingFrames = 0;
      }
      return false;
    }
    if (state.pendingPhase !== target) {
      state.pendingPhase = target;
      state.pendingFrames = 1;
    } else {
      state.pendingFrames += 1;
    }
    if (state.pendingFrames < PHASE_CONFIRM_FRAMES) return false;
    state.pendingPhase = null;
    state.pendingFrames = 0;
    return true;
  };

  const isContracted = confirm("contracted", angle <= config.contractedBelow);
  const isExtended = confirm("extended", angle >= config.extendedAbove);

  /**
   * Final gate before a rep is banked: it must cover enough range to be a real
   * repetition, and it must not arrive faster than a human can move. Reps that
   * fail either check still advance the phase — they were a real movement, just
   * not a countable one — and tell the lifter why.
   */
  const acceptRep = (achievedDepth: number) => {
    if (achievedDepth < config.minDepthPercent) {
      cue = "Not counted — go deeper through the full range.";
      return false;
    }
    if (state.lastRepAt !== null && now - state.lastRepAt < MIN_REP_INTERVAL_MS) {
      cue = "Slow down — control the movement and it will count.";
      return false;
    }
    state.lastRepAt = now;
    return true;
  };

  if (config.countAt === "return-to-extended") {
    // Track the deepest point reached during the descent.
    if (state.phase === "contracted") {
      state.peakAngle = Math.min(state.peakAngle, angle);
    }

    if (state.phase !== "contracted" && isContracted) {
      state.phase = "contracted";
      state.peakAngle = angle;
      cue = reading.liveCue ?? "Good depth — now drive back up.";
    } else if (state.phase === "contracted" && isExtended) {
      const achieved = depthPercent(config, state.peakAngle);
      state.phase = "extended";
      if (acceptRep(achieved)) {
        repCompleted = true;
        state.reps += 1;
        state.depthSamples.push(achieved);
        state.formSamples.push(reading.formScore);
        if (reading.warning) state.warnings.push(reading.warning);
        cue = `Rep ${state.reps} counted. Reset tall and go again.`;
      }
      state.peakAngle = 180;
    } else if (state.phase === "contracted") {
      cue = reading.liveCue ?? "Now press back to the top.";
    } else if (isExtended) {
      state.phase = "extended";
      cue = reading.liveCue ?? "Braced and tall — lower under control.";
    } else {
      cue = reading.liveCue ?? "Keep lowering — a little deeper.";
    }
  } else {
    // reach-extended: rep banks at the top of the lift (glute bridge).
    if (state.phase === "extended") {
      state.peakAngle = Math.max(state.peakAngle, angle);
    }

    if (state.phase !== "extended" && isExtended) {
      const achieved = depthPercent(config, angle);
      state.phase = "extended";
      state.peakAngle = angle;
      if (acceptRep(achieved)) {
        repCompleted = true;
        state.reps += 1;
        state.depthSamples.push(achieved);
        state.formSamples.push(reading.formScore);
        if (reading.warning) state.warnings.push(reading.warning);
        cue = `Rep ${state.reps} counted. Squeeze, then lower with control.`;
      }
    } else if (state.phase === "extended" && isContracted) {
      state.phase = "contracted";
      state.peakAngle = 0;
      cue = reading.liveCue ?? "Drive your hips back up.";
    } else if (state.phase === "extended") {
      cue = reading.liveCue ?? "Hold the squeeze at the top.";
    } else {
      cue = reading.liveCue ?? "Push your hips higher.";
    }
  }

  state.lastCue = cue;

  return {
    ...state,
    primaryAngle: angle,
    supportAngle: reading.supportAngle,
    depthPercent: depthPercent(config, angle),
    formScore: reading.formScore,
    cue,
    tracking: true,
    repCompleted,
  };
}

export function summarizeAnalysis(state: AnalyzerState): AnalysisSummary {
  const depth = state.depthSamples;
  const form = state.formSamples;

  const averageDepth = depth.length
    ? Math.round(depth.reduce((sum, value) => sum + value, 0) / depth.length)
    : 0;

  // Form score blends per-rep technique with range of motion, then penalises
  // repeated warnings. With no completed reps there is nothing to score.
  const averageForm = form.length
    ? form.reduce((sum, value) => sum + value, 0) / form.length
    : 0;

  const uniqueWarnings = Array.from(new Set(state.warnings));
  const penalty = Math.min(20, uniqueWarnings.length * 6);

  const formScore = form.length
    ? Math.round(clamp(averageForm * 0.7 + averageDepth * 0.3 - penalty, 30, 100))
    : 0;

  const trackingQuality = state.framesTracked
    ? Math.round((state.framesVisible / state.framesTracked) * 100)
    : 0;

  return {
    rep_count: state.reps,
    average_depth: averageDepth,
    form_score: formScore,
    form_warnings: uniqueWarnings.slice(0, 5),
    tracking_quality: trackingQuality,
  };
}

/** Human-readable verdict used by the video upload report. */
export function describeAnalysis(kind: VisionKind, summary: AnalysisSummary): string {
  if (summary.rep_count === 0) {
    return `No complete ${CONFIG[kind].label.toLowerCase()} reps were detected. ${CONFIG[kind].setupHint}`;
  }
  if (summary.form_score >= 85) {
    return `Strong technique. ${summary.rep_count} clean reps at an average ${summary.average_depth}% range of motion.`;
  }
  if (summary.form_score >= 70) {
    return `Solid work with room to tighten up. ${summary.rep_count} reps at an average ${summary.average_depth}% range of motion.`;
  }
  return `Technique needs attention before adding load or volume. ${summary.rep_count} reps at an average ${summary.average_depth}% range of motion.`;
}
