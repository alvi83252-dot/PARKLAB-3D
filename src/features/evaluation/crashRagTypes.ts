/**
 * PARKLAB 3D — AI Crash Feedback Loop, RAG Pipeline & Multimodal Coach Contracts
 *
 * Defines structured telemetry events, RAG knowledge chunks, persistent
 * episodic crash/attempt memory records, retrieval scores, attempt-over-attempt
 * comparison structures, Web Speech synthesis/recognition states, and optional
 * on-device webcam facial cue observation types.
 */

import type {
  ChallengeId,
  ObstacleDefinition,
  ParkingEvaluationResult,
  Vec3,
  VehicleCategory,
} from '../challenges/types';

export type VehicleImpactZone =
  | 'front-left-corner'
  | 'front-right-corner'
  | 'rear-left-corner'
  | 'rear-right-corner'
  | 'front-bumper'
  | 'rear-bumper'
  | 'left-flank'
  | 'right-flank'
  | 'uncertain';

export type CrashProbableCauseTag =
  | 'excessive-reverse-speed'
  | 'excessive-forward-speed'
  | 'front-swing-clip-during-reverse'
  | 'early-turn-in-clip'
  | 'late-steering-correction'
  | 'kerb-overrun'
  | 'insufficient-lateral-clearance'
  | 'blind-spot-rear-backing'
  | 'uncertain-kinematics';

export type DrivingDirection = 'forward' | 'reverse' | 'stationary';

export type CoachingToneMode =
  | 'neutral-analytical'
  | 'warm-encouraging'
  | 'concise-calm';

export type FacialCueKind =
  | 'camera-off'
  | 'no-face-detected'
  | 'smiling-cue'
  | 'active-facial-movement'
  | 'steady-neutral-posture';

export interface VisibleFacialCueState {
  cameraActive: boolean;
  faceDetected: boolean;
  cueKind: FacialCueKind;
  /** Surface mouth-corner / lower-face luminance curvature estimate (0..1) */
  smileIndicator: number;
  /** Upper-face / eyebrow & head movement delta estimate (0..1) */
  movementIndicator: number;
  /** Eye-region openness / contrast estimate (0..1) */
  eyeOpennessIndicator: number;
  detectorBackend: 'browser-face-detector' | 'canvas-pixel-cue' | 'none';
  lastUpdatedMs: number;
  /** Explicit non-diagnostic uncertainty notice */
  uncertaintyNote: string;
}

export interface TelemetryFrameSnapshot {
  timestampMs: number;
  elapsedSeconds: number;
  position: Vec3;
  rotationY: number;
  speedMps: number;
  steeringAngle: number;
  isMoving: boolean;
  isBraking: boolean;
  isReversing: boolean;
}

export interface PreImpactKinematics {
  preImpactSpeedMps: number;
  preImpactSpeedMph: number;
  peakRecentSpeedMps: number;
  peakRecentSpeedMph: number;
  preImpactSteeringRad: number;
  preImpactSteeringDeg: number;
  steeringDirection: 'left' | 'right' | 'straight';
  drivingDirectionBeforeImpact: DrivingDirection;
  wasBrakingBeforeImpact: boolean;
  framesInspected: number;
  kinematicsConfidence: 'high' | 'medium' | 'low';
}

export interface CrashTelemetryEvent {
  eventId: string;
  attemptId: string;
  attemptNumber: number;
  challengeId: ChallengeId;
  challengeTitle: string;
  vehicleId: string;
  vehicleName: string;
  vehicleCategory: VehicleCategory;
  timestampIso: string;
  elapsedSeconds: number;
  obstacle: ObstacleDefinition;
  obstacleReadableLabel: string;
  collisionCount: number;
  impactPosition: Vec3;
  impactRotationY: number;
  distanceToTargetCenterMeters: number;
  alignmentErrorAtImpactDegrees: number;
  preImpactSpeedMps: number;
  preImpactSpeedMph: number;
  preImpactSteeringDeg: number;
  steeringDirection: 'left' | 'right' | 'straight';
  drivingDirectionBeforeImpact: DrivingDirection;
  wasBrakingBeforeImpact: boolean;
  vehicleImpactZone: VehicleImpactZone;
  impactZoneConfidence: 'high' | 'low';
  probableCauseTag: CrashProbableCauseTag;
  causeConfidence: 'high' | 'medium' | 'low';
  searchableSummaryText: string;
  recentTrajectory: TelemetryFrameSnapshot[];
}

export interface StaticGuidanceDocument {
  id: string;
  challengeId: ChallengeId | 'all';
  obstacleIdPattern?: string;
  obstacleKind: ObstacleDefinition['kind'] | 'all';
  applicableDirections: DrivingDirection[];
  applicableImpactZones?: VehicleImpactZone[];
  applicableCauseTags?: CrashProbableCauseTag[];
  title: string;
  searchKeywords: string;
  guidanceText: string;
  correctiveAction: string;
  nextAttemptFocus: string;
}

