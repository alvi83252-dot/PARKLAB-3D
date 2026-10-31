/**
 * PARKLAB 3D — Completed-Challenge 3D Action Replay System
 *
 * Records the player's vehicle trajectory during a parking challenge and,
 * ONLY once the challenge is completed (passed), allows watching an interactive
 * 3D replay of the entire manoeuvre with timeline scrubbing, playback speeds
 * (0.5x, 1x, 2x), camera switching, and a 3D trajectory trail.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Film,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  Vec3,
  VehicleDefinition,
  VehicleDamageState,
} from '../../types/vehicle.types';
import {
  VehicleModel,
  createVehiclePartsRefs,
  type VehicleWheelRefs,
} from '../vehicles';
import { MPS_TO_MPH } from '../evaluation';

export interface ReplayFrame {
  /** Elapsed time in seconds from the start of the attempt */
  timeSec: number;
  position: Vec3;
  rotationY: number;
  speedMps: number;
  steeringAngle: number;
  isBraking: boolean;
  isReversing: boolean;
  isAirborne?: boolean;
  collisionCount: number;
  damage?: VehicleDamageState;
}

/**
 * Shortest-arc angular interpolation in radians.
 */
function lerpAngleRadians(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/**
 * Smoothly interpolates between recorded `ReplayFrame` samples at `targetTimeSec`.
 */
export function interpolateReplayFrame(
  frames: ReplayFrame[],
  targetTimeSec: number
): ReplayFrame {
  if (frames.length === 0) {
    return {
      timeSec: 0,
      position: [0, 0, 0],
      rotationY: 0,
      speedMps: 0,
      steeringAngle: 0,
      isBraking: false,
      isReversing: false,
      collisionCount: 0,
    };
  }

  if (frames.length === 1 || targetTimeSec <= frames[0].timeSec) {
    return frames[0];
  }

  const last = frames[frames.length - 1];
  if (targetTimeSec >= last.timeSec) {
    return last;
  }

  // Binary search for the bracketing frames
  let low = 0;
  let high = frames.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (frames[mid].timeSec < targetTimeSec) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const prevIdx = Math.max(0, low - 1);
  const nextIdx = Math.min(frames.length - 1, low);
  const f0 = frames[prevIdx];
  const f1 = frames[nextIdx];

  const span = f1.timeSec - f0.timeSec;
  const alpha = span > 0.0001 ? Math.max(0, Math.min(1, (targetTimeSec - f0.timeSec) / span)) : 0;

  return {
    timeSec: targetTimeSec,
    position: [
      f0.position[0] + (f1.position[0] - f0.position[0]) * alpha,
      f0.position[1] + (f1.position[1] - f0.position[1]) * alpha,
      f0.position[2] + (f1.position[2] - f0.position[2]) * alpha,
    ],
    rotationY: lerpAngleRadians(f0.rotationY, f1.rotationY, alpha),
    speedMps: f0.speedMps + (f1.speedMps - f0.speedMps) * alpha,
    steeringAngle:
      f0.steeringAngle + (f1.steeringAngle - f0.steeringAngle) * alpha,
    isBraking: alpha < 0.5 ? f0.isBraking : f1.isBraking,
    isReversing: alpha < 0.5 ? f0.isReversing : f1.isReversing,
    isAirborne: alpha < 0.5 ? f0.isAirborne : f1.isAirborne,
    collisionCount: alpha < 0.5 ? f0.collisionCount : f1.collisionCount,
    damage: alpha < 0.5 ? f0.damage : f1.damage,
  };
}

export interface ReplaySceneActorProps {
  vehicle: VehicleDefinition;
  frames: ReplayFrame[];
  currentFrame: ReplayFrame;
}

/**
 * 3D Scene Actor rendered inside `<Canvas>` during a completed-challenge replay.
 * Renders the 3D vehicle at the interpolated replay transform plus a 3D trajectory path
 * showing the exact forward & reverse line driven by the player.
 */
export const ReplaySceneActor: React.FC<ReplaySceneActorProps> = ({
  vehicle,
  frames,
  currentFrame,
}) => {
  const wheelRefs = useRef<VehicleWheelRefs>(createVehiclePartsRefs());

  useEffect(() => {
    if (wheelRefs.current.frontLeftSteer) {
      wheelRefs.current.frontLeftSteer.rotation.y = currentFrame.steeringAngle;
    }
    if (wheelRefs.current.frontRightSteer) {
      wheelRefs.current.frontRightSteer.rotation.y = currentFrame.steeringAngle;
    }
  }, [currentFrame.steeringAngle]);

  const pathPoints = useMemo<[number, number, number][]>(() => {
    if (frames.length < 2) return [];
    const pts: [number, number, number][] = [];
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      if (
        pts.length === 0 ||
        Math.hypot(
          f.position[0] - pts[pts.length - 1][0],
          f.position[2] - pts[pts.length - 1][2]
        ) >= 0.25 ||
        i === frames.length - 1
      ) {
        pts.push([f.position[0], Math.max(0.06, f.position[1] + 0.06), f.position[2]]);
      }
    }
    return pts;
  }, [frames]);

  return (
    <group name="challenge-replay-actor">
      {/* 3D Trajectory Line showing the exact path driven during the completed challenge */}
      {pathPoints.length >= 2 && (
        <Line
          points={pathPoints}
          color="#38bdf8"
          lineWidth={2.6}
          dashed={false}
          transparent
          opacity={0.78}
        />
      )}

      {/* Interpolated 3D Player Vehicle */}
      <group
        position={currentFrame.position}
        rotation={[0, currentFrame.rotationY, 0]}
      >
        <VehicleModel
          vehicle={vehicle}
          wheelRefs={wheelRefs}
          damageState={currentFrame.damage}
        />
      </group>
    </group>
  );
};

