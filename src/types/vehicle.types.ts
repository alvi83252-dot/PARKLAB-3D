/**
 * PARKLAB 3D — Core Vehicle Domain Types
 * Architectural foundation for vehicle definitions and handling parameters.
 */

export type VehicleCategory =
  | 'compact'
  | 'hatchback'
  | 'saloon'
  | 'suv'
  | 'sports'
  | 'electric-roadster';

export type DrivetrainType = 'fwd' | 'rwd' | 'awd';

export interface SteeringCharacteristics {
  /** Maximum front wheel steering lock angle in radians */
  maxSteeringAngle: number;
  /** Rate at which steering angle responds to input (radians per second) */
  steeringSpeed: number;
  /** Rate at which wheels self-centre when input is released (radians per second) */
  returnSpeed: number;
  /** Minimum kerb-to-kerb turning circle radius in metres */
  turningRadius: number;
  /** Distance between front and rear axles in metres */
  wheelbase: number;
  /** Drivetrain configuration affecting low-speed traction */
  drivetrain: DrivetrainType;
}

export interface Vehicle {
  /** Unique identifier (e.g., 'tesla-roadster', 'uk-hatchback') */
  id: string;
  /** Display name of the vehicle */
  name: string;
  /** Vehicle classification category */
  category: VehicleCategory;
  /** Overall vehicle length in metres */
  length: number;
  /** Overall vehicle width (excluding mirrors) in metres */
  width: number;
  /** Overall vehicle height in metres */
  height: number;
  /** Maximum forward speed in metres per second */
  maxSpeed: number;
  /** Base forward acceleration rate in metres per second squared */
  acceleration: number;
  /** Steering geometry and response parameters */
  steeringCharacteristics: SteeringCharacteristics;
  /** Optional summary displayed in the vehicle selection screen */
  description?: string;
  /** Optional path to the 3D asset in public/assets/vehicles/ */
  modelAssetPath?: string;
}
