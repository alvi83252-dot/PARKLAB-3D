/**
 * PARKLAB 3D — Selectable Vehicle Catalogue
 * Defines the seven playable vehicles with distinct dimensions, proportions, and handling:
 * 1. Modern Hatchback
 * 2. Executive Sedan
 * 3. Large SUV
 * 4. New Tesla Roadster (SpaceX Package — Full 3D Flight & Ground Hypercar Centrepiece)
 * 5. Porsche Taycan 4S (Car Craft Studio Jet-Black Electric Fastback)
 * 6. Mercedes-AMG GT R Coupé (Satin Gunmetal Grand Tourer from Gameplay Reference)
 * 7. Obsidian V12 Hypercar (Low-Slung Aero Teardrop Hypercar with Drilled Carbon Rotors)
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
  /** Whether the vehicle features SpaceX Cold-Gas 3D Flight thrusters */
  isFlyingVehicle?: boolean;
  /** Base hover altitude offset in metres when airborne/levitating */
  hoverAltitudeMetres?: number;
  /** Maximum 3D flight altitude in metres */
  maxFlightAltitudeMetres?: number;
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
      maxForwardSpeedMps: 11.5,
      maxReverseSpeedMps: 4.6,
      accelerationMps2: 5.5,
      brakingMps2: 11.2,
      steeringRate: 2.45,
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
      maxForwardSpeedMps: 13.5,
      maxReverseSpeedMps: 5.0,
      accelerationMps2: 6.2,
      brakingMps2: 11.8,
      steeringRate: 1.98,
    },
    bodyColor: '#1e293b',
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
      maxForwardSpeedMps: 12.0,
      maxReverseSpeedMps: 4.4,
      accelerationMps2: 4.8,
      brakingMps2: 10.2,
      steeringRate: 1.7,
    },
    bodyColor: '#0f766e',
  },
  {
    id: 'tesla-roadster',
    name: 'New Tesla Roadster',
    category: 'electric-roadster',
    dimensions: {
      length: 4.42,
      width: 1.96,
      height: 1.22,
    },
    handling: {
      maxForwardSpeedMps: 18.5,
      maxReverseSpeedMps: 6.5,
      accelerationMps2: 10.8,
      brakingMps2: 15.0,
      steeringRate: 2.85,
    },
    bodyColor: '#dde2e9',
  },
  {
    id: 'porsche-taycan',
    name: 'Porsche Taycan 4S',
    category: 'saloon',
    dimensions: {
      length: 4.96,
      width: 1.96,
      height: 1.38,
    },
    handling: {
      maxForwardSpeedMps: 16.5,
      maxReverseSpeedMps: 5.8,
      accelerationMps2: 8.6,
      brakingMps2: 13.8,
      steeringRate: 2.35,
    },
    bodyColor: '#0d1117',
  },
  {
    id: 'amg-gt',
    name: 'Mercedes-AMG GT R',
    category: 'sports',
    dimensions: {
      length: 4.55,
      width: 1.99,
      height: 1.28,
    },
    handling: {
      maxForwardSpeedMps: 17.2,
      maxReverseSpeedMps: 5.6,
      accelerationMps2: 8.9,
      brakingMps2: 14.2,
      steeringRate: 2.55,
    },
    bodyColor: '#525866',
  },
  {
    id: 'apex-hypercar',
    name: 'Obsidian V12 Hypercar',
    category: 'sports',
    dimensions: {
      length: 4.62,
      width: 2.02,
      height: 1.16,
    },
    handling: {
      maxForwardSpeedMps: 18.0,
      maxReverseSpeedMps: 6.0,
      accelerationMps2: 9.8,
      brakingMps2: 14.8,
      steeringRate: 2.7,
    },
    bodyColor: '#12151e',
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
    groundClearance: 0.15,
    maxSteeringAngleRad: 0.62,
    tagline:
      'Compact Euro hot-hatch footprint & tight turning circle engineered for agile urban bay control.',
    accentColor: '#60a5fa',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
    maxFlightAltitudeMetres: 0,
  },
  sedan: {
    wheelbase: 2.94,
    frontAxleZ: -1.49,
    rearAxleZ: 1.45,
    wheelRadius: 0.34,
    wheelWidth: 0.23,
    halfTrackX: 0.84,
    groundClearance: 0.14,
    maxSteeringAngleRad: 0.56,
    tagline:
      'Long-wheelbase executive performance saloon with sculpted shoulders and mirror-guided pivot arcs.',
    accentColor: '#94a3b8',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
    maxFlightAltitudeMetres: 0,
  },
  suv: {
    wheelbase: 3.0,
    frontAxleZ: -1.52,
    rearAxleZ: 1.48,
    wheelRadius: 0.4,
    wheelWidth: 0.26,
    halfTrackX: 0.89,
    groundClearance: 0.24,
    maxSteeringAngleRad: 0.52,
    tagline:
      'Commanding wide-track luxury SUV architecture with elevated sightlines and tighter bay margins.',
    accentColor: '#2dd4bf',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
    maxFlightAltitudeMetres: 0,
  },
  sports: {
    wheelbase: 2.72,
    frontAxleZ: -1.36,
    rearAxleZ: 1.36,
    wheelRadius: 0.35,
    wheelWidth: 0.28,
    halfTrackX: 0.88,
    groundClearance: 0.11,
    maxSteeringAngleRad: 0.6,
    tagline:
      'Low-slung track-bred supercar with wide rear haunches, carbon-ceramic brakes, and rear-axle steering.',
    accentColor: '#f59e0b',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
    maxFlightAltitudeMetres: 0,
  },
  compact: {
    wheelbase: 2.56,
    frontAxleZ: -1.28,
    rearAxleZ: 1.28,
    wheelRadius: 0.31,
    wheelWidth: 0.21,
    halfTrackX: 0.81,
    groundClearance: 0.15,
    maxSteeringAngleRad: 0.62,
    tagline:
      'Compact footprint & tight turning circle engineered for agile urban bay control.',
    accentColor: '#60a5fa',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
    maxFlightAltitudeMetres: 0,
  },
  saloon: {
    wheelbase: 2.9,
    frontAxleZ: -1.45,
    rearAxleZ: 1.45,
    wheelRadius: 0.35,
    wheelWidth: 0.26,
    halfTrackX: 0.87,
    groundClearance: 0.12,
    maxSteeringAngleRad: 0.58,
    tagline:
      '79.2 kWh AWD electric fastback saloon with 4-point Matrix LEDs, sweeping 911 roofline, and 20" Aero wheels.',
    accentColor: '#ef4444',
    isFlyingVehicle: false,
    hoverAltitudeMetres: 0,
    maxFlightAltitudeMetres: 0,
  },
  'electric-roadster': {
    wheelbase: 2.72,
    frontAxleZ: -1.36,
    rearAxleZ: 1.36,
    wheelRadius: 0.35,
    wheelWidth: 0.28,
    halfTrackX: 0.88,
    groundClearance: 0.11,
    maxSteeringAngleRad: 0.62,
    tagline:
      'SpaceX Package electric hypercar with cold-gas 3D flight thrusters, laser-blade LEDs, and panoramic targa glass.',
    accentColor: '#ef4444',
    isFlyingVehicle: true,
    hoverAltitudeMetres: 0,
    maxFlightAltitudeMetres: 38,
  },
};

