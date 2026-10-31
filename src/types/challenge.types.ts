/**
 * PARKLAB 3D — Shared Parking Challenge Technical Contracts
 */

import type { Vec3, VehicleDimensions } from './vehicle.types';

export type ChallengeId =
  | 'parallel'
  | 'reverse-bay'
  | 'forward-bay'
  | 'angled-bay'
  | 'pull-up-right';

export type ChallengeDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

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

/* Stage 1 Extended Architectural Interfaces */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface EulerRotation {
  x: number;
  y: number;
  z: number;
}

export interface Transform3D {
  position: Vector3D;
  rotation: EulerRotation;
}

export type UKParkingManoeuvreType =
  | 'parallel-park'
  | 'forward-bay-park'
  | 'reverse-bay-park'
  | 'pull-up-on-right-reverse'
  | 'emergency-or-angle-bay';

export interface CompletionConditions {
  maxDistanceOffsetMetres: number;
  maxAngleDeviationDegrees: number;
  mustBeStationary: boolean;
  requiredStopDurationSeconds: number;
  maxAllowedCollisions: number;
  timeLimitSeconds?: number;
}

export interface ParkingChallenge {
  id: string;
  name: string;
  description: string;
  difficulty: ChallengeDifficulty;
  startingPosition: Transform3D;
  parkingTarget: ParkingTarget;
  completionConditions: CompletionConditions;
  manoeuvreType?: UKParkingManoeuvreType;
}
