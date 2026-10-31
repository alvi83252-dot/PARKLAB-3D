/**
 * PARKLAB 3D — Selectable Vehicle Catalogue
 * Defines the four playable vehicles with distinct dimensions, proportions, and handling:
 * 1. Modern Hatchback
 * 2. Executive Sedan
 * 3. Large SUV
 * 4. Flying Tesla Roadster (SpaceX Cold-Gas Thruster & Hover-Vector Edition)
 */

import type { VehicleCategory, VehicleDefinition } from './types';

export interface VehicleChassisSpec {
  /** Distance between front and rear axles in metres */
  wheelbase: number;
  /** Front axle Z offset in local space (negative Z is forward) */
  frontAxleZ: number;
  /** Rear axle Z offset in local space (positive Z is rear) */
  rearAxleZ: number;
  /** Wheel outer radius in metres */
  wheelRadius: number;
  /** Tyre width in metres */
  wheelWidth: number;
  /** Half-track width (X offset from centre to wheel centre) in metres */
  halfTrackX: number;
  /** Ground clearance from y=0 to underbody floor in metres */
  groundClearance: number;
  /** Maximum front wheel steering lock angle in radians */
  maxSteeringAngleRad: number;
  /** Short descriptive summary for UI display */
  tagline: string;
  /** Secondary trim/accent color */
  accentColor: string;
  /** Whether the vehicle uses hover-thruster flight levitation */
  isFlyingVehicle?: boolean;
  /** Base hover altitude offset in metres when airborne/levitating */
  hoverAltitudeMetres?: number;
}

export const VEHICLES: VehicleDefinition[] = [
  {
    id: 'hatchback',
    name: 'Modern Hatchback',
    category: 'hatchback',
    dimensions: {
      length: 4.1,
      width: 1.78,
      height: 1.46,
    },
    handling: {
      maxForwardSpeedMps: 11.0,
      maxReverseSpeedMps: 4.5,
      accelerationMps2: 5.2,
      brakingMps2: 11.0,
      steeringRate: 2.4,
    },
    bodyColor: '#2563eb',
  },
  {
    id: 'sedan',
    name: 'Executive Sedan',
    category: 'sedan',
    dimensions: {
      length: 4.85,
      width: 1.86,
      height: 1.44,
    },
    handling: {
      maxForwardSpeedMps: 13.0,
      maxReverseSpeedMps: 5.0,
      accelerationMps2: 6.0,
      brakingMps2: 11.5,
      steeringRate: 1.95,
    },
    bodyColor: '#475569',
  },
  {
    id: 'suv',
    name: 'Large SUV',
    category: 'suv',
    dimensions: {
      length: 4.95,
      width: 1.98,
      height: 1.82,
    },
    handling: {
      maxForwardSpeedMps: 11.5,
      maxReverseSpeedMps: 4.2,
      accelerationMps2: 4.6,
      brakingMps2: 9.8,
      steeringRate: 1.65,
    },
    bodyColor: '#0f766e',
  },
  {
    id: 'tesla-roadster',
    name: 'Flying Tesla Roadster',
    category: 'sports',
    dimensions: {
      length: 4.42,
      width: 1.96,
      height: 1.22,
    },
    handling: {
      maxForwardSpeedMps: 16.0,
      maxReverseSpeedMps: 6.0,
      accelerationMps2: 9.5,
      brakingMps2: 14.5,
      steeringRate: 2.8,
    },
    bodyColor: '#dc2626',
  },
];

