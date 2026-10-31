/**
 * PARKLAB 3D — ChallengeHUD Component
 *
 * Full-screen cockpit driving HUD inspired by modern automotive simulators:
 * - Arc speedometer & tachometer gauge in mph + D / P / R gear indicator.
 * - Real-time Car Structural Health bar (0%–100%), 2D top-down damage & detached-parts
 *   telemetry schematic, and last crash impact readout.
 * - Supports both UK DVSA Challenges Mode and Real-Earth Free Roam Mode (Central London,
 *   Harrow UK, global address & coordinate search).
 * - Interactive steering wheel & accelerator/brake pedals.
 */

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flag,
  Flame,
  Globe,
  Rocket,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Wrench,
} from 'lucide-react';
import { useCustomization } from '../../config/customization.config';
import {
  loadDriverProfile,
  type DriverProfile,
} from '../leaderboard/leaderboardStore';
import {
  MPS_TO_MPH,
  computeFootprintContainment,
  normalizeAngleRadians,
} from '../evaluation/evaluateParking';
import {
  setVirtualDrivingInput,
  clearVirtualDrivingInputs,
} from '../vehicles/useKeyboardControls';
import { createInitialDamageState } from '../vehicles/damageSystem';
import { CitySearchPanel } from '../cities/CitySearchPanel';
import type { RealCityLocation, SimulationMode } from '../cities/cityTypes';
import type { WebcamFacialObserverControls } from '../evaluation/useWebcamFacialObserver';
import type { AICrashFeedbackReport } from '../evaluation/crashRagTypes';
import type {
  DetachablePartId,
  PartCondition,
} from '../../types/vehicle.types';
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

