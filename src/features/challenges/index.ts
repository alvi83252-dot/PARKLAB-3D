export {
  CHALLENGES,
  DEFAULT_CHALLENGE,
  getChallengeById,
  getNextChallenge,
} from './challengesData';

export { ChallengeScene } from './ChallengeScene';
export type { ChallengeSceneProps } from './ChallengeScene';

export { evaluateParking } from '../evaluation';
export {
  ChallengeHUD,
  ChallengeSelector,
  ResultsPanel,
} from '../challenge-ui';

export type {
  ChallengeDifficulty,
  ChallengeId,
  ObstacleDefinition,
  ParkingAttemptMetrics,
  ParkingChallengeDefinition,
  ParkingEvaluationResult,
  ParkingTarget,
  Vec3,
  VehicleCategory,
  VehicleDefinition,
  VehicleDimensions,
  VehicleHandling,
  VehicleRuntimeState,
} from './types';