export const VEHICLE_CHASSIS_SPECS: Record<VehicleCategory, VehicleChassisSpec> = {
  hatchback: {
    wheelbase: 2.56,
    frontAxleZ: -1.28,
    rearAxleZ: 1.28,
    wheelRadius: 0.31,
    wheelWidth: 0.21,
    halfTrackX: 0.81,
    groundClearance: 0.16,
    maxSteeringAngleRad: 0.62,
    tagline: 'Compact footprint & tight turning circle ideal for UK test bays',
    accentColor: '#60a5fa',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
  },
  sedan: {
    wheelbase: 2.94,
    frontAxleZ: -1.49,
    rearAxleZ: 1.45,
    wheelRadius: 0.34,
    wheelWidth: 0.23,
    halfTrackX: 0.84,
    groundClearance: 0.15,
    maxSteeringAngleRad: 0.56,
    tagline: 'Long wheelbase luxury saloon requiring smooth mirror-guided arcs',
    accentColor: '#94a3b8',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
  },
  suv: {
    wheelbase: 3.0,
    frontAxleZ: -1.52,
    rearAxleZ: 1.48,
    wheelRadius: 0.4,
    wheelWidth: 0.26,
    halfTrackX: 0.89,
    groundClearance: 0.25,
    maxSteeringAngleRad: 0.52,
    tagline: 'Commanding wide-body 4x4 with heavier momentum and tighter bay margins',
    accentColor: '#2dd4bf',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
  },
  sports: {
    wheelbase: 2.72,
    frontAxleZ: -1.36,
    rearAxleZ: 1.36,
    wheelRadius: 0.35,
    wheelWidth: 0.28,
    halfTrackX: 0.88,
    groundClearance: 0.12,
    maxSteeringAngleRad: 0.6,
    tagline:
      'SpaceX-package Flying Roadster with active hover-thrusters, deployable aero winglets & vector bay precision',
    accentColor: '#38bdf8',
    isFlyingVehicle: true,
    hoverAltitudeMetres: 0.28,
  },
  compact: {
    wheelbase: 2.56,
    frontAxleZ: -1.28,
    rearAxleZ: 1.28,
    wheelRadius: 0.31,
    wheelWidth: 0.21,
    halfTrackX: 0.81,
    groundClearance: 0.16,
    maxSteeringAngleRad: 0.62,
    tagline: 'Compact footprint & tight turning circle ideal for UK test bays',
    accentColor: '#60a5fa',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
  },
  saloon: {
    wheelbase: 2.94,
    frontAxleZ: -1.49,
    rearAxleZ: 1.45,
    wheelRadius: 0.34,
    wheelWidth: 0.23,
    halfTrackX: 0.84,
    groundClearance: 0.15,
    maxSteeringAngleRad: 0.56,
    tagline: 'Long wheelbase luxury saloon requiring smooth mirror-guided arcs',
    accentColor: '#94a3b8',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
  },
  'electric-roadster': {
    wheelbase: 2.72,
    frontAxleZ: -1.36,
    rearAxleZ: 1.36,
    wheelRadius: 0.35,
    wheelWidth: 0.28,
    halfTrackX: 0.88,
    groundClearance: 0.12,
    maxSteeringAngleRad: 0.6,
    tagline:
      'SpaceX-package Flying Roadster with active hover-thrusters, deployable aero winglets & vector bay precision',
    accentColor: '#38bdf8',
    isFlyingVehicle: true,
    hoverAltitudeMetres: 0.28,
  },
};

export function getVehicleById(vehicleId: string): VehicleDefinition {
  return (
    VEHICLES.find((v) => v.id === vehicleId) ??
    VEHICLES.find((v) => v.category === vehicleId) ??
    VEHICLES[0]
  );
}

export function getChassisSpec(vehicle: VehicleDefinition): VehicleChassisSpec {
  const base =
    VEHICLE_CHASSIS_SPECS[vehicle.category] ?? VEHICLE_CHASSIS_SPECS.hatchback;
  const lengthScale =
    vehicle.dimensions.length /
    (vehicle.category === 'hatchback'
      ? 4.1
      : vehicle.category === 'sedan'
        ? 4.85
        : vehicle.category === 'suv'
          ? 4.95
          : 4.42);
  const widthScale =
    vehicle.dimensions.width /
    (vehicle.category === 'hatchback'
      ? 1.78
      : vehicle.category === 'sedan'
        ? 1.86
        : vehicle.category === 'suv'
          ? 1.98
          : 1.96);

  return {
    ...base,
    wheelbase: base.wheelbase * lengthScale,
    frontAxleZ: base.frontAxleZ * lengthScale,
    rearAxleZ: base.rearAxleZ * lengthScale,
    halfTrackX: base.halfTrackX * widthScale,
  };
}
