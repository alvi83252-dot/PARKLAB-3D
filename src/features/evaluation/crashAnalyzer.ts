/**
 * PARKLAB 3D — Crash Kinematics Analyzer, Attempt Comparator & Grounded RAG Coach
 *
 * Extracts pre-impact vehicle behavior from the rolling 60-frame telemetry buffer,
 * determines which corner/side of the vehicle struck the obstacle, classifies the
 * probable cause, compares performance across consecutive attempts, and synthesizes
 * RAG-grounded text and spoken coaching feedback.
 */

import type {
  ObstacleDefinition,
  ParkingChallengeDefinition,
  ParkingEvaluationResult,
  Vec3,
  VehicleDefinition,
  VehicleDimensions,
  VehicleRuntimeState,
} from '../challenges/types';
import { getObstacleReadableLabel } from './crashKnowledgeBase';
import type {
  AICrashFeedbackReport,
  AttemptComparisonDelta,
  AttemptMemoryRecord,
  CoachingToneMode,
  CoachQAExchange,
  CrashMemoryRecord,
  CrashProbableCauseTag,
  CrashTelemetryEvent,
  DrivingDirection,
  PreImpactKinematics,
  RAGMemoryStorePayload,
  RAGRetrievalResult,
  TelemetryFrameSnapshot,
  VehicleImpactZone,
  VisibleFacialCueState,
} from './crashRagTypes';
import {
  MPS_TO_MPH,
  localToWorldXZ,
  normalizeAngleRadians,
  worldToLocalXZ,
} from './evaluateParking';
import { retrieveRAGContextForQuestion } from './ragMemoryStore';

