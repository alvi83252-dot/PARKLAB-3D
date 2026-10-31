/**
 * PARKLAB 3D — Vehicle System Public Exports (Joachim's Module)
 */

export {
  VEHICLES,
  getVehicleById,
  getChassisSpec,
  type VehicleChassisSpec,
} from './vehicles';
export {
  VehicleModel,
  createVehiclePartsRefs,
  type VehicleModelProps,
  type VehicleModelPartsRefs,
  type VehicleWheelRefs,
  type VehicleLightRefs,
} from './VehicleModels';
export {
  StudioReflectionEnv,
  type StudioReflectionEnvProps,
} from './StudioReflectionEnv';
export {
  VehicleController,
  type VehicleControllerProps,
} from './VehicleController';
export {
  VehicleSelector,
  type VehicleSelectorProps,
} from './VehicleSelector';
export {
  useKeyboardControls,
  setVirtualDrivingInput,
  clearVirtualDrivingInputs,
  type DrivingInputState,
  type DrivingAction,
} from './useKeyboardControls';
export {
  createInitialDamageState,
  cloneDamageStateSnapshot,
  applyCollisionDamage,
  stepDamageDebrisAndSparks,
  type CollisionImpactEvent,
} from './damageSystem';

export type {
  DentRecord,
  DetachablePartId,
  DetachedPartDebris,
  ImpactSparkParticle,
  ObstacleDefinition,
  ObstacleKind,
  PartCondition,
  Vec3,
  VehicleCategory,
  VehicleDamageState,
  VehicleDamageZone,
  VehicleDefinition,
  VehicleDimensions,
  VehicleHandling,
  VehicleRuntimeState,
} from './types';
