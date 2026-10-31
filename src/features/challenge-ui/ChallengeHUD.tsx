/**
 * PARKLAB 3D — ChallengeHUD Component
 *
 * Non-obstructive 3D gameplay heads-up display showing:
 * - Current challenge title, difficulty badge, attempt number, and live progress bar.
 * - Speedometer in mph (converted from m/s) + drive direction indicator.
 * - Live spatial telemetry (bay distance, heading error, collisions, time).
 * - Step-by-step manoeuvre instructions.
 * - Keyboard driving controls reference and optional integration triggers.
 * - Live RAG AI Crash Coach panel (`CrashFeedbackPanel`) when a collision occurs.
 */

import { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  RotateCcw,
} from 'lucide-react';
import {
  MPS_TO_MPH,
  computeFootprintContainment,
  normalizeAngleRadians,
} from '../evaluation/evaluateParking';
import type { AICrashFeedbackReport } from '../evaluation/crashRagTypes';
import type {
  ParkingAttemptMetrics,
  ParkingChallengeDefinition,
  VehicleDefinition,
  VehicleDimensions,
  VehicleRuntimeState,
} from '../challenges/types';
import { CrashFeedbackPanel } from './CrashFeedbackPanel';
import { MobileThumbstick } from './MobileThumbstick';
import './challenge-ui.css';

const DEFAULT_VEHICLE_DIMENSIONS: VehicleDimensions = {
  width: 1.82,
  height: 1.46,
  length: 4.5,
};

export interface ChallengeHUDProps {
  /** Active parking challenge definition */
  challenge: ParkingChallengeDefinition;
  /** Current runtime state from the vehicle physics controller */
  vehicleState: VehicleRuntimeState;
  /** Optional selected vehicle definition for exact 4-corner live containment */
  vehicle?: VehicleDefinition;
  /** Optional attempt metrics (elapsed time, collisions, corrections) */
  metrics?: Partial<ParkingAttemptMetrics>;
  /** Optional current camera mode ('follow' | 'overhead') */
  cameraMode?: 'follow' | 'overhead' | string;
  /** Optional current attempt number on this challenge */
  attemptNumber?: number;
  /** Optional active RAG crash coaching report */
  activeCrashReport?: AICrashFeedbackReport | null;
  /** Optional indicator when the voice coach is actively speaking */
  isVoiceSpeaking?: boolean;
  /** Optional callback to trigger parking evaluation from the HUD */
  onEvaluate?: () => void;
  /** Optional callback to reset/retry the current attempt */
  onReset?: () => void;
  /** Optional callback to toggle camera view */
  onToggleCamera?: () => void;
  /** Optional callback to dismiss the active crash report */
  onDismissCrashReport?: () => void;
  /** Optional callback to replay the spoken crash coaching */
  onReplayCrashVoice?: () => void;
  /** Optional callback to stop spoken crash coaching */
  onStopCrashVoice?: () => void;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const rem = safeSeconds - mins * 60;
  if (mins > 0) {
    return `${mins}:${rem.toFixed(1).padStart(4, '0')}`;
  }
  return `${rem.toFixed(1)}s`;
}

