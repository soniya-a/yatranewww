import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface BehaviorLog {
  timestamp: number;
  marker: string;
  confidence: number;
  durationMs?: number;
  details?: string;
}

export class BehaviorObserver {
  private faceLandmarker: FaceLandmarker | null = null;
  private isRunning = false;
  private onLog?: (log: BehaviorLog) => void;
  private lastVideoTime = -1;
  private lastLogByMarker: Record<string, number> = {};
  private faceMissingSince: number | null = null;

  constructor(onLog?: (log: BehaviorLog) => void) {
    this.onLog = onLog;
  }

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
      );
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 2
      });
      console.log("MediaPipe FaceLandmarker initialized (numFaces: 2)");
    } catch (error) {
      console.error("Failed to initialize MediaPipe", error);
    }
  }

  startObserving(videoElement: HTMLVideoElement) {
    if (!this.faceLandmarker) {
      console.warn("FaceLandmarker not initialized");
      return;
    }
    this.isRunning = true;
    this.observeLoop(videoElement);
  }

  stopObserving() {
    this.isRunning = false;
  }

  private async observeLoop(videoElement: HTMLVideoElement) {
    if (!this.isRunning || !this.faceLandmarker) return;

    if (videoElement.readyState >= 2) {
      const startTimeMs = performance.now();
      if (this.lastVideoTime !== videoElement.currentTime) {
        const result = this.faceLandmarker.detectForVideo(videoElement, startTimeMs);
        this.lastVideoTime = videoElement.currentTime;
        const faceCount = result.faceLandmarks ? result.faceLandmarks.length : 0;
        const now = Date.now();

        if (faceCount === 0) {
          if (!this.faceMissingSince) {
            this.faceMissingSince = now;
          }
          // Log FACE_MISSING if missing for >= 2 seconds (debounced every 3s)
          const missingDur = now - this.faceMissingSince;
          if (missingDur >= 2000) {
            this.logBehavior("FACE_MISSING", 1.0, 3000, missingDur, "No face detected in camera frame");
          }
        } else {
          if (this.faceMissingSince) {
            const recoveredAfter = now - this.faceMissingSince;
            if (recoveredAfter >= 2000) {
              this.logBehavior("FACE_RESTORED", 1.0, 500, recoveredAfter, `Face returned to frame after ${Math.round(recoveredAfter / 1000)}s`);
            }
            this.faceMissingSince = null;
          }

          // Log periodic FACE_PRESENT heartbeat every 5 seconds
          this.logBehavior("FACE_PRESENT", 0.98, 5000, undefined, "Single face verified in frame");

          if (faceCount > 1) {
            this.logBehavior("MULTIPLE_FACES", 0.95, 3000, undefined, `${faceCount} faces detected simultaneously in camera frame`);
          }

          if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
            const blendshapes = result.faceBlendshapes[0].categories;
            const eyeLookOutLeft = blendshapes.find(b => b.categoryName === "eyeLookOutLeft")?.score || 0;
            const eyeLookOutRight = blendshapes.find(b => b.categoryName === "eyeLookOutRight")?.score || 0;

            if (eyeLookOutLeft > 0.65) {
              this.logBehavior("HEAD_LEFT", eyeLookOutLeft, 2500, undefined, "Observed gaze/head shift left (normal movement telemetry)");
            } else if (eyeLookOutRight > 0.65) {
              this.logBehavior("HEAD_RIGHT", eyeLookOutRight, 2500, undefined, "Observed gaze/head shift right (normal movement telemetry)");
            }
          }
        }
      }
    }

    requestAnimationFrame(() => this.observeLoop(videoElement));
  }

  private logBehavior(marker: string, confidence: number, debounceMs = 2000, durationMs?: number, details?: string) {
    const now = Date.now();
    const last = this.lastLogByMarker[marker] || 0;
    if (now - last < debounceMs) return;
    this.lastLogByMarker[marker] = now;
    if (this.onLog) {
      this.onLog({
        timestamp: now,
        marker,
        confidence,
        durationMs,
        details
      });
    }
  }
}
