/**
 * PARKLAB 3D — Core Parking Challenge Domain Types
 * Architectural foundation for UK driving test parking manoeuvres.
 */

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

export type ChallengeDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type UKParkingManoeuvreType =
  | 'parallel-park'
  | 'forward-bay-park'
  | 'reverse-bay-park'
  | 'pull-up-on-right-reverse'
  | 'emergency-or-angle-bay';

export interface ParkingTarget {
  /** Centre coordinate of the designated parking bay in world space */
  position: Vector3D;
  /** Target orientation of the parking bay in radians */
  rotation: EulerRotation;
  /** Bay dimensions in metres */
  dimensions: {
    length: number;
    width: number;
  };
  /** Ideal vehicle heading angle in degrees upon completion */
  targetHeadingDegrees: number;
}

export interface CompletionConditions {
  /** Maximum permitted Euclidean distance offset from bay centre in metres */
  maxDistanceOffsetMetres: number;
  /** Maximum permitted angular deviation from bay alignment in degrees */
  maxAngleDeviationDegrees: number;
  /** Whether the vehicle must come to a complete standstill to finish */
  mustBeStationary: boolean;
  /** Duration in seconds the vehicle must remain stationary inside the target */
  requiredStopDurationSeconds: number;
  /** Maximum allowed kerb or obstacle contacts before automatic failure */
  maxAllowedCollisions: number;
  /** Optional time limit in seconds for completing the manoeuvre */
  timeLimitSeconds?: number;
}

export interface ParkingChallenge {
  /** Unique challenge identifier */
  id: string;
  /** Display name of the UK driving test manoeuvre */
  name: string;
  /** Detailed briefing and criteria for the manoeuvre */
  description: string;
  /** Difficulty tier */
  difficulty: ChallengeDifficulty;
  /** Initial spawn position and orientation of the player vehicle */
  startingPosition: Transform3D;
  /** Target parking bay transform and dimensions */
  parkingTarget: ParkingTarget;
  /** Thresholds and requirements for successful manoeuvre completion */
  completionConditions: CompletionConditions;
  /** Optional classification of the UK driving test manoeuvre */
  manoeuvreType?: UKParkingManoeuvreType;
}
