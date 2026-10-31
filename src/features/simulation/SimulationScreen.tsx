import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import {
  AlertOctagon,
  ArrowLeft,
  Car,
  Compass,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Wrench,
  X,
  Flame,
  Palette,
  Sparkles,
} from 'lucide-react';
import type { VehicleRuntimeState } from '../../types/vehicle.types';
import type {
  ChallengeId,
  ObstacleDefinition,
  ParkingChallengeDefinition,
} from '../../types/challenge.types';
import type {
  ParkingAttemptMetrics,
  ParkingEvaluationResult,
} from '../../types/evaluation.types';
import {
  ParkingEnvironment,
  DrivingCamera,
  FACILITY_STATIC_OBSTACLES,
  WorldSubtreeErrorBoundary,
  isWebGLAvailable,
  type CameraMode,
} from '../world';
import {
  VEHICLES,
  getVehicleById,
  VehicleController,
  StudioReflectionEnv,
  clearVirtualDrivingInputs,
  createInitialDamageState,
} from '../vehicles';
import {
  CHALLENGES,
  DEFAULT_CHALLENGE,
  getChallengeById,
  ChallengeScene,
} from '../challenges';
import {
  evaluateParking,
  useCrashFeedbackLoop,
  type PullUpRightTelemetryExtension,
} from '../evaluation';
import {
  AICoachControlsBar,
  AttemptReplayModal,
  ChallengeHUD,
  ResultsPanel,
} from '../challenge-ui';
import { CustomizationStudioPanel } from '../../components/ui/CustomizationStudioPanel';
import { useCustomization } from '../../config/customization.config';
import { RivalNameplates3D } from '../leaderboard/RivalNameplates3D';
import {
  loadDriverProfile,
  recordAttemptAndAwardPoints,
  getLeaderboardStandings,
  updateDriverCallsign,
  type AttemptPointsBreakdown,
  type DriverProfile,
} from '../leaderboard/leaderboardStore';
import {
  FREE_ROAM_WORLD_BOUNDS,
  REAL_CITIES_PRESETS,
  RealCityEnvironment,
  getRealCityById,
  type RealCityLocation,
  type SimulationMode,
} from '../cities';
import {
  ReplayControlsOverlay,
  ReplaySceneActor,
  interpolateReplayFrame,
  type ReplayFrame,
} from './ChallengeReplay';

export interface SimulationScreenProps {
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  selectedChallengeId?: ChallengeId;
  onSelectChallenge?: (challengeId: ChallengeId) => void;
  initialMode?: SimulationMode;
  initialCityId?: string;
  onExitToShowcase?: () => void;
}

type ExtendedAttemptMetrics = ParkingAttemptMetrics &
  PullUpRightTelemetryExtension;

const SHORT_CHALLENGE_LABELS: Record<ChallengeId, string> = {
  parallel: 'Parallel',
  'reverse-bay': 'Reverse Bay',
  'forward-bay': 'Forward Bay',
  'angled-bay': 'Angled Bay',
  'pull-up-right': 'Pull Up Right',
};

function createInitialVehicleState(
  position: [number, number, number],
  rotationY: number
): VehicleRuntimeState {
  return {
    position: [position[0], position[1], position[2]],
    rotationY,
    speedMps: 0,
    steeringAngle: 0,
    collisionCount: 0,
    isMoving: false,
    damage: createInitialDamageState(),
  };
}

/**
 * Full-Screen Playable 3D Parking & Real-Earth Free Roam Simulator.
 * Connects the 3D World & Real Earth Cities (Central London, Harrow UK, etc.),
 * Realistic Crash Physics (dents, detachable 3D parts, car health 0%–100%, auto-restart),
 * Challenge Manoeuvres, and Live Evaluation.
 */