const VEHICLE_SPECIFIC_OVERRIDES: Record<string, Partial<VehicleChassisSpec>> = {
  'tesla-roadster': {
    tagline:
      'SpaceX Package electric hypercar — engage Cold-Gas 3D Flight Thrusters (Space / F) to soar through the sky or park on tarmac.',
    accentColor: '#ef4444',
    isFlyingVehicle: true,
    maxFlightAltitudeMetres: 38,
  },
  'porsche-taycan': {
    tagline:
      'Standard Range 79.2 kWh AWD electric sports saloon with 4-point Matrix LED headlamps and 20" Taycan Turbo Aero rims.',
    accentColor: '#ef4444',
    isFlyingVehicle: false,
  },
  'amg-gt': {
    tagline:
      'Satin Selenite Grey front-mid-engine V8 Biturbo coupé with wide rear haunches, Panamericana grille, and active aero wing.',
    accentColor: '#f97316',
    isFlyingVehicle: false,
  },
  'apex-hypercar': {
    tagline:
      'Obsidian Black V12 teardrop hypercar with front wheel-arch aero cutaways, silver canopy arc, and drilled carbon rotors.',
    accentColor: '#ef4444',
    isFlyingVehicle: false,
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
  const overrides = VEHICLE_SPECIFIC_OVERRIDES[vehicle.id] ?? {};

  const refLen =
    vehicle.category === 'hatchback' || vehicle.category === 'compact'
      ? 4.1
      : vehicle.category === 'sedan'
        ? 4.85
        : vehicle.category === 'saloon'
          ? 4.96
          : vehicle.category === 'suv'
            ? 4.95
            : 4.42;

  const refWid =
    vehicle.category === 'hatchback' || vehicle.category === 'compact'
      ? 1.78
      : vehicle.category === 'sedan'
        ? 1.86
        : vehicle.category === 'saloon'
          ? 1.96
          : vehicle.category === 'suv'
            ? 1.98
            : 1.96;

  const lengthScale = vehicle.dimensions.length / refLen;
  const widthScale = vehicle.dimensions.width / refWid;

  return {
    ...base,
    ...overrides,
    wheelbase: base.wheelbase * lengthScale,
    frontAxleZ: base.frontAxleZ * lengthScale,
    rearAxleZ: base.rearAxleZ * lengthScale,
    halfTrackX: base.halfTrackX * widthScale,
  };
}
