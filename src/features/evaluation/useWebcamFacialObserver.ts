/**
 * PARKLAB 3D — Opt-In Webcam & On-Device Visible Facial Cue Observer Hook
 *
 * Implements:
 * - Strict opt-in camera activation via `navigator.mediaDevices.getUserMedia({ video: true, audio: false })`
 *   ONLY when the user clicks "Enable Camera".
 * - Complete media track cleanup (`track.stop()`) on disable or unmount.
 * - Lightweight, throttled (~3 Hz / 350ms) on-device visible cue analysis using
 *   the Chromium `FaceDetector` API when available plus a tiny 64x48 offscreen
 *   canvas region analyzer (face presence, mouth-corner smile cue, brow/head movement,
 *   eye-region openness).
 *
 * PRIVACY & ETHICS GUARANTEES:
 * - Never activates automatically.
 * - Never stores or uploads webcam frames, images, or biometric templates.
 * - Treats visible cues as optional, uncertain surface signals; never diagnoses
 *   emotions, stress, frustration, or psychological states.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FacialCueKind, VisibleFacialCueState } from './crashRagTypes';

interface BrowserFaceDetectorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BrowserDetectedFace {
  boundingBox: BrowserFaceDetectorBox;
  landmarks?: Array<{
    type: string;
    locations: Array<{ x: number; y: number }>;
  }>;
}

interface BrowserFaceDetectorInstance {
  detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<BrowserDetectedFace[]>;
}

type BrowserFaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => BrowserFaceDetectorInstance;

const INITIAL_CUE_STATE: VisibleFacialCueState = {
  cameraActive: false,
  faceDetected: false,
  cueKind: 'camera-off',
  smileIndicator: 0,
  movementIndicator: 0,
  eyeOpennessIndicator: 0,
  detectorBackend: 'none',
  lastUpdatedMs: 0,
  uncertaintyNote:
    'Camera is off. Facial cues are optional and not required for crash coaching.',
};

const ANALYSIS_WIDTH = 64;
const ANALYSIS_HEIGHT = 48;
const ANALYSIS_INTERVAL_MS = 360;

export interface WebcamFacialObserverControls {
  cameraSupported: boolean;
  cameraActive: boolean;
  cameraLoading: boolean;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  facialCueState: VisibleFacialCueState;
  enableCamera: () => Promise<void>;
  disableCamera: () => void;
}

function isWarmSkinTonePixel(r: number, g: number, b: number): boolean {
  // Broad luminance-normalized chroma check across diverse skin tones & lighting
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luma < 32 || luma > 242) {
    return false;
  }
  return r > g * 0.92 && g >= b * 0.82 && maxC - minC >= 10;
}

export function useWebcamFacialObserver(): WebcamFacialObserverControls {
  const cameraSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facialCueState, setFacialCueState] =
    useState<VisibleFacialCueState>(INITIAL_CUE_STATE);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaGridRef = useRef<Float32Array | null>(null);
  const faceDetectorRef = useRef<BrowserFaceDetectorInstance | null>(null);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevLumaGridRef.current = null;
  }, []);

  const disableCamera = useCallback(() => {
    stopAllTracks();
    setCameraActive(false);
    setCameraLoading(false);
    setFacialCueState(INITIAL_CUE_STATE);
  }, [stopAllTracks]);

  const enableCamera = useCallback(async () => {
    if (!cameraSupported) {
      setCameraError(
        'Webcam API (navigator.mediaDevices.getUserMedia) is unavailable in this browser environment.'
      );
      return;
    }

    setCameraLoading(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      // Instantiate optional Chromium FaceDetector if supported
      if (typeof window !== 'undefined' && 'FaceDetector' in window) {
        try {
          const FaceDetectorCtor = (
            window as unknown as { FaceDetector: BrowserFaceDetectorConstructor }
          ).FaceDetector;
          faceDetectorRef.current = new FaceDetectorCtor({
            fastMode: true,
            maxDetectedFaces: 1,
          });
        } catch {
          faceDetectorRef.current = null;
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          // Autoplay handled once video element mounts
        });
      }

      setCameraActive(true);
      setCameraLoading(false);
      setFacialCueState({
        cameraActive: true,
        faceDetected: false,
        cueKind: 'no-face-detected',
        smileIndicator: 0,
        movementIndicator: 0,
        eyeOpennessIndicator: 0,
        detectorBackend: faceDetectorRef.current
          ? 'browser-face-detector'
          : 'canvas-pixel-cue',
        lastUpdatedMs: Date.now(),
        uncertaintyNote:
          'On-device visual cue observer active. Signals are approximate and never stored.',
      });
    } catch (err) {
      stopAllTracks();
      setCameraActive(false);
      setCameraLoading(false);
      const errName = err instanceof Error ? err.name : 'CameraError';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. You can continue driving with full RAG & Voice Coaching.'
        );
      } else if (errName === 'NotFoundError') {
        setCameraError(
          'No webcam device was found on this computer. Simulator and Voice Coach remain active.'
        );
      } else {
        setCameraError(
          `Could not access webcam (${errName}). Simulator and Voice Coach remain active.`
        );
      }
    }
  }, [cameraSupported, stopAllTracks]);

  // Attach stream if videoRef mounts after stream acquisition
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive]);

  // Throttled on-device facial cue sampling loop (~3 Hz)
  useEffect(() => {
    if (!cameraActive) {
      return;
    }

    if (!canvasRef.current && typeof document !== 'undefined') {
      const offscreen = document.createElement('canvas');
      offscreen.width = ANALYSIS_WIDTH;
      offscreen.height = ANALYSIS_HEIGHT;
      canvasRef.current = offscreen;
    }

    let cancelled = false;

    const analyzeFrame = async () => {
      if (cancelled) {
        return;
      }
      const videoEl = videoRef.current;
      const canvasEl = canvasRef.current;
      if (
        !videoEl ||
        !canvasEl ||
        videoEl.readyState < 2 ||
        videoEl.videoWidth === 0
      ) {
        return;
      }

      const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return;
      }

      ctx.drawImage(videoEl, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
      const imageData = ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
      const data = imageData.data;

      // 1. Check central face region for presence, movement, eye band & mouth curvature cues
      const currentLuma = new Float32Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT);
      let centralSkinPixels = 0;
      let centralTotalPixels = 0;
      let movementSum = 0;
      let upperEyeContrastSum = 0;
      let mouthCornerLiftSum = 0;

      const xMin = Math.floor(ANALYSIS_WIDTH * 0.24);
      const xMax = Math.floor(ANALYSIS_WIDTH * 0.76);
      const yMin = Math.floor(ANALYSIS_HEIGHT * 0.16);
      const yMax = Math.floor(ANALYSIS_HEIGHT * 0.84);

      const prevLuma = prevLumaGridRef.current;

      for (let y = 0; y < ANALYSIS_HEIGHT; y += 1) {
        for (let x = 0; x < ANALYSIS_WIDTH; x += 1) {
          const idx = y * ANALYSIS_WIDTH + x;
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          currentLuma[idx] = luma;

          if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
            centralTotalPixels += 1;
            if (isWarmSkinTonePixel(r, g, b)) {
              centralSkinPixels += 1;
            }
            if (prevLuma) {
              movementSum += Math.abs(luma - prevLuma[idx]);
            }
          }

          // Upper face / eye band vertical contrast (rows 32%..50%)
          if (
            y >= Math.floor(ANALYSIS_HEIGHT * 0.32) &&
            y <= Math.floor(ANALYSIS_HEIGHT * 0.5) &&
            x >= xMin &&
            x <= xMax &&
            y > 0
          ) {
            const aboveIdx = (y - 1) * ANALYSIS_WIDTH + x;
            upperEyeContrastSum += Math.abs(luma - currentLuma[aboveIdx]);
          }

          // Lower face / cheek & mouth-corner uplift cue (rows 58%..76%)
          if (
            y >= Math.floor(ANALYSIS_HEIGHT * 0.58) &&
            y <= Math.floor(ANALYSIS_HEIGHT * 0.76) &&
            x >= Math.floor(ANALYSIS_WIDTH * 0.32) &&
            x <= Math.floor(ANALYSIS_WIDTH * 0.68) &&
            x > 0
          ) {
            const leftIdx = y * ANALYSIS_WIDTH + (x - 1);
            mouthCornerLiftSum += Math.abs(luma - currentLuma[leftIdx]);
          }
        }
      }

      prevLumaGridRef.current = currentLuma;

      // Optional native FaceDetector check when available
      let nativeFaceFound: boolean | null = null;
      if (faceDetectorRef.current) {
        try {
          const faces = await faceDetectorRef.current.detect(canvasEl);
          nativeFaceFound = faces.length > 0;
        } catch {
          nativeFaceFound = null;
        }
      }

      const skinRatio =
        centralTotalPixels > 0 ? centralSkinPixels / centralTotalPixels : 0;
      const eyeOpennessIndicator = Math.min(
        1,
        Math.max(0, upperEyeContrastSum / (centralTotalPixels * 4.5))
      );
      const movementIndicator = prevLuma
        ? Math.min(1, Math.max(0, movementSum / (centralTotalPixels * 9.5)))
        : 0;
      const smileIndicator = Math.min(
        1,
        Math.max(0, mouthCornerLiftSum / (centralTotalPixels * 3.6))
      );

      const faceDetected =
        nativeFaceFound !== null
          ? nativeFaceFound
          : skinRatio >= 0.22 && eyeOpennessIndicator >= 0.14;

      let cueKind: FacialCueKind = 'no-face-detected';
      if (faceDetected) {
        if (movementIndicator >= 0.34) {
          cueKind = 'active-facial-movement';
        } else if (smileIndicator >= 0.42) {
          cueKind = 'smiling-cue';
        } else {
          cueKind = 'steady-neutral-posture';
        }
      }

      if (!cancelled) {
        setFacialCueState({
          cameraActive: true,
          faceDetected,
          cueKind,
          smileIndicator: Math.round(smileIndicator * 100) / 100,
          movementIndicator: Math.round(movementIndicator * 100) / 100,
          eyeOpennessIndicator: Math.round(eyeOpennessIndicator * 100) / 100,
          detectorBackend:
            nativeFaceFound !== null
              ? 'browser-face-detector'
              : 'canvas-pixel-cue',
          lastUpdatedMs: Date.now(),
          uncertaintyNote:
            'Visible surface cues are approximate on-device estimates and do not infer emotions. Zero frames are stored.',
        });
      }
    };

    const interval = window.setInterval(() => {
      void analyzeFrame();
    }, ANALYSIS_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [cameraActive]);

  // Ensure camera tracks are stopped when component unmounts
  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, [stopAllTracks]);

  return {
    cameraSupported,
    cameraActive,
    cameraLoading,
    cameraError,
    videoRef,
    facialCueState,
    enableCamera,
    disableCamera,
  };
}