const PART_SHORT_LABELS: Record<DetachablePartId, string> = {
  'front-bumper': 'Fr. Bumper',
  'rear-bumper': 'Rr. Bumper',
  hood: 'Bonnet/Hood',
  trunk: 'Boot/Spoiler',
  'left-mirror': 'L. Mirror',
  'right-mirror': 'R. Mirror',
  'left-fender': 'L. Wing',
  'right-fender': 'R. Wing',
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
  /** Optional active simulation mode ('challenges' | 'freeroam') */
  simulationMode?: SimulationMode;
  /** Optional callback to switch between 'challenges' and 'freeroam' */
  onSelectSimulationMode?: (mode: SimulationMode) => void;
  /** Optional active real-world city in Free Roam mode */
  activeCity?: RealCityLocation;
  /** Optional callback when user selects or searches a new city/address/coordinates */
  onSelectCity?: (city: RealCityLocation) => void;
  /** Optional callback to trigger parking evaluation from the HUD */
  onEvaluate?: () => void;
  /** Optional callback to reset/repair the current attempt */
  onReset?: () => void;
  /** Optional callback to repair vehicle in place without resetting position */
  onRepairVehicle?: () => void;
  /** Optional callback to toggle camera view */
  onToggleCamera?: () => void;
  /** Optional driver profile for gamified level, XP & streak HUD display */
  driverProfile?: DriverProfile;
  /** Optional callback to open the global Park Master Leaderboard modal */
  onOpenLeaderboard?: () => void;
  /** Optional callback to open the Car & World Customizer modal */
  onOpenCustomizer?: () => void;
  /** Whether the HUD info panels are currently open (can be toggled anytime) */
  isHudOpen?: boolean;
  /** Callback to toggle the HUD open or closed at any time */
  onToggleHud?: () => void;
  /** Optional current attempt number on this challenge */
  attemptNumber?: number;
  /** Optional active RAG crash coaching report */
  activeCrashReport?: AICrashFeedbackReport | null;
  /** Optional indicator when the voice coach is actively speaking */
  isVoiceSpeaking?: boolean;
  /** Optional callback to dismiss the active crash report */
  onDismissCrashReport?: () => void;
  /** Optional callback to replay the spoken crash coaching */
  onReplayCrashVoice?: () => void;
  /** Optional callback to stop spoken crash coaching */
  onStopCrashVoice?: () => void;
  /** Optional shared webcam observer for emotion-based city selection */
  webcamObserver?: WebcamFacialObserverControls;
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

function getPartColor(condition: PartCondition): string {
  switch (condition) {
    case 'detached':
      return '#ef4444';
    case 'loose':
      return '#f97316';
    case 'dented':
      return '#facc15';
    default:
      return '#10b981';
  }
}

export function ChallengeHUD({
  challenge,
  vehicleState,
  vehicle,
  metrics,
  cameraMode,
  simulationMode = 'challenges',
  onSelectSimulationMode,
  activeCity,
  onSelectCity,
  onEvaluate,
  onReset,
  onRepairVehicle,
  onToggleCamera,
  driverProfile: propDriverProfile,
  onOpenLeaderboard,
  onOpenCustomizer,
  isHudOpen: controlledHudOpen,
  onToggleHud,
  attemptNumber,
  activeCrashReport,
  isVoiceSpeaking = false,
  onDismissCrashReport,
  onReplayCrashVoice,
  onStopCrashVoice,
  webcamObserver,
}: ChallengeHUDProps) {
  const [internalHudOpen, setInternalHudOpen] = useState(true);
  const isHudOpen =
    controlledHudOpen !== undefined ? controlledHudOpen : internalHudOpen;

  const handleToggleHud = () => {
    if (onToggleHud) {
      onToggleHud();
    } else {
      setInternalHudOpen((prev) => !prev);
    }
  };

  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const checkIsMobileViewport = () => typeof window !== 'undefined' && (window.innerWidth <= 900 || window.innerHeight <= 540);
  const [missionCollapsed, setMissionCollapsed] = useState<boolean>(() => checkIsMobileViewport());
  const [telemetryCollapsed, setTelemetryCollapsed] = useState<boolean>(() => checkIsMobileViewport());

  useEffect(() => {
    const handleViewportResize = () => {
      if (checkIsMobileViewport()) {
        setMissionCollapsed(true);
        setTelemetryCollapsed(true);
      }
    };
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);
  const [activeTouchSteer, setActiveTouchSteer] = useState<'left' | 'right' | null>(null);
  const [activeTouchPedal, setActiveTouchPedal] = useState<'accel' | 'brake' | null>(null);
  const [activeFlightBtn, setActiveFlightBtn] = useState<'ascend' | 'descend' | null>(null);

  const { effectivePhysics } = useCustomization();

  const profile = propDriverProfile ?? loadDriverProfile();
  const isFlyingCapable = Boolean(
    vehicle?.isFlyingVehicle ||
      vehicle?.id === 'tesla-roadster' ||
      vehicle?.category === 'electric-roadster'
  );
  const altitudeMeters = Math.max(0, vehicleState.position[1]);
  const isAirborne = Boolean(vehicleState.isAirborne) || altitudeMeters > 0.22;

  useEffect(() => {
    return () => {
      clearVirtualDrivingInputs();
    };
  }, []);

  // Convert m/s to mph
  const rawMph = Math.abs(vehicleState.speedMps) * MPS_TO_MPH;
  const displayMph = rawMph < 0.15 ? '0.0' : rawMph.toFixed(1);
  const maxMph = (vehicle?.handling.maxForwardSpeedMps ?? 14) * MPS_TO_MPH;
  const speedRatio = Math.min(1, rawMph / Math.max(20, maxMph));

  // Vehicle structural health & damage state
  const damageState = vehicleState.damage ?? createInitialDamageState();
  const carHealth = Math.max(0, Math.min(100, Math.round(damageState.health)));
  const healthModifier =
    carHealth <= 0
      ? 'totaled'
      : carHealth <= 30
        ? 'critical'
        : carHealth <= 65
          ? 'warning'
          : 'healthy';

  const detachedOrDamagedParts = (
    Object.entries(damageState.parts) as [DetachablePartId, PartCondition][]
  ).filter(([, cond]) => cond !== 'intact');

  // Determine gear / movement badge (D / P / R + FWD / STOP / REV)
  const isStationary =
    !vehicleState.isMoving && Math.abs(vehicleState.speedMps) <= 0.08;
  const gearSlot: 'D' | 'P' | 'R' = isStationary
    ? 'P'
    : vehicleState.speedMps < -0.05
      ? 'R'
      : 'D';
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

  // Live footprint & alignment telemetry (for active Challenge bay OR nearest Free Roam parking bay)
  const dimensions = vehicle?.dimensions ?? DEFAULT_VEHICLE_DIMENSIONS;

  let activeTargetBay = challenge.parkingTarget;
  let activeFreeRoamBayLabel: string | null = null;
  if (
    simulationMode === 'freeroam' &&
    activeCity &&
    activeCity.parkingBays.length > 0
  ) {
    let bestBay = activeCity.parkingBays[0];
    let bestDist = Infinity;
    for (const bay of activeCity.parkingBays) {
      const dist = Math.hypot(
        vehicleState.position[0] - bay.position[0],
        vehicleState.position[2] - bay.position[2]
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestBay = bay;
      }
    }
    activeFreeRoamBayLabel = bestBay.streetName;
    activeTargetBay = {
      position: bestBay.position,
      rotationY: bestBay.rotationY,
      width: bestBay.dimensions.width,
      length: bestBay.dimensions.length,
    };
  }

  const containment = computeFootprintContainment(
    activeTargetBay,
    dimensions,
    vehicleState.position,
    vehicleState.rotationY
  );

  const headingDiffDeg = Math.abs(
    (normalizeAngleRadians(
      vehicleState.rotationY - activeTargetBay.rotationY
    ) *
      180) /
      Math.PI
  );

  // Compute progress percentage from spawn distance to target bay
  const initialSpawnDist = Math.max(
    1,
    Math.hypot(
      challenge.spawnPosition[0] - activeTargetBay.position[0],
      challenge.spawnPosition[2] - activeTargetBay.position[2]
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

  // Steering wheel visual rotation in degrees
  const wheelVisualDeg = Math.max(
    -135,
    Math.min(
      135,
      -(vehicleState.steeringAngle / 0.6) * 120 +
        (activeTouchSteer === 'left' ? -35 : activeTouchSteer === 'right' ? 35 : 0)
    )
  );

  const isAccelerating =
    activeTouchPedal === 'accel' ||
    (vehicleState.speedMps > 0.1 && !vehicleState.isBraking);
  const isBrakingOrReversing =
    activeTouchPedal === 'brake' ||
    Boolean(vehicleState.isBraking) ||
    Boolean(vehicleState.isReversing) ||
    vehicleState.speedMps < -0.1;

  // Arc gauge SVG dasharray calculation
  const gaugeArcLength = 188;
  const gaugeDashOffset = gaugeArcLength * (1 - speedRatio);

  return (
    <aside
      className={`pk-hud ${!isHudOpen ? 'pk-hud--closed' : ''}`}
      aria-label="Driving Simulation HUD"
    >
      {/* Floating HUD Quick-Toggle Pill (Always accessible to open or close HUD anytime) */}
      <div className="pk-hud__floating-toggle-bar">
        <button
          type="button"
          className={`pk-hud__master-toggle-btn ${
            !isHudOpen
              ? 'pk-hud__master-toggle-btn--closed'
              : 'pk-hud__master-toggle-btn--open'
          }`}
          onClick={handleToggleHud}
          title={
            isHudOpen
              ? 'Close HUD overlay to see full 3D screen (Shortcut: H)'
              : 'Open HUD overlay (Shortcut: H)'
          }
          aria-expanded={isHudOpen}
          data-testid="hud-master-toggle"
        >
          {isHudOpen ? (
            <>
              <EyeOff size={13} aria-hidden="true" />
              <span>▲ Minimize HUD</span>
            </>
          ) : (
            <>
              <Eye size={13} aria-hidden="true" />
              <span>▾ Expand HUD</span>
            </>
          )}
        </button>

        {/* Compact Mini Telemetry Pill when HUD is Closed */}
        {!isHudOpen && (
          <div className="pk-hud__mini-status-pill">
            <span className="pk-hud__mini-speed">{displayMph} MPH</span>
            <span className="pk-hud__mini-gear">{gearSlot}</span>
            {onReset && (
              <button
                type="button"
                className="pk-hud__mini-action-btn"
                onClick={onReset}
                title="Restart & Repair Vehicle"
              >
                <RotateCcw size={11} aria-hidden="true" />
              </button>
            )}
            {onEvaluate && (
              <button
                type="button"
                className="pk-hud__mini-action-btn pk-hud__mini-action-btn--primary"
                onClick={onEvaluate}
                title="Park & Evaluate"
              >
                <Flag size={11} aria-hidden="true" />
                <span>Park</span>
              </button>
            )}
            <span
              className={`pk-hud__mini-health ${
                carHealth <= 30 ? 'pk-hud__mini-health--critical' : ''
              }`}
            >
              HP {carHealth}%
            </span>
          </div>
        )}
      </div>

      {/* Mobile Compact Drawer Tabs (Minimizes Mission/Instructions & Telemetry into a single compact row on mobile) */}
      {isHudOpen && (
        <div
          className="pk-hud__mobile-drawer-bar"
          role="toolbar"
          aria-label="Mobile HUD Drawers"
        >
          <button
            type="button"
            className="pk-hud__drawer-tab pk-hud__drawer-tab--hud-min"
            onClick={handleToggleHud}
            title="Minimize HUD overlay"
            data-testid="mobile-hud-minimize-btn"
          >
            <EyeOff size={11} aria-hidden="true" />
            <span>▲ Push HUD</span>
          </button>

          <button
            type="button"
            className={`pk-hud__drawer-tab ${
              !missionCollapsed ? 'pk-hud__drawer-tab--active' : ''
            }`}
            onClick={() => {
              setMissionCollapsed((prev) => {
                const next = !prev;
                if (!next) {
                  setTelemetryCollapsed(true);
                  setInstructionsExpanded(true);
                }
                return next;
              });
            }}
            aria-expanded={!missionCollapsed}
            data-testid="mobile-mission-drawer-tab"
          >
            {simulationMode === 'freeroam' ? (
              <>
                <Globe size={11} aria-hidden="true" />
                <span>
                  {missionCollapsed
                    ? `GPS: ${activeCity?.name.split(',')[0] ?? 'City'}`
                    : 'Minimize GPS'}
                </span>
                {missionCollapsed ? (
                  <ChevronDown size={11} aria-hidden="true" />
                ) : (
                  <ChevronUp size={11} aria-hidden="true" />
                )}
              </>
            ) : (
              <>
                <span>
                  {missionCollapsed
                    ? `${challenge.title} · ${progressPercent}%`
                    : 'Minimize Mission'}
                </span>
                {missionCollapsed ? (
                  <ChevronDown size={11} aria-hidden="true" />
                ) : (
                  <ChevronUp size={11} aria-hidden="true" />
                )}
              </>
            )}
          </button>

          <button
            type="button"
            className={`pk-hud__drawer-tab ${
              !telemetryCollapsed ? 'pk-hud__drawer-tab--active' : ''
            }`}
            onClick={() => {
              setTelemetryCollapsed((prev) => {
                const next = !prev;
                if (!next) {
                  setMissionCollapsed(true);
                }
                return next;
              });
            }}
            aria-expanded={!telemetryCollapsed}
            data-testid="mobile-telemetry-drawer-tab"
          >
            <ShieldAlert size={11} aria-hidden="true" />
            <span>
              {telemetryCollapsed
                ? `${displayMph} MPH · ${gearSlot} · HP ${carHealth}%`
                : 'Minimize Stats'}
            </span>
            {telemetryCollapsed ? (
              <ChevronDown size={11} aria-hidden="true" />
            ) : (
              <ChevronUp size={11} aria-hidden="true" />
            )}
          </button>

          {onOpenCustomizer && (
            <button
              type="button"
              className="pk-hud__drawer-tab"
              onClick={onOpenCustomizer}
              title="Open 3D Car Craft Studio & AI Coach"
            >
              <Sparkles size={11} aria-hidden="true" />
              <span>Studio</span>
            </button>
          )}
        </div>
      )}

      {/* Top-Left: Free Roam Real-Earth City Search OR Active Challenge Manoeuvre Panel */}
      {isHudOpen &&
        (simulationMode === 'freeroam' && activeCity && onSelectCity ? (
          <div
            className={`pk-hud__panel pk-hud__mission-freeroam ${
              missionCollapsed ? 'pk-hud__panel--collapsed' : ''
            }`}
          >
            <div className="pk-hud__mission-top">
              <span className="pk-hud__label">
                REAL-EARTH GPS · {activeCity.name.toUpperCase()}
              </span>
              <button
                type="button"
                className="pk-hud__collapse-icon-btn"
                onClick={() => setMissionCollapsed((prev) => !prev)}
                aria-expanded={!missionCollapsed}
                title={
                  missionCollapsed
                    ? 'Expand City & GPS Search Panel'
                    : 'Minimize City & GPS Search Panel'
                }
              >
                {missionCollapsed ? (
                  <>
                    <span>Expand</span>
                    <ChevronDown size={12} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span>Minimize</span>
                    <ChevronUp size={12} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
            {!missionCollapsed && (
              <CitySearchPanel
                activeCity={activeCity}
                onSelectCity={onSelectCity}
                playerPosition={vehicleState.position}
                playerRotationY={vehicleState.rotationY}
                webcamObserver={webcamObserver}
              />
            )}
          </div>
        ) : (
          <div
            className={`pk-hud__panel pk-hud__mission ${
              missionCollapsed ? 'pk-hud__panel--collapsed' : ''
            }`}
          >
            <div className="pk-hud__mission-top">
              <span className="pk-hud__label">
                ACTIVE MANOEUVRE
                {attemptNumber ? ` · #${attemptNumber}` : ''}
              </span>
              <div className="pk-hud__mission-top-actions">
                <span
                  className={`pk-difficulty-badge pk-difficulty-badge--${challenge.difficulty}`}
                >
                  {challenge.difficulty}
                </span>
                <button
                  type="button"
                  className="pk-hud__collapse-icon-btn"
                  onClick={() => setMissionCollapsed((prev) => !prev)}
                  aria-expanded={!missionCollapsed}
                  title={
                    missionCollapsed
                      ? 'Expand Mission & Instructions'
                      : 'Minimize Mission & Instructions'
                  }
                  data-testid="mission-collapse-btn"
                >
                  {missionCollapsed ? (
                    <>
                      <span>Expand</span>
                      <ChevronDown size={12} aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <span>Minimize</span>
                      <ChevronUp size={12} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pk-hud__title-compact-row">
              <h2 className="pk-hud__challenge-title">{challenge.title}</h2>
              {missionCollapsed && (
                <span
                  className={`pk-hud__status-chip pk-hud__status-chip--${statusState.modifier}`}
                >
                  {progressPercent}%
                </span>
              )}
            </div>

            {!missionCollapsed && (
              <>
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

                {/* Collapsible Manoeuvre Steps */}
                <div className="pk-hud__briefing-inline">
                  <button
                    type="button"
                    className="pk-hud__toggle-btn"
                    onClick={() => setInstructionsExpanded((prev) => !prev)}
                    aria-expanded={instructionsExpanded}
                  >
                    {instructionsExpanded ? (
                      <>
                        <ChevronUp size={12} aria-hidden="true" /> Hide
                        Instructions
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} aria-hidden="true" />{' '}
                        Instructions ({challenge.instructions.length} steps)
                      </>
                    )}
                  </button>

                  {instructionsExpanded && (
                    <ol className="pk-hud__step-list">
                      {challenge.instructions.map((instruction, index) => (
                        <li
                          key={`${challenge.id}-step-${index}`}
                          className="pk-hud__step-item"
                        >
                          <span className="pk-hud__step-num">0{index + 1}</span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="pk-hud__mission-cta-row">
                  {onSelectSimulationMode && (
                    <button
                      type="button"
                      className="pk-hud__freeroam-cta"
                      onClick={() => onSelectSimulationMode('freeroam')}
                    >
                      <Globe size={13} aria-hidden="true" />
                      <span>Real-Earth Free Roam (London, Harrow &amp; GPS)</span>
                    </button>
                  )}
                  {onOpenCustomizer && (
                    <button
                      type="button"
                      className="pk-hud__customizer-cta"
                      onClick={onOpenCustomizer}
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      <span>
                        Custom Car ({effectivePhysics.skin.badge} ·{' '}
                        {effectivePhysics.tuning.badge})
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

      {/* Center Slot: Non-obstructive RAG Crash Coaching Panel */}
      {activeCrashReport && (
        <div className="pk-hud__center-slot">
          <CrashFeedbackPanel
            report={activeCrashReport}
            isSpeaking={isVoiceSpeaking}
            onRetry={() => onReset?.()}
            onDismiss={() => onDismissCrashReport?.()}
            onReplayVoice={onReplayCrashVoice}
            onStopVoice={onStopCrashVoice}
          />
        </div>
      )}

      {/* Top-Right: Speedometer + Car Health & Real-Time Damage Schematic + Telemetry */}
      {isHudOpen && (
        <div
          className={`pk-hud__panel pk-hud__telemetry ${
            telemetryCollapsed ? 'pk-hud__panel--collapsed' : ''
          }`}
        >
          <div className="pk-hud__telemetry-top-bar">
            <span className="pk-hud__label">
              {telemetryCollapsed
                ? `${displayMph} MPH · ${gearSlot} · ${carHealth}% HP`
                : `${effectivePhysics.skin.badge} · ${effectivePhysics.tuning.badge}`}
            </span>
            <button
              type="button"
              className="pk-hud__collapse-icon-btn"
              onClick={() => setTelemetryCollapsed((prev) => !prev)}
              aria-expanded={!telemetryCollapsed}
              title={
                telemetryCollapsed
                  ? 'Expand Telemetry & Car Health Schematic'
                  : 'Minimize Telemetry Panel'
              }
              data-testid="telemetry-collapse-btn"
            >
              {telemetryCollapsed ? (
                <>
                  <span>Expand</span>
                  <ChevronDown size={12} aria-hidden="true" />
                </>
              ) : (
                <>
                  <span>Minimize</span>
                  <ChevronUp size={12} aria-hidden="true" />
                </>
              )}
            </button>
          </div>

          {!telemetryCollapsed && (
            <div className="pk-hud__gauge-row">
              {/* Arc Speedometer Dial */}
              <div className="pk-hud__arc-dial">
                <svg
                  viewBox="0 0 120 86"
                  className="pk-hud__arc-svg"
                  aria-hidden="true"
                >
                  <path
                    d="M 16 74 A 46 46 0 1 1 104 74"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.18)"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 16 74 A 46 46 0 1 1 104 74"
                    fill="none"
                    stroke="url(#pkSpeedGrad)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={gaugeArcLength}
                    strokeDashoffset={gaugeDashOffset}
                  />
                  <defs>
                    <linearGradient
                      id="pkSpeedGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="65%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="pk-hud__speed-readout" aria-live="polite">
                  <span className="pk-hud__speed-value">{displayMph}</span>
                  <span className="pk-hud__speed-unit">MPH</span>
                </div>
              </div>

              {/* Vertical D / P / R Shifter Tower + Status Badge */}
              <div className="pk-hud__shifter-col">
                <div className="pk-hud__dpr-tower" aria-label={`Gear ${gearSlot}`}>
                  <span
                    className={`pk-hud__dpr-slot ${
                      gearSlot === 'D' ? 'is-active is-drive' : ''
                    }`}
                  >
                    D
                  </span>
                  <span
                    className={`pk-hud__dpr-slot ${
                      gearSlot === 'P' ? 'is-active is-park' : ''
                    }`}
                  >
                    P
                  </span>
                  <span
                    className={`pk-hud__dpr-slot ${
                      gearSlot === 'R' ? 'is-active is-reverse' : ''
                    }`}
                  >
                    R
                  </span>
                </div>
                <span
                  className={`pk-hud__gear-badge pk-hud__gear-badge--${gearModifier}`}
                >
                  {gearLabel}
                </span>
              </div>
            </div>
          )}

          {/* CAR STRUCTURAL HEALTH & REAL-LIFE CRASH DAMAGE PANEL */}
          <div
            className={`pk-hud__health-card pk-hud__health-card--${healthModifier}`}
            data-testid="car-health-panel"
          >
            <div className="pk-hud__health-header">
              <span className="pk-hud__health-title">
                <ShieldAlert size={13} aria-hidden="true" />
                <span>CAR HEALTH</span>
              </span>
              <div className="pk-hud__health-right">
                <strong
                  className={`pk-hud__health-pct pk-hud__health-pct--${healthModifier}`}
                  aria-label={`Car health ${carHealth} percent`}
                >
                  {carHealth}%
                </strong>
                {carHealth < 100 && (onRepairVehicle || onReset) && (
                  <button
                    type="button"
                    className="pk-hud__repair-mini-btn"
                    onClick={onRepairVehicle ?? onReset}
                    title="Instant Repair & Reattach Parts"
                  >
                    <Wrench size={11} aria-hidden="true" />
                    <span>Repair</span>
                  </button>
                )}
              </div>
            </div>

            <div
              className="pk-hud__health-track"
              role="progressbar"
              aria-label="Vehicle structural health"
              aria-valuenow={carHealth}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`pk-hud__health-fill pk-hud__health-fill--${healthModifier}`}
                style={{ width: `${carHealth}%` }}
              />
            </div>

            {!telemetryCollapsed && (
              /* 2D Top-Down Car Damage Schematic + Part Status */
              <div className="pk-hud__damage-row">
                <svg
                  viewBox="0 0 64 104"
                  className="pk-hud__car-schematic"
                  aria-label="Top-down vehicle part condition schematic"
                >
                  {/* Main Chassis Outline */}
                  <rect
                    x="14"
                    y="12"
                    width="36"
                    height="80"
                    rx="9"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="rgba(148, 163, 184, 0.35)"
                    strokeWidth="1.5"
                  />
                  {/* Front Bumper */}
                  <rect
                    x="16"
                    y="6"
                    width="32"
                    height="6"
                    rx="3"
                    fill={getPartColor(damageState.parts['front-bumper'])}
                  />
                  {/* Bonnet / Hood */}
                  <rect
                    x="17"
                    y="14"
                    width="30"
                    height="18"
                    rx="3"
                    fill={getPartColor(damageState.parts.hood)}
                    fillOpacity="0.82"
                  />
                  {/* Left & Right Front Wings / Fenders */}
                  <rect
                    x="11"
                    y="15"
                    width="4"
                    height="20"
                    rx="2"
                    fill={getPartColor(damageState.parts['left-fender'])}
                  />
                  <rect
                    x="49"
                    y="15"
                    width="4"
                    height="20"
                    rx="2"
                    fill={getPartColor(damageState.parts['right-fender'])}
                  />
                  {/* Left & Right Wing Mirrors */}
                  <rect
                    x="6"
                    y="34"
                    width="6"
                    height="4"
                    rx="1.5"
                    fill={getPartColor(damageState.parts['left-mirror'])}
                  />
                  <rect
                    x="52"
                    y="34"
                    width="6"
                    height="4"
                    rx="1.5"
                    fill={getPartColor(damageState.parts['right-mirror'])}
                  />
                  {/* Cabin / Windscreen */}
                  <rect
                    x="18"
                    y="35"
                    width="28"
                    height="34"
                    rx="4"
                    fill={
                      damageState.zones.engine > 0.55
                        ? 'rgba(239, 68, 68, 0.45)'
                        : 'rgba(56, 189, 248, 0.25)'
                    }
                    stroke="rgba(226, 232, 240, 0.4)"
                    strokeWidth="1"
                  />
                  {/* Trunk / Boot */}
                  <rect
                    x="17"
                    y="72"
                    width="30"
                    height="16"
                    rx="3"
                    fill={getPartColor(damageState.parts.trunk)}
                    fillOpacity="0.82"
                  />
                  {/* Rear Bumper */}
                  <rect
                    x="16"
                    y="91"
                    width="32"
                    height="6"
                    rx="3"
                    fill={getPartColor(damageState.parts['rear-bumper'])}
                  />
                </svg>

                <div className="pk-hud__damage-details">
                  {detachedOrDamagedParts.length === 0 ? (
                    <span className="pk-hud__damage-clean">
                      All panels, bumpers &amp; mirrors intact · No structural
                      dents
                    </span>
                  ) : (
                    <div className="pk-hud__damage-tags">
                      {detachedOrDamagedParts
                        .slice(0, 4)
                        .map(([partId, cond]) => (
                          <span
                            key={partId}
                            className={`pk-hud__part-chip pk-hud__part-chip--${cond}`}
                          >
                            {PART_SHORT_LABELS[partId]}: {cond.toUpperCase()}
                          </span>
                        ))}
                      {detachedOrDamagedParts.length > 4 && (
                        <span className="pk-hud__part-chip pk-hud__part-chip--dented">
                          +{detachedOrDamagedParts.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {damageState.lastImpactDescription && (
                    <span className="pk-hud__last-impact">
                      <AlertTriangle size={11} aria-hidden="true" />
                      <span>{damageState.lastImpactDescription}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {!telemetryCollapsed && (
            <>
              <div className="pk-hud__metrics-grid">
                <div className="pk-hud__metric">
                  <span className="pk-hud__metric-label">
                    {activeFreeRoamBayLabel
                      ? `Bay (${activeFreeRoamBayLabel.slice(0, 14)})`
                      : 'Bay Distance'}
                  </span>
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
                  <span className="pk-hud__metric-label">
                    Collisions / Dents
                  </span>
                  <span
                    className={`pk-hud__metric-value ${
                      collisionCount > 0 ? 'pk-hud__metric-value--danger' : ''
                    }`}
                  >
                    {collisionCount} ({damageState.dents.length} dents)
                  </span>
                </div>

                <div className="pk-hud__metric">
                  <span className="pk-hud__metric-label">Time / Shunts</span>
                  <span className="pk-hud__metric-value">
                    {formatDuration(elapsedSeconds)} · {corrections}
                  </span>
                </div>
              </div>

              {/* Gamified Driver Rank, XP Points & Global Leaderboard Trigger */}
              <div className="pk-hud__gamify-bar">
                <div className="pk-hud__gamify-rank">
                  <span className="pk-hud__gamify-lv">LV {profile.level}</span>
                  <div className="pk-hud__gamify-meta">
                    <strong>{profile.rankTitle}</strong>
                    <span>{profile.totalPoints.toLocaleString()} PTS</span>
                  </div>
                </div>

                {profile.currentStreak > 0 && (
                  <span
                    className="pk-hud__gamify-streak"
                    title="Active Clean Pass Streak"
                  >
                    <Flame size={12} aria-hidden="true" />
                    <span>{profile.currentStreak}x</span>
                  </span>
                )}

                {onOpenLeaderboard && (
                  <button
                    type="button"
                    className="pk-hud__leaderboard-btn"
                    onClick={onOpenLeaderboard}
                    title="Open Global Park Master Leaderboard"
                  >
                    <Trophy size={12} aria-hidden="true" />
                    <span>Leaderboard</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* SpaceX Cold-Gas 3D Flight Telemetry & Thruster Controls (Tesla Roadster) */}
          {isFlyingCapable && !telemetryCollapsed && (
            <div
              className={`pk-hud__flight-card ${
                isAirborne ? 'pk-hud__flight-card--airborne' : ''
              }`}
            >
              <div className="pk-hud__flight-header">
                <span className="pk-hud__flight-badge">
                  <Rocket size={12} aria-hidden="true" />
                  <span>SPACEX 3D FLIGHT</span>
                </span>
                <strong className="pk-hud__flight-alt">
                  ALT: {altitudeMeters.toFixed(1)}m{' '}
                  {isAirborne ? '· AIRBORNE' : '· GROUND'}
                </strong>
              </div>
              <div className="pk-hud__flight-controls">
                <button
                  type="button"
                  className={`pk-hud__flight-btn pk-hud__flight-btn--up ${
                    activeFlightBtn === 'ascend' ? 'is-active' : ''
                  }`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    setActiveFlightBtn('ascend');
                    setVirtualDrivingInput('descend', false);
                    setVirtualDrivingInput('ascend', true);
                  }}
                  onPointerUp={() => {
                    setActiveFlightBtn(null);
                    setVirtualDrivingInput('ascend', false);
                  }}
                  onPointerCancel={() => {
                    setActiveFlightBtn(null);
                    setVirtualDrivingInput('ascend', false);
                  }}
                  onLostPointerCapture={() => {
                    setActiveFlightBtn(null);
                    setVirtualDrivingInput('ascend', false);
                  }}
                >
                  ▲ FLY UP <kbd>SPACE / Q</kbd>
                </button>
                <button
                  type="button"
                  className={`pk-hud__flight-btn pk-hud__flight-btn--down ${
                    activeFlightBtn === 'descend' ? 'is-active' : ''
                  }`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    setActiveFlightBtn('descend');
                    setVirtualDrivingInput('ascend', false);
                    setVirtualDrivingInput('descend', true);
                  }}
                  onPointerUp={() => {
                    setActiveFlightBtn(null);
                    setVirtualDrivingInput('descend', false);
                  }}
                  onPointerCancel={() => {
                    setActiveFlightBtn(null);
                    setVirtualDrivingInput('descend', false);
                  }}
                  onLostPointerCapture={() => {
                    setActiveFlightBtn(null);
                    setVirtualDrivingInput('descend', false);
                  }}
                >
                  ▼ DESCEND <kbd>CTRL / SHIFT / F</kbd>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom-Left: Interactive Cockpit Steering Wheel & Touch Steer Controls (Desktop Default) */}
      <div className="pk-hud__wheel-cluster">
        <div className="pk-hud__wheel-widget">
          <button
            type="button"
            className={`pk-hud__steer-zone pk-hud__steer-zone--left ${
              activeTouchSteer === 'left' ? 'is-active' : ''
            }`}
            aria-label="Steer Left (A or Left Arrow)"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setActiveTouchSteer('left');
              setVirtualDrivingInput('steerLeft', true);
            }}
            onPointerUp={() => {
              setActiveTouchSteer(null);
              setVirtualDrivingInput('steerLeft', false);
            }}
            onPointerCancel={() => {
              setActiveTouchSteer(null);
              setVirtualDrivingInput('steerLeft', false);
            }}
          >
            ◀ A
          </button>

          <div
            className="pk-hud__steering-wheel"
            style={{ transform: `rotate(${wheelVisualDeg.toFixed(1)}deg)` }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 120 120" className="pk-hud__steering-svg">
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="rgba(226, 232, 240, 0.85)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#ef4444"
                strokeWidth="10"
                strokeDasharray="18 285"
                strokeDashoffset="-66"
              />
              <path
                d="M 16 58 L 46 58 L 52 72 L 52 104 M 104 58 L 74 58 L 68 72 L 68 104"
                fill="none"
                stroke="rgba(148, 163, 184, 0.8)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="60"
                cy="60"
                r="16"
                fill="#0f172a"
                stroke="rgba(226, 232, 240, 0.6)"
                strokeWidth="3"
              />
              <polygon points="60,51 52,65 68,65" fill="#ef4444" />
            </svg>
          </div>

          <button
            type="button"
            className={`pk-hud__steer-zone pk-hud__steer-zone--right ${
              activeTouchSteer === 'right' ? 'is-active' : ''
            }`}
            aria-label="Steer Right (D or Right Arrow)"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setActiveTouchSteer('right');
              setVirtualDrivingInput('steerRight', true);
            }}
            onPointerUp={() => {
              setActiveTouchSteer(null);
              setVirtualDrivingInput('steerRight', false);
            }}
            onPointerCancel={() => {
              setActiveTouchSteer(null);
              setVirtualDrivingInput('steerRight', false);
            }}
          >
            D ▶
          </button>
        </div>
        <span className="pk-hud__control-caption">
          STEER: <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd>
        </span>
      </div>

      {/* Bottom-Center: Quick Simulator Action Dock */}
      {(onEvaluate || onReset || onToggleCamera || onRepairVehicle) && (
        <div className="pk-hud__center-dock">
          {onToggleCamera && (
            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onToggleCamera}
              title="Switch Camera Perspective (Shortcut: C)"
            >
              <Camera size={14} aria-hidden="true" />
              <span>
                {cameraMode === 'overhead' ? 'Overhead Cam' : 'Follow Cam'}
              </span>
            </button>
          )}
          {carHealth < 100 && onRepairVehicle && (
            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onRepairVehicle}
              title="Repair Dents & Reattach Lost Car Parts (100% Health)"
            >
              <Wrench size={14} aria-hidden="true" />
              <span>Repair ({carHealth}%)</span>
            </button>
          )}
          {onReset && (
            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onReset}
              title="Restart & Restore 100% Car Health"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Restart</span>
            </button>
          )}
          {onEvaluate && (
            <button
              type="button"
              className={`pk-btn ${
                statusState.modifier === 'ready'
                  ? 'pk-btn--success'
                  : 'pk-btn--primary'
              }`}
              onClick={onEvaluate}
              title="Assess Parking Precision (Shortcut: E / Enter)"
            >
              <Flag size={14} aria-hidden="true" />
              <span>
                {simulationMode === 'freeroam'
                  ? 'Assess City Park'
                  : 'Park & Evaluate'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Bottom-Right: Interactive Brake/Reverse & Accelerator Pedals */}
      <div className="pk-hud__pedals-cluster">
        <div className="pk-hud__pedals-row">
          {/* Brake / Reverse Pedal */}
          <button
            type="button"
            className={`pk-hud__pedal pk-hud__pedal--brake ${
              isBrakingOrReversing ? 'is-pressed' : ''
            }`}
            aria-label="Brake or Reverse (S or Down Arrow)"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setActiveTouchPedal('brake');
              setVirtualDrivingInput('brakeOrReverse', true);
            }}
            onPointerUp={() => {
              setActiveTouchPedal(null);
              setVirtualDrivingInput('brakeOrReverse', false);
            }}
            onPointerCancel={() => {
              setActiveTouchPedal(null);
              setVirtualDrivingInput('brakeOrReverse', false);
            }}
          >
            <span className="pk-hud__pedal-grooves" />
            <span className="pk-hud__pedal-label">BRAKE / REV</span>
            <kbd className="pk-hud__pedal-kbd">S / ↓</kbd>
          </button>

          {/* Accelerator Pedal */}
          <button
            type="button"
            className={`pk-hud__pedal pk-hud__pedal--accel ${
              isAccelerating ? 'is-pressed' : ''
            }`}
            aria-label="Accelerate Forward (W or Up Arrow)"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setActiveTouchPedal('accel');
              setVirtualDrivingInput('accelerate', true);
            }}
            onPointerUp={() => {
              setActiveTouchPedal(null);
              setVirtualDrivingInput('accelerate', false);
            }}
            onPointerCancel={() => {
              setActiveTouchPedal(null);
              setVirtualDrivingInput('accelerate', false);
            }}
          >
            <span className="pk-hud__pedal-grooves" />
            <span className="pk-hud__pedal-label">DRIVE</span>
            <kbd className="pk-hud__pedal-kbd">W / ↑</kbd>
          </button>
        </div>
        <span className="pk-hud__control-caption">
          {isFlyingCapable ? (
            <>
              FLY UP: <kbd>SPACE</kbd> · DOWN: <kbd>CTRL</kbd> · BRAKE: <kbd>B</kbd> · CAM:{' '}
              <kbd>C</kbd>
            </>
          ) : (
            <>
              HANDBRAKE: <kbd>SPACE</kbd> / <kbd>B</kbd> · CAMERA: <kbd>C</kbd>
            </>
          )}
        </span>
      </div>
      {/* Mobile-Only Virtual Thumbstick (Right) & Brake + Roadster 3D Flight Controls (Left) */}
      <MobileThumbstick
        isFlyingCapable={isFlyingCapable}
        altitudeMeters={altitudeMeters}
        isAirborne={isAirborne}
      />
    </aside>
  );
}

export default ChallengeHUD;
