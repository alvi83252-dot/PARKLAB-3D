export {
  MPS_TO_MPH,
  computeFootprintContainment,
  computeRoadsideKerbGapMeters,
  evaluateParking,
  localToWorldXZ,
  normalizeAngleRadians,
  worldToLocalXZ,
} from './evaluateParking';

export type {
  CornerName,
  FootprintContainmentAnalysis,
  FootprintCornerAnalysis,
  PullUpRightTelemetryExtension,
} from './evaluateParking';

export { runEvaluationSelfCheck } from './verifyEvaluation';
export type { EvaluationSelfCheckSummary } from './verifyEvaluation';

export type {
  ParkingAttemptMetrics,
  ParkingEvaluationResult,
} from '../challenges/types';
