/**
 * PARKLAB 3D — Shared Parking Evaluation Technical Contracts
 */

import type { EulerRotation, Vector3D } from './challenge.types';

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

/* Stage 1 Extended Architectural Interfaces */

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
  position: Vector3D;
  rotation: EulerRotation;
  lateralOffsetMetres: number;
  longitudinalOffsetMetres: number;
  headingDeviationDegrees: number;
  isWithinBayBounds: boolean;
}

export interface ParkingEvaluation {
  accuracyScore: number;
  collisionCount: number;
  alignmentStatus: AlignmentStatus;
  parkingPosition: ParkingPositionSnapshot;
  completionTime: number;
  finalResult: EvaluationFinalResult;
}