export interface CrashMemoryRecord {
  eventId: string;
  attemptId: string;
  attemptNumber: number;
  challengeId: ChallengeId;
  vehicleId: string;
  vehicleName: string;
  timestampIso: string;
  obstacleId: string;
  obstacleKind: ObstacleDefinition['kind'];
  obstacleReadableLabel: string;
  drivingDirectionBeforeImpact: DrivingDirection;
  vehicleImpactZone: VehicleImpactZone;
  probableCauseTag: CrashProbableCauseTag;
  preImpactSpeedMph: number;
  preImpactSteeringDeg: number;
  distanceToTargetCenterMeters: number;
  alignmentErrorAtImpactDegrees: number;
  searchableText: string;
  feedbackHeadline: string;
  recommendedAction: string;
}

export interface AttemptMemoryRecord {
  attemptId: string;
  attemptNumber: number;
  challengeId: ChallengeId;
  vehicleId: string;
  vehicleName: string;
  timestampIso: string;
  outcome: 'passed' | 'failed-eval' | 'retried-after-crash' | 'retried-clean';
  collisionCount: number;
  crashedObstacleIds: string[];
  crashedObstacleLabels: string[];
  avgPreImpactSpeedMph: number | null;
  peakSpeedMph: number;
  distanceTraveledMeters: number;
  elapsedSeconds: number;
  corrections: number;
  finalScore: number | null;
  stars: 0 | 1 | 2 | 3 | null;
  positionErrorMeters: number | null;
  alignmentErrorDegrees: number | null;
  closestDistanceToBayMeters: number;
}

export interface RetrievedRAGContextItem {
  id: string;
  sourceType: 'static-guidance' | 'past-crash' | 'past-attempt';
  title: string;
  similarityScore: number;
  tfidfScore: number;
  featureScore: number;
  summary: string;
}

export interface RAGRetrievalResult {
  queryText: string;
  topGuidance: Array<{
    doc: StaticGuidanceDocument;
    similarityScore: number;
    tfidfScore: number;
    featureScore: number;
  }>;
  similarPastCrashes: Array<{
    record: CrashMemoryRecord;
    similarityScore: number;
    tfidfScore: number;
    featureScore: number;
  }>;
  recentChallengeAttempts: AttemptMemoryRecord[];
  retrievedItems: RetrievedRAGContextItem[];
}

export interface AttemptComparisonDelta {
  challengeId: ChallengeId;
  previousAttemptNumber: number;
  currentAttemptNumber: number;
  previousOutcome: AttemptMemoryRecord['outcome'];
  collisionDelta: number;
  previousCollisions: number;
  currentCollisions: number;
  speedBeforeImpactDeltaMph: number | null;
  previousPreImpactSpeedMph: number | null;
  currentPreImpactSpeedMph: number | null;
  distanceToBayDeltaMeters: number;
  scoreDelta: number | null;
  positionErrorDeltaMeters: number | null;
  alignmentErrorDeltaDegrees: number | null;
  repeatedSameObstacle: boolean;
  repeatedObstacleLabel: string | null;
  followedPreviousSpeedAdvice: boolean | null;
  overallTrend: 'improved' | 'regressed' | 'mixed';
  headline: string;
  bulletPoints: string[];
}

export interface AICrashFeedbackReport {
  eventId: string;
  attemptId: string;
  attemptNumber: number;
  challengeId: ChallengeId;
  challengeTitle: string;
  vehicleName: string;
  timestampIso: string;
  obstacleId: string;
  obstacleKind: ObstacleDefinition['kind'];
  obstacleLabel: string;
  preImpactSpeedMph: number;
  preImpactSteeringDeg: number;
  steeringDirection: 'left' | 'right' | 'straight';
  drivingDirection: DrivingDirection;
  vehicleImpactZone: VehicleImpactZone;
  probableCauseTag: CrashProbableCauseTag;
  coachingTone: CoachingToneMode;
  facialCueContextNote: string | null;
  headline: string;
  whatHappened: string;
  whereItHappened: string;
  preCrashBehavior: string;
  probableCause: string;
  uncertaintyNote: string | null;
  actionableAdvice: string;
  nextAttemptFocus: string;
  spokenFeedbackText: string;
  repeatPatternNotice: string | null;
  retrievedContext: RetrievedRAGContextItem[];
  attemptComparison: AttemptComparisonDelta | null;
}

export interface CoachQAExchange {
  id: string;
  questionText: string;
  inputMode: 'voice-speech-recognition' | 'text-input';
  answerText: string;
  spokenText: string;
  retrievedContext: RetrievedRAGContextItem[];
  timestampIso: string;
}

export interface RAGMemoryStorePayload {
  version: 1;
  updatedAtIso: string;
  crashes: CrashMemoryRecord[];
  attempts: AttemptMemoryRecord[];
}

export interface ActiveAttemptTelemetry {
  attemptId: string;
  attemptNumber: number;
  challengeId: ChallengeId;
  vehicleId: string;
  startedAtMs: number;
  distanceTraveledMeters: number;
  peakSpeedMph: number;
  closestDistanceToBayMeters: number;
  crashesInAttempt: CrashTelemetryEvent[];
  lastEvaluation: ParkingEvaluationResult | null;
}