export function SimulationScreen({
  selectedVehicleId: controlledVehicleId,
  onSelectVehicle: onControlledSelectVehicle,
  selectedChallengeId: controlledChallengeId,
  onSelectChallenge: onControlledSelectChallenge,
  initialMode: propInitialMode,
  initialCityId: propInitialCityId,
  onExitToShowcase,
}: SimulationScreenProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve initial simulation mode ('challenges' | 'freeroam')
  const resolvedInitialMode = useMemo<SimulationMode>(() => {
    if (propInitialMode === 'freeroam' || propInitialMode === 'challenges') {
      return propInitialMode;
    }
    const modeParam = searchParams.get('mode');
    if (modeParam === 'freeroam') {
      return 'freeroam';
    }
    return 'challenges';
  }, [propInitialMode, searchParams]);

  // Resolve initial real-world city (defaults to Central London, UK or URL ?city=harrow-uk)
  const resolvedInitialCity = useMemo<RealCityLocation>(() => {
    const cityParam = propInitialCityId ?? searchParams.get('city');
    if (cityParam) {
      return getRealCityById(cityParam);
    }
    return REAL_CITIES_PRESETS[0];
  }, [propInitialCityId, searchParams]);

  // Resolve fallback initial vehicle and challenge from URL search params if valid
  const initialVehicleId = useMemo<string>(() => {
    if (
      controlledVehicleId &&
      VEHICLES.some((v) => v.id === controlledVehicleId)
    ) {
      return controlledVehicleId;
    }
    const param = searchParams.get('vehicle');
    if (param && VEHICLES.some((v) => v.id === param)) {
      return param;
    }
    return 'tesla-roadster';
  }, [controlledVehicleId, searchParams]);

  const initialChallengeId = useMemo<ChallengeId>(() => {
    if (
      controlledChallengeId &&
      CHALLENGES.some((c) => c.id === controlledChallengeId)
    ) {
      return controlledChallengeId;
    }
    const param = searchParams.get('challenge') as ChallengeId | null;
    if (param && CHALLENGES.some((c) => c.id === param)) {
      return param;
    }
    return DEFAULT_CHALLENGE.id;
  }, [controlledChallengeId, searchParams]);

  const [simulationMode, setSimulationMode] =
    useState<SimulationMode>(resolvedInitialMode);
  const [activeCity, setActiveCity] =
    useState<RealCityLocation>(resolvedInitialCity);

  const [internalVehicleId, setInternalVehicleId] =
    useState<string>(initialVehicleId);
  const [internalChallengeId, setInternalChallengeId] =
    useState<ChallengeId>(initialChallengeId);

  const selectedVehicleId = controlledVehicleId ?? internalVehicleId;
  const selectedChallengeId = controlledChallengeId ?? internalChallengeId;

  const { skinSpec, themeSpec } = useCustomization();
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [attemptResetKey, setAttemptResetKey] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showCustomizationDrawer, setShowCustomizationDrawer] =
    useState<boolean>(false);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [totaledCountdown, setTotaledCountdown] = useState<number | null>(null);

  const selectedVehicle = useMemo(
    () => getVehicleById(selectedVehicleId),
    [selectedVehicleId]
  );
  const activeChallenge = useMemo(
    () => getChallengeById(selectedChallengeId),
    [selectedChallengeId]
  );

  const crashLoop = useCrashFeedbackLoop({
    challenge: activeChallenge,
    vehicle: selectedVehicle,
  });

  // Active spawn position and rotation depending on mode
  const currentSpawnPosition: [number, number, number] =
    simulationMode === 'freeroam'
      ? activeCity.spawnPosition
      : activeChallenge.spawnPosition;
  const currentSpawnRotationY: number =
    simulationMode === 'freeroam'
      ? activeCity.spawnRotationY
      : activeChallenge.spawnRotationY;

  // Combine Challenge obstacles with facility perimeter obstacles in Challenges mode,
  // or use Real City obstacles in Free Roam mode
  const activeObstacles = useMemo<ObstacleDefinition[]>(() => {
    if (simulationMode === 'freeroam') {
      return activeCity.obstacles;
    }
    return [...activeChallenge.obstacles, ...FACILITY_STATIC_OBSTACLES];
  }, [simulationMode, activeCity.obstacles, activeChallenge.obstacles]);

  const [vehicleState, setVehicleState] = useState<VehicleRuntimeState>(() =>
    createInitialVehicleState(currentSpawnPosition, currentSpawnRotationY)
  );

  const [metrics, setMetrics] = useState<ExtendedAttemptMetrics>({
    elapsedSeconds: 0,
    collisions: 0,
    corrections: 0,
  });

  const [evaluationResult, setEvaluationResult] =
    useState<ParkingEvaluationResult | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile>(() =>
    loadDriverProfile()
  );
  const [lastPointsBreakdown, setLastPointsBreakdown] =
    useState<AttemptPointsBreakdown | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [callsignInput, setCallsignInput] = useState<string>(
    () => loadDriverProfile().driverName
  );

  // Refs for accurate manoeuvre telemetry tracking across animation frames
  const latestVehicleStateRef = useRef<VehicleRuntimeState>(vehicleState);
  latestVehicleStateRef.current = vehicleState;
  const latestMetricsRef = useRef<ExtendedAttemptMetrics>(metrics);
  latestMetricsRef.current = metrics;
  const hasEnteredReverseRef = useRef<boolean>(false);
  const lastActiveGearRef = useRef<'forward' | 'reverse' | null>(null);
  const lastPositionRef = useRef<[number, number, number]>(currentSpawnPosition);
  const pullUpStageReachedRef = useRef<boolean>(false);
  const reversedDistanceRef = useRef<number>(0);
  const maxAltitudeReachedRef = useRef<number>(0);

  // Completed-Challenge Action Replay recording & playback state
  const attemptStartMsRef = useRef<number>(performance.now());
  const replayFramesRef = useRef<ReplayFrame[]>([
    {
      timeSec: 0,
      position: [
        currentSpawnPosition[0],
        currentSpawnPosition[1],
        currentSpawnPosition[2],
      ],
      rotationY: currentSpawnRotationY,
      speedMps: 0,
      steeringAngle: 0,
      isBraking: false,
      isReversing: false,
      isAirborne: false,
      collisionCount: 0,
      damage: createInitialDamageState(),
    },
  ]);
  const [completedReplayFrames, setCompletedReplayFrames] = useState<
    ReplayFrame[]
  >([]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(true);
  const [replayTimeSec, setReplayTimeSec] = useState<number>(0);
  const [replayPlaybackRate, setReplayPlaybackRate] = useState<number>(1);

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());
    return () => {
      clearVirtualDrivingInputs();
    };
  }, []);

  // Reset attempt & restore 100% car health
  const resetAttemptState = useCallback(
    (spawnPosition: [number, number, number], spawnRotationY: number) => {
      clearVirtualDrivingInputs();
      hasEnteredReverseRef.current = false;
      lastActiveGearRef.current = null;
      lastPositionRef.current = [
        spawnPosition[0],
        spawnPosition[1],
        spawnPosition[2],
      ];
      pullUpStageReachedRef.current = false;
      reversedDistanceRef.current = 0;
      maxAltitudeReachedRef.current = 0;

      attemptStartMsRef.current = performance.now();
      replayFramesRef.current = [
        {
          timeSec: 0,
          position: [spawnPosition[0], spawnPosition[1], spawnPosition[2]],
          rotationY: spawnRotationY,
          speedMps: 0,
          steeringAngle: 0,
          isBraking: false,
          isReversing: false,
          isAirborne: false,
          collisionCount: 0,
          damage: createInitialDamageState(),
        },
      ];
      setCompletedReplayFrames([]);
      setIsReplaying(false);
      setIsReplayPlaying(false);
      setReplayTimeSec(0);

      setEvaluationResult(null);
      setLastPointsBreakdown(null);
      setIsPaused(false);
      setTotaledCountdown(null);
      setVehicleState(createInitialVehicleState(spawnPosition, spawnRotationY));
      setMetrics({
        elapsedSeconds: 0,
        collisions: 0,
        corrections: 0,
      });
      setAttemptResetKey((prev) => prev + 1);
    },
    []
  );

  // Handle Car Totaled (0% Health): start automatic 4.0-second real-life restart countdown
  const isCarTotaled = Boolean(vehicleState.damage?.isTotaled);

  useEffect(() => {
    if (!isCarTotaled) {
      setTotaledCountdown(null);
      return;
    }
    setTotaledCountdown(4.0);
    const interval = window.setInterval(() => {
      setTotaledCountdown((prev) => {
        if (prev === null) return null;
        const next = Number((prev - 0.1).toFixed(1));
        if (next <= 0) {
          window.clearInterval(interval);
          resetAttemptState(currentSpawnPosition, currentSpawnRotationY);
          return null;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [
    isCarTotaled,
    currentSpawnPosition,
    currentSpawnRotationY,
    resetAttemptState,
  ]);

  // Elapsed timer while attempt is active (not evaluated, paused, or totaled)
  useEffect(() => {
    if (evaluationResult || isPaused || isCarTotaled) {
      return;
    }
    const interval = window.setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        elapsedSeconds: Number((prev.elapsedSeconds + 0.25).toFixed(2)),
      }));
    }, 250);

    return () => window.clearInterval(interval);
  }, [evaluationResult, isPaused, isCarTotaled, attemptResetKey]);

  const handleSelectMode = useCallback(
    (nextMode: SimulationMode) => {
      setSimulationMode(nextMode);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('mode', nextMode);
          if (nextMode === 'freeroam') {
            next.set('city', activeCity.id);
          }
          return next;
        },
        { replace: true }
      );
      if (nextMode === 'freeroam') {
        resetAttemptState(activeCity.spawnPosition, activeCity.spawnRotationY);
      } else {
        resetAttemptState(
          activeChallenge.spawnPosition,
          activeChallenge.spawnRotationY
        );
      }
    },
    [
      activeCity,
      activeChallenge.spawnPosition,
      activeChallenge.spawnRotationY,
      resetAttemptState,
      setSearchParams,
    ]
  );

  const handleSelectCity = useCallback(
    (nextCity: RealCityLocation) => {
      setActiveCity(nextCity);
      setSimulationMode('freeroam');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('mode', 'freeroam');
          next.set('city', nextCity.id);
          return next;
        },
        { replace: true }
      );
      resetAttemptState(nextCity.spawnPosition, nextCity.spawnRotationY);
    },
    [resetAttemptState, setSearchParams]
  );

  const handleSelectVehicle = useCallback(
    (vehicleId: string) => {
      if (onControlledSelectVehicle) {
        onControlledSelectVehicle(vehicleId);
      } else {
        setInternalVehicleId(vehicleId);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('vehicle', vehicleId);
            next.set('challenge', selectedChallengeId);
            return next;
          },
          { replace: true }
        );
      }
      resetAttemptState(currentSpawnPosition, currentSpawnRotationY);
    },
    [
      currentSpawnPosition,
      currentSpawnRotationY,
      onControlledSelectVehicle,
      resetAttemptState,
      selectedChallengeId,
      setSearchParams,
    ]
  );

  const handleSelectChallenge = useCallback(
    (challengeId: ChallengeId) => {
      const nextChallenge = getChallengeById(challengeId);
      setSimulationMode('challenges');
      if (onControlledSelectChallenge) {
        onControlledSelectChallenge(challengeId);
      } else {
        setInternalChallengeId(challengeId);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('mode', 'challenges');
            next.set('vehicle', selectedVehicleId);
            next.set('challenge', challengeId);
            return next;
          },
          { replace: true }
        );
      }
      resetAttemptState(
        nextChallenge.spawnPosition,
        nextChallenge.spawnRotationY
      );
    },
    [
      onControlledSelectChallenge,
      resetAttemptState,
      selectedVehicleId,
      setSearchParams,
    ]
  );

  const handleResetAttempt = useCallback(() => {
    crashLoop.finalizeAttemptForRetry(
      latestMetricsRef.current.elapsedSeconds,
      latestMetricsRef.current.corrections
    );
    resetAttemptState(currentSpawnPosition, currentSpawnRotationY);
  }, [
    crashLoop,
    currentSpawnPosition,
    currentSpawnRotationY,
    resetAttemptState,
  ]);

  const handleToggleCamera = useCallback(() => {
    setCameraMode((prev) => (prev === 'follow' ? 'overhead' : 'follow'));
  }, []);

  const handleVehicleStateChange = useCallback(
    (nextState: VehicleRuntimeState) => {
      latestVehicleStateRef.current = nextState;
      setVehicleState(nextState);
      crashLoop.recordTelemetryFrame(
        nextState,
        latestMetricsRef.current.elapsedSeconds
      );
      if (nextState.position[1] > maxAltitudeReachedRef.current) {
        maxAltitudeReachedRef.current = nextState.position[1];
      }

      // Record trajectory frames during active Challenges so a completed challenge can be replayed
      if (simulationMode === 'challenges') {
        const elapsedSec = Math.max(
          0,
          (performance.now() - attemptStartMsRef.current) / 1000
        );
        const frames = replayFramesRef.current;
        const lastFrame = frames[frames.length - 1];
        const movedDist = lastFrame
          ? Math.hypot(
              nextState.position[0] - lastFrame.position[0],
              nextState.position[1] - lastFrame.position[1],
              nextState.position[2] - lastFrame.position[2]
            )
          : 1;
        const rotatedAngle = lastFrame
          ? Math.abs(nextState.rotationY - lastFrame.rotationY)
          : 1;

        if (
          !lastFrame ||
          elapsedSec - lastFrame.timeSec >= 0.045 ||
          movedDist >= 0.03 ||
          rotatedAngle >= 0.01
        ) {
          frames.push({
            timeSec: Number(elapsedSec.toFixed(3)),
            position: [
              nextState.position[0],
              nextState.position[1],
              nextState.position[2],
            ],
            rotationY: nextState.rotationY,
            speedMps: nextState.speedMps,
            steeringAngle: nextState.steeringAngle,
            isBraking:
              Math.abs(nextState.speedMps) < 0.08 && !nextState.isMoving,
            isReversing: nextState.speedMps < -0.05,
            isAirborne: nextState.isAirborne,
            collisionCount: nextState.collisionCount,
            damage: nextState.damage,
          });
        }
      }

      const prevPos = lastPositionRef.current;
      const stepDist = Math.hypot(
        nextState.position[0] - prevPos[0],
        nextState.position[2] - prevPos[2]
      );
      lastPositionRef.current = [
        nextState.position[0],
        nextState.position[1],
        nextState.position[2],
      ];

      let addedCorrection = 0;
      if (nextState.speedMps < -0.05) {
        hasEnteredReverseRef.current = true;
        lastActiveGearRef.current = 'reverse';
        reversedDistanceRef.current += stepDist;
      } else if (nextState.speedMps > 0.05) {
        if (
          hasEnteredReverseRef.current &&
          lastActiveGearRef.current === 'reverse'
        ) {
          addedCorrection = 1;
        }
        lastActiveGearRef.current = 'forward';
      }

      if (
        simulationMode === 'challenges' &&
        activeChallenge.id === 'pull-up-right' &&
        nextState.position[0] >= 9.5 &&
        nextState.position[2] >= -4.8
      ) {
        pullUpStageReachedRef.current = true;
      }

      setMetrics((prev) => {
        const nextCollisions = Math.max(
          prev.collisions,
          nextState.collisionCount
        );
        const nextCorrections = prev.corrections + addedCorrection;
        const reachedPullUp = pullUpStageReachedRef.current ? true : undefined;
        const revDist =
          reversedDistanceRef.current >= 7.0
            ? reversedDistanceRef.current
            : undefined;

        if (
          nextCollisions === prev.collisions &&
          nextCorrections === prev.corrections &&
          reachedPullUp === prev.reachedPullUpStage &&
          revDist === prev.reversedDistanceMeters
        ) {
          return prev;
        }

        return {
          ...prev,
          collisions: nextCollisions,
          corrections: nextCorrections,
          ...(reachedPullUp !== undefined
            ? { reachedPullUpStage: reachedPullUp }
            : {}),
          ...(revDist !== undefined ? { reversedDistanceMeters: revDist } : {}),
        };
      });
    },
    [activeChallenge.id, crashLoop, simulationMode]
  );

  const handleCollision = useCallback(
    (obstacle: ObstacleDefinition, totalCollisions: number) => {
      setMetrics((prev) => ({
        ...prev,
        collisions: Math.max(prev.collisions, totalCollisions),
      }));
      crashLoop.recordCollision(
        obstacle,
        totalCollisions,
        latestVehicleStateRef.current,
        latestMetricsRef.current.elapsedSeconds,
        latestMetricsRef.current.corrections
      );
    },
    [crashLoop]
  );

  const handleEvaluate = useCallback(() => {
    clearVirtualDrivingInputs();

    // In Free Roam mode, evaluate against the nearest real-world street/bay parking spot
    if (simulationMode === 'freeroam' && activeCity.parkingBays.length > 0) {
      let nearestBay = activeCity.parkingBays[0];
      let minDist = Infinity;
      for (const bay of activeCity.parkingBays) {
        const dist = Math.hypot(
          vehicleState.position[0] - bay.position[0],
          vehicleState.position[2] - bay.position[2]
        );
        if (dist < minDist) {
          minDist = dist;
          nearestBay = bay;
        }
      }

      const syntheticFreeRoamChallenge: ParkingChallengeDefinition = {
        ...activeChallenge,
        id: 'parallel',
        title: `${activeCity.name} — ${nearestBay.streetName}`,
        description: `Real-world Free Roam parking assessment in ${activeCity.name} (${activeCity.region}).`,
        parkingTarget: {
          position: nearestBay.position,
          rotationY: nearestBay.rotationY,
          width: nearestBay.dimensions.width,
          length: nearestBay.dimensions.length,
        },
      };

      const result = evaluateParking(
        syntheticFreeRoamChallenge,
        selectedVehicle,
        vehicleState,
        metrics
      );
      const { profile, breakdown } = recordAttemptAndAwardPoints(
        syntheticFreeRoamChallenge.id,
        result,
        selectedVehicle,
        maxAltitudeReachedRef.current
      );
      setDriverProfile(profile);
      setLastPointsBreakdown(breakdown);
      setCompletedReplayFrames([]);
      setIsReplaying(false);
      setEvaluationResult(result);
      crashLoop.recordEvaluationCompleted(
        result,
        metrics.elapsedSeconds,
        metrics.corrections
      );
      return;
    }

    const result = evaluateParking(
      activeChallenge,
      selectedVehicle,
      vehicleState,
      metrics
    );
    const { profile, breakdown } = recordAttemptAndAwardPoints(
      activeChallenge.id,
      result,
      selectedVehicle,
      maxAltitudeReachedRef.current
    );
    setDriverProfile(profile);
    setLastPointsBreakdown(breakdown);

    // Save action replay ONLY when a challenge is completed (passed === true)
    if (simulationMode === 'challenges' && result.passed) {
      const finalElapsedSec = Math.max(
        0.5,
        (performance.now() - attemptStartMsRef.current) / 1000
      );
      const finalFrames = [...replayFramesRef.current];
      const lastRecorded = finalFrames[finalFrames.length - 1];
      const endSec = Math.max(
        finalElapsedSec,
        lastRecorded ? lastRecorded.timeSec + 0.1 : 0.5
      );
      finalFrames.push({
        timeSec: Number(endSec.toFixed(3)),
        position: [
          vehicleState.position[0],
          vehicleState.position[1],
          vehicleState.position[2],
        ],
        rotationY: vehicleState.rotationY,
        speedMps: 0,
        steeringAngle: vehicleState.steeringAngle,
        isBraking: true,
        isReversing: false,
        isAirborne: false,
        collisionCount: vehicleState.collisionCount,
        damage: vehicleState.damage,
      });
      setCompletedReplayFrames(finalFrames);
    } else {
      setCompletedReplayFrames([]);
      setIsReplaying(false);
    }

    setEvaluationResult(result);
    crashLoop.recordEvaluationCompleted(
      result,
      metrics.elapsedSeconds,
      metrics.corrections
    );
  }, [
    simulationMode,
    activeCity,
    activeChallenge,
    crashLoop,
    selectedVehicle,
    vehicleState,
    metrics,
  ]);

  const totalReplayDurationSec = useMemo<number>(() => {
    if (completedReplayFrames.length === 0) return 0;
    return Math.max(
      0.5,
      completedReplayFrames[completedReplayFrames.length - 1].timeSec
    );
  }, [completedReplayFrames]);

  const currentReplayFrame = useMemo<ReplayFrame>(() => {
    return interpolateReplayFrame(completedReplayFrames, replayTimeSec);
  }, [completedReplayFrames, replayTimeSec]);

  const handleStartReplay = useCallback(() => {
    if (
      simulationMode !== 'challenges' ||
      !evaluationResult?.passed ||
      completedReplayFrames.length === 0
    ) {
      return;
    }
    setReplayTimeSec(0);
    setReplayPlaybackRate(1);
    setIsReplayPlaying(true);
    setIsReplaying(true);
  }, [simulationMode, evaluationResult, completedReplayFrames.length]);

  const handleExitReplay = useCallback(() => {
    setIsReplayPlaying(false);
    setIsReplaying(false);
  }, []);

  const handleRestartReplay = useCallback(() => {
    setReplayTimeSec(0);
    setIsReplayPlaying(true);
  }, []);

  // Advance replay timeline while playing
  useEffect(() => {
    if (!isReplaying || !isReplayPlaying || totalReplayDurationSec <= 0) {
      return;
    }

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dtSec = Math.min(0.1, Math.max(0, (now - lastTs) / 1000));
      lastTs = now;

      setReplayTimeSec((prev) => {
        const next = prev + dtSec * replayPlaybackRate;
        if (next >= totalReplayDurationSec) {
          setIsReplayPlaying(false);
          return totalReplayDurationSec;
        }
        return next;
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isReplaying, isReplayPlaying, replayPlaybackRate, totalReplayDurationSec]);

  const handleNextChallenge = useCallback(() => {
    if (simulationMode === 'freeroam') {
      const currentIdx = REAL_CITIES_PRESETS.findIndex(
        (c) => c.id === activeCity.id
      );
      const nextCity =
        REAL_CITIES_PRESETS[(currentIdx + 1) % REAL_CITIES_PRESETS.length] ??
        REAL_CITIES_PRESETS[0];
      handleSelectCity(nextCity);
      return;
    }
    const currentIndex = CHALLENGES.findIndex(
      (c) => c.id === selectedChallengeId
    );
    const nextChallenge =
      CHALLENGES[(currentIndex + 1) % CHALLENGES.length] ?? DEFAULT_CHALLENGE;
    handleSelectChallenge(nextChallenge.id);
  }, [
    simulationMode,
    activeCity.id,
    selectedChallengeId,
    handleSelectCity,
    handleSelectChallenge,
  ]);

  // Keyboard shortcuts for Camera ('C'), Pause ('Escape'), Reset ('R'), and Evaluate ('Enter' / 'E')
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === 'Escape' && !event.repeat && !evaluationResult) {
        event.preventDefault();
        clearVirtualDrivingInputs();
        setIsPaused((prev) => !prev);
      } else if (event.code === 'KeyC' && !event.repeat) {
        event.preventDefault();
        handleToggleCamera();
      } else if (event.code === 'KeyR' && !event.repeat) {
        event.preventDefault();
        handleResetAttempt();
      } else if (
        (event.code === 'KeyE' || event.code === 'Enter') &&
        !event.repeat &&
        !evaluationResult &&
        !isPaused &&
        !isCarTotaled
      ) {
        if (event.code === 'Enter' && target?.tagName === 'BUTTON') {
          return;
        }
        event.preventDefault();
        handleEvaluate();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    evaluationResult,
    isPaused,
    isCarTotaled,
    handleEvaluate,
    handleToggleCamera,
    handleResetAttempt,
  ]);

  const detachedPartsCount = vehicleState.damage
    ? Object.values(vehicleState.damage.parts).filter((c) => c === 'detached')
        .length
    : 0;
  const dentsCount = vehicleState.damage?.dents.length ?? 0;

  return (
    <div className="sim-fullscreen" data-testid="simulation-screen">
      {/* Floating Top HUD Bar */}
      <header className="sim-topbar" aria-label="Simulator Controls">
        {/* Left: Pause + Brand + Mode Switcher (Challenges vs Free Roam) */}
        <div className="sim-topbar__left">
          <button
            type="button"
            className="sim-topbar__pause-btn"
            onClick={() => {
              clearVirtualDrivingInputs();
              setIsPaused((prev) => !prev);
            }}
            aria-label={isPaused ? 'Resume Simulator' : 'Pause Simulator'}
            title="Pause / Menu (Esc)"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>

          <div className="sim-topbar__brand">
            <span className="sim-topbar__brand-mark" aria-hidden="true" />
            <span className="sim-topbar__brand-text">PARKLAB 3D</span>
          </div>

          {/* Mode Tabs: Challenges vs Free Roam (Real Earth) */}
          <div
            className="sim-topbar__mode-tabs"
            role="tablist"
            aria-label="Simulation Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={simulationMode === 'challenges'}
              className={`sim-topbar__mode-tab ${
                simulationMode === 'challenges'
                  ? 'sim-topbar__mode-tab--active-challenges'
                  : ''
              }`}
              onClick={() => handleSelectMode('challenges')}
            >
              <Compass size={13} aria-hidden="true" />
              <span>Challenges</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={simulationMode === 'freeroam'}
              className={`sim-topbar__mode-tab ${
                simulationMode === 'freeroam'
                  ? 'sim-topbar__mode-tab--active-freeroam'
                  : ''
              }`}
              onClick={() => handleSelectMode('freeroam')}
            >
              <Globe size={13} aria-hidden="true" />
              <span>Free Roam · Real Earth</span>
            </button>
          </div>
        </div>

        {/* Center: 5-Manoeuvre Switcher (Challenges Mode) OR Real-Earth City Switcher (Free Roam Mode) */}
        {simulationMode === 'challenges' ? (
          <nav
            className="sim-topbar__switcher"
            aria-label="In-Game Parking Manoeuvre Switcher"
          >
            {CHALLENGES.map((item, idx) => {
              const isCurrent = item.id === selectedChallengeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sim-topbar__challenge-pill ${
                    isCurrent ? 'sim-topbar__challenge-pill--active' : ''
                  }`}
                  onClick={() => handleSelectChallenge(item.id)}
                  aria-pressed={isCurrent}
                  title={`${item.title} (${item.difficulty})`}
                >
                  <span className="sim-topbar__challenge-num">0{idx + 1}</span>
                  <span>{SHORT_CHALLENGE_LABELS[item.id] ?? item.title}</span>
                </button>
              );
            })}
          </nav>
        ) : (
          <nav
            className="sim-topbar__switcher"
            aria-label="Real-Earth City Quick Switcher"
          >
            {REAL_CITIES_PRESETS.map((city) => {
              const isCurrent = city.id === activeCity.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  className={`sim-topbar__challenge-pill ${
                    isCurrent ? 'sim-topbar__challenge-pill--active' : ''
                  }`}
                  onClick={() => handleSelectCity(city)}
                  aria-pressed={isCurrent}
                  title={`${city.name} (${city.lat.toFixed(4)}, ${city.lng.toFixed(4)})`}
                >
                  <MapPin size={11} aria-hidden="true" />
                  <span>{city.name}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: Driver Rank/XP Leaderboard Button, Craft Lab & AI Coach, Vehicle Quick-Switcher, Guides Toggle, and Showcase Exit */}
        <div className="sim-topbar__right">
          <button
            type="button"
            className={`sim-topbar__tool-btn ${
              showCustomizationDrawer ? 'sim-topbar__tool-btn--active' : ''
            }`}
            onClick={() => setShowCustomizationDrawer((prev) => !prev)}
            title={`3D Car Craft (${skinSpec.badge} • ${themeSpec.badge}) & AI Voice/Webcam Coach`}
          >
            <Palette size={13} aria-hidden="true" />
            <span>
              {showCustomizationDrawer
                ? 'Close Studio & AI'
                : 'Craft Lab & AI Coach'}
            </span>
          </button>

          <button
            type="button"
            className="sim-topbar__tool-btn sim-topbar__leaderboard-btn"
            onClick={() => setIsLeaderboardOpen(true)}
            title="Open Global Park Master Leaderboard & Driver XP Profile"
          >
            <Trophy size={13} aria-hidden="true" />
            <span>
              LV {driverProfile.level} · {driverProfile.totalPoints.toLocaleString()} PTS
            </span>
          </button>

          <div className="sim-topbar__vehicle-select-wrap">
            <Car size={14} className="sim-topbar__vehicle-icon" aria-hidden="true" />
            <select
              className="sim-topbar__vehicle-select"
              value={selectedVehicleId}
              onChange={(e) => handleSelectVehicle(e.target.value)}
              aria-label="Select Active Vehicle"
            >
              {VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {simulationMode === 'challenges' && (
            <button
              type="button"
              onClick={() => setShowGuides((prev) => !prev)}
              className={`sim-topbar__tool-btn ${
                showGuides ? 'sim-topbar__tool-btn--active' : ''
              }`}
              title="Toggle Bay Guides"
            >
              {showGuides ? (
                <Eye size={14} aria-hidden="true" />
              ) : (
                <EyeOff size={14} aria-hidden="true" />
              )}
              <span>{showGuides ? 'Guides' : 'No Guides'}</span>
            </button>
          )}

          {onExitToShowcase && (
            <button
              type="button"
              onClick={() => {
                clearVirtualDrivingInputs();
                onExitToShowcase();
              }}
              className="sim-topbar__exit-btn"
              title="Return to 3D Vehicle Showcase"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Showcase</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Screen 3D Simulation Viewport */}
      <div className="sim-viewport">
        {webglSupported ? (
          <WorldSubtreeErrorBoundary
            sectionName="SimulationViewport"
            fallback={
              <div
                role="alert"
                style={{
                  padding: '2rem',
                  backgroundColor: '#11151c',
                  color: '#f8fafc',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                PARKLAB 3D Simulation Viewport encountered a rendering error and
                recovered safely.
              </div>
            }
          >
            <Canvas
              shadows
              camera={{ fov: 50, near: 0.1, far: 420, position: [0, 5, 10] }}
              dpr={[1, 2]}
              style={{ width: '100%', height: '100%' }}
            >
              <StudioReflectionEnv />
              <DrivingCamera
                targetPosition={
                  isReplaying
                    ? currentReplayFrame.position
                    : vehicleState.position
                }
                targetRotationY={
                  isReplaying
                    ? currentReplayFrame.rotationY
                    : vehicleState.rotationY
                }
                mode={cameraMode}
              />

              {simulationMode === 'freeroam' ? (
                <RealCityEnvironment city={activeCity} enableShadows />
              ) : (
                <>
                  <ParkingEnvironment enableShadows />
                  <ChallengeScene
                    challenge={activeChallenge}
                    showGuides={showGuides}
                  />
                </>
              )}

              {/* Floating 3D Rival Driver Nameplates (LV 85 PARK MASTER · ARTHUR / YUSUFDEMIR201) */}
              <RivalNameplates3D obstacles={activeObstacles} />

              {isReplaying ? (
                <ReplaySceneActor
                  vehicle={selectedVehicle}
                  frames={completedReplayFrames}
                  currentFrame={currentReplayFrame}
                />
              ) : (
                <VehicleController
                  vehicle={selectedVehicle}
                  initialPosition={currentSpawnPosition}
                  initialRotationY={currentSpawnRotationY}
                  obstacles={activeObstacles}
                  worldBounds={
                    simulationMode === 'freeroam'
                      ? FREE_ROAM_WORLD_BOUNDS
                      : undefined
                  }
                  enabled={!evaluationResult && !isPaused && !isCarTotaled}
                  onStateChange={handleVehicleStateChange}
                  onCollision={handleCollision}
                  resetKey={attemptResetKey}
                />
              )}
            </Canvas>
          </WorldSubtreeErrorBoundary>
        ) : (
          <div
            role="alert"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '2rem',
              backgroundColor: '#11151c',
              color: '#f8fafc',
              textAlign: 'center',
            }}
          >
            <strong>3D WebGL Viewport Unavailable</strong>
            <span style={{ color: '#94a3b8', maxWidth: '48ch' }}>
              WebGL hardware acceleration is required to render the 3D driving
              environment. HUD and evaluation controls remain active below.
            </span>
          </div>
        )}

        {/* Live Gameplay Cockpit HUD Overlay OR Completed-Challenge Replay Overlay */}
        <div className="sim-hud-layer">
          {isReplaying ? (
            <ReplayControlsOverlay
              challengeTitle={activeChallenge.title}
              vehicleName={selectedVehicle.name}
              currentFrame={currentReplayFrame}
              currentTimeSec={replayTimeSec}
              totalDurationSec={totalReplayDurationSec}
              isPlaying={isReplayPlaying}
              playbackRate={replayPlaybackRate}
              cameraMode={cameraMode}
              onTogglePlay={() => {
                if (!isReplayPlaying && replayTimeSec >= totalReplayDurationSec) {
                  setReplayTimeSec(0);
                }
                setIsReplayPlaying((prev) => !prev);
              }}
              onSeek={(nextSec) => {
                setReplayTimeSec(nextSec);
              }}
              onRestartReplay={handleRestartReplay}
              onChangePlaybackRate={(rate) => setReplayPlaybackRate(rate)}
              onToggleCamera={handleToggleCamera}
              onExitReplay={handleExitReplay}
              onNextChallenge={handleNextChallenge}
            />
          ) : (
            <ChallengeHUD
              challenge={activeChallenge}
              vehicleState={vehicleState}
              vehicle={selectedVehicle}
              metrics={metrics}
              cameraMode={cameraMode}
              simulationMode={simulationMode}
              onSelectSimulationMode={handleSelectMode}
              activeCity={activeCity}
              onSelectCity={handleSelectCity}
              driverProfile={driverProfile}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
              attemptNumber={crashLoop.attemptNumber}
              activeCrashReport={crashLoop.activeCrashReport}
              isVoiceSpeaking={crashLoop.voiceCoach.isSpeaking}
              webcamObserver={crashLoop.webcamObserver}
              onEvaluate={handleEvaluate}
              onReset={handleResetAttempt}
              onRepairVehicle={handleResetAttempt}
              onToggleCamera={handleToggleCamera}
              onDismissCrashReport={crashLoop.dismissCrashReport}
              onReplayCrashVoice={crashLoop.voiceCoach.replayLastCoaching}
              onStopCrashVoice={crashLoop.voiceCoach.stopSpeaking}
            />
          )}
        </div>

        {/* 3D CRAFT LAB & AI MULTIMODAL COACH DRAWER */}
        {showCustomizationDrawer && (
          <div
            className="sim-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="3D Car Craft Studio & AI Coach"
          >
            <div
              className="sim-leaderboard-modal"
              style={{ maxWidth: '940px', maxHeight: '88vh', overflowY: 'auto' }}
            >
              <div className="sim-leaderboard-modal__header">
                <div>
                  <span className="sim-leaderboard-modal__eyebrow">
                    <Sparkles size={12} aria-hidden="true" />{' '}
                    {skinSpec.badge} • {themeSpec.badge}
                  </span>
                  <h2 className="sim-leaderboard-modal__title">
                    3D CRAFT LAB &amp; MULTIMODAL AI COACH
                  </h2>
                </div>
                <button
                  type="button"
                  className="sim-leaderboard-modal__close"
                  onClick={() => setShowCustomizationDrawer(false)}
                  aria-label="Close Studio and AI Coach"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '0.5rem 0',
                }}
              >
                <AICoachControlsBar
                  attemptNumber={crashLoop.attemptNumber}
                  totalStoredCrashes={crashLoop.totalStoredCrashes}
                  totalStoredAttempts={crashLoop.totalStoredAttempts}
                  savedReplaysCount={crashLoop.savedReplays.length}
                  voiceCoach={crashLoop.voiceCoach}
                  soundtrack={crashLoop.soundtrack}
                  webcamObserver={crashLoop.webcamObserver}
                  latestQAExchange={crashLoop.latestQAExchange}
                  attemptComparison={crashLoop.attemptComparison}
                  onAskCoach={crashLoop.askCoach}
                  onOpenReplays={() => crashLoop.openReplayModal()}
                  onResetMemory={crashLoop.resetRAGMemory}
                />

                <CustomizationStudioPanel compact />
              </div>
            </div>
          </div>
        )}

        {/* Interactive Attempt Replay Theatre Modal */}
        {crashLoop.activeReplayToWatch && (
          <AttemptReplayModal
            activeReplay={crashLoop.activeReplayToWatch}
            allSavedReplays={crashLoop.savedReplays}
            onSelectReplay={(replay) => crashLoop.openReplayModal(replay)}
            onDeleteReplay={crashLoop.removeSavedReplay}
            onClose={crashLoop.closeReplayModal}
          />
        )}

        {/* GLOBAL PARK MASTER LEADERBOARD MODAL */}
        {isLeaderboardOpen && (
          <div
            className="sim-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Global Park Master Leaderboard"
          >
            <div className="sim-leaderboard-modal">
              <div className="sim-leaderboard-modal__header">
                <div>
                  <span className="sim-leaderboard-modal__eyebrow">
                    GLOBAL RANKINGS &amp; DRIVER PROFILE
                  </span>
                  <h2 className="sim-leaderboard-modal__title">
                    PARK MASTER LEADERBOARD
                  </h2>
                </div>
                <button
                  type="button"
                  className="sim-leaderboard-modal__close"
                  onClick={() => setIsLeaderboardOpen(false)}
                  aria-label="Close Leaderboard"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Driver Callsign & Summary Strip */}
              <div className="sim-leaderboard-modal__profile">
                <div className="sim-leaderboard-modal__profile-stat">
                  <span className="sim-leaderboard-modal__stat-label">
                    YOUR RANK
                  </span>
                  <strong className="sim-leaderboard-modal__stat-value">
                    LV {driverProfile.level} · {driverProfile.rankTitle}
                  </strong>
                </div>
                <div className="sim-leaderboard-modal__profile-stat">
                  <span className="sim-leaderboard-modal__stat-label">
                    TOTAL XP POINTS
                  </span>
                  <strong className="sim-leaderboard-modal__stat-value sim-leaderboard-modal__stat-value--gold">
                    {driverProfile.totalPoints.toLocaleString()} PTS
                  </strong>
                </div>
                <div className="sim-leaderboard-modal__profile-stat">
                  <span className="sim-leaderboard-modal__stat-label">
                    HOT STREAK
                  </span>
                  <strong className="sim-leaderboard-modal__stat-value">
                    <Flame size={13} aria-hidden="true" /> {driverProfile.currentStreak}x
                    (Best {driverProfile.bestStreak}x)
                  </strong>
                </div>
                <form
                  className="sim-leaderboard-modal__callsign-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const updated = updateDriverCallsign(callsignInput);
                    setDriverProfile(updated);
                    setCallsignInput(updated.driverName);
                  }}
                >
                  <input
                    type="text"
                    className="sim-leaderboard-modal__callsign-input"
                    value={callsignInput}
                    onChange={(e) => setCallsignInput(e.target.value)}
                    placeholder="DRIVER CALLSIGN"
                    maxLength={16}
                    aria-label="Driver Callsign"
                  />
                  <button
                    type="submit"
                    className="sim-leaderboard-modal__callsign-btn"
                  >
                    Save Tag
                  </button>
                </form>
              </div>

              {/* Standings Table */}
              <div className="pk-results__leaderboard-list">
                {getLeaderboardStandings(
                  driverProfile,
                  selectedVehicle.name
                ).map((entry) => (
                  <div
                    key={entry.id}
                    className={`pk-results__lb-row ${
                      entry.isPlayer ? 'pk-results__lb-row--player' : ''
                    }`}
                  >
                    <span className="pk-results__lb-rank">#{entry.rank}</span>
                    <div className="pk-results__lb-driver">
                      <span className="pk-results__lb-name">
                        {entry.driverName}
                        {entry.isPlayer ? ' (YOU)' : ''}
                      </span>
                      <span className="pk-results__lb-badge">
                        LV {entry.level} · {entry.rankTitle} · {entry.signatureVehicle}
                      </span>
                    </div>
                    <div className="pk-results__lb-right">
                      <span className="pk-results__lb-pts">
                        {entry.totalPoints.toLocaleString()} PTS
                      </span>
                      <span className="pk-results__lb-acc">
                        Clean Rate {entry.cleanParkRate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sim-leaderboard-modal__footer">
                <span>
                  Earn bonus points for Zero-Scratch Clean runs (+400), Laser
                  Precision (+350), Time Blitz (+450), Roadster Sky-Flight (+350),
                  and Hot Streak Multipliers!
                </span>
                <button
                  type="button"
                  className="pk-btn pk-btn--primary"
                  onClick={() => setIsLeaderboardOpen(false)}
                >
                  Back to Driving
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAR TOTALED / DEPLETED HEALTH (0%) AUTO-RESTART MODAL */}
        {isCarTotaled && !evaluationResult && (
          <div
            className="sim-modal-backdrop"
            role="alertdialog"
            aria-modal="true"
            aria-label="Vehicle Totaled — Structural Health Depleted"
          >
            <div className="sim-totaled-card">
              <span className="sim-totaled-card__badge">
                <AlertOctagon size={14} aria-hidden="true" />
                <span>STRUCTURAL HEALTH DEPLETED · 0%</span>
              </span>

              <h2 className="sim-totaled-card__title">
                VEHICLE TOTALED &amp; IMMOBILIZED
              </h2>

              <p className="sim-totaled-card__desc">
                Your <strong>{selectedVehicle.name}</strong> sustained critical
                real-world impact damage. Engine and chassis integrity reached{' '}
                <strong>0%</strong>. Automatically repairing and restarting your
                vehicle...
              </p>

              <div className="sim-totaled-card__stats">
                <div className="sim-totaled-card__stat">
                  <span className="sim-totaled-card__stat-label">
                    Car Health
                  </span>
                  <span className="sim-totaled-card__stat-value">0%</span>
                </div>
                <div className="sim-totaled-card__stat">
                  <span className="sim-totaled-card__stat-label">
                    Parts Lost
                  </span>
                  <span className="sim-totaled-card__stat-value">
                    {detachedPartsCount} detached
                  </span>
                </div>
                <div className="sim-totaled-card__stat">
                  <span className="sim-totaled-card__stat-label">
                    Chassis Dents
                  </span>
                  <span className="sim-totaled-card__stat-value">
                    {dentsCount} impacts
                  </span>
                </div>
              </div>

              {totaledCountdown !== null && (
                <div className="sim-totaled-card__countdown">
                  Auto-restarting with 100% health in {totaledCountdown.toFixed(1)}s...
                </div>
              )}

              <div className="sim-totaled-card__actions">
                <button
                  type="button"
                  className="pk-btn pk-btn--primary"
                  onClick={handleResetAttempt}
                >
                  <Wrench size={15} aria-hidden="true" />
                  <span>Restart Car Now (100% Health)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause Menu Overlay */}
        {isPaused && !evaluationResult && !isCarTotaled && (
          <div
            className="sim-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Simulator Paused"
          >
            <div className="sim-pause-card">
              <span className="sim-pause-card__eyebrow">SIMULATOR PAUSED</span>
              <h2 className="sim-pause-card__title">
                {simulationMode === 'freeroam'
                  ? `Free Roam: ${activeCity.name}`
                  : activeChallenge.title}
              </h2>
              <p className="sim-pause-card__subtitle">
                Driving <strong>{selectedVehicle.name}</strong> — Switch between
                UK DVSA Challenges and Real-Earth Free Roam (Central London,
                Harrow UK, or any global address/coordinates).
              </p>

              <div className="sim-pause-card__section">
                <span className="sim-pause-card__label">
                  REAL-EARTH FREE ROAM CITIES
                </span>
                <div className="sim-pause-card__grid">
                  {REAL_CITIES_PRESETS.slice(0, 6).map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      className={`sim-pause-card__option ${
                        simulationMode === 'freeroam' &&
                        city.id === activeCity.id
                          ? 'sim-pause-card__option--active'
                          : ''
                      }`}
                      onClick={() => handleSelectCity(city)}
                    >
                      <MapPin size={13} className="sim-pause-card__option-num" />
                      <span>{city.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sim-pause-card__section">
                <span className="sim-pause-card__label">
                  UK DVSA PARKING CHALLENGES
                </span>
                <div className="sim-pause-card__grid">
                  {CHALLENGES.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`sim-pause-card__option ${
                        simulationMode === 'challenges' &&
                        c.id === selectedChallengeId
                          ? 'sim-pause-card__option--active'
                          : ''
                      }`}
                      onClick={() => handleSelectChallenge(c.id)}
                    >
                      <span className="sim-pause-card__option-num">
                        0{idx + 1}
                      </span>
                      <span>{c.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sim-pause-card__section">
                <span className="sim-pause-card__label">SELECT VEHICLE</span>
                <div className="sim-pause-card__vehicles">
                  {VEHICLES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`sim-pause-card__option ${
                        v.id === selectedVehicleId
                          ? 'sim-pause-card__option--active'
                          : ''
                      }`}
                      onClick={() => handleSelectVehicle(v.id)}
                    >
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sim-pause-card__actions">
                <button
                  type="button"
                  className="pk-btn pk-btn--primary"
                  onClick={() => setIsPaused(false)}
                >
                  <Play size={15} />
                  <span>Resume Driving</span>
                </button>
                <button
                  type="button"
                  className="pk-btn pk-btn--secondary"
                  onClick={handleResetAttempt}
                >
                  <RotateCcw size={15} />
                  <span>Repair &amp; Restart</span>
                </button>
                {onExitToShowcase && (
                  <button
                    type="button"
                    className="pk-btn pk-btn--secondary"
                    onClick={() => {
                      setIsPaused(false);
                      onExitToShowcase();
                    }}
                  >
                    <ArrowLeft size={15} />
                    <span>Exit to 3D Showcase</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assessment Results Modal Overlay */}
        {evaluationResult && !isReplaying && (
          <div className="sim-modal-backdrop">
            <ResultsPanel
              result={evaluationResult}
              challenge={activeChallenge}
              attemptComparison={crashLoop.attemptComparison}
              recentCrashReport={crashLoop.activeCrashReport}
              pointsBreakdown={lastPointsBreakdown}
              driverProfile={driverProfile}
              vehicleName={selectedVehicle.name}
              onRetry={handleResetAttempt}
              onNextChallenge={handleNextChallenge}
              onWatchReplay={
                simulationMode === 'challenges' &&
                evaluationResult.passed &&
                completedReplayFrames.length > 0
                  ? handleStartReplay
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulationScreen;
