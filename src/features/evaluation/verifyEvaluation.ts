/**
 * PARKLAB 3D — Deterministic Evaluation Verification Suite
 *
 * Self-contained verification helper for testing `evaluateParking` across all
 * five UK driving test challenges (`CHALLENGES`) and all four vehicle categories
 * without requiring external unfinished modules.
 */

import { CHALLENGES } from '../challenges/challengesData';
import type {
  ParkingAttemptMetrics,
  VehicleDefinition,
  VehicleRuntimeState,
} from '../challenges/types';
import { evaluateParking } from './evaluateParking';

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

  return {
    passedAllChecks,
    totalAssertions,
    details,
  };
}
