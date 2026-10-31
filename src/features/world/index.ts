/**
 * PARKLAB 3D — Faizan's 3D World, Environment, Lighting & Camera Module
 * Public API surface for integration.
 */

export { ParkingEnvironment } from './components/ParkingEnvironment';
export { DrivingCamera } from './components/DrivingCamera';
export {
  WorldPreviewCanvas,
  isWebGLAvailable,
} from './components/WorldPreviewCanvas';
export { WorldShowcaseView } from './components/WorldShowcaseView';
export {
  EmergencyGroundFallback,
  WorldSubtreeErrorBoundary,
} from './components/WorldFallback';

export {
  DECORATIVE_PARKED_VEHICLES,
  FACILITY_STATIC_OBSTACLES,
  PERIMETER_BAY_ZONES,
  STREETLIGHTS,
  SURROUNDING_BUILDINGS,
  TRAFFIC_SIGNS,
  TREE_PLANTERS,
  WORLD_BOUNDS,
} from './constants/worldLayout';

export {
  computeCameraRigTarget,
  normalizeCameraMode,
  sanitizeNumber,
  sanitizeVec3,
  shortestAngleDelta,
} from './utils/worldFallbacks';

export { runWorldModuleSmokeTests } from './__tests__/worldSmokeTest';

export type {
  BuildingSpec,
  CameraMode,
  CanonicalCameraMode,
  DecorativeVehicleKind,
  DecorativeVehicleSpec,
  DrivingCameraProps,
  ParkingBayZoneSpec,
  ParkingEnvironmentProps,
  StreetlightSpec,
  TrafficSignKind,
  TrafficSignSpec,
  TreePlanterSpec,
} from './world.types';
export type { WorldPreviewCanvasProps } from './components/WorldPreviewCanvas';
