/**
 * PARKLAB 3D — Persistent Attempt Replay Recorder & Storage Engine
 *
 * Records full vehicle trajectory frames and collision markers during each
 * manual driving attempt, and automatically saves replays to localStorage
 * (`parklab3d:saved-replays:v1`) whenever the player completes (evaluates)
 * or quits/retries a challenge.
 */

import type {
  ChallengeId,
  ObstacleDefinition,
  ParkingTarget,
  Vec3,
  VehicleDimensions,
} from '../challenges/types';

export const REPLAY_STORAGE_KEY = 'parklab3d:saved-replays:v1';
const MAX_SAVED_REPLAYS = 20;
const MAX_FRAMES_PER_REPLAY = 600; // ~60s at 10 Hz

export interface ReplayKeyframe {
  t: number; // Elapsed seconds from attempt start
  x: number;
  z: number;
  rotY: number;
  speedMph: number;
  steerDeg: number;
  rev: boolean;
  brk: boolean;
}

export interface ReplayCrashMarker {
  t: number;
  x: number;
  z: number;
  obstacleId: string;
  obstacleLabel: string;
}

export interface SavedAttemptReplay {
  replayId: string;
  attemptNumber: number;
  challengeId: ChallengeId;
  challengeTitle: string;
  vehicleId: string;
  vehicleName: string;
  vehicleColor: string;
  vehicleDimensions: VehicleDimensions;
  parkingTarget: ParkingTarget;
  obstacles: ObstacleDefinition[];
  savedAtIso: string;
  outcome: 'passed' | 'try-again' | 'quit-or-retried';
  score: number | null;
  stars: 0 | 1 | 2 | 3 | null;
  collisionCount: number;
  durationSeconds: number;
  frames: ReplayKeyframe[];
  crashMarkers: ReplayCrashMarker[];
}

interface ReplayStorePayload {
  version: 1;
  replays: SavedAttemptReplay[];
}

let inMemoryReplaysFallback: SavedAttemptReplay[] = [];

export function loadSavedReplays(): SavedAttemptReplay[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [...inMemoryReplaysFallback];
  }
  try {
    const raw = window.localStorage.getItem(REPLAY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Partial<ReplayStorePayload>;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.replays)) {
      inMemoryReplaysFallback = parsed.replays;
      return parsed.replays;
    }
    return [];
  } catch {
    return [...inMemoryReplaysFallback];
  }
}

export function saveAttemptReplay(
  replay: SavedAttemptReplay
): SavedAttemptReplay[] {
  if (replay.frames.length < 2) {
    return loadSavedReplays();
  }

  const existing = loadSavedReplays().filter(
    (r) => r.replayId !== replay.replayId
  );

  // Downsample frames if exceeding MAX_FRAMES_PER_REPLAY
  let compactFrames = replay.frames;
  if (compactFrames.length > MAX_FRAMES_PER_REPLAY) {
    const stride = compactFrames.length / MAX_FRAMES_PER_REPLAY;
    const sampled: ReplayKeyframe[] = [];
    for (let i = 0; i < MAX_FRAMES_PER_REPLAY - 1; i += 1) {
      sampled.push(compactFrames[Math.floor(i * stride)]);
    }
    sampled.push(compactFrames[compactFrames.length - 1]);
    compactFrames = sampled;
  }

  const normalizedReplay: SavedAttemptReplay = {
    ...replay,
    frames: compactFrames,
  };

  // Newest first, capped at MAX_SAVED_REPLAYS
  const updated = [normalizedReplay, ...existing].slice(0, MAX_SAVED_REPLAYS);
  inMemoryReplaysFallback = updated;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const payload: ReplayStorePayload = {
        version: 1,
        replays: updated,
      };
      window.localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // If quota is tight, keep the 8 most recent replays
      try {
        const trimmed = updated.slice(0, 8);
        window.localStorage.setItem(
          REPLAY_STORAGE_KEY,
          JSON.stringify({ version: 1, replays: trimmed })
        );
      } catch {
        // Fallback to in-memory
      }
    }
  }

  return updated;
}

export function deleteSavedReplay(replayId: string): SavedAttemptReplay[] {
  const updated = loadSavedReplays().filter((r) => r.replayId !== replayId);
  inMemoryReplaysFallback = updated;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        REPLAY_STORAGE_KEY,
        JSON.stringify({ version: 1, replays: updated })
      );
    } catch {
      // Ignore
    }
  }
  return updated;
}

export function clearAllSavedReplays(): SavedAttemptReplay[] {
  inMemoryReplaysFallback = [];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(REPLAY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  return [];
}

export function createReplayKeyframe(params: {
  elapsedSeconds: number;
  position: Vec3;
  rotationY: number;
  speedMph: number;
  steeringDeg: number;
  isReversing: boolean;
  isBraking: boolean;
}): ReplayKeyframe {
  return {
    t: Math.round(params.elapsedSeconds * 100) / 100,
    x: Math.round(params.position[0] * 100) / 100,
    z: Math.round(params.position[2] * 100) / 100,
    rotY: Math.round(params.rotationY * 1000) / 1000,
    speedMph: Math.round(params.speedMph * 10) / 10,
    steerDeg: Math.round(params.steeringDeg * 10) / 10,
    rev: params.isReversing,
    brk: params.isBraking,
  };
}
