import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import {
  Car,
  Compass,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { VehicleRuntimeState } from '../../types/vehicle.types';
import type {
  ChallengeId,
  ObstacleDefinition,
} from '../../types/challenge.types';
import type {
  ParkingAttemptMetrics,
  ParkingEvaluationResult,
} from '../../types/evaluation.types';
import {
  ParkingEnvironment,
  DrivingCamera,
  WorldSubtreeErrorBoundary,
  isWebGLAvailable,
  type CameraMode,
} from '../world';
import {
  VEHICLES,
  getVehicleById,
  VehicleController,
  VehicleSelector,
} from '../vehicles';
import {
  CHALLENGES,
  DEFAULT_CHALLENGE,
  getChallengeById,
  ChallengeScene,
} from '../challenges';
import {
  evaluateParking,
  type PullUpRightTelemetryExtension,
} from '../evaluation';
import {
  ChallengeSelector,
  ChallengeHUD,
  ResultsPanel,
} from '../challenge-ui';

type ExtendedAttemptMetrics = ParkingAttemptMetrics &
  PullUpRightTelemetryExtension;

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
  };
}

/**
 * Main integrated simulation screen (Section 4.7).
 * Connects Faizan's 3D World & Camera, Joachim's Vehicle Physics & Models,
 * and Anjila's Challenges, Evaluation & Gameplay HUD.
 */
