import type { Landmark2D } from "@/lib/vision/exercise-analyzers";

/**
 * Shared MediaPipe Pose Landmarker loading.
 *
 * The WASM bundle is pinned to the installed package version rather than
 * `@latest`, so the JavaScript and WebAssembly halves can never drift apart
 * and break tracking after an upstream release.
 */
const TASKS_VISION_VERSION = "1.0.1";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export type RunningMode = "VIDEO" | "IMAGE";

export type PoseLandmarkerLike = {
  detectForVideo: (
    source: HTMLVideoElement,
    timestampMs: number
  ) => { landmarks?: Landmark2D[][] };
  close: () => void;
};

/** Skeleton edges drawn on the overlay. */
export const POSE_CONNECTORS: Array<[number, number]> = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 31], [28, 32],
  [11, 13], [13, 15], [12, 14], [14, 16],
];

export async function createPoseLandmarker(
  delegate: "GPU" | "CPU" = "GPU"
): Promise<PoseLandmarkerLike> {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT);

  const landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return landmarker as unknown as PoseLandmarkerLike;
}

/** GPU delegate is unavailable on some devices; fall back rather than fail. */
export async function createPoseLandmarkerWithFallback(): Promise<PoseLandmarkerLike> {
  try {
    return await createPoseLandmarker("GPU");
  } catch {
    return await createPoseLandmarker("CPU");
  }
}

export function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark2D[] | undefined,
  options: { good: boolean } = { good: true }
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;

  const stroke = options.good ? "rgba(52, 211, 153, 0.9)" : "rgba(251, 146, 60, 0.95)";
  context.lineWidth = Math.max(3, canvas.width / 220);
  context.strokeStyle = stroke;
  context.fillStyle = "rgba(226, 232, 240, 0.95)";

  POSE_CONNECTORS.forEach(([start, end]) => {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b) return;
    if ((a.visibility ?? 1) < 0.4 || (b.visibility ?? 1) < 0.4) return;
    context.beginPath();
    context.moveTo(a.x * canvas.width, a.y * canvas.height);
    context.lineTo(b.x * canvas.width, b.y * canvas.height);
    context.stroke();
  });

  const radius = Math.max(3, canvas.width / 320);
  landmarks.forEach((point, index) => {
    // Skip the dense facial mesh; it adds noise without helping form feedback.
    if (index > 0 && index < 11) return;
    if ((point.visibility ?? 1) < 0.4) return;
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, radius, 0, Math.PI * 2);
    context.fill();
  });
}
