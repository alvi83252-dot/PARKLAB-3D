/**
 * PARKLAB 3D — Vehicle Module Type Contracts
 * Re-exports shared technical contracts from src/types/.
 */

import type { VehicleRuntimeState as BaseVehicleRuntimeState } from '../../../types/vehicle.types';

export type {
  DentRecord,
  DetachablePartId,
  DetachedPartDebris,
  DrivetrainType,
  ImpactSparkParticle,
  PartCondition,
  SteeringCharacteristics,
  Vec3,
  Vehicle,
  VehicleCategory,
  VehicleDamageState,
  VehicleDamageZone,
  VehicleDefinition,
  VehicleDimensions,
  VehicleHandling,
} from '../../../types/vehicle.types';

export type { ObstacleDefinition, ObstacleKind } from '../../../types/challenge.types';

export interface VehicleRuntimeState extends BaseVehicleRuntimeState {
  isBraking?: boolean;
  isReversing?: boolean;
}
