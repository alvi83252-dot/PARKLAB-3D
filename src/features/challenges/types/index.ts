/**
 * PARKLAB 3D — Shared Integration Contracts (Anjila's Module Bridge)
 *
 * NOTE FOR INTEGRATION LEAD:
 * `src/types/vehicle.types.ts`, `src/types/challenge.types.ts`, and
 * `src/types/evaluation.types.ts` on `main` currently contain the Stage 1
 * placeholder interfaces (`Vehicle`, `ParkingChallenge`, `ParkingEvaluation`)
 * rather than the Stage 2 parallel-development contracts specified in Section 3
 * of the Master Spec. Because `src/types/*` is a protected directory that feature
 * branches must not modify, the exact Section 3 contract interfaces are exported
 * here (and structurally match the Section 3 specification 1:1).
 */

export type {
  CompletionConditions,
  EulerRotation,
  ParkingChallenge as Stage1ParkingChallenge,
  Transform3D,
  UKParkingManoeuvreType,
  Vector3D,
} from '../../../types/challenge.types';

export type Vec3 = [number, number, number];

export type VehicleCategory =
  | 'hatchback'
  | 'sedan'
  | 'suv'
  | 'sports';

export interface VehicleDimensions {
  length: number;
  width: number;
  height: number;
}

export interface VehicleHandling {
  maxForwardSpeedMps: number;
  maxReverseSpeedMps: number;
  accelerationMps2: number;
  brakingMps2: number;
  steeringRate: number;
}

export interface VehicleDefinition {
  id: string;
  name: string;
  category: VehicleCategory;
  dimensions: VehicleDimensions;
  handling: VehicleHandling;
  bodyColor: string;
}

export interface VehicleRuntimeState {
  position: Vec3;
  rotationY: number;
  speedMps: number;
  steeringAngle: number;
  collisionCount: number;
  isMoving: boolean;
}

export type ChallengeId =
  | 'parallel'
  | 'reverse-bay'
  | 'forward-bay'
  | 'angled-bay'
  | 'pull-up-right';

export type ChallengeDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export interface ObstacleDefinition {
  id: string;
  kind: 'parked-car' | 'cone' | 'kerb';
  position: Vec3;
  rotationY: number;
  dimensions: VehicleDimensions;
}

export interface ParkingTarget {
  position: Vec3;
  rotationY: number;
  width: number;
  length: number;
}

export interface ParkingChallengeDefinition {
  id: ChallengeId;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  instructions: string[];
  spawnPosition: Vec3;
  spawnRotationY: number;
  parkingTarget: ParkingTarget;
  obstacles: ObstacleDefinition[];
}

export interface ParkingAttemptMetrics {
  elapsedSeconds: number;
  collisions: number;
  corrections: number;
}

export interface ParkingEvaluationResult {
  passed: boolean;
  score: number;
  stars: 0 | 1 | 2 | 3;
  collisions: number;
  alignmentErrorDegrees: number;
  positionErrorMeters: number;
  elapsedSeconds: number;
  corrections: number;
  feedback: string[];
}
