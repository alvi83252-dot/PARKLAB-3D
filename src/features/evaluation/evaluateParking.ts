/**
 * PARKLAB 3D — Deterministic Parking Evaluation Engine
 *
 * Implements `evaluateParking(challenge, vehicle, vehicleState, metrics)`
 * using exact 2D ground-plane (X/Z) rigid-body footprint geometry.
 *
 * Coordinate Conventions (Section 3):
 * - Three.js Y is vertical; X/Z form the horizontal ground plane.
 * - Positions are [x, y, z] in metres; rotationY is in radians.
 * - Vehicle length is along local Z; width is along local X.
 * - Vehicle forward is local negative Z (-Z) before rotation.
 */

import type {
  ChallengeDifficulty,
  ObstacleDefinition,
  ParkingAttemptMetrics,
  ParkingChallengeDefinition,
  ParkingEvaluationResult,
  ParkingTarget,
  Vec3,
  VehicleDefinition,
  VehicleDimensions,
  VehicleRuntimeState,
} from '../challenges/types';

export const MPS_TO_MPH = 2.23693629;

/**
 * Proposed telemetry contract extension for `pull-up-right` (UK Pull Up on the
 * Right and Reverse).
 *
 * LIMITATION NOTE (Section 4 & Section 6 of Master Spec):
 * The shared `ParkingAttemptMetrics` contract provides only aggregate final
 * counters (`elapsedSeconds`, `collisions`, `corrections`) and does not include
 * a trajectory log or stage-completion flags. Consequently, `evaluateParking`
 * can deterministically verify the final roadside position, right-kerb gap,
 * parallel alignment, 4-corner boundary containment, standstill state, and
 * collision count, but cannot verify from `ParkingAttemptMetrics` alone that
 * the driver first stopped at the forward pull-up zone and reversed into the
 * target zone rather than driving forward directly into it.
 *
 * If the integration layer attaches these optional telemetry properties to
 * `metrics`, `evaluateParking` will additionally validate the reverse stage.
 */
export interface PullUpRightTelemetryExtension extends ParkingAttemptMetrics {
  /** Whether the vehicle first pulled up in the Stage 1 roadside zone ahead */
  reachedPullUpStage?: boolean;
  /** Cumulative distance reversed in metres during the attempt */
  reversedDistanceMeters?: number;
}

export type CornerName =
  | 'front-left'
  | 'front-right'
  | 'rear-left'
  | 'rear-right';

export interface FootprintCornerAnalysis {
  name: CornerName;
  worldX: number;
  worldZ: number;
  targetLocalX: number;
  targetLocalZ: number;
  overflowLateralMeters: number;
  overflowLongitudinalMeters: number;
  isInside: boolean;
}

export interface FootprintContainmentAnalysis {
  corners: FootprintCornerAnalysis[];
  allCornersInside: boolean;
  cornersInsideCount: number;
  centerLateralErrorMeters: number;
  centerLongitudinalErrorMeters: number;
  euclideanPositionErrorMeters: number;
  maxLateralOverflowMeters: number;
  maxLongitudinalOverflowMeters: number;
}

/**
 * Normalizes any angle in radians into the principal interval [-PI, PI].
 */
