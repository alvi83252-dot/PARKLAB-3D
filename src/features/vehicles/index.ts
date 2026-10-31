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
  VehicleController,
  type VehicleControllerProps,
} from './VehicleController';
export {
  VehicleSelector,
  type VehicleSelectorProps,
} from './VehicleSelector';

export type {
  ObstacleDefinition,
  Vec3,
  VehicleCategory,
  VehicleDefinition,
  VehicleDimensions,
  VehicleHandling,
  VehicleRuntimeState,
} from './types';
