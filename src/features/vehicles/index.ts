/**
 * PARKLAB 3D — Vehicle System Public Exports (Joachim's Module)
 */

export { VEHICLES, getVehicleById } from './vehicles';
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