export function ChallengeHUD({
  challenge,
  vehicleState,
  vehicle,
  metrics,
  cameraMode,
  attemptNumber,
  activeCrashReport,
  isVoiceSpeaking = false,
  onEvaluate,
  onReset,
  onToggleCamera,
  onDismissCrashReport,
  onReplayCrashVoice,
  onStopCrashVoice,
}: ChallengeHUDProps) {
  const isMobileViewport =
    typeof window !== 'undefined' && window.innerWidth <= 640;
  const [missionMinimized, setMissionMinimized] =
    useState<boolean>(isMobileViewport);
  const [instructionsExpanded, setInstructionsExpanded] = useState<boolean>(
    !isMobileViewport
  );

  // Convert m/s to mph
  const rawMph = Math.abs(vehicleState.speedMps) * MPS_TO_MPH;
  const displayMph = rawMph < 0.15 ? '0.0' : rawMph.toFixed(1);

  // Determine gear / movement badge
  const isStationary =
    !vehicleState.isMoving && Math.abs(vehicleState.speedMps) <= 0.08;
  const gearLabel = isStationary
    ? 'STOP'
    : vehicleState.speedMps < -0.05
      ? 'REV'
      : 'FWD';
  const gearModifier = isStationary
    ? 'stop'
    : vehicleState.speedMps < -0.05
      ? 'rev'
      : 'fwd';

  // Live footprint & alignment telemetry
  const dimensions = vehicle?.dimensions ?? DEFAULT_VEHICLE_DIMENSIONS;
  const containment = computeFootprintContainment(
    challenge.parkingTarget,
    dimensions,
    vehicleState.position,
    vehicleState.rotationY
  );

  const headingDiffDeg = Math.abs(
    (normalizeAngleRadians(
      vehicleState.rotationY - challenge.parkingTarget.rotationY
    ) *
      180) /
      Math.PI
  );

  // Compute progress percentage from spawn distance to target bay
  const initialSpawnDist = Math.max(
    1,
    Math.hypot(
      challenge.spawnPosition[0] - challenge.parkingTarget.position[0],
      challenge.spawnPosition[2] - challenge.parkingTarget.position[2]
    )
  );
  const proximityRatio = Math.max(
    0,
    Math.min(1, 1 - containment.euclideanPositionErrorMeters / initialSpawnDist)
  );
  const cornerRatio = containment.cornersInsideCount / 4;
  const progressPercent = containment.allCornersInside
    ? isStationary && headingDiffDeg <= 10
      ? 100
      : 92
    : Math.round(proximityRatio * 65 + cornerRatio * 30);

  const statusState =
    containment.allCornersInside && isStationary && headingDiffDeg <= 10
      ? { label: 'READY TO ASSESS', modifier: 'ready' }
      : containment.cornersInsideCount > 0 ||
          containment.euclideanPositionErrorMeters < 3.0
        ? {
            label: `${containment.cornersInsideCount}/4 CORNERS IN BAY`,
            modifier: 'aligning',
          }
        : { label: 'APPROACHING BAY', modifier: 'approaching' };

  const collisionCount = Math.max(
    vehicleState.collisionCount,
    metrics?.collisions ?? 0
  );
  const elapsedSeconds = metrics?.elapsedSeconds ?? 0;
  const corrections = metrics?.corrections ?? 0;

  return (
    <aside className="pk-hud" aria-label="Driving Simulation HUD">
      {/* Top-Left: Active Challenge & Live Progress (Minimizable on iPhone/Mobile) */}
      <div
        className={`pk-hud__panel pk-hud__mission ${
          missionMinimized ? 'pk-hud__mission--minimized' : ''
        }`}
      >
        <div className="pk-hud__mission-top">
          <span className="pk-hud__label">
            {missionMinimized
              ? `${challenge.title} (${progressPercent}%)`
              : `Active Manoeuvre${attemptNumber ? ` · #${attemptNumber}` : ''}`}
          </span>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            {missionMinimized && onEvaluate && (
              <button
                type="button"
                className="pk-hud__toggle-btn"
                onClick={onEvaluate}
                style={{ color: '#34d399', borderColor: 'rgba(16,185,129,0.4)' }}
              >
                Assess
              </button>
            )}
            <button
              type="button"
              className="pk-hud__toggle-btn"
              onClick={() => setMissionMinimized((prev) => !prev)}
              aria-expanded={!missionMinimized}
              title={
                missionMinimized
                  ? 'Expand Active Manoeuvre panel'
                  : 'Minimize Active Manoeuvre panel'
              }
            >
              {missionMinimized ? (
                <>
                  <ChevronDown size={11} aria-hidden="true" /> Expand
                </>
              ) : (
                <>
                  <ChevronUp size={11} aria-hidden="true" /> Min
                </>
              )}
            </button>
          </div>
        </div>

        {!missionMinimized && (
          <>
            <h2 className="pk-hud__challenge-title">{challenge.title}</h2>

            <div className="pk-hud__progress-section">
              <div className="pk-hud__progress-row">
                <span
                  className={`pk-hud__status-chip pk-hud__status-chip--${statusState.modifier}`}
                >
                  {statusState.modifier === 'ready' && (
                    <CheckCircle2 size={11} aria-hidden="true" />
                  )}
                  {statusState.label}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div
                className="pk-hud__progress-track"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="pk-hud__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {(onEvaluate || onReset || onToggleCamera) && (
              <div className="pk-hud__actions">
                {onEvaluate && (
                  <button
                    type="button"
                    className={`pk-btn ${
                      statusState.modifier === 'ready'
                        ? 'pk-btn--success'
                        : 'pk-btn--primary'
                    }`}
                    onClick={onEvaluate}
                  >
                    <Flag size={13} aria-hidden="true" />
                    <span>Assess</span>
                  </button>
                )}
                {onReset && (
                  <button
                    type="button"
                    className="pk-btn pk-btn--secondary"
                    onClick={onReset}
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                )}
                {onToggleCamera && (
                  <button
                    type="button"
                    className="pk-btn pk-btn--secondary"
                    onClick={onToggleCamera}
                  >
                    <Camera size={13} aria-hidden="true" />
                    <span>
                      {cameraMode ? `Cam: ${cameraMode}` : 'Camera'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Center Slot: Non-obstructive RAG Crash Coaching Panel */}
      <div className="pk-hud__center-slot">
        {activeCrashReport && (
          <CrashFeedbackPanel
            report={activeCrashReport}
            isSpeaking={isVoiceSpeaking}
            onRetry={() => onReset?.()}
            onDismiss={() => onDismissCrashReport?.()}
            onReplayVoice={onReplayCrashVoice}
            onStopVoice={onStopCrashVoice}
          />
        )}
      </div>

      {/* Top-Right: Speedometer (MPH) & Live Spatial Telemetry */}
      <div className="pk-hud__panel pk-hud__telemetry">
        <div className="pk-hud__speed-cluster">
          <div className="pk-hud__speed-readout" aria-live="polite">
            <span className="pk-hud__speed-value">{displayMph}</span>
            <span className="pk-hud__speed-unit">mph</span>
          </div>
          <span
            className={`pk-hud__gear-badge pk-hud__gear-badge--${gearModifier}`}
          >
            {gearLabel}
          </span>
        </div>

        <div className="pk-hud__metrics-grid">
          <div className="pk-hud__metric">
            <span className="pk-hud__metric-label">Bay Distance</span>
            <span
              className={`pk-hud__metric-value ${
                containment.euclideanPositionErrorMeters <= 0.6
                  ? 'pk-hud__metric-value--ready'
                  : ''
              }`}
            >
              {containment.euclideanPositionErrorMeters.toFixed(2)} m
            </span>
          </div>

          <div className="pk-hud__metric">
            <span className="pk-hud__metric-label">Alignment</span>
            <span
              className={`pk-hud__metric-value ${
                headingDiffDeg <= 8.5 ? 'pk-hud__metric-value--ready' : ''
              }`}
            >
              {headingDiffDeg.toFixed(1)}°
            </span>
          </div>

          <div className="pk-hud__metric">
            <span className="pk-hud__metric-label">Collisions</span>
            <span
              className={`pk-hud__metric-value ${
                collisionCount > 0 ? 'pk-hud__metric-value--danger' : ''
              }`}
            >
              {collisionCount}
            </span>
          </div>

          <div className="pk-hud__metric">
            <span className="pk-hud__metric-label">Time / Shunts</span>
            <span className="pk-hud__metric-value">
              {formatDuration(elapsedSeconds)} · {corrections}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom-Left: Step-by-Step Manoeuvre Instructions */}
      <div className="pk-hud__panel pk-hud__instructions">
        <div className="pk-hud__instructions-header">
          <span className="pk-hud__label">Manoeuvre Briefing</span>
          <button
            type="button"
            className="pk-hud__toggle-btn"
            onClick={() => setInstructionsExpanded((prev) => !prev)}
            aria-expanded={instructionsExpanded}
          >
            {instructionsExpanded ? (
              <>
                <ChevronDown size={11} aria-hidden="true" /> Hide
              </>
            ) : (
              <>
                <ChevronUp size={11} aria-hidden="true" /> Steps (
                {challenge.instructions.length})
              </>
            )}
          </button>
        </div>

        {instructionsExpanded && (
          <ol className="pk-hud__step-list">
            {challenge.instructions.map((instruction, index) => (
              <li key={`${challenge.id}-step-${index}`} className="pk-hud__step-item">
                <span className="pk-hud__step-num">0{index + 1}</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Bottom-Right: Default Desktop Driving Controls Reference */}
      <div className="pk-hud__panel pk-hud__controls">
        <span className="pk-hud__label">Driving Controls</span>
        <div className="pk-hud__controls-list">
          <div className="pk-hud__control-item">
            <span>Accelerate</span>
            <kbd className="pk-hud__kbd">W / ↑</kbd>
          </div>
          <div className="pk-hud__control-item">
            <span>Brake / Rev</span>
            <kbd className="pk-hud__kbd">S / ↓</kbd>
          </div>
          <div className="pk-hud__control-item">
            <span>Steer Left</span>
            <kbd className="pk-hud__kbd">A / ←</kbd>
          </div>
          <div className="pk-hud__control-item">
            <span>Steer Right</span>
            <kbd className="pk-hud__kbd">D / →</kbd>
          </div>
          <div className="pk-hud__control-item">
            <span>Handbrake</span>
            <kbd className="pk-hud__kbd">Space</kbd>
          </div>
          <div className="pk-hud__control-item">
            <span>Camera View</span>
            <kbd className="pk-hud__kbd">C</kbd>
          </div>
        </div>
      </div>

      {/* Mobile-Only Virtual Thumbstick (Right) & Brake (Left) */}
      <MobileThumbstick />
    </aside>
  );
}

export default ChallengeHUD;