export function SimulationScreen() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve initial vehicle and challenge from URL search params if valid
  const initialVehicleId = useMemo<string>(() => {
    const param = searchParams.get('vehicle');
    if (param && VEHICLES.some((v) => v.id === param)) {
      return param;
    }
    return VEHICLES[0].id;
  }, [searchParams]);

  const initialChallengeId = useMemo<ChallengeId>(() => {
    const param = searchParams.get('challenge') as ChallengeId | null;
    if (param && CHALLENGES.some((c) => c.id === param)) {
      return param;
    }
    return DEFAULT_CHALLENGE.id;
  }, [searchParams]);

  const [selectedVehicleId, setSelectedVehicleId] =
    useState<string>(initialVehicleId);
  const [selectedChallengeId, setSelectedChallengeId] =
    useState<ChallengeId>(initialChallengeId);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [attemptResetKey, setAttemptResetKey] = useState<number>(0);
  const [showSelectorsPanel, setShowSelectorsPanel] = useState<boolean>(true);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  const selectedVehicle = useMemo(
    () => getVehicleById(selectedVehicleId),
    [selectedVehicleId]
  );
  const activeChallenge = useMemo(
    () => getChallengeById(selectedChallengeId),
    [selectedChallengeId]
  );

  const [vehicleState, setVehicleState] = useState<VehicleRuntimeState>(() =>
    createInitialVehicleState(
      activeChallenge.spawnPosition,
      activeChallenge.spawnRotationY
    )
  );

  const [metrics, setMetrics] = useState<ExtendedAttemptMetrics>({
    elapsedSeconds: 0,
    collisions: 0,
    corrections: 0,
  });

  const [evaluationResult, setEvaluationResult] =
    useState<ParkingEvaluationResult | null>(null);

  // Refs for accurate manoeuvre telemetry tracking across animation frames
  const hasEnteredReverseRef = useRef<boolean>(false);
  const lastActiveGearRef = useRef<'forward' | 'reverse' | null>(null);
  const lastPositionRef = useRef<[number, number, number]>(
    activeChallenge.spawnPosition
  );
  const pullUpStageReachedRef = useRef<boolean>(false);
  const reversedDistanceRef = useRef<number>(0);

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());
  }, []);

  // Synchronise state if URL params change externally
  useEffect(() => {
    const vehicleParam = searchParams.get('vehicle');
    if (
      vehicleParam &&
      VEHICLES.some((v) => v.id === vehicleParam) &&
      vehicleParam !== selectedVehicleId
    ) {
      setSelectedVehicleId(vehicleParam);
    }
    const challengeParam = searchParams.get('challenge') as ChallengeId | null;
    if (
      challengeParam &&
      CHALLENGES.some((c) => c.id === challengeParam) &&
      challengeParam !== selectedChallengeId
    ) {
      setSelectedChallengeId(challengeParam);
    }
  }, [searchParams, selectedVehicleId, selectedChallengeId]);

  // Reset attempt state helper
  const resetAttemptState = useCallback(
    (spawnPosition: [number, number, number], spawnRotationY: number) => {
      hasEnteredReverseRef.current = false;
      lastActiveGearRef.current = null;
      lastPositionRef.current = [
        spawnPosition[0],
        spawnPosition[1],
        spawnPosition[2],
      ];
      pullUpStageReachedRef.current = false;
      reversedDistanceRef.current = 0;

      setEvaluationResult(null);
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

  // Elapsed timer while attempt is active (not evaluated yet)
  useEffect(() => {
    if (evaluationResult) {
      return;
    }
    const interval = window.setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        elapsedSeconds: Number((prev.elapsedSeconds + 0.25).toFixed(2)),
      }));
    }, 250);

    return () => window.clearInterval(interval);
  }, [evaluationResult, attemptResetKey]);

  const handleSelectVehicle = useCallback(
    (vehicleId: string) => {
      setSelectedVehicleId(vehicleId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('vehicle', vehicleId);
          next.set('challenge', selectedChallengeId);
          return next;
        },
        { replace: true }
      );
      resetAttemptState(
        activeChallenge.spawnPosition,
        activeChallenge.spawnRotationY
      );
    },
    [
      activeChallenge.spawnPosition,
      activeChallenge.spawnRotationY,
      resetAttemptState,
      selectedChallengeId,
      setSearchParams,
    ]
  );

  const handleSelectChallenge = useCallback(
    (challengeId: ChallengeId) => {
      const nextChallenge = getChallengeById(challengeId);
      setSelectedChallengeId(challengeId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('vehicle', selectedVehicleId);
          next.set('challenge', challengeId);
          return next;
        },
        { replace: true }
      );
      resetAttemptState(
        nextChallenge.spawnPosition,
        nextChallenge.spawnRotationY
      );
    },
    [resetAttemptState, selectedVehicleId, setSearchParams]
  );

  const handleResetAttempt = useCallback(() => {
    resetAttemptState(
      activeChallenge.spawnPosition,
      activeChallenge.spawnRotationY
    );
  }, [
    activeChallenge.spawnPosition,
    activeChallenge.spawnRotationY,
    resetAttemptState,
  ]);

  const handleToggleCamera = useCallback(() => {
    setCameraMode((prev) => (prev === 'follow' ? 'overhead' : 'follow'));
  }, []);

  const handleVehicleStateChange = useCallback(
    (nextState: VehicleRuntimeState) => {
      setVehicleState(nextState);

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

      // Track pull-up-on-the-right stage progression
      if (
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
    [activeChallenge.id]
  );

  const handleCollision = useCallback(
    (_obstacle: ObstacleDefinition, totalCollisions: number) => {
      setMetrics((prev) => ({
        ...prev,
        collisions: Math.max(prev.collisions, totalCollisions),
      }));
    },
    []
  );

  const handleEvaluate = useCallback(() => {
    const result = evaluateParking(
      activeChallenge,
      selectedVehicle,
      vehicleState,
      metrics
    );
    setEvaluationResult(result);
  }, [activeChallenge, selectedVehicle, vehicleState, metrics]);

  const handleNextChallenge = useCallback(() => {
    const currentIndex = CHALLENGES.findIndex(
      (c) => c.id === selectedChallengeId
    );
    const nextChallenge =
      CHALLENGES[(currentIndex + 1) % CHALLENGES.length] ?? DEFAULT_CHALLENGE;
    handleSelectChallenge(nextChallenge.id);
  }, [selectedChallengeId, handleSelectChallenge]);

  // Keyboard shortcuts for Camera ('C') and Evaluate ('Enter' / 'E')
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

      if (event.code === 'KeyC' && !event.repeat) {
        event.preventDefault();
        handleToggleCamera();
      } else if (
        (event.code === 'KeyE' || event.code === 'Enter') &&
        !event.repeat &&
        !evaluationResult
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
  }, [evaluationResult, handleEvaluate, handleToggleCamera]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
      }}
    >
      {/* Top Simulation Control & Telemetry Ribbon */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.75rem 1.15rem',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span className="placeholder-card__eyebrow">
            <Car size={14} aria-hidden="true" />
            <span>{selectedVehicle.name}</span>
          </span>

          <span
            className="placeholder-card__eyebrow"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderColor: 'rgba(16, 185, 129, 0.35)',
              color: '#34d399',
            }}
          >
            <Compass size={14} aria-hidden="true" />
            <span>{activeChallenge.title}</span>
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleToggleCamera}
            className="btn-secondary"
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
            title="Switch Camera Mode (Shortcut: C)"
          >
            <Camera size={15} aria-hidden="true" />
            <span>
              Camera: {cameraMode === 'follow' ? 'Follow' : 'Overhead'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuides((prev) => !prev)}
            className="btn-secondary"
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
          >
            {showGuides ? (
              <Eye size={15} aria-hidden="true" />
            ) : (
              <EyeOff size={15} aria-hidden="true" />
            )}
            <span>{showGuides ? 'Guides On' : 'Guides Off'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetAttempt}
            className="btn-secondary"
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
            title="Reset Vehicle Position (Shortcut: R)"
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleEvaluate}
            className="pk-btn pk-btn--primary"
            style={{ padding: '0.42rem 0.85rem' }}
            title="Assess Parking Accuracy (Shortcut: E)"
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>Park &amp; Evaluate</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSelectorsPanel((prev) => !prev)}
            className="btn-secondary"
            style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
          >
            {showSelectorsPanel ? (
              <ChevronUp size={15} aria-hidden="true" />
            ) : (
              <ChevronDown size={15} aria-hidden="true" />
            )}
            <span>
              {showSelectorsPanel
                ? 'Hide Garage & Challenges'
                : 'Change Car / Manoeuvre'}
            </span>
          </button>
        </div>
      </div>

      {/* Main 3D Simulation Viewport + Non-Obstructive HUD Overlay */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '72vh',
          minHeight: '540px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--color-border-strong)',
          boxShadow: 'var(--shadow-card)',
          backgroundColor: '#0b0d10',
        }}
      >
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
              camera={{ fov: 50, near: 0.1, far: 300, position: [0, 5, 10] }}
              dpr={[1, 2]}
              style={{ width: '100%', height: '100%' }}
            >
              <DrivingCamera
                targetPosition={vehicleState.position}
                targetRotationY={vehicleState.rotationY}
                mode={cameraMode}
              />

              <ParkingEnvironment enableShadows />

              <ChallengeScene
                challenge={activeChallenge}
                showGuides={showGuides}
              />

              <VehicleController
                vehicle={selectedVehicle}
                initialPosition={activeChallenge.spawnPosition}
                initialRotationY={activeChallenge.spawnRotationY}
                obstacles={activeChallenge.obstacles}
                enabled={!evaluationResult}
                onStateChange={handleVehicleStateChange}
                onCollision={handleCollision}
                resetKey={attemptResetKey}
              />
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

        {/* Live Gameplay HUD Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 5,
          }}
        >
          <ChallengeHUD
            challenge={activeChallenge}
            vehicleState={vehicleState}
            vehicle={selectedVehicle}
            metrics={metrics}
            cameraMode={cameraMode}
            onEvaluate={handleEvaluate}
            onReset={handleResetAttempt}
            onToggleCamera={handleToggleCamera}
          />
        </div>

        {/* Assessment Results Modal Overlay */}
        {evaluationResult && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(11, 13, 16, 0.78)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
              overflowY: 'auto',
              zIndex: 10,
            }}
          >
            <ResultsPanel
              result={evaluationResult}
              challenge={activeChallenge}
              onRetry={handleResetAttempt}
              onNextChallenge={handleNextChallenge}
            />
          </div>
        )}
      </div>

      {/* Integrated Challenge & Vehicle Selection Trays */}
      {showSelectorsPanel && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            padding: '1.5rem',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <ChallengeSelector
            challenges={CHALLENGES}
            selectedChallengeId={selectedChallengeId}
            onSelect={handleSelectChallenge}
            compact
          />

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--color-border-subtle)',
            }}
          />

          <VehicleSelector
            selectedVehicleId={selectedVehicleId}
            onSelect={handleSelectVehicle}
          />
        </div>
      )}
    </div>
  );
}

export default SimulationScreen;
