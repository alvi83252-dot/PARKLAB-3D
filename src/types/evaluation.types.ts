/**
 * PARKLAB 3D — Core Parking Evaluation Domain Types
 * Architectural foundation for manoeuvre assessment and scoring.
 */

import type { EulerRotation, Vector3D } from './challenge.types';

export type AlignmentStatus =
  | 'optimal'
  | 'acceptable'
  | 'misaligned'
  | 'out-of-bounds';

export type EvaluationFinalResult =
  | 'pass'
  | 'pass-with-minors'
  | 'fail-collision'
  | 'fail-out-of-bounds'
  | 'incomplete';

export interface ParkingPositionSnapshot {
  /** Final recorded world position of the vehicle centre */
  position: Vector3D;
  /** Final recorded rotation of the vehicle */
  rotation: EulerRotation;
  /** Lateral deviation from the bay centreline in metres */
  lateralOffsetMetres: number;
  /** Longitudinal deviation from the bay centreline in metres */
  longitudinalOffsetMetres: number;
  /** Angular deviation from the target bay heading in degrees */
  headingDeviationDegrees: number;
  /** Whether all four wheels/corners are fully contained within bay markings */
  isWithinBayBounds: boolean;
}

export interface ParkingEvaluation {
  /** Normalized accuracy score from 0 to 100 */
  accuracyScore: number;
  /** Total number of obstacle, boundary, or kerb collisions recorded */
  collisionCount: number;
  /** Assessment of the vehicle's angular and spatial alignment */
  alignmentStatus: AlignmentStatus;
  /** Spatial telemetry snapshot of the final parked position */
  parkingPosition: ParkingPositionSnapshot;
  /** Elapsed manoeuvre time in seconds */
  completionTime: number;
  /** Overall UK driving test manoeuvre outcome */
  finalResult: EvaluationFinalResult;
}
