/**
 * PARKLAB 3D — Deterministic Evaluation & RAG Crash Feedback Verification Suite
 *
 * Self-contained verification helper for testing:
 * 1. `evaluateParking` across all five UK challenges and all four vehicle categories.
 * 2. Pre-impact speed, gear, and steering extraction from the rolling telemetry buffer.
 * 3. Vehicle impact corner/zone classification.
 * 4. Hybrid TF-IDF + structured feature RAG retrieval (`retrieveRAGContextForCrash`).
 * 5. Persistent RAG memory store (`saveCrashMemoryRecord`, `saveAttemptMemoryRecord`, `clearRAGMemoryStore`).
 * 6. Multi-attempt comparison engine (`compareAttemptTelemetry`) and grounded feedback generation.
 * 7. Adaptive coaching tone & Q&A retrieval (`answerCoachQuestion`).
 */

import { CHALLENGES } from '../challenges/challengesData';
import type {
  ParkingAttemptMetrics,
  VehicleDefinition,
  VehicleRuntimeState,
} from '../challenges/types';
import {
  answerCoachQuestion,
  buildCrashTelemetryEvent,
  compareAttemptTelemetry,
  generateCrashFeedback,
  resolveAdaptiveCoachingTone,
} from './crashAnalyzer';
import type { TelemetryFrameSnapshot } from './crashRagTypes';
import { evaluateParking } from './evaluateParking';
import {
  clearRAGMemoryStore,
  loadRAGMemoryStore,
  retrieveRAGContextForCrash,
  saveAttemptMemoryRecord,
  saveCrashMemoryRecord,
} from './ragMemoryStore';

export interface EvaluationSelfCheckSummary {
  passedAllChecks: boolean;
  totalAssertions: number;
  details: string[];
}

const TEST_VEHICLES: VehicleDefinition[] = [
  {
    id: 'uk-hatchback',
    name: 'Modern Hatchback',
    category: 'hatchback',
    dimensions: { length: 4.1, width: 1.76, height: 1.46 },
    handling: {
      maxForwardSpeedMps: 14,
      maxReverseSpeedMps: 5,
      accelerationMps2: 4.2,
      brakingMps2: 8.5,
      steeringRate: 2.2,
    },
    bodyColor: '#3b82f6',
  },
  {
    id: 'exec-sedan',
    name: 'Executive Sedan',
    category: 'sedan',
    dimensions: { length: 4.72, width: 1.84, height: 1.44 },
    handling: {
      maxForwardSpeedMps: 16,
      maxReverseSpeedMps: 5,
      accelerationMps2: 4.5,
      brakingMps2: 8.8,
      steeringRate: 1.9,
    },
    bodyColor: '#64748b',
  },
  {
    id: 'large-suv',
    name: 'Large SUV',
    category: 'suv',
    dimensions: { length: 4.86, width: 1.92, height: 1.72 },
    handling: {
      maxForwardSpeedMps: 15,
      maxReverseSpeedMps: 4.5,
      accelerationMps2: 3.8,
      brakingMps2: 8.0,
      steeringRate: 1.75,
    },
    bodyColor: '#0f766e',
  },
  {
    id: 'tesla-roadster',
    name: 'Tesla Roadster',
    category: 'sports',
    dimensions: { length: 4.42, width: 1.88, height: 1.23 },
    handling: {
      maxForwardSpeedMps: 22,
      maxReverseSpeedMps: 6,
      accelerationMps2: 7.5,
      brakingMps2: 10.5,
      steeringRate: 2.5,
    },
    bodyColor: '#dc2626',
  },
];