export interface ReplayControlsOverlayProps {
  challengeTitle: string;
  vehicleName: string;
  currentFrame: ReplayFrame;
  currentTimeSec: number;
  totalDurationSec: number;
  isPlaying: boolean;
  playbackRate: number;
  cameraMode: string;
  onTogglePlay: () => void;
  onSeek: (timeSec: number) => void;
  onRestartReplay: () => void;
  onChangePlaybackRate: (rate: number) => void;
  onToggleCamera: () => void;
  onExitReplay: () => void;
  onNextChallenge: () => void;
}

export const ReplayControlsOverlay: React.FC<ReplayControlsOverlayProps> = ({
  challengeTitle,
  vehicleName,
  currentFrame,
  currentTimeSec,
  totalDurationSec,
  isPlaying,
  playbackRate,
  cameraMode,
  onTogglePlay,
  onSeek,
  onRestartReplay,
  onChangePlaybackRate,
  onToggleCamera,
  onExitReplay,
  onNextChallenge,
}) => {
  const mph = (Math.abs(currentFrame.speedMps) * MPS_TO_MPH).toFixed(1);
  const gearLabel =
    Math.abs(currentFrame.speedMps) <= 0.08
      ? 'P · STOP'
      : currentFrame.speedMps < -0.05
        ? 'R · REV'
        : 'D · FWD';

  const safeDuration = Math.max(0.1, totalDurationSec);

  return (
    <div
      className="pk-replay-overlay"
      role="region"
      aria-label="Completed Challenge Action Replay Controls"
    >
      {/* Top Replay Banner */}
      <div className="pk-replay-top">
        <div className="pk-replay-badge-group">
          <span className="pk-replay-live-pill">
            <span className="pk-replay-live-dot" aria-hidden="true" />
            <Film size={13} aria-hidden="true" />
            <span>CHALLENGE COMPLETED · ACTION REPLAY</span>
          </span>
          <span className="pk-replay-meta-title">
            {challengeTitle} · {vehicleName}
          </span>
        </div>

        <div className="pk-replay-telemetry-strip">
          <span className="pk-replay-stat">
            SPEED <strong>{mph} mph</strong>
          </span>
          <span className="pk-replay-stat">
            GEAR <strong>{gearLabel}</strong>
          </span>
          <span className="pk-replay-stat">
            STEER{' '}
            <strong>
              {Math.round((currentFrame.steeringAngle * 180) / Math.PI)}°
            </strong>
          </span>
        </div>
      </div>

      {/* Bottom Interactive Timeline Scrubber & Transport Controls */}
      <div className="pk-replay-dock">
        <div className="pk-replay-scrubber-row">
          <span className="pk-replay-time">
            {currentTimeSec.toFixed(1)}s
          </span>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.05}
            value={Math.min(currentTimeSec, safeDuration)}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="pk-replay-slider"
            aria-label="Replay Timeline Scrubber"
          />
          <span className="pk-replay-time">
            {safeDuration.toFixed(1)}s
          </span>
        </div>

        <div className="pk-replay-controls-row">
          {/* Left: Play/Pause, Restart, Speed Multipliers */}
          <div className="pk-replay-transport">
            <button
              type="button"
              className="pk-btn pk-btn--primary pk-replay-play-btn"
              onClick={onTogglePlay}
            >
              {isPlaying ? (
                <>
                  <Pause size={14} aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={14} aria-hidden="true" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onRestartReplay}
              title="Restart Replay from 0.0s"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Restart</span>
            </button>

            <div
              className="pk-replay-speed-group"
              role="group"
              aria-label="Replay Playback Speed"
            >
              {[0.5, 1, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={`pk-replay-speed-chip ${
                    playbackRate === rate ? 'is-active' : ''
                  }`}
                  onClick={() => onChangePlaybackRate(rate)}
                >
                  {rate}×
                </button>
              ))}
            </div>
          </div>

          {/* Right: Camera Toggle, Back to Assessment Results, Next Challenge */}
          <div className="pk-replay-actions">
            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onToggleCamera}
            >
              <Camera size={14} aria-hidden="true" />
              <span>
                View: {cameraMode === 'overhead' ? 'Overhead' : 'Chase'}
              </span>
            </button>

            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onExitReplay}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back to Results</span>
            </button>

            <button
              type="button"
              className="pk-btn pk-btn--primary"
              onClick={onNextChallenge}
            >
              <span>Next Challenge</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