function roundTo(val: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

/**
 * Inspects the rolling telemetry buffer immediately prior to impact to recover
 * true pre-impact speed, steering lock, and driving direction before the collision
 * resolver damped or zeroed the vehicle's velocity.
 */
export function extractPreImpactKinematics(
  rollingFrames: readonly TelemetryFrameSnapshot[],
  currentState: VehicleRuntimeState
): PreImpactKinematics {
  const recentWindow = rollingFrames.slice(-12);

  if (recentWindow.length === 0) {
    const fallbackSpeedMps = Math.abs(currentState.speedMps);
    const direction: DrivingDirection =
      currentState.isReversing || currentState.speedMps < -0.03
        ? 'reverse'
        : currentState.speedMps > 0.03
          ? 'forward'
          : 'stationary';
    const steerDeg = roundTo((currentState.steeringAngle * 180) / Math.PI, 1);
    return {
      preImpactSpeedMps: roundTo(fallbackSpeedMps, 2),
      preImpactSpeedMph: roundTo(fallbackSpeedMps * MPS_TO_MPH, 1),
      peakRecentSpeedMps: roundTo(fallbackSpeedMps, 2),
      peakRecentSpeedMph: roundTo(fallbackSpeedMps * MPS_TO_MPH, 1),
      preImpactSteeringRad: currentState.steeringAngle,
      preImpactSteeringDeg: Math.abs(steerDeg),
      steeringDirection:
        steerDeg > 1.8 ? 'left' : steerDeg < -1.8 ? 'right' : 'straight',
      drivingDirectionBeforeImpact: direction,
      wasBrakingBeforeImpact: Boolean(currentState.isBraking),
      framesInspected: 0,
      kinematicsConfidence: fallbackSpeedMps > 0.05 ? 'medium' : 'low',
    };
  }

  // Find the most recent moving frame before collision damping took effect
  const movingFrames = recentWindow.filter(
    (f) => Math.abs(f.speedMps) > 0.04 || f.isMoving
  );
  const referenceFrame =
    movingFrames.length > 0
      ? movingFrames[movingFrames.length - 1]
      : recentWindow[recentWindow.length - 1];

  let peakAbsSpeedMps = Math.abs(referenceFrame.speedMps);
  let reverseVotes = 0;
  let forwardVotes = 0;
  let brakingDetected = Boolean(currentState.isBraking);

  for (const frame of recentWindow.slice(-8)) {
    const absSpd = Math.abs(frame.speedMps);
    if (absSpd > peakAbsSpeedMps) {
      peakAbsSpeedMps = absSpd;
    }
    if (frame.speedMps < -0.03 || frame.isReversing) {
      reverseVotes += 1;
    } else if (frame.speedMps > 0.03) {
      forwardVotes += 1;
    }
    if (frame.isBraking) {
      brakingDetected = true;
    }
  }

  // Use the higher of the last moving frame speed or 85% of the 8-frame peak
  // so sudden frame-of-impact damping never hides the real approach speed.
  const effectiveSpeedMps = Math.max(
    Math.abs(referenceFrame.speedMps),
    peakAbsSpeedMps * 0.88
  );

  let direction: DrivingDirection = 'stationary';
  if (
    referenceFrame.speedMps < -0.03 ||
    referenceFrame.isReversing ||
    reverseVotes > forwardVotes
  ) {
    direction = 'reverse';
  } else if (referenceFrame.speedMps > 0.03 || forwardVotes > 0) {
    direction = 'forward';
  } else if (currentState.isReversing) {
    direction = 'reverse';
  }

  const rawSteerRad =
    Math.abs(referenceFrame.steeringAngle) >=
    Math.abs(currentState.steeringAngle)
      ? referenceFrame.steeringAngle
      : currentState.steeringAngle;
  const rawSteerDeg = (rawSteerRad * 180) / Math.PI;

  const steeringDirection: 'left' | 'right' | 'straight' =
    rawSteerDeg > 1.8 ? 'left' : rawSteerDeg < -1.8 ? 'right' : 'straight';

  const confidence: 'high' | 'medium' | 'low' =
    recentWindow.length >= 4 && effectiveSpeedMps > 0.05
      ? 'high'
      : recentWindow.length >= 1 && effectiveSpeedMps > 0.02
        ? 'medium'
        : 'low';

  return {
    preImpactSpeedMps: roundTo(effectiveSpeedMps, 2),
    preImpactSpeedMph: roundTo(effectiveSpeedMps * MPS_TO_MPH, 1),
    peakRecentSpeedMps: roundTo(peakAbsSpeedMps, 2),
    peakRecentSpeedMph: roundTo(peakAbsSpeedMps * MPS_TO_MPH, 1),
    preImpactSteeringRad: rawSteerRad,
    preImpactSteeringDeg: roundTo(Math.abs(rawSteerDeg), 1),
    steeringDirection,
    drivingDirectionBeforeImpact: direction,
    wasBrakingBeforeImpact: brakingDetected,
    framesInspected: recentWindow.length,
    kinematicsConfidence: confidence,
  };
}

/**
 * Determines which corner or bumper of the player vehicle made contact with
 * `obstacle` by clamping the vehicle centre into the obstacle's OBB and
 * projecting that contact point into the player vehicle's local frame.
 */
export function computeVehicleImpactZone(
  vehiclePosition: Vec3,
  vehicleRotationY: number,
  vehicleDimensions: VehicleDimensions,
  obstacle: ObstacleDefinition
): { zone: VehicleImpactZone; confidence: 'high' | 'low' } {
  if (obstacle.id === 'world-boundary') {
    return { zone: 'uncertain', confidence: 'low' };
  }

  const [vx, , vz] = vehiclePosition;
  const [ox, , oz] = obstacle.position;

  // Find point on obstacle OBB closest to vehicle centre
  const [vehInObsX, vehInObsZ] = worldToLocalXZ(
    ox,
    oz,
    obstacle.rotationY,
    vx,
    vz
  );
  const clampedObsX = Math.max(
    -obstacle.dimensions.width / 2,
    Math.min(obstacle.dimensions.width / 2, vehInObsX)
  );
  const clampedObsZ = Math.max(
    -obstacle.dimensions.length / 2,
    Math.min(obstacle.dimensions.length / 2, vehInObsZ)
  );
  const [contactWorldX, contactWorldZ] = localToWorldXZ(
    ox,
    oz,
    obstacle.rotationY,
    clampedObsX,
    clampedObsZ
  );

  // Express that contact point in the player vehicle's local coordinate frame
  // Recall: local -Z is front, +Z is rear, -X is left, +X is right.
  const [localX, localZ] = worldToLocalXZ(
    vx,
    vz,
    vehicleRotationY,
    contactWorldX,
    contactWorldZ
  );

  const halfW = Math.max(0.5, vehicleDimensions.width / 2);
  const halfL = Math.max(1.0, vehicleDimensions.length / 2);

  const normX = localX / halfW;
  const normZ = localZ / halfL;

  if (normZ < -0.55) {
    if (normX < -0.38) {
      return { zone: 'front-left-corner', confidence: 'high' };
    }
    if (normX > 0.38) {
      return { zone: 'front-right-corner', confidence: 'high' };
    }
    return { zone: 'front-bumper', confidence: 'high' };
  }

  if (normZ > 0.55) {
    if (normX < -0.38) {
      return { zone: 'rear-left-corner', confidence: 'high' };
    }
    if (normX > 0.38) {
      return { zone: 'rear-right-corner', confidence: 'high' };
    }
    return { zone: 'rear-bumper', confidence: 'high' };
  }

  if (normX < 0) {
    return { zone: 'left-flank', confidence: 'high' };
  }
  return { zone: 'right-flank', confidence: 'high' };
}

/**
 * Classifies the most probable driving cause of the collision based on
 * pre-impact kinematics, impact zone, and obstacle kind.
 */
export function classifyCrashCause(params: {
  kinematics: PreImpactKinematics;
  impactZone: VehicleImpactZone;
  obstacle: ObstacleDefinition;
  alignmentErrorDeg: number;
}): { tag: CrashProbableCauseTag; confidence: 'high' | 'medium' | 'low' } {
  const { kinematics, impactZone, obstacle, alignmentErrorDeg } = params;

  if (kinematics.kinematicsConfidence === 'low') {
    return { tag: 'uncertain-kinematics', confidence: 'low' };
  }

  if (obstacle.kind === 'kerb') {
    if (
      kinematics.drivingDirectionBeforeImpact === 'reverse' &&
      kinematics.preImpactSpeedMph > 4.2
    ) {
      return { tag: 'excessive-reverse-speed', confidence: 'high' };
    }
    if (
      kinematics.drivingDirectionBeforeImpact === 'forward' &&
      kinematics.preImpactSpeedMph > 5.0
    ) {
      return { tag: 'excessive-forward-speed', confidence: 'high' };
    }
    return { tag: 'kerb-overrun', confidence: 'high' };
  }

  if (kinematics.drivingDirectionBeforeImpact === 'reverse') {
    if (kinematics.preImpactSpeedMph >= 4.8) {
      return { tag: 'excessive-reverse-speed', confidence: 'high' };
    }
    if (
      impactZone === 'front-right-corner' ||
      impactZone === 'front-left-corner' ||
      impactZone === 'front-bumper'
    ) {
      return { tag: 'front-swing-clip-during-reverse', confidence: 'high' };
    }
    if (kinematics.preImpactSteeringDeg >= 10) {
      return {
        tag:
          alignmentErrorDeg > 28
            ? 'early-turn-in-clip'
            : 'late-steering-correction',
        confidence: 'medium',
      };
    }
    return { tag: 'blind-spot-rear-backing', confidence: 'medium' };
  }

  if (kinematics.drivingDirectionBeforeImpact === 'forward') {
    if (kinematics.preImpactSpeedMph >= 6.0) {
      return { tag: 'excessive-forward-speed', confidence: 'high' };
    }
    if (kinematics.preImpactSteeringDeg >= 10) {
      return { tag: 'early-turn-in-clip', confidence: 'medium' };
    }
    return { tag: 'insufficient-lateral-clearance', confidence: 'medium' };
  }

  return { tag: 'insufficient-lateral-clearance', confidence: 'low' };
}

/**
 * Builds a complete, structured `CrashTelemetryEvent` when a collision is detected.
 */
export function buildCrashTelemetryEvent(params: {
  attemptId: string;
  attemptNumber: number;
  challenge: ParkingChallengeDefinition;
  vehicle: VehicleDefinition;
  currentState: VehicleRuntimeState;
  obstacle: ObstacleDefinition;
  collisionCount: number;
  elapsedSeconds: number;
  rollingFrames: readonly TelemetryFrameSnapshot[];
}): CrashTelemetryEvent {
  const {
    attemptId,
    attemptNumber,
    challenge,
    vehicle,
    currentState,
    obstacle,
    collisionCount,
    elapsedSeconds,
    rollingFrames,
  } = params;

  const kinematics = extractPreImpactKinematics(rollingFrames, currentState);
  const { zone: vehicleImpactZone, confidence: impactZoneConfidence } =
    computeVehicleImpactZone(
      currentState.position,
      currentState.rotationY,
      vehicle.dimensions,
      obstacle
    );

  const distanceToTargetCenterMeters = roundTo(
    Math.hypot(
      currentState.position[0] - challenge.parkingTarget.position[0],
      currentState.position[2] - challenge.parkingTarget.position[2]
    ),
    2
  );

  const alignmentErrorAtImpactDegrees = roundTo(
    Math.abs(
      (normalizeAngleRadians(
        currentState.rotationY - challenge.parkingTarget.rotationY
      ) *
        180) /
        Math.PI
    ),
    1
  );

  const { tag: probableCauseTag, confidence: causeConfidence } =
    classifyCrashCause({
      kinematics,
      impactZone: vehicleImpactZone,
      obstacle,
      alignmentErrorDeg: alignmentErrorAtImpactDegrees,
    });

  const obstacleReadableLabel = getObstacleReadableLabel(obstacle);

  const searchableSummaryText = [
    challenge.id,
    challenge.title,
    vehicle.id,
    vehicle.category,
    obstacle.id,
    obstacle.kind,
    obstacleReadableLabel,
    kinematics.drivingDirectionBeforeImpact,
    vehicleImpactZone,
    probableCauseTag,
    `steer-${kinematics.steeringDirection}`,
  ].join(' ');

  return {
    eventId: `crash-${challenge.id}-att${attemptNumber}-${Date.now()}`,
    attemptId,
    attemptNumber,
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleCategory: vehicle.category,
    timestampIso: new Date().toISOString(),
    elapsedSeconds: roundTo(elapsedSeconds, 1),
    obstacle,
    obstacleReadableLabel,
    collisionCount,
    impactPosition: [
      roundTo(currentState.position[0], 2),
      roundTo(currentState.position[1], 2),
      roundTo(currentState.position[2], 2),
    ],
    impactRotationY: roundTo(currentState.rotationY, 3),
    distanceToTargetCenterMeters,
    alignmentErrorAtImpactDegrees,
    preImpactSpeedMps: kinematics.preImpactSpeedMps,
    preImpactSpeedMph: kinematics.preImpactSpeedMph,
    preImpactSteeringDeg: kinematics.preImpactSteeringDeg,
    steeringDirection: kinematics.steeringDirection,
    drivingDirectionBeforeImpact: kinematics.drivingDirectionBeforeImpact,
    wasBrakingBeforeImpact: kinematics.wasBrakingBeforeImpact,
    vehicleImpactZone,
    impactZoneConfidence,
    probableCauseTag,
    causeConfidence,
    searchableSummaryText,
    recentTrajectory: rollingFrames.slice(-15),
  };
}

/**
 * Compares the current attempt against the immediately preceding attempt on the
 * same challenge using actual recorded metrics.
 */
export function compareAttemptTelemetry(params: {
  challengeId: ParkingChallengeDefinition['id'];
  currentAttemptNumber: number;
  currentCollisions: number;
  currentObstacleIds: string[];
  currentObstacleLabels: string[];
  currentPreImpactSpeedMph: number | null;
  currentClosestDistanceToBayMeters: number;
  currentEvalResult: ParkingEvaluationResult | null;
  previousAttempts: readonly AttemptMemoryRecord[];
}): AttemptComparisonDelta | null {
  const {
    challengeId,
    currentAttemptNumber,
    currentCollisions,
    currentObstacleIds,
    currentObstacleLabels,
    currentPreImpactSpeedMph,
    currentClosestDistanceToBayMeters,
    currentEvalResult,
    previousAttempts,
  } = params;

  const sameChallengeAttempts = previousAttempts.filter(
    (a) => a.challengeId === challengeId && a.attemptNumber < currentAttemptNumber
  );
  if (sameChallengeAttempts.length === 0) {
    return null;
  }

  const prev = sameChallengeAttempts[sameChallengeAttempts.length - 1];
  const collisionDelta = currentCollisions - prev.collisionCount;

  const speedBeforeImpactDeltaMph =
    currentPreImpactSpeedMph !== null && prev.avgPreImpactSpeedMph !== null
      ? roundTo(currentPreImpactSpeedMph - prev.avgPreImpactSpeedMph, 1)
      : null;

  const distanceToBayDeltaMeters = roundTo(
    currentClosestDistanceToBayMeters - prev.closestDistanceToBayMeters,
    2
  );

  const scoreDelta =
    currentEvalResult && prev.finalScore !== null
      ? currentEvalResult.score - prev.finalScore
      : null;

  const positionErrorDeltaMeters =
    currentEvalResult && prev.positionErrorMeters !== null
      ? roundTo(
          currentEvalResult.positionErrorMeters - prev.positionErrorMeters,
          2
        )
      : null;

  const alignmentErrorDeltaDegrees =
    currentEvalResult && prev.alignmentErrorDegrees !== null
      ? roundTo(
          currentEvalResult.alignmentErrorDegrees - prev.alignmentErrorDegrees,
          1
        )
      : null;

  const repeatedObstacleIdx = currentObstacleIds.findIndex((id) =>
    prev.crashedObstacleIds.includes(id)
  );
  const repeatedSameObstacle = repeatedObstacleIdx !== -1;
  const repeatedObstacleLabel = repeatedSameObstacle
    ? currentObstacleLabels[repeatedObstacleIdx] ?? currentObstacleIds[repeatedObstacleIdx]
    : null;

  const followedPreviousSpeedAdvice =
    speedBeforeImpactDeltaMph !== null
      ? speedBeforeImpactDeltaMph <= -0.5
      : currentCollisions === 0 && prev.collisionCount > 0
        ? true
        : null;

  const bulletPoints: string[] = [];

  if (collisionDelta < 0) {
    bulletPoints.push(
      `Collisions reduced from ${prev.collisionCount} (Attempt #${prev.attemptNumber}) to ${currentCollisions} on Attempt #${currentAttemptNumber}.`
    );
  } else if (collisionDelta > 0) {
    bulletPoints.push(
      `Collisions increased from ${prev.collisionCount} (Attempt #${prev.attemptNumber}) to ${currentCollisions} on Attempt #${currentAttemptNumber}.`
    );
  } else {
    bulletPoints.push(
      `Collision count unchanged (${currentCollisions}) compared with Attempt #${prev.attemptNumber}.`
    );
  }

  if (repeatedSameObstacle && repeatedObstacleLabel) {
    bulletPoints.push(
      `Repeated contact with ${repeatedObstacleLabel} (also hit on Attempt #${prev.attemptNumber}).`
    );
  }

  if (speedBeforeImpactDeltaMph !== null && prev.avgPreImpactSpeedMph !== null && currentPreImpactSpeedMph !== null) {
    if (speedBeforeImpactDeltaMph <= -0.4) {
      bulletPoints.push(
        `Pre-impact approach speed reduced from ${prev.avgPreImpactSpeedMph.toFixed(1)} mph to ${currentPreImpactSpeedMph.toFixed(1)} mph (${Math.abs(speedBeforeImpactDeltaMph).toFixed(1)} mph slower).`
      );
    } else if (speedBeforeImpactDeltaMph >= 0.4) {
      bulletPoints.push(
        `Pre-impact approach speed rose from ${prev.avgPreImpactSpeedMph.toFixed(1)} mph to ${currentPreImpactSpeedMph.toFixed(1)} mph (+${speedBeforeImpactDeltaMph.toFixed(1)} mph faster).`
      );
    }
  }

  if (distanceToBayDeltaMeters <= -0.25) {
    bulletPoints.push(
      `Progressed ${Math.abs(distanceToBayDeltaMeters).toFixed(2)} m closer to the target bay centre than Attempt #${prev.attemptNumber}.`
    );
  }

  if (scoreDelta !== null && prev.finalScore !== null && currentEvalResult) {
    const sign = scoreDelta >= 0 ? '+' : '';
    bulletPoints.push(
      `Evaluation score changed from ${prev.finalScore}/100 to ${currentEvalResult.score}/100 (${sign}${scoreDelta} pts).`
    );
  }

  if (positionErrorDeltaMeters !== null && positionErrorDeltaMeters <= -0.05) {
    bulletPoints.push(
      `Bay centre offset improved by ${Math.abs(positionErrorDeltaMeters).toFixed(2)} m.`
    );
  }

  let overallTrend: 'improved' | 'regressed' | 'mixed' = 'mixed';
  if (
    collisionDelta < 0 ||
    (collisionDelta === 0 && (scoreDelta ?? 0) > 0) ||
    (followedPreviousSpeedAdvice && !repeatedSameObstacle)
  ) {
    overallTrend = 'improved';
  } else if (collisionDelta > 0 || repeatedSameObstacle) {
    overallTrend = 'regressed';
  }

  const headline =
    overallTrend === 'improved'
      ? `Measurable Improvement Over Attempt #${prev.attemptNumber}`
      : overallTrend === 'regressed'
        ? `Repeated Fault Pattern vs. Attempt #${prev.attemptNumber}`
        : `Attempt #${currentAttemptNumber} vs. Attempt #${prev.attemptNumber} Telemetry Comparison`;

  return {
    challengeId,
    previousAttemptNumber: prev.attemptNumber,
    currentAttemptNumber,
    previousOutcome: prev.outcome,
    collisionDelta,
    previousCollisions: prev.collisionCount,
    currentCollisions,
    speedBeforeImpactDeltaMph,
    previousPreImpactSpeedMph: prev.avgPreImpactSpeedMph,
    currentPreImpactSpeedMph: currentPreImpactSpeedMph,
    distanceToBayDeltaMeters,
    scoreDelta,
    positionErrorDeltaMeters,
    alignmentErrorDeltaDegrees,
    repeatedSameObstacle,
    repeatedObstacleLabel,
    followedPreviousSpeedAdvice,
    overallTrend,
    headline,
    bulletPoints,
  };
}

function describeProbableCause(
  crash: CrashTelemetryEvent
): { causeText: string; uncertainty: string | null } {
  const impactCornerLabel = crash.vehicleImpactZone.replace(/-/g, ' ');
  const steerDesc =
    crash.steeringDirection === 'straight'
      ? 'straight wheels (0° lock)'
      : `${crash.preImpactSteeringDeg.toFixed(1)}° ${crash.steeringDirection} steering lock`;

  let uncertainty: string | null = null;
  if (crash.causeConfidence === 'low' || crash.impactZoneConfidence === 'low') {
    uncertainty =
      'Telemetry note: Impact occurred with very few preceding motion frames in the buffer, so the exact approach angle is estimated with lower certainty.';
  }

  switch (crash.probableCauseTag) {
    case 'excessive-reverse-speed':
      return {
        causeText: `Reversing at ${crash.preImpactSpeedMph.toFixed(1)} mph reduced your reaction window and carried the ${impactCornerLabel} into ${crash.obstacleReadableLabel}.`,
        uncertainty,
      };
    case 'excessive-forward-speed':
      return {
        causeText: `Approaching forward at ${crash.preImpactSpeedMph.toFixed(1)} mph with ${steerDesc} widened your turning radius and caused the ${impactCornerLabel} to strike ${crash.obstacleReadableLabel}.`,
        uncertainty,
      };
    case 'front-swing-clip-during-reverse':
      return {
        causeText: `While reversing under ${steerDesc}, the front end of your ${crash.vehicleName} swung outward and clipped ${crash.obstacleReadableLabel} with the ${impactCornerLabel}.`,
        uncertainty,
      };
    case 'early-turn-in-clip':
      return {
        causeText: `Applying ${steerDesc} too early before the axle cleared ${crash.obstacleReadableLabel} caused the ${impactCornerLabel} to cut across the obstacle's boundary.`,
        uncertainty,
      };
    case 'late-steering-correction':
      return {
        causeText: `Delayed counter-steering (${steerDesc}, ${crash.alignmentErrorAtImpactDegrees.toFixed(1)}° off target heading) allowed the ${impactCornerLabel} to drift into ${crash.obstacleReadableLabel}.`,
        uncertainty,
      };
    case 'kerb-overrun':
      return {
        causeText: `Continuing ${crash.drivingDirectionBeforeImpact} travel at ${crash.preImpactSpeedMph.toFixed(1)} mph with ${steerDesc} pushed the ${impactCornerLabel} over the kerb line (${crash.obstacleReadableLabel}).`,
        uncertainty,
      };
    case 'insufficient-lateral-clearance':
      return {
        causeText: `Insufficient side clearance (${crash.distanceToTargetCenterMeters.toFixed(2)} m from bay centre) brought the ${impactCornerLabel} into contact with ${crash.obstacleReadableLabel}.`,
        uncertainty,
      };
    case 'blind-spot-rear-backing':
      return {
        causeText: `Reversing straight back (${steerDesc}) without stopping before the obstacle boundary caused the ${impactCornerLabel} to contact ${crash.obstacleReadableLabel}.`,
        uncertainty,
      };
    case 'uncertain-kinematics':
      return {
        causeText: `Contact recorded with ${crash.obstacleReadableLabel}; pre-impact velocity was near zero at the moment of contact.`,
        uncertainty:
          'Exact pre-impact trajectory could not be established with high confidence from the preceding telemetry frames.',
      };
  }
}

/**
 * Selects a supportive, non-diagnostic coaching presentation tone using optional
 * visible facial cues when the webcam observer is enabled.
 * Never claims to know internal emotions or psychological states.
 */
export function resolveAdaptiveCoachingTone(
  facialCues?: VisibleFacialCueState | null
): { tone: CoachingToneMode; cueNote: string | null } {
  if (!facialCues || !facialCues.cameraActive) {
    return { tone: 'neutral-analytical', cueNote: null };
  }
  if (!facialCues.faceDetected) {
    return {
      tone: 'neutral-analytical',
      cueNote:
        'Webcam active (no face currently in frame — using standard analytical coaching tone).',
    };
  }
  if (facialCues.cueKind === 'smiling-cue') {
    return {
      tone: 'warm-encouraging',
      cueNote:
        'Visible facial cue (optional/uncertain): upward mouth curvature (smile cue) observed — keeping coaching upbeat.',
    };
  }
  if (facialCues.cueKind === 'active-facial-movement') {
    return {
      tone: 'concise-calm',
      cueNote:
        'Visible facial cue (optional/uncertain): head/brow movement observed — keeping spoken guidance brief and calm.',
    };
  }
  return {
    tone: 'neutral-analytical',
    cueNote:
      'Visible facial cue (optional/uncertain): steady neutral posture observed — using standard analytical tone.',
  };
}

/**
 * Generates a complete, RAG-grounded `AICrashFeedbackReport` combining recorded
 * telemetry, retrieved static & episodic RAG documents, attempt comparisons,
 * and optional adaptive presentation tone.
 */
export function generateCrashFeedback(params: {
  crashEvent: CrashTelemetryEvent;
  ragResult: RAGRetrievalResult;
  attemptComparison: AttemptComparisonDelta | null;
  facialCues?: VisibleFacialCueState | null;
}): {
  report: AICrashFeedbackReport;
  memoryRecord: CrashMemoryRecord;
} {
  const { crashEvent, ragResult, attemptComparison, facialCues } = params;
  const { tone, cueNote } = resolveAdaptiveCoachingTone(facialCues);

  const impactCornerText =
    crashEvent.vehicleImpactZone === 'uncertain'
      ? 'vehicle body'
      : crashEvent.vehicleImpactZone.replace(/-/g, ' ');

  const directionPhrase =
    crashEvent.drivingDirectionBeforeImpact === 'reverse'
      ? 'reversing'
      : crashEvent.drivingDirectionBeforeImpact === 'forward'
        ? 'driving forward'
        : 'manoeuvring at low speed';

  const whatHappened = `Your ${crashEvent.vehicleName}'s ${impactCornerText} collided with ${crashEvent.obstacleReadableLabel} while ${directionPhrase} at ${crashEvent.preImpactSpeedMph.toFixed(1)} mph.`;

  const whereItHappened = `Impact occurred at world coordinates [${crashEvent.impactPosition[0].toFixed(1)}, ${crashEvent.impactPosition[2].toFixed(1)}], ${crashEvent.distanceToTargetCenterMeters.toFixed(2)} m from the ${crashEvent.challengeTitle} bay centre (${crashEvent.alignmentErrorAtImpactDegrees.toFixed(1)}° heading offset).`;

  const steerText =
    crashEvent.steeringDirection === 'straight'
      ? 'wheels straight (0.0°)'
      : `${crashEvent.preImpactSteeringDeg.toFixed(1)}° ${crashEvent.steeringDirection} steering lock`;
  const brakeText = crashEvent.wasBrakingBeforeImpact
    ? 'with braking applied'
    : 'without active braking';

  const preCrashBehavior = `In the ${crashEvent.recentTrajectory.length} telemetry frames before impact, you were ${directionPhrase} at ${crashEvent.preImpactSpeedMph.toFixed(1)} mph (${crashEvent.preImpactSpeedMps.toFixed(2)} m/s) with ${steerText} ${brakeText}.`;

  const { causeText: probableCause, uncertainty: uncertaintyNote } =
    describeProbableCause(crashEvent);

  const primaryGuidance = ragResult.topGuidance[0]?.doc;
  const matchingPastCrash = ragResult.similarPastCrashes[0];

  let repeatPatternNotice: string | null = null;
  if (
    matchingPastCrash &&
    matchingPastCrash.record.obstacleId === crashEvent.obstacle.id
  ) {
    repeatPatternNotice = `RAG Memory Match (${Math.round(matchingPastCrash.similarityScore * 100)}% similarity): You also hit ${crashEvent.obstacleReadableLabel} on Attempt #${matchingPastCrash.record.attemptNumber} while moving ${matchingPastCrash.record.drivingDirectionBeforeImpact} at ${matchingPastCrash.record.preImpactSpeedMph.toFixed(1)} mph.`;
  }

  const baseCorrectiveAction = primaryGuidance
    ? primaryGuidance.correctiveAction
    : `Reduce your ${crashEvent.drivingDirectionBeforeImpact} speed below 3.0 mph and adjust your ${crashEvent.steeringDirection === 'straight' ? 'turning point' : `${crashEvent.steeringDirection} steering lock`} earlier to leave at least 0.5 m clearance from ${crashEvent.obstacleReadableLabel}.`;

  const actionableAdvice =
    tone === 'warm-encouraging'
      ? `Good effort testing the angle — ${baseCorrectiveAction}`
      : tone === 'concise-calm'
        ? `Take a breath and slow the approach: ${baseCorrectiveAction}`
        : baseCorrectiveAction;

  const nextAttemptFocus = primaryGuidance
    ? primaryGuidance.nextAttemptFocus
    : `Maintain at least 0.5 m clearance from ${crashEvent.obstacleReadableLabel} and keep approach speed under 3.0 mph.`;

  // Concise natural spoken script for Web Speech API
  const spokenPrefix =
    tone === 'warm-encouraging'
      ? 'Crash detected, no problem — let us adjust for the next run.'
      : tone === 'concise-calm'
        ? 'Collision detected. Here is a quick adjustment.'
        : 'Collision detected.';

  const spokenRepeatClause = repeatPatternNotice
    ? `Note that you hit this same ${crashEvent.obstacle.kind.replace('-', ' ')} on attempt ${matchingPastCrash?.record.attemptNumber}.`
    : '';

  const spokenFeedbackText = [
    spokenPrefix,
    `Your ${impactCornerText} hit the ${crashEvent.obstacleReadableLabel.split('(')[0].trim()} while ${directionPhrase} at ${crashEvent.preImpactSpeedMph.toFixed(1)} miles per hour.`,
    spokenRepeatClause,
    primaryGuidance
      ? primaryGuidance.nextAttemptFocus
      : nextAttemptFocus,
  ]
    .filter(Boolean)
    .join(' ');

  const headline = `CRASH DETECTED · ${crashEvent.obstacleReadableLabel.split('(')[0].trim()}`;

  const report: AICrashFeedbackReport = {
    eventId: crashEvent.eventId,
    attemptId: crashEvent.attemptId,
    attemptNumber: crashEvent.attemptNumber,
    challengeId: crashEvent.challengeId,
    challengeTitle: crashEvent.challengeTitle,
    vehicleName: crashEvent.vehicleName,
    timestampIso: crashEvent.timestampIso,
    obstacleId: crashEvent.obstacle.id,
    obstacleKind: crashEvent.obstacle.kind,
    obstacleLabel: crashEvent.obstacleReadableLabel,
    preImpactSpeedMph: crashEvent.preImpactSpeedMph,
    preImpactSteeringDeg: crashEvent.preImpactSteeringDeg,
    steeringDirection: crashEvent.steeringDirection,
    drivingDirection: crashEvent.drivingDirectionBeforeImpact,
    vehicleImpactZone: crashEvent.vehicleImpactZone,
    probableCauseTag: crashEvent.probableCauseTag,
    coachingTone: tone,
    facialCueContextNote: cueNote,
    headline,
    whatHappened,
    whereItHappened,
    preCrashBehavior,
    probableCause,
    uncertaintyNote,
    actionableAdvice,
    nextAttemptFocus,
    spokenFeedbackText,
    repeatPatternNotice,
    retrievedContext: ragResult.retrievedItems,
    attemptComparison,
  };

  const memoryRecord: CrashMemoryRecord = {
    eventId: crashEvent.eventId,
    attemptId: crashEvent.attemptId,
    attemptNumber: crashEvent.attemptNumber,
    challengeId: crashEvent.challengeId,
    vehicleId: crashEvent.vehicleId,
    vehicleName: crashEvent.vehicleName,
    timestampIso: crashEvent.timestampIso,
    obstacleId: crashEvent.obstacle.id,
    obstacleKind: crashEvent.obstacle.kind,
    obstacleReadableLabel: crashEvent.obstacleReadableLabel,
    drivingDirectionBeforeImpact: crashEvent.drivingDirectionBeforeImpact,
    vehicleImpactZone: crashEvent.vehicleImpactZone,
    probableCauseTag: crashEvent.probableCauseTag,
    preImpactSpeedMph: crashEvent.preImpactSpeedMph,
    preImpactSteeringDeg: crashEvent.preImpactSteeringDeg,
    distanceToTargetCenterMeters: crashEvent.distanceToTargetCenterMeters,
    alignmentErrorAtImpactDegrees: crashEvent.alignmentErrorAtImpactDegrees,
    searchableText: crashEvent.searchableSummaryText,
    feedbackHeadline: headline,
    recommendedAction: nextAttemptFocus,
  };

  return { report, memoryRecord };
}

/**
 * Generates a grounded answer to a user's spoken or typed question ("Ask Coach")
 * using retrieved RAG guidance, the latest crash event, and recorded attempt history.
 */
export function answerCoachQuestion(params: {
  questionText: string;
  inputMode: 'voice-speech-recognition' | 'text-input';
  challenge: ParkingChallengeDefinition;
  vehicle: VehicleDefinition;
  latestCrash: CrashTelemetryEvent | null;
  latestReport: AICrashFeedbackReport | null;
  lastEvaluation: ParkingEvaluationResult | null;
  store?: RAGMemoryStorePayload;
}): CoachQAExchange {
  const {
    questionText,
    inputMode,
    challenge,
    vehicle,
    latestCrash,
    latestReport,
    lastEvaluation,
    store,
  } = params;

  const trimmedQuestion = questionText.trim() || 'How can I improve this manoeuvre?';
  const lowerQ = trimmedQuestion.toLowerCase();

  const rag = retrieveRAGContextForQuestion({
    questionText: trimmedQuestion,
    challenge,
    vehicle,
    latestCrash,
    store,
  });

  const topDoc = rag.topGuidance[0];
  const mostRecentCrash = rag.matchingCrashes[0];
  const mostRecentAttempt = rag.recentAttempts[0];

  let answerParts: string[] = [];

  if (
    (lowerQ.includes('why') || lowerQ.includes('what') || lowerQ.includes('crash') || lowerQ.includes('hit') || lowerQ.includes('wrong')) &&
    latestReport
  ) {
    answerParts.push(
      `On Attempt #${latestReport.attemptNumber}, ${latestReport.whatHappened}`,
      latestReport.probableCause,
      `To fix this: ${latestReport.actionableAdvice}`
    );
  } else if (
    (lowerQ.includes('last') || lowerQ.includes('previous') || lowerQ.includes('attempt') || lowerQ.includes('improve') || lowerQ.includes('progress')) &&
    mostRecentAttempt
  ) {
    const attemptSummary =
      mostRecentAttempt.finalScore !== null
        ? `On Attempt #${mostRecentAttempt.attemptNumber} of ${challenge.title}, you scored ${mostRecentAttempt.finalScore}/100 with ${mostRecentAttempt.collisionCount} collision(s), a ${mostRecentAttempt.positionErrorMeters?.toFixed(2) ?? '0.00'} m position error, and ${mostRecentAttempt.alignmentErrorDegrees?.toFixed(1) ?? '0.0'}° alignment offset.`
        : `On Attempt #${mostRecentAttempt.attemptNumber} of ${challenge.title}, you recorded ${mostRecentAttempt.collisionCount} collision(s) (${mostRecentAttempt.crashedObstacleLabels.join(', ') || 'none'}) and reached within ${mostRecentAttempt.closestDistanceToBayMeters.toFixed(2)} m of the bay centre.`;
    answerParts.push(attemptSummary);
    if (topDoc) {
      answerParts.push(`Recommended technique: ${topDoc.correctiveAction}`);
    }
  } else if (mostRecentCrash && (lowerQ.includes('crash') || lowerQ.includes('hit'))) {
    answerParts.push(
      `Your last recorded crash on ${challenge.title} (Attempt #${mostRecentCrash.attemptNumber}) hit ${mostRecentCrash.obstacleReadableLabel} with the ${mostRecentCrash.vehicleImpactZone.replace(/-/g, ' ')} at ${mostRecentCrash.preImpactSpeedMph.toFixed(1)} mph.`,
      `Focus on: ${mostRecentCrash.recommendedAction}`
    );
  } else if (lastEvaluation) {
    answerParts.push(
      `Your latest ${challenge.title} evaluation scored ${lastEvaluation.score}/100 (${lastEvaluation.passed ? 'PASS' : 'TRY AGAIN'}) with ${lastEvaluation.positionErrorMeters.toFixed(2)} m bay offset and ${lastEvaluation.alignmentErrorDegrees.toFixed(1)}° alignment error.`
    );
    if (topDoc) {
      answerParts.push(topDoc.correctiveAction);
    }
  } else if (topDoc) {
    answerParts.push(
      `For ${challenge.title} in the ${vehicle.name}: ${topDoc.guidanceText}`,
      `Actionable step: ${topDoc.correctiveAction}`
    );
  } else {
    answerParts.push(
      `For ${challenge.title}: ${challenge.instructions.join(' ')}`
    );
  }

  const answerText = answerParts.join(' ');
  const spokenText = answerText.replace(/`([^`]+)`/g, '$1');

  return {
    id: `qa-${Date.now()}`,
    questionText: trimmedQuestion,
    inputMode,
    answerText,
    spokenText,
    retrievedContext: rag.retrievedItems,
    timestampIso: new Date().toISOString(),
  };
}