export function runEvaluationSelfCheck(): EvaluationSelfCheckSummary {
  const details: string[] = [];
  let totalAssertions = 0;
  let passedAllChecks = true;

  const assert = (condition: boolean, description: string) => {
    totalAssertions += 1;
    if (!condition) {
      passedAllChecks = false;
      details.push(`FAIL: ${description}`);
    } else {
      details.push(`PASS: ${description}`);
    }
  };

  const baseMetrics: ParkingAttemptMetrics = {
    elapsedSeconds: 26,
    collisions: 0,
    corrections: 1,
  };

  for (const challenge of CHALLENGES) {
    for (const vehicle of TEST_VEHICLES) {
      // 1. Optimal stationary placement at target centre & rotation
      const idealState: VehicleRuntimeState = {
        position: [...challenge.parkingTarget.position],
        rotationY: challenge.parkingTarget.rotationY,
        speedMps: 0,
        steeringAngle: 0,
        collisionCount: 0,
        isMoving: false,
      };

      const resA = evaluateParking(challenge, vehicle, idealState, baseMetrics);
      const resB = evaluateParking(challenge, vehicle, idealState, baseMetrics);

      assert(
        resA.passed && resA.score === 100 && resA.stars === 3,
        `[${challenge.id} / ${vehicle.id}] Ideal placement passes with 100 pts and 3 stars (got score=${resA.score}, stars=${resA.stars})`
      );

      assert(
        JSON.stringify(resA) === JSON.stringify(resB),
        `[${challenge.id} / ${vehicle.id}] Deterministic evaluation returns identical output`
      );
    }

    // 2. Collision fault check
    const hatchback = TEST_VEHICLES[0];
    const collisionState: VehicleRuntimeState = {
      position: [...challenge.parkingTarget.position],
      rotationY: challenge.parkingTarget.rotationY,
      speedMps: 0,
      steeringAngle: 0,
      collisionCount: 1,
      isMoving: false,
    };
    const collisionResult = evaluateParking(
      challenge,
      hatchback,
      collisionState,
      { ...baseMetrics, collisions: 1 }
    );
    assert(
      !collisionResult.passed && collisionResult.stars === 0,
      `[${challenge.id}] Collision count > 0 forces fail and 0 stars`
    );

    // 3. Non-stationary check
    const movingState: VehicleRuntimeState = {
      position: [...challenge.parkingTarget.position],
      rotationY: challenge.parkingTarget.rotationY,
      speedMps: 1.4,
      steeringAngle: 0,
      collisionCount: 0,
      isMoving: true,
    };
    const movingResult = evaluateParking(
      challenge,
      hatchback,
      movingState,
      baseMetrics
    );
    assert(
      !movingResult.passed && movingResult.stars === 0,
      `[${challenge.id}] Non-stationary vehicle fails evaluation`
    );

    // 4. Corner overhang check (centre inside bay, rotated 32 deg so corners protrude)
    const rotatedOverhangState: VehicleRuntimeState = {
      position: [...challenge.parkingTarget.position],
      rotationY: challenge.parkingTarget.rotationY + (32 * Math.PI) / 180,
      speedMps: 0,
      steeringAngle: 0,
      collisionCount: 0,
      isMoving: false,
    };
    const overhangResult = evaluateParking(
      challenge,
      TEST_VEHICLES[2], // SUV
      rotatedOverhangState,
      baseMetrics
    );
    assert(
      !overhangResult.passed && overhangResult.stars === 0,
      `[${challenge.id}] Rotated footprint overhanging bay markings fails evaluation`
    );
  }

  // =========================================================================
  // 5. RAG CRASH FEEDBACK PIPELINE & ROLLING BUFFER VERIFICATION
  // =========================================================================
  clearRAGMemoryStore();

  const parallelChallenge = CHALLENGES[0];
  const roadster = TEST_VEHICLES[3];
  const frontCarObstacle = parallelChallenge.obstacles[0]; // parallel-car-front at [-3.2, 0, -5.8]

  // Simulate 6 pre-impact telemetry frames while reversing at -2.4 m/s (~5.4 mph),
  // followed by the impact frame where VehicleController zeroes speedMps to 0.
  const rollingBuffer: TelemetryFrameSnapshot[] = [
    {
      timestampMs: 1000,
      elapsedSeconds: 8.1,
      position: [-2.1, 0, -2.5],
      rotationY: 0.32,
      speedMps: -2.4,
      steeringAngle: -0.38,
      isMoving: true,
      isBraking: false,
      isReversing: true,
    },
    {
      timestampMs: 1033,
      elapsedSeconds: 8.13,
      position: [-2.2, 0, -2.8],
      rotationY: 0.35,
      speedMps: -2.5,
      steeringAngle: -0.4,
      isMoving: true,
      isBraking: false,
      isReversing: true,
    },
    {
      timestampMs: 1066,
      elapsedSeconds: 8.16,
      position: [-2.3, 0, -3.1],
      rotationY: 0.38,
      speedMps: -2.45,
      steeringAngle: -0.4,
      isMoving: true,
      isBraking: false,
      isReversing: true,
    },
    {
      timestampMs: 1100,
      elapsedSeconds: 8.2,
      position: [-2.4, 0, -3.3],
      rotationY: 0.4,
      speedMps: -2.4,
      steeringAngle: -0.42,
      isMoving: true,
      isBraking: false,
      isReversing: true,
    },
  ];

  // Impact frame state (velocity damped to 0 by collision resolver)
  const impactFrameState: VehicleRuntimeState = {
    position: [-2.45, 0, -3.4],
    rotationY: 0.41,
    speedMps: 0,
    steeringAngle: -0.42,
    collisionCount: 1,
    isMoving: false,
    isBraking: false,
    isReversing: false,
  };

  const crashEvent1 = buildCrashTelemetryEvent({
    attemptId: 'att-parallel-1',
    attemptNumber: 1,
    challenge: parallelChallenge,
    vehicle: roadster,
    currentState: impactFrameState,
    obstacle: frontCarObstacle,
    collisionCount: 1,
    elapsedSeconds: 8.25,
    rollingFrames: rollingBuffer,
  });

  assert(
    crashEvent1.preImpactSpeedMph >= 5.0 &&
      crashEvent1.drivingDirectionBeforeImpact === 'reverse',
    `[RAG Telemetry] Recovers pre-impact reverse speed (${crashEvent1.preImpactSpeedMph} mph) from rolling buffer despite 0 m/s on impact frame`
  );

  const ragRes1 = retrieveRAGContextForCrash(crashEvent1);
  assert(
    ragRes1.topGuidance.length > 0 &&
      ragRes1.topGuidance[0].doc.challengeId === 'parallel',
    `[RAG Retrieval] Retrieves parallel parking guidance chunk (${ragRes1.topGuidance[0]?.doc.id}) with similarity=${ragRes1.topGuidance[0]?.similarityScore}`
  );

  const { report: report1, memoryRecord: memRec1 } = generateCrashFeedback({
    crashEvent: crashEvent1,
    ragResult: ragRes1,
    attemptComparison: null,
  });

  assert(
    report1.whatHappened.includes('Tesla Roadster') &&
      report1.spokenFeedbackText.length > 20,
    '[RAG Feedback] Generates grounded crash report and spoken coaching script'
  );

  saveCrashMemoryRecord(memRec1);
  saveAttemptMemoryRecord({
    attemptId: 'att-parallel-1',
    attemptNumber: 1,
    challengeId: 'parallel',
    vehicleId: roadster.id,
    vehicleName: roadster.name,
    timestampIso: new Date().toISOString(),
    outcome: 'retried-after-crash',
    collisionCount: 1,
    crashedObstacleIds: [frontCarObstacle.id],
    crashedObstacleLabels: [crashEvent1.obstacleReadableLabel],
    avgPreImpactSpeedMph: crashEvent1.preImpactSpeedMph,
    peakSpeedMph: 6.0,
    distanceTraveledMeters: 11.2,
    elapsedSeconds: 12.0,
    corrections: 1,
    finalScore: null,
    stars: null,
    positionErrorMeters: null,
    alignmentErrorDegrees: null,
    closestDistanceToBayMeters: 3.4,
  });

  const loadedStore = loadRAGMemoryStore();
  assert(
    loadedStore.crashes.length === 1 && loadedStore.attempts.length === 1,
    '[RAG Memory] Persists crash and attempt records in memory store'
  );

  // Simulate Attempt #2 repeating the same obstacle crash at a slower speed
  const crashEvent2 = {
    ...crashEvent1,
    eventId: 'crash-parallel-att2',
    attemptId: 'att-parallel-2',
    attemptNumber: 2,
    preImpactSpeedMph: 3.1,
  };
  const ragRes2 = retrieveRAGContextForCrash(crashEvent2, loadedStore);
  assert(
    ragRes2.similarPastCrashes.length === 1 &&
      ragRes2.similarPastCrashes[0].record.eventId === crashEvent1.eventId,
    `[RAG Episodic Memory] Retrieves similar past crash from Attempt #1 (similarity=${ragRes2.similarPastCrashes[0]?.similarityScore})`
  );

  const comparison2 = compareAttemptTelemetry({
    challengeId: 'parallel',
    currentAttemptNumber: 2,
    currentCollisions: 0,
    currentObstacleIds: [],
    currentObstacleLabels: [],
    currentPreImpactSpeedMph: null,
    currentClosestDistanceToBayMeters: 0.15,
    currentEvalResult: {
      passed: true,
      score: 94,
      stars: 3,
      collisions: 0,
      alignmentErrorDegrees: 1.5,
      positionErrorMeters: 0.15,
      elapsedSeconds: 28,
      corrections: 1,
      feedback: ['Spot-on spatial positioning.'],
    },
    previousAttempts: loadedStore.attempts,
  });

  assert(
    comparison2 !== null &&
      comparison2.overallTrend === 'improved' &&
      comparison2.collisionDelta === -1,
    '[Feedback Loop] Detects measurable improvement between Attempt #1 (1 crash) and Attempt #2 (0 crashes, 94 score)'
  );

  const toneCheck = resolveAdaptiveCoachingTone({
    cameraActive: true,
    faceDetected: true,
    cueKind: 'smiling-cue',
    smileIndicator: 0.65,
    movementIndicator: 0.12,
    eyeOpennessIndicator: 0.4,
    detectorBackend: 'canvas-pixel-cue',
    lastUpdatedMs: Date.now(),
    uncertaintyNote: 'Approximate cue only.',
  });
  assert(
    toneCheck.tone === 'warm-encouraging' && toneCheck.cueNote !== null,
    '[Adaptive Coaching] Maps visible smile cue to non-diagnostic warm-encouraging tone'
  );

  const qa = answerCoachQuestion({
    questionText: 'Why did I crash?',
    inputMode: 'text-input',
    challenge: parallelChallenge,
    vehicle: roadster,
    latestCrash: crashEvent1,
    latestReport: report1,
    lastEvaluation: null,
    store: loadedStore,
  });
  assert(
    qa.answerText.includes('parallel-car-front') &&
      qa.retrievedContext.length > 0,
    '[Ask Coach Q&A] Answers player question using recorded crash evidence and retrieved RAG context'
  );

  clearRAGMemoryStore();

  return {
    passedAllChecks,
    totalAssertions,
    details,
  };
}
