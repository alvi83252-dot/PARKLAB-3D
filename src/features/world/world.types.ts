import type { Vec3, VehicleDimensions } from '../../types/vehicle.types';

/**
 * Supported camera modes for DrivingCamera.
 * Both canonical names ('follow', 'overhead') and descriptive aliases
 * ('third-person', 'top-down') are accepted for seamless integration.
 */
export type CameraMode = 'follow' | 'overhead' | 'third-person' | 'top-down';

export type CanonicalCameraMode = 'follow' | 'overhead';

export interface DrivingCameraProps {
  /** World-space position [x, y, z] of the player vehicle. Defaults to [0, 0, 0]. */
  targetPosition?: Vec3;
  /** Heading rotation around the Y axis in radians. Defaults to 0. */
  targetRotationY?: number;
  /** Active camera perspective mode. Defaults to 'follow'. */
  mode?: CameraMode;
  /** Follow distance behind the vehicle in metres (follow mode). Defaults to 9.2. */
  followDistance?: number;
  /** Camera elevation above the vehicle in metres (follow mode). Defaults to 4.1. */
  followHeight?: number;
  /** Look-ahead distance in front of the vehicle in metres (follow mode). Defaults to 3.2. */
  lookAheadDistance?: number;
  /** Camera altitude in metres above the vehicle (overhead mode). Defaults to 26. */
  overheadHeight?: number;
  /** Exponential smoothing speed factor. Defaults to 6.5. */
  smoothingFactor?: number;
}

export interface ParkingEnvironmentProps {
  /** Whether to render decorative stationary vehicles in perimeter bays. Defaults to true. */
  showDecorativeVehicles?: boolean;
  /** Whether to render surrounding perimeter buildings. Defaults to true. */
  showBuildings?: boolean;
  /** Whether to render streetlights, road signs, and landscaping. Defaults to true. */
  showStreetFurniture?: boolean;
  /** Whether directional sunlight and environmental meshes cast/receive shadows. Defaults to true. */
  enableShadows?: boolean;
}

export type DecorativeVehicleKind =
  | 'tesla-roadster'
  | 'hatchback'
  | 'sedan'
  | 'suv';

export interface DecorativeVehicleSpec {
  id: string;
  name: string;
  kind: DecorativeVehicleKind;
  position: Vec3;
  rotationY: number;
  dimensions: VehicleDimensions;
  bodyColor: string;
  accentColor?: string;
  plateText: string;
  isShowcase?: boolean;
}

export type TrafficSignKind =
  | 'parking-zone'
  | 'speed-limit-10'
  | 'give-way'
  | 'one-way-arrow'
  | 'ev-charging';

export interface TrafficSignSpec {
  id: string;
  kind: TrafficSignKind;
  position: Vec3;
  rotationY: number;
  label?: string;
}

export interface StreetlightSpec {
  id: string;
  position: Vec3;
  rotationY: number;
  twinArm?: boolean;
}

export interface BuildingSpec {
  id: string;
  name: string;
  position: Vec3;
  dimensions: [number, number, number];
  rotationY?: number;
  primaryColor: string;
  secondaryColor: string;
  glassColor: string;
  accentColor: string;
  style: 'test-centre' | 'parking-deck' | 'office-tower' | 'commercial-block';
}

export interface TreePlanterSpec {
  id: string;
  position: Vec3;
  scale?: number;
  treeType?: 'round' | 'conical';
}

export interface ParkingBayZoneSpec {
  id: string;
  label: string;
  kind: 'perpendicular' | 'parallel' | 'angled' | 'pull-up-kerb';
  origin: Vec3;
  rotationY: number;
  bayCount: number;
  bayWidth: number;
  bayLength: number;
  angleRad?: number;
}
