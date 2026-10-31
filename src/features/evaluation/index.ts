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

export {
  STATIC_CRASH_KNOWLEDGE_BASE,
  getObstacleReadableLabel,
} from './crashKnowledgeBase';

export {
  RAG_MEMORY_STORAGE_KEY,
  clearRAGMemoryStore,
  computeTfIdfCosineScores,
  getChallengeAttemptHistory,
  loadRAGMemoryStore,
  retrieveRAGContextForCrash,
  retrieveRAGContextForQuestion,
  saveAttemptMemoryRecord,
  saveCrashMemoryRecord,
  tokenizeForRAG,
} from './ragMemoryStore';

export {
  answerCoachQuestion,
  buildCrashTelemetryEvent,
  classifyCrashCause,
  compareAttemptTelemetry,
  computeVehicleImpactZone,
  extractPreImpactKinematics,
  generateCrashFeedback,
  resolveAdaptiveCoachingTone,
} from './crashAnalyzer';

export { useVoiceCoach } from './useVoiceCoach';
export type { VoiceCoachStateAndControls } from './useVoiceCoach';

export { useWebcamFacialObserver } from './useWebcamFacialObserver';
export type { WebcamFacialObserverControls } from './useWebcamFacialObserver';

export { useCrashFeedbackLoop } from './useCrashFeedbackLoop';
export type {
  CrashFeedbackLoopController,
  UseCrashFeedbackLoopParams,
} from './useCrashFeedbackLoop';

export type {
  AICrashFeedbackReport,
  ActiveAttemptTelemetry,
  AttemptComparisonDelta,
  AttemptMemoryRecord,
  CoachQAExchange,
  CoachingToneMode,
  CrashMemoryRecord,
  CrashProbableCauseTag,
  CrashTelemetryEvent,
  DrivingDirection,
  FacialCueKind,
  PreImpactKinematics,
  RAGMemoryStorePayload,
  RAGRetrievalResult,
  RetrievedRAGContextItem,
  StaticGuidanceDocument,
  TelemetryFrameSnapshot,
  VehicleImpactZone,
  VisibleFacialCueState,
} from './crashRagTypes';

export type {
  ParkingAttemptMetrics,
  ParkingEvaluationResult,
} from '../challenges/types';
