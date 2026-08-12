export type Landmark2D = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type RepCounterState = {
  phase: "up" | "down";
  reps: number;
  deepestKneeAngle: number;
  depthSamples: number[];
  formWarnings: string[];
  lastCue: string;
};

export type RepFrameMetrics = {
  kneeAngle: number | null;
  hipAngle: number | null;
  depthPercent: number;
  formScore: number;
  cue: string;
};

export type RepCounterSnapshot = RepCounterState & RepFrameMetrics;

const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

export function createRepCounterState(): RepCounterState {
  return {
    phase: "up",
    reps: 0,
    deepestKneeAngle: 180,
    depthSamples: [],
    formWarnings: [],
    lastCue: "Stand side-on or front-on, then start moving when landmarks lock on.",
  };
}

function midpoint(a: Landmark2D, b: Landmark2D): Landmark2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

function hasVisibility(...points: Landmark2D[]) {
  return points.every((point) => (point.visibility ?? 1) > 0.45);
}

export function angleBetween(a: Landmark2D, b: Landmark2D, c: Landmark2D): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const abLength = Math.hypot(ab.x, ab.y);
  const cbLength = Math.hypot(cb.x, cb.y);
  if (!abLength || !cbLength) return 180;
  const cosine = Math.min(1, Math.max(-1, dot / (abLength * cbLength)));
  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

function scoreForm(kneeAngle: number, hipAngle: number, torsoLean: number) {
  let score = 100;
  if (kneeAngle > 115) score -= 18;
  if (hipAngle > 145) score -= 14;
  if (torsoLean > 0.16) score -= 18;
  return Math.max(45, Math.min(100, score));
}

export function updateSquatCounter(previous: RepCounterState, landmarks: Landmark2D[]): RepCounterSnapshot {
  const left = [landmarks[LEFT_HIP], landmarks[LEFT_KNEE], landmarks[LEFT_ANKLE]];
  const right = [landmarks[RIGHT_HIP], landmarks[RIGHT_KNEE], landmarks[RIGHT_ANKLE]];
  const shoulders = [landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]];

  if (!left.every(Boolean) || !right.every(Boolean) || !shoulders.every(Boolean)) {
    return { ...previous, kneeAngle: null, hipAngle: null, depthPercent: 0, formScore: 0, cue: "Step into frame so your hips, knees, and ankles are visible." };
  }

  const side = hasVisibility(...left) ? left : right;
  const [hip, knee, ankle] = side;
  const shoulder = midpoint(shoulders[0], shoulders[1]);
  const kneeAngle = angleBetween(hip, knee, ankle);
  const hipAngle = angleBetween(shoulder, hip, knee);
  const torsoLean = Math.abs(shoulder.x - hip.x);
  const depthPercent = Math.round(Math.max(0, Math.min(100, ((170 - kneeAngle) / 80) * 100)));
  const formScore = scoreForm(kneeAngle, hipAngle, torsoLean);

  let phase = previous.phase;
  let reps = previous.reps;
  let deepestKneeAngle = Math.min(previous.deepestKneeAngle, kneeAngle);
  const depthSamples = previous.depthSamples;
  const formWarnings = previous.formWarnings;
  let cue = previous.lastCue;

  if (previous.phase === "up" && kneeAngle < 112) {
    phase = "down";
    deepestKneeAngle = kneeAngle;
    cue = "Good depth. Drive through your heels to stand tall.";
  } else if (previous.phase === "down") {
    deepestKneeAngle = Math.min(previous.deepestKneeAngle, kneeAngle);
    if (kneeAngle > 158) {
      reps += 1;
      phase = "up";
      depthSamples.push(Math.round(Math.max(0, Math.min(100, ((170 - deepestKneeAngle) / 80) * 100))));
      if (formScore < 75) formWarnings.push("Keep chest tall and control knee tracking.");
      cue = `Rep ${reps} counted. Reset tall before the next one.`;
      deepestKneeAngle = 180;
    } else {
      cue = kneeAngle < 95 ? "Strong depth — keep the torso controlled." : "Sink a little lower, then stand tall.";
    }
  } else {
    cue = "Stand tall, brace, then lower under control.";
  }

  return {
    phase,
    reps,
    deepestKneeAngle,
    depthSamples: depthSamples.slice(-80),
    formWarnings: formWarnings.slice(-20),
    lastCue: cue,
    kneeAngle,
    hipAngle,
    depthPercent,
    formScore,
    cue,
  };
}

export function summarizeRepCounter(state: RepCounterState) {
  const samples = state.depthSamples;
  const averageDepth = samples.length ? Math.round(samples.reduce((sum, sample) => sum + sample, 0) / samples.length) : 0;
  const penalty = Math.min(30, state.formWarnings.length * 4);
  return {
    rep_count: state.reps,
    average_depth: averageDepth,
    form_score: Math.max(50, Math.min(100, averageDepth ? averageDepth - penalty : 70)),
    form_warnings: Array.from(new Set(state.formWarnings)).slice(0, 5),
  };
}