export function normalizeAngleRadians(angleRadians: number): number {
  const twoPi = Math.PI * 2;
  let normalized = ((angleRadians + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (normalized === -Math.PI) {
    normalized = Math.PI;
  }
  return normalized;
}

/**
 * Converts a local (x, z) offset on a rotated object at (originX, originZ, rotationY)
 * into Three.js world (x, z) coordinates.
 *
 * In Three.js, rotating around +Y by theta maps:
 *   worldX = originX + localX * cos(theta) + localZ * sin(theta)
 *   worldZ = originZ - localX * sin(theta) + localZ * cos(theta)
 */
export function localToWorldXZ(
  originX: number,
  originZ: number,
  rotationY: number,
  localX: number,
  localZ: number
): [number, number] {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const worldX = originX + localX * cos + localZ * sin;
  const worldZ = originZ - localX * sin + localZ * cos;
  return [worldX, worldZ];
}

/**
 * Converts Three.js world (worldX, worldZ) coordinates into the local frame of
 * a reference object at (frameX, frameZ, frameRotationY).
 */
export function worldToLocalXZ(
  frameX: number,
  frameZ: number,
  frameRotationY: number,
  worldX: number,
  worldZ: number
): [number, number] {
  const dx = worldX - frameX;
  const dz = worldZ - frameZ;
  const cos = Math.cos(frameRotationY);
  const sin = Math.sin(frameRotationY);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  return [localX, localZ];
}

/**
 * Computes the four rotated vehicle footprint corners in world space and tests
 * each corner against the parking target's local width and length bounds.
 */
export function computeFootprintContainment(
  parkingTarget: ParkingTarget,
  vehicleDimensions: VehicleDimensions,
  vehiclePosition: Vec3,
  vehicleRotationY: number
): FootprintContainmentAnalysis {
  const halfVehicleW = vehicleDimensions.width / 2;
  const halfVehicleL = vehicleDimensions.length / 2;

  const halfTargetW = parkingTarget.width / 2;
  const halfTargetL = parkingTarget.length / 2;

  const [vx, , vz] = vehiclePosition;
  const [tx, , tz] = parkingTarget.position;
  const targetRot = parkingTarget.rotationY;

  const localCornerDefs: Array<{ name: CornerName; lx: number; lz: number }> = [
    { name: 'front-left', lx: -halfVehicleW, lz: -halfVehicleL },
    { name: 'front-right', lx: halfVehicleW, lz: -halfVehicleL },
    { name: 'rear-left', lx: -halfVehicleW, lz: halfVehicleL },
    { name: 'rear-right', lx: halfVehicleW, lz: halfVehicleL },
  ];

  let maxLateralOverflowMeters = 0;
  let maxLongitudinalOverflowMeters = 0;
  let cornersInsideCount = 0;

  const corners: FootprintCornerAnalysis[] = localCornerDefs.map(
    ({ name, lx, lz }) => {
      const [worldX, worldZ] = localToWorldXZ(vx, vz, vehicleRotationY, lx, lz);
      const [targetLocalX, targetLocalZ] = worldToLocalXZ(
        tx,
        tz,
        targetRot,
        worldX,
        worldZ
      );

      const overflowLateralMeters = Math.max(
        0,
        Math.abs(targetLocalX) - halfTargetW
      );
      const overflowLongitudinalMeters = Math.max(
        0,
        Math.abs(targetLocalZ) - halfTargetL
      );

      if (overflowLateralMeters > maxLateralOverflowMeters) {
        maxLateralOverflowMeters = overflowLateralMeters;
      }
      if (overflowLongitudinalMeters > maxLongitudinalOverflowMeters) {
        maxLongitudinalOverflowMeters = overflowLongitudinalMeters;
      }

      const isInside =
        overflowLateralMeters <= 1e-4 && overflowLongitudinalMeters <= 1e-4;
      if (isInside) {
        cornersInsideCount += 1;
      }

      return {
        name,
        worldX,
        worldZ,
        targetLocalX,
        targetLocalZ,
        overflowLateralMeters,
        overflowLongitudinalMeters,
        isInside,
      };
    }
  );

  const [centerLocalX, centerLocalZ] = worldToLocalXZ(tx, tz, targetRot, vx, vz);
  const euclideanPositionErrorMeters = Math.hypot(vx - tx, vz - tz);

  return {
    corners,
    allCornersInside: cornersInsideCount === 4,
    cornersInsideCount,
    centerLateralErrorMeters: Math.abs(centerLocalX),
    centerLongitudinalErrorMeters: Math.abs(centerLocalZ),
    euclideanPositionErrorMeters,
    maxLateralOverflowMeters,
    maxLongitudinalOverflowMeters,
  };
}

/**
 * Computes the minimum clearance in metres between the vehicle's rotated
 * footprint and the inner roadside face of the primary kerb for roadside
 * challenges (`parallel` and `pull-up-right`).
 */
export function computeRoadsideKerbGapMeters(
  challenge: ParkingChallengeDefinition,
  vehicleDimensions: VehicleDimensions,
  vehiclePosition: Vec3,
  vehicleRotationY: number
): number | null {
  const kerbObstacles = challenge.obstacles.filter(
    (obs): obs is ObstacleDefinition => obs.kind === 'kerb'
  );
  if (kerbObstacles.length === 0) {
    return null;
  }

  const containment = computeFootprintContainment(
    challenge.parkingTarget,
    vehicleDimensions,
    vehiclePosition,
    vehicleRotationY
  );

  if (challenge.id === 'parallel') {
    const leftKerb =
      kerbObstacles.find((k) => k.id.includes('left')) ?? kerbObstacles[0];
    const kerbInnerFaceX =
      leftKerb.position[0] + leftKerb.dimensions.width / 2;
    const minVehicleWorldX = Math.min(
      ...containment.corners.map((c) => c.worldX)
    );
    return minVehicleWorldX - kerbInnerFaceX;
  }

  if (challenge.id === 'pull-up-right') {
    const rightKerb =
      kerbObstacles.find((k) => k.id.includes('right')) ?? kerbObstacles[0];
    const kerbInnerFaceX =
      rightKerb.position[0] - rightKerb.dimensions.width / 2;
    const maxVehicleWorldX = Math.max(
      ...containment.corners.map((c) => c.worldX)
    );
    return kerbInnerFaceX - maxVehicleWorldX;
  }

  return null;
}

function getParMetricsForDifficulty(difficulty: ChallengeDifficulty): {
  parSeconds: number;
  parCorrections: number;
} {
  switch (difficulty) {
    case 'beginner':
      return { parSeconds: 35, parCorrections: 1 };
    case 'intermediate':
      return { parSeconds: 50, parCorrections: 2 };
    case 'advanced':
    case 'expert':
      return { parSeconds: 60, parCorrections: 2 };
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Deterministically evaluates a parking attempt against the challenge's target
 * bay, obstacle/kerb geometry, vehicle footprint, heading, standstill status,
 * collisions, elapsed time, and corrections.
 */
export function evaluateParking(
  challenge: ParkingChallengeDefinition,
  vehicle: VehicleDefinition,
  vehicleState: VehicleRuntimeState,
  metrics: ParkingAttemptMetrics
): ParkingEvaluationResult {
  const effectiveCollisions = Math.max(
    0,
    Math.round(Math.max(vehicleState.collisionCount, metrics.collisions))
  );
  const elapsedSeconds = Math.max(0, roundTo(metrics.elapsedSeconds, 1));
  const corrections = Math.max(0, Math.round(metrics.corrections));

  // 1. Rotated 4-corner vehicle footprint analysis
  const footprint = computeFootprintContainment(
    challenge.parkingTarget,
    vehicle.dimensions,
    vehicleState.position,
    vehicleState.rotationY
  );

  const positionErrorMeters = roundTo(
    footprint.euclideanPositionErrorMeters,
    2
  );

  // 2. Heading / angular alignment error in degrees
  const rawHeadingDiffRad = normalizeAngleRadians(
    vehicleState.rotationY - challenge.parkingTarget.rotationY
  );
  const alignmentErrorDegrees = roundTo(
    Math.abs((rawHeadingDiffRad * 180) / Math.PI),
    1
  );

  // Detect if the player parked facing the opposite direction (~180 deg off)
  const isReversedOrientation = alignmentErrorDegrees > 135;

  // 3. Standstill verification
  const isStationary =
    !vehicleState.isMoving && Math.abs(vehicleState.speedMps) <= 0.08;

  // 4. Roadside kerb distance check (for `parallel` and `pull-up-right`)
  const kerbGapMeters = computeRoadsideKerbGapMeters(
    challenge,
    vehicle.dimensions,
    vehicleState.position,
    vehicleState.rotationY
  );

  // 5. Optional extended telemetry check for `pull-up-right`
  const extendedMetrics = metrics as PullUpRightTelemetryExtension;
  const hasExplicitReverseTelemetry =
    typeof extendedMetrics.reachedPullUpStage === 'boolean' ||
    typeof extendedMetrics.reversedDistanceMeters === 'number';

  const pullUpRightReverseVerified =
    challenge.id !== 'pull-up-right'
      ? true
      : hasExplicitReverseTelemetry
        ? (extendedMetrics.reachedPullUpStage ?? true) &&
          (extendedMetrics.reversedDistanceMeters ?? 0) >= 4.0
        : true;

  // 6. Deterministic Component Scoring (Out of 100)
  // - Position Accuracy: up to 35 points (0 error -> 35, 1.4m error -> 0)
  const positionPoints = clamp(
    35 * (1 - footprint.euclideanPositionErrorMeters / 1.4),
    0,
    35
  );

  // - Alignment Accuracy: up to 30 points (0 deg -> 30, 18 deg -> 0)
  const alignmentPoints = clamp(30 * (1 - alignmentErrorDegrees / 18), 0, 30);

  // - Footprint & Kerb Containment: up to 20 points
  let boundaryPoints = (footprint.cornersInsideCount / 4) * 14;
  if (footprint.allCornersInside) {
    boundaryPoints = 14;
  } else {
    const totalOverflow =
      footprint.maxLateralOverflowMeters +
      footprint.maxLongitudinalOverflowMeters;
    boundaryPoints = clamp(boundaryPoints - totalOverflow * 12, 0, 14);
  }

  let kerbPoints = 6;
  let kerbDistanceValid = true;
  if (kerbGapMeters !== null) {
    if (kerbGapMeters < 0.03) {
      // Touching or overhanging the kerb
      kerbPoints = 0;
      kerbDistanceValid = false;
    } else if (kerbGapMeters <= 0.42) {
      // Optimal UK roadside kerb gap (3cm to 42cm)
      kerbPoints = 6;
    } else if (kerbGapMeters <= 0.6) {
      // Slightly wide from the kerb
      kerbPoints = 3;
    } else {
      // Too far from the kerb
      kerbPoints = 0;
      kerbDistanceValid = false;
    }
  }

  const containmentAndKerbPoints = boundaryPoints + kerbPoints;

  // - Control Efficiency (Elapsed Time & Corrections): up to 15 points
  const { parSeconds, parCorrections } = getParMetricsForDifficulty(
    challenge.difficulty
  );
  const overtimeSeconds = Math.max(0, elapsedSeconds - parSeconds);
  const timePoints = clamp(8 - overtimeSeconds * 0.15, 2, 8);

  const extraCorrections = Math.max(0, corrections - parCorrections);
  const correctionPoints = clamp(7 - extraCorrections * 1.75, 0, 7);

  const efficiencyPoints = timePoints + correctionPoints;

  let rawScore =
    positionPoints +
    alignmentPoints +
    containmentAndKerbPoints +
    efficiencyPoints;

  // Apply deterministic penalties for disqualifying faults
  if (effectiveCollisions > 0) {
    rawScore -= effectiveCollisions * 25;
  }
  if (!footprint.allCornersInside) {
    rawScore -= 12;
  }
  if (!isStationary) {
    rawScore -= 15;
  }
  if (challenge.id === 'pull-up-right' && !pullUpRightReverseVerified) {
    rawScore -= 25;
  }

  const maxPositionThresholdMeters = 0.85;
  const maxAlignmentThresholdDegrees =
    challenge.id === 'parallel' || challenge.id === 'pull-up-right' ? 8.5 : 10.0;

  const passed =
    effectiveCollisions === 0 &&
    isStationary &&
    footprint.allCornersInside &&
    positionErrorMeters <= maxPositionThresholdMeters &&
    alignmentErrorDegrees <= maxAlignmentThresholdDegrees &&
    kerbDistanceValid &&
    pullUpRightReverseVerified &&
    Math.round(rawScore) >= 60;

  // Cap score at 59 if a mandatory pass criterion failed so score & pass/fail never contradict
  const finalScore = passed
    ? clamp(Math.round(rawScore), 60, 100)
    : clamp(Math.round(rawScore), 0, 59);

  // Deterministic 0–3 star rating
  let stars: 0 | 1 | 2 | 3 = 0;
  if (passed) {
    if (
      finalScore >= 90 &&
      alignmentErrorDegrees <= 4.0 &&
      positionErrorMeters <= 0.35 &&
      corrections <= parCorrections
    ) {
      stars = 3;
    } else if (finalScore >= 75 && alignmentErrorDegrees <= 6.5) {
      stars = 2;
    } else {
      stars = 1;
    }
  }

  // 7. Build clear, actionable UK driving-test feedback messages
  const feedback: string[] = [];

  if (!isStationary) {
    feedback.push(
      `Vehicle was still moving (${roundTo(Math.abs(vehicleState.speedMps) * MPS_TO_MPH, 1)} mph). Bring the ${vehicle.name} to a complete standstill inside the bay.`
    );
  }

  if (effectiveCollisions > 0) {
    feedback.push(
      `Serious fault: ${effectiveCollisions} collision${effectiveCollisions === 1 ? '' : 's'} recorded with surrounding obstacles or kerbs.`
    );
  }

  if (isReversedOrientation) {
    const expectedDirection =
      challenge.id === 'forward-bay' || challenge.id === 'angled-bay'
        ? 'nose-first (forward)'
        : 'rear-first (reverse)';
    feedback.push(
      `Incorrect vehicle orientation (${alignmentErrorDegrees.toFixed(1)}° off target). This manoeuvre requires finishing ${expectedDirection} aligned with the bay arrow.`
    );
  } else if (alignmentErrorDegrees > maxAlignmentThresholdDegrees) {
    feedback.push(
      `Heading alignment deviation is ${alignmentErrorDegrees.toFixed(1)}° (maximum allowed is ${maxAlignmentThresholdDegrees.toFixed(1)}°). Straighten the vehicle parallel to the bay markings.`
    );
  } else if (alignmentErrorDegrees <= 2.5) {
    feedback.push(
      `Excellent angular alignment (${alignmentErrorDegrees.toFixed(1)}° deviation from bay centreline).`
    );
  } else {
    feedback.push(
      `Acceptable angular alignment (${alignmentErrorDegrees.toFixed(1)}° deviation).`
    );
  }

  if (!footprint.allCornersInside) {
    const outsideCorners = footprint.corners
      .filter((c) => !c.isInside)
      .map((c) => c.name.replace('-', ' '));
    const maxOverhang = roundTo(
      Math.max(
        footprint.maxLateralOverflowMeters,
        footprint.maxLongitudinalOverflowMeters
      ),
      2
    );
    feedback.push(
      `Out of bounds: ${outsideCorners.join(', ')} corner${outsideCorners.length === 1 ? ' extends' : 's extend'} up to ${maxOverhang.toFixed(2)} m outside the painted target markings.`
    );
  } else if (positionErrorMeters > maxPositionThresholdMeters) {
    feedback.push(
      `Vehicle centre is ${positionErrorMeters.toFixed(2)} m from the ideal bay centre (requires ≤ ${maxPositionThresholdMeters.toFixed(2)} m).`
    );
  } else if (positionErrorMeters <= 0.25) {
    feedback.push(
      `Spot-on spatial positioning (${positionErrorMeters.toFixed(2)} m from bay centre with all four corners inside markings).`
    );
  } else {
    feedback.push(
      `All four corners of the ${vehicle.name} fit inside the bay (${positionErrorMeters.toFixed(2)} m centre offset).`
    );
  }

  if (kerbGapMeters !== null) {
    const roundedGap = roundTo(kerbGapMeters, 2);
    if (roundedGap < 0.03) {
      feedback.push(
        'Kerb fault: tyres are touching or overhanging the roadside kerbstone.'
      );
    } else if (roundedGap <= 0.42) {
      feedback.push(
        `Ideal roadside kerb distance (${roundedGap.toFixed(2)} m parallel clearance).`
      );
    } else if (roundedGap <= 0.6) {
      feedback.push(
        `Minor fault: parked slightly wide from the kerb (${roundedGap.toFixed(2)} m gap; aim for 0.15–0.40 m).`
      );
    } else {
      feedback.push(
        `Roadside positioning fault: parked ${roundedGap.toFixed(2)} m away from the kerb (must finish within 0.60 m of the kerb).`
      );
    }
  }

  if (extraCorrections > 0) {
    feedback.push(
      `Used ${corrections} direction corrections (${extraCorrections} above par); smoother approach arcs will improve your score.`
    );
  } else if (passed && corrections <= 1) {
    feedback.push(
      `Clean control execution with ${corrections === 0 ? 'zero extra shunts' : 'only 1 correction'} in ${elapsedSeconds.toFixed(1)}s.`
    );
  }

  if (challenge.id === 'pull-up-right') {
    if (hasExplicitReverseTelemetry && !pullUpRightReverseVerified) {
      feedback.push(
        'Manoeuvre incomplete: you must first pull up at the forward right-hand marker and reverse at least two car lengths (~4–8 m) into the assessment zone.'
      );
    } else if (!hasExplicitReverseTelemetry) {
      feedback.push(
        'Telemetry note: Final right-kerb position and parallel alignment verified. (Reverse-stage trajectory verification requires `reachedPullUpStage` / `reversedDistanceMeters` from the simulation controller.)'
      );
    }
  }

  return {
    passed,
    score: finalScore,
    stars,
    collisions: effectiveCollisions,
    alignmentErrorDegrees,
    positionErrorMeters,
    elapsedSeconds,
    corrections,
    feedback,
  };
}

export default evaluateParking;
