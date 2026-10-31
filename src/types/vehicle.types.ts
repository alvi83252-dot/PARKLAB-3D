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
  | 'compact'
  | 'sedan'
  | 'saloon'
  | 'suv'
  | 'sports'
  | 'electric-roadster';

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
  isFlyingVehicle?: boolean;
}

export type VehicleDamageZone = 'front' | 'rear' | 'left' | 'right' | 'roof';

export type DetachablePartId =
  | 'front-bumper'
  | 'rear-bumper'
  | 'hood'
  | 'trunk'
  | 'left-mirror'
  | 'right-mirror'
  | 'left-fender'
  | 'right-fender';

export type PartCondition = 'intact' | 'dented' | 'loose' | 'detached';

export interface DentRecord {
  id: string;
  zone: VehicleDamageZone;
  /** Local coordinates relative to vehicle center [x, y, z] */
  localPos: Vec3;
  /** Depth of dent in metres */
  depth: number;
  /** Radius of dent deformation in metres */
  radius: number;
}

export interface DetachedPartDebris {
  id: string;
  partId: DetachablePartId;
  label: string;
  color: string;
  dimensions: Vec3;
  position: Vec3;
  velocity: Vec3;
  rotation: Vec3;
  angularVelocity: Vec3;
  grounded: boolean;
}

export interface ImpactSparkParticle {
  id: string;
  position: Vec3;
  velocity: Vec3;
  life: number;
  maxLife: number;
  color: string;
}

export interface VehicleDamageState {
  /** Structural integrity health from 0 to 100 */
  health: number;
  maxHealth: number;
  /** True when health reaches 0 and car is totaled */
  isTotaled: boolean;
  /** Cause of last / fatal crash */
  lastImpactDescription?: string;
  /** Impact speed (m/s) of most recent collision */
  lastImpactSpeedMps: number;
  /** Zone that took the most recent collision */
  lastImpactZone?: VehicleDamageZone;
  /** Cumulative deformation ratio (0..1) per zone */
  zones: {
    front: number;
    rear: number;
    left: number;
    right: number;
    engine: number;
  };
  /** Condition of each detachable body component */
  parts: Record<DetachablePartId, PartCondition>;
  /** Human-readable list of detached part names */
  detachedPartLabels: string[];
  /** Physical dent points on the car body */
  dents: DentRecord[];
  /** Detached parts lying or tumbling in 3D world space */
  debris: DetachedPartDebris[];
  /** Active crash spark particles in 3D world space */
  sparks: ImpactSparkParticle[];
}

export interface VehicleRuntimeState {
  position: Vec3;
  rotationY: number;
  speedMps: number;
  steeringAngle: number;
  collisionCount: number;
  isMoving: boolean;
  isBraking?: boolean;
  isReversing?: boolean;
  isAirborne?: boolean;
  damage?: VehicleDamageState;
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
