/**
 * PARKLAB 3D — Shared Vehicle Technical Contracts
 * Coordinate convention:
 * - Y is vertical axis; X and Z form the ground plane.
 * - Positions are [x, y, z] in metres.
 * - rotationY is in radians.
 * - Vehicle longitudinal axis is local Z (forward is local -Z before rotation).
 * - Vehicle width runs along local X.
 */

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

/* Stage 1 Extended Architectural Interfaces */

export type DrivetrainType = 'fwd' | 'rwd' | 'awd';

export interface SteeringCharacteristics {
  maxSteeringAngle: number;
  steeringSpeed: number;
  returnSpeed: number;
  turningRadius: number;
  wheelbase: number;
  drivetrain: DrivetrainType;
}

export interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  length: number;
  width: number;
  height: number;
  maxSpeed: number;
  acceleration: number;
  steeringCharacteristics: SteeringCharacteristics;
  description?: string;
  modelAssetPath?: string;
}
