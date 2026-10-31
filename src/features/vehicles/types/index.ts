/**
 * PARKLAB 3D — Vehicle Module Type Contracts
 * Re-exports shared technical contracts from src/types/.
 */

import type { VehicleRuntimeState as BaseVehicleRuntimeState } from '../../../types/vehicle.types';

export type {
  DrivetrainType,
  SteeringCharacteristics,
  Vec3,
  Vehicle,
  VehicleCategory,
  VehicleDefinition,
  VehicleDimensions,
  VehicleHandling,
} from '../../../types/vehicle.types';

export type { ObstacleDefinition } from '../../../types/challenge.types';

export interface VehicleRuntimeState extends BaseVehicleRuntimeState {
  isBraking?: boolean;
  isReversing?: boolean;
}
