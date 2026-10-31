/**
 * PARKLAB 3D — Continuous Crash Feedback Loop & Multimodal RAG Coaching Hook
 *
 * Orchestrates:
 * 1. 60-frame rolling telemetry buffer (in `useRef` to avoid per-frame React renders).
 * 2. Event-driven crash detection & pre-impact kinematics extraction.
 * 3. Hybrid TF-IDF + feature similarity RAG retrieval (`parklab3d:rag-memory:v1`).
 * 4. Grounded crash feedback synthesis + automatic Web Speech spoken coaching.
 * 5. Opt-in webcam visible facial cue observation for non-diagnostic tone adaptation.
 * 6. Multi-attempt comparison engine (`Attempt #N` vs `Attempt #(N-1)`).
 * 7. Interactive Voice (push-to-talk) & Text "Ask Coach" Q&A grounded in RAG memory.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ObstacleDefinition,
  ParkingChallengeDefinition,
  ParkingEvaluationResult,
  Vec3,
  VehicleDefinition,
  VehicleRuntimeState,
} from '../challenges/types';
import {
  answerCoachQuestion,
  buildCrashTelemetryEvent,
  compareAttemptTelemetry,
  generateCrashFeedback,
} from './crashAnalyzer';
import type {
  AICrashFeedbackReport,
  AttemptComparisonDelta,
  AttemptMemoryRecord,
  CoachQAExchange,
  CrashTelemetryEvent,
  RAGMemoryStorePayload,
  TelemetryFrameSnapshot,
} from './crashRagTypes';
import { MPS_TO_MPH } from './evaluateParking';
import {
  clearRAGMemoryStore,
  getChallengeAttemptHistory,
  loadRAGMemoryStore,
  retrieveRAGContextForCrash,
  saveAttemptMemoryRecord,
  saveCrashMemoryRecord,
} from './ragMemoryStore';
import {
  clearAllSavedReplays,
  createReplayKeyframe,
  deleteSavedReplay,
  loadSavedReplays,
  saveAttemptReplay,
  type ReplayKeyframe,
  type SavedAttemptReplay,
} from './attemptReplayStore';
import {
  useVoiceCoach,
  type VoiceCoachStateAndControls,
} from './useVoiceCoach';
import {
  useChallengeSoundtrack,
  type ChallengeSoundtrackControls,
} from './useChallengeSoundtrack';
import {
  useWebcamFacialObserver,
  type WebcamFacialObserverControls,
} from './useWebcamFacialObserver';

const MAX_ROLLING_FRAMES = 60;
const DUPLICATE_CRASH_COOLDOWN_MS = 850;

export interface UseCrashFeedbackLoopParams {
  challenge: ParkingChallengeDefinition;
  vehicle: VehicleDefinition;
}

export interface CrashFeedbackLoopController {
  attemptNumber: number;
  activeCrashReport: AICrashFeedbackReport | null;
  latestCrashEvent: CrashTelemetryEvent | null;
  attemptComparison: AttemptComparisonDelta | null;
  challengeAttemptHistory: AttemptMemoryRecord[];
  totalStoredCrashes: number;
  totalStoredAttempts: number;
  latestQAExchange: CoachQAExchange | null;
  savedReplays: SavedAttemptReplay[];
  latestAttemptReplay: SavedAttemptReplay | null;
  activeReplayToWatch: SavedAttemptReplay | null;
  voiceCoach: VoiceCoachStateAndControls;
  soundtrack: ChallengeSoundtrackControls;
  webcamObserver: WebcamFacialObserverControls;
  openReplayModal: (replay?: SavedAttemptReplay) => void;
  closeReplayModal: () => void;
  removeSavedReplay: (replayId: string) => void;
  recordTelemetryFrame: (
    state: VehicleRuntimeState,
    elapsedSeconds: number
  ) => void;
  recordCollision: (
    obstacle: ObstacleDefinition,
    collisionCount: number,
    currentState: VehicleRuntimeState,
    elapsedSeconds: number,
    corrections: number
  ) => void;
  recordEvaluationCompleted: (
    result: ParkingEvaluationResult,
    elapsedSeconds: number,
    corrections: number
  ) => void;
  finalizeAttemptForRetry: (
    elapsedSeconds: number,
    corrections: number
  ) => void;
  dismissCrashReport: () => void;
  askCoach: (
    questionText: string,
    inputMode?: 'voice-speech-recognition' | 'text-input'
  ) => CoachQAExchange;
  resetRAGMemory: () => void;
}

export function useCrashFeedbackLoop({
  challenge,
  vehicle,
}: UseCrashFeedbackLoopParams): CrashFeedbackLoopController {
  const voiceCoach = useVoiceCoach();
  const soundtrack = useChallengeSoundtrack({
    challengeId: challenge.id,
    isVoiceSpeaking: voiceCoach.isSpeaking,
  });
  const webcamObserver = useWebcamFacialObserver();

  const [memoryStore, setMemoryStore] = useState<RAGMemoryStorePayload>(() =>
    loadRAGMemoryStore()
  );

  const challengeAttempts = getChallengeAttemptHistory(
    challenge.id,
    memoryStore
  );
  const currentAttemptNumber = challengeAttempts.length + 1;

  const [activeCrashReport, setActiveCrashReport] =
    useState<AICrashFeedbackReport | null>(null);
  const [latestCrashEvent, setLatestCrashEvent] =
    useState<CrashTelemetryEvent | null>(null);
  const [attemptComparison, setAttemptComparison] =
    useState<AttemptComparisonDelta | null>(null);
  const [latestQAExchange, setLatestQAExchange] =
    useState<CoachQAExchange | null>(null);
  const [savedReplays, setSavedReplays] = useState<SavedAttemptReplay[]>(() =>
    loadSavedReplays()
  );
  const [latestAttemptReplay, setLatestAttemptReplay] =
    useState<SavedAttemptReplay | null>(null);
  const [activeReplayToWatch, setActiveReplayToWatch] =
    useState<SavedAttemptReplay | null>(null);

  // Rolling 60-frame telemetry ring buffer & attempt accumulators in refs
  const rollingFramesRef = useRef<TelemetryFrameSnapshot[]>([]);
  const replayKeyframesRef = useRef<ReplayKeyframe[]>([]);
  const lastKeyframeTimeMsRef = useRef<number>(0);
  const activeAttemptIdRef = useRef<string>(
    `att-${challenge.id}-${currentAttemptNumber}-${Date.now()}`
  );
  const lastPositionRef = useRef<Vec3>([...challenge.spawnPosition]);
  const distanceTraveledRef = useRef<number>(0);
  const peakSpeedMphRef = useRef<number>(0);
  const closestDistanceToBayRef = useRef<number>(
    Math.hypot(
      challenge.spawnPosition[0] - challenge.parkingTarget.position[0],
      challenge.spawnPosition[2] - challenge.parkingTarget.position[2]
    )
  );
  const crashesInAttemptRef = useRef<CrashTelemetryEvent[]>([]);
  const attemptFinalizedRef = useRef<boolean>(false);
  const lastCrashDedupeRef = useRef<{
    obstacleId: string;
    timestampMs: number;
  }>({ obstacleId: '', timestampMs: 0 });
  const latestEvaluationRef = useRef<ParkingEvaluationResult | null>(null);

  // Reset per-attempt refs when challenge or vehicle changes
  const resetActiveAttemptRefs = useCallback(
    (nextAttemptNumber: number) => {
      rollingFramesRef.current = [];
      replayKeyframesRef.current = [
        createReplayKeyframe({
          elapsedSeconds: 0,
          position: challenge.spawnPosition,
          rotationY: challenge.spawnRotationY,
          speedMph: 0,
          steeringDeg: 0,
          isReversing: false,
          isBraking: false,
        }),
      ];
      lastKeyframeTimeMsRef.current = 0;
      activeAttemptIdRef.current = `att-${challenge.id}-${nextAttemptNumber}-${Date.now()}`;
      lastPositionRef.current = [...challenge.spawnPosition];
      distanceTraveledRef.current = 0;
      peakSpeedMphRef.current = 0;
      closestDistanceToBayRef.current = Math.hypot(
        challenge.spawnPosition[0] - challenge.parkingTarget.position[0],
        challenge.spawnPosition[2] - challenge.parkingTarget.position[2]
      );
      crashesInAttemptRef.current = [];
      attemptFinalizedRef.current = false;
      latestEvaluationRef.current = null;
    },
    [challenge.id, challenge.spawnPosition, challenge.parkingTarget.position]
  );

  useEffect(() => {
    const freshStore = loadRAGMemoryStore();
    setMemoryStore(freshStore);
    const prevForChallenge = getChallengeAttemptHistory(
      challenge.id,
      freshStore
    );
    resetActiveAttemptRefs(prevForChallenge.length + 1);
    setActiveCrashReport(null);
    setLatestCrashEvent(null);
    setAttemptComparison(null);
  }, [challenge.id, vehicle.id, resetActiveAttemptRefs]);

  const recordTelemetryFrame = useCallback(
    (state: VehicleRuntimeState, elapsedSeconds: number) => {
      const nowMs = Date.now();
      const prevPos = lastPositionRef.current;
      const stepDist = Math.hypot(
        state.position[0] - prevPos[0],
        state.position[2] - prevPos[2]
      );
      lastPositionRef.current = [
        state.position[0],
        state.position[1],
        state.position[2],
      ];
      distanceTraveledRef.current += stepDist;

      const absMph = Math.abs(state.speedMps) * MPS_TO_MPH;
      if (absMph > peakSpeedMphRef.current) {
        peakSpeedMphRef.current = absMph;
      }

      const bayDist = Math.hypot(
        state.position[0] - challenge.parkingTarget.position[0],
        state.position[2] - challenge.parkingTarget.position[2]
      );
      if (bayDist < closestDistanceToBayRef.current) {
        closestDistanceToBayRef.current = bayDist;
      }

      const snapshot: TelemetryFrameSnapshot = {
        timestampMs: nowMs,
        elapsedSeconds,
        position: [state.position[0], state.position[1], state.position[2]],
        rotationY: state.rotationY,
        speedMps: state.speedMps,
        steeringAngle: state.steeringAngle,
        isMoving: state.isMoving,
        isBraking: Boolean(state.isBraking),
        isReversing: Boolean(state.isReversing || state.speedMps < -0.03),
      };

      const buffer = rollingFramesRef.current;
      if (buffer.length >= MAX_ROLLING_FRAMES) {
        buffer.shift();
      }
      buffer.push(snapshot);

      // Record replay keyframe at ~10 Hz (every >= 95ms)
      if (nowMs - lastKeyframeTimeMsRef.current >= 95) {
        lastKeyframeTimeMsRef.current = nowMs;
        replayKeyframesRef.current.push(
          createReplayKeyframe({
            elapsedSeconds,
            position: state.position,
            rotationY: state.rotationY,
            speedMph: absMph,
            steeringDeg: (state.steeringAngle * 180) / Math.PI,
            isReversing: snapshot.isReversing,
            isBraking: snapshot.isBraking,
          })
        );
      }
    },
    [challenge.parkingTarget.position]
  );

  const recordCollision = useCallback(
    (
      obstacle: ObstacleDefinition,
      collisionCount: number,
      currentState: VehicleRuntimeState,
      elapsedSeconds: number,
      _corrections: number
    ) => {
      const nowMs = Date.now();
      const lastHit = lastCrashDedupeRef.current;
      if (
        lastHit.obstacleId === obstacle.id &&
        nowMs - lastHit.timestampMs < DUPLICATE_CRASH_COOLDOWN_MS
      ) {
        return;
      }
      lastCrashDedupeRef.current = {
        obstacleId: obstacle.id,
        timestampMs: nowMs,
      };

      const latestStore = loadRAGMemoryStore();
      const pastChallengeAttempts = getChallengeAttemptHistory(
        challenge.id,
        latestStore
      );
      const attemptNum = pastChallengeAttempts.length + 1;

      const crashEvent = buildCrashTelemetryEvent({
        attemptId: activeAttemptIdRef.current,
        attemptNumber: attemptNum,
        challenge,
        vehicle,
        currentState,
        obstacle,
        collisionCount: Math.max(
          collisionCount,
          crashesInAttemptRef.current.length + 1
        ),
        elapsedSeconds,
        rollingFrames: rollingFramesRef.current,
      });

      crashesInAttemptRef.current = [
        ...crashesInAttemptRef.current,
        crashEvent,
      ];

      // Retrieve similar past crashes, attempts, and challenge guidance via RAG
      const ragResult = retrieveRAGContextForCrash(crashEvent, latestStore);

      const allObstacleIds = crashesInAttemptRef.current.map(
        (c) => c.obstacle.id
      );
      const allObstacleLabels = crashesInAttemptRef.current.map(
        (c) => c.obstacleReadableLabel
      );
      const avgPreImpactSpeedMph =
        crashesInAttemptRef.current.reduce(
          (sum, c) => sum + c.preImpactSpeedMph,
          0
        ) / crashesInAttemptRef.current.length;

      const comparison = compareAttemptTelemetry({
        challengeId: challenge.id,
        currentAttemptNumber: attemptNum,
        currentCollisions: crashesInAttemptRef.current.length,
        currentObstacleIds: allObstacleIds,
        currentObstacleLabels: allObstacleLabels,
        currentPreImpactSpeedMph: avgPreImpactSpeedMph,
        currentClosestDistanceToBayMeters: closestDistanceToBayRef.current,
        currentEvalResult: null,
        previousAttempts: pastChallengeAttempts,
      });

      const { report, memoryRecord } = generateCrashFeedback({
        crashEvent,
        ragResult,
        attemptComparison: comparison,
        facialCues: webcamObserver.facialCueState,
      });

      const updatedStore = saveCrashMemoryRecord(memoryRecord);
      setMemoryStore(updatedStore);
      setLatestCrashEvent(crashEvent);
      setActiveCrashReport(report);
      setAttemptComparison(comparison);

      // Speak the coaching feedback aloud via Web Speech API
      voiceCoach.speakCoaching(report.spokenFeedbackText, report.eventId);
    },
    [challenge, vehicle, webcamObserver.facialCueState, voiceCoach]
  );

  const persistCurrentAttemptRecord = useCallback(
    (
      outcome: AttemptMemoryRecord['outcome'],
      evalResult: ParkingEvaluationResult | null,
      elapsedSeconds: number,
      corrections: number
    ): AttemptComparisonDelta | null => {
      if (attemptFinalizedRef.current) {
        return attemptComparison;
      }

      const latestStore = loadRAGMemoryStore();
      const pastAttempts = getChallengeAttemptHistory(
        challenge.id,
        latestStore
      );
      const attemptNum = pastAttempts.length + 1;
      const crashes = crashesInAttemptRef.current;

      const avgPreImpactSpeedMph =
        crashes.length > 0
          ? Math.round(
              (crashes.reduce((s, c) => s + c.preImpactSpeedMph, 0) /
                crashes.length) *
                10
            ) / 10
          : null;

      const effectiveCollisions = evalResult
        ? Math.max(evalResult.collisions, crashes.length)
        : crashes.length;

      const attemptRecord: AttemptMemoryRecord = {
        attemptId: activeAttemptIdRef.current,
        attemptNumber: attemptNum,
        challengeId: challenge.id,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        timestampIso: new Date().toISOString(),
        outcome,
        collisionCount: effectiveCollisions,
        crashedObstacleIds: crashes.map((c) => c.obstacle.id),
        crashedObstacleLabels: crashes.map((c) => c.obstacleReadableLabel),
        avgPreImpactSpeedMph,
        peakSpeedMph: Math.round(peakSpeedMphRef.current * 10) / 10,
        distanceTraveledMeters:
          Math.round(distanceTraveledRef.current * 100) / 100,
        elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
        corrections,
        finalScore: evalResult ? evalResult.score : null,
        stars: evalResult ? evalResult.stars : null,
        positionErrorMeters: evalResult ? evalResult.positionErrorMeters : null,
        alignmentErrorDegrees: evalResult
          ? evalResult.alignmentErrorDegrees
          : null,
        closestDistanceToBayMeters:
          Math.round(closestDistanceToBayRef.current * 100) / 100,
      };

      const comparison = compareAttemptTelemetry({
        challengeId: challenge.id,
        currentAttemptNumber: attemptNum,
        currentCollisions: effectiveCollisions,
        currentObstacleIds: attemptRecord.crashedObstacleIds,
        currentObstacleLabels: attemptRecord.crashedObstacleLabels,
        currentPreImpactSpeedMph: avgPreImpactSpeedMph,
        currentClosestDistanceToBayMeters:
          attemptRecord.closestDistanceToBayMeters,
        currentEvalResult: evalResult,
        previousAttempts: pastAttempts,
      });

      const updatedStore = saveAttemptMemoryRecord(attemptRecord);
      attemptFinalizedRef.current = true;
      setMemoryStore(updatedStore);
      setAttemptComparison(comparison);

      // Save full attempt replay to general replay storage
      const replayOutcome: SavedAttemptReplay['outcome'] = evalResult
        ? evalResult.passed
          ? 'passed'
          : 'try-again'
        : 'quit-or-retried';

      const replayToSave: SavedAttemptReplay = {
        replayId: `replay-${activeAttemptIdRef.current}`,
        attemptNumber: attemptNum,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleColor: vehicle.bodyColor,
        vehicleDimensions: { ...vehicle.dimensions },
        parkingTarget: {
          position: [...challenge.parkingTarget.position],
          rotationY: challenge.parkingTarget.rotationY,
          width: challenge.parkingTarget.width,
          length: challenge.parkingTarget.length,
        },
        obstacles: challenge.obstacles.map((o) => ({
          ...o,
          position: [...o.position],
          dimensions: { ...o.dimensions },
        })),
        savedAtIso: new Date().toISOString(),
        outcome: replayOutcome,
        score: evalResult ? evalResult.score : null,
        stars: evalResult ? evalResult.stars : null,
        collisionCount: effectiveCollisions,
        durationSeconds: Math.max(0.5, Math.round(elapsedSeconds * 10) / 10),
        frames: [...replayKeyframesRef.current],
        crashMarkers: crashes.map((c) => ({
          t: c.elapsedSeconds,
          x: c.impactPosition[0],
          z: c.impactPosition[2],
          obstacleId: c.obstacle.id,
          obstacleLabel: c.obstacleReadableLabel.split('(')[0].trim(),
        })),
      };

      const updatedReplays = saveAttemptReplay(replayToSave);
      setSavedReplays(updatedReplays);
      setLatestAttemptReplay(replayToSave);

      return comparison;
    },
    [attemptComparison, challenge, vehicle]
  );

  const recordEvaluationCompleted = useCallback(
    (
      result: ParkingEvaluationResult,
      elapsedSeconds: number,
      corrections: number
    ) => {
      latestEvaluationRef.current = result;
      const comparison = persistCurrentAttemptRecord(
        result.passed ? 'passed' : 'failed-eval',
        result,
        elapsedSeconds,
        corrections
      );

      if (comparison && result.passed && comparison.previousCollisions > 0) {
        voiceCoach.speakCoaching(
          `Manoeuvre passed with ${result.score} out of 100. Great improvement over attempt ${comparison.previousAttemptNumber}, eliminating your previous collision fault.`,
          `eval-pass-${activeAttemptIdRef.current}`
        );
      }
    },
    [persistCurrentAttemptRecord, voiceCoach]
  );

  const finalizeAttemptForRetry = useCallback(
    (elapsedSeconds: number, corrections: number) => {
      const hadCrashes = crashesInAttemptRef.current.length > 0;
      const meaningfulDrive =
        hadCrashes ||
        distanceTraveledRef.current >= 1.2 ||
        elapsedSeconds >= 3.0;

      let latestStore = loadRAGMemoryStore();
      if (!attemptFinalizedRef.current && meaningfulDrive) {
        persistCurrentAttemptRecord(
          hadCrashes ? 'retried-after-crash' : 'retried-clean',
          null,
          elapsedSeconds,
          corrections
        );
        latestStore = loadRAGMemoryStore();
      }

      const nextAttemptNum =
        getChallengeAttemptHistory(challenge.id, latestStore).length + 1;
      resetActiveAttemptRefs(nextAttemptNum);
      setActiveCrashReport(null);
    },
    [challenge.id, persistCurrentAttemptRecord, resetActiveAttemptRefs]
  );

  const dismissCrashReport = useCallback(() => {
    setActiveCrashReport(null);
  }, []);

  const askCoach = useCallback(
    (
      questionText: string,
      inputMode: 'voice-speech-recognition' | 'text-input' = 'text-input'
    ): CoachQAExchange => {
      const latestStore = loadRAGMemoryStore();
      const exchange = answerCoachQuestion({
        questionText,
        inputMode,
        challenge,
        vehicle,
        latestCrash: latestCrashEvent,
        latestReport: activeCrashReport,
        lastEvaluation: latestEvaluationRef.current,
        store: latestStore,
      });
      setLatestQAExchange(exchange);
      voiceCoach.speakCoaching(exchange.spokenText, exchange.id);
      return exchange;
    },
    [challenge, vehicle, latestCrashEvent, activeCrashReport, voiceCoach]
  );

  const openReplayModal = useCallback(
    (replay?: SavedAttemptReplay) => {
      const target =
        replay ?? latestAttemptReplay ?? savedReplays[0] ?? null;
      setActiveReplayToWatch(target);
    },
    [latestAttemptReplay, savedReplays]
  );

  const closeReplayModal = useCallback(() => {
    setActiveReplayToWatch(null);
  }, []);

  const removeSavedReplay = useCallback((replayId: string) => {
    const next = deleteSavedReplay(replayId);
    setSavedReplays(next);
    setActiveReplayToWatch((prev) =>
      prev && prev.replayId === replayId ? next[0] ?? null : prev
    );
  }, []);

  const resetRAGMemory = useCallback(() => {
    const empty = clearRAGMemoryStore();
    clearAllSavedReplays();
    setMemoryStore(empty);
    setSavedReplays([]);
    setLatestAttemptReplay(null);
    setActiveReplayToWatch(null);
    resetActiveAttemptRefs(1);
    setActiveCrashReport(null);
    setLatestCrashEvent(null);
    setAttemptComparison(null);
    setLatestQAExchange(null);
    voiceCoach.stopSpeaking();
  }, [resetActiveAttemptRefs, voiceCoach]);

  return {
    attemptNumber: currentAttemptNumber,
    activeCrashReport,
    latestCrashEvent,
    attemptComparison,
    challengeAttemptHistory: challengeAttempts,
    totalStoredCrashes: memoryStore.crashes.length,
    totalStoredAttempts: memoryStore.attempts.length,
    latestQAExchange,
    savedReplays,
    latestAttemptReplay,
    activeReplayToWatch,
    voiceCoach,
    soundtrack,
    webcamObserver,
    openReplayModal,
    closeReplayModal,
    removeSavedReplay,
    recordTelemetryFrame,
    recordCollision,
    recordEvaluationCompleted,
    finalizeAttemptForRetry,
    dismissCrashReport,
    askCoach,
    resetRAGMemory,
  };
}
