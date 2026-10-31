/**
 * PARKLAB 3D — Vehicle Module Type Contracts
 * Matches Part 3 Shared Technical Contracts from the Master Project Specification.
 */

export type {
  DrivetrainType,
  SteeringCharacteristics,
  Vehicle,
} from '../../../types/vehicle.types';

export type Vec3 = [number, number, number];

export type VehicleCategory =
  | 'hatchback'
  | 'sedan'
  | 'suv'
  | 'sports';

export interface VehicleDimensions {
  length: number;
  width: number;
  height: number;
}

export interface VehicleHandling {
  maxForwardSpeedMps: number;
  maxReverseSpeedMps: number;
  accelerationMps2: number;
  brakingMps2: number;
  steeringRate: number;
}

export interface VehicleDefinition {
  id: string;
  name: string;
  category: VehicleCategory;
  dimensions: VehicleDimensions;
  handling: VehicleHandling;
  bodyColor: string;
}

export interface VehicleRuntimeState {
  position: Vec3;
  rotationY: number;
  speedMps: number;
  steeringAngle: number;
  collisionCount: number;
  isMoving: boolean;
}

export interface ObstacleDefinition {
  id: string;
  kind: 'parked-car' | 'cone' | 'kerb';
  position: Vec3;
  rotationY: number;
  dimensions: VehicleDimensions;
}
