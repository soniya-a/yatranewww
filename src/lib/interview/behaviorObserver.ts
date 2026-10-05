import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface BehaviorLog {
  timestamp: number;
  marker: string;
  confidence: number;
}

export class BehaviorObserver {
  private faceLandmarker: FaceLandmarker | null = null;
  private isRunning = false;
  private onLog?: (log: BehaviorLog) => void;
  private lastVideoTime = -1;

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
        numFaces: 1
      });
      console.log("MediaPipe FaceLandmarker initialized");
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
      let startTimeMs = performance.now();
      if (this.lastVideoTime !== videoElement.currentTime) {
        const result = this.faceLandmarker.detectForVideo(videoElement, startTimeMs);
        this.lastVideoTime = videoElement.currentTime;

        if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
          const blendshapes = result.faceBlendshapes[0].categories;
          
          // Detect specific behaviors from blendshapes
          // e.g. looking left/right
          const eyeLookOutLeft = blendshapes.find(b => b.categoryName === "eyeLookOutLeft")?.score || 0;
          const eyeLookOutRight = blendshapes.find(b => b.categoryName === "eyeLookOutRight")?.score || 0;
          
          if (eyeLookOutLeft > 0.6) {
            this.logBehavior("HEAD_LEFT", eyeLookOutLeft);
          } else if (eyeLookOutRight > 0.6) {
            this.logBehavior("HEAD_RIGHT", eyeLookOutRight);
          }
        }
      }
    }

    requestAnimationFrame(() => this.observeLoop(videoElement));
  }

  private logBehavior(marker: string, confidence: number) {
    if (this.onLog) {
      this.onLog({
        timestamp: Date.now(),
        marker,
        confidence
      });
    }
  }
}
