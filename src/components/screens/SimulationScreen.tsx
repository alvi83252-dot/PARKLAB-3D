import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import {
  ArrowLeft,
  Camera,
  Car,
  Compass,
  Flag,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';
import {
  CHALLENGES,
  ChallengeHUD,
  ChallengeScene,
  ResultsPanel,
  evaluateParking,
  getChallengeById,
  getNextChallenge,
  type ChallengeId,
  type ParkingEvaluationResult,
  type VehicleRuntimeState,
} from '../../features/challenges';
import {
  computeFootprintContainment,
  normalizeAngleRadians,
  type PullUpRightTelemetryExtension,
} from '../../features/evaluation';
import {
  VEHICLES,
  VehicleController,
  getChassisSpec,
  getVehicleById,
} from '../../features/vehicles';
import {
  DrivingCamera,
  ParkingEnvironment,
  type CanonicalCameraMode,
} from '../../features/world';

function createInitialVehicleRuntimeState(
  spawnPosition: [number, number, number],
  spawnRotationY: number
): VehicleRuntimeState {
  return {
    position: [spawnPosition[0], spawnPosition[1], spawnPosition[2]],
    rotationY: spawnRotationY,
    speedMps: 0,
    steeringAngle: 0,
    collisionCount: 0,
    isMoving: false,
  };
}

export function SimulationScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialChallengeId =
    (searchParams.get('challenge') as ChallengeId | null) || CHALLENGES[0].id;
  const initialVehicleId = searchParams.get('vehicle') || 'tesla-roadster';

  const [challengeId, setChallengeId] =
    useState<ChallengeId>(initialChallengeId);
  const [vehicleId, setVehicleId] = useState<string>(initialVehicleId);
  const [cameraMode, setCameraMode] = useState<CanonicalCameraMode>('follow');
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const activeChallenge = useMemo(
    () => getChallengeById(challengeId),
    [challengeId]
  );
  const activeVehicle = useMemo(() => getVehicleById(vehicleId), [vehicleId]);
  const chassisSpec = useMemo(
    () => getChassisSpec(activeVehicle),
    [activeVehicle]
  );
  const isFlyingRoadster = Boolean(chassisSpec.isFlyingVehicle);

  const [vehicleState, setVehicleState] = useState<VehicleRuntimeState>(() =>
    createInitialVehicleRuntimeState(
      activeChallenge.spawnPosition,
      activeChallenge.spawnRotationY
    )
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [corrections, setCorrections] = useState<number>(0);
  const [evaluationResult, setEvaluationResult] =
    useState<ParkingEvaluationResult | null>(null);

  // Telemetry refs for direction-change (shunt) counting & pull-up-right tracking
  const attemptStartMsRef = useRef<number>(performance.now());
  const lastDirectionRef = useRef<-1 | 0 | 1>(0);
  const lastPositionRef = useRef<[number, number, number]>(
    activeChallenge.spawnPosition
  );
  const reachedPullUpStageRef = useRef<boolean>(false);
  const reversedDistanceRef = useRef<number>(0);
  const autoAssessTimerRef = useRef<number | null>(null);

  const handleResetAttempt = useCallback(
    (nextChallenge = activeChallenge) => {
      setEvaluationResult(null);
      setElapsedSeconds(0);
      setCorrections(0);
      attemptStartMsRef.current = performance.now();
      lastDirectionRef.current = 0;
      lastPositionRef.current = nextChallenge.spawnPosition;
      reachedPullUpStageRef.current = false;
      reversedDistanceRef.current = 0;
      if (autoAssessTimerRef.current !== null) {
        window.clearTimeout(autoAssessTimerRef.current);
        autoAssessTimerRef.current = null;
      }
      setVehicleState(
        createInitialVehicleRuntimeState(
          nextChallenge.spawnPosition,
          nextChallenge.spawnRotationY
        )
      );
      setResetTrigger((c) => c + 1);
    },
    [activeChallenge]
  );

  const handleSelectChallenge = useCallback(
    (newId: ChallengeId) => {
      const nextChall = getChallengeById(newId);
      setChallengeId(nextChall.id);
      setSearchParams({ challenge: nextChall.id, vehicle: vehicleId });
      handleResetAttempt(nextChall);
    },
    [handleResetAttempt, setSearchParams, vehicleId]
  );

  const handleSelectVehicle = useCallback(
    (newVehicleId: string) => {
      setVehicleId(newVehicleId);
      setSearchParams({ challenge: challengeId, vehicle: newVehicleId });
      handleResetAttempt(activeChallenge);
    },
    [activeChallenge, challengeId, handleResetAttempt, setSearchParams]
  );

  const handleToggleCamera = useCallback(() => {
    setCameraMode((prev) => (prev === 'follow' ? 'overhead' : 'follow'));
  }, []);

  const handleEvaluateParking = useCallback(() => {
    const durationSec = Math.max(
      0.5,
      (performance.now() - attemptStartMsRef.current) / 1000
    );
    const metrics: PullUpRightTelemetryExtension = {
      elapsedSeconds: durationSec,
      collisions: vehicleState.collisionCount,
      corrections,
      reachedPullUpStage: reachedPullUpStageRef.current,
      reversedDistanceMeters: reversedDistanceRef.current,
    };

    const result = evaluateParking(
      activeChallenge,
      activeVehicle,
      vehicleState,
      metrics
    );
    setEvaluationResult(result);
  }, [activeChallenge, activeVehicle, corrections, vehicleState]);

  const handleNextChallenge = useCallback(() => {
    const nextChall = getNextChallenge(activeChallenge.id);
    handleSelectChallenge(nextChall.id);
  }, [activeChallenge.id, handleSelectChallenge]);

  // Live timer while attempt is active
  useEffect(() => {
    if (evaluationResult) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((performance.now() - attemptStartMsRef.current) / 1000);
    }, 200);
    return () => window.clearInterval(interval);
  }, [evaluationResult]);

  // Keyboard shortcuts: C (switch camera), R (reset), Enter (assess parking)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.code === 'KeyC') {
        handleToggleCamera();
      } else if (event.code === 'KeyR') {
        handleResetAttempt();
      } else if (event.code === 'Enter' && !evaluationResult) {
        handleEvaluateParking();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    evaluationResult,
    handleEvaluateParking,
    handleResetAttempt,
    handleToggleCamera,
  ]);

  // Handle vehicle physics telemetry updates + auto-assess when parked cleanly in bay
  const handleVehicleStateChange = useCallback(
    (nextState: VehicleRuntimeState) => {
      setVehicleState(nextState);

      // Track direction changes (corrections / shunts)
      const speed = nextState.speedMps;
      const currentDir: -1 | 0 | 1 =
        speed > 0.25 ? 1 : speed < -0.25 ? -1 : lastDirectionRef.current;

      if (
        lastDirectionRef.current !== 0 &&
        currentDir !== 0 &&
        currentDir !== lastDirectionRef.current
      ) {
        setCorrections((prev) => prev + 1);
      }
      if (currentDir !== 0) {
        lastDirectionRef.current = currentDir;
      }

      // Track pull-up-right Stage 1 & reversing distance
      const prevPos = lastPositionRef.current;
      const stepDist = Math.hypot(
        nextState.position[0] - prevPos[0],
        nextState.position[2] - prevPos[2]
      );
      if (speed < -0.08 && stepDist < 1.5) {
        reversedDistanceRef.current += stepDist;
      }
      lastPositionRef.current = nextState.position;

      if (activeChallenge.id === 'pull-up-right') {
        const dxStage1 = Math.abs(nextState.position[0] - 3.3);
        const dzStage1 = Math.abs(nextState.position[2] - -4.2);
        if (dxStage1 < 1.3 && dzStage1 < 2.8) {
          reachedPullUpStageRef.current = true;
        }
      }
    },
    [activeChallenge.id]
  );

  // Automatic dwell assessment when all 4 corners are inside bay and vehicle comes to a complete stop
  useEffect(() => {
    if (evaluationResult) {
      if (autoAssessTimerRef.current !== null) {
        window.clearTimeout(autoAssessTimerRef.current);
        autoAssessTimerRef.current = null;
      }
      return;
    }

    const containment = computeFootprintContainment(
      activeChallenge.parkingTarget,
      activeVehicle.dimensions,
      vehicleState.position,
      vehicleState.rotationY
    );
    const headingErrorDeg = Math.abs(
      (normalizeAngleRadians(
        vehicleState.rotationY - activeChallenge.parkingTarget.rotationY
      ) *
        180) /
        Math.PI
    );
    const isStopped =
      !vehicleState.isMoving && Math.abs(vehicleState.speedMps) <= 0.06;

    if (containment.allCornersInside && isStopped && headingErrorDeg <= 12) {
      if (autoAssessTimerRef.current === null) {
        autoAssessTimerRef.current = window.setTimeout(() => {
          autoAssessTimerRef.current = null;
          handleEvaluateParking();
        }, 1100);
      }
    } else if (autoAssessTimerRef.current !== null) {
      window.clearTimeout(autoAssessTimerRef.current);
      autoAssessTimerRef.current = null;
    }
  }, [
    activeChallenge.parkingTarget,
    activeVehicle.dimensions,
    evaluationResult,
    handleEvaluateParking,
    vehicleState.isMoving,
    vehicleState.position,
    vehicleState.rotationY,
    vehicleState.speedMps,
  ]);

  return (
    <section
      aria-label="3D Parking Simulation Arena"
      style={{
        width: 'min(1380px, 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Top Arena Control Bar: Challenge Switcher + 4-Vehicle Selector (including Flying Roadster) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Left: Navigation & Challenge Quick Select */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Link
            to={APP_ROUTES.CHALLENGES}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.78rem' }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Challenges</span>
          </Link>

          <Link
            to={`${APP_ROUTES.VEHICLES}?vehicle=${activeVehicle.id}`}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.78rem' }}
          >
            <Car size={14} aria-hidden="true" />
            <span>3D Hangar</span>
          </Link>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '10px',
              background: 'rgba(30, 41, 59, 0.75)',
              border: '1px solid rgba(148, 163, 184, 0.22)',
            }}
          >
            <Compass size={14} style={{ color: '#38bdf8' }} />
            <select
              aria-label="Select Parking Challenge"
              value={activeChallenge.id}
              onChange={(e) =>
                handleSelectChallenge(e.target.value as ChallengeId)
              }
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {CHALLENGES.map((chall, idx) => (
                <option
                  key={chall.id}
                  value={chall.id}
                  style={{ background: '#0f172a', color: '#f8fafc' }}
                >
                  #{idx + 1} {chall.title} ({chall.difficulty})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: 4-Vehicle Live Switcher Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {VEHICLES.map((v) => {
            const isSelected = v.id === activeVehicle.id;
            const vSpec = getChassisSpec(v);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelectVehicle(v.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 11px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isSelected
                    ? 'rgba(56, 189, 248, 0.22)'
                    : 'rgba(30, 41, 59, 0.65)',
                  color: isSelected ? '#f8fafc' : '#cbd5e1',
                  border: `1px solid ${
                    isSelected ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: v.bodyColor,
                    boxShadow: vSpec.isFlyingVehicle
                      ? '0 0 8px #38bdf8'
                      : 'none',
                  }}
                />
                <span>{v.name}</span>
                {vSpec.isFlyingVehicle && (
                  <Sparkles size={11} style={{ color: '#38bdf8' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Camera & Assessment Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleToggleCamera}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#e2e8f0',
              border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            <Camera size={14} />
            <span>
              {cameraMode === 'follow' ? 'Chase Cam (C)' : 'Overhead Cam (C)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleResetAttempt()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#e2e8f0',
              border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            <RotateCcw size={14} />
            <span>Reset (R)</span>
          </button>

          <button
            type="button"
            onClick={handleEvaluateParking}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#f8fafc',
              border: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Flag size={14} />
            <span>Assess Parking (Enter)</span>
          </button>
        </div>
      </div>

      {/* Main 3D Simulation Viewport + HUD Overlay */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'min(74vh, 690px)',
          minHeight: '540px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#090d16',
          border: isFlyingRoadster
            ? '1px solid rgba(56, 189, 248, 0.38)'
            : '1px solid rgba(148, 163, 184, 0.24)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.72)',
        }}
      >
        <Canvas
          shadows
          camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 260 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Complete 3D Outdoor UK Parking Facility Environment */}
          <ParkingEnvironment
            showDecorativeVehicles={true}
            showBuildings={true}
            showStreetFurniture={true}
            enableShadows={true}
          />

          {/* Active Challenge Target Bay, Guides, and 3D Obstacles */}
          <ChallengeScene challenge={activeChallenge} showGuides={true} />

          {/* Player 3D Vehicle Controller (Hovering Flying Roadster or Wheeled Vehicles) */}
          <VehicleController
            key={`${activeChallenge.id}-${activeVehicle.id}`}
            vehicle={activeVehicle}
            initialPosition={activeChallenge.spawnPosition}
            initialRotationY={activeChallenge.spawnRotationY}
            obstacles={activeChallenge.obstacles}
            enabled={!evaluationResult}
            resetTrigger={resetTrigger}
            onStateChange={handleVehicleStateChange}
          />

          {/* Smooth Follow / Overhead Camera Controller */}
          <DrivingCamera
            targetPosition={vehicleState.position}
            targetRotationY={vehicleState.rotationY}
            mode={cameraMode}
          />
        </Canvas>

        {/* Live Telemetry & Manoeuvre HUD */}
        <ChallengeHUD
          challenge={activeChallenge}
          vehicleState={vehicleState}
          vehicle={activeVehicle}
          metrics={{
            elapsedSeconds,
            collisions: vehicleState.collisionCount,
            corrections,
          }}
          cameraMode={cameraMode}
          onEvaluate={handleEvaluateParking}
          onReset={() => handleResetAttempt()}
          onToggleCamera={handleToggleCamera}
        />

        {/* Deterministic Parking Assessment Results Modal Overlay */}
        {evaluationResult && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              background: 'rgba(2, 6, 23, 0.76)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ width: 'min(680px, 100%)', maxHeight: '92%', overflowY: 'auto' }}>
              <ResultsPanel
                result={evaluationResult}
                challenge={activeChallenge}
                onRetry={() => handleResetAttempt()}
                onNextChallenge={handleNextChallenge}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
